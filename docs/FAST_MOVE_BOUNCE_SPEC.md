# Fast move → bounce at the 4H level, with DXY confirmation (pre-registered 2026-10-16)

**Request (Ashraf, 14:00 UTC, 16 Oct 2026).**
- Gold fell fast from 4176 to 4154.60 (13:21) and is now at 4188.
- Proposal: "limit order at the strong level with a small SL; once it moves +$6, SL to BE".
- The second entry "supports my losing entry".
- DXY "reacted exactly" at the bounce: its 3m high was 101.800 at 13:24, the same minute as gold's low.

## Events (closed 1m bars, causal)

**FAST DROP at minute i:**
- the high of the last 60 min minus the close of minute i ≥ max($15, 3 × 5m-ATR14);
- the first such minute starts the event;
- no new event for 2 h afterwards.

**FAST RALLY:** the mirror image (low of the last 60 min, measured up to the close). It is reported, and goes through the same tests.

**LEVEL:** the nearest active closed NY 4H candle low below the close at minute i.
- "Active" means never closed beyond on 1m. This is the same level set as `level_tick.mjs` and study (bj).
- It must lie within $15 of that close, and it must not have been touched since the event's 60-min window started.
- For a FAST RALLY: the nearest active 4H high above the close, same conditions.
- No level within $15 → no trade, but the event is counted.

## Trades (long after a drop; short after a rally; spread from `spreadAt`; all exits on 1m bars)

| Arm | Entry | Stop | Management |
|---|---|---|---|
| **L (limit, Ashraf's plan)** | limit at the level; fills if a 1m bar reaches it within 60 min of the event | level ∓ S | after the price moves +$6 in favour, stop → entry (BE) |
| **D (DXY-confirmed)** | after gold touches within $2 of the level (within 60 min): the first closed 3m bar where DXY 3m closes back below its EMA10 (above it for a rally) AND gold 3m closes back above the level (below it for a rally), within 30 min of the touch; fill at the next 1m open | level ∓ S | same BE rule |

- Target +$15 from entry; 4 h time limit.
- If a stop and a target/BE trigger fall in the same 1m bar, the stop is assumed to come first (conservative).
- Stops tested: S = $4 and S = $8.
- Four cells per side (L4, L8, D4, D8), K = 4 per side.

## Controls

**C-TOUCH:** the same L bracket at every first touch of an active 4H floor (ceiling) with NO fast move in the prior 60 min.
- The question it answers: does the fast move add anything?
- Method: the matched difference (event mean − control mean), with a week-block bootstrap.

**C-RANDOM:** the same bracket at random minutes (one per event, same side, same hour-of-day distribution).

## Windows and pass rule

- Arm L: full continuous 1m history (`HISTORY_CONTINUOUS_FROM`) → 2026-10-09T06:00; TRAIN = first 60 %, OOS = last 40 %.
- Arm D: from the first day with DXY 1m data.
- **PASS (per cell, OOS):** all of the following:
  - n ≥ 100;
  - mean net > 0, with week-block bootstrap LB > 0 at α = 0.05/4;
  - mean − C-TOUCH mean > 0, with LB > 0;
  - TRAIN mean > 0 (same sign).
- WR is reported next to every number (Ashraf's red line for a scalp is ≥ 85 %).

## The "second entry rescues the first" question

- An added entry is its own trade. Its value is exactly the L/D cell's measured result.
- If the cell is negative, adding to a loser increases the expected loss. It does not repair it.
- Reported: how often the price returns to a first entry placed $20 above the level, within 4 h, after an L fill.

Study: `scripts/study_fast_move_bounce.mjs` → `data/master/fast_move_bounce.json`.

## ADDENDUM A (pre-registered 2026-10-16 ~14:20 UTC, after the main result, before any DXY-filter number was seen)

**Request (Ashraf):** "DXY showed a bearish sign on the 1H RSI at the time of the bounce … also add reading the DXY bias."

All filters are read at the event minute, from closed bars only, on the same L / D trades.

**F-DIV (DXY 1H RSI divergence against the dollar):**
- Pivots: DXY 1h pivot highs with 2 bars left and 2 right, confirmed 2 bars after the pivot.
- Gold LONG: the latest confirmed pivot high p2 is higher than the previous pivot high p1 (p1 is 3-40 bars before p2), and RSI14(p2) < RSI14(p1).
- Recency: p2 was confirmed within the last 6 closed 1h bars.
- Gold SHORT: the mirror image, on pivot lows (bullish DXY divergence).

**F-BIAS (DXY 4H bias):** the DXY NY-4H Macro Magnet score (`magnetScores`, last closed bar) is on the dollar-SHORT side for a gold long, and the dollar-LONG side for a gold short.

**F-BOTH:** F-DIV AND F-BIAS.

**Cells:** 3 filters × 4 trade cells (L4, L8, D4, D8) per side, K = 12, α = 0.05/12.

**Window:** DXY 1m exists from 2021-06-26, so the addendum uses its own split: TRAIN = the first 60 % of the DXY window, OOS = the last 40 %.

**PASS:** all of the following, in OOS:
- n ≥ 60;
- mean > 0 with week-block LB > 0;
- filtered mean − unfiltered mean > 0 with LB > 0;
- TRAIN mean > 0.

Study: `scripts/study_fast_move_bounce_dxy.mjs` → `data/master/fast_move_bounce_dxy.json`.
