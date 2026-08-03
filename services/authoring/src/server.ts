import process from "node:process";
import { Buffer } from "node:buffer";
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AuthoringProposeEngine } from "./proposeEngine.js";
import { globalRunLedger } from "./runLedger.js";
import { getTrustedClientIp, globalRateLimiter } from "./rateLimiter.js";
import { validateProposeRequest } from "./validation.js";
import { GeminiApiError, type ProposeRequest } from "./types.js";

const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1MB

export class PayloadTooLargeError extends Error {
  constructor(message = "Request body exceeds maximum size limit of 1MB") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class InvalidUtf8Error extends Error {
  constructor(message = "Request body contains invalid UTF-8 encoding") {
    super(message);
    this.name = "InvalidUtf8Error";
  }
}

export function resetRateLimitMap(): void {
  globalRateLimiter.reset();
}

/**
 * A1.6 (#7): UTF-8 repair
 * Collects network chunks as raw Buffer array and decodes ONCE at completion using a fatal UTF-8 decoder.
 * This guarantees split multibyte characters across chunk boundaries do not corrupt string content or timed-text hashes.
 */
function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bodyBytes = 0;

    req.on("data", (chunk: Buffer) => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_PAYLOAD_BYTES) {
        req.destroy();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        if (bodyBytes === 0) {
          reject(new Error("Empty request body"));
          return;
        }

        const fullBuffer = Buffer.concat(chunks);

        // Fatal UTF-8 decoding: throws TypeError on invalid byte sequences
        let body: string;
        try {
          const decoder = new TextDecoder("utf-8", { fatal: true });
          body = decoder.decode(fullBuffer as unknown as BufferSource);
        } catch (_utfErr: unknown) {
          reject(new InvalidUtf8Error("Malformed UTF-8 sequence in request body"));
          return;
        }

        if (!body.trim()) {
          reject(new Error("Empty request body"));
          return;
        }

        resolve(JSON.parse(body) as T);
      } catch (err: unknown) {
        reject(err);
      }
    });

    req.on("error", (err: unknown) => reject(err));
  });
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
  extraHeaders?: Record<string, string>,
): void {
  const allowedOrigin = process.env["ALLOWED_ORIGIN"] ?? "*";
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

export function createAuthoringServer(engine?: AuthoringProposeEngine): Server {
  const proposeEngine = engine ?? new AuthoringProposeEngine();

  return createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    // A1.3 (#4): Quota that survives spoofing via proxy-safe client IP resolution
    const clientIp = getTrustedClientIp(req);

    if (req.method === "OPTIONS") {
      const allowedOrigin = process.env["ALLOWED_ORIGIN"] ?? "*";
      res.writeHead(204, {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    // Rate Limiting Enforcement (A1.3)
    if (globalRateLimiter.checkRateLimit(clientIp)) {
      sendJson(res, 429, {
        error: "Too Many Requests",
        message: "Rate limit exceeded (maximum 60 requests per minute)",
      });
      return;
    }

    const url = req.url ?? "/";

    if (req.method === "GET" && (url === "/health" || url === "/")) {
      sendJson(res, 200, {
        status: "ok",
        service: "authoring_service",
        version: "0.1.0",
        modelProvider: "google",
        environment: process.env["NODE_ENV"] ?? "development",
      });
      return;
    }

    if (req.method === "GET" && url === "/metrics") {
      // A1.9 (#5): Derive /metrics from durable review events & run ledger
      sendJson(res, 200, globalRunLedger.getMetrics());
      return;
    }

    if (req.method === "POST" && url === "/propose") {
      try {
        const rawBody = await parseJsonBody<unknown>(req);

        // A1.1 (#2): Closed request schema validation BEFORE model or engine execution
        const validation = validateProposeRequest(rawBody);
        if (!validation.ok || !validation.value) {
          sendJson(res, 400, {
            error: "Bad Request",
            message: validation.error ?? "Invalid request schema",
          });
          return;
        }

        const validRequest: ProposeRequest = {
          ...validation.value,
          clientIp,
        };

        const result = await proposeEngine.proposeSegment(validRequest);

        // A1.5 (#6): Return HTTP response carrying durable run reference
        sendJson(res, 200, result, {
          "X-Run-ID": result.durableRunRef,
        });
      } catch (err: unknown) {
        if (err instanceof PayloadTooLargeError) {
          sendJson(res, 413, {
            error: "Payload Too Large",
            message: err.message,
          });
          return;
        }

        if (err instanceof InvalidUtf8Error) {
          sendJson(res, 400, {
            error: "Bad Request",
            message: err.message,
          });
          return;
        }

        if (err instanceof GeminiApiError) {
          if (process.env["NODE_ENV"] !== "test") {
            const cause = err.cause;
            const detail =
              cause instanceof Error ? cause.stack ?? cause.message : String(cause);
            process.stderr.write(`GeminiApiError: ${err.message} | cause: ${detail}\n`);
          }

          const failedRunRef = (err as unknown as Record<string, unknown>)["durableRunRef"] as string | undefined;

          sendJson(res, 502, {
            error: "Bad Gateway",
            message: "Gemini API request failed",
            ...(failedRunRef ? { durableRunRef: failedRunRef } : {}),
          }, failedRunRef ? { "X-Run-ID": failedRunRef } : undefined);
          return;
        }

        if (err instanceof SyntaxError) {
          sendJson(res, 400, {
            error: "Bad Request",
            message: "Invalid JSON payload",
          });
          return;
        }

        // Sanitize internal errors for security, log actual trace internally
        if (process.env["NODE_ENV"] !== "test") {
          const message = err instanceof Error ? err.stack ?? err.message : String(err);
          process.stderr.write(`Authoring server internal error: ${message}\n`);
        }

        sendJson(res, 400, {
          error: "Bad Request",
          message: err instanceof Error ? err.message : "Internal Error",
        });
      }
      return;
    }

    sendJson(res, 404, { error: "Not Found", path: url });
  });
}

if (process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"))) {
  const port = Number(process.env["PORT"] ?? 8080);
  const server = createAuthoringServer();
  server.listen(port, () => {
    process.stdout.write(`SignBridge Authoring Service running on port ${port}\n`);
  });
}
