import type { Metadata } from "next"
import Link from "next/link"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { CommunityFeed } from "@/components/marketing/community-feed"
import { loadCommunityModels, loadPublic } from "@/components/marketing/data"
import { findModel } from "@/generation/catalog"

export const metadata: Metadata = {
  title: "Community",
  description:
    "Images and videos published by creators. Open any piece to see the prompt, model and settings, then recreate it.",
}

export default async function CommunityPage() {
  const [page, models] = await Promise.all([
    loadPublic({ limit: 24 }),
    loadCommunityModels(),
  ])
  const byModel = models.flatMap((entry) => {
    const model = findModel(entry.modelId)
    return model ? [{ model, count: entry.count }] : []
  })
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-10 md:px-12 md:pt-14">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-[36px] leading-none text-lime md:text-[56px]">
            Community
          </h1>
          <p className="max-w-[520px] text-sm text-muted-foreground md:text-base">
            Work creators chose to share. Open a piece to see exactly how it was
            made, then make it your own.
          </p>
        </header>
        {byModel.length > 0 ? (
          <nav
            aria-label="Browse by model"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs tracking-wide text-[#828282] uppercase">
              Browse by model
            </span>
            {byModel.map(({ model, count }) => (
              <Link
                key={model.id}
                href={`/community/${encodeURIComponent(model.id)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {model.label}
                <span className="text-[#828282] tabular-nums">{count}</span>
              </Link>
            ))}
          </nav>
        ) : null}
        <CommunityFeed
          initial={page.items}
          initialCursor={page.nextCursor}
          initialError={page.failed}
        />
      </div>
    </div>
  )
}
