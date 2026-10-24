# SCALP entries v3 — 92 % WR with money on BUY and SELL, third try (pre-registered 2026-10-24, before any v3 number)

**Ashraf (2026-10-23/24):** "Search a different SCALP entry … for 92% WR with profit on both BUY and SELL … Try again." — after v2 (`SCALP_ENTRY_V2_SPEC.md`):
0/18; the closest = F1 BUY spike fade X3: 2021-26 WR 95.6 % +$0.165/t (n 3,677) and +$0.89/t over its random control, but 2013-21 −$0.315/t.

## Two kinds of cells — kept apart
- **POST-HOC (P):** built FROM what v2 showed. The data were already seen, so a P cell can at best become a **forward paper candidate**, never "proven".
- **NEW (N):** mechanisms not measured before; a full pass here counts as a pass.

## Entries
- **P1 BUY spike fade + COST FLOOR:** F1 k = 3 BUY, exit X3, only when the target (0.25 A) ≥ 6 × the measured spread at the decision (v2 showed the 2013-21
  loss sits where the target was ~2 spreads).
- **P2 BUY spike fade + ONE-BAR CONFIRMATION:** F1 k = 3 BUY, exit X3, entry at the close of the NEXT 1m bar, only if that bar makes no new low.
- **N1 TWO-BAR EXHAUSTION (1m), both sides:** a spike bar (range ≥ 3 × ATR14(1m), body ≥ 60 %) followed by a 1m bar that closes back beyond the spike's
  midpoint → fade (down spike + reclaim → BUY; up spike + reclaim → SELL), at that second bar's close.
- **N2 GOLD-ONLY SPIKE (1m), both sides:** an F1 k = 3 spike in gold while silver's same minute is NOT a spike (silver range < 1.5 × its ATR14(1m)) → fade
  (gold-specific liquidity hole, not a metals-wide move). Silver = Polygon XAGUSD 1m, same minute; a missing silver minute = no signal.
- A, spike, exits X1 (0.25 A / 2 A) and X3 (0.25 A / 3 A), resolver, sequencing, spreads, control, split, tape: exactly as v2 (`scripts/lib/scalp_v2.mjs`).

## Cells: P1, P2 (X3 only) = 2 · N1, N2 × 2 sides × X1/X3 = 8 → **K = 10**.

## Pass (unchanged from v2, each side separately)
TRAIN and OOS: WR ≥ 92 % with Wilson LB ≥ 88 %; $/t > 0 with week-block LB > 0 at α/10; beats its random control's $/t; OOS n ≥ 30; last 2 years $/t > 0.
A P cell that meets every check is reported as **"forward-test candidate (post-hoc)"** — wired to a PAPER record only with Ashraf's OK, never as a pass.

## Audit before reporting
Independent resolver 200 trades 0 diff; entries rebuilt on 50 tape cuts = full-tape entries (no look-ahead; silver included for N2); oracle control positive.
