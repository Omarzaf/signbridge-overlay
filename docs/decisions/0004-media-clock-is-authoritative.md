# ADR 0004: The source media clock is authoritative

## Status

Accepted.

## Context

Signing state must remain deterministic across pause, seek, playback-rate
change, gaps, and replacement media. An independent runtime timer can drift,
continue while the source is paused, or briefly render a stale segment after a
seek. The playback path also must not turn a structurally valid object into
publication or linguistic authority.

## Decision

The playback core has two explicit stages:

1. `preparePlaybackModel` validates the supplied manifest and local readiness
   inputs, then creates an immutable, module-issued model. The model is
   accepted for local playback decisions only and carries no publication
   assurance.
2. `resolvePlaybackState` maps that model and one normalized source-media
   snapshot to an immutable active-sign or caption-fallback state.

The snapshot is the sole clock. It contains current media time, pause and seek
state, playback rate, and the exact source fingerprint. The resolver uses
half-open segment ranges, `[startMs, endMs)`, compares fractional milliseconds
without rounding, and performs binary search over the immutable segment index.
It does not use timers or accumulated elapsed time.

Every sample rechecks the source fingerprint. Every output preserves
independent source captions. Unsupported, missing, withdrawn, corrupt,
unpublished, unverified, incompatible, invalid-clock, source-mismatched, and
gap conditions fail visibly.

Version-one signing activation is limited to exactly `1x` playback and one
locally ready asset whose duration equals the mapped segment duration.
Multi-asset sequencing and signing-media retiming require a future reviewed
contract and cannot be inferred by playback code.

The framework-free controller may store and notify subscribers of resolved
state. It owns no DOM, media element, source lifecycle, network request, or
cloud service. Future adapters sample actual HTML5 or YouTube media state and
send snapshots to the controller.

## Consequences

- Seek, pause, and rate changes always recalculate from source truth.
- A hand-built ready-looking object cannot bypass model preparation.
- Playback readiness cannot authenticate a publisher, reviewer, rights grant,
  current global withdrawal state, or linguistic quality.
- Source replacement fails to captions until an exact matching model is used.
- A DOM overlay, video adapter, storage layer, and browser accessibility
  evidence remain separate future work.
