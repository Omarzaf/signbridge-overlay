# Runtime

The framework-free runtime controller wraps the pure sync engine without owning
the media clock.

- `sample(snapshot)` resolves and stores the latest playback state.
- `getState()` returns `null` before the first sample, then the last stored
  immutable state.
- `subscribe(listener)` observes samples and isolates listener failures.
- `dispose()` clears listeners and prevents later samples from mutating stored
  controller state.

This controller contains no DOM rendering, timers, network calls, or cloud
dependency. A future UI adapter can consume it without weakening the SignPack
or source-caption safeguards.
