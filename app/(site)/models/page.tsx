/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next"
import Link from "next/link"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { ModelBadge } from "@/components/marketing/badges"
import { SectionHeader } from "@/components/marketing/section-header"
import { BRAND } from "@/lib/brand"
import { groupModels, modelPath } from "@/lib/model-pages"
import { familyCover } from "@/lib/showcase"

export const metadata: Metadata = {
  title: "Models",
  description: `Every image and video model available on ${BRAND.name}: what each one is best at, what it accepts and which settings it offers.`,
  alternates: { canonical: "/models" },
}

const SURFACE_TITLE = {
  image: "Image models",
  video: "Video models",
  audio: "Audio models",
} as const

export default function ModelsPage() {
  const groups = groupModels()
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 pt-10 md:px-12 md:pt-14">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-[36px] leading-none text-lime md:text-[56px]">
            Models
          </h1>
          <p className="max-w-[560px] text-sm text-muted-foreground md:text-base">
            One credit balance, every frontier model. Open a model to see what
            it&apos;s best at, what you can feed it and how it&apos;s tuned.
          </p>
        </header>
        {groups.map((group) => (
          <section
            key={group.surface}
            aria-labelledby={`models-${group.surface}`}
          >
            <SectionHeader
              id={`models-${group.surface}`}
              title={SURFACE_TITLE[group.surface]}
            />
            <div className="flex flex-col gap-8">
              {group.families.map(({ family, models }) => (
                <div key={family} className="flex flex-col gap-3">
                  <h3 className="text-xs font-medium tracking-wide text-[#828282] uppercase">
                    {family}
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {models.map((model) => (
                      <li key={model.id}>
                        <Link
                          href={modelPath(model)}
                          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-panel transition-colors hover:border-white/20"
                        >
                          <span className="relative block aspect-[16/9] overflow-hidden bg-surface">
                            <img
                              src={familyCover(model.family, model.surface)}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </span>
                          <span className="flex flex-1 flex-col gap-1.5 p-4">
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{model.label}</span>
                              <ModelBadge model={model} />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {model.provider}
                              {model.bestFor ? ` · ${model.bestFor}` : ""}
                            </span>
                            <span className="line-clamp-2 text-sm text-muted-foreground">
                              {model.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
