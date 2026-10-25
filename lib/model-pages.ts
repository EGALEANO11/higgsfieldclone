import { MODELS } from "@/generation/catalog"
import { workspacePath } from "@/lib/studio/workspace"
import type {
  MediaRole,
  ModelEntry,
  SettingField,
  Surface,
} from "@/generation/catalog/types"

/**
 * Pure helpers behind /models. Everything shown there is derived from the
 * catalog entry, so a new model file gets a landing page with no extra work.
 */

export const ROLE_NOUN: Record<MediaRole, string> = {
  start: "Start frame",
  end: "End frame",
  reference: "Reference image",
  video: "Reference video",
  audio: "Audio",
  source: "Source video",
}

/** "aspectRatio" → "Aspect ratio", "generate_audio" → "Generate audio". */
function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

export interface SettingSummary {
  key: string
  label: string
  /** Human summary of what can be chosen. */
  options: string
  /** Default, formatted. */
  defaultValue: string
  hint?: string
}

function formatDefault(field: SettingField): string {
  if (field.type === "boolean") return field.default ? "On" : "Off"
  if (field.type === "range")
    return `${field.default}${field.unit ? field.unit : ""}`
  return field.labels?.[field.default] ?? field.default
}

function formatOptions(field: SettingField): string {
  if (field.type === "boolean") return "On / Off"
  if (field.type === "range") {
    const unit = field.unit ?? ""
    return `${field.min}${unit} – ${field.max}${unit}`
  }
  return field.values.map((value) => field.labels?.[value] ?? value).join(" · ")
}

export function summarizeSettings(model: ModelEntry): SettingSummary[] {
  return Object.entries(model.settings).map(([key, field]) => ({
    key,
    label: field.label ?? humanizeKey(key),
    options: formatOptions(field),
    defaultValue: formatDefault(field),
    ...(field.hint ? { hint: field.hint } : {}),
  }))
}

export interface InputSummary {
  role: MediaRole
  label: string
  max: number
  required: boolean
}

/** What a user can attach, with the model's own slot names. */
export function summarizeInputs(model: ModelEntry): InputSummary[] {
  const roles = new Map<MediaRole, number>()
  const add = (source: Partial<Record<MediaRole, number>>) => {
    for (const [role, count] of Object.entries(source) as [MediaRole, number][])
      if (count > 0) roles.set(role, Math.max(roles.get(role) ?? 0, count))
  }
  add(model.roles)
  for (const mode of model.mediaModes ?? []) add(mode.roles)
  return [...roles].map(([role, max]) => ({
    role,
    label: model.roleLabels?.[role] ?? ROLE_NOUN[role],
    max,
    required: model.requiredRoles?.includes(role) ?? false,
  }))
}

/** "Text to video", "Image to video"… from what the model accepts. */
export function capabilityLabels(model: ModelEntry): string[] {
  const inputs = summarizeInputs(model)
  const has = (role: MediaRole) => inputs.some((input) => input.role === role)
  const labels: string[] = []
  const needsMedia = (model.requiredRoles?.length ?? 0) > 0
  if (!needsMedia && model.requirePrompt !== false)
    labels.push(`Text to ${model.surface}`)
  if (has("start")) labels.push(`Image to ${model.surface}`)
  if (has("start") && has("end")) labels.push("First & last frame")
  if (has("reference")) labels.push("Reference images")
  if (has("video")) labels.push("Video references")
  if (has("source"))
    labels.push(model.tab === "motion" ? "Motion control" : "Video editing")
  if (has("audio")) labels.push("Audio input")
  return labels
}

export function modelPath(model: Pick<ModelEntry, "id">): string {
  return `/models/${encodeURIComponent(model.id)}`
}

export function generatorHref(model: ModelEntry): string {
  return workspacePath(model.surface, model.id)
}

export function relatedModels(model: ModelEntry, limit = 4): ModelEntry[] {
  const sameFamily = MODELS.filter(
    (other) => other.id !== model.id && other.family === model.family
  )
  const sameSurface = MODELS.filter(
    (other) =>
      other.id !== model.id &&
      other.surface === model.surface &&
      other.family !== model.family &&
      (other.tab ?? "create") === (model.tab ?? "create")
  )
  return [...sameFamily, ...sameSurface].slice(0, limit)
}

export interface ModelGroup {
  surface: Surface
  families: { family: string; models: ModelEntry[] }[]
}

/** Catalog grouped Surface → family for the /models index. */
export function groupModels(): ModelGroup[] {
  const groups: ModelGroup[] = []
  for (const surface of ["image", "video", "audio"] as const) {
    const inSurface = MODELS.filter((model) => model.surface === surface)
    if (inSurface.length === 0) continue
    const families = new Map<string, ModelEntry[]>()
    for (const model of [...inSurface].sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999)
    ))
      families.set(model.family, [...(families.get(model.family) ?? []), model])
    groups.push({
      surface,
      families: [...families].map(([family, models]) => ({ family, models })),
    })
  }
  return groups
}
