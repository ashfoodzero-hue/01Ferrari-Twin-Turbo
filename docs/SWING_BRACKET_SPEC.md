# SWING TRADE arm 1 with a REASONABLE stop (pre-registered 2026-10-16)

**Request (Ashraf):** "the SL must be reasonable" → chose "Reasonable SL, honest WR".

**Why.** Arm 1 (BUY_D1-x, forward test) uses target 0.2 D / stop 2 D (D = daily ATR14 ≈ $74 → stop ≈ $148). Its 92 % WR is mostly bracket geometry: random entries already win 82-93 % (INVESTIGATION Part 4).

## Signals (arm 1's own, unchanged)

- The walk-forward OOS scores of BUY_D1-x (`data/inv90/scores_BUY_D1_x.bin`, aligned to `dataset_times.bin`; each year is scored by a model trained on earlier years only), 2016 → 2026-10-09.
- Fire where score ≥ 0.9394 (the frozen arm-1 threshold).
- D1 policy: ≤ 5 open, ≤ 5 new per day, ≥ 1 h between entries.

## Trade

- **Entry:** BUY at the decision bar time, at the 1m close + the measured spread.
- **D:** ATR14 of the last CLOSED UTC daily bar (as `forward_buyd1.mjs`).
- **Exits:** stop first inside a minute; stop slippage min($0.30, 0.05 × D); a 7-day horizon, then a market exit.

| Bracket | Target / stop |
|---|---|
| E0 | 0.2 D / 2 D (the arm today — reference, must reproduce ~90 %+ WR) |
| **E1** | 0.5 D / 0.5 D |
| **E2** | 1 D / 0.5 D |
| **E3** | 0.5 D / 1 D |
| **E4** | 1 D / 1 D |

## Verdict (K = 4: E1-E4)

- **Split:** TRAIN = trades before 2022-01-01; OOS = from 2022-01-01.
- **KEEP** ⇔ all of these hold:
  - OOS n ≥ 100;
  - OOS mean $ / trade > 0 with bootstrap LB at α/4 > 0;
  - TRAIN mean $ / trade > 0.
- **Reported:** WR, R / trade, trades / day, per-year $, max consecutive losses.
- A bracket that is KEPT replaces arm 1's bracket only on Ashraf's approval; otherwise the arm stays as it is.

Study: `scripts/study_swing_bracket.mjs` → `data/master/swing_bracket_study.json`.
