import process from "node:process";
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiApiError, type CandidateAsset, type ProposeRequest, type ReasonCode } from "./types.js";

export interface GeminiProposalOutput {
  translationStatus: "proposed" | "unsupported";
  assetIds: string[];
  confidence: number;
  reasonCode?: ReasonCode;
  executionMode: "gemini_live" | "deterministic_fallback" | "synthetic_test";
  authMode: "vertex_ai" | "api_key" | "none";
  actualModel?: string;
  fallbackReason?: string;
}

export class GeminiProposalClient {
  private aiClient: GoogleGenAI | null = null;
  private modelName: string;
  private authMode: "vertex_ai" | "api_key" | "none" = "none";

  constructor(apiKey?: string, modelName = "gemini-2.5-flash") {
    const useVertex = process.env["GOOGLE_GENAI_USE_VERTEXAI"] === "true";
    const project = process.env["GOOGLE_CLOUD_PROJECT"];
    const location = process.env["GOOGLE_CLOUD_LOCATION"] ?? "us-central1";

    if (useVertex && project) {
      this.aiClient = new GoogleGenAI({ vertexai: true, project, location });
      this.authMode = "vertex_ai";
    } else {
      const key = apiKey ?? process.env["GEMINI_API_KEY"];
      if (key) {
        this.aiClient = new GoogleGenAI({ apiKey: key });
        this.authMode = "api_key";
      }
    }
    this.modelName = modelName;
  }

  public get credentialMode(): "vertex_ai" | "api_key" | "none" {
    return this.authMode;
  }

  public get isLive(): boolean {
    return this.aiClient !== null;
  }

  public async propose(request: ProposeRequest): Promise<GeminiProposalOutput> {
    // Synthetic environment check or missing API key -> fallback to deterministic heuristic engine
    if (!this.aiClient || request.environment === "synthetic_test") {
      const fallbackReason = !this.aiClient
        ? "no_model_credentials"
        : "synthetic_test_environment";
      return this.proposeDeterministic(request, fallbackReason);
    }

    try {
      return await this.proposeWithGemini(request);
    } catch (err: unknown) {
      if (err instanceof GeminiApiError) {
        throw err;
      }
      throw new GeminiApiError("Gemini API proposal request failed", err);
    }
  }

  private async proposeWithGemini(
    request: ProposeRequest,
  ): Promise<GeminiProposalOutput> {
    if (!this.aiClient) {
      return this.proposeDeterministic(request, "no_model_credentials");
    }

    const candidateIds = request.candidates.map((c) => c.assetId);

    const prompt = `
You are an AI authoring assistant for SignBridge, a sign-language overlay system.
Your task is to analyze an educational segment text and choose candidate sign assets from a CONSTRAINED list.

CRITICAL INVARIANTS:
1. You may ONLY propose asset IDs that are explicitly listed in the provided Candidate Catalog.
2. If no candidate asset in the catalog accurately maps to the segment, or if context is ambiguous or grammar unsupported, you MUST ABSTAIN by setting translationStatus to "unsupported".
3. Abstention is an encouraged, first-class output. Do NOT guess or invent asset IDs.

Segment Text: "${request.segmentText}"
Context Text: "${request.contextText ?? ""}"
Declared Language: ${request.signedLanguage}_${request.region}
Candidate Catalog: ${JSON.stringify(request.candidates, null, 2)}

Valid Reason Codes for unsupported:
- "unsupported_vocabulary": No matching sign in candidate catalog
- "ambiguous_context": Meaning is context-dependent or unclear
- "unsupported_grammar": Complex sentence structure not supported in v1
- "low_confidence": Confidence below threshold
- "no_candidate_match": No candidates provided
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        translationStatus: {
          type: Type.STRING,
          enum: ["proposed", "unsupported"],
        },
        assetIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        confidence: { type: Type.NUMBER },
        reasonCode: {
          type: Type.STRING,
          enum: [
            "unsupported_vocabulary",
            "ambiguous_context",
            "unsupported_grammar",
            "low_confidence",
            "no_candidate_match",
            "no_reviewed_mapping",
          ],
        },
      },
      required: ["translationStatus", "assetIds", "confidence"],
    };

    const response = await this.aiClient.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return {
        translationStatus: "unsupported",
        assetIds: [],
        confidence: 0,
        reasonCode: "low_confidence",
        executionMode: "gemini_live",
        authMode: this.authMode,
        actualModel: this.modelName,
      };
    }

    const parsed = JSON.parse(responseText) as GeminiProposalOutput;
    const rawConfidence =
      typeof parsed.confidence === "number" && !Number.isNaN(parsed.confidence)
        ? parsed.confidence
        : 0.0;

    // Strict validation: Ensure proposed asset IDs are strictly a subset of candidates
    if (parsed.translationStatus === "proposed") {
      const containsInvalidAsset = (parsed.assetIds ?? []).some(
        (id) => !candidateIds.includes(id),
      );

      if (containsInvalidAsset) {
        // Hallucination detected: reject the entire proposal
        return {
          translationStatus: "unsupported",
          assetIds: [],
          confidence: 0.0,
          reasonCode: "unsupported_vocabulary",
          executionMode: "gemini_live",
          authMode: this.authMode,
          actualModel: this.modelName,
        };
      }

      if (!parsed.assetIds || parsed.assetIds.length === 0) {
        return {
          translationStatus: "unsupported",
          assetIds: [],
          confidence: 0.0,
          reasonCode: "no_candidate_match",
          executionMode: "gemini_live",
          authMode: this.authMode,
          actualModel: this.modelName,
        };
      }

      if (rawConfidence <= 0.0) {
        return {
          translationStatus: "unsupported",
          assetIds: [],
          confidence: 0.0,
          reasonCode: "low_confidence",
          executionMode: "gemini_live",
          authMode: this.authMode,
          actualModel: this.modelName,
        };
      }

      return {
        translationStatus: "proposed",
        assetIds: parsed.assetIds,
        confidence: rawConfidence,
        executionMode: "gemini_live",
        authMode: this.authMode,
        actualModel: this.modelName,
      };
    }

    return {
      translationStatus: "unsupported",
      assetIds: [],
      confidence: rawConfidence,
      reasonCode: (parsed.reasonCode as ReasonCode) ?? "unsupported_vocabulary",
      executionMode: "gemini_live",
      authMode: this.authMode,
      actualModel: this.modelName,
    };
  }

  private proposeDeterministic(
    request: ProposeRequest,
    fallbackReason: string,
  ): GeminiProposalOutput {
    const mode =
      request.environment === "synthetic_test"
        ? "synthetic_test"
        : "deterministic_fallback";

    const textLower = request.segmentText.toLowerCase().trim();

    if (!request.candidates || request.candidates.length === 0) {
      return {
        translationStatus: "unsupported",
        assetIds: [],
        confidence: 0,
        reasonCode: "no_candidate_match",
        executionMode: mode,
        authMode: this.authMode,
        fallbackReason,
      };
    }

    // Match candidate by gloss or description substring
    const matched = request.candidates.filter((candidate: CandidateAsset) => {
      if (candidate.gloss && textLower.includes(candidate.gloss.toLowerCase())) {
        return true;
      }
      if (
        candidate.description &&
        textLower.includes(candidate.description.toLowerCase())
      ) {
        return true;
      }
      return false;
    });

    if (matched.length > 0) {
      const selectedIds = matched.map((c) => c.assetId);
      return {
        translationStatus: "proposed",
        assetIds: selectedIds,
        confidence: 0.95,
        executionMode: mode,
        authMode: this.authMode,
        fallbackReason,
      };
    }

    return {
      translationStatus: "unsupported",
      assetIds: [],
      confidence: 0.1,
      reasonCode: "unsupported_vocabulary",
      executionMode: mode,
      authMode: this.authMode,
      fallbackReason,
    };
  }
}
