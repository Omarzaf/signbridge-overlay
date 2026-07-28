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

This repository contains the project foundation and approved development
toolchain only. It does not yet contain a working viewer, sign-language corpus,
production dependency, or approved signing asset. Nothing here is ready for
educational or accessibility use.

## Read order

1. [AGENTS.md](AGENTS.md)
2. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
3. [docs/architecture.md](docs/architecture.md)
4. [docs/linguistic-safety.md](docs/linguistic-safety.md)
5. [docs/licensing-and-consent.md](docs/licensing-and-consent.md)
6. [HANDOFF.md](HANDOFF.md)

## Planned surfaces

- `packages/runtime`: framework-free overlay component.
- `packages/sync-engine`: deterministic video-clock synchronization.
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
