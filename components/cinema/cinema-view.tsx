"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Clapperboard, Dices, RotateCcw, Search, X } from "lucide-react"

import { MediaZone } from "@/components/generator/media-zone"
import {
  GenerateButton,
  PromptCard,
} from "@/components/generator/control-panel"
import { useTileActions } from "@/components/generator/tile-actions"
import {
  useGenerator,
  type Generator,
} from "@/components/generator/use-generator"
import { UserGenerations } from "@/components/studio/user-generations"
import {
  autoLook,
  currentValue,
  enumField,
  filterOptions,
  lookSummary,
  optionLabel,
  paletteSwatch,
  randomLook,
  type EnumField,
  type LookKey,
} from "@/lib/cinema"
import { runToGalleryItems } from "@/lib/studio/gallery-items"
import { CINEMA_MODEL_ID } from "@/lib/studio/workspace"
import { cn } from "@/lib/utils"

/** Cinema Studio: the director's panel on the left, your scenes on the right. */
export function CinemaView() {
  const generator = useGenerator("video", [], {
    lockModelId: CINEMA_MODEL_ID,
    historyModelId: CINEMA_MODEL_ID,
  })
  useDropIncompatibleMedia(generator)

  if (!generator.model)
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Cinema Studio isn&apos;t available right now.
      </div>
    )
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 md:flex-row md:overflow-hidden md:p-4 md:pt-2">
      <DirectorPanel generator={generator} />
      <SceneCanvas generator={generator} />
      <div className="sticky bottom-0 z-20 -mx-2 border-t border-white/5 bg-page/95 p-3 backdrop-blur md:hidden">
        <GenerateButton generator={generator} />
      </div>
    </div>
  )
}

/**
 * The prompt and attachments are shared with the video generator's dock.
 * Frames attached there (start/end/source) don't exist here, so drop them
 * once instead of leaving the user with a validation error they didn't cause.
 */
function useDropIncompatibleMedia(generator: Generator) {
  const { model, media, hydrated, removeMedia } = generator
  const done = useRef(false)
  useEffect(() => {
    if (!hydrated || !model || done.current) return
    done.current = true
    for (const item of media)
      if (!(model.roles[item.role] ?? 0)) removeMedia(item.id)
  }, [hydrated, media, model, removeMedia])
}

/* ── Director's panel ─────────────────────────────────────────────────────── */

function DirectorPanel({ generator }: { generator: Generator }) {
  const { model, settings } = generator
  if (!model) return null
  const summary = lookSummary(model, settings)
  const setMany = (values: Record<string, string>) => {
    for (const [key, value] of Object.entries(values))
      generator.setSetting(key, value)
  }

  return (
    <aside
      aria-label="Director's panel"
      className="flex w-full shrink-0 flex-col overflow-hidden rounded-[20px] border border-hairline bg-panel md:w-[380px]"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <h2 className="font-display flex items-center gap-2 text-lg whitespace-nowrap">
          <Clapperboard className="size-4 text-lime" aria-hidden />
          Cinema Studio
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMany(randomLook(model))}
            title="Pick a random look"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-xs font-medium whitespace-nowrap hover:bg-white/10"
          >
            <Dices className="size-3.5" aria-hidden /> Surprise
          </button>
          <button
            type="button"
            onClick={() => setMany(autoLook(model))}
            title="Set every look control back to Auto"
            disabled={summary.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2 pb-4">
        <MediaZone generator={generator} />
        <PromptCard generator={generator} />

        <Group title="Story" note="Tone, period and rhythm of the scene.">
          <ChipField generator={generator} settingKey="genre" />
          <ChipField generator={generator} settingKey="era" />
          <ChipField generator={generator} settingKey="pacing" />
        </Group>

        <Group title="Camera" note="Body, glass and how it moves.">
          <ChipField generator={generator} settingKey="cameraModel" />
          <ChipField generator={generator} settingKey="cameraLens" />
          <ChipField generator={generator} settingKey="cameraAperture" />
          <SearchField
            generator={generator}
            settingKey="cameraMovement"
            searchLabel="Search camera movements"
          />
        </Group>

        <Group
          title="Light & colour"
          note="Where the light comes from and the grade."
        >
          <ChipField generator={generator} settingKey="light" />
          <SearchField
            generator={generator}
            settingKey="colorPalette"
            searchLabel="Search colour palettes"
            swatches
          />
        </Group>

        <Group title="Format">
          <ChipField generator={generator} settingKey="aspectRatio" />
          <ChipField generator={generator} settingKey="resolution" />
          <DurationField generator={generator} />
        </Group>

        <DirectorNote summary={summary} />

        {generator.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-[#ff005b]/10 p-3 text-xs text-[#ff8fb3]"
          >
            <span className="flex-1">{generator.error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={generator.clearError}
            >
              <X className="size-3.5" />
            </button>
          </p>
        ) : null}
      </div>
      <div className="sticky bottom-0 hidden shrink-0 border-t border-white/5 bg-panel p-2 md:block">
        <GenerateButton generator={generator} />
      </div>
    </aside>
  )
}

function Group({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-3">
      <header className="flex flex-col">
        <h2 className="text-sm font-medium">{title}</h2>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </header>
      {children}
    </section>
  )
}

function readField(generator: Generator, key: string) {
  const { model, settings } = generator
  const field = model ? enumField(model, key) : undefined
  if (!field) return null
  return { field, value: currentValue(field, settings, key) }
}

function Chip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  swatch?: { from: string; to: string }
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
        active
          ? "bg-lime text-[#131517]"
          : "bg-panel text-muted-foreground hover:text-foreground"
      )}
    >
      {swatch ? (
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full ring-1 ring-white/20"
          style={{
            backgroundImage: `linear-gradient(135deg, ${swatch.from}, ${swatch.to})`,
          }}
        />
      ) : null}
      <span className="truncate">{children}</span>
    </button>
  )
}

/** A short enum as a row of radio chips. */
function ChipField({
  generator,
  settingKey,
}: {
  generator: Generator
  settingKey: string
}) {
  const state = readField(generator, settingKey)
  if (!state) return null
  const { field, value } = state
  return (
    <div className="flex flex-col gap-1.5">
      <p
        id={`cinema-${settingKey}`}
        className="text-xs tracking-wide text-[#828282] uppercase"
      >
        {field.label ?? settingKey}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`cinema-${settingKey}`}
        className="flex flex-wrap gap-1.5"
      >
        {field.values.map((option) => (
          <Chip
            key={option}
            active={option === value}
            onClick={() => generator.setSetting(settingKey, option)}
          >
            {optionLabel(field, option)}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/** A long enum (movements, palettes): current choice, a search box and a scrollable list. */
function SearchField({
  generator,
  settingKey,
  searchLabel,
  swatches = false,
}: {
  generator: Generator
  settingKey: LookKey
  searchLabel: string
  swatches?: boolean
}) {
  const state = readField(generator, settingKey)
  const [query, setQuery] = useState("")
  if (!state) return null
  const { field, value } = state
  return (
    <SearchFieldBody
      field={field}
      value={value}
      settingKey={settingKey}
      query={query}
      onQuery={setQuery}
      searchLabel={searchLabel}
      swatches={swatches}
      onPick={(option) => generator.setSetting(settingKey, option)}
    />
  )
}

function SearchFieldBody({
  field,
  value,
  settingKey,
  query,
  onQuery,
  searchLabel,
  swatches,
  onPick,
}: {
  field: EnumField
  value: string
  settingKey: string
  query: string
  onQuery: (value: string) => void
  searchLabel: string
  swatches: boolean
  onPick: (value: string) => void
}) {
  const options = useMemo(() => filterOptions(field, query), [field, query])
  return (
    <div className="flex flex-col gap-1.5">
      <p
        id={`cinema-${settingKey}`}
        className="flex items-center justify-between text-xs tracking-wide text-[#828282] uppercase"
      >
        {field.label ?? settingKey}
        <span className="text-foreground normal-case">
          {optionLabel(field, value)}
        </span>
      </p>
      <label className="flex h-8 items-center gap-2 rounded-lg bg-panel px-2.5 focus-within:ring-2 focus-within:ring-lime/60">
        <Search className="size-3.5 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search…"
          aria-label={searchLabel}
          className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div
        role="radiogroup"
        aria-labelledby={`cinema-${settingKey}`}
        className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto"
      >
        {options.map((option) => (
          <Chip
            key={option}
            active={option === value}
            onClick={() => onPick(option)}
            {...(swatches && option !== "auto"
              ? { swatch: paletteSwatch(option) }
              : {})}
          >
            {optionLabel(field, option)}
          </Chip>
        ))}
        {options.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">
            Nothing matches “{query}”.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function DurationField({ generator }: { generator: Generator }) {
  const { model, settings } = generator
  const field = model?.settings.duration
  if (field?.type !== "range") return null
  const raw = settings.duration
  const value =
    typeof raw === "number" && raw >= field.min && raw <= field.max
      ? raw
      : field.default
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="cinema-duration"
        className="flex items-center justify-between text-xs tracking-wide text-[#828282] uppercase"
      >
        {field.label ?? "Duration"}
        <span className="text-foreground normal-case tabular-nums">
          {value}
          {field.unit ?? ""}
        </span>
      </label>
      <input
        id="cinema-duration"
        type="range"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value}
        onChange={(event) =>
          generator.setSetting("duration", Number(event.target.value))
        }
        className="w-full accent-[var(--lime,#d1fe17)]"
      />
    </div>
  )
}

/** The look so far, in a director's one-liner. */
function DirectorNote({
  summary,
}: {
  summary: { key: LookKey; label: string }[]
}) {
  return (
    <p
      aria-live="polite"
      className="rounded-2xl border border-dashed border-white/10 px-3 py-2.5 text-xs text-muted-foreground"
    >
      {summary.length > 0 ? (
        <>
          <span className="text-foreground">Your look: </span>
          {summary.map((item) => item.label).join(" · ")}
        </>
      ) : (
        "Everything on Auto — the model directs. Pick any control to take over."
      )}
    </p>
  )
}

/* ── Scenes ───────────────────────────────────────────────────────────────── */

function SceneCanvas({ generator }: { generator: Generator }) {
  const { runs } = generator
  const items = useMemo(
    () => runs.records.flatMap(runToGalleryItems),
    [runs.records]
  )
  const { actions, dialogs } = useTileActions({ runs, reuse: generator.reuse })
  return (
    <section
      aria-label="Your scenes"
      className="relative flex min-h-[60vh] min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-white/10 md:min-h-0"
    >
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-3">
        <UserGenerations
          items={items}
          title={<span className="px-1 text-sm font-medium">Your scenes</span>}
          hasMore={runs.hasMore}
          loadingMore={runs.loadingMore}
          onLoadMore={runs.loadMore}
          actions={actions}
          emptyState={<DirectorIntro />}
        />
      </div>
      {dialogs}
    </section>
  )
}

const TIPS = [
  {
    title: "Write the scene, not the shot",
    body: "Describe who, where and what happens. The look controls handle lens, light and movement.",
  },
  {
    title: "Leave what you don't care about on Auto",
    body: "Auto controls are left out of the request, so the model chooses for you.",
  },
  {
    title: "Anchor it with references",
    body: "Attach up to 30 images, 10 videos and 10 audio clips to keep characters, places and sound consistent.",
  },
]

function DirectorIntro() {
  return (
    <div className="flex min-h-full flex-col justify-center gap-8 px-4 py-10 md:px-10">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 className="font-display text-4xl md:text-5xl">
          Direct the shot like a DP
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Pick the genre, era, camera, lens, light and palette — or let any of
          them ride on Auto. Up to 30 seconds with native sound.
        </p>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {TIPS.map((tip, index) => (
          <li key={tip.title} className="flex flex-col gap-2">
            <span className="w-fit rounded-md bg-surface px-2 py-0.5 text-xs text-muted-foreground">
              {index + 1}
            </span>
            <h3 className="font-display text-lg">{tip.title}</h3>
            <p className="text-sm text-muted-foreground">{tip.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
