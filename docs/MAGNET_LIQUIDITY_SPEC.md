# Liquidity MAGNET: is the nearer 4H liquidity pool taken first because it IS liquidity? (pre-registered 2026-10-16)

**Request (Ashraf):** "option 2 — test the magnet properly … find the accurate real answer with zero guessing".

**Origin.** Study (au), a reported side number: with both 4H pools set, the nearer pool was touched first 78.0 % of the time, against a distance-only formula of 71.5 % (n 3,116 OOS).

**Why the formula is NOT the null.** Who is touched first depends only on the two distances and the price path. The formula d_far / (d_near + d_far) assumes:
- driftless continuous Brownian motion;
- no time limit.

The real test differs on all three counts:
- it has a 30-bar limit, and censoring favours the near level;
- gold drifts up;
- volatility clusters.

So the excess may come from the price path, not from liquidity. The primary null is therefore a **matched placebo** with the same geometry and no liquidity.

## Events

- **Bars:** NY-anchored 4H candles (the parity-checked cut).
- **When:** at the close of every 4H bar where both BSL and SSL are set (`magnetScores`, causal).
- **Geometry:** d_B = BSL − close, d_S = close − SSL, both in ATR14 (4H) units. "Near" = the smaller one.
- **Outcome:**
  - which level is touched first after the close, within H bars (BSL: high ≥ BSL; SSL: low ≤ SSL);
  - a 4H bar touching both is resolved on the 1m bars (first minute wins); a same-minute double touch is ambiguous and dropped;
  - neither touched within H means censored (counted and reported).

## Placebo (the primary null)

- For each real event, take **20** random other 4H closes in the same split (seeded, not the same bar).
- At each one, place synthetic levels at the SAME d_B and d_S in ATR units above and below that close, with the same horizon and the same 1m resolution.
- **Placebo rate** = the share of resolved placebo events where the near level is first.
- The placebo keeps the geometry, the side above/below (so the drift is equal), the horizon and the censoring. Only "being real liquidity" differs.

## Cells (K = 2) and verdict

- **Cells:** H = 30 bars (5 trading days, the side measurement) and H = 6 bars (24 h).
- **Lift** = real near-first rate − placebo near-first rate. Bootstrap over real events (each resampled with its 20 placebos), 4,000 draws.
- **Split:** TRAIN = first 60 %, OOS = last 40 %, window 2013-07-21 → 2026-10-09T06:00.
- **MAGNET REAL** ⇔ all of these hold:
  - OOS resolved real n ≥ 300;
  - OOS lift ≥ +3 pp;
  - bootstrap lower bound at α/K (one-sided) > 0;
  - TRAIN lift > 0.
- Otherwise the 78 % is a property of price paths and distances, NOT of liquidity.

## Reported (never the verdict)

- The analytic formula, censoring and ambiguity counts.
- Near = BSL vs near = SSL.
- Pre/post 2020.
- A calibration table: real and placebo near-first rate by distance-ratio bucket d_near / (d_near + d_far). Whatever the verdict, this table is the honest, measured number the dashboard may show ("which pool is likely taken first"); it is labelled liquidity-specific only if MAGNET REAL.

Output: `data/master/magnet_liquidity_study.json`. Script: `scripts/study_magnet_liquidity.mjs`.
