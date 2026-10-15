# Wall defense as a TRADE: pre-registered money test (2026-10-15)

Ashraf, 2026-10-15: *"yes run the wall defense test"*.

**Origin.** Turbo 2's `validate_wall_defense.mjs` (2026-08-05, 13 y spot 1m) found that a tested volume wall holds 60.4 % of the time overall. It holds **71.5 %** when the live zone flow opposes the attack (absorption), and **78.8 %** with strong absorption. That was a hold / break label, **never a trade with costs**.
This test asks the money question on the Twin Turbo's own Polygon data. Written **before any result was seen**.

## Event engine: copied exactly from Turbo 2 `validate_wall_defense.mjs`
- **Profile:** trailing 24 h volume-by-price on XAU spot 1m. Bin width = 0.025 % of price, rebased when price drifts 50 %. Volume goes to the close bin.
- **Wall:** bin ≥ 2.5 × the median non-zero bin AND a local max vs ±2 bins. Detected on the map before the current bar.
- **Test:** price crosses into [wall ∓ 1.5 bins] from outside (ceiling from below, floor from above). 120-min cooldown per wall.
- **Delta proxy:** volume × (2 · close-position-in-range − 1), per bar. `barDelta`, the same as Turbo 2.
- **Decision:** at the close of the 3rd bar (touch + 2).
  - **DEFENSE** ⇔ Σ delta-proxy of those 3 bars OPPOSES the attack (negative at a ceiling, positive at a floor).
  - Price already beyond wall ± 2 bins at the decision → skipped (ALREADY_BROKEN).
- **Strong defense:** |zone delta| ÷ (3 × mean |bar delta| over the trailing profile) above the **TRAIN-period 66.7th percentile**. Computed on TRAIN only, so it is causal; Turbo 2 used the full sample.

## Trade (in the hold direction: ceiling → SELL, floor → BUY)
- **Entry:** market at the decision close. SELL at the bid; BUY pays the ask (measured spread table).
- **Stop:** wall ± 3 bins (one bin beyond Turbo 2's break line). Hit when the ask (SELL) / bid (BUY) reaches it. Slippage min($0.30, 0.05 · ATR14 1m · 3).
- **Targets:** 1 R · 2 R · **BOUNCE target** = wall ∓ 4 bins (the distance Turbo 2 scored). If the entry is already past that target, the event is skipped for that cell.
- **Horizon:** 60 min, then market exit. Stop first inside a minute. One position at a time.

## Cells
| Cells | Count |
|---|---|
| DEFENSE × {1 R, 2 R, BOUNCE} | 3 |
| STRONG DEFENSE × {1 R, 2 R, BOUNCE} | 3 |
| STRONG DEFENSE + DXY & silver agree (3m close vs EMA10 in the trade's favour) × {1 R, BOUNCE} | 2 |
| **K** | **8 → one-sided α 0.05/8** |

ATTACK and ALL events are reported as references, not candidates.

## Verdict
- **Split:** TRAIN 60 % / OOS 40 % by time.
- **PASS ⇔** OOS ≥ 100 trades AND OOS mean $/trade bootstrap LB (α/K) > 0 AND TRAIN mean > 0.
- **Reported:** WR, $/trade, R, trades/day, by side, pre-/post-2020.
