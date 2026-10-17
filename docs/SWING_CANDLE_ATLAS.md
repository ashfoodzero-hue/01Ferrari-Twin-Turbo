# Swing-candle atlas: Phase 1 results

Generated 2026-10-17T13:56:18.903Z from `data/master/swing_candle_atlas.json`. Spec: `docs/SWING_CANDLE_SPEC.md` (+ clarifications + addendum A).

Window 2013-07-14 → 2026-10-09. Rules found on TRAIN, tested on OOS (from 2021-06-23).

A **FINDING** must meet all of the following:

- OOS swing vs failed-extreme difference passing Holm across every measure of that timeframe and side;
- the same sign in TRAIN;
- the same sign vs random candles;
- the same sign with swings of 2× and 5× ATR.

**Labels for everything else:**

- "described only" = fewer than 30 OOS swings, so it cannot be proven;
- "inconsistent" = the sign flips between periods;
- "fails robustness" = passes OOS but breaks one of the checks.

## Headline: proven on ≥ 5 timeframes with at least a moderate (≥ 5 point) gap

Read as: "at a real swing this happens X % of the time, at a failed extreme Y %, at a random candle Z %".

### Knowable AT the extreme candle (or before)

| side | what | timeframes | example (OOS): swing / failed / random |
|---|---|---|---|
| low | the low candle itself is a LARGE candle (top third of range) | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **41%** / 29% / 15% |
| low | the low candle itself is a SMALL candle (bottom third of range) | 1m, 3m, 15m, 30m, 2H | 15m: **33%** / 41% / 67% |

### In the candles AFTER the extreme (extreme still holding; addendum A)

| side | what | timeframes | example (OOS): swing / failed / random |
|---|---|---|---|
| low | 1 candle after the low (low still holding) closes in its BOTTOM third | 1m, 3m, 5m, 15m, 30m, 1H, 2H, 3H, 4H | 1H: **20%** / 37% / 39% |
| low | 1 candle after the low (low still holding) closes in its TOP third | 1m, 3m, 5m, 15m, 30m, 1H, 2H, 3H, 4H | 1H: **54%** / 38% / 36% |
| low | 1 candle after the low (low still holding) is bullish | 1m, 3m, 5m, 15m, 30m, 1H, 2H, 3H | 1H: **75%** / 61% / 48% |
| high | 1 candle after the high (high still holding) is bearish | 1m, 3m, 5m, 15m, 30m, 1H, 2H, 3H | 1H: **76%** / 64% / 42% |
| high | 3 candles after the high (high still holding) is bearish | 1m, 3m, 5m, 15m, 30m, 1H, 2H, 6H | 1H: **57%** / 40% / 43% |
| high | 2 candles after the high (high still holding) closes in its BOTTOM third | 1m, 3m, 5m, 15m, 30m, 1H, 2H, 6H | 1H: **51%** / 35% / 35% |
| low | 1 candle after the low (low still holding) is bearish | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **17%** / 29% / 42% |
| low | 2 candles after the low (low still holding) is bullish | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **64%** / 45% / 45% |
| low | 2 candles after the low (low still holding) is bearish | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **25%** / 44% / 43% |
| low | 3 candles after the low (low still holding) is bearish | 1m, 3m, 5m, 15m, 30m, 1H, 6H | 1H: **30%** / 49% / 44% |
| low | 3 candles after the low (low still holding) closes in its BOTTOM third | 1m, 3m, 5m, 15m, 30m, 1H, 6H | 1H: **19%** / 31% / 26% |
| high | 2 candles after the high (high still holding) is bullish | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **26%** / 44% / 47% |
| high | 2 candles after the high (high still holding) is bearish | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **62%** / 45% / 43% |
| high | 3 candles after the high (high still holding) is bullish | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **32%** / 48% / 46% |
| high | 1 candle after the high (high still holding) closes in its TOP third | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **22%** / 36% / 47% |
| high | 2 candles after the high (high still holding) is a LARGE candle (top third of range) | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **39%** / 21% / 34% |
| high | 2 candles after the high (high still holding) closes in its TOP third | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **21%** / 37% / 35% |
| high | 3 candles after the high (high still holding) closes in its TOP third | 1m, 3m, 5m, 15m, 30m, 1H, 2H | 1H: **27%** / 38% / 35% |
| low | 1 candle after the low (low still holding) has a LARGE body | 3m, 5m, 15m, 30m, 1H, 2H, 3H | 1H: **52%** / 42% / 42% |
| low | 1 candle after the low (low still holding) is mostly body | 3m, 5m, 15m, 30m, 1H, 2H, 3H | 1H: **48%** / 38% / 39% |
| low | 3 candles after the low (low still holding) is bullish | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **61%** / 39% / 45% |
| low | 1 candle after the low (low still holding) is a medium-size candle | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **24%** / 33% / 26% |
| low | 2 candles after the low (low still holding) is a LARGE candle (top third of range) | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **34%** / 24% / 32% |
| low | 2 candles after the low (low still holding) closes in its BOTTOM third | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **19%** / 31% / 28% |
| low | 2 candles after the low (low still holding) closes in its TOP third | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **54%** / 38% / 40% |
| low | 3 candles after the low (low still holding) closes in its TOP third | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **51%** / 34% / 41% |
| high | 1 candle after the high (high still holding) is bullish | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **15%** / 25% / 47% |
| high | 1 candle after the high (high still holding) takes the previous low and closes back above it | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **23%** / 32% / 25% |
| high | 1 candle after the high (high still holding) is mostly body | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **48%** / 37% / 39% |
| high | 1 candle after the high (high still holding) closes in its BOTTOM third | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **45%** / 33% / 25% |
| high | 2 candles after the high (high still holding) has a LARGE body | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **39%** / 28% / 36% |
| high | 3 candles after the high (high still holding) is a LARGE candle (top third of range) | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **33%** / 19% / 30% |
| high | 3 candles after the high (high still holding) closes in its BOTTOM third | 1m, 3m, 5m, 15m, 30m, 1H | 1H: **45%** / 30% / 34% |
| low | 1 candle after the low (low still holding) is a LARGE candle (top third of range) | 3m, 5m, 15m, 30m, 1H, 3H | 1H: **48%** / 38% / 40% |
| high | 1 candle after the high (high still holding) is a LARGE candle (top third of range) | 3m, 5m, 15m, 30m, 1H, 2H | 1H: **51%** / 36% / 42% |
| low | 1 candle after the low (low still holding) takes the previous high and closes back below it | 1m, 3m, 5m, 15m, 30m | 15m: **20%** / 29% / 23% |
| low | 1 candle after the low (low still holding) has almost no upper wick | 1m, 3m, 5m, 15m, 30m | 15m: **51%** / 39% / 49% |
| low | 3 candles after the low (low still holding) has a LARGE body | 1m, 3m, 5m, 15m, 30m | 15m: **37%** / 25% / 33% |
| high | 1 candle after the high (high still holding) has almost no lower wick | 1m, 3m, 5m, 15m, 30m | 15m: **44%** / 31% / 40% |
| high | 1 candle after the high (high still holding) has a LONG lower wick | 1m, 3m, 5m, 15m, 30m | 15m: **27%** / 40% / 29% |
| high | 3 candles after the high (high still holding) has a LARGE body | 1m, 3m, 5m, 15m, 30m | 15m: **36%** / 23% / 33% |
| high | 1 candle after the high (high still holding) is a medium-size candle | 3m, 5m, 15m, 30m, 1H | 1H: **24%** / 32% / 25% |
| high | 1 candle after the high (high still holding) has a SMALL body | 3m, 5m, 15m, 30m, 1H | 1H: **23%** / 31% / 31% |
| high | 1 candle after the high (high still holding) has a LARGE body | 3m, 5m, 15m, 30m, 1H | 1H: **52%** / 37% / 42% |
| high | 1 candle after the high (high still holding) is mostly wick | 3m, 5m, 15m, 30m, 1H | 1H: **23%** / 31% / 30% |
| high | 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | 3m, 5m, 15m, 30m, 1H | 1H: **31%** / 43% / 33% |

## Overview

| TF | candles | swings H (TRAIN+OOS) | swings L | median size (ATR) | confirmed after (bars) | FINDINGS highs | FINDINGS lows |
|---|---|---|---|---|---|---|---|
| 1m | 4,566,893 | 76878+51070 | 76878+51070 | 5.16 | 6 | 109 | 123 |
| 3m | 1,527,992 | 24659+15163 | 24657+15162 | 5.14 | 6 | 78 | 89 |
| 5m | 917,153 | 14371+8968 | 14371+8967 | 5.15 | 6 | 74 | 83 |
| 15m | 306,109 | 4707+3007 | 4708+3007 | 5.15 | 6 | 57 | 59 |
| 30m | 153,218 | 2331+1554 | 2332+1554 | 5.15 | 6 | 45 | 39 |
| 1H | 76,684 | 1157+778 | 1158+778 | 5.24 | 7 | 33 | 21 |
| 2H | 40,097 | 596+410 | 597+410 | 5.18 | 7 | 15 | 9 |
| 3H | 26,766 | 405+278 | 405+279 | 5.22 | 7 | 1 | 7 |
| 4H | 20,118 | 296+198 | 297+199 | 5.2 | 6 | 0 | 2 |
| 6H | 13,444 | 200+126 | 200+128 | 5.08 | 7 | 3 | 2 |
| 9H | 10,095 | 149+90 | 148+92 | 5.07 | 6 | 0 | 0 |
| 1D | 3,377 | 44+34 | 43+35 | 5.73 | 7 | 0 | 0 |
| 2D | 1,711 | 23+19 | 24+20 | 5.24 | 6 | described only | described only |
| 3D | 1,142 | 17+12 | 18+13 | 5.57 | 6 | described only | described only |
| 1W | 684 | 11+6 | 11+7 | 5 | 7 | described only | described only |
| 1M | 160 | 1+2 | 2+2 | 3.6 | 6 | described only | described only |

## 1m

4,566,893 candles; median swing 5.16 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 11% / 20% / 30%, highs 6% / 13% / 23%.

### Swing LOWS: 123 findings (51070 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| the low candle itself is a LARGE candle (top third of range) | **54%** | 36% | 10% | clear +18 pt | 41% / 32% |
| the low candle itself closes in its TOP third | **60%** | 47% | 44% | clear +13 pt | 40% / 34% |
| 3 candles after the low (low still holding) closes in its TOP third | **55%** | 42% | 47% | clear +13 pt | 50% / 35% |
| 2 candles after the low (low still holding) closes in its TOP third | **58%** | 46% | 47% | clear +13 pt | 54% / 37% |
| 3 candles after the low (low still holding) is bearish | **37%** | 49% | 45% | clear -12 pt | 31% / 47% |
| 3 candles after the low (low still holding) is bullish | **54%** | 43% | 47% | clear +11 pt | 57% / 39% |
| 2 candles after the low (low still holding) is bearish | **34%** | 45% | 45% | clear -11 pt | 26% / 42% |
| 2 candles after the low (low still holding) is bullish | **58%** | 47% | 47% | clear +11 pt | 62% / 45% |
| 1 candle after the low (low still holding) closes in its TOP third | **51%** | 40% | 41% | clear +11 pt | 45% / 32% |
| the low candle itself closes in its BOTTOM third | **25%** | 36% | 42% | clear -11 pt | 29% / 33% |
| the low candle itself is bearish | **36%** | 47% | 45% | clear -11 pt | 53% / 58% |
| the low candle itself is a SMALL candle (bottom third of range) | **27%** | 37% | 74% | clear -10 pt | 29% / 34% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **31%** | 41% | 38% | clear -10 pt | 20% / 32% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **34%** | 43% | 45% | moderate -9 pt | 21% / 34% |
| 2 candles after the low (low still holding) closes in its BOTTOM third | **28%** | 37% | 38% | moderate -9 pt | 17% / 30% |
| 3 candles after the low (low still holding) is a LARGE candle (top third of range) | **26%** | 18% | 24% | moderate +8 pt | 30% / 21% |
| the low candle itself takes the previous low and closes back above it | **49%** | 41% | 19% | moderate +8 pt | 48% / 44% |
| 1 candle after the low (low still holding) is bullish | **60%** | 52% | 47% | moderate +8 pt | 74% / 62% |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | **29%** | 22% | 24% | moderate +7 pt | 34% / 24% |
| the low candle itself is a hammer | **24%** | 17% | 10% | moderate +7 pt | 19% / 17% |
| 1 candle after the low (low still holding) is bearish | **32%** | 39% | 45% | moderate -7 pt | 16% / 26% |
| the low candle itself is bullish | **51%** | 44% | 47% | moderate +7 pt | 35% / 31% |
| the low candle itself has a LONG lower wick | **33%** | 26% | 16% | moderate +7 pt | 36% / 33% |
| 1 candle after the low (low still holding) has almost no upper wick | **70%** | 64% | 69% | moderate +7 pt | 39% / 31% |
| 3 candles after the low (low still holding) opens with a gap UP | **49%** | 42% | 43% | moderate +6 pt | 37% / 34% |
| 1 candle after the low (low still holding) has a LONG upper wick | **16%** | 22% | 17% | moderate -6 pt | 25% / 35% |
| 1 candle after the low (low still holding) is a medium-size candle | **19%** | 25% | 20% | moderate -6 pt | 27% / 35% |
| 1 candle after the low (low still holding) takes the previous high and closes back below it | **16%** | 21% | 17% | moderate -6 pt | 15% / 22% |
| the low candle itself has a LARGE body | **43%** | 38% | 18% | moderate +5 pt | 37% / 32% |
| the low candle itself is an outside bar | **29%** | 24% | 14% | moderate +5 pt | 19% / 15% |
| 3 candles after the low (low still holding) opens with a gap DOWN | **37%** | 42% | 42% | moderate -5 pt | 28% / 30% |
| 3 candles after the low (low still holding) has a LARGE body | **29%** | 24% | 28% | moderate +5 pt | 31% / 24% |
| 2 candles after the low (low still holding) has almost no upper wick | **68%** | 63% | 66% | tiny +5 pt | 30% / 27% |
| 2 candles after the low (low still holding) opens with a gap UP | **49%** | 44% | 42% | tiny +5 pt | 37% / 34% |
| 2 candles after the low (low still holding) has a LARGE body | **32%** | 27% | 29% | tiny +5 pt | 35% / 25% |
| 2 candles after the low (low still holding) has a LONG upper wick | **18%** | 23% | 21% | tiny -5 pt | 34% / 40% |
| 1 candle after the low (low still holding) is mostly body | **60%** | 56% | 57% | tiny +5 pt | 42% / 33% |
| the low candle itself is mostly wick | **33%** | 28% | 23% | tiny +5 pt | 35% / 34% |
| 2 candles after the low (low still holding) is a medium-size candle | **22%** | 27% | 24% | tiny -5 pt | 33% / 38% |
| the low candle itself has almost no lower wick | **57%** | 61% | 74% | tiny -5 pt | 33% / 34% |
| 3 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **50%** | 54% | 51% | tiny -5 pt | 35% / 41% |
| the low candle itself has a LONG upper wick | **22%** | 26% | 27% | tiny -4 pt | 32% / 35% |
| 3 candles after the low (low still holding) has a LONG upper wick | **19%** | 24% | 21% | tiny -4 pt | 36% / 40% |
| 2 candles after the low (low still holding) takes the previous high and closes back below it | **16%** | 20% | 17% | tiny -4 pt | 19% / 24% |
| 1 candle after the low (low still holding) is a marubozu (almost all body) | **49%** | 45% | 46% | tiny +4 pt | 19% / 14% |
| 2 candles after the low (low still holding) is an inside bar | **16%** | 20% | 18% | tiny -4 pt | 21% / 26% |
| 2 candles after the low (low still holding) opens with a gap DOWN | **36%** | 40% | 43% | tiny -4 pt | 29% / 31% |
| 3 candles after the low (low still holding) is a medium-size candle | **24%** | 28% | 25% | tiny -4 pt | 35% / 39% |
| 2 candles after the low (low still holding) is a marubozu (almost all body) | **47%** | 43% | 46% | tiny +4 pt | 16% / 13% |
| 2 candles after the low (low still holding) closes in its middle third | **13%** | 17% | 15% | tiny -4 pt | 29% / 33% |
| the low candle itself ends a SMALL leg | **28%** | 32% | — | tiny -4 pt | 29% / 33% |
| 3 candles after the low (low still holding) is an inside bar | **17%** | 21% | 18% | tiny -4 pt | 21% / 24% |
| 3 candles before the low is a marubozu (almost all body) | **47%** | 43% | 47% | tiny +4 pt | 16% / 16% |
| 2 candles after the low (low still holding) is mostly body | **57%** | 53% | 56% | tiny +4 pt | 35% / 29% |
| the low candle happens while the DXY candle is UP | **50%** | 53% | 50% | tiny -4 pt | 54% / 56% |
| 3 candles after the low (low still holding) has almost no upper wick | **67%** | 63% | 65% | tiny +4 pt | 29% / 28% |
| the low candle itself is a doji | **13%** | 10% | 8% | tiny +4 pt | 11% / 11% |
| the low candle happens while the silver candle is UP | **47%** | 44% | 47% | tiny +3 pt | 38% / 34% |
| 3 candles before the low has almost no lower wick | **67%** | 64% | 65% | tiny +3 pt | 33% / 33% |
| the low candle itself has a medium body | **28%** | 31% | 33% | tiny -3 pt | 31% / 34% |
| 1 candle after the low (low still holding) is a shooting star | **7%** | 10% | 7% | tiny -3 pt | 8% / 13% |
| 3 candles after the low (low still holding) closes in its middle third | **14%** | 17% | 15% | tiny -3 pt | 30% / 33% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **27%** | 24% | 23% | tiny +3 pt | 42% / 33% |
| 3 candles after the low (low still holding) has a medium body | **34%** | 37% | 35% | tiny -3 pt | 34% / 37% |
| the low candle itself ends a BIG leg (size in ATR) | **37%** | 34% | — | tiny +3 pt | 38% / 33% |
| 1 candle after the low (low still holding) is mostly wick | **21%** | 24% | 24% | tiny -3 pt | 27% / 34% |
| 1 candle before the low is a marubozu (almost all body) | **49%** | 47% | 46% | tiny +3 pt | 21% / 21% |
| 1 candle after the low (low still holding) has a LARGE body | **33%** | 31% | 28% | tiny +3 pt | 44% / 32% |
| 2 candles after the low (low still holding) has a medium body | **33%** | 35% | 34% | tiny -3 pt | 33% / 37% |
| the low candle itself is half body | **17%** | 20% | 18% | tiny -2 pt | 33% / 33% |
| the low candle itself opens with a gap DOWN | **59%** | 57% | 36% | tiny +2 pt | 31% / 30% |
| 2 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **49%** | 51% | 52% | tiny -2 pt | 33% / 38% |
| 1 candle before the low has almost no lower wick | **70%** | 68% | 64% | tiny +2 pt | 33% / 33% |
| 3 candles after the low (low still holding) is a hammer | **12%** | 9% | 10% | tiny +2 pt | 9% / 9% |
| 3 candles after the low (low still holding) has a SMALL body | **37%** | 39% | 38% | tiny -2 pt | 35% / 39% |
| the low candle itself is mostly body | **50%** | 52% | 59% | tiny -2 pt | 32% / 33% |
| 2 candles after the low (low still holding) has a SMALL body | **36%** | 38% | 38% | tiny -2 pt | 32% / 38% |
| 1 candle before the low is a medium-size candle | **25%** | 27% | 25% | tiny -2 pt | 33% / 35% |
| 1 candle before the low is mostly body | **54%** | 52% | 51% | tiny +2 pt | 32% / 32% |
| 2 candles before the low has almost no lower wick | **67%** | 65% | 65% | tiny +2 pt | 33% / 32% |
| 2 candles after the low (low still holding) is a shooting star | **6%** | 8% | 7% | tiny -2 pt | 8% / 11% |
| 3 candles after the low (low still holding) is half body | **18%** | 21% | 19% | tiny -2 pt | 33% / 33% |
| 2 candles after the low (low still holding) is half body | **19%** | 21% | 19% | tiny -2 pt | 33% / 34% |
| the low candle itself has a SMALL body | **29%** | 31% | 50% | tiny -2 pt | 32% / 34% |
| 3 candles after the low (low still holding) is mostly body | **56%** | 54% | 56% | tiny +2 pt | 33% / 29% |
| the low candle itself is a LOWER low than the previous swing low | **48%** | 46% | — | tiny +2 pt | 47% / 42% |
| 1 candle after the low (low still holding) is half body | **19%** | 21% | 20% | tiny -2 pt | 31% / 33% |
| 3 candles after the low (low still holding) is a marubozu (almost all body) | **46%** | 44% | 46% | tiny +2 pt | 16% / 14% |
| 2 candles after the low (low still holding) has a medium lower wick | **11%** | 13% | 12% | tiny -2 pt | 33% / 33% |
| 3 candles after the low (low still holding) is a bearish engulfing | **3%** | 5% | 3% | tiny -2 pt | 4% / 8% |
| 1 candle before the low has a medium upper wick | **12%** | 14% | 13% | tiny -2 pt | 34% / 34% |
| 1 candle after the low (low still holding) has a medium body | **31%** | 33% | 33% | tiny -2 pt | 29% / 34% |
| the low candle itself opens with no real gap | **11%** | 12% | 12% | tiny -2 pt | 19% / 20% |
| 3 candles after the low (low still holding) is a shooting star | **6%** | 8% | 7% | tiny -2 pt | 9% / 11% |
| 2 candles after the low (low still holding) is a bearish engulfing | **2%** | 4% | 3% | tiny -2 pt | 3% / 7% |
| 1 candle after the low (low still holding) closes in its middle third | **15%** | 16% | 15% | tiny -2 pt | 33% / 34% |
| 2 candles after the low (low still holding) is a hammer | **12%** | 10% | 10% | tiny +2 pt | 8% / 8% |
| the low candle itself is a bullish engulfing | **7%** | 5% | 4% | tiny +2 pt | 8% / 6% |
| 1 candle before the low is half body | **18%** | 20% | 18% | tiny -2 pt | 33% / 33% |
| 2 candles before the low has a medium upper wick | **13%** | 14% | 14% | tiny -2 pt | 35% / 35% |
| 3 candles before the low has a medium upper wick | **13%** | 15% | 14% | tiny -2 pt | 34% / 35% |
| 3 candles before the low is mostly wick | **25%** | 26% | 25% | tiny -1 pt | 34% / 34% |
| 3 candles before the low opens with no real gap | **14%** | 16% | 15% | tiny -1 pt | 35% / 35% |
| 1 candle after the low (low still holding) has almost no lower wick | **66%** | 65% | 64% | tiny +1 pt | 35% / 33% |
| 3 candles after the low (low still holding) has a medium lower wick | **11%** | 12% | 12% | tiny -1 pt | 32% / 33% |
| the low candle itself has a medium upper wick | **17%** | 16% | 9% | tiny +1 pt | 36% / 35% |
| the low candle itself is a shooting star | **4%** | 5% | 7% | tiny -1 pt | 2% / 2% |
| 3 candles after the low (low still holding) opens with no real gap | **15%** | 16% | 15% | tiny -1 pt | 35% / 36% |
| 1 candle before the low has a LONG lower wick | **19%** | 20% | 26% | tiny -1 pt | 33% / 33% |
| 1 candle before the low opens with no real gap | **13%** | 14% | 14% | tiny -1 pt | 35% / 35% |
| 3 candles before the low takes the previous high and closes back below it | **16%** | 17% | 16% | tiny -1 pt | 16% / 17% |
| 2 candles after the low (low still holding) opens with no real gap | **15%** | 16% | 15% | tiny -1 pt | 34% / 35% |
| 1 candle after the low (low still holding) opens with no real gap | **15%** | 16% | 15% | tiny -1 pt | 38% / 39% |
| 3 candles before the low takes the previous low and closes back above it | **17%** | 18% | 18% | tiny -1 pt | 17% / 18% |
| the low candle itself takes the previous high and closes back below it | **12%** | 13% | 17% | tiny -1 pt | 8% / 8% |
| 3 candles after the low (low still holding) is a bullish engulfing | **4%** | 3% | 4% | tiny +1 pt | 6% / 6% |
| the low candle itself is a bearish engulfing | **3%** | 4% | 3% | tiny -1 pt | 5% / 5% |
| 3 candles before the low is a hammer | **7%** | 8% | 10% | tiny -1 pt | 8% / 8% |
| 1 candle after the low (low still holding) is a bearish engulfing | **1%** | 2% | 4% | tiny -0 pt | 1% / 3% |
| the low candle has a HIGH-impact USD release in the extreme candle or the 3 before | **1%** | 0% | 0% | tiny +0 pt | 1% / 0% |
| the low candle contains a HIGH-impact USD release | **0%** | 0% | 0% | tiny +0 pt | 0% / 0% |
| the low candle contains a USD-POSITIVE surprise (actual better than forecast) | **0%** | 0% | 0% | tiny +0 pt | 0% / 0% |
| the low candle contains a USD-NEGATIVE surprise | **0%** | 0% | 0% | tiny +0 pt | 0% / 0% |

Passed OOS but NOT proven (58): 1 candle before the low is bullish [inconsistent]; 1 candle before the low is bearish [inconsistent]; 1 candle after the low (low still holding) is an inside bar [fails robustness]; 1 candle after the low (low still holding) is a hammer [fails robustness]; 3 candles before the low is a SMALL candle (bottom third of range) [fails robustness]; 3 candles before the low is mostly body [fails robustness] …

### Swing HIGHS: 109 findings (51070 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 2 candles after the high (high still holding) closes in its BOTTOM third | **56%** | 43% | 42% | clear +13 pt | 53% / 37% |
| 3 candles after the high (high still holding) closes in its BOTTOM third | **53%** | 40% | 42% | clear +12 pt | 50% / 35% |
| 1 candle after the high (high still holding) closes in its BOTTOM third | **50%** | 38% | 37% | clear +12 pt | 45% / 33% |
| 2 candles after the high (high still holding) is bearish | **58%** | 46% | 45% | clear +11 pt | 62% / 45% |
| 3 candles after the high (high still holding) is bearish | **54%** | 43% | 45% | clear +11 pt | 58% / 40% |
| 3 candles after the high (high still holding) is bullish | **37%** | 48% | 47% | clear -11 pt | 30% / 46% |
| 1 candle after the high (high still holding) closes in its TOP third | **35%** | 46% | 49% | clear -11 pt | 21% / 34% |
| 2 candles after the high (high still holding) is bullish | **34%** | 45% | 47% | clear -11 pt | 26% / 42% |
| 3 candles after the high (high still holding) closes in its TOP third | **32%** | 42% | 41% | moderate -10 pt | 19% / 31% |
| 2 candles after the high (high still holding) closes in its TOP third | **30%** | 39% | 42% | moderate -9 pt | 18% / 30% |
| 1 candle after the high (high still holding) has almost no lower wick | **69%** | 60% | 68% | moderate +8 pt | 41% / 33% |
| 1 candle after the high (high still holding) takes the previous low and closes back above it | **15%** | 23% | 19% | moderate -8 pt | 15% / 22% |
| 1 candle after the high (high still holding) is bearish | **60%** | 52% | 45% | moderate +8 pt | 74% / 62% |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | **25%** | 17% | 24% | moderate +8 pt | 30% / 21% |
| 1 candle after the high (high still holding) has a LONG lower wick | **19%** | 27% | 20% | moderate -8 pt | 25% / 34% |
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **28%** | 20% | 24% | moderate +8 pt | 33% / 24% |
| 3 candles after the high (high still holding) opens with a gap DOWN | **52%** | 44% | 44% | moderate +7 pt | 37% / 34% |
| 1 candle after the high (high still holding) is bullish | **31%** | 38% | 47% | moderate -7 pt | 16% / 25% |
| 2 candles after the high (high still holding) has a LARGE body | **32%** | 25% | 29% | moderate +6 pt | 35% / 26% |
| 2 candles after the high (high still holding) opens with a gap DOWN | **54%** | 47% | 43% | moderate +6 pt | 36% / 34% |
| 3 candles after the high (high still holding) has a LARGE body | **29%** | 23% | 29% | moderate +6 pt | 32% / 24% |
| 1 candle after the high (high still holding) is mostly body | **58%** | 52% | 56% | moderate +6 pt | 41% / 33% |
| 1 candle after the high (high still holding) is a marubozu (almost all body) | **47%** | 41% | 46% | moderate +6 pt | 20% / 14% |
| 2 candles after the high (high still holding) takes the previous low and closes back above it | **16%** | 22% | 19% | moderate -5 pt | 19% / 24% |
| 3 candles after the high (high still holding) opens with a gap UP | **33%** | 38% | 40% | moderate -5 pt | 26% / 29% |
| 2 candles after the high (high still holding) has almost no lower wick | **68%** | 63% | 65% | tiny +5 pt | 33% / 29% |
| 1 candle after the high (high still holding) is a medium-size candle | **20%** | 25% | 21% | tiny -5 pt | 28% / 35% |
| the high candle itself is bearish | **45%** | 40% | 45% | tiny +5 pt | 34% / 30% |
| 2 candles after the high (high still holding) has a LONG lower wick | **20%** | 24% | 23% | tiny -5 pt | 33% / 38% |
| 3 candles after the high (high still holding) has almost no lower wick | **67%** | 62% | 65% | tiny +5 pt | 32% / 30% |
| 1 candle after the high (high still holding) is mostly wick | **23%** | 27% | 24% | tiny -4 pt | 27% / 34% |
| the high candle itself closes in its BOTTOM third | **42%** | 38% | 42% | tiny +4 pt | 40% / 35% |
| 2 candles after the high (high still holding) has a SMALL body | **36%** | 40% | 37% | tiny -4 pt | 33% / 38% |
| 2 candles after the high (high still holding) opens with a gap UP | **32%** | 36% | 41% | tiny -4 pt | 27% / 29% |
| 2 candles after the high (high still holding) is a medium-size candle | **23%** | 27% | 24% | tiny -4 pt | 33% / 38% |
| 1 candle before the high has almost no upper wick | **69%** | 65% | 64% | tiny +4 pt | 31% / 29% |
| 3 candles after the high (high still holding) has a LONG lower wick | **21%** | 25% | 23% | tiny -4 pt | 35% / 38% |
| 3 candles after the high (high still holding) takes the previous low and closes back above it | **17%** | 21% | 19% | tiny -4 pt | 19% / 22% |
| 2 candles after the high (high still holding) is mostly body | **57%** | 53% | 56% | tiny +4 pt | 35% / 30% |
| the high candle itself closes in its TOP third | **44%** | 47% | 45% | tiny -4 pt | 28% / 32% |
| 2 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **50%** | 53% | 52% | tiny -4 pt | 34% / 38% |
| 1 candle before the high is a marubozu (almost all body) | **48%** | 45% | 46% | tiny +4 pt | 21% / 20% |
| 2 candles after the high (high still holding) closes in its middle third | **15%** | 18% | 16% | tiny -3 pt | 29% / 33% |
| 3 candles before the high has almost no upper wick | **67%** | 64% | 66% | tiny +3 pt | 31% / 30% |
| 2 candles after the high (high still holding) is a marubozu (almost all body) | **47%** | 44% | 46% | tiny +3 pt | 17% / 14% |
| 1 candle before the high is mostly body | **54%** | 51% | 51% | tiny +3 pt | 33% / 31% |
| 3 candles after the high (high still holding) is a medium-size candle | **24%** | 27% | 25% | tiny -3 pt | 34% / 38% |
| the high candle has HEAVY real CME volume (≥ 1.5× its 20-candle median; 2024-10+) | **55%** | 52% | 24% | tiny +3 pt | 49% / 48% |
| 3 candles after the high (high still holding) closes in its middle third | **15%** | 18% | 16% | tiny -3 pt | 30% / 34% |
| 2 candles before the high has almost no upper wick | **68%** | 65% | 65% | tiny +3 pt | 31% / 30% |
| the high candle itself opens with a gap UP | **56%** | 54% | 34% | tiny +2 pt | 30% / 28% |
| 2 candles before the high is a marubozu (almost all body) | **47%** | 44% | 47% | tiny +2 pt | 17% / 16% |
| 3 candles after the high (high still holding) has a medium body | **34%** | 36% | 34% | tiny -2 pt | 34% / 37% |
| the high candle itself takes the previous high and closes back below it | **39%** | 37% | 17% | tiny +2 pt | 47% / 44% |
| 2 candles after the high (high still holding) is mostly wick | **24%** | 27% | 25% | tiny -2 pt | 32% / 37% |
| 2 candles after the high (high still holding) is a hammer | **8%** | 10% | 10% | tiny -2 pt | 9% / 11% |
| 2 candles after the high (high still holding) has a medium body | **32%** | 35% | 34% | tiny -2 pt | 32% / 36% |
| 1 candle before the high has a LONG upper wick | **17%** | 19% | 25% | tiny -2 pt | 34% / 35% |
| 3 candles after the high (high still holding) is an outside bar | **12%** | 14% | 14% | tiny -2 pt | 8% / 10% |
| 2 candles after the high (high still holding) is a bullish engulfing | **2%** | 4% | 4% | tiny -2 pt | 3% / 7% |
| 3 candles after the high (high still holding) takes the previous high and closes back below it | **15%** | 17% | 17% | tiny -2 pt | 14% / 18% |
| 2 candles after the high (high still holding) opens with no real gap | **15%** | 17% | 15% | tiny -2 pt | 36% / 37% |
| 1 candle before the high closes in its TOP third | **54%** | 52% | 35% | tiny +2 pt | 32% / 31% |
| 3 candles after the high (high still holding) is a bullish engulfing | **2%** | 5% | 4% | tiny -2 pt | 4% / 8% |
| 1 candle after the high (high still holding) has almost no upper wick | **64%** | 62% | 64% | tiny +2 pt | 32% / 30% |
| 3 candles after the high (high still holding) has a medium upper wick | **13%** | 15% | 13% | tiny -2 pt | 34% / 34% |
| 2 candles before the high is mostly body | **55%** | 53% | 55% | tiny +2 pt | 33% / 32% |
| 3 candles after the high (high still holding) is a hammer | **8%** | 10% | 10% | tiny -2 pt | 9% / 11% |
| 3 candles after the high (high still holding) opens with no real gap | **15%** | 17% | 15% | tiny -2 pt | 37% / 38% |
| 2 candles after the high (high still holding) has a medium upper wick | **13%** | 15% | 13% | tiny -2 pt | 34% / 34% |
| 1 candle after the high (high still holding) has a LARGE body | **33%** | 31% | 28% | tiny +2 pt | 43% / 32% |
| 3 candles before the high is mostly body | **56%** | 54% | 56% | tiny +2 pt | 32% / 32% |
| 3 candles before the high has a LONG upper wick | **19%** | 20% | 21% | tiny -2 pt | 34% / 35% |
| 1 candle before the high is mostly wick | **29%** | 31% | 30% | tiny -2 pt | 34% / 35% |
| 3 candles before the high opens with no real gap | **15%** | 16% | 15% | tiny -2 pt | 36% / 36% |
| 1 candle after the high (high still holding) opens with a gap DOWN | **61%** | 60% | 38% | tiny +2 pt | 32% / 30% |
| the high candle itself is a LARGE candle (top third of range) | **23%** | 22% | 10% | tiny +2 pt | 37% / 29% |
| 1 candle after the high (high still holding) opens with no real gap | **10%** | 12% | 11% | tiny -2 pt | 15% / 16% |
| 1 candle before the high is a medium-size candle | **23%** | 24% | 25% | tiny -2 pt | 33% / 35% |
| 1 candle before the high is half body | **17%** | 19% | 18% | tiny -1 pt | 33% / 33% |
| 1 candle before the high has a medium lower wick | **11%** | 12% | 12% | tiny -1 pt | 34% / 34% |
| 3 candles before the high takes the previous high and closes back below it | **16%** | 18% | 16% | tiny -1 pt | 17% / 18% |
| the high candle itself opens with a gap DOWN | **27%** | 28% | 49% | tiny -1 pt | 28% / 28% |
| 2 candles after the high (high still holding) is half body | **19%** | 20% | 19% | tiny -1 pt | 32% / 33% |
| 2 candles before the high has a medium lower wick | **11%** | 13% | 12% | tiny -1 pt | 33% / 33% |
| 1 candle after the high (high still holding) is half body | **19%** | 20% | 20% | tiny -1 pt | 31% / 33% |
| the high candle itself ends a SMALL leg | **32%** | 33% | — | tiny -1 pt | 29% / 33% |
| the high candle itself is an outside bar | **26%** | 25% | 14% | tiny +1 pt | 18% / 15% |
| 1 candle before the high takes the previous high and closes back below it | **14%** | 15% | 17% | tiny -1 pt | 13% / 14% |
| the high candle itself opens with no real gap | **16%** | 18% | 17% | tiny -1 pt | 43% / 44% |
| 2 candles before the high is half body | **19%** | 20% | 20% | tiny -1 pt | 33% / 34% |
| 3 candles before the high has a medium lower wick | **11%** | 13% | 12% | tiny -1 pt | 33% / 33% |
| 2 candles after the high (high still holding) takes the previous high and closes back below it | **15%** | 16% | 17% | tiny -1 pt | 10% / 14% |
| the high candle itself has almost no lower wick | **63%** | 62% | 63% | tiny +1 pt | 34% / 33% |
| 3 candles before the high is a medium-size candle | **24%** | 25% | 26% | tiny -1 pt | 35% / 35% |
| 1 candle after the high (high still holding) has a SMALL body | **36%** | 37% | 40% | tiny -1 pt | 28% / 34% |
| 3 candles before the high closes in its TOP third | **49%** | 47% | 39% | tiny +1 pt | 33% / 33% |
| 2 candles before the high has a LONG upper wick | **18%** | 19% | 22% | tiny -1 pt | 35% / 35% |
| the high candle itself is a bearish engulfing | **7%** | 6% | 4% | tiny +1 pt | 8% / 6% |
| 2 candles before the high opens with no real gap | **14%** | 15% | 15% | tiny -1 pt | 36% / 36% |
| 2 candles after the high (high still holding) is an outside bar | **11%** | 12% | 14% | tiny -1 pt | 5% / 8% |
| 3 candles before the high is half body | **19%** | 20% | 20% | tiny -1 pt | 33% / 34% |
| 1 candle after the high (high still holding) is a bullish engulfing | **1%** | 1% | 4% | tiny -1 pt | 1% / 3% |
| 2 candles before the high is a doji | **9%** | 9% | 9% | tiny +1 pt | 12% / 12% |
| 1 candle before the high is a shooting star | **4%** | 5% | 7% | tiny -1 pt | 5% / 6% |
| 3 candles after the high (high still holding) is a bearish engulfing | **4%** | 3% | 3% | tiny +0 pt | 7% / 6% |
| the high candle has a HIGH-impact USD release in the extreme candle or the 3 before | **1%** | 0% | 0% | tiny +0 pt | 1% / 0% |
| the high candle contains a HIGH-impact USD release | **0%** | 0% | 0% | tiny +0 pt | 0% / 0% |
| the high candle contains a USD-NEGATIVE surprise | **0%** | 0% | 0% | tiny +0 pt | 0% / 0% |

Passed OOS but NOT proven (53): the high candle itself is bullish [fails robustness]; the high candle itself is an inside bar [inconsistent]; 1 candle after the high (high still holding) is a hammer [fails robustness]; 1 candle after the high (high still holding) is a shooting star [fails robustness]; 2 candles after the high (high still holding) is an inside bar [fails robustness]; 3 candles after the high (high still holding) is an inside bar [fails robustness] …

## 3m

1,527,992 candles; median swing 5.14 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 7% / 15% / 25%, highs 5% / 12% / 22%.

### Swing LOWS: 89 findings (15162 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the low (low still holding) is bullish | **59%** | 40% | 46% | clear +19 pt | 58% / 41% |
| 3 candles after the low (low still holding) closes in its TOP third | **56%** | 37% | 44% | clear +19 pt | 49% / 34% |
| 3 candles after the low (low still holding) is bearish | **31%** | 49% | 44% | clear -18 pt | 31% / 48% |
| 2 candles after the low (low still holding) is bullish | **62%** | 45% | 45% | clear +18 pt | 63% / 46% |
| 2 candles after the low (low still holding) closes in its TOP third | **58%** | 41% | 44% | clear +17 pt | 53% / 37% |
| 2 candles after the low (low still holding) is bearish | **28%** | 44% | 45% | clear -16 pt | 26% / 42% |
| 1 candle after the low (low still holding) closes in its TOP third | **54%** | 38% | 34% | clear +16 pt | 47% / 33% |
| 1 candle after the low (low still holding) is bullish | **71%** | 57% | 46% | clear +14 pt | 77% / 64% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **20%** | 34% | 29% | clear -14 pt | 20% / 33% |
| 2 candles after the low (low still holding) closes in its BOTTOM third | **18%** | 32% | 30% | clear -14 pt | 18% / 30% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **21%** | 34% | 40% | clear -13 pt | 20% / 33% |
| 1 candle after the low (low still holding) is bearish | **20%** | 32% | 43% | clear -12 pt | 15% / 25% |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | **35%** | 23% | 30% | clear +12 pt | 32% / 22% |
| 3 candles after the low (low still holding) is a LARGE candle (top third of range) | **31%** | 21% | 29% | clear +10 pt | 29% / 19% |
| the low candle itself is a LARGE candle (top third of range) | **45%** | 35% | 11% | clear +10 pt | 43% / 33% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **43%** | 33% | 30% | clear +10 pt | 44% / 33% |
| 1 candle after the low (low still holding) has a LARGE body | **42%** | 33% | 30% | moderate +9 pt | 46% / 33% |
| 1 candle after the low (low still holding) has almost no upper wick | **56%** | 47% | 51% | moderate +9 pt | 42% / 33% |
| 2 candles after the low (low still holding) has a LARGE body | **35%** | 26% | 30% | moderate +9 pt | 34% / 26% |
| 3 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **39%** | 46% | 40% | moderate -7 pt | 37% / 44% |
| 2 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **37%** | 44% | 41% | moderate -7 pt | 36% / 41% |
| 1 candle after the low (low still holding) has a LONG upper wick | **19%** | 26% | 22% | moderate -7 pt | 24% / 33% |
| 1 candle after the low (low still holding) takes the previous high and closes back below it | **18%** | 24% | 20% | moderate -7 pt | 18% / 25% |
| 3 candles after the low (low still holding) has a LARGE body | **31%** | 25% | 30% | moderate +7 pt | 31% / 24% |
| the low candle has HEAVY real CME volume (≥ 1.5× its 20-candle median; 2024-10+) | **62%** | 56% | 23% | moderate +6 pt | 54% / 50% |
| 1 candle after the low (low still holding) is mostly body | **43%** | 37% | 37% | moderate +6 pt | 43% / 33% |
| 1 candle after the low (low still holding) is a medium-size candle | **23%** | 30% | 25% | moderate -6 pt | 27% / 33% |
| 2 candles after the low (low still holding) has almost no upper wick | **47%** | 40% | 45% | moderate +6 pt | 31% / 28% |
| 2 candles after the low (low still holding) has a SMALL body | **33%** | 39% | 36% | moderate -6 pt | 33% / 38% |
| 3 candles after the low (low still holding) has a LONG upper wick | **28%** | 34% | 30% | moderate -6 pt | 36% / 39% |
| 1 candle after the low (low still holding) has a SMALL body | **29%** | 35% | 37% | moderate -6 pt | 26% / 33% |
| the low candle itself closes in its TOP third | **50%** | 44% | 38% | moderate +5 pt | 39% / 33% |
| 2 candles after the low (low still holding) has a LONG upper wick | **27%** | 33% | 29% | moderate -5 pt | 34% / 39% |
| the low candle itself is bearish | **42%** | 48% | 44% | moderate -5 pt | 54% / 58% |
| the low candle itself is a SMALL candle (bottom third of range) | **26%** | 31% | 68% | moderate -5 pt | 27% / 33% |
| 3 candles after the low (low still holding) has a SMALL body | **34%** | 39% | 36% | moderate -5 pt | 35% / 39% |
| 1 candle after the low (low still holding) is mostly wick | **29%** | 34% | 34% | tiny -5 pt | 26% / 33% |
| 2 candles after the low (low still holding) takes the previous low and closes back above it | **13%** | 18% | 22% | tiny -5 pt | 12% / 17% |
| 2 candles after the low (low still holding) is a medium-size candle | **28%** | 33% | 29% | tiny -5 pt | 32% / 37% |
| 3 candles after the low (low still holding) takes the previous low and closes back above it | **18%** | 22% | 22% | tiny -5 pt | 17% / 21% |
| 3 candles after the low (low still holding) closes in its middle third | **24%** | 29% | 27% | tiny -5 pt | 31% / 34% |
| 3 candles after the low (low still holding) has almost no upper wick | **46%** | 41% | 44% | tiny +5 pt | 31% / 28% |
| 2 candles after the low (low still holding) is an inside bar | **16%** | 21% | 17% | tiny -4 pt | 19% / 22% |
| 3 candles after the low (low still holding) opens with a gap DOWN | **39%** | 44% | 42% | tiny -4 pt | 29% / 31% |
| the low candle itself ends a BIG leg (size in ATR) | **39%** | 34% | — | tiny +4 pt | 39% / 33% |
| the low candle itself has a LARGE body | **35%** | 31% | 19% | tiny +4 pt | 39% / 33% |
| 3 candles after the low (low still holding) opens with a gap UP | **46%** | 42% | 43% | tiny +4 pt | 35% / 34% |
| the low candle itself ends a SMALL leg | **28%** | 31% | — | tiny -4 pt | 28% / 33% |
| 1 candle after the low (low still holding) is a SMALL candle (bottom third of range) | **34%** | 37% | 44% | tiny -4 pt | 30% / 33% |
| the low candle itself is an outside bar | **23%** | 19% | 11% | tiny +4 pt | 18% / 15% |
| 1 candle after the low (low still holding) has a medium body | **29%** | 33% | 32% | tiny -4 pt | 28% / 33% |
| 2 candles after the low (low still holding) opens with a gap UP | **47%** | 44% | 43% | tiny +4 pt | 36% / 35% |
| 1 candle after the low (low still holding) is a marubozu (almost all body) | **20%** | 16% | 17% | tiny +4 pt | 15% / 10% |
| the low candle itself is a LOWER low than the previous swing low | **47%** | 44% | — | tiny +4 pt | 47% / 42% |
| 2 candles after the low (low still holding) opens with a gap DOWN | **39%** | 42% | 42% | tiny -3 pt | 31% / 31% |
| 2 candles after the low (low still holding) closes in its middle third | **24%** | 28% | 27% | tiny -3 pt | 30% / 33% |
| the low candle itself has a SMALL body | **33%** | 36% | 45% | tiny -3 pt | 30% / 33% |
| 2 candles after the low (low still holding) is mostly wick | **32%** | 35% | 34% | tiny -3 pt | 32% / 36% |
| the low candle itself closes in its BOTTOM third | **24%** | 27% | 37% | tiny -3 pt | 30% / 33% |
| the low candle itself takes the previous low and closes back above it | **58%** | 55% | 22% | tiny +3 pt | 52% / 50% |
| 2 candles after the low (low still holding) is mostly body | **39%** | 36% | 37% | tiny +3 pt | 36% / 31% |
| 3 candles after the low (low still holding) is a medium-size candle | **30%** | 33% | 31% | tiny -3 pt | 33% / 37% |
| 3 candles after the low (low still holding) is a bearish engulfing | **3%** | 6% | 4% | tiny -3 pt | 5% / 10% |
| 2 candles after the low (low still holding) has a medium body | **33%** | 35% | 34% | tiny -3 pt | 33% / 36% |
| 1 candle after the low (low still holding) is a shooting star | **7%** | 10% | 8% | tiny -3 pt | 7% / 12% |
| 1 candle before the low is a LARGE candle (top third of range) | **30%** | 27% | 20% | tiny +3 pt | 36% / 33% |
| 2 candles after the low (low still holding) is a bearish engulfing | **3%** | 5% | 5% | tiny -3 pt | 3% / 7% |
| 1 candle after the low (low still holding) closes in its middle third | **25%** | 28% | 26% | tiny -3 pt | 33% / 33% |
| the low candle itself has a LONG upper wick | **31%** | 34% | 45% | tiny -2 pt | 30% / 33% |
| 3 candles after the low (low still holding) is an inside bar | **16%** | 19% | 17% | tiny -2 pt | 18% / 19% |
| 1 candle after the low (low still holding) opens with a gap UP | **51%** | 49% | 40% | tiny +2 pt | 34% / 33% |
| 3 candles after the low (low still holding) is mostly body | **38%** | 35% | 37% | tiny +2 pt | 34% / 31% |
| the low candle itself has almost no upper wick | **45%** | 42% | 36% | tiny +2 pt | 36% / 33% |
| 2 candles after the low (low still holding) is a marubozu (almost all body) | **18%** | 16% | 17% | tiny +2 pt | 11% / 9% |
| 3 candles after the low (low still holding) is mostly wick | **32%** | 34% | 33% | tiny -2 pt | 33% / 36% |
| the low candle itself is a bullish engulfing | **8%** | 6% | 5% | tiny +2 pt | 8% / 6% |
| 1 candle after the low (low still holding) is a doji | **9%** | 11% | 11% | tiny -2 pt | 8% / 11% |
| the low candle itself opens with a gap DOWN | **54%** | 52% | 39% | tiny +2 pt | 34% / 33% |
| 2 candles after the low (low still holding) is an outside bar | **8%** | 10% | 11% | tiny -2 pt | 6% / 9% |
| 2 candles after the low (low still holding) is a shooting star | **7%** | 9% | 7% | tiny -2 pt | 8% / 10% |
| 3 candles after the low (low still holding) is a marubozu (almost all body) | **18%** | 16% | 17% | tiny +2 pt | 10% / 9% |
| 3 candles after the low (low still holding) is an outside bar | **10%** | 12% | 11% | tiny -2 pt | 9% / 11% |
| 1 candle after the low (low still holding) is a bearish engulfing | **1%** | 3% | 4% | tiny -2 pt | 1% / 3% |
| 3 candles after the low (low still holding) is a shooting star | **7%** | 8% | 7% | tiny -2 pt | 9% / 9% |
| 1 candle after the low (low still holding) is a bullish engulfing | **8%** | 6% | 5% | tiny +1 pt | 13% / 11% |
| 2 candles after the low (low still holding) is a doji | **10%** | 11% | 10% | tiny -1 pt | 11% / 12% |
| 3 candles after the low (low still holding) is a bullish engulfing | **5%** | 4% | 5% | tiny +1 pt | 8% / 7% |
| the low candle has a HIGH-impact USD release in the extreme candle or the 3 before | **2%** | 1% | 1% | tiny +1 pt | 2% / 1% |
| the low candle contains a HIGH-impact USD release | **1%** | 0% | 0% | tiny +0 pt | 1% / 0% |

Passed OOS but NOT proven (12): the low candle itself is bullish [fails robustness]; 1 candle after the low (low still holding) is an inside bar [fails robustness]; 2 candles after the low (low still holding) takes the previous high and closes back below it [fails robustness]; the low candle itself is a medium-size candle [fails robustness]; the low candle happens while the silver candle is UP [fails robustness]; 3 candles after the low (low still holding) takes the previous high and closes back below it [fails robustness] …

### Swing HIGHS: 78 findings (15163 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the high (high still holding) is bearish | **58%** | 40% | 43% | clear +18 pt | 58% / 41% |
| 2 candles after the high (high still holding) is bearish | **64%** | 46% | 44% | clear +18 pt | 64% / 46% |
| 3 candles after the high (high still holding) closes in its BOTTOM third | **48%** | 31% | 36% | clear +17 pt | 49% / 34% |
| 3 candles after the high (high still holding) is bullish | **32%** | 48% | 46% | clear -17 pt | 31% / 48% |
| 2 candles after the high (high still holding) is bullish | **27%** | 43% | 46% | clear -16 pt | 26% / 42% |
| 2 candles after the high (high still holding) closes in its BOTTOM third | **52%** | 36% | 36% | clear +16 pt | 54% / 37% |
| 2 candles after the high (high still holding) closes in its TOP third | **21%** | 36% | 37% | clear -15 pt | 17% / 30% |
| 3 candles after the high (high still holding) closes in its TOP third | **25%** | 39% | 37% | clear -15 pt | 20% / 32% |
| 1 candle after the high (high still holding) closes in its BOTTOM third | **49%** | 35% | 27% | clear +14 pt | 47% / 33% |
| 1 candle after the high (high still holding) closes in its TOP third | **25%** | 38% | 50% | clear -14 pt | 20% / 33% |
| 1 candle after the high (high still holding) is bearish | **73%** | 62% | 43% | clear +11 pt | 77% / 65% |
| 1 candle after the high (high still holding) has a LONG lower wick | **26%** | 36% | 31% | clear -11 pt | 23% / 33% |
| 1 candle after the high (high still holding) has a LARGE body | **43%** | 32% | 32% | clear +10 pt | 45% / 33% |
| 1 candle after the high (high still holding) has almost no lower wick | **50%** | 40% | 45% | moderate +10 pt | 43% / 33% |
| 2 candles after the high (high still holding) has a LARGE body | **34%** | 25% | 31% | moderate +9 pt | 35% / 26% |
| 1 candle after the high (high still holding) is mostly body | **45%** | 36% | 37% | moderate +9 pt | 44% / 33% |
| 1 candle after the high (high still holding) takes the previous low and closes back above it | **18%** | 27% | 23% | moderate -9 pt | 18% / 26% |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | **31%** | 22% | 30% | moderate +9 pt | 30% / 21% |
| 1 candle after the high (high still holding) is bullish | **17%** | 26% | 46% | moderate -9 pt | 15% / 24% |
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **32%** | 24% | 30% | moderate +9 pt | 32% / 23% |
| 3 candles after the high (high still holding) has a LARGE body | **33%** | 25% | 31% | moderate +8 pt | 33% / 24% |
| 1 candle after the high (high still holding) is mostly wick | **28%** | 36% | 34% | moderate -8 pt | 26% / 33% |
| 1 candle after the high (high still holding) is a hammer | **11%** | 18% | 13% | moderate -7 pt | 8% / 13% |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **39%** | 46% | 40% | moderate -7 pt | 37% / 43% |
| 2 candles after the high (high still holding) has almost no lower wick | **42%** | 36% | 38% | moderate +6 pt | 32% / 28% |
| 1 candle after the high (high still holding) has a SMALL body | **29%** | 36% | 37% | moderate -6 pt | 27% / 33% |
| 3 candles after the high (high still holding) has a LONG lower wick | **36%** | 42% | 39% | moderate -6 pt | 35% / 38% |
| 3 candles after the high (high still holding) has a SMALL body | **35%** | 41% | 36% | moderate -6 pt | 35% / 39% |
| 2 candles after the high (high still holding) has a LONG lower wick | **35%** | 40% | 38% | moderate -6 pt | 33% / 39% |
| 3 candles after the high (high still holding) takes the previous high and closes back below it | **14%** | 20% | 20% | moderate -6 pt | 17% / 21% |
| 3 candles after the high (high still holding) has almost no lower wick | **41%** | 35% | 37% | moderate +6 pt | 31% / 29% |
| 2 candles after the high (high still holding) has a SMALL body | **33%** | 39% | 36% | moderate -6 pt | 33% / 38% |
| 1 candle after the high (high still holding) is a marubozu (almost all body) | **21%** | 16% | 17% | moderate +6 pt | 15% / 10% |
| 1 candle after the high (high still holding) is a medium-size candle | **25%** | 30% | 26% | moderate -5 pt | 27% / 33% |
| 1 candle after the high (high still holding) is a LARGE candle (top third of range) | **39%** | 34% | 31% | moderate +5 pt | 42% / 33% |
| 2 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **39%** | 44% | 40% | moderate -5 pt | 35% / 40% |
| the high candle itself closes in its BOTTOM third | **35%** | 30% | 31% | moderate +5 pt | 38% / 33% |
| 2 candles after the high (high still holding) is mostly wick | **31%** | 36% | 34% | moderate -5 pt | 32% / 36% |
| 2 candles after the high (high still holding) is mostly body | **39%** | 34% | 37% | tiny +5 pt | 36% / 30% |
| 3 candles after the high (high still holding) is mostly wick | **32%** | 37% | 34% | tiny -4 pt | 33% / 35% |
| the high candle itself closes in its TOP third | **38%** | 43% | 45% | tiny -4 pt | 29% / 33% |
| 3 candles after the high (high still holding) opens with a gap DOWN | **49%** | 44% | 44% | tiny +4 pt | 36% / 34% |
| 3 candles after the high (high still holding) is mostly body | **38%** | 34% | 37% | tiny +4 pt | 34% / 31% |
| 2 candles after the high (high still holding) is a hammer | **11%** | 16% | 13% | tiny -4 pt | 9% / 11% |
| 3 candles after the high (high still holding) is an outside bar | **9%** | 13% | 11% | tiny -4 pt | 8% / 11% |
| 2 candles after the high (high still holding) takes the previous high and closes back below it | **10%** | 14% | 20% | tiny -4 pt | 12% / 17% |
| 1 candle after the high (high still holding) has a medium body | **28%** | 32% | 31% | tiny -4 pt | 28% / 33% |
| 2 candles after the high (high still holding) is an outside bar | **6%** | 9% | 11% | tiny -4 pt | 6% / 9% |
| 2 candles after the high (high still holding) opens with a gap DOWN | **50%** | 47% | 45% | tiny +4 pt | 37% / 35% |
| the high candle itself is a LARGE candle (top third of range) | **29%** | 25% | 12% | tiny +4 pt | 42% / 33% |
| 2 candles after the high (high still holding) is a bullish engulfing | **2%** | 5% | 5% | tiny -3 pt | 3% / 7% |
| the high candle itself has almost no lower wick | **39%** | 36% | 31% | tiny +3 pt | 35% / 33% |
| 2 candles after the high (high still holding) is a medium-size candle | **28%** | 32% | 30% | tiny -3 pt | 33% / 37% |
| 3 candles after the high (high still holding) opens with a gap UP | **37%** | 41% | 42% | tiny -3 pt | 30% / 32% |
| the high candle itself has a LONG lower wick | **43%** | 46% | 52% | tiny -3 pt | 31% / 33% |
| 3 candles after the high (high still holding) is a bullish engulfing | **3%** | 7% | 5% | tiny -3 pt | 5% / 10% |
| 3 candles after the high (high still holding) is a hammer | **12%** | 15% | 14% | tiny -3 pt | 9% / 10% |
| the high candle itself has a LARGE body | **33%** | 29% | 21% | tiny +3 pt | 37% / 33% |
| 2 candles after the high (high still holding) has a medium body | **33%** | 36% | 33% | tiny -3 pt | 32% / 36% |
| the high candle itself takes the previous high and closes back below it | **51%** | 48% | 20% | tiny +3 pt | 52% / 49% |
| 2 candles after the high (high still holding) is a marubozu (almost all body) | **18%** | 15% | 17% | tiny +3 pt | 12% / 9% |
| 2 candles after the high (high still holding) opens with a gap UP | **36%** | 39% | 41% | tiny -3 pt | 30% / 32% |
| the high candle itself has a SMALL body | **34%** | 36% | 43% | tiny -2 pt | 31% / 33% |
| 1 candle after the high (high still holding) is a doji | **9%** | 12% | 11% | tiny -2 pt | 9% / 11% |
| 3 candles after the high (high still holding) is a marubozu (almost all body) | **18%** | 15% | 17% | tiny +2 pt | 11% / 9% |
| 3 candles after the high (high still holding) is a medium-size candle | **30%** | 32% | 30% | tiny -2 pt | 33% / 36% |
| 3 candles after the high (high still holding) has a medium body | **32%** | 35% | 33% | tiny -2 pt | 33% / 37% |
| 2 candles after the high (high still holding) is a doji | **10%** | 12% | 11% | tiny -2 pt | 10% / 12% |
| 1 candle before the high has a SMALL body | **36%** | 38% | 46% | tiny -2 pt | 32% / 33% |
| the high candle itself is a SMALL candle (bottom third of range) | **43%** | 45% | 65% | tiny -2 pt | 29% / 33% |
| the high candle itself is a bearish engulfing | **8%** | 6% | 5% | tiny +2 pt | 8% / 6% |
| 1 candle before the high is mostly body | **36%** | 34% | 29% | tiny +2 pt | 35% / 33% |
| the high candle itself is an outside bar | **19%** | 18% | 11% | tiny +2 pt | 18% / 15% |
| 3 candles after the high (high still holding) is a doji | **10%** | 12% | 11% | tiny -2 pt | 10% / 12% |
| 1 candle after the high (high still holding) is a bearish engulfing | **8%** | 7% | 4% | tiny +1 pt | 14% / 12% |
| the high candle itself is a hammer | **8%** | 9% | 14% | tiny -1 pt | 2% / 2% |
| 1 candle after the high (high still holding) is a bullish engulfing | **1%** | 2% | 5% | tiny -1 pt | 1% / 3% |
| the high candle has a HIGH-impact USD release in the extreme candle or the 3 before | **2%** | 1% | 1% | tiny +0 pt | 2% / 1% |

Passed OOS but NOT proven (11): the high candle itself is bearish [fails robustness]; 1 candle after the high (high still holding) is an inside bar [fails robustness]; 2 candles after the high (high still holding) is an inside bar [fails robustness]; 2 candles after the high (high still holding) takes the previous low and closes back above it [fails robustness]; 3 candles after the high (high still holding) takes the previous low and closes back above it [fails robustness]; the high candle itself is bullish [fails robustness] …

## 5m

917,153 candles; median swing 5.15 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 7% / 15% / 25%, highs 5% / 13% / 22%.

### Swing LOWS: 83 findings (8967 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 2 candles after the low (low still holding) is bullish | **64%** | 43% | 46% | clear +21 pt | 64% / 46% |
| 3 candles after the low (low still holding) is bullish | **60%** | 40% | 45% | clear +20 pt | 58% / 42% |
| 2 candles after the low (low still holding) is bearish | **26%** | 45% | 43% | clear -19 pt | 26% / 43% |
| 3 candles after the low (low still holding) is bearish | **30%** | 49% | 44% | clear -19 pt | 31% / 47% |
| 2 candles after the low (low still holding) closes in its TOP third | **58%** | 39% | 44% | clear +18 pt | 52% / 37% |
| 3 candles after the low (low still holding) closes in its TOP third | **54%** | 37% | 43% | clear +17 pt | 48% / 34% |
| 1 candle after the low (low still holding) closes in its TOP third | **53%** | 38% | 33% | clear +15 pt | 47% / 33% |
| 2 candles after the low (low still holding) closes in its BOTTOM third | **16%** | 31% | 27% | clear -14 pt | 18% / 30% |
| 1 candle after the low (low still holding) is bullish | **74%** | 60% | 46% | clear +14 pt | 76% / 64% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **19%** | 34% | 29% | clear -14 pt | 21% / 33% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **19%** | 33% | 40% | clear -13 pt | 21% / 33% |
| 1 candle after the low (low still holding) is bearish | **17%** | 30% | 43% | clear -13 pt | 16% / 25% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **45%** | 33% | 32% | clear +12 pt | 44% / 33% |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | **35%** | 23% | 30% | clear +12 pt | 32% / 22% |
| 1 candle after the low (low still holding) has a LARGE body | **46%** | 34% | 33% | clear +11 pt | 46% / 33% |
| 3 candles after the low (low still holding) is a LARGE candle (top third of range) | **31%** | 20% | 29% | clear +11 pt | 28% / 19% |
| 2 candles after the low (low still holding) has a LARGE body | **37%** | 27% | 32% | clear +10 pt | 33% / 25% |
| the low candle itself is a LARGE candle (top third of range) | **37%** | 28% | 9% | moderate +10 pt | 43% / 33% |
| 1 candle after the low (low still holding) takes the previous high and closes back below it | **18%** | 27% | 21% | moderate -8 pt | 19% / 26% |
| 1 candle after the low (low still holding) has almost no upper wick | **52%** | 43% | 50% | moderate +8 pt | 42% / 33% |
| 3 candles after the low (low still holding) has a LARGE body | **33%** | 25% | 30% | moderate +8 pt | 30% / 23% |
| 3 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **35%** | 43% | 38% | moderate -8 pt | 38% / 45% |
| 1 candle after the low (low still holding) has a LONG upper wick | **20%** | 27% | 22% | moderate -7 pt | 24% / 33% |
| 2 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **34%** | 41% | 37% | moderate -7 pt | 35% / 41% |
| 1 candle after the low (low still holding) is a medium-size candle | **25%** | 32% | 27% | moderate -7 pt | 26% / 33% |
| 1 candle after the low (low still holding) is mostly body | **43%** | 36% | 36% | moderate +7 pt | 44% / 33% |
| 1 candle after the low (low still holding) has a SMALL body | **27%** | 34% | 36% | moderate -7 pt | 27% / 33% |
| the low candle has HEAVY real CME volume (≥ 1.5× its 20-candle median; 2024-10+) | **63%** | 57% | 24% | moderate +6 pt | 59% / 54% |
| 2 candles after the low (low still holding) has almost no upper wick | **42%** | 36% | 41% | moderate +6 pt | 30% / 27% |
| 2 candles after the low (low still holding) has a SMALL body | **32%** | 38% | 35% | moderate -6 pt | 33% / 38% |
| 2 candles after the low (low still holding) has a LONG upper wick | **29%** | 35% | 29% | moderate -6 pt | 35% / 39% |
| 3 candles after the low (low still holding) takes the previous low and closes back above it | **19%** | 25% | 24% | moderate -6 pt | 18% / 23% |
| the low candle itself has a LARGE body | **34%** | 28% | 19% | moderate +6 pt | 38% / 33% |
| 1 candle after the low (low still holding) is mostly wick | **27%** | 33% | 33% | moderate -6 pt | 26% / 33% |
| 3 candles after the low (low still holding) has a SMALL body | **33%** | 38% | 35% | moderate -6 pt | 35% / 40% |
| 2 candles after the low (low still holding) takes the previous low and closes back above it | **14%** | 19% | 24% | moderate -6 pt | 13% / 18% |
| 1 candle after the low (low still holding) is a SMALL candle (bottom third of range) | **30%** | 35% | 41% | moderate -5 pt | 30% / 33% |
| 2 candles after the low (low still holding) is an inside bar | **15%** | 20% | 15% | moderate -5 pt | 18% / 22% |
| 2 candles after the low (low still holding) is mostly wick | **31%** | 36% | 34% | moderate -5 pt | 32% / 36% |
| the low candle itself is a SMALL candle (bottom third of range) | **29%** | 34% | 68% | tiny -5 pt | 27% / 33% |
| 2 candles after the low (low still holding) is a medium-size candle | **32%** | 36% | 33% | tiny -5 pt | 33% / 37% |
| 2 candles after the low (low still holding) is mostly body | **39%** | 34% | 36% | tiny +5 pt | 35% / 30% |
| 1 candle after the low (low still holding) has a medium body | **27%** | 32% | 31% | tiny -5 pt | 27% / 33% |
| 2 candles after the low (low still holding) opens with a gap DOWN | **39%** | 43% | 42% | tiny -5 pt | 30% / 32% |
| the low candle itself ends a BIG leg (size in ATR) | **38%** | 34% | — | tiny +5 pt | 39% / 33% |
| 2 candles after the low (low still holding) opens with a gap UP | **47%** | 42% | 43% | tiny +4 pt | 36% / 34% |
| the low candle itself ends a SMALL leg | **29%** | 33% | — | tiny -4 pt | 28% / 33% |
| 3 candles after the low (low still holding) has almost no upper wick | **41%** | 36% | 40% | tiny +4 pt | 28% / 27% |
| 3 candles after the low (low still holding) opens with a gap UP | **47%** | 42% | 43% | tiny +4 pt | 36% / 34% |
| the low candle itself has a SMALL body | **33%** | 37% | 44% | tiny -4 pt | 31% / 33% |
| 3 candles after the low (low still holding) has a LONG upper wick | **30%** | 34% | 30% | tiny -4 pt | 37% / 39% |
| 2 candles after the low (low still holding) has a medium body | **31%** | 35% | 34% | tiny -4 pt | 33% / 37% |
| 2 candles after the low (low still holding) closes in its middle third | **26%** | 30% | 29% | tiny -4 pt | 30% / 34% |
| 3 candles after the low (low still holding) is an inside bar | **15%** | 18% | 16% | tiny -4 pt | 18% / 18% |
| the low candle itself closes in its TOP third | **47%** | 43% | 36% | tiny +4 pt | 39% / 33% |
| 1 candle after the low (low still holding) is a marubozu (almost all body) | **16%** | 13% | 13% | tiny +4 pt | 12% / 8% |
| 3 candles after the low (low still holding) opens with a gap DOWN | **39%** | 43% | 43% | tiny -4 pt | 29% / 31% |
| 3 candles after the low (low still holding) is a bearish engulfing | **3%** | 7% | 5% | tiny -4 pt | 5% / 9% |
| 3 candles after the low (low still holding) is mostly body | **37%** | 34% | 36% | tiny +4 pt | 33% / 31% |
| 1 candle before the low is a LARGE candle (top third of range) | **31%** | 27% | 19% | tiny +3 pt | 35% / 33% |
| 2 candles after the low (low still holding) is a marubozu (almost all body) | **15%** | 12% | 13% | tiny +3 pt | 9% / 7% |
| 2 candles after the low (low still holding) is a bearish engulfing | **3%** | 6% | 5% | tiny -3 pt | 3% / 7% |
| 3 candles after the low (low still holding) is mostly wick | **32%** | 35% | 33% | tiny -3 pt | 33% / 36% |
| the low candle itself has almost no upper wick | **43%** | 40% | 30% | tiny +3 pt | 36% / 33% |
| the low candle itself is a LOWER low than the previous swing low | **47%** | 44% | — | tiny +3 pt | 47% / 42% |
| 3 candles after the low (low still holding) closes in its middle third | **26%** | 29% | 28% | tiny -3 pt | 31% / 34% |
| the low candle itself is an outside bar | **21%** | 17% | 11% | tiny +3 pt | 18% / 15% |
| 1 candle after the low (low still holding) is a shooting star | **6%** | 9% | 6% | tiny -3 pt | 8% / 12% |
| 3 candles after the low (low still holding) is an outside bar | **10%** | 13% | 11% | tiny -3 pt | 9% / 11% |
| 2 candles after the low (low still holding) is an outside bar | **8%** | 11% | 11% | tiny -3 pt | 7% / 9% |
| 1 candle before the low has a LARGE body | **31%** | 28% | 17% | tiny +3 pt | 35% / 33% |
| 3 candles after the low (low still holding) is a medium-size candle | **34%** | 36% | 34% | tiny -3 pt | 34% / 36% |
| 1 candle before the low is a SMALL candle (bottom third of range) | **35%** | 38% | 45% | tiny -3 pt | 31% / 33% |
| the low candle itself is a bullish engulfing | **8%** | 6% | 5% | tiny +2 pt | 8% / 6% |
| 2 candles after the low (low still holding) is a shooting star | **6%** | 8% | 7% | tiny -2 pt | 8% / 10% |
| the low candle itself closes in its BOTTOM third | **24%** | 26% | 36% | tiny -2 pt | 29% / 33% |
| 1 candle after the low (low still holding) is a doji | **9%** | 11% | 11% | tiny -2 pt | 8% / 10% |
| 2 candles after the low (low still holding) is a doji | **10%** | 11% | 11% | tiny -2 pt | 10% / 11% |
| 1 candle after the low (low still holding) is a bearish engulfing | **1%** | 3% | 5% | tiny -2 pt | 1% / 3% |
| 1 candle before the low is an inside bar | **12%** | 14% | 16% | tiny -2 pt | 12% / 13% |
| 3 candles after the low (low still holding) is a shooting star | **6%** | 8% | 6% | tiny -2 pt | 9% / 10% |
| the low candle has a HIGH-impact USD release in the extreme candle or the 3 before | **3%** | 2% | 1% | tiny +1 pt | 3% / 2% |
| the low candle contains a HIGH-impact USD release | **1%** | 1% | 0% | tiny +1 pt | 1% / 1% |

Passed OOS but NOT proven (7): 1 candle after the low (low still holding) is an inside bar [fails robustness]; 2 candles after the low (low still holding) takes the previous high and closes back below it [fails robustness]; the low candle itself is a medium-size candle [fails robustness]; the low candle itself is bullish [fails robustness]; the low candle happens while the silver candle is UP [fails robustness]; the low candle itself is bearish [fails robustness] …

### Swing HIGHS: 74 findings (8968 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the high (high still holding) is bearish | **60%** | 40% | 43% | clear +20 pt | 58% / 40% |
| 2 candles after the high (high still holding) is bearish | **63%** | 45% | 43% | clear +19 pt | 64% / 47% |
| 3 candles after the high (high still holding) is bullish | **30%** | 48% | 46% | clear -18 pt | 31% / 48% |
| 3 candles after the high (high still holding) closes in its BOTTOM third | **49%** | 31% | 34% | clear +18 pt | 48% / 33% |
| 2 candles after the high (high still holding) closes in its BOTTOM third | **50%** | 32% | 33% | clear +17 pt | 52% / 37% |
| 2 candles after the high (high still holding) is bullish | **26%** | 43% | 46% | clear -17 pt | 26% / 42% |
| 3 candles after the high (high still holding) closes in its TOP third | **23%** | 39% | 36% | clear -16 pt | 21% / 32% |
| 2 candles after the high (high still holding) closes in its TOP third | **22%** | 37% | 37% | clear -15 pt | 17% / 30% |
| 1 candle after the high (high still holding) closes in its TOP third | **24%** | 39% | 50% | clear -15 pt | 20% / 33% |
| 1 candle after the high (high still holding) closes in its BOTTOM third | **47%** | 32% | 25% | clear +14 pt | 47% / 33% |
| 1 candle after the high (high still holding) is bearish | **77%** | 63% | 43% | clear +13 pt | 77% / 65% |
| 1 candle after the high (high still holding) has a LARGE body | **46%** | 33% | 34% | clear +13 pt | 46% / 33% |
| 1 candle after the high (high still holding) has a LONG lower wick | **27%** | 38% | 31% | clear -11 pt | 24% / 33% |
| 1 candle after the high (high still holding) has almost no lower wick | **46%** | 35% | 42% | clear +11 pt | 43% / 33% |
| 1 candle after the high (high still holding) takes the previous low and closes back above it | **20%** | 31% | 24% | clear -11 pt | 19% / 26% |
| 1 candle after the high (high still holding) is mostly body | **45%** | 35% | 36% | clear +11 pt | 44% / 33% |
| 2 candles after the high (high still holding) has a LARGE body | **36%** | 26% | 32% | clear +10 pt | 35% / 26% |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | **32%** | 22% | 31% | clear +10 pt | 31% / 20% |
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **34%** | 24% | 31% | moderate +10 pt | 33% / 23% |
| 1 candle after the high (high still holding) is bullish | **15%** | 25% | 46% | moderate -10 pt | 14% / 24% |
| 1 candle after the high (high still holding) is mostly wick | **25%** | 34% | 32% | moderate -9 pt | 25% / 33% |
| 3 candles after the high (high still holding) has a LARGE body | **34%** | 25% | 32% | moderate +9 pt | 32% / 24% |
| 1 candle after the high (high still holding) is a LARGE candle (top third of range) | **42%** | 34% | 33% | moderate +8 pt | 43% / 33% |
| 1 candle after the high (high still holding) has a SMALL body | **26%** | 34% | 34% | moderate -8 pt | 26% / 33% |
| 2 candles after the high (high still holding) has a LONG lower wick | **38%** | 45% | 40% | moderate -7 pt | 35% / 39% |
| 2 candles after the high (high still holding) has a SMALL body | **31%** | 39% | 34% | moderate -7 pt | 33% / 38% |
| 1 candle after the high (high still holding) is a hammer | **10%** | 17% | 12% | moderate -7 pt | 8% / 13% |
| 2 candles after the high (high still holding) is mostly body | **39%** | 32% | 36% | moderate +7 pt | 35% / 30% |
| 2 candles after the high (high still holding) has almost no lower wick | **36%** | 30% | 34% | moderate +6 pt | 30% / 27% |
| 2 candles after the high (high still holding) is mostly wick | **31%** | 37% | 34% | moderate -6 pt | 32% / 36% |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **36%** | 42% | 37% | moderate -6 pt | 37% / 44% |
| 1 candle after the high (high still holding) is a medium-size candle | **26%** | 32% | 28% | moderate -6 pt | 27% / 33% |
| 3 candles after the high (high still holding) has a LONG lower wick | **38%** | 44% | 40% | moderate -6 pt | 36% / 39% |
| 2 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **35%** | 41% | 37% | moderate -6 pt | 35% / 40% |
| 1 candle after the high (high still holding) has a medium body | **28%** | 34% | 32% | moderate -5 pt | 29% / 33% |
| 1 candle after the high (high still holding) is a marubozu (almost all body) | **18%** | 12% | 13% | moderate +5 pt | 13% / 8% |
| 3 candles after the high (high still holding) opens with a gap DOWN | **49%** | 44% | 44% | moderate +5 pt | 36% / 34% |
| 3 candles after the high (high still holding) has a SMALL body | **33%** | 38% | 34% | tiny -5 pt | 34% / 39% |
| the high candle itself has a LARGE body | **33%** | 28% | 21% | tiny +5 pt | 37% / 33% |
| 3 candles after the high (high still holding) has almost no lower wick | **35%** | 30% | 33% | tiny +5 pt | 30% / 28% |
| 2 candles after the high (high still holding) takes the previous high and closes back below it | **11%** | 16% | 21% | tiny -5 pt | 12% / 18% |
| 3 candles after the high (high still holding) takes the previous high and closes back below it | **16%** | 21% | 21% | tiny -5 pt | 17% / 22% |
| the high candle itself is a LARGE candle (top third of range) | **27%** | 23% | 11% | tiny +5 pt | 41% / 33% |
| 2 candles after the high (high still holding) is a hammer | **11%** | 16% | 12% | tiny -5 pt | 8% / 11% |
| the high candle itself closes in its BOTTOM third | **35%** | 31% | 29% | tiny +5 pt | 39% / 33% |
| 3 candles after the high (high still holding) is an outside bar | **9%** | 13% | 11% | tiny -4 pt | 9% / 12% |
| 2 candles after the high (high still holding) is a medium-size candle | **31%** | 36% | 33% | tiny -4 pt | 32% / 37% |
| 3 candles after the high (high still holding) is a medium-size candle | **32%** | 36% | 32% | tiny -4 pt | 32% / 36% |
| 3 candles after the high (high still holding) is a bullish engulfing | **3%** | 7% | 5% | tiny -4 pt | 5% / 10% |
| 2 candles after the high (high still holding) is a bullish engulfing | **2%** | 6% | 5% | tiny -4 pt | 3% / 8% |
| 3 candles after the high (high still holding) is mostly body | **37%** | 33% | 36% | tiny +4 pt | 34% / 30% |
| 3 candles after the high (high still holding) opens with a gap UP | **37%** | 41% | 41% | tiny -4 pt | 31% / 32% |
| 2 candles after the high (high still holding) is an outside bar | **6%** | 10% | 11% | tiny -4 pt | 6% / 9% |
| 3 candles after the high (high still holding) has a medium body | **34%** | 37% | 34% | tiny -4 pt | 34% / 37% |
| the high candle itself has a LONG lower wick | **42%** | 45% | 56% | tiny -4 pt | 30% / 33% |
| 3 candles after the high (high still holding) is mostly wick | **32%** | 35% | 33% | tiny -3 pt | 33% / 36% |
| 3 candles after the high (high still holding) is a hammer | **11%** | 15% | 12% | tiny -3 pt | 9% / 10% |
| 1 candle after the high (high still holding) is a doji | **8%** | 12% | 11% | tiny -3 pt | 8% / 11% |
| the high candle itself is a SMALL candle (bottom third of range) | **42%** | 45% | 64% | tiny -3 pt | 29% / 33% |
| the high candle itself has a SMALL body | **33%** | 36% | 42% | tiny -3 pt | 31% / 33% |
| 2 candles after the high (high still holding) has a medium body | **33%** | 36% | 34% | tiny -3 pt | 33% / 37% |
| the high candle itself closes in its TOP third | **37%** | 40% | 46% | tiny -3 pt | 29% / 33% |
| 2 candles after the high (high still holding) is a marubozu (almost all body) | **14%** | 11% | 13% | tiny +3 pt | 9% / 7% |
| 2 candles after the high (high still holding) opens with a gap DOWN | **49%** | 46% | 45% | tiny +3 pt | 36% / 34% |
| the high candle itself has almost no lower wick | **36%** | 33% | 26% | tiny +3 pt | 35% / 33% |
| 3 candles after the high (high still holding) is a marubozu (almost all body) | **14%** | 12% | 13% | tiny +3 pt | 9% / 7% |
| the high candle itself is an outside bar | **20%** | 17% | 11% | tiny +2 pt | 18% / 15% |
| 2 candles after the high (high still holding) is a doji | **10%** | 12% | 11% | tiny -2 pt | 11% / 12% |
| the high candle itself is a bearish engulfing | **8%** | 6% | 5% | tiny +2 pt | 8% / 6% |
| 1 candle after the high (high still holding) is a bearish engulfing | **9%** | 8% | 5% | tiny +2 pt | 15% / 12% |
| 1 candle after the high (high still holding) is a bullish engulfing | **1%** | 2% | 5% | tiny -1 pt | 1% / 3% |
| the high candle itself is a hammer | **5%** | 6% | 12% | tiny -1 pt | 1% / 2% |
| the high candle has a HIGH-impact USD release in the extreme candle or the 3 before | **3%** | 2% | 1% | tiny +1 pt | 3% / 2% |
| the high candle contains a HIGH-impact USD release | **1%** | 1% | 0% | tiny +1 pt | 1% / 1% |

Passed OOS but NOT proven (9): 1 candle after the high (high still holding) is an inside bar [fails robustness]; 2 candles after the high (high still holding) takes the previous low and closes back above it [fails robustness]; 3 candles after the high (high still holding) takes the previous low and closes back above it [fails robustness]; 2 candles after the high (high still holding) is an inside bar [fails robustness]; the high candle itself is bearish [fails robustness]; the high candle itself is mostly body [inconsistent] …

## 15m

306,109 candles; median swing 5.15 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 8% / 17% / 27%, highs 7% / 16% / 26%.

### Swing LOWS: 59 findings (3007 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the low (low still holding) is bullish | **59%** | 40% | 45% | clear +18 pt | 57% / 41% |
| 2 candles after the low (low still holding) is bullish | **64%** | 46% | 47% | clear +18 pt | 64% / 45% |
| 2 candles after the low (low still holding) closes in its TOP third | **57%** | 40% | 43% | clear +17 pt | 51% / 36% |
| 3 candles after the low (low still holding) is bearish | **32%** | 48% | 44% | clear -16 pt | 33% / 47% |
| 2 candles after the low (low still holding) is bearish | **26%** | 42% | 42% | clear -15 pt | 26% / 43% |
| 1 candle after the low (low still holding) closes in its TOP third | **52%** | 38% | 32% | clear +15 pt | 46% / 33% |
| 3 candles after the low (low still holding) closes in its TOP third | **52%** | 38% | 43% | clear +15 pt | 45% / 33% |
| 1 candle after the low (low still holding) has a LARGE body | **51%** | 36% | 37% | clear +15 pt | 46% / 33% |
| 1 candle after the low (low still holding) is mostly body | **49%** | 36% | 37% | clear +13 pt | 45% / 33% |
| 1 candle after the low (low still holding) is bullish | **76%** | 64% | 45% | clear +12 pt | 76% / 62% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **47%** | 35% | 36% | clear +12 pt | 44% / 33% |
| 1 candle after the low (low still holding) has almost no upper wick | **51%** | 39% | 49% | clear +12 pt | 42% / 33% |
| 3 candles after the low (low still holding) is a LARGE candle (top third of range) | **30%** | 18% | 30% | clear +12 pt | 30% / 17% |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | **32%** | 20% | 30% | clear +12 pt | 32% / 20% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **19%** | 31% | 39% | clear -12 pt | 20% / 33% |
| 3 candles after the low (low still holding) has a LARGE body | **37%** | 25% | 33% | clear +12 pt | 31% / 22% |
| 2 candles after the low (low still holding) has a LARGE body | **38%** | 26% | 34% | clear +12 pt | 34% / 24% |
| 2 candles after the low (low still holding) closes in its BOTTOM third | **17%** | 29% | 28% | clear -11 pt | 19% / 31% |
| 3 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **33%** | 43% | 35% | clear -10 pt | 38% / 47% |
| 1 candle after the low (low still holding) has a LONG upper wick | **20%** | 30% | 20% | clear -10 pt | 25% / 33% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **20%** | 30% | 27% | moderate -10 pt | 23% / 33% |
| 1 candle after the low (low still holding) takes the previous high and closes back below it | **20%** | 29% | 23% | moderate -10 pt | 20% / 26% |
| the low candle itself is a LARGE candle (top third of range) | **34%** | 25% | 11% | moderate +9 pt | 42% / 33% |
| 1 candle after the low (low still holding) is mostly wick | **24%** | 32% | 32% | moderate -9 pt | 27% / 33% |
| 1 candle after the low (low still holding) is bearish | **16%** | 25% | 44% | moderate -8 pt | 15% / 25% |
| 2 candles after the low (low still holding) is mostly body | **40%** | 31% | 37% | moderate +8 pt | 36% / 30% |
| 1 candle after the low (low still holding) has a SMALL body | **23%** | 31% | 33% | moderate -8 pt | 26% / 33% |
| 2 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **32%** | 40% | 36% | moderate -8 pt | 35% / 42% |
| the low candle itself is a SMALL candle (bottom third of range) | **33%** | 41% | 67% | moderate -8 pt | 27% / 33% |
| 3 candles after the low (low still holding) takes the previous low and closes back above it | **19%** | 27% | 25% | moderate -8 pt | 19% / 25% |
| 3 candles after the low (low still holding) is mostly body | **40%** | 32% | 36% | moderate +8 pt | 34% / 30% |
| 2 candles after the low (low still holding) has a SMALL body | **31%** | 38% | 33% | moderate -7 pt | 32% / 39% |
| 3 candles after the low (low still holding) has a SMALL body | **30%** | 37% | 32% | moderate -7 pt | 33% / 40% |
| 1 candle after the low (low still holding) is a medium-size candle | **26%** | 33% | 28% | moderate -7 pt | 27% / 33% |
| 1 candle after the low (low still holding) is a marubozu (almost all body) | **14%** | 8% | 8% | moderate +7 pt | 9% / 5% |
| the low candle itself closes in its TOP third | **47%** | 40% | 37% | moderate +7 pt | 39% / 33% |
| 2 candles after the low (low still holding) is mostly wick | **29%** | 36% | 31% | moderate -7 pt | 30% / 36% |
| 2 candles after the low (low still holding) takes the previous low and closes back above it | **14%** | 21% | 26% | moderate -7 pt | 14% / 20% |
| 1 candle after the low (low still holding) has a medium body | **26%** | 33% | 30% | moderate -7 pt | 28% / 33% |
| 3 candles after the low (low still holding) has almost no lower wick | **38%** | 31% | 33% | moderate +7 pt | 39% / 35% |
| 2 candles after the low (low still holding) closes in its middle third | **25%** | 32% | 29% | moderate -6 pt | 30% / 33% |
| 1 candle after the low (low still holding) is a SMALL candle (bottom third of range) | **26%** | 32% | 36% | moderate -5 pt | 29% / 33% |
| 3 candles after the low (low still holding) has a LONG lower wick | **30%** | 35% | 36% | tiny -5 pt | 29% / 31% |
| 3 candles after the low (low still holding) closes in its middle third | **27%** | 32% | 30% | tiny -5 pt | 32% / 34% |
| the low candle itself has a LARGE body | **35%** | 30% | 22% | tiny +5 pt | 39% / 33% |
| 2 candles after the low (low still holding) has a LONG lower wick | **29%** | 34% | 35% | tiny -5 pt | 27% / 31% |
| 2 candles after the low (low still holding) is an inside bar | **15%** | 19% | 15% | tiny -4 pt | 17% / 20% |
| 1 candle before the low has a LARGE body | **37%** | 32% | 20% | tiny +4 pt | 36% / 33% |
| 3 candles after the low (low still holding) is a marubozu (almost all body) | **10%** | 6% | 9% | tiny +4 pt | 6% / 5% |
| 1 candle after the low (low still holding) is a doji | **8%** | 12% | 11% | tiny -4 pt | 9% / 12% |
| the low candle itself is an outside bar | **20%** | 15% | 12% | tiny +4 pt | 17% / 14% |
| the low candle itself closes in its BOTTOM third | **25%** | 29% | 36% | tiny -4 pt | 29% / 33% |
| 2 candles after the low (low still holding) is a bearish engulfing | **2%** | 6% | 5% | tiny -4 pt | 3% / 8% |
| 2 candles after the low (low still holding) is an outside bar | **7%** | 10% | 11% | tiny -3 pt | 7% / 10% |
| the low candle itself is a bullish engulfing | **9%** | 6% | 5% | tiny +3 pt | 7% / 5% |
| 3 candles after the low (low still holding) is a bearish engulfing | **4%** | 7% | 5% | tiny -3 pt | 5% / 8% |
| the low candle has a HIGH-impact USD release in the extreme candle or the 3 before | **8%** | 6% | 5% | tiny +2 pt | 9% / 6% |
| 1 candle after the low (low still holding) is a bearish engulfing | **1%** | 3% | 5% | tiny -1 pt | 1% / 3% |
| the low candle contains a USD-POSITIVE surprise (actual better than forecast) | **2%** | 1% | 1% | tiny +1 pt | 3% / 1% |

Passed OOS but NOT proven (9): 1 candle after the low (low still holding) is an inside bar [fails robustness]; 2 candles after the low (low still holding) takes the previous high and closes back below it [fails robustness]; 1 candle after the low (low still holding) is a shooting star [fails robustness]; 2 candles after the low (low still holding) has a LONG upper wick [fails robustness]; the low candle itself is bullish [fails robustness]; the low candle happens while the silver candle is UP [fails robustness] …

### Swing HIGHS: 57 findings (3007 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 2 candles after the high (high still holding) is bearish | **66%** | 45% | 43% | clear +21 pt | 64% / 47% |
| 2 candles after the high (high still holding) closes in its BOTTOM third | **50%** | 30% | 33% | clear +20 pt | 50% / 37% |
| 2 candles after the high (high still holding) is bullish | **25%** | 44% | 46% | clear -19 pt | 26% / 41% |
| 3 candles after the high (high still holding) is bearish | **58%** | 40% | 43% | clear +18 pt | 57% / 41% |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | **34%** | 17% | 31% | clear +17 pt | 31% / 20% |
| 3 candles after the high (high still holding) is bullish | **32%** | 49% | 47% | clear -17 pt | 32% / 48% |
| 3 candles after the high (high still holding) closes in its BOTTOM third | **44%** | 28% | 33% | clear +17 pt | 47% / 33% |
| 2 candles after the high (high still holding) closes in its TOP third | **20%** | 37% | 35% | clear -16 pt | 18% / 30% |
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **37%** | 21% | 32% | clear +16 pt | 35% / 21% |
| 1 candle after the high (high still holding) closes in its BOTTOM third | **48%** | 32% | 25% | clear +16 pt | 47% / 33% |
| 2 candles after the high (high still holding) has a LARGE body | **41%** | 26% | 36% | clear +15 pt | 35% / 25% |
| 1 candle after the high (high still holding) closes in its TOP third | **23%** | 37% | 48% | clear -15 pt | 20% / 33% |
| 1 candle after the high (high still holding) has a LARGE body | **49%** | 35% | 38% | clear +14 pt | 47% / 33% |
| 3 candles after the high (high still holding) has a LARGE body | **36%** | 23% | 33% | clear +13 pt | 32% / 24% |
| 1 candle after the high (high still holding) has almost no lower wick | **44%** | 31% | 40% | clear +12 pt | 43% / 33% |
| 1 candle after the high (high still holding) has a LONG lower wick | **27%** | 40% | 29% | clear -12 pt | 25% / 33% |
| 3 candles after the high (high still holding) closes in its TOP third | **26%** | 38% | 35% | clear -12 pt | 22% / 33% |
| 1 candle after the high (high still holding) is mostly body | **47%** | 35% | 38% | clear +12 pt | 44% / 33% |
| 2 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **28%** | 40% | 34% | clear -12 pt | 34% / 42% |
| 1 candle after the high (high still holding) is bearish | **76%** | 64% | 44% | clear +12 pt | 78% / 64% |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **32%** | 43% | 33% | clear -11 pt | 36% / 45% |
| 1 candle after the high (high still holding) is a LARGE candle (top third of range) | **45%** | 34% | 38% | clear +11 pt | 44% / 33% |
| 1 candle after the high (high still holding) takes the previous low and closes back above it | **24%** | 34% | 26% | clear -11 pt | 21% / 28% |
| 3 candles after the high (high still holding) has a SMALL body | **31%** | 41% | 34% | clear -10 pt | 35% / 40% |
| 1 candle after the high (high still holding) is bullish | **15%** | 25% | 45% | moderate -10 pt | 14% / 25% |
| 2 candles after the high (high still holding) has a SMALL body | **29%** | 38% | 33% | moderate -9 pt | 31% / 39% |
| 3 candles after the high (high still holding) takes the previous high and closes back below it | **15%** | 24% | 24% | moderate -9 pt | 19% / 24% |
| 1 candle after the high (high still holding) is mostly wick | **25%** | 33% | 31% | moderate -8 pt | 26% / 33% |
| the high candle itself is a LARGE candle (top third of range) | **30%** | 22% | 13% | moderate +8 pt | 41% / 33% |
| 3 candles after the high (high still holding) has a LONG lower wick | **40%** | 48% | 41% | moderate -8 pt | 36% / 39% |
| the high candle itself is a SMALL candle (bottom third of range) | **38%** | 47% | 61% | moderate -8 pt | 29% / 33% |
| 2 candles after the high (high still holding) has a LONG lower wick | **38%** | 46% | 39% | moderate -8 pt | 37% / 40% |
| 1 candle after the high (high still holding) is a medium-size candle | **26%** | 34% | 28% | moderate -8 pt | 25% / 33% |
| 2 candles after the high (high still holding) is mostly body | **39%** | 32% | 37% | moderate +8 pt | 35% / 30% |
| 3 candles after the high (high still holding) is mostly body | **37%** | 29% | 35% | moderate +7 pt | 34% / 31% |
| 1 candle after the high (high still holding) has a SMALL body | **26%** | 33% | 33% | moderate -7 pt | 26% / 33% |
| 1 candle after the high (high still holding) is a hammer | **10%** | 17% | 11% | moderate -7 pt | 8% / 13% |
| the high candle itself has a LARGE body | **34%** | 27% | 24% | moderate +7 pt | 36% / 33% |
| 1 candle after the high (high still holding) has a medium body | **25%** | 32% | 29% | moderate -7 pt | 26% / 33% |
| 2 candles after the high (high still holding) has almost no lower wick | **30%** | 24% | 29% | moderate +6 pt | 28% / 26% |
| 2 candles after the high (high still holding) has a medium body | **30%** | 36% | 32% | moderate -6 pt | 34% / 37% |
| 3 candles after the high (high still holding) is a medium-size candle | **34%** | 40% | 36% | moderate -6 pt | 33% / 35% |
| 2 candles after the high (high still holding) is an inside bar | **14%** | 20% | 15% | moderate -6 pt | 18% / 21% |
| 2 candles after the high (high still holding) is mostly wick | **30%** | 35% | 32% | moderate -6 pt | 31% / 36% |
| 1 candle after the high (high still holding) is a marubozu (almost all body) | **13%** | 8% | 8% | moderate +5 pt | 9% / 6% |
| the high candle itself closes in its BOTTOM third | **39%** | 33% | 27% | moderate +5 pt | 40% / 33% |
| 3 candles after the high (high still holding) is mostly wick | **32%** | 38% | 34% | moderate -5 pt | 34% / 36% |
| 3 candles after the high (high still holding) is an outside bar | **7%** | 12% | 11% | moderate -5 pt | 8% / 11% |
| 2 candles after the high (high still holding) takes the previous high and closes back below it | **12%** | 17% | 23% | tiny -5 pt | 14% / 20% |
| 3 candles after the high (high still holding) is a bullish engulfing | **4%** | 8% | 6% | tiny -4 pt | 5% / 10% |
| 2 candles after the high (high still holding) is a bullish engulfing | **3%** | 6% | 6% | tiny -3 pt | 3% / 8% |
| 2 candles after the high (high still holding) is a marubozu (almost all body) | **10%** | 7% | 8% | tiny +3 pt | 6% / 5% |
| the high candle has a HIGH-impact USD release in the extreme candle or the 3 before | **8%** | 5% | 5% | tiny +3 pt | 8% / 6% |
| 2 candles after the high (high still holding) is an outside bar | **6%** | 9% | 11% | tiny -3 pt | 7% / 10% |
| 1 candle after the high (high still holding) is a bearish engulfing | **12%** | 9% | 6% | tiny +3 pt | 15% / 12% |
| the high candle itself is a bearish engulfing | **8%** | 6% | 5% | tiny +2 pt | 7% / 5% |
| the high candle contains a HIGH-impact USD release | **3%** | 2% | 2% | tiny +1 pt | 3% / 2% |

Passed OOS but NOT proven (6): 2 candles after the high (high still holding) takes the previous low and closes back above it [fails robustness]; 1 candle after the high (high still holding) is an inside bar [fails robustness]; 3 candles after the high (high still holding) has almost no lower wick [inconsistent]; 3 candles after the high (high still holding) is a marubozu (almost all body) [inconsistent]; 2 candles before the high is bearish [fails robustness]; 2 candles after the high (high still holding) is a medium-size candle [fails robustness]

## 30m

153,218 candles; median swing 5.15 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 9% / 19% / 28%, highs 9% / 18% / 28%.

### Swing LOWS: 39 findings (1554 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 2 candles after the low (low still holding) is bullish | **63%** | 43% | 49% | clear +19 pt | 60% / 45% |
| 3 candles after the low (low still holding) closes in its TOP third | **52%** | 36% | 43% | clear +17 pt | 44% / 33% |
| 2 candles after the low (low still holding) closes in its TOP third | **56%** | 40% | 46% | clear +17 pt | 50% / 37% |
| 3 candles after the low (low still holding) is bullish | **57%** | 41% | 47% | clear +17 pt | 55% / 41% |
| 2 candles after the low (low still holding) is bearish | **27%** | 44% | 40% | clear -17 pt | 29% / 41% |
| 3 candles after the low (low still holding) is bearish | **32%** | 49% | 41% | clear -16 pt | 34% / 47% |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | **34%** | 20% | 31% | clear +14 pt | 34% / 21% |
| 1 candle after the low (low still holding) has a LARGE body | **53%** | 39% | 39% | clear +14 pt | 49% / 33% |
| 2 candles after the low (low still holding) has a LARGE body | **40%** | 27% | 36% | clear +13 pt | 36% / 24% |
| 1 candle after the low (low still holding) closes in its TOP third | **53%** | 39% | 34% | clear +13 pt | 47% / 33% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **48%** | 34% | 39% | clear +13 pt | 46% / 33% |
| 2 candles after the low (low still holding) closes in its BOTTOM third | **16%** | 29% | 26% | clear -13 pt | 20% / 30% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **20%** | 33% | 27% | clear -13 pt | 24% / 33% |
| the low candle itself is a LARGE candle (top third of range) | **40%** | 27% | 13% | clear +13 pt | 45% / 33% |
| 1 candle after the low (low still holding) is bullish | **77%** | 65% | 48% | clear +13 pt | 77% / 63% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **19%** | 30% | 38% | clear -12 pt | 20% / 33% |
| 1 candle after the low (low still holding) is mostly body | **49%** | 38% | 38% | clear +11 pt | 45% / 33% |
| 1 candle after the low (low still holding) has almost no upper wick | **50%** | 40% | 49% | clear +11 pt | 41% / 33% |
| 1 candle after the low (low still holding) is a medium-size candle | **25%** | 35% | 27% | clear -10 pt | 25% / 33% |
| 3 candles after the low (low still holding) has a LARGE body | **35%** | 25% | 32% | moderate +10 pt | 32% / 22% |
| 2 candles after the low (low still holding) has a SMALL body | **31%** | 41% | 33% | moderate -10 pt | 34% / 39% |
| 2 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **30%** | 40% | 34% | moderate -10 pt | 34% / 42% |
| 1 candle after the low (low still holding) is bearish | **14%** | 23% | 41% | moderate -10 pt | 13% / 25% |
| 3 candles after the low (low still holding) takes the previous low and closes back above it | **20%** | 29% | 25% | moderate -9 pt | 20% / 24% |
| 1 candle after the low (low still holding) has a SMALL body | **23%** | 32% | 32% | moderate -9 pt | 26% / 33% |
| 1 candle after the low (low still holding) takes the previous high and closes back below it | **20%** | 28% | 23% | moderate -9 pt | 22% / 26% |
| 1 candle after the low (low still holding) is mostly wick | **23%** | 32% | 32% | moderate -9 pt | 26% / 33% |
| 2 candles after the low (low still holding) is mostly wick | **29%** | 37% | 32% | moderate -8 pt | 33% / 36% |
| 3 candles after the low (low still holding) is a SMALL candle (bottom third of range) | **34%** | 42% | 35% | moderate -8 pt | 37% / 47% |
| the low candle itself is a SMALL candle (bottom third of range) | **33%** | 40% | 64% | moderate -7 pt | 27% / 33% |
| 2 candles after the low (low still holding) is mostly body | **39%** | 32% | 38% | moderate +7 pt | 36% / 29% |
| the low candle itself has a LARGE body | **37%** | 30% | 22% | moderate +7 pt | 39% / 33% |
| 2 candles after the low (low still holding) has almost no lower wick | **39%** | 32% | 33% | moderate +7 pt | 40% / 36% |
| 1 candle after the low (low still holding) has a LONG lower wick | **31%** | 38% | 46% | moderate -7 pt | 31% / 33% |
| 2 candles after the low (low still holding) takes the previous low and closes back above it | **16%** | 21% | 25% | moderate -6 pt | 14% / 20% |
| the low candle has a HIGH-impact USD release in the extreme candle or the 3 before | **16%** | 10% | 10% | moderate +6 pt | 15% / 11% |
| 1 candle after the low (low still holding) is a marubozu (almost all body) | **12%** | 7% | 7% | tiny +5 pt | 8% / 4% |
| 2 candles after the low (low still holding) is a bearish engulfing | **3%** | 6% | 5% | tiny -3 pt | 3% / 6% |
| the low candle contains a HIGH-impact USD release | **5%** | 3% | 3% | tiny +3 pt | 7% / 5% |

Passed OOS but NOT proven (4): 3 candles after the low (low still holding) is a LARGE candle (top third of range) [fails robustness]; 1 candle after the low (low still holding) is an inside bar [fails robustness]; 1 candle after the low (low still holding) has a LONG upper wick [fails robustness]; 2 candles after the low (low still holding) takes the previous high and closes back below it [fails robustness]

### Swing HIGHS: 45 findings (1554 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the high (high still holding) is bearish | **57%** | 38% | 43% | clear +19 pt | 55% / 41% |
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **37%** | 18% | 32% | clear +19 pt | 34% / 21% |
| 2 candles after the high (high still holding) is bearish | **64%** | 45% | 43% | clear +18 pt | 62% / 44% |
| 3 candles after the high (high still holding) is bullish | **32%** | 49% | 46% | clear -17 pt | 32% / 47% |
| 1 candle after the high (high still holding) is a LARGE candle (top third of range) | **48%** | 32% | 37% | clear +17 pt | 44% / 33% |
| 2 candles after the high (high still holding) closes in its BOTTOM third | **52%** | 35% | 34% | clear +16 pt | 51% / 37% |
| 1 candle after the high (high still holding) has a LARGE body | **51%** | 35% | 38% | clear +16 pt | 45% / 33% |
| 1 candle after the high (high still holding) is bearish | **78%** | 63% | 42% | clear +15 pt | 78% / 65% |
| 3 candles after the high (high still holding) closes in its TOP third | **25%** | 40% | 35% | clear -15 pt | 22% / 33% |
| 1 candle after the high (high still holding) closes in its BOTTOM third | **44%** | 29% | 23% | clear +15 pt | 45% / 33% |
| 2 candles after the high (high still holding) is bullish | **28%** | 43% | 46% | clear -15 pt | 26% / 43% |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | **32%** | 17% | 31% | clear +15 pt | 32% / 18% |
| 2 candles after the high (high still holding) has a LARGE body | **41%** | 26% | 35% | clear +15 pt | 36% / 24% |
| 1 candle after the high (high still holding) closes in its TOP third | **23%** | 37% | 49% | clear -15 pt | 21% / 33% |
| 3 candles after the high (high still holding) closes in its BOTTOM third | **45%** | 30% | 35% | clear +14 pt | 46% / 35% |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **33%** | 46% | 34% | clear -14 pt | 34% / 45% |
| 2 candles after the high (high still holding) closes in its TOP third | **20%** | 33% | 34% | clear -13 pt | 18% / 30% |
| 2 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **28%** | 41% | 33% | clear -13 pt | 32% / 42% |
| 3 candles after the high (high still holding) has a SMALL body | **32%** | 44% | 34% | clear -12 pt | 36% / 40% |
| 1 candle after the high (high still holding) is bullish | **14%** | 26% | 47% | clear -12 pt | 13% / 24% |
| 1 candle after the high (high still holding) has almost no lower wick | **41%** | 29% | 40% | clear +12 pt | 42% / 33% |
| 3 candles after the high (high still holding) has a LARGE body | **36%** | 25% | 34% | clear +11 pt | 33% / 23% |
| 1 candle after the high (high still holding) is mostly body | **47%** | 36% | 36% | clear +11 pt | 43% / 33% |
| the high candle itself is a LARGE candle (top third of range) | **35%** | 24% | 15% | clear +11 pt | 43% / 33% |
| 1 candle after the high (high still holding) takes the previous low and closes back above it | **23%** | 33% | 26% | clear -10 pt | 22% / 27% |
| 1 candle after the high (high still holding) has a SMALL body | **24%** | 34% | 33% | moderate -10 pt | 26% / 33% |
| 1 candle after the high (high still holding) has a LONG lower wick | **27%** | 36% | 28% | moderate -10 pt | 24% / 33% |
| 1 candle after the high (high still holding) is mostly wick | **23%** | 33% | 32% | moderate -10 pt | 26% / 33% |
| 2 candles after the high (high still holding) has a SMALL body | **27%** | 37% | 32% | moderate -9 pt | 31% / 39% |
| 2 candles after the high (high still holding) has a LONG lower wick | **35%** | 44% | 39% | moderate -9 pt | 38% / 40% |
| 1 candle after the high (high still holding) is a medium-size candle | **25%** | 33% | 27% | moderate -9 pt | 27% / 33% |
| the high candle itself is a SMALL candle (bottom third of range) | **38%** | 46% | 60% | moderate -9 pt | 30% / 33% |
| 1 candle after the high (high still holding) is a SMALL candle (bottom third of range) | **27%** | 35% | 36% | moderate -8 pt | 29% / 33% |
| the high candle itself has a LARGE body | **36%** | 29% | 25% | moderate +7 pt | 38% / 33% |
| 2 candles after the high (high still holding) is mostly body | **40%** | 33% | 37% | moderate +7 pt | 36% / 29% |
| 2 candles after the high (high still holding) has almost no lower wick | **29%** | 23% | 29% | moderate +6 pt | 27% / 26% |
| the high candle has a HIGH-impact USD release in the extreme candle or the 3 before | **15%** | 9% | 9% | moderate +6 pt | 14% / 13% |
| 2 candles after the high (high still holding) takes the previous high and closes back below it | **12%** | 18% | 23% | moderate -6 pt | 12% / 20% |
| 1 candle after the high (high still holding) has a medium body | **26%** | 32% | 29% | moderate -6 pt | 29% / 33% |
| 1 candle after the high (high still holding) is a marubozu (almost all body) | **11%** | 7% | 7% | tiny +4 pt | 9% / 5% |
| 1 candle after the high (high still holding) is a hammer | **10%** | 15% | 11% | tiny -4 pt | 9% / 13% |
| the high candle contains a HIGH-impact USD release | **7%** | 3% | 3% | tiny +4 pt | 6% / 5% |
| 3 candles after the high (high still holding) is a bullish engulfing | **5%** | 8% | 6% | tiny -3 pt | 5% / 9% |
| 2 candles after the high (high still holding) is a bullish engulfing | **3%** | 5% | 6% | tiny -3 pt | 3% / 7% |
| 1 candle after the high (high still holding) is a bullish engulfing | **1%** | 3% | 6% | tiny -2 pt | 1% / 3% |

Passed OOS but NOT proven (2): 2 candles after the high (high still holding) takes the previous low and closes back above it [fails robustness]; 1 candle after the high (high still holding) is an inside bar [fails robustness]

## 1H

76,684 candles; median swing 5.24 ATR, confirmed a median 7 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 11% / 19% / 27%, highs 10% / 19% / 26%.

### Swing LOWS: 21 findings (778 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the low (low still holding) is bullish | **61%** | 39% | 45% | clear +22 pt | 55% / 41% |
| 3 candles after the low (low still holding) is bearish | **30%** | 49% | 44% | clear -20 pt | 33% / 47% |
| 2 candles after the low (low still holding) is bullish | **64%** | 45% | 45% | clear +19 pt | 63% / 48% |
| 2 candles after the low (low still holding) is bearish | **25%** | 44% | 43% | clear -19 pt | 27% / 39% |
| 3 candles after the low (low still holding) closes in its TOP third | **51%** | 34% | 41% | clear +17 pt | 45% / 34% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **20%** | 37% | 39% | clear -17 pt | 23% / 33% |
| 1 candle after the low (low still holding) closes in its TOP third | **54%** | 38% | 36% | clear +16 pt | 46% / 33% |
| 2 candles after the low (low still holding) closes in its TOP third | **54%** | 38% | 40% | clear +15 pt | 50% / 37% |
| 1 candle after the low (low still holding) is bullish | **75%** | 61% | 48% | clear +14 pt | 73% / 63% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **19%** | 31% | 26% | clear -13 pt | 22% / 33% |
| the low candle itself is a LARGE candle (top third of range) | **41%** | 29% | 15% | clear +12 pt | 48% / 33% |
| 1 candle after the low (low still holding) is bearish | **17%** | 29% | 42% | clear -12 pt | 18% / 26% |
| 2 candles after the low (low still holding) closes in its BOTTOM third | **19%** | 31% | 28% | clear -12 pt | 22% / 30% |
| 1 candle after the low (low still holding) has a LARGE body | **52%** | 42% | 42% | clear +11 pt | 50% / 33% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **48%** | 38% | 40% | clear +11 pt | 51% / 33% |
| 1 candle after the low (low still holding) is mostly body | **48%** | 38% | 39% | moderate +9 pt | 46% / 33% |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | **34%** | 24% | 32% | moderate +9 pt | 37% / 20% |
| the low candle has a HIGH-impact USD release in the extreme candle or the 3 before | **25%** | 16% | 18% | moderate +9 pt | 26% / 19% |
| 3 candles after the low (low still holding) takes the previous low and closes back above it | **19%** | 28% | 25% | moderate -9 pt | 18% / 26% |
| 1 candle after the low (low still holding) is a medium-size candle | **24%** | 33% | 26% | moderate -8 pt | 24% / 33% |
| 3 candles after the low (low still holding) is a bearish engulfing | **4%** | 9% | 7% | moderate -5 pt | 6% / 8% |

Passed OOS but NOT proven (4): 1 candle after the low (low still holding) is an inside bar [fails robustness]; 1 candle after the low (low still holding) has a LONG upper wick [fails robustness]; 1 candle after the low (low still holding) has almost no upper wick [fails robustness]; 1 candle after the low (low still holding) is a shooting star [fails robustness]

### Swing HIGHS: 33 findings (778 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **39%** | 21% | 34% | clear +18 pt | 35% / 21% |
| 3 candles after the high (high still holding) is bearish | **57%** | 40% | 43% | clear +18 pt | 56% / 43% |
| 2 candles after the high (high still holding) is bullish | **26%** | 44% | 47% | clear -18 pt | 26% / 43% |
| 2 candles after the high (high still holding) is bearish | **62%** | 45% | 43% | clear +17 pt | 64% / 44% |
| 2 candles after the high (high still holding) closes in its BOTTOM third | **51%** | 35% | 35% | clear +16 pt | 53% / 37% |
| 2 candles after the high (high still holding) closes in its TOP third | **21%** | 37% | 35% | clear -16 pt | 17% / 30% |
| 3 candles after the high (high still holding) is bullish | **32%** | 48% | 46% | clear -16 pt | 31% / 45% |
| 1 candle after the high (high still holding) is a LARGE candle (top third of range) | **51%** | 36% | 42% | clear +15 pt | 48% / 33% |
| 1 candle after the high (high still holding) has a LARGE body | **52%** | 37% | 42% | clear +15 pt | 48% / 33% |
| 3 candles after the high (high still holding) closes in its BOTTOM third | **45%** | 30% | 34% | clear +15 pt | 46% / 33% |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | **33%** | 19% | 30% | clear +15 pt | 29% / 18% |
| the high candle itself is a LARGE candle (top third of range) | **37%** | 23% | 19% | clear +13 pt | 42% / 33% |
| 1 candle after the high (high still holding) closes in its TOP third | **22%** | 36% | 47% | clear -13 pt | 22% / 33% |
| 1 candle after the high (high still holding) closes in its BOTTOM third | **45%** | 33% | 25% | clear +12 pt | 44% / 33% |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | **31%** | 43% | 33% | clear -12 pt | 35% / 47% |
| 1 candle after the high (high still holding) is bearish | **76%** | 64% | 42% | clear +11 pt | 76% / 63% |
| 2 candles after the high (high still holding) has a LARGE body | **39%** | 28% | 36% | clear +11 pt | 36% / 24% |
| 1 candle after the high (high still holding) is mostly body | **48%** | 37% | 39% | clear +11 pt | 46% / 33% |
| 3 candles after the high (high still holding) closes in its TOP third | **27%** | 38% | 35% | clear -10 pt | 22% / 32% |
| 1 candle after the high (high still holding) is bullish | **15%** | 25% | 47% | moderate -10 pt | 15% / 26% |
| 2 candles after the high (high still holding) is a medium-size candle | **31%** | 41% | 35% | moderate -9 pt | 32% / 38% |
| the high candle itself has a LARGE body | **38%** | 29% | 26% | moderate +9 pt | 37% / 33% |
| 1 candle after the high (high still holding) takes the previous low and closes back above it | **23%** | 32% | 25% | moderate -9 pt | 21% / 28% |
| the high candle has a HIGH-impact USD release in the extreme candle or the 3 before | **25%** | 17% | 17% | moderate +9 pt | 24% / 20% |
| the high candle itself is a SMALL candle (bottom third of range) | **35%** | 43% | 56% | moderate -8 pt | 27% / 33% |
| 1 candle after the high (high still holding) is a medium-size candle | **24%** | 32% | 25% | moderate -8 pt | 25% / 33% |
| 1 candle after the high (high still holding) is mostly wick | **23%** | 31% | 30% | moderate -8 pt | 27% / 33% |
| 1 candle after the high (high still holding) has a SMALL body | **23%** | 31% | 31% | moderate -8 pt | 27% / 33% |
| the high candle itself is an outside bar | **25%** | 18% | 14% | moderate +7 pt | 23% / 17% |
| 1 candle after the high (high still holding) is a hammer | **9%** | 15% | 10% | moderate -6 pt | 10% / 12% |
| the high candle contains a HIGH-impact USD release | **11%** | 6% | 6% | moderate +5 pt | 10% / 8% |
| the high candle itself is a bearish engulfing | **10%** | 5% | 6% | tiny +4 pt | 8% / 6% |
| 2 candles after the high (high still holding) is a bullish engulfing | **3%** | 6% | 7% | tiny -4 pt | 3% / 8% |

Passed OOS but NOT proven (2): 3 candles after the high (high still holding) has a LARGE body [fails robustness]; 1 candle after the high (high still holding) has almost no lower wick [fails robustness]

## 2H

40,097 candles; median swing 5.18 ATR, confirmed a median 7 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 10% / 18% / 27%, highs 11% / 19% / 26%.

### Swing LOWS: 9 findings (410 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 1 candle after the low (low still holding) is bullish | **77%** | 58% | 49% | clear +19 pt | 73% / 63% |
| 2 candles after the low (low still holding) is bullish | **66%** | 48% | 48% | clear +18 pt | 63% / 49% |
| 1 candle after the low (low still holding) closes in its TOP third | **51%** | 35% | 33% | clear +16 pt | 42% / 33% |
| 1 candle after the low (low still holding) has a LARGE body | **49%** | 34% | 37% | clear +15 pt | 43% / 33% |
| 1 candle after the low (low still holding) is bearish | **15%** | 29% | 41% | clear -14 pt | 17% / 23% |
| the low candle itself is a SMALL candle (bottom third of range) | **29%** | 43% | 61% | clear -14 pt | 23% / 33% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **20%** | 33% | 38% | clear -13 pt | 23% / 33% |
| 2 candles after the low (low still holding) is bearish | **25%** | 38% | 41% | clear -13 pt | 28% / 37% |
| 1 candle after the low (low still holding) is mostly body | **46%** | 33% | 35% | clear +13 pt | 38% / 33% |

### Swing HIGHS: 15 findings (410 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the high (high still holding) is bearish | **54%** | 38% | 42% | clear +16 pt | 53% / 44% |
| 2 candles after the high (high still holding) is bearish | **60%** | 45% | 43% | clear +15 pt | 60% / 47% |
| 1 candle after the high (high still holding) closes in its TOP third | **20%** | 34% | 48% | clear -14 pt | 21% / 33% |
| 2 candles after the high (high still holding) is bullish | **29%** | 43% | 46% | clear -14 pt | 27% / 42% |
| 2 candles after the high (high still holding) closes in its BOTTOM third | **47%** | 33% | 33% | clear +14 pt | 46% / 37% |
| the high candle itself is a LARGE candle (top third of range) | **42%** | 28% | 18% | clear +14 pt | 45% / 33% |
| 3 candles after the high (high still holding) closes in its TOP third | **28%** | 42% | 36% | clear -14 pt | 22% / 32% |
| 3 candles after the high (high still holding) is bullish | **33%** | 47% | 46% | clear -14 pt | 33% / 44% |
| 2 candles after the high (high still holding) is a LARGE candle (top third of range) | **33%** | 20% | 32% | clear +13 pt | 35% / 22% |
| the high candle itself is an outside bar | **35%** | 22% | 16% | clear +13 pt | 24% / 20% |
| 1 candle after the high (high still holding) is bearish | **75%** | 63% | 40% | clear +12 pt | 75% / 60% |
| the high candle itself closes in its BOTTOM third | **44%** | 32% | 29% | clear +12 pt | 34% / 33% |
| 1 candle after the high (high still holding) is a LARGE candle (top third of range) | **50%** | 38% | 41% | clear +12 pt | 52% / 33% |
| 2 candles after the high (high still holding) closes in its TOP third | **23%** | 35% | 38% | clear -12 pt | 19% / 30% |
| 2 candles after the high (high still holding) is a bullish engulfing | **1%** | 7% | 5% | moderate -7 pt | 3% / 6% |

## 3H

26,766 candles; median swing 5.22 ATR, confirmed a median 7 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 8% / 15% / 22%, highs 10% / 18% / 24%.

### Swing LOWS: 7 findings (279 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 1 candle after the low (low still holding) is mostly body | **48%** | 29% | 33% | clear +20 pt | 42% / 33% |
| 1 candle after the low (low still holding) has a LARGE body | **52%** | 33% | 37% | clear +18 pt | 45% / 33% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **18%** | 34% | 37% | clear -17 pt | 19% / 33% |
| 1 candle after the low (low still holding) closes in its TOP third | **52%** | 35% | 30% | clear +16 pt | 45% / 33% |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | **50%** | 35% | 39% | clear +15 pt | 46% / 33% |
| 1 candle after the low (low still holding) is bullish | **75%** | 60% | 48% | clear +15 pt | 72% / 62% |
| 1 candle after the low (low still holding) is a marubozu (almost all body) | **11%** | 3% | 4% | moderate +8 pt | 6% / 4% |

### Swing HIGHS: 1 finding (278 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 1 candle after the high (high still holding) is bearish | **74%** | 58% | 43% | clear +15 pt | 71% / 64% |

## 4H

20,118 candles; median swing 5.2 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 7% / 13% / 21%, highs 9% / 17% / 23%.

### Swing LOWS: 2 findings (199 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 1 candle after the low (low still holding) closes in its TOP third | **51%** | 32% | 30% | clear +20 pt | 42% / 33% |
| 1 candle after the low (low still holding) closes in its BOTTOM third | **17%** | 35% | 38% | clear -18 pt | 21% / 33% |

### Swing HIGHS: 0 findings (198 OOS swings)

No candle or context measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 6H

13,444 candles; median swing 5.08 ATR, confirmed a median 7 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 7% / 15% / 19%, highs 8% / 13% / 23%.

### Swing LOWS: 2 findings (128 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 3 candles after the low (low still holding) is bearish | **28%** | 53% | 46% | clear -25 pt | 39% / 44% |
| 3 candles after the low (low still holding) closes in its BOTTOM third | **20%** | 42% | 34% | clear -23 pt | 25% / 33% |

### Swing HIGHS: 3 findings (126 OOS swings)

| what (proven) | at swings (OOS) | at failed extremes | at random candles | gap | in TRAIN swing / failed |
|---|---|---|---|---|---|
| 2 candles after the high (high still holding) closes in its BOTTOM third | **52%** | 30% | 33% | clear +22 pt | 47% / 34% |
| 3 candles after the high (high still holding) is bearish | **56%** | 34% | 48% | clear +22 pt | 57% / 42% |
| 2 candles after the high (high still holding) is mostly body | **58%** | 37% | 44% | clear +21 pt | 38% / 32% |

## 9H

10,095 candles; median swing 5.07 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 6% / 12% / 22%, highs 7% / 13% / 26%.

### Swing LOWS: 0 findings (92 OOS swings)

No candle or context measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

### Swing HIGHS: 0 findings (90 OOS swings)

No candle or context measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 1D

3,377 candles; median swing 5.73 ATR, confirmed a median 7 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 3% / 5% / 17%, highs 10% / 17% / 23%.

### Swing LOWS: 0 findings (35 OOS swings)

No candle or context measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

### Swing HIGHS: 0 findings (34 OOS swings)

No candle or context measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 2D

1,711 candles; median swing 5.24 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 2% / 11% / 18%, highs 19% / 26% / 36%.

### Swing LOWS: DESCRIBED ONLY (20 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| 1 candle after the low (low still holding) is bullish | 80% | 36% | 70% | 20 |
| 1 candle after the low (low still holding) is mostly wick | 15% | 57% | 27% | 20 |
| 1 candle after the low (low still holding) has a LONG lower wick | 30% | 71% | 38% | 20 |
| the low candle happens while DXY rose over the extreme + 3 candles before | 45% | 86% | 64% | 20 |
| 1 candle after the low (low still holding) has a LARGE body | 45% | 7% | 38% | 20 |
| 3 candles after the low (low still holding) is bullish | 65% | 27% | 46% | 20 |
| 1 candle before the low has a medium body | 15% | 50% | 29% | 20 |
| 1 candle before the low has a LARGE body | 70% | 36% | 46% | 20 |

### Swing HIGHS: DESCRIBED ONLY (19 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| the high candle has LIGHT real CME volume (≤ 0.67×; 2024-10+) | 0% | 100% | 23% | 4 |
| 2 candles after the high (high still holding) has a LARGE body | 63% | 10% | 32% | 19 |
| 2 candles after the high (high still holding) has almost no lower wick | 68% | 19% | 29% | 19 |
| 3 candles after the high (high still holding) is a LARGE candle (top third of range) | 47% | 0% | 27% | 19 |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | 32% | 73% | 47% | 19 |
| 3 candles before the high has a medium upper wick | 11% | 52% | 36% | 19 |
| 2 candles after the high (high still holding) is mostly body | 53% | 14% | 32% | 19 |
| 3 candles before the high has almost no upper wick | 68% | 33% | 46% | 19 |

## 3D

1,142 candles; median swing 5.57 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 3% / 10% / 13%, highs 21% / 31% / 41%.

### Swing LOWS: DESCRIBED ONLY (13 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| the low candle has HEAVY real CME volume (≥ 1.5× its 20-candle median; 2024-10+) | 33% | 100% | 0% | 3 |
| the low candle itself takes the previous low and closes back above it | 77% | 22% | 19% | 13 |
| the low candle itself is bearish | 38% | 89% | 43% | 13 |
| the low candle has gold news published inside it (2020+) | 50% | 100% | 71% | 6 |
| 1 candle after the low (low still holding) is a LARGE candle (top third of range) | 46% | 0% | 35% | 13 |
| 3 candles after the low (low still holding) opens with a gap UP | 46% | 0% | 35% | 13 |
| 3 candles before the low is a LARGE candle (top third of range) | 23% | 67% | 27% | 13 |
| 3 candles after the low (low still holding) opens with no real gap | 23% | 67% | 27% | 13 |

### Swing HIGHS: DESCRIBED ONLY (12 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| the high candle has LIGHT real CME volume (≤ 0.67×; 2024-10+) | 0% | 100% | 0% | 3 |
| 1 candle before the high has a medium body | 67% | 15% | 36% | 12 |
| the high candle itself takes the previous high and closes back below it | 83% | 35% | 19% | 12 |
| the high candle itself is bearish | 50% | 5% | 33% | 12 |
| the high candle itself is bullish | 25% | 70% | 57% | 12 |
| 3 candles before the high has almost no lower wick | 33% | 75% | 31% | 12 |
| 2 candles before the high opens with a gap UP | 67% | 25% | 50% | 12 |
| 1 candle before the high opens with no real gap | 67% | 25% | 62% | 12 |

## 1W

684 candles; median swing 5 ATR, confirmed a median 7 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 0% / 6% / 28%, highs 18% / 29% / 29%.

### Swing LOWS: DESCRIBED ONLY (7 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| 1 candle before the low has almost no upper wick | 14% | 100% | 24% | 7 |
| 1 candle before the low has a LONG upper wick | 71% | 0% | 56% | 7 |
| 2 candles after the low (low still holding) has almost no upper wick | 71% | 0% | 32% | 7 |
| 3 candles before the low closes in its middle third | 14% | 83% | 24% | 7 |
| 3 candles before the low closes in its TOP third | 86% | 17% | 60% | 7 |
| 2 candles before the low has a medium lower wick | 100% | 33% | 52% | 7 |
| 2 candles before the low takes the previous low and closes back above it | 0% | 67% | 24% | 7 |
| 2 candles after the low (low still holding) is a LARGE candle (top third of range) | 57% | 0% | 28% | 7 |

### Swing HIGHS: DESCRIBED ONLY (6 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| 2 candles before the high opens with no real gap | 0% | 57% | 41% | 6 |
| 3 candles after the high (high still holding) has almost no upper wick | 50% | 0% | 41% | 6 |
| 3 candles after the high (high still holding) is a SMALL candle (bottom third of range) | 0% | 50% | 27% | 6 |
| the high candle happens while DXY rose over the extreme + 3 candles before | 67% | 21% | 36% | 6 |
| the high candle itself opens with a gap UP | 50% | 7% | 9% | 6 |
| 3 candles before the high is bullish | 100% | 57% | 45% | 6 |
| the high candle itself is a LARGE candle (top third of range) | 83% | 43% | 5% | 6 |
| 1 candle after the high (high still holding) has a LARGE body | 83% | 43% | 59% | 6 |

## 1M

160 candles; median swing 3.6 ATR, confirmed a median 6 candles after the extreme.

Share of swings ALREADY confirmed by candle +1 / +2 / +3: lows 0% / 0% / 0%, highs 33% / 33% / 33%.

### Swing LOWS: DESCRIBED ONLY (2 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| 2 candles after the low (low still holding) is bullish | 100% | 0% | 100% | 2 |
| 2 candles after the low (low still holding) is bearish | 0% | 100% | 0% | 2 |
| 3 candles before the low is an inside bar | 50% | 0% | 0% | 2 |
| 3 candles before the low is a bearish engulfing | 0% | 50% | 0% | 2 |
| 3 candles before the low takes the previous low and closes back above it | 0% | 50% | 0% | 2 |
| 3 candles before the low is a marubozu (almost all body) | 50% | 0% | 0% | 2 |
| 2 candles before the low is bullish | 0% | 50% | 0% | 2 |
| 2 candles before the low is bearish | 100% | 50% | 0% | 2 |

### Swing HIGHS: DESCRIBED ONLY (2 OOS swings; cannot be proven)

The largest observed OOS differences, for description only:

| what | swing | failed extreme | random | n swings |
|---|---|---|---|---|
| 3 candles after the high (high still holding) is an inside bar | 100% | 0% | 0% | 2 |
| 3 candles after the high (high still holding) takes the previous low and closes back above it | 0% | 100% | 0% | 2 |
| 3 candles after the high (high still holding) has almost no upper wick | 0% | 100% | 0% | 2 |
| 3 candles after the high (high still holding) has a LONG upper wick | 100% | 0% | 100% | 2 |
| 3 candles after the high (high still holding) has almost no lower wick | 100% | 0% | 100% | 2 |
| 3 candles after the high (high still holding) has a LONG lower wick | 0% | 100% | 0% | 2 |
| 3 candles before the high is bullish | 100% | 20% | 0% | 2 |
| 2 candles after the high (high still holding) is bearish | 100% | 33% | 0% | 2 |
