# EARLY DOWN-DAY DETECTOR (gate for the no-wall continuation SELL): pre-registered 2026-11-01 BEFORE any number

**Ashraf (2026-11-01):** "we are missing something in our setup … conditions" → after the no-wall test: "Yes, write it".

**Why (measured, MASTER §7 (fo)):** the no-wall SELL (NW) makes money inside big DOWN days and loses on UP days:

| window | big DOWN days | big UP days |
|---|---|---|
| 2 y | +$7.75 per trade | −$5.95 per trade |
| 13 y | +$3.35 per trade | −$3.41 per trade |

As a standalone rule it fails 0 / 4. **Question:** can we know EARLY in the session, using only what is visible at that time, that today is a down day, so that NW SELLs only then?

**READ-ONLY research.** Nothing live changes. A pass goes to Ashraf; going live needs his OK. This is a low-WR / high-R SELL, judged by money, never by the 92 % rule.

## 1. Definitions (fixed)

- **Trading day** = gold's New York session (17:00 NY → 17:00 NY next day, `tradingDate`, TradingView-exact).
- **Day move** = (session close − session open) / ATR(14, 1D) of the prior completed days.
- **DOWN day** = day move in the bottom 20 % of TRAIN days (the threshold is fixed on TRAIN and frozen). UP day = top 20 %. The base rate of DOWN is ~20 % by construction.
- **Checkpoints:** h = 4, 8, 12, 16 hours after the session open (NY 21:00, 01:00, 05:00, 09:00). Friday's worst hour was 09:00 NY = h 16.

## 2. Features at a checkpoint (all from data with time < the checkpoint; none uses the rest of the day)

| # | feature | source |
|---|---|---|
| F1 | day-so-far move: price at the checkpoint − session open, in ATR(1D) | gold 1m |
| F2 | previous day's move, in ATR(1D) | gold 1D |
| F3 | price below the previous day's low (yes / no), and the distance in ATR | gold 1D |
| F4 | 1H structure state and 4H structure state at the checkpoint (−1 / 0 / +1; the live V1H state machine) | `makeAligned` stateAt |
| F5 | 1D structure state (the same machine on 1D candles) | `findChochs` on 1D |
| F6 | DXY change since the session open and over the prior 24 h (rebuilt DXY) | `loadDxyBars` |
| F7 | real 10-year yield, change on the previous US day (FRED DFII10, ALFRED vintage known before the session) | FRED |
| F8 | a high-impact USD release scheduled later today (yes / no: the calendar is known in advance; the value is NOT used) | FF schedule |
| F9 | Friday (yes / no) | calendar |

WTI (hour bullish) is NOT a detector feature: it has only 2 years. It stays inside NW itself on the 2-year window.

## 3. Model (fixed form, fitted ONCE on TRAIN)

- One logistic regression per checkpoint, features F1-F9 standardised on TRAIN, fitted on **TRAIN days only** (2013-07-21 → 2021-06-30). It is then frozen and applied unchanged to OOS (2021-07-01 → 2026-10-30), including the whole 2-year window.
- **Gate threshold per checkpoint** = the TRAIN probability whose top-scored days carry 30 % of TRAIN days (fixed share; never tuned on OOS).
- NW SELLs are allowed only from the checkpoint to the session close, only on days the gate opened at that checkpoint.

## 4. Tests

**T-A, classifier (per checkpoint):**
- OOS precision of "gate open" for DOWN days vs the base rate;
- recall;
- Brier score vs the climatology baseline (the base rate). Brier skill must be > 0 with a day-block bootstrap LB > 0.

**T-B, money (the point):**
- NW13 (13 y, no WTI) and NW (2 y, with WTI) SELL trades, gated, priced exactly as in the no-wall study (`resolveMatrixTrade`, spread, stop first, one at a time);
- reported per checkpoint: TRAIN / OOS / 2-year, with the triple (WR, $/trade, trades per day).

**Controls for T-B:**
1. Ungated NW (from §7 (fo)).
2. **Random gate:** 1,000 random gates opening on the same share of days, after the same checkpoint. The real gate's OOS $/trade must beat the 95th percentile.
3. Gold's drift: shown beside every result.

## 5. Pass rule

A checkpoint passes only if ALL hold:
1. T-A Brier skill LB > 0 in OOS.
2. T-B gated NW13 $/trade > 0 in TRAIN and OOS, with the week-block bootstrap LB > 0 in OOS.
3. Beats the random-gate 95th percentile in OOS.
4. Gated NW on the 2-year window has $/trade > 0.
5. OOS n ≥ 30 trades.

**Holm across K = 12** (4 checkpoints × {T-A, T-B 13 y, T-B 2 y}).

**Always reported:**
- per year;
- big UP days the gate wrongly opened (the cost);
- Friday 2026-10-30: gate state at each checkpoint, and the trades it would have allowed.

## 6. Audits (any failure voids the run)

1. **Leak test:** every feature's source timestamps < the checkpoint (asserted per row). Rerun with F1 computed one bar LATER than allowed must change results; with it one bar EARLIER, it must not leak future data.
2. **Shuffled-label null:** DOWN labels shuffled across TRAIN days, model refit. It must show no OOS Brier skill in ≥ 95 % of 200 shuffles.
3. **Determinism:** two runs → identical.
4. **Parity:** ungated NW trades in this harness equal `data/master/matrix_nowall_sell_study.json` trade for trade.

## 7. Outputs

- Script `scripts/study_down_day_detector.mjs`.
- Result `data/master/down_day_detector_study.json`.
- MASTER §7 entry, memory topic (PASS or REFUTED with numbers).
- If it passes, a separate step: the gate shown on the chart as information, then a live paper record. Each needs Ashraf's OK.

## ADDENDUM A — 2026-11-01, before the first run (no number seen). Implementation details the spec left open; nothing in §1-§5 changes

1. **Days** = the TradingView-exact 1D candles `kit('XAUUSD').build(M, '1D')` (t = session open 17:00 NY, `td` = trading date). ATR(14, 1D) = the Wilder ATR of the 14 days completed before the day.
2. **F4 / F5 structure:**
   - F4 = `makeAligned` stateAt('1H' | '4H', checkpoint), the live V1H state machine.
   - F5 = `findChochs` on the 1D candles, the state of the last day whose `close_t` ≤ checkpoint.
3. **F6 DXY:** rebuilt DXY 3m (`loadDxyBars('3m')`); the value at a time = close of the last 3m bar ending ≤ that time; change in % (log × 100).
4. **F7 real 10y (DFII10):** a daily market series. Rule of the T1 extractor: an observation dated D is usable from D + 1 day (UTC midnight) ≤ the session open. Feature = the last usable value minus the one before it. Fetched once from FRED and cached under `data/research/down_day/raw/`.
5. **F8 high-impact release later today:** `ff_history.jsonl` rows with impact = high (to 2026-10-16), plus `data/calendar/history.json` events (official times, all years) after that; count > 0 in [checkpoint, session close). Times only; no value is read.
6. **Logistic fit:**
   - IRLS (Newton steps, ≤ 50, tolerance 1e-8) with ridge λ = 1e-4 on the standardised features, for numerical stability only;
   - missing feature → that TRAIN day is dropped from the fit; at prediction time → gate closed (counted).
7. **Trades:**
   - the no-wall rule moves unchanged into ONE shared file `scripts/lib/matrix_nowall.mjs`; `study_matrix_nowall_sell.mjs` imports it.
   - Each NW signal is resolved ONCE with `resolveMatrixTrade` on the same 1m path slice as `matrixTrades`; a fast sequencer then applies one-trade-at-a-time (busy until exit + 1 min, unfinished trades dropped) for every gate, including the 1,000 random gates.
   - **Audit 4:** the ungated sequence must equal the (fo) results (n and total $ per window) exactly.
8. **Random gate:** per checkpoint, 1,000 draws of a random set of OOS days of the same size as the real gate's OOS open days (seed 7); statistic = OOS $/trade; the real gate must exceed the 95th percentile.
9. **Day split:** TRAIN = days with session open < 2021-06-30 12:00 UTC; OOS = the rest up to 2026-10-30. The 2-year window (2024-10-10 →) is entirely OOS for the model.
