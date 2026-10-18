# 15m swings — the NEXT MOVE (direction, size, timing, where it ends)

Pre-registered 2026-10-18. Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-18)

> "we need to understand the next move for swings on 15m time frames"

He chose all four meanings: **direction of the next leg · size / target · timing of the next swing · where it ends (level).**

## 1. Data

- Spot XAUUSD 1m, 2013-07-14 → **2026-10-09 06:00 UTC** (the swing studies' cut-off; later data stays unseen), read with `loadBars` → `cleanForTv` → `nyCandles.buildCandles('15m')`, TradingView-exact.
- Uses the data as fixed on 2026-10-18:
  - bad prints repaired at 1 minute only;
  - Polygon's New-York-local stamps of 2020-11-15 → 12-31 shifted +5 h (`sourceQuirks.js`);
  - weekend-dated minutes dropped.
- Holes: a candle overlapping a data hole is a ZigZag break (`dataHoles`). No event or window may touch one.
- Split: **TRAIN = first 60 % of time, OOS = last 40 %**. Every claim must hold in both, with the same sign.

## 2. The event — knowable, no look-ahead

- **Swing:** the existing rule (`swings.zigzag`) on 15m candles, **k = 3 × ATR(14)**.
- **The event time is the CONFIRMATION candle** (`knownI`): the first 15m close at which price is 3 ATR away from the extreme.
  - Everything measured as "next" starts at that close.
  - Nothing before the confirmation uses information after it.
- At the event the leg in progress points away from the swing: after a confirmed **low** the leg is **up**; after a confirmed **high** it is **down**.
- **Robustness only:** every headline is re-run at k = 2 and k = 5 and must keep its sign.

## 3. The four questions (measured from the confirmation close)

**Q1 — Direction: does the confirmed leg carry on?**
- Race from the confirmation close: does price move **+X·ATR with the leg** before **−X·ATR against it**, for X ∈ {0.5, 1, 2}? First touch on 1m bars; same-minute = against (pessimistic).
- **Control C2:** random 15m closes (same NY hour, same year, not within ±8 candles of a confirmation), same race. Seeded, 3 per event.
- **Claim** ⇔ the OOS continuation rate's Wilson LB > the control rate, TRAIN agrees, and the week-block bootstrap LB of the difference is > 0 at α/K (K = 3 X × 2 sides = 6, Holm).

**Q2 — Size: how far does the leg go?**
- **Full leg:** swing point → the next swing point (the opposite extreme of the ZigZag), in ATR and in $.
- **Remaining after confirmation:** confirmation close → that next extreme (the move still available to someone who acts at confirmation), in ATR and $.
- **Adverse first:** the largest move against the leg before that extreme (the stop a trader would need).
- Reported as P10 / P25 / P50 / P75 / P90 for TRAIN and OOS, by year, by side.
- A size is called "stable" only if the OOS median sits inside the TRAIN P25-P75 band.

**Q3 — Timing: when does the next turn come?**
- 15m bars from confirmation → the next extreme (when the turn happens) and → its confirmation (when it is known).
- Distribution (P25 / P50 / P75 / P90), plus the hazard (the chance the turn happens in bar n, given not yet) for n = 1 … 96 (one day).

**Q4 — Where it ends: does the next extreme stop at a known level?**
- Levels known at the confirmation close, each with the exact knowable time:
  - the previous opposite 15m swing extreme;
  - the last confirmed 1H and 4H swing extremes (same ZigZag rule on those timeframes, confirmed by then);
  - the previous New York day's high / low;
  - round numbers ($10, $50).
- **Hit:** the next extreme lands within **±0.25 ATR** of the level, among levels lying in the leg's direction.
- **Control:** the same levels shifted by a random ±1-3 ATR (seeded), so "a level is near" is not counted as skill.
- **Claim** ⇔ the OOS hit-rate ratio (level vs shifted) has LB > 1, TRAIN agrees, Holm across the level types.

## 4. Context splits (descriptive; a split becomes a claim only under the same rules)

Each known at the confirmation close:
- the 1H and 4H ZigZag leg direction (with / against the 15m leg);
- the swing study's ladder state (Phase 3: did lower timeframes already flip at that price);
- session (Asia / London / New York by NY hour);
- confirmation lag (bars from the extreme to `knownI`);
- leg size so far in ATR;
- a USD high-impact release within ±60 min (`marketContext`).

## 5. What is reported

- `data/master/swing_nextmove_15m.json` + `docs/SWING_NEXTMOVE_15M_ATLAS.md`.
- **Every event row** (CSV) in `docs/swing_book/nextmove15m/`, and a new chapter in `docs/SWING_STUDY_BOOK.md` ("record EVERYTHING").
- n behind every number. Underpowered cells (OOS < 100) are "described only".
- **No trade rule in this study.** If a question passes, a trade rule is a separate pre-registered test afterwards, priced with the measured spread (WR is a price).

## 6. What would make this study misleading — guarded

- **Hindsight:** counting from the swing extreme instead of the confirmation would show 3 ATR of "free" move. All "next move" measures start at the confirmation close.
- **Level selection:** only levels known at the confirmation time, each with its exact known time.
- **Same-minute ambiguity:** 1m race, adverse touch first.

## ADDENDUM A (2026-10-18, written AFTER the first run, BEFORE these numbers)

**Why:** Q4's pre-registered control shifts each level by ±1-3 ATR, which also changes its DISTANCE from the confirmation price. The next extreme lands mostly within about 2 ATR of the confirmation (Q2: remaining-move median ≈ 1.95 ATR). So a level type that tends to sit close by construction (the first $10 above price, the previous opposite swing) can beat that control on distance alone.

**Added check (robustness; the pre-registered verdict stays as reported):** a DISTANCE-MATCHED placebo.
- For each event with a level at distance d (in ATR, in the leg direction), take the remaining move of a RANDOM OTHER event of the same side and the same TRAIN / OOS part, and test whether it lands within ±0.25 ATR of d. This keeps the distance distribution and the move distribution exactly and removes only the coupling "this leg ↔ this level". Seeded, 5 placebo draws per level.
- A Q4 claim is called **ROBUST** only if it also beats this placebo: OOS Holm-passing, Wilson LB of the real hit rate > the placebo rate, TRAIN agrees.
- Also reported: the plain round-number test, i.e. is the next extreme closer to a $10 / $50 multiple than a uniform position inside the band would give (expected = 0.5·ATR / step).
