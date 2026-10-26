# Machine-learning SELL scalp — 92 % WR with money, both periods (pre-registered 2026-10-24, before any number)

**Ashraf (2026-10-24):** "Next: a pre-registered machine-learning SELL model on 1m/3m features (gold, silver, DXY, time, spikes), 92% WR + profit, both
periods, same audit." · "what about DXY when it is bullish" → DXY state (vs EMA10, slope, moves, spikes) is in the features; the model uses it if it helps.

## Rows, trade, labels
- **Decision rows:** every closed 3m bar (UTC grid) of XAU spot, 2013-07-21 → 2026-10-22 21:00 UTC. Entry = SELL at the bar's close (bid).
- **Exits (2 models):** X1 = target 0.25 A / stop 2 A; X3 = target 0.25 A / stop 3 A; 24 h; A = ATR14 of the closed UTC hours (`scripts/lib/scalp_v2.mjs`).
- **Label** per row and exit = WIN (net $ > 0) priced by the live resolver `resolveMatrixTrade` (measured spreads, stop first, slip).

## Features (all causal — closed bars at the decision time; ~30)
- **Gold:** returns over 1 / 5 / 20 / 60 3m bars (in A); distance to EMA 20 / 50 / 200 on 3m (in A); RSI 14 and 56 on 3m; bar range / A; ATR(3m) / A;
  A / price; position in the UTC day's range so far; distance to the previous UTC day's high and low (in A).
- **1m spikes inside the bar:** the largest 1m range / ATR14(1m) of the 3 minutes, its direction, and the gold-only flag (silver's same minute < 1.5 × its ATR).
- **Silver:** returns over 1 / 5 / 20 3m bars (in silver ATR14(3m)); silver − gold 5-bar return (each in its own ATR).
- **DXY (rebuilt):** returns over 1 / 5 / 20 3m bars (in DXY ATR14(3m)); close vs EMA10 (bullish flag) and the EMA10 slope; 1h (20-bar) move.
- **Time:** UTC hour, weekday, minutes since the UTC day began. **Cost:** spread at the decision / (0.25 A).
- A missing silver / DXY bar → NaN (the model has a NaN bin).

## Model and walk-forward (no row is ever scored by a model that saw it, or saw its year)
- Model = `scripts/inv90/gbdt.mjs` (histogram gradient-boosted trees; 150 trees, depth 4, lr 0.05, minLeaf 300, sub 0.5), bins fitted on training rows only;
  at most 200,000 training rows sampled per fit (seeded).
- **For each test year Y = 2016 … 2026:** fit on rows with t < (start of Y−1 − 1 day); choose the threshold on year Y−1 (calibration; rows to its end − 1 day);
  apply that model + threshold to year Y. **Threshold rule:** among score cut-offs at the top 0.1 / 0.2 / 0.5 / 1 / 2 / 5 % of year Y−1, the one with the
  most rows whose (unsequenced) calibration-year trades have WR ≥ 93 %, $/t > 0 and n ≥ 30; if none → no trades in year Y.
- Year Y's selected rows are traded one at a time (`matrix_trades.mjs` sequencing) and priced by the live resolver.

## Periods and pass (each exit separately — fixed now)
- **P1** 2016-01-01 → 2021-06-30 and **P2** 2021-06-30 → 2026-10-22 (both fully out of sample).
- Pass: in P1 and P2 WR ≥ 92 % with Wilson LB ≥ 88 %; $/t > 0 with week-block LB > 0 at α/2; beats a random SELL control (same UTC hour, era, count, exit);
  n ≥ 30 in each; the last 2 years $/t > 0. K = 2. Nothing goes live without Ashraf's OK.

## Audit before reporting
1. Independent resolver re-prices 200 random selected trades → 0 differences.
2. No look-ahead in features: features at 50 random decision times rebuilt from the tape cut at that time = the full-tape features.
3. No label leakage: every training / calibration row's 24 h label window ends before the next stage's first row (asserted per year).
4. Shuffle control: the same pipeline with shuffled training labels → no edge over the random control.
5. Oracle control: the same pipeline with the true label added as a feature → WR ≥ 98 % (the pipeline can find an edge when one exists).

## ADDENDUM A (2026-10-25, after the main result — X3 PASSED — and BEFORE these numbers): robustness before anyone may call it proven
Perfection-Gate checks on the passing model (X3), same walk-forward, same selected rows:
- **Year by year:** sequenced $/t and WR per calendar year 2016-2026 → required: ≥ 9 of the 11 years $/t > 0, and no year below −$1.00/t.
- **Spread stress:** the same trades re-priced with every spread × 1.5 → required: P1 and P2 $/t > 0.
- **Frequency:** trades per trading day in P1 / P2 (reported, no bar).
- **Selection across studies (stated, not tested):** this is one of many SELL searches since 10-16 (~150 SELL cells). Even a clean pass therefore goes to a
  forward PAPER record first; nothing trades live without Ashraf's OK.

## ADDENDUM B (2026-10-26, before these numbers) — does the profit depend on Fridays? (Ashraf: "break the ML SELL X3 backtest trades down by weekday and hour (WR and $ per trade), to see if the profit depends on Fridays")
Same X3 walk-forward trades (same seed; asserted = the study's P1 / P2 counts). Reported per UTC weekday and per UTC hour, P1 and P2: n, WR, $/t.
**Question fixed now:** the profit "depends on Fridays" if, with every Friday trade removed, P1 or P2 $/t is ≤ 0 or its week-block LB (α/2) is ≤ 0.
Descriptive only — no rule is chosen from these numbers; the trades are saved to `data/master/scalp_sell_ml_trades.json` for later checks.
