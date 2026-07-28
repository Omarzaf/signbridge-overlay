# Offline PWA

The synthetic-only playback shell connects an HTML5 video element to the
runtime controller and an accessible, fail-visible overlay. It deliberately
loads the draft `zxx`/`ZZ` fixture, which remains blocked as `not_published`.
The independent caption text stays visible.

Users may import a local JSON fixture up to 256 KiB. The browser validates the
schema and synthetic caption-only profile, hashes the exact bytes, stores them
in IndexedDB, and rechecks the stored bytes before mounting. Reload restores a
verified local copy without creating publication authority.

This shell contains no signed-language content, media asset, network request,
analytics, service worker, or active signing path. Media caching, general
SignPack import/export, storage quotas, and eviction remain future work.
