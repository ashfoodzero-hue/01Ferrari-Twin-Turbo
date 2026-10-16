# SWING-LEVEL WALLS (reversal points) — defence bubbles at prior swing highs / lows (pre-registered 2026-10-16)

**Request (Ashraf):** "bubbles should be at the walls location at the reversal points/levels, not in the middle" → option B.

**Question.** Volume-wall bubbles pass (study (bb): DEFENSE 69.9 / DEF>PUSH 73.4 / STRONG 77.1 % OOS hold vs base 60.3 %). If the walls are instead **prior confirmed swing highs / lows** (reversal levels), does the same defence logic hold as well?

## Walls

- **Pivots:** confirmed pivots, 5 bars each side (`confirmedPivots`, the chart's own H/L rule) on 3m bars and, separately, on 15m bars (two variants).
- **Known time:** a pivot is usable only from its KNOWN time = the close of the bar 5 bars after it.
- **Active levels:**
  - a swing HIGH stays a ceiling until a 1m close goes above it (then it is broken and removed); a swing LOW stays a floor likewise;
  - at each minute, the test candidates are the nearest active ceiling above the previous close and the nearest active floor below it.

## Test mechanics (IDENTICAL to the volume engine, `src/master/wallDefense.js`)

- **Band:** ±1.5 bins; bin = 0.025 % of price.
- **Touch:** from outside; 120-min cooldown per level.
- **Decision:** touch + 2 bars; already beyond ± 2 bins → skipped.
- **Flow:** zone = Σ delta over the 3 bars; push = Σ delta over the 5 bars before the touch; flow scale = 3 × mean |delta| over the trailing 24 h.
- **Classes:** DEFENSE · DEF>PUSH · STRONG (|zone| / scale > the TRAIN p66 of labelled DEFENSE tests, per variant).
- **Hold:** close retreats 4 bins = HOLD; close beyond 2 bins = BREAK; within 60 min.

## Cells (K = 6 = {3m, 15m} × {DEFENSE, DEF>PUSH, STRONG}) and verdict

- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00. Week-block bootstrap.
- **SHOWN** ⇔ all of these hold:
  - OOS n ≥ 300;
  - OOS hold − (the same variant's ALL-tests base) ≥ +5 pp;
  - LB at α/6 > 0;
  - TRAIN lift > 0.
- **Reported:**
  - head-to-head vs the volume walls (hold rate and count per day);
  - ATTACK hold;
  - tests where a swing level and a volume wall coincide (within 1.5 bins) vs swing-only;
  - by side;
  - pre/post 2020.

## Display rule (fixed now)

- Swing-wall bubbles are drawn (on their swing level, labelled "SWING WALL") only for classes that are SHOWN, each with its own measured hold %.
- Volume-wall bubbles stay as they are (already measured).

Engine: `swingWallEvents()` in `src/master/wallDefense.js`. Study: `scripts/study_swing_walls.mjs` → `data/master/swing_walls_study.json`.
