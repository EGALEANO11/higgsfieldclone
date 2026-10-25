/**
 * Voluntary-support helpers that are safe on client and server. The bank
 * details themselves never live in the repository: they come from the
 * environment (SUPPORT_CLABE) and are only sent when someone asks for them.
 */

const WEIGHTS = [3, 7, 1] as const

/** The control digit of the first 17 digits of a Mexican CLABE. */
export function clabeControlDigit(first17: string): number {
  let sum = 0
  for (let index = 0; index < 17; index++)
    sum += (Number(first17[index]) * WEIGHTS[index % 3]!) % 10
  return (10 - (sum % 10)) % 10
}

/** 18 digits whose last one matches the CLABE check digit. */
export function isValidClabe(value: string): boolean {
  return (
    /^\d{18}$/.test(value) &&
    clabeControlDigit(value.slice(0, 17)) === Number(value[17])
  )
}

export interface SupportField {
  k: string
  v: string
  /** Offer a copy button next to the value. */
  copiable: boolean
}

export interface SupportDetails {
  fields: SupportField[]
  note: string
}

export const SPEI_NOTE =
  "SPEI transfer from any bank in Mexico. The deposit goes by CLABE, so the beneficiary name is informational: if your banking app shows a different one when it validates the account, it is the same account and you can continue."
