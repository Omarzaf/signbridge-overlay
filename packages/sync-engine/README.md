# Sync Engine

The dependency-free playback core maps an authoritative media-clock snapshot to
a reviewed SignPack segment.

- `preparePlaybackModel` structurally validates and defensively copies a
  caller-supplied, published-shaped pack after local integrity, review-status,
  and compatibility gates. This is supplied playback readiness only; it never
  grants or implies publication authority. The resolver rejects caller-forged
  models that did not pass this preparation.
- `resolvePlaybackState` is pure and total. It uses half-open segment intervals,
  exact source fingerprints, and the supplied clock for seeks, pauses, and rate
  changes.
- Signing media is returned only for one approved mapped segment with exactly
  one ready, duration-compatible asset. Every other state preserves source
  captions and returns a localization-free fallback reason.

The package has no timers, DOM access, network calls, cloud dependency, or
production dependency.
