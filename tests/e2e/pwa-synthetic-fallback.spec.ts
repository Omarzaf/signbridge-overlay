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
  await expect(
    page
      .getByRole("region", { name: "Signing overlay" })
      .getByRole("status"),
  ).toHaveText(
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
  const overlayStatus = page
    .getByRole("region", { name: "Signing overlay" })
    .getByRole("status");
  await hideButton.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Restore overlay" }),
  ).toBeFocused();
  await expect(overlayStatus).toBeHidden();

  await page.keyboard.press("Enter");
  await expect(overlayStatus).toBeVisible();
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

test("imports and restores a verified local synthetic caption pack", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") {
      externalRequests.push(request.url());
    }
  });
  await page.goto("/");

  await page
    .getByLabel("Synthetic SignPack JSON")
    .setInputFiles("fixtures/synthetic-unsupported.signpack.json");
  const importRegion = page.getByRole("region", {
    name: "Import a synthetic caption pack",
  });
  await expect(importRegion.getByRole("status")).toHaveText(
    "Structural validation and local digest passed. This draft is not published and cannot activate signing.",
  );
  await expect(
    page.getByRole("region", { name: "Signing overlay" }),
  ).toHaveAttribute("data-reason", "not_published");
  await expect(
    page.getByText(
      "Synthetic caption fallback; no reviewed sign mapping exists.",
    ),
  ).toBeVisible();
  await expect(page.locator('[data-state="active_sign"]')).toHaveCount(0);

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Import a synthetic caption pack" })
      .getByRole("status"),
  ).toHaveText(
    "Verified local synthetic caption pack restored. This draft remains unpublished.",
  );
  await expect(
    page.getByRole("region", { name: "Signing overlay" }),
  ).toHaveAttribute("data-reason", "not_published");
  expect(externalRequests).toEqual([]);
});

test("rejects an invalid local pack without changing playback state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Synthetic SignPack JSON")
    .setInputFiles("fixtures/synthetic-invalid-caption-pack.json");

  await expect(
    page
      .getByRole("region", { name: "Import a synthetic caption pack" })
      .getByRole("status"),
  ).toHaveText(
    "The selected file is not a valid SignPack.",
  );
  await expect(
    page.getByRole("region", { name: "Signing overlay" }),
  ).toHaveAttribute("data-reason", "not_published");
  await expect(page.locator('[data-state="active_sign"]')).toHaveCount(0);
});
