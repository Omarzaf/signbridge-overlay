# Task Handoff

## Goal

Complete the Gate 1 structural contract foundation, verify it independently,
and stop before any real signing content or public release.

## Decisions already made

- This is an independent product repository, not a modification of an existing
  Claude project.
- “Universal” refers to the integration protocol, not a signed language.
- The first release uses reviewed human signing video rather than a 3D avatar.
- The runtime remains usable without Gemini or cloud access.
- AI proposals require qualified human review before publication.
- The provisional language scope is U.S. American Sign Language (`ase`, `US`).
- Source code uses Apache License 2.0.
- Released sign media will require an irrevocable grant tied to exact hashes.
- The entrant is treated as an individual unless the owner changes that choice.
- TypeScript, Vite, Vitest, and Playwright are approved development-only tools.

## Delivered

- Six versioned JSON Schemas cover SignPacks, review events, asset ledgers,
  release requests, authoring run manifests, and contest evidence.
- Dependency-free TypeScript validators enforce timing, state, provenance,
  exact-hash references, review-event finality, signer/consent relationships,
  rights scope, contest-record integrity, and malformed-input handling.
- `validateReleaseCandidate` accepts only structurally valid draft candidates
  and returns `assurance: structural_preflight_only`; it cannot publish.
- Synthetic `zxx`/`ZZ` fixtures exercise unsupported-content behavior without
  representing a real signed language or including media.
- Every schema identifies its structural-only assurance boundary.
- An independent moderator found no remaining contract blocker or warning.

## Current verification

```text
pnpm verify
Passed the dependency/media foundation policy, strict type checking, build,
5/5 foundation tests, and 34/34 contract tests. Browser binaries have not been
downloaded.

Workspace control-plane tests
Passed 12/12. SignBridge resolves through the registry. Workspace doctor remains
at 0 errors and 13 pre-existing warnings.
```

Node 22 remains the declared target and must be verified in the approved
toolchain/CI gate.

## Remaining human gates

1. Confirm a qualified Deaf ASL reviewer, basis of qualification, authority,
   compensation, conflicts, and consent-safe public identifier.
2. Have that reviewer document the relevant ASL community/regional variation
   and final educational scope.
3. Select the signer, source video, and rights-cleared golden-pack topic.
4. Execute grants covering playback, demo, contest submission, sponsor
   publicity, territory, term, editing, attribution, hosting, and withdrawal.
5. Select the private system of record, access controls, retention, and
   organizer-disclosure process for consent, payments, pilot notes, customer
   evidence, and identities.
6. Confirm whether individual entrant status requires any contributor or
   publicity agreement.
7. Verify the declared Node 22/pnpm toolchain in CI.

## Explicitly not delivered

- No runtime overlay, synchronization engine, PWA, Chrome extension, reviewer
  console, Gemini authoring service, or publisher implementation.
- No real ASL mapping, signer video, source video, participant record, consent
  grant, rights grant, cloud resource, or contest submission.
- No push, merge, deployment, browser download, outreach, or production action.

The next implementation slice begins only after the reviewer, language scope,
golden content, exact-hash grants, and private evidence system are confirmed.
