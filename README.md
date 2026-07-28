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
toolchain, Gate 1 structural contracts, and the Goal 2 headless playback core.
The contract package validates draft SignPacks, review events, asset ledgers,
release requests, reproducibility records, and contest-evidence records without
a production dependency.

The playback core prepares an immutable local-readiness model, maps exact media
snapshots to immutable signing or caption-fallback states, and exposes a
framework-free controller. It contains no DOM rendering, video adapter, media
element integration, timer, network call, or cloud dependency.

The repository still does not contain a working viewer, sign-language corpus,
qualified reviewer approval, or licensed signing asset. Playback tests use
synthetic, in-memory contract data and no media bytes. Nothing here is ready for
educational or accessibility use.

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
10. [HANDOFF.md](HANDOFF.md)

## Surfaces

- `packages/sync-engine`: implemented deterministic, headless video-clock
  synchronization.
- `packages/runtime`: implemented framework-free headless controller; overlay
  rendering remains future work.
- `apps/pwa`: offline and small-phone experience.
- `apps/extension`: Chrome Manifest V3 adapter.
- `apps/reviewer`: human review console.
- `services/authoring`: server-side Gemini authoring support.

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
