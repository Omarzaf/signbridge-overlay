import type { IncomingMessage } from "node:http";

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 60; // 60 requests per minute
const DEFAULT_MAX_KEYS = 10_000; // Bounded store size limit to prevent memory exhaustion

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  maxKeys?: number;
}

export class BoundedTtlRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private maxKeys: number;
  private store = new Map<string, number[]>();

  constructor(options?: RateLimiterOptions) {
    this.windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
    this.maxKeys = options?.maxKeys ?? DEFAULT_MAX_KEYS;
  }

  /**
   * Checks whether a principal/IP key has exceeded rate limits.
   * Returns true if rate limited (429), false if allowed.
   */
  public checkRateLimit(key: string): boolean {
    const now = Date.now();
    const timestamps = this.store.get(key) ?? [];
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      this.store.set(key, validTimestamps);
      return true; // Limit exceeded
    }

    validTimestamps.push(now);

    // Evict oldest keys if capacity exceeded (bounded store invariant)
    if (!this.store.has(key) && this.store.size >= this.maxKeys) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, validTimestamps);
    return false;
  }

  public reset(): void {
    this.store.clear();
  }

  public get size(): number {
    return this.store.size;
  }
}

/**
 * Extracts client IP address safely from trusted reverse proxy chain (Cloud Run).
 * Attackers can spoof prepended X-Forwarded-For values (e.g., 'spoofed-ip, real-ip').
 * Cloud Run appends the verified client IP at the END of the header.
 * We resolve client identity using the rightmost (last) non-empty IP entry.
 */
export function getTrustedClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
    if (parts.length > 0) {
      // Cloud Run proxy appends client IP at the end of the chain
      return parts[parts.length - 1] ?? "127.0.0.1";
    }
  }

  // Fallback to socket remote address
  const socketAddress = req.socket?.remoteAddress;
  if (socketAddress) {
    return socketAddress;
  }

  return "127.0.0.1";
}

export const globalRateLimiter = new BoundedTtlRateLimiter();
