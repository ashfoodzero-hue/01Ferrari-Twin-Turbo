# HANDOFF: Ferrari Twin Turbo build-06 (written 2026-11-01, end of build-05)

**Resume phrase: "Ferrari Twin Turbo build-06".** It runs skill `twin-turbo-continuity` §A:
1. Read THIS file first.
2. Then MASTER §7 (fk) … (fp), `docs/research/README.md`, `docs/DATA_CONTRACT.md`.
3. Load `gold-measured-study`, plus `geopolitics-macro-analysis` (NEW skill, made this build).
4. Check reality read-only.

## 1. Live state (checked 2026-11-01, Sunday)

- **The app is running:**
  - run_twin, stream, chart, settings;
  - restarted by the watchdog on wake 11-01 05:56 UTC;
  - **nothing live was changed in build-05.**
- **Health: WARN `AUDIT_OLD`.** The daily recording audit misses when the PC sleeps over 21:30 UTC (§7 (fj)). The fix ("catch up on wake when > 24 h old") still awaits Ashraf's OK + a restart.
- **Rules carried over:**
  - 92 % rule;
  - E0 swing BUY Telegram ON;
  - chart shows only the current SWING_E0 trade;
  - all other books record silently.

## 2. Done in build-05 (MASTER §7 letters; all research, nothing live)

| § | what | key result |
|---|---|---|
| (fk) | T1 step 2 blind-nowcast sub-spec, plus addendum A (103e8ed) | `docs/research/macro_nowcast/2026-11-01_T1_step2_blind_nowcast_SPEC.md` |
| (fl) | T1 extractor built + run, then paused | `t1_extract.mjs`, 4,605 schedule rows, 33 row files, Treasury DTS 155/155. Predictor + audits 2/3 NOT built. |
| (fl) | **SOURCE MAP v1** (Ashraf: "a plan first, an approved map") | `docs/research/macro_nowcast/2026-11-01_SOURCE_MAP_v1.md`, see below |
| (fm) | **EXTREME SWING study spec** | `docs/research/extreme_swing/2026-11-01_EXTREME_SWING_SPEC.md`, see below |
| (fn) | **Friday 10-30 drop autopsy** | see below |
| (fo) | **No-wall continuation SELL: REFUTED 0/4** | see below |
| (fp) | **EARLY DOWN-DAY DETECTOR spec**, pre-registered, NOT run | `docs/DOWN_DAY_DETECTOR_SPEC.md` (e5dfa19) |

**Source Map v1:**
- Trees for CPI, NFP, Advance GDP and Core PCE, plus a world layer (oil, Europe, China, uncertainty, supply chains, dollar).
- §5b geopolitics: a daily event ledger per country, WORDS vs ACTIONS; competing hypotheses; the market as the baseline (prediction markets, oil volatility OVX, gold volatility GVZ, the GPR index); no "%" shown until calibrated.
- §5c big money: 13F (45-day lag), GLD holdings, COT, central-bank gold. The BlackRock / Rothschild premise was corrected.
- Every leaf is status-coded, with proof in `inputs/2026-11-01_source_map_fred_check.json` (76 FRED series) and `2026-11-01_source_map_sites_check.txt`.

**Extreme Swing study spec:**
- Three trade types named: SCALP / SWING (1-2 days) / EXTREME SWING (weekly ZigZag k = 3 legs).
- Tests: leg ends vs magnets (CME volume nodes, prior pivots, $100 levels, retracements), checked against the leg's own path; COT / ETF / yields / DXY / VIX / GPR at leg ends; exhaustion signs; pullback depths.
- Holm K = 18; n < 30 = described only. **Not run.** Step 1 = verify COT and GLD-holdings dated history.

**Friday 10-30 autopsy:**
- Gold 4,021 → 3,875 (−$146), a steady slide.
- Matrix SELL: all three conditions held on 35 bars (34 unique), the first at 23:06 UTC @ 4,014, **blocked ONLY by the ceiling-wall rule**.
- IMPULSE_CONT recorded 3 SELLs (2 TARGET) and ML SELL 7, all silent under the 92 % rule.
- The 4H macro magnet said SHORT all day.
- V1H vetoed 35 floor BUYs correctly.

**No-wall continuation SELL test** (`docs/MATRIX_NOWALL_SELL_SPEC.md`, `scripts/study_matrix_nowall_sell.mjs`, `data/master/matrix_nowall_sell_study.json`):

| cell | period | trades | WR | $/trade | per day |
|---|---|---|---|---|---|
| NW | 2 y | 2,046 | 27 % | −$0.26 | 3.8 |
| NW-1H | 2 y | 613 | 31 % | +$0.82 (TRAIN −$0.33, LB < 0) | 1.1 |
| NW13 | 13 y | — | — | −$0.57 | — |
| NW13-1H | 13 y | — | — | −$0.24 | — |

- **Big DOWN days +$7.75/t vs big UP days −$5.95/t** (13 y: +$3.35 vs −$3.41).
- Friday: 5 trades, +$84.
- Audits clean: parity 34/34, 0 look-ahead, deterministic.

## 3. Answers / refuted (never re-quote without context)

- **The plain no-wall SELL is REFUTED 0/4.**
  - It is a low-WR (27-31 %) high-R rule: judge it by money, never by the 92 % rule.
  - Its value depends entirely on the DAY regime → the detector.
- Everything from build-04 still holds (T0: news times a turn but never its direction; SELL E0 refuted 0/3; etc.).

## 4. Ashraf's binding decisions (this build)

1. **"An approved map first":** no T1 / T2 math until he approves Source Map v1. The T1 step-2 predictor is paused.
2. **Extreme Swing is a separate module** (May rule); three trade types named.
3. **PROACTIVE PARTNER (memory `feedback_proactive_partner_full_mind.md`):**
   - bring my own full analysis + ranked recommendations unasked;
   - say what he is missing;
   - push back with measurements;
   - watch DXY + bond demand (auctions, TIC, custody, term premium, gold vs real yields).
4. **Standing:** nothing live without his OK; ask before restarts; no paid data; no buy levels or personal advice; the 92 % rule for alerts.

## 5. NEXT (my ranked recommendation)

1. **Build + run `scripts/study_down_day_detector.mjs`** exactly per `docs/DOWN_DAY_DETECTOR_SPEC.md`.
   - Reuse `nwSignals` / `matrixTrades` from `scripts/study_matrix_nowall_sell.mjs` (parity audit 4 requires identical ungated trades).
   - Use `makeAligned` stateAt for 1H / 4H, and `findChochs` on 1D.
   - FRED DFII10 vintages via ALFRED (the `t1_extract.mjs` helpers show the as-of pattern).
2. **Ashraf's open answers:**
   - Source Map format OK?
   - free keys (EIA, BEA, Census, ACLED; BLS optional);
   - daily-collector OK;
   - keep the T1 thin model as the baseline or drop it;
   - the audit-on-wake fix + restart.
3. **Extreme Swing step 1:** verify COT / GLD dated history, then the study.
4. **Add a dollar / bond-demand layer to the Source Map** (Treasury auctions via the fiscaldata API, TIC, custody holdings, term premium).
5. **Source Map trees for the other 81 releases + the Fed** (after approval).

## 6. Open items (carried)

- Audit-on-wake fix (needs OK + restart).
- BEA confirmation of the 10-29 actuals.
- N2 spike-BUY paper test (awaiting OK).
- V1H review.
- Re-measure matrix_trades studies from before 10-26.
- TradingView recheck of the swing tables for 10-15 / 16.
- Untracked, not this build's, left as is: `scripts/diag_scalp_sell_ml_weekday.mjs`, `docs/research/charts/`.

## 7. Where everything is

| what | where |
|---|---|
| Source Map | `docs/research/macro_nowcast/2026-11-01_SOURCE_MAP_v1.md` (+ verify / probe scripts in `scripts/research/macro_nowcast/`) |
| T1 step 2 | spec `docs/research/macro_nowcast/2026-11-01_T1_step2_blind_nowcast_SPEC.md`; inputs `data/research/macro_nowcast/inputs/` (rows + raw gitignored; MANIFEST committed) |
| Extreme Swing | `docs/research/extreme_swing/` |
| No-wall SELL | `docs/MATRIX_NOWALL_SELL_SPEC.md`, `scripts/study_matrix_nowall_sell.mjs`, `data/master/matrix_nowall_sell_study.json` |
| Down-day detector | `docs/DOWN_DAY_DETECTOR_SPEC.md` |
| New skill | `C:\Users\Ashraf\.claude\skills\geopolitics-macro-analysis\SKILL.md` |

## 8. Working rules (unchanged)

- Spec before numbers; an audit failure voids the run.
- Measure, never infer.
- Explicit-path commits as Ashraf; never `git add -A`.
- Edit tool for code; heavy runs in the background.
- One fresh chat per step.

## 9. UPDATE 2026-11-01 07:48 UTC: Ashraf's answers + live changes (MASTER §7 (fq))

**APP RESTARTED 07:48:29 UTC (Ashraf OK).** Two live changes in `scripts/run_twin.mjs`:
1. **Audit catch-up:** once after every start / wake, the recording audit runs at once if its last run is > 24 h old. Verified: it ran 07:48:46, ok, 0 misses.
2. **Daily collector:** `scripts/research/macro_nowcast/collect_daily.mjs` runs daily ≥ 23:00 UTC, plus a catch-up after start / wake when its last run is > 24 h old.
   - 24 sources → `data/research/macro_nowcast/daily/`.
   - Research only; failures go to its folder log, no Telegram.
   - **Check the first automatic 23:00 UTC run**, in child_runs and `daily/last_run.json`.

**Keys (tested with real calls):**
- EIA / BEA / Census: OK.
- BLS: "invalid" → Ashraf must activate it from the BLS email.
- ACLED: ~~needs ACLED_EMAIL + ACLED_PASSWORD~~ → **DROPPED 2026-11-01 (§11)**: Ashraf's Gmail account logs in but the API answers 403 "Access denied" (Open level has no API). Never handle his password in chat.

**Source Map:** §5d gap check added (dollar / Treasury demand, Fed liquidity, rates, credit, flows, Fed words, prediction markets, social). Open TO VERIFY items: GLD holdings address, WGC (KEY), fed-funds futures (none free found), copper / BTC on Polygon, calendar effects.

**Decision:** the T1 thin model is KEPT as the baseline until the full trees are compared (Ashraf).

**Down-day detector DONE 11-01 (§7 (fr)): money REFUTED 0/4, classifier VOID. Extreme Swing step 1 DONE (§7 (fs)): COT + GLD histories verified.** NEXT: check the first automatic collector run (23:00 UTC), then Extreme Swing steps 2-3 (`scripts/research/extreme_swing/study_extreme_swing.mjs`), then the bond-demand layer.

## 10. UPDATE 2026-11-01 (late): Extreme Swing steps 2-3 + silver + warning aftermath (MASTER §7 (ft) (fu) (fv) (fw)); all research, nothing live

| letter | what | result |
|---|---|---|
| (ft) | `scripts/research/extreme_swing/study_extreme_swing.mjs` (spec addendum B before numbers): 34 gold weekly legs since 2013 | **VOID** by the pre-registered audit. Measured cause = audit design (the B2 shuffle put 48.5 % of ends on the donor leg's own pivot; the B3 placebo hit 6.1 % vs a 5 % knife-edge). Descriptive: NO magnets (volume nodes / prior pivots / retracements sit FARTHER from ends than random: 0.71 / 0.70 / 0.84); no positioning / flow lift (COT best p 0.086); pullbacks median 47 % of the leg; the current down leg from 4,696.56 is 3.35 ATR / 9 weeks |
| (fu) | Silver replication (addendum C) of D1 RSI divergence + D2 range ≥ 2 ATR; shared `extreme_lib.mjs` (gold re-run byte-identical) | **both PASS** on silver vs fair new-extreme controls (×3.2 / ×3.3) |
| (fv) | `docs/research/extreme_swing/2026-11-01_WARNING_AFTERMATH_SPEC.md` (+ addendum A) | pre-registered |
| (fw) | `study_warning_aftermath.mjs` (`causalWarnings` in `extreme_lib.mjs`) | **Part 1 CAUSAL:** D1 PASS on gold (34.8 % vs 12.9 %) and silver (41.7 % vs 16.9 %); ANY PASS; D2 FAIL. **Part 2 (exit / tighten at a warning vs the same action at any new extreme): FAIL 0/6.** Warnings are early (gold median 4 weeks to the end); a false warning still runs a median 2 ATR. Counter-trade WR 31-44 %, ≈ 0 ATR. Audits clean |

**Binding:**
- D1 = a CONTEXT flag only ("the end is more likely near"): no exit rule, no trade, no alert (92 % rule).
- Never call a level a "magnet" or a "whale level": measured, none.

**Current (data to 2026-10-30):**
- Gold: down leg from 4,696.56; the weeks of 10-18 and 10-25 were new lows with NO warning.
- Silver: down leg from 121.618, no warning.

**NEXT (ranked):**
1. Check the first automatic daily-collector run (≥ 23:00 UTC 11-01) in `data/master/child_runs.jsonl` + `data/research/macro_nowcast/daily/last_run.json`.
2. T1 step 2 blind nowcast: predictor + audits 2/3 (the extractor is done; T1 math was paused for the Source Map).
3. The dollar / Treasury-demand layer (auctions, custody, term premium) in the Source Map + collector.
4. Optional, needs Ashraf's OK (live change): a record-only weekly D1 context logger.
5. Source Map trees for the other 81 releases + the Fed (after map approval).

**Ashraf actions pending:**
- activate the BLS key (email link);
- ~~add ACLED_EMAIL / ACLED_PASSWORD to `.env`~~ (done by Ashraf; ACLED then refused API data → dropped, §11).

## 11. UPDATE 2026-11-01 (afternoon): GPR + GDELT replace ACLED (MASTER §7 (fx)); research collector only

- **ACLED measured:** login OK, `/api/acled/read` → 403 `{"message":"Access denied"}`; myACLED FAQ: a gmail.com address = Open level, API from Research (organisation e-mail) up. Ashraf: "Use GPR + GDELT".
- **NEW `scripts/research/geo/gdelt_events.mjs`:** GDELT 1.0 daily event files (static, no budget) → `data/research/geo/gdelt_events_daily.jsonl` (gitignored, rebuildable): per day, per watch-list country (28, ISO 3) and conflict country pair, WORDS (QuadClass 3) vs ACTIONS (QuadClass 4), root codes 13-20 (15 = troop / ship moves), Goldstein, tone, articles; fresh events only (event date ≥ day − 7). known_t = day + 1 08:00 UTC. Smoke `smoke_gdelt_events.mjs` 5/5 (in smoke:all); 2026-10-31 equals an independent awk count (Iran actions 166, stale 562).
- **Collector (`collect_daily.mjs`, runs inside the live app at 23:00 UTC as a fresh process → no restart needed):** ACLED removed; `gdelt_events` catch-up added; GPR now the `.dta` file; the 4 GDELT doc-API headline queries are OPTIONAL (their 429s go to `failed_optional`, the run no longer exits 1 for them).
- **Measured:** Turbo 2's live app still runs its GDELT doc-API news backfill (child_runs 12:05 UTC, 63/365 days) on the same address → it shares the doc-API budget. Not touched (Turbo 2 = separate app).
- **Backfill:** 2013-07-14 → 2026-10-24 started 12:22 UTC (~2 s/day, ~3 h). Check: `wc -l data/research/geo/gdelt_events_daily.jsonl` ≈ 4,860 rows, and no `error` rows.
- **NEXT:** a pre-registered study "do GDELT words / actions (or GPR acts / threats) lead oil or gold?" — spec FIRST, controls vs the market's own pricing (Source Map §5b L3/L4).
