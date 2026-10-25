import { expect, test } from "./fixtures"

const ROUTES = [
  "/",
  "/image",
  "/video",
  "/effects",
  "/effects/neon-noir",
  "/community",
  "/community/soul-2",
  "/models",
  "/models/soul-2",
  "/models/cinema-studio-4",
  "/cinema",
  "/enterprise",
  "/support",
  "/pricing",
  "/login",
  "/legal/terms",
]

for (const route of ROUTES) {
  test(`${route} renders without console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.locator("main")).toBeVisible()
    expect(
      errors.filter((text) => !/favicon|Download the React DevTools/.test(text))
    ).toEqual([])
  })
}

test("unknown effect and private generation are 404", async ({ page }) => {
  expect((await page.goto("/effects/does-not-exist"))?.status()).toBe(404)
  expect((await page.goto("/g/000000000000000000000000"))?.status()).toBe(404)
})

test("unknown model, community model and creator pages are 404", async ({
  page,
}) => {
  for (const path of [
    "/models/does-not-exist",
    "/community/does-not-exist",
    "/@nobody_here_123",
  ])
    expect((await page.goto(path))?.status(), path).toBe(404)
})

test("audio stays hidden until an audio model exists", async ({ page }) => {
  expect((await page.goto("/audio"))?.status()).toBe(404)
  await page.goto("/")
  await expect(
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Audio" })
  ).toHaveCount(0)
})
