# Task Handoff

## Goal

Establish the approved development toolchain and policy boundaries before
contract specialists begin.

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

## Current verification

```text
node tools/verify-baseline.mjs
Foundation policy now permits only the exact approved root development tools and
continues to reject production dependencies, workspace-local dependencies,
private environment files, and media.

node --test tests/baseline/verify-baseline.test.mjs
Passed 5/5, including rejection of production dependencies, unapproved
development tools, lockfile drift, and nested private environment files.

pnpm verify
Passed type checking, foundation policy, Node tests, and the empty pre-contract
Vitest suite. Browser binaries have not been downloaded.

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
