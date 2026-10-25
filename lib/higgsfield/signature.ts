import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Standard Webhooks (https://www.standardwebhooks.com/) signature verification
 * for Higgsfield deliveries (docs: how-to/webhooks, enterprise/webhook-security).
 * Pure and dependency-free so it can be unit tested against the official
 * library's output.
 */

/** Deliveries signed more than this long ago (or ahead) are rejected. */
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

const SECRET_PREFIX = "whsec_"
const MIN_KEY_BYTES = 16

export type SignatureResult =
  | { ok: true; id: string }
  | {
      ok: false
      reason: "missing-headers" | "stale-timestamp" | "bad-signature"
    }

/**
 * Parse `whsec_<base64>` secrets (comma-separated while rotating: the platform
 * keeps the previous secret valid for 24 hours and signs with both) into HMAC
 * keys. Throws a readable error for a malformed entry so a typo fails at boot.
 */
export function parseSigningSecrets(raw: string | undefined): Buffer[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const encoded = entry.startsWith(SECRET_PREFIX)
        ? entry.slice(SECRET_PREFIX.length)
        : ""
      const key = /^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
        ? Buffer.from(encoded, "base64")
        : Buffer.alloc(0)
      if (key.length < MIN_KEY_BYTES)
        throw new Error(
          "HF_WEBHOOK_SIGNING_SECRET must be whsec_… values from Higgsfield Console → Settings (comma-separated while rotating)"
        )
      return key
    })
}

/** The `v1,<base64>` signature a signer would put in `webhook-signature`. */
export function signStandardWebhook(
  key: Buffer,
  id: string,
  timestamp: number | string,
  body: string
): string {
  const digest = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64")
  return `v1,${digest}`
}

/**
 * Verify a Standard Webhooks delivery against the raw request body (never a
 * re-serialized one). Accepts it when any `v1` entry of `webhook-signature`
 * matches a signature made with any configured key (rotation), and the
 * timestamp is within tolerance. Comparisons are constant-time.
 */
export function verifyStandardWebhook(input: {
  body: string
  headers: Pick<Headers, "get">
  keys: readonly Buffer[]
  /** Current time in ms; injectable for tests. */
  now?: number
}): SignatureResult {
  const id = input.headers.get("webhook-id")
  const timestamp = input.headers.get("webhook-timestamp")
  const header = input.headers.get("webhook-signature")
  if (!id || !timestamp || !header || !input.keys.length)
    return { ok: false, reason: "missing-headers" }
  if (!/^\d{1,12}$/.test(timestamp))
    return { ok: false, reason: "stale-timestamp" }
  const skew = Math.abs((input.now ?? Date.now()) / 1000 - Number(timestamp))
  if (!(skew <= SIGNATURE_TOLERANCE_SECONDS))
    return { ok: false, reason: "stale-timestamp" }

  const given = header
    .split(" ")
    .flatMap((entry) => {
      const [version, value] = entry.split(",")
      return version === "v1" && value ? [Buffer.from(value, "base64")] : []
    })
    .filter((signature) => signature.length === 32)
  let matched = false
  for (const key of input.keys) {
    const expected = Buffer.from(
      signStandardWebhook(key, id, timestamp, input.body).slice(3),
      "base64"
    )
    for (const signature of given)
      if (timingSafeEqual(expected, signature)) matched = true
  }
  return matched ? { ok: true, id } : { ok: false, reason: "bad-signature" }
}
