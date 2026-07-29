import { describe, expect, test } from "vitest";

import manifest from "../../../apps/extension/manifest.json";
// Vite supplies raw local files to release-policy tests; Chrome receives the
// same checked-in files directly in this build-free extension.
// @ts-expect-error Vite raw imports are intentionally not global TypeScript types.
import contentSource from "../../../apps/extension/content.js?raw";
// @ts-expect-error Vite raw imports are intentionally not global TypeScript types.
import popupDocument from "../../../apps/extension/popup.html?raw";
// @ts-expect-error Vite raw imports are intentionally not global TypeScript types.
import popupSource from "../../../apps/extension/popup.js?raw";

const REQUIRED_YOUTUBE_HOSTS = [
  "https://www.youtube.com/*",
  "https://m.youtube.com/*",
];
const OPTIONAL_GENERIC_HOSTS = ["http://*/*", "https://*/*"];

describe("extension release policy", () => {
  test("requires Manifest V3 and only the supported YouTube hosts", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.host_permissions).toEqual(REQUIRED_YOUTUBE_HOSTS);
    expect(manifest.content_scripts).toEqual([
      {
        matches: REQUIRED_YOUTUBE_HOSTS,
        js: ["content.js"],
        run_at: "document_idle",
      },
    ]);
    expect(JSON.stringify(manifest)).not.toContain("<all_urls>");
  });

  test("keeps generic-site access optional and initiated from explained UI", () => {
    expect(manifest.optional_host_permissions).toEqual(OPTIONAL_GENERIC_HOSTS);
    expect(popupDocument).toContain(
      "SignBridge will ask Chrome for access only to the site shown below.",
    );
    expect(popupDocument).toContain("Continue to Chrome prompt");
    expect(popupSource).toContain("chrome.permissions.request");
    expect(popupSource).toContain('grantButton?.addEventListener("click"');
    expect(popupSource).toContain("originPattern: `${url.origin}/*`");
  });

  test("locks extension pages to local code under the strict CSP", () => {
    expect(manifest.content_security_policy.extension_pages).toBe(
      "script-src 'self'; object-src 'none';",
    );
    expect(manifest.content_security_policy.extension_pages).not.toMatch(
      /https?:|unsafe-eval|unsafe-inline/u,
    );
    expect(popupDocument).toContain('<script src="popup.js"></script>');
    const scriptElements = [
      ...popupDocument.matchAll(
        /<script\b(?<attributes>[^>]*)>(?<body>[\s\S]*?)<\/script>/gu,
      ),
    ];
    expect(scriptElements).toHaveLength(1);
    expect(scriptElements[0]?.groups?.["attributes"]).toContain(
      'src="popup.js"',
    );
    expect(scriptElements[0]?.groups?.["body"]?.trim()).toBe("");

    for (const source of [popupSource, contentSource]) {
      expect(source).not.toMatch(
        /\b(?:eval|Function)\s*\(|import\s*\(\s*["']https?:/u,
      );
      expect(source).not.toMatch(/https?:\/\//u);
    }
  });
});
