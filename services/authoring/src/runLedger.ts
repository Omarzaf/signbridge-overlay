import type { AuthoringMetrics, ReviewEvent, RunManifest } from "./types.js";

export interface RunRecord {
  runId: string;
  environment: "synthetic_test" | "development" | "production";
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "failed" | "abstained";
  executionMode: "gemini_live" | "deterministic_fallback" | "synthetic_test";
  runManifest: RunManifest;
  reviewEvent?: ReviewEvent;
  error?: string;
  reviewOutcome?: "accepted" | "changes_requested" | "rejected" | "false_supported";
}

export class DurableRunLedger {
  private records: RunRecord[] = [];
  private recordsByRunId = new Map<string, RunRecord>();
  private recordsByEventId = new Map<string, RunRecord>();

  public recordRun(record: RunRecord): void {
    // Append-only invariant: push to immutable history array
    this.records.push(record);
    this.recordsByRunId.set(record.runId, record);
    if (record.reviewEvent) {
      this.recordsByEventId.set(record.reviewEvent.eventId, record);
    }
  }

  public recordReviewOutcome(
    eventId: string,
    outcome: "accepted" | "changes_requested" | "rejected" | "false_supported",
  ): void {
    const record = this.recordsByEventId.get(eventId);
    if (record) {
      record.reviewOutcome = outcome;
    }
  }

  public getRun(runId: string): RunRecord | undefined {
    return this.recordsByRunId.get(runId);
  }

  public getAllRuns(): readonly RunRecord[] {
    return this.records;
  }

  /**
   * Derive metrics dynamically from durable run records and review events (A1.9).
   */
  public getMetrics(): AuthoringMetrics {
    let totalProposals = 0;
    let proposedCount = 0;
    let unsupportedCount = 0;
    let changesRequestedCount = 0;
    let rejectedCount = 0;
    let topOneAcceptedCount = 0;
    let falseSupportedCount = 0;
    const reasonCodeBreakdown: Record<string, number> = {};

    for (const record of this.records) {
      if (record.status === "failed") {
        continue;
      }

      totalProposals += 1;
      const reviewEvent = record.reviewEvent;

      if (reviewEvent) {
        if (reviewEvent.translationStatus === "proposed") {
          proposedCount += 1;
        } else if (reviewEvent.translationStatus === "unsupported") {
          unsupportedCount += 1;
          if (reviewEvent.reasonCode) {
            reasonCodeBreakdown[reviewEvent.reasonCode] =
              (reasonCodeBreakdown[reviewEvent.reasonCode] ?? 0) + 1;
          }
        }
      } else if (record.status === "abstained") {
        unsupportedCount += 1;
      }

      if (record.reviewOutcome === "accepted") {
        topOneAcceptedCount += 1;
      } else if (record.reviewOutcome === "changes_requested") {
        changesRequestedCount += 1;
      } else if (record.reviewOutcome === "rejected") {
        rejectedCount += 1;
      } else if (record.reviewOutcome === "false_supported") {
        falseSupportedCount += 1;
      }
    }

    const coverageRate = totalProposals > 0 ? proposedCount / totalProposals : 0;
    const falseSupportedRate = proposedCount > 0 ? falseSupportedCount / proposedCount : 0;
    const topOneAcceptanceRate = proposedCount > 0 ? topOneAcceptedCount / proposedCount : 0;

    return {
      totalProposals,
      proposedCount,
      unsupportedCount,
      coverageRate,
      falseSupportedRate,
      topOneAcceptanceRate,
      changesRequestedCount,
      rejectedCount,
      reasonCodeBreakdown,
    };
  }

  public clear(): void {
    this.records = [];
    this.recordsByRunId.clear();
    this.recordsByEventId.clear();
  }
}

export const globalRunLedger = new DurableRunLedger();
