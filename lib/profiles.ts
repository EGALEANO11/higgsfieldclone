import "server-only"

import { MongoServerError, type ObjectId } from "mongodb"
import { z } from "zod"

import { displayName } from "@/lib/community"
import { collections } from "@/lib/db/collections"
import { UserFacingError } from "@/lib/errors"
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit"

import { handleSchema, bioSchema } from "./profile-rules"

/**
 * Public profiles are opt-in: a user has one only after choosing a handle.
 * Nothing private is exposed — no email, no credits, no unpublished work.
 */
export interface PublicProfile {
  id: string
  handle: string
  name: string
  image?: string
  bio?: string
  joinedAt: number
  counts: { total: number; image: number; video: number; audio: number }
}

export interface OwnProfile {
  handle: string | null
  bio: string
}

export const profileSchema = z.object({
  /** Empty string clears the handle (the profile goes offline). */
  handle: z.union([z.literal(""), handleSchema]),
  bio: bioSchema,
})

export async function getOwnProfile(userId: ObjectId): Promise<OwnProfile> {
  const { users } = await collections()
  const user = await users.findOne(
    { _id: userId },
    { projection: { handle: 1, bio: 1 } }
  )
  return { handle: user?.handle ?? null, bio: user?.bio ?? "" }
}

export async function updateOwnProfile(
  userId: ObjectId,
  raw: unknown
): Promise<OwnProfile> {
  const input = profileSchema.parse(raw)
  await enforceRateLimit(
    `profile:${userId.toHexString()}`,
    LIMITS.profilePerUser.limit,
    LIMITS.profilePerUser.window,
    "You've changed your profile a lot. Try again in a little while."
  )
  const { users } = await collections()
  const set: Record<string, string> = {}
  const unset: Record<string, ""> = {}
  if (input.handle) set.handle = input.handle
  else unset.handle = ""
  if (input.bio) set.bio = input.bio
  else unset.bio = ""
  try {
    await users.updateOne(
      { _id: userId },
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      }
    )
  } catch (caught) {
    if (caught instanceof MongoServerError && caught.code === 11000)
      throw new UserFacingError("That handle is taken. Try another.", "TAKEN")
    throw caught
  }
  return { handle: input.handle || null, bio: input.bio }
}

/** Looks a profile up by (case-insensitive) handle; null when none exists. */
export async function getProfileByHandle(
  rawHandle: string
): Promise<(PublicProfile & { userId: ObjectId }) | null> {
  const parsed = handleSchema.safeParse(rawHandle)
  if (!parsed.success) return null
  const { users, generations } = await collections()
  const user = await users.findOne({ handle: parsed.data })
  if (!user?.handle) return null
  const grouped = await generations
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          userId: user._id,
          isPublic: true,
          status: "completed",
          unpublishedByAdmin: { $ne: true },
        },
      },
      { $group: { _id: "$surface", count: { $sum: 1 } } },
    ])
    .toArray()
  const counts = { total: 0, image: 0, video: 0, audio: 0 }
  for (const row of grouped) {
    if (row._id === "image" || row._id === "video" || row._id === "audio")
      counts[row._id] = row.count
    counts.total += row.count
  }
  return {
    id: user._id.toHexString(),
    userId: user._id,
    handle: user.handle,
    name: displayName(user),
    ...(user.image ? { image: user.image } : {}),
    ...(user.bio ? { bio: user.bio } : {}),
    joinedAt: user.createdAt.getTime(),
    counts,
  }
}
