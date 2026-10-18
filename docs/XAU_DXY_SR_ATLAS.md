# XAU and DXY together at S/R levels, on the same timeframe

Generated from `data/master/xau_dxy_sr.json` (2026-10-18T22:08:36.832Z); spec `docs/XAU_DXY_SR_SPEC.md` (written before the numbers). Window 2020-10-16 → 2026-10-16; DXY = gold-grid candles (identical candle times).

## Part 1 — does XAU's level hold more when DXY is at the opposite level on the same candle?

| TF | DXY at the same candle | XAU real tests | XAU held | Placebo held | Lift (95 %) | p (Holm) | First 3 y | Last 3 y |
|---|---|---|---|---|---|---|---|---|
| 1H | OPPOSITE | 807 | 42 % | 43 % | -1.0 pp (-4.6 pp … +2.5 pp) | 1.000 | -1.0 pp | -0.6 pp |
| 1H | SAME SIDE | 124 | 52 % | 51 % | +1.8 pp (-7.8 pp … +12.2 pp) | 1.000 | +6.1 pp | -3.9 pp |
| 1H | NONE | 3247 | 58 % | 58 % | +0.2 pp (-1.7 pp … +2.1 pp) | 1.000 | +1.9 pp | -1.9 pp |
| 1H | *OPPOSITE vs NONE (real held)* | | -15.8 pp | | | p 0.000 (unadjusted) | | |
| 4H | OPPOSITE | 131 | 47 % | 52 % | -5.2 pp (-15.1 pp … +4.2 pp) | 1.000 | +0.0 pp | -13.5 pp |
| 4H | SAME SIDE | 31 | 71 % | 57 % | +14.2 pp (-4.7 pp … +32.4 pp) | 0.966 | +22.5 pp | +3.0 pp |
| 4H | NONE | 877 | 56 % | 56 % | -0.6 pp (-3.8 pp … +2.6 pp) | 1.000 | +0.5 pp | -2.0 pp |
| 4H | *OPPOSITE vs NONE (real held)* | | -9.0 pp | | | p 0.055 (unadjusted) | | |
| 1D | OPPOSITE | 9 | 78 % | 79 % | -1.7 pp (-34.8 pp … +26.2 pp) *few* | — | -2.4 pp | +3.0 pp |
| 1D | SAME SIDE | 5 | 60 % | 69 % | -9.2 pp (-75.0 pp … +61.5 pp) *few* | — | -6.7 pp | — |
| 1D | NONE | 122 | 58 % | 57 % | +0.8 pp (-8.6 pp … +10.7 pp) | 1.000 | +1.1 pp | +0.3 pp |
| 1D | *OPPOSITE vs NONE (real held)* | | +19.6 pp | | | p 0.248 (unadjusted) | | |
| 1W | OPPOSITE | 0 | — | 43 % | — (— … —) *few* | — | — | — |
| 1W | SAME SIDE | 0 | — | 100 % | — (— … —) *few* | — | — | — |
| 1W | NONE | 23 | 78 % | 64 % | +14.5 pp (-8.6 pp … +36.8 pp) *few* | — | +11.4 pp | +20.0 pp |
| 1W | *OPPOSITE vs NONE (real held)* | | — | | | p — (unadjusted) | | |
| 1M | OPPOSITE | 0 | — | 0 % | — (— … —) *few* | — | — | — |
| 1M | SAME SIDE | 0 | — | — | — (— … —) *few* | — | — | — |
| 1M | NONE | 3 | 67 % | 60 % | +6.7 pp (-66.7 pp … +66.7 pp) *few* | — | +33.3 pp | -50.0 pp |
| 1M | *OPPOSITE vs NONE (real held)* | | — | | | p — (unadjusted) | | |

Robustness (DXY test within ±1 candle):

| TF | OPPOSITE held vs placebo | SAME SIDE | NONE |
|---|---|---|---|
| 1H | 45 % vs 47 % <sub>1310</sub> | 62 % vs 62 % <sub>321</sub> | 59 % vs 59 % <sub>2547</sub> |
| 4H | 49 % vs 53 % <sub>266</sub> | 69 % vs 62 % <sub>65</sub> | 56 % vs 56 % <sub>708</sub> |
| 1D | 71 % vs 64 % <sub>21</sub> | 40 % vs 64 % <sub>10</sub> | 59 % vs 58 % <sub>105</sub> |
| 1W | — vs 38 % <sub>0</sub> | 100 % vs 100 % <sub>1</sub> | 77 % vs 66 % <sub>22</sub> |
| 1M | — vs 33 % <sub>0</sub> | — vs — <sub>0</sub> | 67 % vs 67 % <sub>3</sub> |

## Part 2 — the XAU 3m-confirmation entry when DXY confirms the opposite turn just before (money after spreads)

### DXY confirmation within 15 min before the XAU entry

| Split | DXY | Target | Trades | /day | WR | $ / trade (95 %) | Before costs | TRAIN | OOS | Folds + |
|---|---|---|---|---|---|---|---|---|---|---|
| all XAU entries | DXY OPPOSITE (agrees) | 1R | 1849 | 0.38 | 43 % | −$0.51 (−$0.88 … −$0.12) | WR 49 % · -0.021R | −$0.51 | −$0.51 (n 750) | 1/8 |
| all XAU entries | DXY OPPOSITE (agrees) | 2R | 1849 | 0.38 | 37 % | −$0.47 (−$0.91 … +$0.09) | WR 41 % · -0.012R | −$0.58 | −$0.30 (n 750) | 1/8 |
| all XAU entries | DXY OPPOSITE (agrees) | 1ATR | 1849 | 0.38 | 57 % | −$0.60 (−$0.85 … −$0.35) | WR 64 % · -0.013R | −$0.48 | −$0.77 (n 750) | 0/8 |
| all XAU entries | DXY OPPOSITE (agrees) | 2ATR | 1849 | 0.38 | 44 % | −$0.52 (−$0.93 … −$0.05) | WR 49 % · -0.025R | −$0.54 | −$0.49 (n 750) | 1/8 |
| all XAU entries | DXY SAME (against) | 1R | 364 | 0.08 | 48 % | −$0.40 (−$1.13 … +$0.34) | WR 54 % · +0.085R | −$0.00 | −$0.99 (n 145) | 3/8 |
| all XAU entries | DXY SAME (against) | 2R | 364 | 0.08 | 42 % | −$0.02 (−$0.87 … +$0.84) | WR 46 % · +0.122R | −$0.05 | +$0.02 (n 145) | 3/8 |
| all XAU entries | DXY SAME (against) | 1ATR | 364 | 0.08 | 61 % | −$0.10 (−$0.67 … +$0.51) | WR 67 % · +0.031R | −$0.19 | +$0.03 (n 145) | 2/8 |
| all XAU entries | DXY SAME (against) | 2ATR | 364 | 0.08 | 52 % | +$0.46 (−$0.26 … +$1.30) | WR 56 % · +0.106R | −$0.04 | +$1.22 (n 145) | 5/8 |
| all XAU entries | NO DXY confirmation | 1R | 14970 | 3.11 | 44 % | −$0.40 (−$0.52 … −$0.30) | WR 50 % · +0.008R | −$0.45 | −$0.33 (n 6046) | 0/8 |
| all XAU entries | NO DXY confirmation | 2R | 14970 | 3.11 | 36 % | −$0.36 (−$0.48 … −$0.25) | WR 41 % · +0.004R | −$0.46 | −$0.22 (n 6046) | 0/8 |
| all XAU entries | NO DXY confirmation | 1ATR | 14970 | 3.11 | 56 % | −$0.45 (−$0.54 … −$0.37) | WR 63 % · +0.004R | −$0.43 | −$0.48 (n 6046) | 0/8 |
| all XAU entries | NO DXY confirmation | 2ATR | 14970 | 3.11 | 43 % | −$0.47 (−$0.59 … −$0.37) | WR 48 % · -0.001R | −$0.47 | −$0.47 (n 6046) | 0/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 1R | 565 | 0.12 | 42 % | −$0.61 (−$1.39 … +$0.38) | WR 48 % · -0.033R | −$0.51 | −$0.78 (n 211) | 1/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 2R | 565 | 0.12 | 37 % | −$0.63 (−$1.49 … +$0.40) | WR 42 % · -0.002R | −$0.65 | −$0.59 (n 211) | 1/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 1ATR | 565 | 0.12 | 57 % | −$0.68 (−$1.17 … −$0.14) | WR 64 % · -0.015R | −$0.58 | −$0.84 (n 211) | 0/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 2ATR | 565 | 0.12 | 44 % | −$0.77 (−$1.43 … +$0.09) | WR 49 % · -0.025R | −$0.63 | −$0.99 (n 211) | 0/8 |
| XAU at an S/R level | DXY SAME (against) | 1R | 110 | 0.02 | 47 % | −$0.59 (−$1.76 … +$0.56) | WR 52 % · +0.028R | −$0.19 | −$1.70 (n 29) | 2/8 |
| XAU at an S/R level | DXY SAME (against) | 2R | 110 | 0.02 | 45 % | −$0.47 (−$1.68 … +$0.90) | WR 47 % · +0.045R | −$0.25 | −$1.08 (n 29) | 3/8 |
| XAU at an S/R level | DXY SAME (against) | 1ATR | 110 | 0.02 | 59 % | −$0.47 (−$1.40 … +$0.37) | WR 65 % · -0.043R | −$0.30 | −$0.95 (n 29) | 3/8 |
| XAU at an S/R level | DXY SAME (against) | 2ATR | 110 | 0.02 | 54 % | −$0.14 (−$1.19 … +$0.99) | WR 57 % · +0.064R | −$0.27 | +$0.21 (n 29) | 4/8 |
| XAU at an S/R level | NO DXY confirmation | 1R | 4354 | 0.90 | 44 % | −$0.47 (−$0.70 … −$0.24) | WR 50 % · +0.007R | −$0.41 | −$0.56 (n 1530) | 0/8 |
| XAU at an S/R level | NO DXY confirmation | 2R | 4354 | 0.90 | 37 % | −$0.38 (−$0.65 … −$0.15) | WR 42 % · +0.021R | −$0.42 | −$0.31 (n 1530) | 1/8 |
| XAU at an S/R level | NO DXY confirmation | 1ATR | 4354 | 0.90 | 56 % | −$0.52 (−$0.68 … −$0.36) | WR 63 % · +0.011R | −$0.42 | −$0.71 (n 1530) | 0/8 |
| XAU at an S/R level | NO DXY confirmation | 2ATR | 4354 | 0.90 | 43 % | −$0.50 (−$0.70 … −$0.30) | WR 48 % · -0.005R | −$0.46 | −$0.56 (n 1530) | 0/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 1R | 204 | 0.04 | 44 % | −$0.45 (−$2.28 … +$2.05) | WR 48 % · -0.072R | −$0.44 | −$0.48 (n 89) | 0/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 2R | 204 | 0.04 | 38 % | −$0.88 (−$2.72 … +$1.69) | WR 43 % · -0.051R | −$0.97 | −$0.75 (n 89) | 0/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 1ATR | 204 | 0.04 | 54 % | −$0.68 (−$1.77 … +$0.45) | WR 61 % · -0.065R | −$0.61 | −$0.78 (n 89) | 0/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 2ATR | 204 | 0.04 | 44 % | −$0.70 (−$2.29 … +$1.35) | WR 49 % · -0.063R | −$0.48 | −$0.99 (n 89) | 1/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 1R | 33 | 0.01 | 39 % | −$0.49 (−$1.90 … +$1.04) | WR 42 % · -0.184R | −$0.44 | −$0.62 (n 10) | 4/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 2R | 33 | 0.01 | 39 % | +$0.11 (−$1.65 … +$2.21) | WR 42 % · -0.054R | +$0.18 | −$0.05 (n 10) | 4/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 1ATR | 33 | 0.01 | 52 % | −$0.33 (−$1.52 … +$0.87) | WR 55 % · -0.185R | −$0.87 | +$0.92 (n 10) | 3/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 2ATR | 33 | 0.01 | 48 % | −$0.00 (−$1.32 … +$1.37) | WR 52 % · -0.083R | −$0.16 | +$0.35 (n 10) | 4/8 |

### DXY confirmation within 60 min before the XAU entry

| Split | DXY | Target | Trades | /day | WR | $ / trade (95 %) | Before costs | TRAIN | OOS | Folds + |
|---|---|---|---|---|---|---|---|---|---|---|
| all XAU entries | DXY OPPOSITE (agrees) | 1R | 3784 | 0.79 | 43 % | −$0.39 (−$0.64 … −$0.11) | WR 50 % · -0.004R | −$0.45 | −$0.31 (n 1481) | 1/8 |
| all XAU entries | DXY OPPOSITE (agrees) | 2R | 3784 | 0.79 | 36 % | −$0.36 (−$0.68 … +$0.01) | WR 41 % · -0.001R | −$0.52 | −$0.10 (n 1481) | 1/8 |
| all XAU entries | DXY OPPOSITE (agrees) | 1ATR | 3784 | 0.79 | 57 % | −$0.52 (−$0.69 … −$0.32) | WR 64 % · -0.006R | −$0.43 | −$0.65 (n 1481) | 0/8 |
| all XAU entries | DXY OPPOSITE (agrees) | 2ATR | 3784 | 0.79 | 44 % | −$0.44 (−$0.71 … −$0.12) | WR 50 % · -0.007R | −$0.49 | −$0.38 (n 1481) | 0/8 |
| all XAU entries | DXY SAME (against) | 1R | 1682 | 0.35 | 46 % | −$0.15 (−$0.47 … +$0.14) | WR 53 % · +0.066R | −$0.33 | +$0.09 (n 708) | 3/8 |
| all XAU entries | DXY SAME (against) | 2R | 1682 | 0.35 | 39 % | −$0.06 (−$0.45 … +$0.34) | WR 43 % · +0.077R | −$0.36 | +$0.34 (n 708) | 3/8 |
| all XAU entries | DXY SAME (against) | 1ATR | 1682 | 0.35 | 60 % | −$0.16 (−$0.41 … +$0.08) | WR 66 % · +0.045R | −$0.24 | −$0.05 (n 708) | 3/8 |
| all XAU entries | DXY SAME (against) | 2ATR | 1682 | 0.35 | 47 % | −$0.06 (−$0.38 … +$0.25) | WR 51 % · +0.074R | −$0.26 | +$0.22 (n 708) | 4/8 |
| all XAU entries | NO DXY confirmation | 1R | 11717 | 2.43 | 43 % | −$0.46 (−$0.60 … −$0.33) | WR 50 % · +0.001R | −$0.47 | −$0.45 (n 4752) | 0/8 |
| all XAU entries | NO DXY confirmation | 2R | 11717 | 2.43 | 36 % | −$0.41 (−$0.57 … −$0.28) | WR 41 % · -0.004R | −$0.46 | −$0.35 (n 4752) | 0/8 |
| all XAU entries | NO DXY confirmation | 1ATR | 11717 | 2.43 | 55 % | −$0.49 (−$0.58 … −$0.39) | WR 62 % · -0.001R | −$0.46 | −$0.53 (n 4752) | 0/8 |
| all XAU entries | NO DXY confirmation | 2ATR | 11717 | 2.43 | 42 % | −$0.52 (−$0.65 … −$0.40) | WR 48 % · -0.010R | −$0.50 | −$0.56 (n 4752) | 0/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 1R | 1121 | 0.23 | 44 % | −$0.35 (−$0.85 … +$0.28) | WR 50 % · -0.002R | −$0.46 | −$0.15 (n 388) | 1/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 2R | 1121 | 0.23 | 38 % | −$0.37 (−$0.92 … +$0.37) | WR 43 % · +0.027R | −$0.55 | −$0.03 (n 388) | 1/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 1ATR | 1121 | 0.23 | 58 % | −$0.50 (−$0.82 … −$0.15) | WR 65 % · +0.010R | −$0.49 | −$0.53 (n 388) | 0/8 |
| XAU at an S/R level | DXY OPPOSITE (agrees) | 2ATR | 1121 | 0.23 | 46 % | −$0.49 (−$0.91 … +$0.08) | WR 51 % · +0.003R | −$0.47 | −$0.53 (n 388) | 0/8 |
| XAU at an S/R level | DXY SAME (against) | 1R | 482 | 0.10 | 44 % | −$0.63 (−$1.34 … +$0.03) | WR 49 % · +0.003R | −$0.48 | −$0.93 (n 164) | 3/8 |
| XAU at an S/R level | DXY SAME (against) | 2R | 482 | 0.10 | 38 % | −$0.40 (−$1.20 … +$0.30) | WR 42 % · +0.040R | −$0.50 | −$0.21 (n 164) | 3/8 |
| XAU at an S/R level | DXY SAME (against) | 1ATR | 482 | 0.10 | 57 % | −$0.67 (−$1.27 … −$0.12) | WR 63 % · -0.012R | −$0.41 | −$1.17 (n 164) | 3/8 |
| XAU at an S/R level | DXY SAME (against) | 2ATR | 482 | 0.10 | 45 % | −$0.55 (−$1.25 … +$0.10) | WR 49 % · +0.003R | −$0.44 | −$0.75 (n 164) | 3/8 |
| XAU at an S/R level | NO DXY confirmation | 1R | 3426 | 0.71 | 44 % | −$0.51 (−$0.79 … −$0.24) | WR 50 % · +0.004R | −$0.39 | −$0.71 (n 1218) | 1/8 |
| XAU at an S/R level | NO DXY confirmation | 2R | 3426 | 0.71 | 38 % | −$0.42 (−$0.72 … −$0.15) | WR 42 % · +0.013R | −$0.40 | −$0.47 (n 1218) | 1/8 |
| XAU at an S/R level | NO DXY confirmation | 1ATR | 3426 | 0.71 | 55 % | −$0.53 (−$0.72 … −$0.35) | WR 63 % · +0.008R | −$0.42 | −$0.73 (n 1218) | 0/8 |
| XAU at an S/R level | NO DXY confirmation | 2ATR | 3426 | 0.71 | 43 % | −$0.52 (−$0.77 … −$0.30) | WR 48 % · -0.010R | −$0.48 | −$0.60 (n 1218) | 0/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 1R | 393 | 0.08 | 44 % | −$0.20 (−$1.40 … +$1.42) | WR 48 % · -0.055R | −$0.59 | +$0.39 (n 156) | 2/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 2R | 393 | 0.08 | 38 % | −$0.19 (−$1.55 … +$1.61) | WR 42 % · -0.027R | −$0.82 | +$0.77 (n 156) | 1/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 1ATR | 393 | 0.08 | 55 % | −$0.64 (−$1.44 … +$0.21) | WR 61 % · -0.060R | −$0.68 | −$0.56 (n 156) | 0/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY OPPOSITE (agrees) | 2ATR | 393 | 0.08 | 46 % | −$0.30 (−$1.34 … +$1.14) | WR 49 % · -0.041R | −$0.51 | +$0.02 (n 156) | 1/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 1R | 146 | 0.03 | 42 % | −$1.29 (−$2.29 … −$0.32) | WR 47 % · -0.066R | −$0.42 | −$2.65 (n 57) | 1/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 2R | 146 | 0.03 | 34 % | −$1.61 (−$2.73 … −$0.57) | WR 38 % · -0.089R | −$0.33 | −$3.61 (n 57) | 2/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 1ATR | 146 | 0.03 | 55 % | −$1.19 (−$2.14 … −$0.32) | WR 61 % · -0.042R | −$0.45 | −$2.33 (n 57) | 1/8 |
| XAU at a level AND DXY confirmation at a DXY level | DXY SAME (against) | 2ATR | 146 | 0.03 | 42 % | −$1.39 (−$2.38 … −$0.47) | WR 47 % · -0.119R | −$0.14 | −$3.34 (n 57) | 1/8 |

