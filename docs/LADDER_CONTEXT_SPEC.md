# Ladder context on the chart: the swing study's finding, live, as INFORMATION only (rules, 2026-10-17)

Status: **WRITTEN, NOT BUILT.** Shown to Ashraf before anything is built or goes live.

## Request (Ashraf, 2026-10-17)

Chosen: **"Ladder context on the chart"**:

> Show the study's finding live as INFORMATION only: when a swing forms, display which ladder steps have flipped and the measured odds it is real (e.g. '4H low · 3H flipped · 83% real historically'). Rules first, no trade signal, your approval before it goes live.

**Source of truth:** `docs/SWING_STUDY_BOOK.md` §5B (Phase 3, the flip ladder) and §5F-5H (the trade tests: 0/60, no entry edge).

## 1. What is shown (per anchor: 15m, 1H, 4H, 1D)

**The anchor's live leg,** from its ZigZag (3 × ATR14, the study's rule):
- in a down-leg (last confirmed swing = a high): the RUNNING LOW = the lowest price since that high;
- in an up-leg: the RUNNING HIGH.

**The ladder at that extreme:**
- which lower timeframes have CONFIRMED their own swing at exactly that price (the study's exact-price rule, `scripts/lib/swing_ladder.mjs`);
- shown as steps: three steps below, two steps below, one step below. Example for 4H: 1H ✓, 2H ✓, 3H ·.

**The measured odds, quoted, never recomputed live:**
- from `data/master/swing_ladder_atlas.json`, OOS: P(real | the deepest flipped step), next to the base rate;
- e.g. "4H low 4,146.98 · 2H flipped → 72 % become real 4H swings (base 46 %) · OOS n 267";
- when no step has flipped: "base 46 %";
- if the anchor has already CONFIRMED the swing: "4H swing CONFIRMED".

**Fixed footer on every tile:**
> ⓘ information only — the study's trade tests found NO profitable entry from this (0 of 60, book §5F-5H)

## 2. Rules (no look-ahead; the same as the study)

- **Data:** the live verified spot XAUUSD 1m store (`loadBars` → `cleanForTv`), closed minutes only. Candles from `nyCandles` (TradingView-exact).
- **ZigZag per timeframe:** `swings.zigzag` (k = 3, ATR14). A lower timeframe "flipped" only when its swing is CONFIRMED (the close of its confirming candle ≤ now).
- **History window:** enough history for the ZigZag to match the full-history study engine.
  - Planned: 15m/1H from 120 days; 4H from 400 days; 1D from 4 years of 1m.
  - **Smoke-verified:** the last swings from the window equal those from the full history.
- **Odds** are looked up by anchor × side × deepest flipped step. Only steps the study tested are quoted:
  - 15m: 1m / 3m / 5m;
  - 1H: 5m / 15m / 30m;
  - 4H: 1H / 2H / 3H;
  - 1D: 4H / 6H / 9H.

  A step whose study verdict was "no evidence" is shown with its number AND "(no evidence)". A described-only cell (1D) is shown with "(n small)".

## 3. How it runs

- **`scripts/ladder_tick.mjs`:** run by `run_twin` every 3 minutes while the market is open (+ once at start). It writes `data/master/ladder_state.json`.
  - Fail-closed: no fresh minute → nothing written, and the tile shows "STALE".
- **`run_chart.mjs`:** `GET /api/ladder` serves the state file.
- **`ops/chart/index.html`:** one compact chip per anchor next to the 4H Magnet chip, with a tooltip holding the full numbers and the footer.
- **No Telegram, no trade, no alert.** (A Telegram notice could be a later, separate decision.)
- **`--dry`:** compute and print, write nothing.

## 4. Proof before it goes live

**`smoke_ladder_context.mjs`:**
1. **WINDOW PARITY:** for each anchor and its ladder timeframes, the swings from the live window equal the full-history swings over the overlap.
2. **REPLAY:** at 3 historical moments, the state reproduces the study's own flip determination at the same extreme (`flipAt`), and quotes the study's odds exactly.
3. **NO LOOK-AHEAD:** run at a past "now", the state uses only minutes ≤ now; a swing confirmed after "now" is not shown.
4. **The footer is present** on every tile; no word "BUY / SELL / entry" appears.

Plus: chart smoke updated, a package-sync check, and a MASTER_DOCUMENT entry. A book note goes in §7 (open questions → "in use as context").

**Going live = the run_twin hook + a chart restart, with Ashraf's approval.**
