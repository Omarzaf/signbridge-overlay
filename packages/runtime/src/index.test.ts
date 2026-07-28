import { describe, expect, test, vi } from "vitest";

import type { SignPack } from "../../signpack-schema/src/index";
import {
  preparePlaybackModel,
  type MediaClockSnapshot,
  type PlaybackModel,
} from "../../sync-engine/src/index";
import { createRuntimeController } from "./index";

type ReadyPlaybackModel = Extract<
  PlaybackModel,
  { readonly status: "ready" }
>;

const SOURCE_FINGERPRINT =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const ASSET_ID = "ast_runtime00000001";

function createReadyModel(): ReadyPlaybackModel {
  const manifest: SignPack = {
    schemaVersion: "1.0.0",
    packId: "spk_runtime00000001",
    releaseStatus: "published",
    developmentOnly: false,
    linguisticReviewStatus: "human_reviewed",
    language: {
      signedLanguage: "ase",
      region: "US",
      dialect: "runtime-test-only",
      audience: "runtime test users",
      educationalContext: "synthetic runtime verification",
    },
    sourceVideo: {
      fingerprint: SOURCE_FINGERPRINT,
      durationMs: 1000,
    },
    runtimeCompatibility: { minimumVersion: "1.2.0" },
    participants: {
      signerRefs: ["signer_runtime00000001"],
      reviewerRefs: ["reviewer_runtime00000001"],
    },
    segments: [
      {
        segmentId: "seg_runtime00000001",
        startMs: 0,
        endMs: 1000,
        translationStatus: "mapped",
        reviewStatus: "approved",
        decisionHash:
          "sha256:2111111111111111111111111111111111111111111111111111111111111111",
        captionFallback: {
          language: "en",
          text: "Runtime controller test caption.",
        },
        assetIds: [ASSET_ID],
      },
    ],
    assets: [
      {
        assetId: ASSET_ID,
        path: "assets/runtime.webm",
        sha256:
          "sha256:3111111111111111111111111111111111111111111111111111111111111111",
        mediaType: "video/webm",
        durationMs: 1000,
      },
    ],
    publication: {
      releaseId:
        "sha256:4111111111111111111111111111111111111111111111111111111111111111",
      releasedAt: "2026-01-01T00:00:06.000Z",
      publisherId: "publisher_runtime00000001",
      assetLedgerHash:
        "sha256:4222222222222222222222222222222222222222222222222222222222222222",
      reviewLogHash:
        "sha256:4333333333333333333333333333333333333333333333333333333333333333",
      humanApprovalEventIds: ["rev_runtime00000001"],
    },
  };
  const model = preparePlaybackModel({
    manifest,
    manifestIntegrity: "verified",
    assetStates: { [ASSET_ID]: "ready" },
    runtimeVersion: "1.2.0",
  });
  if (model.status !== "ready") {
    throw new Error(`expected ready runtime model, received ${model.reason}`);
  }
  return model;
}

function createBlockedModel(): PlaybackModel {
  const ready = createReadyModel();
  return preparePlaybackModel({
    manifest: {
      schemaVersion: "1.0.0",
      packId: "spk_invalid00000001",
    },
    manifestIntegrity: "unverified",
    assetStates: ready.assetStates,
    runtimeVersion: ready.runtimeVersion,
  });
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

describe("createRuntimeController", () => {
  test("starts safely and delegates every sample to the pure resolver", () => {
    const controller = createRuntimeController(createReadyModel());

    expect(controller.getState()).toBeNull();

    const active = controller.sample(snapshot({ currentTimeMs: 250 }));
    expect(active).toMatchObject({
      kind: "active_sign",
      mediaTimeMs: 250,
      assetTimeMs: 250,
      shouldPlay: true,
    });
    expect(controller.getState()).toBe(active);

    const paused = controller.sample(
      snapshot({ currentTimeMs: 300, paused: true }),
    );
    expect(paused).toMatchObject({
      kind: "active_sign",
      assetTimeMs: 300,
      paused: true,
      shouldPlay: false,
    });
  });

  test("notifies subscribers and supports independent unsubscription", () => {
    const controller = createRuntimeController(createReadyModel());
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = controller.subscribe(first);
    controller.subscribe(second);

    const initialSample = controller.sample(
      snapshot({ currentTimeMs: 100 }),
    );
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(initialSample);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    controller.sample(snapshot({ currentTimeMs: 200 }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  test("isolates listener failures from resolution and other listeners", () => {
    const controller = createRuntimeController(createReadyModel());
    const failingListener = vi.fn(() => {
      throw new Error("listener failure");
    });
    const healthyListener = vi.fn();
    controller.subscribe(failingListener);
    controller.subscribe(healthyListener);

    expect(() =>
      controller.sample(snapshot({ currentTimeMs: 400 })),
    ).not.toThrow();
    expect(failingListener).toHaveBeenCalledTimes(1);
    expect(healthyListener).toHaveBeenCalledTimes(1);
  });

  test("dispose is idempotent, clears listeners, and preserves stored state", () => {
    const controller = createRuntimeController(createReadyModel());
    const listener = vi.fn();
    controller.subscribe(listener);
    const stored = controller.sample(snapshot({ currentTimeMs: 100 }));

    controller.dispose();
    controller.dispose();
    const resolvedAfterDispose = controller.sample(
      snapshot({ currentTimeMs: 700 }),
    );

    expect(resolvedAfterDispose).toMatchObject({
      kind: "active_sign",
      assetTimeMs: 700,
    });
    expect(controller.getState()).toBe(stored);
    expect(listener).toHaveBeenCalledTimes(1);

    const lateListener = vi.fn();
    const lateUnsubscribe = controller.subscribe(lateListener);
    lateUnsubscribe();
    controller.sample(snapshot({ currentTimeMs: 800 }));
    expect(lateListener).not.toHaveBeenCalled();
  });

  test("preserves blocked-model reasons before and after sampling", () => {
    const controller = createRuntimeController(createBlockedModel());

    expect(controller.getState()).toBeNull();
    expect(controller.sample(snapshot({ currentTimeMs: 600 }))).toEqual({
      kind: "caption_fallback",
      reason: "unverified_manifest",
      mediaTimeMs: 600,
      preserveSourceCaptions: true,
    });
  });

  test("inherits the resolver's no-throw boundary for hostile samples", () => {
    const controller = createRuntimeController(createReadyModel());
    const hostile = new Proxy({} as MediaClockSnapshot, {
      get(): never {
        throw new Error("hostile media clock");
      },
    });

    expect(() => controller.sample(hostile)).not.toThrow();
    expect(controller.getState()).toEqual({
      kind: "caption_fallback",
      reason: "invalid_clock",
      mediaTimeMs: null,
      preserveSourceCaptions: true,
    });
  });

  test("rejects forged ready and blocked models", () => {
    const forgedReady = {
      ...createReadyModel(),
    } as ReadyPlaybackModel;
    const forgedReadyController = createRuntimeController(forgedReady);
    expect(forgedReadyController.sample(snapshot())).toEqual({
      kind: "caption_fallback",
      reason: "invalid_manifest",
      mediaTimeMs: null,
      preserveSourceCaptions: true,
    });

    const forgedBlocked = {
      status: "blocked",
      reason: "unverified_manifest",
    } as unknown as PlaybackModel;
    const forgedBlockedController = createRuntimeController(forgedBlocked);
    expect(forgedBlockedController.sample(snapshot())).toEqual({
      kind: "caption_fallback",
      reason: "invalid_manifest",
      mediaTimeMs: null,
      preserveSourceCaptions: true,
    });
  });

  test("freezes shared states before subscribers and stored state receive them", () => {
    const controller = createRuntimeController(createReadyModel());
    const observedTimes: number[] = [];
    controller.subscribe((state) => {
      (state as unknown as Record<string, unknown>)["mediaTimeMs"] = 999;
    });
    controller.subscribe((state) => {
      observedTimes.push(state.mediaTimeMs ?? -1);
    });

    const state = controller.sample(snapshot({ currentTimeMs: 125 }));
    expect(Object.isFrozen(state)).toBe(true);
    expect(observedTimes).toEqual([125]);
    expect(controller.getState()?.mediaTimeMs).toBe(125);
  });

  test("reports sampled state values in source-clock order", () => {
    const controller = createRuntimeController(createReadyModel());
    const observedTimes: number[] = [];
    controller.subscribe((state) => {
      observedTimes.push(state.mediaTimeMs ?? -1);
    });

    controller.sample(snapshot({ currentTimeMs: 100 }));
    controller.sample(snapshot({ currentTimeMs: 450 }));
    controller.sample(snapshot({ currentTimeMs: 50 }));

    expect(observedTimes).toEqual([100, 450, 50]);
    expect(controller.getState()?.mediaTimeMs).toBe(50);
  });

  test("does not schedule timeout, interval, or animation-frame work", () => {
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const intervalSpy = vi.spyOn(globalThis, "setInterval");
    const hadAnimationFrame = Object.prototype.hasOwnProperty.call(
      globalThis,
      "requestAnimationFrame",
    );
    const originalAnimationFrame = globalThis.requestAnimationFrame;
    const animationFrameSpy = vi.fn(
      (_callback: FrameRequestCallback): number => 1,
    );
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: animationFrameSpy,
    });

    try {
      const controller = createRuntimeController(createReadyModel());
      controller.subscribe(() => {});
      controller.sample(snapshot({ currentTimeMs: 100 }));
      controller.getState();
      controller.dispose();

      expect(timeoutSpy).not.toHaveBeenCalled();
      expect(intervalSpy).not.toHaveBeenCalled();
      expect(animationFrameSpy).not.toHaveBeenCalled();
    } finally {
      timeoutSpy.mockRestore();
      intervalSpy.mockRestore();
      if (hadAnimationFrame) {
        Object.defineProperty(globalThis, "requestAnimationFrame", {
          configurable: true,
          writable: true,
          value: originalAnimationFrame,
        });
      } else {
        Reflect.deleteProperty(globalThis, "requestAnimationFrame");
      }
    }
  });
});
