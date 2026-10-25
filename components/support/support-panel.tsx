"use client"

import { useState } from "react"
import { Heart, Loader2 } from "lucide-react"

import { CopyButton } from "@/components/marketing/copy-button"
import type { SupportDetails } from "@/lib/support-rules"

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; details: SupportDetails }
  | { kind: "unavailable" }
  | { kind: "error" }

/**
 * Voluntary support by SPEI. The bank details are not in the page or the
 * bundle: they are requested from /api/donar only when this button is pressed,
 * so they never reach the page source, a crawler or a search engine's cache.
 */
export function SupportPanel({ className }: { className?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" })

  const reveal = async () => {
    setState({ kind: "loading" })
    try {
      const response = await fetch("/api/donar", { cache: "no-store" })
      if (response.status === 503) return setState({ kind: "unavailable" })
      if (!response.ok) return setState({ kind: "error" })
      setState({
        kind: "ready",
        details: (await response.json()) as SupportDetails,
      })
    } catch {
      setState({ kind: "error" })
    }
  }

  if (state.kind === "ready")
    return (
      <div className={className}>
        <dl className="flex flex-col divide-y divide-white/5 rounded-2xl bg-surface px-4 text-sm">
          {state.details.fields.map((field) => (
            <div
              key={field.k}
              className="flex items-center justify-between gap-4 py-3"
            >
              <dt className="text-[#828282]">{field.k}</dt>
              <dd className="flex min-w-0 items-center gap-3">
                <span className="truncate font-mono tabular-nums">
                  {field.v}
                </span>
                {field.copiable ? (
                  <CopyButton text={field.v} label="Copy" />
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {state.details.note}
        </p>
      </div>
    )

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void reveal()}
        disabled={state.kind === "loading"}
        className="btn-keycap inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-semibold disabled:opacity-70"
      >
        {state.kind === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Heart className="size-4" aria-hidden />
        )}
        Show how to support
      </button>
      {state.kind === "unavailable" ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Support details aren&apos;t set up yet. Thank you for wanting to help
          — please check back soon.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="mt-3 text-sm text-[#ff6b6b]">
          Couldn&apos;t load the details. Try again in a moment.
        </p>
      ) : null}
    </div>
  )
}
