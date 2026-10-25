import { ObjectId } from "mongodb"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { getModel } from "@/generation/catalog"
import { parseSettings } from "@/generation/catalog"
import { toPlatform } from "@/generation/to-platform"
import {
  LOOK_KEYS,
  autoLook,
  currentValue,
  enumField,
  filterOptions,
  lookSummary,
  optionLabel,
  paletteSwatch,
  randomLook,
} from "@/lib/cinema"
import { CINEMA_MODEL_ID, workspacePath } from "@/lib/studio/workspace"

import {
  clearDatabase,
  createUser,
  setupEnv,
  startDatabase,
  stopDatabase,
} from "./support/harness"

setupEnv()

const { collections } = await import("@/lib/db/collections")
const { listGenerations } = await import("@/lib/generations/library")

const model = getModel(CINEMA_MODEL_ID)

describe("cinema look helpers", () => {
  it("exposes every look control as an enum that defaults to Auto", () => {
    for (const key of LOOK_KEYS) {
      const field = enumField(model, key)
      expect(field, key).toBeDefined()
      expect(field!.default).toBe("auto")
      expect(field!.values[0]).toBe("auto")
    }
  })

  it("summarizes only non-Auto choices, with the model's own labels", () => {
    expect(lookSummary(model, {})).toEqual([])
    const summary = lookSummary(model, {
      genre: "noir",
      cameraLens: "clean-sharp",
      era: "auto",
      light: "not-a-real-value",
    })
    expect(summary).toEqual([
      { key: "genre", label: "Noir" },
      { key: "cameraLens", label: "Clean and sharp" },
    ])
  })

  it("falls back to the default for unknown values", () => {
    const field = enumField(model, "genre")!
    expect(currentValue(field, { genre: "bogus" }, "genre")).toBe("auto")
    expect(currentValue(field, { genre: "horror" }, "genre")).toBe("horror")
    expect(optionLabel(field, "auto")).toBe("Auto")
  })

  it("filters by label or raw value and always keeps Auto", () => {
    const field = enumField(model, "cameraMovement")!
    expect(filterOptions(field, "")).toEqual(field.values)
    const zoom = filterOptions(field, "zoom")
    expect(zoom).toContain("auto")
    expect(zoom).toContain("slow-zoom-in")
    expect(zoom).toContain("dolly-zoom")
    expect(zoom).not.toContain("handheld")
    expect(filterOptions(field, "pov")).toContain("pov")
    expect(filterOptions(field, "zzzz")).toEqual(["auto"])
  })

  it("resets and randomizes into values the request mapper accepts", () => {
    expect(Object.keys(autoLook(model)).sort()).toEqual([...LOOK_KEYS].sort())
    for (const seed of [0, 0.5, 0.999]) {
      const look = randomLook(model, () => seed)
      for (const key of LOOK_KEYS) {
        expect(enumField(model, key)!.values).toContain(look[key])
        expect(look[key]).not.toBe("auto")
      }
      const { body } = toPlatform({
        model: model.id,
        prompt: { text: "A quiet street" },
        media: {},
        settings: parseSettings(model, look),
      })
      expect(body.genre).toBe(look.genre)
      expect(body.camera_movement).toBe(look.cameraMovement)
      expect(body.color_palette).toBe(look.colorPalette)
    }
  })

  it("leaves Auto controls out of the request", () => {
    const { body } = toPlatform({
      model: model.id,
      prompt: { text: "A quiet street" },
      media: {},
      settings: parseSettings(model, autoLook(model)),
    })
    for (const key of [
      "genre",
      "era",
      "light",
      "pacing",
      "camera_lens",
      "camera_model",
      "camera_aperture",
      "camera_movement",
      "color_palette",
    ])
      expect(body).not.toHaveProperty(key)
  })

  it("gives palettes a stable, distinct swatch", () => {
    expect(paletteSwatch("pink-velvet")).toEqual(paletteSwatch("pink-velvet"))
    const field = enumField(model, "colorPalette")!
    const swatches = new Set(
      field.values.map((value) => JSON.stringify(paletteSwatch(value)))
    )
    expect(swatches.size).toBeGreaterThan(field.values.length * 0.9)
  })

  it("routes Cinema Studio to its workspace and everything else to a generator", () => {
    expect(workspacePath("video", CINEMA_MODEL_ID)).toBe("/cinema")
    expect(workspacePath("video", "kling-3-std")).toBe(
      "/video?model=kling-3-std"
    )
    expect(workspacePath("image", "recraft-4.1")).toBe(
      "/image?model=recraft-4.1"
    )
  })
})

describe("history filtered by model", () => {
  beforeAll(startDatabase)
  afterAll(stopDatabase)
  beforeEach(clearDatabase)

  it("returns only the caller's runs of that model", async () => {
    const user = await createUser()
    const other = await createUser()
    const { generations } = await collections()
    const insert = (userId: ObjectId, modelId: string, key: string) =>
      generations.insertOne({
        _id: new ObjectId(),
        userId,
        submitKey: key,
        surface: "video",
        modelId,
        modelLabel: modelId,
        modelPath: "x",
        requestBody: {},
        prompt: "p",
        settings: {},
        media: [],
        status: "completed",
        cost: 1,
        costSplit: { subscription: 0, topup: 1 },
        refunded: 0,
        priceUsd: 0,
        billing: { units: 1, provisional: false, creditsPerUnit: 1 },
        outputs: [],
        aspect: 1,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        finalizeAttempts: 0,
      } as never)
    await insert(user.objectId, CINEMA_MODEL_ID, "a")
    await insert(user.objectId, "kling-3-std", "b")
    await insert(other.objectId, CINEMA_MODEL_ID, "c")

    const cinema = await listGenerations(user.objectId, {
      surface: "video",
      modelId: CINEMA_MODEL_ID,
    })
    expect(cinema.items.map((item) => item.modelId)).toEqual([CINEMA_MODEL_ID])
    const all = await listGenerations(user.objectId, { surface: "video" })
    expect(all.items).toHaveLength(2)
  })
})
