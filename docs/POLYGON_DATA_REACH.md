# Polygon Data Reach — measured, not assumed (RED RULE R0 ledger)

Every row below was **measured** on 2026-10-08 ~13:50 UTC with the app's own `POLYGON_API_KEY` (read from Turbo2's
`.env`, never printed). Probe: 1 request per check, 1m aggregates. Re-measure before relying on any row older than
30 days — plans change (the Stocks Developer plan was due to cancel 2026-06-16).

## Live status (1m bars)

| input | Polygon ticker | status | last 1m vs now | 1m history (June sample per year) | R0 verdict |
|---|---|---|---|---|---|
| Gold spot | `C:XAUUSD` | OK | 1 min | 2010 ✓ · 2011-2013 **0 bars** · 2014-2026 ✓ every year | ✅ LIVE |
| Silver spot | `C:XAGUSD` | OK | 1 min | 2004-2013 **0 bars** · 2014-2026 ✓ every year | ✅ LIVE |
| EUR/USD, USD/JPY, GBP/USD, USD/CAD, USD/SEK, USD/CHF | `C:EURUSD` … `C:USDCHF` | OK | 1 min | 2010 ✓ · 2013 ✓ · 2026 ✓ (2004 0 bars) | ✅ LIVE |
| DXY index | `I:DXY` | **DELAYED** | no 1m bars returned | none | ⛔ NOT LIVE |
| DXY rebuilt from the 6 pairs (ICE formula, Turbo2 `dxyFormula.js`) | 6 × `C:` pairs | OK | 1 min | 2010 → | ⚠ LIVE inputs, but a reconstruction — needs Ashraf's yes |
| WTI crude futures | `CLX6`, `CLZ6` via `/futures/v1/aggs` | OK but **10.5 min delayed** | 10.5 min | older contracts (CLN4, CLN3, CLN2, CLN0) returned **0 bars** | ⛔ NOT LIVE |
| WTI tick trades | `/futures/v1/trades/CLX6` | **403** | — | — | ⛔ not in plan |
| USO ETF (oil proxy) | `USO` | **DELAYED** | 15 min | 2013 / 2010 / 2004 → **403** | ⛔ NOT LIVE, and a proxy |
| ⚠ `CL` on `/v2/aggs/ticker/CL` | — | OK | — | — | **this is Colgate-Palmolive stock ($86), NOT crude oil**. A wrong-identity ticker returns 200 OK |

## What the twin reads today (verified in source)

- **Live tail:** `src/data/liveFeed.js` is Polygon-only (`api.polygon.io`, `C:XAUUSD`). Turbo2's `historyUpdater.js`
  appends closed bars through the same module every 10 min.
- **Twin key:** the twin has **no `.env`**. Its tick runs "file only": it reads Turbo2's store, which can be up to
  10 min stale plus the bar close. `tick:static` at 13:00 read last 15m = 12:30.
- **History body:** `15m_dukascopy_23y.jsonl` = **Dukascopy 2003-05 → the 2026-06-25 seeding**, Polygon-appended since,
  in ONE file with **no per-bar source stamp**. The 5m/30m/1h/4h/1d files are a "backfill_copy" from 2016. The 1m file
  is Polygon.
- **IMPULSE_CONT's 23y validation** ran on that 15m file, so its pre-2014 years are Dukascopy, not Polygon.

## Open decisions (Ashraf), listed with the rule, not resolved by guessing

1. **History source.** Does R0 cover the *historical validation body*, or live inputs only? If it covers history:
   Polygon XAU 1m exists 2014→ (2010 partial, 2011-13 empty), so validations re-run on 2014-2026 Polygon = ~12.5y.
   IMPULSE_CONT's verdict would have to be re-measured on that window.
2. **DXY.** Is the ICE-formula rebuild from 6 live Polygon FX pairs acceptable as "DXY", or is DXY BLOCKED until a live
   `I:DXY` feed exists?
3. **WTI.** BLOCKED on the current plan (10.5 min delayed). A real-time futures plan is a paid upgrade: surfaced, never
   bought.
4. **Twin key.** Let the twin read the key from Turbo2's `.env` read-only (no copy of the secret), or create its own
   `.env` yourself.

## Live flow — measured 2026-10-08 13:54-14:37 UTC (app key, XAU 1m)

| path | measured | notes |
|---|---|---|
| **WebSocket forex** `wss://socket.polygon.io/forex` | ✅ authorized, real-time | 12/12 subscriptions OK |
| · `CA` closed 1m bar | arrives **2.0-2.6 s** after the minute closes (p50 2.3 s, n=64 over 8 symbols) | **identical to REST's final bar 10/10 minutes** (O/H/L/C to the cent) |
| · `CAS` 1-second bars | p50 2.3 s after the second | 474 in 8 min |
| · `C` quotes (bid/ask) | p50 **0.71 s**, p90 1.1 s | ~3 per second |
| REST 1m aggs | the closed bar first appears **1.5-3 s** after the close (it was there by the 3 s poll 10/10) | round trip p50 227 ms |
| REST snapshot | last quote p50 0.95 s old | |
| REST last quote / conversion | ✅ bid/ask | |
| REST historical quotes `/v3/quotes/C:XAUUSD` | ✅ bid/ask history | the spread can be measured from Polygon (Polygon's aggregated FX quote, **not** the broker's spread) |
| REST 1-second aggs | ✅ | |
| WebSocket futures real-time | ⛔ "no access to real-time data", then max_connections | |
| WebSocket futures delayed | ✅ authorized (`AM.CLX6`) | delayed = not live under R0 |
| WebSocket indices (`I:DXY`) | ⛔ "plan doesn't include websocket access" | |

**Revisions.**
- A 35-minute tracker re-fetched the last 90 minutes every minute: 125 closed 1m bars and 9 closed 15m bars. **Zero changes.** A served closed bar did not change within 90 minutes.
- Separately, Turbo2's stored 1m bars for 2026-10-04/05 differ from what Polygon serves today: 1,040 of 5,090 1m bars, plus 83 15m bars. **Only opens and closes changed**; highs and lows never did (p50 $0.06, max $1.08). **Zero mismatches on 10-06, 10-07 and 10-08.**
- The cause is **UNMEASURED**: Turbo2's run ledger only keeps today. It is a one-off on those two days, not routine revision. A daily reconciliation (re-fetch yesterday, compare) is needed to catch the next one.

**Gaps.** 5,095 1m bars over the last 5 days: **0 missing minutes** in open hours (the daily 21-22 UTC break and the weekend excluded).

**How the twin's input arrives today (measured).**
- Turbo2's `tick` runs every 10 min at :02/:12/:22/… and takes 29-47 s. A 15m bar closing at :15/:45 reaches the store about 7.5 min late; one closing at :00/:30, about 2.5 min late.
- The twin ticks at close + 5 s and, having no key, reads that store. It therefore **always misses the just-closed bar** and decides one full 15m bar late (`tick:static` at 13:00 read last bar 12:30).

## Tick parity — measured 2026-10-08 (6 min, all 8 symbols)

1-minute bars built from the forex quote stream (`C.*`) were compared with Polygon's own `CA` bars over 35 of 35 minutes:
- **tick count = bar volume exactly**;
- **bars built from the BID = Polygon's bar exactly**, O/H/L/C to the cent;
- 0 out-of-order ticks.

Consequences:
- The tick stream reproduces the history exactly: live and backtest are the same data.
- **Polygon's 1m bars are BID bars.** Gold's ask was $0.66-0.72 above bid.
- **"Volume" is the count of quote updates**, not traded volume.

## History — imported 2026-10-08 (`npm run import:1m`, `scripts/import_history_1m.mjs`)

Fresh from Polygon into `data/history/<SYM>/1m.jsonl`; per-month provenance in `manifest_1m.json`; resumable from
`_parts/`. 0 bad bars, 0 out-of-order bars. **1m is the ONLY stored timeframe**; every higher timeframe is resampled
from it.

| symbol | bars | first | holes since 2013-08 (complete months with < 20k bars) |
|---|---|---|---|
| XAUUSD | 4,898,833 | 2009-09-27 | 2019-09 (1,289) · 2020-10 (11,012) · 2020-11 (14,972) |
| XAGUSD | 4,445,640 | 2013-07-14 | 2019-09 (1,242) · 2020-10 · **2020-11 and 2020-12 = 0** · 2023-01 |
| EURUSD | 6,280,831 | 2009-09-25 | 2020-11 |
| USDJPY | 6,231,613 | 2009-09-27 | 2019-09 · 2020-10 · 2020-11 |
| GBPUSD | 6,255,567 | 2009-09-25 | 2020-11 |
| USDCAD | 6,212,857 | 2009-09-25 | 2020-10 · 2020-11 |
| USDSEK | 6,146,378 | 2009-09-27 | 2019-09 · 2020-10 · **2020-11 and 2020-12 = 0** |
| USDCHF | 6,230,082 | 2009-09-25 | 2020-10 · 2020-11 · **2021-05 = 0** |

- **Gold before 2013-07-14 is islands only:** 2009-10 → 2010-07, then 2011-07/08. **2012 has 0 bars.**
- Continuous gold 1m runs **2013-07-14 → today**, minus the holes above.
- Holes are recorded, **never filled** (R0.6).

**Reconciliation vs Turbo2's 1m store (gold, bar for bar):**
- **2013-2025: 4.3 M bars, 100% identical.**
- 2026: identical through 06-30; **~70% of bars differ from 2026-07-01 to 2026-10-05** (64,555 open/close, 5 high/low, max $70.04 on 07-14 12:30); identical again from 10-06.
- The window opens exactly at a month boundary and covers bars Turbo2 bulk-fetched on 07-23 as well as bars it appended live. That is consistent with Polygon re-issuing 07-01 → 10-05 after 10-05 (**not proven**).
- 121 bars exist in the fresh download and not in Turbo2's store (2026-02-25 23:46 →).
- Turbo2's IMPULSE_CONT paper fires of Jul-Oct were resolved on the pre-re-issue bars.
