# Reproducibility

## Reproducibility levels

SignBridge distinguishes three claims:

1. **Source reproducibility:** an authorized person can identify the source
   revision, toolchain, inputs, and decisions used for a result.
2. **Publication reproducibility:** the same approved records and exact media
   bytes produce the same SignPack bytes and content hash.
3. **Authoring replayability:** an authorized person can inspect or replay an AI
   proposal using retained private inputs and run metadata.

Only the first level is established by the current repository foundation.
Publication reproducibility and authoring replayability remain requirements,
not completed capabilities.

## Build record

Every candidate release must record:

- Git commit and whether the tree was clean.
- Node and pnpm versions.
- Lockfile hash and dependency-license report.
- Operating system and architecture.
- Exact build and verification commands.
- Resulting artifact names, sizes, and cryptographic hashes.
- Test counts and links to retained browser, accessibility, and device evidence.

The supported toolchain is the range declared in `package.json`; a release must
be verified on the declared Node 22 target rather than inferred from another
local Node version.

## Deterministic publication

The SignPack publisher must define a canonical form for manifests and archive
metadata. File order, path separators, text encoding, timestamps, compression
settings, and numeric serialization must not introduce nondeterministic bytes.

A publication run must accept only:

- A versioned schema and publisher revision.
- Exact source, proposal, review-event, and asset-ledger identifiers.
- Reviewer-approved candidate and asset hashes.
- Current licensed-asset evidence.
- Declared runtime compatibility.

Running the publisher twice with those inputs must yield the same pack hash.
Changing any semantically relevant input must yield a different hash and require
the applicable review gates again.

## AI authoring

Model sampling and provider behavior may prevent byte-identical regeneration.
The authoring path therefore records:

- Provider, model and version identifier, region, and API surface.
- Versioned system instruction and prompt template.
- Parameters that affect output.
- Input and output hashes and a private run-evidence reference.
- Schema version, retry count, safety outcome, latency, and cost.
- Source revision and time of execution.

The exact sensitive input and returned proposal may be retained in the approved
private system when consent and retention policy permit. Application logs must
not contain transcript text, identities, private media URLs, or credentials.

A captured proposal can be replayed through review and publication without
calling Gemini. A fresh Gemini call is a new proposal, never proof that the
original output was reproducible.

## Synthetic-fixture runs

Synthetic tests must use controlled, non-linguistic fixtures marked
`synthetic-test-only`. When a generator is used, its source revision, version,
parameters, and seed must be recorded. Passing these tests proves packaging or
runtime behavior only and must not be reported as ASL accuracy.

## Release verification procedure

The release owner must:

1. Begin from a clean, identified revision.
2. Restore the pinned dependency graph.
3. Run the repository's native verify, build, browser, offline, extension,
   accessibility, security, license, and public-surface checks applicable to the
   release.
4. Publish the candidate twice and compare hashes.
5. Inspect the candidate on the intended browser and constrained device.
6. Resolve the certificate's private evidence references.
7. Obtain human linguistic and release approvals for the exact resulting
   hashes.

Missing evidence produces a blocked certificate. A successful automated suite
cannot override a missing reviewer, signer, license, consent, or rights record.
