# Why DXY (TradingView ICE session) made its waves — the reasons at every 1D / 4H swing (last year)

Generated from `data/master/dxy_ice_swing_reasons.json` (2026-10-18T16:59:42.683Z). Checklist + rules: `docs/SWING_REASONS_CHECKLIST_SPEC.md`. Every row: `docs/swing_book/dxy_ice_reasons/1D.csv`, `4H.csv`. Candle session: dxyIce. Partner (items 22 / 23): Gold.

Window 2025-10-16 → 2026-10-16. Swings: ZigZag 3 × ATR(14), TradingView-exact candles (reopen spikes clamped). Each reason is checked at the swing candle ± 1 candle with only what was published by then.

**How to read this:** "at swings" vs "at random candles" (same timeframe, same hour). A reason counts as a candidate driver only if it is clearly MORE frequent at swings than at ordinary candles. Present ≠ caused it; 13 daily and 80 4H swings describe, they cannot prove.

## 1D: how often each reason was present — at 10 swings vs 30 random candles

| Reason | At swings | At random candles | Swings checked | p (Holm) | Reading |
|---|---|---|---|---|---|
| 14 Risk-off (yen / BTC) | 50 % | 17 % | 10 | 1.000 | more frequent at swings (p < 0.05, not significant after correction) |
| 28 Liquidity sweep | 60 % | 30 % | 10 | 1.000 | tendency at swings, not significant (small sample) |
| 8 Growth data | 80 % | 63 % | 10 | 1.000 | tendency at swings, not significant (small sample) |
| 32 Overextended | 30 % | 13 % | 10 | 1.000 | tendency at swings, not significant (small sample) |
| 29 Round number | 60 % | 47 % | 10 | 1.000 | uninformative on daily (a $50 level is almost always within 0.25 ATR) |
| 13 Fiscal headline ◐ | 11 % | 0 % | 9 | 1.000 | tendency at swings, not significant (small sample) |
| 23 Gold diverges | 20 % | 10 % | 10 | 1.000 | tendency at swings, not significant (small sample) |
| 33 Climax candle | 10 % | 0 % | 10 | 1.000 | tendency at swings, not significant (small sample) |
| 37 Quarter end | 10 % | 0 % | 10 | 1.000 | tendency at swings, not significant (small sample) |
| 27 Prior swing level | 20 % | 13 % | 10 | 1.000 | about the same as ordinary candles |
| 31 RSI divergence | 10 % | 3 % | 10 | 1.000 | about the same as ordinary candles |
| 7 Jobs data | 90 % | 87 % | 10 | 1.000 | about the same as ordinary candles |
| 2 10y yield move ≥ 5 bp | 20 % | 17 % | 10 | 1.000 | about the same as ordinary candles |
| 16 Yuan weak ◐ | 10 % | 7 % | 10 | 1.000 | about the same as ordinary candles |
| 5 Fed speech | 60 % | 60 % | 10 | 1.000 | about the same as ordinary candles |
| 22 Gold confirms | 0 % | 0 % | 10 | 1.000 | about the same as ordinary candles |
| 37 Week open | 0 % | 0 % | 10 | 1.000 | about the same as ordinary candles |
| 38 Options expiry ◐ | 10 % | 10 % | 10 | 1.000 | about the same as ordinary candles |
| 12 Tariff headline ◐ | 11 % | 12 % | 9 | 1.000 | about the same as ordinary candles |
| 11 War headline ◐ | 22 % | 23 % | 9 | 1.000 | about the same as ordinary candles |
| 17 Rupee weak ◐ | 30 % | 31 % | 10 | 1.000 | about the same as ordinary candles |
| 6 Inflation data | 30 % | 33 % | 10 | 1.000 | about the same as ordinary candles |
| 24 Oil shock ≥ 3 % | 50 % | 53 % | 10 | 1.000 | about the same as ordinary candles |
| 9 Other high-impact USD | 40 % | 47 % | 10 | 1.000 | about the same as ordinary candles |
| 10 Holiday / thin | 10 % | 17 % | 10 | 1.000 | about the same as ordinary candles |
| 15 EM stress (TRY / ZAR) | 10 % | 17 % | 10 | 1.000 | about the same as ordinary candles |
| 4 FOMC | 10 % | 20 % | 10 | 1.000 | tendency against, not significant |
| 37 Month end | 10 % | 20 % | 10 | 1.000 | tendency against, not significant |
| 30 Prev day / week extreme | 40 % | 53 % | 10 | 1.000 | tendency against, not significant |

- **34 Higher-timeframe leg (1W) at the turn:** with 6 · against 4
- **35 Lower timeframes already turned at the same price** (of 3): 3 10
- **No data (never guessed):** 18 central-bank buying · 20 COT positioning · 21 stocks / VIX.

### 1D: every swing and the reasons present

**HIGH 100.38 — 2025-11-21** (leg 9.41 ATR)

- 5 Fed speech: Governor Lisa D. Cook speaks; Governor Michael S. Barr speaks; Vice Chair Philip N. Jefferson speaks
- 7 Jobs data: Non-Farm Employment Change USD+; Unemployment Claims USD+; Unemployment Rate USD−
- 8 Growth data: Flash Manufacturing PMI inline; Flash Services PMI USD+
- 9 Other high-impact USD: Average Hourly Earnings m/m
- 17 Rupee weak ◐
- 28 Liquidity sweep
- 30 Prev day / week extreme
- 32 Overextended
- DXY — · 10y yield -3 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3

**LOW 97.75 — 2025-12-24** (leg 6.87 ATR)

- 7 Jobs data: ADP Weekly Employment Change inline; Unemployment Claims USD+
- 8 Growth data: Prelim GDP q/q USD+; Core Durable Goods Orders m/m inline; Durable Goods Orders m/m USD−; Prelim GDP Price Index q/q USD+
- 10 Holiday / thin
- 28 Liquidity sweep
- 30 Prev day / week extreme
- DXY — · 10y yield 1 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3

**HIGH 99.48 — 2026-01-15** (leg 3.59 ATR)

- 5 Fed speech: Governor Stephen I. Miran speaks; Vice Chair for Supervision Michelle W. Bowman speaks; Vice Chair Philip N. Jefferson speaks
- 6 Inflation data: Core PPI m/m inline; PPI m/m inline; Core PPI m/m USD−; PPI m/m inline
- 7 Jobs data: Unemployment Claims USD+
- 8 Growth data: Core Retail Sales m/m USD+; Retail Sales m/m USD+
- 14 Risk-off (yen / BTC)
- 29 Round number
- DXY — · 10y yield -3 bp · CME volume ×— · 1W leg against · lower TFs turned 3/3

**LOW 95.56 — 2026-01-27** (leg 6.12 ATR)

- 4 FOMC
- 8 Growth data: Core Durable Goods Orders m/m USD+; Durable Goods Orders m/m USD+
- 9 Other high-impact USD: Federal Funds Rate; FOMC Statement; FOMC Press Conference
- 11 War headline ◐
- 12 Tariff headline ◐
- 13 Fiscal headline ◐
- 14 Risk-off (yen / BTC)
- 17 Rupee weak ◐
- 23 Gold diverges
- 24 Oil shock ≥ 3 %
- 29 Round number
- 32 Overextended
- 33 Climax candle
- 38 Options expiry ◐
- DXY — · 10y yield -2 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3

**HIGH 100.64 — 2026-03-30** (leg 7.47 ATR)

- 2 10y yield move ≥ 5 bp
- 5 Fed speech: Governor Michael S. Barr speaks; Vice Chair for Supervision Michelle W. Bowman speaks
- 7 Jobs data: JOLTS Job Openings inline; ADP Non-Farm Employment Change USD+
- 8 Growth data: Core Retail Sales m/m USD+; Retail Sales m/m USD+; ISM Manufacturing PMI USD+; ISM Manufacturing Prices USD+
- 9 Other high-impact USD: FOMC Member Powell Speaks
- 11 War headline ◐
- 14 Risk-off (yen / BTC)
- 28 Liquidity sweep
- 29 Round number
- 30 Prev day / week extreme
- 31 RSI divergence
- 37 Month end
- 37 Quarter end
- DXY — · 10y yield -9 bp · CME volume ×— · 1W leg against · lower TFs turned 3/3

**LOW 97.63 — 2026-05-05** (leg 6.16 ATR)

- 5 Fed speech: Vice Chair for Supervision Michelle W. Bowman speaks
- 7 Jobs data: JOLTS Job Openings inline; ADP Non-Farm Employment Change USD−
- 8 Growth data: ISM Services PMI inline
- 24 Oil shock ≥ 3 %
- 27 Prior swing level
- 29 Round number
- 30 Prev day / week extreme
- DXY — · 10y yield -2 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3

**HIGH 101.81 — 2026-06-23** (leg 8.36 ATR)

- 5 Fed speech: Governor Lisa D. Cook speaks
- 6 Inflation data: Core PCE Price Index m/m inline
- 7 Jobs data: Unemployment Claims USD+
- 8 Growth data: Flash Manufacturing PMI USD+; Flash Services PMI inline; Final GDP q/q USD+; Final GDP Price Index q/q inline
- 14 Risk-off (yen / BTC)
- 16 Yuan weak ◐
- 23 Gold diverges
- 24 Oil shock ≥ 3 %
- 32 Overextended
- DXY — · 10y yield -1 bp · CME volume ×— · 1W leg against · lower TFs turned 3/3

**LOW 98.56 — 2026-08-19** (leg 7.87 ATR)

- 2 10y yield move ≥ 5 bp
- 7 Jobs data: Unemployment Claims inline
- 9 Other high-impact USD: FOMC Meeting Minutes
- 28 Liquidity sweep
- 29 Round number
- DXY — · 10y yield -6 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3

**HIGH 99.86 — 2026-09-01** (leg 3.13 ATR)

- 5 Fed speech: Governor Michael S. Barr speaks; Governor Christopher J. Waller speaks
- 7 Jobs data: JOLTS Job Openings inline; ADP Non-Farm Employment Change USD−; Unemployment Claims inline
- 8 Growth data: ISM Manufacturing PMI USD−; ISM Manufacturing Prices USD+; ISM Services PMI USD+
- 14 Risk-off (yen / BTC)
- 24 Oil shock ≥ 3 %
- 28 Liquidity sweep
- DXY — · 10y yield 4 bp · CME volume ×— · 1W leg against · lower TFs turned 3/3

**LOW 98.6 — 2026-09-08** (leg 2.8 ATR)

- 6 Inflation data: Core PPI m/m USD−; PPI m/m inline
- 7 Jobs data: Unemployment Claims inline
- 15 EM stress (TRY / ZAR)
- 17 Rupee weak ◐
- 24 Oil shock ≥ 3 %
- 27 Prior swing level
- 28 Liquidity sweep
- 29 Round number
- DXY — · 10y yield 2 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3


## 4H: how often each reason was present — at 82 swings vs 246 random candles

| Reason | At swings | At random candles | Swings checked | p (Holm) | Reading |
|---|---|---|---|---|---|
| 28 Liquidity sweep | 61 % | 24 % | 82 | 0.000 | **MORE frequent at swings (significant after correction)** |
| 23 Gold diverges | 35 % | 12 % | 82 | 0.000 | **MORE frequent at swings (significant after correction)** |
| 33 Climax candle | 24 % | 6 % | 82 | 0.000 | **MORE frequent at swings (significant after correction)** |
| 31 RSI divergence | 18 % | 5 % | 82 | 0.002 | **MORE frequent at swings (significant after correction)** |
| 14 Risk-off (yen / BTC) | 15 % | 5 % | 82 | 0.045 | **MORE frequent at swings (significant after correction)** |
| 7 Jobs data | 27 % | 18 % | 82 | 1.000 | about the same as ordinary candles |
| 27 Prior swing level | 22 % | 15 % | 82 | 1.000 | about the same as ordinary candles |
| 12 Tariff headline ◐ | 10 % | 3 % | 41 | 1.000 | about the same as ordinary candles |
| 32 Overextended | 21 % | 17 % | 82 | 1.000 | about the same as ordinary candles |
| 2 10y yield move ≥ 5 bp | 35 % | 31 % | 81 | 1.000 | about the same as ordinary candles |
| 13 Fiscal headline ◐ | 2 % | 0 % | 41 | 1.000 | about the same as ordinary candles |
| 9 Other high-impact USD | 11 % | 9 % | 82 | 1.000 | about the same as ordinary candles |
| 8 Growth data | 16 % | 14 % | 82 | 1.000 | about the same as ordinary candles |
| 11 War headline ◐ | 22 % | 21 % | 41 | 1.000 | about the same as ordinary candles |
| 30 Prev day / week extreme | 17 % | 16 % | 82 | 1.000 | about the same as ordinary candles |
| 37 Week open | 2 % | 1 % | 82 | 1.000 | about the same as ordinary candles |
| 38 Options expiry ◐ | 6 % | 6 % | 82 | 1.000 | about the same as ordinary candles |
| 24 Oil shock ≥ 3 % | 17 % | 17 % | 81 | 1.000 | about the same as ordinary candles |
| 16 Yuan weak ◐ | 1 % | 1 % | 79 | 1.000 | about the same as ordinary candles |
| 37 Quarter end | 4 % | 4 % | 82 | 1.000 | about the same as ordinary candles |
| 37 Month end | 11 % | 12 % | 82 | 1.000 | about the same as ordinary candles |
| 5 Fed speech | 16 % | 17 % | 82 | 1.000 | about the same as ordinary candles |
| 29 Round number | 17 % | 18 % | 82 | 1.000 | about the same as ordinary candles |
| 4 FOMC | 1 % | 2 % | 82 | 1.000 | about the same as ordinary candles |
| 15 EM stress (TRY / ZAR) | 3 % | 4 % | 79 | 1.000 | about the same as ordinary candles |
| 17 Rupee weak ◐ | 10 % | 12 % | 79 | 1.000 | about the same as ordinary candles |
| 6 Inflation data | 6 % | 9 % | 82 | 1.000 | about the same as ordinary candles |
| 10 Holiday / thin | 0 % | 3 % | 82 | 1.000 | about the same as ordinary candles |
| 22 Gold confirms | 4 % | 7 % | 82 | 1.000 | about the same as ordinary candles |

- **34 Higher-timeframe leg (1D) at the turn:** with 39 · against 43
- **35 Lower timeframes already turned at the same price** (of 3): 2 5 · 3 77
- **36 Session of the swing candle:** ASIA 21 · LONDON 34 · NEWYORK 27
- **No data (never guessed):** 18 central-bank buying · 20 COT positioning · 21 stocks / VIX.

### 4H: every swing and the reasons present

| Swing | Candle (UTC) | Price | Leg ATR | Reasons present (numbers from the list) | 1D leg | Session |
|---|---|---|---|---|---|---|
| LOW | 2025-10-17 03:00 | 98.04 | 7.8 | 2, 23, 29 | with | ASIA |
| HIGH | 2025-10-23 11:00 | 99.14 | 7.5 | 5, 28, 30 | against | LONDON |
| LOW | 2025-10-28 03:00 | 98.56 | 2.94 | 12, 14, 22, 28, 37, 38 | with | ASIA |
| HIGH | 2025-11-05 12:00 | 100.35 | 11.66 | 7, 8, 23, 32 | against | LONDON |
| LOW | 2025-11-13 16:00 | 98.99 | 8.38 | 2, 28, 29 | with | NEWYORK |
| HIGH | 2025-11-21 12:00 | 100.38 | 7.89 | 5, 8, 17, 27, 28, 30, 31 | against | LONDON |
| LOW | 2025-12-01 10:00 | 99.01 | 8.53 | 2, 8, 27, 29 | with | LONDON |
| HIGH | 2025-12-02 16:00 | 99.56 | 3.42 | 2, 27, 28 | with | NEWYORK |
| LOW | 2025-12-04 12:00 | 98.77 | 5.44 | 7, 27, 28, 31, 32 | against | LONDON |
| HIGH | 2025-12-09 16:00 | 99.31 | 3.4 | 7, 12, 28 | with | NEWYORK |
| LOW | 2025-12-16 12:00 | 97.87 | 8.41 | 7, 8, 9, 23, 32, 33 | against | LONDON |
| HIGH | 2025-12-19 12:00 | 98.75 | 5.39 | 28 | with | LONDON |
| LOW | 2025-12-24 00:00 | 97.75 | 6.79 | 17, 23, 28, 31 | against | ASIA |
| HIGH | 2026-01-05 10:00 | 98.86 | 5.87 | 8, 14, 28 | with | LONDON |
| LOW | 2026-01-06 04:00 | 98.16 | 4.07 | 28 | against | ASIA |
| HIGH | 2026-01-09 12:00 | 99.26 | 6.45 | 7, 9, 33 | against | LONDON |
| LOW | 2026-01-12 10:00 | 98.68 | 3.64 | 28 | with | LONDON |
| HIGH | 2026-01-15 12:00 | 99.48 | 5.26 | 7, 29, 31, 33 | against | LONDON |
| LOW | 2026-01-27 20:00 | 95.56 | 13.02 | 11, 12, 13, 23, 29, 32, 33, 38 | against | NEWYORK |
| HIGH | 2026-02-06 00:00 | 98.02 | 12.97 | 2, 17, 28, 29, 30, 32 | against | ASIA |
| LOW | 2026-02-11 04:00 | 96.49 | 6.78 | 2, 14, 29 | with | ASIA |
| HIGH | 2026-02-20 08:00 | 98.07 | 7.67 | 6, 8, 28, 30, 32 | against | LONDON |
| LOW | 2026-02-22 22:00 | 97.36 | 3.7 | 2, 37 | with | NEWYORK |
| HIGH | 2026-03-03 12:00 | 99.66 | 7.46 | 2, 5, 15, 28, 32, 33 | against | LONDON |
| LOW | 2026-03-04 20:00 | 98.62 | 3.23 | 24, 27, 28 | with | NEWYORK |
| HIGH | 2026-03-09 01:00 | 99.69 | 3.35 | 15, 16, 17, 23, 24, 27, 28, 30, 31 | against | ASIA |
| LOW | 2026-03-10 15:00 | 98.5 | 4.4 | 11, 23, 28, 29 | with | NEWYORK |
| HIGH | 2026-03-13 19:00 | 100.54 | 8.4 | 2, 23, 29, 32 | against | NEWYORK |
| LOW | 2026-03-18 03:00 | 99.47 | 4.38 | 11, 17, 28, 29, 30 | with | ASIA |
| HIGH | 2026-03-18 19:00 | 100.31 | 2.93 | 4, 9, 11, 27 | against | NEWYORK |
| LOW | 2026-03-19 19:00 | 98.98 | 4.97 | 2, 11, 28, 29 | with | NEWYORK |
| HIGH | 2026-03-23 09:00 | 100.15 | 3.48 | 2, 11, 24, 28, 33 | against | LONDON |
| LOW | 2026-03-23 13:00 | 98.88 | 4.81 | 2, 11, 14, 24, 28, 31 | with | NEWYORK |
| HIGH | 2026-03-30 23:00 | 100.64 | 7.26 | 2, 28, 30, 37, 37 | against | ASIA |
| LOW | 2026-04-01 15:00 | 99.31 | 5.01 | 2, 7, 8, 28 | with | NEWYORK |
| HIGH | 2026-04-06 01:00 | 100.27 | 4.26 | 27, 28, 30 | against | ASIA |
| LOW | 2026-04-17 11:00 | 97.63 | 13.49 | 5, 11, 14, 23, 24, 32, 33 | against | LONDON |
| HIGH | 2026-04-23 15:00 | 98.94 | 8.07 | 7, 8, 24, 28, 33 | with | NEWYORK |
| LOW | 2026-04-27 09:00 | 98.22 | 4.46 | 28, 37, 38 | against | LONDON |
| HIGH | 2026-04-30 03:00 | 99.09 | 4.51 | 2, 14, 23, 28, 37 | with | ASIA |
| LOW | 2026-05-01 11:00 | 97.72 | 6.35 | 5, 8, 24, 27 | against | LONDON |
| HIGH | 2026-05-05 03:00 | 98.58 | 4.36 | 2, 28, 30 | with | ASIA |
| LOW | 2026-05-06 07:00 | 97.63 | 4.73 | 7, 14, 23, 24, 27, 33 | against | LONDON |
| HIGH | 2026-05-21 11:00 | 99.52 | 10.47 | 2, 7, 8, 12, 23, 27, 29, 32 | against | LONDON |
| LOW | 2026-05-25 21:00 | 98.78 | 4.92 | 2, 28 | with | NEWYORK |
| HIGH | 2026-05-28 03:00 | 99.55 | 4.8 | 5, 23, 27, 28, 30, 31, 37 | against | ASIA |
| LOW | 2026-05-29 15:00 | 98.75 | 5.06 | 5, 27, 28, 37 | with | NEWYORK |
| HIGH | 2026-06-08 09:00 | 100.21 | 8.37 | 17, 23, 24, 27, 28, 31 | against | LONDON |
| LOW | 2026-06-09 11:00 | 99.68 | 3.08 | 28 | with | LONDON |
| HIGH | 2026-06-11 15:00 | 100.31 | 3.12 | 6, 7, 11, 23, 24, 28, 31, 33 | against | NEWYORK |
| LOW | 2026-06-15 05:00 | 99.39 | 5.41 | 23, 28 | with | ASIA |
| HIGH | 2026-06-24 11:00 | 101.81 | 13.7 | 5, 14, 23, 24, 32 | against | LONDON |
| LOW | 2026-06-26 11:00 | 101.05 | 4.35 | 28 | with | LONDON |
| HIGH | 2026-07-01 11:00 | 101.6 | 3.05 | 2, 7, 8, 9, 17, 28, 33 | against | LONDON |
| LOW | 2026-07-02 11:00 | 100.56 | 5.81 | 7, 9, 14, 23, 33 | with | LONDON |
| HIGH | 2026-07-08 15:00 | 101.27 | 4.18 | 2, 9, 28, 33 | against | NEWYORK |
| LOW | 2026-07-09 23:00 | 100.61 | 3.88 | 33 | with | ASIA |
| HIGH | 2026-07-13 17:00 | 101.33 | 3.58 | 2, 5, 17, 23, 24 | against | NEWYORK |
| LOW | 2026-07-15 15:00 | 100.36 | 6.25 | 5, 6, 9, 31, 33 | with | NEWYORK |
| HIGH | 2026-07-28 07:00 | 101.64 | 7.37 | 23, 32, 37, 38 | against | LONDON |
| LOW | 2026-08-02 21:00 | 99.42 | 10.48 | 2, 14, 23, 24, 27, 32, 37 | against | NEWYORK |
| HIGH | 2026-08-04 03:00 | 100.06 | 4.07 | 2, 28, 30 | with | ASIA |
| LOW | 2026-08-07 11:00 | 99.41 | 4.83 | 2, 7, 9, 14, 23, 27, 31, 32, 33 | against | LONDON |
| HIGH | 2026-08-13 03:00 | 100.08 | 5.54 | 22, 27, 30 | with | ASIA |
| LOW | 2026-08-17 05:00 | 99.29 | 6.07 | 23 | against | ASIA |
| HIGH | 2026-08-18 03:00 | 99.69 | 2.38 | 22, 30 | with | ASIA |
| LOW | 2026-08-20 07:00 | 98.56 | 7.57 | 2, 7, 23, 32 | against | LONDON |
| HIGH | 2026-08-27 11:00 | 99.26 | 5.37 | 7, 24, 28 | with | LONDON |
| LOW | 2026-08-27 19:00 | 98.86 | 3.29 | 28, 30, 33 | against | NEWYORK |
| HIGH | 2026-09-02 07:00 | 99.86 | 6.83 | 7, 14, 23 | with | LONDON |
| LOW | 2026-09-03 15:00 | 98.83 | 6.34 | 5, 7, 8, 27 | with | NEWYORK |
| HIGH | 2026-09-04 11:00 | 99.37 | 3.36 | 7, 9, 33 | against | LONDON |
| LOW | 2026-09-09 11:00 | 98.6 | 4.84 | 28, 31 | with | LONDON |
| HIGH | 2026-09-24 15:00 | 101.4 | 16.62 | 2, 7, 23, 28, 32 | against | NEWYORK |
| LOW | 2026-09-25 15:00 | 100.87 | 3.46 | 2, 28, 38 | with | NEWYORK |
| HIGH | 2026-09-29 15:00 | 101.6 | 4.19 | 2, 5, 7, 23, 28, 31, 37, 37 | against | NEWYORK |
| LOW | 2026-09-30 11:00 | 101.03 | 3.33 | 6, 7, 8, 28, 29, 37, 37 | with | LONDON |
| HIGH | 2026-10-05 01:00 | 102.52 | 6.69 | 23, 29, 32, 33 | against | ASIA |
| LOW | 2026-10-06 11:00 | 101.76 | 3.76 | 5 | with | LONDON |
| HIGH | 2026-10-12 17:00 | 102.61 | 5.6 | 28, 31 | against | NEWYORK |
| LOW | 2026-10-14 03:00 | 102.08 | 2.87 | 28 | with | ASIA |
| HIGH | 2026-10-14 15:00 | 102.94 | 3.78 | 6, 23, 28, 31, 33 | against | NEWYORK |

