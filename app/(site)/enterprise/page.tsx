import type { Metadata } from "next"
import { Mail } from "lucide-react"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "Teams & enterprise",
  description: `Using ${BRAND.name} for a team or at volume? Tell us what you need.`,
  alternates: { canonical: "/enterprise" },
}

/**
 * What the product does today vs. what we'd discuss. Nothing here promises a
 * feature that isn't built: shared workspaces, SSO and invoicing are listed as
 * things to ask about, and the page says so.
 */
const TODAY = [
  {
    title: "One balance, every model",
    body: "Image and video models from Seedance, Kling, Wan, Soul and more share a single credit balance and a single library.",
  },
  {
    title: "Projects",
    body: "Group generations into projects and keep a team's work in order.",
  },
  {
    title: "Higher concurrency on paid plans",
    body: "Run several generations in parallel; limits grow with the plan.",
  },
]

const ASK_ABOUT = [
  "Shared workspaces and pooled credits for a team",
  "Volume credit pricing",
  "Invoiced billing instead of card payments",
  "Single sign-on and member roles",
  "Higher capacity for production workloads",
]

function mailto(): string {
  const subject = encodeURIComponent(`${BRAND.name} for our team`)
  const body = encodeURIComponent(
    "Company / team:\nTeam size:\nWhat you'd generate (images, video, both):\nRough monthly volume:\nWhat you need from us:\n"
  )
  return `mailto:${BRAND.supportEmail}?subject=${subject}&body=${body}`
}

export default function EnterprisePage() {
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[960px] flex-col gap-12 px-4 pt-10 md:px-12 md:pt-14">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-display text-[36px] leading-none text-lime md:text-[56px]">
            Teams &amp; enterprise
          </h1>
          <p className="max-w-[560px] text-sm text-muted-foreground md:text-base">
            Making images and video together, or at volume? Tell us how you work
            and we&apos;ll tell you plainly what fits today and what
            doesn&apos;t.
          </p>
          <a
            href={mailto()}
            className="btn-keycap inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-semibold"
          >
            <Mail className="size-4" aria-hidden /> Talk to us
          </a>
          <p className="text-xs text-muted-foreground">
            Opens your email app, addressed to {BRAND.supportEmail}.
          </p>
        </header>

        <section aria-labelledby="today" className="flex flex-col gap-4">
          <h2 id="today" className="font-display text-2xl text-lime">
            What you get today
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {TODAY.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-1.5 rounded-2xl border border-hairline bg-panel p-4"
              >
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ask" className="flex flex-col gap-4">
          <h2 id="ask" className="font-display text-2xl text-lime">
            Not built yet — ask us
          </h2>
          <p className="text-sm text-muted-foreground">
            These aren&apos;t self-serve features. If you need one, say so in
            your message; it tells us what to build next.
          </p>
          <ul className="flex flex-col divide-y divide-white/5 rounded-2xl bg-surface px-4 text-sm">
            {ASK_ABOUT.map((item) => (
              <li key={item} className="py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
