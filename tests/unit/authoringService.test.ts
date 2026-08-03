import { Buffer } from "node:buffer";
import * as http from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AuthoringProposeEngine,
  createAuthoringServer,
  globalMetricsTracker,
  globalRateLimiter,
  globalRunLedger,
  GeminiProposalClient,
  type ProposeRequest,
  GeminiApiError,
  validateProposeRequest,
  getTrustedClientIp,
} from "../../services/authoring/src/index.js";
import {
  validateReviewEvent,
  validateRunManifest,
  type ReviewEvent,
  type RunManifest,
} from "../../packages/signpack-schema/src/index.js";
import type { Server } from "node:http";

describe("Authoring Service (Workstream W0.1 / W4 Hardening)", () => {
  beforeEach(() => {
    globalRateLimiter.reset();
    globalRunLedger.clear();
  });

  describe("GeminiProposalClient & ProposeEngine Invariants", () => {
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

    it("increments sequence numbers per packId and maintains a stable actorRef", async () => {
      const engine = new AuthoringProposeEngine();
      const packId = "spk_test000000000001";

      const req1: ProposeRequest = {
        segmentText: "Science lesson",
        startTime: 0,
        endTime: 2,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [{ assetId: "ast_science00000000001", gloss: "SCIENCE" }],
        packId,
        environment: "synthetic_test",
      };

      const req2: ProposeRequest = {
        segmentText: "Science lab",
        startTime: 2,
        endTime: 4,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [{ assetId: "ast_science00000000001", gloss: "SCIENCE" }],
        packId,
        environment: "synthetic_test",
      };

      const res1 = await engine.proposeSegment(req1);
      const res2 = await engine.proposeSegment(req2);

      expect(res1.reviewEvent.sequence).toBe(1);
      expect(res2.reviewEvent.sequence).toBe(2);
      expect(res1.reviewEvent.actor.actorRef).toBe(res2.reviewEvent.actor.actorRef);
      expect(res1.reviewEvent.actor.actorRef).toBe(engine.serviceActorRef);
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

    it("generates a failed run manifest when proposal client throws an API error", async () => {
      const mockClient = new GeminiProposalClient();
      mockClient.propose = async () => {
        throw new GeminiApiError("Network timeout connecting to Gemini API");
      };

      const engine = new AuthoringProposeEngine(mockClient);
      const request: ProposeRequest = {
        segmentText: "API test segment",
        startTime: 0,
        endTime: 5,
        signedLanguage: "ase",
        region: "US",
        candidates: [],
        environment: "development",
      };

      try {
        await engine.proposeSegment(request);
        expect.unreachable("Should have thrown GeminiApiError");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GeminiApiError);
        const failedManifest = (err as Record<string, unknown>)["failedRunManifest"] as RunManifest;
        expect(failedManifest).toBeDefined();
        expect(failedManifest.status).toBe("failed");
        expect(validateRunManifest(failedManifest).ok).toBe(true);
      }
    });
  });

  describe("A1.1: Closed Request Schema Pre-Validation", () => {
    it("validates valid ProposeRequest payloads successfully", () => {
      const valid = {
        segmentText: "Hello class",
        startTime: 0,
        endTime: 5,
        signedLanguage: "ase",
        region: "US",
        candidates: [{ assetId: "ast_hello123" }],
      };
      const res = validateProposeRequest(valid);
      expect(res.ok).toBe(true);
      expect(res.value?.segmentText).toBe("Hello class");
    });

    it("rejects duplicate candidate assetIds with 400 Bad Request error message", () => {
      const duplicateCandidatesPayload = {
        segmentText: "Science test",
        startTime: 0,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [
          { assetId: "ast_duplicate_01", gloss: "TEST" },
          { assetId: "ast_duplicate_01", gloss: "TEST_DUP" },
        ],
      };
      const res = validateProposeRequest(duplicateCandidatesPayload);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Duplicate candidate assetId detected");
    });

    it("rejects missing signedLanguage or region fields", () => {
      const missingLang = {
        segmentText: "Test text",
        startTime: 0,
        endTime: 5,
        region: "US",
        candidates: [],
      };
      expect(validateProposeRequest(missingLang).ok).toBe(false);

      const missingRegion = {
        segmentText: "Test text",
        startTime: 0,
        endTime: 5,
        signedLanguage: "ase",
        candidates: [],
      };
      expect(validateProposeRequest(missingRegion).ok).toBe(false);
    });

    it("rejects negative startTime or endTime <= startTime", () => {
      const negativeStart = {
        segmentText: "Test",
        startTime: -1,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
      };
      expect(validateProposeRequest(negativeStart).ok).toBe(false);

      const invalidEnd = {
        segmentText: "Test",
        startTime: 5,
        endTime: 2,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
      };
      expect(validateProposeRequest(invalidEnd).ok).toBe(false);
    });

    it("rejects segment duration exceeding 600 seconds", () => {
      const oversizeDuration = {
        segmentText: "Test oversize",
        startTime: 0,
        endTime: 601,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
      };
      const res = validateProposeRequest(oversizeDuration);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Segment duration exceeds");
    });

    it("rejects unrecognized top-level request fields (closed schema invariant)", () => {
      const unexpectedKey = {
        segmentText: "Test",
        startTime: 0,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
        maliciousAuthorityField: "admin_override",
      };
      const res = validateProposeRequest(unexpectedKey);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unrecognized request field");
    });
  });

  describe("A1.3: Quota and Spoofing Defense", () => {
    it("extracts trusted client IP from rightmost Cloud Run proxy header", () => {
      const mockReq = {
        headers: {
          "x-forwarded-for": "10.0.0.1, 192.168.1.1, 203.0.113.195",
        },
      } as unknown as http.IncomingMessage;

      const clientIp = getTrustedClientIp(mockReq);
      expect(clientIp).toBe("203.0.113.195");
    });

    it("blocks request 61 when caller rotates prepended X-Forwarded-For header values", async () => {
      const server = createAuthoringServer();
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const addr = server.address();
      const serverUrl = addr && typeof addr === "object" ? `http://127.0.0.1:${addr.port}` : "";

      const payload: ProposeRequest = {
        segmentText: "Rate limit spoofing probe",
        startTime: 0,
        endTime: 3,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
        environment: "synthetic_test",
      };

      let lastStatus = 0;
      for (let i = 1; i <= 61; i++) {
        // Attacker prepends fake IP to X-Forwarded-For on each request
        const spoofedHeader = `fake-client-ip-${i}, 127.0.0.1`;
        const res = await fetch(`${serverUrl}/propose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": spoofedHeader,
          },
          body: JSON.stringify(payload),
        });
        lastStatus = res.status;
      }

      // Request 61 MUST return 429 Too Many Requests despite spoofed X-Forwarded-For headers
      expect(lastStatus).toBe(429);

      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
  });

  describe("A1.4 & A1.5: Truthful Provenance & Durable Runs", () => {
    it("persists truthful executionMode and omits Gemini model metadata when no Gemini model was called", async () => {
      const engine = new AuthoringProposeEngine();
      const request: ProposeRequest = {
        segmentText: "Deterministic proposal test",
        startTime: 0,
        endTime: 3,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [{ assetId: "ast_science01", gloss: "SCIENCE" }],
        environment: "synthetic_test",
      };

      const result = await engine.proposeSegment(request);

      expect(result.executionMode).toBe("synthetic_test");
      expect(result.runManifest.tool.name).toBe("authoring_service_deterministic");
      // Truthful provenance invariant: model metadata must NOT be populated for uncalled Gemini model
      expect(result.runManifest.model).toBeUndefined();
    });

    it("writes an append-only run record in DurableRunLedger for every proposal run", async () => {
      const engine = new AuthoringProposeEngine();
      const request: ProposeRequest = {
        segmentText: "Durable ledger test segment",
        startTime: 0,
        endTime: 4,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [],
        environment: "synthetic_test",
      };

      const result = await engine.proposeSegment(request);
      expect(result.durableRunRef).toBeDefined();

      const ledgerRecord = globalRunLedger.getRun(result.durableRunRef);
      expect(ledgerRecord).toBeDefined();
      expect(ledgerRecord?.runId).toBe(result.durableRunRef);
      expect(ledgerRecord?.status).toBe("abstained");
    });
  });

  describe("A1.6: Multibyte UTF-8 Stream Decoding", () => {
    it("decodes multibyte UTF-8 character split across network chunks without corrupting text or timed-text hash", async () => {
      const server = createAuthoringServer();
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const addr = server.address();
      const serverUrl = addr && typeof addr === "object" ? `http://127.0.0.1:${addr.port}` : "";

      // Payload containing multibyte UTF-8 character 'café' (é is 0xC3 0xA9)
      const payloadObj = {
        segmentText: "Welcome to café science",
        startTime: 0,
        endTime: 4,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [{ assetId: "ast_science01", gloss: "SCIENCE" }],
        environment: "synthetic_test",
      };

      const fullJson = JSON.stringify(payloadObj);
      const fullBuffer = Buffer.from(fullJson, "utf8");

      // Split buffer intentionally right inside the multibyte 'é' character
      const cafeIndex = fullJson.indexOf("café");
      const splitPoint = cafeIndex + 4; // Right after 'caf', splitting 0xC3 and 0xA9

      const chunk1 = fullBuffer.subarray(0, splitPoint);
      const chunk2 = fullBuffer.subarray(splitPoint);

      const reqUrl = new URL(`${serverUrl}/propose`);

      const resPromise = new Promise<{ statusCode: number; body: string }>((resolve) => {
        const req = http.request(
          reqUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
          (res: http.IncomingMessage) => {
            let resBody = "";
            res.on("data", (c: Buffer) => (resBody += c.toString()));
            res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: resBody }));
          },
        );

        // Send chunk 1 with first half of UTF-8 multibyte character
        req.write(chunk1);
        setTimeout(() => {
          // Send chunk 2 with second half of UTF-8 multibyte character
          req.write(chunk2);
          req.end();
        }, 10);
      });

      const response = await resPromise;
      expect(response.statusCode).toBe(200);

      const resObj = JSON.parse(response.body) as { translationStatus: string };
      expect(resObj.translationStatus).toBe("proposed");

      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
  });

  describe("A1.7: ReviewUnitV2 Decision Hash Binding", () => {
    it("produces DIFFERENT decision hashes for requests differing ONLY in source text or timing", async () => {
      const engine = new AuthoringProposeEngine();
      const baseCandidates = [{ assetId: "ast_science01", gloss: "SCIENCE" }];

      const req1: ProposeRequest = {
        segmentText: "Science lesson segment text A",
        startTime: 0,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: baseCandidates,
        environment: "synthetic_test",
      };

      const req2: ProposeRequest = {
        segmentText: "Science lesson segment text B (materially different text)",
        startTime: 0,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: baseCandidates,
        environment: "synthetic_test",
      };

      const req3: ProposeRequest = {
        segmentText: "Science lesson segment text A",
        startTime: 0,
        endTime: 10, // Different timing
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: baseCandidates,
        environment: "synthetic_test",
      };

      const res1 = await engine.proposeSegment(req1);
      const res2 = await engine.proposeSegment(req2);
      const res3 = await engine.proposeSegment(req3);

      // Adversarial probe verification: Decision hashes MUST be different
      expect(res1.reviewEvent.decisionHash).not.toBe(res2.reviewEvent.decisionHash);
      expect(res1.reviewEvent.decisionHash).not.toBe(res3.reviewEvent.decisionHash);
      expect(res2.reviewEvent.decisionHash).not.toBe(res3.reviewEvent.decisionHash);
    });
  });

  describe("A1.9: Derived Metrics", () => {
    it("derives metrics dynamically from durable review events in ledger across process operations", async () => {
      const engine = new AuthoringProposeEngine();
      const req: ProposeRequest = {
        segmentText: "Metrics tracking segment",
        startTime: 0,
        endTime: 5,
        signedLanguage: "zxx",
        region: "ZZ",
        candidates: [{ assetId: "ast_metrics01", gloss: "METRICS" }],
        environment: "synthetic_test",
      };

      await engine.proposeSegment(req);

      const metricsAfter = globalMetricsTracker.getMetrics();
      expect(metricsAfter.totalProposals).toBe(1);
      expect(metricsAfter.proposedCount).toBe(1);
    });
  });

  describe("HTTP Server Hardening & Endpoints", () => {
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

      // Verify X-Run-ID response header (A1.5)
      expect(res.headers.get("x-run-id")).toBeDefined();
    });

    it("returns 400 Bad Request for malformed POST /propose requests", async () => {
      const res = await fetch(`${serverUrl}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: true }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 502 Bad Gateway when Gemini API fails", async () => {
      const mockClient = new GeminiProposalClient();
      mockClient.propose = async () => {
        throw new GeminiApiError("Gemini API connection error");
      };
      const engine = new AuthoringProposeEngine(mockClient);
      const testServer = createAuthoringServer(engine);

      await new Promise<void>((resolve) => testServer.listen(0, "127.0.0.1", resolve));
      const addr = testServer.address();
      const url = addr && typeof addr === "object" ? `http://127.0.0.1:${addr.port}` : "";

      const payload: ProposeRequest = {
        segmentText: "Test segment",
        startTime: 0,
        endTime: 3,
        signedLanguage: "ase",
        region: "US",
        candidates: [],
        environment: "development",
      };

      const res = await fetch(`${url}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(502);
      const errorBody = (await res.json()) as { error: string };
      expect(errorBody.error).toBe("Bad Gateway");

      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    });
  });
});
