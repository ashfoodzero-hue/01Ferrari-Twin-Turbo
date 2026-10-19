# SELL trigger — gold sweeps a high, silver does not confirm (pre-registered 2026-10-19)

**Status:** SPEC ONLY — written before any number. Nothing is run until Ashraf says "run it as written".

**Request (Ashraf, 2026-10-19):** "we need to improve the sell trigger as well above 85%-95% WR, please work in it intensively".

## 0. Why a NEW mechanism (what is already measured — not re-run)

| Earlier SELL test | Result |
|---|---|
| Matrix SELL rules choch / red / prevlow (§7 (as)) | 0/6. Red candle 88 % WR but −$0.34/t on 13 y |
| SELL only in confirmed downtrends (§7 (bi)) | 0/12. No cell ≥ 85 % WR, all negative |
| INVESTIGATION_90WR SELL_D1 model | best 82.7 %, OOS AUC 0.505 → no sell arm |
| 3m confirmation at 15m tips (§7 (cs)) | 0/384, coin flip before costs |
| Sweep-reclaim on gold alone (Turbo2 BIG_SWING_HTF, London fake move) | refuted (−0.006 R; fade-the-break loses) |
| Waterfall rider | refuted (5 lottery trades carry the cell) |

Lesson: **WR is a price.** A 3R stop with a 0.25R target gives 85-90 % WR on almost any entry and still loses after the spread. Every earlier SELL used **gold's own price only**. This study adds information gold's price does not have: **silver's behaviour at the same moment**. The swing-reasons atlas (§7 (cn)) found "silver diverges" at XAU 4H swings 10 % vs 0 % at controls (significant after Holm, descriptive). Nobody has tested it as a SELL entry with money.

## 1. Definitions (closed candles only; everything known at its time)

- **Data:** Polygon 1m, `clean1m('XAUUSD')` and `clean1m('XAGUSD')` (`scripts/lib/series_1m.mjs`), gold session candles via `kit(sym).build`. 2013-07-14 → 2026-10-16. Silver and gold use the same session grid; a candle is used only when both exist.
- **Timeframes:** 1H and 4H (4H = New York 17:00 anchor).
- **Swing high (reference):** fractal pivot high, 3 lower highs each side (PIV = 3, as `structure3m`). It is **known only at its confirmation candle** (pivot + 3). The reference is the most recent confirmed pivot high not yet taken out by a close above it.
- **Silver's matched high:** the XAG pivot high (same rule) whose candle lies within ±2 candles of gold's pivot candle; if none, the XAG candle high on gold's pivot candle.
- **SWEEP (gold):** a closed candle whose high goes above the gold reference high AND whose close is back below it.
- **SMT (silver does not confirm):** on that same closed candle, the highest XAG high since silver's matched high is still **below** silver's matched high.
- **ATR:** ATR(14) of the same timeframe, at the sweep candle.

## 2. Entries (2)

- **T1 — candle close:** sell at the sweep candle's close (decision = close time).
- **T2 — 3m break:** after the sweep candle, wait up to 2 candles of the same TF for the first 3m close below the last 3m higher low (`structure3m.makeStructure`, the §7 (co) rule); sell at that 3m close. No break → no trade.

Fill: the next 1m bar's open on the **bid**, measured spread from `spreadModel.makeSpreadAt`. One trade at a time per TF.

## 3. Exits (3), stop the same for all

- **Stop:** sweep candle high + 0.10 ATR (buy back on the ask). Stop first when stop and target sit inside the same minute.
- **E1:** target 1R · **E2:** target 0.5R · **E3:** target 0.25R.
- Time exit: 48 h at market (ask).

## 4. Cells and K

TF {1H, 4H} × condition {SWEEP only, SWEEP + SMT} × entry {T1, T2} × exit {E1, E2, E3} = **K = 24**.
SWEEP-only cells are the control: the SMT effect = SWEEP+SMT minus SWEEP-only, same TF / entry / exit.

**Report-only controls (not in K):**
- **Random SELL:** the same hour of day, same stop distance in ATR, same exits, at random candles (seeded, 5× n) — the WR that the geometry alone buys.
- **Silver-confirms:** sweep where silver DID make a higher high — the mirror group.

## 5. Windows

- TRAIN 2013-07-14 → 2021-06-30 (≈ 60 %), OOS 2021-07-01 → 2026-10-16.
- By year and two eras (2013-2019 / 2020-2026) for the robustness lines.

## 6. Pass rule (fixed now; ALL must hold for a cell)

1. OOS n ≥ 100 trades.
2. **OOS WR ≥ 85 %** with Wilson lower bound ≥ 80 %.
3. **OOS $/trade > 0 after the measured spread**, week-block bootstrap lower bound > 0 at α = 0.05 / 24.
4. TRAIN $/trade > 0 (same sign both windows).
5. SMT cells: $/trade better than the matching SWEEP-only cell in TRAIN and in OOS.
6. Positive $/trade in ≥ 60 % of years with ≥ 10 trades.

WR without money is not a pass. A cell that passes 1-6 becomes a **SHADOW candidate** (paper record, forward test) — never a live trade from the backtest alone.

## 7. Audit (before any number is reported)

- **No look-ahead:** prefix check — rerun on data cut at each of 200 random decision times; every trade decided before the cut must be identical.
- **Independent second evaluator:** 300 random trades re-priced from raw 1m minutes by a separate short script; 0 differences required.
- **Positive control:** an oracle variant (sells only sweeps whose next 4 candles fall) must show WR ≫ base, proving the harness can see an edge.
- **Built-in check:** confirm that "silver does not confirm" is not true by construction of the swing (it is decided on the sweep candle, before the outcome).

## ADDENDUM A (2026-10-19, after Ashraf's "Yes, run it as written", BEFORE any number) — operational choices

1. **Raw minutes:** `clean1m(sym, { reopenClamp: false })` for gold and silver. The TradingView reopen clamp looks 10 minutes ahead; a money test must not (same as `CONFIRM3M_MONEY_SPEC` ADDENDUM B).
2. **Incomplete candles** (`dataHoles.markIncomplete`) are never a sweep candle and never confirm a pivot.
3. **"Candle close is known"** = the first minute of a LATER candle exists. T1 fills at that minute's open (bid). For the last 4H candle of a session that is the next session's open (gap risk is real and kept).
4. **T2 cancel:** if, before the 3m break, a 3m high reaches the stop level, there is no trade (the sweep failed). The 3m pivot low used is the latest one confirmed (pivot + 3 closed) at that 3m close.
5. **Gaps:** if a minute OPENS beyond the stop (ask open ≥ stop), the exit is that open (worse than the stop). A target gap is filled at the target (never better).
6. **Overlaps:** one trade at a time inside each cell; a signal while the cell's trade is open is skipped (counted).
7. **Bootstrap:** one-sided week-block, B = 10,000; LB = the α/K quantile; its p (share of resamples ≤ 0) feeds Holm.
8. **Random SELL control:** for every cell trade, 5 random complete candles of the same TF, the same UTC hour and the same window (TRAIN/OOS), seeded; entry at the next candle's first minute; stop = entry + the same stop distance in ATR; same targets.

## 8. Report

Table per cell: n (TRAIN / OOS), trades per week, WR with Wilson LB, $/trade and R/trade after spread with bootstrap LB, SMT lift, random-SELL WR at the same geometry, years positive. Plain verdict: PASS / FAIL per cell, Holm across K. Files: `scripts/study_sell_smt_sweep.mjs` → `data/master/sell_smt_sweep_study.json`, atlas `docs/SELL_SMT_SWEEP_ATLAS.md`, MASTER §7 entry.
