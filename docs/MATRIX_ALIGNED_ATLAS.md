# Matrix SCALP — structure / wall alignment + the 92 % WR search: RESULTS (2026-10-22)

Spec: `docs/MATRIX_ALIGNED_SPEC.md` (+ ADDENDUM A definitions, ADDENDUM B 92 % search), every part written and committed before its numbers.
Code: `scripts/lib/matrix_aligned.mjs` (ONE place), `scripts/study_matrix_aligned.mjs` → `data/master/matrix_aligned_study.json`,
`scripts/study_matrix_wr92.mjs` → `data/master/matrix_wr92_study.json`, `scripts/audit_matrix_aligned.mjs`. Tape to 2026-10-21 21:00 UTC.
Money = the live box resolver (`resolveMatrixTrade`: fill + measured spread, slip, stop first, 24 h). $ per oz per trade. WR = trades with $ > 0 / all.

**Ashraf:** "we did not take short trades … buy trades keeps running but with taking the correct structure and time on the correct wall levels" · "make sure
you do not make errors with buy setting only fix the failing errors" · "we need to avoid losing trades" · "keep my 92% WR for both buy/sell … checking the
scalp until you reach 92% WR in both buy and sell".

## Verdict
- **Study 1 (K = 7): 0 pass.** No BUY filter removes the losers in both periods; every structure-aligned SELL loses on 13 y.
- **Study 2 — 92 % WR (K = 96): 0 pass on BUY, 0 pass on SELL.** No cell has $ > 0 in both TRAIN and OOS.
  - SELL can reach 92 % WR (tiny target 0.10 × risk, stop 4 × risk) — but loses money: S1 13 y **92.4 % WR, −$0.245/t** (n 759); S2 13 y 93.2 %, −$0.21/t (n 355).
  - BUY never reaches 92 %: best 13 y WR 53 % (B1 0.25R/4R, −$0.44/t); best OOS 2 y 79.8 % (B2 0.25R/4R), best TRAIN 77.5 % (B4 0.25R/4R) — all with $/t < 0. A BUY pays the ask: a target smaller
    than the spread (≈ $0.45) cannot end in profit, so tiny targets lower the BUY WR instead of raising it.
- **Audit CLEAN:** independent resolver 200 random trades 0 diff (172 BUY / 28 SELL); structure state full-history = live 45-day window, 50 cuts per TF,
  1H 0 diff, 4H 0 diff; positive control (oracle SELL) n 290, +$11.44/t. Parity: study "red + DXY, no structure" = `matrixSignals` red SELLs (561 = 561, identical).

## Study 1 — BUY filters on the V1H book (PRIMARY 2 y, split 2025-12-26)
| Cell | TRAIN removed / kept $/t | OOS removed / kept $/t | Book $/t TRAIN · OOS (V1H −0.029 · −0.754) | 13 y signs | Pass |
|---|---|---|---|---|---|
| B1 4H not DOWN | **+0.203** / −0.095 (removed were BETTER) | −1.543 / −0.256 | −0.104 · −0.250 | all 4 ✓ | ✗ (TRAIN reversed) |
| B2 1H UP + 4H UP | +0.043 / −0.338 | −0.727 / −0.918 | −0.287 · −1.029 | 2 of 4 | ✗ |
| B3 floor wall only | −0.055 / +0.490 | −0.729 / −1.168 | −0.038 · −0.775 | 1 of 4 | ✗ |
| B4 internal wall only | +0.490 / −0.055 | −1.168 / −0.729 | −0.017 · −0.632 | 3 of 4 | ✗ |

B1 is the closest (it helps in the OOS 2 y and in 13 y) but the 2024-25 TRAIN half says the opposite — the same failure as V4H on 10-20.

## Study 1 — structure-aligned SELLs (1H DOWN + 4H DOWN at the SELL wall)
| Rule | 2 y TRAIN n · $/t | 2 y OOS n · $/t (LB) | 13 y n · $/t | no-structure control 13 y $/t |
|---|---|---|---|---|
| S1 red candle | 21 · −0.892 | 67 · +0.053 (−2.62) | 692 · −0.307 | −0.385 |
| S2 red + DXY bullish | 2 · −1.041 | 30 · +0.600 (−3.29) | 319 · −0.278 | −0.275 |
| S3 close below 3m swing low | 0 | 1 · −10.30 | 9 · −1.99 | −2.09 |

## Study 2 — the 92 % WR search (closest cells)
| Side · cell | 2 y TRAIN n · WR · $/t | 2 y OOS n · WR · $/t | 13 y n · WR · $/t | Missed |
|---|---|---|---|---|
| SELL S1 0.10R/4R | 18 · 77.8 % · −1.22 | 54 · **94.4 %** · −0.26 | 759 · **92.4 %** · −0.245 | TRAIN WR, money everywhere |
| SELL S2 0.10R/4R | 2 · 100 % · +0.10 | 27 · 96.3 % · −0.33 | 355 · 93.2 % · −0.21 | n, money |
| BUY B2 0.25R/3R | 464 · 75.7 % · −0.40 | 234 · 78.6 % · −0.40 | 5,178 · 52.3 % · −0.45 | WR, money |
| BUY B1 0.25R/4R | 1,943 · 77.5 % · −0.45 | 1,028 · 73.4 % · −0.46 | 22,712 · 53.2 % · −0.44 | WR, money |

**Why 92 % does not come with money here:** at 92 % WR one loss (a 4 × risk stop) costs ~16-40 times one win (0.10-0.25 × risk minus the spread);
the measured win sizes after the spread do not cover the losses. WR is a price (memory: [WR is a PRICE]).

## Already measured, not repeated
Time of day (session) no lift — loss autopsy §7 (bs). 4H-only gate V4H failed — §7 (df). EMA-trend SELLs 0/12 — §7 (bi). Red-candle SELL at the wall −$0.34/t 13 y — §7 (as).
