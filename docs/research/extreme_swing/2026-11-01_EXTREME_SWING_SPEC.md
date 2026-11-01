# EXTREME SWING study: where do gold's biggest moves end, and what did big money do there? Pre-registered 2026-11-01 BEFORE any number

**Ashraf (2026-11-01):** "this extreme … like the drop is going on right now … we need to see where is this move is going to be end and get exhausted … look the big whales where they are positioning themselves … finding out their levels means we are winning with the extreme swing trade … check the history how the waves are moving especially for the last 6 years" → "Yes, write the spec".

**Module:** the separate Extreme module (Ashraf 2026-05-16: "Extreme Ferrari Signal Trigger … done separately"). Never merged into the scalp / swing books.
**Methods:** gold-measured-study (controls, no look-ahead, Holm, power, WR is a price) + geopolitics-macro-analysis (source grading, base rates).
**Context measured today (not a result of this study):** Friday 2026-10-30 session O 4,021.11 · L 3,869.96 · C 3,874.86 (−$146, −3.6 %) from `data/history/XAUUSD/1m.jsonl`.

**This spec makes NO trade rule.** It measures (A) the legs, (B) where they ended against controls, (C) what positioning / flows looked like there, (D) exhaustion signs knowable at the time, and (E) pullbacks inside them. A trade rule is a later spec, with $/trade and Ashraf's 92 % rule.

## 1. The three trade types (names fixed now)

| type | definition used in our studies |
|---|---|
| SCALP | intraday, existing Matrix / scalp books (unchanged) |
| SWING | 1-2 days, existing swing books (E0 etc., unchanged) |
| **EXTREME SWING** | a leg of the **weekly** ZigZag defined in §2: weeks to months |

## 2. Definitions (fixed)

- **Candles:** XAUUSD spot 1m (Polygon) from 2013-07-14 → `cleanForTv` → `buildCandles(m1, '1W')` and `'1D'` (`src/core/nyCandles.js`, TradingView-exact, smoke-tested). Incomplete candles flagged (`dataHoles.js`).
- **Extreme leg (primary):** `zigzag(weekly, { k: 3, atrLen: 14 })` (`src/master/swings.js`, the same rule as the published swing book). A leg runs pivot → next pivot. Size in $, in %, and in ATR(14, 1W) units at the leg's start; duration in weeks.
- **Robustness definition (reported beside, never swapped in after a result):** 1D ZigZag k = 3 legs with size ≥ 10 × ATR(14, 1D).
- **Pivot known time:** a weekly pivot is KNOWN only at its confirmation candle (the ZigZag's confirmation bar), never at the pivot week itself. The **current open leg** = from the last confirmed pivot to now.
- **Pullback inside a leg (part E):** a counter-move leg of the 1D ZigZag k = 3 that lies wholly inside an extreme leg.
- **Eras:** ALL (2013-07 → now) and MODERN (legs starting ≥ 2020-01-01, Ashraf's "last 6 years"), always reported separately.

## 3. The tests

### A. Leg catalog (descriptive)
Every leg: start / end time and price, size ($, %, ATR units), duration, max adverse move inside, number of 1D pullbacks, and the macro / geopolitics context at start and end (§4 sources, as known then). Per era: counts and size distributions.

### B. Where did the legs END? Magnet candidates vs the price path's own control
For each leg, at its END price, measure the distance (ATR(14, 1W) units) to the nearest candidate of each set below. **Only candidates known before the end week count.**

| set | candidate levels | data start |
|---|---|---|
| B1 volume nodes | top-5 % price bins (by real CME GC volume, time-aligned to spot, basis removed by the same-minute spot − futures difference) over the 60 trading days before the end week | 2024-10 only (2-year real-volume rule) |
| B2 prior pivots | every 1D and 1W ZigZag pivot confirmed before the end week | 2013 |
| B3 round numbers | multiples of $100 | 2013 |
| B4 retracements | 38.2 / 50 / 61.8 % of the PREVIOUS completed extreme leg | 2013 |

- **Control (fixed):** 200 prices drawn uniformly from the range the leg itself traversed, excluding the last 10 % of the leg near the end, with the same "known before" cut. The statistic is the END's distance percentile among the controls.
- **Null:** percentile ~ uniform. **Pass:** mean percentile < 0.5 with block-bootstrap UB < 0.5 (legs resampled), in ALL and MODERN, after Holm.
- The scenario-band edges from `docs/MACRO_DRAWDOWN_SCENARIOS_2026-09-25.md` exist only from 2026-09-25 → they are tracked FORWARD only, never tested on history.

### C. Positioning and flows at leg ends vs inside legs
At each leg END week vs every other week inside legs (control), the value AS KNOWN then of:

| item | source | known time | status |
|---|---|---|---|
| C1 COT managed-money net long in gold, percentile in the trailing 3 years | CFTC disaggregated futures history (free files) | Friday release for Tuesday | **TO VERIFY** in step 1 (history files) |
| C2 GLD (+ IAU) holdings change over 4 weeks | SPDR / iShares holdings history | next day | **TO VERIFY** in step 1 |
| C3 real 10y yield change over 4 weeks | FRED DFII10 (vintages) | next day | DATED 2013 |
| C4 DXY change over 4 weeks | our DXY rebuild | minute | DATED |
| C5 VIX level | FRED VIXCLS | next day | DATED 2013 |
| C6 geopolitical risk | GPR daily (threats, acts) | as published | HIST (approximate known time: +1 day) |

Statistic: rate of the item being in its extreme decile (TRAIN-fixed thresholds) at ends vs inside legs → lift with Wilson / bootstrap LB.

### D. Exhaustion signs, knowable at the end week's close
At the end weeks vs all other in-leg weeks (control):

| item | definition |
|---|---|
| D1 weekly RSI(14) divergence | price makes a new leg extreme, RSI does not |
| D2 volatility climax | weekly range ≥ 2 × ATR(14, 1W) |
| D3 stretch | distance from the 20-week mean ≥ 3 × ATR(14, 1W) |
| D4 run length | ≥ 6 consecutive weeks closing in the leg's direction |

Each is reported as precision (ends among the weeks that show it) and recall, both vs the control.

### E. Pullbacks inside extreme legs (descriptive, for "where could the big pullback go")
Depth of each 1D pullback as a fraction of the leg so far (distribution per era) and its duration. Plus: how often the deepest pullback exceeded 50 % / 61.8 % before the leg resumed.

## 4. Statistics, power, multiple tests

- **Holm across K = 18:** B1-B4 × 2 eras = 8; C1-C6 = 6; D1-D4 = 4.
- **Power, said now:** weekly k = 3 legs since 2013 are expected to be FEW (tens, not hundreds); MODERN fewer still. Any cell with n < 30 legs is **"described only"**, never "proven". B1 (2 years of real volume) will almost surely be described only. The 1D robustness definition gives more legs and is reported beside.
- **Split:** with tens of legs a 60/40 split is meaningless. Instead: report the leave-one-era-out sign (2013-2019 vs 2020 →). A result whose sign flips between eras is labelled era-dependent.
- **No look-ahead audit:** every candidate and every item carries its known time; a smoke test asserts known_t < the end week's open for every row. A shuffled-end null (end prices swapped across legs) must fail B in ≥ 95 % of 1,000 shuffles, or the run is void.

## 5. Outputs

- Script: `scripts/research/extreme_swing/study_extreme_swing.mjs`.
- Result: `data/research/extreme_swing/2026-11-DD_extreme_swing.json` and a leg table `legs.jsonl`.
- Report to Ashraf: the leg catalog (incl. the CURRENT open leg and where it stands vs the measured distributions), the B / C / D tables with n and PASS / FAIL / DESCRIBED ONLY, the pullback table.
- Records: a MASTER §7 entry, `docs/research/README.md`, a memory topic.
- **A live "Extreme Swing panel" comes only after the results, and only with Ashraf's OK** (live change). It shows measured facts; no buy / sell level unless a later trade-rule spec passes with money and the 92 % rule.

## 6. Order of work

1. Verify the C1 / C2 histories (dated, free); record the status; anything not verifiable → MISSING, the cell is dropped and said so.
2. Build the script; run the A catalog; audit the pivots against the published `docs/swing_book/xau_1y_swings/1W.csv` for the overlapping year (must be equal).
3. Run B, C, D, E; audits; report.

## ADDENDUM A — 2026-11-01, step 1 done: C1 / C2 inputs VERIFIED (before any study number)

Script `scripts/research/extreme_swing/build_step1_inputs.mjs`. Proof: `data/research/extreme_swing/2026-11-01_step1_inputs_verification.json`. Files: `data/research/extreme_swing/inputs/cot_gold_088691.jsonl`, `gld_holdings.jsonl`. Raw downloads under `raw/` (gitignored).

**C1 COT (CFTC disaggregated futures-only, gold 088691), status DATED:**
- 721 weekly reports, 2013-01-08 → 2026-10-27;
- 0 duplicates, 0 missing weeks;
- the CFTC open-interest identity holds on all 721;
- 0 values known before their report date.

**C1 known_t rules:**

| case | known_t |
|---|---|
| normal | report Tuesday + 7 days 00:00 UTC (CFTC publishes Friday 15:30 ET; holiday delays move it to Monday 15:30 ET) |
| 2025 shutdown (14 reports) | the latest new publish date in the CFTC special-announcement tables + 1 day |
| no exact CFTC catch-up dates found | MISSING, 33 reports, never filled: 2013-09-24 … 2013-11-26 (2013 shutdown), 2018-12-18 … 2019-03-12 (2018-19 shutdown), 2023-01-31 … 2023-04-04 (ION cyber incident) |

**C2 GLD holdings (SPDR historical archive), status HIST:**
- 5,520 trading days, 2004-11-18 → 2026-10-29 (3,345 since 2013-07);
- 205 "US Holiday" rows carry no values and are skipped;
- 0 unparsed, 0 duplicates.
- known_t = date + 1 day 14:30 UTC.
- It is a single current snapshot with no vintages, so it is labelled HIST: possible later corrections cannot be seen.
- IAU is not added: no verified free history.

The study (§6 steps 2-3) uses exactly these files and rules.

## ADDENDUM B — 2026-11-01, steps 2-3 implementation rules (written BEFORE any study number)

Script `scripts/research/extreme_swing/study_extreme_swing.mjs`. Every choice below is fixed now.

1. **Candles:** `kit('XAUUSD')` (gold session + reopen clamp, the same as the published swing book) → `1W` and `1D`, `markIncomplete` → incomplete candles are ZigZag breaks (same as `scripts/swings_1y.mjs`).
2. **Pivot audit (must be equal or the run is void):** the rebuilt weekly pivots whose candle is on or after the first row of `docs/swing_book/xau_1y_swings/1W.csv` and whose confirmation is on or before its last `confirmed_at` = the 6 rows (type, candle_open, price to the cent).
3. **Legs:** consecutive weekly pivots. Size in ATR = |Δ| / ATR at the start pivot. The **end-week cut**: a candidate counts only if known (the close of the candle that confirmed it, or its `known_t`) at or before the OPEN of the end-pivot week.
4. **B distances** in ATR(14, 1W) of the candle before the end week. Controls: 200 prices uniform over the leg's range minus the last 10 % at the end, seeded `rng(1000 + leg index)`. Percentile = (controls closer + ½ ties) / 200.
5. **B statistic:** p = one-sided normal test of the mean percentile against the uniform null (variance 1 / (12 n)); UB = `blockBootstrapMean` 95 % two-sided upper bound (7-day blocks = legs). A cell PASSES only if mean < 0.5, UB < 0.5, Holm pass and n ≥ 30.
6. **B1 volume nodes:** GOLD_FUT minutes (real CME volume) priced at the SAME-minute spot close (basis removed). Bins are 0.05 × ATR(14, 1W) wide. The top 5 % of non-empty bins by volume, over the 60 trading days before the end week, are the candidates. A leg is eligible only if those 60 days lie wholly after 2024-10-09.
7. **Audits:**
   - shuffle (as in §4): 1,000 permutations of end prices across the legs. A shuffle "passes" if mean < 0.5 and p < 0.05 (uniform-null shortcut, no bootstrap). Void if more than 5 % pass.
   - placebo end (added because the cross-leg shuffle is weak when price levels differ between eras): each leg's end is replaced by one random control-range price, 1,000 times, same pass definition, void if more than 5 % pass.
   - known-time smoke: every candidate and item value is known at or before its cut.
8. **C items** are known by the week's close (`close_t`):

   | item | value |
   |---|---|
   | C1 | COT `mm_net` percentile among the trailing 156 known reports (needs ≥ 104; MISSING reports are skipped; null if the latest known report is more than 21 days old) |
   | C2 | GLD tonnes % change: latest known vs latest known 28 days earlier |
   | C3 | DFII10 change over 28 days (FRED current snapshot, known date + 1 day, labelled HIST) |
   | C4 | DXY % change over 28 days, from the DXY 1m rebuild (last minute at or before the cut) |
   | C5 | VIXCLS level (FRED, known date + 1 day) |
   | C6 | mean GPRD of the last 7 known days (`inputs/gpr_daily.jsonl`, known date + 1 day, HIST) |

   **Extreme** = beyond the 5th / 95th percentile of the item over the TRAIN weeks (week close before 2020-01-01), either tail, so the base is about 10 %. Ends are compared with in-leg weeks (strictly between the start and end pivot weeks) using `compareRates` (two-sided p). PASS = ratio > 1, Holm pass, n_ends ≥ 30. Which tail was hit is reported, as description only.
9. **D items:**
   - D1: the week makes a new in-leg extreme, and RSI(14, 1W) is below the RSI of the latest earlier in-leg week that was itself a new extreme.
   - D2: range ≥ 2 × ATR of the prior candle.
   - D3: |close − SMA20| ≥ 3 × ATR.
   - D4: ≥ 6 consecutive closes in the leg's direction ending at the week.

   Same comparison as C; precision = k_end / (k_end + k_ctrl), recall = k_end / n_end.
10. **E pullbacks:** 1D ZigZag k = 3 legs opposite to the extreme leg, with both pivots inside the extreme leg's pivot candles. Depth = |pullback| / |pullback start − extreme leg start|. Duration is in daily candles.
11. **Robustness (beside, not in Holm):** 1D legs with |Δ| ≥ 10 × ATR(14, 1D) at the start. B2-B4 only, the cut at the end DAY's open, distances in ATR(14, 1D).
12. **Leave-one-era-out:** B mean percentile and C / D ratios are reported for legs (weeks) of 2013-2019 and 2020 → separately. Opposite sides of 0.5 / 1 between eras → labelled **era-dependent**.
13. **Holm family K = 18:** B1-B4 × ALL / MODERN (8), C1-C6 ALL (6), D1-D4 ALL (4). MODERN C / D are reported beside.

## ADDENDUM C — 2026-11-01, independent replication on SILVER of the two D hypotheses (written BEFORE any silver number)

**Ashraf:** "Yes, test on silver". The gold run (§7 (ft)) is VOID, so its D1 / D2 lifts are only hypotheses. This addendum tests them once on an independent asset.

1. **Data:** XAGUSD 1m, `kit('XAGUSD')` (its own measured session + reopen clamp), `1W` candles, `markIncomplete` breaks, `zigzag(k = 3, atrLen = 14)`. These are exactly the gold rules (B.1, B.3).
2. **Pivot audit (void if not equal):** rebuilt pivots = `docs/swing_book/xag_1y_swings/1W.csv` (type, candle_open, price to 0.001).
3. **One place for the rules:** the leg builder and the D features move unchanged to `scripts/research/extreme_swing/extreme_lib.mjs`. The gold study is re-run and must reproduce its D table exactly (refactor-then-diff), or the replication waits.
4. **Tested items:** D1 (weekly RSI divergence) and D2 (range ≥ 2 × ATR of the prior candle) only, with the definitions of B.9 unchanged.
5. **PRIMARY comparison:** end weeks vs FAIR controls, i.e. in-leg weeks that were also a new in-leg extreme (every end week is one). The comparison with all in-leg weeks is reported beside.
6. **Pass (each item):**
   - ratio > 1;
   - Holm K = 2 at α 0.05 on the `compareRates` two-sided p;
   - n_end ≥ 30;
   - the same sign (ratio > 1) in the 2013-2019 and 2020 → legs.

   If n_end < 30, the item is DESCRIBED ONLY.
7. **Reported:** n, rates, ratio, p, precision, recall, the era split, and gold's numbers beside.
8. **What a pass means:** a measured exhaustion WARNING on two metals. It is not a trade rule and not an alert. With precision near 30 %, it stays under the 92 % rule; anything live needs Ashraf's OK and a forward test.
