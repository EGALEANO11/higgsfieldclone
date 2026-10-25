import type { Metadata } from "next"
import { Suspense } from "react"

import { CinemaView } from "@/components/cinema/cinema-view"

export const metadata: Metadata = {
  title: "Cinema Studio",
  description:
    "Direct video like a cinematographer: genre, era, camera, lens, light, movement and palette — up to 30 seconds with native sound.",
}

export default function CinemaPage() {
  return (
    <Suspense>
      <CinemaView />
    </Suspense>
  )
}
