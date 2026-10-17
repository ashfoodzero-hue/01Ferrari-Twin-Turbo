# VOLUME AUDIT: results (2026-10-17)

Pre-registered in `docs/VOLUME_AUDIT_SPEC.md` before any number. **Nothing live was changed.** The proposals at the end need Ashraf's approval.

- **Harness:** `scripts/vol_audit/`.
  - `preload.mjs` + `wrap/` change only the XAUUSD volume the UNCHANGED studies see.
  - `selftest.mjs` passes in all four modes.
  - `run_all.sh`, `compare.mjs`, `report.mjs`, `radar_identity.mjs`, `state_agreement.mjs`.
- **Artifacts:** `data/master/vol_audit/<mode>_<window>/`. Comparisons: `cmp_*.json`, `headline.json`. Logs: `logs/`.
- **Runs:** 75 study runs + 2 checks, every one exit 0. The original artifacts in `data/master/` were never touched; a test checks this.

## 1. Short answer

1. **The tick count did not make or break any published result.**
   - Across 13 years, removing the volume part (DROP) changed no pass/fail verdict in any study.
   - Every verdict change was UNDERPOWERED → FAIL / DOES_NOT_HOLD: without the volume filter there are more events, and they still fail.
   - The only positive results, the wall bubbles, stay SHOWN without any volume.
2. **The live market-state gate was mostly driven by the dead tick count.**
   - In the OOS period (2021-26) the RAW gate blocked **580 of 658** IMPULSE_CONT fires (88 %). Without the volume condition it blocks 106 of 658.
   - In the CME era its state differs from a real-volume state on **8.85 %** of 15m bars.
   - In every version the gate is **UNPOWERED**: the blocked fires do not lose money with significance.
3. **Real CME volume is not a usable live input for these rules.**
   - It arrives **10 minutes delayed** on our plan (`FUT_DELAY_MIN = 10`, `src/data/wti.js`).
   - Every affected rule decides at the bar close or 3 minutes after a touch.
   - Where CME beat "no volume" on 2024-12 → 2026-10, it did so in 1 of 3 wall classes and in one volume-profile cell, which still loses money.
4. **Proposal: DROP the volume part in every module** (details in §5).

## 2. No-drift (rule 1): the RAW re-run against the committed artifacts

| Study | RAW = committed? | Cause, MEASURED |
|---|---|---|
| swing_walls, wall_bubbles, c4h_levels, wall_context, wall_scalp, wall_pullback, wall_defense_money, sell_downtrend, matrix_loss_autopsy, fvg_strong, ob_weak4h | **byte-identical** (only the run stamp differs) | — |
| state_gate_on_impulse | no | The committed artifact (2026-10-08) has fires in **24 years**; the re-run has 14. It was built on Turbo 2's older 23-year history. The twin's store is now Polygon 2013-07+ only (admitted 6,838 → 4,058). |
| volume_profile | SPOT part identical, FUT part differs | GOLD_FUT was re-patched to the CME feed today (roll fix, `fix_gold_fut_with_cme.mjs`). Every one of the 44 differing fields is under `fut.`. |
| order_block | 5m OOS events 52,107 → 52,105 (one STRONG); 15m/1h/4h events and bounces identical | The other 135 field changes are random controls. One seeded random sequence (`seeded(20261012)`) is shared across timeframes in order, so two fewer 5m events shift every later control draw. |
| vp_matrix_filter | trades 17,090 → 17,099 | `ferrariMatrix.js` (10-16) and `wti.js` (10-17) changed after the artifact (10-11). |

From here on, the RAW re-run is the reference (spec rule 1).

## 3. Did the volume part change a result? (rule 2, FULL window, RAW vs DROP)

| Study | Verdicts changed | Biggest headline OOS move | Reading |
|---|---|---|---|
| wall_bubbles (volume walls) | 0 | 2.4 pp | SHOWN stays SHOWN: DEFENSE 69.9 → 70.1 %, DEF>PUSH 73.4 → 75.0 %, STRONG 77.1 → 76.5 % (n 9,007 / 3,314 / 2,413 → 9,511 / 3,224 / 3,419). |
| swing_walls | 0 | 2.3 pp | All 6 classes SHOWN in both; 15m STRONG 78.8 → 76.5 %. |
| c4h_levels (the Telegram 🧱 numbers) | 0 | 0.4 pp | strong touch 74.7 → 75.0 % (n 2,001 → 2,317) |
| wall_context | 0 | 1.5 pp | NOTHING informative in both. |
| wall_defense_money | 0 | 1.7 pp / $0.14 | 0/8 PASS in both; STRONG bounce −$0.49 → −$0.50/t. |
| wall_scalp | 0 | 3.5 pp / $0.39 | 0/15 in both. |
| wall_pullback | 0 | 0.3 pp | 0/2 in both. |
| sell_downtrend | 4 × UNDERPOWERED → FAIL | R-STATE cells (n 9 → 401) | The volume condition made confirmed states rare. Without it they are frequent and lose (S-BREAK R2 −$0.86/t, n 401). 0/12 PASS in both. |
| matrix_loss_autopsy | 0 | the headline tests are identical | Fact f13 (market state) changes bins (TREND/BREAKOUT OOS n 91 → 201), but every bin is negative OOS in both, and f13 is not a top-ranked test in either. |
| fvg_strong | 8 × UNDERPOWERED → DOES_NOT_HOLD | 3m X0.25 82.6 % (n 109) → 74.7 % vs control 75.9 % (n 1,156) | The activity filter only thinned the sample. Without it, strong FVGs are 10× more frequent and still do not hold. |
| order_block | 4 × UNDERPOWERED → DOES_NOT_HOLD (1h/4h STRONG) | 15m STRONG +$0.17 (n 354) → −$0.38 (n 5,483) | STRONG never held. ALL cells and weak 4H OBs read no volume (identical). |
| ob_weak4h | identical | — | Displacement only, no volume. |
| volume_profile | 0 | SPOT POC −$1.48 → −$1.41/t | DROP = time-at-price profile; DOES_NOT_HOLD in both. NO MAGNET in both. |
| vp_matrix_filter | 0 | AT_VAL −$1.38 → −$0.83/t (n 305 → 295) | FAIL in both. |
| state_gate_on_impulse | verdict UNPOWERED in both | OOS ALLOWED n 80 → 557; VETOED n 580 → 106 | See §4. |

By the mechanical rule (any headline OOS move ≥ 2 pp or ≥ $0.10), most studies "MATTERED". That flag comes from sub-cells and changed sample sizes. **No pass appeared or disappeared.** Every published FAIL / DOES_NOT_HOLD / NO_PASS stands, and every SHOWN stands.

**Not affected (code proof):**
- `levelRadar.js`: **19,984 / 19,984** 4H decisions identical with `v` = raw and `v` = 0 over 2013-2026 (`radar_identity.json`). The same holds for `study_dxy_wall_swings` and `validate_level_fade_book`.
- `study_break_continue`: never reads `s2`.
- `study_xau_leaders`: geometry only.
- `src/core/structure/volumeProfile.js`: computed in `WorldModel.ingest`, but never read by `proSignal.js`.

## 4. The live market-state gate (`twinRoster.js` → `readMarketState`, `STATE_GATE_MODE='block'`)

**State agreement**, 43,452 closed 15m bars, 2024-12-08 → 2026-10-09 (`state_agreement.json`):

| | BREAKOUT/TREND states | state differs from RAW |
|---|---|---|
| RAW (quote count) | 2,090 (4.8 %) | — |
| CME (real volume, time-aligned) | 5,893 (13.6 %) | 8.85 % |
| DROP (no volume condition) | 7,226 (16.6 %) | 11.82 % (CME vs DROP 3.07 %) |

By year, RAW and CME differ on 10.8 % of bars in 2025 (the 3/min era) and 5.7 % in 2026 (the about 140/min era).

**Gate money, CME era** (all 257 fires fall in OOS folds; no TRAIN exists in this window):

| | ALLOWED | VETOED |
|---|---|---|
| RAW | n 79, WR 71.4 %, +$0.96/t [−0.20, +1.87] | n 180, −$0.08/t [−1.30, +0.96] |
| DROP | n 215, +$0.37/t [−0.68, +1.25] | n 44, −$0.07/t |
| CME | n 192, +$0.31/t [−0.86, +1.33] | n 69, **+$0.30/t** [−0.85, +1.25] |

The book without the gate: n 257, +$0.30/t.

With real volume, the gate blocks fires that earn as much as the fires it keeps. Every interval straddles zero: UNPOWERED, as the 2026-10-08 study concluded.

**FULL window, OOS 2021-26** (the 3/min era): RAW ALLOWED n 80 (+$0.95/t) against VETOED n 580 (+$0.09/t). DROP ALLOWED n 557 (+$0.23/t) against VETOED n 106 (+$0.18/t).

**Live bars:** minutes built from our own tick stream since 10-08 have median `v` 127 (n 7,474), against Polygon's 2026 median of about 137. So live currently sits in the "about 140" era, and the gate reads a quote count that changed 100× across eras.

## 5. CME window 2024-12 → 2026-10 and the proposal per module (rule 4)

Rule 4: SWITCH to CME only if CME beats DROP on the volume class in TRAIN AND OOS by ≥ 2 pp / ≥ $0.10 with OOS n ≥ 100. Otherwise DROP. TRAIN = 2024-12 → 2026-01, OOS = 2026-01 → 2026-10.

| Module | Volume class, CME vs DROP (OOS / TRAIN) | Rule 4 | Live callers | **Proposal** |
|---|---|---|---|---|
| `wallDefense.js` `wallEvents` (volume walls) | DEFENSE 78.2 vs 76.2 % / 71.8 vs 70.5 % · **DEF>PUSH 84.2 vs 81.1 % / 75.2 vs 70.6 % (n 733)** · STRONG 87.0 vs 85.7 % / 80.4 vs 77.1 % | Met for 1 of 3 classes (DEF>PUSH); not for DEFENSE or STRONG | `run_chart.mjs` `/api/walls` (bubbles, display) | **DROP**: walls = time-at-price, delta = close position. It reproduces the 13-year SHOWN result. CME is 10 min late for a touch + 2 decision and exists only from 2024-10. |
| `wallDefense.js` `swingWallEvents` + `barDelta` | 3m STRONG 83.9 vs 85.4 % / 71.9 vs 79.6 % · 15m STRONG 84.9 vs 90.9 % · 4H level strong touch 84.0 vs 88.2 % / 72.6 vs 76.7 % | Not met: **CME is worse** | `level_tick.mjs` (Telegram 🧱 DEFENDED), `run_chart.mjs` swing bubbles | **DROP** (close-position delta). The strong cut-off `strong_threshold_train_p66` must be re-derived in the same run (DROP p66 differs). |
| `marketState.js` ("volume N×") | ALLOWED +$0.31 (n 192) vs +$0.37 (n 215); no TRAIN in window | Not met | `twinRoster.js` (the gate on the IMPULSE_CONT paper book), `run_chart.mjs` state lines | **DROP the volume condition** (a close beyond range ± 0.3 ATR confirms). Live effect: more BREAKOUT/TREND states (4.8 → 16.6 % of bars), and the gate blocks far fewer fires. The gate stays UNPOWERED either way. The message "volume N×" must go. |
| `fvg.js` (activity `s2`) | 3m X0.25 77.0 vs 77.4 % bounce, −$2.06 vs −$1.90/t (n 183 / 217) | Not met | `run_chart.mjs` `/api/fvg` (strong FVG boxes, labelled with the 13-year result) | **DROP** `s2`. Strong FVGs become about 10× more frequent; the labels must show the DROP numbers (DOES_NOT_HOLD). |
| `orderBlock.js` (relVol) | 15m STRONG −$0.04 vs −$0.36/t OOS but −$0.66 vs −$0.57 TRAIN; 5m STRONG CME worse | Not met | none (studies only) | **DROP** relVol from STRONG. No live effect. |
| `volumeProfile.js` (master) | POC 36.4 vs 41.3 %, −$8.47 vs −$5.95/t (CME worse); VAH −$0.82 vs −$3.34 / −$0.58 vs −$1.22 (money criterion met, n 127, still DOES_NOT_HOLD); VAL OOS better, TRAIN worse | Met for VAH only, a losing cell either way | none (tool 4 is out of the brain) | **DROP / keep out of use.** A switch between two losing variants changes nothing. |
| `src/core/structure/volumeProfile.js` | not re-tested (no consumer reads it) | — | `WorldModel.ingest` computes it; `proSignal` never reads it | **No action**; optional cleanup. |
| `levelRadar.js` | identical | — | LEVEL_FADE validator (shadow) | **No action** (the `v` sum is dead code). |

**Caveats (stated, not hidden):**
- The 2-year window has 1/6 of the n.
- In it, the "both eras" condition cannot be met, so SHOWN ↔ NOT_SHOWN there reflects the window.
- About 30 rows were compared at a 2 pp / $0.10 threshold with no multiple-test bound, so single "CME beats" rows can be noise.
- The DROP numbers are measured on 13 years with each study's own pre-registered split.

## 6. What a live change would alter (for Ashraf's decision; nothing changed yet)

1. `marketState`: the IMPULSE_CONT gate admits fires on unconfirmed-by-volume breaks. FULL OOS: allowed fires 80 → 557, while the book's own result is unchanged (the gate is unpowered).
2. Wall bubbles and the 🧱 Telegram alerts: a different set of walls and bubbles (time-at-price walls, close-position delta) and new TRAIN p66 cut-offs. The measured holds are within about 2 pp of today's.
3. Strong FVG boxes: many more boxes. Each label states DOES_NOT_HOLD.
4. orderBlock / volumeProfile / levelRadar: no live effect.
