import { chromium, expect, test } from "@playwright/test";

const NODE_FS_PROMISES = "node:fs/promises";
const NODE_PATH = "node:path";

test.use({ trace: "on" });

test("loads the bundled extension and keeps fallback status browser-controlled", async ({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "The unpacked-extension gate runs once in desktop Chromium.",
  );

  const { cp, readFile, writeFile } = await import(NODE_FS_PROMISES);
  const { resolve } = await import(NODE_PATH);
  const sourceExtension = resolve("apps/extension");
  const testExtension = testInfo.outputPath("extension");
  await cp(sourceExtension, testExtension, { recursive: true });
  const manifestPath = resolve(testExtension, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    host_permissions: string[];
    content_scripts: Array<{ matches: string[] }>;
  };
  const fixtureOrigin = "http://127.0.0.1:4173/*";
  manifest.host_permissions.push(fixtureOrigin);
  manifest.content_scripts[0]?.matches.push(fixtureOrigin);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const context = await chromium.launchPersistentContext(
    testInfo.outputPath("profile"),
    {
      channel: "chromium",
      ...(typeof testInfo.project.use.headless === "boolean"
        ? { headless: testInfo.project.use.headless }
        : {}),
      args: [
        `--disable-extensions-except=${testExtension}`,
        `--load-extension=${testExtension}`,
      ],
    },
  );
  try {
    const serviceWorker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const page = await context.newPage();
    await page.goto(
      "http://127.0.0.1:4173/extension-synthetic-test-only.html",
    );

    const host = page.locator("#signbridge-local-overlay");
    await expect(host).toHaveAttribute(
      "data-content-boundary",
      "synthetic-test-only",
    );
    await expect(host).toHaveAttribute(
      "data-call-graph",
      "storage>adapter>runtime>renderer",
    );
    await expect(host).toHaveAttribute("data-clock-sampled", "true");
    await expect(host).toHaveAttribute(
      "data-source-descriptor-sampled",
      "true",
    );
    await expect(host).toHaveAttribute("data-reason", "unverified_manifest");
    await expect(
      host.getByRole("status"),
    ).toHaveText("Signing is unavailable. Source captions remain available.");

    const primarySampleCount = Number(
      await host.getAttribute("data-sample-count"),
    );
    await page.locator("#incidental-player").evaluate((video) => {
      video.dispatchEvent(new Event("timeupdate"));
    });
    await page.waitForTimeout(100);
    expect(Number(await host.getAttribute("data-sample-count"))).toBe(
      primarySampleCount,
    );
    await page
      .getByLabel("Primary synthetic video")
      .evaluate((video: HTMLVideoElement) => {
        video.currentTime = 0.25;
        video.dispatchEvent(new Event("timeupdate"));
      });
    await expect
      .poll(async () => Number(await host.getAttribute("data-sample-count")))
      .toBeGreaterThan(primarySampleCount);

    const tabId = await serviceWorker.evaluate(async () => {
      const api = (globalThis as typeof globalThis & {
        chrome: {
          tabs: {
            query: (query: unknown) => Promise<Array<{ id?: number }>>;
          };
        };
      }).chrome;
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      return tab?.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);
    const getBadgeText = (): Promise<string> =>
      serviceWorker.evaluate(
        async ({ activeTabId }) => {
          const api = (globalThis as typeof globalThis & {
            chrome: {
              action: {
                getBadgeText: (details: { tabId: number }) => Promise<string>;
              };
            };
          }).chrome;
          return api.action.getBadgeText({ tabId: activeTabId });
        },
        { activeTabId: tabId },
      );
    await expect.poll(getBadgeText).toBe("CAP");

    await page.evaluate(() => {
      document.querySelector("#signbridge-local-overlay")?.remove();
    });
    await expect(host).toBeAttached();

    await page.getByRole("button", { name: "Start synthetic navigation" }).click();
    await expect(host).toHaveAttribute("data-media-state", "invalidated");
    await expect(host.getByRole("status")).toHaveText(
      "The video changed. Waiting for the new media source.",
    );
    await expect.poll(getBadgeText).toBe("WAIT");

    await page.getByRole("button", { name: "Finish synthetic navigation" }).click();
    await expect(host).toHaveAttribute("data-media-state", "sampled");
    await expect(host).toHaveAttribute("data-reason", "unverified_manifest");
    await expect.poll(getBadgeText).toBe("CAP");
  } finally {
    await context.close();
  }
});
