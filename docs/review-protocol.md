# Human Review Protocol

## Status and scope

This protocol defines the minimum linguistic review required before a SignPack
can be published. The development scope is provisionally American Sign Language
in the United States (`ase`, `US`), but no reviewer, dialect, community scope,
or signing asset has been approved.

No document or automated result in this repository closes that human gate.

## Authority

A qualified Deaf reviewer for the declared signed language, dialect, audience,
and context has final authority over:

- Semantic equivalence and intended meaning.
- Grammar, spatial structure, fingerspelling, and nonmanual information.
- Appropriate regional and community variation.
- Whether a segment is supported, needs correction, or must remain caption-only.
- Approval of the exact signing-media and manifest hashes proposed for release.

The signer may explain performance choices but cannot approve their own work
unless the review agreement explicitly permits that conflict and records an
independent escalation path. AI, automated tests, captions, glosses, and hearing
contributors have no linguistic approval authority.

## Review unit

Review is performed on an exact candidate consisting of:

- Source-video and timed-text context, retained privately when sensitive.
- Declared signed language, region, dialect, audience, and educational purpose.
- Timed semantic segment and caption fallback.
- Proposed signing asset and its exact content hash.
- Required facial, bodily, and spatial information.
- Proposal provenance, including whether AI assisted.
- Current license, consent, attribution, and withdrawal references.

Approval of a concept, gloss, earlier edit, or different encoding does not
approve the candidate. Any change to meaning, timing, crop, mirror state,
playback treatment, signing media, or relevant manifest data requires review of
the new hashes.

## Workflow

1. **Prepare:** an author or AI creates a proposal using only known identifiers
   and marks unknown or uncertain content as unsupported.
2. **Check readiness:** the coordinator confirms that context, media, caption
   fallback, and rights references are present. This is not linguistic review.
3. **Review:** the qualified Deaf reviewer watches the candidate in context and
   records `approved`, `changes_requested`, or `rejected`, with a consent-safe
   rationale.
4. **Correct:** authors create a new proposal rather than overwriting the prior
   decision. The reviewer examines the corrected candidate.
5. **Validate:** automated checks verify schema, hashes, timing bounds,
   compatibility, and independent state fields. Passing does not imply
   linguistic accuracy.
6. **Publish:** the publisher admits only a reviewer-approved candidate whose
   exact assets are currently licensed and whose automated checks pass.

An unresolved disagreement, missing context, unknown concept, or unavailable
reviewer results in a visible caption fallback or a blocked release. Deadline
pressure never changes that outcome.

## Review record

The private system of record must retain:

- Review-event identifier and prior-event reference.
- Consent-safe reviewer identifier linked privately to qualification evidence.
- Declared authority scope, compensation, conflicts, and escalation route.
- Candidate manifest and asset hashes.
- Decision, reason, requested correction, and decision time.
- Tools or accommodations used during review.
- Confirmation that the reviewer saw the candidate in its intended presentation.

Public artifacts may contain the consent-safe identifier, decision state,
limitations, and hashes. They must not expose identity, contact information,
payment details, private qualifications, or private source material.

## Synthetic fixtures

Synthetic fixtures may test timing, packaging, fallback, and interface behavior
before licensed signing media exists. Every synthetic fixture must:

- Use an unmistakable `synthetic-test-only` label in its file, manifest, UI,
  and test description.
- Avoid ASL glosses or claims that motion represents a real sign. If a test
  schema requires language metadata, use its reserved non-linguistic fixture
  marker rather than `ase` or another real signed-language code.
- Use abstract or obviously non-linguistic motion and no cloned human likeness.
- Remain outside release packs, demos, linguistic metrics, and user studies.
- Fail validation if represented as reviewed or licensed signing content.

Synthetic fixtures can prove software behavior only. They cannot provide
linguistic evidence or satisfy the signer, reviewer, consent, or rights gates.

## Corrections and withdrawal

Review events are append-only. A correction creates a new candidate and
supersedes, rather than erases, the earlier decision.

A reviewer may request correction or deprecation after publication. A rights
withdrawal independently blocks the asset from all new releases. Already
distributed offline assets remain subject to the exact-hash grant described in
`licensing-and-consent.md`; the product must not imply that remote recall is
possible.

## Gate-closing evidence

Gate 1 remains open until a human owner records, outside Git:

- The qualified Deaf ASL reviewer and their approved authority scope.
- Relevant community and regional variation for the first educational use case.
- The signer and rights owner for the exact candidate media.
- Executed compensation, consent, distribution, publicity, and withdrawal terms.
- The private evidence-system location and access policy.
