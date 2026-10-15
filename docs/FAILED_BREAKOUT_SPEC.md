# Failed breakout (sweep and reject): pre-registered test (2026-10-15)

Ashraf: *"fix the sell"*, after the 13:18 UTC candle. It spiked to 4167-4168, above the range high and the breakout trigger, then closed red at 4159, back inside. No app rule covers that shape.
Written **before any result was seen**.

## The setup (closed bars, XAU spot, Polygon bid)
- **Range top:** H = the highest high of the previous 45 bars, excluding the current bar (the Matrix's look-back). **Range bottom:** L = the lowest low.
- **SELL (failed breakout):** the bar's high > H + 0.1·ATR14 (a real poke above) AND it closes < H AND closes red (close < open).
- **BUY (failed breakdown, the mirror):** low < L − 0.1·ATR14 AND close > L AND green.
- **Timeframes:** 3m and 15m, each separately.

## Trade
- **Entry:** at the signal bar's close. SELL at the bid; BUY pays the ask (measured spread).
- **SL:** the bar's extreme ± $0.50 (above the wick for a SELL), hit on the correct side; slippage min($0.30, 0.05·ATR).
- **Targets:** 1 R and 2 R. **Horizon:** 4 h (3m) / 12 h (15m), then market exit.
- **One position at a time.**

## Filter
**D+S:** DXY (3m close vs EMA10) agrees AND silver (3m close vs EMA10) agrees with the trade, measured at the entry close.

## Cells and verdict
- **Cells:** {3m, 15m} × {base, D+S} × {1 R, 2 R} = 8 → **K = 8**, one-sided α = 0.05/8.
- **Split:** TRAIN 60 % / OOS 40 % by time.
- **PASS ⇔** OOS ≥ 100 trades AND OOS mean $/trade bootstrap LB (α/K) > 0 AND TRAIN mean > 0.
- **Reported:** WR, $/trade, trades/day, by side (SELL vs BUY).

---
## Confirmation of the post-hoc lead: pre-registered 2026-10-15 BEFORE its run
**Lead** (seen only in the OOS side split): 15m, D+S filter, 2 R, **SELL side only** → +$0.47/t.
**CONFIRMED ⇔ all four checks pass:**
- **T1 TRAIN 60 %** (the side split was never looked at there): mean $/t > 0 AND bootstrap 2.5 % bound > 0.
- **T2 per year:** mean > 0 in ≥ 70 % of years with ≥ 15 trades (full window).
- **T3 spread × 1.5** (full window): mean > 0.
- **T4 neighbours** (full window): 1.5 R AND 2.5 R both mean > 0.

The same rules otherwise (`study_failed_breakout_sell15.mjs` → `failed_breakout_sell15_confirm.json`).

**RESULT: NOT CONFIRMED (0 / 4).**
- T1 TRAIN: 31.2 % WR, **−$0.43/t** (n 561).
- T2: positive years 5/14.
- T3 spread × 1.5: −$0.19.
- T4 neighbours: 1.5 R −$0.17, 2.5 R −$0.08.
- Full window −$0.01/t. The OOS profit came almost entirely from 2026 (76 trades, +$4.31/t); 2025 was −$1.83/t. It is a recent-regime artefact, not an edge.
