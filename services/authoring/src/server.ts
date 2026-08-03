import process from "node:process";
import { Buffer } from "node:buffer";
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AuthoringProposeEngine } from "./proposeEngine.js";
import { globalMetricsTracker } from "./metrics.js";
import { GeminiApiError, type ProposeRequest } from "./types.js";

const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1MB
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

export class PayloadTooLargeError extends Error {
  constructor(message = "Request body exceeds maximum size limit of 1MB") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export function resetRateLimitMap(): void {
  rateLimitMap.clear();
}

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodyBytes = 0;

    req.on("data", (chunk: Buffer) => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_PAYLOAD_BYTES) {
        req.destroy();
        reject(new PayloadTooLargeError());
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      try {
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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const allowedOrigin = process.env["ALLOWED_ORIGIN"] ?? "*";
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  }
  return req.socket?.remoteAddress ?? "127.0.0.1";
}

export function createAuthoringServer(engine?: AuthoringProposeEngine): Server {
  const proposeEngine = engine ?? new AuthoringProposeEngine();

  return createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const clientIp = getClientIp(req);

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

    // Rate Limiting Enforcement
    if (checkRateLimit(clientIp)) {
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
      sendJson(res, 200, globalMetricsTracker.getMetrics());
      return;
    }

    if (req.method === "POST" && url === "/propose") {
      try {
        const body = await parseJsonBody<ProposeRequest>(req);
        if (!body.segmentText || typeof body.startTime !== "number" || typeof body.endTime !== "number") {
          sendJson(res, 400, {
            error: "Bad Request",
            message: "Missing required fields: segmentText, startTime, endTime",
          });
          return;
        }

        const result = await proposeEngine.proposeSegment(body);
        sendJson(res, 200, result);
      } catch (err: unknown) {
        if (err instanceof PayloadTooLargeError) {
          sendJson(res, 413, {
            error: "Payload Too Large",
            message: err.message,
          });
          return;
        }

        if (err instanceof GeminiApiError) {
          // The client response stays sanitised, but the cause must reach the
          // operator: without this a production Gemini failure is invisible in
          // Cloud Logging and therefore undiagnosable. The cause carries the
          // provider's own error, never request text or identities.
          if (process.env["NODE_ENV"] !== "test") {
            const cause = err.cause;
            const detail =
              cause instanceof Error ? cause.stack ?? cause.message : String(cause);
            process.stderr.write(`GeminiApiError: ${err.message} | cause: ${detail}\n`);
          }

          sendJson(res, 502, {
            error: "Bad Gateway",
            message: "Gemini API request failed",
          });
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
