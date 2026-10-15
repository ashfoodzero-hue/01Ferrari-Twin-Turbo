# Matrix SCALP — the SELL side (pre-registered 2026-10-16)

**Request (Ashraf):** "run the SELL study" — after the finding that only 4 of 9,929 Matrix signals in 2 years were SELLs. Standing rule: **WR is the red line** (SCALP ≥ 85 %).

**Question.** Does any SELL trigger fire often enough AND meet the SCALP red line with positive money on unseen data?

## SELL rules tested

All share the wall (high ≥ ceiling − cushion), WTI bullish (as delivered) and DXY close > EMA10. Only the trigger differs.

| Rule | Trigger |
|---|---|
| `choch` | close below the last confirmed swing low (Ashraf's Pine rule — the live default, reference) |
| `red` | red candle, c < o (the mirror of the BUY's green candle) |
| `prevlow` | close below the previous candle's low |

## Exits (2)

- **native:** the Matrix box (TP1 = 2R min $10, TP2 = 1.5 × TP1, half each, stop to the fill after TP1, 24 h horizon). `resolveMatrixTrade`, measured spread, stop first inside a minute, stop slippage.
- **highwr:** stop 3R, target 0.25R, same as `docs/MATRIX_85WR_SPEC.md`.

**K = 6 cells.**

## Trades and windows

- **Trades:** SELL signals only, one trade at a time, market entry at the signal close (SELL receives the bid).
- **Primary window:** 2024-10-10 → 2026-10-09 (WTI history = the live rule). TRAIN = first 60 %, OOS = last 40 %.
- **Robustness:** the same rules without WTI on 13 y (2013-07-21 →), same split. A pass must not be negative there.

## Pass rule (fixed before the run; WR is the red line)

A cell passes only if ALL of these hold:
- OOS n ≥ 100;
- **OOS WR ≥ 0.85** and its Wilson lower bound at z(α/K) ≥ 0.83. WR = wins / (wins + losses); a native "TP1 + break-even" is a scratch and stays out of WR;
- OOS mean $/trade > 0 and the bootstrap lower bound at α/K > 0;
- TRAIN mean $/trade > 0;
- 13 y no-WTI OOS mean $/trade ≥ 0.

Otherwise it FAILS: nothing ships and the live SELL stays as it is.

Output: `data/master/matrix_sell_study.json`. Script: `scripts/study_matrix_sell.mjs`.
