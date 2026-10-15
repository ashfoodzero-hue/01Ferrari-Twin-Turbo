# Ferrari Matrix at ≥ 85 % WR: pre-registered exit-geometry test (2026-10-15)

Ashraf: *"keep the matrix but we need to fix it for more than 85 % WR"*.
Written **before any result was seen**.

**Entries are unchanged:** exactly `matrixSignals` (the live Matrix). Only the EXIT changes.
- The primary window is **13 y without the WTI filter** (WTI history exists only from 2024-10).
- The WTI version on 2 y is reported.

## Exit grid
Original risk r = |entry − Matrix SL| (lowest low of 5 − $0.50).
- **Stop:** m · r beyond the entry, m ∈ {1, 2, 3}.
- **Single target:** k · r, k ∈ {0.25, 0.5}.
- Measured spread; BUY pays the ask, exits at the bid (SELL mirrored); stop first inside a minute; slippage min($0.30, 0.05·ATR).
- **Horizon:** 24 h, then market exit.
- **One position at a time;** the next signal only after the exit.

## Cells and verdict
- **Cells:** m × k = 6 → **K = 6**.
- **Split:** TRAIN 60 % / OOS 40 %.
- **PASS ⇔** OOS n ≥ 100 AND **OOS WR ≥ 85 %** AND Wilson LB (α 0.05/6) ≥ 83 % AND OOS mean $/trade bootstrap LB (α/6) > 0 AND TRAIN mean > 0.
- **Reported:** WR, $/trade, trades/day, the WTI 2 y version.
