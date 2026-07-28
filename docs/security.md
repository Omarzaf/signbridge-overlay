# Security

## Viewer and extension

- Bundle executable code locally; do not evaluate remote code.
- Request the narrowest possible host permissions.
- Treat page content, captions, imported packs, and manifests as untrusted input.
- Verify pack schemas, content hashes, sizes, and runtime compatibility.
- Isolate overlay styles and DOM behavior.
- Enforce the local import byte limit before allocation.
- Rehash and revalidate stored manifest bytes on every IndexedDB read.
- Treat a local digest as corruption evidence only, never publisher
  authentication or publication authority.
- Never overwrite a different record sharing the same pack identifier.

## Authoring service

- Keep credentials in approved environment-secret storage.
- Authenticate reviewer and publisher actions.
- Separate proposal, review, and publication permissions.
- Use immutable audit events without sensitive content.
- Apply upload limits and validate media types before storage or processing.

## Release

Threat modeling, dependency review, browser CSP inspection, and a negative check
for private files are required before public deployment.
