import "server-only"

import { env } from "@/lib/env"

/**
 * How the app is funded.
 *  - "free": everyone gets a monthly free allowance and support is voluntary
 *    (SPEI to the maintainer, see lib/support.ts). Plans, top-ups and checkout
 *    are off. This is the default.
 *  - "paid": the original model: Stripe plans and credit top-ups.
 */
export type BillingMode = "free" | "paid"

export function billingMode(): BillingMode {
  return env().BILLING_MODE
}

export function isFreeMode(): boolean {
  return billingMode() === "free"
}

/** Credits granted to every user each month in free mode (0 = none). */
export function freeMonthlyCredits(): number {
  return env().FREE_MONTHLY_CREDITS
}
