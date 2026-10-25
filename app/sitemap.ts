import type { MetadataRoute } from "next"

import { MODELS } from "@/generation/catalog"
import { BRAND } from "@/lib/brand"
import { modelPath } from "@/lib/model-pages"

/**
 * Static, indexable pages. Profiles are opt-in and unbounded, so they are not
 * listed here; they are discovered through the community feed instead.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? BRAND.productionUrl
  const entry = (path: string, priority: number) => ({
    url: new URL(path, base).toString(),
    priority,
  })
  return [
    entry("/", 1),
    entry("/models", 0.9),
    ...MODELS.map((model) => entry(modelPath(model), 0.7)),
    entry("/community", 0.6),
    ...MODELS.map((model) =>
      entry(`/community/${encodeURIComponent(model.id)}`, 0.4)
    ),
    entry("/effects", 0.6),
    entry("/pricing", 0.6),
    entry("/support", 0.5),
    entry("/enterprise", 0.4),
  ]
}
