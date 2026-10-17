# Swing study, Phase 3: the flip ladder (how Bear becomes Bull) — pre-registered 2026-10-17

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf)

> "… compare them with other time frames as mentioned above from 1 month down to 1 mint and find out how Bear become a Bull and when Bull become a bear."

Then: "yes write the Phase 3 rules".

Phases 1-2 (`docs/SWING_STUDY_BOOK.md` §4-5) showed:
- the extreme candle (shape or footprint) does not reveal a real swing;
- the next 1-3 candles do.

**Phase 3 measures the TIMING across timeframes:**
1. when a swing low forms on one timeframe, in what order and how fast every other timeframe turns;
2. whether a lower timeframe turning is real evidence (vs failed extremes) and how much earlier it comes;
3. whether DXY or silver turn before gold.

## 1. Data

- Spot XAUUSD 1m, 2013-07-14 → 2026-10-09 06:00 UTC (the same as Phase 1). Candles from `nyCandles`; data holes are breaks.
- DXY (rebuilt from 6 pairs) and XAGUSD, on the same gold candle clock. Each has its own Polygon holes, which are breaks for that symbol.
- Swings: Phase 1's rule on every series and timeframe (`swings.zigzag`, k = 3 × ATR14).

## 2. Definitions (exact, no judgement)

- **Anchor swing:** a confirmed swing low (or high) on an ANCHOR timeframe. Its extreme candle opens at T0; the extreme price is P0.
- **Anchor timeframes:** 15m, 1H, 4H, 1D. 1D will have few OOS cases, so its precision cells may be described only.
- **"Timeframe X flipped at the same low":** X has a confirmed swing low with **exactly the same extreme price P0** (all timeframes are built from the same 1m data, so the same low has the same price). Its extreme lies inside the anchor's extreme candle (or, for X larger than the anchor, X's extreme candle contains T0).
  - The flip time = the CLOSE of X's confirming candle (the moment X's turn became knowable).
  - X = every one of the 16 timeframes, 1m … 1M.
- **Delay:** X's flip time − the close of the anchor's extreme candle, in minutes. It is also expressed relative to the anchor's own confirmation (negative = X flipped BEFORE the anchor confirmed).
- **Failed anchor extreme (control):** a C1 failed extreme on the anchor timeframe (pullback ≥ 1 ATR, later broken), as in Phase 1.
  - "X flipped at a failed extreme" uses the same exact-price rule, but counts only if X's flip time is BEFORE the anchor extreme was broken.
- **Highs:** the mirror ("how Bull becomes Bear").

## 3. What is measured

### A. The ladder on real anchor swings (descriptive)

For each anchor × side × X:
- the share of anchor swings where X flipped at the same low;
- the median and quartiles of the delay;
- the share where X flipped BEFORE the anchor confirmed.

**Order consistency:** for every pair of timeframes X < Y (by duration) that both flipped, the share where X flipped first.

### B. Is a lower-timeframe flip evidence? (the knowable layer)

For each anchor × side × lower timeframe X, consider every anchor extreme candidate (real swings + failed extremes) where X flipped before the anchor confirmed / broke.

| Quantity | Definition |
|---|---|
| **P(real \| X flipped)** | real ÷ (real + failed) among those candidates |
| **Base rate** | real ÷ (real + failed) among all candidates |
| **Lead gained** | median minutes between X's flip and the anchor's own confirmation |

**Also:** the same for "X AND Y both flipped" for adjacent pairs (e.g. 15m + 30m on a 1H anchor). This is the ladder climbing.

### C. DXY and silver vs gold (the same anchors)

For each gold anchor swing low, find DXY's opposite swing (a swing HIGH) and silver's same-direction swing (a swing LOW) on the same timeframe, with the extreme within ±3 anchor candles of T0.

**Reported:**
- the share with a matching swing;
- the lead / lag of their EXTREME and of their CONFIRMATION vs gold's (median, quartiles, share earlier).

**Control:** the same for gold's failed extremes (does DXY "turn" at fake gold lows too?).

## 4. Statistics

- **Split:** TRAIN = the first 60 % of the window, OOS = the last 40 % (as in Phase 1).
- **B is the only part that can produce a FINDING:**
  - OOS P(real | X) vs base: one-sided Wilson lower bound above the base, plus a two-proportion test;
  - Holm across X within anchor × side;
  - the same direction in TRAIN;
  - fewer than 30 OOS candidates with X flipped → described only.
- **A and C are descriptive:** medians and shares with n, TRAIN and OOS shown side by side. A consistency flag marks shares that differ by more than 10 points between periods.
- **Effect labels:** "lift" = P(real | X) − base, in points. Tiny < 5, moderate 5-10, clear ≥ 10.

## 5. Output

- `data/master/swing_ladder_atlas.json`.
- `docs/SWING_LADDER_ATLAS.md`: per anchor, the ladder table (share flipped, median delay, before-anchor %), the order matrix, the evidence table, and the DXY / silver table.
- **Recorded in full in the study book `docs/SWING_STUDY_BOOK.md`:**
  - a new chapter "Phase 3";
  - the observations log;
  - the complete appendix `docs/swing_book/phase3/`.
- Study script: `scripts/study_swing_ladder.mjs`.
- Smoke: `smoke_swing_ladder.mjs`, a synthetic series where a fast and a slow timeframe share the same low, with KNOWN confirmation times that must come out exactly.
