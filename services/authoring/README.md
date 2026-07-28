# Authoring Service

Planned server-side service for constrained Gemini proposals and run manifests.
It may enqueue work for human review but cannot approve or publish a SignPack.
Publication belongs exclusively to `packages/signpack-publisher`, after exact
human decisions and current asset-rights evidence pass strict checks. The
authoring service is not part of the playback dependency path.
