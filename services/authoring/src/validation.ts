import type { CandidateAsset, ProposeRequest } from "./types.js";

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "segmentId",
  "segmentText",
  "startTime",
  "endTime",
  "signedLanguage",
  "region",
  "candidates",
  "packId",
  "sequence",
  "contextText",
  "environment",
  "clientIp",
]);

const ALLOWED_CANDIDATE_KEYS = new Set([
  "assetId",
  "gloss",
  "description",
  "signedLanguage",
  "region",
]);

const IDENTIFIER_REGEX = /^[a-zA-Z0-9_\-]+$/;
const LANGUAGE_REGEX = /^[a-zA-Z]{2,3}$|^zxx$/i;
const REGION_REGEX = /^[a-zA-Z]{2}$|^ZZ$/i;

export function validateProposeRequest(body: unknown): ValidationResult<ProposeRequest> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;

  // Check for unknown/unexpected top-level keys
  for (const key of Object.keys(record)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      return { ok: false, error: `Unrecognized request field: '${key}'` };
    }
  }

  // Validate segmentText
  if (typeof record["segmentText"] !== "string") {
    return { ok: false, error: "Missing or invalid required field: 'segmentText' must be a string" };
  }
  const segmentText = record["segmentText"].trim();
  if (segmentText.length === 0) {
    return { ok: false, error: "Field 'segmentText' cannot be empty" };
  }
  if (segmentText.length > 5000) {
    return { ok: false, error: "Field 'segmentText' exceeds maximum length of 5000 characters" };
  }

  // Validate startTime
  if (typeof record["startTime"] !== "number" || !Number.isFinite(record["startTime"])) {
    return { ok: false, error: "Missing or invalid required field: 'startTime' must be a finite number" };
  }
  const startTime = record["startTime"];
  if (startTime < 0) {
    return { ok: false, error: "Field 'startTime' cannot be negative" };
  }

  // Validate endTime
  if (typeof record["endTime"] !== "number" || !Number.isFinite(record["endTime"])) {
    return { ok: false, error: "Missing or invalid required field: 'endTime' must be a finite number" };
  }
  const endTime = record["endTime"];
  if (endTime <= startTime) {
    return { ok: false, error: "Field 'endTime' must be greater than 'startTime'" };
  }

  // Segment duration bound (max 600s)
  const duration = endTime - startTime;
  if (duration > 600) {
    return { ok: false, error: "Segment duration exceeds maximum limit of 600 seconds" };
  }

  // Validate signedLanguage
  if (typeof record["signedLanguage"] !== "string") {
    return { ok: false, error: "Missing or invalid required field: 'signedLanguage' must be a string" };
  }
  const signedLanguage = record["signedLanguage"].trim();
  if (!LANGUAGE_REGEX.test(signedLanguage) || signedLanguage.length > 10) {
    return { ok: false, error: "Invalid 'signedLanguage' format (expected 2-3 letter code or 'zxx')" };
  }

  // Validate region
  if (typeof record["region"] !== "string") {
    return { ok: false, error: "Missing or invalid required field: 'region' must be a string" };
  }
  const region = record["region"].trim();
  if (!REGION_REGEX.test(region) || region.length > 10) {
    return { ok: false, error: "Invalid 'region' format (expected 2 letter code or 'ZZ')" };
  }

  // Validate candidates array
  if (!Array.isArray(record["candidates"])) {
    return { ok: false, error: "Missing or invalid required field: 'candidates' must be an array" };
  }
  const rawCandidates = record["candidates"];
  if (rawCandidates.length > 100) {
    return { ok: false, error: "Candidate count exceeds maximum allowed limit of 100 items" };
  }

  const candidateAssets: CandidateAsset[] = [];
  const seenAssetIds = new Set<string>();

  for (let i = 0; i < rawCandidates.length; i++) {
    const item = rawCandidates[i];
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { ok: false, error: `Candidate at index ${i} must be a JSON object` };
    }

    const itemRecord = item as Record<string, unknown>;
    for (const key of Object.keys(itemRecord)) {
      if (!ALLOWED_CANDIDATE_KEYS.has(key)) {
        return { ok: false, error: `Unrecognized field '${key}' in candidate at index ${i}` };
      }
    }

    if (typeof itemRecord["assetId"] !== "string") {
      return { ok: false, error: `Missing or invalid 'assetId' in candidate at index ${i}` };
    }
    const assetId = itemRecord["assetId"].trim();
    if (!IDENTIFIER_REGEX.test(assetId) || assetId.length > 128) {
      return { ok: false, error: `Invalid 'assetId' shape in candidate at index ${i}` };
    }

    // Candidate Uniqueness Check (A1.1)
    if (seenAssetIds.has(assetId)) {
      return { ok: false, error: `Duplicate candidate assetId detected: '${assetId}'` };
    }
    seenAssetIds.add(assetId);

    const asset: CandidateAsset = { assetId };

    if (itemRecord["gloss"] !== undefined) {
      if (typeof itemRecord["gloss"] !== "string") {
        return { ok: false, error: `Field 'gloss' in candidate at index ${i} must be a string` };
      }
      if (itemRecord["gloss"].length > 200) {
        return { ok: false, error: `Field 'gloss' in candidate at index ${i} exceeds 200 characters` };
      }
      asset.gloss = itemRecord["gloss"];
    }

    if (itemRecord["description"] !== undefined) {
      if (typeof itemRecord["description"] !== "string") {
        return { ok: false, error: `Field 'description' in candidate at index ${i} must be a string` };
      }
      if (itemRecord["description"].length > 1000) {
        return { ok: false, error: `Field 'description' in candidate at index ${i} exceeds 1000 characters` };
      }
      asset.description = itemRecord["description"];
    }

    if (itemRecord["signedLanguage"] !== undefined) {
      if (typeof itemRecord["signedLanguage"] !== "string" || !LANGUAGE_REGEX.test(itemRecord["signedLanguage"])) {
        return { ok: false, error: `Invalid 'signedLanguage' in candidate at index ${i}` };
      }
      asset.signedLanguage = itemRecord["signedLanguage"];
    }

    if (itemRecord["region"] !== undefined) {
      if (typeof itemRecord["region"] !== "string" || !REGION_REGEX.test(itemRecord["region"])) {
        return { ok: false, error: `Invalid 'region' in candidate at index ${i}` };
      }
      asset.region = itemRecord["region"];
    }

    candidateAssets.push(asset);
  }

  // Optional fields with exactOptionalPropertyTypes safety
  let segmentId: string | undefined;
  if (record["segmentId"] !== undefined) {
    if (typeof record["segmentId"] !== "string" || !IDENTIFIER_REGEX.test(record["segmentId"]) || record["segmentId"].length > 128) {
      return { ok: false, error: "Invalid 'segmentId' shape" };
    }
    segmentId = record["segmentId"];
  }

  let packId: string | undefined;
  if (record["packId"] !== undefined) {
    if (typeof record["packId"] !== "string" || !IDENTIFIER_REGEX.test(record["packId"]) || record["packId"].length > 128) {
      return { ok: false, error: "Invalid 'packId' shape" };
    }
    packId = record["packId"];
  }

  let sequence: number | undefined;
  if (record["sequence"] !== undefined) {
    if (typeof record["sequence"] !== "number" || !Number.isInteger(record["sequence"]) || record["sequence"] < 1) {
      return { ok: false, error: "Field 'sequence' must be a positive integer" };
    }
    sequence = record["sequence"];
  }

  let contextText: string | undefined;
  if (record["contextText"] !== undefined) {
    if (typeof record["contextText"] !== "string" || record["contextText"].length > 10000) {
      return { ok: false, error: "Field 'contextText' must be a string up to 10000 characters" };
    }
    contextText = record["contextText"];
  }

  let environment: "synthetic_test" | "development" | "production" | undefined;
  if (record["environment"] !== undefined) {
    const envStr = String(record["environment"]);
    if (envStr !== "synthetic_test" && envStr !== "development" && envStr !== "production") {
      return { ok: false, error: "Field 'environment' must be 'synthetic_test', 'development', or 'production'" };
    }
    environment = envStr;
  }

  const value: ProposeRequest = {
    segmentText,
    startTime,
    endTime,
    signedLanguage,
    region,
    candidates: candidateAssets,
    ...(segmentId !== undefined ? { segmentId } : {}),
    ...(packId !== undefined ? { packId } : {}),
    ...(sequence !== undefined ? { sequence } : {}),
    ...(contextText !== undefined ? { contextText } : {}),
    ...(environment !== undefined ? { environment } : {}),
  };

  return { ok: true, value };
}
