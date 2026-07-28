import { describe, expect, test, vi } from "vitest";

import {
  captionPackImportMessage,
  importCaptionPack,
} from "../../apps/pwa/src/captionPackImport";
import type {
  CaptionPackStore,
  VerifiedLocalCaptionPack,
} from "../../packages/pack-storage/src/index";

const VERIFIED_PACK = {
  assurance: "local_storage_integrity_only",
  packId: "spk_synthetic000001",
  manifestSha256:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  manifest: {},
} as unknown as VerifiedLocalCaptionPack;

describe("caption pack import presenter", () => {
  test("reports success only after verified storage and mounting", async () => {
    const order: string[] = [];
    const store = {
      importBlob: vi.fn(async () => {
        order.push("verified");
        return { ok: true, value: VERIFIED_PACK } as const;
      }),
    } as unknown as CaptionPackStore;
    const onVerified = vi.fn(async () => {
      order.push("mounted");
      return true;
    });

    const message = await importCaptionPack(
      new Blob(["{}"]),
      store,
      onVerified,
    );

    expect(order).toEqual(["verified", "mounted"]);
    expect(message).toBe(
      "Structural validation and local digest passed. This draft is not published and cannot activate signing.",
    );
  });

  test("does not mount failed imports or expose raw errors", async () => {
    const store = {
      importBlob: vi.fn(async () => {
        return { ok: false, code: "invalid_manifest" } as const;
      }),
    } as unknown as CaptionPackStore;
    const onVerified = vi.fn(() => true);

    expect(
      await importCaptionPack(new Blob(["{}"]), store, onVerified),
    ).toBe("The selected file is not a valid SignPack.");
    expect(onVerified).not.toHaveBeenCalled();
    expect(captionPackImportMessage("storage_failed")).toBe(
      "The caption pack could not be stored locally.",
    );
  });
});
