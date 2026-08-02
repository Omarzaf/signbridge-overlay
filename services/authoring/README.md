# Authoring Service (`services/authoring/`)

Server-side Gemini authoring service for constrained sign-language proposals, review events (`contracts/review-event.schema.json`), and run manifests (`contracts/run-manifest.schema.json`).

It can proposal-enqueue work for qualified human review but **cannot approve or publish** a SignPack. Publication belongs exclusively to `packages/signpack-publisher`. The authoring service is strictly out-of-band and not part of the playback path.

---

## Docker & Containerization (Workstream W0.2)

A lightweight multi-stage Dockerfile is provided at `services/authoring/Dockerfile`.

### Build Image
```bash
docker build -t signbridge-authoring:latest -f services/authoring/Dockerfile .
```

### Run Container Locally
```bash
docker run -p 8080:8080 -e GEMINI_API_KEY="your-api-key" signbridge-authoring:latest
```

---

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | *(None / Optional)* | API key for Google Gemini (`@google/genai`). If omitted or in synthetic test mode (`synthetic_test`), fallback deterministic matching runs. |
| `PORT` | `8080` | Inbound HTTP listening port (required for Google Cloud Run). |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `synthetic_test`). |
| `ALLOWED_ORIGIN` | `*` | Allowed origin for CORS headers. |

---

## Operational Notes & Safety Invariants

- **In-Memory Metrics Reset**: Operational metrics served at `GET /metrics` are held in-memory per service instance and reset on container cold restarts.
- **Pinned Dependencies**: `@google/genai` is deliberately pinned to `0.2.0` in accordance with baseline security requirements.
- **Server Hardening**: The HTTP server enforces a 1MB payload ceiling (`413 Payload Too Large`), rate limiting at 60 requests/minute per client IP (`429 Too Many Requests`), sanitized error messages, and strictly non-masking API error status codes (`502 Bad Gateway`).

---

## Google Cloud Run Deployment Steps

### 1. Enable Required GCP APIs
```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Create Artifact Registry Repository
```bash
gcloud artifacts repositories create signbridge-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for SignBridge Overlay services"
```

### 3. Build & Push Image using Cloud Build
```bash
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/project-6f0669f1-493e-41bb-9dd/signbridge-repo/authoring-service:latest \
  -f services/authoring/Dockerfile .
```

### 4. Store Gemini API Key in Secret Manager
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 5. Deploy to Cloud Run
```bash
gcloud run deploy authoring-service \
  --image=us-central1-docker.pkg.dev/project-6f0669f1-493e-41bb-9dd/signbridge-repo/authoring-service:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```
