# SWING SELL E0 SPEC: the E0 bracket on the SELL_D1 model. Pre-registered 2026-10-30 BEFORE any number

**The request (Ashraf, 10-30):** "check how we can get trades fired 89 % WR and above" → "for both sell/buy" → "then do it, i want to trade now, i am losing money now, i need trades and winning ones" → "Do it here".

**What is already known (measured, not repeated here):**
- The SELL_D1 model (`data/inv90/scores_SELL_D1_x.bin`, walk-forward scores 2016 →) has pooled OOS AUC 0.505. With 400 trees: 0.505 vs the BUY model's 0.52.
- No SELL threshold qualified at 92 % or at 90 % (INVESTIGATION_90WR, best 82.7 %).

**The ONE thing never tested:** the E0 bracket (target 0.2 × daily ATR, stop 2 × daily ATR) applied to SELL signals. E0 is what lifted the BUY arm to 92.0 % WR with +$3.30 a trade OOS. It was added on 10-28, after the SELL work.

## Rule (a mirror of `scripts/study_swing_bracket.mjs` E0, the BUY reference)

**Signals.** 15m dataset bars (`dataset_times.bin`) with SELL_D1_x score ≥ threshold; same span and cut-off as the BUY study (`TO` = 2026-10-09 06:00 UTC − 8 days).

**Thresholds (K = 3, fixed now).** Taken from the TRAIN-period (< 2022-01-01) SELL score distribution:

| cell | selection rate | why |
|---|---|---|
| Q1 | 4.635 % | the BUY arm's own TRAIN selection rate (6,371 / 137,441 bars at 0.9394) |
| Q2 | 2 × 4.635 % | looser, for more trades |
| Q3 | 0.5 × 4.635 % | stricter |

**Fill.** SELL at the bid close of the minute before the signal time (spot `c` = bid).
- **Target:** entry − 0.2 × ATR1d. Filled when the ASK low (bid low + measured spread) ≤ target.
- **Stop:** entry + 2 × ATR1d. Hit when the ASK high (bid high + spread) ≥ stop, with slip min(0.3, 0.05 × ATR1d).
- **Same-minute order:** the stop is checked first (conservative).
- **Time-out:** 7 days, exit at the ask close.
- ATR1d = daily ATR(14) of the previous closed day. Spread = `spreadModel.makeSpreadAt`.

**Policy (same as BUY):** ≥ 1 h apart, ≤ 5 trades per day, ≤ 5 open.

**Random control.** 5 draws of random SELL entries: the same number of bars, the same span, the same policy and bracket.

## PASS (Ashraf's bar: 89 %, plus money)

All of these must hold in a cell:
1. OOS (≥ 2022) n ≥ 100;
2. OOS WR ≥ 0.89;
3. OOS $/trade > 0 AND its bootstrap LB > 0 (α = 0.05 / 3);
4. TRAIN $/trade > 0;
5. model − random SELL $/trade > 0 in OOS AND in TRAIN.

**Reported per cell:** WR, $/trade, LB, trades/day, average risk in $, the longest losing streak, $ per year.

**Audit before reporting:**
- the shuffled control above;
- a fill check on 5 printed trades: the entry minute, the first ask touch of the target / stop, and that the stop is not jumped.

**If 0 / 3 pass:** the SELL side stays OFF and is recorded as REFUTED with its numbers. Nothing is ever switched live without Ashraf's yes.
