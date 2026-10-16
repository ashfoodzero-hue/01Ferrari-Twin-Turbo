# Matrix SCALP BUY loss autopsy — which pre-trigger facts separate losers from winners? (pre-registered 2026-10-16)

**Request (Ashraf):** "please do this study very well to avoid similar future trades" (after the 12:24 SCALP BUY stop-out and study (br)).

**Trades.** The Matrix BUY trade sequence (`scripts/lib/matrix_trades.mjs`, the live rule with WTI as delivered, the money path `resolveMatrixTrade`). Window 2024-10-10 → 2026-10-09T06:00. TRAIN = gate folds 0-4, OOS = folds 5-7.

## Facts known BEFORE the trigger (at the signal bar's close, closed bars only)

| # | Fact | Bins |
|---|---|---|
| 1 | DXY 3m distance from EMA10, in DXY 3m ATR | terciles |
| 2 | DXY 3m flipped below EMA10 ON the signal bar (fresh) | yes / no |
| 3 | DXY 15m close vs EMA10 | up / down |
| 4 | DXY 1h close vs EMA10 | up / down |
| 5 | WTI context fresh (not true on the previous bar) | yes / no |
| 6 | Silver 3m close vs EMA10 | up / down |
| 7 | Silver 15m close vs EMA10 | up / down |
| 8 | Gold 15m close vs EMA20 | up / down |
| 9 | Gold 1h close vs EMA20 | up / down |
| 10 | Depth below the buy wall (buyDist, ATR) | terciles |
| 11 | Gold 3m ATR14 percentile over the prior 5 days | terciles |
| 12 | Session (UTC) | Asia 22-07 / London 07-12 / NY 12-17 / late 17-22 |
| 13 | Market state (15m, `readMarketState`) | DISCOUNT / EQUILIBRIUM / PREMIUM / trend-breakout |
| 14 | 4H Macro Magnet long score (last closed NY 4H) | ≥ 65 / 35-64 / ≤ 34 |
| 15 | Trigger-candle body / ATR | terciles |

Tercile cut-offs come from TRAIN only.

## Selection (TRAIN only — fixed before looking at OOS)

1. For each fact, the KEEP rule = its bins whose TRAIN mean $ / trade > the TRAIN overall mean (at least 1 bin dropped; kept share ≥ 30 %).
2. Rank the facts by TRAIN gain (kept mean − overall mean). Take the top 3.

## OOS test (once)

- **Cells (K = 4):** top-1, top-2, top-3 rules alone, and top-1 AND top-2.
- **Gain** = OOS kept mean − OOS all-BUY mean; bootstrap LB at α/4.
- **AVOIDS LOSERS** ⇔ gain ≥ +$0.50 AND LB > 0 AND kept OOS n ≥ 100.
- **PROFITABLE** (stronger) ⇔ additionally the OOS kept mean > 0 with its bootstrap LB > 0.
- **Reported:** every fact's TRAIN and OOS bin table, so a fact that looks good in TRAIN but flips in OOS is visible.

Study: `scripts/study_matrix_loss_autopsy.mjs` → `data/master/matrix_loss_autopsy.json`.
