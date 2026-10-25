import { NextResponse, type NextRequest } from "next/server"

import { findModel } from "@/generation/catalog"
import type { Surface } from "@/generation/catalog/types"
import { listPublic } from "@/lib/community"
import { errorResponse } from "@/lib/http"
import { getProfileByHandle } from "@/lib/profiles"

const SURFACES: readonly Surface[] = ["image", "video", "audio"]

/**
 * Public community feed:
 * GET /api/community?surface=image|video&modelId=<id>&handle=<handle>&cursor=<ms>&limit=
 * Published generations only (see lib/community.ts). Cached briefly at the edge.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const surfaceParam = params.get("surface")
  const cursorParam = params.get("cursor")
  const limitParam = Number(params.get("limit") ?? 24)
  const modelParam = params.get("modelId")
  const handleParam = params.get("handle")

  if (surfaceParam && !SURFACES.includes(surfaceParam as Surface))
    return NextResponse.json(
      { error: "Unknown surface.", code: "INVALID" },
      { status: 400 }
    )
  if (cursorParam && !/^\d{1,15}$/.test(cursorParam))
    return NextResponse.json(
      { error: "Invalid cursor.", code: "INVALID" },
      { status: 400 }
    )

  if (modelParam && !findModel(modelParam))
    return NextResponse.json(
      { error: "Unknown model.", code: "INVALID" },
      { status: 400 }
    )

  try {
    let userId
    if (handleParam) {
      const profile = await getProfileByHandle(handleParam)
      if (!profile) return NextResponse.json({ items: [], nextCursor: null })
      userId = profile.userId
    }
    const page = await listPublic({
      ...(modelParam ? { modelId: modelParam } : {}),
      ...(userId ? { userId } : {}),
      ...(surfaceParam ? { surface: surfaceParam as Surface } : {}),
      ...(cursorParam ? { cursor: cursorParam } : {}),
      limit: Number.isFinite(limitParam)
        ? Math.min(Math.max(Math.trunc(limitParam), 1), 48)
        : 24,
    })
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    })
  } catch (caught) {
    return errorResponse(caught)
  }
}
