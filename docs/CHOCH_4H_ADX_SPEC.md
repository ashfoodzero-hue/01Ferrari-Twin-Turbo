# 4H CHoCH that really changes the trend + ADX + the exact entry (pre-registered 2026-10-20, BEFORE any number)

**Status:** SPEC ONLY. Nothing is run until Ashraf says "run it as written".

**Request (Ashraf, 2026-10-20):** "we just need to study the real ChoCH when it really confirm trend changing and read the ADX at the levels at 4H time frame at the exact level it confirm the reversal in both way and find the method for the exact entry price after confirmation of ChoCH, can we do the research first and confirm it works 100%".

**Honest frame, written before the numbers:** no rule on gold is 100 % — a reported 96-98 % was always look-ahead or a fill bug (memory). This study measures what a 4H CHoCH + ADX really does, with the money after the spread. If nothing passes, that is the answer.

**Already measured, not repeated:** 15m CHoCH re-arm (Turbo2): waiting for the CHoCH raised the entry while the stop stayed at the tip → worse R (−0.35 to −0.40 R). 3m confirmation at 15m tips: coin flip (§7 (cs)). ADX at a 4H CHoCH: never measured.

## 1. Data

XAU spot, Polygon 1m RAW (`clean1m('XAUUSD', { reopenClamp: false })`), 2013-07-14 → 2026-10-16. 4H gold-session candles (New York 17:00 anchor, `kit('XAUUSD').build`), incomplete candles marked (`dataHoles`). Replication (report only): XAGUSD, same rules.

## 2. Definitions (closed 4H candles only)

- **Pivot:** fractal, 3 strictly lower highs (higher lows) on the left, 3 lower-or-equal (higher-or-equal) on the right; known at the close of pivot + 3.
- **Downtrend at time t:** the last two confirmed pivot highs descend (lower high) AND the last two confirmed pivot lows descend (lower low). Uptrend: the mirror.
- **Bullish CHoCH:** in a downtrend, the first 4H CLOSE above the last confirmed lower high. The **leg tip** = the lowest low since that lower high. **Bearish CHoCH:** the mirror (close below the last higher low in an uptrend; tip = highest high since it).
- **ADX at the CHoCH:** Wilder ADX(14), +DI, −DI on 4H, value at the CHoCH candle (known at its close). Also: ADX 3 candles earlier (rising / falling), and whether the DI lines agree with the new direction.
- **REAL CHoCH (trend really changed):** price reaches CHoCH close + 2 × ATR(14, 4H) in the new direction BEFORE any close beyond the leg tip, within 30 4H candles (5 trading days). **FAILED:** a close beyond the tip first. Neither = undecided (counted, reported).

## 3. Part A — which CHoCHs are real (descriptive + the ADX question)

- Base rate of REAL, per side.
- REAL rate by ADX bucket: < 20, 20-25, 25-30, 30-40, ≥ 40; ADX rising vs falling; DI agrees vs not. Each vs the side's base rate, two-proportion test, Holm across all ADX rows.
- Control: the same rows at **random 4H closes in the same trend state** (same side, matched by year), so an ADX effect that is just "ADX high = big moves anywhere" is visible.

## 4. Part B — the exact entry (money)

Entries, each BUY after a bullish CHoCH / SELL after a bearish one:
- **E1 market:** the first minute after the CHoCH candle closes.
- **E2 retest:** limit at the broken level (the lower high / higher low), valid for 6 4H candles; cancelled if the tip breaks first.
- **E3 half-way:** limit at 50 % of the move from the tip to the CHoCH close, valid 6 candles, same cancel.

Stop: the leg tip ∓ 0.1 × ATR(4H) (beyond the tip). Targets: **T1** 1R · **T2** 2R · **T3** 2 × ATR(4H). Time exit 30 4H candles. 1m path, measured spread (`spreadModel`), stop first inside a minute, gaps filled at the open.

Two arms:
- **ALL:** every CHoCH.
- **ADX-gated:** one ADX rule chosen on TRAIN ONLY (the bucket / rising / DI rule with the highest TRAIN $/trade with n ≥ 30), applied once to OOS.

K = 3 entries × 3 targets × 2 sides × 2 arms = **36**.

## 5. Windows

TRAIN 2013-07 → 2021-06-30, OOS 2021-07-01 → 2026-10-16. Robustness by year.

## 6. Pass rule (all must hold)

1. OOS n ≥ 30.
2. OOS $/trade > 0 after the spread, week-block bootstrap lower bound > 0 at α = 0.05 / 36.
3. TRAIN $/trade > 0.
4. Positive in ≥ 60 % of years with ≥ 5 trades.
5. WR is reported with its Wilson lower bound next to $/trade and R — never alone.

A pass = a SHADOW candidate (paper forward test), never a live trade from the backtest alone.

## 7. Audit before any number is reported

Prefix check (signals identical when the data is cut at 200 random times); independent second evaluator on 300 random trades; positive control (an oracle that knows the next 6 candles) must show a clear edge; "REAL" is not true by construction for any reported row.

## 8. Output

`scripts/study_choch_4h_adx.mjs` → `data/master/choch_4h_adx_study.json`, atlas `docs/CHOCH_4H_ADX_ATLAS.md`, MASTER §7 entry, memory.
