import { expect, test } from "@playwright/test";

test("keeps the synthetic boundary and caption fallback visible", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "SignBridge synthetic playback shell",
    }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC TEST ONLY")).toHaveCount(2);
  await expect(page.getByLabel("Synthetic source video")).toBeVisible();
  await expect(page.getByRole("region", { name: "Signing overlay" })).toHaveAttribute(
    "data-reason",
    "not_published",
  );
  await expect(page.getByRole("status")).toHaveText(
    "Signing is unavailable for this synthetic draft.",
  );
  await expect(
    page.getByRole("heading", { name: "Independent source captions" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Synthetic caption fallback; no reviewed sign mapping exists.",
    ),
  ).toBeVisible();
});

test("supports keyboard controls and a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");

  const hideButton = page.getByRole("button", { name: "Hide overlay" });
  await hideButton.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Restore overlay" }),
  ).toBeFocused();
  await expect(page.getByRole("status")).toBeHidden();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Large overlay" }).click();
  await expect(
    page.getByRole("button", { name: "Standard overlay" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Move overlay to top" }).click();
  await expect(
    page.getByRole("button", { name: "Move overlay to bottom" }),
  ).toHaveAttribute("aria-pressed", "true");

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
});
