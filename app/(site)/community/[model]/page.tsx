import type { Metadata } from "next"
import Link from "next/link"
import { notFound, unstable_rethrow } from "next/navigation"
import { ChevronLeft, Sparkles } from "lucide-react"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { CommunityFeed } from "@/components/marketing/community-feed"
import { loadPublic } from "@/components/marketing/data"
import { findModel } from "@/generation/catalog"
import { BRAND } from "@/lib/brand"
import { countPublic } from "@/lib/community"
import { modelPath } from "@/lib/model-pages"
import { workspacePath } from "@/lib/studio/workspace"

type Params = Promise<{ model: string }>

// The feed reads the database; render per request.
export const dynamic = "force-dynamic"

function lookup(slug: string) {
  return findModel(decodeURIComponent(slug))
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const model = lookup((await params).model)
  if (!model) return { title: "Model not found" }
  const title = `Made with ${model.label}`
  const description = `Images and videos creators published with ${model.label} on ${BRAND.name}. Open any piece to see the prompt and settings, then recreate it.`
  return {
    title,
    description,
    alternates: { canonical: `/community/${encodeURIComponent(model.id)}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  }
}

async function total(modelId: string): Promise<number | null> {
  try {
    return await countPublic(modelId)
  } catch (error) {
    unstable_rethrow(error)
    return null
  }
}

export default async function ModelCommunityPage({
  params,
}: {
  params: Params
}) {
  const model = lookup((await params).model)
  if (!model) notFound()
  const [page, count] = await Promise.all([
    loadPublic({ modelId: model.id, limit: 24 }),
    total(model.id),
  ])
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-8 md:px-12 md:pt-10">
        <Link
          href="/community"
          className="inline-flex h-8 w-fit items-center gap-1 rounded-lg border border-white/10 pr-3 pl-2 text-sm transition-colors hover:bg-white/5"
        >
          <ChevronLeft className="size-4" aria-hidden /> Community
        </Link>
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-[36px] leading-none text-lime md:text-[56px]">
            Made with {model.label}
          </h1>
          <p className="max-w-[520px] text-sm text-muted-foreground md:text-base">
            {count === null
              ? `Work creators published with ${model.label}.`
              : count === 0
                ? `Nothing published with ${model.label} yet.`
                : `${count.toLocaleString("en-US")} ${
                    count === 1 ? "piece" : "pieces"
                  } published with ${model.label}.`}{" "}
            Open one to see exactly how it was made.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href={workspacePath(model.surface, model.id)}
              className="btn-keycap inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold"
            >
              <Sparkles className="size-4" aria-hidden /> Create with{" "}
              {model.label}
            </Link>
            <Link
              href={modelPath(model)}
              className="inline-flex h-10 items-center rounded-[10px] bg-white/5 px-4 text-sm font-medium hover:bg-white/10"
            >
              About this model
            </Link>
          </div>
        </header>
        <CommunityFeed
          initial={page.items}
          initialCursor={page.nextCursor}
          initialError={page.failed}
          scope={{ modelId: model.id }}
          showTabs={false}
          emptyTitle={`No ${model.label} work published yet`}
          emptyBody={`Be the first: generate with ${model.label}, then Publish it from your library.`}
        />
      </div>
    </div>
  )
}
