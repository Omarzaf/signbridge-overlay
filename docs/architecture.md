# Architecture

## Separation of concerns

SignBridge has a strict publication/playback boundary:

```text
timed text
  -> constrained AI proposal
  -> human review
  -> strict publisher
  -> immutable SignPack
  -> cloud-independent runtime
  -> PWA or Chrome adapter
```

The authoring path may use cloud services. The playback path must not depend on
them.

## Modules

- `packages/runtime`: implemented framework-free, headless controller for
  sampling playback state. It is not yet an overlay UI.
- `packages/sync-engine`: implemented dependency-free mapping from an
  authoritative media-clock snapshot to a signing or caption-fallback state.
- `packages/signpack-schema`: versioned schema, validator, and migration policy.
- `packages/signpack-publisher`: the only package permitted to combine approved
  review decisions with licensed assets into an immutable pack.
- `packages/video-adapters`: future generic HTML5 and YouTube lifecycle
  adapters.
- `packages/pack-storage`: Cache Storage and IndexedDB integration.
- `packages/event-contracts`: privacy-preserving operational event definitions.
- `apps/pwa`: local-video, import/export, quota, and offline user experience.
- `apps/extension`: Manifest V3 content integration and narrow permissions.
- `apps/reviewer`: human review and correction console.
- `services/authoring`: server-side proposal workflow; it cannot publish.

## Authority and dependency direction

| Component | May emit | Must not do |
| --- | --- | --- |
| Authoring service | Constrained proposals and run metadata | Approve or publish |
| Reviewer application | Human decisions tied to exact proposal and asset hashes | Rewrite rights evidence or publish directly |
| SignPack publisher | Immutable pack after review, license, hash, and compatibility checks | Infer signs or weaken a failed gate |
| Playback runtime | Resolve a locally ready copy of a compatible immutable published-shaped pack into headless playback state | Authenticate publication, infer signing, import authoring/reviewer code, or accept pending content |

Playback packages may depend only on shared schemas, synchronization, storage,
and adapter contracts. Authoring and reviewer packages must never become runtime
dependencies.

The implemented playback import direction is:

```text
signpack-schema -> sync-engine -> runtime -> future adapters and applications
```

Dependencies must never point in the opposite direction.

## Headless playback boundary

`preparePlaybackModel` is the only path to a ready playback model. Preparation
checks the supplied manifest's structure, published shape, compatibility, and
supplied local integrity and asset states. The resulting model is immutable and
module-issued so a hand-built object cannot bypass preparation.

This is playback readiness only. It does not publish a pack, authenticate the
publisher, verify linguistic quality or legal authority, prove that a private
grant is genuine, or establish globally current withdrawal state.

`resolvePlaybackState` maps one immutable prepared model and one media-clock
snapshot to one immutable state:

- The snapshot is the sole time source; the sync engine and runtime have no
  timer or accumulated elapsed-time clock.
- Every sample carries the exact source fingerprint. A mismatch fails visibly
  instead of continuing signing for replacement media.
- Segments use half-open ranges, `[startMs, endMs)`. Fractional milliseconds
  are compared without rounding, and lookup uses binary search.
- Pause, seek, and playback-rate changes are recalculations from the new
  snapshot. Seeking or pausing suppresses sign-media play without changing the
  authoritative offset.
- Every state preserves independent source captions.
- Invalid, unpublished, unverified, corrupt, incompatible, unsupported,
  missing, withdrawn, source-mismatched, and gap cases return explicit
  caption-fallback reason codes.

The version-one mapped-segment path is intentionally narrow: one approved
mapped segment, one locally ready asset, an asset duration equal to the segment
duration, and source playback at exactly `1x`. Multi-asset sequencing and sign
retiming have no approved contract yet and therefore fall back visibly.

The controller only stores, publishes, and disposes resolved state. It owns no
DOM, media element, rendering framework, network request, or cloud service.

## Extension permission contract

- Initial required host access is YouTube only.
- Generic sites use `optional_host_permissions` and an explicit per-site grant.
- `<all_urls>` and remotely executed code are forbidden.
- Manifest, CSP, and permission checks become release tests when the extension
  toolchain is approved.

## Runtime constraints

- The sampled source media clock is authoritative.
- The runtime must recover from seek, pause, rate change, fullscreen, and video
  replacement.
- A SignPack is immutable by content hash once released.
- Missing, withdrawn, unsupported, or incompatible content fails visibly to
  captions.
- The core overlay has a provisional compressed-size budget of 200 KB.

## Explicit non-goals for the first release

- A universal signed language.
- Unreviewed text-to-sign publication.
- A photorealistic or 3D signing avatar.
- Mobile Chrome-extension support.
- Continuous cloud connectivity during viewing.
