import type { Environment, ReviewAction } from "./types";

/**
 * The append-only ledger every authoring run and every human decision is
 * written to before a response is returned.
 *
 * Two properties make it worth having:
 *
 * 1. A run that failed or abstained leaves a record. The v1 service attached a
 *    failed manifest to an exception and dropped it at the HTTP boundary, so
 *    failures were invisible after the fact.
 * 2. Records supersede rather than overwrite. A correction appends; it never
 *    edits history.
 *
 * These are interfaces only. Storage belongs to the service that owns the
 * durable medium, and the playback path never depends on it.
 */

export type LedgerRecordKind = "run" | "decision";

export type RunOutcome = "succeeded" | "abstained" | "failed";

export type ExecutionMode = "model" | "deterministic_fallback";

/**
 * What actually ran. A deterministic fallback has its own generator identity
 * and must never be recorded as a model execution.
 */
export interface RunProvenance {
  readonly executionMode: ExecutionMode;
  readonly generator: {
    readonly name: string;
    readonly version: string;
  };
  /** Present only when a model was genuinely called. */
  readonly model?: {
    readonly provider: string;
    readonly name: string;
    readonly version: string;
    readonly api: string;
    readonly location: string;
  };
  readonly promptVersion?: string;
  readonly catalogVersion: string;
  readonly authenticationMode: string;
  /** Required when executionMode is deterministic_fallback. */
  readonly fallbackReason?: string;
}

interface LedgerRecordBase {
  readonly recordId: string;
  /** Monotonic, gap-free, assigned by the ledger, never by a caller. */
  readonly sequence: number;
  readonly recordedAt: string;
  readonly environment: Environment;
}

export interface DurableRunRecord extends LedgerRecordBase {
  readonly kind: "run";
  readonly runId: string;
  readonly outcome: RunOutcome;
  readonly provenance: RunProvenance;
  /** Absent when the run failed before a review unit was formed. */
  readonly reviewUnitHash?: string;
  readonly failureReason?: string;
}

export interface DurableDecisionRecord extends LedgerRecordBase {
  readonly kind: "decision";
  /** The exact review unit hash this decision signs. */
  readonly reviewUnitHash: string;
  readonly action: ReviewAction;
  readonly actorKind: "authoring_service" | "human_reviewer";
  readonly actorRef: string;
  /** Set when this record supersedes an earlier decision. */
  readonly supersedesRecordId?: string;
  readonly reasonCode?: string;
}

export type DurableLedgerRecord = DurableRunRecord | DurableDecisionRecord;

export interface LedgerAppendReceipt {
  readonly recordId: string;
  readonly sequence: number;
  readonly recordedAt: string;
}

export interface LedgerQuery {
  readonly kind?: LedgerRecordKind;
  readonly reviewUnitHash?: string;
  readonly sinceSequence?: number;
}

/**
 * Implemented by the owner of the durable medium. `append` returns a receipt
 * whose `recordId` is durable enough to hand back to a caller as a reference.
 */
export interface AppendOnlyLedger {
  append(
    record: Omit<DurableLedgerRecord, "sequence" | "recordId" | "recordedAt">,
  ): Promise<LedgerAppendReceipt>;
  read(query?: LedgerQuery): Promise<readonly DurableLedgerRecord[]>;
}

export interface LedgerAppendCheck {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * The one rule every ledger implementation must share: sequences start at 1,
 * advance by exactly one, and never rewrite an existing record. Centralised so
 * authoring, reviewer, and publisher cannot each invent a different notion of
 * "append-only".
 */
export function checkLedgerAppend(
  existing: readonly DurableLedgerRecord[],
  candidateSequence: number,
): LedgerAppendCheck {
  const previous = existing.at(-1);
  const expected = previous === undefined ? 1 : previous.sequence + 1;

  if (!Number.isSafeInteger(candidateSequence) || candidateSequence < 1) {
    return { ok: false, reason: "sequence must be a positive whole number" };
  }
  if (candidateSequence !== expected) {
    return {
      ok: false,
      reason: `sequence must be exactly ${expected}; ${candidateSequence} would ${
        candidateSequence < expected ? "rewrite history" : "leave a gap"
      }`,
    };
  }
  return { ok: true };
}
