# Pura AI proxy server

Production proxy for the Pura AI app. Holds the Anthropic API key
server-side, runs the centralised `ClaudeClient`, validates every
structured AI response, and serves the result to the RN client.

## Why this exists

Embedding an Anthropic API key in a shipped React Native bundle
exposes it to anyone who decompiles the app. The proxy keeps the key
on a server you control. The RN client targets the proxy in production;
direct-SDK mode is only for local development.

## Run

```
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run server:ai
```

Or with all the knobs:

```
ANTHROPIC_API_KEY=sk-ant-... \
PURA_AI_PROXY_HOST=0.0.0.0 \
PURA_AI_PROXY_PORT=8787 \
PURA_AI_PROXY_TOKEN=$(openssl rand -hex 32) \
PURA_AI_PROXY_RATE_PER_MIN=120 \
PURA_AI_PROXY_BODY_LIMIT_MB=20 \
npm run server:ai
```

## Configure the RN client

Set in your Expo `.env` / `app.config.ts`:

```
EXPO_PUBLIC_PURA_AI_PROXY_URL=https://ai.pura.app
EXPO_PUBLIC_PURA_AI_PROXY_TOKEN=<the same token the server has>
```

When `EXPO_PUBLIC_PURA_AI_PROXY_URL` is set, the gateway runs in proxy
mode automatically. No code change required.

## Env

| name | default | required | purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | — | **yes** | Anthropic API key |
| `PURA_AI_PROXY_PORT` | `8787` | no | Listen port |
| `PURA_AI_PROXY_HOST` | `127.0.0.1` | no | Bind host (use `0.0.0.0` to accept external traffic) |
| `PURA_AI_PROXY_TOKEN` | — | no but recommended | Shared bearer token; clients must send `Authorization: Bearer <token>` |
| `PURA_AI_PROXY_RATE_PER_MIN` | `60` | no | Per-IP rate limit |
| `PURA_AI_PROXY_BODY_LIMIT_MB` | `12` | no | Max JSON body (bigger images = bigger limit) |

## Endpoints

All AI endpoints are `POST` with a JSON body matching the
corresponding `ClaudeClient` method's `params` argument and return
the validated structured result as JSON.

| route | input shape | output shape |
|---|---|---|
| `/analyzeFaceScan` | `{ imageBase64, mediaType, scanId, previousSummary?, userProfileSummary }` | `FaceScanAnalysis` |
| `/identifyProductFromImage` | `{ imageBase64, mediaType }` | `ProductIdentity` |
| `/normalizeBarcodeResolution` | `{ barcodeValue }` | `BarcodeResolution` |
| `/matchProductsForUser` | `{ userId, basedOnScanId, skinStateSummary, candidateProductsJson }` | `ProductMatchResult` |
| `/generateRoutineRecommendation` | `{ scanSummary, matchedProductsJson, existingRoutineJson, basedOnScanId }` | `RoutineRecommendation` |
| `/explainSkinScore` | `{ score, deltaReference, deltaValue, concernMovementsJson }` | `SkinScoreExplanation` |
| `/explainProgress` | `{ baselineSummary, latestSummary, concernMovementsJson }` | `ProgressExplanation` |
| `/buildSearchSuggestions` | `{ latestScanSummary, routineSummary, pageContext }` | `SearchSuggestionResult` |
| `/answerAssistant` | `{ context, userQuestion }` | `string` |
| `/analyzeScannedProductAgainstUser` | `{ imageBase64, mediaType, userContextSummary }` | `{ identity, fit }` |
| `/buildFullScanToPlanBundle` | `{ imageBase64, mediaType, scanId, previousSummary?, userProfileSummary, candidateProductsJson, existingRoutineJson }` | `{ analysis, matches, routine, score }` |
| `/buildProgressBundle` | `{ baselineSummary, latestSummary, concernMovementsJson, score, deltaValue }` | `{ progress, score }` |

Plus `GET /healthz` for readiness probes.

## Errors

Standard HTTP status codes:
- **400** — bad request body (missing fields, wrong type, invalid JSON)
- **401** — missing or wrong `Authorization: Bearer …`
- **404** — unknown method
- **413** — body exceeds `PURA_AI_PROXY_BODY_LIMIT_MB`
- **429** — rate limit exceeded
- **502** — Claude returned a payload that failed structural validation
- **500** — unexpected server failure

Every response carries an `x-request-id` header. The client mirrors
this header from its own request id when present, so a single id can
trace a request across the network boundary.

## Logs

`aiLog.info`/`warn`/`error` records are written to stderr/stdout via
the default console sink. To plug a real telemetry backend, build a
custom `AiLogSink` and pass it to `aiLog.setSink(sink)` at the top of
`aiProxy.ts`.

## Catalog lookup

The barcode resolution flow runs the AI's two-step tool loop fully on
the server. The first call lets Claude request a `lookup_barcode` tool
call; the second call normalises the result. The `lookup_barcode`
implementation lives at `server/lib/barcodeLookup.ts` — replace the
default seed-only implementation with a real catalog or UPC database
lookup.
