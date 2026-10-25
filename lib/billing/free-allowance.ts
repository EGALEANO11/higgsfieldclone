import "server-only"

import type { ObjectId } from "mongodb"

import { collections } from "@/lib/db/collections"

import { grantCredits } from "./ledger"
import { freeMonthlyCredits, isFreeMode } from "./mode"

/** The UTC month a date falls in, "YYYY-MM". */
export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

/** When the next free allowance lands: the first instant of the next UTC month. */
export function nextRefill(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

/**
 * Free mode: top the user's monthly bucket up to FREE_MONTHLY_CREDITS once per
 * UTC month (reset, so unused credits lapse and never pile up). Lazy: it runs
 * when the balance is read or a generation is submitted, so there is no cron
 * and no row for users who never come back. Idempotent: the ledger has a unique
 * key per user and month, so concurrent callers grant it once.
 * Returns true when this call granted it.
 */
export async function ensureFreeAllowance(
  userId: ObjectId,
  now = new Date()
): Promise<boolean> {
  const amount = freeMonthlyCredits()
  if (!isFreeMode() || amount <= 0) return false
  const period = monthKey(now)
  const { users } = await collections()
  const user = await users.findOne(
    { _id: userId },
    { projection: { freeAllowancePeriod: 1, plan: 1 } }
  )
  // Legacy paid-plan users keep their own allowance; never claw it back.
  if (!user || (user.plan && user.plan !== "free")) return false
  if (user.freeAllowancePeriod === period) return false
  const result = await grantCredits({
    userId,
    bucket: "subscription",
    amount,
    mode: "reset",
    reason: "free_allowance",
    refType: "free-month",
    refId: `${userId.toHexString()}:${period}`,
    note: `Free credits for ${period}`,
  })
  await users.updateOne(
    { _id: userId },
    { $set: { freeAllowancePeriod: period } }
  )
  return result.applied
}
