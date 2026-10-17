# Swing study, Phase 4C: the ladder trade with a TIGHTER stop at lower-timeframe structure (pre-registered 2026-10-17)

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "yes write the rules for the tighter stop version"

**Why (measured in Phase 4B, book §5F.3).**
- The ladder sign is right (74-80 % of entries reach the "real" level), but it arrives LATE: price is already 1.8-2.4 anchor ATRs from the extreme.
- A stop beyond the extreme therefore risks 1.9-2.5 ATR for 0.22-0.65 R of reward.

**Hypothesis:** a stop at the LOWER timeframe's own structure risks much less, so the same accuracy may become positive R. **Honest risk:** a tighter stop is hit by normal noise more often, so the win rate will fall. Only R after costs decides.

## 1. Unchanged from Phase 4B (`docs/SWING_TRADE_SPEC.md`)

- **The LIVE causal trigger.** The one-step-below timeframe X just confirmed a swing low at P; the anchor is in a down-leg (last confirmed anchor swing = a high); P is the anchor's running extreme. Shorts mirror this.
- **Entry:** the next 1m open; longs pay the ask (real spread model).
- **Fill rules:** the stop is taken first on a shared minute; a gap through the stop fills at the gap; a gap through the target fills AT the target.
- **Time stop** after 20 anchor candles.
- **One trade at a time** per anchor and cell.
- **Data:** gold spot 1m, 2013-07-14 → 2026-10-09 06:00 UTC; TRAIN = the first 60 %, OOS = the last 40 %.
- **Random control:** 3 per trade, same NY hour and year, same side, and the SAME stop and target distances measured in anchor ATR.

## 2. The two tighter stops (fixed definitions, no tuning)

| Anchor | X (one step below) | Y (two steps below) |
|---|---|---|
| 15m | 5m | 3m |
| 1H | 30m | 15m |
| 4H | 3H | 2H |
| 1D | 9H | 6H |

- **S1, structure stop:** below the most recent HIGHER LOW on Y.
  - That is: the latest Y swing low that was CONFIRMED by the signal time, whose extreme came after P and is above P.
  - Stop = that low − 0.10 × ATR14(Y). (Shorts: above the latest LOWER HIGH on Y.)
  - **If Y has no such higher low at the signal time, there is NO trade** (counted as "no structure").
- **S2, volatility stop at the lower-timeframe scale:** stop = entry − 1.0 × ATR14(X) for longs (entry + for shorts). Always defined.

The ATRs are taken at the last candle CLOSED by the signal time.

## 3. Exits (as Phase 4B)

- **E1:** target = 1R (the new, smaller R).
- **E2:** target = P ± 3 × ATR14(anchor), the "swing is real" level.
- A trade whose E2 target is already passed at entry is skipped and counted. E1 can always be placed.

## 4. Cells and statistics

- **Cells:** anchors 15m, 1H, 4H × side × stop (S1, S2) × exit (E1, E2) = **24 cells, K = 24**. 1D is described only.
- **Per cell, both periods:**
  - n, trades per day, WR;
  - mean R and mean $ per trade, profit factor, max drawdown in R;
  - the years;
  - the exit shares (target / stop / time);
  - the median risk in anchor ATR, the median reward : risk;
  - the "no structure" skips (S1).
- **PASS (per cell)** needs all of these:
  - OOS mean R > 0, with a week-block bootstrap lower bound > 0 at α = 0.05 / 24;
  - OOS excess R over random > 0, with LB > 0;
  - TRAIN mean R > 0;
  - OOS n ≥ 100 (4H ≥ 30).
- **Head-to-head vs Phase 4B.** For the same signals, report the Phase 4B result (stop beyond the extreme) next to each cell, so the effect of the stop alone is visible.
- **Ashraf's red line:** WR is reported for every cell. A money-passing cell with a WR far below his lines is flagged, and nothing ships without his decision.

## 5. Output

- `data/master/swing_tightstop_atlas.json`, plus every trade in `data/master/swing_tightstop_trades.csv`.
- The book: a new chapter "Phase 4C", the observations log, and the appendix `docs/swing_book/phase4c_all_trades.csv`.
- Study script: `scripts/study_swing_tightstop.mjs`.
- Smoke: `smoke_swing_tightstop.mjs`, covering:
  - the S1 structure lookup (only Y lows confirmed by the signal time; extreme after P; above P; the latest wins; none → no trade);
  - the S2 distance;
  - a consistency check: with the Phase 4B stop, the engine reproduces Phase 4B's trades exactly.
- **Nothing is wired into the live app.** A passing cell would become a record-only forward test only with Ashraf's approval.
