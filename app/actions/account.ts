"use server"

import { listLedger, type LedgerEntryView } from "@/lib/account"
import { runAction } from "@/lib/action-result"
import type { ActionResult } from "@/lib/action-types"
import { requireUser } from "@/lib/auth/session"
import { updateOwnProfile, type OwnProfile } from "@/lib/profiles"

export async function loadLedgerAction(
  cursor: string
): Promise<
  ActionResult<{ items: LedgerEntryView[]; nextCursor: string | null }>
> {
  return runAction(async () =>
    listLedger((await requireUser()).objectId, cursor)
  )
}

export async function updateProfileAction(
  input: unknown
): Promise<ActionResult<OwnProfile>> {
  return runAction(async () =>
    updateOwnProfile((await requireUser()).objectId, input)
  )
}
