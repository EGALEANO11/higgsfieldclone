import type { Metadata } from "next"
import { notFound, unstable_rethrow } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { CommunityFeed } from "@/components/marketing/community-feed"
import { AuthorAvatar } from "@/components/marketing/community-wall"
import { loadPublic } from "@/components/marketing/data"
import { BRAND } from "@/lib/brand"
import { getProfileByHandle } from "@/lib/profiles"
import { profilePath } from "@/lib/profile-rules"

type Params = Promise<{ handle: string }>

async function load(handle: string) {
  try {
    return await getProfileByHandle(decodeURIComponent(handle))
  } catch (error) {
    unstable_rethrow(error)
    console.error(
      "[profile] unavailable",
      error instanceof Error ? error.message : error
    )
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { handle } = await params
  const profile = await load(handle)
  if (!profile) return { title: "Creator not found" }
  const title = `${profile.name} (@${profile.handle})`
  const description =
    profile.bio ||
    `${profile.counts.total} published ${
      profile.counts.total === 1 ? "piece" : "pieces"
    } by ${profile.name} on ${BRAND.name}.`
  return {
    title,
    description,
    alternates: { canonical: profilePath(profile.handle) },
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  }
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { handle } = await params
  const profile = await load(handle)
  if (!profile) notFound()
  const page = await loadPublic({ userId: profile.userId, limit: 24 })
  const joined = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  })
  const stats = [
    { label: "Published", value: profile.counts.total },
    { label: "Images", value: profile.counts.image },
    { label: "Videos", value: profile.counts.video },
  ]
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pt-10 md:px-12 md:pt-14">
        <header className="flex flex-col items-center gap-4 text-center">
          <AuthorAvatar
            name={profile.name}
            image={profile.image}
            className="size-24 text-3xl"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-4xl leading-none md:text-5xl">
              {profile.name}
            </h1>
            <p className="text-sm text-lime">@{profile.handle}</p>
          </div>
          {profile.bio ? (
            <p className="max-w-[520px] text-sm leading-6 break-words text-muted-foreground md:text-base">
              {profile.bio}
            </p>
          ) : null}
          <dl className="flex items-center gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <dd className="font-mono text-xl font-semibold tabular-nums">
                  {stat.value.toLocaleString("en-US")}
                </dd>
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden /> Joined {joined}
          </p>
        </header>
        <CommunityFeed
          initial={page.items}
          initialCursor={page.nextCursor}
          initialError={page.failed}
          scope={{ handle: profile.handle }}
          emptyTitle={`${profile.name} hasn't published anything yet`}
          emptyBody="Published generations show up here, with the prompt and settings that made them."
        />
      </div>
    </div>
  )
}
