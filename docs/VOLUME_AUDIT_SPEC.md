# VOLUME AUDIT: did spot `v` (a quote count, not volume) change any result? (PRE-REGISTERED 2026-10-17, before any number)

## Request (Ashraf, 2026-10-17)
DATA_CONTRACT §6 lists modules that read spot XAUUSD 1m `v` as volume. `v` is Polygon's quote/tick count. Its density changed about 100×: about 100-250 per minute before 2021, 3 per minute in 2021-25, about 140 in 2026. The task:
1. For each module, list the live callers and the studies (MASTER_DOCUMENT §7) that relied on the volume part.
2. Measure whether the volume part changed any result:
   - re-run with the volume part neutralised;
   - on 2024-10+ data, re-run with real CME volume aligned to the spot candles by time.
3. Propose a fix per module: switch to CME volume (2024-10+ only) or drop the volume part.
4. **No live change** without Ashraf's explicit approval.

## Method: the studies are re-run UNCHANGED
- `scripts/vol_audit/preload.mjs` is a Node module hook (`node --import`). It changes the volume each study sees and nothing else.
- No file in `src/` and no study script is edited.
- Outputs are redirected to `data/master/vol_audit/<mode>_<window>/`, so the original artifacts are never overwritten. A study's reads of its own sibling artifacts come from the same folder when they exist there.

### Modes (XAUUSD bars only; DXY, silver, GOLD_FUT and the rest are untouched)
| Mode | Bar `v` | Volume threshold conditions |
|---|---|---|
| **RAW** | unchanged (Polygon quote count) | unchanged |
| **DROP** (volume part removed) | `v := 1` on every bar of every timeframe, so profiles become time-at-price and the delta proxy becomes close position only | treated as SATISFIED: `fvg.s2 := true`; orderBlock `strong := disp ≥ 2.5`; marketState `volMult := 0` (every range break counts as confirmed) |
| **CME** | `v :=` sum of GOLD_FUT 1m volume over the minutes inside the candle `[t, t + tf)`, matched by TIME only. No CME minute → 0. | unchanged: the module's own rule, on real volume |

### Windows
- **FULL**: the study's own window and TRAIN/OOS split, unchanged. Runs: RAW and DROP.
- **CME2Y**: `HISTORY_CONTINUOUS_FROM := 2024-12-01`, so the study's own `FROM` is 2024-12-08. Its warm-up then starts at or after the first CME minute (2024-10-09). `TO` is the study's own (`TURBO_VAL_TO` default 2026-10-09 06:00). The study's own 60/40 split is applied inside this window. Runs: RAW, DROP and CME.
  - Caveat: a 2-year window has about 1/6 of the FULL n; cells below the study's own minimum n are "described only".

## Studies re-run (15; volume use found in the code)
- **marketState**:
  - `study_state_gate_on_impulse` (the LIVE gate on IMPULSE_CONT);
  - `study_matrix_loss_autopsy` (fact f13);
  - `study_sell_downtrend` (R-STATE).
- **wallDefense**: `study_wall_bubbles`, `study_swing_walls`, `study_c4h_levels`, `study_wall_context`, `study_wall_scalp`, `study_wall_pullback`, `study_wall_defense_money` (an inline copy of the same engine), `study_sell_downtrend` (S-RALLY).
- **fvg**: `study_fvg_strong`.
- **orderBlock**: `study_order_block`, `study_ob_weak4h`.
- **volumeProfile**: `study_volume_profile`, `study_vp_matrix_filter`.

### Not re-run, because the code proves no volume dependence
| Study / module | Why |
|---|---|
| `levelRadar.js` / `study_dxy_wall_swings`, `validate_level_fade_book` | `agg()` sums `v`; nothing reads it. Proof: `scripts/vol_audit/radar_identity.mjs` must give identical decisions with `v` = raw vs `v` = 0 over the full history. |
| `study_break_continue` | Calls `fvgAt(..., trendAt = null)`, so `strong` is never true. It uses every FVG of at least 0.1·ATR and never reads `s2`. |
| `study_xau_leaders` | Uses the geometry of `marketStateGeometry` only (stated "NO volume" in its header). |
| `src/core/structure/volumeProfile.js` | Reached only through `WorldModel.ingest`. `proSignal.js` (the live IMPULSE_CONT detector) never reads `volume_profile`. |

## Pre-registered decision rules
1. **No-drift**: RAW FULL must reproduce the committed artifact's headline numbers exactly. Otherwise the drift is reported first, and the RAW re-run (not the old file) becomes the reference.
2. **Volume MATTERED in a study** if, between RAW and DROP (FULL), any of these holds:
   - any pre-registered verdict changes (PASS / HOLDS / SHOWN ↔ not);
   - a headline OOS rate moves by ≥ 2.0 pp;
   - a headline OOS $/trade moves by ≥ $0.10.

   Otherwise: "volume part carried no result".
3. **The tick count approximated real volume** if, in CME2Y, RAW and CME give the same verdicts and headline OOS within the same tolerances. Reported, not used for a decision.
4. **Per-module proposal** (applied to the CME2Y numbers, after the FULL step):
   - **SWITCH to CME (2024-10+ only)** ⇔ CME beats DROP on the module's volume-specific class in BOTH TRAIN and OOS of CME2Y, by ≥ 2 pp hold or ≥ $0.10/t, with OOS n ≥ 100;
   - otherwise **DROP the volume part** (it either never mattered or real volume does not add anything measurable).

   A module with no live caller gets the proposal written down but nothing more ("no live effect").
5. **Live gate (marketState)**: also descriptive. On every closed 15m bar from 2024-12-08, the share of bars whose state differs between RAW, DROP and CME (`scripts/vol_audit/state_agreement.mjs`), with n.

## Reported
- Per study: RAW / DROP (FULL) and RAW / DROP / CME (CME2Y) headline OOS + TRAIN numbers with n, the verdicts, and the rule-2 / rule-3 outcomes.
- Per module: live callers, the proposal (rule 4), and what a live change would alter.
- The proposals need Ashraf's approval before any code changes.
