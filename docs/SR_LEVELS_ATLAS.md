# S/R levels on 1H / 4H / 1D / 1W / 1M: which are really strong? XAU, Silver, DXY, WTI

Generated from `data/master/sr_levels_study.json` (2026-10-18T20:22:09.649Z). Spec `docs/SR_LEVELS_SPEC.md`; rules `src/master/srLevels.js` (proved by `smoke_sr_levels`); audit `scripts/audit_sr_levels.mjs`. Window: last 6 years (TRAIN → 2023-10-16, TEST = last 3 years); WTI 2024-10-09 → (≈ 2 years, Polygon, DELAYED feed, described only).

**How to read:** a level = a confirmed swing of its timeframe. A touch HELD when price bounced 1 ATR before a candle closed 0.5 ATR through. Every real level is copied 4× shifted ±0.75 / ±1.5 ATR (placebo). **A class of level is STRONG only if it beats its placebo copies after the Holm correction AND in both the first 3 and the last 3 years.**

## 1. The answer

- Classes tested (n ≥ 30): **176**. Beat placebo after Holm: **0** (worse: 2).
- Walk-forward passes: 1; the reversed test passes 7 (chance level) → at the level of chance.
- **STRONG (all conditions): NONE — no class of S/R level holds better than a shifted copy of itself.**

## 2. Per asset and timeframe (all levels)

| Asset | TF | Levels alive | Real touches | Real held | Placebo held | Lift (95 %) | TRAIN | Last 3 y |
|---|---|---|---|---|---|---|---|---|
| XAU | 1H | 1903 | 4178 | 55 % | 55 % | -0.1 pp (-1.7 pp … +1.4 pp) | +1.3 pp | -1.8 pp |
| XAU | 4H | 531 | 1039 | 55 % | 56 % | -0.6 pp (-3.5 pp … +2.2 pp) | +1.1 pp | -3.2 pp |
| XAU | 1D | 103 | 136 | 60 % | 59 % | +0.3 pp (-8.1 pp … +8.9 pp) | +0.2 pp | +0.3 pp |
| XAU | 1W | 32 | 23 | 78 % | 62 % | +15.9 pp (-6.4 pp … +36.2 pp) *described only* | n/a | n/a |
| XAU | 1M | 9 | 3 | 67 % | 50 % | +16.7 pp (-55.6 pp … +80.0 pp) *described only* | n/a | n/a |
| Silver | 1H | 1872 | 4396 | 55 % | 58 % | -2.4 pp (-3.8 pp … -1.0 pp) | -2.7 pp | -2.1 pp |
| Silver | 4H | 457 | 1019 | 56 % | 56 % | +0.4 pp (-2.7 pp … +3.1 pp) | +0.8 pp | -0.3 pp |
| Silver | 1D | 94 | 157 | 54 % | 61 % | -7.3 pp (-15.1 pp … +0.1 pp) | -13.2 pp | -1.8 pp |
| Silver | 1W | 28 | 45 | 71 % | 70 % | +0.9 pp (-17.2 pp … +20.8 pp) | +1.7 pp | +0.2 pp |
| Silver | 1M | 10 | 4 | 75 % | 69 % | +5.8 pp (-47.7 pp … +46.7 pp) *described only* | n/a | n/a |
| DXY | 1H | 2045 | 4701 | 53 % | 54 % | -1.3 pp (-2.8 pp … +0.3 pp) | -1.2 pp | -1.3 pp |
| DXY | 4H | 541 | 1196 | 55 % | 55 % | +0.3 pp (-2.9 pp … +3.6 pp) | -0.1 pp | +0.5 pp |
| DXY | 1D | 78 | 109 | 57 % | 55 % | +1.5 pp (-8.6 pp … +11.0 pp) | +1.4 pp | +1.6 pp |
| DXY | 1W | 19 | 26 | 69 % | 56 % | +13.1 pp (-9.2 pp … +36.7 pp) *described only* | n/a | n/a |
| DXY | 1M | 8 | 5 | 20 % | 50 % | -30.0 pp (-66.7 pp … +0.0 pp) *described only* | n/a | n/a |
| WTI | 1H | 635 | 1542 | 57 % | 59 % | -2.3 pp (-4.8 pp … +0.2 pp) | n/a | n/a |
| WTI | 4H | 166 | 408 | 66 % | 62 % | +4.0 pp (-1.2 pp … +8.8 pp) | n/a | n/a |
| WTI | 1D | 26 | 39 | 54 % | 57 % | -3.0 pp (-19.7 pp … +11.5 pp) | n/a | n/a |
| WTI | 1W | 8 | 10 | 50 % | 52 % | -1.7 pp (-41.6 pp … +29.9 pp) *described only* | n/a | n/a |
| WTI | 1M | 2 | 0 | — | 100 % | — (— … —) *described only* | n/a | n/a |

## 3. Strength classes (top 20 by lift lower bound, n ≥ 30)

| Asset | Scope | Class | Real touches | Real | Placebo | Lift (95 %) | p (Holm) | TRAIN / last 3 y |
|---|---|---|---|---|---|---|---|---|
| Silver | 4H | confluence 0 | 35 | 71 % | 51 % | +20.3 pp (+6.9 pp … +35.9 pp) | 1.000 | +15.5 pp / +25.2 pp |
| DXY | score | S = 8 | 56 | 68 % | 52 % | +15.6 pp (+2.8 pp … +29.5 pp) | 1.000 | -7.1 pp / +23.2 pp |
| DXY | 4H | held before 3+ | 73 | 63 % | 48 % | +15.0 pp (+2.8 pp … +26.6 pp) | 1.000 | -27.4 pp / +23.7 pp |
| Silver | 4H | held before 2 | 102 | 59 % | 47 % | +12.3 pp (+1.9 pp … +23.0 pp) | 1.000 | +13.3 pp / +10.9 pp |
| WTI | 4H | held before 1 | 102 | 69 % | 57 % | +11.5 pp (+1.2 pp … +21.5 pp) | 1.000 | n/a / n/a |
| WTI | 4H | reaction low | 155 | 68 % | 61 % | +7.5 pp (+0.1 pp … +13.9 pp) | 1.000 | n/a / n/a |
| WTI | 4H | first-phase level | 241 | 64 % | 59 % | +5.1 pp (-0.4 pp … +10.9 pp) | 1.000 | n/a / n/a |
| DXY | 1H | held before 3+ | 257 | 60 % | 53 % | +6.9 pp (-0.5 pp … +13.5 pp) | 1.000 | -0.0 pp / +10.2 pp |
| XAU | 1H | reaction low | 1426 | 57 % | 55 % | +2.0 pp (-1.0 pp … +4.6 pp) | 1.000 | +4.0 pp / -0.7 pp |
| XAU | 1H | flipped level | 1705 | 58 % | 57 % | +1.2 pp (-1.1 pp … +3.5 pp) | 1.000 | +1.0 pp / +1.4 pp |
| WTI | 4H | all levels | 408 | 66 % | 62 % | +4.0 pp (-1.2 pp … +8.8 pp) | 1.000 | n/a / n/a |
| WTI | 4H | reaction high | 141 | 66 % | 60 % | +5.9 pp (-1.3 pp … +13.0 pp) | 1.000 | n/a / n/a |
| WTI | score | S = 3 | 486 | 63 % | 60 % | +3.5 pp (-1.4 pp … +8.2 pp) | 1.000 | n/a / n/a |
| XAU | score | S = 6 | 163 | 64 % | 58 % | +6.1 pp (-1.4 pp … +14.4 pp) | 1.000 | +5.7 pp / +6.9 pp |
| XAU | 1H | reaction mid | 1404 | 56 % | 54 % | +1.1 pp (-1.6 pp … +4.0 pp) | 1.000 | -0.1 pp / +2.3 pp |
| XAU | 1H | confluence 0 | 1758 | 57 % | 57 % | +0.7 pp (-1.7 pp … +3.1 pp) | 1.000 | +2.3 pp / -0.8 pp |
| XAU | 1H | all levels | 4178 | 55 % | 55 % | -0.1 pp (-1.7 pp … +1.4 pp) | 1.000 | +1.3 pp / -1.8 pp |
| XAU | 1H | held before 0 | 2623 | 55 % | 55 % | +0.1 pp (-1.8 pp … +2.1 pp) | 1.000 | +2.7 pp / -2.6 pp |
| WTI | 4H | volume low | 130 | 70 % | 64 % | +6.0 pp (-1.9 pp … +13.0 pp) | 1.000 | n/a / n/a |
| Silver | 4H | flipped level | 465 | 63 % | 60 % | +2.5 pp (-1.9 pp … +6.8 pp) | 1.000 | +3.7 pp / +0.7 pp |

## 4. The strength score S = tf rank + confluence + min(held before, 3)

| Asset | S=1 | S=2 | S=3 | S=4 | S=5 | S=6 | S=7 | S=8 | S=9 | S=10 |
|---|---|---|---|---|---|---|---|---|---|---|
| XAU | 58 % vs 57 % <sub>1207</sub> | 55 % vs 55 % <sub>1447</sub> | 53 % vs 55 % <sub>1351</sub> | 56 % vs 54 % <sub>716</sub> | 53 % vs 55 % <sub>410</sub> | 64 % vs 58 % <sub>163</sub> | 48 % vs 58 % <sub>58</sub> | 50 % vs 51 % <sub>18</sub> | 100 % vs 32 % <sub>7</sub> | 0 % vs — <sub>2</sub> |
| Silver | 56 % vs 60 % <sub>1163</sub> | 57 % vs 58 % <sub>1473</sub> | 53 % vs 56 % <sub>1371</sub> | 55 % vs 58 % <sub>801</sub> | 59 % vs 57 % <sub>465</sub> | 50 % vs 55 % <sub>201</sub> | 59 % vs 58 % <sub>93</sub> | 47 % vs 63 % <sub>38</sub> | 46 % vs 71 % <sub>13</sub> | 67 % vs 50 % <sub>3</sub> |
| DXY | 50 % vs 54 % <sub>1214</sub> | 54 % vs 55 % <sub>1697</sub> | 51 % vs 53 % <sub>1478</sub> | 55 % vs 54 % <sub>792</sub> | 53 % vs 53 % <sub>473</sub> | 61 % vs 56 % <sub>205</sub> | 68 % vs 59 % <sub>109</sub> | 68 % vs 52 % <sub>56</sub> | 36 % vs 50 % <sub>11</sub> | 50 % vs 33 % <sub>2</sub> |
| WTI | 55 % vs 58 % <sub>414</sub> | 53 % vs 58 % <sub>547</sub> | 63 % vs 60 % <sub>486</sub> | 61 % vs 62 % <sub>269</sub> | 63 % vs 62 % <sub>182</sub> | 67 % vs 68 % <sub>76</sub> | 64 % vs 48 % <sub>22</sub> | 0 % vs 38 % <sub>3</sub> | — | — |

## 5. Per year (lift, all levels)

| Asset | TF | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|
| XAU | 1H | -9.6 pp <sub>92</sub> | -0.2 pp <sub>757</sub> | +2.6 pp <sub>777</sub> | +0.9 pp <sub>815</sub> | -2.6 pp <sub>639</sub> | -0.7 pp <sub>583</sub> | -0.1 pp <sub>515</sub> |
| XAU | 4H | -2.8 pp <sub>16</sub> | +2.9 pp <sub>231</sub> | +2.0 pp <sub>218</sub> | -4.5 pp <sub>192</sub> | -4.9 pp <sub>134</sub> | -0.9 pp <sub>105</sub> | -0.8 pp <sub>143</sub> |
| XAU | 1D | — | +4.4 pp <sub>24</sub> | +3.1 pp <sub>41</sub> | -5.6 pp <sub>30</sub> | -1.7 pp <sub>11</sub> | -2.5 pp <sub>11</sub> | -6.2 pp <sub>15</sub> |
| XAU | 1W | — | — | — | — | — | — | — |
| XAU | 1M | — | — | — | — | — | — | — |
| Silver | 1H | — | -2.7 pp <sub>700</sub> | -3.0 pp <sub>772</sub> | -2.8 pp <sub>760</sub> | -0.4 pp <sub>872</sub> | -1.7 pp <sub>646</sub> | -4.2 pp <sub>646</sub> |
| Silver | 4H | — | -1.9 pp <sub>164</sub> | +1.5 pp <sub>237</sub> | +1.6 pp <sub>187</sub> | +0.5 pp <sub>191</sub> | +2.9 pp <sub>124</sub> | -3.4 pp <sub>116</sub> |
| Silver | 1D | — | -9.9 pp <sub>26</sub> | -15.8 pp <sub>32</sub> | -13.9 pp <sub>23</sub> | -5.8 pp <sub>45</sub> | -15.0 pp <sub>10</sub> | +10.8 pp <sub>21</sub> |
| Silver | 1W | — | — | +6.5 pp <sub>13</sub> | — | -5.9 pp <sub>13</sub> | — | — |
| Silver | 1M | — | — | — | — | — | — | — |
| DXY | 1H | — | -0.9 pp <sub>627</sub> | -0.7 pp <sub>814</sub> | -1.3 pp <sub>781</sub> | -0.6 pp <sub>923</sub> | -2.3 pp <sub>896</sub> | -1.6 pp <sub>660</sub> |
| DXY | 4H | — | +3.7 pp <sub>152</sub> | +0.1 pp <sub>160</sub> | -2.0 pp <sub>187</sub> | -3.9 pp <sub>274</sub> | +4.8 pp <sub>217</sub> | +0.7 pp <sub>206</sub> |
| DXY | 1D | — | -15.6 pp <sub>19</sub> | +24.9 pp <sub>21</sub> | -10.7 pp <sub>17</sub> | +15.1 pp <sub>16</sub> | +6.5 pp <sub>13</sub> | -9.7 pp <sub>23</sub> |
| DXY | 1W | — | — | — | — | — | +30.0 pp <sub>10</sub> | — |
| DXY | 1M | — | — | — | — | — | — | — |
| WTI | 1H | — | — | — | — | -4.2 pp <sub>126</sub> | -1.2 pp <sub>760</sub> | -3.3 pp <sub>656</sub> |
| WTI | 4H | — | — | — | — | +23.7 pp <sub>22</sub> | +2.3 pp <sub>223</sub> | +3.6 pp <sub>163</sub> |
| WTI | 1D | — | — | — | — | — | +2.4 pp <sub>18</sub> | -6.7 pp <sub>21</sub> |
| WTI | 1W | — | — | — | — | — | — | — |
| WTI | 1M | — | — | — | — | — | — | — |

## 6. Audit (the measuring itself)

| Asset | TF | Independent second implementation: evaluations · differences | Positive control (cheating levels at the real next swing): held vs placebo |
|---|---|---|---|
| XAU | 4H | 2500 · **0** | 100 % (n 828) vs 58 % (n 2880) |
| XAU | 1D | 2500 · **0** | 100 % (n 132) vs 60 % (n 416) |
| Silver | 4H | 2500 · **0** | 100 % (n 774) vs 59 % (n 2735) |
| Silver | 1D | 2500 · **0** | 99 % (n 134) vs 60 % (n 440) |
| DXY | 4H | 2500 · **0** | 99 % (n 904) vs 56 % (n 3216) |
| DXY | 1D | 2500 · **0** | 100 % (n 118) vs 58 % (n 380) |
| WTI | 4H | 2500 · **0** | 99 % (n 133) vs 61 % (n 439) |
| WTI | 1D | 2500 · **0** | 100 % (n 20) vs 55 % (n 55) |

## Honest limits

- 1W ≈ 310 and 1M ≈ 72 candles in 6 years: their classes are mostly "described only".
- Volume = 2 years of CME futures (none for DXY). WTI = 2 years, delayed feed.
- One fixed level rule (confirmed ZigZag swings). No trade rule is proposed.
