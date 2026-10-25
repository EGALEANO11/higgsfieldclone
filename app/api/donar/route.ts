import { NextResponse } from "next/server"

import { supportDetails } from "@/lib/support"

/**
 * GET /api/donar — the voluntary-support details (SPEI), on request only.
 * They are deliberately not in any page or bundle: nothing here is indexed,
 * cached or sent until a person presses "Show how to support".
 */
const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const

export async function GET() {
  const details = supportDetails()
  if (!details)
    return NextResponse.json(
      { error: "Support details aren't set up yet.", code: "NOT_CONFIGURED" },
      { status: 503, headers: HEADERS }
    )
  return NextResponse.json(details, { headers: HEADERS })
}
