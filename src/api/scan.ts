/**
 * Scan API — v10.22.
 *
 * Two flows: face scan (analyzeFaceScan) and product image scan
 * (analyzeProductScan). Both prefer the real AI gateway and fall
 * back to the original deterministic logic only when the gateway
 * has no transport configured (or when a call fails).
 *
 * Why fallbacks remain: the brief explicitly allows deterministic
 * logic to remain alive as a "clearly intentional fallback path."
 * Without it, the app would be unusable for users without an AI key
 * or proxy. Every fallback emits a console.warn in __DEV__ so it's
 * obvious which path ran.
 */

import type { Scan, SkinZone } from '@/types';
import { buildSummaryHeadline, deriveConcerns } from '@/utils/concerns';
import { aiGateway, tryAi } from '@/ai/aiGateway';
import { aiLog } from '@/ai/aiLog';
import { translateAnalysisToScan, buildPreviousSummary } from '@/ai/translateAnalysis';
import { useAppStore } from '@/store/useAppStore';
import type { ProductIdentity, ProductMatchResult } from '@/ai/ai-contracts';

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Helpers — resolving the user profile + the photo bytes.
// ---------------------------------------------------------------------------

function buildUserProfileSummary(): string {
  const s = useAppStore.getState();
  return JSON.stringify({
    name: s.name || null,
    age: s.age,
    skin_type: s.skinType,
    concerns: s.concerns,
    sensitivity: s.sensitivity,
    sun_exposure: s.sunExposure,
    effort: s.effort,
    goal: s.goal,
    price_tier: s.priceTier,
  });
}

/**
 * Read the file at `photoUri` and return base64-encoded JPEG bytes.
 * RN's `fetch` works against a `file://` URI and yields a Blob; we
 * convert via `FileReader` because that's the broadly-portable RN
 * idiom (RN 0.81 has FileReader built in).
 */
async function readImageAsBase64(photoUri: string): Promise<string> {
  const res = await fetch(photoUri);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('readImageAsBase64: unexpected non-string result'));
        return;
      }
      // Strip data URL prefix if present: "data:image/jpeg;base64,...."
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('readImageAsBase64: read failed'));
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Face scan.
// ---------------------------------------------------------------------------

export async function analyzeFaceScan(args: {
  photoUri: string;
  previousScan?: Scan;
  dayNumber: number;
}): Promise<Scan> {
  const { photoUri, previousScan, dayNumber } = args;
  const scanId = `scan-${Date.now()}`;

  // ── Primary path: real AI ──
  if (aiGateway.isAvailable()) {
    let imageBase64: string | null = null;
    try {
      imageBase64 = await readImageAsBase64(photoUri);
    } catch (e) {
      aiLog.warn('analyzeFaceScan', 'failed to read image bytes', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    if (imageBase64) {
      const analysis = await tryAi(() =>
        aiGateway.analyzeFaceScan({
          imageBase64: imageBase64!,
          mediaType: 'image/jpeg',
          scanId,
          previousSummary: previousScan
            ? buildPreviousSummary(previousScan)
            : undefined,
          userProfileSummary: buildUserProfileSummary(),
        })
      );
      if (analysis) {
        return translateAnalysisToScan({
          analysis,
          photoUri,
          dayNumber,
          scanId,
        });
      }
      aiLog.warn(
        'analyzeFaceScan',
        'AI path failed (gateway/validation), using deterministic fallback',
        { scanId }
      );
    }
  }

  // ── Fallback path: deterministic mock (the original v8.1 logic) ──
  await delay(1800);

  if (!previousScan) {
    const baseScan: Scan = {
      id: scanId,
      capturedAt: new Date().toISOString(),
      dayNumber: 1,
      photoUri,
      overallScore: 60,
      summaryHeadline: '',
      summaryBody: '',
      zones: starterZones(),
    };
    const concerns = deriveConcerns(baseScan);
    return {
      ...baseScan,
      concerns,
      summaryHeadline: buildSummaryHeadline(concerns),
      summaryBody: concerns
        .slice(0, 2)
        .map((c) => c.finding)
        .join(' '),
    };
  }

  const zones: SkinZone[] = previousScan.zones.map((z) => {
    const delta = z.trend === 'improving' ? 4 : z.trend === 'worsening' ? -3 : 1;
    const nextScore = Math.max(0, Math.min(100, z.score + delta));
    return { ...z, score: nextScore };
  });

  const baseScan: Scan = {
    id: scanId,
    capturedAt: new Date().toISOString(),
    dayNumber,
    photoUri,
    overallScore: Math.round(
      zones.reduce((acc, z) => acc + z.score, 0) / Math.max(1, zones.length)
    ),
    summaryHeadline: '',
    summaryBody: '',
    zones,
  };
  const concerns = deriveConcerns(baseScan, previousScan);
  return {
    ...baseScan,
    concerns,
    summaryHeadline: buildSummaryHeadline(concerns),
    summaryBody: concerns
      .slice(0, 2)
      .map((c) => c.finding)
      .join(' '),
  };
}

// ---------------------------------------------------------------------------
// Product image scan.
//
// v10.22 — the legacy stub returned a hard-coded `{ matchPercent: 78 }`.
// The new path identifies the product from the image and ranks it
// against the user, returning identity + AI-derived match. Callers
// can read either piece. For backwards compatibility the legacy
// shape (matchPercent only) is still returned when the gateway is
// unavailable or the call fails.
// ---------------------------------------------------------------------------

export interface ProductScanResult {
  /** Legacy field every existing UI surface reads. */
  matchPercent: number;
  /** v10.22 — present when the AI gateway resolved the product. */
  identity?: ProductIdentity;
  /** v10.22 — present when the AI gateway ran the matching pass. */
  fit?: ProductMatchResult;
}

export async function analyzeProductScan(args?: {
  photoUri?: string;
}): Promise<ProductScanResult> {
  if (args?.photoUri && aiGateway.isAvailable()) {
    let imageBase64: string | null = null;
    try {
      imageBase64 = await readImageAsBase64(args.photoUri);
    } catch (e) {
      aiLog.warn('analyzeProductScan', 'failed to read image bytes', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    if (imageBase64) {
      const result = await tryAi(() =>
        aiGateway.analyzeScannedProductAgainstUser({
          imageBase64: imageBase64!,
          mediaType: 'image/jpeg',
          userContextSummary: buildUserProfileSummary(),
        })
      );
      if (result) {
        try {
          useAppStore.getState().setAiActiveProductIdentity(result.identity);
        } catch {
          /* non-fatal */
        }
        const topMatchScore =
          result.fit.matches.length > 0
            ? result.fit.matches[0].match_score
            : 0;
        return {
          matchPercent: topMatchScore,
          identity: result.identity,
          fit: result.fit,
        };
      }
      aiLog.warn(
        'analyzeProductScan',
        'AI path failed (gateway/validation), using deterministic fallback'
      );
    }
  }

  // Deterministic fallback — preserves the legacy shape so any caller
  // reading only `matchPercent` continues to work.
  await delay(1800);
  return { matchPercent: 78 };
}

// ---------------------------------------------------------------------------
// Deterministic-fallback starter zones (the original v8.1 mock).
// ---------------------------------------------------------------------------

function starterZones(): SkinZone[] {
  return [
    {
      key: 'chin',
      label: 'Chin',
      status: 'active',
      trend: 'stable',
      score: 46,
      shortInsight: 'Active breakout',
      glow: [{ x: 0.5, y: 0.82, radius: 0.26, intensity: 0.5 }],
    },
    {
      key: 'forehead',
      label: 'Forehead',
      status: 'monitor',
      trend: 'stable',
      score: 62,
      shortInsight: 'Small clogged bumps',
      glow: [{ x: 0.5, y: 0.18, radius: 0.28, intensity: 0.4 }],
    },
    {
      key: 'tZone',
      label: 'Nose and center forehead',
      status: 'monitor',
      trend: 'stable',
      score: 64,
      shortInsight: 'Pores reading more visible',
      glow: [{ x: 0.5, y: 0.52, radius: 0.22, intensity: 0.32 }],
    },
    {
      key: 'cheeks',
      label: 'Cheeks',
      status: 'calm',
      trend: 'stable',
      score: 72,
      shortInsight: 'Slightly low on moisture',
    },
  ];
}
