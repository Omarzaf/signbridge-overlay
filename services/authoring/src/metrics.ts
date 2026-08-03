import { globalRunLedger } from "./runLedger.js";
import type { AuthoringMetrics, ReasonCode } from "./types.js";

export class MetricsTracker {
  public recordProposal(
    _status: "proposed" | "unsupported",
    _reasonCode?: ReasonCode,
  ): void {
    // Operations are automatically tracked in globalRunLedger (A1.9)
  }

  public recordReviewOutcome(
    outcome: "accepted" | "changes_requested" | "rejected" | "false_supported",
    eventId?: string,
  ): void {
    if (eventId) {
      globalRunLedger.recordReviewOutcome(eventId, outcome);
    }
  }

  /**
   * Derive metrics dynamically from the durable run ledger (A1.9).
   */
  public getMetrics(): AuthoringMetrics {
    return globalRunLedger.getMetrics();
  }

  public reset(): void {
    globalRunLedger.clear();
  }
}

export const globalMetricsTracker = new MetricsTracker();
