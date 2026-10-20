# TOP-DOWN SYSTEM — RESULTS (2026-10-20)

Spec `docs/TOPDOWN_SYSTEM_SPEC.md` (before any number). Code `scripts/study_topdown_system.mjs` (rules = `scripts/lib/choch4h.mjs`), audit `scripts/audit_topdown_system.mjs`. XAU 2013-07 → 2026-10 (primary), XAG replication; TRAIN to 2021-06, OOS after; measured spreads; one trade at a time per cell.

## Ashraf's method, as tested

1. **HTF reversal = the direction.** The side of the last 4H (or 1D) CHoCH = the regime (LONG / SHORT) until the opposite HTF CHoCH.
2. **Swing entries in that direction:** S-REV = the retest into the OB of the HTF CHoCH + the first 15m CHoCH inside it; S-CONT = every 1H pullback that ends with a 1H CHoCH back in the regime direction. Exits 2R / 3R / hold until the regime flips.
3. **Scalps on pullbacks:** SC = during a 1H pullback, the first 15m CHoCH back in the regime direction, take profit at the last 1H swing (the "expected continuation level").

## Verdict: 0 of 28 cells pass on gold; nothing repeats on silver.

| Layer (gold, OOS = 2021-07 → 2026-10) | Best result | Why it fails |
|---|---|---|
| S-REV LONG (4H) | hold to regime flip: +$24.08/trade, n 29, ~0.12/week, WR 38 % | n small; random LONGs with the same stop/exit earn about the same (drift) |
| S-REV SHORT | loses (−$9 to −$20/trade) | — |
| S-CONT LONG (4H) | hold: +$10.22/trade, n 83, WR 35 % | the same entries WITHOUT the regime earn about the same (+$9.54); random LONGs +$11.30 |
| S-CONT SHORT | loses (−$5 to −$7/trade) | — |
| SC LONG (4H regime) | +$2.84/trade, n 70, WR 36 % | TRAIN −$0.34; lower bound below 0 |
| **SC SHORT (4H regime)** | **+$3.29/trade, n 85, ~0.33/week, WR 42 %; beats random shorts (CI +$1.0…+$10.9)** | lower bound −$2.76; TRAIN only +$0.29 and its drift CI includes 0; **silver: −$0.01/trade** |
| 1D regime (all layers) | similar or worse | — |

## What this means in plain words

- Trading only in the direction of the last 4H / 1D CHoCH does **not** add money compared with the same entries taken in any direction, or with random entries in the same direction. The LONG profits come from gold rising from ~1,300 to ~4,100 (buy-and-hold does the same); the SHORTs lose.
- The one interesting cell — **short scalps on 1H pullbacks inside a 4H bearish regime, target the last 1H low** — made +$3.29/trade with a 42 % win rate in 2021-26, but it is not proven (lower bound below zero), it was flat in 2013-21, and silver does not repeat it.
- Win rates of these swing / continuation trades are 20-42 %; they make money (where they do) from a few large winners, never from a high WR.

## Audit

`data/master/topdown_system_audit.json`: **CLEAN.** Independent evaluator: 200 random trades re-priced from the minutes (entry, R, every exit): 0 differences. Prefix check: 60 random cuts, 327,434 CHoCH events on 15m / 1H / 4H / 1D (the regimes and every trigger) rebuilt from data cut at that time: 0 differences. Positive control: trades whose price 6 h later moved their way make +$7.87 (S-CONT) / +$6.81 (SC) per trade vs −$0.49 / +$1.22 for all → the harness sees an edge when one exists.
