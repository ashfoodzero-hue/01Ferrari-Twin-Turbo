# Swing study, Phase 4: the understanding, then the ladder as a trade rule (pre-registered 2026-10-17)

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "yes write the Phase 4 rules"

From the plan: *"Written understanding + final tables. Only then candidate rules, each pre-registered and tested separately."*

---

## 4A. The written understanding (no new numbers)

- **Where:** a new chapter in `docs/SWING_STUDY_BOOK.md`, "What happens at swing levels: the understanding".
- **Contents:**
  - the story of a swing, bear → bull, step by step, using ONLY proven results from Phases 1-3C, each with its n, its period agreement and its source table;
  - one summary table per anchor timeframe (15m, 1H, 4H, 1D): what is true at the extreme, in the next candles, on the ladder, in the footprint, with silver / DXY, and what is NOT;
  - the explicit list of measured non-signs (hammer, sweep, delta divergence, absorption, DXY / silver direction, surprise direction …);
  - the limits (data: 2-year footprint, 1D+ underpowered; method: hindsight vs knowable).
- **Nothing new is computed in 4A.** Every number is quoted from the phase results.

---

## 4B. The ladder sign as a trade rule (money test)

### Question

Phase 3 measured that a one-step-below flip makes the anchor swing real 60-83 % of the time. **Does trading it make money after spread, with a reasonable stop?** "Real" (a 3× ATR move before the low breaks) is not a profit: the stop, target and costs decide.

### 1. The LIVE trigger (fully causal; no study labels)

At every close of a one-step-below candle (5m for 15m, 30m for 1H, 3H for 4H, 9H for 1D), a LONG signal fires when ALL of these hold:
1. the one-step-below timeframe X has JUST confirmed a swing low at price P (its ZigZag, k = 3 ATR);
2. at that moment the anchor's live ZigZag is in a DOWN-leg, and its running leg low equals P exactly (P is the anchor's current extreme);
3. the anchor has not yet confirmed a swing low at P.

SHORT signals mirror this.

- **One trade at a time per anchor.** A signal while a trade is open is skipped (and counted).
- **Not used:** the "pullback ≥ 1 ATR" and "real / failed" labels. They are hindsight study labels and are not part of the live trigger.

### 2. Execution (spot XAUUSD 1m bid bars; spreads from `spreadModel.makeSpreadAt`)

- **Entry:** the next 1m open after the signal. A long fills at the ask (bid + spread); a short at the bid.
- **Stop:** beyond the extreme: P − 0.10 × ATR14(anchor) for longs, P + 0.10 × ATR14(anchor) for shorts.
  - Long exits fill at the bid; short exits at the ask (bid + spread).
  - If a bar gaps through the stop, the fill is that bar's open.
- **Two exits (pre-registered; K counts both):**
  - **E1, 1R:** target = entry ± 1 × (entry − stop distance).
  - **E2, "the swing is real":** target = P ± 3 × ATR14(anchor), the price at which the anchor swing becomes real by definition.
- **Time stop:** 20 anchor candles after entry; exit at that minute's close.
- **Same-minute ambiguity:** when the stop and the target fall in the same 1m bar, the STOP is taken first (conservative).

### 3. Cells, split, statistics

- **Cells:** anchors 15m, 1H, 4H × side (long, short) × exit (E1, E2) = **12 cells, K = 12**.
- **1D is described only** (too few trades).
- **Split:** TRAIN = 2013-07-14 → the first 60 %; OOS = the last 40 % (from ≈ 2021-06-23). The study cut-off is 2026-10-09 06:00 UTC.
- **Per cell, both periods:**
  - n, trades per day, WR;
  - mean net $ per trade, mean R per trade, profit factor;
  - max drawdown in R;
  - the year-by-year mean R;
  - the share hitting the target / stop / time.
- **Random control:** for every trade, 3 random entries in the same NY hour and year, same side, with the SAME stop and target distances in ATR. Report "excess R" = trade mean R − random mean R.
- **PASS (per cell)** needs all of these:
  - OOS mean R > 0, with a week-block bootstrap lower bound > 0 at α = 0.05 / 12;
  - OOS excess R over random > 0, with LB > 0;
  - TRAIN mean R > 0;
  - OOS n ≥ 100 (4H: n ≥ 30, otherwise described only).
- **Ashraf's red line:** WR is reported next to every result. A cell that passes on money but sits far below his WR lines (scalp ≥ 85 %, swing "honest WR, reasonable SL") is flagged, and nothing ships without his decision.

### 4. Honest prior

- Earlier Twin Turbo money tests of level / reversal entries mostly failed (`docs/MASTER_DOCUMENT.md` §3 / §7).
- The ladder trigger enters AFTER a 3× ATR move on the lower timeframe, so the stop (beyond the extreme) is about 3 lower-timeframe ATRs away. E1 (1R) and E2 (about 3 anchor ATRs from the low) have very different reward / risk.
- WR is a price: E1 will show a higher WR, E2 bigger winners. Only R and $ after costs decide.

### 5. Output

- `data/master/swing_trade_atlas.json`.
- `docs/SWING_TRADE_ATLAS.md`.
- The book chapters "Understanding" (4A) and "Phase 4B: the trade test", the observations log, and the appendix `docs/swing_book/phase4_all_trades.csv` (every trade).
- Study script: `scripts/study_swing_trade.mjs`.
- Smoke: `smoke_swing_trade.mjs`, covering:
  - a synthetic path with a known trigger, entry, stop / target and fills (spread side, stop-first rule, gap fill, time stop);
  - a live-trigger audit: no decision uses a candle that closes after the signal time.
- **Nothing is wired into the live app in Phase 4.** A passing cell becomes a record-only forward test only with Ashraf's approval.
