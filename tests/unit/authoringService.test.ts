import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AuthoringProposeEngine,
  createAuthoringServer,
  globalMetricsTracker,
  type ProposeRequest,
} from "../../services/authoring/src/index.js";
import {
  validateReviewEvent,
  validateRunManifest,
  type ReviewEvent,
  type RunManifest,
} from "../../packages/signpack-schema/src/index.js";
import type { Server } from "node:http";

describe("Authoring Service (Workstream W0.1 / W4)", () => {
  describe("GeminiProposalClient & ProposeEngine", () => {
    it("proposes candidate assets when a candidate matches segment text", async () => {
      const engine = new AuthoringProposeEngine();
      const request: ProposeRequest = {
        segmentText: "Welcome to the science classroom today.",
        startTime: 0,
        endTime: 3.5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [
          {
            assetId: "ast_science00000000001",
            gloss: "SCIENCE",
            description: "Science sign clip",
          },
          {
            assetId: "ast_welcome00000000001",
            gloss: "WELCOME",
            description: "Welcome sign clip",
          },
        ],
        environment: "synthetic_test",
      };

      const result = await engine.proposeSegment(request);

      expect(result.translationStatus).toBe("proposed");
      expect(result.assetIds.length).toBeGreaterThan(0);
      expect(result.assetIds).toContain("ast_science00000000001");
      expect(result.confidence).toBeGreaterThan(0);

      // Contract schema verification
      const reviewEventValidation = validateReviewEvent(result.reviewEvent as unknown as ReviewEvent);
      expect(reviewEventValidation.ok).toBe(true);

      const runManifestValidation = validateRunManifest(result.runManifest as unknown as RunManifest);
      expect(runManifestValidation.ok).toBe(true);
    });

    it("abstains with 'unsupported' when no candidate asset matches", async () => {
      const engine = new AuthoringProposeEngine();
      const request: ProposeRequest = {
        segmentText: "Quantum electrodynamics quantum fluctuation",
        startTime: 10,
        endTime: 15,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [
          {
            assetId: "ast_apple000000000001",
            gloss: "APPLE",
            description: "Apple fruit",
          },
        ],
        environment: "synthetic_test",
      };

      const result = await engine.proposeSegment(request);

      expect(result.translationStatus).toBe("unsupported");
      expect(result.assetIds).toEqual([]);
      expect(result.reasonCode).toBe("unsupported_vocabulary");

      // Review event schema verification for unsupported
      const reviewEventValidation = validateReviewEvent(result.reviewEvent as unknown as ReviewEvent);
      expect(reviewEventValidation.ok).toBe(true);
    });

    it("abstains with 'no_candidate_match' when candidate list is empty", async () => {
      const engine = new AuthoringProposeEngine();
      const request: ProposeRequest = {
        segmentText: "Hello world",
        startTime: 0,
        endTime: 2,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
        environment: "synthetic_test",
      };

      const result = await engine.proposeSegment(request);

      expect(result.translationStatus).toBe("unsupported");
      expect(result.assetIds).toEqual([]);
      expect(result.reasonCode).toBe("no_candidate_match");
    });

    it("strictly enforces privacy invariants in run manifest", async () => {
      const engine = new AuthoringProposeEngine();
      const request: ProposeRequest = {
        segmentText: "Private lesson segment text",
        startTime: 0,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
        environment: "synthetic_test",
      };

      const result = await engine.proposeSegment(request);
      const manifest = result.runManifest;

      expect(manifest.privacy.containsTranscript).toBe(false);
      expect(manifest.privacy.containsIdentity).toBe(false);
      expect(manifest.privacy.containsMediaUrl).toBe(false);
    });
  });

  describe("AI-Native Operations Metrics Tracker", () => {
    it("tracks proposals, coverage rate, and reason code breakdown", () => {
      globalMetricsTracker.reset();

      globalMetricsTracker.recordProposal("proposed");
      globalMetricsTracker.recordProposal("proposed");
      globalMetricsTracker.recordProposal("unsupported", "unsupported_vocabulary");
      globalMetricsTracker.recordProposal("unsupported", "ambiguous_context");

      const metrics = globalMetricsTracker.getMetrics();
      expect(metrics.totalProposals).toBe(4);
      expect(metrics.proposedCount).toBe(2);
      expect(metrics.unsupportedCount).toBe(2);
      expect(metrics.coverageRate).toBe(0.5);
      expect(metrics.reasonCodeBreakdown["unsupported_vocabulary"]).toBe(1);
      expect(metrics.reasonCodeBreakdown["ambiguous_context"]).toBe(1);
    });
  });

  describe("HTTP Server (POST /propose, GET /health, GET /metrics)", () => {
    let server: Server;
    let serverUrl: string;

    beforeAll(async () => {
      server = createAuthoringServer();
      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          if (addr && typeof addr === "object") {
            serverUrl = `http://127.0.0.1:${addr.port}`;
          }
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("responds to GET /health", async () => {
      const res = await fetch(`${serverUrl}/health`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { status: string; service: string };
      expect(body.status).toBe("ok");
      expect(body.service).toBe("authoring_service");
    });

    it("responds to GET /metrics", async () => {
      const res = await fetch(`${serverUrl}/metrics`);
      expect(res.status).toBe(200);

      const metrics = (await res.json()) as { totalProposals: number };
      expect(typeof metrics.totalProposals).toBe("number");
    });

    it("processes POST /propose and returns a valid proposal result", async () => {
      const payload: ProposeRequest = {
        segmentText: "Intro to computer science",
        startTime: 0,
        endTime: 4,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [
          {
            assetId: "ast_computer0000000001",
            gloss: "COMPUTER",
            description: "Computer science sign clip",
          },
        ],
        environment: "synthetic_test",
      };

      const res = await fetch(`${serverUrl}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const result = (await res.json()) as { translationStatus: string; assetIds: string[] };
      expect(result.translationStatus).toBe("proposed");
      expect(result.assetIds).toContain("ast_computer0000000001");
    });

    it("returns 400 Bad Request for malformed POST /propose requests", async () => {
      const res = await fetch(`${serverUrl}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: true }),
      });

      expect(res.status).toBe(400);
    });
  });
});
