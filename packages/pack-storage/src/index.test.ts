import { describe, expect, test, vi } from "vitest";

import syntheticManifest from "../../../fixtures/synthetic-unsupported.signpack.json";
import {
  MAX_CAPTION_PACK_BYTES,
  createCaptionPackStore,
  type CaptionPackPersistence,
  type StoredCaptionPackRecord,
} from "./index";

function createMemoryPersistence(): CaptionPackPersistence & {
  readonly records: Map<string, StoredCaptionPackRecord>;
} {
  const records = new Map<string, StoredCaptionPackRecord>();
  let activePackId: string | undefined;
  return {
    records,
    storeIfAbsent: async (record) => {
      const existing = records.get(record.packId);
      if (existing !== undefined) {
        return existing.manifestSha256 === record.manifestSha256
          ? "identical"
          : "conflict";
      }
      records.set(record.packId, {
        ...record,
        manifestBytes: record.manifestBytes.slice(0),
      });
      return "stored";
    },
    get: async (packId) => {
      const record = records.get(packId);
      return record === undefined
        ? undefined
        : {
            ...record,
            manifestBytes: record.manifestBytes.slice(0),
          };
    },
    setActivePackId: async (packId) => {
      activePackId = packId;
    },
    getActivePackId: async () => activePackId,
    close: (): void => {},
  };
}

function fixtureBlob(input: unknown = syntheticManifest): Blob {
  return new Blob([JSON.stringify(input)], {
    type: "application/json",
  });
}

describe("caption pack storage", () => {
  test("imports, stores, and re-verifies the synthetic fixture", async () => {
    const persistence = createMemoryPersistence();
    const store = createCaptionPackStore({ persistence });

    const imported = await store.importBlob(fixtureBlob());
    expect(imported).toMatchObject({
      ok: true,
      value: {
        assurance: "local_storage_integrity_only",
        packId: syntheticManifest.packId,
      },
    });
    if (!imported.ok) {
      throw new Error("expected the synthetic fixture to import");
    }
    expect(imported.value.manifestSha256).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(imported.value.manifest)).toBe(true);
    expect(
      await store.getVerified(syntheticManifest.packId),
    ).toEqual(imported);
    expect(await store.getActiveVerified()).toEqual(imported);
  });

  test("rejects empty, oversized, unreadable, invalid UTF-8, and invalid JSON", async () => {
    const store = createCaptionPackStore({
      persistence: createMemoryPersistence(),
    });
    expect(await store.importBlob(new Blob([]))).toEqual({
      ok: false,
      code: "empty_file",
    });

    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    const oversized = {
      size: MAX_CAPTION_PACK_BYTES + 1,
      arrayBuffer,
    } as unknown as Blob;
    expect(await store.importBlob(oversized)).toEqual({
      ok: false,
      code: "file_too_large",
    });
    expect(arrayBuffer).not.toHaveBeenCalled();

    const unreadable = {
      size: 1,
      arrayBuffer: async (): Promise<ArrayBuffer> => {
        throw new Error("private read error");
      },
    } as unknown as Blob;
    expect(await store.importBlob(unreadable)).toEqual({
      ok: false,
      code: "read_failed",
    });
    expect(
      await store.importBlob(new Blob([Uint8Array.of(255)])),
    ).toEqual({
      ok: false,
      code: "invalid_utf8",
    });
    expect(await store.importBlob(new Blob(["{"]))).toEqual({
      ok: false,
      code: "invalid_json",
    });
  });

  test("rejects malformed and non-caption-only manifest profiles", async () => {
    const store = createCaptionPackStore({
      persistence: createMemoryPersistence(),
    });
    expect(await store.importBlob(fixtureBlob({}))).toEqual({
      ok: false,
      code: "invalid_manifest",
    });

    const cases: Record<string, unknown>[] = [
      {
        ...structuredClone(syntheticManifest),
        language: {
          ...syntheticManifest.language,
          signedLanguage: "eng",
          region: "US",
        },
      },
      {
        ...structuredClone(syntheticManifest),
        linguisticReviewStatus: "human_reviewed",
      },
      {
        ...structuredClone(syntheticManifest),
        assets: [
          {
            assetId: "ast_synthetic000001",
            path: "assets/synthetic.webm",
            sha256:
              "sha256:3333333333333333333333333333333333333333333333333333333333333333",
            mediaType: "video/webm",
            durationMs: 1000,
          },
        ],
      },
    ];
    for (const manifest of cases) {
      expect(await store.importBlob(fixtureBlob(manifest))).toEqual({
        ok: false,
        code: "unsupported_import_profile",
      });
    }

    const publishedShape = structuredClone(
      syntheticManifest,
    ) as Record<string, unknown>;
    publishedShape["releaseStatus"] = "published";
    expect(await store.importBlob(fixtureBlob(publishedShape))).toMatchObject({
      ok: false,
    });
  });

  test("is idempotent for identical bytes and refuses pack ID conflicts", async () => {
    const store = createCaptionPackStore({
      persistence: createMemoryPersistence(),
    });
    const first = await store.importBlob(fixtureBlob());
    const second = await store.importBlob(fixtureBlob());
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);

    const changed = structuredClone(syntheticManifest);
    changed.segments[0]!.captionFallback.text = "Changed synthetic caption.";
    expect(await store.importBlob(fixtureBlob(changed))).toEqual({
      ok: false,
      code: "pack_id_conflict",
    });
  });

  test("detects modified stored bytes and digest values", async () => {
    const persistence = createMemoryPersistence();
    const store = createCaptionPackStore({ persistence });
    const imported = await store.importBlob(fixtureBlob());
    expect(imported.ok).toBe(true);

    const record = persistence.records.get(syntheticManifest.packId);
    if (record === undefined) {
      throw new Error("expected stored record");
    }
    persistence.records.set(syntheticManifest.packId, {
      ...record,
      manifestBytes: new TextEncoder().encode("{}").buffer,
    });
    expect(await store.getVerified(syntheticManifest.packId)).toEqual({
      ok: false,
      code: "integrity_mismatch",
    });

    persistence.records.set(syntheticManifest.packId, {
      ...record,
      manifestSha256:
        "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });
    expect(await store.getVerified(syntheticManifest.packId)).toEqual({
      ok: false,
      code: "integrity_mismatch",
    });
  });

  test("reports a failed activation without discarding the stored pack", async () => {
    const persistence = createMemoryPersistence();
    const store = createCaptionPackStore({
      persistence: {
        ...persistence,
        setActivePackId: async () => {
          throw new Error("private database details");
        },
      },
    });

    expect(await store.importBlob(fixtureBlob())).toEqual({
      ok: false,
      code: "storage_activation_failed",
    });
    expect(
      await store.getVerified(syntheticManifest.packId),
    ).toMatchObject({
      ok: true,
      value: { packId: syntheticManifest.packId },
    });
  });

  test("maps persistence failures to stable codes without leaking details", async () => {
    const store = createCaptionPackStore({
      persistence: {
        storeIfAbsent: async () => {
          throw new Error("private database details");
        },
        get: async () => {
          throw new Error("private database details");
        },
        setActivePackId: async () => {
          throw new Error("private database details");
        },
        getActivePackId: async () => {
          throw new Error("private database details");
        },
        close: (): void => {
          throw new Error("private database details");
        },
      },
    });

    expect(await store.importBlob(fixtureBlob())).toEqual({
      ok: false,
      code: "storage_failed",
    });
    expect(await store.getVerified(syntheticManifest.packId)).toEqual({
      ok: false,
      code: "storage_failed",
    });
    expect(() => store.close()).not.toThrow();
  });
});
