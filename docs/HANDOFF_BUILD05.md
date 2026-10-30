# HANDOFF: Ferrari Twin Turbo build-05 (written 2026-10-30 ~11:40 UTC, end of build-04)

**Resume phrase: "Ferrari Twin Turbo build-05".** It runs skill `twin-turbo-continuity` §A:
1. Read THIS file first.
2. Then `docs/MASTER_DOCUMENT.md` §7 (fb) … (ff), `docs/research/README.md` and `docs/DATA_CONTRACT.md`.
3. Load `gold-measured-study`.
4. Check reality read-only: git log, `data_health.json`, `child_runs.jsonl`, app processes.

## 1. Live state (verified 2026-10-30 11:33 UTC: health OK, no issues)

- **The app is running:**
  - run_twin, stream, chart 7444, settings and keep-awake;
  - started 2026-10-29 23:09:45 UTC via `FerrariTwinTurbo_Watchdog`;
  - **not restarted in build-04, and nothing live was changed.**
- **92 % WR rule** (`src/master/wrGate.js`):
  - only swing arm 1, bracket E0, is allowed (record only, no Telegram);
  - everything else records silently: SCALP, SCALP85, ML SELL, L4H3, IMPULSE_CONT.
- **Background jobs** were all exiting 0 on 10-30: matrix_tick every 3 min, calendar, futures recorder, forward BUY_D1.
- **Forward BUY_D1 tests:** both have NO VERDICT yet.
  - main: 8 of 100 resolved;
  - once-a-day: 5 of 10 resolved.

## 2. Done in build-04, all research and nothing live (MASTER §7 letters)

- **(fb) Self-learning SPEC v1.0.**
  - File: `docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md`.
  - Contents: tracks T1-T8, the blind rule, the split, the pass bars, never auto-enable.
- **(fc) SPEC v1.1 = Addendum A**, Ashraf's answers:
  - **Q1:** the split is OK, plus yearly walk-forward 2018 → (≥ 80 % of folds with the same sign), stress eras, a bias audit with a shuffled null, and MISSING never filled.
  - **Q2:** the weekly loop runs Sunday 10:00 UTC, after its dry run is reported.
  - **Q3:** drift flags are written ONLY to `data/research/self_learning/`. No Telegram.
  - **Q4:** a NEW track **T0** (every wave, every TF, its measured reason).
  - **News / macro = EVERYTHING:** T2 covers all 157 FF event types; T1 covers all 85 numbered releases.
  - **New order:** T0 → T1 → T2 → T3 → T4-T6 → T7 → T8 → merge summary.
- **(fd) T0 wave reason ledger, XAU.**
  - Scope: 16 TFs, 2013-07 → 2026-10, 24 items, failed-extreme control.
  - Files: sub-spec `docs/research/wave_reasons/2026-10-30_T0_wave_reasons_SPEC.md` + addenda B / C / D; script `scripts/research/wave_reasons/study_wave_reasons.mjs` (~9 min); summary `data/research/wave_reasons/2026-10-30_xau_T0_summary.json`; rows `xau/<tf>.jsonl` (332 MB, gitignored).
  - **Audit VALID:** known_t violations 0, swing book equal, shuffled null 0 / 323.
  - **Result:** 41 REASON cells, all on ≤ 3H.
    - News (lift ×1.13-1.81 after the volatility check), session open hour, RSI divergence, sweep, DXY (moves in the same candles).
    - These tell **WHEN** a turn is likelier, **never WHICH WAY**: news supports the new wave at only 51-54 % of real turns.
    - Climax = the volatility itself.
    - Levels, higher-TF leg, yields, month end, holidays: never a reason.
    - 4H: nothing. 1D and up: too few waves.
- **(fe) 1m / 1M swing-table clash FIXED.**
  - Cause: Windows file names ignore case, so 1m.csv = 1M.csv.
  - Fix: helper `tfFile()` in `scripts/lib/series_1m.mjs` (monthly → `1Mo`); `swings_1y.mjs --to=`.
  - Tables restored for 5 series. 374 rows on 10-15 / 16 changed, because of the 10-19 reconcile; the TradingView check was not redone for those 2 days.
  - The T0 1m check now passes row by row.
- **(ff) T1 step 1: inventory + labels of all 85 releases.**
  - Files: sub-spec `docs/research/macro_nowcast/2026-10-30_T1_inventory_SPEC.md` + addendum A; script `scripts/research/macro_nowcast/t1_inventory.mjs`; result `data/research/macro_nowcast/inputs/2026-10-30_T1_inventory.json`.
  - Labels: **33 buildable · 51 not buildable · 1 Fed (F) · 0 public-only.**
  - Every input verified: 49 FRED / ALFRED series with first-print vintages, 3 market series, 12 earlier FF prints, the Treasury DTS API.

## 3. Answers / refuted (never re-quote without its context)

- **T0:**
  - nothing measured gives the DIRECTION of a gold turn;
  - news / open hour / big candles only TIME it, on ≤ 3H;
  - most turns (80-99 %) have no news.
- **Never quote a T0 lift without its prevalence and its D2 direction result.**
- **Retail sales and core retail are NOT buildable from free dated data** (weight-coverage rule).

## 4. Ashraf's binding decisions (this build)

- Answers Q1-Q4 → SPEC Addendum A (above).
- "do the most best … zero guessing": a value without a source + publication time = MISSING.
- Drift flags only in our folder, no Telegram.
- Standing:
  - nothing live without his OK; ask before every restart; no paid data;
  - MERGE summary before any merge;
  - DATA CENTER project first, Ferrari on minimum credit (one fresh chat per step).

## 5. NEXT (in order)

1. **T1 step 2: blind nowcast for the 33 (a) releases.** Sub-spec first, under `docs/research/macro_nowcast/`.
   - The extractor writes `data/research/macro_nowcast/inputs/` with `known_t` from ALFRED vintages, the FF earlier prints and DTS. It **never writes the target's own actual**.
   - The predictor reads only `inputs/`; the smoke test `smoke_blind_paths.mjs` greps it for any path to actuals.
   - All predictions are committed (sha256) BEFORE the scorer.
   - The scorer compares against the FF consensus, naive and GDPNow (from 2016-05); per year, per component, with the paired bootstrap LB.
   - Input start limits (MISSING before them): PPIFIS 2014-02 · MTSDS133FMS 2015-09 · GDPNOW 2016-05 · goods trade 2015-07 · prelim wholesale 2016-08 · flash services PMI 2013-11.
2. **T1-F:** Fed decision vs the futures-implied path (check a free dated futures history first).
3. **T2:** reactions for all 157 event types (uses the T1 surprises + T0 news columns).
4. Then T3 → T4-T6 → T7 → T8 (dry run → Ashraf's yes → Sunday 10:00 UTC) → merge summary.
5. **T0 v2:** XAG / DXY / WTI with the same script (`study_wave_reasons.mjs XAGUSD` etc.).

## 6. Open items

- BEA confirmation of the 10-29 actuals (GDP 3.4, deflator 2.3): still open.
- N2 spike-BUY paper forward test awaits Ashraf's OK. V1H vetoed-BUYs review. matrix_trades studies before 10-26 need re-measuring.
- TradingView recheck of the swing tables for 2026-10-15 / 16, after the reconcile-corrected rebuild (not done).
- Untracked `scripts/diag_scalp_sell_ml_weekday.mjs`, from an earlier build: not this build's, left as is.

## 7. Where everything is

| what | where |
|---|---|
| SPEC (master of the self-learning system) | `docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md` (v1.1) |
| T0 | `docs/research/wave_reasons/`, `scripts/research/wave_reasons/`, `data/research/wave_reasons/` |
| T1 | `docs/research/macro_nowcast/`, `scripts/research/macro_nowcast/`, `data/research/macro_nowcast/inputs/` |
| research map | `docs/research/README.md` |
| per-TF file names | ALWAYS `tfFile(tf)` from `scripts/lib/series_1m.mjs` |
| FRED key | `.env` `FRED_API_KEY` (works; ALFRED vintages reachable) |

## 8. Working rules

- **Pre-register:** spec / addendum BEFORE numbers; an audit failure voids a run.
- **Measure, not infer:** the D1 / D2-style diagnostic before any claim.
- **Commits:** explicit paths, as Ashraf, never `git add -A`.
- **No python / heredoc code edits:** use the Edit tool. Beware sed inserting `//` before a trailing comma (happened in build-04).
- **Heavy runs:** in the background, scripts on the PC.
- **Credit:** one fresh chat per step; the handoff file is the memory.
