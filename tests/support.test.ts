import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { clabeControlDigit, isValidClabe } from "@/lib/support-rules"

import {
  balanceOf,
  clearDatabase,
  createUser,
  setupEnv,
  startDatabase,
  stopDatabase,
} from "./support/harness"

setupEnv()

const { env, resetEnvForTests } = await import("@/lib/env")
const { supportDetails } = await import("@/lib/support")
const { GET: donar } = await import("@/app/api/donar/route")
const { ensureFreeAllowance, monthKey, nextRefill } =
  await import("@/lib/billing/free-allowance")
const { createCheckoutSession, createPortalSession } =
  await import("@/lib/billing/checkout")
const { collections } = await import("@/lib/db/collections")

/** A valid CLABE that belongs to nobody: bank 646, branch 180, then filler. */
function testClabe(): string {
  const first17 = "64618012345678901"
  return `${first17}${clabeControlDigit(first17)}`
}

const VARS = [
  "BILLING_MODE",
  "FREE_MONTHLY_CREDITS",
  "SUPPORT_CLABE",
  "SUPPORT_BENEFICIARY",
  "SUPPORT_BANK",
  "SUPPORT_CONCEPT",
] as const
const saved = Object.fromEntries(VARS.map((name) => [name, process.env[name]]))
function configure(values: Partial<Record<(typeof VARS)[number], string>>) {
  for (const name of VARS) delete process.env[name]
  Object.assign(process.env, values)
  resetEnvForTests()
}
afterAll(() => {
  for (const name of VARS) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
  resetEnvForTests()
})

describe("CLABE validation", () => {
  it("accepts a published example and rejects a changed digit", () => {
    // 0020 1007 7777 7777 71 is the worked example used to explain the check digit.
    expect(isValidClabe("002010077777777771")).toBe(true)
    expect(isValidClabe("002010077777777772")).toBe(false)
    expect(isValidClabe("102010077777777771")).toBe(false)
  })

  it.each([
    "",
    "1234",
    "00201007777777777",
    "0020100777777777710",
    "abcdefghijklmnopqr",
    "0020 1007 7777 7777 71",
  ])("rejects %j", (value) => {
    expect(isValidClabe(value)).toBe(false)
  })

  it("any generated CLABE round-trips and any single-digit change is caught", () => {
    const first17 = "64618012345678901"
    const valid = `${first17}${clabeControlDigit(first17)}`
    expect(isValidClabe(valid)).toBe(true)
    for (let index = 0; index < 18; index++)
      for (const digit of "0123456789") {
        if (digit === valid[index]) continue
        const changed = valid.slice(0, index) + digit + valid.slice(index + 1)
        expect(isValidClabe(changed), `${index}:${digit}`).toBe(false)
      }
  })
})

describe("support details", () => {
  it("are absent until a CLABE is configured, and a bad CLABE fails at boot", () => {
    configure({})
    expect(supportDetails()).toBeNull()
    configure({ SUPPORT_CLABE: "123" })
    expect(() => env()).toThrow(/SUPPORT_CLABE/)
  })

  it("expose beneficiary, bank, CLABE and concept, with defaults", () => {
    configure({ SUPPORT_CLABE: testClabe() })
    const details = supportDetails()!
    expect(details.fields.map((field) => field.k)).toEqual([
      "Beneficiary",
      "Bank",
      "CLABE",
      "Concept",
    ])
    expect(Object.fromEntries(details.fields.map((f) => [f.k, f.v]))).toEqual({
      Beneficiary: "REBELSOFT ORG",
      Bank: "STP",
      CLABE: testClabe(),
      Concept: "Apoyo Vireo",
    })
    expect(details.note).toMatch(/CLABE/)
  })

  it("take overrides from the environment", () => {
    configure({
      SUPPORT_CLABE: testClabe(),
      SUPPORT_BENEFICIARY: "Someone Else",
      SUPPORT_BANK: "BBVA",
      SUPPORT_CONCEPT: "Gracias",
    })
    const fields = Object.fromEntries(
      supportDetails()!.fields.map((f) => [f.k, f.v])
    )
    expect(fields).toMatchObject({
      Beneficiary: "Someone Else",
      Bank: "BBVA",
      Concept: "Gracias",
    })
  })
})

describe("GET /api/donar", () => {
  it("answers 503 and sends nothing when support isn't configured", async () => {
    configure({})
    const response = await donar()
    expect(response.status).toBe(503)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toMatchObject({ code: "NOT_CONFIGURED" })
  })

  it("returns the details, uncached and unindexable, when configured", async () => {
    configure({ SUPPORT_CLABE: testClabe() })
    const response = await donar()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("x-robots-tag")).toMatch(/noindex/)
    const body = (await response.json()) as {
      fields: { k: string; v: string }[]
    }
    expect(body.fields.find((field) => field.k === "CLABE")?.v).toBe(
      testClabe()
    )
  })
})

describe("free mode", () => {
  beforeAll(startDatabase)
  afterAll(stopDatabase)
  beforeEach(clearDatabase)
  beforeEach(() => configure({ FREE_MONTHLY_CREDITS: "300" }))

  const JAN = new Date("2027-01-15T12:00:00Z")
  const FEB = new Date("2027-02-02T00:00:00Z")

  it("grants the monthly allowance once per UTC month", async () => {
    const user = await createUser({}, "free")
    expect(await ensureFreeAllowance(user.objectId, JAN)).toBe(true)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 300,
      topup: 0,
    })
    expect(await ensureFreeAllowance(user.objectId, JAN)).toBe(false)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 300,
      topup: 0,
    })
  })

  it("resets, not accumulates, and never touches top-up credits", async () => {
    const user = await createUser({ topup: 50 }, "free")
    await ensureFreeAllowance(user.objectId, JAN)
    const { users } = await collections()
    await users.updateOne(
      { _id: user.objectId },
      { $set: { "credits.subscription": 40 } }
    )
    await ensureFreeAllowance(user.objectId, FEB)
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 300,
      topup: 50,
    })
  })

  it("grants once under concurrent reads", async () => {
    const user = await createUser({}, "free")
    await Promise.allSettled(
      Array.from({ length: 6 }, () => ensureFreeAllowance(user.objectId, JAN))
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 300,
      topup: 0,
    })
    const { ledger } = await collections()
    expect(
      await ledger.countDocuments({
        userId: user.objectId,
        reason: "free_allowance",
      })
    ).toBe(1)
  })

  it("leaves legacy paid-plan users and paid mode alone", async () => {
    const plus = await createUser({ subscription: 77 }, "plus")
    expect(await ensureFreeAllowance(plus.objectId, JAN)).toBe(false)
    expect(await balanceOf(plus.objectId)).toEqual({
      subscription: 77,
      topup: 0,
    })

    configure({ BILLING_MODE: "paid", FREE_MONTHLY_CREDITS: "300" })
    const free = await createUser({}, "free")
    expect(await ensureFreeAllowance(free.objectId, JAN)).toBe(false)
    expect(await balanceOf(free.objectId)).toEqual({
      subscription: 0,
      topup: 0,
    })
  })

  it("does nothing when the allowance is 0", async () => {
    configure({ FREE_MONTHLY_CREDITS: "0" })
    const user = await createUser({}, "free")
    expect(await ensureFreeAllowance(user.objectId, JAN)).toBe(false)
  })

  it("sells nothing: checkout and the billing portal are refused", async () => {
    const user = await createUser({}, "free")
    await expect(
      createCheckoutSession(user, { kind: "topup", pack: "small" })
    ).rejects.toMatchObject({ code: "BILLING_DISABLED" })
    await expect(createPortalSession(user)).rejects.toMatchObject({
      code: "BILLING_DISABLED",
    })
  })

  it("computes the month key and the next refill in UTC", () => {
    expect(monthKey(new Date("2027-01-31T23:59:59Z"))).toBe("2027-01")
    expect(monthKey(new Date("2027-02-01T00:00:00Z"))).toBe("2027-02")
    expect(nextRefill(new Date("2027-01-31T23:59:59Z")).toISOString()).toBe(
      "2027-02-01T00:00:00.000Z"
    )
    expect(nextRefill(new Date("2027-12-15T00:00:00Z")).toISOString()).toBe(
      "2028-01-01T00:00:00.000Z"
    )
  })
})
