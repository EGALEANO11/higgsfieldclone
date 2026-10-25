import "server-only"

import { BRAND } from "@/lib/brand"
import { env } from "@/lib/env"

import { SPEI_NOTE, isValidClabe, type SupportDetails } from "./support-rules"

/**
 * The details a supporter needs, or null when none are configured. They are
 * served by GET /api/donar only when someone asks, so they never appear in the
 * page source, the app bundle or a search engine's cache.
 */
export function supportDetails(): SupportDetails | null {
  const value = env()
  const clabe = value.SUPPORT_CLABE
  if (!clabe || !isValidClabe(clabe)) return null
  return {
    fields: [
      { k: "Beneficiary", v: value.SUPPORT_BENEFICIARY, copiable: true },
      { k: "Bank", v: value.SUPPORT_BANK, copiable: false },
      { k: "CLABE", v: clabe, copiable: true },
      {
        k: "Concept",
        v: value.SUPPORT_CONCEPT ?? `Apoyo ${BRAND.name}`,
        copiable: true,
      },
    ],
    note: SPEI_NOTE,
  }
}
