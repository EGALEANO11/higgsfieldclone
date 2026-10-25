/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Sparkles } from "lucide-react"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { ModelBadge, ModelGlyph } from "@/components/marketing/badges"
import { CommunityFeed } from "@/components/marketing/community-feed"
import { loadPublic } from "@/components/marketing/data"
import { SectionHeader } from "@/components/marketing/section-header"
import { findModel } from "@/generation/catalog"
import { BRAND } from "@/lib/brand"
import {
  capabilityLabels,
  generatorHref,
  modelPath,
  relatedModels,
  summarizeInputs,
  summarizeSettings,
} from "@/lib/model-pages"
import { familyCover } from "@/lib/showcase"

type Params = Promise<{ slug: string }>

function lookup(slug: string) {
  return findModel(decodeURIComponent(slug))
}

// Rendered per request: the "Made with" feed reads the database, and a
// build-time render without one would freeze an error state into the page.
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const model = lookup((await params).slug)
  if (!model) return { title: "Model not found" }
  const title = `${model.label} — ${model.provider}`
  const description = `${model.description} Generate with ${model.label} on ${BRAND.name}.`
  const image = familyCover(model.family, model.surface)
  return {
    title,
    description,
    alternates: { canonical: modelPath(model) },
    openGraph: { title, description, type: "website", images: [image] },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default async function ModelPage({ params }: { params: Params }) {
  const model = lookup((await params).slug)
  if (!model) notFound()

  const capabilities = capabilityLabels(model)
  const inputs = summarizeInputs(model)
  const settings = summarizeSettings(model)
  const related = relatedModels(model)
  const page = await loadPublic({ modelId: model.id, limit: 12 })
  const surfaceNoun = model.surface === "video" ? "videos" : "images"

  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[520px]" />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-14 px-4 pt-8 md:px-12 md:pt-10">
        <Link
          href="/models"
          className="inline-flex h-8 w-fit items-center gap-1 rounded-lg border border-white/10 pr-3 pl-2 text-sm transition-colors hover:bg-white/5"
        >
          <ChevronLeft className="size-4" aria-hidden /> All models
        </Link>

        <header className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-xs tracking-wide text-[#828282] uppercase">
              <ModelGlyph model={model} className="size-4" />
              <span>{model.provider}</span>
              <span aria-hidden>·</span>
              <span>{model.category ?? model.surface}</span>
              <ModelBadge model={model} />
            </div>
            <h1 className="font-display text-[40px] leading-[0.95] md:text-[64px]">
              {model.label}
            </h1>
            <p className="max-w-[520px] text-base text-muted-foreground md:text-lg">
              {model.description}
            </p>
            {model.bestFor ? (
              <p className="text-sm">
                <span className="text-[#828282]">Best for </span>
                {model.bestFor}
              </p>
            ) : null}
            {capabilities.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Capabilities">
                {capabilities.map((label) => (
                  <li
                    key={label}
                    className="rounded-full bg-white/5 px-3 py-1 text-xs text-foreground ring-1 ring-white/10"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
            <div>
              <Link
                href={generatorHref(model)}
                className="btn-keycap inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-semibold"
              >
                <Sparkles className="size-4" aria-hidden /> Create with{" "}
                {model.label}
              </Link>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-hairline bg-panel">
            <img
              src={familyCover(model.family, model.surface)}
              alt={`${model.family} sample output`}
              className="size-full object-cover"
            />
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <section aria-labelledby="model-inputs">
            <SectionHeader
              id="model-inputs"
              title="What you can feed it"
              description="Attach these alongside your prompt."
            />
            {inputs.length > 0 ? (
              <ul className="flex flex-col divide-y divide-white/5 rounded-2xl bg-surface px-4 text-sm">
                {inputs.map((input) => (
                  <li
                    key={input.role}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span>{input.label}</span>
                    <span className="text-[#828282] tabular-nums">
                      {input.required ? "Required · " : ""}
                      up to {input.max}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground">
                Prompt only — no media attachments.
              </p>
            )}
          </section>

          <section aria-labelledby="model-settings">
            <SectionHeader
              id="model-settings"
              title="Settings"
              description="Every control the generator panel offers for this model."
            />
            <dl className="flex flex-col divide-y divide-white/5 rounded-2xl bg-surface px-4 text-sm">
              {settings.map((setting) => (
                <div
                  key={setting.key}
                  className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
                >
                  <dt className="text-[#828282]">{setting.label}</dt>
                  <dd className="flex flex-col gap-0.5">
                    <span>{setting.options}</span>
                    <span className="text-xs text-muted-foreground">
                      Default: {setting.defaultValue}
                      {setting.hint ? ` · ${setting.hint}` : ""}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section aria-labelledby="model-community">
          <SectionHeader
            id="model-community"
            title={`Made with ${model.label}`}
            action={
              <Link
                href={`/community/${encodeURIComponent(model.id)}`}
                className="text-sm text-lime hover:underline"
              >
                See all →
              </Link>
            }
            description={`${surfaceNoun[0]!.toUpperCase()}${surfaceNoun.slice(1)} creators chose to share — open one to see the prompt and recreate it.`}
          />
          <CommunityFeed
            initial={page.items}
            initialCursor={page.nextCursor}
            initialError={page.failed}
            scope={{ modelId: model.id }}
            showTabs={false}
            emptyTitle={`No ${model.label} work published yet`}
            emptyBody={`Be the first: generate with ${model.label}, then Publish it from your library.`}
          />
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="model-related">
            <SectionHeader id="model-related" title="More models" />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((other) => (
                <li key={other.id}>
                  <Link
                    href={modelPath(other)}
                    className="flex h-full flex-col gap-1 rounded-2xl border border-hairline bg-panel p-4 transition-colors hover:border-white/20"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ModelGlyph model={other} className="size-4" />
                      {other.label}
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {other.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
