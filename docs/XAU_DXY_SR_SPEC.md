# XAU and DXY together at S/R levels, on the same timeframe

Written 2026-10-19, before any number. Status: **RUN 2026-10-19** — results `docs/XAU_DXY_SR_ATLAS.md`: no lift; DXY agreeing does not help (Ashraf: "what if XAU and DXY check them at the same time frame at S/R level and tell me what u find").

## Idea

Gold and the dollar usually move against each other. So when gold tests a SUPPORT at the same candle as DXY tests a RESISTANCE (both "should" turn together), maybe gold's level holds more often. Gold support + DXY support, the "divergent" case, may hold less.

## Part 1: level tests (S/R rules unchanged: `src/master/srLevels.js`)

- **Candles:**
  - XAU: the S/R study's candles.
  - DXY: the GOLD-GRID DXY (`kit('DXY')`), so both assets have the exact same candle times on every timeframe.
  - Timeframes: 1H, 4H, 1D. 1W and 1M are described only, with too few tests.
- **The DXY condition** for every XAU test (real AND placebo copy), at the XAU test candle:
  - **OPPOSITE:** DXY tests one of its own alive levels on the SAME candle, and the side is opposite (XAU support with DXY resistance, or XAU resistance with DXY support).
  - **SAME SIDE:** DXY tests a level on the same candle, and the side is the same.
  - **NONE:** DXY tests no level on that candle.
  - A looser version (DXY test within ±1 candle) is reported as a robustness check only.
- **Measured:**
  - XAU held % per condition vs the placebo copies under the same condition (lift);
  - OPPOSITE vs NONE among real tests (two-proportion);
  - week-block bootstrap, Holm across cells, TRAIN (first 3 of the last 6 years) vs the last 3 years;
  - n per cell.

## Part 2: the 3m-confirmation entry with DXY agreeing (money, rules of `CONFIRM3M_MONEY_SPEC.md`)

- **Entries:** the XAU entries of `confirm3m_xau.json` (raw minutes, full spread).
- **DXY agrees:**
  - a DXY 3m confirmation in the OPPOSITE direction (`confirm3m_dxy_ice.json`; XAU BUY ↔ DXY SELL) fired within the 15 minutes BEFORE the XAU entry, so it was known at entry;
  - also reported with a 60-minute window;
  - the opposite case is "DXY against" (a same-direction DXY confirmation).
- **Splits:** all XAU entries; XAU at an S/R level; XAU at a level AND the DXY confirmation also at a DXY level.
- **PASS rule:** as in the money spec. $/trade after spreads > 0, with the lower bound > 0 in TRAIN (folds 0-4) and OOS (folds 5-7), ≥ 6 of 8 folds positive, ≥ 100 OOS trades, Holm. The before-costs R is shown next to it.

## Honest limits

- **Simultaneous, not leading:** this is a same-candle condition, which is fine for a filter. Earlier work (2026-08-21) found DXY co-moves with gold and never LEADS.
- **DXY wicks:** DXY minutes have no intra-minute wicks, which slightly changes its touches.
- **No trade rule** is shipped from this study.
