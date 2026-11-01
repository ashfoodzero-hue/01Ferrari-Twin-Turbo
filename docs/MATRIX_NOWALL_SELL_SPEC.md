# MATRIX NO-WALL CONTINUATION SELL: pre-registered 2026-11-01 BEFORE any number

**Ashraf (2026-11-01):** "this big drop we never ever fired a trade … we are missing something in our setup and our coding and our conditions" → "Yes, start the test".

**Origin (measured, MASTER §7 (fn)):** on Friday 2026-10-30 the live Matrix 3m SELL conditions other than the wall (WTI hour bullish, DXY > EMA10, close below the last confirmed swing low) held on 35 bars, the first at 23:06 UTC @ 4,014.16. The only blocker was the wall rule (SELL only when the high reaches the ceiling). The 10-22 study (§7 (dw)) tested SELLs AT the wall only. **This tests the same SELL WITHOUT the wall, which has never been tested.**

**READ-ONLY research.** Nothing live changes. A pass goes to Ashraf; going live needs his OK and his 92 % rule.

## 1. The rules (fixed now, no grid)

At every closed 3m gold bar (live Matrix candles, `loadBars('XAUUSD','3m')`), using only what is known at the decision time (bar close + 3 min, exactly as the live Matrix):

| cell | conditions |
|---|---|
| **NW** | WTI last hour bullish (`wtiHourAt`, live delay) AND DXY 3m close > EMA10 AND gold close < last confirmed 3m swing low (`confirmedPivots`) |
| **NW-1H** | NW AND the 1H structure is DOWN at the decision time (`makeAligned` stateAt('1H') = −1, the same state the live V1H veto uses) |
| **NW13** (13-year robustness, no WTI) | NW without the WTI condition (WTI 1m exists only from 2024-10) |
| **NW13-1H** | NW13 AND 1H DOWN |

**Trade geometry (the live Matrix SELL, unchanged):**
- stop = highest high of the last 5 bars + 0.5;
- TP1 = entry − max(10, 2 × risk); TP2 = entry − 1.5 × that reward;
- half closes at TP1, the stop then moves to break-even;
- 24 h time stop;
- money path `resolveMatrixTrade` (SELL fills the bid, exits pay bid + spread `makeSpreadAt`, stop first in the minute, slippage);
- one trade at a time (`matrixTrades` sequencing).

## 2. Windows and split (same as the 10-22 study)

| window | span | cells | TRAIN / OOS split |
|---|---|---|---|
| PRIMARY (with WTI) | 2024-10-10 → 2026-10-30 21:00 UTC (Friday included) | NW, NW-1H | 2025-12-26 |
| ROBUST_13Y | 2013-07-21 → 2026-10-30 21:00 UTC | NW13, NW13-1H | 2021-06-30 |

## 3. Controls

- **C-choch:** the SELL on "close below the last swing low" alone (no WTI, no DXY), same window and geometry. It shows whether the DXY / WTI filters add anything.
- **Gold's drift:** a SELL loses on average in a rising market. Every result is shown beside the control's $/trade.

## 4. Pass rule (a cell passes only if ALL hold)

1. $/trade > 0 in TRAIN and in OOS.
2. Week-block bootstrap lower bound of $/trade > 0 in TRAIN and OOS, one-sided α / K, K = 4.
3. OOS n ≥ 30.
4. $/trade beats C-choch in TRAIN and OOS.
5. For PRIMARY cells: the matching 13-year cell (NW → NW13, NW-1H → NW13-1H) has $/trade > 0 over ALL years.

**Always reported, pass or fail:**
- the triple (WR, $/trade, trades per day);
- outcome mix (WIN / SCRATCH / LOSS);
- per year;
- on big DOWN days vs big UP days (gold's NY-session day change in the bottom vs top 20 % of days in the window, descriptive);
- what the cell did on 2026-10-30.

## 5. Audits (any failure voids the run)

1. **Parity with the live record:** for 2026-10-30, the NW condition bars computed by the study must match the 35 bars in `data/paper/matrix_decisions.jsonl` where wti_bullish ∧ dxy_bullish ∧ close_below_swing_low (by bar time). Differences are listed and explained, or the run is void.
2. **No look-ahead:** every signal's decisionT > its bar's close; the WTI hour used ends before the decisionT minus the live delay (asserted).
3. **Determinism:** run twice → identical trade lists.

## 6. Outputs

- Script `scripts/study_matrix_nowall_sell.mjs`.
- Result `data/master/matrix_nowall_sell_study.json`.
- MASTER §7 entry, memory topic (PASS or REFUTED with numbers).
