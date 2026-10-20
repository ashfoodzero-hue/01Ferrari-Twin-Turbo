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

## ADDENDUM A (2026-10-20, after the first run, BEFORE this number) — distance-matched control

The §3 control placed its "tip" at the extreme of the last 10 candles. If that tip sits closer to price than a CHoCH's tip, the control breaks its tip more often by geometry alone, and "CHoCH is more often REAL" would be built in by definition (gold-measured-study §0b). Added: **control B** — for each CHoCH, 3 random closes of the same side's trend state and year, with the tip placed at the SAME distance in ATR as that CHoCH's own tip (close − tip)/ATR. Reported: the tip distance of CHoCHs vs control A, and REAL rate CHoCH vs control B (two-proportion test). Only the control-B difference counts as "a CHoCH changes the trend more often than chance".

## ADDENDUM B (2026-10-20, Ashraf mid-run: "this must be only at the broken S/R, and must retest first to confirm entry and a clear Green confirmation when ADX changes before and after the first break, and retest never cross the OB and return back to continue the trend change") — BEFORE any of its numbers

Results of §3-§4 and ADDENDUM A were already computed when this arrived (they are reported as they are). This addendum is a NEW, stricter setup, pre-registered here. BUY described; SELL is the exact mirror (red candle, resistance, OB high).

1. **CHoCH:** the §2 bullish CHoCH at 4H candle i.
2. **Broken S/R:** an S/R level of 4H or 1D (`srLevels.swingLevels` + `evaluateLevel`, the app's measured levels), born before candle i, a RESISTANCE whose FIRST flip (a close 0.5 ATR above it) happened on candle i or within the 2 candles before it (close time in (close of i−3, close of i]). Several → the highest. v = its price. No such level → no setup.
3. **Order block (OB):** the last red 4H candle (close < open) between the leg tip and candle i (inclusive); none → the tip candle. OB low = its low.
4. **Retest:** within the 6 candles after i, a candle whose low comes to ≤ v + 0.1 × ATR. From i+1 to the confirmation, NO candle may trade below the OB low (a wick through the OB cancels the setup — "retest never cross the OB").
5. **Clear green confirmation:** the retest candle or a later one within the same 6-candle window that closes green (close > open), with the close above v and body ≥ 50 % of its range. The first such candle = confirmation.
6. **ADX change** ("before and after the first break"): before = candle i−1 (just before the break); after = the confirmation candle. Gates:
   - **G0:** no ADX condition (the setup alone).
   - **G1:** ADX(after) > ADX(before) AND +DI > −DI at the confirmation.
   - **G2:** the DI cross: −DI > +DI before AND +DI > −DI after.
7. **Entry:** market, the first minute after the confirmation candle closes. **Stop:** OB low − 0.1 × ATR (the retest must not cross the OB). Targets T1 1R · T2 2R · T3 2 × ATR. Time exit 30 candles. Measured spread, 1m path, stop first.

K = 3 gates × 3 targets × 2 sides = **18**; pass rule = §6 with α = 0.05 / 18. Reported: the funnel (CHoCH → broken S/R → retest → no OB cross → green confirmation → each gate), WR with Wilson LB, $/trade, R, by year. XAU primary, XAG replication. Code: `scripts/lib/choch4h.mjs` `retestSetups`, `scripts/study_choch_retest.mjs` → `data/master/choch_retest_study[_xag].json`.

## ADDENDUM C (2026-10-20, after ADDENDUM B's numbers, BEFORE this one's) — the broken structure level itself

ADDENDUM B's funnel on XAU 13 y: 504 CHoCH → 33 broke a 4H/1D S/R level (ZigZag 3×ATR swings, i.e. big swings only) → 17 retested → 15 no OB cross → **8 confirmed** (XAG: 6). Unpowered by construction (n far below 30), so B can never pass or fail. In a CHoCH the broken level IS a structure S/R (the last lower high / higher low), so ADDENDUM C runs B's rules 3-7 unchanged with **v = the CHoCH's own broken level** (`e.level`) instead of a 4H/1D srLevels flip. Same K = 18 cells, same pass rule (α = 0.05 / 18), XAU primary + XAG replication. One variant only, declared for power, not chosen from results. Output `choch_retest_struct_study[_xag].json`.

## ADDENDUM D (2026-10-20, Ashraf after ADDENDUM C's numbers: "this setup should be tested only for long swing trades only, not scalp") — BEFORE its numbers

The B / C setups unchanged (C = the broken structure level; B is reported too but stays unpowered). Entry and stop unchanged (market after the confirmation candle; OB extreme ∓ 0.1 ATR). **Long-swing exits only:**
- **X1:** target 3R · **X2:** target 5R (time cap 120 4H candles ≈ 20 trading days for both);
- **X3:** no target — hold until the OPPOSITE 4H CHoCH (the trend changes back; exit at the close of its decision minute) or the stop, time cap 120 candles.
K = 3 exits × 3 gates (G0/G1/G2) × 2 sides = **18**, pass rule §6 with α = 0.05 / 18; XAU primary, XAG replication. Output `choch_retest_struct_long_study[_xag].json`.

## 8. Output

`scripts/study_choch_4h_adx.mjs` → `data/master/choch_4h_adx_study.json`, atlas `docs/CHOCH_4H_ADX_ATLAS.md`, MASTER §7 entry, memory.
