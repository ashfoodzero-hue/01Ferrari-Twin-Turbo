# SELL trigger — gold sweeps a high, silver does not confirm: RESULTS (2026-10-19)

Spec: `docs/SELL_SMT_SWEEP_SPEC.md` (+ ADDENDUM A, written before any number). Code: `scripts/lib/sell_smt.mjs` (ONE implementation), `scripts/study_sell_smt_sweep.mjs` → `data/master/sell_smt_sweep_study.json`; audit `scripts/audit_sell_smt_sweep.mjs` → `data/master/sell_smt_sweep_audit.json`.
Data: Polygon spot 1m (raw, no reopen clamp), gold + silver, 2013-07-14 → 2026-10-18. TRAIN to 2021-06-30, OOS after. Measured gold spread on every fill.

## Verdict: 0 of 24 cells pass. No SELL trigger here reaches 85 % WR, and none makes money in TRAIN.

- **Highest OOS WR: 77.6 %** (1H, SMT, 3m break, target 0.25R), n 295, about 1 trade a week. OOS +$0.14/trade but the lower bound is −$0.76; TRAIN −$0.51; 3 of 6 OOS years positive. **FAIL**.
- **The win rate comes from the stop/target geometry, not the signal.** A random SELL at the same hour with the same stop and target wins about as often (75.3 % for that best cell; within ±4 points in every cell).
- **Silver not confirming does help a little on 1H:** it loses less than all sweeps (T1, 0.25R: −$0.28 vs −$0.58 OOS; TRAIN −$0.34 vs −$0.39), but it is still a loss. On 4H, SMT is worse than all sweeps.
- **No look-ahead helper finds it either:** the oracle (sweeps whose next 4 candles fall, a cheat used only as a positive control) reaches 84 % WR at 0.25R. So even knowing the next 4 candles' direction gives under 85 % with a stop just above the sweep. 85-95 % with this stop needs a smaller target or a wider stop, which is the "WR is a price" trade that already lost money in §7 (as).

## OOS table (all 24 cells)

WR = trades closed in profit after the spread. $ = average per trade per ounce, after the measured spread. Random = same hour, same stop in ATR, same target, 5 per trade.

| Cell | TRAIN n | TRAIN $ | OOS n | per week | OOS WR | WR low | OOS $ | $ low | random WR | random $ |
|---|---|---|---|---|---|---|---|---|---|---|
| 1H SWEEP T1 1R | 1966 | −0.36 | 1174 | 4.3 | 43.4 % | 40.6 % | −0.99 | −1.88 | 46.0 % | −0.44 |
| 1H SWEEP T1 0.5R | 2101 | −0.40 | 1251 | 4.5 | 60.0 % | 57.2 % | −0.67 | −1.30 | 60.3 % | −0.39 |
| 1H SWEEP T1 0.25R | 2177 | −0.39 | 1315 | 4.8 | 73.2 % | 70.8 % | −0.58 | −1.12 | 71.8 % | −0.40 |
| 1H SWEEP T2 1R | 1234 | −0.35 | 729 | 2.6 | 44.9 % | 41.3 % | −1.04 | −2.77 | 46.2 % | −0.86 |
| 1H SWEEP T2 0.5R | 1300 | −0.51 | 778 | 2.8 | 59.1 % | 55.6 % | −1.01 | −2.17 | 61.6 % | −0.74 |
| 1H SWEEP T2 0.25R | 1377 | −0.49 | 828 | 3.0 | 73.4 % | 70.3 % | −1.04 | −2.07 | 75.8 % | −0.50 |
| 1H SMT T1 1R | 752 | −0.23 | 426 | 1.5 | 45.8 % | 41.1 % | −0.41 | −1.64 | 45.1 % | −0.48 |
| 1H SMT T1 0.5R | 791 | −0.30 | 443 | 1.6 | 60.3 % | 55.6 % | −0.20 | −1.17 | 60.3 % | −0.34 |
| 1H SMT T1 0.25R | 813 | −0.34 | 457 | 1.7 | 73.5 % | 69.3 % | −0.28 | −1.02 | 71.5 % | −0.33 |
| 1H SMT T2 1R | 461 | −0.22 | 265 | 1.0 | 48.3 % | 42.4 % | −0.21 | −2.45 | 47.9 % | −0.37 |
| 1H SMT T2 0.5R | 480 | −0.42 | 281 | 1.0 | 63.0 % | 57.2 % | +0.01 | −1.30 | 62.1 % | −0.35 |
| 1H SMT T2 0.25R | 507 | −0.51 | 295 | 1.1 | **77.6 %** | 72.5 % | +0.14 | −0.76 | 75.3 % | −0.25 |
| 4H SWEEP T1 1R | 501 | −0.34 | 328 | 1.2 | 42.7 % | 37.5 % | −1.29 | −4.16 | 45.8 % | −0.95 |
| 4H SWEEP T1 0.5R | 526 | −0.52 | 346 | 1.3 | 60.1 % | 54.9 % | −0.59 | −2.49 | 61.2 % | −0.58 |
| 4H SWEEP T1 0.25R | 555 | −0.40 | 362 | 1.3 | 71.8 % | 67.0 % | −0.86 | −2.18 | 73.7 % | −1.03 |
| 4H SWEEP T2 1R | 406 | −0.14 | 276 | 1.0 | 45.3 % | 39.5 % | −0.89 | −4.18 | 45.8 % | −0.89 |
| 4H SWEEP T2 0.5R | 439 | −0.32 | 291 | 1.1 | 61.5 % | 55.8 % | −0.47 | −3.00 | 60.8 % | −1.23 |
| 4H SWEEP T2 0.25R | 460 | −0.29 | 306 | 1.1 | 75.2 % | 70.0 % | −0.24 | −1.72 | 73.1 % | −0.57 |
| 4H SMT T1 1R | 207 | −0.08 | 132 | 0.5 | 41.7 % | 33.6 % | −1.60 | −4.86 | 46.5 % | −0.25 |
| 4H SMT T1 0.5R | 216 | −0.28 | 134 | 0.5 | 58.2 % | 49.7 % | −0.97 | −3.14 | 64.6 % | −1.01 |
| 4H SMT T1 0.25R | 225 | −0.15 | 136 | 0.5 | 68.4 % | 60.2 % | −1.15 | −2.96 | 73.4 % | −0.75 |
| 4H SMT T2 1R | 164 | +0.42 | 112 | 0.4 | 43.8 % | 34.9 % | −1.09 | −4.88 | 49.9 % | +1.23 |
| 4H SMT T2 0.5R | 175 | −0.20 | 115 | 0.4 | 56.5 % | 47.4 % | −1.13 | −3.67 | 57.6 % | −1.37 |
| 4H SMT T2 0.25R | 185 | −0.26 | 121 | 0.4 | 67.8 % | 59.0 % | −1.28 | −3.45 | 76.0 % | −0.10 |

Holm across 24: 0 pass. Report-only rows (silver CONFIRMS, ORACLE) are in the JSON.

## What this adds to the SELL record

Earlier SELL tests used gold's price alone; this one added silver at the same moment. It is the seventh SELL family measured (§7 (as), (bi), INVESTIGATION_90WR, (cs), sweep-reclaim, waterfall rider, this). None reaches 85 % WR with money. The 1H silver non-confirmation is a small, real-looking reduction of the loss, not an edge. Do not re-propose a SELL trigger without information gold and silver prices do not carry (e.g. real order flow beyond 2 years, positioning data).

## Audit

`data/master/sell_smt_sweep_audit.json`: **CLEAN.**
- Independent evaluator: 300 random trades re-derived from the minutes (sweep candle, reference high, stop, silver highs, the whole exit path): **0 differences**.
- Prefix (look-ahead) check: 200 random cut times, 517,304 signals and 9,040 3m-break entries compared against data cut at that time: **0 differences**.
- Positive control: the oracle beats the matching sweep cells by 11-23 WR points and turns every $ positive (+$0.76 to +$5.82) → the harness sees an edge when one exists.
- Bug found and fixed before any report: the first run's 3m-break entry used a wrong search key and produced 0 trades; the rerun is the one reported.
