// ════════════════════════════════════════════════════════════════════════════════
// paths.js — Ferrari Twin Turbo: single source of truth for filesystem locations.
// ────────────────────────────────────────────────────────────────────────────────
// Carried from Turbo2's src/core/paths.js (same export surface: ROOT, TURBO, REF, refHistoryFile) so every verified
// module copied from Turbo2 runs unchanged. Two differences, both deliberate:
//
//   1. TURBO.* = THIS app's own folder (C:\01Ferrari Twin Turbo). The twin writes ONLY here.
//   2. REF.turbo2* = Ashraf Ferrari Turbo 2 (C:\Ashraf-Ferrari-Turbo2) as a READ-ONLY reference, exactly as Turbo2
//      treats world-market-dashboard. The price stores Turbo2 maintains live (data/history/XAUUSD/*.jsonl, refreshed
//      by its own historyCycle every 10 min) and its 94 MB candidate cache are READ from there and never duplicated,
//      never written. NOTHING in the twin may write, move or modify a file under REF.*.
//
// 2026-10-08 (rev e/f): the twin is a SEPARATE FULL APP. History = its OWN Polygon 1m store only (refHistoryFile below);
// REF.* remains only for the inherited paper-trial evidence and the twin↔Turbo2 parity smoke, never for price data.
// ════════════════════════════════════════════════════════════════════════════════

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Twin app root (…/01Ferrari Twin Turbo). */
export const ROOT = path.resolve(__dirname, '..', '..')

/** The twin's own writable locations (the ONLY places this app writes). */
export const TURBO = Object.freeze({
  root: ROOT,
  data: path.join(ROOT, 'data'),
  agents: path.join(ROOT, 'data', 'agents'),
  decisions: path.join(ROOT, 'data', 'decisions'),
  worldModel: path.join(ROOT, 'data', 'world_model'),
  audit: path.join(ROOT, 'data', 'audit'),
  master: path.join(ROOT, 'data', 'master'),     // artifacts, signal_tiers.json, heartbeat, child runs
  paper: path.join(ROOT, 'data', 'paper'),       // the paper journal (trades.jsonl)
  cot: path.join(ROOT, 'data', 'cot'),
  history: path.join(ROOT, 'data', 'history'),   // own organized price history (EMPTY by design — see REF.turbo2History)
  historyAsset: (symbol) => path.join(ROOT, 'data', 'history', symbol),
  narrativeCache: path.join(ROOT, 'data', 'narrative_cache'),
  sentimentCache: path.join(ROOT, 'data', 'sentiment_cache'),
  etfFlows: path.join(ROOT, 'data', 'etf_flows'),
  fred: path.join(ROOT, 'data', 'fred'),
  crossAsset: path.join(ROOT, 'data', 'cross_asset'),
  futures: path.join(ROOT, 'data', 'futures'),
  options: path.join(ROOT, 'data', 'options'),
  quotes: path.join(ROOT, 'data', 'quotes'),
  forecast: path.join(ROOT, 'data', 'forecast'),
  scripts: path.join(ROOT, 'scripts'),
})

// ── READ-ONLY references ─────────────────────────────────────────────────────────
const TURBO2 = 'C:\\Ashraf-Ferrari-Turbo2'
const WMD = 'C:\\Users\\Ashraf\\world-market-dashboard'
const BACKFILL = path.join(WMD, 'ferrari-signal', 'data', 'wal', '_backfill')

/** READ-ONLY references — never written by the twin. */
export const REF = Object.freeze({
  // ── Ashraf Ferrari Turbo 2 (the parent app) — live-maintained stores + validated artifacts ──
  turbo2Root: TURBO2,
  turbo2Data: path.join(TURBO2, 'data'),
  turbo2Master: path.join(TURBO2, 'data', 'master'),          // candidates_15m_full.jsonl, frozen gates, parity artifacts
  turbo2Paper: path.join(TURBO2, 'data', 'paper'),            // Turbo2's own paper journal (parity smoke reads it)
  turbo2History: (symbol) => path.join(TURBO2, 'data', 'history', symbol),
  turbo2Calendar: path.join(TURBO2, 'data', 'calendar'),
  // ── world-market-dashboard (the grandparent) — the 23y validated backfill ──
  wmdRoot: WMD,
  backfill: BACKFILL,
  backfillAsset: (symbol) => path.join(BACKFILL, symbol),
  cotGoldClean: path.join(WMD, 'Research', 'Phase1_InstitutionCOT', 'COT_Gold', 'GOLD_COT_CLEAN.csv'),
  cotGoldFull: path.join(WMD, 'Research', 'Phase1_InstitutionCOT', 'COT_Gold', 'GOLD_COT_FULL_2006_2024.csv'),
  fredDir: path.join(WMD, 'ferrari_winning_trades_history', '01_smart_money_research', 'predictor', '_data', 'fred'),
  fredSeries: (id) => path.join(WMD, 'ferrari_winning_trades_history', '01_smart_money_research', 'predictor', '_data', 'fred', `${id}.csv`),
  crossAssetDir: path.join(WMD, 'ferrari-signal', '_r14_validation', '_6y_data'),
  crossAssetSeries: (id) => path.join(WMD, 'ferrari-signal', '_r14_validation', '_6y_data', `${id}_1d.jsonl`),
})

/**
 * 🟥 1m ONLY (Ashraf 2026-10-08: "history is built on 1m only"). The ONE stored price file per symbol is the twin's own
 * Polygon 1m store, data/history/<SYM>/1m.jsonl: imported by scripts/import_history_1m.mjs, appended by the tick
 * streamer. Every other timeframe is RESAMPLED from it (backfillReader.loadBars). There is no fallback to Turbo2's store
 * or the Dukascopy body: a separate full app reads only its own data (R0 + R1). `tf` is accepted for call-site
 * compatibility and must resolve to the same 1m file.
 */
export function refHistoryFile(symbol, tf) {
  return [path.join(TURBO.historyAsset(symbol), '1m.jsonl')]
}

/** Per-minute ask/spread side store written by the tick streamer (bars themselves are BID — measured 35/35). */
export const quotesFile = (symbol) => path.join(TURBO.historyAsset(symbol), 'quotes_1m.jsonl')

/**
 * Append-only CORRECTIONS to the 1m store (2026-10-08): a minute Polygon re-issued after it was written (late quotes folded in — measured
 * USDSEK 16:10 45 → 173 ticks; the 2026-07-01→10-05 re-issue). The store itself is never rewritten; backfillReader applies the latest
 * correction per minute at read time. Writers: the streamer's late-tick re-check and scripts/reconcile_1m.mjs.
 */
export const correctionsFile = (symbol) => path.join(TURBO.historyAsset(symbol), '1m_corrections.jsonl')

/**
 * Start of CONTINUOUS gold 1m history on Polygon (measured 2026-10-08, docs/POLYGON_DATA_REACH.md): before 2013-07-14
 * there are only islands (2009-10→2010-07, 2011-07/08) and 2012 is empty. Every validation window starts here.
 */
export const HISTORY_CONTINUOUS_FROM = Date.UTC(2013, 6, 14, 22, 0, 0)
