import { describe, expect, test } from "vitest";

import type { SignPack } from "../../signpack-schema/src/index";
import {
  preparePlaybackModel,
  resolvePlaybackState,
  type AssetPlaybackState,
  type MediaClockSnapshot,
  type PlaybackFallbackReason,
  type PlaybackModel,
  type PlaybackState,
  type PreparePlaybackModelInput,
} from "./index";

type ReadyPlaybackModel = Extract<
  PlaybackModel,
  { readonly status: "ready" }
>;

const SOURCE_FINGERPRINT =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const OTHER_FINGERPRINT =
  "sha256:9999999999999999999999999999999999999999999999999999999999999999";
const ASSET_ONE_ID = "ast_playback000001";
const ASSET_TWO_ID = "ast_playback000002";
const SEGMENT_ONE_ID = "seg_playback000001";
const SEGMENT_TWO_ID = "seg_playback000002";
const SEGMENT_THREE_ID = "seg_playback000003";

interface ManifestOptions {
  readonly minimumVersion?: string;
  readonly firstSegmentStartMs?: number;
  readonly firstAssetDurationMs?: number;
  readonly firstSegmentAssetIds?: readonly string[];
}

function createPublishedManifest(
  options: ManifestOptions = {},
): SignPack {
  return {
    schemaVersion: "1.0.0",
    packId: "spk_playback000001",
    releaseStatus: "published",
    developmentOnly: false,
    linguisticReviewStatus: "human_reviewed",
    language: {
      signedLanguage: "ase",
      region: "US",
      dialect: "test-only-reviewed-contract",
      audience: "runtime contract test users",
      educationalContext: "synthetic runtime contract verification",
    },
    sourceVideo: {
      fingerprint: SOURCE_FINGERPRINT,
      durationMs: 4000,
    },
    runtimeCompatibility: {
      minimumVersion: options.minimumVersion ?? "1.2.0",
    },
    participants: {
      signerRefs: ["signer_playback000001"],
      reviewerRefs: ["reviewer_playback000001"],
    },
    segments: [
      {
        segmentId: SEGMENT_ONE_ID,
        startMs: options.firstSegmentStartMs ?? 0,
        endMs: 1000,
        translationStatus: "mapped",
        reviewStatus: "approved",
        decisionHash:
          "sha256:2111111111111111111111111111111111111111111111111111111111111111",
        captionFallback: {
          language: "en",
          text: "First reviewed segment caption.",
        },
        assetIds: options.firstSegmentAssetIds ?? [ASSET_ONE_ID],
      },
      {
        segmentId: SEGMENT_TWO_ID,
        startMs: 1500,
        endMs: 2500,
        translationStatus: "unsupported",
        reviewStatus: "approved",
        decisionHash:
          "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        captionFallback: {
          language: "en",
          text: "This reviewed segment has no approved sign mapping.",
        },
        assetIds: [],
        unsupportedReason: "no_reviewed_mapping",
      },
      {
        segmentId: SEGMENT_THREE_ID,
        startMs: 2500,
        endMs: 4000,
        translationStatus: "mapped",
        reviewStatus: "approved",
        decisionHash:
          "sha256:2333333333333333333333333333333333333333333333333333333333333333",
        captionFallback: {
          language: "en",
          text: "Third reviewed segment caption.",
        },
        assetIds: [ASSET_TWO_ID],
      },
    ],
    assets: [
      {
        assetId: ASSET_ONE_ID,
        path: "assets/playback-one.webm",
        sha256:
          "sha256:3111111111111111111111111111111111111111111111111111111111111111",
        mediaType: "video/webm",
        durationMs:
          options.firstAssetDurationMs ??
          1000 - (options.firstSegmentStartMs ?? 0),
      },
      {
        assetId: ASSET_TWO_ID,
        path: "assets/playback-two.mp4",
        sha256:
          "sha256:3222222222222222222222222222222222222222222222222222222222222222",
        mediaType: "video/mp4",
        durationMs: 1500,
      },
    ],
    publication: {
      releaseId:
        "sha256:4111111111111111111111111111111111111111111111111111111111111111",
      releasedAt: "2026-01-01T00:00:06.000Z",
      publisherId: "publisher_playback000001",
      assetLedgerHash:
        "sha256:4222222222222222222222222222222222222222222222222222222222222222",
      reviewLogHash:
        "sha256:4333333333333333333333333333333333333333333333333333333333333333",
      humanApprovalEventIds: [
        "rev_playback000001",
        "rev_playback000002",
        "rev_playback000003",
      ],
    },
  };
}

function createAssetStates(): Record<string, AssetPlaybackState> {
  return {
    [ASSET_ONE_ID]: "ready",
    [ASSET_TWO_ID]: "ready",
  };
}

function prepare(
  manifest: unknown = createPublishedManifest(),
  manifestIntegrity: "verified" | "unverified" | "corrupt" = "verified",
  assetStates: Readonly<Record<string, AssetPlaybackState>> =
    createAssetStates(),
  runtimeVersion = "1.2.0",
): PlaybackModel {
  return preparePlaybackModel({
    manifest,
    manifestIntegrity,
    assetStates,
    runtimeVersion,
  });
}

function requireReady(model: PlaybackModel): ReadyPlaybackModel {
  if (model.status !== "ready") {
    throw new Error(`expected a ready model, received ${model.reason}`);
  }
  return model;
}

function snapshot(
  overrides: Partial<MediaClockSnapshot> = {},
): MediaClockSnapshot {
  return {
    sourceFingerprint: SOURCE_FINGERPRINT,
    currentTimeMs: 0,
    paused: false,
    seeking: false,
    playbackRate: 1,
    ...overrides,
  };
}

function requireFallback(
  state: PlaybackState,
  reason: PlaybackFallbackReason,
): Extract<PlaybackState, { readonly kind: "caption_fallback" }> {
  expect(state).toMatchObject({
    kind: "caption_fallback",
    reason,
    preserveSourceCaptions: true,
  });
  if (state.kind !== "caption_fallback") {
    throw new Error("expected caption fallback state");
  }
  expect(Object.isFrozen(state)).toBe(true);
  return state;
}

function prepareUnknownInput(input: unknown): PlaybackModel {
  return preparePlaybackModel(input as PreparePlaybackModelInput);
}

function mutableObject(value: unknown): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

describe("preparePlaybackModel", () => {
  test("accepts only a verified, published, reviewed, compatible pack", () => {
    const model = prepare();

    expect(model.status).toBe("ready");
    expect("assurance" in model).toBe(false);
    if (model.status === "ready") {
      expect(model.sourceFingerprint).toBe(SOURCE_FINGERPRINT);
      expect(model.runtimeVersion).toBe("1.2.0");
      expect(model.segmentIndex).toHaveLength(3);
      expect(model.assetsById[ASSET_ONE_ID]?.durationMs).toBe(1000);
    }
  });

  test("blocks malformed manifests after structural validation", () => {
    expect(prepare({})).toEqual({
      status: "blocked",
      reason: "invalid_manifest",
    });
  });

  test("is total for primitive, null, proxy, and throwing envelope fields", () => {
    for (const input of [
      null,
      undefined,
      0,
      true,
      "",
      Symbol("invalid"),
      1n,
      (): void => {},
    ]) {
      expect(() => prepareUnknownInput(input)).not.toThrow();
      expect(prepareUnknownInput(input)).toMatchObject({
        status: "blocked",
        reason: "invalid_manifest",
      });
    }

    const hostileProxy = new Proxy(
      {},
      {
        get(): never {
          throw new Error("hostile preparation envelope");
        },
      },
    );
    expect(() => prepareUnknownInput(hostileProxy)).not.toThrow();
    expect(prepareUnknownInput(hostileProxy)).toMatchObject({
      status: "blocked",
      reason: "invalid_manifest",
    });

    const validFields: Readonly<Record<string, unknown>> = {
      manifest: createPublishedManifest(),
      manifestIntegrity: "verified",
      assetStates: createAssetStates(),
      runtimeVersion: "1.2.0",
    };
    for (const throwingField of Object.keys(validFields)) {
      const envelope: Record<string, unknown> = { ...validFields };
      Object.defineProperty(envelope, throwingField, {
        enumerable: true,
        get(): never {
          throw new Error(`hostile ${throwingField} getter`);
        },
      });
      expect(() => prepareUnknownInput(envelope)).not.toThrow();
      expect(prepareUnknownInput(envelope)).toMatchObject({
        status: "blocked",
        reason: "invalid_manifest",
      });
    }
  });

  test("captures every preparation envelope field exactly once", () => {
    const calls = {
      manifest: 0,
      manifestIntegrity: 0,
      assetStates: 0,
      runtimeVersion: 0,
    };
    const envelope: Record<string, unknown> = {};
    Object.defineProperties(envelope, {
      manifest: {
        enumerable: true,
        get(): unknown {
          calls.manifest += 1;
          return calls.manifest === 1 ? createPublishedManifest() : {};
        },
      },
      manifestIntegrity: {
        enumerable: true,
        get(): unknown {
          calls.manifestIntegrity += 1;
          return calls.manifestIntegrity === 1 ? "verified" : "corrupt";
        },
      },
      assetStates: {
        enumerable: true,
        get(): unknown {
          calls.assetStates += 1;
          return calls.assetStates === 1 ? createAssetStates() : {};
        },
      },
      runtimeVersion: {
        enumerable: true,
        get(): unknown {
          calls.runtimeVersion += 1;
          return calls.runtimeVersion === 1 ? "1.2.0" : "0.0.0";
        },
      },
    });

    expect(prepareUnknownInput(envelope).status).toBe("ready");
    expect(calls).toEqual({
      manifest: 1,
      manifestIntegrity: 1,
      assetStates: 1,
      runtimeVersion: 1,
    });
  });

  test("validates and prepares from one detached manifest snapshot", () => {
    const manifest = mutableObject(createPublishedManifest());
    const originalSourceVideo = structuredClone(
      manifest["sourceVideo"],
    );
    let sourceVideoReads = 0;
    Object.defineProperty(manifest, "sourceVideo", {
      enumerable: true,
      configurable: true,
      get(): unknown {
        sourceVideoReads += 1;
        return sourceVideoReads === 1
          ? originalSourceVideo
          : {
              fingerprint: OTHER_FINGERPRINT,
              durationMs: 1,
            };
      },
    });

    const model = requireReady(prepare(manifest));
    expect(sourceVideoReads).toBe(1);
    expect(model.sourceFingerprint).toBe(SOURCE_FINGERPRINT);
    expect(model.sourceDurationMs).toBe(4000);
  });

  test("blocks every publication-readiness gate", () => {
    const draft = mutableObject(createPublishedManifest());
    draft["releaseStatus"] = "draft";
    delete draft["publication"];
    expect(prepare(draft)).toEqual({
      status: "blocked",
      reason: "not_published",
    });

    const development = mutableObject(createPublishedManifest());
    development["developmentOnly"] = true;
    expect(prepare(development)).toEqual({
      status: "blocked",
      reason: "not_published",
    });

    const unreviewed = mutableObject(createPublishedManifest());
    unreviewed["linguisticReviewStatus"] = "not_reviewed";
    expect(prepare(unreviewed)).toEqual({
      status: "blocked",
      reason: "not_published",
    });

    const missingPublication = mutableObject(createPublishedManifest());
    delete missingPublication["publication"];
    expect(prepare(missingPublication)).toEqual({
      status: "blocked",
      reason: "not_published",
    });
  });

  test("distinguishes unverified and corrupt manifest integrity", () => {
    expect(prepare(createPublishedManifest(), "unverified")).toEqual({
      status: "blocked",
      reason: "unverified_manifest",
    });
    expect(prepare(createPublishedManifest(), "corrupt")).toEqual({
      status: "blocked",
      reason: "corrupt_manifest",
    });
  });

  test("uses minimum-version semver compatibility without numeric overflow", () => {
    expect(prepare(createPublishedManifest(), "verified", createAssetStates(), "1.1.9")).toEqual({
      status: "blocked",
      reason: "incompatible_runtime",
    });
    expect(prepare(createPublishedManifest(), "verified", createAssetStates(), "1.2")).toEqual({
      status: "blocked",
      reason: "incompatible_runtime",
    });
    expect(
      prepare(
        createPublishedManifest({
          minimumVersion: "999999999999999999999.0.0",
        }),
        "verified",
        createAssetStates(),
        "1000000000000000000000.0.0",
      ).status,
    ).toBe("ready");
  });

  test("owns a frozen copy that caller mutation cannot alter", () => {
    const manifest = mutableObject(createPublishedManifest());
    const assetStates = createAssetStates();
    const manifestBefore = structuredClone(manifest);
    const assetStatesBefore = structuredClone(assetStates);
    const model = requireReady(prepare(manifest, "verified", assetStates));

    expect(manifest).toEqual(manifestBefore);
    expect(assetStates).toEqual(assetStatesBefore);

    const sourceVideo = manifest["sourceVideo"] as Record<string, unknown>;
    sourceVideo["fingerprint"] = OTHER_FINGERPRINT;
    const segments = manifest["segments"] as Record<string, unknown>[];
    segments[0]!["endMs"] = 1;
    const assets = manifest["assets"] as Record<string, unknown>[];
    assets[0]!["durationMs"] = 1;
    assetStates[ASSET_ONE_ID] = "withdrawn";

    const state = resolvePlaybackState(
      model,
      snapshot({ currentTimeMs: 500 }),
    );
    expect(state).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_ONE_ID,
      assetTimeMs: 500,
    });
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.segmentIndex)).toBe(true);
    expect(Object.isFrozen(model.segmentIndex[0])).toBe(true);
    expect(
      Object.isFrozen(model.segmentIndex[0]?.captionFallback),
    ).toBe(true);
    expect(Object.isFrozen(model.segmentIndex[0]?.assetIds)).toBe(true);
    expect(Object.isFrozen(model.assetsById)).toBe(true);
    expect(Object.isFrozen(model.assetsById[ASSET_ONE_ID])).toBe(true);
    expect(Object.isFrozen(model.assetStates)).toBe(true);
  });
});

describe("resolvePlaybackState", () => {
  test("uses half-open segment boundaries and reports exact asset time", () => {
    const model = requireReady(prepare());

    const initial = resolvePlaybackState(model, snapshot());
    expect(Object.isFrozen(initial)).toBe(true);
    expect(initial).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_ONE_ID,
      asset: {
        assetId: ASSET_ONE_ID,
        path: "assets/playback-one.webm",
        mediaType: "video/webm",
        durationMs: 1000,
      },
      mediaTimeMs: 0,
      assetTimeMs: 0,
      paused: false,
      seeking: false,
      shouldPlay: true,
      captionFallback: {
        language: "en",
        text: "First reviewed segment caption.",
      },
      preserveSourceCaptions: true,
    });
    expect(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 999.999 })),
    ).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_ONE_ID,
      mediaTimeMs: 999.999,
      assetTimeMs: 999.999,
    });
    requireFallback(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 1000 })),
      "gap",
    );
    requireFallback(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 1500 })),
      "unsupported_segment",
    );
    const third = resolvePlaybackState(
      model,
      snapshot({ currentTimeMs: 2500 }),
    );
    expect(third).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_THREE_ID,
      mediaTimeMs: 2500,
      assetTimeMs: 0,
    });
    requireFallback(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 4000 })),
      "gap",
    );
  });

  test("treats valid pre-roll before the first segment as a gap", () => {
    const model = requireReady(
      prepare(createPublishedManifest({ firstSegmentStartMs: 100 })),
    );

    requireFallback(resolvePlaybackState(model, snapshot()), "gap");
    requireFallback(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 99.999 })),
      "gap",
    );
    expect(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 100 })),
    ).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_ONE_ID,
      assetTimeMs: 0,
    });
  });

  test("preserves reviewed segment captions for unsupported content", () => {
    const state = requireFallback(
      resolvePlaybackState(
        requireReady(prepare()),
        snapshot({ currentTimeMs: 2000 }),
      ),
      "unsupported_segment",
    );

    expect(state.segmentId).toBe(SEGMENT_TWO_ID);
    expect(state.captionFallback).toEqual({
      language: "en",
      text: "This reviewed segment has no approved sign mapping.",
    });
  });

  test("resolves a backward seek directly from the supplied clock", () => {
    const model = requireReady(prepare());
    expect(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 3000 })),
    ).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_THREE_ID,
      assetTimeMs: 500,
    });
    expect(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 125 })),
    ).toMatchObject({
      kind: "active_sign",
      segmentId: SEGMENT_ONE_ID,
      assetTimeMs: 125,
    });
  });

  test("makes pause and seek state immediate without changing mapping", () => {
    const model = requireReady(prepare());

    expect(
      resolvePlaybackState(
        model,
        snapshot({ currentTimeMs: 300, paused: true }),
      ),
    ).toMatchObject({
      kind: "active_sign",
      paused: true,
      seeking: false,
      shouldPlay: false,
      assetTimeMs: 300,
    });
    expect(
      resolvePlaybackState(
        model,
        snapshot({ currentTimeMs: 300, seeking: true }),
      ),
    ).toMatchObject({
      kind: "active_sign",
      paused: false,
      seeking: true,
      shouldPlay: false,
      assetTimeMs: 300,
    });
  });

  test("falls back for non-normal mapped playback rates", () => {
    const model = requireReady(prepare());

    for (const playbackRate of [0.5, 1.25, 2]) {
      const state = requireFallback(
        resolvePlaybackState(
          model,
          snapshot({ currentTimeMs: 300, playbackRate }),
        ),
        "unapproved_playback_rate",
      );
      expect(state.captionFallback?.text).toBe(
        "First reviewed segment caption.",
      );
    }
  });

  test("recovers immediately when playback rate returns to normal", () => {
    const model = requireReady(prepare());
    expect(
      resolvePlaybackState(
        model,
        snapshot({ currentTimeMs: 100, playbackRate: 1 }),
      ).kind,
    ).toBe("active_sign");
    requireFallback(
      resolvePlaybackState(
        model,
        snapshot({ currentTimeMs: 200, playbackRate: 1.5 }),
      ),
      "unapproved_playback_rate",
    );
    expect(
      resolvePlaybackState(
        model,
        snapshot({ currentTimeMs: 300, playbackRate: 1 }),
      ),
    ).toMatchObject({
      kind: "active_sign",
      assetTimeMs: 300,
    });
  });

  test("requires the exact source fingerprint on every sample", () => {
    const model = requireReady(prepare());
    requireFallback(
      resolvePlaybackState(
        model,
        snapshot({
          sourceFingerprint: OTHER_FINGERPRINT,
          currentTimeMs: 200,
        }),
      ),
      "source_mismatch",
    );
    expect(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 200 })).kind,
    ).toBe("active_sign");
  });

  test("rejects invalid clocks while treating the exact media end as a gap", () => {
    const model = requireReady(prepare());

    for (const currentTimeMs of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      4001,
    ]) {
      const state = requireFallback(
        resolvePlaybackState(model, snapshot({ currentTimeMs })),
        "invalid_clock",
      );
      expect(state.mediaTimeMs).toBeNull();
    }
    for (const playbackRate of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      requireFallback(
        resolvePlaybackState(model, snapshot({ playbackRate })),
        "invalid_clock",
      );
    }
    requireFallback(
      resolvePlaybackState(model, snapshot({ currentTimeMs: 4000 })),
      "gap",
    );
  });

  test("distinguishes missing, withdrawn, and corrupt assets", () => {
    const cases: readonly [
      Readonly<Record<string, AssetPlaybackState>>,
      PlaybackFallbackReason,
    ][] = [
      [{}, "missing_asset"],
      [{ [ASSET_ONE_ID]: "missing" }, "missing_asset"],
      [{ [ASSET_ONE_ID]: "withdrawn" }, "withdrawn_asset"],
      [{ [ASSET_ONE_ID]: "corrupt" }, "corrupt_asset"],
    ];

    for (const [assetStates, reason] of cases) {
      const model = requireReady(
        prepare(createPublishedManifest(), "verified", assetStates),
      );
      const state = requireFallback(
        resolvePlaybackState(model, snapshot({ currentTimeMs: 250 })),
        reason,
      );
      expect(state.captionFallback?.text).toBe(
        "First reviewed segment caption.",
      );
    }
  });

  test("refuses duration mismatches and multi-asset ambiguity", () => {
    const durationMismatch = requireReady(
      prepare(
        createPublishedManifest({ firstAssetDurationMs: 999 }),
        "verified",
        createAssetStates(),
      ),
    );
    requireFallback(
      resolvePlaybackState(
        durationMismatch,
        snapshot({ currentTimeMs: 200 }),
      ),
      "incompatible_segment",
    );

    const multipleAssets = requireReady(
      prepare(
        createPublishedManifest({
          firstSegmentAssetIds: [ASSET_ONE_ID, ASSET_TWO_ID],
        }),
        "verified",
        createAssetStates(),
      ),
    );
    const multiAssetFallback = requireFallback(
      resolvePlaybackState(
        multipleAssets,
        snapshot({ currentTimeMs: 200 }),
      ),
      "incompatible_segment",
    );
    expect(multiAssetFallback.captionFallback?.text).toBe(
      "First reviewed segment caption.",
    );
  });

  test("turns blocked models into localization-free caption fallbacks", () => {
    const draft = mutableObject(createPublishedManifest());
    draft["releaseStatus"] = "draft";
    delete draft["publication"];
    const blockedModels = [
      prepare({}),
      prepare(draft),
      prepare(createPublishedManifest(), "unverified"),
      prepare(createPublishedManifest(), "corrupt"),
      prepare(
        createPublishedManifest(),
        "verified",
        createAssetStates(),
        "1.0.0",
      ),
    ];

    for (const model of blockedModels) {
      if (model.status !== "blocked") {
        throw new Error("expected blocked preparation model");
      }
      const state = requireFallback(
        resolvePlaybackState(model, snapshot({ currentTimeMs: 700 })),
        model.reason,
      );
      expect(state.mediaTimeMs).toBe(700);
      expect("captionFallback" in state).toBe(false);
    }
  });

  test("is total and never throws for hostile snapshot values", () => {
    const model = requireReady(prepare());
    const nullSnapshot = null as unknown as MediaClockSnapshot;
    expect(() => resolvePlaybackState(model, nullSnapshot)).not.toThrow();
    requireFallback(
      resolvePlaybackState(model, nullSnapshot),
      "invalid_clock",
    );

    const wrongTypes = {
      sourceFingerprint: 1,
      currentTimeMs: 100,
      paused: "false",
      seeking: null,
      playbackRate: 1,
    } as unknown as MediaClockSnapshot;
    expect(() => resolvePlaybackState(model, wrongTypes)).not.toThrow();
    requireFallback(resolvePlaybackState(model, wrongTypes), "invalid_clock");

    const hostileSnapshot = new Proxy({} as MediaClockSnapshot, {
      get(): never {
        throw new Error("hostile clock getter");
      },
    });
    expect(() => resolvePlaybackState(model, hostileSnapshot)).not.toThrow();
    requireFallback(
      resolvePlaybackState(model, hostileSnapshot),
      "invalid_clock",
    );
  });

  test("captures every media-clock field exactly once", () => {
    const model = requireReady(prepare());
    const calls = {
      sourceFingerprint: 0,
      currentTimeMs: 0,
      paused: 0,
      seeking: 0,
      playbackRate: 0,
    };
    const changingClock: Record<string, unknown> = {};
    Object.defineProperties(changingClock, {
      sourceFingerprint: {
        enumerable: true,
        get(): unknown {
          calls.sourceFingerprint += 1;
          return calls.sourceFingerprint === 1
            ? SOURCE_FINGERPRINT
            : OTHER_FINGERPRINT;
        },
      },
      currentTimeMs: {
        enumerable: true,
        get(): unknown {
          calls.currentTimeMs += 1;
          return calls.currentTimeMs === 1 ? 250.25 : 5000;
        },
      },
      paused: {
        enumerable: true,
        get(): unknown {
          calls.paused += 1;
          return calls.paused === 1 ? false : "invalid";
        },
      },
      seeking: {
        enumerable: true,
        get(): unknown {
          calls.seeking += 1;
          return calls.seeking === 1 ? false : "invalid";
        },
      },
      playbackRate: {
        enumerable: true,
        get(): unknown {
          calls.playbackRate += 1;
          return calls.playbackRate === 1 ? 1 : 1.5;
        },
      },
    });

    expect(
      resolvePlaybackState(
        model,
        changingClock as unknown as MediaClockSnapshot,
      ),
    ).toMatchObject({
      kind: "active_sign",
      mediaTimeMs: 250.25,
      assetTimeMs: 250.25,
      paused: false,
      seeking: false,
      shouldPlay: true,
    });
    expect(calls).toEqual({
      sourceFingerprint: 1,
      currentTimeMs: 1,
      paused: 1,
      seeking: 1,
      playbackRate: 1,
    });
  });

  test("rejects forged ready, blocked, and primitive models", () => {
    const authentic = requireReady(prepare());
    const forgedReady = { ...authentic } as ReadyPlaybackModel;
    requireFallback(
      resolvePlaybackState(forgedReady, snapshot()),
      "invalid_manifest",
    );

    const forgedBlocked = {
      status: "blocked",
      reason: "unverified_manifest",
    } as unknown as PlaybackModel;
    requireFallback(
      resolvePlaybackState(forgedBlocked, snapshot()),
      "invalid_manifest",
    );

    const primitiveModel = null as unknown as PlaybackModel;
    expect(() =>
      resolvePlaybackState(primitiveModel, snapshot()),
    ).not.toThrow();
    requireFallback(
      resolvePlaybackState(primitiveModel, snapshot()),
      "invalid_manifest",
    );
  });
});
