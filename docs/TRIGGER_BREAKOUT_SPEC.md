# Chart BUY / SELL TRIGGER as a trade: pre-registered test (2026-10-15)

Ashraf: *"we need everything fixed but I need to get trades for both buy/sell triggers"*.
Written **before any result was seen**.

## Trigger (exactly `src/master/marketState.js`, 15m XAU spot, closed bars)
- **Range:** the 48 bars before the current one; ATR14(15m).
- **BUY:** the 15m close > range high + 0.3·ATR AND volume ≥ 1.4 × the range's average volume (the app's BREAKOUT_UP).
- **SELL:** the 15m close < range low − 0.3·ATR AND the same volume rule (BREAKOUT_DOWN).
- **One trade per confirmed break:** the next trade needs a new break.

## Trade
- **Entry:** market at the trigger close. BUY pays the ask; SELL at the bid. Measured spread.
- **SL** (two pre-registered geometries):
  - **S1:** 1.0 · ATR15 from entry.
  - **S2:** back inside the range: range high − 0.25·ATR for a BUY (range low + 0.25·ATR for a SELL).
- **Targets:** 1 R / 2 R. **Horizon:** 24 h, then market exit. Stop first inside a minute; slippage min($0.30, 0.05·ATR).
- **One position at a time.**

## Filter
**D+S:** DXY and silver (3m close vs EMA10) agree with the trade at the entry close.

## Cells and verdict
- **Cells:** {S1, S2} × {1 R, 2 R} × {base, D+S} = 8 → **K = 8**.
- **Split:** TRAIN 60 % / OOS 40 %.
- **PASS ⇔** OOS ≥ 100 trades AND OOS bootstrap LB (α 0.05/8) > 0 AND TRAIN mean > 0.
- **Reported:** WR, $/trade, trades/day, SELL vs BUY.

## Display, regardless of the verdict (Ashraf wants to SEE every trigger trade)
- The live chart shows each trigger trade as a paper neon box: **TRIGGER BUY / TRIGGER SELL**.
- It uses the best-OOS pre-registered geometry. Its label carries the measured record, the same way the Matrix (SHADOW) is shown.
