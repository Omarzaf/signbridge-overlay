# Project Context

## Product thesis

Deaf and hard-of-hearing viewers should be able to attach a small,
language-specific signing layer to educational video across constrained devices
and intermittent connectivity. The reusable element is a universal overlay
protocol; the signing itself remains language-, dialect-, and context-specific.

## Current architecture

The planned system separates publication from playback:

1. An authoring service accepts timed text and proposes known sign identifiers.
2. A human reviewer edits or rejects every proposal.
3. A separate strict publisher combines an approved decision with current
   licensed-asset evidence and creates a hashed SignPack.
4. A cloud-independent runtime synchronizes approved signing media to a video.
5. PWA and Chrome adapters connect that runtime to local files and web video.

The initial signing representation is rights-cleared upper-body human video.
Avatar synthesis and unconstrained text-to-sign generation are out of scope for
the first release.

## Systems of record

- `contracts/`: machine-readable publication and review contracts.
- SignPack manifest: timing, language, provenance, review, rights, and hashes.
- Asset ledger: ownership, consent, license, attribution, and withdrawal state.
- Review-event log: proposal and human decision history.
- Run manifest: reproducible authoring metadata without sensitive content.
- Git: source, documentation, tests, and release history.

## Privacy and release boundary

Public material may include source code, synthetic test fixtures, consented
aggregate metrics, and specifically licensed demo media. Identities, consent
forms, raw transcripts, private videos, credentials, detailed pilot records,
and payment information remain outside Git.

Human approval is required before dependencies, external research, media use,
cloud access, pilot contact, deployment, store submission, or contest
submission.

## Read order

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/linguistic-safety.md`
4. `docs/licensing-and-consent.md`
5. `contracts/README.md`
6. The active package README
7. `HANDOFF.md`
