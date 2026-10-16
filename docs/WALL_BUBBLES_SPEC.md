# WALL-PRESSURE BUBBLES — re-check + RSI confirmation (pre-registered 2026-10-16)

**Request (Ashraf):** "Real wall-pressure bubbles: blue bubble at resistance / yellow at support each time volume DEFENDS the wall stronger than the push (count stacks per defended test), none when attacked. Labelled with the measured hold rate. Pre-registered re-check first. And also use the RSI method if it adds more confirmation."

## Engine (Turbo 2 `validate_wall_defense.mjs`, as replicated in study (an) — one copy in `src/master/wallDefense.js`)

- **Profile:** trailing 24 h volume-by-price on gold 1m (Polygon TICK volume — spot gold has no traded volume). Bin = 0.025 % of price.
- **Wall:** a bin ≥ 2.5 × the median bin AND a local max (±2 bins), on the map before the bar.
- **Test:** price enters [wall ∓ 1.5 bins] from outside; 120-min cooldown per wall.
- **Decision:** at the close of the 3rd 1m bar (touch + 2) — about 3 min after the touch. Already beyond wall ± 2 bins → skipped.
  - **Why not earlier:** defending volume only exists once price trades at the wall. Nothing before the touch can measure defence of an untouched level.
- **Delta proxy:** v × (2·close-position − 1) per 1m bar.
  - **zone** = Σ over the 3 decision bars;
  - **push** = Σ over the 5 bars BEFORE the touch.
- **Hold label (Turbo 2):**
  - a close retreating 4 bins from the wall = HOLD;
  - a close beyond wall ± 2 bins = BREAK;
  - within 60 min; timeouts excluded.

## Bubble classes

| Class | Meaning |
|---|---|
| ALL | every wall test (base) |
| ATTACK | zone flow WITH the move (no bubble) |
| DEFENSE | zone flow AGAINST the move |
| STRONG | DEFENSE with \|zone\| / flow scale > the TRAIN 66.7th percentile |
| **DEF>PUSH** (Ashraf's exact rule) | DEFENSE and \|zone\| > \|push\| (the defence is stronger than the push into the wall) |

## RSI confirmation (tested ON TOP of DEFENSE / DEF>PUSH, causal at the decision)

| Variant | Ceiling | Floor |
|---|---|---|
| **R4** | last closed NY 4H RSI14 > 65 | < 35 |
| **RB4** | a 4H BEAR bubble (`macroBubbles.js`) known within the last 6 closed 4H bars | a BULL bubble, same window |
| **R1** | last closed 1H RSI14 > 65 | < 35 |

## Cells and verdict

- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00.
- **Confidence:** week-block bootstrap, 4,000 draws, one-sided α/K.
- **Bubble cells (K1 = 3):** DEFENSE, STRONG, DEF>PUSH.
  - **SHOWN with its rate** ⇔ OOS hold − ALL-base hold ≥ +5 pp, with bootstrap LB > 0, and TRAIN hold − base > 0 (n ≥ 300).
- **RSI cells (K2 = 6):** {R4, RB4, R1} × {on DEFENSE, on DEF>PUSH}.
  - **CONFIRMS** ⇔ OOS hold(class + RSI) − hold(class) ≥ +3 pp, with bootstrap LB of the difference > 0, TRAIN difference > 0, and n ≥ 100.
- **Reported:**
  - ATTACK hold (the "will likely break" claim — a break rate is only a claim if ATTACK hold is ≤ base − 5 pp);
  - hold by defended-test COUNT at the same wall (1, 2, 3+ — the "stacking" claim);
  - by side;
  - pre/post 2020.

## Display (fixed now)

- 🔵 at a ceiling / 🟡 at a floor for each class that is SHOWN, with its measured OOS hold %. The stacked count is shown only if its own rows are measured.
- An RSI layer is added only if it CONFIRMS.
- No bubble for ATTACK. "Likely to break" text appears only if measured as stated above.

Study: `scripts/study_wall_bubbles.mjs` → `data/master/wall_bubbles_study.json`.
