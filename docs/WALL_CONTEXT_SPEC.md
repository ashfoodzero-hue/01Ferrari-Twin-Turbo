# WALL CONTEXT + SWING FOLLOW-THROUGH (pre-registered 2026-10-16)

**Request (Ashraf):** "why we did not measure the strength between the macro and the wall strength before it reaches 4189, and then alert a swing is expected soon if we are confident the wall will hold and it will resist the coming trend; also check if the trend is weakened".

**Walls:** swing-level walls on 3m pivots (study (bc): 38.8 tests/day, the chart's H/L levels), same engine and hold rule (`swingWallEvents`, `holdLabel`).

## Context KNOWN BEFORE the touch (no defence information used)

| Context | Definition |
|---|---|
| **AGAINST-MACRO** | the wall opposes a strong 4H Macro Magnet reading at the last CLOSED NY 4H bar: a ceiling while gold LONG ≥ 65, or a floor while SHORT ≥ 65 (`macroMagnet.js`, parity-checked) |
| **WITH-MACRO** | a ceiling while SHORT ≥ 65, or a floor while LONG ≥ 65 (reported) |
| **WEAK-APPROACH** | \|close at touch − close 60 min before\| / ATR14 of the last closed 1H bar < 0.5, in the direction of the wall (a slow, tired approach). **STRONG-APPROACH** ≥ 1.5 (reported) |
| **RSI-EXHAUST** | a 15m bubble from Ashraf's RSI method (`bubbleEvents` on 15m bars — BEAR for a ceiling, BULL for a floor) KNOWN within the 8 closed 15m bars (2 h) before the touch |

## Outcomes

- **HOLD:** the Turbo 2 rule — ~$4 back-off before ~$2 through, within 60 min.
- **Swing follow-through, after the decision, within 4 h:**
  - **FT10** = a move of ≥ $10 away from the wall (ceiling: decision close − lowest low; floor: highest high − decision close);
  - **FT20** = ≥ $20.

## Cells and verdict

- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00. Week-block bootstrap, 4,000 draws.
- **Pre-touch cells (K = 3):** AGAINST-MACRO, WEAK-APPROACH, RSI-EXHAUST — hold of ALL tests in that context vs ALL tests.
  - **INFORMATIVE** (either direction counts: "trend will break it" is as useful as "will hold") ⇔ |OOS diff| ≥ 5 pp, with the bootstrap bound on the same side of 0 at α/3, the same sign in TRAIN, and n ≥ 300.
- **Swing cells (K = 2):** among HELD tests, FT20 within 4 h for DEF>PUSH-or-STRONG held vs all held.
  - **INFORMATIVE** ⇔ diff ≥ +5 pp, bootstrap LB > 0 at α/2, TRAIN same sign, n ≥ 300.
  - Plus the plain FT10 / FT20 rates after a held defended wall — the honest answer to "is a swing coming".
- **Reported:**
  - each context ON TOP of DEFENSE / DEF>PUSH (does the bubble + context beat the bubble alone);
  - pre/post 2020; by side.

## Display (fixed now)

- **Pre-touch line** ("approaching swing wall X — in this context it holds Y %") only for an INFORMATIVE context, with its measured rate.
- **"Swing expected"** wording only if the swing cell is INFORMATIVE. Otherwise the panel shows the plain measured FT10 / FT20 rates after a held wall.

Study: `scripts/study_wall_context.mjs` → `data/master/wall_context_study.json`.
