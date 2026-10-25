import { ObjectId } from "mongodb"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  BIO_MAX,
  bioSchema,
  handleSchema,
  profilePath,
} from "@/lib/profile-rules"

import {
  clearDatabase,
  createUser,
  setupEnv,
  startDatabase,
  stopDatabase,
} from "./support/harness"

setupEnv()

const { collections } = await import("@/lib/db/collections")
const { listPublic } = await import("@/lib/community")
const { getOwnProfile, getProfileByHandle, updateOwnProfile } =
  await import("@/lib/profiles")

describe("profile rules", () => {
  it("normalizes and accepts valid handles", () => {
    expect(handleSchema.parse("  Fher_01 ")).toBe("fher_01")
    expect(handleSchema.parse("a1b")).toBe("a1b")
  })

  it.each(["ab", "x".repeat(25), "has space", "dash-ed", "_lead", "ñandú"])(
    "rejects %j",
    (value) => {
      expect(handleSchema.safeParse(value).success).toBe(false)
    }
  )

  it.each(["admin", "Models", "VIREO", "higgsfield", "api"])(
    "reserves %j",
    (value) => {
      expect(handleSchema.safeParse(value).success).toBe(false)
    }
  )

  it("limits and cleans the bio", () => {
    expect(bioSchema.parse("  hi\u0000 there ")).toBe("hi there")
    expect(bioSchema.safeParse("x".repeat(BIO_MAX + 1)).success).toBe(false)
  })

  it("builds the public path", () => {
    expect(profilePath("fher")).toBe("/@fher")
  })
})

describe("profiles", () => {
  beforeAll(startDatabase)
  afterAll(stopDatabase)
  beforeEach(clearDatabase)

  async function publish(
    userId: ObjectId,
    overrides: Record<string, unknown> = {}
  ) {
    const { generations } = await collections()
    const now = new Date()
    await generations.insertOne({
      _id: new ObjectId(),
      userId,
      submitKey: new ObjectId().toHexString(),
      surface: "image",
      modelId: "soul-2",
      modelLabel: "Soul 2",
      prompt: "a lighthouse",
      settings: {},
      outputs: [
        {
          kind: "image",
          url: "https://cdn.test/a.png",
          key: "a.png",
          contentType: "image/png",
          storage: "r2",
        },
      ],
      aspect: 1,
      status: "completed",
      isPublic: true,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as never)
  }

  it("sets, changes and clears a handle", async () => {
    const user = await createUser()
    expect(await getOwnProfile(user.objectId)).toEqual({
      handle: null,
      bio: "",
    })

    const saved = await updateOwnProfile(user.objectId, {
      handle: "Maker_One",
      bio: "I make skies",
    })
    expect(saved).toEqual({ handle: "maker_one", bio: "I make skies" })
    expect((await getProfileByHandle("MAKER_ONE"))?.bio).toBe("I make skies")

    await updateOwnProfile(user.objectId, { handle: "", bio: "" })
    expect(await getOwnProfile(user.objectId)).toEqual({
      handle: null,
      bio: "",
    })
    expect(await getProfileByHandle("maker_one")).toBeNull()
  })

  it("refuses a taken or reserved handle", async () => {
    const first = await createUser()
    const second = await createUser()
    await updateOwnProfile(first.objectId, { handle: "taken", bio: "" })
    await expect(
      updateOwnProfile(second.objectId, { handle: "taken", bio: "" })
    ).rejects.toMatchObject({ code: "TAKEN" })
    await expect(
      updateOwnProfile(second.objectId, { handle: "admin", bio: "" })
    ).rejects.toThrow()
    expect((await getOwnProfile(second.objectId)).handle).toBeNull()
  })

  it("exposes no email and counts only published, completed work", async () => {
    const user = await createUser()
    await updateOwnProfile(user.objectId, { handle: "maker", bio: "" })
    await publish(user.objectId)
    await publish(user.objectId, { surface: "video" })
    await publish(user.objectId, { isPublic: false })
    await publish(user.objectId, { status: "failed" })
    await publish(user.objectId, { unpublishedByAdmin: true })

    const profile = await getProfileByHandle("maker")
    expect(profile?.counts).toEqual({ total: 2, image: 1, video: 1, audio: 0 })
    expect(JSON.stringify(profile)).not.toContain("@example.com")
    expect(await getProfileByHandle("nobody")).toBeNull()
    expect(await getProfileByHandle("not a handle!")).toBeNull()
  })

  it("lists one author's feed and exposes the handle only when set", async () => {
    const owner = await createUser()
    const other = await createUser()
    await updateOwnProfile(owner.objectId, { handle: "owner", bio: "" })
    await publish(owner.objectId)
    await publish(other.objectId)

    const mine = await listPublic({ userId: owner.objectId })
    expect(mine.items).toHaveLength(1)
    expect(mine.items[0]?.author.handle).toBe("owner")

    const all = await listPublic({})
    expect(all.items).toHaveLength(2)
    expect(all.items.find((item) => !item.author.handle)).toBeDefined()
  })

  it("filters the feed by model", async () => {
    const user = await createUser()
    await publish(user.objectId, { modelId: "soul-2" })
    await publish(user.objectId, { modelId: "grok-image-2" })
    const page = await listPublic({ modelId: "grok-image-2" })
    expect(page.items.map((item) => item.modelId)).toEqual(["grok-image-2"])
  })
})
