# 4H MACRO BUBBLES — exact extraction + 13-year measurement (pre-registered 2026-10-16)

**Request (Ashraf):** "please only extract the bubble method only, do not use the other rules or conditions, we just use the same method for the bubble and we build it ourselves". Source: the "visionHunt - 4H Macro Trend Divergence Engine" Pine v5 he pasted (2026-10-16).

## 1. The method (the ONLY rules in the source, copied exactly)

- **RSI:** RSI14 (Wilder) of the 4H closes.
- **Pivots:** RSI pivots with 3 bars each side (`ta.pivothigh/low(rsi, 3, 3)`). A pivot at bar p is known at bar p + 3, at that bar's close. The strict rule — above/below all 6 neighbours — is used, and ties are counted (as in macroMagnet.js).
- 🟡 **BULL bubble:** at a new RSI pivot LOW, RSI_pivot < 35 AND RSI_pivot > the previous RSI pivot low.
- 🔵 **BEAR bubble:** at a new RSI pivot HIGH, RSI_pivot > 65 AND RSI_pivot < the previous RSI pivot high.
- **Not used (the source stores them but never reads them):** pivot prices. Nothing else exists in the source: no volume, no walls, no trend filter.
- **Bubble count (display):** consecutive same-side bubbles since the last opposite one.

## 2. Bars and causality

- **Bars:** NY-anchored 4H candles (17:00 New York, DST; parity-checked against Ashraf's OANDA chart, study (au)).
- **Known time:** the event is known at the CLOSE of bar p + 3.
  - The Pine plots it at bar p (offset −3) on a 4H chart. That position is drawn, but nothing is ever measured from it.
  - On a lower-timeframe chart the Pine computes RSI on the chart-timeframe series of 4H closes, which is a different series. Only the true 4H version is built (it matches the indicator's name and his 4H chart).

## 3. Outcomes (measured from the known time, close of bar p + 3)

- **D4 / D24 / D5d — direction after 1 / 6 / 30 bars.** BEAR → close lower; BULL → close higher. Base = P(lower) / P(higher) over all bars in the same split (gold drifts up).
- **LV — level hold:**
  - BEAR → the pivot bar's 4H HIGH is not exceeded within 30 bars; BULL → its LOW is not broken.
  - **Matched placebo:** 20 random closes in the same split, with a level at the same ATR14 distance above (BEAR) or below (BULL) the close and the same 30-bar window → placebo hold rate.

## 4. Cells and verdict

- **Window:** 2013-07-21 → 2026-10-09T06:00. TRAIN = first 60 %, OOS = last 40 %.
- **Cells (K = 8):** {D4, D24, D5d, LV} × {BULL, BEAR}.
- **INFORMATIVE** ⇔ all of these hold:
  - OOS n ≥ 30;
  - OOS rate − base (or placebo for LV) ≥ +5 pp, with Wilson LB at z(α/K) > base;
  - TRAIN rate − base > 0.
- Bubbles are rare (estimated a few per side per year), so power is reported plainly. An underpowered cell is UNDERPOWERED, never "works".
- **Reported, never the verdict:**
  - all-sample rates;
  - bubble count 1 vs ≥ 2;
  - pre/post 2020;
  - pivot ties;
  - the same rules on 1H bars (more events, robustness only).

## 5. Display rule (fixed now)

- Bubbles are drawn on the chart where the Pine draws them (at the pivot), stating when each became KNOWN (+3 bars), with the measured result for that side beside them.
- **INFORMATIVE:** the measured rates are shown as an edge.
- **Otherwise:** "measured: no edge" / "underpowered (n = x)". Never a made-up %.

Engine: `src/master/macroBubbles.js`. Study: `scripts/study_bubbles.mjs` → `data/master/bubble_study.json`.
