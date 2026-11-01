# SOURCE MAP v1: where every piece of the big releases comes from, when, and how we collect it (DRAFT for Ashraf's approval, 2026-11-01)

**Ashraf (2026-11-01):** "each part has a tree a map tree how to collect the information and data so you can make statistics … these news they do not come from zero … oil inventory of USA, Europe, China … collected on daily basis … you need to have a plan first an approved map where each part the news coming from how and when you can collect the data … then do the math for each part."

**What this file is:** the map ONLY. No forecast and no score is in it. The math for each part is written after Ashraf approves the map.
**First four trees:** CPI, NFP, Advance GDP, Core PCE, plus the world layer. The other 81 numbered releases + the Fed get the same tree format next.

**Proof behind every status (measured today, not assumed):**
- `data/research/macro_nowcast/inputs/2026-11-01_source_map_fred_check.json`: 73 FRED / ALFRED series checked (`scripts/research/macro_nowcast/verify_source_map.mjs`); 70 exist, 3 do not.
- `data/research/macro_nowcast/inputs/2026-11-01_source_map_sites_check.txt`: 22 other sites probed (`probe_source_sites.mjs`). A 200 means "reachable", NOT "has dated history".
- Calendar leaves: `data/calendar/ff_history.jsonl` (Forex Factory, USD only, 2013-07 → 2026-10-16), each print with its release time.

## 0. Status codes for every leaf

| code | meaning | what we can do |
|---|---|---|
| **DATED** | history where every value has the date it first became known (ALFRED vintages, or FF release times) | test on 13 years NOW |
| **HIST** | history exists, but only today's (revised) values, no first-print dates | test only with a conservative "known after" lag, labelled as approximate; record daily from now so it becomes DATED going forward |
| **FWD** | no usable history; can only be recorded from today | collect daily; test when ≥ 40 releases are recorded |
| **KEY** | free, but needs a free registration key (EIA, BEA, Census, BLS) | Ashraf registers (I cannot create accounts); nothing paid |
| **PAID** | only in a paid product | listed with the product, never bought |
| **BLOCKED** | unreachable from this PC today (403 / timeout) | alternative route or dropped |
| **TO VERIFY** | named in the agency method, not yet checked | checked before the math step; never used unchecked |

"First known" in the tables = the first ALFRED vintage date we hold, i.e. the date the testable history starts.

---

## 1. CPI tree (BLS, monthly, 08:30 New York, about the 10th-15th)

**How BLS builds it:** about 200 item indexes × relative-importance weights (BLS table, updated every December). Weights: BLS relative-importance page, reachable (200), to be fetched per year (**TO VERIFY** the file format). The same weights give CPI headline and core.

| L1 component | its own index (lagged print) | leaves = the data that comes out BEFORE CPI | status |
|---|---|---|---|
| **Energy: motor fuel** | CPIENGSL (DATED 2013-07) | US retail gasoline weekly, EIA via FRED GASREGW (Mondays) | DATED 2013-07 |
| | | NY Harbor wholesale gasoline daily, DGASNYH | DATED 2013-07 |
| | | WTI and Brent daily, DCOILWTICO / DCOILBRENTEU (+ our Polygon WTI 1m, 2024-10 →) | DATED 2013-07 |
| | | EIA weekly gasoline stocks (Wednesday report) | HIST (EIA xls reachable); FF "Crude Oil Inventories" 692 prints DATED |
| | | AAA daily pump price | **TO VERIFY** (no source checked) |
| **Energy: electricity + utility gas** | inside CPIENGSL | Henry Hub natural gas daily, DHHNGSP | DATED 2014-12 |
| | | EIA electricity monthly prices | KEY (EIA API: "API_KEY_MISSING") |
| **Food** | CPIUFDSL, food at home CUSR0000SAF11, food away CUSR0000SEFV (all DATED 2013-07) | wages in restaurants (food away tracks wages): CES0500000003 | DATED 2013-07 |
| | | PPI food, FAO food price index, USDA egg / beef prices | **TO VERIFY** |
| **Core goods** | CUSR0000SACL1E (DATED) | used cars: Manheim used-vehicle value index (mid-month + final, before CPI) | site reachable; history with dates **TO VERIFY** |
| | | new vehicles CUSR0000SETA01, used cars CUSR0000SETA02 (lags) | DATED 2013-07 |
| | | apparel CPIAPPSL (lag) + import prices IR (out ~ same week) | DATED 2013-07 |
| | | tariff news | Polygon news 2020-03 → (DATED by publish time) |
| **Shelter** (the biggest part) | CUSR0000SAH1, rent CUSR0000SEHA, OER CUSR0000SEHC (DATED 2013-07) | Zillow ZORI monthly rents (CSV, from 2015-01) | HIST (no first-print dates) |
| | | Apartment List rents | BLOCKED (403) |
| | | BLS new-tenant rent index (quarterly, research series) | **TO VERIFY** |
| **Medical care** | CPIMEDSL (DATED 2013-07) | PPI health care, e.g. outpatient WPU5111 (PPI often out before CPI) | DATED 2015-03 |
| **Motor vehicle insurance** | BLS series CUSR0000SETE: NOT on FRED; on the BLS API (200) | PPI property & casualty insurers PCU524126524126 | DATED 2015-04 |
| **Airfares** | CUSR0000SETG01 (DATED 2013-09) | jet fuel daily DJFUELUSGULF; PPI airline passenger WPU3022 | DATED 2013-07 / 2015-03 |

**Competitors (to beat, never inputs):** FF consensus (DATED), Cleveland Fed inflation nowcast (daily; site reachable; dated history **TO VERIFY**), market breakevens T5YIE / T10YIE (DATED 2014-01).

---

## 2. NFP tree (BLS establishment survey, first Friday 08:30 New York)

**How BLS builds it:** about 120,000 businesses and agencies report payrolls for the pay period that includes the 12th; the total = private sectors + government, plus a birth-death model for new / closed firms.

| L1 component | its own series (lag) | leaves before NFP | status |
|---|---|---|---|
| **Private total** | USPRIV (DATED 2013-07) | ADP monthly private payrolls (2 days before) | FF 157 prints DATED 2013-07 |
| | | ADP weekly pulse | FF 50 prints; FRED ADPWNUSNERSA DATED only from 2022-08 |
| | | initial claims in the survey week, ICSA / IC4WSA | DATED 2013-07 |
| | | continuing claims in the survey week, CCSA | DATED 2013-07 |
| | | Indeed job postings daily, IHLIDXUS | data from 2020-02, DATED from 2023-02 |
| | | job openings JTSJOL (one month older) | DATED 2013-07 |
| | | Challenger job cuts | FF 159 prints DATED (Challenger site 404 → FF is the source) |
| | | ISM manufacturing / services headline | FF 159 prints DATED; **employment sub-indexes TO VERIFY** (may be PAID) |
| | | NFIB small business (hiring plans inside) | FF headline DATED; sub-index **TO VERIFY** |
| | | Empire / Philly Fed (employment sub-index on Fed sites) | FF headline DATED; sub-index **TO VERIFY** |
| **Construction / manufacturing** | USCONS, MANEMP (DATED 2013-07) | housing starts, permits (FF DATED); manufacturing hours AWHMAN | DATED |
| **Government** | USGOVT (DATED 2013-07) | federal workforce changes (OPM FedScope), state / local budgets | **TO VERIFY** |
| **Special effects** | — | strikes (BLS strike report), hurricanes / weather in the survey week | **TO VERIFY** / news |
| **Hours and pay** (same release) | AWHAETP, CES0500000003 (DATED 2013-07) | — | — |

**Competitor:** FF consensus. No public nowcast for NFP was found.

---

## 3. Advance GDP tree (BEA, quarterly, about 4 weeks after the quarter)

**How BEA builds it:** GDP = consumption + investment + inventories + net exports + government, each from monthly source data (BEA publishes the key source data and its own assumptions for missing months).

| L1 component | leaves before Advance GDP | status |
|---|---|---|
| **Consumption** (largest part) | PCE monthly (2 of 3 months out), retail sales RSAFS (3 months out), vehicle sales TOTALSA | DATED 2013-07/08 |
| | services: Census Quarterly Services Survey | **TO VERIFY** (Census API needs a KEY) |
| **Business investment** | core capital-goods shipments ANXAVS and orders NEWORDER | DATED 2013-07 |
| | non-residential construction (TTLCONS) | DATED 2013-07 |
| **Housing** | residential construction PRRESCONS, housing starts HOUST | DATED 2013-07 |
| **Inventories** | business inventories BUSINV; advance inventories (Census advance indicators) | DATED 2013-07; advance part **TO VERIFY** |
| **Net exports** | advance goods trade balance AITGCBS (FRED DATED from 2017-11; FF "Goods Trade Balance" 132 prints DATED from 2015-07); full trade BOPGSTB; import prices IR | DATED |
| **Government** | federal outlays MTSO133FMS (DATED 2015-09); Treasury daily statement (all 155 months cached and filled today); government employment USGOVT | DATED |
| **BEA source data / assumptions** | BEA API | KEY (BEA API answered with an empty body without a key) |

**Competitors:** GDPNow (DATED 2016-05, 821 vintages), St. Louis Fed news index STLENI (DATED 2017-02), NY Fed staff nowcast (site reachable; dated history **TO VERIFY**).

---

## 4. Core PCE tree (BEA, monthly, about 2 weeks after CPI)

**How BEA builds it:** mostly CPI pieces, but with different weights (shelter counts about half as much as in CPI). Some parts come from PPI instead of CPI (health care, airfares, financial services). So core PCE is "translated" from CPI + PPI, which are both out before it.

| L1 component | leaves (all out before PCE) | status |
|---|---|---|
| CPI pieces with PCE weights | core CPI and its parts CPILFESL, shelter, used cars, apparel (section 1) | DATED 2013-07 |
| **Health care** (PCE uses PPI, not CPI) | PPI health care: outpatient WPU5111 (more items **TO VERIFY**: physician, hospital inpatient) | DATED 2015-03 |
| **Airfares** (PPI in PCE) | PPI airline passenger services WPU3022 | DATED 2015-03 |
| **Financial services / portfolio fees** | PPI portfolio management PCU5239252392 (FRED copy ENDS 2022-12 → BLS API route **TO VERIFY**); stock prices (Polygon SPY / indexes, DATED by time) | partly DATED |
| **Insurance** | PPI property & casualty PCU524126524126 | DATED 2015-04 |
| **PCE weights** | BEA PCE shares by item | KEY (BEA API) |

**Competitors:** FF consensus; Cleveland Fed PCE nowcast (**TO VERIFY** history).

---

## 5. World layer (feeds the US releases and moves gold directly)

| area | sources | when | status |
|---|---|---|---|
| **US oil** | EIA weekly petroleum report: crude / gasoline / distillate stocks, production (FF "Crude Oil Inventories" 692 prints) | Wednesday 10:30 New York | FF DATED 2013-07; full EIA detail KEY (xls reachable = HIST) |
| | natural gas storage (FF 692 prints) | Thursday 10:30 | DATED 2013-07 |
| | WTI, Brent daily; WTI 1m (Polygon) | every day | DATED 2013-07 / 1m from 2024-10 |
| | Baker Hughes rig count | Friday | site reachable; history **TO VERIFY** |
| | OPEC monthly report | monthly | BLOCKED (403) |
| | CFTC positioning (crude AND gold) | Friday for Tuesday | reachable (200); history files **TO VERIFY** |
| **Europe** | euro-area inflation HICP: Eurostat API (flash at month end) and FRED CP0000EZ19M086NEST | monthly | API reachable; FRED DATED 2015-02 |
| | ECB rates: ECB data API + FRED ECBDFR | each meeting | reachable; FRED DATED 2021-03 |
| | EUR, GBP, JPY, CHF, CAD, SEK (in our DXY rebuild) | every minute | DATED (Polygon) |
| **China** | NBS official statistics site | monthly | BLOCKED (timeout from this PC) |
| | China PMI / trade / CPI as Forex Factory CNY events | monthly | our FF backfill keeps USD only → re-run for CNY / EUR **TO VERIFY** |
| | yuan rate DEXCHUS | daily | DATED 2014-03 |
| **Geopolitics / uncertainty** | Geopolitical Risk index (Caldara-Iacoviello), daily | daily | reachable (xls); HIST |
| | Economic Policy Uncertainty, daily USEPUINDXD | daily | DATED 2014-03 |
| | Polygon news headlines | live | DATED 2020-03 → |
| | GDELT world events | live | BLOCKED (memory: backfill never ran) |
| | VIX VIXCLS | daily | DATED 2013-07 |
| **Supply chains** | NY Fed supply-chain pressure index | monthly | reachable (xlsx); HIST |
| **Dollar, rates, inflation expectations** | broad dollar DTWEXBGS, real 10y DFII10, breakevens T5YIE / T10YIE, our Treasury yields | daily | DATED |

---

## 5b. Geopolitics layer: measuring "peace or war" with numbers (Ashraf 2026-11-01, second message)

**Ashraf's words (short):** "oil is the major affecting the economy … we need to measure the peace percentages through the talks that we hear from the news … US is talking about peace meanwhile they are sending troops … is it only a tool to threat Iran … Egypt sending troops to Saudi … Jordan hit Syria … Saudi concentrating on the north side with Iraq … is that the plan … read it and give it a number … see everywhere in the Earth."

**The idea, as I understand it:** WORDS (talks, peace offers, mediation, e.g. Pakistan between Iran and the US) and ACTIONS (troops, ships, strikes, border moves, sanctions) often point in different directions. Measuring both, per country, every day, gives a number for "heading to peace" vs "heading to war". Through oil, that number drives inflation, the Fed, DXY and gold.

**Zero guessing:** I do NOT state that any of the moves in the message are true (Egypt troops to the Yemen border, Jordan striking Syria, a joint US-Israel plan). Each becomes a CLAIM in the ledger below, with its sources and their times. A claim counts only after ≥ 2 independent sources confirm it; until then it is UNCONFIRMED. The "plan" reading (Saudi north, Egypt south, Jordan west = a defensive ring before a strike on Iran) is a HYPOTHESIS. It gets tested against what happens next, never assumed.

**L1. Event ledger (daily):** one row per reported event.

| field | values |
|---|---|
| time first reported | from the source |
| actor country → target country | — |
| type | TALK-PEACE, MEDIATION, THREAT, TROOP / SHIP MOVE, STRIKE, SANCTION, OIL-SUPPLY ACT |
| sources | list of sources |
| confirmation count | number of independent sources |
| region | Middle East, Europe, Russia-Ukraine, China-Taiwan, Korea, South / Southeast Asia, … |

Countries covered: US, UK, EU, Turkey, Israel, Iran, Saudi, Egypt, Jordan, Syria, Iraq, Yemen, Gulf states, Pakistan, Russia, China, North Korea, Japan, Taiwan, Singapore, Thailand, Malaysia, Australia, plus any actor that appears in the sources.

**L2. Numbers per day:**
- per country and per region: count of WORDS toward peace minus count of ACTIONS toward war (each confirmed);
- the gap between them: "talks peace, moves troops" shows up as a big gap;
- the trend over 7 and 30 days.

**L3. What the market already prices (the baseline our number must beat):**
- prediction markets on the same questions (e.g. "US-Iran deal by …", "strike on Iran by …");
- oil volatility OVXCLS and gold volatility GVZCLS;
- Brent, and Brent minus WTI;
- the published Geopolitical Risk index, whose daily data splits THREATS from ACTS (matches "talks vs troops").

**L4. Test (same rules as everything else):** does our number tell, before the market moves, (a) a jump in oil, and (b) gold's direction or size? It is tested on dated history (GDELT and Polygon news have publish times) against the L3 baseline. A number that does not beat the market's own pricing is reported as no edge.

| source | what | status (checked today) |
|---|---|---|
| GDELT document API (world news, 65 languages, by time) | events + tone, every 15 min | reachable today (200, returned an Iran article); earlier bulk backfill was rate-limited → slow polite collection |
| Polygon news (any ticker: USO, XLE, GLD …) | headlines with publish time | reachable; DATED 2020-03 → |
| UN News Middle East feed | official statements | reachable (RSS) |
| US State Department press feed | official statements | BLOCKED (403) → via GDELT / Polygon instead |
| ACLED (armed conflict events, verified, weekly) | troop moves, strikes, by country | site reachable; data needs a free KEY |
| Polymarket, Kalshi (prediction markets) | market-implied % for peace / war questions | APIs reachable; dated price history **TO VERIFY** |
| Geopolitical Risk index daily (threats vs acts) | published index | reachable; HIST |
| OVXCLS, GVZCLS | oil / gold implied volatility | DATED 2014-04 |
| Brent, WTI, our WTI 1m | oil price reaction | DATED |

**How the "%" is made (math step, after approval):** a model maps the L2 numbers to "probability of escalation within N days". It is trained only on past dated events and checked on unseen years; until then it is shown as a raw score, not as a %. **No % is shown before it is calibrated.**

---

## 5c. Big-money layer: do the largest investors' moves confirm our reading? (Ashraf 2026-11-01, third message)

**Ashraf:** "BlackRock … big whales … we need to follow their moves which confirms the analysis that we are doing in the politics economy."

**Fact check, for the record:**
- BlackRock is a public company (NYSE: BLK); its biggest owners are other funds.
- It does not own central banks. The Federal Reserve's regional banks are owned by their member commercial banks.
- That ownership story is not used anywhere in the map.

What CAN be measured is what the big holders publicly report they hold, with the delay each report has:

| source | what it shows | delay | status |
|---|---|---|---|
| SEC 13F filings (EDGAR, free) | every large manager's US stock / ETF holdings (BlackRock, Vanguard, State Street, hedge funds) | quarterly, up to 45 days late | **TO VERIFY** (EDGAR API) |
| GLD / IAU holdings (tonnes of gold), daily | gold ETF buying / selling | 1 day | **TO VERIFY** (GLD 1m prices are already in our data) |
| CFTC COT, gold + crude: managed money vs producers | speculators' positioning | Friday for Tuesday | reachable (section 5) |
| Central-bank gold purchases (IMF / World Gold Council) | official-sector buying | 1-2 months | **TO VERIFY** (free source or KEY) |
| BlackRock Investment Institute weekly commentary | their stated views (words, not trades) | weekly | **TO VERIFY**; goes into the L1 ledger as a WORDS row |
| Real CME volume / footprint for GC (Databento, 2024-10 → 2026-10-08) | big-lot buying / selling in gold futures | live / 1 minute | DATED (already measured: memory says wall / order-flow studies gave no money edge, so this is CONTEXT) |

**Test:** a "confirmation" counts only if, on dated history, our geopolitics / macro number + the big-money move together beat our number alone (same rules as L4). The delays above mean 13F can only confirm months later, never in real time. That is stated, not hidden.

---

## 5d. GAP CHECK (Ashraf 2026-11-01: "please check if we are missing anything else … make sure nothing is missing to reach our target")

The question asked here: what moves gold / DXY that sections 1-5c did not cover? Every row was checked today. Proof: `inputs/2026-11-01_source_map_fred_check.json` and `scripts/research/macro_nowcast/probe_gap_sites.mjs`.

| missing layer | why it matters for gold | sources | status (checked 2026-11-01) |
|---|---|---|---|
| **Dollar / Treasury demand** (Ashraf: "are people selling bonds or buying bonds") | weak foreign demand for Treasuries = loss of trust in the dollar = gold bid | Treasury auction results (bid-to-cover, indirect = foreign bidders), fiscaldata API | reachable; per-auction, dated → DATED |
| | | Fed custody holdings for foreign officials, weekly, WMTSECL1 | DATED 2013-07 |
| | | 10y term premium THREEFYTP10 (FRED) + NY Fed ACM file | FRED DATED 2016-05; ACM xls reachable (HIST) |
| | | TIC foreign holdings (monthly; FF has the release) | FF DATED; detail **TO VERIFY** |
| **Fed liquidity** | balance sheet − Treasury cash − reverse repo = "net liquidity"; drains hurt risk assets and can force gold selling | Fed total assets WALCL | DATED 2013-07 |
| | | Treasury General Account WTREGEN | re-checked: DATED 2013-07 |
| | | reverse repo RRPONTSYD | re-checked: DATED 2016-03 |
| **Rates and the Fed path** | the real driver of gold vs the dollar | 2y DGS2 | DATED 2013-07 |
| | | 10y DGS10 | re-checked: DATED 2013-07 |
| | | SOFR | DATED 2019-03 |
| | | fed-funds futures path | NOT FOUND free (Polygon futures search returned none for ZQ) → T1-F stays "description only" unless a free dated source is found |
| **Credit stress** | a liquidity crisis makes gold fall first (the 09-25 scenario C) | high-yield spread BAMLH0A0HYM2 | re-checked: FRED now holds only 2023-10 → (ICE licence) = 3 years, not 13 |
| **Gold flows / physical demand** | the "whales" Ashraf wants to see | COT history zip files (CFTC) | reachable → DATED (weekly, Friday) |
| | | GLD holdings history | the CSV address now returns a PDF → **TO VERIFY** the new address |
| | | World Gold Council (central-bank buying, ETF flows) | site reachable; data needs a free account → **KEY** |
| | | India / China premiums | PAID or news only |
| **Fed words** | the speeches move the rate path | Fed speeches RSS | reachable → collected daily (DATED from today) |
| **Prediction markets** | the market's own % on war / peace / Fed | Polymarket, Kalshi | reachable → collected daily (DATED from today) |
| **Social media** | crowd sentiment | Reddit | BLOCKED (403) |
| | | X / Twitter API | PAID |
| | | news tone instead | GDELT (collected daily) |
| **Other metals and risk** | silver, copper, BTC as a rival store of value, equities | Polygon (silver already in the app; copper / BTC / SPX **TO VERIFY** on our plan) | partly DATED |
| **Calendar effects** | options expiry, futures first-notice / roll, month / quarter end, Chinese New Year, Indian festivals | exchange calendars (public) | **TO VERIFY** |

**Rule kept (Ashraf: "we need a real results not a guess"):**
- a leaf counts only after a real fetch;
- "FRED busy" is NOT "exists": all 4 busy rows were re-checked the same day (results above);
- nothing is filled in.

## 6. Daily collector (design only; it would be a new background job → needs Ashraf's OK before it runs)

- **One job, once a day** (proposed 23:00 UTC, after US and Europe close), research only, separate from the trading app: `scripts/research/macro_nowcast/collect_daily.mjs`.
- **Each source gets one folder:** `data/research/macro_nowcast/daily/<source>/<YYYY-MM-DD>.json`. Every file records the wall-clock time it was fetched. That fetch time is the value's `known_t`, so HIST and FWD sources become DATED from today on.
- **DATED sources need no daily copy.** ALFRED rebuilds any past day exactly; they are fetched only at prediction time.
- **The daily list:** Zillow, Manheim, Cleveland nowcast, NY Fed nowcast, GPR, supply-chain index, Eurostat flash, ECB, Baker Hughes, CFTC, EIA detail, BLS-API-only items (motor insurance, PPI portfolio management).
- **Health:** a failed fetch is logged and shown in the research folder only, not on Telegram (Ashraf's Q3 rule).

## 7. Decisions needed from Ashraf

1. **Approve this map format.** I then build the same tree for the other 81 releases + the Fed.
2. **Free keys** (all free, registration by Ashraf): EIA, BEA, Census, BLS, ACLED. They unlock EIA detail, the BEA weights / source data, the Census services survey and higher BLS API limits.
3. **Daily collector:** OK to build it and start it (a new scheduled job).
4. **What happens to the step-2 thin model** (spec 2026-11-01, inputs already extracted and filled): keep it as the BASELINE the full trees must beat, or drop it.

## 8. Honest limits, said now

- Many detailed leaves (rents, used cars, nowcasts, GPR) have **no first-print dates**. They can be tested on history only as approximations, labelled so. Clean tests need forward recording, which takes months: about 40 monthly releases ≈ 3+ years for a full forward test.
- **Weights are the agency's own** (BLS, BEA). Where a weight file is not verified, the math step learns weights from history and says so.
- **No paid source is used.** Where a branch is only PAID, the tree says so and that branch stays empty.
