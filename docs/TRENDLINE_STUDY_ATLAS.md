# Trendlines on 1W / 1D / 4H / 1H: are they respected? XAU, Silver, DXY, WTI

Generated from `data/master/trendlines_study.json` (2026-10-18T18:43:17.734Z). Spec `docs/TRENDLINE_STUDY_SPEC.md`; rules `src/master/trendlines.js` (proved by `smoke_trendlines`); audit `scripts/audit_trendlines.mjs`. Window: last 6 years (TRAIN 2020-10-16 → 2023-10-16, TEST = last 3 years); WTI: 2024-10-09 → (Polygon keeps ≈ 2 years; described only).

**How to read:** a touch is RESPECTED when price bounces 1 ATR before a candle closes 0.25 ATR through the line. Every real line is copied 4 times, shifted parallel by ±0.75 and ±1.5 ATR (placebo: same slope, same time, same market, not anchored to pivots). **A trendline is respected only if it beats its own placebo copies (lift).** Respect % on its own means nothing: about half of all touches of ANY line bounce first.

## 1. The answer, per asset and timeframe (all lines)

| Asset | TF | Lines (born) | Real touches | Real respected | Placebo respected | **Lift** (95 % interval) | TRAIN lift | Last 3 years lift |
|---|---|---|---|---|---|---|---|---|
| XAU | 1W | 212 (210) | 92 | 45 % | 46 % | **-1.9 pp** (-14.8 pp … +10.3 pp) | +7.8 pp | -7.5 pp |
| XAU | 1D | 1044 (1026) | 410 | 44 % | 45 % | **-0.8 pp** (-6.6 pp … +5.8 pp) | +0.0 pp | -1.6 pp |
| XAU | 4H | 6939 (6766) | 2518 | 46 % | 45 % | **+1.1 pp** (-1.4 pp … +3.5 pp) | +1.4 pp | +0.9 pp |
| XAU | 1H | 26134 (25346) | 8983 | 47 % | 47 % | **+0.1 pp** (-1.3 pp … +1.4 pp) | +0.7 pp | -0.5 pp |
| Silver | 1W | 226 (224) | 95 | 53 % | 53 % | **+0.0 pp** (-16.1 pp … +16.3 pp) | -29.1 pp | +17.0 pp |
| Silver | 1D | 1034 (1011) | 422 | 39 % | 42 % | **-2.6 pp** (-8.1 pp … +3.1 pp) | -12.7 pp | +2.9 pp |
| Silver | 4H | 6851 (6683) | 2545 | 48 % | 49 % | **-1.0 pp** (-3.7 pp … +1.5 pp) | -0.8 pp | -1.1 pp |
| Silver | 1H | 27153 (26271) | 9749 | 49 % | 49 % | **+0.2 pp** (-1.1 pp … +1.5 pp) | +0.6 pp | -0.2 pp |
| DXY | 1W | 195 (194) | 56 | 55 % | 56 % | **-0.5 pp** (-14.9 pp … +14.5 pp) | +4.2 pp | -3.6 pp |
| DXY | 1D | 1001 (984) | 277 | 44 % | 44 % | **+0.4 pp** (-7.8 pp … +7.7 pp) | +0.6 pp | +0.3 pp |
| DXY | 4H | 6847 (6648) | 2308 | 45 % | 44 % | **+0.7 pp** (-1.9 pp … +3.4 pp) | -1.7 pp | +2.8 pp |
| DXY | 1H | 25793 (24809) | 8742 | 45 % | 45 % | **+0.3 pp** (-1.1 pp … +1.6 pp) | -0.4 pp | +0.8 pp |
| WTI | 1W | 24 (24) | 4 | 25 % | 26 % | **-1.3 pp** (-60.0 pp … +70.0 pp) | n/a | n/a |
| WTI | 1D | 169 (162) | 103 | 41 % | 40 % | **+0.4 pp** (-12.7 pp … +12.2 pp) | n/a | n/a |
| WTI | 4H | 1080 (1060) | 882 | 49 % | 47 % | **+1.8 pp** (-3.5 pp … +6.4 pp) | n/a | n/a |
| WTI | 1H | 4006 (3900) | 3234 | 47 % | 48 % | **-0.6 pp** (-2.9 pp … +1.7 pp) | n/a | n/a |

- **Kinds of line tested** (asset × TF × major/minor × support/resistance × trend/counter × 1st/2nd+ test × steepness, n ≥ 30): 264. **Significantly respected MORE than placebo after Holm: 0.** Significantly LESS: 1.
- **Walk-forward (lift > 0 in TRAIN and in the last 3 years, last-3-years lower bound > 0): 5 kinds.** The same test reversed (WORSE than placebo in both halves, upper bound < 0) passes 6: that is the measured chance level, so the passes are at the level of chance.

## 2. Which trendline is respected most (top 15 kinds by lift lower bound, n ≥ 30)

| Asset | TF | Kind of line | Real touches | Real | Placebo | Lift (95 %) | p (Holm) | TRAIN / last 3y lift |
|---|---|---|---|---|---|---|---|---|
| XAU | 1H | minor|support|trend|2nd+ test|steep | 119 | 52 % | 34 % | +18.1 pp (+6.2 pp … +28.0 pp) | 0.526 | +22.4 pp / +16.2 pp |
| DXY | 4H | minor|resistance|trend|1st test|medium | 107 | 54 % | 40 % | +13.8 pp (+1.9 pp … +25.0 pp) | 1.000 | +7.3 pp / +23.2 pp |
| DXY | 1H | minor|support|trend|1st test|shallow | 517 | 49 % | 42 % | +6.3 pp (+1.9 pp … +11.0 pp) | 1.000 | +3.7 pp / +8.6 pp |
| XAU | 4H | minor|support|trend|2nd+ test|shallow | 61 | 59 % | 44 % | +14.7 pp (+0.7 pp … +28.9 pp) | 1.000 | +20.1 pp / -2.4 pp |
| XAU | 1H | minor|resistance|trend|1st test|steep | 230 | 38 % | 31 % | +7.2 pp (+0.3 pp … +15.0 pp) | 1.000 | +14.2 pp / +0.2 pp |
| XAU | 4H | minor|support|counter|1st test|steep | 43 | 72 % | 56 % | +16.5 pp (-0.1 pp … +32.6 pp) | 1.000 | +36.5 pp / -18.4 pp |
| Silver | 1H | minor|support|counter|1st test|steep | 222 | 67 % | 59 % | +7.3 pp (-0.2 pp … +14.2 pp) | 1.000 | +13.1 pp / +2.5 pp |
| Silver | 1H | major|support|trend|2nd+ test|shallow | 262 | 61 % | 55 % | +5.8 pp (-0.2 pp … +11.5 pp) | 1.000 | +6.6 pp / +5.2 pp |
| DXY | 1H | minor|support|trend|1st test|medium | 482 | 47 % | 43 % | +4.4 pp (-0.3 pp … +9.2 pp) | 1.000 | +3.0 pp / +5.6 pp |
| Silver | 1H | major|support|trend|1st test|steep | 140 | 51 % | 42 % | +8.8 pp (-0.3 pp … +17.3 pp) | 1.000 | +4.5 pp / +11.3 pp |
| WTI | 4H | minor|resistance|counter|1st test|steep | 37 | 65 % | 45 % | +20.3 pp (-0.3 pp … +32.3 pp) | 1.000 | n/a / n/a |
| XAU | 1H | minor|resistance|counter|2nd+ test|medium | 98 | 52 % | 41 % | +10.7 pp (-0.4 pp … +20.8 pp) | 1.000 | +0.4 pp / +16.1 pp |
| WTI | 1H | minor|resistance|counter|2nd+ test|shallow | 78 | 51 % | 42 % | +9.7 pp (-1.1 pp … +20.2 pp) | 1.000 | n/a / n/a |
| Silver | 1H | minor|support|trend|2nd+ test|shallow | 362 | 59 % | 54 % | +5.2 pp (-1.3 pp … +10.7 pp) | 1.000 | +3.8 pp / +6.3 pp |
| XAU | 1H | minor|resistance|trend|1st test|shallow | 489 | 43 % | 40 % | +3.7 pp (-1.4 pp … +8.7 pp) | 1.000 | +3.6 pp / +4.0 pp |

## 3. By kind of line (all touches pooled over 6 years; lift vs placebo)

### 1W

| Kind | XAU | Silver | DXY | WTI |
|---|---|---|---|---|
| major support (trend line) | 63 % vs 57 % = +5.7 pp <sub>n 8</sub> | 56 % vs 74 % = -18.4 pp <sub>n 9</sub> | 33 % vs 54 % = -20.8 pp <sub>n 6</sub> | — |
| major support (counter line) | 100 % vs 50 % = +50.0 pp <sub>n 1</sub> | — | 100 % vs 83 % = +16.7 pp <sub>n 4</sub> | — |
| major resistance (trend line) | 63 % vs 41 % = +21.6 pp <sub>n 8</sub> | 50 % vs 43 % = +7.1 pp <sub>n 10</sub> | 33 % vs 33 % = +0.0 pp <sub>n 3</sub> | 50 % vs 0 % = +50.0 pp <sub>n 2</sub> |
| major resistance (counter line) | 38 % vs 40 % = -2.5 pp <sub>n 16</sub> | 74 % vs 55 % = +18.5 pp <sub>n 23</sub> | 100 % vs 44 % = +55.6 pp <sub>n 2</sub> | — |
| minor support (trend line) | 42 % vs 56 % = -14.3 pp <sub>n 12</sub> | 27 % vs 61 % = -33.6 pp <sub>n 11</sub> | 54 % vs 65 % = -11.3 pp <sub>n 13</sub> | — |
| minor support (counter line) | 100 % vs 67 % = +33.3 pp <sub>n 2</sub> | 25 % vs 68 % = -43.2 pp <sub>n 4</sub> | 60 % vs 65 % = -4.7 pp <sub>n 10</sub> | — |
| minor resistance (trend line) | 43 % vs 27 % = +16.2 pp <sub>n 7</sub> | 41 % vs 45 % = -4.0 pp <sub>n 17</sub> | 29 % vs 36 % = -7.4 pp <sub>n 7</sub> | 0 % vs 0 % = +0.0 pp <sub>n 1</sub> |
| minor resistance (counter line) | 37 % vs 47 % = -10.0 pp <sub>n 38</sub> | 57 % vs 45 % = +12.5 pp <sub>n 21</sub> | 64 % vs 58 % = +6.1 pp <sub>n 11</sub> | 0 % vs 50 % = -50.0 pp <sub>n 1</sub> |
| *1st test (3rd point)* | 44 % vs 50 % = -6.6 pp <sub>n 73</sub> | 50 % vs 51 % = -0.7 pp <sub>n 70</sub> | 57 % vs 61 % = -3.1 pp <sub>n 47</sub> | 25 % vs 26 % = -1.3 pp <sub>n 4</sub> |
| *2nd+ test* | 47 % vs 36 % = +11.8 pp <sub>n 19</sub> | 60 % vs 57 % = +3.0 pp <sub>n 25</sub> | 44 % vs 43 % = +1.3 pp <sub>n 9</sub> | — |
| *shallow* | 68 % vs 43 % = +25.3 pp <sub>n 19</sub> | 54 % vs 50 % = +4.3 pp <sub>n 35</sub> | 64 % vs 62 % = +1.3 pp <sub>n 22</sub> | 33 % vs 0 % = +33.3 pp <sub>n 3</sub> |
| *steep* | 35 % vs 41 % = -5.8 pp <sub>n 40</sub> | 45 % vs 48 % = -2.3 pp <sub>n 22</sub> | 57 % vs 38 % = +18.9 pp <sub>n 14</sub> | — |

### 1D

| Kind | XAU | Silver | DXY | WTI |
|---|---|---|---|---|
| major support (trend line) | 43 % vs 52 % = -8.7 pp <sub>n 53</sub> | 43 % vs 48 % = -4.8 pp <sub>n 56</sub> | 40 % vs 60 % = -19.8 pp <sub>n 25</sub> | 57 % vs 75 % = -17.9 pp <sub>n 7</sub> |
| major support (counter line) | 56 % vs 71 % = -15.3 pp <sub>n 9</sub> | 56 % vs 65 % = -9.2 pp <sub>n 9</sub> | 25 % vs 36 % = -11.1 pp <sub>n 12</sub> | 0 % vs 43 % = -42.9 pp <sub>n 2</sub> |
| major resistance (trend line) | 44 % vs 34 % = +10.5 pp <sub>n 36</sub> | 31 % vs 36 % = -5.0 pp <sub>n 29</sub> | 42 % vs 43 % = -1.8 pp <sub>n 24</sub> | 57 % vs 37 % = +20.2 pp <sub>n 14</sub> |
| major resistance (counter line) | 37 % vs 45 % = -8.8 pp <sub>n 52</sub> | 48 % vs 39 % = +9.1 pp <sub>n 46</sub> | 58 % vs 51 % = +7.1 pp <sub>n 26</sub> | 100 % vs 83 % = +16.7 pp <sub>n 4</sub> |
| minor support (trend line) | 46 % vs 44 % = +2.5 pp <sub>n 93</sub> | 47 % vs 40 % = +6.2 pp <sub>n 86</sub> | 38 % vs 39 % = -0.3 pp <sub>n 60</sub> | 35 % vs 35 % = -0.5 pp <sub>n 26</sub> |
| minor support (counter line) | 56 % vs 66 % = -10.5 pp <sub>n 18</sub> | 25 % vs 57 % = -32.1 pp <sub>n 20</sub> | 45 % vs 46 % = -0.7 pp <sub>n 29</sub> | 33 % vs 40 % = -6.7 pp <sub>n 9</sub> |
| minor resistance (trend line) | 38 % vs 32 % = +5.5 pp <sub>n 48</sub> | 28 % vs 34 % = -6.2 pp <sub>n 65</sub> | 47 % vs 34 % = +13.5 pp <sub>n 59</sub> | 35 % vs 38 % = -2.6 pp <sub>n 31</sub> |
| minor resistance (counter line) | 48 % vs 48 % = -0.3 pp <sub>n 101</sub> | 38 % vs 43 % = -5.1 pp <sub>n 111</sub> | 48 % vs 52 % = -4.3 pp <sub>n 42</sub> | 30 % vs 36 % = -6.4 pp <sub>n 10</sub> |
| *1st test (3rd point)* | 45 % vs 45 % = +0.2 pp <sub>n 297</sub> | 39 % vs 42 % = -2.7 pp <sub>n 335</sub> | 45 % vs 42 % = +2.1 pp <sub>n 220</sub> | 38 % vs 40 % = -2.3 pp <sub>n 84</sub> |
| *2nd+ test* | 43 % vs 47 % = -3.3 pp <sub>n 113</sub> | 39 % vs 42 % = -2.4 pp <sub>n 87</sub> | 42 % vs 48 % = -5.7 pp <sub>n 57</sub> | 53 % vs 40 % = +12.2 pp <sub>n 19</sub> |
| *shallow* | 43 % vs 50 % = -7.1 pp <sub>n 136</sub> | 35 % vs 47 % = -11.8 pp <sub>n 164</sub> | 43 % vs 43 % = -0.1 pp <sub>n 113</sub> | 38 % vs 39 % = -0.9 pp <sub>n 47</sub> |
| *steep* | 34 % vs 41 % = -6.7 pp <sub>n 97</sub> | 47 % vs 35 % = +11.7 pp <sub>n 121</sub> | 47 % vs 39 % = +7.6 pp <sub>n 81</sub> | 41 % vs 43 % = -2.5 pp <sub>n 22</sub> |

### 4H

| Kind | XAU | Silver | DXY | WTI |
|---|---|---|---|---|
| major support (trend line) | 47 % vs 46 % = +0.6 pp <sub>n 306</sub> | 49 % vs 48 % = +1.1 pp <sub>n 292</sub> | 44 % vs 44 % = -0.1 pp <sub>n 247</sub> | 54 % vs 48 % = +6.6 pp <sub>n 90</sub> |
| major support (counter line) | 52 % vs 54 % = -1.9 pp <sub>n 115</sub> | 42 % vs 52 % = -9.9 pp <sub>n 84</sub> | 47 % vs 42 % = +5.4 pp <sub>n 150</sub> | 57 % vs 54 % = +3.5 pp <sub>n 56</sub> |
| major resistance (trend line) | 47 % vs 40 % = +6.6 pp <sub>n 215</sub> | 44 % vs 45 % = -1.6 pp <sub>n 187</sub> | 44 % vs 43 % = +0.9 pp <sub>n 235</sub> | 46 % vs 50 % = -4.2 pp <sub>n 104</sub> |
| major resistance (counter line) | 36 % vs 41 % = -5.2 pp <sub>n 239</sub> | 49 % vs 49 % = -0.5 pp <sub>n 257</sub> | 46 % vs 51 % = -5.1 pp <sub>n 171</sub> | 55 % vs 43 % = +11.7 pp <sub>n 78</sub> |
| minor support (trend line) | 45 % vs 45 % = +0.3 pp <sub>n 503</sub> | 46 % vs 50 % = -4.0 pp <sub>n 555</sub> | 42 % vs 41 % = +0.3 pp <sub>n 470</sub> | 33 % vs 40 % = -7.0 pp <sub>n 163</sub> |
| minor support (counter line) | 58 % vs 56 % = +1.6 pp <sub>n 279</sub> | 57 % vs 56 % = +1.7 pp <sub>n 269</sub> | 52 % vs 47 % = +5.0 pp <sub>n 296</sub> | 55 % vs 59 % = -3.6 pp <sub>n 98</sub> |
| minor resistance (trend line) | 46 % vs 40 % = +5.7 pp <sub>n 372</sub> | 42 % vs 40 % = +2.5 pp <sub>n 315</sub> | 43 % vs 40 % = +3.8 pp <sub>n 419</sub> | 41 % vs 41 % = +0.8 pp <sub>n 116</sub> |
| minor resistance (counter line) | 41 % vs 42 % = -1.2 pp <sub>n 489</sub> | 49 % vs 51 % = -1.6 pp <sub>n 586</sub> | 45 % vs 51 % = -6.0 pp <sub>n 320</sub> | 58 % vs 50 % = +8.7 pp <sub>n 177</sub> |
| *1st test (3rd point)* | 45 % vs 45 % = +0.1 pp <sub>n 1847</sub> | 47 % vs 49 % = -1.2 pp <sub>n 1794</sub> | 45 % vs 45 % = +0.0 pp <sub>n 1739</sub> | 49 % vs 46 % = +2.8 pp <sub>n 658</sub> |
| *2nd+ test* | 48 % vs 44 % = +3.8 pp <sub>n 671</sub> | 48 % vs 49 % = -0.4 pp <sub>n 751</sub> | 46 % vs 43 % = +2.9 pp <sub>n 569</sub> | 49 % vs 50 % = -1.1 pp <sub>n 224</sub> |
| *shallow* | 46 % vs 45 % = +0.7 pp <sub>n 1129</sub> | 47 % vs 48 % = -0.6 pp <sub>n 1121</sub> | 43 % vs 44 % = -1.0 pp <sub>n 1118</sub> | 52 % vs 51 % = +0.5 pp <sub>n 370</sub> |
| *steep* | 47 % vs 45 % = +2.2 pp <sub>n 552</sub> | 48 % vs 50 % = -1.8 pp <sub>n 537</sub> | 49 % vs 45 % = +4.1 pp <sub>n 427</sub> | 47 % vs 41 % = +6.7 pp <sub>n 184</sub> |

### 1H

| Kind | XAU | Silver | DXY | WTI |
|---|---|---|---|---|
| major support (trend line) | 50 % vs 51 % = -0.2 pp <sub>n 1046</sub> | 52 % vs 51 % = +0.8 pp <sub>n 1208</sub> | 42 % vs 43 % = -1.1 pp <sub>n 1076</sub> | 45 % vs 47 % = -1.6 pp <sub>n 371</sub> |
| major support (counter line) | 55 % vs 54 % = +0.8 pp <sub>n 464</sub> | 52 % vs 53 % = -1.3 pp <sub>n 513</sub> | 46 % vs 48 % = -1.5 pp <sub>n 499</sub> | 59 % vs 57 % = +1.8 pp <sub>n 161</sub> |
| major resistance (trend line) | 44 % vs 43 % = +0.8 pp <sub>n 861</sub> | 42 % vs 43 % = -1.0 pp <sub>n 843</sub> | 43 % vs 41 % = +1.8 pp <sub>n 950</sub> | 45 % vs 44 % = +1.2 pp <sub>n 313</sub> |
| major resistance (counter line) | 40 % vs 43 % = -3.0 pp <sub>n 651</sub> | 47 % vs 48 % = -0.7 pp <sub>n 834</sub> | 50 % vs 49 % = +0.7 pp <sub>n 618</sub> | 48 % vs 48 % = +0.2 pp <sub>n 273</sub> |
| minor support (trend line) | 47 % vs 48 % = -0.5 pp <sub>n 2013</sub> | 50 % vs 49 % = +0.7 pp <sub>n 2062</sub> | 44 % vs 42 % = +1.9 pp <sub>n 1813</sub> | 44 % vs 43 % = +0.7 pp <sub>n 659</sub> |
| minor support (counter line) | 53 % vs 55 % = -1.8 pp <sub>n 1131</sub> | 58 % vs 57 % = +1.6 pp <sub>n 1257</sub> | 50 % vs 50 % = +0.3 pp <sub>n 1035</sub> | 52 % vs 57 % = -4.7 pp <sub>n 364</sub> |
| minor resistance (trend line) | 43 % vs 39 % = +3.7 pp <sub>n 1491</sub> | 40 % vs 42 % = -1.9 pp <sub>n 1423</sub> | 40 % vs 40 % = -0.5 pp <sub>n 1499</sub> | 41 % vs 45 % = -3.8 pp <sub>n 497</sub> |
| minor resistance (counter line) | 45 % vs 46 % = -1.1 pp <sub>n 1326</sub> | 49 % vs 48 % = +0.4 pp <sub>n 1609</sub> | 50 % vs 53 % = -2.3 pp <sub>n 1252</sub> | 50 % vs 49 % = +1.0 pp <sub>n 596</sub> |
| *1st test (3rd point)* | 46 % vs 46 % = -0.1 pp <sub>n 6630</sub> | 48 % vs 48 % = +0.0 pp <sub>n 6960</sub> | 45 % vs 44 % = +0.6 pp <sub>n 6528</sub> | 46 % vs 47 % = -0.9 pp <sub>n 2382</sub> |
| *2nd+ test* | 48 % vs 48 % = +0.5 pp <sub>n 2353</sub> | 51 % vs 51 % = +0.5 pp <sub>n 2789</sub> | 45 % vs 46 % = -0.9 pp <sub>n 2214</sub> | 49 % vs 49 % = +0.0 pp <sub>n 852</sub> |
| *shallow* | 47 % vs 48 % = -1.1 pp <sub>n 4342</sub> | 50 % vs 49 % = +1.0 pp <sub>n 4675</sub> | 46 % vs 46 % = -0.1 pp <sub>n 4257</sub> | 49 % vs 52 % = -2.9 pp <sub>n 1441</sub> |
| *steep* | 45 % vs 42 % = +3.3 pp <sub>n 1550</sub> | 47 % vs 45 % = +2.5 pp <sub>n 1759</sub> | 41 % vs 41 % = +0.0 pp <sub>n 1446</sub> | 42 % vs 41 % = +1.1 pp <sub>n 612</sub> |

## 4. The last 3 years: does it match the ongoing price action? (lift per year, all lines)

| Asset | TF | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|
| XAU | 1W | — | +8.7 pp <sub>14</sub> | +6.5 pp <sub>18</sub> | — | -35.2 pp <sub>12</sub> | +9.6 pp <sub>31</sub> | -20.0 pp <sub>10</sub> |
| XAU | 1D | — | +2.2 pp <sub>49</sub> | -7.6 pp <sub>83</sub> | +10.7 pp <sub>59</sub> | +2.2 pp <sub>57</sub> | -8.2 pp <sub>83</sub> | +4.8 pp <sub>71</sub> |
| XAU | 4H | -4.7 pp <sub>35</sub> | +3.5 pp <sub>446</sub> | -2.7 pp <sub>372</sub> | +1.0 pp <sub>394</sub> | +3.4 pp <sub>361</sub> | +0.5 pp <sub>464</sub> | +1.3 pp <sub>446</sub> |
| XAU | 1H | -5.0 pp <sub>182</sub> | +0.8 pp <sub>1503</sub> | -0.8 pp <sub>1401</sub> | +2.3 pp <sub>1525</sub> | -3.9 pp <sub>1425</sub> | -0.2 pp <sub>1597</sub> | +2.8 pp <sub>1350</sub> |
| Silver | 1W | — | — | -9.9 pp <sub>16</sub> | -32.9 pp <sub>16</sub> | +34.7 pp <sub>25</sub> | +0.4 pp <sub>30</sub> | — |
| Silver | 1D | — | -13.0 pp <sub>63</sub> | -21.0 pp <sub>47</sub> | +8.5 pp <sub>50</sub> | -2.3 pp <sub>77</sub> | +3.7 pp <sub>104</sub> | +3.9 pp <sub>81</sub> |
| Silver | 4H | — | -0.2 pp <sub>383</sub> | +0.5 pp <sub>386</sub> | -3.6 pp <sub>334</sub> | +4.6 pp <sub>347</sub> | -2.0 pp <sub>555</sub> | -3.8 pp <sub>540</sub> |
| Silver | 1H | — | -0.7 pp <sub>1608</sub> | +1.5 pp <sub>1497</sub> | +1.7 pp <sub>1466</sub> | -1.7 pp <sub>1622</sub> | -0.3 pp <sub>1790</sub> | +0.6 pp <sub>1766</sub> |
| DXY | 1W | — | +4.4 pp <sub>10</sub> | — | — | +2.4 pp <sub>13</sub> | +1.3 pp <sub>11</sub> | — |
| DXY | 1D | — | +12.6 pp <sub>47</sub> | -2.6 pp <sub>57</sub> | -7.2 pp <sub>44</sub> | +2.8 pp <sub>39</sub> | +0.7 pp <sub>54</sub> | +0.9 pp <sub>36</sub> |
| DXY | 4H | — | -1.7 pp <sub>366</sub> | -0.1 pp <sub>377</sub> | +0.2 pp <sub>395</sub> | +0.7 pp <sub>431</sub> | +3.3 pp <sub>391</sub> | +2.2 pp <sub>348</sub> |
| DXY | 1H | — | -0.2 pp <sub>1177</sub> | -1.0 pp <sub>1622</sub> | +0.9 pp <sub>1492</sub> | +0.6 pp <sub>1661</sub> | +1.1 pp <sub>1650</sub> | -0.2 pp <sub>1140</sub> |
| WTI | 1W | — | — | — | — | — | — | — |
| WTI | 1D | — | — | — | — | — | -4.1 pp <sub>50</sub> | +4.9 pp <sub>53</sub> |
| WTI | 4H | — | — | — | — | -8.7 pp <sub>47</sub> | +1.9 pp <sub>443</sub> | +3.1 pp <sub>392</sub> |
| WTI | 1H | — | — | — | — | +6.9 pp <sub>283</sub> | -1.8 pp <sub>1522</sub> | -0.8 pp <sub>1429</sub> |

Kinds that hold in BOTH halves (5, vs 6 that are WORSE than placebo in both halves = chance level; none survives the Holm correction over 264 kinds): XAU 1H minor|support|trend|2nd+ test|steep (TRAIN +22.4 pp, last 3y +16.2 pp, n 119); XAU 1H minor|resistance|counter|2nd+ test|medium (TRAIN +0.4 pp, last 3y +16.1 pp, n 98); Silver 1H major|support|trend|1st test|steep (TRAIN +4.5 pp, last 3y +11.3 pp, n 140); DXY 4H minor|resistance|trend|1st test|medium (TRAIN +7.3 pp, last 3y +23.2 pp, n 107); DXY 1H minor|support|trend|1st test|shallow (TRAIN +3.7 pp, last 3y +8.6 pp, n 517).

## 5. Do the assets act the same? (real respect rate, common window from 2024-10-09, Holm)

| TF | Kind | A: real (placebo) | B: real (placebo) | Difference |
|---|---|---|---|---|
| 4H | minor resistance (counter) | XAU 37 % (35 %) n 249 | WTI 58 % (50 %) n 177 | -21.2 pp |
| 1H | major support (trend) | Silver 56 % (55 %) n 524 | DXY 40 % (42 %) n 417 | +15.9 pp |
| 1H | minor support (trend) | Silver 52 % (51 %) n 809 | DXY 43 % (41 %) n 712 | +8.9 pp |

The placebo rates in brackets move with the real ones: where assets differ, it is how each asset bounces off ANY line, not a trendline effect.

## 6. Audit (the measuring itself)

| Asset | TF | Independent second implementation: evaluations · differences | Positive control (cheating lines at the real next swing low): respected vs placebo |
|---|---|---|---|
| XAU | 4H | 3000 · **0** | 100 % (n 409) vs 50 % (n 1343) |
| XAU | 1D | 3000 · **0** | 100 % (n 64) vs 50 % (n 177) |
| Silver | 4H | 3000 · **0** | 100 % (n 393) vs 52 % (n 1335) |
| Silver | 1D | 3000 · **0** | 100 % (n 66) vs 47 % (n 193) |
| DXY | 4H | 3000 · **0** | 99 % (n 462) vs 44 % (n 1573) |
| DXY | 1D | 3000 · **0** | 100 % (n 62) vs 48 % (n 177) |
| WTI | 4H | 3000 · **0** | 98 % (n 66) vs 45 % (n 207) |
| WTI | 1D | 3000 · **0** | 100 % (n 9) vs 57 % (n 21) |

The positive control shows the method DOES detect respect when a line sits at a real turning point. So a zero lift on real trendlines is a measured result, not a blind test.

## Honest limits

- One fixed, pre-registered drawing rule (two confirmed pivots, no close through between them, born at confirmation). Lines drawn by eye in hindsight look better because they are chosen after the fact; that is exactly what this test removes.
- 1W has about 310 candles in 6 years (few touches); WTI has 2 years only.
- No trade rule is proposed.
