# Data Provenance

## Purpose

Every released SignPack and public product claim must be traceable to source,
transformation, human decision, rights evidence, and an immutable output. This
contract defines that chain without placing sensitive material in Git.

## Provenance chain

The minimum lineage is:

```text
source video and timed text
  -> authoring input snapshot
  -> constrained proposal
  -> human review event
  -> current asset-rights decision
  -> deterministic publication
  -> immutable SignPack and release certificate
```

Each step must reference the preceding record through stable identifiers and
cryptographic content hashes. Human-readable names and filenames are not
sufficient identifiers.

## Source classes

| Source class | Minimum provenance | Public treatment |
| --- | --- | --- |
| Timed text or captions | Source, acquisition method, language, timing basis, hash, and permission | Hash and limitations only when text is private |
| Source video | Owner, source, permission, intended use, hash, and relevant timing | Never publish private URLs or viewing history |
| Signing media | Signer, rights owner, capture/edit history, consent and license references, hash | Only consented identifier, attribution, rights state, and hash |
| AI proposal | Provider, model/version, prompt-template version, parameters, input/output hashes, run identifier | Sanitized run metadata; AI remains a proposal |
| Human decision | Reviewer evidence reference, authority scope, candidate hashes, decision, and prior event | Consent-safe identifier, decision, limitations, and hashes |
| Synthetic fixture | Generator or manual method, source revision, seed if applicable, hash, and explicit test-only label | May be public only when unmistakably non-linguistic |
| Product or contest metric | Definition, period, source register, calculation revision, exclusions, and approver | Consented aggregate only |

## Required transformation record

Any trim, transcode, crop, scale, color change, timing adjustment, caption edit,
or metadata rewrite must record:

- Input and output identifiers and hashes.
- Tool name and pinned version.
- Parameters or a versioned transformation recipe.
- Responsible actor class and execution time.
- Reason for the change.
- Whether the change requires renewed linguistic or rights approval.

Signing media must not be mirrored. A crop or encoding change that can alter
visibility, timing, facial grammar, hands, torso, or permitted derivative use
requires a new human and rights decision.

## Systems of record

- Git records source, public documentation, schemas, controlled synthetic
  fixtures, tests, and release history.
- The private evidence system records identities, qualifications, agreements,
  compensation, sensitive source material, pilot evidence, and financial
  records.
- The review-event store records append-only proposal and human-decision
  history.
- The asset ledger records ownership, consent, distribution rights,
  attribution, effective state, and withdrawal state.
- The release certificate binds the Git revision, build, SignPack, review,
  rights, and verification evidence.

Public records use opaque references that can be resolved by an authorized
human in the private system. They must not encode names, emails, phone numbers,
addresses, payment identifiers, private URLs, or transcript excerpts.

## Corrections and deletion

Released artifacts are immutable. Corrections create a new record and new hash
with an explicit supersession link. Private-source deletion or participant
withdrawal is recorded as an append-only status event while the sensitive
material is removed according to its retention policy.

An asset marked withdrawn, expired, disputed, or unverified cannot enter a new
pack even if an earlier pack used it. Historical evidence retains only the
minimum non-sensitive record required to explain the earlier release.

## Provenance verification

Automated verification may establish that:

- Referenced records exist and identifiers are unique.
- Hashes, schemas, timing bounds, state transitions, and tool versions match.
- Published bytes derive from the declared approved inputs.
- Private fields and prohibited files are absent from public artifacts.

Automated verification cannot establish language accuracy, informed consent,
ownership, community authority, or the truth of a testimonial. Those remain
human evidence gates.
