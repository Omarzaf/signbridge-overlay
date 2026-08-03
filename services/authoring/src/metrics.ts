import type { AuthoringMetrics, ReasonCode } from "./types.js";

export class MetricsTracker {
  private totalProposals = 0;
  private proposedCount = 0;
  private unsupportedCount = 0;
  private changesRequestedCount = 0;
  private rejectedCount = 0;
  private topOneAcceptedCount = 0;
  private falseSupportedCount = 0;
  private reasonCodeBreakdown: Record<string, number> = {};

  public recordProposal(
    status: "proposed" | "unsupported",
    reasonCode?: ReasonCode,
  ): void {
    this.totalProposals += 1;
    if (status === "proposed") {
      this.proposedCount += 1;
    } else {
      this.unsupportedCount += 1;
      if (reasonCode) {
        this.reasonCodeBreakdown[reasonCode] =
          (this.reasonCodeBreakdown[reasonCode] ?? 0) + 1;
      }
    }
  }

  public recordReviewOutcome(
    outcome: "accepted" | "changes_requested" | "rejected" | "false_supported",
  ): void {
    if (outcome === "accepted") {
      this.topOneAcceptedCount += 1;
    } else if (outcome === "changes_requested") {
      this.changesRequestedCount += 1;
    } else if (outcome === "rejected") {
      this.rejectedCount += 1;
    } else if (outcome === "false_supported") {
      this.falseSupportedCount += 1;
    }
  }

  public getMetrics(): AuthoringMetrics {
    const total = this.totalProposals;
    const coverageRate = total > 0 ? this.proposedCount / total : 0;
    const falseSupportedRate =
      this.proposedCount > 0 ? this.falseSupportedCount / this.proposedCount : 0;
    const topOneAcceptanceRate =
      this.proposedCount > 0
        ? this.topOneAcceptedCount / this.proposedCount
        : 0;

    return {
      totalProposals: this.totalProposals,
      proposedCount: this.proposedCount,
      unsupportedCount: this.unsupportedCount,
      coverageRate,
      falseSupportedRate,
      topOneAcceptanceRate,
      changesRequestedCount: this.changesRequestedCount,
      rejectedCount: this.rejectedCount,
      reasonCodeBreakdown: { ...this.reasonCodeBreakdown },
    };
  }

  public reset(): void {
    this.totalProposals = 0;
    this.proposedCount = 0;
    this.unsupportedCount = 0;
    this.changesRequestedCount = 0;
    this.rejectedCount = 0;
    this.topOneAcceptedCount = 0;
    this.falseSupportedCount = 0;
    this.reasonCodeBreakdown = {};
  }
}

export const globalMetricsTracker = new MetricsTracker();
