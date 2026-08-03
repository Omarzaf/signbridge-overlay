# Publisher refusal matrix — specification for W6

**Status:** specification, reviewed. No publisher code exists yet.
**Owner of the implementation:** Claude, Wave 1, `packages/signpack-publisher/`.
**Source:** `docs/fable-strategy-2026-08-02.md` §9, refined against the
contracts landed in Wave 0 (ADR 0005).

Refusing to publish is the demo's central claim, so the refusal paths are the
feature, not the error handling. Every row below is a distinct structured
refusal with its own code, and every row must have a test that fails if the
publisher emits a pack.

## The rule

The publisher revalidates from source evidence. It never trusts a field that
travelled with the request:

- it recomputes the review-unit hash from the candidate rather than reading a
  supplied one;
- it hashes actual media bytes rather than trusting a manifest;
- it re-reads reviewer authority and withdrawal state at publish time.

It may never infer a sign, approve a proposal, repair missing rights evidence,
or silently downgrade unsupported content to something publishable.

## Matrix

| # | Refusal code | Condition | What the publisher must check |
| --- | --- | --- | --- |
| 1 | `absent_reviewer` | No appointed reviewer, or no reviewer-authority record covering this pack | Reviewer roster and authority record, at publish time. **This is the live path today, and the honest answer the demo shows.** |
| 2 | `incomplete_review` | A segment has no final decision, or the decision does not sign the review unit | Every segment resolves to exactly one final decision whose signed hash equals the recomputed review-unit hash (ADR 0005) |
| 3 | `hash_mismatch` | Any recomputed hash differs: media bytes, decision, review log, or asset ledger | Recompute all four from bytes; never compare supplied hash to supplied hash |
| 4 | `withdrawn_asset` | An asset is withdrawn, or its consent is withdrawn, at publish time | Withdrawal state read atomically with publication, not at request time |
| 5 | `incompatible_rights` | The rights grant is absent, or does not cover a requested purpose, channel, territory, or operation | Grant scope against the full release request scope |
| 6 | `invalid_timing` | Segment timing is invalid, or the asset duration does not equal the segment duration | The v1 exact-duration invariant |
| 7 | `language_mismatch` | Signed language or region differs between pack, review unit, and asset ledger | All three agree exactly; a reserved `zxx`/`ZZ` marker never publishes |
| 8 | `multi_asset_violation` | A segment references more than one asset | The v1 single-asset invariant |
| 9 | `invalid_evidence_period` | Attached contest evidence claims a period ending after its `generatedAt` | Evidence-period rule landed in Wave 0 |
| 10 | `schema_version_mismatch` | An unknown or superseded schema version on any input | Review-unit version is independent of the pack version; both are checked |

## Output contract

A refusal is a structured value, not an exception and not a partial pack:

- the refusal code from the table;
- the exact path or identifier that failed;
- what was compared against what;
- **never** a suggested remedy that would weaken a gate.

Success emits a content-addressed pack. There is exactly one success path and it
requires every row above to pass.

## Test obligation

Ten refusal tests, one per row, each asserting that no pack is emitted and that
the specific code is returned. One success test using a fully approved synthetic
fixture, asserting content addressing. A test proving that a refusal never
carries partial pack bytes.

The absent-reviewer path is the only one that can be demonstrated end to end
today, because no reviewer is appointed. That is a truthful demo state, not a
gap to paper over.
