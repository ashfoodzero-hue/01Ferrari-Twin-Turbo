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
