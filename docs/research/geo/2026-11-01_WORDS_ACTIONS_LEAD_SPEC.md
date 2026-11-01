# WORDS vs ACTIONS: do they lead oil and gold? Pre-registered 2026-11-01 BEFORE any study number

**Ashraf (2026-11-01):** "see what is US doing … talking about peace meanwhile they are sending troops", "read it and measure it and have numbers for that". On ACLED being closed to us: "Use GPR + GDELT". On this spec: "Yes, write the spec".

**Inputs:** GDELT 1.0 daily event files → `data/research/geo/gdelt_events_daily.jsonl` (builder `scripts/research/geo/gdelt_events.mjs`, MASTER §7 (fx)); GPR daily (`data/research/extreme_swing/inputs/gpr_daily.jsonl`: `gprd`, `act`, `threat`); FRED: DCOILWTICO, DCOILBRENTEU, OVXCLS, GVZCLS, VIXCLS; Polygon XAUUSD 1m; Polygon WTI 1m (cross-check only); Forex Factory calendar via `src/master/marketContext.js`.

**What has been seen before this spec.** Only the GDELT build checks: day totals and the Iran count for 2026-10-25 … 10-31 (MASTER §7 (fx)). No GDELT value has been joined to any price, volatility or GPR value. No result below exists yet.

## 0. The three questions and the order they run in

| part | question | runs only if |
|---|---|---|
| 0. gates | Is the data complete, and does the GDELT coding see known events? | always first; any failure stops the study |
| A. words → actions | Do threats ("WORDS") and troop/ship moves ("POSTURE") come before attacks ("ACTS") in the same region, beyond what the attacks themselves already show? | Part 0 passes |
| B. → markets | Does any GDELT measure predict gold or oil moves, or the market's fear gauges (GVZ, OVX), **beyond what the market and GPR already show**? | Part 0 passes (A and B do not depend on each other) |

Part A is about how news of conflict develops. Part B is the market question. Both are research only: nothing feeds a signal, a chart box or a Telegram alert (92 % rule).

## 1. Measures (fixed now)

**Fresh events only.** An event counts on GDELT day d only if its event date is ≥ d − 7 (the builder's rule; older re-coded events are excluded).

**Scopes** (ActionGeo country, ISO 3):

| scope | countries |
|---|---|
| MIDEAST | IRN ISR SAU YEM IRQ SYR LBN JOR EGY QAT ARE KWT OMN BHR PSE |
| RU_UA | RUS UKR |
| EAST_ASIA | CHN TWN PRK KOR |
| WORLD | every row of the day |

The other watched countries (USA PAK IND TUR VEN LBY) count in WORLD only. Per-country values are reported but described only.

**Raw shares.** The denominator is the day's total number of fresh events in the world (`world.n`). Coverage grows over the years, so raw counts are never used.
- WORDS = verbal-conflict events (QuadClass 3) in the scope / world.n
- ACTS = material-conflict events (QuadClass 4) in the scope / world.n
- POSTURE = force-posture events (root 15: troop or ship moves) in the scope / world.n
- TALK = verbal-cooperation events (QuadClass 1) in the scope / world.n

A zero count is replaced by 0.5 before the share and the log are taken.

**z-scores.** z(x, d) = (ln x(d) − mean) / sd, where the mean and sd come from ln x over the previous 90 calendar days, excluding d. It needs at least 60 stored days in that window, otherwise the value is missing. Missing GDELT days are never filled.

**The four predictors** per scope:
- zWORDS
- zACTS
- zPOSTURE
- TALK_POSTURE = min(zTALK, zPOSTURE). This is "talks peace, moves troops": it is high only when both are high.

That gives 4 scopes × 4 = 16 predictors.

## 2. Timing (no look-ahead)

- **GDELT day d is known at d + 1, 08:00 UTC.** That time was measured; archive file times are 2014 re-uploads, so they are not used.
- **Market day T** = the first daily close after that known time:
  - Gold: the close of Ashraf's TradingView daily candle, 17:00 New York, from `nyCandles` 1d built from Polygon XAUUSD 1m.
  - Oil: the EIA Cushing WTI spot price date (FRED DCOILWTICO).
  - Each market uses its own calendar.
- **Predictor X(T)** = the mean of the predictor over every GDELT day whose first close after its known time is close(T). For example, Monday averages Friday, Saturday and Sunday.
- **Targets start at close(T).** Any move between d + 1, 08:00 UTC and close(T) is not used. This is conservative.
  - Described only: gold from d + 1, 08:00 UTC to close(T), from 1m bars, labelled as such.
- **Controls** are known at close(T) or earlier, with one exception: GPR of day d is published days later. Using it anyway can only make our predictor's job harder, so it is stated as conservative.
- **Scheduled events:** the count of Forex Factory high-impact USD events inside the target window. The calendar is known in advance, so this is not look-ahead.
- **Excluded oil days:** days where the WTI price is ≤ 0 (2020-04-20/21) are excluded from oil targets.

## 3. Part A: words → actions (inside each scope)

- **Target:** the mean zACTS over GDELT days d+1 … d+7 (A7) and d+1 … d+30 (A30).
- **Predictors:** zWORDS, zPOSTURE, TALK_POSTURE on day d.
- **Controls (model A0):**
  - zACTS(d);
  - mean zACTS over d−6 … d and over d−29 … d;
  - weekday.
- **K_A** = 4 scopes × 3 predictors × 2 horizons = **24**.

**Caveat, stated now.** Both sides are machine-coded news reports. A pass means "news of threats is followed by news of attacks", not proof of what happened on the ground.

## 4. Part B: GDELT → gold, oil, GVZ, OVX

All targets use log changes from close(T).

| target | definition |
|---|---|
| G1 | gold \|ln(C_T+1 / C_T)\| |
| G5 | gold \|ln(C_T+5 / C_T)\| |
| G5s | gold ln(C_T+5 / C_T), signed |
| O1, O5, O5s | the same three for WTI spot |
| GVZ5 | GVZCLS(T+5) − GVZCLS(T) |
| OVX5 | OVXCLS(T+5) − OVXCLS(T) |

**Controls (model B0), "what the market and GPR already show":**
- \|r\| of the asset: the last day, and the mean over the last 5 and 22 days;
- for signed targets also r of the last day and the last 5 days;
- ln GVZ (gold targets) or ln OVX (oil targets), and ln VIX, at close(T);
- for GVZ5 / OVX5: the level and its change over the last 5 days;
- GPR: ln gprd, ln act, ln threat, averaged over the same GDELT days as X(T);
- the scheduled-event count;
- weekday.

**K_B** = 16 predictors × 8 targets = **128**.

**Prediction markets** have no dated history covering 2013-2026, so they cannot be a baseline here. The daily collector records them from 11-01, for a forward check later.

**Brent** (DCOILBRENTEU) is a robustness column only: same tests, described, no pass or fail.

## 5. Statistics and pass rule (same for A and B)

- **Split:**
  - TRAIN: dates up to 2021-12-31.
  - OOS: 2022-01-01 → the last date with complete targets.
- **Model:** OLS of the target on the controls (A0 / B0), with and without the predictor.
- **Bootstrap:**
  - week blocks (2-week blocks for 5-, 7- and 30-day targets);
  - 10,000 resamples, seed 20261101.

**A cell PASSES only if all five hold:**
1. **Visible in TRAIN:** the predictor's coefficient has bootstrap two-sided p ≤ 0.05 in TRAIN.
2. **Same sign in OOS:** the coefficient refit on OOS has the same sign as in TRAIN.
3. **Forecast lift:** fit A0/B0 and A0/B0 + predictor on TRAIN only, freeze them, and predict OOS. ΔMSE = MSE(base) − MSE(base + predictor) must be > 0, with a one-sided bootstrap p that survives **Holm across its part** (K_A = 24 or K_B = 128) at 0.05.
4. **Not one event:** dropping the top 1 % \|target\| OOS days, ΔMSE is still > 0.
5. **Power:** at least 500 OOS observations (expected about 1,200 trading days).

**Expected signs** are written now. They are reported, but they are not part of the pass rule, because the sign must only agree between TRAIN and OOS:
- \|r\|, GVZ5, OVX5: positive (more conflict → bigger moves and more fear);
- G5s: positive (safe haven);
- O5s: positive for MIDEAST and RU_UA (supply), no expectation for the other scopes;
- Part A: positive.

**Reported for every cell:** n TRAIN / n OOS, coefficient ± bootstrap interval, ΔMSE OOS with its lower bound, Holm-adjusted p, and PASS / FAIL with the first rule failed.

## 6. Part 0 gates (all must pass before any Part A/B number is computed)

| gate | test | pass |
|---|---|---|
| G0.1 coverage | GDELT stored days 2013-07-14 … 2026-10-24 | ≥ 98 % of calendar days, 0 error rows; missing days listed |
| G0.2 the coding sees known events | the scope's zACTS ≥ 2 on the event date or one of the next 2 GDELT days, for the dated anchors below | ≥ 8 of 9; plus a placebo: the same rule on 9 × 100 random dates (same weekdays) is reported |
| G0.3 oil source | daily returns of FRED DCOILWTICO vs Polygon WTI daily closes, 2024-10-09 → end, excluding the 1 % largest differences (contract rolls) | correlation ≥ 0.90 |
| G0.4 gold candles | `smoke_ny_candles` | green |
| G0.5 look-ahead audit | assert per row that every GDELT day used has known time < close(T) and every control is dated ≤ close(T); then a shuffle test: X permuted by whole weeks, the full Part A + B run 20 times (1,000 resamples per cell in shuffle runs, for compute) | 0 assertion failures; shuffled pass count ≤ 1 cell per run on average |
| G0.6 freeze | the study script, this spec and the input file hashes committed before the first full run | commit exists |

**G0.2 anchors** (dates are when the event happened, not when it was reported):
- MIDEAST, zACTS:
  - 2019-09-14 Abqaiq attack;
  - 2020-01-03 Soleimani strike;
  - 2023-10-07 Hamas attack on Israel;
  - 2024-04-13 Iran drones and missiles on Israel;
  - 2024-10-01 Iran missiles on Israel;
  - 2025-06-13 Israel strikes Iran.
- RU_UA, zACTS:
  - 2014-03-01 Russian forces in Crimea;
  - 2022-02-24 invasion of Ukraine.
- EAST_ASIA, **zPOSTURE**:
  - 2022-08-04 PLA live-fire drills around Taiwan.

## 7. What a result means (written before the result)

- **A pass on \|r\|, GVZ5 or OVX5** means the measure tells "how big / how nervous", not "which way". It would be one more CONTEXT input, like the USD calendar (size, not direction). It is not a trade rule.
- **A pass on G5s or O5s** (direction) would be new. Earlier news and DXY direction tests were all refuted (memory: news + DXY refuted), so the prior expectation is low. Even then it is research only.
- **Any use in a trade** needs its own spec, a money test with spreads, and the 92 % rule.
- **If nothing passes,** the answer is "no edge over what the market and GPR already show", reported plainly. The collector keeps recording for the forward check.

## 8. Outputs and code

- `scripts/research/geo/study_words_actions.mjs` writes:
  - `data/research/geo/words_actions_study.json` (gates, every cell, input hashes);
  - `data/research/geo/inputs/fred_<ID>.json` (series + `fetched_at`).
- `scripts/smoke_words_actions.mjs`, added to `smoke_all`. It checks:
  - the z-score window excludes d and needs 60 days;
  - the weekend mapping (Fri/Sat/Sun → Monday);
  - the close(T) rule;
  - the oil ≤ 0 exclusion;
  - an assertion that the predictor is never dated after close(T).
- Results go in MASTER §7, in memory, and in a plain report to Ashraf (tables, the n behind every number, PASS and FAIL alike).

## 9. Changes after this point

Any change is a dated ADDENDUM below, written before the numbers it affects.

## ADDENDUM A — 2026-11-01, after the GDELT backfill finished, before any study number

- **Coverage measured:** 2013-07-14 … 2026-10-31 = 4,858 calendar days, 4,834 stored (99.51 %), 0 error rows, 0 bad rows. G0.1 (≥ 98 %) is therefore met on coverage alone. It is still re-checked by the study script.
- **24 days are missing at GDELT itself:**
  - 2014-01-23/24/25, 2014-03-19, 2022-11-10, 2023-03-23;
  - **2025-06-14 → 2025-07-01 (18 days in a row).**
  - Checked at the source: the daily file answers 404, and GDELT's own index lists nothing from 2025-06-13 to 2025-07-02. The GDELT 2.0 15-minute files also answer 404 in that window. It is a GDELT outage, not our download.
- **Why it matters:** the 18-day hole is the 2025 Israel–Iran war, which falls in the OOS period. Rules fixed now:
  1. The missing days stay missing. There is no fill and no other source spliced in.
  2. A missing day still advances the clock. Its market days get no predictor value and are left out of the fit and of the OOS score.
  3. The z-score windows simply have fewer days. The "≥ 60 of the previous 90" rule decides, so the first days after the hole stay valid, with 72 or more stored days.
  4. Anchor 2025-06-13 (Israel strikes Iran) is tested on day d only, because d+1 and d+2 are missing. It counts as a miss if zACTS < 2 on 06-13. The pass mark stays 8 of 9.
  5. The report states that OOS has no GDELT data for the war's 18 days. This is a known blind spot in Part B, the same one the live collector would have had.

## ADDENDUM B — 2026-11-01, while building the study script, before any Part 0 / A / B number

1. **GDELT century bug, measured and fixed in the builder.**
   - The daily files for 2020-01-01 … 2020-01-05 write the event date as 1920MMDD instead of 2020MMDD. For 20200103 that is 153,043 of 157,403 rows. So 99 % of those days' events were wrongly counted as stale.
   - `gdelt_events.mjs` now adds 100 years when the event-date year equals the file year − 100 (`century_fix` on the row). The 5 days were re-fetched.
   - No other day has a stale share above 10 % (scan of all 4,834 days).
   - This touches the 2020-01-03 anchor (Soleimani). The fix was decided from the raw file, before any z-score was computed.
2. **Part A windows.**
   - Target A7 / A30 = the mean zACTS over the stored days of d+1 … d+h. It needs at least half of them (4 of 7, 15 of 30).
   - Controls: zACTS(d) must exist; the mean of d−6 … d needs ≥ 4 days, and d−29 … d needs ≥ 15.
3. **Bootstrap blocks** are fixed calendar blocks (epoch weeks, starting Thursday) of 7 days for 1-day targets and 14 days for 5-, 7- and 30-day targets. TRAIN and OOS are bootstrapped separately.
4. **Week shuffle (G0.5):**
   - The rows of each 7-day block take the predictor values of a randomly chosen block, in order, cycled when the counts differ.
   - Each shuffle run applies the full pass rule, including Holm.
   - The Brent cells are described only, so they are left out of the shuffle count.
5. **Close times used for the look-ahead assert:**
   - gold: the daily candle's last minute + 1;
   - WTI and Brent spot: 14:30 New York;
   - GVZ / OVX / VIX: 16:15 New York.
6. **G0.4** (`smoke_ny_candles`) runs as its own command. Its result is recorded next to Part 0.

## ADDENDUM C — 2026-11-01, after the first Part 0 run (G0.5 assert failed), before any Part A / B number

- **Part 0, first full run:**
  - G0.1 passed: 99.51 %.
  - G0.2 passed: 9 / 9 anchors; the placebo hit rate was 12.8 %.
  - G0.3 passed: correlation 0.9036 on 504 days.
  - G0.4 passed: `smoke_ny_candles` 17 / 17.
  - G0.5 failed. The shuffle part was clean: 0 passes in each of the 20 runs. But **144 of 569,408 predictor rows had a GDELT day whose known time was not before close(T).**
- **Cause, measured:** three gold daily candles are 2-hour data-hole stubs: 2019-09-03, 2020-10-13 and 2026-05-07, 119-120 minutes each, last minute at 00:00 UTC. Their "close" is not a session close. 3 candles × 16 predictors × 3 gold targets = 144.
  - A fourth stub, 2021-12-24 (65 minutes, last minute 08:14 New York), passed the assert, but it is the same kind of false close.
- **Rule:** a gold daily close counts only if its last minute is at or after 12:00 New York on its date.
  - The earliest real early close in the data is 14:30 New York (Labor Day, MLK).
  - Failing candles get no close, so every row whose target or controls touch them is dropped.
  - This removes exactly the four stubs above.
- **Part 0 is re-run in full,** shuffle included, with the rule in place. G0.5 must show 0 assert failures.
- **Addendum C, second run:** still 144 failures, because the assert counted rows *before* invalid rows were dropped. So the 4 stubs never entered a fit, but they were still counted. The assert now runs on every row that enters a fit (the spec says "every GDELT day *used*"). Dropped rows are counted separately (`rows_dropped_before_fit`). Part 0 is re-run in full.
