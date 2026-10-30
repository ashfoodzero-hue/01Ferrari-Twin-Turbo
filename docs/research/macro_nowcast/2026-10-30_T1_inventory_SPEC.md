# T1 SUB-SPEC, step 1: inventory + labels of all 85 numbered releases. Pre-registered 2026-10-30 BEFORE any input data is fetched

**Parent:** `docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md` v1.1, T1 + Addendum A5 ("news / macros must cover everything", Ashraf 10-30).

**This step only LABELS the releases.** No prediction is made, and no actual is opened beyond the list of release names and counts already measured (`ff_history.jsonl`, 85 names with actual / forecast, 2013-07 → 2026-10-16).

## 1. The labels (rule fixed now, applied mechanically by `scripts/research/macro_nowcast/t1_inventory.mjs`)

**(a) BUILDABLE.** Both conditions hold:
1. **Inputs exist.** Data published BEFORE the release covers ≥ 50 % of the release's weight, through one of:
   - **(i) identity:** components by the agency's own aggregation (e.g. core PCE from CPI / PPI pieces; factory orders = durable goods + non-durables; business inventories = manufacturing + wholesale + retail);
   - **(ii) earlier print:** an earlier print of the same number (advance → prelim → final GDP, flash → final PMI, prelim → revised UoM);
   - **(iii) same concept, other source:** e.g. ADP for NFP; continuing claims for the insured-unemployment part; the Daily Treasury Statement for the federal budget; oil + dollar for import prices.
2. **Inputs verified.** Every listed input is verified to exist with its publication dates for ≥ 40 of the release's history.
   - FRED / ALFRED: vintage dates since 2013-07 ≥ 0.8 × the number of the release's rows.
   - Market prices: a daily series, with `known_t` = date + 1 day.
   - Earlier prints in the FF calendar: `known_t` = their release time.

**(b) PUBLIC NOWCAST ONLY.** Not (a), but a public bottom-up nowcast with a dated history exists. It is scored as a competitor; we build no model.

**(c) NOT BUILDABLE.** Neither. This covers survey indexes with no earlier hard input (ISM, regional Fed, UoM prelim, NFIB, CB …), weekly inventories with no free earlier source, auctions, and releases with fewer than 40 rows. These are **reaction-only** in T2, and said so.

**(F) FED.** The Federal Funds Rate decision goes to T1-F: surprise vs the futures-implied path.

**Verification failures.** An input that fails verification (wrong ID, no vintages, too short) is recorded as MISSING with the reason. The release then drops to the next label. **No input is assumed.**

## 2. Candidate inputs per release (the checker verifies each; anything not listed has no candidate → (c))

FRED IDs as published by FRED. "FF:<name>" = the actual of an EARLIER release in our calendar, with `known_t` = that release's time.

| release (FF name) | route | inputs to verify |
|---|---|---|
| CPI m/m, CPI y/y, Core CPI m/m, Core CPI y/y | (i) + (iii): BLS relative-importance weights × component proxies | GASREGW (weekly gasoline), PPIFIS (PPI final demand, usually out before CPI), DCOILWTICO; CPI component histories for the weights: CPIAUCSL, CPILFESL, CPIENGSL, CPIUFDSL, CUSR0000SAH1 (shelter), CUSR0000SETA02 (used cars) |
| Core PCE Price Index m/m | (i) CPI / PPI → PCE mapping | CPILFESL, PPIFIS, PCEPILFE (own history for weights) |
| Personal Income m/m | (i) wages ≈ payroll × hours × earnings | PAYEMS, AWHI, CES0500000003, PI |
| Personal Spending m/m | (i) retail sales + autos + services prices | RSAFS, TOTALSA, PCE |
| Advance GDP q/q | (i) monthly source data | RSAFS, PCE, BOPGSTB, BUSINV, TTLCONS, GDPC1; competitor (b-style): GDPNOW |
| Advance GDP Price Index q/q | (i) CPI / PPI / import prices × GDP shares | CPIAUCSL, PPIFIS, IR, GDPCTPI |
| Prelim GDP q/q, Final GDP q/q | (ii) | FF:Advance GDP q/q, FF:Prelim GDP q/q + the monthly inputs above |
| Prelim GDP Price Index q/q, Final GDP Price Index q/q | (ii) | FF:Advance GDP Price Index q/q, FF:Prelim GDP Price Index q/q |
| Non-Farm Employment Change | (iii) | FF:ADP Non-Farm Employment Change (ADPMNUSNERSA), ICSA, CCSA |
| Unemployment Rate | (iii) | CCSA, ICSA, UNRATE (own history) |
| Unemployment Claims | (ii)/(iii) | ICSA (own weekly history; the seasonal-factor file is not verified → only the history) |
| Industrial Production m/m | (i) Fed uses production-worker hours (out with NFP, before IP) | AWHMAN (manufacturing weekly hours), MANEMP, INDPRO |
| Capacity Utilization Rate | (i) from IP + capacity | INDPRO, TCU |
| Factory Orders m/m | (i) | FF:Durable Goods Orders m/m (DGORDER), AMTMNO |
| Business Inventories m/m | (i) | FF:Prelim Wholesale Inventories m/m, RETAILIMSA, AMTMTI, BUSINV |
| Final Wholesale Inventories m/m | (ii) | FF:Prelim Wholesale Inventories m/m (2016-08 →) |
| Trade Balance | (ii)/(i) goods part from the advance goods report | FF:Goods Trade Balance (2015-07 →), BOPGSTB |
| Current Account | (i) quarterly sum of the monthly trade balance | BOPGSTB, IEABC |
| Final Manufacturing PMI | (ii) | FF:Flash Manufacturing PMI |
| Final Services PMI | (ii) | FF:Flash Services PMI |
| Revised UoM Consumer Sentiment | (ii) | FF:Prelim UoM Consumer Sentiment |
| Revised UoM Inflation Expectations | (ii) | FF:Prelim UoM Inflation Expectations |
| Prelim Nonfarm Productivity q/q, Prelim Unit Labor Costs q/q | (i) output / hours, compensation / productivity | FF:Advance GDP q/q, OUTNFB, HOANBS, OPHNFB, ULCNFB |
| Revised Nonfarm Productivity q/q, Revised Unit Labor Costs q/q | (ii) | FF:Prelim Nonfarm Productivity q/q, FF:Prelim Unit Labor Costs q/q, FF:Prelim GDP q/q |
| Import Prices m/m | (iii) oil + dollar | DCOILWTICO, DTWEXBGS, IR |
| Federal Budget Balance | (iii) Daily Treasury Statement (fiscaldata.treasury.gov, free API) | DTS operating cash / deposits & withdrawals (verified by a fetch), MTSDS133FMS |
| Core Retail Sales m/m, Retail Sales m/m | (iii) autos + gasoline only | TOTALSA, GASREGW. Expected coverage < 50 % of weight (autos ≈ 20 %, gasoline ≈ 8-9 %; core excludes autos) → (c) by rule unless a free card-spending series with dated history is found (none known, not assumed) |
| Federal Funds Rate | F | T1-F |

**Every other numbered release → (c):**
- crude / natural-gas inventories;
- all PMIs (flash), ISM;
- Empire / Philly / Richmond / Chicago;
- UoM prelim, CB confidence, NFIB, RCM/TIPP, NAHB;
- housing (starts, permits, new / existing / pending sales, HPI, Case-Shiller), construction spending;
- durable / core durable goods, PPI, JOLTS, Challenger, ADP (monthly, as a release itself), ECI, AHE;
- consumer credit, TIC, auctions, mortgage delinquencies, CB leading index;
- vehicle sales, goods trade balance, prelim wholesale inventories (they ARE the earlier prints);
- releases with fewer than 40 rows: ADP weekly, LMCI, Cleveland inflation expectations, benchmark revision, Fed Chair vote.

## 3. What gets committed (before any prediction)

- `data/research/macro_nowcast/inputs/2026-10-30_T1_inventory.json`: per release:
  - n rows, first / last, impact counts;
  - route, inputs with their verification result (vintage count since 2013-07, first vintage, MISSING reason);
  - weight-coverage note;
  - FINAL label.
- A MASTER §7 entry.
- The predictor for the (a) releases is a later step (T1 step 2), in its own sub-spec, under the blind rule:
  - an extractor writes `inputs/` files with `known_t`, and the target's own actual is never written there;
  - predictions are committed before the scorer runs.

## 4. Honest limits, said up front

- **Weight coverage is a judgement per route.** It is written down here, before any number, and not tuned later.
- **FF "forecast" = the consensus as published by Forex Factory at release time.** It is the baseline, never an input.
- **GDPNow and Cleveland nowcast histories are competitors.** Their dated archives are verified in step 2.

## ADDENDUM A — 2026-10-30, after the first inventory run, before any prediction or score (no actual value was read)
- **NFP input list: duplicate removed.** The first run labelled NFP (c) only because FRED's ADP copy `ADPMNUSNERSA` has 50 vintages (first
  2022-08-31). The SAME number is already an input as `FF:ADP Non-Farm Employment Change` (the ADP first print with its release time, 157
  rows from 2013-07-31, verified). Two sources of one number; the duplicate is dropped. No other input or rule changes.
- Facts from the run that limit later steps (recorded now): PPIFIS vintages start 2014-02-19, MTSDS133FMS 2015-09-11, GDPNOW 2016-05-17,
  FF:Goods Trade Balance 2015-07-30, FF:Prelim Wholesale Inventories 2016-08-26, FF:Flash Services PMI 2013-11-25 → releases before those
  dates get MISSING for that input in step 2 (never filled). "Unemployment Claims" (a) rests on its own weekly history only (the weakest route).
