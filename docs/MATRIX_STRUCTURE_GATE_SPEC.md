# Matrix SCALP — no BUY while the 1H / 4H structure is bearish (pre-registered 2026-10-20, before any number)

**Request (Ashraf, 2026-10-20):** "currently the market confirm reversal to Bearish trend and we keep sending signal to buy and it fails most of the times … and we never trigger a sell trades".

**Facts (journal):** since the Sunday 10-18 22:00 UTC open: 13 SCALP BUYs, 2 wins, 11 SL, net −$27.91/oz, 0 SELLs. 1H bearish CHoCH 10-19 11:00 UTC (close 4161.27 broke the 4165.53 higher low), then lower high 4146.90 and lower low 4115.57; 11 of the 13 BUYs came after it. The SCALP never reads the trend; its SELL rule fired 4× in 2 years (§7 (bh)).

**Earlier tests (not repeated):** loss autopsy §7 (bs) — 15m market state, gold 15m / 1h vs EMA20, DXY / silver trends: none avoided losers. A PIVOT-STRUCTURE trend gate was never tested.

## Rule

Structure state = `scripts/lib/choch4h.mjs findChochs(...).state` on gold-session candles from the 1m bid (pivots 3 / 3, known at pivot + 3): DOWN = the last two confirmed pivot highs descend AND the last two pivot lows descend. Read on the last candle CLOSED at the signal's decision time.

- **V1H:** skip a SCALP BUY when the 1H state is DOWN.
- **V4H:** skip a SCALP BUY when the 4H state is DOWN.

K = 2. Money path = `scripts/lib/matrix_trades.mjs` (the gate's ONE sequence), veto before sequencing. Windows and pass rule = `MATRIX_DXY_CONFLICT_SPEC.md` (2 y with WTI primary, TRAIN first 60 % / OOS last 40 %; 13 y without WTI robustness; vetoed ≥ 30 OOS; vetoed lose more than kept in TRAIN and OOS; filtered book better than baseline in TRAIN and OOS; same signs on 13 y).

A pass = the gate is wired into the SCALP (it stays SHADOW until its own money is positive). A fail = nothing wired.

## ADDENDUM A (2026-10-20, after V1H / V4H's numbers, BEFORE this one's)

V1H passed, but on the last 2 days it vetoes NONE of the 13 BUYs: the LH+LL state needs a confirmed lower high AND lower low, so after the 10-19 11:00 bearish CHoCH it stayed MIXED until 10-20 07:00 (the confirmed highs were 4187.49 → 4190.17, rising). Ashraf's frame is "the market confirmed the reversal to bearish" = the CHoCH itself. Added:
- **C1H:** skip a SCALP BUY when the most recent 1H CHoCH (choch4h.findChochs events, decision time ≤ the signal) is BEARISH (a later bullish CHoCH lifts it).
- **C4H:** the same on 4H.
Same money path, windows and pass rule. K for the family becomes 4.

Study: `scripts/study_matrix_structure_gate.mjs` → `data/master/matrix_structure_gate_study.json`.
