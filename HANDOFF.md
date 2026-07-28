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
corepack pnpm verify
Passed: required contracts present; no dependencies or media detected.
```

## Remaining human gates

- Select the first signed language, region, and dialect.
- Confirm a qualified Deaf reviewer and signer-media rights process.
- Approve the code license and separate media-license policy.
- Approve the exact production dependency set.
