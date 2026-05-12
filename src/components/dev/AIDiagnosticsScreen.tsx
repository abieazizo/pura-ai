/**
 * Dev-only diagnostics screen.
 *
 * Reads everything from `useAITelemetry` and renders:
 *   • Transport summary (proxy URL set, token set)
 *   • `/healthz` ping result with latency (re-pings on demand)
 *   • Per-feature surface state (which screens are AI vs fallback)
 *   • Per-method last call (status, duration, requestId, error)
 *   • Recent log buffer
 *   • A "Run smoke test" button that fires lightweight calls to
 *     prove the path works end-to-end against the live proxy
 *
 * Intended for developers and QA only. The route is registered in
 * `AppNavigator.tsx` and the badge component opens it. In production
 * this screen still mounts but never gets opened (no entry point);
 * shipping it adds a tiny bytecode footprint and zero attack surface.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowsClockwise, Lightning } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import {
  useAITelemetry,
  type AIFeatureKey,
  type AIMethodKey,
  type AIMethodSnapshot,
  type AIFeatureSnapshot,
} from '@/ai/aiTelemetry';
import {
  aiGateway,
  getProxyCandidates,
  isActiveProxyVerified,
} from '@/ai/aiGateway';
import {
  rePingProxyHealthz,
  getMiddlewareLoadedState,
} from '@/ai/aiHealthProbe';
// v19.32 — read the real Products UI trace so diagnostics can
// prove "diagnostics === UI" or surface the divergence.
// v19.37 — also read lastTapped trace so we can prove the product
// detail path is no longer landing on "Product not found".
import {
  getAllTraces,
  getLastTappedTrace,
  setDiagnosticsCounterpart,
  type ProductUiTrace,
} from '@/state/productUiTrace';

const FEATURE_LABEL: Record<AIFeatureKey, string> = {
  scan: 'Face scan',
  productScan: 'Product image scan',
  barcode: 'Barcode',
  products: 'Products matching',
  routine: 'Routine recommendation',
  progress: 'Progress explanation',
  assistant: 'Assistant',
  search: 'Search suggestions',
};

const METHOD_LABEL: Record<AIMethodKey, string> = {
  validateScanPreflight: 'validateScanPreflight',
  analyzeFaceScan: 'analyzeFaceScan',
  identifyProductFromImage: 'identifyProductFromImage',
  normalizeBarcodeResolution: 'normalizeBarcodeResolution',
  matchProductsForUser: 'matchProductsForUser',
  generateRoutineRecommendation: 'generateRoutineRecommendation',
  explainSkinScore: 'explainSkinScore',
  explainProgress: 'explainProgress',
  buildSearchSuggestions: 'buildSearchSuggestions',
  answerAssistant: 'answerAssistant',
  analyzeScannedProductAgainstUser: 'analyzeScannedProductAgainstUser',
  buildFullScanToPlanBundle: 'buildFullScanToPlanBundle',
  buildProgressBundle: 'buildProgressBundle',
  lookupLiveProducts: 'lookupLiveProducts',
  rerankProducts: 'rerankProducts',
  recommendProductsForUser: 'recommendProductsForUser',
  selectProductForSlot: 'selectProductForSlot',
  planTypedSearch: 'planTypedSearch',
};

export function AIDiagnosticsScreen() {
  const nav = useNavigation();
  const transport = aiGateway.transport();
  const isAvailable = aiGateway.isAvailable();
  const features = useAITelemetry((s) => s.features);
  const methods = useAITelemetry((s) => s.methods);
  const logs = useAITelemetry((s) => s.logs);
  const healthz = useAITelemetry((s) => s.healthz);
  const setHealthz = useAITelemetry((s) => s.setHealthz);

  const [smokeRunning, setSmokeRunning] = useState(false);
  const [smokeReport, setSmokeReport] = useState<string | null>(null);
  // v19.12 — dedicated lookupLiveProducts test runner. Lives
  // separately from the smoke test because it's the most
  // cost/latency-sensitive endpoint and the one the user asks
  // about most often. Running it here guarantees the diagnostics
  // screen reports the SAME pipeline state as the result screen,
  // so the user can verify health without firing a full scan.
  const [liveTestRunning, setLiveTestRunning] = useState(false);
  const [liveTestReport, setLiveTestReport] = useState<string | null>(null);

  // v10.33 — auto-ping /healthz on mount so the user sees the
  // reachability state without having to tap PING. Fires-and-forgets
  // so a slow proxy never blocks the screen render.

  // ── Health-check ping. v10.36 — delegated to the shared multi-
  //    candidate probe (`rePingProxyHealthz`) so this screen and the
  //    boot probe surface identical results. The legacy local-only
  //    pingProxy hit only the FIRST candidate URL; if that one was
  //    dead (e.g. middleware route when Metro wasn't restarted) it
  //    showed "transport=unknown, uptime_s=?" even when the
  //    direct-port route was actually working.
  const pingProxy = useCallback(async () => {
    await rePingProxyHealthz();
  }, []);
  // Keep setHealthz reference imported above so a future revert is
  // a smaller diff. (rePingProxyHealthz writes telemetry directly.)
  void setHealthz;

  // v10.33 — auto-ping on mount so the reachability state appears
  // immediately. Without this the user has to tap PING to learn
  // anything; with the proxy URL now auto-derived, an automatic ping
  // is the cheapest way to surface "is it actually reachable from
  // this device?" — the question the screen exists to answer.
  useEffect(() => {
    void pingProxy();
  }, [pingProxy]);

  // ── Smoke test: hits two cheap text-only methods and reports.
  //    Avoids vision endpoints so the test is fast and cheap.
  const runSmokeTest = useCallback(async () => {
    if (smokeRunning) return;
    setSmokeRunning(true);
    setSmokeReport(null);
    const lines: string[] = [];
    lines.push('SMOKE TEST');
    if (!isAvailable) {
      lines.push('SKIPPED: no AI proxy configured');
      setSmokeReport(lines.join('\n'));
      setSmokeRunning(false);
      return;
    }
    // explainSkinScore — text-only, fastest endpoint we have.
    try {
      const t0 = Date.now();
      const score = await aiGateway.explainSkinScore({
        score: 73,
        deltaReference: 'previous_scan',
        deltaValue: 4,
        concernMovementsJson: JSON.stringify({
          breakouts: 'better',
          hydration: 'worse',
        }),
      });
      lines.push(
        `  explainSkinScore PASS in ${Date.now() - t0}ms — band=${score.band}, why="${score.why_line.slice(0, 40)}…"`
      );
    } catch (e) {
      lines.push(
        `  explainSkinScore FAIL — ${e instanceof Error ? e.message : String(e)}`
      );
    }
    // buildSearchSuggestions — also text-only.
    try {
      const t0 = Date.now();
      const sug = await aiGateway.buildSearchSuggestions({
        latestScanSummary: JSON.stringify({ primary_concern: 'breakouts' }),
        routineSummary: JSON.stringify({ morning: [], evening: [] }),
        pageContext: 'products',
      });
      lines.push(
        `  buildSearchSuggestions PASS in ${Date.now() - t0}ms — ${sug.suggestion_chips.length} chips`
      );
    } catch (e) {
      lines.push(
        `  buildSearchSuggestions FAIL — ${e instanceof Error ? e.message : String(e)}`
      );
    }
    setSmokeReport(lines.join('\n'));
    setSmokeRunning(false);
  }, [smokeRunning, isAvailable]);

  // v19.23 — diagnostics now exercises the LIVE-FIRST shared
  // engine. The engine attempts an Open Beauty Facts search
  // first (real public, no-AI source) and falls back to the
  // seed catalog only when OBF fails / returns empty. The
  // report shows which path won so the user can verify "real
  // live products" is working.
  const runLiveProductsTest = useCallback(async () => {
    if (liveTestRunning) return;
    setLiveTestRunning(true);
    setLiveTestReport(null);
    const lines: string[] = [];
    lines.push('PRODUCT ENGINE TEST (generalized personalized search)');
    lines.push('  AI proxy: ' + (isAvailable ? 'available' : 'unavailable'));
    lines.push('  Live source: backend /searchProducts (server-side OBF)');
    // v19.27 — verify multiple real-world queries, not one. Each
    // exercises a different branch of the search-intent
    // interpreter (concern_search, product_type_search,
    // best_for_my_skin, vague_query) so the user can see that
    // the same engine handles all of them.
    const testQueries: ReadonlyArray<{
      q: string;
      label: string;
    }> = [
      { q: 'smoothing serum', label: 'product_type_search (smoothing)' },
      { q: 'chemical exfoliant', label: 'product_type_search (exfoliant)' },
      { q: 'best for my skin', label: 'best_for_my_skin' },
      { q: 'gentle cleanser', label: 'product_type_search (gentle)' },
      { q: 'redness serum', label: 'concern_search + product_type' },
    ];
    try {
      const { getRecommendationContextFromQuery } = await import(
        '@/api/liveProducts'
      );
      // v19.34 — run ALL 5 user-named target queries end-to-end and
      // emit a compact one-line summary per query, then a deeper
      // report for the first. "moisturizer" was missing from the
      // pre-v19.34 list; without it the most embarrassing failure
      // case wasn't being verified at all.
      const realTargets: ReadonlyArray<string> = [
        'moisturizer',
        'smoothing serum',
        'chemical exfoliant',
        'best for my skin',
        'best for my pimple',
      ];
      lines.push('');
      lines.push('  5-query verification (v19.34 trust + image + probe-shape):');
      // v19.30 — pull verifyTrustPipeline so we can surface the
      // ACTUAL per-candidate trust scores + pool placement, not
      // only the post-AI-rerank hero. Proof beats summary.
      const { verifyTrustPipeline } = await import(
        '@/api/liveProducts'
      );
      for (const target of realTargets) {
        const tInner = Date.now();
        try {
          // 1. Run the full pipeline (with AI rerank if available).
          const r = await getRecommendationContextFromQuery(target, {
            intent: { kind: 'query', text: target },
            trigger: 'search',
          });
          // v19.32 — patch the matching ProductUiTrace with the
          // diagnostics-side counts so the trace's
          // `uiMatchesDiagnostics` flag becomes meaningful when
          // the user later runs the same query on the real
          // Products screen.
          // v19.34 — pass the iteration's query so the patch only
          // applies when the user has actually searched THIS
          // query on the real screen. Without the query gate, the
          // loop's later iterations would overwrite the user's
          // matched trace with a non-matching counterpart and the
          // equality flag would always read FALSE.
          setDiagnosticsCounterpart({
            scope: 'products',
            trigger: 'search',
            query: target,
            candidateCount: r.candidateProducts.length,
            heroId: r.heroProduct?.id ?? null,
          });
          const ms = Date.now() - tInner;
          const heroLabel = r.heroProduct
            ? `${r.heroProduct.brand} — ${r.heroProduct.name.slice(0, 28)}`
            : '(no hero)';
          const withImage = r.candidateProducts.filter(
            (c) => !!c.imageUrl
          ).length;
          const heroHasImg =
            r.heroProduct && !!r.heroProduct.imageUrl ? '✓img' : '✗img';
          lines.push(
            `    "${target}" → ${r.candidateProducts.length} cand ` +
              `(${withImage} w/img) · ${r.lastAttempt.source} · ${ms}ms · ` +
              `${heroHasImg} · ${heroLabel}`
          );
          // 2. Run the deterministic-only verification trace and
          // surface the top 3 candidates' trust breakdowns. This
          // is the "real verification" — every score component
          // is visible, the user can see why each survived.
          const trace = await verifyTrustPipeline(target);
          lines.push(
            `      intent: ${trace.intent.mode}` +
              (trace.intent.interpretedConcern
                ? ` · ${trace.intent.interpretedConcern}`
                : '') +
              (trace.intent.interpretedProductType
                ? ` · ${trace.intent.interpretedProductType}`
                : '') +
              (trace.intent.avoidanceConstraints.length > 0
                ? ` · avoid:[${trace.intent.avoidanceConstraints.join(',')}]`
                : '')
          );
          lines.push(
            `      pools: hero=${trace.heroPoolCount} ` +
              `alt=${trace.trustPoolCount} ` +
              `dropped=${trace.rawCandidateCount - trace.trustPoolCount} ` +
              `image-backed=${trace.imageBackedCount}`
          );
          for (const e of trace.topEntries.slice(0, 3)) {
            const tag =
              e.pool === 'hero' ? '[H]' : e.pool === 'alternative' ? '[A]' : '[X]';
            const img = e.hasImage ? `img:${e.imageSource}` : 'img:none';
            const briefName = `${e.brand}/${e.name}`.slice(0, 36);
            lines.push(
              `        ${tag} ${e.trust.total.toString().padStart(2, ' ')} ` +
                `pt=${e.trust.productTypeFit} ` +
                `cn=${e.trust.concernFit} ` +
                `sf=${e.trust.safetyFit} ` +
                `pr=${e.trust.probeSupport} ` +
                `mt=${e.trust.metadataCompleteness} ` +
                `im=${e.trust.imageCompleteness}` +
                (e.trust.noisePenalty > 0
                  ? ` -np=${e.trust.noisePenalty}`
                  : '') +
                ` · ${img} · ${briefName}`
            );
          }
        } catch (e) {
          lines.push(
            `    "${target}" → ERROR: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      lines.push('');
      // Deep report on the first target (smoothing serum).
      const tq = testQueries[0];
      lines.push(`  deep report: query="${tq.q}"   intent: ${tq.label}`);
      const t0 = Date.now();
      const result = await getRecommendationContextFromQuery(tq.q, {
        intent: { kind: 'query', text: tq.q },
        trigger: 'search',
      });
      const dur = Date.now() - t0;
      lines.push(
        `  pipeline ${result.availabilityState.toUpperCase()} in ${dur}ms — ` +
          `${result.candidateProducts.length} candidate(s), ` +
          `${result.alternatives.length} alternative(s)`
      );
      // v19.24 — read the HARD attempt contract. No 'unknown'
      // values, no fuzzy inference. The attempt is the truth.
      const att = result.lastAttempt;
      const sourceLabel: Record<typeof att.source, string> = {
        ai_proxy: '⚠ AI_PROXY (legacy — should never fire)',
        obf_live: '✓ OBF_LIVE (via backend /searchProducts)',
        seed_fallback: '↺ SEED_FALLBACK (backend unreachable; bundled seed)',
        empty: '✗ EMPTY: no candidates anywhere',
        error: '✗ ERROR: catastrophic failure',
      };
      lines.push(`  source = ${att.source}`);
      lines.push(`  ${sourceLabel[att.source]}`);
      lines.push(`  trigger = ${att.trigger}`);
      lines.push(`  success = ${att.success}`);
      if (att.failureReason) {
        lines.push(`  reason: ${att.failureReason.slice(0, 80)}`);
      }
      // v19.26 — AI rerank surface. If the rerank step ran, show
      // which hero the AI picked + the why-it-fits sentence so
      // the user can verify personalization is actually happening.
      if (result.source === 'ai-rerank') {
        lines.push('  ↪ AI rerank APPLIED');
        if (result.heroProduct) {
          lines.push(
            `    AI hero: ${result.heroProduct.brand} — ${result.heroProduct.name}`
          );
        }
        if (result.whyHeroFits) {
          lines.push(`    why: ${result.whyHeroFits.slice(0, 80)}`);
        }
      } else if (result.candidateProducts.length >= 2) {
        lines.push('  ↪ AI rerank skipped or timed out (deterministic order)');
      }
      // v19.27 — surface whatToAvoid from the AI rerank if present.
      if (result.whatToAvoid && result.whatToAvoid.length > 0) {
        lines.push('  what to avoid for this user:');
        for (const wa of result.whatToAvoid.slice(0, 3)) {
          lines.push(`    • ${wa}`);
        }
      }
      // v19.28 — the 4-query verification block at the top of
      // the report already proves the engine handles all the
      // target queries. No need for a separate "reference" list.
      // Attempt history — show the last 5 fetches across the WHOLE
      // app. This is the chain "initial_load → seed_fallback →
      // retry → obf_live" the user wants visible.
      if (result.attempts.length > 1) {
        lines.push('  recent attempts (newest first):');
        for (const a of result.attempts.slice(0, 5)) {
          const dur =
            a.completedAt && a.startedAt
              ? Date.parse(a.completedAt) - Date.parse(a.startedAt)
              : null;
          lines.push(
            `    ${a.trigger.padEnd(13)} ${a.source.padEnd(13)} ` +
              `${a.success ? 'ok ' : 'fail'} ${
                dur !== null ? `${dur}ms` : ''
              } ${a.query?.slice(0, 30) ?? ''}`
          );
        }
      }
      const hero = result.heroProduct;
      if (hero) {
        lines.push('  hero:');
        lines.push(`    brand        = ${hero.brand || '(missing)'}`);
        lines.push(`    name         = ${hero.name || '(missing)'}`);
        lines.push(
          `    merchantName = ${hero.merchantName || '(missing)'}`
        );
        lines.push(
          `    productUrl   = ${hero.productUrl || '(missing)'}`
        );
        lines.push(
          `    price        = ${hero.price ?? '(null)'}`
        );
        lines.push(
          `    imageUrl     = ${hero.imageUrl ? '(present)' : '(null)'}`
        );
        lines.push(
          `    whyHeroFits  = ${result.whyHeroFits ?? '(none)'}`
        );
      } else if (result.failureReason) {
        lines.push(
          `  hero: (none — ${result.failureReason.slice(0, 80)})`
        );
      } else {
        lines.push('  hero: (none — empty candidate set)');
      }
    } catch (e) {
      lines.push(
        `  pipeline FAIL — ${e instanceof Error ? e.message : String(e)}`
      );
    }
    setLiveTestReport(lines.join('\n'));
    setLiveTestRunning(false);
  }, [liveTestRunning]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            hapt.select();
            try {
              nav.goBack();
            } catch {
              /* swallow */
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Close diagnostics"
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={8}
        >
          <ArrowLeft size={18} color={palette.ink} weight="duotone" />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            DEV ONLY
          </Text>
          <Text style={styles.title} maxFontSizeMultiplier={1.15}>
            AI diagnostics.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Transport ─────────────────────────────────────────── */}
        <SectionHeader title="Transport" />
        <View style={styles.card}>
          <Row label="mode" value={transport} />
          {/* v10.33 — surface the auto-derived proxy URL + its source.
              When the badge shows FALLBACK and this row says
              `bundle-host: http://192.168.x.y:8787`, the user knows
              the URL was correct and the proxy itself isn't running
              (run `npm run dev`, not `npm start`). */}
          <Row
            label="active URL"
            value={
              aiGateway.proxyUrl().length > 0
                ? aiGateway.proxyUrl()
                : '(none)'
            }
          />
          <Row
            label="active source"
            value={
              isActiveProxyVerified()
                ? aiGateway.proxyUrlSource()
                : `${aiGateway.proxyUrlSource()} (UNVERIFIED)`
            }
            valueColor={
              isActiveProxyVerified()
                ? palette.mossDeep
                : palette.rust
            }
          />
          <Row
            label="proxy token set"
            value={
              (process.env.EXPO_PUBLIC_PURA_AI_PROXY_TOKEN ?? '').trim()
                .length > 0
                ? 'yes'
                : 'no'
            }
          />
        </View>

        {/* v10.38 — middleware-loaded state. Definitively answers
            "did metro.config.js load?" — if NOT LOADED, the user
            needs to fully restart Metro (Ctrl+C, then `npm run dev`). */}
        <SectionHeader title="Metro middleware" />
        <View style={styles.card}>
          <Row
            label="status"
            value={
              getMiddlewareLoadedState().state === 'loaded'
                ? 'LOADED'
                : getMiddlewareLoadedState().state === 'not-loaded'
                ? 'NOT LOADED — restart Metro'
                : 'unknown (probe pending)'
            }
            valueColor={
              getMiddlewareLoadedState().state === 'loaded'
                ? palette.mossDeep
                : getMiddlewareLoadedState().state === 'not-loaded'
                ? palette.rust
                : palette.inkTertiary
            }
          />
          {getMiddlewareLoadedState().detail ? (
            <Row label="detail" value={getMiddlewareLoadedState().detail} />
          ) : null}
          {getMiddlewareLoadedState().state === 'not-loaded' ? (
            <Row
              label="fix"
              value="Stop ALL terminals, run `npm run dev`. Or `npm run firewall:allow` (admin) to use direct-port."
            />
          ) : null}
        </View>

        {/* v10.36 — list every URL the probe tries so the dev sees
            WHICH candidate is winning vs failing. Tapping the panel
            re-runs the probe. */}
        <SectionHeader title="Probe candidates" />
        <View style={styles.card}>
          {getProxyCandidates().map((c, i) => {
            const active = c.url === aiGateway.proxyUrl();
            return (
              <Row
                key={`${c.source}-${i}`}
                label={`${i + 1}. ${c.source}`}
                value={c.url}
                valueColor={active ? palette.mossDeep : palette.inkSecondary}
              />
            );
          })}
        </View>

        {/* ── /healthz ──────────────────────────────────────────── */}
        <SectionHeader
          title="/healthz"
          right={
            <Pressable
              onPress={() => {
                hapt.select();
                void pingProxy();
              }}
              accessibilityRole="button"
              accessibilityLabel="Re-ping proxy"
              style={({ pressed }) => [
                styles.smallBtn,
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={6}
            >
              <ArrowsClockwise size={12} color={palette.ink} weight="bold" />
              <Text style={styles.smallBtnLabel}>PING</Text>
            </Pressable>
          }
        />
        <View style={styles.card}>
          <Row
            label="status"
            value={
              healthz.ok === null
                ? 'not pinged yet'
                : healthz.ok
                ? 'reachable'
                : 'unreachable'
            }
            valueColor={
              healthz.ok === null
                ? palette.inkTertiary
                : healthz.ok
                ? palette.mossDeep
                : palette.rust
            }
          />
          {healthz.latencyMs !== null ? (
            <Row label="latency" value={`${healthz.latencyMs} ms`} />
          ) : null}
          {healthz.detail ? <Row label="detail" value={healthz.detail} /> : null}
          {healthz.pingedAt ? (
            <Row
              label="last ping"
              value={new Date(healthz.pingedAt).toLocaleTimeString()}
            />
          ) : null}
        </View>

        {/* ── Per-feature ───────────────────────────────────────── */}
        <SectionHeader title="Feature surfaces" />
        <View style={styles.card}>
          {(Object.keys(features) as AIFeatureKey[]).map((k) => (
            <FeatureRow
              key={k}
              label={FEATURE_LABEL[k]}
              snapshot={features[k]}
            />
          ))}
        </View>

        {/* ── Per-method ────────────────────────────────────────── */}
        <SectionHeader title="Per-method last call" />
        <View style={styles.card}>
          {(Object.keys(methods) as AIMethodKey[]).map((k) => (
            <MethodRow key={k} label={METHOD_LABEL[k]} snapshot={methods[k]} />
          ))}
        </View>

        {/* ── Smoke test ────────────────────────────────────────── */}
        <SectionHeader
          title="Smoke test"
          right={
            <Pressable
              onPress={() => {
                hapt.tap();
                void runSmokeTest();
              }}
              accessibilityRole="button"
              accessibilityLabel="Run smoke test"
              disabled={smokeRunning}
              style={({ pressed }) => [
                styles.smallBtn,
                pressed && { opacity: 0.85 },
                smokeRunning && { opacity: 0.5 },
              ]}
              hitSlop={6}
            >
              <Lightning size={12} color={palette.ink} weight="bold" />
              <Text style={styles.smallBtnLabel}>
                {smokeRunning ? 'RUNNING…' : 'RUN'}
              </Text>
            </Pressable>
          }
        />
        <View style={styles.card}>
          <Text style={styles.codeBlock} maxFontSizeMultiplier={1}>
            {smokeReport ??
              'Tap RUN to fire two cheap text-only AI calls and confirm the proxy path is alive end-to-end.'}
          </Text>
        </View>

        {/* ── v19.17 — Recommendation pipeline test (deterministic-first) ── */}
        <SectionHeader
          title="Recommendation pipeline test"
          right={
            <Pressable
              onPress={() => {
                hapt.tap();
                void runLiveProductsTest();
              }}
              accessibilityRole="button"
              accessibilityLabel="Run recommendation pipeline test"
              disabled={liveTestRunning}
              style={({ pressed }) => [
                styles.smallBtn,
                pressed && { opacity: 0.85 },
                liveTestRunning && { opacity: 0.5 },
              ]}
              hitSlop={6}
            >
              <Lightning size={12} color={palette.ink} weight="bold" />
              <Text style={styles.smallBtnLabel}>
                {liveTestRunning ? 'RUNNING…' : 'RUN'}
              </Text>
            </Pressable>
          }
        />
        <View style={styles.card}>
          <Text style={styles.codeBlock} maxFontSizeMultiplier={1}>
            {liveTestReport ??
              'Runs the deterministic-first recommendation pipeline (seed catalog retrieval → normalize → filter → dedupe → local score → canonical RecommendationContext) for the mandatory acceptance query. Reports availability state, hero enrichment, and pipeline source. Diagnostics and live UI use the same code path.'}
          </Text>
        </View>

        {/* ── v19.37 — Last-tapped product trace ─────────────────── */}
        <SectionHeader title="Last tapped product (v19.37)" />
        <View style={styles.card}>
          <Text style={styles.codeBlock} maxFontSizeMultiplier={1}>
            {(() => {
              const t = getLastTappedTrace();
              if (!t.lastTappedProductId) {
                return (
                  'No card tapped yet.\n\n' +
                  'Tap any product card on the Products screen — the' +
                  ' tap is recorded here, the ProductDetail screen' +
                  " then writes how it resolved the id (navigation_payload" +
                  ' / store_lookup / fallback_lookup / not_found).' +
                  '\n\n' +
                  'PASS = detailScreenResolvedFrom is one of\n' +
                  '       navigation_payload | store_lookup | fallback_lookup\n' +
                  'FAIL = not_found  (the bug)'
                );
              }
              return [
                `lastTappedProductId   = ${t.lastTappedProductId}`,
                `lastTappedProductName = ${t.lastTappedProductName ?? '(none)'}`,
                `detailScreenReceivedId = ${
                  t.detailScreenReceivedId ?? '(detail not yet mounted)'
                }`,
                `detailScreenResolvedFrom = ${
                  t.detailScreenResolvedFrom ?? '(detail not yet mounted)'
                }`,
                `at                    = ${t.timestamp}`,
              ].join('\n');
            })()}
          </Text>
        </View>

        {/* ── v19.34 — Device verification kit ───────────────────── */}
        <SectionHeader title="Device verification kit (v19.34)" />
        <View style={styles.card}>
          <Text style={styles.codeBlock} maxFontSizeMultiplier={1}>
            {DEVICE_TEST_KIT_TEXT}
          </Text>
        </View>

        {/* ── v19.32 — Real UI trace ───────────────────────────── */}
        <SectionHeader title="Real Products screen UI trace" />
        <View style={styles.card}>
          <Text style={styles.codeBlock} maxFontSizeMultiplier={1}>
            {(() => {
              const traces = getAllTraces();
              if (traces.length === 0) {
                return (
                  'No UI trace captured yet. ' +
                  '\n\n' +
                  'To capture: open the Products tab, type a query, ' +
                  'tap Retry, and tap a Suggested-for-you chip. Each ' +
                  'action writes a trace here. Then return to this ' +
                  'screen — the trace shows what the REAL UI rendered.'
                );
              }
              const lines: string[] = [];
              lines.push(
                `Captured ${traces.length} real-UI trace(s) from the Products screen:`
              );
              lines.push('');
              for (const t of traces) {
                lines.push(`────  ${t.trigger.toUpperCase()}: "${t.query}"  ────`);
                lines.push(`  visibleState  = ${t.visibleState}`);
                // v19.36 — show the resolved query family + skin
                // axis the engine anchored personalization to.
                lines.push(
                  `  queryFamily   = ${t.queryFamily ?? '(generic)'}`
                );
                lines.push(
                  `  skinFitReason = ${t.skinFitReason ?? '(unknown)'}`
                );
                if (t.heroSkinFitScore !== null) {
                  lines.push(
                    `  heroSkinFit   = ${t.heroSkinFitScore}/100`
                  );
                }
                if (t.excludedFromHero.length > 0) {
                  lines.push(
                    `  excludedFromHero (${t.excludedFromHero.length}):`
                  );
                  for (const x of t.excludedFromHero.slice(0, 4)) {
                    lines.push(`    × ${x.name} — ${x.reason}`);
                  }
                }
                // v19.33 — show the structured intent label + probe
                // queries the engine actually fired. Lets the user
                // verify on-device that "moisturizer" expanded to
                // 5 product-type variants, etc.
                lines.push(
                  `  intent        = ${t.interpretedIntentLabel ?? '(none)'}`
                );
                if (t.probeQueries.length > 0) {
                  lines.push(`  probes (${t.probeQueries.length}):`);
                  for (const p of t.probeQueries) {
                    lines.push(`    • ${p}`);
                  }
                } else {
                  lines.push('  probes        = (none recorded)');
                }
                lines.push(
                  `  candidates    = raw:${t.rawCandidateCount} · ` +
                    `filtered:${t.filteredCandidateCount} · ` +
                    `trust:${t.trustPoolCount}`
                );
                if (t.heroId) {
                  lines.push(`  hero          = ${t.heroName}`);
                  lines.push(`  hero id       = ${t.heroId}`);
                  lines.push(
                    `  hero image    = payload:${
                      t.heroImageInPayload ? 'YES' : 'NO'
                    } · rendered:${t.heroImageRendered ? 'YES' : 'NO'}`
                  );
                } else {
                  lines.push('  hero          = (none)');
                }
                lines.push(
                  `  alternatives  = ${t.alternativeCount} ` +
                    `(payload imgs: ${t.alternativesWithImagesInPayload}, ` +
                    `rendered: ${t.alternativesWithImagesRendered})`
                );
                if (t.uiMatchesDiagnostics !== null) {
                  lines.push(
                    `  diagnostics   = candidates:${t.diagnosticsCandidateCount} ` +
                      `hero:${t.diagnosticsHeroId ?? '(none)'} ` +
                      `→ match:${t.uiMatchesDiagnostics ? '✓' : '✗'}`
                  );
                }
                lines.push(`  at            = ${t.timestamp}`);
                lines.push('');
              }
              return lines.join('\n').trim();
            })()}
          </Text>
        </View>

        {/* ── Recent logs ───────────────────────────────────────── */}
        <SectionHeader title={`Recent logs (${logs.length})`} />
        <View style={styles.card}>
          {logs.length === 0 ? (
            <Text style={styles.muted}>no logs yet</Text>
          ) : (
            logs.slice(0, 25).map((r, i) => (
              <View key={i} style={styles.logRow}>
                <Text
                  style={[
                    styles.logLevel,
                    {
                      color:
                        r.level === 'error'
                          ? palette.rust
                          : r.level === 'warn'
                          ? palette.amber
                          : palette.mossDeep,
                    },
                  ]}
                >
                  {r.level.toUpperCase()}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logScope} maxFontSizeMultiplier={1}>
                    {r.scope}
                  </Text>
                  <Text style={styles.logMessage} maxFontSizeMultiplier={1}>
                    {r.message}
                  </Text>
                </View>
                <Text style={styles.logTime} maxFontSizeMultiplier={1}>
                  {new Date(r.at).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// v19.34 — device verification kit. The content below is the canonical
// step-by-step the user runs ON DEVICE to prove the Products screen
// works. Mechanical, unambiguous, and self-contained: every test
// names what to type, what visible UI to expect, and what to read out
// of the "Real Products screen UI trace" section above.
//
// PASS / FAIL criteria are stated explicitly for each test; the
// strongest allowed conclusion in this environment is "code +
// instrumentation ready for device verification" — only the user
// running these tests can produce a true PASS.
// ---------------------------------------------------------------------------

const DEVICE_TEST_KIT_TEXT = [
  'DEVICE VERIFICATION KIT — v22.1',
  '',
  'TEST 0 — confirm v22.1 is actually running (do this FIRST)',
  '──────────────────────────────────────────────────',
  '  1. Open the Products tab.',
  '  2. Type ANY query (e.g. "moisturizer").',
  '  3. Wait for the result grid to appear.',
  '  PASS:',
  '    • A yellow "REAL PATH v22.1" pill is visible directly',
  '      ABOVE the result grid, with these lines:',
  '        rerankPromptVersion = v19.41-exact-hard-filter',
  '        queryFamily, skinFitReason, heroSkinFitScore,',
  '        resultCount = N visible / M total,',
  '        imageQuality (hero), imageQualityReason,',
  '        resultSource, lastUpdatedAt',
  '  FAIL:',
  '    • No "REAL PATH v22.1" pill visible',
  '    • OR rerankPromptVersion shows anything other than',
  '      "v19.41-exact-hard-filter"',
  '    • If FAIL, the v22.1 bundle is NOT running on your device.',
  '      Reload Metro (rr in the dev terminal, or shake device →',
  '      Reload) and restart Expo Go. Re-run TEST 0.',
  '    • Until TEST 0 passes, every other test is meaningless.',
  '',
  '──────────────────────────────────────────────────',
  'TEST 14 — exactly 6 first, +6 on scroll (v19.41)',
  '──────────────────────────────────────────────────',
  '  1. Search "moisturizer" with results loaded.',
  '  2. Count the visible product cards before any scroll.',
  '  3. Scroll to the bottom OR tap "Show 6 more".',
  '  PASS:',
  '    • Initial visible count is exactly 6 (or all results',
  '      when fewer than 6 exist)',
  '    • REAL PATH badge says "resultCount = 6 visible / N total"',
  '    • Scrolling near the end (or tapping "Show 6 more")',
  '      reveals 6 additional products',
  '    • visible count goes 6 → 12 → 18 → … up to total',
  '  FAIL:',
  '    • All results visible at once on initial load',
  '    • OR only 1-2 visible when total > 6',
  '    • OR scroll/tap does not reveal more',
  '',
  '──────────────────────────────────────────────────',
  'TEST 15 — image quality tier (v19.41)',
  '──────────────────────────────────────────────────',
  '  1. Search any query with results.',
  '  2. Read "imageQuality (hero)" on the REAL PATH badge.',
  '  3. Read "imageQualityReason".',
  '  PASS:',
  '    • imageQuality is "high" / "medium" / "low" (not unknown)',
  '    • imageQualityReason is human-readable',
  '      (e.g. "image_url (clean packshot)")',
  '    • The hero card shows a packshot-style product image',
  '      (NOT a marketplace collage / cluttered thumb)',
  '  FAIL:',
  '    • imageQuality is "(unknown)"',
  '    • Hero card image looks like a marketplace listing',
  '      / collage / seller-shot',
  '',
  '──────────────────────────────────────────────────',
  'TEST 16 — picks feel personal, not random (v19.41)',
  '──────────────────────────────────────────────────',
  '  1. Set your skin profile (oily/dry/sensitive/combo) in',
  '     onboarding.',
  '  2. Search "moisturizer".',
  '  3. Read REAL PATH badge:',
  '       skinFitReason should match your profile',
  '       heroSkinFitScore should be ≥ 50',
  '  4. Read whyHeroFits in the product card.',
  '  PASS:',
  '    • whyHeroFits names your axis explicitly',
  '      ("Picked because your skin reads oily and breakout-prone',
  '       so this favors lightweight non-comedogenic hydration")',
  '    • The hero is visibly skin-fit-aligned',
  '      (gel/lightweight for oily; ceramide/barrier for dry)',
  '  FAIL:',
  '    • whyHeroFits is generic ("This is a great product")',
  '    • Hero conflicts with your skin profile',
  '',
  'Run each test on the actual app. After each step, scroll down to',
  '"Real Products screen UI trace" in THIS screen and read the trace',
  'whose `trigger` matches the action you took. Compare to PASS/FAIL.',
  '',
  '──────────────────────────────────────────────────',
  'TEST 1 — query: moisturizer',
  '──────────────────────────────────────────────────',
  '  1. Products tab → tap search bar → type "moisturizer".',
  '  2. Wait for results.',
  '  PASS:',
  '    • visibleState = live_results OR fallback_results',
  '    • intent label contains "moisturizer"',
  '    • probes contains ≥3 entries that end in "moisturizer"',
  '      or "cream" (NOT all serums)',
  '    • candidates ≥ 2',
  '  FAIL:',
  '    • probes is all serums (every entry ends in "serum")',
  '    • visibleState = empty AND probes ≥ 1',
  '',
  '──────────────────────────────────────────────────',
  'TEST 2 — query: smoothing serum',
  '──────────────────────────────────────────────────',
  '  1. Clear search → type "smoothing serum".',
  '  PASS:',
  '    • intent label contains "texture" or "smoothing"',
  '    • probes are texture-shaped serums',
  '      (texture serum, resurfacing serum, peptide serum, …)',
  '    • candidates ≥ 2',
  '',
  '──────────────────────────────────────────────────',
  'TEST 3 — query: chemical exfoliant',
  '──────────────────────────────────────────────────',
  '  1. Clear search → type "chemical exfoliant".',
  '  PASS:',
  '    • intent label contains "exfoliant"',
  '    • probes contains "exfoliant", "gentle exfoliant",',
  '      and acid-shaped variants',
  '    • candidates ≥ 2',
  '',
  '──────────────────────────────────────────────────',
  'TEST 4 — query: best for my skin',
  '──────────────────────────────────────────────────',
  '  1. Clear search → type "best for my skin".',
  '  PASS:',
  '    • intent label = "Best for your skin"',
  '    • probes derive from your scan or skin type baseline',
  '    • candidates ≥ 1',
  '',
  '──────────────────────────────────────────────────',
  'TEST 5 — query: best for my pimple',
  '──────────────────────────────────────────────────',
  '  1. Clear search → type "best for my pimple".',
  '  PASS:',
  '    • intent label contains "breakouts"',
  '    • probes contain "acne serum", "spot treatment",',
  '      "salicylic acid serum" or similar',
  '    • candidates ≥ 1',
  '',
  '──────────────────────────────────────────────────',
  'TEST 6 — retry visibly changes the result',
  '──────────────────────────────────────────────────',
  '  1. After any test above, tap the Retry button on the',
  '     unavailable / empty card (or re-run the search).',
  '  PASS:',
  '    • A new trace appears with trigger=RETRY',
  '    • The retry trace exists alongside (not replacing) the',
  '      original SEARCH trace',
  '  FAIL:',
  '    • No RETRY trace appears',
  '',
  '──────────────────────────────────────────────────',
  'TEST 7 — Suggested-for-you chip visibly changes the result',
  '──────────────────────────────────────────────────',
  '  1. With the search bar EMPTY, tap any "Suggested for you"',
  '     chip beneath the search bar.',
  '  PASS:',
  '    • A trace appears with trigger=CHIP_PRESS',
  '    • Its query matches the chip text',
  '  FAIL:',
  '    • No CHIP_PRESS trace appears',
  '',
  '──────────────────────────────────────────────────',
  'TEST 8 — product photos actually render',
  '──────────────────────────────────────────────────',
  '  1. Run TEST 1 (moisturizer). Wait 2-3 seconds for images.',
  '  PASS:',
  '    • If "hero image" line shows payload:YES then',
  '      it must also show rendered:YES',
  '    • If "alternatives" line shows payload imgs > 0',
  '      then rendered > 0',
  '  FAIL:',
  '    • payload:YES but rendered:NO  (the URL was sent but',
  '      expo-image could not decode the bitmap)',
  '',
  '──────────────────────────────────────────────────',
  'TEST 9 — diagnostics-vs-UI equality',
  '──────────────────────────────────────────────────',
  '  1. After running TEST 1 above, tap "Run product engine test"',
  '     here in Diagnostics.',
  '  PASS:',
  '    • The moisturizer trace shows uiMatchesDiagnostics = ✓',
  '    • Diagnostics candidates count == UI filtered candidates',
  '    • Diagnostics hero id == UI hero id',
  '  FAIL:',
  '    • uiMatchesDiagnostics = ✗ (mismatch indicates UI and',
  '      engine diverged — the engine ran differently for the',
  '      same query)',
  '',
  '──────────────────────────────────────────────────',
  'TEST 10 — moisturizer hero matches user skin (v19.36)',
  '──────────────────────────────────────────────────',
  '  1. Set your profile skin type to oily OR mark acne-prone',
  '     in onboarding.',
  '  2. Products tab → search "moisturizer".',
  '  3. Open the trace.',
  '  PASS:',
  '    • queryFamily = "family:moisturizer"',
  '    • skinFitReason = "oily" or "acne-prone"',
  '    • The hero card visibly is gel / lightweight / oil-free /',
  '      non-comedogenic (NOT a heavy/rich balm/ointment cream).',
  '    • heroSkinFit ≥ 50/100',
  '    • If excludedFromHero is non-empty, every excluded entry',
  '      reads "excluded: heavy/occlusive cream conflicts with',
  '      oily/acne-prone" (or similar) — the random heavy creams',
  '      are visibly being kept OUT of the hero pool.',
  '  FAIL:',
  '    • Hero is a rich/heavy/balm cream',
  '    • skinFitReason is "(unknown)"',
  '    • queryFamily is "(generic)" — engine missed the family',
  '',
  '──────────────────────────────────────────────────',
  'TEST 11 — best for my skin uses scan + profile (v19.36)',
  '──────────────────────────────────────────────────',
  '  1. After a scan, search "best for my skin".',
  '  PASS:',
  '    • queryFamily = "family:best_for_my_skin"',
  '    • skinFitReason matches what your scan + profile suggest',
  '    • whyHeroFits explains the pick in terms of YOUR skin',
  '      (concern + skin type), not generic',
  '  FAIL:',
  '    • Hero unrelated to your top concern + skin type',
  '    • whyHeroFits is generic marketing fluff',
  '',
  '──────────────────────────────────────────────────',
  'TEST 12 — best for my pimple, sensitive user (v19.36)',
  '──────────────────────────────────────────────────',
  '  1. Set sensitivities to include "sensitive" or "rosacea".',
  '  2. Search "best for my pimple".',
  '  PASS:',
  '    • queryFamily = "family:best_for_my_pimple"',
  '    • skinFitReason = "sensitive"',
  '    • Hero is gentle / niacinamide / soothing — NOT benzoyl',
  '      peroxide / harsh acid',
  '    • whyHeroFits names sensitivity/redness reasoning',
  '  FAIL:',
  '    • Hero is benzoyl peroxide or aggressive salicylic',
  '    • whyHeroFits ignores sensitivity',
  '',
  '──────────────────────────────────────────────────',
  'TEST 13 — product card tap opens detail (v19.38)',
  '──────────────────────────────────────────────────',
  '  1. Run TEST 1 (search "moisturizer").',
  '  2. Tap any product card.',
  '  PASS:',
  '    • The detail screen opens (NOT "Product not found")',
  '    • A yellow "DETAIL PAYLOAD OK v19.38" pill is visible',
  '      directly under the header, with the lines:',
  '        detailResolvedFrom, detailPayloadId,',
  '        detailLookupFallbackUsed',
  '    • detailResolvedFrom is one of:',
  '         navigation_payload (preferred)',
  '         store_lookup',
  '         fallback_lookup',
  '  FAIL:',
  '    • Screen shows "Product not found"',
  '    • OR no "DETAIL PAYLOAD OK v19.38" pill visible',
  '    • OR detailResolvedFrom = "not_found"',
  '',
  '──────────────────────────────────────────────────',
  'TEST 17 — AI rerank actually runs (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Run any search (e.g. "moisturizer").',
  '  2. Read the REAL PATH badge:',
  '       rerankSource',
  '       rerankAttempted',
  '       rerankApplied',
  '       skipReason / returnReason / appliedReason',
  '       heroBeforeRerank vs heroAfterRerank',
  '  PASS:',
  '    • rerankSource = "ai_rerank"',
  '    • rerankAttempted = YES',
  '    • rerankApplied = YES',
  '    • appliedReason explains "AI returned valid heroId; applying"',
  '    • heroAfterRerank may equal heroBeforeRerank (AI agreed',
  '      with the deterministic skin-fit hero) OR may differ',
  '      (AI personalized further) — both are valid PASS states',
  '  ACCEPTABLE FALLBACK:',
  '    • rerankSource = "ai_failed_fallback" with a concrete',
  '      returnReason ("AI gateway threw: …" / "race timeout" /',
  '      "AI returned null or empty heroId"). This means AI ran',
  '      but failed; deterministic skin-fit hero is showing as',
  '      the fallback. The dev panel ALWAYS knows why.',
  '    • rerankSource = "deterministic_fallback" with skipReason',
  '      ("AI gateway unavailable" / "trustedFree.length < 2" /',
  '      "trigger=background"). AI was deliberately not attempted',
  '      for an explicit reason.',
  '  FAIL:',
  '    • rerankSource is "(unknown)" or blank (the dev panel is',
  '      gray — v22.1 was supposed to make this impossible)',
  '    • rerankAttempted = NO with no skipReason',
  '    • rerankSource = "deterministic_fallback" for a normal user',
  '      search with no proxy issue (AI is silently disabled)',
  '',
  '──────────────────────────────────────────────────',
  'TEST 18 — different users get different heroes (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. On account A (oily/acne-prone profile), search',
  '     "moisturizer". Note the hero.',
  '  2. On account B (dry/barrier-compromised profile), search',
  '     "moisturizer". Note the hero.',
  '  PASS:',
  '    • Heroes differ across the two accounts',
  '    • OR heroes match BUT both badges show',
  '         rerankSource = ai_rerank',
  '         rerankApplied = YES',
  '         appliedReason is non-empty',
  '      (i.e. AI ran for both and chose the same product for a',
  '      reason — the badge proves the path was active)',
  '  FAIL:',
  '    • Heroes match AND both show rerankApplied = NO',
  '    • OR both show skipReason = "AI gateway unavailable"',
  '      (AI is silently off on this device — reload Metro or',
  '      check proxy)',
  '',
  '──────────────────────────────────────────────────',
  'TEST 19 — AI-first product planner is the recommendation engine (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Search "moisturizer" on the Products tab.',
  '  2. Read the REAL PATH badge:',
  '       productSourceMode',
  '       recommendationMode',
  '       aiRecommendationAttempted',
  '       aiRecommendationReturned',
  '       aiRecommendationApplied',
  '       aiRecommendationReason',
  '       userNeedSummary',
  '       aiSlots',
  '  PASS:',
  '    • productSourceMode = "ai_first"',
  '    • aiRecommendationAttempted = YES',
  '    • aiRecommendationReturned = YES',
  '    • aiRecommendationApplied = YES',
  '    • userNeedSummary is specific to your skin profile',
  '      (e.g. "Lightweight hydration for oily acne-prone skin")',
  '    • aiSlots lists 2-4 distinct product types',
  '      (e.g. "Gel moisturizer / Niacinamide blemish serum / ...")',
  '    • Product cards still have real images + brand + name',
  '  ACCEPTABLE FALLBACK:',
  '    • productSourceMode = "ai_failed_fallback" with a concrete',
  '      aiRecommendationReason ("AI planner threw …" /',
  '      "AI gateway unavailable" / "race timeout"). The cards',
  '      still appear via the legacy retrieval+rerank path.',
  '    • productSourceMode = "deterministic_only" with',
  '      aiRecommendationReason explicitly explaining',
  '      ("trigger=background" / "AI gateway unavailable").',
  '  FAIL:',
  '    • productSourceMode is "(unknown)" or blank',
  '    • aiRecommendationAttempted = NO with no reason',
  '    • userNeedSummary is null when productSourceMode = "ai_first"',
  '',
  '──────────────────────────────────────────────────',
  'TEST 20 — best-for-you is genuinely user-specific (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. On account A (oily/acne profile), open Products tab and',
  '     tap the "Best for you" chip. Note the hero + alts +',
  '     userNeedSummary on the badge.',
  '  2. On account B (dry/sensitive profile), do the same.',
  '  PASS:',
  '    • Both badges show productSourceMode = "ai_first"',
  '    • userNeedSummary clearly differs across the two accounts',
  '    • aiSlots differ across the two accounts',
  '    • Hero products differ',
  '    • Product cards still have real images + metadata',
  '  FAIL:',
  '    • Both accounts get the same hero AND',
  '      both badges show productSourceMode = "ai_first"',
  '    • (Indicates AI returned the same plan for materially',
  '      different users — a planner regression)',
  '    • productSourceMode = "deterministic_only" on both',
  '      → AI is silently off; check proxy / reload Metro',
  '',
  '──────────────────────────────────────────────────',
  'TEST 21 — two-stage AI: planner + slot selector (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Search "moisturizer". Read REAL PATH badge:',
  '       plannerVersion = v22.1-planner',
  '       selectorVersion = v22.1-selector (or null if AI fallback)',
  '       aiPlanAttempted, aiPlanReturned, aiPlanApplied',
  '       aiSelectAttempted, aiSelectReturned, aiSelectApplied',
  '       aiPlanReason, aiSelectReason',
  '       dominantConcern',
  '  PASS:',
  '    • plannerVersion = "v22.1-planner"',
  '    • aiPlanApplied = YES',
  '    • selectorVersion = "v22.1-selector"',
  '    • aiSelectApplied = YES',
  '    • productSourceMode = "ai_first"',
  '    • dominantConcern is specific to your profile',
  '  ACCEPTABLE FALLBACK:',
  '    • aiPlanApplied = YES + aiSelectApplied = NO with an',
  '      explicit aiSelectReason ("AI selector threw" / "race',
  '      timeout" / "AI gateway unavailable" / "no shortlist").',
  '      Hero falls back to deterministic slot-top per slot.',
  '    • aiPlanApplied = NO with explicit aiPlanReason. Fallback',
  '      to legacy retrieve+rerank path.',
  '  FAIL:',
  '    • plannerVersion is "(none)" when productSourceMode = ai_first',
  '    • aiPlanReason / aiSelectReason are blank when applied = NO',
  '    • Any "(unknown)" status field',
  '',
  '──────────────────────────────────────────────────',
  'TEST 22 — different users get different best-for-you (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. On account A (oily/acne profile, scan reflects breakouts),',
  '     tap "Best for you" chip. Note hero + userNeedSummary +',
  '     dominantConcern + aiSlots on the badge.',
  '  2. On account B (dry/sensitive profile, scan reflects',
  '     barrier), do the same.',
  '  PASS:',
  '    • Both accounts show productSourceMode = "ai_first"',
  '    • userNeedSummary differs across the accounts',
  '    • dominantConcern differs across the accounts',
  '    • aiSlots differ across the accounts',
  '    • Hero products differ',
  '    • Product cards still have real images + brand + name +',
  '      merchant + price',
  '  FAIL:',
  '    • Heroes match AND productSourceMode = ai_first for both',
  '      (planner regression — same plan for materially different',
  '      users)',
  '    • productSourceMode = "deterministic_only" on both → AI is',
  '      silently off; check proxy / reload Metro',
  '',
  '──────────────────────────────────────────────────',
  '──────────────────────────────────────────────────',
  'TEST 23 — typed search returns a flat same-intent list (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Products tab → type "moisture".',
  '  2. Wait for results.',
  '  3. Read REAL PATH badge: resultMode + dominantSearchFamily +',
  '     resultCountTotal.',
  '  PASS:',
  '    • resultMode = "typed_search_list"',
  '    • dominantSearchFamily = "moisturizer"',
  '    • resultCountTotal >= 6 (when enough candidates exist)',
  '    • The 6 visible cards all read as moisturizers, not a',
  '      moisturizer + blemish + serum mix',
  '  FAIL:',
  '    • resultMode = "best_for_you_slots" for a typed query',
  '    • resultCountTotal = 3 with mixed categories',
  '    • dominantSearchFamily = "(none)"',
  '',
  '──────────────────────────────────────────────────',
  'TEST 24 — top-right badge tells the truth (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Open Products tab. Search any query.',
  '  PASS:',
  '    • Top-right pill says "AI" (green) when AI-first applied',
  '    • Top-right pill says "FALLBACK" when AI failed but engine',
  '      ran legacy path',
  '    • Top-right pill says "IDLE" only when nothing ran yet',
  '  FAIL:',
  '    • Pill says "IDLE" while badgeMode = ai_on on REAL PATH badge',
  '    • Pill says "AI" when productSourceMode is fallback',
  '',
  '──────────────────────────────────────────────────',
  'TEST 25 — image quality stops over-grading (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Search any query. Tap a card whose image looks marketplace-y.',
  '  2. Back to Products tab. Read REAL PATH badge: imageQuality',
  '     (hero) + imageQualityReason.',
  '  PASS:',
  '    • Clean OBF packshot URLs read "high"',
  '    • Marketplace/Amazon/etc URLs read "medium" or "low"',
  '    • imageQualityReason names the source field + downgrade reason',
  '      when applicable',
  '  FAIL:',
  '    • Clearly noisy/cluttered images still read "high"',
  '',
  '──────────────────────────────────────────────────',
  '──────────────────────────────────────────────────',
  'TEST 26 — typed search uses the dedicated single-family planner (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Search "moisture" on the Products tab.',
  '  2. Read REAL PATH badge:',
  '       resultMode',
  '       plannerVersion',
  '       dominantSearchFamily',
  '       resultCountTotal',
  '  PASS:',
  '    • plannerVersion = "v22.1-search-only"   (NOT v21.0-planner)',
  '    • resultMode = "typed_search_flat"        (NOT typed_search_list or',
  '                                              best_for_you_slots)',
  '    • dominantSearchFamily = "moisturizer"',
  '    • resultCountTotal >= 6 (assuming OBF returns enough cosmetic',
  '      candidates)',
  '    • Every visible card reads as a moisturizer (no exfoliant, no',
  '      blemish treatment, no serum unless serum_texture was the',
  '      genuinely-relevant family)',
  '  FAIL:',
  '    • plannerVersion = "v21.0-planner" or shows slot fields',
  '    • resultMode = "best_for_you_slots" for a typed query',
  '    • aiSelectAttempted = YES (typed search never uses the slot',
  '      selector)',
  '',
  '──────────────────────────────────────────────────',
  'TEST 27 — typed-search families for the other 4 target queries (v22.1)',
  '──────────────────────────────────────────────────',
  '  Repeat with each query and confirm the badge:',
  '    "chemical exfoliant"  -> dominantSearchFamily = chemical_exfoliant',
  '    "best for my pimple"  -> dominantSearchFamily = blemish_support',
  '    "smoothing serum"     -> dominantSearchFamily = serum_texture',
  '    "best for my skin"    -> dominantSearchFamily resolved from scan/',
  '                              profile context, not majority-vote across',
  '                              slots',
  '  PASS:',
  '    • Each query has resultMode = "typed_search_flat" and a coherent',
  '      dominantSearchFamily, and the visible cards stay in that family.',
  '',
  '──────────────────────────────────────────────────',
  'TEST 28 — best-for-you still uses the SLOT planner (v22.1)',
  '──────────────────────────────────────────────────',
  '  1. Open Products tab. With a scan completed, tap the',
  '     "Best for you" chip (or any concern chip that triggers',
  '     getRecommendationContextForScan).',
  '  2. Read REAL PATH badge.',
  '  PASS:',
  '    • resultMode = "best_for_you_slots"',
  '    • plannerVersion = "v21.0-planner"',
  '    • selectorVersion = "v21.0-selector"  (when slot selector applied)',
  '    • aiSlots lists 2-4 distinct slot labels (routine-style mix is OK',
  '      here)',
  '  FAIL:',
  '    • resultMode = "typed_search_flat" on the best-for-you surface',
  '      (typed-search planner leaked into the slot path)',
  '',
  '──────────────────────────────────────────────────',
  'OVERALL PASS:  TEST 0 passes AND every TEST 1-28 passes.',
  'OVERALL FAIL:  TEST 0 fails (v22.1 not active),',
  '               OR any other test fails.',
  '──────────────────────────────────────────────────',
].join('\n');

// ---------------------------------------------------------------------------
// Sub-components.
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.1}>
        {title}
      </Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.1}
      >
        {value}
      </Text>
    </View>
  );
}

function FeatureRow({
  label,
  snapshot,
}: {
  label: string;
  snapshot: AIFeatureSnapshot;
}) {
  const tint =
    snapshot.source === 'ai'
      ? palette.mossDeep
      : snapshot.source === 'fallback'
      ? palette.rust
      : snapshot.source === 'pending'
      ? palette.clay
      : palette.inkTertiary;
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureRowHead}>
        <Text style={styles.featureLabel} maxFontSizeMultiplier={1.1}>
          {label}
        </Text>
        <View style={[styles.featureChip, { backgroundColor: tint }]}>
          <Text style={styles.featureChipText} maxFontSizeMultiplier={1}>
            {snapshot.source.toUpperCase()}
          </Text>
        </View>
      </View>
      {snapshot.detail ? (
        <Text
          style={styles.featureDetail}
          numberOfLines={2}
          maxFontSizeMultiplier={1.1}
        >
          {snapshot.detail}
        </Text>
      ) : null}
    </View>
  );
}

function MethodRow({
  label,
  snapshot,
}: {
  label: string;
  snapshot: AIMethodSnapshot;
}) {
  const tint =
    snapshot.status === 'ok'
      ? palette.mossDeep
      : snapshot.status === 'pending'
      ? palette.clay
      : snapshot.status === 'fail'
      ? palette.rust
      : palette.inkTertiary;
  return (
    <View style={styles.methodRow}>
      <View style={styles.methodRowHead}>
        <Text style={styles.methodLabel} numberOfLines={1} maxFontSizeMultiplier={1}>
          {label}
        </Text>
        <Text style={[styles.methodStatus, { color: tint }]} maxFontSizeMultiplier={1}>
          {snapshot.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.methodDetail} maxFontSizeMultiplier={1}>
        {`ok=${snapshot.counts.ok} · fail=${snapshot.counts.fail} · fallback=${snapshot.counts.fallback}` +
          (snapshot.durationMs !== null ? ` · ${snapshot.durationMs}ms` : '') +
          (snapshot.requestId ? ` · ${snapshot.requestId.slice(0, 24)}` : '')}
      </Text>
      {snapshot.error ? (
        <Text
          style={[styles.methodDetail, { color: palette.rust }]}
          numberOfLines={2}
          maxFontSizeMultiplier={1}
        >
          {snapshot.error}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles.
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: palette.ink,
  },
  scroll: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 4,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: palette.bgDeep,
  },
  smallBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: palette.ink,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: palette.bgDeep,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    minWidth: 92,
  },
  rowValue: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.ink,
  },
  muted: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
  },
  featureRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    gap: 4,
  },
  featureRowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureLabel: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  featureChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featureChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1,
    color: palette.bg,
  },
  featureDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 15,
    color: palette.inkSecondary,
  },
  methodRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    gap: 2,
  },
  methodRowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodLabel: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.ink,
  },
  methodStatus: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  methodDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 14,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  logLevel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.8,
    width: 38,
    paddingTop: 2,
  },
  logScope: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: palette.ink,
  },
  logMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 14,
    color: palette.inkSecondary,
  },
  logTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
    paddingTop: 3,
  },
  codeBlock: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: palette.ink,
  },
});
