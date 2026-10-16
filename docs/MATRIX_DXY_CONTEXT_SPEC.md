# Matrix SCALP: DXY 15m trend + "fresh flip" filters — Ashraf's 12:24 post-mortem (pre-registered 2026-10-16)

**Request (Ashraf):** "find out what happened when we fired the trade and what we did not really check before the trigger; I noticed the DXY structure was reversing — would this be the reason?"

**Facts of the 12:24 UTC SCALP BUY (stopped −$5.84):**
- WTI context turned OK at 12:18;
- DXY 3m dropped below its EMA10 only ON the 12:21 signal bar (above it for the 30 min before);
- DXY 15m (close vs EMA10 of closed 15m bars, the chart chip) = BULLISH.

## Filters (applied to Matrix BUY signals, causal at the decision)

| Filter | Rule |
|---|---|
| **F-DXY15** | skip the BUY when DXY's last CLOSED 15m bar closes ABOVE its EMA10 (DXY 15m trend up = against a gold buy) |
| **F-FRESH** | skip the BUY when the context (WTI 1h as delivered not bullish AND DXY 3m close < EMA10) was NOT also true on the previous closed 3m bar (it flipped on the signal bar) |

## Trades and verdict

- **Trades:** the Matrix trade sequence (`scripts/lib/matrix_trades.mjs`), money path `resolveMatrixTrade` (TP1/TP2 halves, BE after TP1, measured spread). Window 2024-10-10 → 2026-10-09T06:00 (WTI history = the live rule).
- **Split:** the gate's 8 regime folds — TRAIN = folds 0-4, OOS = folds 5-7.
- **Cells:** K = 2 (F-DXY15, F-FRESH), BUY trades.
- **HELPS** ⇔ all of these hold:
  - OOS mean $ / trade of the KEPT trades − all BUY trades ≥ +$0.50;
  - the bootstrap LB of that difference at α/2 > 0;
  - the same sign in TRAIN;
  - kept OOS n ≥ 100.
- **Reported:**
  - the SKIPPED trades' own $ / trade and WR;
  - both filters together;
  - the share of BUYs each filter removes.

Study: `scripts/study_matrix_dxy_context.mjs` → `data/master/matrix_dxy_context_study.json`.
