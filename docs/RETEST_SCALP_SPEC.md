# Break → retest → rejection scalp: pre-registered test (2026-10-15)

Ashraf, live on 2026-10-15: *"if this method for scalp is good please check … but must be aware of DXY and WTI, News, Silver"*.
Written **before any result was seen**. Nothing below changes after a run.

## The setup (3m candles, XAU spot, Polygon bid)

**Swing levels**
- The Matrix's confirmed pivots (`confirmedPivots`, 5 bars each side).
- A pivot exists only once its 5 right-hand bars have closed.

**SELL (mirror for BUY at a swing high)**
1. **Break:** a closed 3m candle closes below the last confirmed swing low L.
2. **Retest:** within the next 10 candles, a candle trades back up to ≥ L − 0.1·ATR14(3m).
3. **Rejection:** that same candle closes **red** (close < open) and **below L**.
4. **Cancel:** if any candle closes above L before step 3, the break failed and there is no trade.

**Trade**
- **Entry:** sell at the rejection candle's close (bid).
- **SL:** the rejection candle's high + $0.50. The stop is hit when the ask reaches it; slippage min($0.30, 0.05·ATR).
- **Targets:** 1 R or 2 R, where R = SL − entry.
- **Exit:** buy back at the ask. Stop first inside a minute. Market exit after 4 h. Measured spread table.
- **One position at a time.**

## Awareness filters (each measured at the entry candle's close, closed bars only)

| Filter | SELL needs | BUY needs |
|---|---|---|
| **D: DXY** (3m close vs EMA10, rebuilt from 6 pairs) | DXY bullish | DXY bearish |
| **S: Silver** (3m close vs EMA10) | silver bearish | silver bullish |
| **N: News** | no high-impact USD release (NFP, CPI, FOMC, PPI, Retail, Fed Chair) within ±30 min of entry | same |
| **W: WTI** (1 h candle as delivered, 10 min late; Ashraf's Pine whale rule) | WTI bullish | WTI bearish |

WTI history exists only from 2024-10-10, so W is tested on 2 years only.

## Cells and verdict

**Cells**
- 13 y, both sides in one book: {base, D, S, N, D+S, D+S+N} × {1 R, 2 R} = 12.
- 2 y: {D+S+N+W, W} × {1 R, 2 R} = 4.
- **K = 16** → one-sided α = 0.05/16.

**Split:** TRAIN 60 % / OOS 40 % by time.

**PASS ⇔** OOS ≥ 100 trades AND OOS mean $/trade bootstrap lower bound (α/K) > 0 AND TRAIN mean > 0.

**Reported:** WR, $/trade, trades per day, by side and by year.
