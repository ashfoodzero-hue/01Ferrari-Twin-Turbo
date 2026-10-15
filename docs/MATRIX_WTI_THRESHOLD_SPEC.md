# Matrix WTI filter with a % threshold: pre-registered test (2026-10-15)

Ashraf: *"do you think WTI is making us miss trades … may we need to lower its % to trigger a trade"*.
Written **before any result was seen**.

## Current rule (Ashraf's Pine)
- BUY needs WTI's 1 h candle (as delivered, 10 min late) **not bullish**.
- SELL needs it **bullish**.

## Variant
The same Matrix signals with every other condition unchanged (`matrixSignals` with `useWti = false`). The WTI condition then becomes thresholded: with c = (WTI 1 h close − open) / open,
- BUY is allowed unless c ≥ +x %;
- SELL is allowed only if c ≥ +x %;
- x ∈ {0.10 %, 0.25 %, 0.50 %}. The current rule is x = 0 % (any rise).

## Trade
The live Matrix exits (`resolveMatrixTrade`, half at TP1, half at TP2, stop to entry). One position at a time. Window: 2024-10-10 → 2026-10-09 (WTI history).

## Verdict
- **Split:** TRAIN 60 % / OOS 40 %.
- **K** = 3 → α = 0.05/3.
- **BETTER ⇔** OOS $/trade > the current rule's AND OOS bootstrap LB > 0 AND TRAIN mean > 0.
- Anything else stays with the current rule.
- **Reported:** trades/day, WR (TP1 reached), $/trade, for x = 0 / 0.10 / 0.25 / 0.50 % and for no WTI.

## RESULT: keep the current WTI rule (0 / 3 thresholds better)

| Variant | Trades / day (OOS) | Win rate | $ / trade (OOS) |
|---|---|---|---|
| **Current rule (any rise blocks a BUY)** | 6.82 | 27.9 % | **−$0.97** |
| ≥ 0.10 % | 7.93 | 27.7 % | −$1.00 |
| ≥ 0.25 % | 8.85 | 27.1 % | −$1.13 |
| ≥ 0.50 % | 9.57 | 26.8 % | −$1.37 |
| No WTI | 9.88 | 26.8 % | −$1.50 |

Monotonic: every loosening adds trades and loses more per trade. The WTI filter removes worse-than-average trades.
