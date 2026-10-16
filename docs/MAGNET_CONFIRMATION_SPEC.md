# Liquidity MAGNET — confirmation checks (pre-registered 2026-10-16)

**Request (Ashraf):** "do u confirm that this is real results and we are missing nothing else to read, such as reading same measurement for DXY to confirm".

**Starting point.** Study (aw): 1H pools, strict test, H 30 → lift +3.5 pp (LB +1.2, TRAIN +1.0) = PASS. Four gaps remain open. The 1H magnet is called CONFIRMED only if **C1 AND C2 pass**; C3 and C4 add or remove strength.

## C1 — timing-matched placebo (can change the verdict)

- Real events are the FIRST 1H close of a new (BSL, SSL) pair — just after a pivot confirmed and price moved away. The (aw) placebo drew from ANY close with both pools set.
- **C1 placebo:** 20 random closes drawn ONLY from other FIRST-OF-A-NEW-PAIR closes (same split), with the real event's ATR distances, the same horizon, censoring, 1m touch order and week-block bootstrap.
- **PASS** ⇔ all of these hold:
  - OOS lift ≥ +3 pp;
  - LB at α/2 > 0;
  - TRAIN lift > 0;
  - H = 30.

## C2 — family-wise correction across every magnet cell run so far

- **Cells run:** 4H primary (2) + 4H audits (4 × 2 = 8) + 1H primary (2) + 1H non-dedup (2) + C1 (2) + C3 (2) = **18**.
- The 1H H 30 strict result passes C2 only if its week-block bootstrap lower bound at one-sided **α = 0.05/18** is > 0. The same is reported for C1.

## C3 — DXY replication (a second market)

- The same strict test (dedup + regime-matched placebo + week-block, 1m touch order, H 30 and 120) on **DXY 1H pools**. DXY is rebuilt from the six pairs (ICE formula).
- **Note:** DXY 1m bars are close-based (high = max(o, c)), so the touches are slightly conservative — the same for real and placebo.
- **REPLICATES** ⇔ OOS lift ≥ +3 pp, LB at α/2 > 0 and TRAIN lift > 0 (H 30).

## C4 — DXY as a confirmer of gold's magnet

- For each gold strict event (1H, H 30), read DXY's own 1H pool state at the same hour (causal: DXY BSL/SSL known at that close).
- **AGREE** = DXY's nearer pool is on the side that implies gold toward its nearer pool: gold near = SSL with DXY near = BSL, or gold near = BSL with DXY near = SSL.
- Reported per group (AGREE / DISAGREE / DXY no pair): real near-first, placebo near-first (each event's own placebos) and lift.
- **DXY ADDS STRENGTH** ⇔ OOS lift(AGREE) − lift(DISAGREE) ≥ +3 pp with the week-block bootstrap lower bound of that difference > 0, and the same sign in TRAIN.

Window 2013-07-21 → 2026-10-09T06:00, TRAIN = first 60 %, OOS = last 40 %.

Outputs: `data/master/magnet_confirm_*.json`. Script: `scripts/study_magnet_liquidity.mjs` (switches `MAG_TIMING`, `MAG_SYM=DXY`, `MAG_DXYCONF`, `MAG_FAMILY`).
