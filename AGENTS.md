# Agent Instructions

## Purpose

Build a lightweight integration layer that synchronizes human-reviewed,
language-specific signing media with online or offline video. The viewer must be
useful without cloud access; AI may assist authoring but cannot approve or
publish signs.

## Read order

1. `PROJECT_CONTEXT.md`
2. `docs/architecture.md`
3. `docs/linguistic-safety.md`
4. `docs/licensing-and-consent.md`
5. `docs/privacy.md`
6. The nearest package or application `README.md`
7. `HANDOFF.md`

## Repository boundaries

- Source: `apps/`, `packages/`, `services/`, `contracts/`, and `tools/`.
- Tests and controlled fixtures: `tests/` and `fixtures/`.
- Public documentation: root Markdown files and `docs/`.
- Generated: `dist/`, coverage, browser reports, and build artifacts.
- Sensitive: reviewer identities, consent forms, transcripts, private pilot
  evidence, credentials, and unreleased media. These do not enter Git.
- External references are design evidence, not automatically reusable code.

## Native commands

```bash
# dependency-free foundation check; does not invoke a package manager
node tools/verify-baseline.mjs

# approved project toolchain
corepack pnpm verify
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

The root manifest contains the exact approved development tools. Production
dependencies and workspace-local dependency additions remain approval-gated.

## Invariants

- Never describe the product as a universal sign language or automatic
  interpreter.
- A specific signed language and dialect must be declared for every SignPack.
- Only rights-cleared assets approved by a qualified human reviewer may ship.
- AI output is always a proposal. It cannot publish, approve, or silently fill
  unsupported segments.
- Unsupported content falls back visibly to captions or an explicit unsupported
  state.
- Synchronization follows the actual media clock; never use an independent
  elapsed-time loop as the source of truth.
- The viewer must not require Gemini, Firebase, or a network connection.
- Extension code is bundled locally, requests narrow host permissions, and
  contains no remotely executed code.
- Initial extension access is limited to YouTube. Generic-site support must use
  `optional_host_permissions` and an explicit user grant. `<all_urls>` is
  forbidden.
- Never log transcript contents, reviewer identities, student identities, or
  private media history.
- Never send outreach, submit a form, publish a store listing, or deploy to
  production without explicit human approval.
- Do not add a production dependency without approval and current API review.
- Do not copy code or media from another project without a documented compatible
  license and pre-existing-work disclosure.

## Git and agent boundary

- Commit the clean baseline before delegated implementation.
- Use one write-capable agent task per branch/worktree.
- Keep unrelated user changes untouched.
- Use a feature branch and reviewed pull request; never push directly to `main`.
- Preview and local verification precede any public release.

## Done definition

A change is complete only when its native build and tests pass, relevant browser
behavior is inspected, privacy and rights contracts remain valid, the Moderator
reports no blocking issue, and any required Deaf-human review is recorded.
