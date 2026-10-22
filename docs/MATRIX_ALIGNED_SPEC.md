# Matrix SCALP aligned with structure + the right wall — BUYs filtered, SELLs added (pre-registered 2026-10-22, before any number)

**Ashraf (2026-10-22):** "we did not take short trades, and we need to make sure that buy trades keeps running but with taking the correct structure and time on the correct wall levels."

## What is already measured (not re-tested)
- **Time of day:** session (Asia / London / NY / late) gave no lift on SCALP BUY losers (loss autopsy §7 (bs)). Not repeated.
- **4H alone:** V4H (no BUY while 4H DOWN) FAILED (TRAIN reversed, §7 (df)). Only re-used here jointly with 1H (new).
- **SELL at the Matrix wall without structure:** red-candle SELL −$0.34/t on 13 y (§7 (as)); EMA-trend downtrend SELLs 0/12 (§7 (bi)). The structure-conditioned SELL (pivot 1H + 4H) is new.

## Definitions (ONE implementation each — no re-implementation)
- **Signals, walls, entry / SL / TPs:** `ferrariMatrix.matrixSignals` + `matrixLevelsAt` (live code). BUY wall = `low ≤ floor + cushion` (FLOOR) or `low ≤ intWall + cushion` (INTERNAL 0.886 wall); SELL wall = `high ≥ ceiling − cushion`.
- **Structure:** `choch4h.structureStateAt` (the live V1H function: 3/3 pivots, closed candles, read on the last candle whose whole period passed), on 1H and on 4H (NY 17:00 anchor). States UP / DOWN / MIXED.
- **Money:** `ferrariMatrix.resolveMatrixTrade` (the live box resolver: market fill + measured spread, slip, stop first, TP1 half → stop to entry, TP2, 24 h). $/oz per trade.
- **SELL entries** (new; same geometry as the live SELL: entry = close, SL = 5-bar high + slPad, TP1 = max(minReward, 2 × risk), TP2 = 1.5 × TP1 distance) at a SELL-wall bar.

## Cells (K = 7)
**BUY filters** — applied to the live BUY signals that V1H already admits (baseline = V1H book):
- **B1** keep only when 4H is not DOWN (joint with V1H).
- **B2** keep only when 1H UP **and** 4H UP.
- **B3** keep only FLOOR-wall BUYs.
- **B4** keep only INTERNAL-wall BUYs.

**SELL rules** — new SELL signals at the SELL wall:
- **S1** red candle + 1H DOWN + 4H DOWN.
- **S2** S1 + DXY bullish (DXY 3m close > EMA10).
- **S3** close below the last confirmed 3m swing low (Ashraf's Pine trigger) + 1H DOWN + 4H DOWN (no WTI / DXY).
- **Control for every S:** the same rule WITHOUT the structure condition (isolates what structure adds).

## Data and split
- PRIMARY 2 y with WTI (Matrix needs WTI for BUYs): split 2025-12-26 (same as the V1H study) → TRAIN / OOS.
- ROBUST 13 y without WTI (`useWti:false`), split 2021-06-30.
- Gold spot 1m (Polygon), live cleaning; spreads `spreadModel`. No look-ahead: structure read at the decision time on closed candles; prefix-cut audit.

## Pass rule (fixed now)
- **BUY filter passes** when, in TRAIN **and** OOS (PRIMARY): the removed BUYs earn less $/t than the kept, the filtered book's $/t beats the V1H book, removed n ≥ 30 in OOS; and ROBUST 13 y shows the same signs.
- **SELL rule passes** when $/t > 0 in TRAIN **and** OOS with week-block bootstrap LB > 0 at α/3 (Holm over S1-S3), OOS n ≥ 30, beats its no-structure control in both windows, and ROBUST 13 y $/t > 0.
- Every cell reported with n, WR, $/t, LB — pass or fail. Nothing wired live without Ashraf's OK.

## Audit before reporting
Independent second evaluation of 200 random trades (0 diff), 50 prefix cuts of the structure state (0 diff), positive control (an oracle SELL that knows the next hour must show a large positive $/t).
