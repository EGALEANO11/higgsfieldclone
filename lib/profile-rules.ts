import { z } from "zod"

/**
 * Handle and bio rules. Pure and client-safe so the account form validates
 * exactly what the server enforces.
 */
export const HANDLE_MIN = 3
export const HANDLE_MAX = 24
export const BIO_MAX = 160

/** Paths and brand names a handle must never shadow or impersonate. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "api",
  "account",
  "assets",
  "audio",
  "billing",
  "community",
  "effects",
  "help",
  "image",
  "login",
  "logout",
  "models",
  "moderator",
  "pricing",
  "projects",
  "root",
  "settings",
  "staff",
  "support",
  "system",
  "video",
  "vireo",
  "higgsfield",
])

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN, `Handles need at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `Handles can be at most ${HANDLE_MAX} characters.`)
  .regex(
    /^[a-z0-9][a-z0-9_]*$/,
    "Use lowercase letters, numbers and underscores, starting with a letter or number."
  )
  .refine((value) => !RESERVED_HANDLES.has(value), "That handle is reserved.")

export const bioSchema = z
  .string()
  .trim()
  .transform((value) =>
    value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
  )
  .pipe(z.string().max(BIO_MAX, `Keep your bio under ${BIO_MAX} characters.`))

/** `/@handle`, the public profile URL. */
export function profilePath(handle: string): string {
  return `/@${handle}`
}
