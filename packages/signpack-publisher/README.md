# SignPack Publisher

Planned strict publisher and the only package allowed to combine:

- a schema-valid proposal;
- a human decision tied to exact proposal and asset hashes;
- current signer, consent, license, and attribution evidence; and
- compatible immutable media assets.

It emits a content-addressed SignPack or a structured failure. It cannot infer
signs, approve proposals, repair missing rights evidence, or silently downgrade
unsupported content.

This package is intentionally unimplemented. Before it may emit a published
pack, it must independently:

- retrieve the authoritative complete review log;
- authenticate reviewer qualification, identity, scope, and conflicts;
- authenticate signer consent and exact distribution grants;
- hash actual media bytes and canonical contract bytes;
- recompute decision, review-log, asset-ledger, and release hashes;
- check current withdrawal state atomically;
- bind the immutable artifact to a credentialed publisher and human release
  certificate.

`validateReleaseCandidate` in `packages/signpack-schema` is only a structural
preflight and cannot satisfy or bypass these gates.
