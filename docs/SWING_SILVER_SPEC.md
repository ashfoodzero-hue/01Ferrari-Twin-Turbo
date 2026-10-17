# Swing study, Phase 3C: silver (and DXY) as extra evidence on top of the ladder, pre-registered 2026-10-17

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "yes write the rules for silver as extra evidence"

**What we have (book §5B-5C):**
- **The ladder:** the gold timeframe one step below confirming at the exact same extreme makes the anchor swing real 60-83 % of the time (base 36-49 %).
- **Phase 3C:** silver agreed with real gold swings far more than with failed ones (53-63 % vs 14-23 %), but that was a HINDSIGHT match (±3 candles, including later ones).

**Question:** if silver has ALREADY CONFIRMED its own same-direction swing at the moment gold's ladder flips, is the gold swing more likely to be real? The same question is asked for DXY's opposite swing.

## 1. Data and events

- **Gold events:** exactly Phase 3 / 3B. Anchors 15m, 1H, 4H, 1D; real swings + failed extremes, both sides; 2013-07-14 → 2026-10-09 06:00 UTC; OOS from 2021-06-23.
- **Ladder:** gold one step below (5m / 30m / 3H / 9H) confirmed at the exact same extreme. Known at the close of its confirming candle t_X.
- **Silver:** XAGUSD and **DXY** (rebuilt from 6 pairs), on the same candle clock as gold; 3× ATR ZigZag swings on the anchor timeframe AND on the one-step-below timeframe.
- **Holes:** each symbol has its own data holes, which are breaks. A gold candidate whose silver / DXY data is missing in the window is excluded from that series' cells, and the excluded n is reported.

## 2. Signs (fixed definitions)

- **SILVER-anchor:** a silver swing of the SAME direction (low for a gold low) on the anchor timeframe:
  - its extreme lies within ±3 anchor candles of gold's extreme candle;
  - it was CONFIRMED (the close of its confirming candle) at or before the decision moment.
- **SILVER-step:** the same, using silver's one-step-below timeframe (same extreme window, ±3 ANCHOR candles).
- **DXY-anchor / DXY-step:** the same for DXY's OPPOSITE swing (a high for a gold low).

## 3. The two questions

### A. At the moment gold's ladder flips (T* = t_X)

Among candidates still undecided at t_X (the Phase 3B rule), split by whether the sign was already confirmed by t_X:
- **P(real | ladder AND sign)** vs **P(real | ladder AND NOT sign)**;
- both groups share the same decision time, so there is no selection difference.

Cells: SILVER-anchor, SILVER-step, DXY-anchor, DXY-step, SILVER-step AND DXY-step.

### B. Waiting for silver (T* = max(t_X, silver-step confirmation))

Candidates still undecided at T\*. Report:
- P(real), and the change vs the ladder alone (R1);
- n;
- how many candidates had to wait, and for how long (median).

## 4. Statistics (same as Phases 1-3B)

- **TRAIN / OOS.** Every cell is reported with n, P(real), the Wilson interval, both periods, and the lead before the anchor's confirmation (medians only within a cell, observation 23).
- **A FINDING (✅) needs all of these:**
  - A: the OOS two-proportion test (sign vs no sign) passes Holm across the 5 A-cells within anchor × side;
  - the Wilson lower bound of P(real | ladder AND sign) is above the ladder-alone OOS precision;
  - the same direction in TRAIN;
  - n ≥ 30.
- **B is descriptive.**
- **Effect labels** (vs the ladder alone): tiny < 5 pt, moderate 5-10, clear ≥ 10.

## 5. Honest prior

- In Phase 3, DXY and silver's turning extremes came BEFORE gold's only 14-35 % of the time (mostly the same candle or later).
- So "already confirmed when gold's ladder flips" will often be false, and the cells may be small. The report states exactly how often.

## 6. Output

- `data/master/swing_silver_atlas.json`.
- `docs/SWING_SILVER_ATLAS.md`.
- Recorded in full in the study book: a new chapter "Phase 3C", the observations log, and the appendix `docs/swing_book/phase3c_all_rows.csv`.
- Study script: `scripts/study_swing_silver.mjs`.
- Smoke: `smoke_swing_silver.mjs`, with synthetic matches (window ±3 candles, confirmed before / after T\*), plus the consistency check: the ladder-alone cell must reproduce Phase 3 exactly.

## 7. What this is NOT

Not a trade rule. That is Phase 4.
