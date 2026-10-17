# Swing flip ladder: Phase 3 results

Generated 2026-10-17T16:32:20.466Z. Spec `docs/SWING_LADDER_SPEC.md`. Window 2013-07-14 → 2026-10-09; OOS from 2021-06-23.

"X flipped" = timeframe X confirmed its own swing at EXACTLY the same price as the anchor swing. The flip time is the close of X's confirming candle.
"Delay" is measured from the close of the anchor's extreme candle; "vs anchor" from the anchor's own confirmation (negative = before).

## Anchor 15m

### 15m swing LOWS (how Bear becomes Bull): real 4709+3007, failed 5918+3853 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 99% (99%) | −1 min | −6 min … 3 min | −1.5 h | 100% |  |
| 3m | 99% (99%) | 12 min | 3 min … 21 min | −1.2 h | 100% |  |
| 5m | 99% (98%) | 25 min | 10 min … 45 min | −55 min | 100% |  |
| 15m (anchor) | 100% (100%) | 1.5 h | 45 min … 2.8 h | 0 min | 0% |  |
| 30m | 51% (48%) | 3.3 h | 1.8 h … 5.8 h | 1.3 h | 0% |  |
| 1H | 26% (24%) | 7.3 h | 4.0 h … 12.3 h | 5.3 h | 0% |  |
| 2H | 13% (13%) | 15.8 h | 8.3 h … 1.0 d | 13.5 h | 0% |  |
| 3H | 9% (8%) | 1.0 d | 13.8 h … 1.8 d | 22.0 h | 0% |  |
| 4H | 7% (6%) | 1.3 d | 20.0 h … 2.7 d | 1.2 d | 0% |  |
| 6H | 4% (4%) | 2.0 d | 1.2 d … 3.8 d | 1.9 d | 0% |  |
| 9H | 3% (3%) | 2.6 d | 1.5 d … 4.7 d | 2.4 d | 0% |  |
| 1D | 1% (1%) | 12.1 d | 7.1 d … 14.3 d | 11.9 d | 0% |  |
| 2D | 1% (1%) | 19.3 d | 11.5 d … 35.0 d | 19.2 d | 0% |  |
| 3D | 0% (0%) | 28.6 d | 21.5 d … 48.5 d | 28.5 d | 0% |  |
| 1W | 0% (0%) | 59.8 d | 25.9 d … 71.5 d | 59.8 d | 0% |  |
| 1M | 0% (0%) | 184.6 d | 138.6 d … 234.9 d | 184.5 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **44%** | 44% | 19% | +0 pt | 6759 | 44% / 44% | 1.5 h | INCONSISTENT |
| 3m | **52%** | 44% | 3% | +8 pt | 5749 | 52% / 44% | 1.2 h | FINDING |
| 5m | **63%** | 44% | 1% | +19 pt | 4725 | 62% / 44% | 55 min | FINDING |
| 1m+3m | **52%** | 44% | 4% | +8 pt | 5715 | 52% / 44% | 1.2 h | FINDING |
| 3m+5m | **63%** | 44% | 2% | +19 pt | 4702 | 62% / 44% | 55 min | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 36% (n 3007) | 31% | 37% | 0 | 43% | 0 min | 24% (n 3853) |
| silver (same swing) | 55% (n 3007) | 23% | 55% | 0 | 39% | 0 min | 23% (n 3853) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 100% first (tie 0%, n 7603) · 3m<5m: 97% first (tie 2%, n 7588) · 5m<15m: 99% first (tie 1%, n 7623) · 15m<30m: 96% first (tie 4%, n 3810) · 30m<1H: 96% first (tie 4%, n 1895) · 1H<2H: 95% first (tie 5%, n 981) · 2H<3H: 89% first (tie 10%, n 669) · 3H<4H: 86% first (tie 6%, n 484) · 4H<6H: 89% first (tie 8%, n 320) · 6H<9H: 62% first (tie 38%, n 234) · 9H<1D: 100% first (tie 0%, n 77) · 1D<2D: 98% first (tie 2%, n 44) · 2D<3D: 97% first (tie 3%, n 31) · 3D<1W: 100% first (tie 0%, n 19) · 1W<1M: 100% first (tie 0%, n 6)

### 15m swing HIGHS (how Bull becomes Bear): real 4709+3007, failed 6192+4447 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 99% (99%) | 0 min | −5 min … 4 min | −1.6 h | 100% |  |
| 3m | 99% (99%) | 12 min | 6 min … 24 min | −1.3 h | 100% |  |
| 5m | 99% (98%) | 25 min | 15 min … 45 min | −1.0 h | 99% |  |
| 15m (anchor) | 100% (100%) | 1.5 h | 45 min … 2.8 h | 0 min | 0% |  |
| 30m | 51% (49%) | 3.3 h | 1.8 h … 6.0 h | 1.3 h | 0% |  |
| 1H | 26% (24%) | 6.8 h | 3.3 h … 13.3 h | 5.0 h | 0% |  |
| 2H | 14% (13%) | 14.5 h | 7.0 h … 1.0 d | 12.8 h | 0% |  |
| 3H | 9% (8%) | 23.0 h | 11.8 h … 1.8 d | 20.0 h | 0% |  |
| 4H | 7% (6%) | 1.2 d | 16.5 h … 2.8 d | 1.1 d | 0% |  |
| 6H | 4% (4%) | 1.6 d | 23.0 h … 3.8 d | 1.4 d | 0% |  |
| 9H | 3% (3%) | 2.8 d | 1.1 d … 4.3 d | 2.7 d | 0% |  |
| 1D | 1% (1%) | 7.3 d | 3.6 d … 12.3 d | 7.3 d | 0% |  |
| 2D | 1% (1%) | 17.2 d | 8.6 d … 22.3 d | 16.8 d | 0% |  |
| 3D | 0% (0%) | 18.6 d | 9.2 d … 29.4 d | 18.4 d | 0% |  |
| 1W | 0% (0%) | 18.6 d | 11.0 d … 52.2 d | 18.4 d | 0% |  |
| 1M | 0% (0%) | 143.2 d | 29.9 d … 143.2 d | 143.1 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **41%** | 40% | 21% | +0 pt | 7374 | 43% / 43% | 1.6 h | INCONSISTENT |
| 3m | **48%** | 40% | 2% | +8 pt | 6187 | 50% / 43% | 1.3 h | FINDING |
| 5m | **60%** | 40% | 2% | +19 pt | 4978 | 61% / 43% | 1.0 h | FINDING |
| 1m+3m | **48%** | 40% | 3% | +8 pt | 6171 | 50% / 43% | 1.3 h | FINDING |
| 3m+5m | **60%** | 40% | 2% | +19 pt | 4960 | 61% / 43% | 1.0 h | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 38% (n 3007) | 31% | 37% | 0 | 49% | 0 min | 24% (n 4447) |
| silver (same swing) | 52% (n 3007) | 21% | 55% | 0 | 34% | 0 min | 21% (n 4447) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 99% first (tie 1%, n 7604) · 3m<5m: 96% first (tie 2%, n 7579) · 5m<15m: 99% first (tie 1%, n 7609) · 15m<30m: 96% first (tie 4%, n 3827) · 30m<1H: 96% first (tie 4%, n 1891) · 1H<2H: 94% first (tie 6%, n 981) · 2H<3H: 85% first (tie 13%, n 665) · 3H<4H: 84% first (tie 8%, n 482) · 4H<6H: 90% first (tie 5%, n 323) · 6H<9H: 66% first (tie 33%, n 238) · 9H<1D: 100% first (tie 0%, n 79) · 1D<2D: 96% first (tie 4%, n 45) · 2D<3D: 90% first (tie 10%, n 30) · 3D<1W: 94% first (tie 6%, n 17) · 1W<1M: 100% first (tie 0%, n 4)

## Anchor 1H

### 1H swing LOWS (how Bear becomes Bull): real 1159+778, failed 1495+909 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 99% (99%) | −24 min | −39 min … −9 min | −7.2 h | 100% |  |
| 3m | 99% (99%) | −9 min | −27 min … 6 min | −7.0 h | 100% |  |
| 5m | 99% (99%) | 5 min | −20 min … 25 min | −6.8 h | 100% |  |
| 15m | 99% (99%) | 1.0 h | 15 min … 2.5 h | −5.3 h | 100% |  |
| 30m | 99% (98%) | 3.0 h | 1.5 h … 5.5 h | −3.0 h | 97% |  |
| 1H (anchor) | 100% (100%) | 7.0 h | 4.0 h … 12.0 h | 0 min | 0% |  |
| 2H | 52% (50%) | 15.0 h | 8.0 h … 1.0 d | 6.0 h | 0% |  |
| 3H | 36% (34%) | 1.0 d | 13.0 h … 1.8 d | 14.0 h | 0% |  |
| 4H | 25% (25%) | 1.3 d | 20.0 h … 2.5 d | 22.0 h | 0% |  |
| 6H | 16% (17%) | 2.0 d | 1.2 d … 3.8 d | 1.6 d | 0% |  |
| 9H | 12% (13%) | 2.5 d | 1.5 d … 4.6 d | 2.0 d | 0% |  |
| 1D | 4% (4%) | 10.2 d | 6.9 d … 14.3 d | 9.4 d | 0% |  |
| 2D | 3% (2%) | 19.3 d | 11.5 d … 35.0 d | 18.5 d | 0% |  |
| 3D | 2% (2%) | 28.5 d | 21.5 d … 48.5 d | 28.4 d | 0% |  |
| 1W | 1% (1%) | 59.8 d | 25.9 d … 71.5 d | 59.6 d | 0% |  |
| 1M | 0% (0%) | 184.5 d | 138.6 d … 234.9 d | 184.3 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **46%** | 46% | 40% | +0 pt | 1672 | 44% / 44% | 7.2 h | NO_EVIDENCE |
| 3m | **46%** | 46% | 65% | -0 pt | 1670 | 43% / 44% | 7.0 h | NO_EVIDENCE |
| 5m | **47%** | 46% | 18% | +1 pt | 1638 | 44% / 44% | 6.8 h | INCONSISTENT |
| 15m | **58%** | 46% | 3% | +12 pt | 1316 | 55% / 44% | 5.3 h | FINDING |
| 30m | **76%** | 46% | 5% | +29 pt | 982 | 73% / 44% | 3.0 h | FINDING |
| 1m+3m | **46%** | 46% | 52% | -0 pt | 1660 | 43% / 44% | 7.0 h | NO_EVIDENCE |
| 3m+5m | **47%** | 46% | 24% | +1 pt | 1632 | 44% / 44% | 6.8 h | INCONSISTENT |
| 5m+15m | **58%** | 46% | 4% | +12 pt | 1311 | 55% / 44% | 5.3 h | FINDING |
| 15m+30m | **76%** | 46% | 6% | +30 pt | 973 | 73% / 44% | 3.0 h | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 40% (n 778) | 31% | 38% | 0 | 42% | 0 min | 21% (n 909) |
| silver (same swing) | 59% (n 778) | 21% | 63% | 0 | 35% | 0 min | 22% (n 909) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 99% first (tie 0%, n 1903) · 3m<5m: 97% first (tie 2%, n 1905) · 5m<15m: 99% first (tie 1%, n 1903) · 15m<30m: 96% first (tie 4%, n 1895) · 30m<1H: 96% first (tie 4%, n 1907) · 1H<2H: 95% first (tie 5%, n 990) · 2H<3H: 89% first (tie 10%, n 671) · 3H<4H: 86% first (tie 6%, n 486) · 4H<6H: 89% first (tie 8%, n 322) · 6H<9H: 62% first (tie 38%, n 235) · 9H<1D: 100% first (tie 0%, n 78) · 1D<2D: 98% first (tie 2%, n 44) · 2D<3D: 97% first (tie 3%, n 31) · 3D<1W: 100% first (tie 0%, n 19) · 1W<1M: 100% first (tie 0%, n 6)

### 1H swing HIGHS (how Bull becomes Bear): real 1159+778, failed 1512+1123 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 99% (99%) | −23 min | −38 min … −7 min | −6.9 h | 100% |  |
| 3m | 99% (99%) | −6 min | −27 min … 9 min | −6.6 h | 100% |  |
| 5m | 99% (99%) | 5 min | −15 min … 25 min | −6.4 h | 100% |  |
| 15m | 99% (98%) | 1.0 h | 15 min … 2.3 h | −5.0 h | 100% |  |
| 30m | 99% (98%) | 2.5 h | 1.0 h … 5.5 h | −2.5 h | 94% |  |
| 1H (anchor) | 100% (100%) | 6.0 h | 3.0 h … 13.0 h | 0 min | 0% |  |
| 2H | 52% (50%) | 14.0 h | 7.0 h … 1.0 d | 4.0 h | 0% |  |
| 3H | 35% (34%) | 23.0 h | 12.0 h … 1.8 d | 12.0 h | 0% |  |
| 4H | 25% (26%) | 1.2 d | 16.0 h … 2.9 d | 19.0 h | 0% |  |
| 6H | 16% (17%) | 1.7 d | 23.0 h … 3.8 d | 1.2 d | 0% |  |
| 9H | 11% (13%) | 2.8 d | 1.2 d … 4.3 d | 1.9 d | 0% |  |
| 1D | 4% (4%) | 7.3 d | 3.6 d … 12.3 d | 7.1 d | 0% |  |
| 2D | 3% (2%) | 17.2 d | 8.6 d … 22.3 d | 16.5 d | 0% |  |
| 3D | 2% (1%) | 18.5 d | 9.2 d … 29.3 d | 18.3 d | 0% |  |
| 1W | 1% (1%) | 18.5 d | 11.0 d … 52.2 d | 18.3 d | 0% |  |
| 1M | 0% (0%) | 143.2 d | 29.9 d … 143.2 d | 143.1 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **41%** | 41% | 63% | -0 pt | 1893 | 43% / 43% | 6.9 h | NO_EVIDENCE |
| 3m | **41%** | 41% | 43% | -0 pt | 1887 | 43% / 43% | 6.6 h | NO_EVIDENCE |
| 5m | **41%** | 41% | 15% | +0 pt | 1874 | 44% / 43% | 6.4 h | INCONSISTENT |
| 15m | **52%** | 41% | 2% | +11 pt | 1485 | 55% / 43% | 5.0 h | FINDING |
| 30m | **69%** | 41% | 6% | +28 pt | 1054 | 72% / 43% | 3.0 h | FINDING |
| 1m+3m | **41%** | 41% | 50% | -0 pt | 1883 | 43% / 43% | 6.6 h | NO_EVIDENCE |
| 3m+5m | **41%** | 41% | 21% | +0 pt | 1868 | 44% / 43% | 6.4 h | NO_EVIDENCE |
| 5m+15m | **52%** | 41% | 3% | +11 pt | 1481 | 55% / 43% | 5.0 h | FINDING |
| 15m+30m | **69%** | 41% | 7% | +28 pt | 1048 | 72% / 43% | 3.0 h | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 40% (n 778) | 35% | 40% | 0 | 47% | 0 min | 24% (n 1123) |
| silver (same swing) | 58% (n 778) | 20% | 56% | 0 | 32% | 0 min | 20% (n 1123) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 100% first (tie 0%, n 1908) · 3m<5m: 95% first (tie 3%, n 1911) · 5m<15m: 99% first (tie 1%, n 1900) · 15m<30m: 96% first (tie 4%, n 1891) · 30m<1H: 96% first (tie 4%, n 1905) · 1H<2H: 94% first (tie 6%, n 991) · 2H<3H: 84% first (tie 13%, n 670) · 3H<4H: 84% first (tie 8%, n 483) · 4H<6H: 90% first (tie 5%, n 325) · 6H<9H: 65% first (tie 33%, n 237) · 9H<1D: 100% first (tie 0%, n 79) · 1D<2D: 96% first (tie 4%, n 45) · 2D<3D: 90% first (tie 10%, n 30) · 3D<1W: 94% first (tie 6%, n 17) · 1W<1M: 100% first (tie 0%, n 4)

## Anchor 4H

### 4H swing LOWS (how Bear becomes Bull): real 298+199, failed 410+234 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 99% (98%) | −2.3 h | −3.0 h … −1.1 h | −1.3 d | 100% |  |
| 3m | 99% (98%) | −1.9 h | −2.8 h … −45 min | −1.2 d | 100% |  |
| 5m | 98% (98%) | −1.7 h | −2.5 h … −25 min | −1.2 d | 100% |  |
| 15m | 98% (98%) | −15 min | −1.5 h … 1.0 h | −1.1 d | 100% |  |
| 30m | 98% (99%) | 1.0 h | 0 min … 3.5 h | −1.1 d | 100% |  |
| 1H | 99% (98%) | 4.0 h | 2.0 h … 10.0 h | −22.0 h | 100% |  |
| 2H | 99% (98%) | 14.0 h | 6.0 h … 22.0 h | −12.0 h | 97% |  |
| 3H | 99% (98%) | 22.0 h | 11.0 h … 1.5 d | −3.0 h | 86% |  |
| 4H (anchor) | 100% (100%) | 1.2 d | 16.0 h … 2.5 d | 0 min | 0% |  |
| 6H | 63% (66%) | 1.9 d | 1.1 d … 3.8 d | 8.0 h | 2% |  |
| 9H | 46% (49%) | 2.4 d | 1.4 d … 4.5 d | 22.0 h | 0% |  |
| 1D | 17% (15%) | 12.0 d | 6.8 d … 14.3 d | 8.7 d | 0% |  |
| 2D | 10% (8%) | 19.2 d | 11.5 d … 35.0 d | 18.2 d | 0% |  |
| 3D | 7% (6%) | 28.5 d | 21.5 d … 48.4 d | 28.3 d | 0% |  |
| 1W | 4% (4%) | 59.7 d | 25.8 d … 71.5 d | 58.2 d | 0% |  |
| 1M | 2% (1%) | 184.5 d | 138.5 d … 234.8 d | 184.2 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **46%** | 46% | 50% | -0 pt | 429 | 42% / 42% | 1.3 d | NO_EVIDENCE |
| 3m | **46%** | 46% | 33% | +0 pt | 427 | 42% / 42% | 1.2 d | NO_EVIDENCE |
| 5m | **46%** | 46% | 50% | -0 pt | 427 | 42% / 42% | 1.2 d | NO_EVIDENCE |
| 15m | **46%** | 46% | 60% | -0 pt | 428 | 42% / 42% | 1.2 d | NO_EVIDENCE |
| 30m | **47%** | 46% | 18% | +1 pt | 416 | 43% / 42% | 1.1 d | NO_EVIDENCE |
| 1H | **57%** | 46% | 1% | +11 pt | 347 | 53% / 42% | 22.0 h | FINDING |
| 2H | **72%** | 46% | 5% | +26 pt | 267 | 69% / 42% | 14.0 h | FINDING |
| 3H | **83%** | 46% | 12% | +37 pt | 205 | 82% / 42% | 4.0 h | FINDING |
| 1m+3m | **46%** | 46% | 44% | +0 pt | 424 | 42% / 42% | 1.2 d | NO_EVIDENCE |
| 3m+5m | **46%** | 46% | 38% | +0 pt | 425 | 42% / 42% | 1.2 d | NO_EVIDENCE |
| 5m+15m | **46%** | 46% | 56% | -0 pt | 424 | 42% / 42% | 1.1 d | NO_EVIDENCE |
| 15m+30m | **47%** | 46% | 25% | +1 pt | 413 | 43% / 42% | 1.1 d | NO_EVIDENCE |
| 30m+1H | **57%** | 46% | 3% | +11 pt | 344 | 53% / 42% | 22.0 h | FINDING |
| 1H+2H | **72%** | 46% | 5% | +26 pt | 266 | 69% / 42% | 14.0 h | FINDING |
| 2H+3H | **83%** | 46% | 13% | +37 pt | 203 | 81% / 42% | 4.0 h | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 32% (n 199) | 17% | 52% | 0 | 42% | 0 min | 24% (n 234) |
| silver (same swing) | 53% (n 199) | 19% | 64% | 0 | 28% | 0 min | 20% (n 234) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 99% first (tie 0%, n 485) · 3m<5m: 97% first (tie 1%, n 486) · 5m<15m: 100% first (tie 0%, n 483) · 15m<30m: 94% first (tie 6%, n 484) · 30m<1H: 95% first (tie 5%, n 487) · 1H<2H: 95% first (tie 5%, n 487) · 2H<3H: 89% first (tie 9%, n 485) · 3H<4H: 85% first (tie 6%, n 489) · 4H<6H: 89% first (tie 8%, n 324) · 6H<9H: 62% first (tie 38%, n 236) · 9H<1D: 100% first (tie 0%, n 78) · 1D<2D: 98% first (tie 2%, n 44) · 2D<3D: 97% first (tie 3%, n 31) · 3D<1W: 100% first (tie 0%, n 19) · 1W<1M: 100% first (tie 0%, n 6)

### 4H swing HIGHS (how Bull becomes Bear): real 299+199, failed 404+312 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 100% (99%) | −1.9 h | −2.8 h … −50 min | −1.2 d | 100% |  |
| 3m | 99% (99%) | −1.6 h | −2.5 h … −36 min | −1.2 d | 100% |  |
| 5m | 99% (99%) | −1.3 h | −2.4 h … −20 min | −1.1 d | 100% |  |
| 15m | 99% (99%) | −15 min | −1.8 h … 45 min | −1.1 d | 100% |  |
| 30m | 100% (98%) | 1.0 h | −30 min … 3.5 h | −1.1 d | 100% |  |
| 1H | 98% (99%) | 4.0 h | 1.0 h … 11.0 h | −19.0 h | 100% |  |
| 2H | 99% (99%) | 14.0 h | 6.0 h … 1.0 d | −8.0 h | 97% |  |
| 3H | 97% (98%) | 22.0 h | 10.0 h … 2.2 d | −3.0 h | 85% |  |
| 4H (anchor) | 100% (100%) | 1.2 d | 16.0 h … 2.8 d | 0 min | 0% |  |
| 6H | 63% (67%) | 1.6 d | 22.0 h … 3.8 d | 6.0 h | 10% |  |
| 9H | 46% (49%) | 2.7 d | 1.1 d … 4.3 d | 17.0 h | 3% |  |
| 1D | 18% (15%) | 7.3 d | 3.5 d … 12.3 d | 6.3 d | 0% |  |
| 2D | 10% (8%) | 17.2 d | 8.5 d … 22.3 d | 15.5 d | 0% |  |
| 3D | 7% (6%) | 18.5 d | 9.1 d … 29.3 d | 17.5 d | 0% |  |
| 1W | 3% (4%) | 18.5 d | 11.0 d … 52.1 d | 17.5 d | 0% |  |
| 1M | 1% (1%) | 143.1 d | 29.8 d … 143.1 d | 142.3 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **39%** | 39% | 0% | +0 pt | 510 | 42% / 43% | 1.2 d | NO_EVIDENCE |
| 3m | **39%** | 39% | 50% | -0 pt | 507 | 42% / 43% | 1.2 d | NO_EVIDENCE |
| 5m | **39%** | 39% | 50% | -0 pt | 509 | 42% / 43% | 1.1 d | NO_EVIDENCE |
| 15m | **39%** | 39% | 50% | -0 pt | 507 | 42% / 43% | 1.1 d | NO_EVIDENCE |
| 30m | **40%** | 39% | 0% | +1 pt | 494 | 44% / 43% | 1.1 d | INCONSISTENT |
| 1H | **51%** | 39% | 2% | +12 pt | 383 | 56% / 43% | 19.0 h | FINDING |
| 2H | **68%** | 39% | 3% | +29 pt | 280 | 73% / 43% | 10.0 h | FINDING |
| 3H | **80%** | 39% | 11% | +41 pt | 205 | 88% / 43% | 3.0 h | FINDING |
| 1m+3m | **39%** | 39% | 40% | -0 pt | 506 | 42% / 43% | 1.2 d | NO_EVIDENCE |
| 3m+5m | **39%** | 39% | 60% | -0 pt | 506 | 42% / 43% | 1.1 d | NO_EVIDENCE |
| 5m+15m | **39%** | 39% | 50% | -0 pt | 505 | 42% / 43% | 1.1 d | NO_EVIDENCE |
| 15m+30m | **40%** | 39% | 11% | +1 pt | 492 | 44% / 43% | 1.1 d | NO_EVIDENCE |
| 30m+1H | **51%** | 39% | 2% | +12 pt | 383 | 56% / 43% | 19.0 h | FINDING |
| 1H+2H | **68%** | 39% | 4% | +29 pt | 277 | 73% / 43% | 10.0 h | FINDING |
| 2H+3H | **80%** | 39% | 12% | +41 pt | 204 | 88% / 43% | 3.0 h | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 36% (n 199) | 31% | 37% | 0 | 42% | 0 min | 20% (n 312) |
| silver (same swing) | 55% (n 199) | 18% | 62% | 0 | 31% | 0 min | 14% (n 312) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 99% first (tie 1%, n 490) · 3m<5m: 94% first (tie 3%, n 489) · 5m<15m: 99% first (tie 1%, n 490) · 15m<30m: 95% first (tie 5%, n 488) · 30m<1H: 96% first (tie 4%, n 487) · 1H<2H: 96% first (tie 4%, n 490) · 2H<3H: 85% first (tie 13%, n 487) · 3H<4H: 84% first (tie 8%, n 488) · 4H<6H: 90% first (tie 5%, n 327) · 6H<9H: 66% first (tie 33%, n 239) · 9H<1D: 100% first (tie 0%, n 79) · 1D<2D: 96% first (tie 4%, n 45) · 2D<3D: 90% first (tie 10%, n 30) · 3D<1W: 94% first (tie 6%, n 17) · 1W<1M: 100% first (tie 0%, n 4)

## Anchor 1D

### 1D swing LOWS (how Bear becomes Bull): real 44+35, failed 54+36 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 100% (98%) | −9.1 h | −13.6 h … −6.5 h | −10.2 d | 100% |  |
| 3m | 100% (100%) | −8.9 h | −13.6 h … −5.9 h | −10.2 d | 100% |  |
| 5m | 100% (98%) | −8.7 h | −13.5 h … −5.8 h | −10.2 d | 100% |  |
| 15m | 97% (100%) | −7.8 h | −12.8 h … −5.3 h | −10.1 d | 100% |  |
| 30m | 97% (100%) | −7.0 h | −12.0 h … −4.0 h | −8.9 d | 100% |  |
| 1H | 100% (100%) | −5.0 h | −10.0 h … 6.0 h | −9.4 d | 100% |  |
| 2H | 97% (100%) | 4.0 h | −6.0 h … 18.0 h | −8.6 d | 100% |  |
| 3H | 97% (100%) | 9.0 h | −6.0 h … 1.3 d | −8.5 d | 100% |  |
| 4H | 97% (100%) | 20.0 h | 0 min … 2.2 d | −8.5 d | 100% |  |
| 6H | 97% (100%) | 1.0 d | 12.0 h … 3.0 d | −8.0 d | 100% |  |
| 9H | 97% (100%) | 2.0 d | 18.0 h … 4.8 d | −7.0 d | 100% |  |
| 1D (anchor) | 100% (100%) | 10.0 d | 6.0 d … 14.0 d | 0 min | 0% |  |
| 2D | 57% (55%) | 19.0 d | 11.0 d … 35.0 d | 5.0 d | 0% |  |
| 3D | 37% (41%) | 28.0 d | 21.0 d … 48.0 d | 20.0 d | 0% |  |
| 1W | 23% (25%) | 59.0 d | 25.0 d … 71.0 d | 37.0 d | 0% |  |
| 1M | 9% (7%) | 184.0 d | 138.0 d … 234.0 d | 179.0 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **49%** | 49% | — | 0 pt | 71 | 45% / 45% | 10.2 d | NO_EVIDENCE |
| 3m | **49%** | 49% | — | 0 pt | 71 | 45% / 45% | 10.2 d | NO_EVIDENCE |
| 5m | **49%** | 49% | — | 0 pt | 71 | 45% / 45% | 10.2 d | NO_EVIDENCE |
| 15m | **49%** | 49% | 100% | -1 pt | 70 | 45% / 45% | 11.9 d | NO_EVIDENCE |
| 30m | **49%** | 49% | 100% | -1 pt | 70 | 45% / 45% | 9.6 d | NO_EVIDENCE |
| 1H | **49%** | 49% | — | 0 pt | 71 | 45% / 45% | 9.4 d | NO_EVIDENCE |
| 2H | **49%** | 49% | 100% | -1 pt | 70 | 46% / 45% | 9.1 d | NO_EVIDENCE |
| 3H | **50%** | 49% | 33% | +1 pt | 68 | 46% / 45% | 9.0 d | NO_EVIDENCE |
| 4H | **53%** | 49% | 14% | +4 pt | 64 | 51% / 45% | 8.7 d | NO_EVIDENCE |
| 6H | **62%** | 49% | 6% | +13 pt | 55 | 56% / 45% | 8.1 d | INCONSISTENT |
| 9H | **68%** | 49% | 5% | +19 pt | 50 | 59% / 45% | 7.3 d | FINDING |
| 1m+3m | **49%** | 49% | — | 0 pt | 71 | 45% / 45% | 10.2 d | NO_EVIDENCE |
| 3m+5m | **49%** | 49% | — | 0 pt | 71 | 45% / 45% | 10.2 d | NO_EVIDENCE |
| 5m+15m | **49%** | 49% | 100% | -1 pt | 70 | 45% / 45% | 11.9 d | NO_EVIDENCE |
| 15m+30m | **48%** | 49% | 100% | -1 pt | 69 | 45% / 45% | 9.6 d | NO_EVIDENCE |
| 30m+1H | **49%** | 49% | 100% | -1 pt | 70 | 45% / 45% | 9.4 d | NO_EVIDENCE |
| 1H+2H | **49%** | 49% | 100% | -1 pt | 70 | 46% / 45% | 9.1 d | NO_EVIDENCE |
| 2H+3H | **50%** | 49% | 33% | +1 pt | 68 | 46% / 45% | 9.0 d | NO_EVIDENCE |
| 3H+4H | **53%** | 49% | 14% | +4 pt | 64 | 51% / 45% | 8.7 d | NO_EVIDENCE |
| 4H+6H | **63%** | 49% | 6% | +14 pt | 54 | 56% / 45% | 8.1 d | FINDING |
| 6H+9H | **68%** | 49% | 5% | +19 pt | 50 | 59% / 45% | 7.3 d | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 20% (n 35) | 43% | 43% | 0 | 57% | 2.0 d | 14% (n 36) |
| silver (same swing) | 63% (n 35) | 23% | 73% | 0 | 50% | 15.2 h | 14% (n 36) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 100% first (tie 0%, n 78) · 3m<5m: 96% first (tie 0%, n 78) · 5m<15m: 99% first (tie 1%, n 77) · 15m<30m: 91% first (tie 8%, n 77) · 30m<1H: 94% first (tie 6%, n 78) · 1H<2H: 94% first (tie 6%, n 78) · 2H<3H: 81% first (tie 14%, n 78) · 3H<4H: 88% first (tie 8%, n 78) · 4H<6H: 85% first (tie 13%, n 78) · 6H<9H: 60% first (tie 40%, n 78) · 9H<1D: 100% first (tie 0%, n 78) · 1D<2D: 98% first (tie 2%, n 44) · 2D<3D: 97% first (tie 3%, n 31) · 3D<1W: 100% first (tie 0%, n 19) · 1W<1M: 100% first (tie 0%, n 6)

### 1D swing HIGHS (how Bull becomes Bear): real 45+35, failed 82+63 (TRAIN+OOS)

#### A. The ladder: which timeframes turn at the same extreme, and when (OOS; TRAIN in brackets)

| timeframe | flipped at the same extreme | median delay after the extreme candle | delay quartiles | vs anchor confirmation (median) | flipped BEFORE the anchor confirmed | note |
|---|---|---|---|---|---|---|
| 1m | 100% (100%) | −10.9 h | −20.2 h … −5.8 h | −7.3 d | 100% |  |
| 3m | 100% (100%) | −10.2 h | −19.9 h … −5.8 h | −7.3 d | 100% |  |
| 5m | 100% (100%) | −10.0 h | −19.9 h … −5.3 h | −7.3 d | 100% |  |
| 15m | 100% (100%) | −9.5 h | −19.0 h … −4.5 h | −7.3 d | 100% |  |
| 30m | 100% (100%) | −8.0 h | −15.5 h … −4.0 h | −7.3 d | 100% |  |
| 1H | 100% (100%) | −7.0 h | −12.0 h … −1.0 h | −7.1 d | 100% |  |
| 2H | 100% (100%) | −6.0 h | −6.0 h … 14.0 h | −7.0 d | 100% |  |
| 3H | 97% (98%) | 0 min | −6.0 h … 18.0 h | −6.4 d | 100% |  |
| 4H | 100% (100%) | 12.0 h | −4.0 h … 1.7 d | −6.3 d | 100% |  |
| 6H | 100% (100%) | 18.0 h | 6.0 h … 2.8 d | −6.3 d | 100% |  |
| 9H | 100% (98%) | 1.4 d | 18.0 h … 3.8 d | −5.3 d | 100% |  |
| 1D (anchor) | 100% (100%) | 7.0 d | 3.0 d … 12.0 d | 0 min | 0% |  |
| 2D | 57% (56%) | 17.0 d | 8.0 d … 22.0 d | 8.0 d | 0% |  |
| 3D | 37% (38%) | 18.0 d | 9.0 d … 29.0 d | 12.0 d | 0% |  |
| 1W | 17% (27%) | 18.0 d | 11.0 d … 52.0 d | 9.0 d | 0% |  |
| 1M | 6% (4%) | 143.0 d | 29.0 d … 143.0 d | 137.0 d | 0% |  |

#### B. Is a lower-timeframe flip evidence? (the knowable question)

Among all anchor extremes, real or failed, that the lower timeframe had already flipped at (before the anchor's outcome was known): the share that became a REAL anchor swing, vs the base rate.

| lower timeframe(s) flipped | real share when flipped (OOS) | base rate (all extremes) | not flipped | lift | n flipped | TRAIN real / base | lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|---|
| 1m | **36%** | 36% | — | 0 pt | 98 | 35% / 35% | 7.3 d | NO_EVIDENCE |
| 3m | **36%** | 36% | 0% | +0 pt | 97 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 5m | **36%** | 36% | — | 0 pt | 98 | 35% / 35% | 7.3 d | NO_EVIDENCE |
| 15m | **36%** | 36% | 0% | +1 pt | 96 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 30m | **36%** | 36% | — | 0 pt | 98 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 1H | **36%** | 36% | — | 0 pt | 98 | 36% / 35% | 7.1 d | NO_EVIDENCE |
| 2H | **36%** | 36% | 0% | +1 pt | 96 | 36% / 35% | 7.0 d | NO_EVIDENCE |
| 3H | **37%** | 36% | 20% | +1 pt | 93 | 38% / 35% | 6.6 d | NO_EVIDENCE |
| 4H | **41%** | 36% | 0% | +5 pt | 85 | 39% / 35% | 6.3 d | INCONSISTENT |
| 6H | **49%** | 36% | 0% | +14 pt | 71 | 49% / 35% | 6.3 d | FINDING |
| 9H | **59%** | 36% | 0% | +24 pt | 59 | 56% / 35% | 5.3 d | FINDING |
| 1m+3m | **36%** | 36% | 0% | +0 pt | 97 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 3m+5m | **36%** | 36% | 0% | +0 pt | 97 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 5m+15m | **36%** | 36% | 0% | +1 pt | 96 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 15m+30m | **36%** | 36% | 0% | +1 pt | 96 | 36% / 35% | 7.3 d | NO_EVIDENCE |
| 30m+1H | **36%** | 36% | — | 0 pt | 98 | 36% / 35% | 7.1 d | NO_EVIDENCE |
| 1H+2H | **36%** | 36% | 0% | +1 pt | 96 | 36% / 35% | 7.0 d | NO_EVIDENCE |
| 2H+3H | **37%** | 36% | 20% | +1 pt | 93 | 38% / 35% | 6.6 d | NO_EVIDENCE |
| 3H+4H | **41%** | 36% | 6% | +6 pt | 82 | 39% / 35% | 6.3 d | NO_EVIDENCE |
| 4H+6H | **49%** | 36% | 0% | +14 pt | 71 | 49% / 35% | 6.2 d | FINDING |
| 6H+9H | **59%** | 36% | 0% | +24 pt | 59 | 56% / 35% | 5.3 d | FINDING |

#### C. DXY and silver at the same moment (±3 anchor candles)

| series | real gold extremes: matching swing | extreme EARLIER than gold | same candle | median extreme lead (candles) | confirmed EARLIER than gold | median confirmation lead | at FAILED gold extremes: matching swing |
|---|---|---|---|---|---|---|---|
| DXY (opposite swing) | 23% (n 35) | 50% | 50% | 1 | 25% | −1.0 d | 10% (n 63) |
| silver (same swing) | 63% (n 35) | 14% | 64% | 0 | 36% | 0 min | 16% (n 63) |

Order: did the smaller of two neighbouring timeframes flip first?

1m<3m: 100% first (tie 0%, n 80) · 3m<5m: 96% first (tie 4%, n 80) · 5m<15m: 100% first (tie 0%, n 80) · 15m<30m: 98% first (tie 3%, n 80) · 30m<1H: 94% first (tie 6%, n 80) · 1H<2H: 95% first (tie 5%, n 80) · 2H<3H: 73% first (tie 23%, n 78) · 3H<4H: 83% first (tie 12%, n 78) · 4H<6H: 86% first (tie 9%, n 80) · 6H<9H: 65% first (tie 35%, n 79) · 9H<1D: 100% first (tie 0%, n 79) · 1D<2D: 96% first (tie 4%, n 45) · 2D<3D: 90% first (tie 10%, n 30) · 3D<1W: 94% first (tie 6%, n 17) · 1W<1M: 100% first (tie 0%, n 4)

