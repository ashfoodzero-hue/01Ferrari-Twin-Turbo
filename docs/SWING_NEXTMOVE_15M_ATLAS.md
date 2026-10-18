# 15m swings — the NEXT MOVE: atlas

Generated from `data/master/swing_nextmove_15m.json` (2026-10-18T14:07:09.306Z). Rules: `docs/SWING_NEXTMOVE_15M_SPEC.md` (+ ADDENDUM A). Book: `docs/SWING_STUDY_BOOK.md` §5I.

Window 2013-07-14 → 2026-10-09T06:00 · split 2021-06-23 · events k=3: **15,331** (TRAIN 9,317 / OOS 6,014).

**Claims:** Q1 none · Q4 (pre-registered) prev_opposite_15m, round_10 · Q4 robust to the distance-matched placebo **none** · context splits none.

## Q1 — does the confirmed leg carry on? (race +X ATR with the leg before −X ATR against, from the confirmation close)

| X · side | TRAIN leg | TRAIN control | OOS leg (Wilson LB) | OOS control | OOS n | p (Holm) | claim |
|---|---|---|---|---|---|---|---|
| 0.5 · after LOW (up) | 47.9 % | 49.2 % | 43.9 % (42.1 %) | 45.1 % | 3007 | 1.000 | — |
| 0.5 · after HIGH (down) | 47.9 % | 49.7 % | 54.2 % (52.4 %) | 53.9 % | 3007 | 1.000 | — |
| 1 · after LOW (up) | 48.4 % | 49.6 % | 49.4 % (47.6 %) | 48.9 % | 3007 | 1.000 | — |
| 1 · after HIGH (down) | 49.1 % | 48.8 % | 51.2 % (49.4 %) | 49.3 % | 3007 | 0.431 | — |
| 2 · after LOW (up) | 49.8 % | 50.3 % | 50.2 % (48.4 %) | 50.5 % | 3007 | 1.000 | — |
| 2 · after HIGH (down) | 51.3 % | 48.4 % | 50.1 % (48.3 %) | 48.8 % | 3007 | 1.000 | — |

## Q2 — size (ATR of the confirmation candle; $ shown for reference — it scales with the price level)

| Measure | Part | P10 | P25 | P50 | P75 | P90 | n | stable |
|---|---|---|---|---|---|---|---|---|
| full_atr | TRAIN | 3.29 | 3.77 | 4.92 | 7.00 | 10.22 | 9315 |  |
| full_atr | OOS | 3.30 | 3.83 | 4.97 | 7.18 | 10.25 | 6012 | yes |
| full_usd | TRAIN | 3.67 | 5.08 | 7.68 | 12.01 | 18.60 | 9315 |  |
| full_usd | OOS | 7.23 | 10.15 | 16.36 | 31.24 | 57.31 | 6012 | no |
| rem_atr | TRAIN | 0.47 | 0.93 | 1.94 | 3.96 | 7.23 | 9315 |  |
| rem_atr | OOS | 0.46 | 0.91 | 1.95 | 4.09 | 7.20 | 6012 | yes |
| rem_usd | TRAIN | 0.64 | 1.32 | 2.89 | 6.16 | 11.46 | 9315 |  |
| rem_usd | OOS | 1.25 | 2.72 | 6.43 | 14.93 | 32.54 | 6012 | no |
| adv_atr | TRAIN | 0.00 | 0.07 | 0.51 | 1.06 | 1.65 | 9315 |  |
| adv_atr | OOS | 0.00 | 0.10 | 0.52 | 1.09 | 1.69 | 6012 | yes |
| adv_usd | TRAIN | 0.00 | 0.10 | 0.70 | 1.54 | 2.74 | 9315 |  |
| adv_usd | OOS | 0.00 | 0.30 | 1.60 | 3.55 | 7.24 | 6012 | no |

## Q3 — timing (15m bars from the confirmation close)

| Measure | Part | P10 | P25 | P50 | P75 | P90 | n |
|---|---|---|---|---|---|---|---|
| bars_to_extreme | TRAIN | 0 | 1 | 6 | 17 | 31 | 9315 |
| bars_to_extreme | OOS | 0 | 1 | 7 | 19 | 34 | 6012 |
| bars_to_confirm | TRAIN | 4 | 8 | 16 | 26 | 40 | 9315 |
| bars_to_confirm | OOS | 4 | 8 | 16 | 28 | 43 | 6012 |

Hazard (chance the next extreme is in bar n, given not yet), OOS, bars 1-12: 11.9 % · 8.8 % · 7.6 % · 7.1 % · 6.3 % · 6.3 % · 5.5 % · 5.9 % · 6.3 % · 6.4 % · 6.0 % · 5.4 %

## Q4 — does the next extreme stop at a level known at the confirmation close? (hit = within ±0.25 ATR)

| Level | OOS hit (LB) | pre-registered control (shifted 1-3 ATR) | **ADDENDUM A placebo (same distance)** | OOS n | pre-reg claim | robust |
|---|---|---|---|---|---|---|
| prev_opposite_15m | 7.0 % (6.3 %) | 5.3 % | 7.7 % | 5470 | yes | ❌ |
| swing_1H | 2.4 % (2.0 %) | 2.5 % | 2.9 % | 5108 | — | ❌ |
| swing_4H | 0.9 % (0.7 %) | 0.9 % | 1.1 % | 4976 | — | ❌ |
| prev_day_extreme | 3.2 % (2.7 %) | 3.4 % | 4.0 % | 5183 | — | ❌ |
| round_10 | 10.2 % (9.4 %) | 6.2 % | 10.0 % | 6012 | yes | ❌ |
| round_50 | 3.9 % (3.4 %) | 2.9 % | 3.8 % | 6012 | — | ❌ |

Round numbers vs a uniform position inside the band:

- round_10: OOS 22.3 % (LB 21.2 %) vs uniform 21.7 % · TRAIN 8.0 % vs 8.5 %
- round_50: OOS 4.7 % (LB 4.2 %) vs uniform 4.5 % · TRAIN 1.4 % vs 1.7 %

## Context splits (Q1 at 1 ATR, both sides; remaining-move median in ATR)

| Split | Value | OOS leg | OOS control | OOS n | TRAIN leg | TRAIN control | rem median OOS | claim |
|---|---|---|---|---|---|---|---|---|
| h1_with_leg | against | 50.0 % | 49.1 % | 3730 | 48.6 % | 48.6 % | 1.92 | — |
| h1_with_leg | with | 50.7 % | 49.2 % | 2284 | 49.0 % | 50.0 % | 2.02 | — |
| h4_with_leg | against | 50.1 % | 48.9 % | 3126 | 48.6 % | 49.1 % | 1.93 | — |
| h4_with_leg | with | 50.5 % | 49.4 % | 2888 | 49.0 % | 49.3 % | 1.97 | — |
| ladder_flipped | 0 | 46.7 % | 53.3 % | 15 | 58.3 % | 47.2 % | 1.08 | — |
| ladder_flipped | 1 | 64.3 % | 42.9 % | 14 | 46.3 % | 48.1 % | 1.99 | — |
| ladder_flipped | 2 | 45.2 % | 46.8 % | 62 | 50.9 % | 48.2 % | 1.81 | — |
| ladder_flipped | 3 | 50.3 % | 49.2 % | 5923 | 48.7 % | 49.2 % | 1.95 | — |
| session | ASIA | 52.0 % | 49.7 % | 2101 | 49.1 % | 49.4 % | 2.09 | — |
| session | LONDON | 49.8 % | 50.4 % | 1310 | 49.9 % | 49.5 % | 2.14 | — |
| session | NEWYORK | 49.3 % | 48.0 % | 2603 | 47.9 % | 48.8 % | 1.83 | — |
| lag | 1 | 49.1 % | 48.6 % | 442 | 53.0 % | 49.8 % | 2.12 | — |
| lag | 2-3 | 49.8 % | 49.1 % | 1224 | 51.0 % | 49.1 % | 1.94 | — |
| lag | 4-7 | 49.7 % | 49.1 % | 1955 | 46.6 % | 49.3 % | 1.93 | — |
| lag | 8+ | 51.3 % | 49.2 % | 2393 | 48.6 % | 49.0 % | 1.96 | — |
| leg_so_far | 3.5-4.5 | 47.0 % | 46.1 % | 704 | 50.3 % | 49.6 % | 1.90 | — |
| leg_so_far | <3.5 | 50.8 % | 49.5 % | 5199 | 48.7 % | 49.0 % | 1.95 | — |
| leg_so_far | ≥4.5 | 46.9 % | 49.3 % | 111 | 45.7 % | 54.5 % | 2.21 | — |
| usd_release_60m | no | 50.4 % | 49.3 % | 5315 | 48.7 % | 49.1 % | 1.93 | — |
| usd_release_60m | yes | 49.9 % | 47.9 % | 699 | 49.0 % | 49.4 % | 2.15 | — |

## Robustness (k = 2, k = 5)

- k2: 32,991 events · Q1 at 1 ATR OOS diff: after LOW -6.7 % (same sign as k3: false), after HIGH 7.4 % (true) · remaining median TRAIN 1.3239 / OOS 1.3426 ATR
- k5: 5,916 events · Q1 at 1 ATR OOS diff: after LOW 0.8 % (same sign as k3: true), after HIGH -2.7 % (false) · remaining median TRAIN 3.0944 / OOS 3.3076 ATR
