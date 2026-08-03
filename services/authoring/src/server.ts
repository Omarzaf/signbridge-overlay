import process from "node:process";
import { Buffer } from "node:buffer";
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AuthoringProposeEngine } from "./proposeEngine.js";
import { globalMetricsTracker } from "./metrics.js";
import type { ProposeRequest } from "./types.js";

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
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
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

export function createAuthoringServer(engine?: AuthoringProposeEngine): Server {
  const proposeEngine = engine ?? new AuthoringProposeEngine();

  return createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
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
        const message = err instanceof Error ? err.message : "Internal Error";
        sendJson(res, 400, { error: "Bad Request", message });
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
    // Standard startup notification
    process.stdout.write(`SignBridge Authoring Service running on port ${port}\n`);
  });
}
