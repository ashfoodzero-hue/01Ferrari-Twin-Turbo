# SPEC: the self-learning system (all tracks). Pre-registered 2026-10-30, BEFORE any number

Status: **v1.1. Agreed by Ashraf 2026-10-30 with ADDENDUM A (bottom of file), which adds track T0 and the full news / macro universe.** No study in this file has been run. No result exists yet.
Changes made after any result is seen are dated ADDENDA, written before their numbers. A model change is a new version. Old versions and their results are kept.

## 0. The request, in Ashraf's words

- "keep recording everything and monitor it … lose nothing" (10-29).
- "if we trigger a trade and it failed we need to check all behind the reason … why we triggered … then we can improve it" (10-29).
- "get the prediction first and compare it with the history, so we make sure our method is correct" (10-29). This is the blind history check.
- "I do not want any simple test … every single step or even sub step must be very professionally done … proving that it comes from a reality not a forecast" (10-29).
- Targets stated by Ashraf:
  - at least 3 trades a day, scalp and swing;
  - a small SL;
  - entry at the exhausted tip or the liquidity grab at strong walls;
  - no alert or box below 92 % measured WR (the 92 % rule, `src/master/wrGate.js`).

## 1. What the system is, and what it is NOT

**It IS:** a set of pre-registered research tracks.
- Each track records its inputs with the time they became KNOWN.
- Each track scores the outcomes, re-runs its frozen tests every week on the new data, and writes PROPOSALS with evidence.

**It is NOT:**
- **an auto-trader:** no proposal ever switches a signal, alert, box, filter or bracket on by itself;
- **a model that silently re-fits itself:** a re-fit is a new version, run blind, and kept next to the old one.

**The path from proposal to live has 4 gates, all required, in order:**
1. **Proposal:** it passes this SPEC's bar on TRAIN and on OOS.
2. **Forward paper test:** at least the forward n in §2.6, recorded live and never back-filled.
3. **92 % rule:** measured WR ≥ 92 % AND money > 0 after the measured spread.
4. **Ashraf says yes in chat.** The yes is per item, and he is asked before any app restart.

**Honest frame, stated before any result.**
- No measured study in this project has reached ≥ 92 % WR together with money > 0 and ≥ 1 trade a day. Every 96-98 % claim so far was look-ahead or fill contamination.
- The measured trade-off is that WR is a price. A higher WR is paid for in R:R or in frequency.
- So every result is reported as the triple: **WR, $/trade, trades/day**. A track may honestly end as "no pass".

## 2. Rules common to every track

### 2.1 Data and provenance

- **Source of truth:** raw data only through `docs/DATA_CONTRACT.md` modules.
- **Polygon is THE price source** (RED RULE). Only the following come from elsewhere, each named with its URL and fetch time:
  - FRED/ALFRED (`FRED_API_KEY` present);
  - BLS, BEA, Atlanta Fed GDPNow, Cleveland Fed nowcast, ADP;
  - Databento (already-owned GC tbbo only).
- **Every input row carries:**
  - `value`;
  - `known_t`, the UTC time the value was first published;
  - `source`;
  - `fetched_t`;
  - `vintage`, where revisions exist.

  A study may use a value only at times ≥ `known_t`. Revised data is never used where a first print existed (ALFRED `realtime_start`).
- **Spot `v` is not volume.** Real volume is CME 2024-10 → only. No study uses volume before 2024-10-09.
- Holes 2019-09-04 → 10-04 and 2020-10-14 → 11-13: no event, window or candle may span a hole (`dataHoles`).
- **No paid data.** If a track needs it (e.g. CME depth / MBO), the cost is written in the result and the track stops at that link.

### 2.2 The blind rule (history checks)

1. This SPEC is committed first.
2. **Predictor code** (`scripts/research/<track>/predict_*.mjs`):
   - reads ONLY inputs with `known_t` < the release time;
   - has NO path to actuals. A smoke test (`smoke_blind_paths.mjs`) greps the predictor and its imports for `ff_history`, `actual` and the actuals folders, and fails on any hit;
   - gets release times from a stripped schedule (`data/research/macro_nowcast/inputs/release_schedule.jsonl`: name, time, reference period; no forecast, no actual).
3. ALL predictions for the whole history are written to `data/research/<track>/predictions/<version>.jsonl`, with a sha256 in the file name list, and **committed BEFORE the scorer runs**.
4. **The scorer** checks that the predictions commit is older than its own first run. It then compares against the actual (first print) and the consensus.
5. Any model change is `v+1`: re-predicted blind for the full history, with the old version's file and score kept.

### 2.3 Time split (fixed now)

| data span | TRAIN | OOS (opened once per version) |
|---|---|---|
| 13 y price / calendar (2013-07-14 → now) | 2013-07-14 → 2021-06-30 | 2021-07-01 → latest |
| 2 y real-volume / footprint (2024-10-09 → now) | 2024-10-09 → 2025-10-31 | 2025-11-01 → latest |
| live / forward records | — | everything after the version's commit time = pure forward |

- **Sign rule:** the effect must have the same sign in TRAIN and OOS, and pass in OOS.
- **Era rule:** report per year as well. A result carried by one year is labelled so.

### 2.4 Controls and baselines (every claim has one)

| claim type | baseline / control |
|---|---|
| nowcast accuracy | economists' consensus (FF forecast); naive "same as previous"; the public bottom-up model where it exists (GDPNow, Cleveland) |
| market reaction to an event | the same hour-of-week on non-event days, same era (matched control windows); gold's drift |
| level behaviour | placebo levels at the SAME distance from price, at the same time (distance-matched), plus all real-time candidates unfiltered |
| a filter or veto | a random filter removing the same share of trades (≥ 1,000 draws); the result must beat the 95th percentile |
| a trade rule | the same entries with random direction / random timing; money vs drift |

### 2.5 Statistics

- **Rates:** Wilson LB.
- **Money:** $/trade after `spreadModel.makeSpreadAt`, with the stop first on the fill bar, and a week-block bootstrap LB.
- **Forecast errors:** absolute error vs baseline, with a paired block-bootstrap LB on the difference (must be > 0).
- **Multiple testing:** Holm across every cell in a track's family. K is stated in each track below, before running.
- **The triple:** every reported WR has $/trade (or R) and trades/day next to it.

### 2.6 Power (n minimums, fixed now)

| object | "proven" needs | below it |
|---|---|---|
| a rate in one cell (TRAIN and OOS each) | n ≥ 100 | "described only" |
| a nowcast scored per release type | n ≥ 40 releases in OOS **or** all available | flagged UNDERPOWERED (GDP: about 52 releases in total → OOS about 20: underpowered by design, said up front) |
| a forward paper test | n ≥ 100 resolved trades (same bar as BUY_D1-x) | NO VERDICT |
| a loss-autopsy filter | ≥ 30 losers AND ≥ 30 winners in the comparison set | not testable yet; keep recording |

### 2.7 Outputs and record

- **Files per study:** `docs/research/<track>/<date>_<name>_SPEC.md` (or a section of this file), `scripts/research/<track>/`, and `data/research/<track>/<date>_<name>.json`.
- **Records:** a lettered entry in `docs/MASTER_DOCUMENT.md` §7, one index line in `docs/research/README.md`, and a memory topic file for each result.
- REFUTED results go to memory with their numbers.

## 3. The tracks, in the order they run (one fresh chat per step, §6)

### T1. macro_nowcast: build each release from its components, BEFORE it is published

**Question.** Does our component nowcast beat the consensus on:
- (a) absolute error;
- (b) the SIGN of the surprise (actual − consensus)?

**Releases** (FF history 2013-07 → now; counts from the 10-29 inventory):

| release | count |
|---|---|
| Advance GDP | 52 |
| GDP price index | 52 |
| core PCE m/m | 159 |
| CPI | 158 |
| NFP | 159 |
| initial claims | 692 |

FOMC decisions are a separate T1-F below.

**Method per release: the agency's own aggregation.**

| release | how it is built |
|---|---|
| CPI / core CPI | BLS relative-importance weights (December vintage of each year) × component proxies known before release: EIA weekly gasoline, Manheim used-car index (only if a free history with dates exists; else dropped and said so), shelter from lagged rent indexes, airfares, food. Also Cleveland Fed nowcast as a competitor, not an input to ours. |
| core PCE | the CPI/PPI components that map into PCE (published mapping), known after CPI + PPI are out, before PCE. |
| GDP (advance) | GDPNow as the competitor. Ours = the components (consumption from retail sales and PCE months, investment, net exports from the advance trade / inventories releases, government) with BEA shares. |
| GDP price index | CPI / PPI / import-price components × GDP expenditure shares (the 10-29 miss: no model existed). |
| NFP | ADP (⚠ ADP methodology changed 2022: two regimes, reported separately), initial + continuing claims during the survey week, ISM employment, Challenger. Each with its release time. |
| claims | prior weeks, seasonal-factor file, state-level advance (if known before release). |

**T1-F (Fed decision and rate path).** Input: fed funds futures implied path (Polygon or FRED; if no free dated history exists, T1-F is description only and says so). Question: is the decision a surprise vs the implied path? The rate-path change is an input to T2.

**Links tested SEPARATELY** (each is its own row in the result):
- **L1:** component proxy → the component's own first print (per component error, per year).
- **L2:** our aggregate → the headline first print, vs consensus, vs naive, vs the public nowcast.
- **L3:** our predicted surprise SIGN vs the real surprise sign (Wilson LB > 50 % needed).

**Pass bar (per release type).** Paired bootstrap LB of (|consensus error| − |our error|) > 0 in TRAIN AND OOS, AND the L3 sign hit-rate Wilson LB > 50 % in OOS, after Holm across 7 release types (K = 7 × 2 criteria = 14).

### T2. news_reactions: release surprise → rate path / DXY → gold, each link separately

**Question.** Given the REAL surprise (and later, given OUR predicted surprise), what does XAU do?

**Why the design changes.** Turbo 2 measured "surprise → direction" REFUTED: 0/168 configs beat drift; magnitude ×1.17 confirmed. So the design changes:
- the surprise is measured vs the market-implied expectation where available (2y yield move in the first minute as the market's reading), not only vs consensus;
- the chain is cut into links.

**Links:**
- **L1:** surprise (standardised by that release's historical surprise s.d., TRAIN only) → 2y yield / fed funds path change (Polygon / FRED; time-resolution stated).
- **L2:** surprise → DXY in +1/5/15/30/60/240 min.
- **L3:** surprise → XAU, same horizons, using `data/calendar/release_ticks/` (157 CPI · 158 NFP · 105 FOMC).
- **L4:** our T1 predicted surprise → XAU direction BEFORE the release. This is the only link that could become a pre-release position. It is tested only on OOS releases where T1 passed.

**Outcomes:**
- direction;
- size in ATR(14, 1m→15m) units vs matched control windows;
- first-move reversal within 15 / 60 min.

**Pass bar.** Direction Wilson LB > 50 % AND money LB > 0 after spread on the would-be trade (enter at release minute +1 close, stop first). Holm over K = 6 releases × 6 horizons = 36. Magnitude results are context only (already measured), never a direction claim.

### T3. levels: break vs bounce at a level

**Question.** At an S/R level, wall, day / 4H level, FVG or trendline known before price arrives, does price break or bounce within 15 / 30 min, and which features KNOWN at the arrival tell which?

**Definitions** (frozen in the T3 sub-spec before the run; written in its fresh chat, under this SPEC):
- **arrival:** first 1m close within 0.15 × ATR(14, 15m) of the level;
- **break:** close beyond the level by ≥ 0.3 × ATR within the window;
- **bounce:** move away ≥ 0.5 × ATR without a break;
- **else:** "neither", which is reported, never dropped.

**Features at arrival:**
- approach speed (ATR/min over the last 15 min);
- candle size;
- level age / touches;
- wall strength (CME volume at the level, 2024-10 → only);
- DXY move over the last 15 min;
- hour (NY);
- days to the next high-impact release.

**Timeframes:** 3m / 5m / 15m / 30m / 1H.

**Controls:** distance-matched placebo levels at the same time, and every real-time candidate unfiltered.

**Model:** a simple one first (bucketed rates, then logistic). The calibration table (predicted p vs observed rate in 10 bins) is part of the result.

**Pass bar.** Break-or-bounce prediction:
- OOS calibration slope 0.8-1.2;
- AND a lift vs placebo with Wilson LB > placebo rate in TRAIN and OOS;
- AND a trade version (bounce = fade with SL beyond the level, or break = follow) with money LB > 0.

K is stated in the sub-spec (feature buckets × TF).

### T4. loss_autopsy: why did each losing trade trigger, and what differed from winners?

**Data:** `data/paper/matrix_trades.jsonl` (every trade carries `sig` + `ctx` at decision time), `matrix_decisions.jsonl`, `matrix_vetoed*.jsonl`, `data/inv90/*/ledger.jsonl` + `decisions.jsonl`.

⚠ **Records before 10-26 dropped weekend trades** (resolver bug): they are re-scored first, and the rule is stated in the result.

**Method:**
1. Each closed trade gets a snapshot. For the ~10 new fields not in `ctx` today, the snapshot is rebuilt causally from the 1m store at `decisionT` only, never later.
2. Winners vs losers are compared feature by feature, with Holm over K = number of features.
3. **The forward rule:** a difference found on trades ≤ date D becomes a CANDIDATE filter, tested only on trades after D. It is never tested on the trades that found it.

**Pass bar.** On post-D trades:
- money after filter > money before, with block-bootstrap LB > 0;
- AND it beats the random-filter control (95th pct);
- AND trades/day stays reported.

A filter that raises WR but lowers money FAILS.

### T5. coaching_audit: are coaching calls right more often than chance?

**Scope.** Every coaching call that is live-stamped (written time ≤ call time):
- Twin Turbo's in-trade monitor / position calls;
- Turbo 2's calls, READ-ONLY from its own output files. The files are inventoried in step 0 of T5, never guessed.

**Score:**
- pull-back level hit;
- target hit before stop;
- timing window;

each vs a random call at the same distance and time.

**Prior.** The old audit found causal ≈ 48 %, negative on every TF; 96.97 % was look-ahead. That number is never quoted.

**Pass bar.** Wilson LB > control rate in TRAIN-period calls and in forward calls, with money LB > 0 where the call implies a trade.

### T6. turbo2_monitor: Turbo 2's outputs scored on Twin Turbo's data, side by side

- **Read-only.** Turbo 2 (`C:\Ashraf-Ferrari-Turbo2`) is never modified, restarted or written to.
- **Daily record:** Turbo 2's signals / context outputs → `data/research/turbo2_monitor/<date>.jsonl`, with Twin's tape outcome (same scoring as Twin's own signals).
- **Purpose:** it feeds the merge summary (§5). No merge, wiring or dashboard before Ashraf agrees that summary.

### T7. cause research: big moves, sudden liquidations, stop runs

**Question.** What precedes a sudden large move (≥ 3 × ATR(14,15m) within 15 min), vs normal moves of the same hour and era? Candidates:
- range compression;
- CME volume build-up (2024-10 →);
- sweep of a prior swing extreme;
- time;
- a scheduled release;
- an unscheduled headline (Polygon news 2020-03 →; GDELT incomplete, said so).

**Big resting orders.** Spot has no central book; CME depth / MBO is PAID (Databento). The cost is written into the result and nothing is bought. The free proxies are CME volume clusters and swing extremes.

**Pass bar.** A precursor's lift (rate before big moves / rate before matched normal moves) with LB > 1 in TRAIN and OOS, after Holm. Then, separately, a trade version with money LB > 0. A precursor that is only "descriptive" is labelled as such, like "sweep = swing start-marker" was.

### T8. self_learning: the weekly loop that ties T1-T7 together

**Schedule.** Proposed for Sunday 10:00 UTC, while the market is closed. It is **built but NOT scheduled until Ashraf says yes**.

**Each week:**
1. **Health first:**
   - re-check the database: 0 duplicates, 0 gaps, `data_health.json` OK;
   - re-score the week's trades and decisions.

   If either fails, the loop stops and reports. No study runs on bad data.
2. **Re-run every frozen test** of T1-T7, current version, unchanged, on the data added since the last run.
   - Output: `data/research/self_learning/<date>_weekly.json`, with per-track n, effect, LB and the triple.
3. **Drift watch.** For every LIVE or paper item:
   - the rolling forward WR / money vs its measured value;
   - a flag if the forward Wilson interval no longer contains the measured WR, or the forward money LB < 0 at n ≥ 100.

   The flag goes in the weekly report and to Telegram (private chat) as information only.
4. **Proposals:** `data/research/self_learning/<date>_proposals.md`. Each proposal has:
   - what;
   - the evidence (TRAIN / OOS / forward with n);
   - the triple;
   - what it would change in the app;
   - the gate it is at (§1).

   The loop never edits app code or config.
5. **Re-fit (only if a track's frozen version fails drift for 4 consecutive weeks).** The loop does NOT re-fit itself. It writes a proposal for a new version `v+1`, which must go through §2.2 (blind) in its own chat.

**Pass bar for the loop itself.** A run is complete only when every track has a row (a skipped track is written as SKIPPED with the reason), the health check passed, and the report is committed.

## 4. What each track reports (the same template)

1. The question, and the spec version + commit hash.
2. The data used: coverage, n, holes excluded, provenance table.
3. Each link separately: n, effect, CI / LB, baseline, control, TRAIN, OOS and per year.
4. The family: K and the Holm-adjusted result.
5. The triple (WR, $/trade, trades/day) for anything trade-like.
6. **PASS / FAIL / UNDERPOWERED / DESCRIBED ONLY**, in plain words. What failed is stated first.

## 5. The merge summary (closing step, before any dashboard)

After T1-T7 have each reported once, one written summary is produced. It covers:
- best measured results;
- what failed;
- the triple for every candidate;
- the tension with Ashraf's targets (≥ 3/day, small SL, ≥ 92 % WR), with numbers.

Only after Ashraf agrees is anything built: the Tab 1 Market Coach, the Tab 2 Signals, and the merge of Turbo 2 items.

## 6. Order of execution (credit plan, HANDOFF_BUILD04 §5)

| step | what | chat |
|---|---|---|
| 1 | this SPEC, agreed + committed | this one |
| 2 | T1 blind nowcast history check: inputs inventory (ALFRED vintages, GDPNow / Cleveland histories, ADP), schedule file, predictor, commit predictions, then score | fresh chat |
| 3 | T2 reaction links (uses T1 surprises) | fresh chat |
| 4 | T3 levels: sub-spec, then run | fresh chat |
| 5 | T4 loss autopsy + T5 coaching audit + T6 Turbo 2 monitor | fresh chat (one per track if long) |
| 6 | T7 cause research | fresh chat |
| 7 | T8 weekly loop built, dry run, then Ashraf's yes to schedule it | fresh chat |
| 8 | merge summary (§5) | fresh chat |

Heavy computation runs as scripts on the PC, not in chat. Nothing in steps 2-8 touches the live app.

## 7. Questions for Ashraf (answers become a dated ADDENDUM before step 2)

1. Is the TRAIN / OOS split in §2.3 (13 y: up to 2021-06 / after; 2 y volume: up to 2025-10 / after) OK?
2. Weekly loop day and time: Sunday 10:00 UTC?
3. Telegram for drift flags: private chat only (as proposed), or none?
4. Track order in §6: keep it, or move T4 (loss autopsy) first because it uses the app's own trades?

## 8. Pre-registration audit (done before commit)

| standard (feedback_deep_research_standard, gold-measured-study, Perfection-Gate) | where in this SPEC |
|---|---|
| protocol first, fixed before results | header + §2.2 + §2.3 |
| bottom-up from source statistics, value KNOWN at the time | §2.1, T1 method |
| each link tested separately, then the chain | T1 L1-L3, T2 L1-L4, T3 features → outcome → trade |
| baselines + random / placebo controls | §2.4, every track |
| train older years, test unseen years | §2.3 |
| n, effect, CI, failures reported; power | §2.5, §2.6, §4 |
| multiple-testing correction with K stated | T1 K = 14, T2 K = 36, T3/T4/T7 K in sub-spec / feature count |
| WR is a price: the triple | §1, §2.5, §4 |
| blind history check | §2.2 |
| never auto-enable, 92 % rule, Ashraf's yes | §1, T8 step 4 |
| no paid data, cost surfaced | §2.1, T7 |
| Turbo 2 untouched | T5, T6 |

---

## ADDENDUM A. 2026-10-30, Ashraf's answers to §7 (written BEFORE any number; the SPEC becomes v1.1)

Ashraf's answers, in his words:
- Q1: "ok but do the most best for best results, zero guessing".
- Q2: "yes".
- Q3: "private inside our folder as we use it for self learning".
- Q4: "please do best of the best to make sure we understand the market in every step at each time frame and find the reason for each move and wave".
- "note the news/macros must cover everything not only GDP".

### A1. Split (Q1: agreed, strengthened)

§2.3 stays the PRIMARY split. "The most best" means more than one cut, so the following are added. All are fixed now, before any result.

- **Walk-forward:**
  - rolling yearly folds: train on all years before Y, test on Y, for every Y from 2018 to the latest full year;
  - a result must pass the primary OOS AND have the same sign in ≥ 80 % of the yearly folds;
  - the worst fold is reported, never hidden.
- **Stress sub-periods,** each reported separately:
  - 2013-15 (bear);
  - 2016-19 (range);
  - 2020 (COVID);
  - 2022 (rate hikes);
  - 2023-26 (bull run).
- **Bias audit** on every script before its result is reported:
  - look-ahead check: every feature's `known_t` ≤ the decision time, asserted in code;
  - fill-order check: stop first;
  - survivorship check: nothing dropped after the fact; weekend and holiday trades included;
  - a shuffled-label run that must come out at chance. If it does not, the pipeline leaks and the result is void.
- **Zero guessing (all tracks):**
  - a value that cannot be sourced with its publication time is NOT estimated or filled;
  - the row is marked MISSING;
  - the count of missing rows is part of the result.

### A2. Weekly loop time (Q2: yes)

Sunday 10:00 UTC is agreed. The loop still starts only after its dry run has been reported to Ashraf (T8), because it is a new scheduled job on the PC.

### A3. Drift flags (Q3: inside our folder, NOT Telegram)

This replaces the Telegram line in T8 step 3.

- **Where drift flags are written:**
  - `data/research/self_learning/drift/<date>_drift.json` (machine);
  - the weekly report `data/research/self_learning/<date>_weekly.json` + `<date>_proposals.md` (human).
- **Telegram:** nothing about the self-learning loop is sent there.
- These files are inputs to the next week's loop: the loop reads its own past flags.

### A4. NEW TRACK T0: wave reason ledger (every move, every timeframe, its measured reason) (Q4)

**Question.** For EVERY swing (wave) on EVERY timeframe:
- what started it;
- what carried it;
- what ended it;
- and which of those reasons is real (more common at real waves than at matched non-waves), versus just present everywhere.

**Waves:**
- **Definition:** ZigZag swings from `src/master/swings.js`, the published 3 × ATR(14) definition. For the last year they are asserted equal to `docs/swing_book/*_1y_swings`.
- **Timeframes:** all 16 (1m … 1M, including 9H / 2D / 3D), built with `nyCandles`.
- **Assets:** XAU first, then XAG / DXY / WTI for comparison.
- **Period:** 2013-07-14 → now. WTI and volume features run 2024-10 → only.
- **Per wave:** start, end, size in ATR, duration, speed.

**Reason candidates.** Each is a column with its `known_t`, built from data that exists. Nothing is inferred.
1. Scheduled news / macro (the full universe in A5): surprise size and sign.
2. Unscheduled headlines: Polygon news 2020-03 →. Before that the column is MISSING, not zero.
3. Rates / dollar over the same window:
   - 2y / 10y yield move;
   - real-yield move (FRED);
   - DXY move.
4. Levels reached at the wave's start or end:
   - S/R and walls;
   - day / week / 4H levels;
   - round numbers;
   - trendlines;
   - FVG.
5. Liquidity:
   - sweep of a prior swing extreme;
   - stop-run speed;
   - range compression before the start.
6. Session / time:
   - Asia / London / NY open;
   - the 17:00 NY break;
   - month / quarter end;
   - holiday-thin days.
7. Flows (2024-10 → only):
   - CME volume and delta (footprints);
   - GLD volume;
   - positioning where a dated free source exists. CFTC COT is weekly, published Friday for Tuesday, so its `known_t` is the Friday release.
8. Higher-timeframe context: where the wave sits inside the next timeframe's wave (start / middle / end).

**Attribution rule (zero guessing).**
- A reason is attached to a wave only if it was observable:
  - at or before the wave's start (for "started by"); or
  - inside the wave (for "carried by").
- The window is fixed now: ≤ 1 bar of that timeframe before the start.
- A wave with no attached reason is labelled **UNEXPLAINED**. The UNEXPLAINED share per timeframe is a headline number of the result.

**Control.**
- Each reason's rate at the start of real waves is compared with its rate at matched control points: failed extremes, plus random bars of the same hour, era and timeframe.
- The result is a lift with an LB, with Holm across reasons × timeframes: K = 8 reason groups × 16 TFs = 128.
- Only a reason with lift LB > 1 in TRAIN AND OOS is called a REASON. The rest are "present, not explanatory".

**Two layers, kept apart:**
- **DESCRIPTIVE:** the hindsight anatomy of the wave, labelled as such.
- **KNOWABLE:** what was visible at the wave's confirmation bar.

Only the knowable layer may feed T3, T7 or any signal.

**Power.** 1W / 1M waves (and often 1D) are few. They are reported as "described only" when n < 100. This is said up front.

**Output:**
- `data/research/wave_reasons/<sym>/<tf>.jsonl`: one row per wave with every reason column;
- a summary JSON.

The weekly loop (T8) appends new waves every Sunday, so the ledger keeps growing and every past wave keeps its reasons.

### A5. News / macro universe = EVERYTHING (not only GDP)

T1 and T2 cover the whole calendar, not a short list.

**Inventory, measured 2026-10-30 from `data/calendar/ff_history.jsonl`:**
- 17,155 USD rows, 2013-07-15 → 2026-10-16 (later rows are in `history.json`);
- **157 distinct event names, 85 of them with actual / forecast values.** The other 72 are speeches, auctions, holidays and testimony, with no number;
- by impact:

| impact | rows |
|---|---|
| high | 4,275 |
| medium | 4,230 |
| low | 8,489 |
| holiday | 161 |

**T2 (reaction) covers ALL 157 event types, at every impact level.**
- Numbered releases are scored by surprise.
- Non-numbered events (Fed speakers, FOMC minutes, testimony, auctions) are scored by time window only: size / direction vs matched control hours.
- Event types with n < 100 are "described only".

**T1 (nowcast) covers ALL 85 numbered releases.** Each gets one of three labels, fixed in T1's inventory step BEFORE any prediction. No release is silently skipped.

| label | meaning | what is done |
|---|---|---|
| (a) BUILDABLE | buildable from dated components (agency method) | full blind nowcast |
| (b) PUBLIC NOWCAST ONLY | e.g. GDPNow, Cleveland | scored as a competitor; no own model |
| (c) NOT BUILDABLE | no free dated data to build it from | reaction only, and said so |

**Beyond the calendar.** Dated, free sources only. Each gets a `known_t` column or is marked MISSING:
- yields 2y / 10y, real yields and breakevens (FRED / Polygon);
- the Fed funds futures path;
- CFTC COT gold positioning;
- central-bank gold purchases, only if a free dated monthly source exists (checked, never assumed);
- ETF holdings (GLD);
- oil (WTI);
- other central banks' decisions (ECB, BoJ, PBoC), when they appear in a calendar source we hold;
- geopolitical / unscheduled headlines (Polygon news 2020-03 →).

Anything paid (e.g. a paid central-bank-flows feed) is listed with its cost, not bought.

### A6. Order of execution (replaces §6 steps 2-8)

| step | what | why at this point |
|---|---|---|
| 2 | **T0 wave reason ledger**: inventory, waves on 16 TFs, reason columns, control lift (XAU) | it is the "understand every move" base every other track uses |
| 3 | **T1 inventory of all 85 numbered releases** (labels a / b / c), then a blind nowcast for the BUILDABLE ones | it feeds T0's news column with OUR predicted surprise |
| 4 | **T2 reactions for all 157 event types** | |
| 5 | T3 levels break vs bounce (sub-spec first) | it uses T0's level columns |
| 6 | T4 loss autopsy + T5 coaching audit + T6 Turbo 2 monitor | T4 uses T0's reasons for every trade |
| 7 | T7 cause research | its big moves = the largest T0 waves |
| 8 | T8 weekly loop dry run → Ashraf's yes → Sunday 10:00 UTC | |
| 9 | merge summary (§5) | |

As before: one fresh chat per step (credit plan), heavy runs as scripts on the PC, and nothing touches the live app.

### A7. Audit of this addendum

Every answer is reflected:

| Ashraf's answer | where |
|---|---|
| Q1 | A1 |
| Q2 | A2 |
| Q3 | A3 |
| Q4 | A4 + A6 |
| "news/macros everything" | A5 |

No number has been computed for any track. The only figures above are the calendar inventory counts, which describe the data and are not a result.
