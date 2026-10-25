import type { Surface } from "@/generation/catalog/types"

/** Cinema Studio has its own workspace; every other model lives in a generator. */
export const CINEMA_MODEL_ID = "cinema-studio-4"

/** Where a model is used: its workspace, with the model preselected when shared. */
export function workspacePath(surface: Surface, modelId: string): string {
  return modelId === CINEMA_MODEL_ID
    ? "/cinema"
    : `/${surface}?model=${encodeURIComponent(modelId)}`
}
