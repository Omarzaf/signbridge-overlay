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
- `packages/signpack-publisher`: the only package permitted to combine approved
  review decisions with licensed assets into an immutable pack.
- `packages/video-adapters`: generic HTML5 and YouTube lifecycle adapters.
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
| Playback runtime | Render a compatible immutable published pack | Import authoring/reviewer code or accept pending content |

Playback packages may depend only on shared schemas, synchronization, storage,
and adapter contracts. Authoring and reviewer packages must never become runtime
dependencies. Import-boundary tests will enforce this once the TypeScript
toolchain is approved.

## Extension permission contract

- Initial required host access is YouTube only.
- Generic sites use `optional_host_permissions` and an explicit per-site grant.
- `<all_urls>` and remotely executed code are forbidden.
- Manifest, CSP, and permission checks become release tests when the extension
  toolchain is approved.

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
