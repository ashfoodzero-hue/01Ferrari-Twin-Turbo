# T0 SUB-SPEC: wave reason ledger, XAU, v1. Pre-registered 2026-10-30 BEFORE any number

**Parent:** `docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md` v1.1, Addendum A4.

**Request (Ashraf, 10-30):** "make sure we understand the market in every step at each time frame and find the reason for each move and wave" → "start here".

**Builds on:** `scripts/study_swing_reasons.mjs` (10-18: last year, 4H/1D only, random controls). T0 extends it in four ways:
- the full 13 y history;
- all 16 TFs;
- a knowable failed-extreme control;
- the full statistics of SPEC v1.1 (TRAIN/OOS, walk-forward, Holm, shuffled null).

Every definition below is fixed now.

## 1. Data

**XAU candles:**
- `scripts/lib/series_1m.mjs` `clean1m('XAUUSD')` + `kit('XAUUSD').build(M, tf)`: TradingView-exact, gold session, reopen clamp;
- `dataHoles.findHoles` + `markIncomplete`: incomplete candles are ZigZag breaks and are never a swing, control or window;
- period: from 2013-07-14 (`HISTORY_CONTINUOUS_FROM`) to the last closed minute.

**TFs (16):** 1m 3m 5m 15m 30m 1H 2H 3H 4H 6H 9H 1D 2D 3D 1W 1M.

**Context sources.** Each has its coverage. Outside its coverage an item is **MISSING (null)**, never false.

| source | file / module | coverage |
|---|---|---|
| FF calendar | `data/calendar/ff_history.jsonl` (`t` = scheduled release time, `impact`, `better` 1 = USD+ / 2 = USD−) | 2013-07-15 → 2026-10-16. Rows after 10-16: MISSING in v1 |
| headlines | `data/news/polygon_news.jsonl` (`t` = published) | 2020-03-31 → |
| DXY | the same TF candles built from `clean1m('DXY')` (gold grid) | 2015 → |
| US 10y yield | `data/macro/treasury-yields.json`, daily `yield_10_year`; `known_t` = date + 1 day 00:00 UTC (conservative: after the US close) | as in file |
| CME gold volume | `GOLD_FUT` 1m `v` | 2024-10-09 → |
| footprints | `footprintCandles(tf)`, TF ≤ 4H | 2024-10-01 → 2026-10-08 |
| GLD volume | `GLD` 1m `v`, summed per day | as in file |
| CFTC COT | not in the store | **MISSING in v1** (a free CFTC fetch = a later addendum) |

## 2. Waves and candidates

- **Waves:** `zigzag(C, { k: 3, atrLen: 14, breaks })` (`src/master/swings.js`). A wave = from swing n to swing n+1.
  - Swing candle i is the turn.
  - **Decision time D = C[i].close_t.** The turn's knowable reasons are judged as at D.
  - The wave is confirmed only at `knownI`. That is stored, but not used for reasons.
- **Real turns:** every swing with `t` ≥ 2013-07-14.
- **Control C1 (primary, knowable): failed extremes.** Taken from `zigzag().failed` with `pullback_atr ≥ 1.0`: a new extreme that pulled back ≥ 1 ATR (it looked like a turn) and was then broken.
  - **Audit column C1-all:** every failed extreme, unfiltered. This is the precision rule against EVERY real-time candidate.
- **Control C2 (descriptive): random candles.** Same TF, same UTC hour, same calendar year, not within ±3 candles of any swing, not incomplete. Up to 3 per swing, seed `2026 + TF index`.
- **Window W = [C[i−1].t, D]:** the candle before the turn plus the turn candle. This is the A4 rule "≤ 1 bar before the start". **Every item must have every input `known_t` ≤ D.** The code asserts this per row, and the violation count must be 0.

## 3. Reason items (binary; direction-aware where marked "supporting")

"Supporting" means pushing the same way as the new wave:
- after a LOW: up for gold, i.e. USD weaker, yields lower, DXY lower;
- after a HIGH: the opposite.

| # | group | item | definition | TFs |
|---|---|---|---|---|
| n1 | 1 news | `news_high` | any FF `impact = high` event with t ∈ W | all |
| n2 | 1 news | `news_surprise_sup` | any high/medium FF event in W with `better` = 2 (USD−) after a LOW, or `better` = 1 (USD+) after a HIGH | all |
| n3 | 1 news | `news_surprise_any` | any high/medium FF event in W with `better` ∈ {1, 2} | all |
| n4 | 1 news | `fed_event` | FF name matches `/FOMC|Federal Funds Rate|Fed Chair|Powell|Yellen/i`, any impact, in W | all |
| h1 | 2 headlines | `head_war` | headline title+description in W matches `/\b(war|attack|missile|strike|invasion|conflict|military|troops|ceasefire|iran|israel|ukraine|russia)\b/i` | all (2020-03 →) |
| h2 | 2 headlines | `head_tariff` | `/\b(tariff|trade war|sanction|export ban|duties)\b/i` | all (2020-03 →) |
| h3 | 2 headlines | `head_fiscal` | `/\b(shutdown|debt ceiling|deficit|default|downgrade|treasury auction)\b/i` | all (2020-03 →) |
| d1 | 3 dollar / rates | `dxy_sup` | DXY close(i) / close(i−1) − 1 in the supporting direction AND its absolute value ≥ the 80th percentile of the absolute 1-candle DXY changes of the PREVIOUS calendar year (same TF). First year: MISSING | all (2016 →) |
| d2 | 3 dollar / rates | `yield_sup` | 10y change between the last value known at C[i−1].t and the last known at D: ≥ 5 bp in the supporting direction | 1D 2D 3D 1W 1M |
| l1 | 4 levels | `lvl_prior_swing` | price of the turn within 0.25 × ATR(i−1) of any of: the last 6 same-type swings of this TF, the last 4 of 1D, the last 4 of 1W; each with `knownT` ≤ C[i].t | all |
| l2 | 4 levels | `lvl_prev_day_week` | within 0.25 × ATR of the previous 1D candle's low (after a LOW) / high (after a HIGH), or the previous 1W's | TF < 1W |
| l3 | 4 levels | `lvl_round` | within 0.25 × ATR of a multiple of $50 | all |
| x1 | 5 liquidity / exhaustion | `sweep` | `anatomy` `sweep_low_reclaim` (LOW) / `sweep_high_reject` (HIGH) of candle i vs i−1 | all |
| x2 | 5 liquidity / exhaustion | `climax` | range(i) ≥ 2 × ATR(i−1) | all |
| x3 | 5 liquidity / exhaustion | `compression_before` | ATR(5) / ATR(50) at i−1 ≤ 0.7 | all |
| x4 | 5 liquidity / exhaustion | `rsi_div` | vs the last same-type swing confirmed by C[i].t: price beyond it AND RSI(14) not beyond | all |
| x5 | 5 liquidity / exhaustion | `overextended` | \|close(i) − EMA50(i)\| / ATR(i−1) ≥ the 90th percentile of the PREVIOUS calendar year (same TF). First year: MISSING | all |
| s1 | 6 session / time | `open_hour` | candle i overlaps an NY-hour start of 03:00 (London), 08:00 / 09:00 (NY open) or 18:00 (Asia / reopen) | TF ≤ 1H |
| s2 | 6 session / time | `month_end` | candle date (`td`) in the last 3 calendar days of its month | TF ≤ 1D |
| s3 | 6 session / time | `holiday_near` | an FF `impact = holiday` event within ±1 UTC day of D | TF ≤ 1D |
| f1 | 7 flows | `cme_vol_spike` | GOLD_FUT volume in candle i ≥ 2 × median of the same candle-time on the previous 20 days (≥ 5 found) | TF < 1D (2024-10-09 →) |
| f2 | 7 flows | `absorption` | `footprintRead` `absorption_low` (LOW) / `absorption_high` (HIGH) on candle i | TF ≤ 4H (2024-10-01 → 2026-10-08) |
| f3 | 7 flows | `gld_vol_spike` | GLD volume of the candle's day ≥ 2 × median of the previous 20 days (≥ 10 found) | 1D only |
| c1 | 8 higher-TF | `htf_with` | the next-higher TF's last swing with `knownT` ≤ D is of the opposite type to the turn (the HTF leg points the same way as the new wave) | TF < 1M |

**Count:** 24 items. The **family K** for Holm = the (item, TF) cells that have data, counted and printed. That is at most 24 × 16 = 384, which is stricter than A4's 128. This is a conservative change, fixed here before results.

**Descriptive "carried by" columns** (per wave; hindsight, labelled, never a reason):
- high-impact FF events inside the wave;
- headlines (war / tariff / fiscal) inside the wave;
- DXY % over the wave;
- wave size (ATR), bars, ATR per bar.

"Ended by" = the next turn's started-by items.

**UNEXPLAINED:** a real turn where none of the 24 items is true. Reported per TF, next to the same share at C1 and C2. A share without its control means nothing.

## 4. Statistics (from SPEC v1.1 §2 + A1)

For each (item, TF) cell:
- **Rates:** p_real, p_C1, p_C2, using only rows where the item is not MISSING.
- **Lift:** p_real / p_C1, with a Katz log-ratio 95 % LB.
- **p-value:** two-proportion z (`compareRates`).

**Splits:**
- TRAIN = turns ≤ 2021-06-30; OOS = after.
- Walk-forward: each year 2018 → 2025, with the sign of (p_real − p_C1) per year, counted only when n_real ≥ 30 and n_C1 ≥ 30 that year.
- Stress periods reported: 2013-15, 2016-19, 2020, 2022, 2023-26.

**REASON (PASS) needs all of these:**
1. n_real ≥ 100 AND n_C1 ≥ 100 in TRAIN and in OOS (else DESCRIBED ONLY);
2. lift > 1 with a Holm pass (family = all cells, α = 0.05) in TRAIN;
3. AND a Holm pass in OOS (separate family, same K);
4. AND Katz LB > 1 in OOS;
5. AND the same sign in ≥ 80 % of the counted walk-forward years;
6. AND a week-block bootstrap (B = 1000) LB of the OOS lift > 1. Computed only for cells passing 1-5, because it is expensive.

**Labels for everything else:**
- a cell that passes vs C2 but not vs C1 = "**present at turns, not knowable**";
- the rest = "**present, not explanatory**".

A lift < 1 that passes is reported as an "**anti-reason**": the item makes a turn LESS likely.

## 5. Bias audit (a result is void if any fails)

1. **Known-time assertion:** per row, max input `known_t` ≤ D. Violations must be 0.
2. **Swing-book equality:** for every TF, the swings inside the window of `docs/swing_book/xau_1y_swings/<tf>.csv` must equal the CSV (type, candle_open, price ± $0.01). 0 missing, 0 extra.
3. **Survivorship:** counts of rows dropped (incomplete / holes / warm-up) printed per TF. Nothing else is dropped.
4. **Shuffled-label null:** real / C1 labels permuted within TF × year (seed 7), the whole §4 PASS pipeline (steps 1-5) re-run. It must give **0 PASS cells**. If it gives any, the pipeline is broken and nothing is reported as a reason.

## 6. Outputs

- `data/research/wave_reasons/xau/<tf>.jsonl`: one row per real turn: wave columns, the 24 items, the carried-by columns. Large, so it is not committed. It is rebuilt by the script.
- `data/research/wave_reasons/xau_controls_summary.json` and `data/research/wave_reasons/2026-10-30_xau_T0_summary.json`: every cell's n, rates, lift, LB, p, Holm, walk-forward and label; UNEXPLAINED shares; the audit results. Committed.
- Script: `scripts/research/wave_reasons/study_wave_reasons.mjs`. Report: MASTER §7, plus an index line in the research README.

## 7. What v1 does NOT do (said up front)

- **Only XAU.** XAG / DXY / WTI come in v2, same code.
- **No COT** (not in the store).
- **No intraday yields.** We hold daily yields only, so d2 is daily TFs only.
- **No FF rows after 2026-10-16.** The calendar history file ends there.
- **Few waves on 1W / 1M** (expected n < 100): DESCRIBED ONLY.
- **A REASON is still not a signal.** It says a turn is more likely when the item is present. It says nothing about money. Money tests belong to T3 / T7.
