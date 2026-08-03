import { expect, test } from "@playwright/test";

import { bindCaptionPackImport } from "../../apps/pwa/src/captionPackImport";
import type { CaptionPackStore } from "../../packages/pack-storage/src/index";

test.use({ trace: "on" });

test("restores the import input when an unexpected verified import fails", async () => {
  const inputTarget = new EventTarget();
  const input = Object.assign(inputTarget, {
    disabled: false,
    files: [new Blob(["{}"])],
    value: "synthetic-test-only.json",
  }) as unknown as HTMLInputElement;
  const status = { textContent: "" } as HTMLElement;
  const store = {
    importBlob: async (): Promise<never> => {
      throw new Error("private storage detail");
    },
  } as unknown as CaptionPackStore;
  const binding = bindCaptionPackImport({
    input,
    status,
    store,
    onVerified: () => true,
  });

  inputTarget.dispatchEvent(new Event("change"));
  await expect.poll(() => input.disabled).toBe(false);
  expect(input.value).toBe("");
  expect(status.textContent).toBe(
    "The caption pack could not be checked. The previous caption fallback remains available.",
  );
  binding.dispose();
});

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
  await expect(page.locator("#sign-media-surface video")).toHaveCount(1);
  await expect(page.locator("#integration-trace")).toHaveAttribute(
    "data-call-graph",
    "storage>adapter>runtime>renderer",
  );
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

test("drives synthetic motion through adapter samples and freezes unsupported rates", async ({
  page,
}) => {
  await page.goto("/");
  const trace = page.locator("#integration-trace");
  const initialSamples = Number(await trace.getAttribute("data-sample-count"));

  await page.getByRole("button", { name: "Load synthetic timing source" }).click();
  const video = page.getByLabel("Synthetic source video");
  await expect(video).toHaveJSProperty("readyState", 4);
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 1.5;
    element.dispatchEvent(new Event("seeking"));
    element.dispatchEvent(new Event("seeked"));
  });
  await expect(trace).not.toHaveAttribute(
    "data-sample-count",
    String(initialSamples),
  );
  await expect(page.locator("#synthetic-motion")).toHaveAttribute(
    "data-motion-state",
    "held_with_source",
  );

  await video.evaluate((element: HTMLVideoElement) => {
    element.playbackRate = 1.5;
  });
  await expect(page.locator("#synthetic-motion")).toHaveAttribute(
    "data-motion-state",
    "unapproved_playback_rate",
  );
  await expect(
    page.getByText("Synthetic caption fallback; no reviewed sign mapping exists."),
  ).toBeVisible();

  await video.evaluate((element: HTMLVideoElement) => {
    element.playbackRate = 1;
    element.pause();
  });
  await expect(page.locator("#synthetic-motion")).toHaveAttribute(
    "data-motion-state",
    "held_with_source",
  );
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

test("surfaces stored-byte corruption as a caption-preserving integrity failure", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Synthetic SignPack JSON")
    .setInputFiles("fixtures/synthetic-unsupported.signpack.json");
  await expect(page.locator("#caption-pack-status")).toContainText(
    "Structural validation and local digest passed",
  );

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("signbridge-packs", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("captionPacks", "readwrite");
      const store = transaction.objectStore("captionPacks");
      const request = store.get("spk_synthetic000001");
      request.onsuccess = () => {
        const record = request.result as Record<string, unknown>;
        store.put({
          ...record,
          manifestBytes: new TextEncoder().encode("{}").buffer,
        });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.locator("#caption-pack-status")).toHaveText(
    "The stored caption pack failed local integrity checks.",
  );
  await expect(
    page.getByRole("region", { name: "Signing overlay" }),
  ).toHaveAttribute("data-reason", "corrupt_manifest");
  await expect(
    page.getByRole("heading", { name: "Independent source captions" }),
  ).toBeVisible();
});
