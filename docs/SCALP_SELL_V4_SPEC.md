# SELL scalps v4 — 92 % WR with money: short TIME STOPS on the spike-fade SELLs (pre-registered 2026-10-24, before any v4 number)

**Ashraf (2026-10-24):** "Keep searching for a SELL entry with 92% WR and profit before anything goes live."

## Why this test
Every fade-the-up-spike SELL measured (v2 F1, v3 N2) wins 89-94 % but loses 10-20 ¢/t, held up to 24 h. Gold's up-drift works against a SELL the longer
it is open. **New element: a time stop** — close at the market after T minutes if neither target nor stop was hit. Silver / DXY leads are not tested
(measured: they do not lead, §7 (k)); EMA / structure downtrend SELLs failed (§7 (bi), (dw)).

## Entries (fixed earlier, unchanged — `scripts/lib/scalp_v2.mjs`)
- **F1k3 SELL:** an up 1m spike (range ≥ 3 × ATR14(1m), body ≥ 60 %) → SELL at its close.
- **N2 SELL:** the same up spike in gold while silver's same minute is not a spike (< 1.5 × its ATR14(1m)) → SELL at its close.
These entries' 24 h results were seen in v2 / v3; only the exit horizon is new. Horizons are fixed here, not tuned.

## Exits
X1 (target 0.25 A / stop 2 A), X3 (0.25 A / 3 A) × **time stop T ∈ {30, 60, 120} minutes** (`resolveMatrixTrade` horizonMin = T: at T the remaining
position closes at the market — SELL buys back at bid + spread — less slip). A = ATR14 of the closed UTC hours.

## Cells: 2 entries × 2 exits × 3 horizons = **K = 12** (SELL only).

## Pass (as v2/v3): TRAIN (2013-07 → 2021-06-30) and OOS (→ 2026-10-22): WR ≥ 92 % with Wilson LB ≥ 88 %; $/t > 0 with week-block LB > 0 at α/12;
beats its random SELL control (same UTC hour, era, count, exit AND horizon); OOS n ≥ 30; last 2 years $/t > 0. Nothing goes live without Ashraf's OK.

## Audit before reporting
The independent resolver (with the same horizon) re-prices 200 random trades (0 diff); oracle control positive. The entries' no-look-ahead proof is
v2/v3's (unchanged code, audited clean).
