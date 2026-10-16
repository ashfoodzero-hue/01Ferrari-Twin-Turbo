# WALL SCALP at defended levels — 4H candle levels + swing levels, money test (pre-registered 2026-10-16)

**Request (Ashraf):** "check how can we take a small scalp on cases like 4193, specially it is 4H candle resistance/support levels — most of the time those levels work for a small scalp and sometimes it continues for more than 100 pips".

**Standing red line:** SCALP WR ≥ 85 % AND positive money.

## Levels (5 variants, the same test engine `swingWallEvents` — touch, defence, push, decision at touch + 2)

| Variant | Levels |
|---|---|
| **C4H** | every closed NY 4H candle's HIGH (a ceiling) and LOW (a floor), usable from the candle's close, removed when a 1m close goes beyond. These are the "4H candle resistance/support". |
| **S4H** | confirmed 4H pivots, 3 bars each side |
| **S1H** | confirmed 1H pivots, 5/5 |
| **S15** | confirmed 15m pivots, 5/5 |
| **S3** | confirmed 3m pivots, 5/5 (the chart's H/L) |

## Trade (only the strongest bubbles: DEF>PUSH or STRONG — each variant's own TRAIN p66)

- **Side:** a ceiling → SELL at the bid; a floor → BUY at the ask.
- **Entry:** market at the decision close; the spread comes from the measured spread model.
- **Stop:** wall ± 3 bins (one bin beyond the hold rule's break line).
  - The stop is hit when the ask (SELL) / bid (BUY) reaches it.
  - Stop first inside a minute.
  - Slippage min($0.30, 0.15 × ATR14 1m).
- **Exits (3):**
  - **T4:** target $4 (40 pips);
  - **T10:** target $10 (100 pips);
  - **SPLIT:** half at $4, then the stop moves to entry and the other half runs to $10.
- **Horizon:** 4 h, then a market exit. One position at a time per variant.

## Cells and verdict

- **Cells:** K = 15 (5 variants × 3 exits).
- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00.
- **WR** = trades with net > 0 / all trades.
- **PASS** ⇔ all of these hold:
  - OOS n ≥ 100;
  - **OOS WR ≥ 0.85** with Wilson LB at z(α/K) ≥ 0.80;
  - OOS mean $ / trade > 0 with bootstrap LB at α/K > 0;
  - TRAIN mean > 0.
- **Reported:**
  - trades / day;
  - the share of trades whose price reached +$10 (100 pips) within 4 h (the "continues more than 100 pips" claim);
  - by side;
  - pre/post 2020.

Study: `scripts/study_wall_scalp.mjs` → `data/master/wall_scalp_study.json`.
