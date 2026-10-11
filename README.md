# Ferrari Twin Turbo

> **⚠ STATUS 2026-10-08 (rev f) — RE-MEASURED ON THE TWIN'S OWN DATA.** The table below records the carry-over from
> Turbo2's 23y Dukascopy tape. On the twin's Polygon 1m tape (Ashraf: 1m only, ticks only, R0), with measured bid/ask and the
> trial's own resolution rules: **IMPULSE_CONT = SHADOW** (money path OOS −$0.065/t, TRAIN −$0.196/t, 1/8 folds —
> `impulse_cont_twin_gate.json`); **readiness gauge = FAIL** (HOT LB 92.5 < 95, no era-A days); **LEVEL_FADE (the Level Radar
> fade) = SHADOW** — the radar study had look-ahead and a non-executable trade population; as a live order rule it loses
> (−$0.97 to −$1.49/t OOS, 0/8 folds — `level_fade_gate.json`). **No book ships.** Details: MASTER_DOCUMENT.md §3 (f)-(h).

**Live data flow:** `npm start` runs the tick stream (Polygon forex WebSocket, all 8 symbols → verified 1m bars in
`data/history/<SYM>/1m.jsonl`) and the 15m paper tick. History: `npm run import:1m` (Polygon 1m, the only stored timeframe);
spread: `node scripts/measure_spread_polygon.mjs`; stream alone: `npm run stream`; tests: `npm run smoke:all:full`.

The verified subset of **Ashraf Ferrari Turbo 2**, rebuilt as its own app on 2026-10-08. Ashraf's brief: scan the
current setup, compare every function and tool against history, keep only what is tested and 95-100% correct, drop the
rest, no duplications. The per-component evidence is in [docs/TWIN_TURBO_SELECTION.md](docs/TWIN_TURBO_SELECTION.md);
the running log is [docs/MASTER_DOCUMENT.md](docs/MASTER_DOCUMENT.md).

## What is in here

| part | what | evidence |
|---|---|---|
| **the book** | `IMPULSE_CONT` — a fresh 2h impulse (≥4×ATR) then a direction-matched A+ 15m setup, maker limit, stop 1.5·ATR, target 0.5R, break-even +0.05R / lock +0.10R, all hours, paper-only | the only one of 14 Turbo2 tiers that passes the 1m-sequenced gate: decisive WR 73.59% (Wilson LB 68.17%, n=284), +$0.3527/t (bootstrap LB +$0.1776), TRAIN +$0.0622, 4/4 powered folds — `data/master/impulse_cont_seq1m_gate.json`, reproduced exactly by `npm run smoke:impulsefrozen` |
| **the engine** | `proSignal.js` + the strategy search, six setup detectors, structure tools, world model, indicators | the A+ structural engine (23y, DSR 1.000, PBO 0%) that every book is built from; `smoke:prosignal` |
| **the resolver + cost model** | `seqResolver.js` (1m-sequenced fills), `execution.js` (session spread, measured) | the 2026-08-14 fill-bar fix; `smoke:seq`, `smoke:execution` |
| **the paper trial** | `paperTrader.js`, `paperReview.js`, `promotion_review.mjs` | validator-parity recorder (fills on 1m sub-bars, REFUSED rows priced), one vocabulary, ≥50 sequential fires before any promotion talk; `smoke:paper`, `smoke:review` |
| **the readiness gauge** | `bigmoveReadiness.js`, `liveReadiness.js` | HOT = dens30 ≥ 10 & rv10 ≥ 2.5 → 97.8% precision (LB 95.3) on 23y, parity artifact PASS; occurrence only, never direction, never a gate; `smoke:readiness` |
| **the Level Radar** | `study_level_radar_23y.mjs`, `validate_level_radar_seq.mjs` | with-trend pullback fade at a tested D/4H level: 24/24 years, Holm survivors, 1m-sequenced confirmed; knowledge base only (no book yet — Ashraf's call) |
| **the data layer** | `backfillReader.js`, `liveBars.js` (closed bars only), `liveFeed.js`, `netResolve.js`, `bars.js` | byte-parity seek, bad-print repair, the causality rule (never the forming bar); `smoke:temporal` |
| **validation tools** | `stats.js`, `deflation.js`, `regimeSplitter.js` (8 regime-spanned folds), `rng.js`, `resample.js` | `smoke:regimesplitter` |
| **health** | `freshness.js` contract (2 flows), `run_twin.mjs` heartbeat + child ledger, `pidAlive.js` | `smoke:freshness` |

## What is deliberately NOT here

Every suppressed, refuted or shadow book (13 of 14 tiers), every context agent measured without a standalone edge
(news direction ×4, DXY as a filter, COT, narrative, whale, options, Gann, Fibonacci, Elliott, Wyckoff, candle and chart
patterns, volume gates, session starts, box breaks), the forecast, the cockpit, the EA bridge, the desk report. The
reasons, with the artifact behind each, are in the selection doc. Nothing was dropped on opinion.

## Data: read-only by construction

The twin **reads** Turbo2's maintained price stores (`C:\Ashraf-Ferrari-Turbo2\data\history\XAUUSD`, refreshed by
Turbo2 every 10 minutes) and its 94 MB candidate cache, and **writes only** under its own `data/`. `src/core/paths.js`
is the single place that knows this. With a `POLYGON_API_KEY` in a local `.env` the tick also pulls the live tail in
memory (never written). Telegram is off unless `TWIN_TELEGRAM_BOT_TOKEN` / `TWIN_TELEGRAM_CHAT_ID` are set.

## Run

```bash
npm run smoke:all            # every suite, ~3 min (bar loads dominate)
npm run smoke:all:full       # + the frozen-artifact reproduction (8 GB heap)
npm run tick:static          # look at the current roster — writes nothing
npm run tick                 # one paper-trial tick (journal, signal_tiers.json, alerts)
npm start                    # the scheduler: a tick 5 s after every 15m close while XAU is open
npm run promotion:review     # the paper book vs the ≥50-fire bar (Turbo2 journal read-only + own, merged)
npm run study:stategate      # Method D: the market-state gate on this book (sets STATE_GATE_MODE)
```

## Standing rules (inherited)

Never the forming bar · fills are sequenced on 1m sub-bars · every number cites its artifact and a smoke re-derives it ·
inference is not measurement · WR is a price, scratches are the profit · nothing ships below its validation · the
contract and the frozen artifacts are immutable without Ashraf's explicit word.
