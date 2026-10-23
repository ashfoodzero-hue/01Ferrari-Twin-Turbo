# New SCALP entries (not the Matrix walls) for 92 % WR with money on BUY and SELL — pre-registered 2026-10-23, before any number

**Ashraf (2026-10-23):** "Search a different SCALP entry (not the Matrix walls) for 92% WR with profit on both BUY and SELL, pre-registered the same way. Try again."

## Already measured (not repeated)
Matrix walls + structure + exit grid (§7 (dw), 0/103) · 15m ML entries, both sides, high-WR brackets (INVESTIGATION_90WR, 0/67; SELL best 82.7 %) ·
$10 round numbers as levels (placebo-refuted, §7 Q4) · 20-day sweep & reclaim (too rare) · session / hour filters (no lift) · DXY lead (never leads) ·
footprint order flow (no pass) · trendlines, S/R, CHoCH, order blocks, FVG (no hold). The two families below have not been measured at scalp scale.

## Entries (both sides, mirror images)
- **F1 SPIKE FADE (1m).** A closed 1m bar with range ≥ k × ATR14(1m) and body ≥ 60 % of its range. Down spike → **BUY**, up spike → **SELL**, at that bar's
  close. k ∈ {3, 5} → F1k3, F1k5.
- **F2 1H SWEEP & RECLAIM (3m).** In the current UTC hour, price trades above the PREVIOUS closed 1H candle's high by ≥ 0.10 A, then a 3m bar closes back
  below that high → **SELL** at that close; mirror (below the previous low, close back above) → **BUY**. First occurrence per hour per side.
- A = ATR14 of the closed 1H bars (UTC hours) at the decision time. Everything causal: closed bars only.

## Exits (single target, single stop, 24 h; the live resolver `resolveMatrixTrade` with tp1 = tp2 = target: BUY pays the ask, SELL exits at bid + spread,
stop first inside a minute, stop slip min(0.30, 0.05 × A))
- X1 target 0.25 A / stop 2 A · X2 target 0.15 A / stop 2 A · X3 target 0.25 A / stop 3 A.

## Cells: 3 entries × 2 sides × 3 exits = **K = 18**. One trade at a time per cell (`matrix_trades.mjs` sequencing).

## Data and split
XAU spot 1m (Polygon), 2013-07-21 → 2026-10-22 21:00 UTC. TRAIN < 2021-06-30 12:36 UTC ≤ OOS (the ROBUST split used since 10-20). The last 2 years are reported too.
Spreads: `spreadModel` (measured table). **Control:** for every cell, random entries of the same side at the same UTC hours, same count, same exit → the
random-geometry WR / $ that any entry gets for free.

## Pass (each side separately — fixed now)
TRAIN and OOS: WR ≥ 92 % with Wilson LB ≥ 88 %; $/t > 0 with week-block bootstrap LB > 0 at α/18 (Bonferroni); beats its random control's $/t; OOS n ≥ 30;
the last 2 years $/t > 0. WR = trades with $ > 0 after costs / all trades. Every cell reported; nothing wired live without Ashraf's OK.

## Audit before reporting
Independent resolver re-prices 200 random trades (0 diff); signals rebuilt on a tape cut at 50 random times equal the full-tape signals before the cut
(no look-ahead); an oracle entry (knows the target is hit first) through the same pipeline shows a large positive $/t.
