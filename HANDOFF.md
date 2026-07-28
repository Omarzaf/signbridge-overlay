# Task Handoff

## Goal

Establish the clean, dependency-free repository foundation before specialist
implementation begins.

## Decisions already made

- This is an independent product repository, not a modification of an existing
  Claude project.
- “Universal” refers to the integration protocol, not a signed language.
- The first release uses reviewed human signing video rather than a 3D avatar.
- The runtime remains usable without Gemini or cloud access.
- AI proposals require qualified human review before publication.

## Current verification

```text
node tools/verify-baseline.mjs
Passed under the available Node 24 runtime: required contracts present; no
dependencies or media detected. Node 22 remains the declared target and must be
verified in the approved toolchain/CI gate.
```

## Remaining human gates

1. Select the first signed language, country/region, dialect, audience, and
   educational context.
2. Confirm a qualified Deaf reviewer, basis of qualification, authority,
   compensation, conflicts, and consent-safe public identifier.
3. Select the signer, source video, and rights-cleared golden-pack topic.
4. Approve grants covering playback, demo, contest submission, sponsor
   publicity, territory, term, editing, attribution, hosting, and withdrawal.
5. Approve the open-source code license and separate sign-media licensing model.
6. Select the private system of record, access controls, retention, and
   organizer-disclosure process for consent, payments, pilot notes, customer
   evidence, and identities.
7. Declare the entrant structure and representative; determine whether a
   corporate identifier or contributor/publicity agreement is required.
8. Approve the exact production dependency and Node 22/pnpm toolchain set.
9. Confirm the claims boundary: no universal-language, automatic-interpreter, or
   accuracy claim before review of the exact released hashes.
