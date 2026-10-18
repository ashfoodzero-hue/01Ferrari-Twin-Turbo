# 3m structure confirmation at the swing tips: XAU, Silver, DXY, WTI (last year)

Generated from `data/master/structure_3m_confirmation.json` (2026-10-18T17:55:34.385Z); rules in `docs/STRUCTURE_3M_CONFIRMATION_SPEC.md`, exact operational choices in the header of `scripts/study_structure_3m.mjs`, proved by `smoke_structure_3m`. Every tip: `docs/swing_book/structure3m/<asset>_<tf>.csv`.

Window 2025-10-16 → 2026-10-16. Anchor swings = exactly the published last-year swing tables (rebuilt and checked equal: **all 16 tables identical**). DXY = TradingView ICE session. Controls = FAILED extremes of the same timeframe (pulled back ≥ 1 ATR, then broken).

**How to read:** "real" = at the real swing tips; "failed" = at tips that looked like a turn and then broke. A pattern helps in real time only if it is clearly MORE common at real tips than at failed ones (✔ = significant after Holm across all 208 comparisons). A pattern that is high at both is just how price moves, not a sign of a real turn.

## 1. The confirmation level, exactly

For a LOW tip the confirmation level is **the last 3m lower high (3-candle pivot) of the leg into the tip**; the swing is confirmed by the **first 3m CLOSE above it**. Mirror for a HIGH tip. Typical numbers at REAL tips (median, P25-P75):

| Timeframe | Asset | Tips | Level distance (anchor ATR) | (3m ATR) | (% of price) | Minutes tip → confirmation | Close beyond (3m ATR) | Confirming body / range | 3m confirmation came BEFORE the anchor swing was confirmed |
|---|---|---|---|---|---|---|---|---|---|
| 15m | XAU | 1199 | 2.06 (1.49-3.04) | 4.4 (3.3-6.1) | 0.45 (0.29-0.74) | 42 (21-78) | 0.34 (0.13-0.69) | 0.72 (0.55-0.85) | 90 % (n 996) |
| 15m | Silver | 1223 | 2.23 (1.54-3.10) | 4.7 (3.4-6.2) | 0.97 (0.61-1.57) | 45 (24-93) | 0.36 (0.16-0.70) | 0.72 (0.55-0.85) | 88 % (n 1019) |
| 15m | DXY | 1356 | 2.07 (1.44-3.00) | 5.1 (3.7-7.0) | 0.08 (0.05-0.13) | 39 (21-78) | 0.45 (0.19-0.85) | 0.98 (0.74-1.00) | 88 % (n 1198) |
| 15m | WTI | 1211 | 2.22 (1.52-3.14) | 4.8 (3.4-6.4) | 0.85 (0.53-1.47) | 45 (24-84) | 0.44 (0.21-0.81) | 0.73 (0.57-0.85) | 87 % (n 1000) |
| 1H | XAU | 284 | 1.26 (0.81-1.94) | 4.7 (3.4-6.6) | 0.55 (0.33-0.95) | 54 (24-135) | 0.33 (0.15-0.70) | 0.73 (0.54-0.85) | 96 % (n 264) |
| 1H | Silver | 313 | 1.30 (0.84-2.04) | 4.9 (3.6-6.9) | 1.26 (0.69-2.15) | 57 (27-150) | 0.38 (0.17-0.70) | 0.75 (0.60-0.85) | 96 % (n 289) |
| 1H | DXY | 331 | 1.10 (0.69-1.84) | 5.7 (3.7-8.1) | 0.09 (0.06-0.18) | 51 (21-99) | 0.47 (0.22-0.88) | 0.99 (0.75-1.00) | 97 % (n 315) |
| 1H | WTI | 323 | 1.21 (0.84-1.97) | 5.0 (3.6-6.9) | 0.99 (0.60-1.80) | 51 (27-120) | 0.45 (0.21-0.83) | 0.74 (0.57-0.86) | 98 % (n 300) |
| 4H | XAU | 80 | 0.80 (0.48-1.16) | 5.5 (4.0-7.3) | 0.72 (0.43-1.33) | 84 (30-327) | 0.33 (0.19-0.73) | 0.76 (0.58-0.85) | 100 % (n 79) |
| 4H | Silver | 66 | 0.64 (0.37-1.08) | 5.0 (3.3-6.6) | 1.37 (0.69-2.87) | 75 (27-249) | 0.33 (0.16-0.73) | 0.77 (0.64-0.85) | 100 % (n 66) |
| 4H | DXY | 82 | 0.59 (0.38-1.10) | 6.2 (4.0-8.4) | 0.12 (0.07-0.20) | 57 (18-111) | 0.40 (0.20-0.93) | 1.00 (0.75-1.00) | 100 % (n 80) |
| 4H | WTI | 75 | 0.64 (0.40-1.14) | 5.0 (3.3-7.3) | 1.08 (0.66-2.05) | 48 (21-114) | 0.35 (0.21-0.82) | 0.75 (0.57-0.87) | 100 % (n 72) |
| 1D | XAU | 13 | 0.38 (0.21-0.80) | 6.2 (4.4-7.6) | 1.13 (0.60-1.86) | 66 (39-420) | 0.72 (0.16-1.69) | 0.77 (0.68-0.81) | 100 % (n 13) |
| 1D | Silver | 15 | 0.28 (0.18-0.44) | 4.4 (3.3-6.5) | 1.27 (0.89-3.10) | 45 (27-141) | 0.36 (0.20-0.80) | 0.73 (0.68-0.81) | 100 % (n 15) |
| 1D | DXY | 10 | 0.33 (0.14-0.41) | 6.5 (3.8-10.5) | 0.13 (0.07-0.20) | 66 (18-84) | 0.60 (0.20-0.93) | 1.00 (0.98-1.00) | 100 % (n 10) |
| 1D | WTI | 13 | 0.27 (0.20-0.46) | 5.0 (4.3-7.5) | 1.33 (0.87-2.44) | 54 (30-174) | 0.28 (0.19-0.49) | 0.80 (0.75-0.90) | 100 % (n 13) |

## 2. Does the 3m confirmation tell a real swing from a failed one? (precision)

| Timeframe | Asset | Real tips | Failed tips | Share real (base) | Confirmed: real | Confirmed: failed | **Precision** (share real among confirmed) | Lift | Audit: EVERY failed extreme (no pullback filter): tips · confirmed · precision |
|---|---|---|---|---|---|---|---|---|---|
| 15m | XAU | 1199 | 1538 | 44 % | 996 | 513 | **66 %** | +22 pp | 5582 · 563 · 64 % |
| 15m | Silver | 1223 | 1530 | 44 % | 1019 | 482 | **68 %** | +23 pp | 5626 · 542 · 65 % |
| 15m | DXY | 1356 | 1714 | 44 % | 1198 | 605 | **66 %** | +22 pp | 6600 · 660 · 64 % |
| 15m | WTI | 1211 | 1670 | 42 % | 1000 | 458 | **69 %** | +27 pp | 5554 · 488 · 67 % |
| 1H | XAU | 284 | 409 | 41 % | 264 | 275 | **49 %** | +8 pp | 1348 · 403 · 40 % |
| 1H | Silver | 313 | 391 | 44 % | 289 | 273 | **51 %** | +7 pp | 1431 · 430 · 40 % |
| 1H | DXY | 331 | 435 | 43 % | 315 | 335 | **48 %** | +5 pp | 1629 · 549 · 36 % |
| 1H | WTI | 323 | 392 | 45 % | 300 | 265 | **53 %** | +8 pp | 1381 · 376 · 44 % |
| 4H | XAU | 80 | 97 | 45 % | 79 | 82 | **49 %** | +4 pp | 357 · 175 · 31 % |
| 4H | Silver | 66 | 106 | 38 % | 66 | 98 | **40 %** | +2 pp | 403 · 219 · 23 % |
| 4H | DXY | 82 | 104 | 44 % | 80 | 96 | **45 %** | +1 pp | 379 · 233 · 26 % |
| 4H | WTI | 75 | 113 | 40 % | 72 | 98 | **42 %** | +2 pp | 386 · 212 · 25 % |
| 1D | XAU | 13 | 18 | 42 % | 13 | 18 | **42 %** | +0 pp | 67 · 50 · 21 % |
| 1D | Silver | 15 | 16 | 48 % | 15 | 16 | **48 %** | +0 pp | 71 · 54 · 22 % |
| 1D | DXY | 10 | 21 | 32 % | 10 | 21 | **32 %** | +0 pp | 63 · 56 · 15 % |
| 1D | WTI | 13 | 15 | 46 % | 13 | 15 | **46 %** | +0 pp | 68 · 54 · 19 % |

The audit column is the real-time view: at the moment a 3m confirmation prints, every running extreme that got one is a candidate, whatever its later pullback.

## 3. How it works at the tip: every pattern, real vs failed, four assets

### 15m

| Pattern | XAU real / failed | Silver real / failed | DXY real / failed | WTI real / failed |
|---|---|---|---|---|
| A 3m confirmation level exists in the leg | 100 % / 100 % <sub>n 1199/1538</sub> | 100 % / 100 % <sub>n 1223/1530</sub> | 100 % / 100 % <sub>n 1356/1714</sub> | 100 % / 100 % <sub>n 1211/1670</sub> |
| The level was already a confirmed 3m pivot when the tip printed | 91 % / 91 % <sub>n 1199/1538</sub> | 91 % / 91 % <sub>n 1223/1530</sub> | 91 % / 90 % <sub>n 1356/1714</sub> | 90 % / 89 % <sub>n 1211/1670</sub> |
| Tip = liquidity sweep of the previous 3m pivot (closes back inside) | 21 % / 21 % <sub>n 1199/1538</sub> | 19 % / 20 % <sub>n 1223/1530</sub> | 16 % / 15 % <sub>n 1356/1714</sub> | 18 % / 18 % <sub>n 1211/1670</sub> |
| 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles) | 83 % / 33 % ✔ <sub>n 1199/1538</sub> | 83 % / 32 % ✔ <sub>n 1223/1530</sub> | 88 % / 35 % ✔ <sub>n 1356/1714</sub> | 83 % / 27 % ✔ <sub>n 1211/1670</sub> |
| A wick went through the level before the confirming close | 40 % / 44 % <sub>n 996/513</sub> | 43 % / 43 % <sub>n 1019/482</sub> | 26 % / 22 % <sub>n 1198/605</sub> | 44 % / 45 % <sub>n 1000/458</sub> |
| V-turn (no 3m higher low / lower high before confirmation) | 43 % / 57 % ✖ <sub>n 996/513</sub> | 40 % / 63 % ✖ <sub>n 1019/482</sub> | 48 % / 68 % ✖ <sub>n 1198/605</sub> | 44 % / 61 % ✖ <sub>n 1000/458</sub> |
| 3m higher low / lower high formed before confirmation | 57 % / 43 % ✔ <sub>n 996/513</sub> | 60 % / 37 % ✔ <sub>n 1019/482</sub> | 52 % / 32 % ✔ <sub>n 1198/605</sub> | 56 % / 39 % ✔ <sub>n 1000/458</sub> |
| Double tip (second test within 0.25 anchor ATR) | 16 % / 16 % <sub>n 996/513</sub> | 16 % / 16 % <sub>n 1019/482</sub> | 15 % / 13 % <sub>n 1198/605</sub> | 14 % / 15 % <sub>n 1000/458</sub> |
| Strong confirming candle (body ≥ 60 %, close in top 25 %) | 61 % / 63 % <sub>n 996/513</sub> | 63 % / 61 % <sub>n 1019/482</sub> | 80 % / 80 % <sub>n 1198/605</sub> | 63 % / 60 % <sub>n 1000/458</sub> |
| Price came back to the level after confirmation | 85 % / 93 % ✖ <sub>n 996/513</sub> | 82 % / 93 % ✖ <sub>n 1019/482</sub> | 78 % / 93 % ✖ <sub>n 1198/605</sub> | 80 % / 95 % ✖ <sub>n 1000/458</sub> |
| The retest HELD (no 3m close back through the level) | 17 % / 4 % ✔ <sub>n 846/478</sub> | 17 % / 7 % ✔ <sub>n 838/447</sub> | 14 % / 4 % ✔ <sub>n 932/562</sub> | 22 % / 6 % ✔ <sub>n 803/433</sub> |
| Second confirmation (next 3m pivot closed through) before the tip broke | 77 % / 28 % ✔ <sub>n 996/513</sub> | 74 % / 29 % ✔ <sub>n 1019/482</sub> | 80 % / 28 % ✔ <sub>n 1198/605</sub> | 76 % / 22 % ✔ <sub>n 1000/458</sub> |
| After confirmation: 1:1 extension reached before the tip broke | 59 % / 19 % ✔ <sub>n 996/513</sub> | 60 % / 25 % ✔ <sub>n 1019/482</sub> | 64 % / 22 % ✔ <sub>n 1198/605</sub> | 62 % / 17 % ✔ <sub>n 1000/458</sub> |

✔ = significantly MORE common at real tips; ✖ = significantly LESS common at real tips (Holm).

### 1H

| Pattern | XAU real / failed | Silver real / failed | DXY real / failed | WTI real / failed |
|---|---|---|---|---|
| A 3m confirmation level exists in the leg | 100 % / 100 % <sub>n 284/409</sub> | 100 % / 100 % <sub>n 313/391</sub> | 100 % / 100 % <sub>n 331/435</sub> | 100 % / 100 % <sub>n 323/392</sub> |
| The level was already a confirmed 3m pivot when the tip printed | 90 % / 91 % <sub>n 284/409</sub> | 89 % / 92 % <sub>n 313/391</sub> | 90 % / 93 % <sub>n 331/435</sub> | 91 % / 90 % <sub>n 323/392</sub> |
| Tip = liquidity sweep of the previous 3m pivot (closes back inside) | 21 % / 17 % <sub>n 284/409</sub> | 21 % / 20 % <sub>n 313/391</sub> | 14 % / 14 % <sub>n 331/435</sub> | 16 % / 19 % <sub>n 323/392</sub> |
| 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles) | 93 % / 67 % ✔ <sub>n 284/409</sub> | 92 % / 70 % ✔ <sub>n 313/391</sub> | 95 % / 77 % ✔ <sub>n 331/435</sub> | 93 % / 68 % ✔ <sub>n 323/392</sub> |
| A wick went through the level before the confirming close | 39 % / 46 % <sub>n 264/275</sub> | 44 % / 45 % <sub>n 289/273</sub> | 24 % / 25 % <sub>n 315/335</sub> | 40 % / 48 % <sub>n 300/265</sub> |
| V-turn (no 3m higher low / lower high before confirmation) | 38 % / 39 % <sub>n 264/275</sub> | 38 % / 39 % <sub>n 289/273</sub> | 40 % / 49 % <sub>n 315/335</sub> | 40 % / 46 % <sub>n 300/265</sub> |
| 3m higher low / lower high formed before confirmation | 62 % / 61 % <sub>n 264/275</sub> | 62 % / 61 % <sub>n 289/273</sub> | 60 % / 51 % <sub>n 315/335</sub> | 60 % / 54 % <sub>n 300/265</sub> |
| Double tip (second test within 0.25 anchor ATR) | 28 % / 32 % <sub>n 264/275</sub> | 29 % / 30 % <sub>n 289/273</sub> | 27 % / 31 % <sub>n 315/335</sub> | 25 % / 33 % <sub>n 300/265</sub> |
| Strong confirming candle (body ≥ 60 %, close in top 25 %) | 60 % / 63 % <sub>n 264/275</sub> | 69 % / 55 % <sub>n 289/273</sub> | 82 % / 79 % <sub>n 315/335</sub> | 63 % / 61 % <sub>n 300/265</sub> |
| Price came back to the level after confirmation | 84 % / 92 % <sub>n 264/275</sub> | 83 % / 89 % <sub>n 289/273</sub> | 82 % / 85 % <sub>n 315/335</sub> | 84 % / 90 % <sub>n 300/265</sub> |
| The retest HELD (no 3m close back through the level) | 17 % / 12 % <sub>n 223/252</sub> | 18 % / 11 % <sub>n 240/244</sub> | 12 % / 12 % <sub>n 258/284</sub> | 22 % / 12 % <sub>n 252/238</sub> |
| Second confirmation (next 3m pivot closed through) before the tip broke | 94 % / 67 % ✔ <sub>n 264/275</sub> | 91 % / 68 % ✔ <sub>n 289/273</sub> | 96 % / 67 % ✔ <sub>n 315/335</sub> | 95 % / 57 % ✔ <sub>n 300/265</sub> |
| After confirmation: 1:1 extension reached before the tip broke | 78 % / 42 % ✔ <sub>n 264/275</sub> | 80 % / 48 % ✔ <sub>n 289/273</sub> | 81 % / 50 % ✔ <sub>n 315/335</sub> | 79 % / 43 % ✔ <sub>n 300/265</sub> |

✔ = significantly MORE common at real tips; ✖ = significantly LESS common at real tips (Holm).

### 4H

| Pattern | XAU real / failed | Silver real / failed | DXY real / failed | WTI real / failed |
|---|---|---|---|---|
| A 3m confirmation level exists in the leg | 100 % / 100 % <sub>n 80/97</sub> | 100 % / 100 % <sub>n 66/106</sub> | 100 % / 100 % <sub>n 82/104</sub> | 100 % / 100 % <sub>n 75/113</sub> |
| The level was already a confirmed 3m pivot when the tip printed | 93 % / 91 % <sub>n 80/97</sub> | 85 % / 91 % <sub>n 66/106</sub> | 93 % / 89 % <sub>n 82/104</sub> | 88 % / 88 % <sub>n 75/113</sub> |
| Tip = liquidity sweep of the previous 3m pivot (closes back inside) | 16 % / 19 % <sub>n 80/97</sub> | 17 % / 19 % <sub>n 66/106</sub> | 13 % / 14 % <sub>n 82/104</sub> | 19 % / 13 % <sub>n 75/113</sub> |
| 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles) | 99 % / 85 % <sub>n 80/97</sub> | 100 % / 92 % <sub>n 66/106</sub> | 98 % / 92 % <sub>n 82/104</sub> | 96 % / 87 % <sub>n 75/113</sub> |
| A wick went through the level before the confirming close | 32 % / 46 % <sub>n 79/82</sub> | 47 % / 46 % <sub>n 66/98</sub> | 23 % / 21 % <sub>n 80/96</sub> | 28 % / 41 % <sub>n 72/98</sub> |
| V-turn (no 3m higher low / lower high before confirmation) | 27 % / 41 % <sub>n 79/82</sub> | 39 % / 35 % <sub>n 66/98</sub> | 40 % / 41 % <sub>n 80/96</sub> | 44 % / 39 % <sub>n 72/98</sub> |
| 3m higher low / lower high formed before confirmation | 73 % / 59 % <sub>n 79/82</sub> | 61 % / 65 % <sub>n 66/98</sub> | 60 % / 59 % <sub>n 80/96</sub> | 56 % / 61 % <sub>n 72/98</sub> |
| Double tip (second test within 0.25 anchor ATR) | 43 % / 34 % <sub>n 79/82</sub> | 44 % / 50 % <sub>n 66/98</sub> | 38 % / 45 % <sub>n 80/96</sub> | 36 % / 50 % <sub>n 72/98</sub> |
| Strong confirming candle (body ≥ 60 %, close in top 25 %) | 66 % / 60 % <sub>n 79/82</sub> | 71 % / 54 % <sub>n 66/98</sub> | 80 % / 86 % <sub>n 80/96</sub> | 60 % / 69 % <sub>n 72/98</sub> |
| Price came back to the level after confirmation | 85 % / 85 % <sub>n 79/82</sub> | 82 % / 83 % <sub>n 66/98</sub> | 79 % / 81 % <sub>n 80/96</sub> | 81 % / 89 % <sub>n 72/98</sub> |
| The retest HELD (no 3m close back through the level) | 21 % / 14 % <sub>n 67/70</sub> | 15 % / 15 % <sub>n 54/81</sub> | 16 % / 13 % <sub>n 63/78</sub> | 19 % / 22 % <sub>n 58/87</sub> |
| Second confirmation (next 3m pivot closed through) before the tip broke | 97 % / 91 % <sub>n 79/82</sub> | 98 % / 88 % <sub>n 66/98</sub> | 98 % / 94 % <sub>n 80/96</sub> | 100 % / 87 % <sub>n 72/98</sub> |
| After confirmation: 1:1 extension reached before the tip broke | 92 % / 68 % ✔ <sub>n 79/82</sub> | 91 % / 69 % <sub>n 66/98</sub> | 93 % / 73 % <sub>n 80/96</sub> | 99 % / 69 % ✔ <sub>n 72/98</sub> |

✔ = significantly MORE common at real tips; ✖ = significantly LESS common at real tips (Holm).

### 1D (10-15 swings per asset: described only, cannot be proven)

| Pattern | XAU real / failed | Silver real / failed | DXY real / failed | WTI real / failed |
|---|---|---|---|---|
| A 3m confirmation level exists in the leg | 100 % / 100 % <sub>n 13/18</sub> | 100 % / 100 % <sub>n 15/16</sub> | 100 % / 100 % <sub>n 10/21</sub> | 100 % / 100 % <sub>n 13/15</sub> |
| The level was already a confirmed 3m pivot when the tip printed | 100 % / 83 % <sub>n 13/18</sub> | 87 % / 81 % <sub>n 15/16</sub> | 80 % / 100 % <sub>n 10/21</sub> | 92 % / 87 % <sub>n 13/15</sub> |
| Tip = liquidity sweep of the previous 3m pivot (closes back inside) | 8 % / 17 % <sub>n 13/18</sub> | 27 % / 19 % <sub>n 15/16</sub> | 10 % / 10 % <sub>n 10/21</sub> | 15 % / 27 % <sub>n 13/15</sub> |
| 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles) | 100 % / 100 % <sub>n 13/18</sub> | 100 % / 100 % <sub>n 15/16</sub> | 100 % / 100 % <sub>n 10/21</sub> | 100 % / 100 % <sub>n 13/15</sub> |
| A wick went through the level before the confirming close | 38 % / 17 % <sub>n 13/18</sub> | 27 % / 44 % <sub>n 15/16</sub> | 20 % / 33 % <sub>n 10/21</sub> | 31 % / 20 % <sub>n 13/15</sub> |
| V-turn (no 3m higher low / lower high before confirmation) | 23 % / 22 % <sub>n 13/18</sub> | 40 % / 44 % <sub>n 15/16</sub> | 30 % / 33 % <sub>n 10/21</sub> | 23 % / 53 % <sub>n 13/15</sub> |
| 3m higher low / lower high formed before confirmation | 77 % / 78 % <sub>n 13/18</sub> | 60 % / 56 % <sub>n 15/16</sub> | 70 % / 67 % <sub>n 10/21</sub> | 77 % / 47 % <sub>n 13/15</sub> |
| Double tip (second test within 0.25 anchor ATR) | 62 % / 72 % <sub>n 13/18</sub> | 47 % / 69 % <sub>n 15/16</sub> | 50 % / 57 % <sub>n 10/21</sub> | 77 % / 40 % <sub>n 13/15</sub> |
| Strong confirming candle (body ≥ 60 %, close in top 25 %) | 77 % / 72 % <sub>n 13/18</sub> | 73 % / 69 % <sub>n 15/16</sub> | 80 % / 86 % <sub>n 10/21</sub> | 77 % / 67 % <sub>n 13/15</sub> |
| Price came back to the level after confirmation | 77 % / 83 % <sub>n 13/18</sub> | 87 % / 81 % <sub>n 15/16</sub> | 60 % / 86 % <sub>n 10/21</sub> | 85 % / 73 % <sub>n 13/15</sub> |
| The retest HELD (no 3m close back through the level) | 30 % / 13 % <sub>n 10/15</sub> | 15 % / 8 % <sub>n 13/13</sub> | 17 % / 11 % <sub>n 6/18</sub> | 0 % / 18 % <sub>n 11/11</sub> |
| Second confirmation (next 3m pivot closed through) before the tip broke | 100 % / 100 % <sub>n 13/18</sub> | 100 % / 94 % <sub>n 15/16</sub> | 100 % / 100 % <sub>n 10/21</sub> | 100 % / 100 % <sub>n 13/15</sub> |
| After confirmation: 1:1 extension reached before the tip broke | 100 % / 94 % <sub>n 13/18</sub> | 93 % / 88 % <sub>n 15/16</sub> | 100 % / 90 % <sub>n 10/21</sub> | 100 % / 100 % <sub>n 13/15</sub> |

✔ = significantly MORE common at real tips; ✖ = significantly LESS common at real tips (Holm).

## 4. What is in common with a high % (≥ 80 % at real tips in ALL four assets)

- **15m:** A 3m confirmation level exists in the leg: real 100 % / 100 % / 100 % / 100 %; failed 100 % / 100 % / 100 % / 100 %; separates real from failed in 0/4 assets; The level was already a confirmed 3m pivot when the tip printed: real 91 % / 91 % / 91 % / 90 %; failed 91 % / 91 % / 90 % / 89 %; separates real from failed in 0/4 assets; 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles): real 83 % / 83 % / 88 % / 83 %; failed 33 % / 32 % / 35 % / 27 %; separates real from failed in 4/4 assets
- **1H:** A 3m confirmation level exists in the leg: real 100 % / 100 % / 100 % / 100 %; failed 100 % / 100 % / 100 % / 100 %; separates real from failed in 0/4 assets; The level was already a confirmed 3m pivot when the tip printed: real 90 % / 89 % / 90 % / 91 %; failed 91 % / 92 % / 93 % / 90 %; separates real from failed in 0/4 assets; 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles): real 93 % / 92 % / 95 % / 93 %; failed 67 % / 70 % / 77 % / 68 %; separates real from failed in 4/4 assets; Price came back to the level after confirmation: real 84 % / 83 % / 82 % / 84 %; failed 92 % / 89 % / 85 % / 90 %; separates real from failed in 0/4 assets; Second confirmation (next 3m pivot closed through) before the tip broke: real 94 % / 91 % / 96 % / 95 %; failed 67 % / 68 % / 67 % / 57 %; separates real from failed in 4/4 assets
- **4H:** A 3m confirmation level exists in the leg: real 100 % / 100 % / 100 % / 100 %; failed 100 % / 100 % / 100 % / 100 %; separates real from failed in 0/4 assets; The level was already a confirmed 3m pivot when the tip printed: real 93 % / 85 % / 93 % / 88 %; failed 91 % / 91 % / 89 % / 88 %; separates real from failed in 0/4 assets; 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles): real 99 % / 100 % / 98 % / 96 %; failed 85 % / 92 % / 92 % / 87 %; separates real from failed in 0/4 assets; Second confirmation (next 3m pivot closed through) before the tip broke: real 97 % / 98 % / 98 % / 100 %; failed 91 % / 88 % / 94 % / 87 %; separates real from failed in 0/4 assets; After confirmation: 1:1 extension reached before the tip broke: real 92 % / 91 % / 93 % / 99 %; failed 68 % / 69 % / 73 % / 69 %; separates real from failed in 2/4 assets
- **1D:** A 3m confirmation level exists in the leg: real 100 % / 100 % / 100 % / 100 %; failed 100 % / 100 % / 100 % / 100 %; separates real from failed in 0/4 assets; The level was already a confirmed 3m pivot when the tip printed: real 100 % / 87 % / 80 % / 92 %; failed 83 % / 81 % / 100 % / 87 %; separates real from failed in 0/4 assets; 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles): real 100 % / 100 % / 100 % / 100 %; failed 100 % / 100 % / 100 % / 100 %; separates real from failed in 0/4 assets; Second confirmation (next 3m pivot closed through) before the tip broke: real 100 % / 100 % / 100 % / 100 %; failed 100 % / 94 % / 100 % / 100 %; separates real from failed in 0/4 assets; After confirmation: 1:1 extension reached before the tip broke: real 100 % / 93 % / 100 % / 100 %; failed 94 % / 88 % / 90 % / 100 %; separates real from failed in 0/4 assets

## 5. Do they act the same? Every significant difference between assets (real tips, Holm across all 312 comparisons)

| Timeframe | Pattern | Asset A | Asset B | Difference | p (Holm) |
|---|---|---|---|---|---|
| 15m | Strong confirming candle (body ≥ 60 %, close in top 25 %) | XAU 61 % (n 996) | DXY 80 % (n 1198) | -19 pp | 0.000 |
| 15m | A wick went through the level before the confirming close | DXY 26 % (n 1198) | WTI 44 % (n 1000) | -18 pp | 0.000 |
| 15m | Strong confirming candle (body ≥ 60 %, close in top 25 %) | DXY 80 % (n 1198) | WTI 63 % (n 1000) | +18 pp | 0.000 |
| 15m | A wick went through the level before the confirming close | Silver 43 % (n 1019) | DXY 26 % (n 1198) | +17 pp | 0.000 |
| 15m | Strong confirming candle (body ≥ 60 %, close in top 25 %) | Silver 63 % (n 1019) | DXY 80 % (n 1198) | -17 pp | 0.000 |
| 15m | A wick went through the level before the confirming close | XAU 40 % (n 996) | DXY 26 % (n 1198) | +14 pp | 0.000 |
| 15m | V-turn (no 3m higher low / lower high before confirmation) | Silver 40 % (n 1019) | DXY 48 % (n 1198) | -9 pp | 0.017 |
| 15m | 3m higher low / lower high formed before confirmation | Silver 60 % (n 1019) | DXY 52 % (n 1198) | +9 pp | 0.017 |
| 15m | The retest HELD (no 3m close back through the level) | DXY 14 % (n 932) | WTI 22 % (n 803) | -8 pp | 0.003 |
| 15m | Price came back to the level after confirmation | XAU 85 % (n 996) | DXY 78 % (n 1198) | +7 pp | 0.006 |
| 15m | 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles) | DXY 88 % (n 1356) | WTI 83 % (n 1211) | +6 pp | 0.010 |
| 15m | 3m close beyond the level BEFORE the tip breaks (within 20 anchor candles) | XAU 83 % (n 1199) | DXY 88 % (n 1356) | -5 pp | 0.039 |
| 1H | Strong confirming candle (body ≥ 60 %, close in top 25 %) | XAU 60 % (n 264) | DXY 82 % (n 315) | -21 pp | 0.000 |
| 1H | A wick went through the level before the confirming close | Silver 44 % (n 289) | DXY 24 % (n 315) | +20 pp | 0.000 |
| 1H | Strong confirming candle (body ≥ 60 %, close in top 25 %) | DXY 82 % (n 315) | WTI 63 % (n 300) | +19 pp | 0.000 |
| 1H | A wick went through the level before the confirming close | DXY 24 % (n 315) | WTI 40 % (n 300) | -16 pp | 0.007 |
| 1H | A wick went through the level before the confirming close | XAU 39 % (n 264) | DXY 24 % (n 315) | +15 pp | 0.023 |

- **XAU, Silver and WTI against each other: 0 significant differences**: they act the same at the tip.
- **Every difference involves DXY.** 11 of 17 are candle shape / wick items. They are a DATA effect, not behaviour: DXY minutes are rebuilt from 6 pairs with no intra-minute wick, so the median confirming body / range is 0.98 for DXY vs 0.72 XAU, 0.72 Silver, 0.73 WTI (15m).

17 of 312 asset-pair comparisons differ significantly; everything else is statistically the same behaviour. Pairs with n < 30 on either side rarely reach significance (low power), so "same" on 1D means "not distinguishable", not "proven equal".

## Honest limits

- The anchor swing is known only afterwards: sections 1 and 3 (real column) describe what happened at real tips. Only the real-vs-failed comparison and the precision table say what a trader could use at the moment.
- DXY minutes are rebuilt from 6 pairs (no real intra-minute wicks), so its 3m wicks are smoother.
- One year only. No trade rule is proposed here.
