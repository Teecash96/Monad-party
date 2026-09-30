import { expect, test } from "@playwright/test";

test("landing page loads its hero and has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Monad Party", level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "Transparent raffle machine selecting three winning tokens" })).toBeVisible();
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images.filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0).length,
  );
  expect(brokenImages).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("seeded winner history is loaded from the API", async ({ page }) => {
  const response = page.waitForResponse((request) => request.url().endsWith("/api/history"));
  await page.goto("/history");
  expect((await response).status()).toBe(200);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByText("500000000000000000 wei")).toBeVisible();
  await expect(page.getByText("No completed draws yet.")).toHaveCount(0);
});

test("privacy and deletion instructions are public", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  await expect(page.locator("#deletion")).toBeVisible();
  await page.getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { name: "Terms of service" })).toBeVisible();
});
