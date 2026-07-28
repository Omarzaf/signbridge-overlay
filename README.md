# SignBridge Overlay

SignBridge Overlay is a proposed open-source integration layer for synchronizing
human-reviewed, language-specific signing media with online or offline video.
It is not a universal sign language and it is not an automated interpreter.

The product will have two independent paths:

1. A tiny viewer that plays approved SignPacks beside a video without requiring
   cloud access.
2. A controlled authoring system in which Gemini may propose mappings, while a
   qualified human reviewer retains publication authority.

## Current status

This repository contains the project foundation, approved development
toolchain, Gate 1 structural contracts, the Goal 2 headless playback core, and
the Goal 3 synthetic browser and local-storage integration. The contract
package validates draft SignPacks, review events, asset ledgers, release
requests, reproducibility records, and contest-evidence records without a
production dependency.

The playback core prepares an immutable local-readiness model, maps exact media
snapshots to immutable signing or caption-fallback states, and exposes a
framework-free controller. A dependency-free HTML5 adapter now samples the
actual media clock and a local PWA shell renders the draft `zxx`/`ZZ` fixture as
an explicit `not_published` caption fallback. Synthetic caption packs can be
size-limited, structurally validated, hashed, stored in IndexedDB, and
revalidated after retrieval. None of these paths uses a timer, network call, or
cloud dependency.

The repository still does not contain a working signing viewer, sign-language
corpus, qualified reviewer approval, or licensed signing asset. Browser and
playback tests use synthetic contract data and no media bytes. Nothing here is
ready for educational or accessibility use.

## Read order

1. [AGENTS.md](AGENTS.md)
2. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
3. [docs/architecture.md](docs/architecture.md)
4. [docs/linguistic-safety.md](docs/linguistic-safety.md)
5. [docs/licensing-and-consent.md](docs/licensing-and-consent.md)
6. [contracts/README.md](contracts/README.md)
7. [packages/signpack-schema/README.md](packages/signpack-schema/README.md)
8. [packages/sync-engine/README.md](packages/sync-engine/README.md)
9. [packages/runtime/README.md](packages/runtime/README.md)
10. [packages/pack-storage/README.md](packages/pack-storage/README.md)
11. [HANDOFF.md](HANDOFF.md)

## Research reports

- [Data and model strategy](docs/data-and-model-strategy.md): required product
  data, public dataset fit, licensing boundaries, and the version-one
  no-training recommendation.

## Surfaces

- `packages/sync-engine`: implemented deterministic, headless video-clock
  synchronization.
- `packages/runtime`: implemented framework-free headless controller; overlay
  rendering remains an application concern.
- `packages/video-adapters`: implemented HTML5 lifecycle sampling; YouTube
  remains future work.
- `packages/pack-storage`: implemented synthetic caption-pack integrity and
  IndexedDB storage; media caching remains future work.
- `apps/pwa`: implemented synthetic-only fail-visible shell and local caption
  pack import; active signing remains future work.
- `apps/extension`: planned Chrome Manifest V3 adapter; not implemented.
- `apps/reviewer`: planned human review console; not implemented.
- `services/authoring`: planned server-side Gemini authoring support; not
  implemented.

Each planned surface currently holds only a `README.md` describing its intended
boundary.

## Foundation verification

The repository has no production dependencies. Its exact development-only tools
are recorded in `THIRD_PARTY_NOTICES.md` and enforced by the foundation checker.

```bash
node tools/verify-baseline.mjs
```

```bash
corepack pnpm verify
corepack pnpm test
corepack pnpm build
```

Production dependencies, signing-media rights, cloud access, and deployment
each require a separate human approval gate.
