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
      // v19.28 — run all 4 target queries end-to-end and emit a
      // compact one-line summary per query, then a deeper report
      // for the first. Proves the engine handles them ALL, not
      // just one example.
      const realTargets: ReadonlyArray<string> = [
        'smoothing serum',
        'chemical exfoliant',
        'best for my skin',
        'best for my pimple',
      ];
      lines.push('');
      lines.push('  4-query verification (v19.29 trust + image):');
      for (const target of realTargets) {
        const tInner = Date.now();
        try {
          const r = await getRecommendationContextFromQuery(target, {
            intent: { kind: 'query', text: target },
            trigger: 'search',
          });
          const ms = Date.now() - tInner;
          const heroLabel = r.heroProduct
            ? `${r.heroProduct.brand} — ${r.heroProduct.name.slice(0, 28)}`
            : '(no hero)';
          // v19.29 — count image-backed candidates so the user can
          // verify image completeness across the result set.
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
