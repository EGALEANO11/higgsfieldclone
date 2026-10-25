import type { ModelEntry, SettingField } from "@/generation/catalog/types"

/**
 * Pure helpers behind the Cinema Studio workspace (/cinema). The creative
 * "look" controls are the catalog's own enum settings, each defaulting to
 * "auto" (omitted from the request so the model decides).
 */

export const LOOK_KEYS = [
  "genre",
  "era",
  "light",
  "pacing",
  "cameraLens",
  "cameraModel",
  "cameraAperture",
  "cameraMovement",
  "colorPalette",
] as const

export type LookKey = (typeof LOOK_KEYS)[number]

export type EnumField = Extract<SettingField, { type: "enum" }>

export function enumField(
  model: ModelEntry,
  key: string
): EnumField | undefined {
  const field = model.settings[key]
  return field?.type === "enum" ? field : undefined
}

export function optionLabel(field: EnumField, value: string): string {
  return field.labels?.[value] ?? value
}

/** The current value of an enum setting, falling back to its default. */
export function currentValue(
  field: EnumField,
  settings: Record<string, unknown>,
  key: string
): string {
  const value = settings[key]
  return typeof value === "string" && field.values.includes(value)
    ? value
    : field.default
}

/** Case-insensitive match on the visible label or the raw value. */
export function filterOptions(
  field: EnumField,
  query: string
): readonly string[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return field.values
  return field.values.filter(
    (value) =>
      value === "auto" ||
      optionLabel(field, value).toLowerCase().includes(needle) ||
      value.replace(/-/g, " ").includes(needle)
  )
}

/** Every look control set back to Auto. */
export function autoLook(model: ModelEntry): Record<string, string> {
  const look: Record<string, string> = {}
  for (const key of LOOK_KEYS) {
    const field = enumField(model, key)
    if (field) look[key] = "auto"
  }
  return look
}

/** The non-Auto choices as readable labels, in control order. */
export function lookSummary(
  model: ModelEntry,
  settings: Record<string, unknown>
): { key: LookKey; label: string }[] {
  const picked: { key: LookKey; label: string }[] = []
  for (const key of LOOK_KEYS) {
    const field = enumField(model, key)
    if (!field) continue
    const value = currentValue(field, settings, key)
    if (value !== "auto") picked.push({ key, label: optionLabel(field, value) })
  }
  return picked
}

/** A random look ("Surprise me"); `random` is injectable for tests. */
export function randomLook(
  model: ModelEntry,
  random: () => number = Math.random
): Record<string, string> {
  const look: Record<string, string> = {}
  for (const key of LOOK_KEYS) {
    const field = enumField(model, key)
    if (!field) continue
    const choices = field.values.filter((value) => value !== "auto")
    look[key] = choices[Math.floor(random() * choices.length)] ?? "auto"
  }
  return look
}

function hash(text: string): number {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/**
 * A stable two-stop gradient per palette name. The API gives palette names,
 * not colours, so this is only a recognisable identity for the picker.
 */
export function paletteSwatch(name: string): { from: string; to: string } {
  const seed = hash(name)
  const hue = seed % 360
  const shift = 30 + ((seed >>> 9) % 90)
  const saturation = 45 + ((seed >>> 17) % 40)
  return {
    from: `hsl(${hue} ${saturation}% 38%)`,
    to: `hsl(${(hue + shift) % 360} ${Math.max(30, saturation - 10)}% 62%)`,
  }
}
