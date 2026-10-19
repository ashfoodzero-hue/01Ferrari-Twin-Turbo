# Matrix SCALP — veto a gold BUY when DXY's own Matrix BUY fires at the same time (pre-registered 2026-10-19, before any number)

**Request (Ashraf, 2026-10-19):** "it shows that DXY is triggered for buy at the same time XAU does, so we triggered buy as well … we have the exact setup we have for XAU for DXY and that should not trigger the trade if it is true at the same time until we know which is fake … we must confirm the next move for both".

**Facts that started it (2026-10-19 journal):** 8 SCALP BUYs, 2 wins (+$12.11, +$4.69), 6 stop-losses; about −$8.40/oz. Every one passed the existing DXY check (DXY 3m close < EMA10). The app never computed the Matrix setup ON DXY; TradingView's DX1! chart (same script) showed "Direct Long".

**Earlier DXY tests (not repeated):** loss autopsy §7 (bs) (DXY EMA distance, fresh flip, 15m / 1h trend) and §7 (br) (DXY 15m trend, fresh flip) — none helped. None used DXY's OWN walls.

## Definitions

- **XAU BUY:** the live rule, `ferrariMatrix.matrixSignals(goldBars3m, dxy3m, wti1m)`, side BUY.
- **DXY BUY (same setup on DXY):** `matrixSignals(dxy3m, dxy3m, wti1m)`, side BUY: DXY low at its own floor / internal wall + cushion, WTI 1h as delivered NOT bullish, DXY close ≤ its EMA10, DXY green candle. (On DX1! the script's "DXY" series is DXY itself.) DXY = gold-grid DXY rebuilt from the 6 pairs (same 3m buckets as gold).
- **Conflict:** a DXY BUY whose decision time is within W before or at the XAU BUY's decision time.

## Cells (K = 2)

- **V0:** W = 0 (the same 3m candle).
- **V15:** W = 15 min (the same candle or the 5 before).

## Trades and windows

- The live money path: `scripts/lib/matrix_trades.mjs` (one trade at a time, measured spread, `resolveMatrixTrade`). The veto removes signals BEFORE sequencing (the freed time can take the next signal, as live would).
- **Primary:** 2024-10-10 → 2026-10-16 with WTI (the live rule), TRAIN = first 60 % of time, OOS = last 40 %.
- **Robustness:** 13 y without WTI (2013-07-21 →), same split.

## Pass rule (all must hold)

1. OOS: vetoed BUYs ≥ 30.
2. Vetoed BUYs lose more than kept BUYs ($/trade) in TRAIN AND OOS.
3. Filtered book $/trade > baseline $/trade in TRAIN AND OOS.
4. Robustness 13 y: (2) and (3) hold in sign.

A pass becomes a SCALP rule ("DXY BUY conflict → no trade"); the SCALP itself stays SHADOW until its own money is positive (§7 (bt)). A fail = the conflict is not the reason, and nothing is wired.

Study: `scripts/study_matrix_dxy_conflict.mjs` → `data/master/matrix_dxy_conflict_study.json`.
