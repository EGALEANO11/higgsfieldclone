import { describe, expect, it } from "vitest"

import {
  SIGNATURE_TOLERANCE_SECONDS,
  parseSigningSecrets,
  signStandardWebhook,
  verifyStandardWebhook,
} from "@/lib/higgsfield/signature"

/**
 * Reference vectors produced by the official `standardwebhooks` library
 * (v1.1.1, Webhook#sign). The first is the vector from the Standard Webhooks
 * README, so this pins our verifier to the spec rather than to ourselves.
 */
const VECTORS = [
  {
    secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
    ts: 1614265330,
    body: '{"test": 2432232314}',
    sig: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
  },
  {
    secret: "whsec_MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    id: "evt_9417a243",
    ts: 1793000000,
    body: '{"request_id":"9417a243-e457-4075-895b-b68f3cda5303","status":"completed","error":null,"payload":{"images":[{"url":"https://cdn.example.com/a.jpg","content_type":"image/jpeg"}]}}',
    sig: "v1,wu4+lD/REhByKjXpsHFofBda1Np8QLvJWMTJOIZhJBc=",
  },
] as const

function headers(id: string, ts: number | string, signature: string) {
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(ts),
    "webhook-signature": signature,
  })
}

describe("Standard Webhooks signature", () => {
  it.each(VECTORS)("matches the official library for $id", (vector) => {
    const [key] = parseSigningSecrets(vector.secret)
    expect(signStandardWebhook(key!, vector.id, vector.ts, vector.body)).toBe(
      vector.sig
    )
    expect(
      verifyStandardWebhook({
        body: vector.body,
        headers: headers(vector.id, vector.ts, vector.sig),
        keys: [key!],
        now: vector.ts * 1000,
      })
    ).toEqual({ ok: true, id: vector.id })
  })

  const [vector] = VECTORS
  const keys = parseSigningSecrets(vector.secret)
  const verify = (over: {
    body?: string
    headers?: Headers
    now?: number
    keys?: Buffer[]
  }) =>
    verifyStandardWebhook({
      body: over.body ?? vector.body,
      headers: over.headers ?? headers(vector.id, vector.ts, vector.sig),
      keys: over.keys ?? keys,
      now: over.now ?? vector.ts * 1000,
    })

  it("rejects a tampered body, id or timestamp", () => {
    expect(verify({ body: vector.body.replace("2432", "2433") })).toEqual({
      ok: false,
      reason: "bad-signature",
    })
    expect(
      verify({ headers: headers("msg_other", vector.ts, vector.sig) })
    ).toMatchObject({ ok: false, reason: "bad-signature" })
    expect(
      verify({ headers: headers(vector.id, vector.ts + 1, vector.sig) })
    ).toMatchObject({ ok: false, reason: "bad-signature" })
  })

  it("rejects a signature made with another secret", () => {
    const other = parseSigningSecrets(VECTORS[1].secret)
    expect(verify({ keys: other })).toMatchObject({
      ok: false,
      reason: "bad-signature",
    })
  })

  it("enforces the five-minute tolerance in both directions", () => {
    const edge = SIGNATURE_TOLERANCE_SECONDS * 1000
    expect(verify({ now: vector.ts * 1000 + edge }).ok).toBe(true)
    expect(verify({ now: vector.ts * 1000 - edge }).ok).toBe(true)
    expect(verify({ now: vector.ts * 1000 + edge + 1000 })).toEqual({
      ok: false,
      reason: "stale-timestamp",
    })
    expect(verify({ now: vector.ts * 1000 - edge - 1000 })).toEqual({
      ok: false,
      reason: "stale-timestamp",
    })
  })

  it("rejects missing headers and malformed timestamps", () => {
    expect(verify({ headers: new Headers() })).toEqual({
      ok: false,
      reason: "missing-headers",
    })
    expect(verify({ keys: [] })).toEqual({
      ok: false,
      reason: "missing-headers",
    })
    for (const ts of ["abc", "-5", "1e9", "1614265330.5", ""])
      expect(verify({ headers: headers(vector.id, ts, vector.sig) }).ok).toBe(
        false
      )
  })

  it("accepts any v1 entry and ignores unknown versions and junk", () => {
    const real = vector.sig
    for (const header of [
      `v1,AAAA ${real}`,
      `${real} v1,AAAA`,
      `v2,whatever ${real}`,
      `junk ${real}`,
    ])
      expect(
        verify({ headers: headers(vector.id, vector.ts, header) }).ok
      ).toBe(true)
    for (const header of [
      "v1,AAAA",
      "v2," + real.slice(3),
      real.slice(3),
      "v1,",
      "",
    ])
      expect(
        verify({ headers: headers(vector.id, vector.ts, header) }).ok
      ).toBe(false)
  })

  it("supports rotation: a delivery signed with both secrets verifies with either key", () => {
    const [oldKey] = parseSigningSecrets(VECTORS[0].secret)
    const [newKey] = parseSigningSecrets(VECTORS[1].secret)
    const both = `${signStandardWebhook(newKey!, "evt_1", vector.ts, "{}")} ${signStandardWebhook(oldKey!, "evt_1", vector.ts, "{}")}`
    for (const keySet of [[oldKey!], [newKey!], [newKey!, oldKey!]])
      expect(
        verifyStandardWebhook({
          body: "{}",
          headers: headers("evt_1", vector.ts, both),
          keys: keySet,
          now: vector.ts * 1000,
        }).ok
      ).toBe(true)
  })
})

describe("parseSigningSecrets", () => {
  it("returns no keys when unset and parses a comma-separated rotation pair", () => {
    expect(parseSigningSecrets(undefined)).toEqual([])
    expect(parseSigningSecrets("")).toEqual([])
    expect(
      parseSigningSecrets(` ${VECTORS[0].secret} , ${VECTORS[1].secret} `)
    ).toHaveLength(2)
  })

  it.each([
    "MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    "whsec_",
    "whsec_short",
    "whsec_not base64!!!!!!!!!!!!!!!!!",
    "key_id:key_secret",
  ])("rejects %j so a typo fails at boot", (value) => {
    expect(() => parseSigningSecrets(value)).toThrow(/whsec_/)
  })
})
