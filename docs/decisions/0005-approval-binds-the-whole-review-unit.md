# ADR 0005: Approval binds the whole review unit

## Status

Accepted.

## Context

The v1 decision hash covered only `segmentId`, `packId`, `translationStatus`,
the selected asset IDs, a reason code, and a confidence value
(`services/authoring/src/proposeEngine.ts`). It omitted everything that gives a
decision its meaning: the source text, the exact timing, the signed language and
region, the candidate catalog the choice was made from, the exact media bytes
selected, and the presentation state the reviewer saw.

An adversarial probe during the 2026-08-02 audit submitted two materially
different requests that shared a pack, segment, and selected output. Their timed
text differed, so their timed-text hashes differed — and their decision hashes
were identical.

That is the failure that matters most in this system. A human approval is the
only thing standing between a proposal and published signing content. If the
hash a reviewer signs does not change when the material changes, an approval
granted for one thing silently authorises another.

A second, related defect: authoring could select several assets for one segment,
release validation accepted that, and playback then refused or fell back on the
resulting "valid" pack. Three layers disagreed about what a segment is.

## Decision

Human approval binds a versioned canonical **review unit**, defined by
`contracts/review-unit.schema.json` and implemented in
`packages/signpack-schema/src/reviewUnit.ts`.

Its hash binds, and any change to any of them invalidates the approval:

- the review-unit schema version;
- the proposal and run identity;
- the pack and segment identity;
- the source fingerprint and timed-text hash;
- the exact segment range;
- the signed language and region;
- the catalog version and the hash of the exact candidate set;
- the selected asset hashes, by exact media bytes;
- the presentation state — cropped, mirrored, transformed, all required false.

The review unit is versioned **independently** of the SignPack schema, at
`2.0.0`. What approval binds and how packs are formatted are different kinds of
change and must be able to move apart.

Canonicalisation is fixed, not left to implementations: every bound field is
emitted explicitly in a defined order, integers are base ten, strings keep
`JSON.stringify` escaping with no normalisation, and an absent optional field is
emitted as `null` rather than omitted so "absent" and "present but empty" cannot
collide. `canonicalizeReviewUnit` validates before it serialises and throws on
an invalid unit rather than returning a hash that would look authoritative.

Hashing uses WebCrypto, which both Node targets and the browser provide, so the
package stays dependency-free.

Alongside it, the **v1 single-asset invariant**: a segment resolves to at most
one asset, and that asset's duration equals the segment's exactly. It is
enforced in the review unit and in release-candidate preflight
(`multi_asset_violation`, `asset_duration`), so a pack the runtime would refuse
can no longer pass release validation.

## Consequences

- The authoring service replaces its `decisionHash` with the review-unit hash
  (Gemini's A1.7). Until it does, the two coexist and the weaker one is not
  trusted for approval.
- The reviewer console displays and signs this exact hash; the publisher
  revalidates it. Neither may accept a weaker binding.
- Adding a field to the review unit is a breaking change requiring a version
  bump. Prior approvals do not carry across it — that is the point.
- Structural validity remains structural. A well-formed review unit is not a
  reviewer approval, a rights grant, or evidence that the referenced media
  exists.

## Verification

`packages/signpack-schema/src/reviewUnit.test.ts` keeps the audit's adversarial
probe as a permanent regression: eleven single-field variations must each change
the hash. It also proves key-order independence, hash stability, refusal to
canonicalise an invalid unit, rejection of multi-asset selections, and rejection
of cropped, mirrored, or transformed presentation.
