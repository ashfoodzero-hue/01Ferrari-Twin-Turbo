# Data contract: what every dataset is, what it is NOT, and its coverage

Audited 2026-10-17. Ashraf: "we need all data base 100% correct … based on real information".

Every study reads data through the modules named here. A field not listed here must not be used.

## 1. Gold price: spot XAUUSD 1m (Polygon)

- **File:** `data/history/XAUUSD/1m.jsonl`.
- **Read with:** `loadBars('XAUUSD','1m')`, then `nyCandles.cleanForTv`.
- **Coverage:** continuous from 2013-07-14 (4.58 M minutes). The 2009-2011 data is patchy and excluded.
- **Holes (Polygon has NO data, re-queried 2026-10-17; not even daily bars):**
  - 2019-09-04 → 2019-10-04;
  - 2020-10-14 → 2020-11-13.

  Use `dataHoles.findHoles` / `markIncomplete`. No candle or swing may span a hole.
- **Holidays:** single missing weekdays (Christmas, New Year, Good Friday) are holidays, not holes.
- **`v` is NOT volume.** It is Polygon's quote/tick count, and Polygon's own spot-gold quote feed changed density about 100×. Quotes counted 14:00-15:00 UTC:
  - 18-35 k/h in 2014-19;
  - 150-200/h in 2021-25;
  - 12.7 k/h in 2026.

  `cleanForTv` strips it. **Spot gold has no exchange volume anywhere.**
- **Candles:** `nyCandles.buildCandles` builds TradingView-exact candles on 16 timeframes (1m → 1M, including 9H/2D/3D).
  - Anchors are measured from Ashraf's TradingView: `tv_anchor_reference.json`.
  - Proof: `smoke_ny_candles` 17/17.
  - Polygon vs OANDA differ by a median of $0.23-0.48 on highs and lows (different feeds).
- **Spot bid/ask:**
  - live per minute from 2026-10-08: `data/history/XAUUSD/quotes_1m.jsonl` (ask OHLC, spread);
  - historical spreads: the measured `spread_table.json` (`spreadModel`).

  Polygon `/v3/quotes` is on the plan back to 2014, but the feed is thin in 2021-25 (see above).

## 2. Real exchange volume: last 2 years only

Ashraf, 2026-10-17: no purchase for older years. 2013-2024 is price-only.

| Dataset | File | Coverage | What is real |
|---|---|---|---|
| CME gold futures 1m (Polygon) | `data/history/GOLD_FUT/1m.jsonl` | 2024-10-09 → now | Real exchange volume. No buyer/seller split. The front month is the contract with the most volume in the PREVIOUS session (causal), from G J M Q Z. |
| CME gold futures footprints (Databento tbbo) | `data/orderflow/gc_1m_footprints.jsonl`, `gc_5m_footprints.jsonl`, raw `gc_tbbo/` | 2024-10-01 → 2026-10-08 | Every trade with the EXCHANGE aggressor side (buyer lifted the ask / seller hit the bid), plus the best bid/ask before it. TEST-ONLY research data (R0 exception). |
| GLD ETF 1m (Polygon) | `data/history/GLD/1m.jsonl` | 2024-10-01 → now | Real ETF share volume, US hours plus extended. |

**Futures audit 2026-10-17** (Polygon vs Databento, minute by minute):
- **When both feeds hold the same contract, volume is equal on 100.00 % of minutes.**
- Closes differ by a median of one tick ($0.10): trade order within the same millisecond.
- Differences remain only on the 19 roll days, where Databento rolls one day earlier.
- **Fixed:** the old import put the thin October contract (GCV5/GCV6) in the series for 2 days each July, because December was outside its 4-month window. It also chose the contract from the same session's volume (a small look-ahead).

Futures ≠ spot: match futures to spot by TIME only, never by price (basis and rolls). The `footprintTf.footprintCandles` roll-up marks `roll: true` on candles that span a contract change.

## 3. Calendar, macro and news (as known at the time): `src/master/marketContext.js`

| Dataset | File | Coverage | Becomes known |
|---|---|---|---|
| Official release times (Fed, BLS, Census) | `data/calendar/history.json` | 2013 → 2027 (FOMC, CPI, NFP, PPI, JOLTS, Retail Sales, Fed speeches) | At its time (the time authority) |
| Forex Factory USD events with actual / forecast / previous / impact | `data/calendar/ff_history.jsonl` (backfill `scripts/backfill_ff_history.mjs`), live `upcoming.json` | 2013-07 → now | forecast/previous before the event; actual from its release time |
| Treasury yields, daily (1m … 30y) | `data/macro/treasury-yields.json` (Polygon /fed/v1) | 1962 → now | 2 sessions after the date (conservative) |
| CPI / core CPI level, monthly | `data/macro/inflation.json` | 1947 → now | at the first official CPI release after the month |
| Unemployment, participation, earnings | `data/macro/labor-market.json` | 1948 → now | at the first official NFP release after the month |
| Inflation expectations (model, 1/5/10/30 y) | `data/macro/inflation-expectations.json` | 1982 → now | from the 1st of the next month |
| Gold-related news headlines (GLD IAU GDX NEM SLV) | `data/news/polygon_news.jsonl` | **2020-03 → now only** (Polygon's archive has nothing earlier) | at `published_utc` |

**Gaps:**
- **No news before 2020-03.** The GDELT backfill is blocked on this machine (see memory).
- Consensus forecasts come only from Forex Factory (Polygon has none).
- Only USD events are kept (Ashraf's calendar rule).

## 4. Other context

| Data | Coverage |
|---|---|
| Silver XAGUSD 1m | 2013-07 → now; holes 2019-09 and 2020-11, like gold |
| DXY | Rebuilt from 6 Polygon pairs (`dxy.js`), 2009-09 → now; four pairs have holes in 2019-09 and 2020-10/11 |
| WTI 1m | 2024-10 → now (Ferrari Matrix R0 exception, unchanged) |

## 5. Corrections applied on 2026-10-17

- **GOLD_FUT patched to the CME exchange feed** where it exists (`scripts/fix_gold_fut_with_cme.mjs`; originals in `data/history/GOLD_FUT/cme_corrections.jsonl`).
  - On same-contract minutes, Polygon had LOWER volume on 30 of 682,457 minutes (missed trades). The close was one tick off on about 38.9 k minutes (trade order inside a millisecond).
  - After the patch, volume equals CME on 100 % (682,457 / 682,457). **Re-run the patch after every `import_futures_1m.mjs GOLD_FUT`.**
- **GOLD_FUT roll rule fixed**: no October contract; the front month comes from the previous session's volume. 2024-10-09..16 were restored from the previous import (same contract GCZ4; Polygon's 2-year window rolled forward).
- **Forex Factory times**: an FF event belonging to an official release takes the official minute (`t_ff` keeps FF's). 898 / 898 official CPI, NFP, PPI, JOLTS, Retail Sales and FOMC releases (2013-07 → now) have their FF event at the exact minute with an actual.
- **Spot gaps:** Good Friday + Easter Monday 2025 (2025-04-18 → 04-21) are missing in Polygon spot. They are flagged as a hole (conservative).

## 6. ✅ Features that read spot `v` as volume: FIXED 2026-10-17 (volume DROPPED; Ashraf: "Yes, remove it everywhere")

**FIXED 2026-10-17** (MASTER_DOCUMENT §7 (ci)). Every live module now ignores spot `v`, exactly as the audit's DROP mode (`v := 1`):
- `wallDefense.js`: every minute weighs 1 (walls = time-at-price, delta = close position); the strong cut-off p66 is re-derived in the re-run.
- `marketState.js`: `volMult = 0` by default (a close beyond range ± 0.3 ATR confirms); no "volume" words in the live messages; the chart shows "volume needed: none".
- `fvg.js`: STRONG = big + body + 1h/4h trend (`s2` is kept as a record only).
- `orderBlock.js`: STRONG = displacement ≥ 2.5 ATR (`relVol` is kept as a record only).
- `volumeProfile.js` stays out of use; `levelRadar.js` needs no action (the `v` sum is dead code); `src/core/structure/volumeProfile.js` has no consumer.

**Proof:** `scripts/vol_audit/verify_drop_live.mjs` shows 5/5 live-read artifacts = the audit DROP artifacts. fvg_strong skips only its record-only S2 row and random-control values: the study re-run with s2 forced equals the audit file exactly. `order_block_study.json` also equals the audit (0 diffs). Smokes are updated to the new rules.

The text below is the audit record as it was before the fix.

### 6a. The audit record (before the fix)

These take spot XAUUSD bars, so their volume component uses the tick count above. In 2021-2025 that was about 3 per minute, nearly constant, so the volume part carried no information. Their past measured results are suspect wherever the volume part mattered:
- `src/master/fvg.js` (activity filter);
- `src/master/marketState.js` (the "volume N×" confirmation in the live state messages);
- `src/master/orderBlock.js` (volume);
- `src/master/volumeProfile.js` and `src/core/structure/volumeProfile.js`;
- `src/master/wallDefense.js` (volume walls / bubbles, `barDelta`);
- `src/master/levelRadar.js`.

`src/master/goldWhale.js` uses CME futures volume, so it is not affected. Fixing these changes live behaviour: a separate task, with Ashraf's approval.

**MEASURED 2026-10-17** (`docs/VOLUME_AUDIT_RESULTS.md`, MASTER_DOCUMENT §7 (bz)); still NOT changed live:
- No published pass or fail came from the tick count; the wall bubbles stay SHOWN with no volume at all.
- `levelRadar` reads no volume (19,984 / 19,984 decisions identical).
- The live market-state gate blocked 88 % of OOS fires on the tick count.
- CME volume is 10 min delayed live.
- Proposal: drop the volume part in every module.

## 7. Our own history: what the app records every day (2026-10-17)

| Series | Recorded by | How | Folder |
|---|---|---|---|
| Spot XAUUSD, XAGUSD, EURUSD, USDJPY, GBPUSD, USDCAD, USDSEK, USDCHF (DXY = the six pairs) | the stream (`run_stream.mjs` / `tickStream.js`), always on | live ticks → closed 1m bars, each verified against Polygon's own minute bar (REST arbiter on disagreement), plus bid/ask spread per minute; daily reconciliation (`reconcile_1m.mjs`) | `data/history/<SYM>/1m.jsonl` + `quotes_1m.jsonl` |
| CME gold futures (GC), CME silver futures (SI), WTI (CL), GLD ETF | `record_futures.mjs`, run by `run_twin` every 15 min | append-only, final minutes only (futures are 10 min delayed on our plan), the contract on every bar, ONE roll rule (`src/data/futuresRule.js`) shared with the importer and the live reader | `data/history/{GOLD_FUT,SILVER_FUT,WTI,GLD}/1m.jsonl` |
| Daily audit | `audit_recording.mjs`, run by `run_twin` once a day after 21:30 UTC | every in-session hole classified against Polygon (provider outage vs OUR miss), duplicates, staleness | `data/master/recording_audit.json` (+ `.jsonl` history) |

**Our history outlives Polygon's window.** Polygon keeps about 2 years of futures. `import_futures_1m.mjs` never deletes stored bars older than its new series, so our files keep growing past 2 years.

**Not recordable on our plan:**
- Futures buyer/seller footprint going forward: futures trades/quotes return 403. Databento live is paid.
- DXY futures (ICE DX): 0 rows on Polygon. The DXY is rebuilt from the six recorded pairs.

**First audit, 2026-10-17 (9 days):**
- every spot series has 3 holes, all provider outages (Polygon has no bars either), 0 misses on our side, 0 duplicates;
- the futures holes are minutes with no trades (silver futures is thinner).

## 8. Full verification, 2026-10-17 (`scripts/verify_database.mjs` → `data/master/database_verification.json`)

| Series | Stored minutes | Structure (dup / order / OHLC) | Latest 5 trading days vs a FRESH Polygon download |
|---|---|---|---|
| XAUUSD spot | 4.91 M | 0 / 0 / 0 | 5,506 / 5,506 identical |
| XAGUSD spot | 4.45 M | 0 / 0 / 0 | 5,505 / 5,505 identical |
| EURUSD, USDJPY, GBPUSD, USDCAD, USDSEK, USDCHF (the DXY) | 6.2-6.3 M each | 0 / 0 / 0 | all identical (5,714-5,743 each) |
| GOLD_FUT | 715 k | 0 / 0 / 0 | 5,519 / 5,519 identical, price AND volume |
| SILVER_FUT | 689 k | 0 / 0 / 0 | 5,355 / 5,355 identical, price AND volume |
| WTI | 708 k | 0 / 0 / 0 | 5,494 / 5,494 identical, price AND volume |
| GLD | 352 k | 0 / 0 / 0 | 2,858 / 2,858 identical, price AND volume |

- **GOLD_FUT vs the CME exchange feed:** 682,457 / 682,457 same-contract minutes identical (price and volume).
- **Every hole is a Polygon hole:** checked live, Polygon has no daily bar inside any of them. Each DXY pair has its own holes (for example USDSEK 2020-10-14 → 2021-01-01); a rebuilt DXY minute exists only when all six pairs exist.
- **Timeframes vs Ashraf's TradingView:**
  - XAUUSD and XAGUSD: every candle open identical on all 16 timeframes (`smoke_ny_candles.mjs [XAUUSD|XAGUSD]`).
  - Our rebuilt DXY vs TVC:DXY: median difference 0.0014 index points; 1H move correlation 0.986, the same direction 95 %.
  - TVC:DXY uses ICE's own (historically changing) session, so our DXY candles are deliberately on the GOLD grid.
- **Real volume on every timeframe:** for futures and GLD, the sum of candle volume equals the 1m volume on all 16 timeframes. Candles that span a contract change are flagged `roll`.
  - GLD uses `keepBreakHour` (it trades 17:00-18:00 New York).
  - 2,226 GLD minutes (0.6 %) fall in Friday-evening extended hours or holidays when gold is closed, so there is no gold candle for them.
- **Deletions:** Polygon REMOVED 29 EURUSD minutes (2026-10-13 00:00-00:28) after first publishing them live. `reconcile_1m.mjs` now writes `deleted` corrections for such minutes (only ≥ 6 h old, with Polygon data on both sides), and the reader skips them.

## 9. Data health watcher + market hours (2026-10-18)

Ashraf asked: "how we can tell if we have any issue with full system database? and can we get alert for this?" He chose the Twin Turbo Telegram group, "also stop signal trigger and make a note on the App 'Database Stale' with flash red color", and a daily "all data OK". Then: "include market working time so when market closing hrs our system understand why no feeding".

**Market hours** (one place: `src/core/freshness.js`, `marketSession` / `marketOpen`):
- XAU spot runs Sun 18:00 → Fri 17:00 **New York time**, with a daily break 17:00-18:00 New York. It follows US daylight saving: from November every edge moves one hour later in UTC (Fri close 22:00Z, Sun open 23:00Z).
- The old rule used fixed UTC hours, which are correct in summer only.
- Holidays, measured on our 1m store 2016-2026:
  - **Closed:** Christmas (observed Fri/Mon), New Year (Mon if Sunday; a Saturday New Year closes nothing), Good Friday.
  - **Early close 13:00 New York:** Independence Day (observed).
  - **Trade to the normal close:** Thanksgiving, MLK, Memorial Day, Labor Day, Christmas Eve, New Year's Eve.
- **Proof over 3.72 M minutes:** 0.21 % of stored minutes fall in "closed" time (old rule 1.49 %); "open" hours with no data 2.78 % (old 4.20 %). Most of the rest is the Nov-Dec 2020 data-vendor winter.

**Verdict** (one place: `src/core/dataHealth.js`). It reads the results the existing checks write and runs no new check of its own:

| Check | CRITICAL → STALE (signals stop) | WARN (signals continue) |
|---|---|---|
| market | — (states OPEN / WEEKEND / DAILY_BREAK / HOLIDAY / EARLY_CLOSE + the next open) | — |
| app + live flows | watchdog HALT · app down · a live flow stale (market open ≥ 40 min) | — |
| gold stream | settled minute > 4 min behind (market open ≥ 40 min) | — |
| gap repair (`reconcile_1m`) | last run failed | no run for 30 h |
| recording audit | our misses / duplicates / out-of-order | no run for 30 h |
| futures recorder | failed twice · silent 45 min · GOLD_FUT > 45 min / SILVER_FUT, WTI > 60 min old (not in the 21-23Z CME break or a holiday) | — |
| weekly full check (`verify_database`, Saturdays 06:00Z) | failed | older than 8.5 days |
| calendar | — | a source failing · not refreshed for 75 min · history kept old rows |
| disk | < 5 GB free | < 20 GB free |

**What reads the verdict:**
- **Watcher:** `scripts/health_tick.mjs`, run by run_twin every 2 min (first in the loop), and by the external watchdog when the app is HALTED. It writes `data/master/data_health.json`.
- **Telegram:**
  - 🟥 DATABASE STALE (a CRITICAL issue seen on 2 ticks; app down / halt at once);
  - 🟧 warning (seen on 3 ticks);
  - ✅ recovered (clear for 2 ticks);
  - 🔁 watchdog restart;
  - 🟩 daily check after 21:45 UTC.
- **Signal gate** `signalsHalted()`: STALE, or a verdict missing / older than 10 min, means halted (fail closed). It stops:
  - every Telegram send (`sendText`, except the watcher's own);
  - the twin 15m fire;
  - new Matrix boxes and watch markers;
  - the inv90 forward ledger.
- **Chart banner:** flashing red "DATABASE STALE — SIGNALS STOPPED" · amber "DATA WARNING" · calm blue "MARKET CLOSED — … no live feed expected" + the next open.
- **Proof:** `smoke_data_health` 12/12, `smoke_freshness` 7/7.

### 9a. Pre-open readiness + Polygon revisions (2026-10-18, same day)
- **Pre-open check** (`scripts/preopen_check.mjs`; Ashraf approved "Pre-open readiness check"): run_twin runs it 60 and 15 min before every open (`dataHealth.preopenSlot`). The daily-break reopen gets only T-15, and it reports NOT READY only.
  - **15 checks:**
    - Polygon reachable + plan accepted (failures classified);
    - PC clock vs Polygon ±10 s;
    - the last 60 stored minutes = Polygon for XAU, XAG and the 6 DXY pairs (o/h/l/c) and for GOLD_FUT, SILVER_FUT, WTI (+ volume, per contract);
    - tick stream up, connected, 8/8 subscribed;
    - data health not STALE.
  - **Telegram:** ✅ READY / 🟥 NOT READY + what failed. A NOT READY stays a WARN in the health verdict until the open + 2 h.
  - **First run 2026-10-18 09:0x UTC:** 15/15 READY. With a deliberately wrong key: NOT READY, "DATA PLAN … HTTP 401" (path proven).
- **Polygon revises past minutes** (MEASURED 2026-10-18):
  - **Forex:** between the 23:02 UTC full check (identical) and 08:51 UTC, Polygon re-published 2026-10-15 for all 8 forex symbols (XAU 873 minutes; mean $0.12, max $1.22). reconcile_1m corrected them (7,575 in total).
  - **GLD:** 7 minutes re-rounded to 4 dp, two 1-cent closes.
  - **What failed and what fixed it:** the recorder was append-only and never re-checked, so `verify_database` FAILED. New `src/data/recordRevisions.js`: record_futures re-checks the last 5 days of GOLD_FUT / SILVER_FUT / WTI / GLD every 6 h with the verify_database rule, rewrites revised minutes atomically, and logs old → new to `data/master/recorder_revisions.jsonl`. A minute Polygon no longer serves is reported, never deleted.
  - **Live end to end:** 09:03 Telegram 🟥 DATABASE STALE (full check failed: GLD) → 09:02 the 7 revisions applied → 09:07 full check ✅ → 09:11 Telegram ✅ DATA OK AGAIN — signals resumed.
- **`verify_database` window is now ROLLING** (the 4 days up to the last market close). It was hard-coded to 2026-10-12 → 10-16, so the weekly run would have re-checked that week forever.
- **Feed delay (facts, unchanged):**
  - spot = real-time ticks (Polygon forex WebSocket, measured);
  - futures = **Futures Starter: 1m bars, 10 min delayed, no ticks / bid-ask**. They are delayed CONTEXT only: whale gauge, WTI, footprint BLOCKED live.

## 10. History built perfectly on every timeframe — full audit + three fixes (2026-10-18)

Ashraf: "confirm that our database reading live perfectly and our history for each time frame is built perfectly". Then he chose "Measure 2020 first" for the weekend-dated minutes.

- **`scripts/audit_timeframes.mjs`** (→ `data/master/timeframe_audit.json`):
  - **Scope:** all 12 series × the 16 TradingView timeframes, whole history.
  - **Method:** an independent, order-free regroup of every minute. It must equal each candle exactly: open, high, low, close, minute count and real volume. It also requires no duplicate / out-of-order candle, every minute in exactly one candle, and every candle inside its own window.
  - **Live loader:** the 3m / 15m / 1h candles the live code reads, compared with the TradingView build.
  - **Self-test:** 5 corruption kinds, all caught.
- **Fix 1, bad-print repair at 1 minute only** (`bars.repairOne` / `repairStream`):
  - **Bug:** on 3m / 15m / 1h candles the rule erased the REAL silver flash crash of 2017-07-06 (≈ −10 %, recovered inside one candle, so the candle's neighbours "agreed").
  - **Fix:** every timeframe is now built from repaired 1m bars, judged with a 4-day neighbour margin, so a window never changes a verdict.
  - **Result:** XAU candles unchanged. The crash is kept on every timeframe. The 2025-11-23 XAU false print is still repaired, even in a small window.
- **Fix 2, Polygon's 2020-11-15 → 12-31 New-York-local stamps** (`src/data/sourceQuirks.js`, +5 h at read time; the files stay = Polygon):
  - **Affected:** XAUUSD, EURUSD, USDJPY, GBPUSD, USDCAD, USDCHF. XAG / SEK have no data there.
  - **Evidence:**
    - Structure: break at 17:00 "UTC", Sunday open 17:00 / 18:00 "UTC", Christmas Eve stop at 13:45 "UTC".
    - Our store = Polygon's current minutes exactly.
    - TradingView daily close difference: $3.32 as stored vs $0.27-0.75 in the controls; $0.60 at +5 h.
  - The research switch `TWIN_RAW_POLYGON_TIMES=1` replays the raw stamps (used by the two frozen-artifact smokes).
- **Fix 3, weekend-dated minutes dropped in `cleanForTv`:** a Saturday / Sunday trading date has no TradingView session.
  - **Dropped:** XAU 452, XAG 336, the DXY pairs 2,130-55,839 (USDCHF), GLD 5,618 (Friday extended hours).
  - They had formed USDCAD 1M and USDCHF 3H/4H/6H candles outside their own window. The count is reported in `dropped.weekend_minutes`.
- **Result:**
  - ✅ 12 series × 16 timeframes: every candle = its minutes.
  - **Live loader:** XAU 1,531,248 / 306,760 / 76,846 and XAG 1,511,016 / 302,987 / 75,900 candles identical (3m / 15m / 1h).
  - **TradingView anchors:** XAU and XAG 17/17.
  - `smoke_source_quirks` 4/4.
- **Effect on earlier results** (measured, nothing hidden):
  - IMPULSE_CONT frozen book: TRAIN net/t −0.1964 → −0.2977, per_day 0.3087 → 0.3097. OOS unchanged (it is the live label).
  - Level Radar (superseded study): 166 of 9,124 candidates differ, 2020-11 → 2021-06.
  - Both reproduce exactly under the raw switch, which is what their smokes now certify.
  - Every other suite passed unchanged on the fixed data.
