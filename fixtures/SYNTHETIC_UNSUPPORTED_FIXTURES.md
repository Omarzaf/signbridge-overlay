# Synthetic unsupported contract fixtures

The `synthetic-unsupported.*.json` files contain fabricated identifiers, hashes,
timestamps, captions, and counts for validator tests only. They contain no
signing media, sign mapping, real transcript, participant identity, contest
evidence, or model output.

The SignPack is deliberately:

- language code `zxx` and test region `ZZ`, so it asserts no signed-language
  content;
- `developmentOnly: true`;
- `linguisticReviewStatus: not_reviewed`;
- `releaseStatus: draft`;
- one `unsupported` segment with a visible caption fallback;
- empty of signer, reviewer, and asset references.

It must never be described as ASL-reviewed, educationally valid, publishable,
or evidence of a working translation.
