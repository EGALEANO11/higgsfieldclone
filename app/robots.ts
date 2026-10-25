import type { MetadataRoute } from "next"

import { BRAND } from "@/lib/brand"

/** Keep APIs and private pages out of search engines; the donation endpoint included. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? BRAND.productionUrl
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account", "/admin", "/assets", "/projects"],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  }
}
