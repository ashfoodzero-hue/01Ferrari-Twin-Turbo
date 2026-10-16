# TOP-DOWN REVERSAL: 4H/1H level → 15m/30m reversal candle → 3m CHoCH entry (pre-registered 2026-10-16)

**Request (Ashraf):** "we should not use the 3m walls to trigger a trade; use the bigger time-frame candles, 4H as main and 1H, use 15m and 30m for confirmation, and only use the 3m CHoCH for the correct entry level after the candles confirm the reversal".

**Standing red line:** WR ≥ 85 % AND positive money.

## 1. Levels (all known causally)

| Variant | Levels |
|---|---|
| **L4H** | every closed NY 4H candle's HIGH (a ceiling) and LOW (a floor), usable from the candle's close |
| **L1H** | every closed 1H candle's high / low, likewise |

A level is removed once a candle of the CONFIRMATION timeframe closes beyond it.

## 2. Reversal confirmation (on the 15m OR 30m timeframe — two variants)

- **At a ceiling L** — a closed confirmation candle with:
  - high ≥ L − tol (tol = 0.05 % of price ≈ $2: it reached / poked through the level);
  - close < L;
  - close < open (a bearish candle);
  - L = the active ceiling closest to the candle's high among those with L ≤ high + tol and L > close.
- **At a floor:** the mirror image.
- **Known time:** the confirmation candle's close.

## 3. Entry — 3m CHoCH

- **Window:** within 2 h after the confirmation.
- **SELL:** the first 3m close BELOW the latest CONFIRMED 3m swing low (5/5 pivot, known by that bar). **BUY:** the mirror (a close above the latest confirmed swing high).
- **Fill:** the entry is that 3m close — SELL at the bid; BUY pays the ask (the measured spread model).
- **Stop:** the extreme (high for a SELL / low for a BUY) from the start of the confirmation candle to the entry, ± $0.50.
  - Skipped if the risk is < $0.5 or > $15.
  - Stop hit by ask (SELL) / bid (BUY); stop first inside a minute; slippage min($0.30, 0.15 × ATR14 1m).

## 4. Exits (3)

- **1R** · **2R** · **SPLIT** (half at 1R, then the stop moves to the entry, half at 2R).
- **Horizon:** 8 h, then a market exit.
- One position at a time per cell.

## 5. Cells and verdict

- **Cells:** K = 12 = {L4H, L1H} × {15m, 30m} × {1R, 2R, SPLIT}.
- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00.
- **PASS** ⇔ all of these hold:
  - OOS n ≥ 100;
  - **OOS WR ≥ 0.85** with Wilson LB at z(α/K) ≥ 0.80;
  - OOS mean $ / trade > 0 with bootstrap LB at α/K > 0;
  - TRAIN mean > 0.
- **Reported:**
  - trades / day;
  - average risk;
  - the share of setups that confirmed but never gave a CHoCH;
  - by side;
  - pre/post 2020;
  - the same cells with a defended wall bubble at the touch (`swingWallEvents` on the same level) — reported only.

Study: `scripts/study_mtf_reversal.mjs` → `data/master/mtf_reversal_study.json`.
