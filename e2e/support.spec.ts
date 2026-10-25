import { expect, test } from "./fixtures"

import { dismissCookies, signIn, uniqueEmail } from "./helpers"

/**
 * Free mode with voluntary support. The bank details must never be in a page:
 * they are fetched from /api/donar only when someone presses the button. These
 * tests work whether or not the server has SUPPORT_CLABE configured.
 */
async function configuredClabe(
  request: import("@playwright/test").APIRequestContext
): Promise<string | null> {
  const response = await request.get("/api/donar")
  if (response.status() === 503) return null
  expect(response.status()).toBe(200)
  const body = (await response.json()) as { fields: { k: string; v: string }[] }
  return body.fields.find((field) => field.k === "CLABE")!.v
}

test("pricing leads to Support and the nav has no paid plans", async ({
  page,
}) => {
  await page.goto("/pricing")
  await expect(page).toHaveURL(/\/support$/)
  await expect(
    page.getByRole("heading", { name: /Free, with voluntary support/ })
  ).toBeVisible()
  const nav = page.getByRole("navigation", { name: "Main" })
  await expect(nav.getByRole("link", { name: "Support" })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Pricing" })).toHaveCount(0)
})

test("the bank details are not in the page and appear only on request", async ({
  page,
  request,
}) => {
  const clabe = await configuredClabe(request)
  await page.goto("/support")
  await dismissCookies(page)

  for (const path of ["/", "/support", "/community"]) {
    const html = await (await request.get(path)).text()
    expect(html).not.toMatch(/\b\d{18}\b/)
    if (clabe) expect(html).not.toContain(clabe)
  }

  await page.getByRole("button", { name: "Show how to support" }).click()
  if (clabe) {
    await expect(page.getByText(clabe)).toBeVisible()
    await expect(page.getByText("REBELSOFT ORG").first()).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Copy" }).first()
    ).toBeVisible()
  } else {
    await expect(page.getByText(/aren't set up yet/)).toBeVisible()
  }
})

test("the donation endpoint and robots keep it out of search engines", async ({
  request,
}) => {
  const response = await request.get("/api/donar")
  expect(response.headers()["cache-control"]).toBe("no-store")
  expect(response.headers()["x-robots-tag"]).toMatch(/noindex/)
  const robots = await (await request.get("/robots.txt")).text()
  expect(robots).toMatch(/Disallow: \/api\//)
})

test("signed in: free credits are granted and Support opens from the nav", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("support"), "/account")
  await page.goto("/account")
  await dismissCookies(page)
  await expect(page.getByText("Free credits this month")).toBeVisible()
  await expect(page.getByText(/free credits every month/)).toBeVisible()

  // Free users have no billing page to visit.
  await page.goto("/account/billing")
  await expect(page).toHaveURL(/\/account$/)

  await page.getByRole("button", { name: "Support" }).first().click()
  const dialog = page.getByRole("dialog", { name: "Support this app" })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Show how to support" })
  ).toBeVisible()
})

test("free accounts see no billing controls", async ({ page }) => {
  await signIn(page, uniqueEmail("nocheckout"), "/account")
  await page.goto("/account")
  await expect(
    page.getByRole("button", { name: "Manage billing" })
  ).toHaveCount(0)
})
