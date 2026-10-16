# SELL-ONLY in confirmed downtrends (pre-registered 2026-10-16)

**Request (Ashraf):** "New SELL-only research", after (bh) measured why only BUY trades fire.

**Idea.** Sell only where gold's up-drift is weakest — inside a CONFIRMED downtrend.

## Downtrend regimes (known at the decision)

| Regime | Definition |
|---|---|
| **R-STATE** | the app's own market state on 15m bars (`readMarketState`, the last 150 closed 15m bars) is BREAKOUT_DOWN or TREND_DOWN |
| **R-4H** | at the last closed NY 4H bar: EMA9 < EMA21 AND the last two confirmed 4H pivot highs (3/3) are descending |

## SELL setups

| Setup | Trigger | Stop |
|---|---|---|
| **S-RALLY** | a 3m swing-wall CEILING test with a strong defence bubble (DEF>PUSH, or STRONG > the 3m swing TRAIN p66 from study (bc)) | wall + 3 bins |
| **S-BREAK** | a closed 15m bar closes BELOW the latest confirmed 15m swing low (5/5) | the highest high of the last 4 closed 15m bars + $0.50 |

- **S-RALLY entry:** SELL at the bid at the decision.
- **S-BREAK entry:** SELL at the bid at that 15m close.
- **Stops:** hit by the ask; stop first inside a minute; slippage min($0.30, 0.15 × ATR14 1m). Risk must be within $0.5-$15.

## Exits

- **R1** (1R) · **R2** (2R) · **RH** (0.5R — the high-WR geometry).
- **Horizon:** 8 h, then a market exit. One position at a time per cell.

## Cells and verdict

- **Cells:** K = 12 = {R-STATE, R-4H} × {S-RALLY, S-BREAK} × {R1, R2, RH}.
- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00.
- **PASS** ⇔ all of these hold:
  - OOS n ≥ 100;
  - **WR ≥ 0.85** with Wilson LB at z(α/K) ≥ 0.80;
  - mean $ / trade > 0 with bootstrap LB at α/K > 0;
  - TRAIN mean > 0.
- **Reported:**
  - trades / day;
  - average risk;
  - pre/post 2020;
  - the same setups WITHOUT a regime filter (does the regime help at all);
  - R-1H (the 1H EMA + lower-highs version).

Study: `scripts/study_sell_downtrend.mjs` → `data/master/sell_downtrend_study.json`.
