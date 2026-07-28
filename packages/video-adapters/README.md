# Video Adapters

The first dependency-free HTML5 lifecycle adapter is implemented. YouTube
navigation remains future work. Page content is untrusted input and adapters
may not weaken runtime contracts.

`createHtml5VideoAdapter` observes time updates, play, pause, seeking, seek
completion, rate changes, metadata changes, source replacement, and ended
signals. Each signal causes a fresh sample of the actual source media time,
state, rate, and caller-resolved exact source fingerprint.

Adapters must not advance an independent clock, round media time, retain a
stale fingerprint after navigation, construct a ready playback model, hide
caption fallback, or infer signing behavior. They pass snapshots to the
framework-free runtime controller and leave source captions independently
available.

The fingerprint resolver is called for every sample because an
`HTMLMediaElement` cannot authenticate the source bytes by itself. An absent or
hostile fingerprint resolver fails visibly through the runtime rather than
reusing an earlier value.
