import { ObjectId } from "mongodb"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { MODELS } from "@/generation/catalog"
import {
  capabilityLabels,
  generatorHref,
  groupModels,
  modelPath,
  relatedModels,
  summarizeInputs,
  summarizeSettings,
} from "@/lib/model-pages"

import {
  clearDatabase,
  createUser,
  setupEnv,
  startDatabase,
  stopDatabase,
} from "./support/harness"

setupEnv()

describe("community by model", () => {
  beforeAll(startDatabase)
  afterAll(stopDatabase)
  beforeEach(clearDatabase)

  it("counts only published, completed, non-removed work per model", async () => {
    const { collections } = await import("@/lib/db/collections")
    const { listCommunityModels, countPublic } = await import("@/lib/community")
    const user = await createUser()
    const { generations } = await collections()
    let n = 0
    const insert = (modelId: string, extra: Record<string, unknown> = {}) =>
      generations.insertOne({
        _id: new ObjectId(),
        userId: user.objectId,
        submitKey: `k${n++}`,
        surface: "image",
        modelId,
        modelLabel: modelId,
        prompt: "p",
        settings: {},
        outputs: [],
        aspect: 1,
        status: "completed",
        isPublic: true,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...extra,
      } as never)
    await insert("soul-2")
    await insert("soul-2")
    await insert("grok-image-2")
    await insert("soul-2", { isPublic: false })
    await insert("soul-2", { unpublishedByAdmin: true })
    await insert("grok-image-2", { status: "failed" })

    expect(await listCommunityModels()).toEqual([
      { modelId: "soul-2", count: 2 },
      { modelId: "grok-image-2", count: 1 },
    ])
    expect(await countPublic("soul-2")).toBe(2)
    expect(await countPublic("recraft-4.1")).toBe(0)
  })
})

describe("model pages", () => {
  it("builds a landing page for every catalog model", () => {
    for (const model of MODELS) {
      expect(modelPath(model)).toBe(`/models/${encodeURIComponent(model.id)}`)
      expect(generatorHref(model)).toBe(
        model.id === "cinema-studio-4"
          ? "/cinema"
          : `/${model.surface}?model=${encodeURIComponent(model.id)}`
      )
      expect(summarizeSettings(model).length).toBe(
        Object.keys(model.settings).length
      )
      for (const setting of summarizeSettings(model)) {
        expect(setting.label).not.toBe("")
        expect(setting.options).not.toBe("")
        expect(setting.defaultValue).not.toBe("")
      }
      for (const input of summarizeInputs(model))
        expect(input.max).toBeGreaterThan(0)
      expect(capabilityLabels(model).length).toBeGreaterThan(0)
    }
  })

  it("has unique, URL-safe ids", () => {
    const ids = MODELS.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9._-]*$/)
  })

  it("groups every model once and never relates a model to itself", () => {
    const grouped = groupModels().flatMap((group) =>
      group.families.flatMap((family) => family.models)
    )
    expect(grouped).toHaveLength(MODELS.length)
    for (const model of MODELS)
      expect(relatedModels(model).some((other) => other.id === model.id)).toBe(
        false
      )
  })
})
