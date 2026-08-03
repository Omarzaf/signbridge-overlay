import { describe, expect, test } from "vitest";

import { checkLedgerAppend } from "./index";
import type { DurableLedgerRecord } from "./ledger";

function runRecord(sequence: number): DurableLedgerRecord {
  return {
    kind: "run",
    recordId: `ledgerrec_${sequence.toString().padStart(6, "0")}`,
    sequence,
    recordedAt: "2026-01-01T00:00:00.000Z",
    environment: "synthetic_test",
    runId: "run_synthetic000001",
    outcome: "abstained",
    provenance: {
      executionMode: "deterministic_fallback",
      generator: { name: "synthetic_test_generator", version: "0.1.0" },
      catalogVersion: "0.1.0",
      authenticationMode: "none",
      fallbackReason: "synthetic fixture; no model was called",
    },
  };
}

describe("append-only ledger rule", () => {
  test("starts an empty ledger at sequence one", () => {
    expect(checkLedgerAppend([], 1)).toMatchObject({ ok: true });
    expect(checkLedgerAppend([], 2).ok).toBe(false);
  });

  test("advances by exactly one", () => {
    const existing = [runRecord(1), runRecord(2)];
    expect(checkLedgerAppend(existing, 3)).toMatchObject({ ok: true });
    expect(checkLedgerAppend(existing, 4).ok).toBe(false);
  });

  test("refuses to rewrite an existing record", () => {
    const existing = [runRecord(1), runRecord(2)];
    const rewrite = checkLedgerAppend(existing, 2);
    expect(rewrite.ok).toBe(false);
    expect(rewrite.reason).toContain("rewrite history");
  });

  test("rejects a non-positive or fractional sequence", () => {
    for (const sequence of [0, -1, 1.5, Number.NaN]) {
      expect(checkLedgerAppend([], sequence).ok).toBe(false);
    }
  });
});
