import { expect, test } from "./fixtures"

import { balance, dismissCookies, signIn, uniqueEmail } from "./helpers"

test("choose a handle, see the public profile, then take it offline", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("profile"), "/account")
  const handle = `e2e${Date.now() % 100_000_000}`

  await page.goto("/account")
  await dismissCookies(page)
  await page.getByLabel("Handle").fill(handle.toUpperCase())
  await page.getByLabel(/^Bio/).fill("Skies and slow camera moves")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved")).toBeVisible()

  // The public page needs no session, and shows no email.
  const visitor = await page.context().browser()!.newContext()
  const anonymous = await visitor.newPage()
  const response = await anonymous.goto(
    `${new URL(page.url()).origin}/@${handle}`
  )
  expect(response?.status()).toBe(200)
  await expect(anonymous.getByText(`@${handle}`).first()).toBeVisible()
  await expect(anonymous.getByText("Skies and slow camera moves")).toBeVisible()
  expect(await anonymous.content()).not.toContain("@example.test")
  await visitor.close()

  // Clearing the handle takes the page offline.
  await page.getByLabel("Handle").fill("")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile hidden")).toBeVisible()
  expect((await page.goto(`/@${handle}`))?.status()).toBe(404)
})

test("a taken or reserved handle is refused with a readable error", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("reserved"), "/account")
  await page.goto("/account")
  await dismissCookies(page)
  await page.getByLabel("Handle").fill("admin")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("That handle is reserved.")).toBeVisible()
})

test("Cinema Studio: direct the look, generate, and keep the scene in its history", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("cinema"), "/cinema")
  await page.goto("/cinema")
  await dismissCookies(page)

  await page.getByRole("radio", { name: "Noir" }).click()
  await page.getByRole("radio", { name: "1980s" }).click()
  await expect(page.getByText("Your look: Noir · 1980s")).toBeVisible()

  // Cheapest settings so the signup bonus covers the run.
  await page.getByRole("radio", { name: "480p" }).click()
  await page.getByRole("slider", { name: /Duration/ }).press("Home")
  await expect(page.getByRole("slider", { name: "Duration 4s" })).toBeVisible()

  await page
    .getByRole("textbox", { name: "Prompt" })
    .fill("A lighthouse keeper climbs the spiral stairs at dusk")
  const before = await balance(page)
  await page.getByRole("button", { name: /^Generate/ }).click()

  const scene = page.getByRole("button", {
    name: /Open generation: .*lighthouse keeper/,
  })
  await expect.poll(() => balance(page)).toBeLessThan(before)
  await expect(scene).toBeVisible({ timeout: 60_000 })

  // The video generator doesn't pick up Cinema Studio as its model.
  await page.goto("/video")
  await expect(
    page.getByRole("button", { name: /Model.*Cinema Studio/ })
  ).toHaveCount(0)
})
