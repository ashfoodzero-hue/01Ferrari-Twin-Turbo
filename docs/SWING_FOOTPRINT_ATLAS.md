# Swing footprint atlas: Phase 2 results

Generated 2026-10-17T15:48:20.070Z. Spec: `docs/SWING_FOOTPRINT_SPEC.md`. Real CME gold futures footprints 2024-10-01 → 2026-10-08, joined to the spot candles by time. TRAIN → OOS from 2025-12-17.

A FINDING follows the same rule as Phase 1: OOS Holm (footprint measures only), the same sign in TRAIN, vs random candles and at 2× / 5× ATR. The **head-to-head** column gives the strongest CANDLE-SHAPE gap on the same events at the same offset: if it is as large, the footprint adds little.

## Overview

| TF | swings H (TRAIN+OOS) | swings L | footprint FINDINGS H | L |
|---|---|---|---|---|
| 1m | 11701+7476 | 11686+7486 | 37 | 36 |
| 3m | 3591+2391 | 3590+2390 | 19 | 27 |
| 5m | 2181+1435 | 2180+1436 | 12 | 22 |
| 15m | 703+488 | 703+488 | 5 | 4 |
| 30m | 365+242 | 364+242 | 1 | 1 |
| 1H | 174+114 | 173+114 | 0 | 1 |
| 2H | 91+69 | 89+69 | 0 | 0 |
| 3H | 60+46 | 59+47 | 0 | 0 |
| 4H | 44+31 | 44+32 | 0 | 0 |
| 6H | 28+17 | 29+18 | described only | described only |
| 9H | 19+11 | 20+11 | described only | described only |
| 1D | 8+6 | 8+5 | described only | described only |

## 1m

### Swing LOWS: 36 footprint findings (7486 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **57%** | 43% | 46% | clear +13 pt | 27% / 19% | 3|dir_bull +21 pt |
| 3 candles after the low (still holding) has POSITIVE delta (more aggressive buying) | **59%** | 47% | 47% | clear +12 pt | 57% / 46% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **59%** | 48% | 46% | clear +12 pt | 31% / 22% | 2|dir_bull +20 pt |
| 2 candles after the low (still holding) has POSITIVE delta (more aggressive buying) | **62%** | 51% | 48% | clear +11 pt | 61% / 50% | 2|dir_bull +20 pt |
| 3 candles after the low (still holding) has STRONG selling delta (bottom third) | **21%** | 31% | 31% | clear -10 pt | 23% / 31% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) trades HIGH volume vs its last 20 candles | **35%** | 24% | 32% | clear +10 pt | 34% / 27% | 2|dir_bull +20 pt |
| 3 candles after the low (still holding) has STRONG buying delta (top third) | **48%** | 38% | 38% | clear +10 pt | 47% / 36% | 3|dir_bull +21 pt |
| 1 candle after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **66%** | 56% | 46% | moderate +10 pt | 38% / 32% | 1|body_atr:hi +15 pt |
| 2 candles after the low (still holding) has STRONG buying delta (top third) | **49%** | 39% | 36% | moderate +10 pt | 49% / 37% | 2|dir_bull +20 pt |
| 2 candles after the low (still holding) has STRONG selling delta (bottom third) | **19%** | 28% | 32% | moderate -9 pt | 21% / 29% | 2|dir_bull +20 pt |
| 3 candles after the low (still holding) has LITTLE aggressive selling at its low | **54%** | 45% | 46% | moderate +8 pt | 41% / 34% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) trades LOW volume vs its last 20 candles | **32%** | 40% | 36% | moderate -8 pt | 32% / 38% | 2|dir_bull +20 pt |
| 1 candle after the low (still holding) has STRONG selling delta (bottom third) | **27%** | 34% | 48% | moderate -7 pt | 28% / 33% | 1|body_atr:hi +15 pt |
| 2 candles after the low (still holding) has LITTLE aggressive selling at its low | **54%** | 47% | 45% | moderate +7 pt | 42% / 35% | 2|dir_bull +20 pt |
| 1 candle after the low (still holding) has POSITIVE delta (more aggressive buying) | **69%** | 62% | 48% | moderate +7 pt | 69% / 63% | 1|body_atr:hi +15 pt |
| 1 candle after the low (still holding) has STRONG buying delta (top third) | **40%** | 33% | 24% | moderate +7 pt | 40% / 34% | 1|body_atr:hi +15 pt |
| 1 candle after the low (still holding) trades HIGH volume vs its last 20 candles | **38%** | 31% | 29% | moderate +7 pt | 37% / 33% | 1|body_atr:hi +15 pt |
| 3 candles after the low (still holding) has THIN volume at its low | **51%** | 45% | 47% | moderate +7 pt | 37% / 33% | 3|dir_bull +21 pt |
| 3 candles after the low (still holding) has HEAVY aggressive selling at its low | **16%** | 22% | 21% | moderate -6 pt | 31% / 34% | 3|dir_bull +21 pt |
| 3 candles after the low (still holding) has HEAVY volume at its low | **17%** | 22% | 20% | tiny -5 pt | 34% / 36% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) has THIN volume at its low | **52%** | 47% | 47% | tiny +5 pt | 38% / 34% | 2|dir_bull +20 pt |
| 2 candles after the low (still holding) has HEAVY aggressive selling at its low | **16%** | 21% | 22% | tiny -5 pt | 30% / 33% | 2|dir_bull +20 pt |
| 1 candle after the low (still holding) trades LOW volume vs its last 20 candles | **30%** | 34% | 41% | tiny -5 pt | 32% / 33% | 1|body_atr:hi +15 pt |
| 1 candle after the low (still holding) has LITTLE aggressive selling at its low | **47%** | 42% | 34% | tiny +4 pt | 35% / 33% | 1|body_atr:hi +15 pt |
| the low candle shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **52%** | 48% | 46% | tiny +4 pt | 24% / 20% | 0|range_atr:hi +8 pt |
| 3 candles after the low (still holding) has its most-traded price near the HIGH | **39%** | 35% | 35% | tiny +4 pt | 41% / 37% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **40%** | 44% | 46% | tiny -4 pt | 14% / 20% | 2|dir_bull +20 pt |
| 3 candles after the low (still holding) has its most-traded price near the LOW | **30%** | 34% | 35% | tiny -3 pt | 27% / 29% | 3|dir_bull +21 pt |
| 3 candles after the low (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **42%** | 45% | 47% | tiny -3 pt | 16% / 23% | 3|dir_bull +21 pt |
| 1 candle before the low trades HIGH volume vs its last 20 candles | **37%** | 34% | 20% | tiny +3 pt | 35% / 33% | -1|range_atr:hi +3 pt |
| 3 candles after the low (still holding) has LITTLE aggressive buying at its high | **32%** | 35% | 37% | tiny -3 pt | 22% / 27% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) has HEAVY volume at its low | **17%** | 19% | 20% | tiny -3 pt | 33% / 34% | 2|dir_bull +20 pt |
| 1 candle after the low (still holding) has its most-traded price near the HIGH | **34%** | 31% | 30% | tiny +3 pt | 35% / 33% | 1|body_atr:hi +15 pt |
| 3 candles after the low (still holding) shows ABSORPTION at its high (heavy buying soaked up, closes lower half) | **7%** | 9% | 7% | tiny -2 pt | 12% / 14% | 3|dir_bull +21 pt |
| 2 candles after the low (still holding) shows ABSORPTION at its high (heavy buying soaked up, closes lower half) | **6%** | 8% | 7% | tiny -2 pt | 11% / 14% | 2|dir_bull +20 pt |
| 1 candle after the low (still holding) shows ABSORPTION at its high (heavy buying soaked up, closes lower half) | **4%** | 6% | 7% | tiny -2 pt | 8% / 10% | 1|body_atr:hi +15 pt |

Passed OOS but NOT proven (4): 3 candles after the low (still holding) trades LOW volume vs its last 20 candles [fails robustness]; 3 candles after the low (still holding) trades HIGH volume vs its last 20 candles [fails robustness]; the low candle trades HIGH volume vs its last 20 candles [inconsistent]; the low candle trades LOW volume vs its last 20 candles [inconsistent]

### Swing HIGHS: 37 footprint findings (7476 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 2 candles after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **59%** | 48% | 46% | clear +11 pt | 30% / 22% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) has STRONG selling delta (bottom third) | **49%** | 38% | 38% | clear +11 pt | 48% / 37% | 3|dir_bear +18 pt |
| 2 candles after the high (still holding) has POSITIVE delta (more aggressive buying) | **33%** | 43% | 47% | clear -10 pt | 34% / 44% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **55%** | 45% | 46% | clear +10 pt | 27% / 19% | 3|dir_bear +18 pt |
| 2 candles after the high (still holding) has STRONG selling delta (bottom third) | **48%** | 38% | 35% | clear +10 pt | 48% / 37% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) has POSITIVE delta (more aggressive buying) | **37%** | 47% | 48% | moderate -10 pt | 38% / 49% | 3|dir_bear +18 pt |
| 2 candles after the high (still holding) has STRONG buying delta (top third) | **20%** | 28% | 33% | moderate -8 pt | 21% / 29% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) has STRONG buying delta (top third) | **20%** | 28% | 30% | moderate -8 pt | 21% / 30% | 3|dir_bear +18 pt |
| 1 candle after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **65%** | 57% | 46% | moderate +8 pt | 39% / 31% | 1|lower_wick_frac:mid +13 pt |
| 3 candles after the high (still holding) has LITTLE aggressive buying at its high | **55%** | 48% | 48% | moderate +7 pt | 43% / 35% | 3|dir_bear +18 pt |
| 2 candles after the high (still holding) trades LOW volume vs its last 20 candles | **33%** | 40% | 34% | moderate -7 pt | 32% / 38% | 2|dir_bear +21 pt |
| 2 candles after the high (still holding) has LITTLE aggressive buying at its high | **54%** | 48% | 45% | moderate +7 pt | 42% / 36% | 2|dir_bear +21 pt |
| 1 candle after the high (still holding) has STRONG selling delta (bottom third) | **39%** | 32% | 23% | moderate +7 pt | 41% / 33% | 1|lower_wick_frac:mid +13 pt |
| 1 candle after the high (still holding) has STRONG buying delta (top third) | **29%** | 35% | 51% | moderate -5 pt | 28% / 34% | 1|lower_wick_frac:mid +13 pt |
| 3 candles after the high (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **40%** | 46% | 46% | moderate -5 pt | 14% / 21% | 3|dir_bear +18 pt |
| 1 candle after the high (still holding) trades HIGH volume vs its last 20 candles | **38%** | 32% | 31% | moderate +5 pt | 37% / 33% | 1|lower_wick_frac:mid +13 pt |
| 2 candles after the high (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **37%** | 42% | 46% | moderate -5 pt | 12% / 18% | 2|dir_bear +21 pt |
| 1 candle after the high (still holding) has POSITIVE delta (more aggressive buying) | **27%** | 32% | 48% | moderate -5 pt | 25% / 31% | 1|lower_wick_frac:mid +13 pt |
| 3 candles after the high (still holding) has THIN volume at its high | **53%** | 48% | 49% | tiny +5 pt | 39% / 33% | 3|dir_bear +18 pt |
| 3 candles after the high (still holding) has HEAVY aggressive buying at its high | **16%** | 20% | 19% | tiny -4 pt | 29% / 33% | 3|dir_bear +18 pt |
| 3 candles after the high (still holding) has HEAVY volume at its high | **15%** | 19% | 18% | tiny -4 pt | 33% / 35% | 3|dir_bear +18 pt |
| 2 candles after the high (still holding) has medium buying at its high | **29%** | 33% | 34% | tiny -4 pt | 29% / 32% | 2|dir_bear +21 pt |
| 2 candles after the high (still holding) has THIN volume at its high | **52%** | 48% | 47% | tiny +4 pt | 37% / 34% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) has LITTLE aggressive selling at its low | **33%** | 36% | 39% | tiny -3 pt | 22% / 27% | 3|dir_bear +18 pt |
| the high candle trades HIGH volume vs its last 20 candles | **40%** | 37% | 15% | tiny +3 pt | 35% / 33% | 0|range_atr:hi +6 pt |
| 2 candles after the high (still holding) shows ABSORPTION at its low (heavy selling soaked up, closes upper half) | **6%** | 10% | 8% | tiny -3 pt | 13% / 16% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) shows ABSORPTION at its low (heavy selling soaked up, closes upper half) | **8%** | 11% | 8% | tiny -3 pt | 14% / 17% | 3|dir_bear +18 pt |
| 2 candles after the high (still holding) has its most-traded price near the HIGH | **26%** | 29% | 31% | tiny -3 pt | 27% / 30% | 2|dir_bear +21 pt |
| 3 candles after the high (still holding) has medium buying at its high | **30%** | 33% | 33% | tiny -3 pt | 28% / 32% | 3|dir_bear +18 pt |
| 3 candles after the high (still holding) has its most-traded price near the HIGH | **24%** | 27% | 28% | tiny -3 pt | 26% / 30% | 3|dir_bear +18 pt |
| the high candle shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **50%** | 47% | 47% | tiny +3 pt | 22% / 19% | 0|range_atr:hi +6 pt |
| 2 candles after the high (still holding) has THIN volume at its low | **40%** | 43% | 44% | tiny -3 pt | 26% / 29% | 2|dir_bear +21 pt |
| 2 candles after the high (still holding) has its most-traded price near the LOW | **38%** | 35% | 35% | tiny +3 pt | 34% / 31% | 2|dir_bear +21 pt |
| 2 candles after the high (still holding) has HEAVY aggressive buying at its high | **16%** | 19% | 21% | tiny -3 pt | 30% / 32% | 2|dir_bear +21 pt |
| 1 candle after the high (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **34%** | 37% | 46% | tiny -3 pt | 9% / 12% | 1|lower_wick_frac:mid +13 pt |
| 1 candle after the high (still holding) trades LOW volume vs its last 20 candles | **31%** | 34% | 39% | tiny -3 pt | 32% / 33% | 1|lower_wick_frac:mid +13 pt |
| 1 candle after the high (still holding) shows ABSORPTION at its low (heavy selling soaked up, closes upper half) | **5%** | 7% | 8% | tiny -2 pt | 11% / 12% | 1|lower_wick_frac:mid +13 pt |

Passed OOS but NOT proven (3): 2 candles after the high (still holding) trades HIGH volume vs its last 20 candles [fails robustness]; 3 candles after the high (still holding) trades LOW volume vs its last 20 candles [fails robustness]; 3 candles after the high (still holding) trades HIGH volume vs its last 20 candles [fails robustness]

## 3m

### Swing LOWS: 27 footprint findings (2390 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the low (still holding) trades LOW volume vs its last 20 candles | **32%** | 47% | 36% | clear -14 pt | 33% / 46% | 3|dir_bull +20 pt |
| 2 candles after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **69%** | 56% | 57% | clear +13 pt | 35% / 22% | 2|dir_bull +22 pt |
| 2 candles after the low (still holding) trades HIGH volume vs its last 20 candles | **36%** | 24% | 32% | clear +12 pt | 36% / 25% | 2|dir_bull +22 pt |
| 2 candles after the low (still holding) has POSITIVE delta (more aggressive buying) | **63%** | 50% | 47% | clear +12 pt | 60% / 50% | 2|dir_bull +22 pt |
| 3 candles after the low (still holding) trades HIGH volume vs its last 20 candles | **30%** | 18% | 30% | clear +12 pt | 30% / 19% | 3|dir_bull +20 pt |
| 3 candles after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **65%** | 54% | 56% | clear +11 pt | 32% / 20% | 3|dir_bull +20 pt |
| 2 candles after the low (still holding) trades LOW volume vs its last 20 candles | **30%** | 40% | 37% | clear -11 pt | 32% / 40% | 2|dir_bull +22 pt |
| 3 candles after the low (still holding) has POSITIVE delta (more aggressive buying) | **59%** | 48% | 48% | clear +11 pt | 58% / 47% | 3|dir_bull +20 pt |
| 2 candles after the low (still holding) has STRONG buying delta (top third) | **50%** | 39% | 37% | clear +10 pt | 48% / 39% | 2|dir_bull +22 pt |
| 3 candles after the low (still holding) has STRONG selling delta (bottom third) | **20%** | 30% | 30% | clear -10 pt | 20% / 31% | 3|dir_bull +20 pt |
| 1 candle after the low (still holding) trades HIGH volume vs its last 20 candles | **42%** | 32% | 28% | clear +10 pt | 40% / 33% | 1|close_loc:lo -15 pt |
| 3 candles after the low (still holding) has STRONG buying delta (top third) | **48%** | 38% | 39% | clear +10 pt | 47% / 37% | 3|dir_bull +20 pt |
| 1 candle after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **77%** | 67% | 57% | moderate +10 pt | 43% / 32% | 1|close_loc:lo -15 pt |
| 2 candles after the low (still holding) has STRONG selling delta (bottom third) | **18%** | 27% | 31% | moderate -9 pt | 19% / 28% | 2|dir_bull +22 pt |
| the low candle trades HIGH volume vs its last 20 candles | **46%** | 38% | 14% | moderate +8 pt | 39% / 33% | 0|range_atr:hi +12 pt |
| 2 candles after the low (still holding) has LITTLE aggressive selling at its low | **57%** | 50% | 45% | moderate +8 pt | 47% / 37% | 2|dir_bull +22 pt |
| 1 candle after the low (still holding) has STRONG buying delta (top third) | **42%** | 35% | 25% | moderate +8 pt | 40% / 33% | 1|close_loc:lo -15 pt |
| 3 candles after the low (still holding) has LITTLE aggressive selling at its low | **56%** | 49% | 47% | moderate +8 pt | 47% / 35% | 3|dir_bull +20 pt |
| the low candle shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **65%** | 58% | 56% | moderate +7 pt | 28% / 23% | 0|range_atr:hi +12 pt |
| 2 candles after the low (still holding) has THIN volume at its low | **56%** | 49% | 45% | moderate +7 pt | 45% / 36% | 2|dir_bull +22 pt |
| 1 candle after the low (still holding) has POSITIVE delta (more aggressive buying) | **71%** | 65% | 48% | moderate +6 pt | 71% / 61% | 1|close_loc:lo -15 pt |
| 1 candle after the low (still holding) trades LOW volume vs its last 20 candles | **28%** | 34% | 43% | moderate -6 pt | 28% / 33% | 1|close_loc:lo -15 pt |
| 1 candle after the low (still holding) has STRONG selling delta (bottom third) | **23%** | 29% | 47% | moderate -6 pt | 24% / 33% | 1|close_loc:lo -15 pt |
| 3 candles after the low (still holding) has HEAVY volume at its low | **15%** | 21% | 21% | moderate -5 pt | 26% / 33% | 3|dir_bull +20 pt |
| 2 candles after the low (still holding) has HEAVY aggressive selling at its low | **14%** | 19% | 23% | tiny -5 pt | 24% / 31% | 2|dir_bull +22 pt |
| 1 candle after the low (still holding) has HEAVY aggressive selling at its low | **19%** | 23% | 33% | tiny -4 pt | 29% / 33% | 1|close_loc:lo -15 pt |
| 2 candles after the low (still holding) has HEAVY volume at its low | **15%** | 19% | 23% | tiny -4 pt | 26% / 31% | 2|dir_bull +22 pt |

Passed OOS but NOT proven (1): the low candle trades normal volume [fails robustness]

### Swing HIGHS: 19 footprint findings (2391 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 2 candles after the high (still holding) trades HIGH volume vs its last 20 candles | **40%** | 27% | 37% | clear +12 pt | 39% / 26% | 2|dir_bear +20 pt |
| 2 candles after the high (still holding) has POSITIVE delta (more aggressive buying) | **34%** | 43% | 47% | moderate -9 pt | 35% / 46% | 2|dir_bear +20 pt |
| 3 candles after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **66%** | 57% | 57% | moderate +9 pt | 31% / 20% | 3|dir_bull -19 pt |
| 3 candles after the high (still holding) trades LOW volume vs its last 20 candles | **31%** | 40% | 31% | moderate -9 pt | 31% / 43% | 3|dir_bull -19 pt |
| 2 candles after the high (still holding) has STRONG selling delta (bottom third) | **48%** | 40% | 36% | moderate +8 pt | 48% / 38% | 2|dir_bear +20 pt |
| 2 candles after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **67%** | 59% | 58% | moderate +8 pt | 33% / 23% | 2|dir_bear +20 pt |
| 2 candles after the high (still holding) trades LOW volume vs its last 20 candles | **30%** | 37% | 31% | moderate -8 pt | 29% / 38% | 2|dir_bear +20 pt |
| 3 candles after the high (still holding) has STRONG selling delta (bottom third) | **46%** | 38% | 37% | moderate +7 pt | 46% / 37% | 3|dir_bull -19 pt |
| 2 candles after the high (still holding) has STRONG buying delta (top third) | **19%** | 26% | 31% | moderate -7 pt | 21% / 28% | 2|dir_bear +20 pt |
| 1 candle after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **74%** | 67% | 56% | moderate +7 pt | 41% / 33% | 1|body_atr:hi +13 pt |
| 3 candles after the high (still holding) has POSITIVE delta (more aggressive buying) | **40%** | 46% | 49% | moderate -6 pt | 38% / 50% | 3|dir_bull -19 pt |
| 1 candle after the high (still holding) has STRONG buying delta (top third) | **28%** | 34% | 52% | moderate -6 pt | 26% / 34% | 1|body_atr:hi +13 pt |
| 3 candles after the high (still holding) has STRONG buying delta (top third) | **22%** | 28% | 30% | moderate -6 pt | 21% / 30% | 3|dir_bull -19 pt |
| 2 candles after the high (still holding) has THIN volume at its high | **52%** | 47% | 43% | moderate +5 pt | 41% / 36% | 2|dir_bear +20 pt |
| 1 candle after the high (still holding) has POSITIVE delta (more aggressive buying) | **27%** | 32% | 50% | moderate -5 pt | 25% / 32% | 1|body_atr:hi +13 pt |
| 2 candles after the high (still holding) trades normal volume | **31%** | 35% | 32% | tiny -5 pt | 32% / 35% | 2|dir_bear +20 pt |
| 3 candles after the high (still holding) has its most-traded price near the HIGH | **24%** | 29% | 30% | tiny -5 pt | 26% / 30% | 3|dir_bull -19 pt |
| 1 candle after the high (still holding) has STRONG selling delta (bottom third) | **40%** | 35% | 23% | tiny +5 pt | 40% / 33% | 1|body_atr:hi +13 pt |
| 1 candle after the high (still holding) trades LOW volume vs its last 20 candles | **28%** | 33% | 38% | tiny -5 pt | 29% / 33% | 1|body_atr:hi +13 pt |

Passed OOS but NOT proven (1): 3 candles after the high (still holding) trades HIGH volume vs its last 20 candles [fails robustness]

## 5m

### Swing LOWS: 22 footprint findings (1436 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the low (still holding) trades HIGH volume vs its last 20 candles | **30%** | 13% | 29% | clear +16 pt | 28% / 18% | 3|dir_bull +22 pt |
| 2 candles after the low (still holding) trades LOW volume vs its last 20 candles | **31%** | 44% | 38% | clear -13 pt | 32% / 41% | 2|dir_bull +21 pt |
| 3 candles after the low (still holding) trades LOW volume vs its last 20 candles | **34%** | 47% | 37% | clear -13 pt | 35% / 46% | 3|dir_bull +22 pt |
| 2 candles after the low (still holding) trades HIGH volume vs its last 20 candles | **35%** | 23% | 31% | clear +12 pt | 35% / 23% | 2|dir_bull +21 pt |
| 3 candles after the low (still holding) has POSITIVE delta (more aggressive buying) | **57%** | 46% | 49% | clear +11 pt | 58% / 45% | 3|dir_bull +22 pt |
| 2 candles after the low (still holding) has STRONG buying delta (top third) | **52%** | 41% | 39% | clear +11 pt | 49% / 39% | 2|dir_bull +21 pt |
| 3 candles after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **68%** | 57% | 60% | clear +11 pt | 33% / 21% | 3|dir_bull +22 pt |
| 1 candle after the low (still holding) trades HIGH volume vs its last 20 candles | **43%** | 33% | 28% | clear +10 pt | 40% / 33% | 1|body_atr:hi +16 pt |
| 2 candles after the low (still holding) has STRONG selling delta (bottom third) | **19%** | 28% | 31% | moderate -10 pt | 20% / 27% | 2|dir_bull +21 pt |
| 2 candles after the low (still holding) has POSITIVE delta (more aggressive buying) | **61%** | 52% | 49% | moderate +10 pt | 60% / 52% | 2|dir_bull +21 pt |
| 2 candles after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **71%** | 62% | 60% | moderate +10 pt | 35% / 24% | 2|dir_bull +21 pt |
| the low candle trades HIGH volume vs its last 20 candles | **44%** | 34% | 13% | moderate +10 pt | 38% / 33% | 0|range_atr:hi +15 pt |
| 3 candles after the low (still holding) has STRONG selling delta (bottom third) | **20%** | 29% | 27% | moderate -9 pt | 19% / 32% | 3|dir_bull +22 pt |
| 3 candles after the low (still holding) has LITTLE aggressive selling at its low | **56%** | 47% | 49% | moderate +9 pt | 48% / 36% | 3|dir_bull +22 pt |
| 3 candles after the low (still holding) has STRONG buying delta (top third) | **47%** | 39% | 40% | moderate +9 pt | 49% / 36% | 3|dir_bull +22 pt |
| 2 candles after the low (still holding) has LITTLE aggressive selling at its low | **57%** | 49% | 44% | moderate +8 pt | 47% / 38% | 2|dir_bull +21 pt |
| 2 candles after the low (still holding) has THIN volume at its low | **56%** | 48% | 45% | moderate +8 pt | 47% / 37% | 2|dir_bull +21 pt |
| 1 candle after the low (still holding) trades LOW volume vs its last 20 candles | **27%** | 34% | 43% | moderate -8 pt | 29% / 33% | 1|body_atr:hi +16 pt |
| 1 candle after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **77%** | 70% | 59% | moderate +7 pt | 43% / 33% | 1|body_atr:hi +16 pt |
| 3 candles after the low (still holding) has HEAVY aggressive selling at its low | **16%** | 22% | 23% | moderate -6 pt | 22% / 32% | 3|dir_bull +22 pt |
| 3 candles after the low (still holding) has HEAVY volume at its low | **16%** | 22% | 21% | moderate -6 pt | 24% / 32% | 3|dir_bull +22 pt |
| 1 candle after the low (still holding) has HEAVY aggressive selling at its low | **19%** | 25% | 35% | moderate -6 pt | 29% / 33% | 1|body_atr:hi +16 pt |

### Swing HIGHS: 12 footprint findings (1435 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the high (still holding) trades HIGH volume vs its last 20 candles | **39%** | 23% | 38% | clear +16 pt | 37% / 22% | 3|close_loc:lo +21 pt |
| 3 candles after the high (still holding) trades LOW volume vs its last 20 candles | **28%** | 40% | 31% | clear -12 pt | 30% / 43% | 3|close_loc:lo +21 pt |
| 3 candles after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **71%** | 60% | 62% | clear +10 pt | 33% / 20% | 3|close_loc:lo +21 pt |
| 2 candles after the high (still holding) trades HIGH volume vs its last 20 candles | **37%** | 27% | 37% | clear +10 pt | 37% / 26% | 2|dir_bear +18 pt |
| 3 candles after the high (still holding) has STRONG selling delta (bottom third) | **48%** | 38% | 38% | moderate +10 pt | 46% / 35% | 3|close_loc:lo +21 pt |
| 3 candles after the high (still holding) has POSITIVE delta (more aggressive buying) | **37%** | 47% | 48% | moderate -10 pt | 39% / 50% | 3|close_loc:lo +21 pt |
| 3 candles after the high (still holding) has THIN volume at its high | **57%** | 48% | 46% | moderate +9 pt | 44% / 37% | 3|close_loc:lo +21 pt |
| 3 candles after the high (still holding) has STRONG buying delta (top third) | **20%** | 28% | 30% | moderate -9 pt | 22% / 30% | 3|close_loc:lo +21 pt |
| 2 candles after the high (still holding) trades LOW volume vs its last 20 candles | **30%** | 38% | 33% | moderate -8 pt | 30% / 38% | 2|dir_bear +18 pt |
| 2 candles after the high (still holding) has STRONG selling delta (bottom third) | **46%** | 40% | 36% | moderate +7 pt | 49% / 37% | 2|dir_bear +18 pt |
| 1 candle after the high (still holding) trades HIGH volume vs its last 20 candles | **40%** | 34% | 34% | moderate +6 pt | 41% / 33% | 1|dir_bear +15 pt |
| 1 candle after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **75%** | 70% | 61% | moderate +6 pt | 40% / 31% | 1|dir_bear +15 pt |

## 15m

### Swing LOWS: 4 footprint findings (488 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the low (still holding) trades LOW volume vs its last 20 candles | **36%** | 52% | 38% | clear -16 pt | 32% / 47% | 3|dir_bull +15 pt |
| 2 candles after the low (still holding) trades HIGH volume vs its last 20 candles | **33%** | 19% | 28% | clear +14 pt | 37% / 23% | 2|dir_bear -18 pt |
| 3 candles after the low (still holding) has HEAVY aggressive selling at its low | **15%** | 29% | 23% | clear -13 pt | 18% / 29% | 3|dir_bull +15 pt |
| 1 candle after the low (still holding) shows STACKED BUY imbalances (≥ 3 levels, 3:1) | **80%** | 71% | 64% | moderate +10 pt | 47% / 34% | 1|close_loc:hi +17 pt |

Passed OOS but NOT proven (1): 3 candles after the low (still holding) trades HIGH volume vs its last 20 candles [fails robustness]

### Swing HIGHS: 5 footprint findings (488 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the high (still holding) trades HIGH volume vs its last 20 candles | **36%** | 16% | 34% | clear +20 pt | 38% / 19% | 3|sweep_high_reject -18 pt |
| 2 candles after the high (still holding) trades LOW volume vs its last 20 candles | **27%** | 43% | 30% | clear -16 pt | 27% / 39% | 2|dir_bear +26 pt |
| 3 candles after the high (still holding) trades LOW volume vs its last 20 candles | **29%** | 45% | 31% | clear -16 pt | 27% / 45% | 3|sweep_high_reject -18 pt |
| 2 candles after the high (still holding) trades HIGH volume vs its last 20 candles | **36%** | 22% | 34% | clear +14 pt | 42% / 26% | 2|dir_bear +26 pt |
| 2 candles after the high (still holding) shows STACKED SELL imbalances (≥ 3 levels, 3:1) | **76%** | 63% | 65% | clear +13 pt | 38% / 24% | 2|dir_bear +26 pt |

## 30m

### Swing LOWS: 1 footprint finding (242 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| the low candle trades HIGH volume vs its last 20 candles | **45%** | 27% | 13% | clear +17 pt | 40% / 33% | 0|range_atr:hi +19 pt |

### Swing HIGHS: 1 footprint finding (242 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 3 candles after the high (still holding) trades HIGH volume vs its last 20 candles | **32%** | 16% | 30% | clear +16 pt | 35% / 17% | 3|range_atr:hi +18 pt |

## 1H

### Swing LOWS: 1 footprint finding (114 OOS swings)

| what (proven, footprint) | swing (OOS) | failed | random | gap | TRAIN swing / failed | head-to-head: strongest candle-shape gap, same offset |
|---|---|---|---|---|---|---|
| 2 candles before the low has LITTLE aggressive buying at its high | **46%** | 25% | 32% | clear +21 pt | 36% / 33% | -2|upper_wick_frac:mid -11 pt |

### Swing HIGHS: 0 footprint findings (114 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 2H

### Swing LOWS: 0 footprint findings (69 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

### Swing HIGHS: 0 footprint findings (69 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 3H

### Swing LOWS: 0 footprint findings (47 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

### Swing HIGHS: 0 footprint findings (46 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 4H

### Swing LOWS: 0 footprint findings (32 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

### Swing HIGHS: 0 footprint findings (31 OOS swings)

No footprint measure separates real swings from failed extremes on this timeframe (OOS, after Holm).

## 6H

### Swing LOWS: DESCRIBED ONLY (18 OOS swings)

| what (footprint) | swing | failed | random | n |
|---|---|---|---|---|
| 1 candle before the low has its most-traded price near the LOW | 17% | 59% | 36% | 18 |
| 1 candle after the low (still holding) has LITTLE aggressive buying at its high | 44% | 10% | 22% | 18 |
| 1 candle before the low has THIN volume at its low | 61% | 28% | 56% | 18 |
| 1 candle before the low has HEAVY volume at its low | 17% | 48% | 22% | 18 |
| 1 candle before the low has HEAVY aggressive selling at its low | 17% | 48% | 22% | 18 |
| 1 candle before the low has LITTLE aggressive selling at its low | 56% | 24% | 56% | 18 |

### Swing HIGHS: DESCRIBED ONLY (17 OOS swings)

| what (footprint) | swing | failed | random | n |
|---|---|---|---|---|
| 1 candle after the high (still holding) has medium selling at its low | 18% | 54% | 34% | 17 |
| 3 candles before the high has STRONG selling delta (bottom third) | 19% | 54% | 38% | 16 |
| 3 candles before the high has balanced delta | 56% | 23% | 21% | 16 |
| 3 candles after the high (still holding) trades HIGH volume vs its last 20 candles | 47% | 16% | 43% | 17 |
| 3 candles before the high trades LOW volume vs its last 20 candles | 81% | 50% | 57% | 16 |
| 3 candles before the high has its most-traded price near the LOW | 38% | 8% | 30% | 16 |

## 9H

### Swing LOWS: DESCRIBED ONLY (11 OOS swings)

| what (footprint) | swing | failed | random | n |
|---|---|---|---|---|
| 2 candles before the low has its most-traded price in the middle | 73% | 12% | 23% | 11 |
| 3 candles after the low (still holding) has medium volume at its low | 0% | 45% | 45% | 9 |
| 3 candles after the low (still holding) has medium selling at its low | 0% | 45% | 29% | 9 |
| 1 candle after the low (still holding) has medium volume at its high | 9% | 48% | 26% | 11 |
| 1 candle before the low has medium volume at its low | 55% | 16% | 16% | 11 |
| 2 candles after the low (still holding) has THIN volume at its high | 18% | 52% | 74% | 11 |

### Swing HIGHS: DESCRIBED ONLY (11 OOS swings)

| what (footprint) | swing | failed | random | n |
|---|---|---|---|---|
| 2 candles before the high trades HIGH volume vs its last 20 candles | 30% | 80% | 48% | 10 |
| 1 candle after the high (still holding) has medium buying at its high | 0% | 44% | 32% | 11 |
| 1 candle after the high (still holding) has medium volume at its high | 0% | 40% | 29% | 11 |
| 1 candle before the high has medium selling at its low | 55% | 16% | 42% | 11 |
| 2 candles before the high shows STACKED SELL imbalances (≥ 3 levels, 3:1) | 100% | 64% | 81% | 10 |
| 1 candle before the high shows STACKED SELL imbalances (≥ 3 levels, 3:1) | 82% | 52% | 71% | 11 |

## 1D

### Swing LOWS: DESCRIBED ONLY (5 OOS swings)

| what (footprint) | swing | failed | random | n |
|---|---|---|---|---|
| the low candle trades HIGH volume vs its last 20 candles | 60% | 0% | 25% | 5 |
| 2 candles before the low has THIN volume at its high | 20% | 75% | 58% | 5 |
| 2 candles before the low trades normal volume | 20% | 75% | 42% | 5 |
| 1 candle after the low (still holding) trades HIGH volume vs its last 20 candles | 80% | 29% | 58% | 5 |
| 3 candles after the low (still holding) has STRONG selling delta (bottom third) | 20% | 71% | 42% | 5 |
| 3 candles before the low has POSITIVE delta (more aggressive buying) | 0% | 50% | 36% | 5 |

### Swing HIGHS: DESCRIBED ONLY (6 OOS swings)

| what (footprint) | swing | failed | random | n |
|---|---|---|---|---|
| 1 candle before the high has POSITIVE delta (more aggressive buying) | 0% | 83% | 19% | 6 |
| 1 candle before the high has STRONG selling delta (bottom third) | 83% | 0% | 75% | 6 |
| 1 candle before the high has STRONG buying delta (top third) | 0% | 50% | 6% | 6 |
| 1 candle before the high has its most-traded price near the LOW | 0% | 50% | 38% | 6 |
| 1 candle before the high has its most-traded price in the middle | 100% | 50% | 44% | 6 |
| the high candle has balanced delta | 0% | 50% | 38% | 6 |
