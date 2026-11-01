# T1 SUB-SPEC, step 2: blind nowcast of the 33 BUILDABLE releases. Pre-registered 2026-11-01 BEFORE any input is extracted or any prediction made

**Parent:** `docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md` v1.1 (T1, §2.2 blind rule, §2.3 split, Addendum A Q1 + A5) and the step-1 inventory `docs/research/macro_nowcast/2026-10-30_T1_inventory_SPEC.md` + addendum A, result `data/research/macro_nowcast/inputs/2026-10-30_T1_inventory.json` (33 label (a)).

**Ashraf:** "Start T1 step 2" (2026-11-01). Standing: "do the most best … zero guessing"; a value without a source + publication time = MISSING.

**No actual value and no consensus value has been read for this spec.** The only facts used are the step-1 inventory (names, row counts, input verification, first-vintage dates).

## 0. Four stages, four separate programs, run in this order

| stage | program | reads | writes | may see actuals? |
|---|---|---|---|---|
| E. extract | `scripts/research/macro_nowcast/t1_extract.mjs` | FRED / ALFRED, `ff_history.jsonl` + `history.json` (earlier prints only, see §2), Treasury DTS API | `data/research/macro_nowcast/inputs/release_schedule.jsonl`, `inputs/rows/<slug>.jsonl` | it reads FF rows, but **writes no value with `known_t` ≥ the row's release time and never the `forecast` field** |
| P. predict | `scripts/research/macro_nowcast/t1_predict.mjs` | `inputs/release_schedule.jsonl` + `inputs/rows/` ONLY | `predictions/T1_v1.jsonl` + `predictions/MANIFEST.json` (sha256) | **no** (smoke test, §5) |
| C. commit | git | — | the predictions commit | — |
| S. score | `scripts/research/macro_nowcast/t1_score.mjs` (later chat) | predictions + `ff_history.jsonl` actual / forecast + GDPNow vintages | `scores/2026-MM-DD_T1_v1_score.json` | yes; refuses to run if the predictions commit is not older than its own first run |

The scorer is written only after C. Its rules are fixed in §4 now.

## 1. The 33 releases and their model (fixed now, never tuned after a number)

**One model form for all 33: an expanding-window OLS, refit at every release instance.**
- The fit uses only PAST instances of the same release: their features (as extracted for them) and their own first print, all with `known_t` < the current release time.
- Minimum past instances before a prediction is made: **24 for weekly / monthly, 12 for quarterly.** Before that: no prediction (counted as "not predicted", never filled).
- Any feature MISSING for the current instance → no prediction for that instance (counted). Past instances with a MISSING feature are left out of the fit.
- Prediction is unrounded.
- Group M_ii (earlier print) has no OLS: prediction = earlier print + median of the past revisions (own first print − its earlier print), median over all past pairs; 0 until 8 past pairs exist.

**Feature notation.** `mm(x)` = month-on-month % change of the latest observation; `avg(x, month)` = mean of the daily / weekly values inside the reference month; "same month" = the reference month of the release (§2.3). `own_k` = the release's own k-th previous first print.

| # | release (FF name) | group | features (all as of the release time) |
|---|---|---|---|
| 1 | Unemployment Claims | weekly | ICSA latest vintage: last week, mean of last 4 weeks |
| 2 | Non-Farm Employment Change | labour | FF:ADP Non-Farm Employment Change same month; ICSA survey week (the week containing the 12th) − previous month's survey week; CCSA same change; own_1 |
| 3 | Unemployment Rate | labour | own_1; Δ ln CCSA survey week vs previous survey week; Δ ln ICSA same. Target modelled as change from own_1 |
| 4 | Personal Income m/m | income | mm(PAYEMS × AWHI-implied hours × CES0500000003) same month (aggregate private wage bill proxy); own_1 |
| 5 | Personal Spending m/m | spending | mm(RSAFS) same month; mm(TOTALSA) same month; own_1 |
| 6 | Industrial Production m/m | production | mm(AWHMAN × MANEMP) same month (manufacturing hours); own_1 |
| 7 | Capacity Utilization Rate | production | own_1; same feature as #6. Target modelled as change from own_1 |
| 8 | Factory Orders m/m | orders | FF:Durable Goods Orders m/m same month; own_1 |
| 9 | Business Inventories m/m | inventories | FF:Prelim Wholesale Inventories m/m same month (MISSING before 2016-08-26); mm(AMTMTI) same month; own_1 |
| 10 | Final Wholesale Inventories m/m | M_ii | earlier print = FF:Prelim Wholesale Inventories m/m (from 2016-08-26) |
| 11 | Trade Balance | trade | FF:Goods Trade Balance same month (MISSING before 2015-07-30); own_1 |
| 12 | Current Account | trade-q | sum of the quarter's 3 BOPGSTB monthly values; own_1 |
| 13 | Import Prices m/m | prices | mm(avg(DCOILWTICO)) same month; mm(avg(DTWEXBGS)) same month; own_1 |
| 14 | Federal Budget Balance | fiscal | DTS same-month total deposits − total withdrawals, excluding public-debt cash issues / redemptions (Table II / III lines, fixed in the extractor's header before the first run); the same month 12 months earlier from own history (own_12) |
| 15 | CPI m/m | CPI | mm(avg(GASREGW)) same month; 3-month mean of CPIUFDSL m/m (latest known); 3-month mean of CPILFESL m/m (latest known) |
| 16 | Core CPI m/m | CPI | 3-month mean of CPILFESL m/m; 3-month mean of CUSR0000SAH1 m/m; latest PPIFIS m/m known (MISSING before 2014-02-19) |
| 17 | CPI y/y | CPI y/y | own_1 + prediction #15 − CPIAUCSL m/m of the same month one year earlier (base effect, SA approximation; no OLS) |
| 18 | Core CPI y/y | CPI y/y | own_1 + prediction #16 − CPILFESL m/m of the same month one year earlier (no OLS) |
| 19 | Core PCE Price Index m/m | PCE | mm(CPILFESL) same month (out before PCE); latest PPIFIS m/m known (MISSING before 2014-02-19); own_1 |
| 20 | Advance GDP q/q | GDP | annualised q/q of the quarter's mean RSAFS; Δ of the quarter's mean BOPGSTB vs the previous quarter; Δ BUSINV (last known month of the quarter vs the last month of the previous quarter) |
| 21 | Advance GDP Price Index q/q | GDP prices | annualised q/q of the quarter's mean CPIAUCSL; annualised q/q of the quarter's mean IR |
| 22 | Prelim GDP q/q | M_ii | earlier print = FF:Advance GDP q/q |
| 23 | Final GDP q/q | M_ii | earlier print = FF:Prelim GDP q/q |
| 24 | Prelim GDP Price Index q/q | M_ii | earlier print = FF:Advance GDP Price Index q/q |
| 25 | Final GDP Price Index q/q | M_ii | earlier print = FF:Prelim GDP Price Index q/q |
| 26 | Prelim Nonfarm Productivity q/q | productivity | FF:Advance GDP q/q same quarter; annualised q/q of the quarter's mean AWHI (hours) |
| 27 | Prelim Unit Labor Costs q/q | productivity | annualised q/q of the quarter's mean CES0500000003 (hourly earnings); FF:Advance GDP q/q; hours as #26 |
| 28 | Revised Nonfarm Productivity q/q | M_ii+ | earlier print = FF:Prelim Nonfarm Productivity q/q, **plus** (FF:Prelim GDP q/q − FF:Advance GDP q/q) of the same quarter |
| 29 | Revised Unit Labor Costs q/q | M_ii+ | earlier print = FF:Prelim Unit Labor Costs q/q, **minus** the same GDP revision |
| 30 | Revised UoM Consumer Sentiment | M_ii | earlier print = FF:Prelim UoM Consumer Sentiment |
| 31 | Revised UoM Inflation Expectations | M_ii | earlier print = FF:Prelim UoM Inflation Expectations |
| 32 | Final Manufacturing PMI | M_ii | earlier print = FF:Flash Manufacturing PMI |
| 33 | Final Services PMI | M_ii | earlier print = FF:Flash Services PMI (from 2013-11-25) |

**Honest limits, said now:**
- Weights are learned from each release's own past (expanding OLS), not from BLS relative-importance files: those files were not verified in step 1, so they are not used.
- Core CPI has no free dated used-car or rent proxy beyond the CPI's own lagged pieces; its model is close to "recent trend" and is expected to be weak. It is run and reported anyway.
- CPI y/y uses SA m/m for the base effect; the published y/y is NSA. The approximation error is part of the measured error.
- GDP (n ≈ 52), GDP price, productivity, ULC and current account (n ≈ 52-53) are **UNDERPOWERED by design** (§2.6 of the parent): OOS ≈ 20 releases. Reported, never "proven" below n 40 in OOS.
- The OLS form is the same for every release, chosen before any number. No feature is added, dropped or transformed after a result; any change is v2, re-predicted blind for the full history, v1 kept.

## 2. Timing: when a value counts as known (`known_t`)

1. **Release time** of every target instance = the FF row time `t` (UTC ms). Schedule file rows: `{slug, name, release_t, ref_period}`; no actual, forecast, previous or revision field.
2. **FRED / ALFRED (vintage dates, no time of day):** an observation from vintage dated D (New York calendar date) is usable only if **D < the release's New York calendar date** (strictly earlier day). Same-day earlier releases are therefore never used (conservative, loses some information, never leaks).
   - The extractor takes, per instance, the latest vintage before that cut (`realtime_start = realtime_end = cut − 1 day`), so later revisions never enter.
3. **Daily / weekly market series** (GASREGW, DCOILWTICO, DTWEXBGS): an observation dated D is usable only if D + 1 day < the release's New York date.
4. **FF earlier prints and own history:** the FF `actual` of another row is usable only if that row's `t` < the release time. The **target's own current actual is never written**; its own PAST first prints (`own_k`) are written per row only with their `t` < release time.
5. **DTS:** a record dated D is usable only if D + 2 days ≤ the release's New York date.
6. **Pairing an earlier print (M_ii) or a same-month FF input:** the most recent row of that earlier event before the target release, within 45 days (monthly) or 100 days (quarterly). None → MISSING.

**2.3 Reference period.** Rule per group (fixed): monthly releases = the month before the release month, except Final PMIs and Revised UoM = the month of the matching earlier print; quarterly = the quarter of the matching earlier print, or for Advance GDP / Advance GDP price / Prelim productivity / Prelim ULC = the last completed quarter; claims = the week ending the Saturday before the release. A FRED feature whose latest usable observation is not the required month → MISSING (never the month before instead).

## 3. Outputs of E and P

- `inputs/rows/<slug>.jsonl`: one line per release instance: `{release_t, ref_period, features:{name:{value, obs_date, known_t, source}}, own_hist:[{t, value}], earlier:{t, value}}`. Every `known_t` < `release_t`.
- `predictions/T1_v1.jsonl`: one line per instance: `{slug, release_t, ref_period, pred | null, why_null, n_fit, coefs}`.
- `predictions/MANIFEST.json`: sha256 of each file, row counts per release, code commit hash of E and P.
- Unit conversion: the FF text value (e.g. "0.3%", "245K", "-75.4B", "52.1") is parsed once by one function in `scripts/research/macro_nowcast/ffValue.mjs` (K, M, B, T, %); predictions are in the same unit as the FF print.

## 4. Scoring rules (fixed now; run only after the predictions commit)

**Target:** the FF `actual` of the instance (the first print as Forex Factory recorded it). **Consensus:** the FF `forecast`. **Naive:** own_1 (the previous first print). **Public competitor:** GDPNow (ALFRED GDPNOW, latest vintage before the release) for Advance GDP, from 2016-05-17.

**Per release type (L2):**
- errors |consensus − actual|, |naive − actual|, |ours − actual|;
- **criterion 1:** paired moving-block bootstrap (blocks of 6 consecutive instances for monthly, 4 for quarterly, 13 for weekly; 10,000 draws) of mean(|consensus error| − |our error|): LB > 0 in TRAIN **and** in OOS;
- **criterion 2 (L3 sign):** surprise sign = sign(actual − consensus); our call = sign(ours − consensus). Instances with actual = consensus are excluded and counted. Hit rate Wilson LB > 50 % in OOS;
- both criteria corrected by **Holm across K = 33 releases × 2 criteria = 66** (one-sided p from the bootstrap share ≤ 0, and the exact binomial vs 50 %).

**Split:** TRAIN = release time 2013-07-14 → 2021-06-30, OOS = 2021-07-01 → latest (parent §2.3).

**Addendum A Q1 extras (all reported, part of the pass):**
- yearly walk-forward from 2018: the sign of mean(|consensus err| − |our err|) is the same in ≥ 80 % of years;
- stress eras reported separately and the pass re-checked without them: 2020-03 → 2020-12 (COVID), 2022-01 → 2022-12 (inflation shock);
- **bias audit (shuffled null):** our predictions shuffled across instances of the same release type (1,000 shuffles) must FAIL criterion 1 in ≥ 95 % of shuffles; if not, the run is void;
- coverage: predicted / total instances per release, with every null reason counted.

**L1 (components, report only, not in the pass):** for CPI only: the energy, food and core features vs the CPI energy / food / core first prints (CPIENGSL, CPIUFDSL, CPILFESL first vintage), error vs naive, per year.

**Report:** per release: n TRAIN / OOS, mean |error| for consensus / naive / ours (/ GDPNow), criterion 1 LB, sign hit rate + Wilson LB, Holm result, per-year table, stress-era table, coverage. PASS / FAIL / UNDERPOWERED per release. A FAIL is reported as plainly as a PASS.

## 5. Audits (any failure voids the run before scoring)

1. `smoke_blind_paths.mjs`: greps `t1_predict.mjs` and every file it imports for `ff_history`, `history.json`, `actual`, `forecast`, `/actuals`, `/scores`; any hit = fail.
2. `smoke_t1_known_t.mjs`: for every row in `inputs/rows/`, every `known_t` < `release_t`, no `forecast` key anywhere, and own_hist never contains a `t` ≥ `release_t`.
3. Leak probe: shift every release time 30 days EARLIER and re-extract a sample of 50 instances; the feature count must fall (inputs disappear), never stay equal for all — proves the cut is applied.
4. Re-run determinism: P run twice → identical sha256.
5. The predictions commit hash and time are written into the score file; the scorer exits if its start time is not after that commit.

## 6. What happens next (order)

1. Commit this spec (before any extraction).
2. Build E, run it, run audits 2 + 3, commit the inputs manifest (row files are large → gitignored, their sha256 committed).
3. Build P, run audit 1 + 4, run P, commit predictions + manifest.
4. New chat: build and run the scorer; MASTER §7 entry; memory topic; PASS / FAIL table to Ashraf.

## ADDENDUM A — 2026-11-01, before the extractor's first run (no actual, no consensus read; only API layouts probed)

Fixes three points the spec left open. Nothing in §1 features, §4 scoring or §5 audits changes.

1. **Reference period (replaces the lag rule in §2.3 for the releases below).** A fixed "month before" lag is wrong for several releases (factory orders, business inventories and trade are 2 months back; PCE moved in 2013-2017). The reference period of an instance is therefore the observation of the release's FRED **timing series** whose FIRST vintage date (ALFRED `output_type=4`, dates only, the value is never read) equals the release's New York date (± 1 day). Timing series: NFP PAYEMS · unemployment rate UNRATE · personal income PI · spending PCE · core PCE PCEPILFE · IP INDPRO · capacity TCU · factory orders AMTMNO · business inventories BUSINV · trade BOPGSTB · current account IEABC · import prices IR · budget MTSDS133FMS · CPI m/m and y/y CPIAUCSL · core CPI m/m and y/y CPILFESL. No match → fallback only where stated: budget = the month before (before MTSDS133FMS vintages, 2015-09), current account = the quarter containing release month − 3 (before IEABC vintages, 2014-06). Otherwise no match → ref MISSING → no prediction (counted). Claims = the week ending the Saturday before the release. Advance GDP, Advance GDP price, Prelim productivity, Prelim ULC = the last quarter completed before the release. Earlier-print releases need no reference period (pairing rule §2.6).
2. **Wage-bill proxy (#4).** AWHI is already an aggregate-hours index (employment × hours, total private). The proxy is mm(AWHI × CES0500000003); PAYEMS is not multiplied in again (it would count employment twice). #26 / #27 use AWHI the same way.
3. **Quarter features (#20).** At the advance GDP time the quarter's 3rd trade month is not yet out. BOPGSTB quarter mean = mean of the quarter's months known at the cut, at least 2 required (else MISSING); RSAFS, CPIAUCSL, IR, AWHI, CES0500000003 quarter means need all 3 months (else MISSING). Δ BUSINV = the last known month inside the quarter minus the last month of the previous quarter.
4. **DTS line rule (#14), fixed now.** Source `v1/accounting/dts/deposits_withdrawals_operating_cash`, field `transaction_today_amt` ($ millions), every record date in the reference month. Kept: rows with a non-null `transaction_catg` whose `account_type` is the Federal Reserve Account or the TGA (2013-2022 and 2022 → layouts). Dropped: any `transaction_catg` matching `Public Debt Cash`, `Sub-Total`, `Total`, `Transfers to`, `Transfers from`, `Change in Balance of Uncollected`, and every row whose `account_type` contains `Short-Term Cash Investments`, `Tax and Loan` or `Total`. Feature = Σ deposits − Σ withdrawals. The month counts only when its last record date ≥ the 25th and that date + 2 days ≤ the release's New York date; else MISSING. own_12 = the own print with `t` 350-380 days before the release.
5. **FF coverage.** `ff_history.jsonl` ends 2026-10-16 (`history.json` holds times only, no values). Instances after that are not in this run.
6. **Raw API responses** are cached under `data/research/macro_nowcast/inputs/raw/` (gitignored) so the run is repeatable offline; `inputs/rows/` is gitignored and its sha256 goes in `inputs/MANIFEST_inputs.json` (committed).
