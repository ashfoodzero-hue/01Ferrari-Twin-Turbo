# 4H BIAS MODEL — gold + DXY, calibrated probability (pre-registered 2026-10-16)

**Request (Ashraf):** "keep going in this point first until we are satisfied with the results and add it to our app".

**Starting point.**
- Ashraf's Pine score has no edge (study (au)): LONG 100 → 51.7 % up next 4H against a 51.8 % base.
- Vector A (EMA9 > EMA21) was the only part with a sign: 53.1 % vs 50.2 %.

**Question.** Does any CAUSAL combination of the Pine's inputs, their continuous versions, the daily trend and the same readings on DXY give a probability for gold's next 4H / 24 h direction that is better than gold's drift on unseen data?

## Data

- **Bars:** NY-anchored 4H candles (the parity-checked cut), gold (Polygon 1m) and DXY (six pairs).
- **Daily bars:** the 6 candles of each NY day; at a 4H close, only the last COMPLETED day is used.
- **Window:** 2013-07-21 → 2026-10-09T06:00.
- **Split:**
  - FIT = first 60 % (TRAIN);
  - inside FIT, an early-stop check: fit on 0-40 %, validate on 40-60 %;
  - TEST = last 40 % (OOS, never used for fitting).

## Features at the close of 4H bar k (all known at that close)

| Group | Features |
|---|---|
| Gold, Pine binaries | A, B, C, D |
| Gold, continuous | (EMA9 − EMA21)/ATR · (close − EMA21)/ATR · (RSI14 − 50)/50 · distance to BSL and to SSL in ATR (capped 10; missing = 10) · last 4H return / ATR · 6-bar return / ATR |
| Gold daily trend | (EMA9 − EMA21)/ATR on completed days |
| DXY | the same 4 binaries + the same continuous features + DXY daily trend |

## Model

- Logistic regression with L2 penalty. Features are standardised on FIT only.
- The penalty is chosen on the 0-40 / 40-60 split from {0.01, 0.1, 1, 10}, then the model is refitted on all of FIT.
- **One model per outcome:**
  - O1 = close[k+1] > close[k] (next 4H);
  - O2 = close[k+6] > close[k] (next 24 h).

## Metrics on TEST (K = 2)

- **AUC**, with a lower bound from a week-block bootstrap (4,000) at one-sided α/K.
- **Brier skill** vs the constant base-rate forecast (the FIT up-rate).
- **Decile calibration** (predicted vs realised).
- **Tails:**
  - top 20 % of predictions → up-rate vs base up-rate;
  - bottom 20 % → down-rate vs base down-rate (Wilson LB at α/K).

## Verdict (fixed now)

**USABLE BIAS** for an outcome ⇔ all of these hold:
- AUC LB > 0.50;
- Brier skill > 0;
- top-20 % up-rate − base ≥ +3 pp, with Wilson LB > base;
- bottom-20 % down-rate − base ≥ +3 pp, with Wilson LB > base.

Otherwise **NO EDGE**.

## Dashboard rule (fixed now)

- **USABLE:** show the model's probability, mapped through the TEST calibration table (the measured up-rate for that prediction decile), plus Ashraf's Pine score beside it for reference.
- **NO EDGE:** show "4H bias: no measured edge — gold's base up-rate X %" plus Ashraf's Pine score clearly labelled "score, not probability". Never a made-up %.

Output: `data/master/bias_model_study.json` (incl. coefficients + calibration table). Script: `scripts/study_bias_model.mjs`.
