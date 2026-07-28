# Video Adapters

Planned lifecycle adapters for generic HTML5 video and YouTube navigation. Page
content is untrusted input and adapters may not weaken runtime contracts. No
video adapter is implemented yet.

A future adapter may observe source lifecycle signals such as frame callbacks,
time updates, play, pause, seeking, seek completion, rate changes, metadata
changes, and source replacement. Each signal causes a fresh sample of the
actual source media time, state, rate, and exact source fingerprint.

Adapters must not advance an independent clock, round media time, retain a
stale fingerprint after navigation, construct a ready playback model, hide
caption fallback, or infer signing behavior. They pass snapshots to the
framework-free runtime controller and leave source captions independently
available.
