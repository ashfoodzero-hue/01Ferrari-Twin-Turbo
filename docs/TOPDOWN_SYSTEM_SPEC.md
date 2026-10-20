# TOP-DOWN SYSTEM — HTF reversal sets the direction → swing + continuation entries → scalps on pullbacks (pre-registered 2026-10-20, BEFORE any number)

**Status:** SPEC ONLY. Nothing runs until Ashraf says "run it as written".

**Request (Ashraf, 2026-10-20):** "we should trigger when a real reversal trigger on the HTF then go with it's continuation trades as per the trend direction … this is a setup for Swing trades and a continuation confirmation when it retest … on the pull backs we can do a Scalp trades on the correct level when it is confirmed, and then take profit at the expected Continuation of the trend level".

**Why a new test:** the PIECES were measured one by one (4H CHoCH alone §7 (de2); OB-retest entry; Matrix SCALP with a 1H trend gate §7 (df)). The METHOD as one system — the HTF direction decides every lower-timeframe trade — was never tested.

## 1. Data and rules shared with earlier studies

Polygon 1m raw (no reopen clamp), XAU primary, XAG replication, 2013-07 → 2026-10-16; TRAIN to 2021-06-30, OOS after. Gold-session candles; pivots 3/3 known at pivot + 3; CHoCH = `scripts/lib/choch4h.mjs findChochs` (the same code on every timeframe). Fills on the 1m bid with the measured spread, stop first inside a minute, gaps at the open, one position at a time per layer.

## 2. Layer 1 — the HTF direction (the regime)

**Regime** = the side of the most recent HTF CHoCH (decision ≤ now): bullish CHoCH → LONG regime, bearish → SHORT regime, until the opposite HTF CHoCH. Two HTF choices, both reported: **HTF = 4H** and **HTF = 1D**.

## 3. Layer 2 — swing + continuation entries (in the regime direction only)

- **S-REV (the reversal swing):** ADDENDUM E's entry (`choch4h.obChochSetups`: retest into the OB of the HTF CHoCH, OB never broken, first 15m CHoCH inside the OB). Stop: OB extreme ∓ 0.1 ATR(HTF).
- **S-CONT (continuation confirmation):** inside a regime, every 1H pullback that ends with a 1H CHoCH back in the regime direction (e.g. LONG regime: a 1H bullish CHoCH) → entry the minute after that 1H candle closes. Stop: the 1H pullback's tip ∓ 0.1 ATR(1H).
- **Exits (swing):** **X-2R** · **X-3R** · **X-HOLD** = hold until the regime flips (the opposite HTF CHoCH) or the stop; time cap 120 HTF candles.

## 4. Layer 3 — scalps on the pullbacks (in the regime direction only)

- **SC:** inside a regime, during a 1H pullback (the last 1H CHoCH is AGAINST the regime), the first 15m CHoCH back in the regime direction → entry the minute after that 15m candle closes. Stop: the 15m tip ∓ 0.1 ATR(15m).
- **Take profit = "the expected continuation level":** the last confirmed 1H pivot extreme in the regime direction before the pullback (LONG: the last 1H pivot high = where the trend resumes). If that is less than 1R away, no trade. Time cap 48 h.

## 5. Controls (report, not in K)

- **No-regime:** the same S-CONT and SC entries in BOTH directions, ignoring the regime — shows what the HTF filter adds.
- **Drift:** random entries in the regime direction with the same stop distance (ATR) and the same exit — shows whether profit is gold's rise.

## 6. Cells and pass rule

K = HTF (4H, 1D) × side (LONG, SHORT) × [S-REV × 3 exits + S-CONT × 3 exits + SC × 1] = 2 × 2 × 7 = **28**.
Pass (all): OOS n ≥ 30 · OOS $/trade > 0 with week-block bootstrap lower bound > 0 at α = 0.05/28 · TRAIN $/trade > 0 · positive in ≥ 60 % of years (≥ 5 trades) · beats its no-regime control in TRAIN and OOS · its drift-control difference has a positive 95 % lower bound. WR with Wilson LB, R, trades per week reported next to $ — never WR alone.

A pass = a SHADOW layer (paper forward test, shown on the chart). Nothing goes live from the backtest alone.

## 7. Audit (before any number is reported)

Prefix check (100 cuts: regimes + every entry decided before the cut identical) · independent second evaluator (200 trades from raw minutes) · positive control (an oracle that knows the next 6 candles beats the cell clearly).

## 8. Output

`scripts/study_topdown_system.mjs` → `data/master/topdown_system_study[_xag].json`, atlas `docs/TOPDOWN_SYSTEM_ATLAS.md`, MASTER §7, memory.
