import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Gift, HeartHandshake, RefreshCw } from "lucide-react"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { SupportPanel } from "@/components/support/support-panel"
import { freeMonthlyCredits, isFreeMode } from "@/lib/billing/mode"
import { BRAND } from "@/lib/brand"
import { env } from "@/lib/env"

export const metadata: Metadata = {
  title: "Support",
  description: `${BRAND.name} is free. Voluntary support is what keeps it that way.`,
  alternates: { canonical: "/support" },
}

// The allowance comes from the environment; never bake it into a static page.
export const dynamic = "force-dynamic"

export default function SupportPage() {
  // The paid model has a pricing page instead.
  if (!isFreeMode()) redirect("/pricing")
  const credits = freeMonthlyCredits()
  const maker = env().SUPPORT_BENEFICIARY
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[860px] flex-col gap-12 px-4 pt-10 md:px-12 md:pt-14">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-display text-[36px] leading-none text-lime md:text-[56px]">
            Free, with voluntary support
          </h1>
          <p className="max-w-[560px] text-sm text-muted-foreground md:text-base">
            {BRAND.name} costs nothing to use. No card, no trial, no paywall. If
            it&apos;s useful to you and you&apos;d like to help it stay that
            way, you can.
          </p>
        </header>

        <ul className="grid gap-3 md:grid-cols-3">
          <li className="flex flex-col gap-2 rounded-2xl border border-hairline bg-panel p-4">
            <Gift className="size-5 text-lime" aria-hidden />
            <h2 className="font-medium">
              {credits > 0
                ? `${credits.toLocaleString("en-US")} free credits every month`
                : "Free to use"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Every account gets them automatically. The Generate button always
              shows what a run costs before you press it.
            </p>
          </li>
          <li className="flex flex-col gap-2 rounded-2xl border border-hairline bg-panel p-4">
            <RefreshCw className="size-5 text-lime" aria-hidden />
            <h2 className="font-medium">They refill on the 1st</h2>
            <p className="text-sm text-muted-foreground">
              Credits are topped back up at the start of each month (UTC).
              Unused credits don&apos;t pile up.
            </p>
          </li>
          <li className="flex flex-col gap-2 rounded-2xl border border-hairline bg-panel p-4">
            <HeartHandshake className="size-5 text-lime" aria-hidden />
            <h2 className="font-medium">Support is optional</h2>
            <p className="text-sm text-muted-foreground">
              Nothing is locked behind it. It simply helps pay for the image and
              video generation behind the app.
            </p>
          </li>
        </ul>

        <section
          aria-labelledby="how"
          className="flex flex-col items-center gap-5 rounded-3xl border border-hairline bg-panel p-6 text-center md:p-10"
        >
          <h2 id="how" className="font-display text-2xl">
            Want to help?
          </h2>
          <p className="max-w-[520px] text-sm text-muted-foreground">
            Every run is billed by the model providers, so generation is the
            real cost of keeping this free. Any amount helps, and so does just
            telling a friend.
          </p>
          <SupportPanel className="w-full max-w-[520px]" />
          <p className="text-xs text-muted-foreground">
            Support goes to {maker}, the studio that makes {BRAND.name}.
          </p>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          Running low before the refill? Come back on the 1st, or{" "}
          <Link href="/community" className="text-lime hover:underline">
            get inspired in the community
          </Link>{" "}
          while you wait.
        </p>
      </div>
    </div>
  )
}
