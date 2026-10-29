# RESEARCH CATALOG — the self-learning system's map (start here)

Created 2026-10-29. Ashraf: "make sure everything in our system folder built organized, so if you want to check history for more analysis in future
easily you can study it, for all news / macros and everything else we are monitoring for self learning … : method of data gathered to predict the news,
actual news + XAU reaction, … S/R level, order flow, volumes, smart money, liquidity, imbalances".

**Rules for every track** (gold-measured-study skill + feedback_deep_research_standard):
1. Raw data is NEVER moved or rewritten — the app reads it live. Its meaning, coverage and traps are in `docs/DATA_CONTRACT.md` (read it first).
2. Each study: a SPEC first (`docs/research/<track>/<date>_<name>_SPEC.md`), a script (`scripts/research/` or `scripts/study_*.mjs`), its output under
   `data/research/<track>/`, a lettered entry in `docs/MASTER_DOCUMENT.md` §7.
3. Every recorded value carries the time it became KNOWN (no look-ahead); every forward record carries the wall-clock time it was written.
4. File names: `YYYY-MM-DD_<what>.json|jsonl|md`, UTC dates.

## Where the RAW data lives (read-only; coverage per DATA_CONTRACT.md)

| data | path | coverage | notes |
|---|---|---|---|
| Spot gold / silver 1m | `data/history/XAUUSD/1m.jsonl`, `XAGUSD/` | continuous 2013-07-14 → now | spot `v` is NOT volume; holes 2019-09/10, 2020-10/11 |
| DXY (rebuilt from 6 pairs) | `data/history/<EURUSD…USDCHF>/1m.jsonl` via `loadDxyBars` | 2015 → now | no intra-minute wicks |
| CME gold / silver futures, WTI 1m (REAL volume) | `data/history/GOLD_FUT/`, `SILVER_FUT/`, `WTI/` | 2024-10 → now | contract in `tk` |
| GLD ETF 1m | `data/history/GLD/` | → now | |
| Order flow (CME GC footprints, Databento tbbo) | `data/orderflow/gc_1m_footprints.jsonl`, `gc_5m_footprints.jsonl`, raw `gc_tbbo/` | 2024-10-01 → 2026-10-08 | buyer / seller per price cell; futures ≠ spot price — align by TIME |
| Gamma / options (GLD) | `data/options/` | forward from 2026-10 | no historical OI |
| Economic calendar (forecast / previous / actual) | `data/calendar/ff_history.jsonl`, `history.json`, `upcoming.json`, `bls_releases.json` | 2013-07 → now | each value counted from its publication time (`src/master/marketContext.js`) |
| Release tick windows (CPI / NFP / FOMC) | `data/calendar/release_ticks/` | 157 CPI · 158 NFP · 105 FOMC, 2013 → | per-release minute/tick windows |
| Macro series (Polygon /fed) | `data/macro/` (treasury-yields, inflation, inflation-expectations, labor-market) | 1947-1982 → now | monthly / daily |
| News headlines (Polygon) | `data/news/polygon_news.jsonl` | 2020-03 → now | GDELT backfill incomplete (rate-limited) |
| Live app records | `data/paper/` (trades, decisions, vetoes, parity misses), `data/inv90/forward*/ledger.jsonl` (swing tests) | 2026-10 → now | append-only |
| Data health / runs | `data/master/data_health_history.jsonl`, `child_runs.jsonl`, `stream_events.jsonl`, `reconcile_1m.json` | → now | |

## The TRACKS (derived research data → `data/research/<track>/`)

| track | question | folder | existing measured work (data/master unless noted) | status 2026-10-29 |
|---|---|---|---|---|
| **macro_nowcast** | can we build each release (CPI, PCE, GDP, deflator, NFP, claims, Fed) from its components BEFORE it is published, better than the consensus? | `macro_nowcast/inputs` (each component as known, dated) · `predictions` (our estimate, written before release) · `actuals` (first print) · `scores` (error vs consensus, component errors) | — | first check 2026-10-29 (`docs/research/macro_nowcast/2026-10-29_GDP_PCE_check.md`): GDP nowcast closer; deflator −0.9 missed (no model). Deep study + SPEC: next week |
| **news_reactions** | how does XAU (and DXY) react to each release type and surprise size — range vs normal hour, first move, reversal, timing (1/5/15/30/60/240 min)? | `news_reactions/` | `event_reaction_study.json` (size ×5.3 FOMC etc.), `news_magnitude_gate.json`, `news_prearm_*.json`, `release_bracket*_study.json`, `dxy_xau_coupling.json` | magnitude MEASURED, direction REFUTED so far; per-release reaction ledger: next week |
| **levels** (S/R, walls, day / 4H levels, trendlines) | at each level: break or bounce within 15 / 30 min, and WHY (approach speed, candle size, volume, wall strength, time) | `levels/` | `sr_levels_*.json`, `sr_audit_*`, `strong_levels_study.json`, `c4h_level_study.json`, `swing_walls_study.json`, `day_levels_study.json`, `trendlines_audit_*`, `level_radar_*` (⚠ look-ahead, superseded) | levels mostly break ≈ 50-57 %; approach-speed study: next week |
| **imbalances** (FVG) | does a fair value gap hold / fill; retest behaviour | `imbalances/` | `fvg_study.json`, `fvg_strong_study.json` | 13 y: DOES NOT HOLD |
| **orderflow_volume** | does real CME volume / delta at a level or swing explain the outcome? | `orderflow_volume/` | `orderflow_footprint_study*.json`, `orderflow_combined_study.json`, `swing_footprint_atlas.json`, `events_5m_*.json` (data/orderflow) | no pass on 5 TFs; combined 45.8 % (no lift) |
| **smart_money** (positioning, gamma, whales) | does dealer gamma / whale-size flow / positioning lead price? | `smart_money/` | `gamma_levels_study.json`, `gold_whale_study.json`, `macro_magnet_*`, `bias_model_study.json` | gamma = forward test only; whales no direction edge |
| **liquidity** (sweeps, stop runs, sudden liquidations) | what precedes a sudden large move / a sweep that reverses | `liquidity/` | `magnet_liquidity_*`, `sell_smt_sweep_*`, `fast_move_bounce*.json`, `bigmove_catalog.json`, `swing_start_study.json` | sweep = swing start-marker (descriptive); grab-then-reverse refuted; cause study: next week |
| **coaching_audit** | is each coaching call (pull-back level, target, timing) right more often than chance, scored live-stamped? | `coaching_audit/` | (old Ferrari) causal ≈ 48 %, negative every TF | audit: next week |
| **loss_autopsy** | why did each losing trade trigger, and what differed from winners? | `loss_autopsy/` | `data/paper/matrix_trades.jsonl`, `matrix_decisions.jsonl`, `matrix_missed.jsonl` | design: next week |
| **turbo2_monitor** | side-by-side record of Ferrari Turbo 2's outputs scored on Twin Turbo's data | `turbo2_monitor/` | Turbo 2 `docs/SIGNAL_MAP.md`, `docs/DESK_REPORT.md` (read-only) | next week; Turbo 2 never modified |
| **self_learning** | the weekly loop: re-test every track on new data → proposals with evidence (never auto-enabled) | `self_learning/` | — | design: next week |

## Today's index (append one line per research item)
- 2026-10-29 · loss_autopsy / opportunities · swing opportunity log `data/inv90/<arm>/decisions.jsonl` (every ≥ threshold bar: SIGNAL or BLOCKED + reason); SCALP: `data/master/matrix_parity.json` + `data/paper/matrix_missed.jsonl` + `matrix_decisions.jsonl`; MASTER §7 (ew).
- 2026-10-29 · macro_nowcast · GDP / PCE / deflator / claims check — spec+result `docs/research/macro_nowcast/2026-10-29_GDP_PCE_check.md`, scorer `scripts/research/score_nowcast_2026-10-29.mjs`, score `data/research/macro_nowcast/scores/2026-10-29_GDP_PCE_check.json`, MASTER §7 (eu).
