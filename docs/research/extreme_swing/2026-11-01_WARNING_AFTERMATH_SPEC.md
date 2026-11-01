# EXHAUSTION WARNING — what happens AFTER a warning? Pre-registered 2026-11-01 BEFORE any number

**Ashraf (2026-11-01):** "Yes, write the spec". This follows the silver replication (MASTER §7 (fu)): weekly RSI divergence (D1) and a weekly range ≥ 2 ATR (D2) are ~3× more common in the weeks big legs end, on gold AND silver, but only about 1 warning in 3 is the actual end.

**Module:** the Extreme module (separate from the scalp / swing books).
**Methods:** gold-measured-study (controls, no look-ahead, Holm, power, WR is a price).
**This spec makes NO live change and NO alert.** Any result stays under the 92 % rule. A live display or a forward recorder needs Ashraf's OK after the results.

## 0. The open problem this spec closes

The (ft)/(fu) tests defined "in-leg weeks" with the FINISHED ZigZag. In real time we do not know the leg yet. So the warning must first be rebuilt **causally**, then re-measured (Part 1), BEFORE any money question (Part 2).

## 1. Definitions (fixed)

| item | rule |
|---|---|
| Candles | `kit(sym)` 1W, XAUUSD and XAGUSD, `markIncomplete` breaks, from 2013-07-14 (same as addenda B, C) |
| Pivots | `zigzag(k = 3, atrLen = 14)`. A pivot is usable only from the CLOSE of its confirming candle (`close_t` of `knownI`) |
| Causal leg at week w | from the last pivot confirmed by w's close, in the direction AWAY from it (after a confirmed low: up; after a confirmed high: down) |
| Causal new extreme | w's high (up) / low (down) beats every candle since that pivot |
| Causal D1 | w is a causal new extreme AND RSI(14, 1W)[w] is below (up) / above (down) the RSI of the latest earlier causal new-extreme week of the same causal leg |
| Causal D2 | w is a causal new extreme AND range(w) ≥ 2 × ATR(14, 1W)[w − 1] |
| Warning sets | D1, D2, ANY = D1 ∨ D2 |
| TRUE warning | w is the candle of the pivot that later ENDS this causal leg |
| Leg end exit (baseline P0) | the CLOSE of the candle that confirms that end pivot (the first moment a ZigZag follower knows the leg is over) |
| Units | everything in ATR(14, 1W) at the warning week (never $), plus % of price beside |

All features use candles ≤ w only. A smoke test asserts, for every warning row, that the pivot used is confirmed at or before w's close, and that no candle after w is read.

## 2. Part 1 — does the warning survive causally? (gate for Part 2)

- Population: all causal new-extreme weeks.
- Statistic: precision = TRUE warnings / warnings, vs the base rate = TRUE / all causal new-extreme weeks. `compareRates` warnings vs non-warning new-extreme weeks.
- **Pass per set:** ratio > 1 and Holm (K = 3: D1, D2, ANY) at α 0.05, on BOTH metals, n_TRUE ≥ 30 per metal; else described only. Also sign the same in 2013-2019 and 2020 →.
- A set that fails Part 1 is DESCRIBED ONLY in Part 2.

## 3. Part 2 — what happens after a warning

For every warning week w (each a row; rows of the same leg are clustered):

**A. Aftermath (descriptive):**
- weeks until the leg's end pivot;
- further move in the leg direction beyond w's extreme before the end pivot (ATR);
- adverse move against the leg from w's close (ATR);
- for FALSE warnings: how many more warnings came before the end.

**B. Policies for someone holding a position in the leg's direction at w's close.** Value = signed move from w's close to the exit, minus the cost of each exit (`spreadModel.makeSpreadAt` at the exit minute, gold; silver = its measured median spread × 2 if no model).

| policy | rule |
|---|---|
| P0 HOLD (baseline) | exit at the leg-end exit of §1 |
| P1 EXIT | exit at w's close |
| P2 TIGHTEN | stop at w's low (up legs) / high (down legs) ± 0.1 ATR. Hit (stop first inside a candle; a gap fills at the open) → exit there; else P0's exit |

- **Lift:** P1 − P0 and P2 − P0 per warning, in ATR.
- **CONTROL** (the same policies at non-warning causal new-extreme weeks): the warning must beat "act at any new extreme".
  - Statistic = mean lift at warnings − mean lift at control weeks.

**C. Counter-trend trade at the warning (DESCRIBED ONLY, never a pass).**
- Enter against the leg at w's close.
- Stop at w's extreme ± 0.25 ATR.
- Exit at the confirmation of the opposite pivot, or at the stop.
- Report WR and ATR / trade. It is pre-stated that this cannot meet the 92 % rule; it is shown so Ashraf sees the real price of "catching the turn".

## 4. Statistics, power, multiple tests

- **Holm per metal, K = 6:** {P1, P2} × {D1, D2, ANY}, on the CONTROL-adjusted lift.
- Bootstrap = `blockBootstrapMean`, with blocks = legs (all warnings of one leg resample together), one-sided level 1 − α/K.
- **PASS (per policy × set)** needs every one of:
  - control-adjusted lift > 0 and LB > 0 on BOTH gold and silver;
  - Holm pass on both;
  - n_warnings ≥ 30 per metal;
  - the sign the same in 2013-2019 and 2020 →.
- **Power, said now:** ~34-36 legs per metal. Warnings cluster in legs, so the real n is closer to the leg count. A pass will need a large effect; a fail is likely and will be reported as a fail.
- **Era split:** leave-one-era-out sign (no 60/40 split with this few legs).
- **Audits (any failure = VOID):**
  - causal smoke test (§1);
  - Part 1 on the FINISHED leg must reproduce the (ft) / (fu) D tables (same code path, `extreme_lib.mjs`);
  - placebo: warnings replaced by the same number of random causal new-extreme weeks per leg, 1,000 times. The control-adjusted lift must be > 0 with LB > 0 in at most 5 % + 3 SE of the draws (that limit is fixed now, after the (ft) knife-edge lesson).

## 5. Outputs

- Script: `scripts/research/extreme_swing/study_warning_aftermath.mjs` (rules from `extreme_lib.mjs`, causal parts added there).
- Result: `data/research/extreme_swing/2026-11-DD_warning_aftermath.json` + `warnings.jsonl` (every warning row).
- Report to Ashraf:
  - Part 1 table;
  - aftermath distributions;
  - the policy table (P0 / P1 / P2 with the control);
  - the counter-trade price;
  - the CURRENT week's causal state on gold and silver.
- Records: MASTER §7, memory.
- **After the results, only with Ashraf's OK:** a record-only weekly warning logger (forward test). Nothing on Telegram or the chart (92 % rule).

## 6. Order of work

1. Add the causal warning builder to `extreme_lib.mjs`; run the reproduction audit and the smoke test.
2. Part 1 on both metals.
3. Part 2 (only the sets that passed Part 1 are tested; the others are described).
4. Audits, report, records.

## ADDENDUM A — 2026-11-01, before any number

1. **Silver cost:** there is no measured silver spread (the spread model is gold-only and never borrows, R0). Silver policy values are therefore shown WITHOUT cost and labelled so. Gold uses `makeSpreadAt` at each exit minute. The run reports gold's median cost in ATR(1W) units, so the size of this omission can be judged.
2. **Causal-leg details:**
   - "Every candle since that pivot" = candles p.i + 1 … w − 1, the same as the hindsight rule.
   - The causal leg starts at p's confirmation candle, so new-extreme weeks before `p.knownI` are not part of it.
   - A break between p and w, or between w and the exit, drops the row.
   - Rows of the current open leg (no end yet) are excluded from the statistics and shown as the current state.
3. **P2 / counter-trade walk:** on weekly candles from w + 1 to the leg-end confirmation candle. A gap through the stop fills at the open; otherwise the stop is hit at its price when the candle's range reaches it; else the exit is the confirmation candle's close.
4. **Bootstrap:**
   - leg-cluster resampling, B = 5,000, one-sided p = share of bootstrap differences ≤ 0 (floor 1 / B), LB = the α/K quantile (K = 6);
   - placebo draws use B = 400 inside each draw;
   - placebo limit: 5 % + 3 × √(0.05 × 0.95 / 1000) = 7.07 % per cell.
5. **n rule of Part 1:** n_TRUE = the TRUE rows in the population.
