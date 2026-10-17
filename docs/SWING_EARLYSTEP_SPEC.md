# Swing study, Phase 4D: entering on an EARLIER ladder step (pre-registered 2026-10-17)

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "yes write the rules for the earlier ladder step entry"

**Why.**
- **Phase 4B (book §5F):** the one-step-below sign is right but LATE. Price is already 1.8-2.4 anchor ATRs from the extreme, so the stop beyond the extreme is far and the reward left is small (E2 reward : risk 0.22-0.65).
- **Phase 4C (§5G):** a tighter stop is stopped out by noise.
- **Phase 3 (§5B.3)** measured the alternative: a flip two or three steps below comes EARLIER (nearer the extreme) but is less often real.

| Anchor | flip 3 steps below | flip 2 steps below | flip 1 step below (4B) |
|---|---|---|---|
| 4H lows | 1H: 57 % real, 22 h early | 2H: 72 %, 14 h | 3H: 83 %, 4 h |
| 1H lows | 5m: 47 % (≈ base, no evidence) | 15m: 58 %, 5.3 h | 30m: 76 %, 3 h |
| 15m lows | 1m: 44 % (no evidence) | 3m: 52 %, 1.2 h | 5m: 63 %, 55 min |

**Hypothesis:** an earlier entry with the SAME reasonable stop (beyond the extreme) risks less and leaves more reward, so the lower accuracy may still give positive R after costs. Only R after costs decides.

## 1. Unchanged from Phase 4B (`docs/SWING_TRADE_SPEC.md`)

- **The LIVE causal trigger**, now on the EARLIER timeframe Z: Z just confirmed a swing low at P; the anchor's last CONFIRMED swing is a high (a down-leg); P equals the lowest 1m low since that anchor high (the anchor's running extreme). Shorts mirror this.
- **Entry:** the next 1m open; longs pay the ask (real spread model).
- **Stop beyond the extreme:** P ∓ 0.10 × ATR14(anchor), the reasonable stop. The tighter stops already failed in 4C.
- **Exits:**
  - E1 = 1R;
  - E2 = P ± 3 × ATR14(anchor), the "swing is real" level.
- **Rules carried over:**
  - the time stop is 20 anchor candles;
  - the stop is taken first on a shared minute;
  - a gap through the stop fills at the gap; a gap through the target fills AT the target;
  - one trade at a time per cell.
- **Random control:** 3 per trade, same NY hour and year, same side, same stop and target distances in anchor ATR.
- **Data:** gold spot 1m, 2013-07-14 → 2026-10-09 06:00 UTC; TRAIN = the first 60 %, OOS = the last 40 %.

## 2. The earlier steps (fixed)

| Anchor | Z2 (two steps below) | Z3 (three steps below) |
|---|---|---|
| 15m | 3m | 1m |
| 1H | 15m | 5m |
| 4H | 2H | 1H |
| 1D | 6H | 4H |

Z3 includes timeframes Phase 3 found to carry NO evidence (1m, and 5m for 1H). They are kept because they are the earliest possible entries, and they show whether an "early but blind" entry can pay through its better reward : risk.

## 3. Cells and statistics

- **Cells:** anchors 15m, 1H, 4H × side × step (Z2, Z3) × exit (E1, E2) = **24 cells, K = 24**. 1D is described only.
- **Per cell, both periods:**
  - n, trades per day, WR;
  - mean R, mean $ per trade, profit factor, max drawdown in R;
  - the years;
  - the exit shares;
  - **the median distance from the extreme at entry (anchor ATR), the median risk, the median E2 reward : risk, and the E2 target-hit share** (the live "real" rate).
- **PASS (per cell)** needs all of these:
  - OOS mean R > 0, with a week-block bootstrap lower bound > 0 at α = 0.05 / 24;
  - OOS excess over random > 0, with LB > 0;
  - TRAIN mean R > 0;
  - OOS n ≥ 100 (4H ≥ 30).
- **Head-to-head:** each cell is shown next to Phase 4B's one-step result for the same anchor / side / exit.
- **Consistency check (smoke):** with Z = the one-step-below timeframe, the engine must reproduce Phase 4B exactly.
- **Ashraf's red line:** WR is reported for every cell. A money-passing cell far below his WR lines is flagged, and nothing ships without his decision.

## 4. Output

- `data/master/swing_earlystep.json` and every trade in `data/master/swing_earlystep_trades.csv`.
- The book: a new chapter "Phase 4D", the observations log, and the appendix `docs/swing_book/phase4d_all_trades.csv`.
- Study script: `scripts/study_swing_earlystep.mjs`.
- Smoke: `smoke_swing_earlystep.mjs`.
- **Nothing is wired into the live app.**
