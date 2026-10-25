"use client"

import Link from "next/link"
import { useState, useTransition, type FormEvent } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

import { updateProfileAction } from "@/app/actions/account"
import { useToast } from "@/components/providers/app-providers"
import {
  BIO_MAX,
  HANDLE_MAX,
  bioSchema,
  handleSchema,
  profilePath,
} from "@/lib/profile-rules"

/** Public profile settings: a handle turns the page on, clearing it turns it off. */
export function ProfileForm({
  initialHandle,
  initialBio,
}: {
  initialHandle: string | null
  initialBio: string
}) {
  const toast = useToast()
  const [handle, setHandle] = useState(initialHandle ?? "")
  const [bio, setBio] = useState(initialBio)
  const [saved, setSaved] = useState({
    handle: initialHandle ?? "",
    bio: initialBio,
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = handle !== saved.handle || bio !== saved.bio

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cleanHandle = handle.trim().toLowerCase()
    if (cleanHandle) {
      const parsed = handleSchema.safeParse(cleanHandle)
      if (!parsed.success) return setError(parsed.error.issues[0]!.message)
    }
    const parsedBio = bioSchema.safeParse(bio)
    if (!parsedBio.success) return setError(parsedBio.error.issues[0]!.message)
    setError(null)
    startTransition(async () => {
      const result = await updateProfileAction({
        handle: cleanHandle,
        bio: parsedBio.data,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const next = {
        handle: result.data.handle ?? "",
        bio: result.data.bio,
      }
      setHandle(next.handle)
      setBio(next.bio)
      setSaved(next)
      toast.success(
        next.handle ? "Profile saved" : "Profile hidden",
        next.handle
          ? `Your page is live at ${profilePath(next.handle)}`
          : "Your public page is offline."
      )
    })
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="profile" className="text-lg font-semibold">
            Public profile
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick a handle to get a page with everything you&apos;ve published.
            Leave it empty to stay private.
          </p>
        </div>
        {saved.handle ? (
          <Link
            href={profilePath(saved.handle)}
            className="flex items-center gap-1.5 text-sm text-lime hover:underline"
          >
            View profile <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Handle</span>
        <span className="flex h-11 items-center rounded-xl bg-white/5 px-3 focus-within:ring-2 focus-within:ring-lime/60">
          <span className="text-muted-foreground" aria-hidden>
            @
          </span>
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value.toLowerCase())}
            maxLength={HANDLE_MAX}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="your_handle"
            aria-invalid={error ? true : undefined}
            className="h-full flex-1 bg-transparent px-1 outline-none"
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="flex justify-between text-muted-foreground">
          Bio
          <span className="tabular-nums">
            {bio.length}/{BIO_MAX}
          </span>
        </span>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={3}
          maxLength={BIO_MAX}
          placeholder="What do you make?"
          className="resize-none rounded-xl bg-white/5 px-3 py-2.5 outline-none focus:ring-2 focus:ring-lime/60"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-[#ff6b6b]">
          {error}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={!dirty || pending}
          className="btn-keycap flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save profile
        </button>
      </div>
    </form>
  )
}
