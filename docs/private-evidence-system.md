# Private Evidence System Requirements

## Status

This document defines requirements for a future access-controlled system of
record. It does not select a vendor, create an account, authorize cloud access,
or establish that any required evidence exists.

The local contest-rules snapshot was captured on 2026-07-27 and may change.
An authorized human must refresh and interpret the official rules before
submission.

## Records in scope

The private system must keep these evidence domains distinct:

| Domain | Examples |
| --- | --- |
| Reviewer governance | Identity, qualification, community experience, authority, accommodations, compensation, conflicts, and escalation |
| Rights and consent | Signer and reviewer agreements, copyright ownership, distribution and publicity grants, attribution, withdrawal, and exact asset hashes |
| Source and authoring | Private video/text, proposal inputs and outputs, run metadata, corrections, and model/API evidence |
| Pilots and users | Contact details, consent, participation, raw notes, feedback, testimonials, user counts, and organizer-sharing awareness |
| Financial | Arms-length and related-party revenue, monthly breakdowns, expenses, marketing spend, refunds, invoices, and payment evidence |
| Operations | Deployment records, API usage, sanitized logs, availability evidence, screenshots, incidents, and test access |
| Contest and release | Entrant status, repository access, submission versions, demo rights, claims evidence, release certificates, and organizer requests |

Sensitive records must not be placed in Git, application logs, public issue
trackers, demo recordings, browser URLs, or SignPacks.

## Record model

Each record requires:

- Opaque stable identifier and evidence domain.
- Owner, steward, access classification, and lawful or consent basis.
- Creation source and time, revision history, and integrity hash where useful.
- Related public identifier, asset hash, pack hash, claim, or review event.
- Retention rule, review date, deletion state, and legal hold if applicable.
- Consent scope, organizer-sharing status, attribution preference, and
  withdrawal state when a person is involved.
- Verification state and human approver.

Corrections and status changes must be auditable. The system must prevent a
public `approved` or `licensed` state from being inferred merely because a file
exists.

## Access and security

- Apply least privilege by role and evidence domain.
- Separate proposal, linguistic approval, rights approval, financial review,
  release, and system-administration permissions.
- Require strong authentication and protect recovery paths.
- Encrypt data in transit and at rest; keep keys and credentials outside source
  control.
- Record access, export, modification, deletion, and permission changes.
- Prevent sensitive values from entering analytics, error reports, and routine
  application logs.
- Maintain encrypted backups, tested recovery, and an incident-response owner.
- Provide a rapid block mechanism for disputed or withdrawn assets without
  erasing the historical decision record.

Public project services must not have broad read access to this system. Runtime
playback needs only the public, licensed SignPack and never requires private
evidence access.

## Consent, disclosure, and minimization

Before collection, a human must tell each participant:

- What is collected and why.
- Who may access it.
- Whether evidence may be shared with judges, organizers, sponsors, or the
  public.
- Whether name, likeness, voice, signing performance, feedback, or testimonial
  may be used for promotion.
- Retention, withdrawal, correction, and contact procedures.
- The offline-distribution limitation for an irrevocably licensed exact hash.

Collect only the minimum evidence needed. A testimonial or user count does not
justify exporting contact details. Organizer requests for additional customer
or financial evidence require human review, a purpose-limited export, and an
audit record.

## Public export

The system must support a deliberately generated public evidence manifest that:

- Contains consented aggregate figures and consent-safe identifiers only.
- Links each claim to a resolvable private evidence identifier.
- States definitions, periods, exclusions, revisions, and evidence freshness.
- Separates arms-length revenue from related-party revenue.
- Reports zero marketing spend or other required zero values explicitly.
- Removes names, contact details, payment identifiers, private URLs,
  transcripts, credentials, and raw participant notes.
- Records who reviewed and approved the export.

Public export is deny-by-default. No direct database view or shared private
folder is an acceptable public surface.

## Retention and closure

Before collecting real evidence, the human owner must approve:

- The chosen system and data location.
- Role assignments and access-review frequency.
- Retention periods by evidence domain.
- Backup, deletion, withdrawal, breach, and participant-request procedures.
- The contest organizer-disclosure workflow.
- The boundary between private evidence and public release artifacts.

Until that approval exists, use synthetic, non-personal test records only and
label them `synthetic-test-only`.
