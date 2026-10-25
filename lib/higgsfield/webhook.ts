import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

import { parseSigningSecrets } from "./signature"

/**
 * Two independent layers authenticate a delivery:
 *
 * 1. Our own URL token: each webhook URL carries the generation id and an HMAC
 *    of it; the handler recomputes and compares in constant time. This always
 *    applies, and the payload is still never trusted: finalize re-fetches the
 *    status.
 * 2. The platform's Standard Webhooks signature (docs: how-to/webhooks), checked
 *    when HF_WEBHOOK_SIGNING_SECRET is set. The platform only signs once the
 *    account has revealed its signing secret, so this layer is opt-in by config
 *    and, once configured, mandatory.
 */
export function webhookToken(generationId: string, secret: string): string {
  return createHmac("sha256", secret).update(generationId).digest("hex")
}

export function verifyWebhookToken(
  generationId: string,
  token: string,
  secret: string
): boolean {
  if (!/^[a-f0-9]{24}$/.test(generationId) || !/^[a-f0-9]{64}$/.test(token))
    return false
  const expected = Buffer.from(webhookToken(generationId, secret), "hex")
  const given = Buffer.from(token, "hex")
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** Full hf_webhook URL for a generation, or undefined when webhooks are off. */
export function webhookUrlFor(generationId: string): string | undefined {
  const { HF_WEBHOOK_BASE_URL: base, HF_WEBHOOK_SECRET: secret } = env()
  if (!base || !secret) return undefined
  const url = new URL("/api/webhooks/higgsfield", base)
  url.searchParams.set("gid", generationId)
  url.searchParams.set("t", webhookToken(generationId, secret))
  return url.toString()
}

/** The configured platform signing keys; empty when signature checking is off. */
export function signingSecrets(): Buffer[] {
  return parseSigningSecrets(env().HF_WEBHOOK_SIGNING_SECRET)
}
