# Swing study, Phase 3B: combining Phase 1 (the next candle) with Phase 3 (the ladder), pre-registered 2026-10-17

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "yes write the rules for combining Phase 1 and Phase 3"

**What we have (book §4, §5B):**
- **Phase 1:** after a real low, the next anchor candle (+1) closes strong much more often (1H: closes in its top third 54 % vs 38 % at failed lows still holding).
- **Phase 3:** when the timeframe ONE STEP BELOW confirms at the exact same extreme, 60-83 % of anchor extremes become real swings (base 36-49 %).

**Question:** when BOTH are true, does the chance that the swing is real rise above the ladder alone? And how much earlier than the anchor's own confirmation is it known?

## 1. Data and events (identical to Phase 3)

- **Data:** spot XAUUSD 2013-07-14 → 2026-10-09 06:00 UTC. Candles from `nyCandles`; holes are breaks.
- **Swings:** 3× ATR ZigZag (`swings.zigzag`).
- **Anchors:** 15m, 1H, 4H, 1D.
- **Candidates:** every anchor extreme, i.e. real swings plus failed extremes (C1: pullback ≥ 1 ATR, later broken), both sides.
- **"Real"** = became a confirmed anchor swing (price moved 3× ATR the other way before breaking the extreme).
- **Ladder timeframes (as in Phase 3):**

| Anchor | One step below | Two steps below |
|---|---|---|
| 15m | 5m | 3m |
| 1H | 30m | 15m |
| 4H | 3H | 2H |
| 1D | 9H | 6H |

## 2. Signs (fixed definitions, no tuning)

- **LADDER:** timeframe X confirmed its own swing at exactly the same extreme price, in an overlapping candle (Phase 3's rule). It is known at the close of X's confirming candle (t_X).
- **STRONG +1:** the anchor candle right after the extreme:
  - lows: closes in the TOP third of its own range, (close − low) / (high − low) ≥ 2/3;
  - highs: closes in the BOTTOM third, ≤ 1/3.

  It is known at the close of that candle (t_1).
- **DIRECTIONAL +1:** the +1 candle is bullish (lows) / bearish (highs), close vs open.

## 3. The moment of decision (no hindsight)

- For a combination of signs, **T\* = the latest of their known times** (e.g. max(t_X, t_1)).
- **A candidate counts only if its outcome was still UNKNOWN at T\*:**
  - for a real swing, the anchor had not yet confirmed at T\*;
  - for a failed extreme, it had not yet been broken at T\* (the open of the breaking candle is after T\*).
- So every comparison asks: **at the moment both signs were visible, and the swing was still undecided, how often did it become real?**
- **Lead** = the anchor's confirmation time − T\*, for real swings (median minutes).

## 4. Cells (per anchor × side)

| Cell | Condition at T\* |
|---|---|
| R1 | LADDER (one step below) alone, the reference, recomputed at its own T\* = t_X |
| C1 | LADDER (one step below) AND STRONG +1 |
| C2 | LADDER (one step below) AND DIRECTIONAL +1 |
| C3 | LADDER (one step below) AND STRONG +1 AND DIRECTIONAL +1 |
| C4 | LADDER (two steps below) AND STRONG +1 (the earlier, cheaper variant) |
| C5 | STRONG +1 alone (Phase 1 sign without the ladder, for comparison) |

**Also reported, as the mirror:** LADDER and NOT strong +1 (what happens when the next candle fails).

## 5. Statistics

**Split:** TRAIN = the first 60 %, OOS = the last 40 % (as in Phases 1-3).

**For each cell, reported in OOS and TRAIN:**
- n;
- P(real), with the Wilson interval;
- the lead.

**A combination is a FINDING (✅) when all of these hold:**
- OOS P(real | combination) > P(real | R1 alone);
- the two-proportion test between [ladder AND sign] and [ladder AND NOT sign] passes Holm across C1-C4 within anchor × side;
- the Wilson lower bound of the combination is above R1's OOS P(real);
- TRAIN has the same direction;
- OOS n ≥ 30 (otherwise described only).

**Effect labels** (vs R1): tiny < 5 pt, moderate 5-10, clear ≥ 10.

**Cost of waiting, always reported:** how much lead the combination gives up vs R1.

## 6. Output

- `data/master/swing_combine_atlas.json`.
- `docs/SWING_COMBINE_ATLAS.md`.
- Recorded in full in the study book `docs/SWING_STUDY_BOOK.md`, a new chapter "Phase 3B", plus the observations log and the complete appendix `docs/swing_book/phase3b/`.
- Study script: `scripts/study_swing_combine.mjs`.
- Smoke: `smoke_swing_combine.mjs`, a synthetic case with known T\*, where a candidate decided before T\* must be excluded and one undecided at T\* must be counted.

## 7. What this is NOT

Still not a trade rule (no entry, stop, target or costs). That is Phase 4, after the understanding is complete.
