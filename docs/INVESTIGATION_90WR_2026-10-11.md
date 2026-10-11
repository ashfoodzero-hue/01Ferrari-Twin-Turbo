# 90 % WR investigation — pre-registered plan (2026-10-11)

Ashraf's request: *"do all above … in a safe way and achieve for me over 90 % WR in real test not a guess … 1-5 trades a day"*, with full authority for 8 hours.
Checkpoint before any change: `C:\01Ferrari Twin Turbo CHECKPOINTS\2026-10-11_pre-investigation` (full copy, no `.env`) + git tag `checkpoint-2026-10-11-pre-investigation`.
**Safe:** research only. The live app, the live signals and the paper recorder are not touched.

Written **before any result was seen**. Nothing below is changed after a run. Every candidate tested is counted (K) and the bounds are Bonferroni-corrected over K.

## Data and the trade
- XAU spot 1m BID (Polygon), 2013-07-21 → 2026-10-09 06:00 (frozen tape). Measured spread table (`spreadModel.js`).
- **Decision points:** every closed 15m bar. Entry at that close: BUY pays the ask (bid + spread), SELL at the bid.
- **Brackets,** in units of A = ATR14 of the closed 1h bars at the decision time:

  | Bracket | Target | Stop | Random-entry geometry ≈ stop/(target+stop) |
  |---|---|---|---|
  | B1 | 0.25 A | 2 A | 0.89 |
  | B2 | 0.5 A | 3 A | 0.86 |
  | B3 | 0.5 A | 2 A | 0.80 |
  | B4 | 1 A | 1 A | 0.50 |

- Stop first inside a minute. Stop slippage min(0.30, 0.05·A). Exits on the correct side. Open after 24 h = closed at the market.
- **WIN ⇔ net $ > 0 after costs.**

## Features (all causal: only bars closed at the decision time)
- **Returns:** 1/4/16/96 × 15m.
- **EMAs:** close − EMA 20/50/200 on 15m/1h/4h/1d; EMA20 slope on 1h/4h/1d; EMA stack trend on 15m/1h/4h/1d/1w.
- **Oscillators:** RSI14 on 15m/1h/4h/1d; Bollinger z on 15m/1h; ADX 1h.
- **Day context:**
  - day VWAP distance;
  - position in today's range; today's range;
  - distances to the previous day's H/L and the previous week's H/L;
  - Asian-session (00-07 UTC) H/L distances after 07:00.
- **Sweeps:** the previous day's H/L taken within the last 4 bars and closed back inside.
- **ATR regime:** 15m / 1h / 1d.
- **Relative volume.**
- **Time:** UTC hour, weekday.
- **Calendar:** minutes since / until a high-impact release (NFP, CPI, FOMC, PPI, Retail).

Distances are in A.

## Part 1 — every signal together (plan item 2)
- **Model:** gradient-boosted trees (own JS implementation, no downloads). One model per side × bracket = 8 candidates.
- **Walk-forward by year:** the model for year Y is trained only on data before Y − 2 days.
- **Threshold for year Y:** chosen on year Y−1's own out-of-sample scores. It is the lowest score whose selected trades in Y−1 had WR ≥ 92 %, mean $ > 0 and **≥ 30 trades** (fixed before the first run); none → no trades in Y.
- **Live policy:** one position at a time, at most 5 trades per UTC day.
- **Out-of-sample years:** 2017 → 2026.

## Part 2 — fixed rules (plan items 1, 3, 4, 5), no fitting
Each rule is tested on 2014 → 2026, with brackets B1-B4 and both sides as stated. Taken in order, at most 5 per day, one position at a time.

- **R1 trend pullback:** BUY when the 1d AND 1w EMA stacks are BULL and the close is ≤ day VWAP − 0.5 A. SELL is the mirror.
- **R3a RSI:** BUY when RSI14(15m) < 30 AND the 1d stack is BULL. SELL is the mirror (> 70, BEAR).
- **R3b Bollinger:** BUY when z(15m) < −2 AND the 1d stack is BULL. SELL is the mirror.
- **R4 sweep:** BUY after the previous day's LOW is swept and the 15m close is back above it (within 4 bars). SELL is the mirror at the previous day's HIGH.
- **R5 London break:** after 07:00 UTC, the first 15m close outside the Asian range → trade in the break direction (once per day).

## Definition fixed before the first run (data-length constraint)
- **1w trend:** BULL ⇔ weekly close > EMA20w AND EMA20w rising vs 4 weeks earlier; BEAR is the mirror. A 200-week EMA is impossible on data from 2013.
- **EMAs:** SMA-seeded, valid after n bars.
- **Decision points:** from 2014-06, once the 1d EMA200 is valid.

## Gate — the same for every candidate (K = 8 models + 5 rules × 4 brackets = 28 → α = 0.05/28)
**PASS ⇔ all of:**
- **G1** OOS trades per trading day ≥ 1.0 (and ≤ 5 by construction).
- **G2** OOS WR ≥ 90 % AND Wilson lower bound (one-sided α/K) ≥ 88 %.
- **G3** OOS mean $/trade bootstrap lower bound (α/K) > 0.
- **G4** mean $/trade > 0 in ≥ 80 % of OOS years.
- **G5** spread × 1.5: mean $/trade > 0.

A candidate that misses G1 but meets G2-G5 is reported as **"PASS at lower frequency"**, never as a pass.

## Part 3 — exits (plan item 10), only on the best candidates from Parts 1-2
- Break-even after +0.5 × target.
- Time exit at 4 h.

Each is reported against the same gate. It counts toward K.

## What would change the plan
Nothing found here would be relabelled. If no candidate passes, the report says so, shows the best honest numbers, and lists the paid-data options (5 y order flow, depth) with what each could plausibly add.

---
## RESULTS so far (appended after each run; the plan above is unchanged)

**Dataset audit** (`audit_dataset.mjs` → `data/inv90/audit.json`):
- 2,400 trade outcomes re-simulated by separate code: **0 mismatches**.
- 1,800 features re-computed from data that ends before each decision: **0 mismatches** (no look-ahead).
- **Random-entry base rates:** B1 (0.25 A / 2 A) wins 77-88 % per year and loses $0.24-1.58 per trade in every year.

**Part 2: fixed rules** (`part2_rules.mjs` → `part2_results.json`). **0 / 20 pass.**
- WR equals the random base (B1 ≈ 83-84 %). Every rule × bracket loses money; positive years 0-2 / 13.
- Includes R1 trend pullback, R3a RSI, R3b Bollinger, R4 sweep and R5 London break.

**Part 1: every signal together** (`walkforward.mjs` + `part1_select.mjs` → `part1_results.json`). **0 / 8 pass.**
- Best: BUY_B1 88.7 % WR, −$0.15/t, 0.11/day.
- MEASURED diagnostic (`diag_scores.mjs`):
  - Out-of-sample AUC is 0.56-0.58, a real but weak ranking.
  - 90 %+ exists ONLY in the top 0.1-0.5 % of scores: SELL_B1 top 0.1 % = 95.2 % WR, +$1.65/t, ≈ 250 rows over 10.7 y (≈ 0.06/day).
  - At top 1 % it is already ≈ 90 % but −$0.20/t.
- **Measured cause:** the spread ($0.30-0.40) is a large share of a 0.25 × ATR1h target (often < $1), so the weak edge cannot pay it at 1-5 trades a day.

## Part 4: pre-registered after Parts 1-2, BEFORE its first run. Larger brackets, so the spread is a small share.
Same features, model, walk-forward, threshold rule (Y−1 WR ≥ 92 %, mean > 0, n ≥ 30) and G1-G5. H = ATR14 of the closed 4h bars; D = ATR14 of the closed 1d bars.

| Bracket | Target / stop | Horizon |
|---|---|---|
| I1 | 0.25 H / 2.5 H | intraday: entries 00:00-18:00 UTC; forced market exit at 20:55 UTC the same day (no overnight swap) |
| I2 | 0.15 H / 1.5 H | intraday, same rules as I1 |
| D1 | 0.2 D / 2 D | 7 days |
| D2 | 0.3 D / 3 D | 7 days |

- **Policy for D brackets:** up to 5 open positions at once, ≤ 5 new per day, ≥ 1 h between entries.
- **Overnight swap is NOT measured** (no broker swap history). D-bracket results are reported at swap 0 and at $0.30 / oz / night. A D candidate positive only at swap 0 is labelled **"PASS (swap-dependent)"**, never "PASS".
- **Overlap:** with overlapping positions, WR and $ bounds use a **weekly block bootstrap** (G2 uses the block-bootstrap WR bound at α/K ≥ 88 % in place of Wilson).
- **K** becomes 28 + 8 = 36 → α = 0.05/36 for Part 4.

**Part 3: exits** (`part3_exits.mjs` → `part3_results.json`). **0 / 4 pass.**
- Break-even: WR falls to 45-51 %, because scratches end at −slippage.
- 4 h time exit: WR ≈ 80 %, −$0.24 … +$0.03 per trade.

**Part 4: larger brackets** (`build_outcomes2.mjs`; audit `audit_outcomes2.mjs`: 1,100 re-simulated, 0 mismatches; `part4_select.mjs` → `part4_results.json`). **0 / 8 pass.**
- Random D1 already wins 82-93 % per year, but its $ follows gold's direction that year.
- Best: BUY_D1 at exactly 1.0/day, 88.7 % WR, −$1.90/t; 2026 alone: 588 trades, −$11.63/t.
- SELL_I2: 90.4 % WR, −$0.00/t, 0.22/day.
- **Measured failure mode:** a threshold that worked in Y−1 does not carry to Y. The yearly regime (direction) dominates.

## Part 5: pre-registered after Part 4, BEFORE its first run
- **5a. Pooled threshold:** for year Y, the threshold is taken from the pooled out-of-sample scores of ALL earlier years (2016 … Y−1) instead of Y−1 alone (same WR ≥ 92 %, mean > 0, n ≥ 30). Applied to the 16 existing candidates' scores, no retraining. Policies, bounds and G1-G5 as in their Part (1 or 4).
- **5b. Cross-market features:** the model is retrained with 10 added causal features from closed 15m bars:
  - silver returns 1/4/16 bars;
  - EURUSD and USDJPY returns 4/16 bars;
  - a USD composite over 16 bars;
  - the gold/silver ratio z-score (100 × 1h);
  - gold − silver relative return over 16 bars.

  Candidates: BUY_B1, SELL_B1, BUY_D1, SELL_I2 (the four closest to 90 % in Parts 1 and 4). Threshold rule = 5a.
- **5c. Two-sided books:** BUY and SELL in one book for B1 and D1 (each side with its own 5b threshold; a row where both qualify takes neither).
- **K** = 36 + 16 + 4 + 2 = 58 → α = 0.05/58 for Part 5.

**Part 5 results** (`part1_select/part4_select --pooled [--x]`, `walkforward --x`, `part5c_twosided.mjs`; JSON in `data/inv90/`).
- **5a pooled threshold: 0 / 16.** Best: BUY_D1 91.3 %, +$1.98/t, 0.37/day, 5/10 positive years.
- **5b cross-market: 0 / 4 pre-registered + SELL_D1 run in addition (counted, K = 59), 0 / 5.**
  - **BUY_D1-x: 92.0 % WR, +$2.51/t, 0.33/day.** Years: 2020 85.9 % −$3.57 · 2021 95.7 % · 2022 88.0 % −$1.15 · 2023 96.6 % · 2024 95.0 % · 2025 93.2 % · 2026 92.9 %; no threshold in 2017-19.
  - Fails G1 (0.33/day), G3 (bound −3.95) and G4 (5/10).
- **5c two-sided books: 0 / 2.** A null/undefined comparison bug was found (it admitted unqualified SELL rows) and fixed before the reported result. B1 n 90; D1 = BUY-only, identical to 5b.

**Diagnostic** (`diag_buyd1_drift.mjs`): the model is MORE than "buy gold in an uptrend". In the same years:

| Same years | WR | $ / trade |
|---|---|---|
| Always-buy | 88.7 % | −$0.89 |
| 1d + 1w bull trend | 89.6 % | −$0.16 |
| **Model** | **92.0 %** | **+$2.51** |

In 2026: model 92.9 % / +$7.62 vs always-buy 81.5 % / −$12.71. A real lift, not yet a pass.

## Part 6: pre-registered BEFORE its first run
- **6a:** the same scores (BUY_D1-x, SELL_D1-x) with the pooled threshold rule at **WR ≥ 90 %** (instead of 92 %), to raise frequency. Policy, block bounds and gate as Part 4.
- **K** = 61 → α = 0.05/61.

**Part 6a result** (`part4_select --pooled --x --wr=0.90` → `part4_pooled_x_wr0.9_results.json`). **0 / 2.**
- BUY_D1-x: 1.52/day, **89.8 % WR, +$0.02/t**, 4/10 positive years.
- SELL_D1-x: no threshold qualifies.

---
## CONCLUSION (2026-10-11): 0 of 61 pre-registered candidates pass. The measured frontier:

| Candidate | Trades / day | WR | $ / trade | Robust? |
|---|---|---|---|---|
| Any rule or model, intraday (B / I brackets) | 0.02-2.3 | 82-93 % | ≤ ≈ 0 | No: the spread eats the weak edge |
| BUY_D1-x, threshold at 92 % | 0.33 | 92.0 % | +$2.51 | No: 2020 / 2022 lose; 2017-19 empty; bound < 0 |
| BUY_D1-x, threshold at 90 % | 1.52 | 89.8 % | +$0.02 | No |
| Random BUY_D1 (geometry) | — | 88.6 % | −$0.69 | — |

- **WR 90 %+ at 1-5 trades/day with positive, year-robust money was NOT achieved** on 12 years of real data, with every idea from the list tested.
- **The one real, measured lift:** BUY_D1-x beats always-buy and trend-buy by about 3 WR points and about $3/t in the same years, at about 1 trade every 3 days. It is a forward-test candidate, NOT a ship.
- Every number above is reproducible from `scripts/inv90/*` and `data/inv90/*.json`.

---
## Part 7: pre-registered 2026-10-11 BEFORE its first run (Ashraf: "at least 1 trade a day with 92 % WR, solid entry")
- **7a. Stronger model:** the same features + cross-market (--x), GBDT with 400 trees, depth 5, lr 0.03, min leaf 200, row subsample 0.5. Walk-forward identical. Candidates BUY_D1 and SELL_D1. Report the pooled OOS AUC vs the Part 5b model.
- **7b. Frequency-anchored threshold** (guarantees the asked frequency, using past data only): for year Y, threshold = the HIGHEST score whose policy trades over the pooled earlier OOS years (2016 … Y−1) average **≥ 1.0 trade per trading day**. Then measure the WR that this frequency actually gets in Y.
  - Applied to: Part 5b BUY_D1-x scores, 7a BUY_D1, 7a SELL_D1, and a 7a two-sided D1 book.
  - Policy, weekly block bounds and G1-G5 as Part 4.
  - Ashraf's own target is reported beside the gate: **WR ≥ 92 % AND ≥ 1/day**.
- **K** = 61 + 2 (7a under the pooled 92 % rule) + 4 (7b) = **67** → α = 0.05/67.

**Part 7 results.**
- **7a stronger GBDT:** pooled OOS AUC BUY_D1 0.5218 vs 0.5215 (Part 5b); SELL_D1 0.5050 vs 0.5079. **Model capacity is not the bottleneck.**
  - Pooled 92 % rule (`part4_select --pooled --sfx=_xs` → `part4_pooled_xs_results.json`): BUY_D1 n 245, 93.9 %, +$5.54/t, 0.08/day, trades only 2024-26 → FAIL. SELL_D1 no threshold.
- **7b frequency-anchored ≥ 1/day** (`part7_freq.mjs` → `part7_results.json`): 0 / 4 pass; Ashraf's 92 % & ≥ 1/day target met by **none**.

| Book | Trades / day | WR | $ / trade | Positive years |
|---|---|---|---|---|
| **BUY_D1-xs (best)** | 1.15 | 90.8 % | +$0.46 (swap 0.30: +$0.18) | 6/10 (2018, 2020, 2022, 2026 lose) |
| BUY_D1-x | 1.28 | 90.2 % | +$0.26 | — |
| SELL_D1-xs | — | 82.7 % | — | — |
| Two-sided | — | 89.3 % | −$0.55 | — |

**Measured answer to "≥ 1 trade/day at 92 %":**
- On 12 years of XAU spot with these signals, ≥ 1/day caps at ≈ 90-91 % WR with thin, year-unstable money.
- 92 %+ appears only at ≤ 0.33/day.
- K = 67 candidates, 0 pass.
