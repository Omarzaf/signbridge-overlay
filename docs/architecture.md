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

## Planned modules

- `packages/runtime`: accessible overlay UI with no application-framework
  dependency.
- `packages/sync-engine`: deterministic mapping from media time to reviewed
  segments.
- `packages/signpack-schema`: versioned schema, validator, and migration policy.
- `packages/video-adapters`: generic HTML5 and YouTube lifecycle adapters.
- `packages/pack-storage`: Cache Storage and IndexedDB integration.
- `packages/event-contracts`: privacy-preserving operational event definitions.
- `apps/pwa`: local-video, import/export, quota, and offline user experience.
- `apps/extension`: Manifest V3 content integration and narrow permissions.
- `apps/reviewer`: human review and correction console.
- `services/authoring`: server-side proposal and publication workflow.

## Runtime constraints

- The media element's clock is authoritative.
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
