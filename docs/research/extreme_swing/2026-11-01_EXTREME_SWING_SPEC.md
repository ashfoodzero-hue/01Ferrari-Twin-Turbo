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
