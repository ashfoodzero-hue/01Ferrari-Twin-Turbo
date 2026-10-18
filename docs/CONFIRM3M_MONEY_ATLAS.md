# Money test: entering on the 3m confirmation at 15m swing tips — overall and AT S/R levels

Generated from `data/master/confirm3m_study.json` (2026-10-18T21:52:32.872Z). Spec `docs/CONFIRM3M_MONEY_SPEC.md` (+ ADDENDUM A full spread, B raw minutes). Code `scripts/lib/confirm3m.mjs` (proved by `smoke_confirm3m` and `audit_confirm3m.mjs`).

**How to read:** every entry is a real-time 3m confirmation at the running tip of a 15m leg; stop just beyond the tip; 4 fixed targets; 1-minute fills, stop first. XAU and Silver pay their MEASURED spread (full round trip on bid minutes); DXY (not tradable) and WTI (no measured spread) are in R before costs.

## 1. The answer

- Cells tested: 384 (4 assets × 2 entry styles × 4 targets × 12 splits). **PASS (after spreads, TRAIN + OOS + folds + Holm): NONE.**

## 2. Before costs — is there any edge at all? (diagnostic, spread 0)

| Asset | Target | All entries | NOT at a level | At a level | At a 1D level | Usual strong |
|---|---|---|---|---|---|---|
| XAU | 1R | WR 50 % · +0.006R <sub>n 17182</sub> | WR 50 % · +0.008R <sub>n 12154</sub> | WR 50 % · +0.003R <sub>n 5028</sub> | WR 49 % · -0.009R <sub>n 898</sub> | WR 50 % · +0.004R <sub>n 2550</sub> |
| XAU | 2R | WR 41 % · +0.004R <sub>n 17182</sub> | WR 41 % · -0.002R <sub>n 12154</sub> | WR 42 % · +0.019R <sub>n 5028</sub> | WR 40 % · -0.048R <sub>n 898</sub> | WR 42 % · +0.003R <sub>n 2550</sub> |
| XAU | 1ATR | WR 63 % · +0.002R <sub>n 17182</sub> | WR 63 % · +0.001R <sub>n 12154</sub> | WR 63 % · +0.007R <sub>n 5028</sub> | WR 63 % · -0.007R <sub>n 898</sub> | WR 63 % · -0.006R <sub>n 2550</sub> |
| XAU | 2ATR | WR 48 % · -0.001R <sub>n 17182</sub> | WR 48 % · +0.001R <sub>n 12154</sub> | WR 48 % · -0.006R <sub>n 5028</sub> | WR 48 % · -0.032R <sub>n 898</sub> | WR 48 % · -0.028R <sub>n 2550</sub> |
| Silver | 1R | WR 50 % · +0.006R <sub>n 16913</sub> | WR 50 % · +0.009R <sub>n 11027</sub> | WR 50 % · +0.002R <sub>n 5886</sub> | WR 51 % · +0.017R <sub>n 1215</sub> | WR 51 % · +0.007R <sub>n 3360</sub> |
| Silver | 2R | WR 41 % · -0.002R <sub>n 16913</sub> | WR 41 % · -0.008R <sub>n 11027</sub> | WR 42 % · +0.009R <sub>n 5886</sub> | WR 41 % · +0.001R <sub>n 1215</sub> | WR 42 % · +0.014R <sub>n 3360</sub> |
| Silver | 1ATR | WR 64 % · +0.010R <sub>n 16913</sub> | WR 64 % · +0.010R <sub>n 11027</sub> | WR 63 % · +0.012R <sub>n 5886</sub> | WR 66 % · +0.058R <sub>n 1215</sub> | WR 64 % · +0.020R <sub>n 3360</sub> |
| Silver | 2ATR | WR 49 % · +0.006R <sub>n 16913</sub> | WR 49 % · +0.002R <sub>n 11027</sub> | WR 49 % · +0.013R <sub>n 5886</sub> | WR 49 % · +0.017R <sub>n 1215</sub> | WR 49 % · +0.007R <sub>n 3360</sub> |
| DXY | 1R | WR 50 % · -0.002R <sub>n 21402</sub> | WR 50 % · -0.002R <sub>n 14423</sub> | WR 50 % · -0.001R <sub>n 6979</sub> | WR 50 % · +0.015R <sub>n 1150</sub> | WR 50 % · +0.000R <sub>n 3775</sub> |
| DXY | 2R | WR 40 % · +0.015R <sub>n 21402</sub> | WR 40 % · +0.013R <sub>n 14423</sub> | WR 40 % · +0.019R <sub>n 6979</sub> | WR 41 % · +0.051R <sub>n 1150</sub> | WR 40 % · +0.031R <sub>n 3775</sub> |
| DXY | 1ATR | WR 62 % · -0.016R <sub>n 21403</sub> | WR 62 % · -0.017R <sub>n 14424</sub> | WR 62 % · -0.014R <sub>n 6979</sub> | WR 61 % · -0.025R <sub>n 1150</sub> | WR 62 % · -0.018R <sub>n 3775</sub> |
| DXY | 2ATR | WR 48 % · -0.011R <sub>n 21402</sub> | WR 48 % · -0.015R <sub>n 14423</sub> | WR 48 % · -0.002R <sub>n 6979</sub> | WR 49 % · +0.006R <sub>n 1150</sub> | WR 48 % · -0.005R <sub>n 3775</sub> |
| WTI | 1R | WR 51 % · +0.015R <sub>n 2553</sub> | WR 51 % · +0.007R <sub>n 1804</sub> | WR 52 % · +0.033R <sub>n 749</sub> | WR 49 % · +0.012R <sub>n 176</sub> | WR 50 % · +0.006R <sub>n 319</sub> |
| WTI | 2R | WR 41 % · +0.005R <sub>n 2553</sub> | WR 41 % · +0.011R <sub>n 1804</sub> | WR 41 % · -0.007R <sub>n 749</sub> | WR 37 % · -0.092R <sub>n 176</sub> | WR 39 % · -0.068R <sub>n 319</sub> |
| WTI | 1ATR | WR 64 % · -0.009R <sub>n 2553</sub> | WR 64 % · -0.014R <sub>n 1804</sub> | WR 64 % · +0.001R <sub>n 749</sub> | WR 64 % · +0.014R <sub>n 176</sub> | WR 65 % · +0.005R <sub>n 319</sub> |
| WTI | 2ATR | WR 50 % · -0.007R <sub>n 2553</sub> | WR 50 % · -0.009R <sub>n 1804</sub> | WR 50 % · -0.004R <sub>n 749</sub> | WR 48 % · -0.042R <sub>n 176</sub> | WR 49 % · -0.038R <sub>n 319</sub> |

## 3. The money result (entry at the confirming close)

### XAU ($ after spreads)

| Split | Target | Trades | /day | WR | Per trade (95 %) | TRAIN | OOS | Folds + | PASS |
|---|---|---|---|---|---|---|---|---|---|
| all entries | 1R | 17183 | 3.57 | 44 % | −$0.41 (−$0.52 … −$0.30) | −$0.45 | −$0.36 | 0/8 | — |
| NOT at any S/R level | 1R | 12154 | 2.53 | 44 % | −$0.39 (−$0.52 … −$0.25) | −$0.46 | −$0.28 | 0/8 | — |
| at an S/R level (any tf) | 1R | 5029 | 1.05 | 44 % | −$0.48 (−$0.67 … −$0.30) | −$0.42 | −$0.61 | 0/8 | — |
| at a 1H level (highest) | 1R | 1576 | 0.33 | 42 % | −$0.84 (−$1.18 … −$0.50) | −$0.54 | −$1.32 | 0/8 | — |
| at a 4H level (highest) | 1R | 1378 | 0.29 | 44 % | −$0.50 (−$0.85 … −$0.15) | −$0.38 | −$0.71 | 0/8 | — |
| at a 1D level (highest) | 1R | 898 | 0.19 | 44 % | −$0.36 (−$0.69 … −$0.02) | −$0.40 | −$0.28 | 0/8 | — |
| at a 1W / 1M level | 1R | 1177 | 0.24 | 45 % | −$0.08 (−$0.52 … +$0.41) | −$0.33 | +$0.47 | 3/8 | — |
| confluence 2+ other tfs | 1R | 705 | 0.15 | 44 % | −$0.19 (−$0.67 … +$0.35) | −$0.38 | +$0.14 | 3/8 | — |
| level held 2+ times before | 1R | 1068 | 0.22 | 43 % | −$0.47 (−$0.93 … +$0.03) | −$0.45 | −$0.52 | 0/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1R | 2550 | 0.53 | 44 % | −$0.33 (−$0.60 … −$0.06) | −$0.42 | −$0.15 | 1/8 | — |
| 3m higher low / lower high first | 1R | 7445 | 1.55 | 43 % | −$0.38 (−$0.56 … −$0.17) | −$0.49 | −$0.18 | 0/8 | — |
| usual strong + higher low first | 1R | 1087 | 0.23 | 43 % | −$0.22 (−$0.64 … +$0.24) | −$0.52 | +$0.50 | 2/8 | — |
| all entries | 2R | 17183 | 3.57 | 36 % | −$0.37 (−$0.48 … −$0.24) | −$0.46 | −$0.23 | 0/8 | — |
| NOT at any S/R level | 2R | 12154 | 2.53 | 36 % | −$0.35 (−$0.49 … −$0.19) | −$0.47 | −$0.18 | 0/8 | — |
| at an S/R level (any tf) | 2R | 5029 | 1.05 | 38 % | −$0.41 (−$0.63 … −$0.19) | −$0.44 | −$0.35 | 1/8 | — |
| at a 1H level (highest) | 2R | 1576 | 0.33 | 37 % | −$0.70 (−$1.11 … −$0.31) | −$0.53 | −$0.98 | 1/8 | — |
| at a 4H level (highest) | 2R | 1378 | 0.29 | 38 % | −$0.47 (−$0.88 … −$0.03) | −$0.32 | −$0.70 | 2/8 | — |
| at a 1D level (highest) | 2R | 898 | 0.19 | 37 % | −$0.45 (−$0.86 … −$0.04) | −$0.63 | −$0.07 | 1/8 | — |
| at a 1W / 1M level | 2R | 1177 | 0.24 | 39 % | +$0.08 (−$0.46 … +$0.65) | −$0.32 | +$0.96 | 3/8 | — |
| confluence 2+ other tfs | 2R | 705 | 0.15 | 36 % | −$0.33 (−$0.89 … +$0.38) | −$0.66 | +$0.25 | 2/8 | — |
| level held 2+ times before | 2R | 1068 | 0.22 | 35 % | −$0.45 (−$0.93 … +$0.07) | −$0.55 | −$0.21 | 1/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2R | 2550 | 0.53 | 37 % | −$0.28 (−$0.57 … +$0.03) | −$0.50 | +$0.19 | 2/8 | — |
| 3m higher low / lower high first | 2R | 7445 | 1.55 | 37 % | −$0.33 (−$0.55 … −$0.09) | −$0.50 | −$0.04 | 1/8 | — |
| usual strong + higher low first | 2R | 1087 | 0.23 | 38 % | −$0.17 (−$0.63 … +$0.36) | −$0.54 | +$0.75 | 2/8 | — |
| all entries | 1ATR | 17183 | 3.57 | 56 % | −$0.46 (−$0.54 … −$0.37) | −$0.43 | −$0.50 | 0/8 | — |
| NOT at any S/R level | 1ATR | 12154 | 2.53 | 56 % | −$0.43 (−$0.53 … −$0.33) | −$0.43 | −$0.43 | 0/8 | — |
| at an S/R level (any tf) | 1ATR | 5029 | 1.05 | 56 % | −$0.53 (−$0.68 … −$0.39) | −$0.43 | −$0.73 | 0/8 | — |
| at a 1H level (highest) | 1ATR | 1576 | 0.33 | 56 % | −$0.58 (−$0.84 … −$0.31) | −$0.46 | −$0.77 | 0/8 | — |
| at a 4H level (highest) | 1ATR | 1378 | 0.29 | 56 % | −$0.70 (−$0.96 … −$0.43) | −$0.40 | −$1.18 | 0/8 | — |
| at a 1D level (highest) | 1ATR | 898 | 0.19 | 56 % | −$0.31 (−$0.59 … −$0.00) | −$0.40 | −$0.12 | 1/8 | — |
| at a 1W / 1M level | 1ATR | 1177 | 0.24 | 56 % | −$0.46 (−$0.71 … −$0.19) | −$0.45 | −$0.49 | 1/8 | — |
| confluence 2+ other tfs | 1ATR | 705 | 0.15 | 57 % | −$0.25 (−$0.59 … +$0.08) | −$0.34 | −$0.10 | 1/8 | — |
| level held 2+ times before | 1ATR | 1068 | 0.22 | 54 % | −$0.67 (−$1.00 … −$0.37) | −$0.49 | −$1.07 | 0/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1ATR | 2550 | 0.53 | 55 % | −$0.50 (−$0.67 … −$0.32) | −$0.46 | −$0.58 | 0/8 | — |
| 3m higher low / lower high first | 1ATR | 7445 | 1.55 | 57 % | −$0.51 (−$0.62 … −$0.39) | −$0.51 | −$0.50 | 0/8 | — |
| usual strong + higher low first | 1ATR | 1087 | 0.23 | 55 % | −$0.49 (−$0.78 … −$0.23) | −$0.58 | −$0.29 | 0/8 | — |
| all entries | 2ATR | 17183 | 3.57 | 43 % | −$0.46 (−$0.56 … −$0.34) | −$0.47 | −$0.44 | 0/8 | — |
| NOT at any S/R level | 2ATR | 12154 | 2.53 | 43 % | −$0.43 (−$0.57 … −$0.30) | −$0.47 | −$0.38 | 0/8 | — |
| at an S/R level (any tf) | 2ATR | 5029 | 1.05 | 44 % | −$0.52 (−$0.68 … −$0.35) | −$0.48 | −$0.60 | 0/8 | — |
| at a 1H level (highest) | 2ATR | 1576 | 0.33 | 42 % | −$0.73 (−$1.06 … −$0.41) | −$0.54 | −$1.04 | 0/8 | — |
| at a 4H level (highest) | 2ATR | 1378 | 0.29 | 45 % | −$0.52 (−$0.83 … −$0.22) | −$0.39 | −$0.75 | 1/8 | — |
| at a 1D level (highest) | 2ATR | 898 | 0.19 | 44 % | −$0.34 (−$0.66 … −$0.01) | −$0.54 | +$0.09 | 2/8 | — |
| at a 1W / 1M level | 2ATR | 1177 | 0.24 | 44 % | −$0.36 (−$0.78 … +$0.08) | −$0.44 | −$0.18 | 2/8 | — |
| confluence 2+ other tfs | 2ATR | 705 | 0.15 | 44 % | −$0.27 (−$0.69 … +$0.21) | −$0.48 | +$0.10 | 1/8 | — |
| level held 2+ times before | 2ATR | 1068 | 0.22 | 42 % | −$0.67 (−$1.09 … −$0.25) | −$0.59 | −$0.83 | 0/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2ATR | 2550 | 0.53 | 43 % | −$0.46 (−$0.71 … −$0.22) | −$0.53 | −$0.31 | 0/8 | — |
| 3m higher low / lower high first | 2ATR | 7445 | 1.55 | 45 % | −$0.45 (−$0.62 … −$0.25) | −$0.52 | −$0.32 | 0/8 | — |
| usual strong + higher low first | 2ATR | 1087 | 0.23 | 45 % | −$0.31 (−$0.70 … +$0.06) | −$0.60 | +$0.39 | 1/8 | — |

### Silver ($ after spreads)

| Split | Target | Trades | /day | WR | Per trade (95 %) | TRAIN | OOS | Folds + | PASS |
|---|---|---|---|---|---|---|---|---|---|
| all entries | 1R | 16914 | 3.51 | 30 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| NOT at any S/R level | 1R | 11028 | 2.29 | 30 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| at an S/R level (any tf) | 1R | 5886 | 1.22 | 31 % | −$0.03 (−$0.04 … −$0.03) | −$0.05 | −$0.02 | 0/8 | — |
| at a 1H level (highest) | 1R | 1717 | 0.36 | 28 % | −$0.05 (−$0.08 … −$0.03) | −$0.05 | −$0.05 | 0/8 | — |
| at a 4H level (highest) | 1R | 1454 | 0.30 | 30 % | −$0.04 (−$0.05 … −$0.02) | −$0.05 | −$0.02 | 1/8 | — |
| at a 1D level (highest) | 1R | 1215 | 0.25 | 30 % | −$0.03 (−$0.04 … −$0.01) | −$0.05 | +$0.01 | 1/8 | — |
| at a 1W / 1M level | 1R | 1500 | 0.31 | 37 % | −$0.02 (−$0.03 … −$0.02) | −$0.04 | −$0.01 | 0/8 | — |
| confluence 2+ other tfs | 1R | 825 | 0.17 | 33 % | −$0.02 (−$0.03 … +$0.00) | −$0.04 | +$0.01 | 2/8 | — |
| level held 2+ times before | 1R | 1356 | 0.28 | 29 % | −$0.03 (−$0.04 … −$0.02) | −$0.04 | −$0.00 | 1/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1R | 3360 | 0.70 | 32 % | −$0.03 (−$0.04 … −$0.02) | −$0.05 | −$0.01 | 1/8 | — |
| 3m higher low / lower high first | 1R | 7078 | 1.47 | 30 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.01 | 0/8 | — |
| usual strong + higher low first | 1R | 1346 | 0.28 | 31 % | −$0.03 (−$0.05 … −$0.01) | −$0.04 | −$0.01 | 1/8 | — |
| all entries | 2R | 16914 | 3.51 | 26 % | −$0.03 (−$0.03 … −$0.03) | −$0.05 | −$0.01 | 0/8 | — |
| NOT at any S/R level | 2R | 11028 | 2.29 | 25 % | −$0.03 (−$0.04 … −$0.02) | −$0.04 | −$0.01 | 0/8 | — |
| at an S/R level (any tf) | 2R | 5886 | 1.22 | 27 % | −$0.03 (−$0.04 … −$0.02) | −$0.05 | −$0.00 | 1/8 | — |
| at a 1H level (highest) | 2R | 1717 | 0.36 | 25 % | −$0.04 (−$0.07 … −$0.01) | −$0.05 | −$0.02 | 1/8 | — |
| at a 4H level (highest) | 2R | 1454 | 0.30 | 26 % | −$0.03 (−$0.04 … −$0.01) | −$0.05 | +$0.00 | 3/8 | — |
| at a 1D level (highest) | 2R | 1215 | 0.25 | 25 % | −$0.03 (−$0.04 … −$0.01) | −$0.05 | +$0.01 | 1/8 | — |
| at a 1W / 1M level | 2R | 1500 | 0.31 | 31 % | −$0.02 (−$0.03 … −$0.01) | −$0.04 | −$0.01 | 1/8 | — |
| confluence 2+ other tfs | 2R | 825 | 0.17 | 29 % | −$0.02 (−$0.04 … +$0.01) | −$0.04 | +$0.01 | 2/8 | — |
| level held 2+ times before | 2R | 1356 | 0.28 | 27 % | −$0.02 (−$0.04 … −$0.01) | −$0.04 | +$0.01 | 2/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2R | 3360 | 0.70 | 28 % | −$0.03 (−$0.03 … −$0.02) | −$0.05 | −$0.00 | 1/8 | — |
| 3m higher low / lower high first | 2R | 7078 | 1.47 | 27 % | −$0.03 (−$0.04 … −$0.02) | −$0.04 | −$0.00 | 1/8 | — |
| usual strong + higher low first | 2R | 1346 | 0.28 | 28 % | −$0.03 (−$0.04 … −$0.01) | −$0.04 | −$0.00 | 1/8 | — |
| all entries | 1ATR | 16914 | 3.51 | 40 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| NOT at any S/R level | 1ATR | 11028 | 2.29 | 39 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| at an S/R level (any tf) | 1ATR | 5886 | 1.22 | 40 % | −$0.04 (−$0.05 … −$0.03) | −$0.04 | −$0.03 | 0/8 | — |
| at a 1H level (highest) | 1ATR | 1717 | 0.36 | 37 % | −$0.05 (−$0.08 … −$0.03) | −$0.05 | −$0.05 | 0/8 | — |
| at a 4H level (highest) | 1ATR | 1454 | 0.30 | 38 % | −$0.04 (−$0.06 … −$0.03) | −$0.04 | −$0.04 | 0/8 | — |
| at a 1D level (highest) | 1ATR | 1215 | 0.25 | 39 % | −$0.02 (−$0.03 … −$0.01) | −$0.04 | +$0.00 | 1/8 | — |
| at a 1W / 1M level | 1ATR | 1500 | 0.31 | 47 % | −$0.02 (−$0.03 … −$0.02) | −$0.04 | −$0.01 | 0/8 | — |
| confluence 2+ other tfs | 1ATR | 825 | 0.17 | 43 % | −$0.02 (−$0.03 … −$0.01) | −$0.04 | +$0.01 | 1/8 | — |
| level held 2+ times before | 1ATR | 1356 | 0.28 | 38 % | −$0.03 (−$0.04 … −$0.02) | −$0.04 | −$0.02 | 0/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1ATR | 3360 | 0.70 | 42 % | −$0.03 (−$0.04 … −$0.02) | −$0.04 | −$0.01 | 0/8 | — |
| 3m higher low / lower high first | 1ATR | 7078 | 1.47 | 41 % | −$0.04 (−$0.04 … −$0.03) | −$0.04 | −$0.03 | 0/8 | — |
| usual strong + higher low first | 1ATR | 1346 | 0.28 | 43 % | −$0.03 (−$0.05 … −$0.02) | −$0.04 | −$0.02 | 0/8 | — |
| all entries | 2ATR | 16914 | 3.51 | 31 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| NOT at any S/R level | 2ATR | 11028 | 2.29 | 30 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| at an S/R level (any tf) | 2ATR | 5886 | 1.22 | 31 % | −$0.04 (−$0.04 … −$0.03) | −$0.05 | −$0.02 | 0/8 | — |
| at a 1H level (highest) | 2ATR | 1717 | 0.36 | 29 % | −$0.05 (−$0.08 … −$0.03) | −$0.05 | −$0.04 | 1/8 | — |
| at a 4H level (highest) | 2ATR | 1454 | 0.30 | 31 % | −$0.04 (−$0.05 … −$0.03) | −$0.04 | −$0.03 | 1/8 | — |
| at a 1D level (highest) | 2ATR | 1215 | 0.25 | 30 % | −$0.03 (−$0.04 … −$0.01) | −$0.05 | −$0.01 | 1/8 | — |
| at a 1W / 1M level | 2ATR | 1500 | 0.31 | 37 % | −$0.02 (−$0.03 … −$0.02) | −$0.04 | −$0.01 | 0/8 | — |
| confluence 2+ other tfs | 2ATR | 825 | 0.17 | 33 % | −$0.02 (−$0.04 … −$0.00) | −$0.05 | +$0.00 | 2/8 | — |
| level held 2+ times before | 2ATR | 1356 | 0.28 | 30 % | −$0.04 (−$0.05 … −$0.02) | −$0.04 | −$0.02 | 0/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2ATR | 3360 | 0.70 | 32 % | −$0.03 (−$0.04 … −$0.02) | −$0.05 | −$0.02 | 0/8 | — |
| 3m higher low / lower high first | 2ATR | 7078 | 1.47 | 32 % | −$0.03 (−$0.04 … −$0.03) | −$0.04 | −$0.02 | 0/8 | — |
| usual strong + higher low first | 2ATR | 1346 | 0.28 | 33 % | −$0.03 (−$0.05 … −$0.01) | −$0.04 | −$0.01 | 0/8 | — |

### DXY (R before costs)

| Split | Target | Trades | /day | WR | Per trade (95 %) | TRAIN | OOS | Folds + | PASS |
|---|---|---|---|---|---|---|---|---|---|
| all entries | 1R | 21402 | 4.45 | 50 % | -0.002R (-0.014R … +0.010R) | -0.002R | -0.001R | 5/8 | — |
| NOT at any S/R level | 1R | 14423 | 3.00 | 50 % | -0.002R (-0.016R … +0.013R) | -0.001R | -0.004R | 2/8 | — |
| at an S/R level (any tf) | 1R | 6979 | 1.45 | 50 % | -0.001R (-0.022R … +0.019R) | -0.005R | +0.003R | 3/8 | — |
| at a 1H level (highest) | 1R | 1929 | 0.40 | 51 % | +0.009R (-0.033R … +0.051R) | +0.025R | -0.022R | 3/8 | — |
| at a 4H level (highest) | 1R | 1824 | 0.38 | 49 % | -0.019R (-0.060R … +0.023R) | -0.032R | +0.003R | 1/8 | — |
| at a 1D level (highest) | 1R | 1150 | 0.24 | 50 % | +0.015R (-0.044R … +0.073R) | +0.010R | +0.030R | 4/8 | — |
| at a 1W / 1M level | 1R | 2076 | 0.43 | 49 % | -0.005R (-0.045R … +0.037R) | -0.040R | +0.008R | 4/8 | — |
| confluence 2+ other tfs | 1R | 885 | 0.18 | 49 % | -0.002R (-0.057R … +0.057R) | +0.009R | -0.015R | 3/8 | — |
| level held 2+ times before | 1R | 1087 | 0.23 | 51 % | +0.016R (-0.041R … +0.069R) | -0.006R | +0.042R | 6/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1R | 3775 | 0.78 | 50 % | +0.000R (-0.027R … +0.032R) | -0.012R | +0.011R | 4/8 | — |
| 3m higher low / lower high first | 1R | 7760 | 1.61 | 49 % | -0.017R (-0.035R … +0.002R) | -0.018R | -0.016R | 3/8 | — |
| usual strong + higher low first | 1R | 1355 | 0.28 | 50 % | -0.006R (-0.056R … +0.041R) | -0.055R | +0.035R | 4/8 | — |
| all entries | 2R | 21402 | 4.45 | 40 % | +0.015R (+0.000R … +0.029R) | +0.017R | +0.011R | 6/8 | — |
| NOT at any S/R level | 2R | 14423 | 3.00 | 40 % | +0.013R (-0.005R … +0.031R) | +0.017R | +0.004R | 7/8 | — |
| at an S/R level (any tf) | 2R | 6979 | 1.45 | 40 % | +0.019R (-0.008R … +0.048R) | +0.017R | +0.021R | 6/8 | — |
| at a 1H level (highest) | 2R | 1929 | 0.40 | 40 % | +0.009R (-0.048R … +0.068R) | +0.046R | -0.062R | 4/8 | — |
| at a 4H level (highest) | 2R | 1824 | 0.38 | 41 % | +0.011R (-0.041R … +0.065R) | -0.007R | +0.041R | 3/8 | — |
| at a 1D level (highest) | 2R | 1150 | 0.24 | 41 % | +0.051R (-0.029R … +0.132R) | +0.032R | +0.104R | 4/8 | — |
| at a 1W / 1M level | 2R | 2076 | 0.43 | 39 % | +0.017R (-0.034R … +0.068R) | -0.025R | +0.032R | 4/8 | — |
| confluence 2+ other tfs | 2R | 885 | 0.18 | 40 % | +0.030R (-0.051R … +0.111R) | +0.001R | +0.068R | 5/8 | — |
| level held 2+ times before | 2R | 1087 | 0.23 | 42 % | +0.054R (-0.016R … +0.121R) | +0.042R | +0.067R | 6/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2R | 3775 | 0.78 | 40 % | +0.031R (-0.005R … +0.072R) | +0.016R | +0.043R | 6/8 | — |
| 3m higher low / lower high first | 2R | 7760 | 1.61 | 41 % | -0.004R (-0.029R … +0.020R) | -0.003R | -0.006R | 3/8 | — |
| usual strong + higher low first | 2R | 1355 | 0.28 | 42 % | +0.022R (-0.043R … +0.090R) | -0.005R | +0.045R | 4/8 | — |
| all entries | 1ATR | 21403 | 4.45 | 62 % | -0.016R (-0.026R … -0.006R) | -0.020R | -0.008R | 0/8 | — |
| NOT at any S/R level | 1ATR | 14424 | 3.00 | 62 % | -0.017R (-0.028R … -0.005R) | -0.022R | -0.007R | 1/8 | — |
| at an S/R level (any tf) | 1ATR | 6979 | 1.45 | 62 % | -0.014R (-0.032R … +0.004R) | -0.017R | -0.010R | 2/8 | — |
| at a 1H level (highest) | 1ATR | 1929 | 0.40 | 63 % | +0.003R (-0.031R … +0.037R) | +0.014R | -0.017R | 4/8 | — |
| at a 4H level (highest) | 1ATR | 1824 | 0.38 | 62 % | -0.018R (-0.053R … +0.016R) | -0.022R | -0.010R | 2/8 | — |
| at a 1D level (highest) | 1ATR | 1150 | 0.24 | 61 % | -0.025R (-0.073R … +0.022R) | -0.039R | +0.012R | 3/8 | — |
| at a 1W / 1M level | 1ATR | 2076 | 0.43 | 62 % | -0.020R (-0.051R … +0.012R) | -0.045R | -0.011R | 2/8 | — |
| confluence 2+ other tfs | 1ATR | 885 | 0.18 | 61 % | -0.033R (-0.079R … +0.017R) | -0.037R | -0.027R | 2/8 | — |
| level held 2+ times before | 1ATR | 1087 | 0.23 | 63 % | -0.001R (-0.047R … +0.046R) | -0.027R | +0.029R | 3/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1ATR | 3775 | 0.78 | 62 % | -0.018R (-0.041R … +0.005R) | -0.035R | -0.004R | 3/8 | — |
| 3m higher low / lower high first | 1ATR | 7761 | 1.61 | 64 % | -0.033R (-0.047R … -0.017R) | -0.038R | -0.024R | 0/8 | — |
| usual strong + higher low first | 1ATR | 1355 | 0.28 | 65 % | -0.027R (-0.065R … +0.011R) | -0.064R | +0.004R | 1/8 | — |
| all entries | 2ATR | 21402 | 4.45 | 48 % | -0.011R (-0.024R … +0.002R) | -0.012R | -0.008R | 2/8 | — |
| NOT at any S/R level | 2ATR | 14423 | 3.00 | 48 % | -0.015R (-0.031R … +0.001R) | -0.012R | -0.019R | 0/8 | — |
| at an S/R level (any tf) | 2ATR | 6979 | 1.45 | 48 % | -0.002R (-0.025R … +0.021R) | -0.012R | +0.008R | 3/8 | — |
| at a 1H level (highest) | 2ATR | 1929 | 0.40 | 49 % | +0.011R (-0.037R … +0.060R) | +0.028R | -0.022R | 4/8 | — |
| at a 4H level (highest) | 2ATR | 1824 | 0.38 | 48 % | -0.010R (-0.054R … +0.035R) | -0.035R | +0.031R | 3/8 | — |
| at a 1D level (highest) | 2ATR | 1150 | 0.24 | 49 % | +0.006R (-0.054R … +0.070R) | -0.008R | +0.044R | 4/8 | — |
| at a 1W / 1M level | 2ATR | 2076 | 0.43 | 47 % | -0.013R (-0.056R … +0.033R) | -0.061R | +0.004R | 3/8 | — |
| confluence 2+ other tfs | 2ATR | 885 | 0.18 | 49 % | +0.018R (-0.046R … +0.082R) | -0.008R | +0.051R | 6/8 | — |
| level held 2+ times before | 2ATR | 1087 | 0.23 | 48 % | +0.007R (-0.054R … +0.066R) | -0.016R | +0.032R | 5/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2ATR | 3775 | 0.78 | 48 % | -0.005R (-0.035R … +0.030R) | -0.025R | +0.012R | 3/8 | — |
| 3m higher low / lower high first | 2ATR | 7760 | 1.61 | 51 % | -0.022R (-0.041R … -0.003R) | -0.029R | -0.009R | 3/8 | — |
| usual strong + higher low first | 2ATR | 1355 | 0.28 | 51 % | -0.012R (-0.061R … +0.038R) | -0.070R | +0.037R | 4/8 | — |

### WTI (R before costs)

| Split | Target | Trades | /day | WR | Per trade (95 %) | TRAIN | OOS | Folds + | PASS |
|---|---|---|---|---|---|---|---|---|---|
| all entries | 1R | 2553 | 3.61 | 51 % | +0.015R (-0.019R … +0.048R) | +0.004R | +0.032R | 6/8 | — |
| NOT at any S/R level | 1R | 1804 | 2.55 | 51 % | +0.007R (-0.036R … +0.049R) | -0.006R | +0.028R | 4/8 | — |
| at an S/R level (any tf) | 1R | 749 | 1.06 | 52 % | +0.033R (-0.028R … +0.093R) | +0.029R | +0.041R | 6/8 | — |
| at a 1H level (highest) | 1R | 230 | 0.32 | 53 % | +0.046R (-0.085R … +0.164R) | +0.019R | +0.090R | 6/8 | — |
| at a 4H level (highest) | 1R | 303 | 0.43 | 53 % | +0.061R (-0.029R … +0.153R) | +0.051R | +0.084R | 7/8 | — |
| at a 1D level (highest) | 1R | 176 | 0.25 | 49 % | +0.012R (-0.117R … +0.147R) | -0.006R | +0.051R | 4/8 | — |
| at a 1W / 1M level | 1R | 40 | 0.06 | 43 % | -0.161R (-0.430R … +0.185R) | +0.128R | -0.257R | 2/8 | — |
| confluence 2+ other tfs | 1R | 114 | 0.16 | 46 % | -0.059R (-0.240R … +0.129R) | +0.015R | -0.197R | 3/8 | — |
| level held 2+ times before | 1R | 152 | 0.21 | 53 % | +0.068R (-0.078R … +0.228R) | +0.080R | +0.047R | 5/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1R | 319 | 0.45 | 50 % | +0.006R (-0.085R … +0.102R) | +0.042R | -0.055R | 4/8 | — |
| 3m higher low / lower high first | 1R | 1015 | 1.43 | 49 % | -0.016R (-0.068R … +0.039R) | -0.036R | +0.017R | 2/8 | — |
| usual strong + higher low first | 1R | 129 | 0.18 | 57 % | +0.146R (-0.005R … +0.293R) | +0.144R | +0.150R | 6/8 | — |
| all entries | 2R | 2553 | 3.61 | 41 % | +0.005R (-0.040R … +0.048R) | +0.007R | +0.002R | 4/8 | — |
| NOT at any S/R level | 2R | 1804 | 2.55 | 41 % | +0.011R (-0.040R … +0.064R) | +0.008R | +0.015R | 5/8 | — |
| at an S/R level (any tf) | 2R | 749 | 1.06 | 41 % | -0.007R (-0.095R … +0.087R) | +0.005R | -0.030R | 4/8 | — |
| at a 1H level (highest) | 2R | 230 | 0.32 | 43 % | -0.004R (-0.169R … +0.148R) | -0.022R | +0.025R | 3/8 | — |
| at a 4H level (highest) | 2R | 303 | 0.43 | 43 % | +0.047R (-0.078R … +0.176R) | +0.085R | -0.037R | 4/8 | — |
| at a 1D level (highest) | 2R | 176 | 0.25 | 37 % | -0.092R (-0.275R … +0.111R) | -0.128R | -0.013R | 5/8 | — |
| at a 1W / 1M level | 2R | 40 | 0.06 | 40 % | -0.060R (-0.397R … +0.361R) | +0.358R | -0.199R | 2/8 | — |
| confluence 2+ other tfs | 2R | 114 | 0.16 | 39 % | -0.045R (-0.259R … +0.196R) | +0.023R | -0.171R | 6/8 | — |
| level held 2+ times before | 2R | 152 | 0.21 | 44 % | +0.014R (-0.174R … +0.218R) | +0.052R | -0.055R | 3/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2R | 319 | 0.45 | 39 % | -0.068R (-0.197R … +0.074R) | -0.041R | -0.114R | 3/8 | — |
| 3m higher low / lower high first | 2R | 1015 | 1.43 | 42 % | -0.029R (-0.091R … +0.036R) | -0.018R | -0.045R | 1/8 | — |
| usual strong + higher low first | 2R | 129 | 0.18 | 47 % | +0.074R (-0.112R … +0.262R) | +0.061R | +0.095R | 4/8 | — |
| all entries | 1ATR | 2553 | 3.61 | 64 % | -0.009R (-0.035R … +0.016R) | -0.009R | -0.009R | 4/8 | — |
| NOT at any S/R level | 1ATR | 1804 | 2.55 | 64 % | -0.014R (-0.047R … +0.019R) | -0.019R | -0.006R | 2/8 | — |
| at an S/R level (any tf) | 1ATR | 749 | 1.06 | 64 % | +0.001R (-0.042R … +0.044R) | +0.011R | -0.017R | 4/8 | — |
| at a 1H level (highest) | 1ATR | 230 | 0.32 | 65 % | +0.012R (-0.079R … +0.096R) | +0.046R | -0.044R | 4/8 | — |
| at a 4H level (highest) | 1ATR | 303 | 0.43 | 64 % | -0.004R (-0.072R … +0.068R) | -0.010R | +0.010R | 4/8 | — |
| at a 1D level (highest) | 1ATR | 176 | 0.25 | 64 % | +0.014R (-0.087R … +0.112R) | +0.016R | +0.010R | 5/8 | — |
| at a 1W / 1M level | 1ATR | 40 | 0.06 | 63 % | -0.080R (-0.184R … +0.076R) | -0.094R | -0.076R | 2/8 | — |
| confluence 2+ other tfs | 1ATR | 114 | 0.16 | 61 % | -0.047R (-0.171R … +0.062R) | -0.053R | -0.037R | 4/8 | — |
| level held 2+ times before | 1ATR | 152 | 0.21 | 68 % | +0.036R (-0.067R … +0.137R) | +0.027R | +0.053R | 4/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 1ATR | 319 | 0.45 | 65 % | +0.005R (-0.062R … +0.070R) | +0.022R | -0.023R | 4/8 | — |
| 3m higher low / lower high first | 1ATR | 1015 | 1.43 | 64 % | -0.034R (-0.074R … +0.004R) | -0.042R | -0.020R | 1/8 | — |
| usual strong + higher low first | 1ATR | 129 | 0.18 | 70 % | +0.056R (-0.065R … +0.169R) | +0.029R | +0.102R | 4/8 | — |
| all entries | 2ATR | 2553 | 3.61 | 50 % | -0.007R (-0.044R … +0.031R) | -0.012R | -0.001R | 2/8 | — |
| NOT at any S/R level | 2ATR | 1804 | 2.55 | 50 % | -0.009R (-0.052R … +0.039R) | -0.013R | -0.002R | 2/8 | — |
| at an S/R level (any tf) | 2ATR | 749 | 1.06 | 50 % | -0.004R (-0.064R … +0.056R) | -0.008R | +0.004R | 5/8 | — |
| at a 1H level (highest) | 2ATR | 230 | 0.32 | 52 % | +0.012R (-0.124R … +0.133R) | -0.010R | +0.047R | 5/8 | — |
| at a 4H level (highest) | 2ATR | 303 | 0.43 | 51 % | +0.022R (-0.067R … +0.117R) | +0.005R | +0.060R | 5/8 | — |
| at a 1D level (highest) | 2ATR | 176 | 0.25 | 48 % | -0.042R (-0.171R … +0.091R) | -0.043R | -0.041R | 5/8 | — |
| at a 1W / 1M level | 2ATR | 40 | 0.06 | 45 % | -0.117R (-0.376R … +0.227R) | +0.185R | -0.217R | 2/8 | — |
| confluence 2+ other tfs | 2ATR | 114 | 0.16 | 46 % | -0.090R (-0.261R … +0.076R) | +0.005R | -0.266R | 4/8 | — |
| level held 2+ times before | 2ATR | 152 | 0.21 | 53 % | +0.023R (-0.124R … +0.186R) | +0.037R | -0.003R | 4/8 | — |
| "usual strong" (1D+ or confluence or held 2+) | 2ATR | 319 | 0.45 | 49 % | -0.038R (-0.131R … +0.056R) | -0.007R | -0.089R | 4/8 | — |
| 3m higher low / lower high first | 2ATR | 1015 | 1.43 | 51 % | -0.030R (-0.077R … +0.019R) | -0.034R | -0.024R | 2/8 | — |
| usual strong + higher low first | 2ATR | 129 | 0.18 | 57 % | +0.089R (-0.041R … +0.220R) | +0.108R | +0.057R | 5/8 | — |

## 4. Second entry style: on a holding retest of the level (best 12 cells by OOS lower bound)

| Asset | Split | Target | Trades | WR | Per trade | OOS | Folds + | PASS |
|---|---|---|---|---|---|---|---|---|
| WTI | usual strong + higher low first | 1R | 92 | 59 % | +0.217R | +0.284R (lo +0.090R) | 8/8 | — |
| WTI | usual strong + higher low first | 1ATR | 92 | 71 % | +0.098R | +0.158R (lo +0.019R) | 6/8 | — |
| WTI | usual strong + higher low first | 2ATR | 92 | 59 % | +0.154R | +0.198R (lo +0.010R) | 8/8 | — |
| DXY | all entries | 2R | 15073 | 40 % | +0.021R | +0.033R (lo +0.001R) | 7/8 | — |
| DXY | NOT at any S/R level | 2R | 10137 | 40 % | +0.024R | +0.041R (lo +0.001R) | 6/8 | — |
| Silver | confluence 2+ other tfs | 1R | 636 | 35 % | −$0.00 | +$0.04 (lo −$0.00) | 2/8 | — |
| DXY | all entries | 1R | 15073 | 50 % | +0.001R | +0.010R (lo -0.012R) | 3/8 | — |
| Silver | at a 1W / 1M level | 1R | 1204 | 38 % | −$0.02 | −$0.01 (lo −$0.01) | 0/8 | — |
| Silver | confluence 2+ other tfs | 2ATR | 636 | 35 % | −$0.01 | +$0.02 (lo −$0.02) | 3/8 | — |
| Silver | confluence 2+ other tfs | 1ATR | 636 | 44 % | −$0.02 | +$0.01 (lo −$0.02) | 1/8 | — |
| Silver | at a 1W / 1M level | 1ATR | 1204 | 49 % | −$0.02 | −$0.01 (lo −$0.02) | 0/8 | — |
| DXY | 3m higher low / lower high first | 2R | 5586 | 42 % | +0.009R | +0.034R (lo -0.016R) | 4/8 | — |

## 5. Audit

| Asset | Independent trigger finder (180 d) | Causal prefix replay | Independent simulator | Positive control (entry at the TRUE tip, 1R) |
|---|---|---|---|---|
| XAU | 745 = 745 (only one side: 0) | 0 differences | 2400 checks · 0 differences | 1500/1500 won |
| Silver | 718 = 718 (only one side: 0) | 0 differences | 2400 checks · 0 differences | 1436/1500 won |
| DXY | 777 = 777 (only one side: 0) | 0 differences | 2400 checks · 0 differences | 1500/1500 won |
| WTI | 693 = 693 (only one side: 0) | 0 differences | 2400 checks · 0 differences | 1500/1500 won |

## Honest limits

- One fixed entry rule and stop; other stops / targets are new studies, never tuned on these numbers.
- DXY is not tradable (R only); WTI has 2 years and no measured spread (R only, described).
- Weekly / monthly level splits are small.
