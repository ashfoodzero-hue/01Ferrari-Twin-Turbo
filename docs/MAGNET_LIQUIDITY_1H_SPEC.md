# Liquidity MAGNET on 1H pools (pre-registered 2026-10-16)

**Request (Ashraf):** "option 2 — test on 1H pools with zero guessing".

**Why.** On 4H pools (study (av)) the liquidity lift was +2 to +2.6 pp but **not provable**: only 347 independent pool pairs exist in 13 y. 1H pools give several times more independent pairs. Everything else is the same as `docs/MAGNET_LIQUIDITY_SPEC.md`, EXCEPT that the audit fixes are now the PRIMARY test, fixed in advance.

## Bars and pools

- **Bars:** 1H candles on the hour (UTC; New York is a whole number of hours from UTC, so 1H candles align in both conventions), from the Twin's Polygon 1m.
- **Pools:** BSL / SSL = the same `magnetScores` registers (pivot 10/10, known 10 bars later, cleared by a close beyond). ATR14 on 1H.

## PRIMARY test (all three audit fixes, fixed now)

- **Independent events:** ONE event per distinct (BSL, SSL) pair, at the first 1H close where both are set and that pair is new.
- **Regime-matched placebo:** 20 random 1H closes per event, drawn only from closes that ALSO have both pools set (same split, seeded). Synthetic levels sit at the same ATR distances above/below, with the same horizon and censoring.
- **Bootstrap:** whole calendar weeks of events, 4,000 draws, one-sided α/K.
- **Touch order:** resolved on 1m bars inside a 1H bar that touches both levels. A same-minute double touch is ambiguous and dropped. Neither touched = censored.

## Cells (K = 2)

- **H = 30 bars** (30 h).
- **H = 120 bars** (5 days, the horizon of the 4H test).

## Verdict

- **Split:** TRAIN = first 60 %, OOS = last 40 %, window 2013-07-21 → 2026-10-09T06:00.
- **MAGNET REAL** ⇔ all of these hold:
  - OOS resolved independent events ≥ 300;
  - OOS lift (real − placebo near-first) ≥ +3 pp;
  - week-block bootstrap lower bound at α/K > 0;
  - TRAIN lift > 0.
- **Reported, never the verdict:** the non-deduplicated numbers, the analytic formula, pre/post 2020, near BSL vs near SSL, and the calibration table by distance share.

Output: `data/master/magnet_liquidity_1h_study.json`. Script: `scripts/study_magnet_liquidity.mjs` with `MAG_TF=1h` and the audit switches set.
