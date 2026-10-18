# Why crude oil (WTI) made its waves — the reasons at every 1D / 4H swing (last year)

Generated from `data/master/wti_swing_reasons.json` (2026-10-18T16:55:56.563Z). Checklist + rules: `docs/SWING_REASONS_CHECKLIST_SPEC.md`. Every row: `docs/swing_book/wti_reasons/1D.csv`, `4H.csv`. Candle session: cme. Partner (items 22 / 23): Gold.

Window 2025-10-16 → 2026-10-16. Swings: ZigZag 3 × ATR(14), TradingView-exact candles (reopen spikes clamped). Each reason is checked at the swing candle ± 1 candle with only what was published by then.

**How to read this:** "at swings" vs "at random candles" (same timeframe, same hour). A reason counts as a candidate driver only if it is clearly MORE frequent at swings than at ordinary candles. Present ≠ caused it; 13 daily and 80 4H swings describe, they cannot prove.

## 1D: how often each reason was present — at 13 swings vs 39 random candles

| Reason | At swings | At random candles | Swings checked | p (Holm) | Reading |
|---|---|---|---|---|---|
| 28 Liquidity sweep | 62 % | 21 % | 13 | 0.171 | more frequent at swings (p < 0.05, not significant after correction) |
| 5 Fed speech | 69 % | 51 % | 13 | 1.000 | tendency at swings, not significant (small sample) |
| 32 Overextended | 23 % | 8 % | 13 | 1.000 | tendency at swings, not significant (small sample) |
| 23 Gold diverges | 15 % | 0 % | 13 | 0.375 | more frequent at swings (p < 0.05, not significant after correction) |
| 33 Climax candle | 15 % | 0 % | 13 | 0.375 | more frequent at swings (p < 0.05, not significant after correction) |
| 8 Growth data | 69 % | 54 % | 13 | 1.000 | tendency at swings, not significant (small sample) |
| 9 Other high-impact USD | 54 % | 41 % | 13 | 1.000 | tendency at swings, not significant (small sample) |
| 11 War headline ◐ | 36 % | 27 % | 11 | 1.000 | about the same as ordinary candles |
| 27 Prior swing level | 15 % | 8 % | 13 | 1.000 | about the same as ordinary candles |
| 12 Tariff headline ◐ | 9 % | 3 % | 11 | 1.000 | about the same as ordinary candles |
| 31 RSI divergence | 8 % | 3 % | 13 | 1.000 | about the same as ordinary candles |
| 15 EM stress (TRY / ZAR) | 15 % | 12 % | 13 | 1.000 | about the same as ordinary candles |
| 4 FOMC | 15 % | 15 % | 13 | 1.000 | about the same as ordinary candles |
| 13 Fiscal headline ◐ | 0 % | 0 % | 11 | 1.000 | about the same as ordinary candles |
| 25 CME volume ≥ 2× | 0 % | 0 % | 11 | 1.000 | about the same as ordinary candles |
| 10 Holiday / thin | 15 % | 18 % | 13 | 1.000 | about the same as ordinary candles |
| 37 Week open | 15 % | 18 % | 13 | 1.000 | about the same as ordinary candles |
| 37 Month end | 8 % | 10 % | 13 | 1.000 | about the same as ordinary candles |
| 22 Gold confirms | 0 % | 3 % | 13 | 1.000 | about the same as ordinary candles |
| 37 Quarter end | 0 % | 5 % | 13 | 1.000 | about the same as ordinary candles |
| 38 Options expiry ◐ | 0 % | 5 % | 13 | 1.000 | about the same as ordinary candles |
| 16 Yuan weak ◐ | 0 % | 9 % | 13 | 1.000 | about the same as ordinary candles |
| 29 Round number | 39 % | 49 % | 13 | 1.000 | uninformative on daily (a $50 level is almost always within 0.25 ATR) |
| 1 DXY against gold | 23 % | 33 % | 13 | 1.000 | tendency against, not significant |
| 14 Risk-off (yen / BTC) | 15 % | 28 % | 13 | 1.000 | tendency against, not significant |
| 7 Jobs data | 54 % | 67 % | 13 | 1.000 | tendency against, not significant |
| 17 Rupee weak ◐ | 23 % | 36 % | 13 | 1.000 | tendency against, not significant |
| 2 10y yield move ≥ 5 bp | 15 % | 34 % | 13 | 1.000 | tendency against, not significant |
| 24 Oil shock ≥ 3 % | 31 % | 56 % | 13 | 1.000 | tendency against, not significant |
| 6 Inflation data | 23 % | 49 % | 13 | 1.000 | tendency against, not significant |
| 30 Prev day / week extreme | 31 % | 69 % | 13 | 0.403 | tendency against, not significant |

- **34 Higher-timeframe leg (1W) at the turn:** against 7 · with 6
- **35 Lower timeframes already turned at the same price** (of 3): 3 13
- **No data (never guessed):** 18 central-bank buying · 20 COT positioning · 21 stocks / VIX.

### 1D: every swing and the reasons present

**LOW 55.96 — 2025-10-19** (leg 5.89 ATR)

- 5 Fed speech: Governor Christopher J. Waller speaks
- 23 Gold diverges
- 28 Liquidity sweep
- 30 Prev day / week extreme
- 37 Week open
- DXY 0.65 % · 10y yield -2 bp · CME volume ×1.04 · 1W leg against · lower TFs turned 3/3

**HIGH 62.59 — 2025-10-23** (leg 4.19 ATR)

- 5 Fed speech: Governor Michael S. Barr speaks
- 6 Inflation data: Core CPI m/m USD−; Core CPI y/y USD−; CPI m/m USD−; CPI y/y USD−
- 8 Growth data: Flash Manufacturing PMI inline; Flash Services PMI USD+
- 12 Tariff headline ◐
- 28 Liquidity sweep
- 30 Prev day / week extreme
- DXY -0.06 % · 10y yield 4 bp · CME volume ×1.29 · 1W leg with · lower TFs turned 3/3

**LOW 54.89 — 2025-12-15** (leg 4.82 ATR)

- 5 Fed speech: Governor Stephen I. Miran speaks
- 7 Jobs data: ADP Weekly Employment Change inline; Non-Farm Employment Change inline; Non-Farm Employment Change USD+; Unemployment Rate USD−
- 8 Growth data: Core Retail Sales m/m USD+; Retail Sales m/m USD−; Flash Manufacturing PMI inline; Flash Services PMI USD−
- 9 Other high-impact USD: Average Hourly Earnings m/m
- 23 Gold diverges
- 27 Prior swing level
- 29 Round number
- 31 RSI divergence
- DXY -0.02 % · 10y yield -1 bp · CME volume ×0.78 · 1W leg against · lower TFs turned 3/3

**HIGH 119.48 — 2026-03-08** (leg 9.07 ATR)

- 7 Jobs data: Non-Farm Employment Change USD−; Unemployment Rate USD−
- 8 Growth data: Core Retail Sales m/m USD−; Retail Sales m/m USD+
- 9 Other high-impact USD: Average Hourly Earnings m/m
- 10 Holiday / thin
- 11 War headline ◐
- 17 Rupee weak ◐
- 24 Oil shock ≥ 3 %
- 28 Liquidity sweep
- 29 Round number
- 32 Overextended
- 33 Climax candle
- 37 Week open
- DXY -0.13 % · 10y yield -3 bp · CME volume ×— · 1W leg against · lower TFs turned 3/3

**LOW 76.73 — 2026-03-09** (leg 5.9 ATR)

- 6 Inflation data: Core CPI m/m inline; Core CPI y/y inline; CPI m/m inline; CPI y/y inline
- 11 War headline ◐
- 24 Oil shock ≥ 3 %
- 28 Liquidity sweep
- 33 Climax candle
- DXY -0.08 % · 10y yield -3 bp · CME volume ×— · 1W leg with · lower TFs turned 3/3

**HIGH 117.63 — 2026-04-06** (leg 4.81 ATR)

- 5 Fed speech: Vice Chair Philip N. Jefferson speaks
- 8 Growth data: ISM Services PMI USD−; Core Durable Goods Orders m/m USD+; Durable Goods Orders m/m USD−
- 9 Other high-impact USD: President Trump Speaks; FOMC Meeting Minutes
- 11 War headline ◐
- 14 Risk-off (yen / BTC)
- 24 Oil shock ≥ 3 %
- 27 Prior swing level
- 28 Liquidity sweep
- DXY -1.15 % · 10y yield -1 bp · CME volume ×1.05 · 1W leg against · lower TFs turned 3/3

**LOW 78.97 — 2026-04-16** (leg 5.45 ATR)

- 5 Fed speech: Governor Christopher J. Waller speaks
- 7 Jobs data: Unemployment Claims USD+
- 11 War headline ◐
- 29 Round number
- DXY 0.01 % · 10y yield 3 bp · CME volume ×1.16 · 1W leg with · lower TFs turned 3/3

**HIGH 110.93 — 2026-04-29** (leg 4.95 ATR)

- 2 10y yield move ≥ 5 bp
- 4 FOMC
- 5 Fed speech: Vice Chair for Supervision Michelle W. Bowman speaks
- 6 Inflation data: Core PCE Price Index m/m inline
- 7 Jobs data: Employment Cost Index q/q USD+; Unemployment Claims USD+
- 8 Growth data: Advance GDP q/q USD−; Advance GDP Price Index q/q USD−; ISM Manufacturing PMI USD−; ISM Manufacturing Prices USD+
- 9 Other high-impact USD: Federal Funds Rate; FOMC Statement; FOMC Press Conference
- 14 Risk-off (yen / BTC)
- 28 Liquidity sweep
- 29 Round number
- 37 Month end
- DXY -0.40 % · 10y yield 6 bp · CME volume ×1.12 · 1W leg with · lower TFs turned 3/3

**LOW 67.04 — 2026-07-01** (leg 11 ATR)

- 1 DXY against gold
- 5 Fed speech: Governor Christopher J. Waller speaks
- 7 Jobs data: ADP Non-Farm Employment Change USD−; Non-Farm Employment Change USD−; Unemployment Rate USD+; Unemployment Claims inline
- 8 Growth data: ISM Manufacturing PMI USD−; ISM Manufacturing Prices USD−; ISM Services PMI inline
- 9 Other high-impact USD: Fed Chairman Warsh Speaks; Average Hourly Earnings m/m
- 10 Holiday / thin
- 17 Rupee weak ◐
- 28 Liquidity sweep
- 30 Prev day / week extreme
- 32 Overextended
- DXY -0.31 % · 10y yield 4 bp · CME volume ×0.71 · 1W leg against · lower TFs turned 3/3

**HIGH 93.5 — 2026-07-22** (leg 5.82 ATR)

- 1 DXY against gold
- 7 Jobs data: Unemployment Claims USD+
- 15 EM stress (TRY / ZAR)
- 24 Oil shock ≥ 3 %
- DXY 0.28 % · 10y yield 4 bp · CME volume ×1.69 · 1W leg with · lower TFs turned 3/3

**LOW 74.24 — 2026-08-04** (leg 5.06 ATR)

- 2 10y yield move ≥ 5 bp
- 5 Fed speech: Governor Lisa D. Cook speaks
- 7 Jobs data: JOLTS Job Openings USD−; ADP Non-Farm Employment Change USD−; Unemployment Claims inline
- 8 Growth data: ISM Services PMI USD−
- 29 Round number
- 30 Prev day / week extreme
- DXY -0.02 % · 10y yield -7 bp · CME volume ×0.81 · 1W leg against · lower TFs turned 3/3

**HIGH 106.75 — 2026-09-14** (leg 7.18 ATR)

- 1 DXY against gold
- 4 FOMC
- 8 Growth data: Core Retail Sales m/m USD+; Retail Sales m/m USD+
- 9 Other high-impact USD: Federal Funds Rate; FOMC Economic Projections; FOMC Statement; FOMC Press Conference
- 15 EM stress (TRY / ZAR)
- 17 Rupee weak ◐
- 32 Overextended
- DXY 1.24 % · 10y yield 1 bp · CME volume ×1.18 · 1W leg against · lower TFs turned 3/3

**LOW 86.86 — 2026-10-05** (leg 4.91 ATR)

- 5 Fed speech: Vice Chair for Supervision Michelle W. Bowman speaks
- 8 Growth data: ISM Services PMI inline
- 9 Other high-impact USD: FOMC Meeting Minutes
- 28 Liquidity sweep
- DXY 0.36 % · 10y yield 3 bp · CME volume ×0.71 · 1W leg with · lower TFs turned 3/3


## 4H: how often each reason was present — at 75 swings vs 225 random candles

| Reason | At swings | At random candles | Swings checked | p (Holm) | Reading |
|---|---|---|---|---|---|
| 28 Liquidity sweep | 67 % | 24 % | 75 | 0.000 | **MORE frequent at swings (significant after correction)** |
| 23 Gold diverges | 24 % | 8 % | 75 | 0.004 | **MORE frequent at swings (significant after correction)** |
| 2 10y yield move ≥ 5 bp | 39 % | 24 % | 74 | 0.244 | more frequent at swings (p < 0.05, not significant after correction) |
| 25 CME volume ≥ 2× | 20 % | 5 % | 71 | 0.004 | **MORE frequent at swings (significant after correction)** |
| 32 Overextended | 24 % | 12 % | 75 | 0.305 | more frequent at swings (p < 0.05, not significant after correction) |
| 33 Climax candle | 19 % | 9 % | 75 | 0.730 | more frequent at swings (p < 0.05, not significant after correction) |
| 14 Risk-off (yen / BTC) | 12 % | 3 % | 75 | 0.084 | more frequent at swings (p < 0.05, not significant after correction) |
| 24 Oil shock ≥ 3 % | 16 % | 11 % | 75 | 1.000 | about the same as ordinary candles |
| 1 DXY against gold | 24 % | 19 % | 75 | 1.000 | about the same as ordinary candles |
| 37 Week open | 5 % | 1 % | 75 | 1.000 | more frequent at swings (p < 0.05, not significant after correction) |
| 5 Fed speech | 17 % | 13 % | 75 | 1.000 | about the same as ordinary candles |
| 22 Gold confirms | 11 % | 7 % | 75 | 1.000 | about the same as ordinary candles |
| 9 Other high-impact USD | 11 % | 8 % | 75 | 1.000 | about the same as ordinary candles |
| 16 Yuan weak ◐ | 4 % | 1 % | 75 | 1.000 | about the same as ordinary candles |
| 7 Jobs data | 25 % | 23 % | 75 | 1.000 | about the same as ordinary candles |
| 6 Inflation data | 11 % | 8 % | 75 | 1.000 | about the same as ordinary candles |
| 17 Rupee weak ◐ | 11 % | 9 % | 75 | 1.000 | about the same as ordinary candles |
| 31 RSI divergence | 15 % | 13 % | 75 | 1.000 | about the same as ordinary candles |
| 10 Holiday / thin | 3 % | 2 % | 75 | 1.000 | about the same as ordinary candles |
| 38 Options expiry ◐ | 7 % | 6 % | 75 | 1.000 | about the same as ordinary candles |
| 15 EM stress (TRY / ZAR) | 4 % | 4 % | 75 | 1.000 | about the same as ordinary candles |
| 11 War headline ◐ | 18 % | 19 % | 38 | 1.000 | about the same as ordinary candles |
| 8 Growth data | 12 % | 13 % | 75 | 1.000 | about the same as ordinary candles |
| 4 FOMC | 0 % | 1 % | 75 | 1.000 | about the same as ordinary candles |
| 37 Quarter end | 3 % | 4 % | 75 | 1.000 | about the same as ordinary candles |
| 27 Prior swing level | 15 % | 16 % | 75 | 1.000 | about the same as ordinary candles |
| 30 Prev day / week extreme | 9 % | 12 % | 75 | 1.000 | about the same as ordinary candles |
| 37 Month end | 12 % | 15 % | 75 | 1.000 | about the same as ordinary candles |
| 13 Fiscal headline ◐ | 0 % | 4 % | 38 | 1.000 | about the same as ordinary candles |
| 29 Round number | 13 % | 17 % | 75 | 1.000 | about the same as ordinary candles |
| 12 Tariff headline ◐ | 0 % | 7 % | 38 | 1.000 | about the same as ordinary candles |

- **34 Higher-timeframe leg (1D) at the turn:** against 42 · with 33
- **35 Lower timeframes already turned at the same price** (of 3): 0 1 · 2 6 · 3 68
- **36 Session of the swing candle:** LONDON 21 · ASIA 25 · NEWYORK 29
- **No data (never guessed):** 18 central-bank buying · 20 COT positioning · 21 stocks / VIX.

### 4H: every swing and the reasons present

| Swing | Candle (UTC) | Price | Leg ATR | Reasons present (numbers from the list) | 1D leg | Session |
|---|---|---|---|---|---|---|
| LOW | 2025-10-20 10:00 | 55.96 | 9.92 | 17, 23, 31, 32 | against | LONDON |
| HIGH | 2025-10-24 10:00 | 62.59 | 8.72 | 6, 8, 28, 32 | against | LONDON |
| LOW | 2025-10-30 10:00 | 59.64 | 4.83 | 2, 5, 28, 30, 37 | with | LONDON |
| HIGH | 2025-11-03 03:00 | 61.5 | 3.01 | 28, 30 | against | ASIA |
| LOW | 2025-11-06 15:00 | 58.83 | 4.9 | 1, 2, 23, 28 | with | NEWYORK |
| HIGH | 2025-11-11 15:00 | 61.28 | 4.41 | 7, 10, 28 | against | NEWYORK |
| LOW | 2025-11-12 23:00 | 58.12 | 5 | 2, 23, 28 | with | ASIA |
| HIGH | 2025-11-18 19:00 | 60.85 | 4.28 | 5, 28 | against | NEWYORK |
| LOW | 2025-11-25 15:00 | 57.1 | 7.18 | 1, 6, 7, 8, 28, 31, 38 | against | NEWYORK |
| HIGH | 2025-12-01 03:00 | 59.97 | 5.32 | 2, 14, 25, 29 | with | ASIA |
| LOW | 2025-12-02 11:00 | 58.28 | 3.03 | 2, 22, 33 | against | LONDON |
| HIGH | 2025-12-05 15:00 | 60.5 | 4.39 | 2, 6, 9, 22, 23, 28, 31 | with | NEWYORK |
| LOW | 2025-12-16 15:00 | 54.89 | 10.68 | 7, 8, 9, 23, 28, 29, 32 | against | NEWYORK |
| HIGH | 2025-12-26 07:00 | 58.88 | 8.28 | 32, 38 | with | ASIA |
| LOW | 2025-12-26 19:00 | 56.65 | 4.64 | 38 | against | NEWYORK |
| HIGH | 2025-12-31 11:00 | 58.55 | 4.09 | 7, 30, 37, 37 | with | LONDON |
| LOW | 2026-01-05 07:00 | 56.31 | 3.78 | 28, 31, 33 | against | ASIA |
| HIGH | 2026-01-06 11:00 | 58.87 | 4.11 | 1, 27, 28, 31 | with | LONDON |
| LOW | 2026-01-06 23:00 | 55.76 | 4.83 | 23, 25, 33 | against | ASIA |
| HIGH | 2026-01-14 19:00 | 62.2 | 6.94 | 5, 22, 25, 28, 33 | against | NEWYORK |
| LOW | 2026-01-19 07:00 | 58.53 | 5.36 | 1, 10, 28, 30 | with | ASIA |
| HIGH | 2026-01-29 11:00 | 66.48 | 6.29 | 1, 7, 14, 27, 32, 33, 37 | against | LONDON |
| LOW | 2026-02-03 07:00 | 61.12 | 4.74 | 28, 30 | with | ASIA |
| HIGH | 2026-02-11 11:00 | 65.83 | 5.75 | 1, 2, 7, 9, 22 | against | LONDON |
| LOW | 2026-02-17 15:00 | 61.76 | 5.87 | 5, 22, 28 | with | NEWYORK |
| HIGH | 2026-02-23 15:00 | 67.28 | 7.46 | 2, 5, 28, 31 | against | NEWYORK |
| LOW | 2026-02-26 11:00 | 63.6 | 4.29 | 7, 28, 37 | with | LONDON |
| HIGH | 2026-03-01 23:00 | 75.33 | 8.06 | 1, 2, 15, 16, 17, 24, 25, 32, 33, 37 | against | ASIA |
| LOW | 2026-03-02 03:00 | 69.92 | 3.04 | 2, 17, 24, 25, 29, 32 | with | ASIA |
| HIGH | 2026-03-03 11:00 | 77.98 | 3.85 | 1, 2, 5, 15, 16, 23, 25, 27, 28, 32 | against | LONDON |
| LOW | 2026-03-03 19:00 | 71.65 | 3.12 | 1, 2, 22, 25, 28 | with | NEWYORK |
| HIGH | 2026-03-09 02:00 | 119.48 | 8.66 | 17, 23, 28, 29, 31, 32, 33 | against | ASIA |
| LOW | 2026-03-10 14:00 | 76.73 | 7.24 | 11, 17 | with | NEWYORK |
| HIGH | 2026-03-15 22:00 | 102.44 | 7.59 | 2, 28, 37 | against | ASIA |
| LOW | 2026-03-18 06:00 | 91.45 | 3.35 | 6, 11, 17, 24, 28 | with | ASIA |
| HIGH | 2026-03-23 06:00 | 101.67 | 2.54 | 2, 11, 14, 24, 27, 28, 30 | against | ASIA |
| LOW | 2026-03-23 10:00 | 84.37 | 5.8 | 1, 2, 11, 14, 22, 24, 29, 33 | with | LONDON |
| HIGH | 2026-03-30 22:00 | 106.86 | 7.42 | 2, 28, 33, 37, 37 | against | ASIA |
| LOW | 2026-04-01 06:00 | 96.5 | 3.28 | 1, 2, 7, 8, 24 | with | ASIA |
| HIGH | 2026-04-07 14:00 | 117.63 | 4.42 | 8, 28 | against | NEWYORK |
| LOW | 2026-04-07 22:00 | 91.05 | 7.1 | 1, 5, 14, 24, 25, 27, 33 | with | ASIA |
| HIGH | 2026-04-12 22:00 | 105.63 | 4.6 | 1, 11, 24, 29, 37 | against | ASIA |
| LOW | 2026-04-17 14:00 | 78.97 | 9.18 | 5, 11, 23, 24, 28, 32 | against | NEWYORK |
| HIGH | 2026-04-30 02:00 | 110.93 | 11.8 | 2, 14, 23, 25, 28, 32, 37 | against | ASIA |
| LOW | 2026-05-06 10:00 | 88.66 | 6.77 | 7, 24, 25, 28, 33 | with | LONDON |
| HIGH | 2026-05-13 14:00 | 103.67 | 6.77 | 6, 9, 28 | against | NEWYORK |
| LOW | 2026-05-14 10:00 | 95.12 | 4.2 | 5, 7, 8, 28, 29 | with | LONDON |
| HIGH | 2026-05-18 18:00 | 105.21 | 4.43 | 23, 25, 27, 28, 29 | against | NEWYORK |
| LOW | 2026-05-29 14:00 | 86.35 | 9.11 | 1, 5, 28, 32, 37 | against | NEWYORK |
| HIGH | 2026-06-03 10:00 | 97 | 6.45 | 1, 7, 8, 28 | with | LONDON |
| LOW | 2026-06-05 14:00 | 89.68 | 4.05 | 7, 9, 15, 16, 29 | against | NEWYORK |
| HIGH | 2026-06-08 10:00 | 95.47 | 3.22 | 24, 28, 33 | with | LONDON |
| LOW | 2026-06-09 14:00 | 85.95 | 5 | 27, 28 | against | NEWYORK |
| HIGH | 2026-06-10 22:00 | 93.64 | 3.45 | 11, 17, 25, 28 | with | ASIA |
| LOW | 2026-06-18 14:00 | 72.83 | 12.63 | 2, 7, 28, 32 | against | NEWYORK |
| HIGH | 2026-06-21 22:00 | 78.14 | 3.41 | 2, 27, 28, 37 | with | ASIA |
| LOW | 2026-07-02 10:00 | 67.04 | 13.76 | 1, 7, 9, 14, 17, 28, 31, 32 | against | LONDON |
| HIGH | 2026-07-08 14:00 | 76.08 | 6.48 | 2, 9, 25, 28, 33 | with | NEWYORK |
| LOW | 2026-07-10 14:00 | 70.77 | 3.8 | — | against | NEWYORK |
| HIGH | 2026-07-23 18:00 | 93.5 | 12.28 | 23, 27, 28, 32 | against | NEWYORK |
| LOW | 2026-07-28 14:00 | 77.78 | 7.46 | 1, 33, 37, 38 | with | NEWYORK |
| HIGH | 2026-07-31 18:00 | 86.87 | 3.79 | 14, 24, 37 | with | NEWYORK |
| LOW | 2026-08-05 02:00 | 74.24 | 7.97 | 2, 23, 28 | against | ASIA |
| HIGH | 2026-08-11 06:00 | 84.61 | 7.24 | 2 | with | ASIA |
| LOW | 2026-08-13 14:00 | 80.09 | 3.33 | 6, 7, 28, 29 | against | NEWYORK |
| HIGH | 2026-08-20 10:00 | 87.69 | 6.75 | 2, 7, 28, 31 | against | LONDON |
| LOW | 2026-08-26 06:00 | 79.62 | 6.37 | 2, 6, 8, 23, 28, 38 | with | ASIA |
| HIGH | 2026-09-03 10:00 | 93.14 | 9.37 | 5, 7, 8, 14, 22, 23, 27, 28 | against | LONDON |
| LOW | 2026-09-04 10:00 | 88.72 | 3.07 | 7, 9 | with | LONDON |
| HIGH | 2026-09-10 22:00 | 104.46 | 8.12 | 2, 23, 25, 28, 30, 32 | against | ASIA |
| LOW | 2026-09-11 10:00 | 98.48 | 2.99 | 2, 6 | with | LONDON |
| HIGH | 2026-09-15 14:00 | 106.75 | 4.49 | 23, 31, 32 | against | NEWYORK |
| LOW | 2026-09-22 18:00 | 88.67 | 10.16 | 2, 5, 23, 27, 28, 32 | against | NEWYORK |
| HIGH | 2026-09-24 14:00 | 96.78 | 4.18 | 2, 7 | with | NEWYORK |
| LOW | 2026-10-06 10:00 | 86.86 | 6.78 | 1, 5, 28, 31 | against | LONDON |

