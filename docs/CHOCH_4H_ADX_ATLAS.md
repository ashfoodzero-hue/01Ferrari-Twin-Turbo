# 4H CHoCH + ADX + entry — RESULTS (2026-10-20)

Spec `docs/CHOCH_4H_ADX_SPEC.md` + ADDENDA A-F (each written and committed before its numbers). Code `scripts/lib/choch4h.mjs` (one implementation), `study_choch_4h_adx.mjs`, `study_choch_retest.mjs` (`--structure`, `--long`, `--ob`), `study_choch_drift_control.mjs`, audit `audit_choch_4h.mjs`. Data: Polygon 1m raw, XAU (primary) and XAG (replication), 2013-07 → 2026-10-16; TRAIN to 2021-06-30, OOS after; measured spreads.

## Verdict: nothing reaches a pass, and nothing is close to 100 %. Every money cell (36 + 18 × 4 on gold, the same on silver) fails.

| Part | What was tested | Result |
|---|---|---|
| A | Does a 4H CHoCH really change the trend more than chance? | Raw: REAL 64-65 % vs 45-51 % random — but a CHoCH's tip sits 2.6 ATR away vs 1.3 ATR for the random tip. **Distance-matched (ADDENDUM A): BUY 63.7 % vs 66.6 % (no edge); SELL 65.0 % vs 56.2 % (p 0.02, neither window significant alone). Silver: no edge either side.** |
| A | ADX at the CHoCH (5 buckets, rising/falling, DI agree) | 0 of 18 rows pass Holm. ADX does not separate real from failed CHoCHs. |
| B | Entries E1 market / E2 retest of the level / E3 half-way, short targets | 0/36. Many cells positive in OOS ($/trade) but n ≈ 100 and the lower bound far below 0. |
| ADD. B | Your strict setup: broke a measured 4H/1D S/R level + retest + no OB cross + clear confirmation candle + ADX change | Only **8** setups in 13 y (XAG 6) → cannot be proven or refuted. Funnel 504 → 33 → 17 → 15 → 8. |
| ADD. C | Same, the broken level = the CHoCH's own level | 154 setups (≈ 12/year). Gold BUY positive in TRAIN and OOS (e.g. 2R: +$6.09 / +$16.09), SELL mixed; 0/18 pass (n ≈ 30 OOS per cell). Silver negative. |
| ADD. D | Long-swing exits only (3R / 5R / hold to the opposite CHoCH) | Gold BUY hold-to-opposite-CHoCH: TRAIN +$7.31 (n 41), OOS +$22.49 (n 32), WR 42 %; gold SELL negative OOS; silver negative. 0/18. |
| ADD. E | Retest INTO the OB, OB never broken, entry on the first 15m CHoCH inside the OB, long-swing exits | Funnel 504 → 270 into OB → 163 OB held → 140 with a 15m CHoCH. Gold BUY X3: TRAIN +$4.25 (n 46), OOS +$24.08 (n 29), WR 35-38 %; gold SELL WR 11-14 % OOS, losing; silver negative. 0/18. |
| ADD. F | Is the gold-BUY profit the setup or gold's rise? | Setup − random BUY with the same stop and exit: +$4.6 to +$13.6/trade in most cells, but **every 95 % interval includes 0** (e.g. X3 OOS +$11.7 [−23.3, +46.2]). Random gold BUYs earned up to +$12/trade OOS by themselves. **Not proven beyond the drift.** |

## What this means in plain words

- The 4H CHoCH is a real structure event, but measured against fair random entries it does **not** pick trend changes better than chance on BUY, and only weakly on SELL (not repeated on silver).
- ADX at the CHoCH carries no information about whether it is real.
- Your full entry (retest into the OB, OB holds, first 15m CHoCH inside the OB) gives ≈ 10 gold setups a year. Gold BUYs made money in both halves of the history, but no more than buying gold at random times with the same stop and exit; SELLs lost. Win rates are 35-45 % (long-swing exits) — the profit, where there is any, comes from a few large winners, not from a high WR.
- **100 % is not reachable** with any of these rules; the highest WRs seen are ~60 % with small targets, and those lose after the spread.

## Audit

`data/master/choch_4h_audit.json`: **CLEAN.** Independent evaluator: 200 ADDENDUM E trades re-derived from the minutes (CHoCH close vs level, OB never broken before the trigger, entry after the 15m trigger, stop, entry price, whole exit path): 0 differences. Prefix check: 100 random cuts, 27,388 CHoCH events and 7,530 setups compared with data cut at that time: 0 differences. Positive control: E BUY trades whose 4H close 6 candles later is above the entry make +$20.67/trade vs +$10.12 for all E BUYs → the harness sees an edge when one exists.
