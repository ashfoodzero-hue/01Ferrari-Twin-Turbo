# Ferrari Twin Turbo — Master Document

Resume with: "Continue building Ferrari Twin Turbo" → read this file (§3 revision log, newest last) and
[TWIN_TURBO_SELECTION.md](TWIN_TURBO_SELECTION.md). Parent app: Ashraf Ferrari Turbo 2 (`C:\Ashraf-Ferrari-Turbo2`,
`docs/MASTER_DOCUMENT.md` §7, entry (bs) records the carry-over).

## 1. Purpose

One app, one validated book, zero unverified tools. Ashraf (2026-10-08): "scan the current setup with all functions
and tools and compare it to history … see what function is tested and 95-100% correct … use those only in our new app
without duplications … only use the real Win results, and ignore the rest."

## 2. Rules

### 🟥 R0 — RED RULE: POLYGON LIVE DATA, ZERO GUESSING (Ashraf 2026-10-08, never to be crossed, now and in future)

> *"Make sure we have everything extracted live from Polygon, we need live data and zero guessing. Make this 100% a red
> rule not to be crossed at all for now and future in this App."*

1. **Polygon only.** Every market input to any signal, filter, gate, stamp or display in this app comes from Polygon
   (Massive) through the app's key. No Yahoo, no TradingView `request.security`, no broker feed, no scraped site, no
   other vendor.
2. **Live means live.** A feed Polygon marks DELAYED is **not live** and cannot drive a live decision: today that is
   `I:DXY`, CL futures (10.5 min) and USO (15 min).
3. **Unavailable means BLOCKED.** An input Polygon cannot supply live is reported as BLOCKED and its component does not
   run. It is never replaced by a proxy (USO for WTI), an unapproved reconstruction, a constant, a hand-typed level, a
   default or an assumption.
4. **Identity verified, never assumed.** Every ticker is checked against Polygon's reference data before use (`CL` on
   `/v2` is Colgate-Palmolive stock, not crude oil, and it returns 200 OK).
5. **Provenance on every bar.** Source, ticker, fetch time and delay status. A value without provenance is not used.
6. **Fail closed.** Missing, stale or delayed data gives **no signal**: never forward-filled, interpolated or carried
   over.
7. **Measured reach is written down.** [POLYGON_DATA_REACH.md](POLYGON_DATA_REACH.md) holds the measured status of
   every input and is re-measured before any new input is used. Open R0 decisions (history body, DXY rebuild, WTI,
   twin key) are listed there and are Ashraf's.

- **R1 read-only parent.** Turbo2's folders are REF.* — read, never written. Only Turbo2 writes the price stores.
- **R2 one rule, one place.** A predicate exists once (`isImpulseCandidate`, `isFire`, `DENSE_REL`); smokes forbid inline copies.
- **R3 provenance or it does not ship.** Every TIER_STATS number cites its artifact; `smoke:roster` re-derives it field for field; `smoke:impulsefrozen` reproduces it from the tape.
- **R4 measure, never infer.** A live rule changes only on a pre-registered measurement (the state gate: `study:stategate`).
- **R5 causality.** Closed bars only; fills sequenced on 1m sub-bars; the recorder's bar never resolves its own row.
- **R6 the twin is paper-only.** Promotion to an EA needs ≥50 sequential resolved fires, the traded-semantics reference, and Ashraf's explicit word.
- **R7 no duplication.** A tool exists in the twin only if a measurement says it is correct; refuted/unpowered tools are listed with their artifact, not copied.

## 3. Revision log

- **(a) 2026-10-08 — carry-over build.** Folder created; 58 verified modules copied verbatim from Turbo2 (see selection doc §4); `paths.js` rewritten (own writes, Turbo2 read-only); `tierStats.js` = TIER_STATS.IMPULSE_CONT verbatim; `twinRoster.js` = the IMPULSE_CONT path of `emitSignalTiers` with every non-validated tier/stamp removed and the market-state read carried as `stateRead` under `STATE_GATE_MODE`; `twin_tick.mjs` / `run_twin.mjs` = the paper trial; `telegram.js` trimmed to sender + formatter; `freshness.js` = Turbo2's engine with the twin's 2-flow contract; smokes: execution, seq resolver, paper trader, paper review, freshness, netresolve, temporal guarantee (patched: a `%20` in `new URL().pathname` broke on the folder's space — latent in Turbo2, harmless there), pro signal, market state, twin roster (new, mechanism-based + artifact field parity), twin↔Turbo2 parity (new), readiness (new), regime splitter, frozen artifact. **`npm run smoke:all:full` 14/14 suites green, exit 0** (selection doc §6). Measured: the market-state gate on this book is UNPOWERED (vetoed arm break-even) → `STATE_GATE_MODE='block'` kept (selection doc §2). Level Radar rebuilt here (seq 14/14 years). NOT started: `npm start` (Ashraf's call), Telegram credentials, LEVEL_FADE book. Next: Ashraf decides whether the twin's scheduler runs beside Turbo2 (paper-only, read-only on the stores) and whether the Level Radar becomes a shadow book.
- **(b) 2026-10-08 — the trial is one trial.** `promotion:review` read only the twin's own (empty) journal and reported 0/50, while Turbo2 has journaled the identical book since 2026-08-13 (`smoke:parity`: same fires, same 14 fields, same `block` gate). New `src/master/trialJournal.js` = the ONE merge rule: Turbo2's journal (READ-ONLY, trial tiers only) + the twin's own, by row id, own wins (no double count once `npm start` runs); BE-audit corrections merged the same way. The review now reads the real state: **22 fires · 9 sequential resolved (1W / 7S / 1L) → 9/50**; journal P&L −$23.32 but BE-audit corrected **+$5.64**, on-track p 0.33 (sequential p 0.30) — no breakage; the one exit anomaly (2026-09-04, a −0.67R "scratch") is the 09-06 BE-exit bug, re-resolved by Turbo2's audit to +$2.12. ~135 trading days to 50 at the 23y rate. Removed the stale SWING_TRADE reference line. New `smoke:trial` 5/5 (merge, corrections, fixtures, parent byte-identical after load, static one-place check) registered in `smoke:all`; `smoke:review` 8/8, `smoke:temporal` 7/7; `smoke:all` 13/13 green before the change (787 s). Still Ashraf's calls: `npm start`, Telegram, LEVEL_FADE shadow book.
- **(c) 2026-10-08 — 🟥 RED RULE R0 (Polygon live, zero guessing) + measured Polygon reach.** Ashraf made R0 a red rule for this app permanently (§2). Measured with the app's key (`docs/POLYGON_DATA_REACH.md`): LIVE 1m = `C:XAUUSD`, `C:XAGUSD` and the 6 DXY FX pairs (1 min lag); NOT LIVE = `I:DXY` (delayed, no 1m), CL futures (10.5 min delayed, trades 403, no older-contract history), USO (15 min delayed, no pre-recent history). `CL` on /v2 = Colgate stock (wrong-identity trap). Twin's own source: liveFeed is Polygon-only ✓; but the twin has no key (reads Turbo2's store, ≤10 min stale), and the 15m history body is Dukascopy 2003 → 2026-06 with no per-bar source stamp, Polygon-appended since. XAU 1m on Polygon: 2014 → solid, 2010 partial, 2011-13 empty. Four R0 decisions open (history body, DXY rebuild, WTI, twin key). Triggered by the review of Ashraf's "Ferrari Central Master Control Suite" Pine strategy: under R0 its WTI filter is BLOCKED on the current plan and its DXY needs decision 2. No code changed for the strategy (agree-first).
- **(d) 2026-10-08 — live data flow measured** (`docs/POLYGON_DATA_REACH.md` § Live flow).
  - Forex WebSocket on our plan is real-time: closed 1m bar 2.0-2.6 s after the close and identical to REST 10/10; quotes 0.7 s; 1-second bars available. REST has the closed bar within 1.5-3 s.
  - Bars did not revise within 90 min (0/134). Turbo2's stored 10-04/05 bars differ from today's Polygon (open/close only, max $1.08), cause unmeasured, one-off → needs daily reconciliation. 0 missing minutes over 5 days.
  - **Biggest gap: the twin, without a key, reads Turbo2's store (refreshed every 10 min) and decides one full 15m bar late.**
  - Proposed flow (one stream + REST verify + fail-closed staleness + per-bar provenance + daily reconciliation) awaits Ashraf's agreement. No code changed.
- **(e) 2026-10-08 — the twin becomes a separate full app: own `.env`, own 1m history, tick flow measured.**
  - Ashraf: copy the `.env` (done — 5 vars; the twin's Telegram reads only `TWIN_TELEGRAM_*`, so Turbo2's `TURBO_TELEGRAM_*` can never make the twin post); "history is built on 1m only"; "data flow reads tick for all".
  - New `scripts/import_history_1m.mjs` (`npm run import:1m`): 46.7 M Polygon 1m bars for XAU, XAG and the 6 DXY pairs, per-month provenance.
  - Measured (`docs/POLYGON_DATA_REACH.md`): tick-built BID bars equal Polygon's 1m bars 35/35; gold 1m continuous from 2013-07-14 with holes (2019-09, 2020-10/11); 2013-2025 identical to Turbo2's store; Jul 1 – Oct 5 2026 differ (likely a Polygon re-issue).
  - NOT yet wired: `paths.js` still resolves 15m to the Dukascopy body. The switch to 1m-only, the tick streamer and the re-validation of IMPULSE_CONT on Polygon 1m (2013-07 →) await Ashraf's yes, because they replace the frozen 23y artifact.
- **(f) 2026-10-08 — Ashraf "yes to all … reading ticks for all, we need accurate signal for all": TICK FLOW LIVE · 1m-ONLY · RE-VALIDATED · RE-SCORED · BID/ASK.** Every number below is in its artifact.
  1. **Tick stream (live).**
     - `src/data/tickStream.js` + `tickBars.js` (pure) + `scripts/run_stream.mjs`: ONE Polygon forex WebSocket, ticks (`C.*`) + Polygon's minute aggregate (`CA.*`) for all 8 symbols (`src/data/symbols.js`).
     - Each minute is settled in order: tick-built BID bar = CA → written `src:tick ver:ca`; disagreement / CA-only / no CA by 8 s → REST arbiter; REST silent 45 s → `ver:unverified`; uncovered minutes (startup, reconnect) → REST refill.
     - Ask/spread per minute in `quotes_1m.jsonl`. Heartbeat `stream_heartbeat.json` (2 s, declared in the freshness contract).
     - `run_twin.mjs` (npm start) supervises it and ticks 3 s after each 15m close. **STARTED 2026-10-08 16:05 UTC** (detached; run_twin pid 14600, stream pid 20196). First live decisions 16:15/16:30/16:45: stream settled in 0.8-2.2 s, decision bar 15/15 minutes verified.
  2. **Ticks only, fail closed.**
     - `liveBars.loadBarsLive` reads only the tick-built store (the REST tail is removed) and reports live only when the stream heartbeat is fresh, its pid alive, connected and settled through the decision bar.
     - `twin_tick` waits ≤ 25 s, then records NO fire if the stream is stale, the decision bar is missing, or any of its minutes is unverified. Every roster carries `data.decision_provenance`.
  3. **1m only.** `paths.refHistoryFile` → the twin's own `1m.jsonl`; `backfillReader.streamBars` resamples every timeframe from 1m on the UTC grid, closed buckets only (a bucket is emitted only once its final minute exists or a later bar exists). No Turbo2/Dukascopy price data at runtime. `HISTORY_CONTINUOUS_FROM` = 2013-07-14 22:00Z.
  4. **Spread measured (R0).** `scripts/measure_spread_polygon.mjs` → `spread_table.json`: 3,535 Polygon quote samples, one window per (2nd-Wednesday, month, UTC hour) 2013-07 → 2026, no missing cell. Median full spread $0.35-0.48 (2013-21), $0.23-0.29 (2022-24, 10-min windows: the quote archive is thin there), $0.49 (2025), **$0.82 (2026)**. The old model ASSUMED $0.13-0.18 half-spreads in London/NY.
  5. **Bid/ask resolution.**
     - `seqResolver` `spreadAt` and paper-trader `spreadAt`: bars are BID; a BUY's entry and a SELL's stop/target/BE arm/lock/time exit compare against bid + spread. Cost = slippage only (`execution.netDollarsBidAsk`). Default `null` = byte-identical.
     - `seqAll`: every bar after the fill replayed on 1m. **Found: backtest ≠ trial before this** — the paper trader has replayed every bar on 1m since 09-06, the validator only the fill bar (a dip that armed BE inside a bar = LOSS in the backtest, SCRATCH in the trial). A seeded property test (300 random paths × spread/no-spread) now proves paper ≡ resolver on every resolved trade.
  6. **IMPULSE_CONT re-validated on the twin's tape (2013-07 → 2026-10-08 15:45, candidates rebuilt: 232,402):**

     | layer | resolution | cost | OOS $/t | 95% CI | verdict |
     |---|---|---|---|---|---|
     | A | fill bar on 1m | assumed | +0.224 | [−0.14, 0.54] | SHADOW (C2) |
     | B | all bars on 1m | assumed | +0.149 | [−0.21, 0.47] | SHADOW (C2) |
     | D | all bars on 1m + EA lock | assumed | +0.126 | [−0.25, 0.45] | SHADOW (C2, C3, C4) |
     | C | money path (all + EA lock + measured bid/ask) | measured | **−0.065** | [−0.47, 0.31] | SHADOW (C2, C3, C4); TRAIN −0.196, 1/8 folds |

     - **Diagnostic** (`diagnose_revalidation_source.json`): same window/folds/code on Turbo2's Dukascopy tape passes (+0.548 [0.24, 0.83]) — the cause is the DATA FEED, not the window or a pipeline bug (the control reproduced A exactly). Feeds differ $0.02-0.12/bar (MAD), 15m ranges $0.12-0.21 narrower on Polygon since 2023, candidate overlap 51%.
     - ⇒ **IMPULSE_CONT is SHADOW in the twin** (`tierStats.js` cites `impulse_cont_twin_gate.json`; recorded, never alerted, not promotable). **The twin has no shipping book.**
  7. **Paper trial re-scored** (`scripts/rescore_inherited_trial.mjs`): the 22 inherited fires on the current (re-issued) Polygon bars with today's recorder → 0W/10S/1L (11 expired), P&L −$0.84 (journal said −$23.32, the BE audit +$5.64). The trial's only win (09-01 SELL +$8.10) is a +$1.62 scratch on the corrected bars. `trialJournal` overlays the rescored rows.
  8. **Readiness gauge re-measured** (catalog rebuilt, 1,734 events 2013 →): HOT cell 89.0% (LB 81.7) / live parity 97.3% (LB 92.5, no era-A HOT days) ⇒ **FAIL** the pre-registered bar. Kept as a record-only state stamp; no probability is served (display law).
  9. **Level Radar re-measured:** level fade ALL +$0.71/t 14/14 yrs (study) · 1m-sequenced +$0.62/t [0.36, 0.87] 14/14 · **money path +$0.317/t [0.085, 0.583], 12/14 yrs** — the ONLY edge that survives the twin's data and real spread. Break-ride −$1.22/t 0/14. Cells not yet Holm-corrected on the money path. Knowledge base only (no book — Ashraf's call).
  10. **Archived:** Turbo2's artifacts + the pre-edit `seqResolver.js` / `paperTrader.js` → `data/master/_turbo2_frozen/`.
- **(g) 2026-10-08 — late quotes, corrections, nightly reconciliation; app restarted on the final code.**
  - **Measured live:** USDSEK minute 16:10 was written by the stream from 45 ticks, then 128 "late" quotes (stamped inside that already-settled minute) arrived. An hour later REST served the minute with 173 ticks and a different low/close — Polygon folds late quotes in after its CA aggregate. Gold: 0 late ticks; 66/66 stream bars identical to REST.
  - **Store stays append-only.** `src/data/corrections.js` + `paths.correctionsFile` → `data/history/<SYM>/1m_corrections.jsonl`: provenance-mandatory correction lines; the latest per minute wins at READ time (`backfillReader.streamBars`), so every resampled timeframe inherits them.
  - **Writers:** (1) the streamer's late-tick re-check — a minute receiving late ticks is re-fetched ~1 min and ~10 min later and corrected only if Polygon's bar changed (`ver: late-correction`, with `was`); (2) `scripts/reconcile_1m.mjs` (`npm run reconcile`, run by run_twin nightly 00:20 UTC) — last 2 days vs REST, corrections `ver: reconcile`, missing/extra minutes REPORTED in `reconcile_1m.json`, never invented.
  - **First reconcile:** all 8 symbols identical to Polygon over 2 days (2,744-2,865 minutes each) except that one USDSEK minute (corrected).
  - Tests: `smoke_tick_stream` 11/11 (adds the late → re-check → correction fixture, the reader-applies-corrections static check, and the pure reconcile diff).
  - **App restarted 17:11 UTC** (run_twin pid 1356, stream pid 1812); restart minutes refilled from REST.
- **(h) 2026-10-08 — LEVEL_FADE book built and gated (Ashraf "yes build everything we need") → SHADOW. The Level Radar fade is NOT an executable edge.**
  - **Module.** `src/master/levelRadar.js` = the radar as ONE module (level map, 4H decision, `ordersToPlace` = the book's order rule). `smoke_level_radar` 5/5: in `legacy` mode it reproduces all 9,124 study candidates exactly (faithful extraction).
  - **🚨 Look-ahead found in the study (code audit):** (1) pivots usable at the confirming bar's OPEN — daily up to 24h early, 4h up to 4h early; (2) trend1d / ATR(1d) / 20-day range read the day still in progress. Fixed in the default (causal) mode, which is proven truncation-invariant on 40 decisions; the legacy mode is shown NOT to be.
  - **Gate** (`scripts/validate_level_fade_book.mjs` → `level_fade_gate.json`, criteria pre-registered in its header): causal radar, live order rule, money path, 2013-07 → 2026-10-08 15:45.

    | rule | OOS $/t [CI] | TRAIN $/t | folds / years |
    |---|---|---|---|
    | Rule 1 — limit rests ≤ 24h, one per side | **−1.49** [−2.14, −0.85] | −0.42 | 0/8 folds, 1/14 yrs |
    | Rule 2 — refresh at every 4H close (pre-registered after rule 1 failed, 97.5% Bonferroni bound) | **−0.97** [−1.61, −0.38] | −0.50 | 0/8 folds, 0/14 yrs |

    Both fail the spread ×1.5 and fill-through $0.10 stresses. The legacy (look-ahead) radar on the same path is no better (−$1.47) — the look-ahead is not what made the study positive.
  - **Cause MEASURED** (`scripts/diagnose_level_fade_gap.mjs` → `diagnose_level_fade_gap.json`): on the identical money path, trades the study and the live rule share are +$0.95/t in BOTH (5,040). The study's +$0.32 comes from WHICH fills it counts: 4,415 live-rule fills the study never recorded lose −$2.50/t (WR 19%), 3,827 of them at decisions where the study recorded nothing on that side — blocked by a lane tied to the study's OWN 15m resolution of earlier trades. That is not reproducible by any order placed at decision time.
  - **No rescue:** on TRAIN folds only, every hours-since-last-loss bucket (−0.33 … −0.62), every level status and both 1d alignments are negative ⇒ no causal rule to pre-register; the search stops (no mining).
  - ⇒ **LEVEL_FADE = SHADOW.** Not added to TIER_STATS (a refuted rule is not recorded live). `study_level_radar_23y.mjs` carries a header warning; the radar's reach/bounce tables are research history, not claims. Turbo2's "Level Radar 24/24 years" rests on the same contaminated study.
- **(i) 2026-10-08 — the app now survives reboots: external watchdog + Task Scheduler.**
  - **Incident (measured from the Windows System log):** Windows Update rebooted the machine at 18:16:49 UTC (event 1074 by winlogon for SYSTEM; Kernel-Power 109/577; "Windows 11, version 26H2" installed 18:31 UTC). Both twin processes died; nothing restarted them; the live stream was down 18:15 → 19:17 UTC.
  - **Fix:**
    - `src/core/watchdogDecision.js` — pure decision, Turbo2's rules: liveness = the heartbeat's own pid alive AND a beat ≤ 3 min; only ever STARTS; > 3 starts per hour ⇒ HALT marker.
    - `ops/watchdog_twin.mjs` — ledger `data/self_heal/heal_ledger.jsonl`, off switch `data/self_heal/WATCHDOG_HALT.marker`.
    - `ops/watchdog_launch.vbs` — hidden window.
    - **Windows task `FerrariTwinTurbo_Watchdog`:** every 5 min + at logon, your user, no admin, runs on battery too. Remove with: `Unregister-ScheduledTask -TaskName FerrariTwinTurbo_Watchdog`.
  - **Proven:** the first manual run found "pid 1356 is dead (beat 62 min old)" and started run_twin (pid 16968); the stream REST-refilled the 64 missing minutes (18:14-19:17) on all 8 symbols. The task's first scheduled run (19:19:23 UTC, result 0) correctly left the healthy app alone. `smoke_watchdog` 6/6.
  - **Not covered:** a reboot while nobody is logged on. The task runs at logon (Interactive principal); running whether or not logged on needs a password or an admin S4U principal — your call. Windows Update active hours are yours to set.
- **(j) 2026-10-09 — LIVE CANDLE CHART (Ashraf: "build a live candles chart on the app so I see it").**
  - `scripts/run_chart.mjs` serves **http://127.0.0.1:7444** (this computer only, read-only, never decides) and is supervised by run_twin.
    - `/api/bars`: closed candles from the verified 1m store at 1m/5m/15m/1h/4h/1d, plus the current bucket from closed minutes.
    - `/api/live`: the stream's quote and the FORMING minute, which the heartbeat now publishes every 1 s flagged `forming:true` — display only, never stored, never read by a decision.
    - It also returns the market-state geometry: `marketState.marketStateGeometry`, refactored out of `readMarketState` so the chart draws the SAME range and confirmation triggers the rule uses (market-state smoke 9/9 unchanged).
  - `ops/chart/index.html`: Lightweight Charts 4.1.3, all 8 symbols, 6 timeframes, range high/low and the bearish/bullish confirmation lines, live bid/ask/spread, state, last decision, data health; works at phone width.
  - Verified in the browser: LIVE pill, the 1m candle moving with ticks, no console errors. `smoke_chart` 5/5.
  - The desktop shortcut opens the chart plus the status window.
- **(k) 2026-10-09 — multi-market chart + measured lead study + macro + news** (Ashraf: "Main XAU, Silver, DXY, WTI and the majors that give early indication … give % for each … real data, zero guessing … add live news and full macros"; approved: rebuild DXY from 6 pairs · WTI shown DELAYED, no signals · chart + lead study first).
  - **Polygon reach (measured on the app key):**
    - LIVE: 12 more FX pairs + BTC/ETH.
    - Not entitled: I:VIX, I:SPX.
    - No bars: XPT/XPD.
    - Delayed 10 min: CL and GC futures; their tick trades/quotes are not entitled.
    - GLD options chain: open interest / IV / greeks as a DAILY snapshot only; option trades/quotes not entitled ⇒ positioning context, not live order flow.
    - News: `/v2/reference/news` — thin for gold, mostly ETF articles.
    - Macro: `/fed/v1` treasury yields (daily), inflation, inflation expectations, labor market.
  - **DXY rebuilt** (`src/data/dxy.js`): ICE formula on the six live pairs, per minute only where all six exist, close-based candles. **Validated vs the official daily DXY close: 2,427 days, median |diff| 0.032 %, p95 0.17 %.**
  - **Chart** (`run_chart.mjs` + `ops/chart/index.html`):
    - XAU main + three linked panes (Silver, DXY, WTI by default; each switchable), each with its own range + confirmation lines and state.
    - Drivers table; all-markets measured table; Macro and News panels.
    - WTI = CL front month (by session volume), DELAYED 10 min, excluded from every %.
    - The display allows a one-minute grace before STALE; decisions keep their strict wait.
  - **Lead study** (`scripts/study_xau_leaders.mjs` → `xau_leaders.json`; rules pre-registered in its header; geometry cross-checked 200/200 vs `marketStateGeometry`): 17 markets, 2013-07 → 2026-10-09, OOS = last 30 %. 9 candidates imported (`RESEARCH` in `symbols.js`).
    - **Agreement** (moves with gold, OOS): Silver 76.9 %, DXY 63.5 % (inverse), AUD 62.8 %, EUR 62.4 %, NZD 62.4 %, GBP 62.1 %, CHF 61.3 %, CNH 60.8 %, JPY 60.7 %, CAD 60.6 %, SEK 60.0 %, ZAR 59.8 %, MXN 56.4 %, INR 55.7 %, BTC 53.7 %, ETH 53.6 %, TRY 50.3 %.
    - **Lead** (the market confirms a 15m break while gold has not → gold follows): 46-53 % against a ~50 % base at 15 min / 1 h / 4 h, n ≈ 900-3,000 each.
    - ⇒ **USEFUL LEADERS: NONE.** The markets move WITH gold (same time), not before it — confirms Turbo2's "DXY co-moves, never leads". The chart shows these measured numbers only.
- **(l) 2026-10-09 — DXY strong-wall swings → gold 100 pips? MEASURED: volatility yes, direction no** (`scripts/study_dxy_wall_swings.mjs` → `dxy_wall_swings.json`; rules pre-registered in its header).
  - **Event:** DXY (rebuilt) touches a tested D/4H wall (causal radar levels) and swings ≥ 0.5·ATR4h away within 4 × 15m bars, confirmed at the close.
  - **Outcome:** does gold go +$10 the opposite way before −$10, within 4 h, on 1m?
  - **Primary test (pre-registered):** OOS 27.8 % vs base 24.9 %, p 0.027 ⇒ "significant" — but this metric did not control for volatility.
  - **Direction (added after the first run, flagged):** resolved win share **46.6 % OOS / 44.9 % TRAIN vs ≈ 50 % base.** By side: resistance → gold up 43.8 %, support → gold down 49.1 %.
  - ⇒ **No directional edge.** The swing marks ACTIVE markets: a $10 gold move in EITHER direction becomes likelier — 59.5 % of OOS events resolved within 4 h vs ≈ 50 % from any 15m close.
  - Lesson recorded: a "reach the target first" metric must be read against its mirror (the loss), not only the base.
- **(m) 2026-10-09 — FERRARI MATRIX scalp (Ashraf's Pine "Ferrari Central Master Control Suite") — built, measured, SHADOW, live as paper boxes.**
  - **Ashraf's ask:** "use the same method as in this script and open a trade Neon Box shows Entry price, TPs and use the min SL". Answers: WTI "as it shows in current live calculation time"; exits half at TP1, half at TP2; the box shows while a trade is open and disappears when it ends; one trade at a time.
  - **R0 EXCEPTION (explicit, Ashraf, this signal only):** WTI enters the Matrix's whale filter AS DELIVERED by Polygon (CL front month, 10 min delayed on our plan). Everywhere else WTI stays DISPLAY-only (labelled DELAYED). The backtest uses the identical delay (`wtiHourAt`).
  - **Code (one rule, one place):** `src/master/ferrariMatrix.js` (signals + money-path resolver), used by both `scripts/validate_ferrari_matrix.mjs` (gate) and `scripts/matrix_tick.mjs` (live). WTI reader `src/data/wti.js` (shared with the chart). WTI 1m history: `scripts/import_wti_1m.mjs` → `data/history/WTI/1m.jsonl` (2024-10-09 →, front month per session by volume). 3m timeframe added everywhere (store resampler, DXY, WTI, chart).
  - **Script look-ahead fixed in translation:** its DXY/silver `lookahead_on`, and its SELL needing `barstate.islast` (could never fire on history).
  - **Gate (pre-registered, `ferrari_matrix_gate.json`):** PRIMARY with WTI, 2 years: OOS n 1,327, WR 20.1 %, **−$0.91 per trade** [−1.83, +0.01], TRAIN −$0.27, 1/8 folds; S1 spread ×1.5 −$1.33. REPORT without WTI: 2y −$1.51, 13y −$0.61. 74 % of trades stop out; only 3 SELLs in 2 years. ⇒ **SHADOW.**
  - **Live (paper only):** `run_twin.mjs` runs `matrix_tick.mjs` 4 s after every 3m close (non-blocking). It waits for the stream to settle XAU + the six DXY pairs (fails closed: no new trade on unsettled data), replays an open trade on the verified 1m bars with the backtest resolver, journals `data/paper/matrix_trades.jsonl`, and keeps the box in `data/master/matrix_state.json`. Chart: `/api/matrix` + neon boxes on the main pane (green SNIPER TARGET ZONE entry→TP2, red RISK PROTECTION ZONE entry→SL, ENTRY/SL/TP1/TP2 lines, verdict tag "SHADOW — backtest −0.908/trade (paper)"); drawn only while XAUUSD is the main series and a trade is open. Sidebar panel "Ferrari Matrix scalp (3m) — paper".
  - **Proofs:** `smoke_ferrari_matrix` 7/7, including the WTI delivery delay, every resolver branch, signal causality (cutting the future never changes a signal), and LIVE-WINDOW PARITY (the 3-day live window gives exactly the full-history signals, both directions). `smoke_chart` 9/9, including `/api/matrix`. Browser-verified 2026-10-09 with an injected real signal (2026-10-09 07:57 BUY 4194.29).
- **(n) 2026-10-09 — Chart: compact drivers, 3m structure, 15m gold "whale" gauge (measured: no direction edge).**
  - **Ashraf:** "show the structure expected on 3m price action; DXY, WTI, Silver only show bullish/bearish … more space for the main XAU chart; check whales direction for XAU, bullish or bearish on 15m".
  - **Layout:** the gold chart fills the chart area. Silver / DXY / WTI become one strip of chips: 3m + 15m BULLISH/BEARISH = last CLOSED candle vs EMA10 of closes (the Matrix's DXY rule, one rule for all), with the implication for gold from `xau_leaders.json` signs. The full driver charts are behind "Show driver charts" (remembered per browser).
  - **3m structure** (`ferrariMatrix.matrixStructure`, written by `matrix_tick` into `matrix_state.structure`). On the gold chart: BUY wall / SELL wall lines (exactly where a box can trigger), the last confirmed swing low (a close below = CHoCH, the SELL condition), the swing high, and H/L markers for confirmed 5/5 swings on 3m. In the sidebar: swing structure (HH+HL / LH+LL / mixed) and the BUY-needs / SELL-needs checklist with every condition's live state. Refactor: `matrixLevelsAt` + `confirmedPivots` are now the ONE place for the walls/pivots. **No-drift proof:** the gate re-run is identical (9,932 signals, 3,398 trades, −$0.908; every report arm equal). Smoke "STRUCTURE = SIGNAL": on every sampled signal bar the checklist shows all conditions met.
  - **Whale data, measured:** Polygon gives CME gold futures (GC) 1m bars with real exchange volume, 10 min delayed, about 2 years back. Futures TRADES and QUOTES are NOT entitled (403), so there is no aggressor side, no buyer/seller split and no positions — true whale positioning is not in our data. Imported `data/history/GOLD_FUT/1m.jsonl` (706,283 bars, front month per session by volume, **CME active months GJMQVZ only** — a thin month had won partial sessions: GCK6, GCF7). One futures importer `scripts/import_futures_1m.mjs <WTI|GOLD_FUT>`, one live reader `src/data/wti.js` (`futFront`/`futBars`).
  - **Gauge** (`src/master/goldWhale.js`, rule pre-registered): GC 15m bars delivered (≥ 10 min old), last hour; big bar = volume ≥ 2× the prior day's median; pressure = volume-weighted close location of the big bars; BULLISH > +0.2 · BEARISH < −0.2 · MIXED · QUIET (no big bar).
  - **Study** (`scripts/study_gold_whale.mjs` → `gold_whale_study.json`): new BULL/BEAR readings → gold +$10 that way before −$10 within 4 h: **OOS 50.6 % vs 49.9 % drift baseline (n 1,414), TRAIN 50.6 % vs 50.1 %; 60-min sign agreement 48.8 % OOS ⇒ NO DIRECTION EDGE.** The chip shows the reading with "measured: no direction edge". It is context, never a signal input.
  - Smokes: `smoke_gold_whale` 4/4 (closed buckets, the delay, rule signs, verdict consistency), `smoke_ferrari_matrix` 8/8, `smoke_chart` 10/10 (`/api/bias` uses closed candles and respects the GC delay).
- **(o) 2026-10-09 — GLD GAMMA levels (built, forward test started) and FAIR VALUE GAPS (13 y: do NOT hold).**
  - **Ashraf:** "build gamma levels from GLD and test FVG" (after asking about gamma per candle, magnet walls, and "valid FVG where price will 100% bounce").
  - **Gamma — measured reach:** `/v3/snapshot/options/GLD` gives the CURRENT chain only (OI = prior close; a `date` parameter is ignored) → **no historical OI → no backtest possible.** Greeks + IV cover 98.3 % of OI (2,047 contracts with OI, ≤ 60 days). GLD stock minutes are 15 min delayed.
  - **Code:** `src/data/gldGamma.js` — dealer GEX (assumed convention: dealers long calls / short puts, stated): call wall, put wall, 5 magnets, regime by the total sign, and ZERO-GAMMA flip by Black-Scholes re-pricing of every contract with its own IV at spot ±10 % (r = 0, stated). Converted to XAU with the GLD/XAU ratio of the SAME minute (no pair = BLOCKED; coverage < 90 % = BLOCKED). `scripts/gamma_snapshot.mjs` records `data/options/gld/YYYY-MM-DD.json` (levels + the raw chain) — run_twin runs it each US weekday at 14:30 UTC, then `scripts/study_gamma_levels.mjs`.
  - **Forward test (pre-registered 2026-10-09):** the first touch of each level, approached from the side price was on, ±$7 race on the 1m bid, vs the same race at a random minute ±2 weeks; INSUFFICIENT until 100 resolved touches; HOLDS ⇔ Wilson LB > control. Day 1 (2026-10-09): POSITIVE gamma · call wall 4200 · put wall 4254.5 · flip ≈ 4175 (XAU).
  - **Chart:** gamma lines on the gold chart (γ CALL WALL cyan, γ PUT WALL magenta, γ ZERO-GAMMA flip yellow, magnets purple dotted) + a Gamma chip with regime, flip and forward-test progress, with show/hide. Context only until measured.
  - **FVG study** (`scripts/study_fvg.mjs` → `fvg_study.json`, pre-registered; 13 y of 1m bid). 3-candle gaps on 3m/15m/1h, ALL (≥ 0.1 ATR) and BIG (≥ 0.5 ATR); the first retest within 100 bars; 1:1 bounce (stop 0.1 ATR beyond the zone) vs a random-level control; money path with limit fill + measured spread.

    | Variant | OOS bounce | Control | $ per trade |
    |---|---|---|---|
    | 3m ALL | 42.0 % | 47.3 % | -0.48 |
    | 3m BIG | 46.7 % | 49.7 % | -0.52 |
    | 15m ALL | 48.2 % | 49.7 % | -0.55 |
    | 15m BIG | 48.9 % | 50.6 % | -0.54 |
    | 1h ALL | 49.0 % | 49.3 % | -0.65 |
    | 1h BIG | 49.9 % | 51.0 % | -0.60 |

    ⇒ **FVG_DOES_NOT_HOLD — no variant beats a random level; the best OOS bounce share is 49.9 % (nowhere near 100 %); every variant loses money.** Diagnostic without the touch-minute penalty: still ≈ control (3m 47.2 vs 47.3, 15m 49.9 vs 49.7, 1h BIG 50.1 vs 51.0). Shared race `src/master/bounceTest.js` (FVG + gamma). **Reproducibility (measured):** end-of-tape trades had been closed on the live last minute, so two OOS money numbers flipped between runs. FROZEN TAPE added (data stop at VAL_TO; an event counts only if its 24 h fit before it) → two consecutive runs: 0 differences. The table shows the frozen-tape values.
  - Smokes: `smoke_gamma_fvg` 6/6 (textbook BS gamma, GEX signs and walls, flip, race, both artifacts self-consistent), `smoke_chart` + `/api/gamma`.
- **(p) 2026-10-09 — TOOL 1 of Ashraf's one-by-one plan: FIBONACCI + INVERSE FIBONACCI on 9 timeframes — measured: no edge.**
  - **Ashraf's plan:** each tool is measured ALONE, then a "brain" combines only the tools that pass ("do it 1 by 1 … realistic data analysis not a guess"). Order: (1) Fib + inverse Fib · (2) EMA 20/50/200 · (3) previous-2-days / today's H/L · (4) volume profile (from the volume we actually have: spot tick activity, GC futures volume) · (5) Elliott Wave (a mechanical count) · (6) Gann box (re-test on twin data) · (7) brain. Choices: swing = the last confirmed swing (5/5 pivot); inverse = the same swing drawn the other way; EMA 20/50/200.
  - **Calendar candles added:** `backfillReader.CALENDAR_TF` (1w = Sunday 00:00 UTC, 1mo = calendar month), closed buckets only, through the one resampler.
  - **Code:** `src/master/fibLevels.js` (swing states, `fibPrice`; arithmetic fact: inverse r = normal 1−r, so only 7 distinct prices: 0.214/0.236/0.382/0.5/0.618/0.764/0.786, labelled with both names). The money path moved into `bounceTest.limitTrade` (FVG + Fib). Matrix sequence into `scripts/lib/matrix_trades.mjs` (gate + filter studies).
  - **FROZEN TAPE (all studies):** data stop at VAL_TO; an event or trade counts only if it fully resolves before it. FVG: 2 runs, 0 differences. Matrix gate re-run: identical (−0.908).
  - **Test A — do the levels hold?** (`study_fib_levels.mjs` → `fib_levels_study.json`; 63 cells, z 3.17). The same bounce test as FVG (±0.25·ATR(tf), random-level control, limit money path).
    - 4h–3m: **DOES NOT HOLD in all 42 cells.** OOS bounce vs control: 4h 48.3/49.4 · 1h 49.3/49.7 · 30m 50.3/48.7 · 15m 47.8/48.1 · **5m 39.3/45.2 · 3m 34.0/43.2** (lower-timeframe Fib levels get run through). Every timeframe loses money.
    - 1d/1w/1mo: UNDERPOWERED (OOS resolved 593 pooled / 92 / 19). Daily 48.6 vs 48.2 (no edge). Weekly 56.5 vs 43.5 pooled, but the Wilson LB is 40.3 and cells flip both ways — noise until years more data.
  - **Test B — does alignment raise Matrix confidence?** (`study_fib_matrix_filter.mjs` → `fib_matrix_filter.json`). ALIGNED(tf) = swing direction agrees with the trade AND the entry is within 0.25·ATR(tf) of a Fib price; score = aligned timeframes.
    - PRIMARY (with WTI, OOS): all 1,327 trades WR 20.1 %, −$0.91 · score ≥1 19.6 %, −$0.82 · ≥2 16.9 %, −$1.72 · ≥3 17.8 %, −$1.37 → **all FAIL; alignment LOWERS the win rate.**
    - 13y (no WTI): 16.2 % → 15.0–15.8 %, the same.
  - ⇒ Tool 1 does not go into the brain. Smoke `smoke_fib` 5/5.
- **(q) 2026-10-09 — TOOL 2: EMA 20 / 50 / 200 on 9 timeframes — measured: no edge.**
  - **Code:** `src/master/emaLevels.js` — EMA over closed-bar closes, SMA seed, VALID from bar 2n−1. **Monthly EMA200 is NOT computable** (159 months < 399), reported and never faked. Trend = close and EMA20 > 50 > 200 stacked (BULL / BEAR / MIXED). Scoring moved to `scripts/lib/study_stats.mjs` (one scoring for every tool). The Fib studies re-run on it: byte-identical.
  - **Test A — do EMAs hold as levels?** (`study_ema_levels.mjs` → `ema_levels_study.json`; 27 cells, z 2.90; arming = a bar closes clear of its EMA, one event per approach; same race / control / money as tool 1).
    - 4h → 3m: DOES NOT HOLD in all 18 cells. OOS bounce vs control (EMA20): 4h 45.5/51.8 · 1h 48.6/51.1 · 30m 49.4/49.6 · 15m 48.2/48.3 · **5m 39.0/45.8 · 3m 33.7/43.4**. Every cell loses money.
    - 1d: DOES NOT HOLD (EMA20/50); EMA200 UNDERPOWERED. 1w / 1mo: UNDERPOWERED. 1mo EMA200: not computable.
  - **Test B — does trend alignment raise Matrix confidence?** (`study_ema_matrix_filter.mjs` → `ema_matrix_filter.json`; 8 timeframes; filters score ≥2 / ≥4 / ≥6 / HTF 1w+1d+4h).
    - PRIMARY OOS: all 20.1 %, −$0.91 · ≥2 20.2 %, −$1.72 · ≥4 20.8 %, −$1.82 · ≥6 7.7 % (n 54, UNDERPOWERED) · HTF 23.9 %, −$1.53 → **no filter passes.**
    - 13y: HTF 16.2 → 17.9 %, −$0.33 (CI [−0.69, +0.03]), still negative.
    - Only higher-timeframe agreement moves the win rate up in both arms (+3.8 / +1.7 points), not enough to make money. Lower-timeframe alignment is inconsistent (2y: 15m aligned 9.7 % vs 21.6 %; 13y: 5m/3m aligned higher) → noise.
  - **RECURRING PATTERN (3 independent tests — FVG, Fib, EMA): on 5m/3m, levels are RUN THROUGH more than random levels** (bounce 34–42 % vs 43–47 % control). Candidate for its own pre-registered test (break-and-continue), not yet an edge.
  - ⇒ Tool 2 does not go into the brain. Smoke `smoke_ema` 5/5.
- **(r) 2026-10-09 — TOOL 3: PREVIOUS-2-DAYS and TODAY's HIGH / LOW — measured: no edge (they break, they are not magnets).**
  - **Code:** `src/master/dayLevels.js` — UTC days; a "previous day" needs ≥ 600 minutes (Sunday's ~2 h stub and holidays never become PDH/PDL); PDH/PDL, P2DH/P2DL, H48/L48; today's H/L only to the last CLOSED hour.
  - **A1 bounce** (`study_day_levels.mjs` → `day_levels_study.json`; 6 cells, z 2.39; D = 0.25·ATR14(1d), 24 h). OOS bounce vs control:
    - PDH 44.0/49.4 · PDL 47.1/49.4 · P2DH 45.5/51.1 · P2DL 47.8/50.0 · TDH 46.1/47.7 · TDL 48.7/48.1
    - → **all DO NOT HOLD; every one loses money (−$1.19 … −$1.69 per trade).** Prior-day highs and lows are broken MORE than random levels.
  - **A2 magnet** (4 cells, z 2.24): does price reach the level during the day vs the mirror level at the same distance? OOS hit vs mirror:
    - PDH 43.1/44.6 · PDL 38.1/40.6 · P2DH 33.1/34.1 · P2DL 31.2/32.0
    - → **NO MAGNET** (slightly below the mirror).
  - **B Matrix filter** (`study_day_matrix_filter.mjs` → `day_matrix_filter.json`; AT_LEVEL / BREAKOUT48 / TARGET48). PRIMARY OOS:
    - all 20.1 %, −$0.91 · AT_LEVEL 19.8 %, −$1.22 · BREAKOUT48 20.1 %, −$0.54 · TARGET48 19.8 %, −$0.87 → **all FAIL**.
    - 13y: BREAKOUT48 18.5 % vs 16.2 %, −$0.13 (CI includes 0; TRAIN −$0.74) → FAIL. Buying at the prior lows is the worst (14.9 %).
  - **The recurring pattern now holds in 4 independent tests** (FVG, Fib, EMA, day H/L): levels are broken more than random levels, never defended. The "break-and-continue" test is the natural next candidate (Ashraf to decide).
  - ⇒ Tool 3 does not go into the brain. Smoke `smoke_day_levels` 3/3.
- **(s) 2026-10-09 — TOOL 4: PREVIOUS-DAY VOLUME PROFILE (POC / VAH / VAL) — measured: no edge, from either volume source.**
  - **Volume we actually have (stated):** spot = tick activity (quote updates, 13 y); GC = real CME contracts (2 y), moved to spot by the same-minute basis. No true order flow.
  - **Check:** on 2026-10-08 the two sources agreed — spot tick-activity POC 4123.35 vs GC real-volume POC 4123.95 (basis $24.70); value areas within $0.60.
  - **Code:** `src/master/volumeProfile.js` (uniform spread over each minute's range, bin 0.02·ATR14(1d), 70 % value area grown from the POC). The day-level event logic is now shared in `scripts/lib/day_level_events.mjs` (tools 3 + 4); tool 3 re-run: identical.
  - **A1 bounce** (`study_volume_profile.mjs` → `volume_profile_study.json`; 6 cells, z 2.39). OOS bounce vs control:
    - SPOT: POC 48.6/50.4 · VAH 47.6/51.3 · VAL 49.1/47.0
    - FUT: POC 36.6/50.7 (n 159) · VAH 51.1/50.0 · VAL 48.3/50.0
    - → **all DO NOT HOLD; all lose money.**
  - **A2 "naked POC" magnet:** price reaches the prior POC on 58 % of days — but the mirror level at the same distance is reached as often (SPOT 58.1 vs 57.7; FUT 59.7 vs 56.7, TRAIN reversed) → **NO MAGNET** (distance, not volume).
  - **B Matrix filter** (`study_vp_matrix_filter.mjs` → `vp_matrix_filter.json`; AT_VAL / OUTSIDE_VAL / POC_TARGET). PRIMARY OOS:
    - all 20.1 %, −$0.91 · AT_VAL 16.6 %, −$1.38 · OUTSIDE_VAL 20.5 %, −$0.84 · POC_TARGET 20.6 %, −$0.58 → **all FAIL** (13y the same).
  - ⇒ Tool 4 does not go into the brain. Smoke `smoke_volume_profile` 3/3.
  - **PENDING (Ashraf 2026-10-09, after the tool plan):** in-trade confidence monitor — measured live TP1%/TP2% from replaying past Matrix trades minute by minute (price position, time in trade, MAE/MFE, DXY/silver since entry, tick activity), calibrated out of sample vs the no-information baseline; a close-advice rule only if it beats holding in dollars. Order-book depth / bid-ask resting orders are NOT in our data (top of book only; futures trades/quotes not entitled).
- **(t) 2026-10-09 — TOOL 5: MECHANICAL ELLIOTT WAVE (wave 5 + ABC correction) — measured: no edge.**
  - **Code:** `src/master/elliott.js` — confirmed 5/5 pivots → causal alternating zig-zag; W5 = a 1-2-3-4 obeying the three hard rules in stage-4 form (wave 2 holds the start; wave 3 beyond wave 1 and ≥ it, so never the shortest; wave 4 does not overlap wave 1); ABC = after a complete 5-wave impulse (wave 3 not the shortest), the correction toward the wave-4 level. Each instance is emitted once. Ashraf chose "the proposed count + the ABC correction".
  - **A** (`study_elliott.mjs` → `elliott_study.json`; 8 cells, z 2.50; act at the close that confirms the pattern; random-distance control; market-entry money path).
    - 15m: W5 45.5 % vs 47.3 % control · ABC 49.2 vs 46.1
    - 1h: W5 50.0 vs 53.6 · ABC 48.3 vs 42.0
    - → **DOES NOT PLAY OUT.** W5 loses to the control; ABC tilts in its favour in both halves on 15m/1h but is not significant and loses money at 1:1 (−$2.3 to −$2.8 per trade).
    - 4h / 1d: UNDERPOWERED (54 / 11 OOS patterns).
  - **B Matrix filter** (`study_elliott_matrix_filter.mjs` → `elliott_matrix_filter.json`).
    - PRIMARY: W5_WITH 15.7 % (n 95) · W5_WITH_HTF 14.0 % (n 64) — both UNDERPOWERED · NO_ABC_AGAINST 18.8 %, −$0.99 → FAIL.
    - 13y: W5_WITH 17.6 % vs 16.2 %, −$0.40 → FAIL.
  - ⇒ Tool 5 does not go into the brain. Smoke `smoke_elliott` 5/5.
- **(u) 2026-10-09 — TOOL 6: GANN BOX (price + time) — price levels: no edge; TIME: a REAL, replicated swing-timing effect (non-directional).**
  - **Code:** `src/master/gannBox.js` — box = the last confirmed swing; price = the eighths not already tested as Fib (1/8 … 7/8 without ½); time = swing end + ½ / 1 / 2 × the swing's own duration. Ashraf chose "price + time".
  - **A1 price** (`study_gann.mjs` → `gann_study.json`; 18 cells, z 2.77): **1h / 4h DO NOT HOLD (all lose money); 1d UNDERPOWERED.**
  - **A2 time, pre-registered** (9 cells, z 2.54; a confirmed pivot within ±3 bars of the projected time vs a random f′ ∈ [0.25, 2.5] window): "TIME_TURNS" in 5 cells.
  - **DIAGNOSTIC — measured, not inferred** (`diagnose_gann_time.mjs` → `gann_time_diagnostic{,_train}.json`). The random-f′ control ignores that the pivot chance depends on elapsed time since the swing end. The proper null keeps the elapsed-time distribution and breaks only the link to the swing's OWN duration: 2,000 shuffled-duration permutations, REAL ⇔ p < 0.05/9.
    - **Artifacts (vanish under the shuffle):** 1h 2×, 4h 1×, 4h 2×.
    - **REAL in the same 3 cells on BOTH halves (p 0.0005, the minimum for 2,000 permutations):**

      | Cell | OOS actual | Shuffled null | TRAIN actual | Shuffled null |
      |---|---|---|---|---|
      | 1h ½× | 62.5 % | 55.9 % | 62.0 % | 55.0 % |
      | 1h 1× | 62.5 % | 58.3 % | 61.8 % | 57.4 % |
      | 4h ½× | 61.6 % | 50.7 % | 64.5 % | 52.6 % |

      1d: not significant.
    - **Meaning:** swing TIMING has structure — the next swing high OR low tends to arrive at about ½× (1h, 4h) or 1× (1h) of the previous swing's own duration. It says WHEN, not WHICH WAY.
  - **B Matrix filter** (`study_gann_matrix_filter.mjs` → `gann_matrix_filter.json`): NEAR_TIME_TURN (all fractions, any tf — 85 % of trades) 20.6 % vs 20.1 %, −$0.96 · AT_GANN_LEVEL 18.5 % · BOTH 18.9 % → **all FAIL** (13y the same).
  - ⇒ The price part stays out. The time effect is the FIRST measured, replicated component of the plan. It is non-directional, so its trade value needs its own pre-registered test (direction + money) before the brain can use it. Smoke `smoke_gann` 4/4.
- **(v) 2026-10-09 — Gann TIME + DIRECTION: the real timing effect is NOT tradeable as a reversal.**
  - **Test** (`study_gann_time_direction.mjs` → `gann_time_direction.json`, pre-registered): at the start of each measured turn window (1h ½×, 1h 1×, 4h ½×), trade the REVERSAL of the move since the swing end; stop beyond the extreme since then + 0.5·ATR, 1:1 target, 10-bar horizon, market entry at the ask; vs the same rule at shuffled-duration (elapsed-time matched) windows.
  - **OOS:**
    - 1h ½×: WR 48.3 %, −$0.94/t (control −$0.38)
    - 1h 1×: 46.3 %, −$0.93 (control +$0.06)
    - 4h ½×: 47.4 %, −$1.00 (control −$0.59)
    - TRAIN negative in all three → **NOT TRADEABLE.**
  - Turns come ON TIME but their DIRECTION is not the reversal of the move since the swing end.
- **PLAN STATUS after tools 1-6: no component passes a money test.** The brain (tool 7) has nothing validated to combine. Pending: the in-trade TP1/TP2 monitor (Ashraf), and the "levels get broken" break-and-continue test (seen in 4 tools).
- **(w) 2026-10-09 — Chart: right-panel toggle + readable price axis; STRONG FVG measured and marked.**
  - **Price axis — measured root cause:** the page had a vertical scrollbar (the header grew past the fixed `100vh − 54px`). The chart sized to 890 px, then the scrollbar took 15 px, and the price axis sat under the side panel ("420" for "4209").
    - Fix: full-height flex page with no page scroll on desktop; chart column `minmax(0, 1fr)` and clipped; right price axis `minimumWidth` 84 px (the widest label is 43 px of text).
    - Verified by measurement: scrollbar 0 px, chart width = column width, axis 84 px. The preview browser does not repaint canvases (requestAnimationFrame measured not firing), so no screenshot of the canvas.
    - **Panel ▸ button** hides / shows the right panel (remembered per browser).
  - **STRONG FVG** (`study_fvg_strong.mjs` → `fvg_strong_study.json`, pre-registered; rule in `src/master/fvg.js`).
    - STRONG = BIG ≥ 0.5 ATR + displacement body ≥ 1.5 ATR + activity ≥ 1.5× the 20-bar mean + 1h AND 4h EMA stacks agree + first retest ≤ 20 bars. Frontier X = 0.1 / 0.25 / 0.5 / 1 ATR beyond the zone vs a random-level control, plus money.
    - **3m (OOS n 109), bounce vs control and $ per trade:** X0.1 87.2/84.4, −$1.12 · X0.25 82.6/80.7, −$0.99 · X0.5 74.3/68.8, −$0.94 · X1 61.5/56.0, −$0.72 → **DOES NOT HOLD.**
    - 15m (n 41) and 1h (n 17): UNDERPOWERED. **No cell reaches 95 %.** High bounce shares at small X are the target size (the control gets them too) — the WR↔R:R wall.
    - Strong FVGs are rare: 9 on 3m, 3 on 15m and 1 on 1h in the last 60 days.
  - **Marks:** `/api/fvg?tf=3m|15m|1h` + dashed boxes on the gold chart for ACTIVE strong FVGs (not broken through the stop line, ≤ 100 bars old). Every label carries the measured 13 y result (bounce vs random, $ per trade, n) — a mark is a measured statement, never a promise.
  - Smokes: `smoke_gamma_fvg` 7/7 (strong rule unit + artifact), `smoke_chart` 12/12 (layout + `/api/fvg`).
- **(x) 2026-10-09 — NEWS & MACRO audit + USD ECONOMIC CALENDAR with gold's MEASURED reaction.**
  - **Audit (measured):** the old News panel was NOT timely. Polygon's gold-ticker news: newest item 25.7 h old, next 24 days. Polygon's general feed is equity press releases (3 "macro" hits in 24 h, all false matches). Benzinga news / earnings via Polygon: NOT entitled (403). Macro (/fed): correct but daily / monthly (10y yield 2 days behind; the CPI series monthly). Neither could show an immediate gold reading.
  - **Calendar** (`src/data/calendar.js`, `scripts/fetch_calendar.mjs` → `data/calendar/upcoming.json` + `history.json`). USD only — Ashraf: "only the data related for XAU and USD"; Forex Factory has no XAU events.
    - **Forex Factory:** the calendar page embeds every event as JSON (UTC `dateline`, impact, actual / forecast / previous). Node fetch gets 403 → fetched with curl; the JSON feed rate-limits (429).
    - **Fed FOMC:** `fomccalendars.htm` + `fomchistorical{YYYY}` — 119 decisions 2013 → 2027, statement 14:00 ET. Fixed: two-month meetings ("Jan/Feb 31-1").
    - **BLS:** `bls_releases.json`, saved via the in-app browser because BLS returns 403 to curl and the Windows web client. CPI / NFP / PPI / JOLTS since 2013 + the `.ics` upcoming schedule.
    - **Polygon:** market holidays.
    - ET → UTC is DST-aware (Intl).
    - **Cross-check:** Forex Factory vs official times — CPI 10-14 and PPI 10-15 both agree.
  - **Schedule:** run_twin runs the fetch every 30 min, plus 2 and 6 min after each high-impact release (captures the actual — verified live: UoM sentiment A 46.3 / F 47.5 appeared 2 min after release).
  - **Gold's reaction** (`study_event_reaction.mjs` → `event_reaction_study.json`, pre-registered, 13 y, official times):

    | Release | 1 h range vs the same hour on 20 quiet days | Median move | First 5-min move persists? |
    |---|---|---|---|
    | FOMC | 5.28× (95 % > 2×), still 2.2× for 1-4 h | $7.56 | no |
    | NFP | 2.63× (72 %) | $6.40 | no |
    | CPI | 1.59× | $4.09 | no |
    | PPI | 1.18× | $2.86 | no |
    | JOLTS | 1.10× | $2.78 | no |

    Direction after 1 h ≈ a coin flip (45-59 %, mostly gold's own drift). **The honest immediate reading: a big move of known size, no predictable direction.**
  - **Chart:** a "USD calendar — what moves gold" panel (local + UTC time, countdown, impact, A / F / P, the measured reaction line, source health, BLS-file age warning > 30 days, next US holiday). A warning chip in the top strip from 30 min before to 60 min after each high-impact release.
  - Smokes: `smoke_calendar` 4/4 (DST, FOMC 8/yr, BLS counts, cross-check, study verdicts), `smoke_chart` 13/13.
- **(y) 2026-10-09 — IN-TRADE MONITOR: live chance of TP1 / TP2 for the open Matrix trade.**
  - **Ashraf:** "give a confidence % to stay on the trade or advice to close it when we see the real risk".
  - **Data limit (stated):** no order book / resting bid-ask orders on our plan (top of book only; futures trades and quotes not entitled).
  - **Study** (`study_trade_monitor.mjs`, pre-registered):
    - **Replay:** every Matrix trade minute by minute with the exact resolver rules. **Parity 17,090 / 17,090 (13 y, no WTI) and 3,398 / 3,398 (live strategy with WTI); 746 k + 85 k samples.**
    - **Fitted model:** logistic per phase (position, minutes, MAE/MFE, DXY and silver since entry, tick activity); TRAIN before 2023; OOS 2023+ and the WTI arm.
    - **Result: NOT VALID.** It beats the position formula on TRAIN (Brier 0.152 vs 0.157 — fit converged; 400 = 3,000 iterations), but is WORSE out of sample (0.197 vs 0.194; W2 0.205 vs 0.201) — the extra inputs do not carry from 2013-2022 to 2023+.
    - **The position formula itself** (phase 1: (bid − SL)/(TP1 − SL); phase 2: (bid − fill)/(TP2 − fill); no fitted parameters) **is CALIBRATED out of sample**: TP1 within 2.2 points on both arms; TP2 within 3.7 (13y) / 5.9 (W2). Labelled as a post-hoc check of a parameter-free formula.
    - **Close advice:** exit when P < θ (θ 0.35 chosen on TRAIN, +$0.25) → OOS 13y +$0.009 (bound −$0.23), live strategy −$0.23 → **NOT SHOWN: no close rule beats holding.**
  - **Live:** `src/master/tradeMonitor.liveMonitor` (pure; phase from `resolveMatrixTrade` — the same rules) → `/api/monitor` → the Matrix panel shows TP1 % / TP2 % bars, the worst / best so far, the measured accuracy, and that the model and the close advice are not validated. The trade box tag shows TP1 % · TP2 %. Updated every 5 s.
  - Smokes: `smoke_trade_monitor` 3/3 (formula, the REAL 11:18 trade open at 11:40 and SL at the end, study verdicts + calibration), `smoke_chart` + `/api/monitor`.
- **(z) 2026-10-09 — BREAK-AND-CONTINUE on 3m / 5m — NOT tradeable; the "levels get broken" pattern explained.**
  - **Test** (`study_break_continue.mjs` → `break_continue_study.json`, pre-registered; money path `bounceTest.stopEntryTrade`). At every FIB / EMA / FVG touch from the earlier studies: a STOP order 0.1·ATR beyond the level in the break direction (valid 10 bars), stop D back, target D onward (1:1), D ∈ {0.25, 0.5, 1}·ATR. Control: the identical order at a random price ±2 weeks.
  - **Result: 18 / 18 cells NOT TRADEABLE.** Every cell loses money AND does worse than the random-price control.
    - 3m, D = 1·ATR: FIB WR 32.3 %, −$0.58 (control −$0.54) · EMA 31.4 %, −$0.59 (control −$0.52) · FVG 28.4 %, −$0.72 (control −$0.51)
    - 5m the same. Small D is worse (spread + slippage eat a 0.25·ATR target).
  - **Why the earlier "levels get broken" did not become an edge:** measured on FVG (`study_fvg.mjs`) — 19.8 % of 3m touches happen in a minute that already runs through the zone (counted as a bounce failure). Without that touch-minute effect, FVGs bounce like random levels (47.2 vs 47.3 %). So the pattern = price ARRIVES at low-tf levels fast, not a continuation after the break. Fib / EMA: the same explanation is likely but NOT separately measured.
  - Smoke `smoke_break_continue` 3/3 (stop-entry fills on the correct side, the fill-minute stop, the order window, verdicts). The first fixtures were wrong (both triggering minutes also touched the stop — correctly booked as losses by the code); fixed.
  - **Scoreboard after the plan:** Fib, EMA, day H/L, volume profile, Elliott, Gann price, FVG, strong FVG, break-and-continue — no edge. Gann time — real but not tradeable. Gamma — forward test. Calendar — size, not direction. In-trade monitor — the position formula is calibrated; no model or close rule beats it.
- **(aa) 2026-10-09 — RELEASE BRACKET (trade the SIZE of FOMC / NFP / CPI without the direction) — FAILS, confirmed on real ticks.**
  - **1m study** (`study_release_bracket.mjs` → `release_bracket_study.json`, pre-registered). Buy-stop / sell-stop at P0 ± k·ATR1h one minute before the release (one-cancels-other, live to T+15 m), stop at P0, target TM×risk, 4 h; spread ×1 / ×2 / ×3. **12 / 12 FAIL — negative even at ×1 spread** (OOS −$1.7 … −$3.6 per event).
    - DIAGNOSTIC (counts only; results unchanged): most events end INSIDE the release minute (FOMC k0.25: 33 both-triggered, 49 fill-minute stops, 16 targets). 1m bars cannot order the fill and the stop there (the release bar opens AT P0), so the 1m verdict rested on a pessimistic assumption.
  - **Settled on REAL TICKS:**
    - `fetch_release_ticks.mjs`: Polygon `/v3/quotes/C:XAU-USD`, measured available; 420 releases T−2 … T+30 min, 236 MB → `data/calendar/release_ticks/`.
    - **Data fact:** 2021-2024 ticks are THIN (~3 quotes per minute) and are excluded by the pre-registered ≥ 200-quotes rule; 259 events are usable.
    - `study_release_bracket_ticks.mjs` (pre-registered; fills at the triggering tick's ask / bid + 0.02·ATR, real release spread, ticks to T+30 m, then 1m).
    - **TRAIN (2013-2020, dense ticks, n 57-85 per type): every one of the 12 cells loses, −$1.36 … −$3.10 per event, wins 11-19 %; the stop is hit on ticks in most trades — the release whipsaw is REAL.** OOS: 9-12 usable events → UNDERPOWERED by rule, but the cell cannot pass (it also needs TRAIN > 0).
  - ⇒ **The release size is real, but a bracket cannot capture it: gold spikes one way and snaps back through the pre-release price.** Not built into the app. Smoke `smoke_release_bracket` 2/2.
- **(ab) 2026-10-09 — RETAIL SALES and FED SPEECHES measured (official sources).**
  - **Forex Factory archive NOT used:** forexfactory.com now answers scripted requests with a Cloudflare challenge (even `robots.txt`) — a no-bots signal, not bypassed. The light live calendar fetch (2 pages / 30 min) still works and stays.
  - **Retail Sales:** `data/calendar/retail_sales_releases.json`.
    - Release = an ALFRED (St. Louis Fed) vintage of series RSAFS on which a NEW reference month appeared — measured by downloading every vintage via the in-app browser (ALFRED refuses scripted connections here). 165 releases 2013 → 2026; 14 non-release vintages excluded (annual revisions every late April + page dates).
    - Cross-check: all 12 Census-scheduled dates 2025-11 → 2026-09 present. Time 08:30 ET (Census: "Release Date at 8:30 am for sales").
  - **Fed speeches:** `federalreserve.gov/json/ne-speeches.json` (`calendar.fetchFedSpeeches`) — Board only (Chair / Vice Chairs / Governors), 1,135 of 1,348 with a start time; no-time entries dropped. **Times are ET — measured: Waller 10-08 08:30 UTC and Bowman 10-06 14:45 UTC = Forex Factory.** Regional Fed presidents are not in the list → shown as not measured.
  - **Study** (`study_event_reaction.mjs` extended, rules added before the run): a speech counts only if no scheduled release lies within ±2 h and it is not on an FOMC day; the quiet-day baseline now excludes RETAIL days (the original five moved slightly: CPI 1.59 → 1.68×, FOMC 5.28 → 5.30×).
    - **RETAIL** n 155: 1.35× range (21 % > 2×), median $3.21, first move does NOT persist.
    - **FED_CHAIR** n 109: 1.34× (35 % > 2×), median $1.87. OOS persistence 67 % but TRAIN 37 % (contradicts) → NOT persisting.
    - **FED_GOV** n 547: 1.04× — practically no effect.
  - **Chart:** Retail Sales and Fed Chair rows (and Board-member "FOMC Member X Speaks" rows) carry their measured line. Smoke `smoke_calendar` 5/5.
- **(ac) 2026-10-09 — Ferrari Matrix WITHOUT the WTI filter (looser, more trades) — SHADOW.**
  - **Context:** Ashraf asked why no trades had triggered since 12:51 UTC. Measured: 139 / 139 ticks OK, data live; 5 setups today (3 before live paper trading began, 11:15 taken → SL, 11:18 skipped while it was open). After 12:51, 120 bars with no full setup: price reached the BUY wall 10× but WTI agreed only 3× and DXY 4×.
  - **Test:** `validate_ferrari_matrix.mjs` gained `MATRIX_VARIANT=nowti` (the same pre-registered gate; primary = 13 y, since WTI history is not needed) → `ferrari_matrix_nowti_gate.json`.
    - 17,090 trades, 3.54/day (6.33/day over the last 2 y).
    - OOS WR 16.2 %, **−$0.61 per trade [−0.82, −0.40]**; TRAIN −$0.71; **0 / 8 folds positive.**
    - Spread ×1.5: −$0.84. Last 2 y: −$1.51.
    - **⇒ SHADOW (C2, C3, C4, S1 failed).** More trades, more losses.
  - The default (with WTI) gate re-ran byte-identical. Smoke `smoke_matrix_variants` 2/2.
- **(ad) 2026-10-09 — AUDIT "are we missing opportunities?" — pipeline: nothing missed; the near-misses: not worth taking.**
  - **Ashraf's question** (after the 16:33 / 16:36 near-misses — gold then rallied 4185.03 → 4201.90 by 18:51; a 16:36 BUY would have made +$11.71/oz; blocked by a red candle at 16:33 and by DXY 0.0008 above its EMA10 at 16:36 — a margin inside the rebuilt-vs-ICE DXY difference, so TradingView may have shown it).
  - **Pipeline audit:** 216 matrix ticks since live start 08:54 UTC = every 3m close; 0 failed, 0 slow. The only full setups after the start: 11:15 (traded → SL −$7.13, journaled) and 11:18 (skipped by the one-trade-at-a-time rule). **Nothing missed by the app.**
  - **Strategy audit:** `ferrariMatrix.matrixSignals` gained the test-only option `maxMiss` (default 0 = the script exactly; the live tick never sets it; the default gate re-ran byte-identical). `MATRIX_VARIANT=onemiss` (the same gate; the wall required, any ONE of WTI / DXY / candle or CHoCH may fail) → `ferrari_matrix_onemiss_gate.json`:
    - 9.23 trades/day; OOS WR 17.9 %, **−$1.50 per trade** [−2.06, −0.91]; TRAIN −$0.35; **0 / 8 folds**; spread ×1.5 −$1.95.
    - 13 y without WTI: −$0.62. **⇒ SHADOW — the near-misses lose on average; skipping them costs nothing.**
  - Smoke `smoke_matrix_variants` 3/3, `smoke_ferrari_matrix` 8/8.
- **(ae) 2026-10-11 — ORDER-FLOW FOOTPRINT (Trader Dale's 5 confirmations) on REAL CME gold order flow — no confirmation passes; the live-feed question answered.**
  - **Source:** Trader Dale, "ORDER FLOW: How to Read Buyers & Sellers at Key Levels" — full transcript pasted by Ashraf. Spec with pre-registered numbers: `docs/ORDERFLOW_FOOTPRINT_SPEC.md` (stop / target are ours — the video gives none).
  - **Data:** Databento GLBX.MDP3 `tbbo`, GC front month, 2024-10-01 → 2026-10-09.
    - Batch job GLBX-20261011-VMH877ECCK; quoted $114.45 of the free $125 credit; 28 files, every SHA-256 verified.
    - **TEST-ONLY — the R0 exception Ashraf approved 2026-10-11**; never used live.
    - Massive Futures Starter has NO trades / quotes (measured 403; the pricing page: trades + top-of-book from Developer $79, real-time from Advanced $199; depth of book "coming soon" on every tier). Massive futures trades carry NO aggressor field.
  - **Footprints** (`build_footprints.mjs`): 54.86 M trades → 142,922 five-minute footprints + 709,399 one-minute bars; 0 roll-mixed bars.
    - **Live-feasibility measured: inferring the side from the bid/ask (what Massive Advanced would have to do) agrees with the exchange flag on 99.6 % of trades** (quote rule 100 % on 98.4 %; tick rule 74 % on the rest). Caveat: here the BBO comes from the same feed; Massive's separate streams may sync slightly worse.
  - **Study** (`study_orderflow_footprint.mjs`; 32 cells = {prev-day volume profile, prev-day H/L} × {each confirmation, ≥1, ≥2, ≥3} × {1 R, 2 R}; 1,451 first touches). **NO cell passes (exchange sides AND inferred sides)**: every powered cell loses; most single-confirmation cells are UNDERPOWERED (first-touch-only gives few trades in 2 y).
  - **Diagnostic** (post-hoc, pooled, 1 R) — win rate by confirmation count:
    - VP levels: 0 → 38.7 % · 1 → 34.2 % · 2 → 45.1 % · 3+ → 49.7 % (+$0.44/t, n 157)
    - H/L levels: 41.2 · 34.3 · 42.5 · 46.4 %
    - More confirmations help a little, but one confirmation is WORSE than none and the confidence intervals overlap → not established.
  - **⇒ Do NOT buy Massive Advanced for this yet.** If pursued: Massive Futures Developer ($79, one month) gives 5 y of GC trades + quotes (inferred sides proven 99.6 % equivalent) — about 2.5× the touches to settle the "3+ confirmations at VP levels" pocket.
  - Smoke `smoke_orderflow` 3/3.
- **(af) 2026-10-11 — Order-flow footprint on 5m / 15m / 30m / 1H / 4H — no timeframe passes; no consistent win-rate lift.**
  - **Ashraf:** "make it on 5m, 15m, 30m, 1H, 4H … the 5 confirmations only at the S/R". Confirmations were (and are) evaluated ONLY at valid S/R — the previous-day volume-profile POC / VAH / VAL and the previous-day high / low, first touch only, with the confirming cell within 0.5·ATR of the level.
  - `study_orderflow_footprint.mjs --tf=…`: the same rules; footprints = exact sums of the 5m footprints; horizon 96 bars of the timeframe; α = 0.05/160. The original 5m run reproduces byte-identical without `--tf`.
  - **PASS 0 / 32 on every timeframe.**
  - Win rate by confirmation count (pooled, 1 R; VP / H-L):

    | Timeframe | 0 | 1 | 2 | 3+ |
    |---|---|---|---|---|
    | 5m | 38.7 / 41.2 % | 34.2 / 34.3 | 45.1 / 42.5 | 49.7 / 46.4 |
    | 15m | 43.8 / 43.5 | 36.0 / 24.5 | 44.0 / 37.4 | 46.7 / 51.5 |
    | 30m | 45.4 / 47.1 | 34.3 / 23.4 | 46.2 / 42.0 | 41.4 / 37.4 |
    | 1H | 42.7 / 56.5 | 33.2 / 34.4 | 40.6 / 43.6 | **54.5 / 55.0** (+$1.36 / +$5.04) |
    | 4H | 49.1 / 41.2 | 33.6 / 35.3 | 39.1 / 47.3 | 52.5 / 48.5 |

  - **The only consistent fact: exactly ONE confirmation is the WORST on every timeframe (≈ 33-36 %).** 3+ is best on 1H / 4H / 5m but NOT on 15m / 30m → no robust lift.
  - **Best single cell:** 1H H/L 3+ at 1 R — OOS WR 69 %, bound > 0, but n 52 (< 100) and TRAIN −$1.77 → halves contradict → UNDERPOWERED, not an edge.
  - Smoke `smoke_orderflow` 8/8.

- **(ag) 2026-10-11 — Order blocks (13 y spot) + order flow at 1H swing S/R and VP/H-L confluence — nothing holds.**
  - **Order blocks** (`src/master/orderBlock.js`, `scripts/study_order_block.mjs` → `data/master/order_block_study.json`; rules pre-registered in the script header): 4 tf × {ALL, STRONG} × {1R, 2R} = 16 cells → **0 HOLD**. First retest bounces = a random level (5m 50.1 % vs 49.5 %, 15m 49.8 vs 50.3, 1h 48.9 vs 49.7, 4h 50.0 vs 47.0 at 1R); every cell loses money (−$0.30 … −$0.89/t). STRONG (disp ≥ 2.5 ATR + vol ≥ 1.5×) is not better; **the strongest displacement bucket (≥ 3.5 ATR) bounces LESS than random on 5m/1h/4h** (47 / 42 / 38 %). Descriptive only: weak 4h OBs (1.5-2 ATR) 56 % vs 47 %, +$1.19/t, n 431 — post-hoc, not a pass.
  - **Order flow, new levels** (`study_orderflow_footprint.mjs --levels=new`, α 0.05/320): L-SW1H (2 nearest unbroken 1h swing highs + lows) and L-CONF (prev-day H/L with a VP level within 0.5 ATR) on 5m-4H → **0/32 on every timeframe**. Best: 1H swing + 3+ confirmations 51.8 % +$2.38/t (n 189; OOS 56 % +$4.96 n 84, TRAIN 48.6 % +$0.32) → UNDERPOWERED. Confluence leaves 12-55 trades per count → unmeasurable. Original 5m run re-verified byte-identical.
  - Smokes: `smoke_order_block` 4/4 (new, in smoke_all), `smoke_orderflow` 13/13.

- **(ah) 2026-10-11 — Weak 4H order blocks (disp 1.5-2 ATR): NOT CONFIRMED** (`scripts/study_ob_weak4h.mjs` → `data/master/ob_weak4h_confirm.json`, 4 tests pre-registered in the header). T1 the unseen TRAIN 60 %: bounce 49.7 % = random 49.8 %, −$0.74/t ✗ · T2 positive years 4/14 (2013-2021 lose every year; 2022, 2024-26 positive) ✗ · T3 spread × 1.5 bound < 0 ✗ · T4 1.75-2 ATR half loses ✗. MEASURED cause: BUY trades 2022-26 (+$2.45/t, bounce 61.7 % vs 52.9 % random, n 243); BUY 2013-21 −$0.63, SELL 2022-26 = random → the lead was gold's bull run, not the order block. Frontier: 0.25 R target = 74 % WR yet −$0.09/t (WR is a price).

- **(ai) 2026-10-11 — STRONG (multi-touch) S/R levels: they do NOT bounce more than random, and the 5 order-flow confirmations add nothing at them.** Spec `docs/ORDERFLOW_FOOTPRINT_SPEC.md` Part 4 (pre-registered); rule `src/master/strongLevels.js` (1h pivot clusters, 10 days, 0.1 × ATR1d).
  - **Step A** (`study_strong_levels.mjs`, 13 y spot, 0.25 ATR1d each way): ≥2 touches 48.7 % vs random 47.9 % · **≥3 touches 48.2 % vs 47.8 %** · ≥4 touches 48.7 % vs 48.3 %. All lose (−$0.88 … −$1.18/t, n 1,361-2,426 OOS) → 0/3 hold. About 4.3 strong levels per day.
  - **Step B** (`study_orderflow_footprint.mjs --tf=5m --levels=strong`, 2 y CME, 1 R): 0/32 pass. By count at ≥3-touch levels: **0 confirmations 56 % (n 41)** · 1 → 33 % · 2 → 37 % · 3+ → 48 %. All negative $; C3 trapped 50 % (n 16), C4 aggressive 48 %, C5 delta flip 44 %. Same as every earlier level family.
  - The original 5m run was re-verified byte-identical. Smoke `smoke_strong_levels` 4/4 (in smoke_all).

- **(aj) 2026-10-11 — EVERYTHING COMBINED** (levels of every family + 5 confirmations + delta/volume + trend/RSI context; one GBDT, monthly walk-forward; spec Part 5; `study_orderflow_combined.mjs` → `orderflow_combined_study.json`) → **FAIL**.
  - 1,595 merged 5m touch events, 978 out of sample. At 1 R:

| Selection | WR | $ / trade | Trades |
|---|---|---|---|
| All | 45.2 % | −$0.95 | 978 |
| **Taken (top 30 %)** | **45.8 %** | **−$2.06** | 273 (≈ 0.8 / weekday) |
| Top 10 % | 46.4 % | −$1.94 | — |

  - Combining adds nothing. The model leans on distance / volume / delta features, which do not rank outcomes.
  - The `--dump` flag was added to `study_orderflow_footprint.mjs`; earlier outputs are unchanged.

- **(ak) 2026-10-14 — Feed audit + "refresh after every restart" made reliable.**
  - **Forward test was never running.**
    - Commit 58676fd (`git add -A` over a stale working copy) had reverted the parallel session's forward-test work: `forward_buyd1.mjs` deleted, the `--forward` modes of `build_dataset` / `build_features2`, the hourly hook in `run_twin`, and the doc section.
    - It was restored exactly from efddef6 (nothing changed those files after), then caught up: 3 signals / 3 resolved / 3 wins.
    - The hook was verified running on schedule (09:23 UTC, exit 0).
    - Root cause of an earlier corrupt smoke line, also confirmed: Python heredoc edits turn an escaped newline into a real newline. Both new cases were fixed with exact edits; all 206 scripts pass `node --check`.
  - **Restarts:** the PC slept 10-13 10:42-10:52 and 10-14 10:26-10:49 (local), and rebooted on 10-12. The watchdog (5 min) relaunched the app each time and the stream refilled from the last stored minute. 7-day completeness vs Polygon: **0 missing minutes on all 8 markets**.
  - **Reconcile fixed** (`src/core/reconcilePlan.js`, smoke `smoke_reconcile_plan` 4/4). Measured problems: it ran only at 00:20-00:59 UTC (skipped when the PC was asleep or off); it looked back only 2 days; and a DNS failure on 10-14 was logged as success. **Now:**
    - it runs at every app start (after 2 min) + daily whenever the last success is ≥ 20 h old + retries every 30 min after a failure;
    - window ≥ 7 days (+ the days since the last success, max 30);
    - real exit code, with `reconcile_state.json` + `reconcile_history.jsonl`.
    - Verified live: it fired by itself at the restart ("app start", 8 days, exit 0).
  - **Polygon re-issued the minutes of 2026-10-06 … 10-11** (gold avg $0.12, max $1.85; about a third of the minutes; also FX / silver). Probe (`probe_history_revisions.mjs`, read-only): 2014-03-12, 2019-06-11, 2022-11-15, 2024-03-12, 2025-06-10, 2026-09-15, 10-01, 10-02, 10-05, 10-12, 10-13 all 0 differences.
    - All revised minutes are now corrected (append-only corrections). Re-probe = 0 differences.
    - Studies on the frozen tape include about 3 revised days out of 13 years (immaterial). The forward test's 3 signals of 10-09 were scored on pre-revision bars; the append-only ledger is not rewritten.
  - **Not back-fillable by nature:** GLD options open interest (Polygon serves today only) — a day the PC is off through the US session has no gamma snapshot. Paper decisions are live-only.

- **(al) 2026-10-14 — CRASH LOOP from 14:30 UTC, caused by (ak), fixed.**
  - **Cause:** the reconcile rewrite in `run_twin.mjs` removed `const day = …`, which the GLD gamma schedule still used.
  - **Effect:** a ReferenceError at the first loop after 14:30 UTC. The watchdog restarted the app every 5 min (14:34, 14:39, 14:44); each restart died before the stream settled bars; the chart froze at 14:34. The breaker then halted at 14:49 ("3 restarts in the last hour"), as designed.
  - **Fix:** `day` restored. The halt marker was removed after the fix. Because the breaker's hour window was still full, the app was started by hand exactly like the watchdog (ledger row actor 'claude').
  - **Verified:**
    - stream gap 14:29-14:52 refilled on all 8 pairs + DXY (0 gaps 14:00-14:53);
    - bars advancing each minute;
    - the gamma step (the crashing path) ran: 10-14 NEGATIVE, flip 4162.8.
  - **Lesson:** `node --check` cannot catch a missing variable. After editing `run_twin.mjs`, every time-gated branch (gamma 14:30 UTC, calendar, forward :20, reconcile) must be exercised.

- **(am) 2026-10-15 — Break → retest → rejection 3m scalp (Ashraf's live idea), with DXY / Silver / News / WTI awareness: 0/16 PASS.**
  - Spec `docs/RETEST_SCALP_SPEC.md` (pre-registered); study `study_retest_scalp.mjs` → `retest_scalp_study.json`. 39,822 setups in 13 y.
  - OOS at 1 R: base 37.1 % WR −$0.59/t (10.3/day). The filters move WR by < 1 pt: +DXY 37.5 % · +Silver 36.9 % · +News 37.2 % · D+S+N 37.3 % −$0.60.
  - WTI (2 y): 38.1 % −$0.98. At 2 R: about 25 % WR.
  - Cause: the average stop is about $2.40, so the spread is a large share, and retests break more than they hold.
  - Whales: 2 y only and no standalone edge. Gamma: no historical OI, so it cannot be backtested.
  - Checkpoint tag `checkpoint-2026-10-15-app-settings`. No live app change.

- **(an) 2026-10-15 — WALL DEFENSE as a trade: 0/8 PASS.** Spec `docs/WALL_DEFENSE_MONEY_SPEC.md` (pre-registered); study `study_wall_defense_money.mjs` → `wall_defense_money.json`.
  - The event engine is copied from Turbo 2's `validate_wall_defense.mjs`. **Replication:** hold rate all / defense / attack = 60.4 / 71.4 / 51.2 % (Turbo 2: 60.4 / 71.5 / ~49) → faithful.
  - Money (OOS):

| Version | WR | $ / trade | Trades / day |
|---|---|---|---|
| DEFENSE, bounce target | 60.1 % | −$0.49 | 5.0 |
| STRONG, bounce target | 62.7 % | −$0.49 | 1.3 |
| STRONG + DXY + silver | 62.6 % | −$0.53 | — |
| DEFENSE 1 R | 42.9 % | −$0.56 | — |
| ATTACK reference 1 R | 41.9 % | −$0.55 | — |

  - DEFENSE ≈ ATTACK in money → the close-based hold label does not monetize: intrabar wick stops, a 3-bar decision lag, the spread.
  - The hold rate stays CONTEXT only (as in Turbo 2).

- **(ao) 2026-10-15 — FAILED BREAKOUT / BREAKDOWN** (sweep of the 45-bar range edge, close back inside; Ashraf's "fix the sell" after the 13:18 UTC 4168 rejection) → **0/8 PASS**.
  - Spec `docs/FAILED_BREAKOUT_SPEC.md` (pre-registered); study `study_failed_breakout.mjs` → `failed_breakout_study.json`. 3m: 34,953 setups; 15m: 6,871.

| Cell (OOS) | WR | $ / trade |
|---|---|---|
| 3m base 1 R | 39.0 % | −$0.54 (11/day) |
| 3m D+S 1 R | 40.5 % | −$0.43 |
| 15m base 1 R | 43.3 % | −$0.56 |
| 15m D+S 1 R | 46.0 % | −$0.41 |
| 15m D+S 2 R | 33.3 % | −$0.21 |

  - Post-hoc only (not a pass, side not pre-registered): the 15m D+S 2 R SELL side shows +$0.47.
  - The app's sell stays as it is: no rule earned a place.

- **(ap) 2026-10-16 — SECOND FULL-APP CHECKPOINT (Ashraf: "save this as a second check point for the full app settings").**
  - Full copy (no `.env`): `C:\01Ferrari Twin Turbo CHECKPOINTS\2026-10-16_full-app-settings-2`. File counts match the live app: docs 12, ops 4, scripts 132, src 83, data 4,407 (15.5 GB).
  - Git tag `checkpoint-2026-10-16-full-app-settings-2` → commit 4bebdfd.
  - State saved:
    - Matrix SCALP box in the SNIPER TARGET / RISK PROTECTION style;
    - SCALP 85 % paper replay (stop 3r / tp 0.25r; it loses money);
    - SWING TRADE forward arms 1 + 2, every 15 min;
    - reconcile at start, the watchdog, the chart cache at 2 min.
  - To restore: `git checkout checkpoint-2026-10-16-full-app-settings-2`, or copy the folder back and re-add `.env`.

- **(aq) 2026-10-16 — TELEGRAM "TRADE SETUP READY" + ⚙ API KEYS PAGE + INSTALL PACKAGE.** Ashraf asked for:
  - a folder to install the app on any PC with the full settings, asking for the API keys;
  - Telegram messages with Entry, SL, TP1, TP2, TP3;
  - a tab to save all the keys;
  - the copy to read ticks the same way as this one.

  **Telegram alerts** (`src/master/tradeAlert.js`):
  - Hooks:
    - `matrix_tick.mjs` sends SCALP after the state write;
    - `forward_buyd1.mjs` sends SWING TRADE for each new signal.
  - Each setup id is sent once (`data/telegram/alerted.json`).
  - A setup recorded more than 30 min after its bar is never sent (`TWIN_ALERT_MAX_LATE_MIN`).
  - Switches: `TWIN_ALERT_SCALP`, `TWIN_ALERT_SWING`.
  - **TP3 is labelled, not faked:**
    - SCALP TP3 = TP2 + (TP2 − TP1);
    - SWING TP2 / TP3 = equal steps beyond the single measured target;
    - every one of these is marked "reference — not in the measured exit".
  - Found: the code reads `TWIN_TELEGRAM_*`, but `.env` held only `TURBO_TELEGRAM_*` (Turbo 2's channel), so **every alert until now was a dry run**. Credentials go in through the ⚙ page.
  - Smoke `smoke_trade_alert.mjs`: 7/7.

  **⚙ API keys page** (`scripts/run_settings.mjs`, http://127.0.0.1:7445):
  - Supervised by run_twin (`ensureSettings`); the ⚙ API keys button is on the chart.
  - The chart server stays read-only.
  - Security:
    - localhost only; the Host header is checked;
    - every POST needs a per-start page token and the same Origin;
    - keys are never returned (only ••••last-4);
    - blank = keep; every other `.env` line is kept; `.env.previous` is kept.
  - Live tests: Polygon (history + tick socket), Telegram (getMe + a test message), Databento, FRED.
  - Verified with the real keys: Polygon history ✓ (5,518 bars), Databento ✓, FRED ✓.
  - Smoke `smoke_settings.mjs`: 5/5.

  **MEASURED 2026-10-15 21:22 UTC:** Polygon allows ONE tick connection per key, and a new socket knocks the running one off.
  - The live stream got `max_connections`, reconnected 1 s later, and REST refilled the gap. The market was in its daily break.
  - So the page never opens a second socket while this PC's stream is live.
  - The installer warns that the same key cannot stream on two PCs.

  **Install package** (`INSTALL_PACKAGE/`):
  - `build_package.mjs` → `INSTALL_PACKAGE/FerrariTwinTurbo/` (gitignored):
    - full = code + settings + data, ~16 GB; `--lite` = no history;
    - never copies `.env`, locks, heartbeats or the halt marker; self-checks.
  - `INSTALL.cmd` → `ops/setup.mjs`:
    - checks Node ≥ 22; clears leftovers; writes launchers for that folder and that node.exe;
    - opens the ⚙ keys page;
    - history top-up: removes the build-month and later `_parts` first, because the import rebuilds `1m.jsonl` from the parts and a partial part would drop the streamed minutes;
    - registers the watchdog task (every 5 min + at logon, local-time boundary) and a Desktop shortcut; starts the app.
  - **Guard:** a watchdog task for another folder means the copy is not registered and not started (default no), so two copies never fight for the tick connection.
  - Tested in the package on this PC:
    - the guard kept the live task;
    - registration under a test name worked, then the test task was deleted;
    - the shortcut command works;
    - the gold top-up rebuilt 4,906,090 bars, identical to the live store.

  - **2026-10-16 (Ashraf: "use the Turbo 2 Telegram channel for alerts"):** TWIN_TELEGRAM_BOT_TOKEN / TWIN_TELEGRAM_CHAT_ID = Turbo 2's bot (@ferrari_turbo2_bot) and its group "Ferrari Trading Signals" (verified by getMe + getChat; no test message posted). SCALP + SWING TRADE alerts are live from the next tick.

- **(ar) 2026-10-16 — Matrix "prepare" alert at 98 %: NO PASS (0/9).** Ashraf asked for a preparation alert before the trigger, at 98 %.
  - Spec `docs/MATRIX_PREP_ALERT_SPEC.md` (pre-registered); study `study_matrix_prep_alert.mjs` → `matrix_prep_alert_study.json`.
  - Window: WTI 2 y (the live rule).
  - Definition: armed = context aligned (WTI as delivered + DXY vs EMA10) and price within k·ATR of the wall, with no signal yet.
  - Pre-registered grid, OOS:
    - best conversion 66.2 % (k 0.25, N 20 bars, 12.5 alerts/day, median lead 6 min);
    - recall ≤ 49 %: most trades have no armed bar before them.
  - Post-hoc (`matrix_prep_alert_posthoc.json`, not a pass): with the wall already touched and only the trigger candle missing, the best is 80.4 % (−0.25 ATR, N 20, 8.9 alerts/day, lead 6 min).
  - Cause: the last condition (the trigger candle) is a per-bar event that nothing before it predicts at 98 %. Conversion is measured to raw signals, so a live trade (one at a time) would convert lower still.
  - **Side finding:** 9,929 raw signals in 2 y, of which **4 are SELLs**. The Pine SELL (ceiling wall + WTI bullish + DXY bullish + close below the last swing low) almost never happens, which is why the SCALP is BUY-only in practice.
  - Nothing was wired. No prepare alert is sent.

- **(as) 2026-10-16 — Matrix SELL study: NO PASS (0/6). Chart WATCH label added. Live app ⇄ install package auto-sync.**
  - **SELL** (spec `docs/MATRIX_SELL_SPEC.md`, `study_matrix_sell.mjs` → `matrix_sell_study.json`; red line WR ≥ 85 % + money).
    - choch (live): 4 signals in 2 y, underpowered.
    - **red candle + highwr exit: OOS WR 88.1 %** (n 109), but $/t +0.25 with LB −0.67, TRAIN −1.25, and on 13 y no-WTI 87.9 % WR at −$0.34/t → FAIL.
    - prevlow + highwr: 90.9 % (n 33, underpowered), but 13 y −$0.38.
    - Native exits: WR 9-36 %.
    - Same as the BUY's 85 % exit: a high WR is bought with a 3R stop / 0.25R target and loses money over 13 y.
    - `matrixSignals` gained a `sellRule` option; the default `choch` is unchanged.
  - **👁 WATCH BUY (chart only, Ashraf's option 2):**
    - Shown when the BUY context is aligned and the low is ≥ 0.25 ATR through the buy wall, with no trade open.
    - The one rule is `matrixArmedAt` / `WATCH` in `ferrariMatrix.js`, shared by `matrix_tick` (writes `matrix_state.watch`) and the study.
    - Measured, post-hoc: 82.3 % become a BUY signal within 60 min (OOS n 1,815, lead 6 min). SELL watches: 0/41, so the label is BUY-only.
    - Shown as a dashed gold line and a panel line. Never sent to Telegram.
    - Smoke `smoke_matrix_watch.mjs` (provenance + mechanism): 3/3.
  - **Sync (Ashraf: "the attached stream + the independent app must always meet the same settings and improvements"):**
    - `.git/hooks/post-commit` runs `build_package.mjs --code` (< 1 s) after every commit.
    - The `--code` mode keeps `built_at`, the data-snapshot date the installer tops up from.
    - Smoke `smoke_package_sync.mjs` checks every committed code / settings / doc file byte for byte, finds no stale files, and confirms no keys and the hook present.

- **(at) 2026-10-16 — Polygon outage 23:38-23:50 UTC + a stream RACE BUG found and fixed.**
  - **Outage:** Polygon published no forex minutes for 23:35-23:36 and 23:39-23:49 (gold and EURUSD alike; checked on its REST). The socket stayed open but silent, so the streamer reconnected every ~30 s.
  - **Our bug** (`src/data/tickStream.js` `settle()`):
    - the socket dropped DURING the awaited REST refill;
    - `coverageFrom` became null, and the code then set `st.cursor = coverageFrom` (null);
    - the result: settled_through showed 1969, every later settle re-fetched history from 1970 (283,713 skip events, 33 MB in `stream_events.jsonl`), and nothing settled.
  - **Fix:** snapshot the bound before the await; if it moved during the fetch, keep the cursor and refill after the reconnect.
  - Smoke: new RACE test in `smoke_tick_stream.mjs` — it FAILED (and hung) on the old code and PASSES with the fix (12/12).
  - The live streamer was restarted at 23:56. The 23:39-23:56 refill wrote all 7 bars Polygon has, and the store equals Polygon minute for minute. The daily reconcile picks up any minutes Polygon re-issues later.

- **(au) 2026-10-16 — 4H MACRO MAGNET (Ashraf's visionHunt Pine) copied exactly + DXY cross-check: NO EDGE (0/8 cells, all 3 4H cuts).**
  - Spec `docs/MACRO_MAGNET_SPEC.md` (pre-registered); engine `src/master/macroMagnet.js`; study `study_macro_magnet.mjs` → `macro_magnet_study.json`.
  - **4H cut MEASURED from Ashraf's TradingView over CDP:** OANDA 4H start at 01/05/09/13/17/21 UTC = 17:00 New York (434 bars). The app's 00/04/08 UTC cut differs.
  - **Parity with his chart:** 433/434 candles align (NY cut); the score is identical on 98.7 % of 300 bars, with the same side 100 %. The only differences are in vector D (candle colour) on tiny bodies — OANDA vs Polygon cents. Smoke `smoke_macro_magnet.mjs` 5/5.
  - **13 y, OOS** (base up-next-4H 51.8 %):

| Reading | Up next 4H | Up next 24 h |
|---|---|---|
| LONG ≥ 65 | 52.3 % (+0.6 pp; TRAIN −0.9) | — |
| LONG 100 | 51.7 % | 58.1 % (TRAIN 4H 48.3 %) |
| SHORT ≥ 65 (down next 4H) | 48.8 % vs base 48.1 % | — |

  - **DXY on the other side adds nothing:** +0.1 to +1.7 pp, TRAIN negative in every cell. Vector A (EMA) is the only part with a sign: 53.1 % vs 50.2 %.
  - **Method E:** the Pine's own history (lookahead_on) shows **77.8 %** "up" for LONG ≥ 65 because it scores the bar with its own final close; a live reader gets **52.3 %**.
  - **Reported finding (not a pre-registered cell):** with both liquidity pools set, the NEARER one is touched first **78.0 %** vs a 71.5 % distance-only expectation (n 3,116 OOS; the same on all 3 cuts). This deserves its own pre-registered test.
  - Nothing was wired into the live app.

- **(av) 2026-10-16 — Liquidity MAGNET, matched-placebo test: NOT CONFIRMED** (it passed the pre-registered rule, then FAILED the independence audit).
  - Spec `docs/MAGNET_LIQUIDITY_SPEC.md`; `study_magnet_liquidity.mjs`:
    - the primary run → `magnet_liquidity_study.json`;
    - the audits (switches MAG_DEDUP / MAG_REGIME / MAG_WEEKBLOCK) → `magnet_liquidity_robustness_*.json`.
  - Touch order is resolved on 1m bars. The placebo uses 20 random times with the same ATR distances, the same horizon and the same censoring.
  - **Primary (as pre-registered), H 30, OOS:**
    - real nearer-first 78.0 % · placebo 74.1 % · formula 71.5 %;
    - lift +3.9 pp, LB +2.5; TRAIN +0.7 → passed.
    - Most of the "78 %" is the path itself (the placebo gives 74.1 %).
  - **Audit:**
    - the same (BSL, SSL) pair repeats ~10 bars, so the events are not independent;
    - one event per pair leaves **n = 347 independent** (OOS): lift +2.0 pp, LB −2.5. With every fix together: +2.6 pp, LB −2.2 → NOT CONFIRMED;
    - regime-matched placebo alone: +3.7 pp (LB +2.3); week-block alone: LB +1.0. Neither removes the repetition.
  - **Era:** H 30 lift pre-2020 +0.9 pp vs post-2020 +3.0 pp.
  - **Verdict:** a ~2-3 pp liquidity effect is possible but not provable on 13 y of 4H pools; nothing is shown as a "magnet".
  - **What IS measured and usable:** the placebo calibration — which level price reaches first from distances alone (path geometry, not liquidity). OOS, H 30 placebo by nearer-share of the distance: 0-0.1 → 95.6 % · 0.1-0.2 → 88.5 % · 0.2-0.3 → 79.5 % · 0.3-0.4 → 68.4 % · 0.4-0.5 → 55.3 %.

- **(aw) 2026-10-16 — Liquidity MAGNET on 1H pools (strict test pre-registered as PRIMARY, `docs/MAGNET_LIQUIDITY_1H_SPEC.md`): PASS at 30 h, FAIL at 5 days.**
  - Primary test: one event per distinct pool pair; regime-matched placebo ×20; week-block bootstrap; 1m touch order. → `magnet_liquidity_1h_111_study.json`.
  - **H 30 (30 h), OOS:** n 1,392 independent; real nearer-first **75.5 %** vs placebo 72.0 % (formula 70.3 %); **lift +3.5 pp, LB +1.2**; TRAIN +1.0 → **MAGNET_REAL**.
  - **H 120 (5 days):** +2.2 pp, LB +0.1, TRAIN −0.1 → no.
  - **Limits (measured):**
    - era: pre-2020 +1.2 pp vs post-2020 +2.8;
    - nearer = SSL +5.2 pp vs nearer = BSL +2.0;
    - counting every hour (not independent): only +1.4 pp — the effect sits at the moment a new pool pair forms;
    - by distance share: the lift sits in 0.2-0.5 (+4-5 pp); none at the extremes.
  - **No-drift:** the 4H strict run reproduced exactly (424 / 347 / 75.5 % / +2.6 pp).
  - **Reading:** a small, genuine liquidity pull within ~30 h of a new 1H pool pair, mostly since 2020. The dashboard may show the measured nearer-first % per distance bucket (1H, 30 h), labelled with its size and limits; nothing else.

- **(ax) 2026-10-16 — Liquidity MAGNET confirmation (`docs/MAGNET_CONFIRMATION_SPEC.md`, `study_magnet_confirm.mjs` → `magnet_confirm.json`): NOT CONFIRMED. (aw)'s pass was marginal.**
  - **H 30, OOS:**

| Check | Result |
|---|---|
| Gold, regime placebo, fresh seed | +2.9 pp (was +3.5 — the placebo draw alone moves it 0.6 pp), LB(α/2) +0.6, **LB(α/18) −0.4** |
| **C1** timing-matched placebo (other new-pair moments) | +2.5 pp, LB +0.1, TRAIN +0.4 → **FAIL** |
| **C2** family-wise (18 cells) | **FAIL** |
| **C3** DXY 1H pools | +0.1 pp (73.2 % vs 73.1 %) → **does not replicate** |
| **C4** DXY agreeing | gold's lift +1.1 pp vs DXY disagreeing +5.4 (TRAIN the same sign) → **DXY adds no strength**, if anything the reverse |

  - H 120: the same picture.
  - **Final:** gold shows a small (~2-3 pp) lean toward real pools, not separable from chance, era-dependent, absent on DXY. **No magnet / liquidity-target signal is shown anywhere.**
  - What stays measured: distance-only first-touch odds (the placebo calibration, path geometry).

- **(ay) 2026-10-16 — 4H BIAS MODEL (all Pine inputs + continuous versions + daily trend, gold + DXY, 24 features, L2 logistic fit on TRAIN only): NO EDGE.**
  - Spec `docs/BIAS_MODEL_SPEC.md`; `study_bias_model.mjs` → `bias_model_study.json`.
  - **TEST (last 40 %, n 8,347):**

| | Next 4H | Next 24 h |
|---|---|---|
| AUC | 0.517 (LB 0.505) | 0.506 (LB 0.487) |
| Brier skill vs base | −0.08 % | −0.43 % |
| Top-20 % up-rate | 54.7 % vs base 51.8 % (+2.9 pp, LB 52.3) | 53.6 % vs 53.4 % |
| Bottom-20 % down-rate | 49.3 % vs 48.2 % | — |

  - Largest weights: DXY / gold close vs EMA21 and the EMA gaps — trend, the same as vector A.
  - **Conclusion across (au)-(ay):** gold's next-4H / 24 h direction is NOT forecastable from these inputs beyond a faint long-side lean.
  - Dashboard rule (spec): no bias % — "no measured edge, base X %" + Ashraf's score labelled as a score.

- **(az) 2026-10-16 — 4H MACRO MAGNET live tile + forward record (Ashraf: "honest tile + live record").**
  - **`scripts/macro_tick.mjs`:**
    - run by run_twin 2 min after every NY 4H close and once at start (catch-up);
    - scores only bars whose last minute is SETTLED for gold and all six DXY pairs;
    - writes an append-only ledger `data/paper/macro_magnet_ledger.jsonl` (a 'score' row per bar, a 'resolve' row after the next bar) and `data/master/macro_magnet_state.json`.
  - **Tile** "4H MACRO MAGNET (your Pine) — score, not probability" on the chart, via `/api/magnet`. The first try used `/api/macro`, which clashed with the existing economic-data endpoint; renamed, and both work.
    - It shows: the score exactly as his indicator shows it; the vectors; DXY's side and relation, labelled "measured: adds nothing"; the measured 13 y result for this exact reading (e.g. LONG 100 + DXY confirms → 50.5 % up next 4H, n 549, vs base 51.8 %) with the NO EDGE label; and the live record.
  - **Live at start:** 01:00 UTC bar — gold LONG 100, DXY SHORT 100 (confirms). This is the same as his OANDA chart.
  - **run_twin restarted 08:06 UTC.** The old stream / chart / settings children closed with it; the new run_twin started fresh ones. One streamer only, no missing minutes.
  - Smokes `smoke_macro_tick.mjs` (5/5: parity, provenance, ledger integrity, hook, endpoint) + `smoke_macro_magnet.mjs` added to smoke_all.

  - **Forming preview (Ashraf: "yes add the forming preview"):**
    - `formingScore()` in `macroMagnet.js` = the closed bars (`data/master/macro_magnet_bars.json`, the FULL 200-day series, so an old unbroken pool is kept) + the open candle built from the minutes since;
    - run_chart computes it in the background at most once a minute (`/api/magnet` → `forming`, `provisional: true`), so a request is never blocked;
    - the chip shows "│ forming HH:MM: LONG 100 provisional" and the tile has a "PROVISIONAL, can change until the close" line;
    - the official score stays the closed bar.
    - Smoke: forming test 6/6.
    - Noted, NOT changed: `/api/bias` recomputes every 15 s and takes 5-9 s — pre-existing, unrelated.

- **(ba) 2026-10-16 — 4H MACRO BUBBLES (Ashraf's "Trend Divergence Engine", bubble method ONLY) copied exactly + 13 y measurement: NO EDGE (0/8).**
  - Spec `docs/BUBBLE_SPEC.md`; engine `src/master/macroBubbles.js`; study `study_bubbles.mjs` → `bubble_study.json`.
  - **The real method** (the whole source):
    - RSI14 of the 4H closes, RSI pivots 3/3;
    - yellow = RSI pivot low < 35 and above the previous RSI low;
    - blue = RSI pivot high > 65 and below the previous RSI high.
    - **No volume, no walls, no trend-vs-defence comparison** (this differs from Ashraf's description). Pivot prices are stored but unused. The plot sits 3 bars before the bubble was knowable. On lower-timeframe charts the Pine computes RSI on the chart-timeframe series of 4H closes (a different series).
  - **13 y, NY 4H:** 354 bubbles (BULL 12.6/y, BEAR 14.2/y).
  - **OOS:**
    - BULL up 24 h 68.5 % vs 53.4 % base (+15 pp, n 54) BUT TRAIN −7 pp, pre-2020 42 % vs post-2020 66 % → era effect;
    - BULL up 4H 42.6 % (−9 pp);
    - BEAR down 4H 55.6 % (+7.5 pp, TRAIN −4.2);
    - BEAR down 24 h / 5 d below base;
    - level holds vs matched placebo +3.9 / +5.0 pp (TRAIN ≈ 0).
  - Bubble count ≥ 2 does not help. 1H robustness (1,250 bubbles): everything within ±5 pp.
  - **Tie audit:** 108 RSI-pivot ties. The leftEq / rightEq conventions change 1 bubble in 13 y; every verdict is unchanged.

- **(bb) 2026-10-16 — WALL-PRESSURE BUBBLES, pre-registered re-check + RSI confirmation (`docs/WALL_BUBBLES_SPEC.md`, engine `src/master/wallDefense.js`, `study_wall_bubbles.mjs` → `wall_bubbles_study.json`).**
  - **No-drift:** the shared engine reproduces study (an) exactly — 60.4 / 71.4 / 51.2 % (n 36,724 labelled tests).
  - **OOS holds** (base 60.3 %; week-block bootstrap LB at α/3):

| Class | OOS hold | Lift (LB) | TRAIN | Verdict |
|---|---|---|---|---|
| DEFENSE | 69.9 % | +9.6 pp (LB +8.7) | 73.1 % | SHOWN |
| **DEF>PUSH** (Ashraf's rule) | 73.4 % | +13.1 pp (LB +11.6) | 78.9 % | SHOWN |
| STRONG | 77.1 % | +16.8 pp (LB +15.0) | 81.8 % | SHOWN |
| ATTACK | 51.0 % | — | — | coin flip, no bubble, no "will break" claim |

  - All classes hold on both sides and both eras.
  - **Stacking REFUTED:** repeated defended tests of the same wall hold LESS (72.4 → 69.1 → 67.7 %); the count is shown with that fact.
  - **RSI adds nothing:** 0/6 (4H RSI, 1H RSI, recent 4H RSI bubble, each on DEFENSE and DEF>PUSH; diffs −1.1 to +3.5 pp, all LB < 0).
  - **Hold** = close retreats ~$4 (4 bins) before closing ~$2 beyond within 60 min — a short reaction, not a trade (study (an): no money edge after costs).
  - **Engine identity:** the same 40,693 wall tests as study (an)'s own engine copy.
  - **STRONG cut-off:** the TRAIN p66 over LABELLED defended tests = 0.775 (study (an) used all defended tests = 0.731). Both are TRAIN-only; the new one is stricter.
  - **LIVE (2026-10-16):** `/api/walls` on the chart server (read-only):
    - the shared engine on the last 36 h of 1m, refreshed in the background ≤ 1/min;
    - classes and measured holds from `wall_bubbles_study.json`;
    - each bubble's own HELD / BROKE once its 60 min pass (live record).
  - **Chart:** 🔵 resistance / 🟡 support circles at the wall price. Size = class (DEFENDED / DEF>PUSH / STRONG); the number = the measured OOS hold %; a tooltip shows the test count and outcome; resolved bubbles are faded. Panel section "WALL PRESSURE bubbles — measured".
  - **First live day:** 13 wall tests, 4 bubbles (2 held, 2 broke), 9 attacked (no bubble).
  - Smoke `smoke_wall_bubbles.mjs` 4/4 (engine identity, mechanism on real data, API provenance + ATTACK never a bubble, chart read-only).

- **(bc) 2026-10-16 — SWING-LEVEL WALLS (reversal points, `docs/SWING_WALLS_SPEC.md`, `swingWallEvents()` in `wallDefense.js`, `study_swing_walls.mjs` → `swing_walls_study.json`): 6/6 SHOWN.**
  - **Walls:** prior confirmed 5/5 swing highs / lows (the chart's H/L rule), usable from their known time, removed when a 1m close goes beyond. The mechanics are identical to the volume engine.
  - **OOS holds** (base ≈ 60.2 %):

| Wall type | Tests / day | DEFENSE | DEF>PUSH | STRONG | ATTACK |
|---|---|---|---|---|---|
| 3m swings | 38.8 | 70.2 % (LB +9.3) | 73.8 % (+12.4) | 78.3 % (+16.7) | 52.2 % |
| 15m swings | 8.4 | 69.8 % | 73.2 % | 78.8 % | 52.4 % |
| Volume walls (reference) | 11.8 | 69.9 % | 73.4 % | 77.1 % | 51.0 % |

  - TRAIN lifts +10.9 to +17.8 pp; both eras; floors hold better than ceilings (e.g. 3m STRONG 80.2 % vs 74.6 %).
  - A swing level coinciding with a volume wall adds nothing.
  - **Why no bubble at a new high** (Ashraf 09:18 UTC, gold 4190): the line at the top is the Matrix "SELL wall 3m" (a range-extension level, not a volume / swing wall). The 24 h volume profile has no wall above price (walls 4148.55 / 4154.85), and a swing ceiling exists only while unbroken.

  - **LIVE (2026-10-16 ~09:30 UTC):**
    - `/api/walls` now also runs `swingWallEvents` on 3m and 15m confirmed pivots (5 days of 1m, so older unbroken swings count), with the measured holds from `swing_walls_study.json`;
    - it reports the nearest unbroken swing ceiling / floor.
  - **Chart:**
    - swing bubbles have a white ring, on a "SWING 3m / 15m WALL [price]" line;
    - 3m swings show on 1m/3m/5m charts, 15m swings on 15m/1h, volume walls on all intraday charts;
    - the panel shows the swing measurements and the nearest ceiling / floor.
  - **First live read:**
    - the top at 4189.5-4190.6 was defended 4× (all HELD); new DEF>PUSH bubbles at 4189.50 (15m) and 4193.53 (3m);
    - last 24 h: 18/23 resolved bubbles held.
  - Smoke 5/5: swing provenance per kind and swing engine rules (known-time, break removal, nearest level).

- **(bd) 2026-10-16 — WALL CONTEXT + SWING FOLLOW-THROUGH (`docs/WALL_CONTEXT_SPEC.md`, `study_wall_context.mjs` → `wall_context_study.json`): NOTHING informative.**
  - 133,896 3m swing-wall tests; OOS base hold 60.2 %.
  - **Pre-touch context (known before the touch):**
    - AGAINST-MACRO (e.g. resistance while the 4H Macro is LONG ≥ 65) 59.3 % (−0.9 pp);
    - WITH-MACRO 61.5 % (+1.3);
    - weak approach 60.2 % (−0.1);
    - 15m RSI exhaustion 57.7 % (−2.5, TRAIN −0.3).
    - **The trend score does not decide whether a wall holds.** On top of a bubble the same: e.g. DEFENSE + against-macro 69.4 % vs 70.2 %.
  - **Swing follow-through within 4 h after a HELD wall:** ≥ $10 ≈ 30 %, ≥ $20 ≈ 12 %. A DEF>PUSH / STRONG bubble does not raise it (−2.1 / 0.0 pp).
    - → A held wall = usually a PULLBACK, not a swing. No "swing expected" alert and no pre-touch hold alert.
    - The panel shows the measured follow-through.

- **(be) 2026-10-16 — WALL SCALP at defended levels (`docs/WALL_SCALP_SPEC.md`, `study_wall_scalp.mjs` → `wall_scalp_study.json`): 0/15 PASS.**
  - **Levels:** 4H candle highs/lows (C4H) · 4H / 1H / 15m / 3m swings.
  - **Trade:** only DEF>PUSH-or-STRONG bubbles; market entry at the decision (measured spread); stop wall ± 3 bins; exits T4 ($4) / T10 ($10) / SPLIT. Red line WR ≥ 85 % + money.
  - **OOS:**
    - C4H T4: 43.5 % WR, −$0.50/t (1.46/d);
    - C4H T10: 34.2 %, −$0.40;
    - S3 T4: 42.6 %, −$0.65;
    - every cell is negative on both sides and in TRAIN.
    - Average risk ≈ $4.7 (> the $4 target).
    - Reached +$10 within 4 h: 12-18 %.
  - **Why** a 74-78 % hold does not become a scalp:
    - the hold is measured from the WALL, while the trade enters 3 min later, after much of the bounce;
    - the stop beyond the wall plus the spread sits further away than the target;
    - wicks hit the stop more often than closes break the wall.
  - The wall bubbles stay as reading tools; no wall scalp is built.

- **(bf) 2026-10-16 — TOP-DOWN REVERSAL (Ashraf's design: 4H/1H candle level → 15m/30m reversal candle → 3m CHoCH entry; `docs/MTF_REVERSAL_SPEC.md`, `study_mtf_reversal.mjs` → `mtf_reversal_study.json`): 0/12 PASS.**
  - **OOS:**
    - L4H→15m 1R: 46.6 % WR, −$0.37/t (2.7/d);
    - L4H→30m 1R: 45.5 %, −$0.56;
    - L1H→15m 2R: 37.0 %, −$0.18 (the least bad);
    - L1H→30m 2R: 36.9 %, −$0.28.
    - Every cell is negative on both sides, in TRAIN, and pre/post 2020.
  - **Average risk ≈ $6:** the reversal extreme sits far from the CHoCH entry once the 15m/30m candle has confirmed.
  - 10-18 % of confirmations never give a CHoCH.
  - **1R WR ≈ 47 %** = a coin flip; the spread makes it a loss. Once a turn is confirmed on three timeframes, the measurable edge is gone.

- **(bg) 2026-10-16 — PULLBACK LIMIT after a defended 4H/1H candle level, $4 then BE (Ashraf: "confirm the $4 first, then BE SL"; `docs/WALL_PULLBACK_SPEC.md`, `study_wall_pullback.mjs` → `wall_pullback_study.json`): 0/2 PASS.**
  - **OOS:**
    - L4H SPLIT4: 57 % filled, reached +$4 only 28.5 %, WR 33.8 %, −$0.38/t (risk $2.42);
    - L1H: 33.4 %, −$0.45.
  - **Adverse selection:** price that comes BACK to a defended wall is mostly breaking it; the clean bounces never fill.
  - Across (be) / (bf) / (bg), confirming the $4 has failed with a market entry, a top-down CHoCH entry and a pullback limit.

- **(bh) 2026-10-16 — WHY ONLY BUY TRADES FIRE (Ashraf's question) — measured, not a bug.**
  - **SCALP (Matrix):**
    - the live journal has 58 BUY rows / 0 SELL;
    - the SELL rule (ceiling wall + WTI bullish + DXY bullish + close below the last swing low) fired 4× in 2 y;
    - the SELL-trigger study (as): red-candle SELL 88 % WR but −$0.34/t on 13 y.
  - **SWING TRADE arms:** BUY_D1 models by construction. INVESTIGATION_90WR: SELL_D1 never qualified (best 82.7 %, OOS AUC 0.505 vs BUY 0.52) → no sell arm.
  - **Today's level / wall / top-down tests ((be)-(bg)):** the SELL side is negative too.
  - **Root cause:** gold's 13 y up-drift (51.8 % of 4H bars up; strong 2024-26). Buy models carry the drift; sells must beat it, and none has met WR ≥ 85 % + money.

- **(bi) 2026-10-16 — SELL-ONLY in confirmed downtrends (`docs/SELL_DOWNTREND_SPEC.md`, `study_sell_downtrend.mjs` → `sell_downtrend_study.json`): 0/12 PASS.**
  - **R-4H (EMA9 < EMA21 + lower highs), OOS:**
    - S-RALLY (a defended 3m swing ceiling): RH 58.3 % / −$0.51, R2 30.6 % / −$0.44;
    - S-BREAK (a 15m close below the swing low): RH 61.5 % / −$0.39, R2 37.2 % / −$0.02.
  - R-STATE (BREAKOUT_DOWN / TREND_DOWN) is too rare: 9-14 OOS trades.
  - **The downtrend filter ≈ no filter** (NONE −$0.43 to −$0.55; R-1H the same).
  - No sell reaches 85 % WR, and every cell is negative in TRAIN and in both eras.
  - **Conclusion:** the BUY-only state stands; sells remain reading tools.

- **(bj) 2026-10-16 — 4H S/R LEVEL TELEGRAM NOTICES (Ashraf: "send this msg about 5 m before it reaches the defended level … so I watch it · for S/R · also show the Macro bias strength on what favour"). INFORMATION ONLY.**
  - **Numbers:** `study_c4h_levels.mjs` → `c4h_level_study.json` (OOS). Levels = closed NY 4H candle highs / lows kept until a 1m close beyond.
    - **APPROACH** (the first minute within one 5m-ATR14, ≈ one 5-minute candle): touches within 15 min **52.2 %** (median 4 min); when it touches, holds only **35.2 %** (TRAIN 53.2 / 37.1 %).
    - **TOUCH**, i.e. not already through at touch + 2: all 60.9 % · defended 70.7 % · **strong 74.7 %** (TRAIN p66 1.070) · attacked 52.7 %; after a hold ≥ $10 within 4 h 31.0 %.
  - **`scripts/level_tick.mjs`** (run_twin every minute, +20 s, market open):
    - ⏳ APPROACHING once per level per 2 h; 🧱 DEFENDED (strong defence at a 4H level) once per test;
    - each message carries the measured numbers + a 4H Macro bias line (score, which side it favours, "measured: no edge") + "information only";
    - a stale-data guard; dedupe ledger `data/telegram/level_alerts.json`; `--dry` preview.
  - Smoke `smoke_level_tick.mjs` 2/2.

- **(bk) 2026-10-16 — 👁 SCALP PREPARE to Telegram (Ashraf: "an alert prior the trade setup … today I received a trade already triggered but no alert before").**
  - **Audit of this morning:**
    - the 00:39 SCALP BUY HAD a chart WATCH at 00:33 / 00:36 (chart-only then → no Telegram);
    - the 06:03 SCALP BUY had NO watch (the wall touch and the green trigger in the same 3m bar) — measured: only 40.3 % of SCALP signals get a prior watch (`matrix_prep_alert_posthoc.json` recall).
  - **Now:**
    - `matrix_tick` sends "👁 SCALP PREPARE — WATCH BUY" (FERRARI TWIN TURBO header) when the WATCH state appears — once per episode (45 min), never with a trade open (`alertPrepare` in `tradeAlert.js`);
    - it states 82.3 % → a BUY signal within 60 min (median 6 min) and that only 40.3 % of trades get a warning;
    - `WATCH.recall` added.
  - Smoke trade_alert 8/8.

- **(bl) 2026-10-16 — SWING START WATCH (`docs/SWING_START_SPEC.md`, `study_swing_start.mjs` → `swing_start_study.json`, NY daily candles 13 y): 0 USEFUL.**
  - **Base:** +5 % before a close beyond the day's extreme — bull 23.0 % TRAIN / 26.9 % OOS, bear 17.6 / 13.8 %.
  - **Bull:**
    - A-SWEEP+DISC (20-day-low sweep & reclaim in the bottom-25 % 60-day range), 2.6/y: all 35.3 % (n 34), OOS 44.4 % (n 18, LB 21 %), TRAIN 25 % vs 23 %, avg +1.19R if traded — but **pre-2020 15 % vs post-2020 48 %** (a bull-market effect), UNDERPOWERED;
    - +RSI < 35: 29.6 %, +0.47R;
    - 52-week sweep: n 9, 44 %, −0.70R.
  - **Bear:** all three are no better than the base (11-19 %), −0.65 to −1.88R → NOT USEFUL.
  - **Answer:** a level cannot be classified as continuation vs swing start; the best clue (a sweep + reclaim in a discount) is too rare on 13 y to separate from the 2020-26 bull trend.

- **(bm) 2026-10-16 — 🌱 SWING START WATCH live as UNCONFIRMED + live record (Ashraf: "Watch + live record").**
  - `scripts/swing_start_tick.mjs` checks the completed NY day for the study rule (A-SWEEP+DISC bull, 10-day dedupe). It is chained from `macro_tick` after every NY 4H close (including the 17:00-NY daily close); catch-up + dedupe.
  - **Telegram:** "🌱 SWING START WATCH — UNCONFIRMED (bull)" with the measured numbers (35.3 % n 34 vs 26.9 % base, +10 % 23.5 %, avg +1.19R), the explicit UNPROVEN / post-2020 warning, the +5 % target and the invalidation level.
  - **Ledger** `data/paper/swing_start_ledger.jsonl`: alert + resolve rows (+5 % before a daily close below the alert low, 60 d).
  - **Parity:** the live rule reproduces the study's dates (2026-06-08 / 06-30 / 10-07).
  - Smoke `smoke_swing_start.mjs` 3/3.

- **(bn) 2026-10-16 — Telegram send RETRY.** A network blip (ETIMEDOUT to api.telegram.org) lost a test send; a trade alert is sent once, so it would have been lost too.
  - `sendText` now makes up to 3 attempts (waits 3 s / 8 s) on a network error / 5xx / 429; a 4xx is final; it never throws.
  - This covers SCALP / SWING / PREPARE / 4H-level / swing-start alerts.
  - Smoke trade_alert 9/9.

- **(bo) 2026-10-16 — SWING TRADE arm 1 with a REASONABLE stop (Ashraf: "the SL must be reasonable" → "Reasonable SL, honest WR"; `docs/SWING_BRACKET_SPEC.md`, `study_swing_bracket.mjs` → `swing_bracket_study.json`).**
  - Arm 1's own walk-forward signals (scores ≥ 0.9394, D1 policy), 2016 → 2026; E0 reproduces 92.0 % WR.
  - **OOS (2022+) / TRAIN, with a RANDOM-ENTRY control** (5 draws, same count / policy / bracket):
    - **E3 0.5 D / 1 D:** WR 73.0 %, +$3.76/t (LB +0.21), TRAIN +$1.02; random −$0.02 → **model − random +$3.78 / +$1.11** → KEEP;
    - **E4 1 D / 1 D:** WR 58.6 %, +$6.48/t (LB +1.18), TRAIN +$1.21; random +$2.70 (bull drift) → **+$3.78 / +$1.13** → KEEP;
    - E1 / E2 (0.5 D stop ≈ $37): fail TRAIN → DROP;
    - E0 today: +$3.30 vs random −$0.16.
  - **Caveats:**
    - the 0.9394 threshold was chosen on the pooled 2016-26 OOS (optimistic);
    - losing years 2016-18 and 2022;
    - max losing streak 9 (E3) / 14 (E4).
  - A replacement of arm 1's bracket needs Ashraf's approval.

- **(bp) 2026-10-16 — SWING arm 1 switched to E3 (Ashraf's choice); arm 2 silenced.**
  - **Arm 2 measured first** (`swing_bracket_study_arm2.json`): E3 −$0.73/t OOS vs random −$0.02 (model − random −$0.71); E4 −$2.06 vs random. **No reasonable-stop version passes** → arm 2 keeps E0 and records SILENTLY (no Telegram).
  - **`forward_buyd1.mjs`:**
    - arm 1 bracket E3 (target 0.5·ATR1d / stop 1·ATR1d);
    - every signal stores `bracket`; old E0 signals resolve on their own levels;
    - the summary / verdict counts the current bracket only.
  - **Display:** the SWING TRADE alert says "forward arm 1 · E3 (stop 1× daily ATR)" with the measured 73.0 % / +$3.76 / beats-random line; the chart labels and the forward note were updated.
  - **Fix:** the sendText retry smoke had written fake sends into the real `sent.jsonl` (seen by the monitor; never delivered). `sendText({log:false})` is for tests; the 9 fake lines were removed.

- **(bq) 2026-10-16 — 🫴 WALL TOUCH early level, CHART ONLY (Ashraf's choice).**
  - Price-only addendum (`matrix_prep_alert_priceonly.json`, pre-registered in `MATRIX_PREP_ALERT_SPEC.md`): gold ≥ 0.25 ATR through the BUY wall, WTI / DXY ignored.
    - BUY: 63.7 % → a BUY signal within 60 min; catches 61 % of signals early (vs 40 % for WATCH); lead 9 min; ~17/day.
    - It missed its ≤ 15/day bar → chart only.
  - **Wiring:** `WALL_TOUCH` constant; `matrix_tick` sets `wallTouch` when the full WATCH does not fire; `/api/matrix` passes it while fresh; the chart shows a grey dashed "🫴 wall touched 64% — waiting for WTI/DXY" line + a panel line. No Telegram path.
  - **Live 12:53:** the first real ⏳ 4H SUPPORT AHEAD 4168.72 notice. The 12:24 SCALP BUY hit SL −$5.84.

- **(br) 2026-10-16 — 12:24 SCALP post-mortem: DXY 15m trend + "fresh flip" filters (`docs/MATRIX_DXY_CONTEXT_SPEC.md`, `study_matrix_dxy_context.mjs` → `matrix_dxy_context_study.json`): NO HELP (0/2).**
  - **Facts:** WTI turned OK at 12:18; DXY 3m dropped below its EMA only on the 12:21 signal bar; DXY 15m was BULLISH.
  - **OOS BUYs** (all −$0.87/t, WR 27.7 %):
    - skip-when-DXY-15m-up: kept −$0.57 vs skipped −$1.06 (+$0.30, LB −0.83), TRAIN −$0.13 (reverses);
    - skip-fresh-flip: kept −$0.63 vs skipped −$0.99 (+$0.24, LB −0.94), TRAIN −$0.04;
    - both: +$0.03.
  - Ashraf's DXY intuition points the right way recently but is not significant and reverses in TRAIN. The 12:24 stop-out = the normal SHADOW scalp result.
  - Ashraf's own live trade (entry ~4176, SL 4143) was closed at breakeven after the 4154.6 un-defended bounce.

- **(bs) 2026-10-16 — Matrix SCALP BUY LOSS AUTOPSY (15 pre-trigger facts, TRAIN-only selection, one OOS test; `docs/MATRIX_LOSS_AUTOPSY_SPEC.md`, `study_matrix_loss_autopsy.mjs` → `matrix_loss_autopsy.json`): NOTHING avoids losers.**
  - **BUYs:** TRAIN 2,071 (−$0.27, WR 24.7 %), OOS 1,324 (−$0.87, WR 27.7 %).
  - **TRAIN top 3:** candle body mid (+0.31), 4H Macro ≥ 65 (+0.30), silver 3m up (+0.29).
  - **OOS:**
    - body mid **−$1.46** (reverses);
    - Macro ≥ 65 −$1.01 (reverses);
    - silver 3m up −$0.14 (gain +0.73, LB −0.42 — the only same-sign fact, not significant);
    - top1 AND top2 −$0.24.
  - Most facts reverse sign between TRAIN and OOS: DXY 15m (TRAIN favours DXY up, OOS DXY down), session, ATR percentile, market state.
  - **Conclusion:** the SCALP has no edge, so no pre-trigger filter recovers one. Avoiding "similar trades" = not treating SCALP (SHADOW) alerts as trades.
- **(bt) 2026-10-16 — SCALP Telegram alerts: "Keep, with a loud warning" (Ashraf).** Every SCALP card's line 2 now prints the measured gate result from `ferrari_matrix_gate.json` (today: SHADOW, −$0.91/trade on unseen data, 20 % full wins, NOT a trade recommendation). A last line says whether silver 3m (close vs EMA10) confirms; it is info only, being the one same-sign fact in (bs), and it is not significant. **Nothing is filtered or blocked:** every Matrix signal still alerts, so no opportunity is lost. This is on purpose, because (bs)/(br) showed every filter also removed winners. Code: `tradeAlert.js` scalpSetup/formatSetupAlert, `matrix_tick.mjs`. Smoke: smoke_trade_alert 10/10.
- **(bu) 2026-10-16 — FAST MOVE → BOUNCE AT THE 4H LEVEL (Ashraf, after 4176 → 4154.60 → 4188: "limit at the strong level, small SL, BE after +$6"; "a second entry that supports my losing entry"; "DXY 1H RSI bearish sign at the bounce"; "add the DXY bias"). Pre-registered `docs/FAST_MOVE_BOUNCE_SPEC.md` (+ addendum A). `study_fast_move_bounce.mjs` → `fast_move_bounce.json`; `study_fast_move_bounce_dxy.mjs` → `fast_move_bounce_dxy.json`. 0/8 + 0/24 PASS.**
  - **Event:** a 60-min move ≥ max($15, 3× 5m-ATR); the nearest active NY-4H level within $15; 13 y of data.
  - **L (limit at the level, stop $4 / $8, BE at +$6, TP +$15, 4 h), OOS:**
    - long: L4 WR 14.8 %, −$0.95/t; L8 26.1 %, −$0.58;
    - short: L4 −$1.19; L8 −$1.51.
  - **Fast-move limits do WORSE than ordinary level touches** (touch control −$0.29/−$0.21; the difference LB is negative).
  - **D (wait for DXY 3m back across EMA10 + gold back across the level):**
    - long D4 +$0.37 OOS (WR 32.5 %), but LB −0.68 and TRAIN −$0.11 → not proven;
    - shorts negative.
  - **Addendum A** (DXY 1H RSI divergence, DXY 4H magnet bias, both): 0/24 pass.
    - DIV on the D cells: long +$1.66 / +$2.24 on n 43, LB about −2. TRAIN n 2-3, too few to judge.
    - BIAS ≈ no lift.
  - **"Second entry rescues the first":** the added entry is the L trade above (negative). After an L fill, price got back $20 above the level within 4 h only **27.8 %** (OOS) of the time.
  - **Today:** the active 4H floors were 4162.97 (broken 13:18) and 4146.98. The low of 4154.60 never reached the 4146.98 floor, so a limit there would not have filled.
  - **Conclusion:** no tradeable bounce rule. Every L/D cell's WR is far below the 85 % line.
- **(bv) 2026-10-17 — PREPARATION for the swing-candle study (Ashraf: "candles at all timeframes at the swing points … 1M down to 1m … then read the footprint … how Bear becomes a Bull"; "audit that nothing is missing"; "data history from Polygon please check"). No study numbers yet; tools + data audit only.**
  - **TradingView-exact candles on 16 timeframes:** `src/core/nyCandles.js`.
    - Anchors were measured from Ashraf's TradingView (OANDA:XAUUSD, CDP), stored in `tv_anchor_reference.json`, re-measured with `scripts/measure_tv_anchors.cjs`.
    - Session rules: 17:00 New York session with the next date; 9H restarts every session; 2D/3D count weekdays straight through weekends and restart the count every 1 January.
    - `cleanForTv` drops Polygon's stray break and holiday minutes.
    - `smoke_ny_candles.mjs`: 17/17, with every open time identical to TradingView. Median high/low difference $0.23-0.48 (different feeds).
  - **Data audit (Polygon history folder):**
    - XAUUSD 1m is continuous from 2013-07-14 (4.58 M bars).
    - **Polygon has NO gold data 2019-09-04 → 2019-10-04 and 2020-10-14 → 2020-11-13** (re-queried 2026-10-17: 0 rows even daily). Silver and four DXY pairs have holes in the same months. `src/core/dataHoles.js` finds and flags them.
    - **Spot `v` is not volume:** it is a tick count, about 3/min in 2021-25 vs 100-250 before. Real volume comes from GOLD_FUT (Polygon CME, 2024-10 → 2026-10, no buyer/seller split) and from Databento tbbo (with the aggressor side).
    - The DXY pairs exist from 2009-09. Correction: the (bu) addendum spec wrongly said 2021 (fixed in the spec; numbers unaffected).
  - **Tools:**
    - `src/master/swings.js`: ATR ZigZag plus failed-extreme controls, causal, with breaks at holes.
    - `src/master/candleFeatures.js`: candle anatomy.
    - `src/master/footprintTf.js`, with new 1m footprints from `build_footprints_1m.mjs` (54.86 M trades → 709,399 minutes). The 1m→5m roll-up equals the independent 5m build: 6,072 candles, 0 mismatches.
    - `src/core/studyStats.js`: Wilson, two-proportion test, Holm, week-block bootstrap.
  - **Smokes** (registered in smoke_all): `smoke_swing_tools` 6/6, `smoke_footprint_tf` 2/2, `smoke_study_stats` 5/5.
  - **Method skill:** `~/.claude/skills/gold-measured-study`.
- **(bw) 2026-10-17 — DATABASE MADE 100 % CORRECT before the swing-candle study (Ashraf: "fix the fake data base and the gold future ask/bid and volume … news and macros at the same time of the candles"; volume source for 2013-2024: "No purchase"). The full contract is `docs/DATA_CONTRACT.md`, proved by `smoke_data_contract` 3/3 + `smoke_market_context` 4/4.**
  - **Fake volume removed:** spot `v` = Polygon's quote count. Polygon's own spot quote feed fell from 18-35 k/h (2014-19) to 150-200/h (2021-25), then 12.7 k/h (2026). `cleanForTv` strips it. Real volume runs 2024-10 → now only: CME futures, Databento footprints (buyer/seller), GLD 1m (new, 351,989 bars).
  - **GOLD_FUT fixed:**
    - The October contract had leaked in, because a 4-month window excluded December. The front month was also chosen from same-session volume (look-ahead).
    - New rule: the most volume in the PREVIOUS session, from G J M Q Z.
    - Then patched to the CME exchange feed: 38,919 minutes (30 volume, the rest one-tick closes); originals in `cme_corrections.jsonl`.
    - Result: volume = CME on 682,457 / 682,457 same-contract minutes.
  - **Calendar / macro / news:**
    - Forex Factory USD history 2013-07 → now: 692 weeks, 17,155 events with actual / forecast / previous. 898 / 898 official releases at the exact minute after the time-authority fix.
    - Polygon macro: yields 1962+, CPI 1947+, labour 1948+, inflation expectations 1982+.
    - Polygon gold news: 1,914 items, 2020-03+ only (no earlier archive).
    - `src/master/marketContext.js` gives every candle its events, news and the macro values KNOWN at its open and close, using conservative known-at rules.
  - **Retrospective finding (not fixed, task flagged):** fvg, marketState ("volume N×"), orderBlock, volumeProfile, wallDefense and levelRadar read spot `v` as volume. Their volume parts were meaningless in 2021-25.
- **(bx) 2026-10-17 — THE APP RECORDS OUR OWN HISTORY (Ashraf: "make sure that our main App is reading and saving our database correct … building our own history for both Future and Spot for XAU, DXY, Silver"). Details: `docs/DATA_CONTRACT.md` §7.**
  - **Spot:** the stream already records 8 symbols tick-by-tick, verified against Polygon, plus spreads.
  - **NEW:** `scripts/record_futures.mjs` (run by run_twin every 15 min) appends CME GOLD_FUT, **SILVER_FUT (new, 2-year import, 689,222 bars)**, WTI and GLD. Final minutes only, append-only, idempotent.
  - **NEW:** `scripts/audit_recording.mjs` (daily) classifies every hole against Polygon. First audit is clean: the spot holes are Polygon outages on 10-13 22:14-16 and 10-15 23:39-49; 0 misses on our side.
  - **ONE futures rule** `src/data/futuresRule.js`, shared by the importer, the live reader (wti.js had the same October-gold bug) and the recorder.
  - The importer **keeps our own bars older than Polygon's rolling 2-year window**.
  - WTI was caught up (7,621 minutes, 10-09 → 10-16).
  - Not available on our plan: the futures buyer/seller split going forward; DXY futures.
  - Smoke: `smoke_recorder` 4/4.
- **(by) 2026-10-17 — FULL DATABASE RE-VERIFICATION (Ashraf: "recheck and confirm … zero fake database for XAU, DXY, Silver, WTI … own history for Future and Spot for all time frames"). `scripts/verify_database.mjs`: ✅ every check passed. Details: `docs/DATA_CONTRACT.md` §8.**
  - **All 12 series:** 0 duplicate / out-of-order / invalid OHLC across the whole files. The latest 5 trading days are identical to a fresh Polygon download (futures and GLD: price AND volume).
  - **GOLD_FUT = CME:** 682,457 / 682,457 minutes.
  - **Holes:** every one is confirmed empty at Polygon (live check).
  - **Silver:** all 16 timeframes identical to TradingView.
  - **Rebuilt DXY vs TVC:DXY:** median 0.0014 points, 1H correlation 0.986.
  - **Futures / GLD volume:** carries exactly into every timeframe, with roll flags.
  - **Fixed:**
    - minutes Polygon later REMOVES (EURUSD 10-13 00:00-28) are now deleted at read time (`deleted` corrections, with a safeguard);
    - GLD keeps its 17:00 New York hour;
    - smoke_all now passes script arguments.
- **(bz) 2026-10-17 — VOLUME AUDIT: did spot `v` (a quote count, not volume) change any result? MEASURED: no pass or fail came from it; the live state gate was mostly driven by it.** Spec `docs/VOLUME_AUDIT_SPEC.md` (pre-registered), results `docs/VOLUME_AUDIT_RESULTS.md`, harness `scripts/vol_audit/` (studies re-run UNCHANGED under a module hook; artifacts in `data/master/vol_audit/`; self-test 4/4 modes; 75 study runs, 0 failures; nothing live changed).
  - **No-drift:** 11 studies byte-identical. 4 drifted for MEASURED reasons:
    - state gate: built on the old 24-year store;
    - volume_profile: FUT only, after today's GOLD_FUT CME patch;
    - order_block: 2 of 52,107 5m OOS events, plus the shared seeded control sequence;
    - vp_matrix_filter: Matrix / WTI code after 10-11.
  - **13 y, volume removed (DROP):**
    - 0 verdicts reversed. Every change is UNDERPOWERED → FAIL / DOES_NOT_HOLD (strong FVG, STRONG order blocks, R-STATE sells).
    - Wall bubbles stay SHOWN: DEFENSE 69.9 → 70.1 %, DEF>PUSH 73.4 → 75.0 %, STRONG 77.1 → 76.5 % (OOS n about 2.4-9.5 k).
    - Every money test is still negative.
  - **levelRadar:** 19,984 / 19,984 decisions identical with `v` = 0 → no volume at all.
  - **Live state gate (IMPULSE_CONT):**
    - OOS 2021-26: RAW blocked 580 / 658 fires (88 %); DROP blocks 106 / 658.
    - CME era: the state differs from a real-volume state on 8.85 % of 43,452 15m bars.
    - With CME volume, the blocked fires earn +$0.30/t (n 69), the same as the book (+$0.30, n 257).
    - UNPOWERED in every version.
  - **CME (2024-12 → 2026-10) vs DROP:** CME is better on 1 of 3 volume-wall classes (DEF>PUSH 84.2 vs 81.1 %, TRAIN 75.2 vs 70.6 %, n 733) and worse on the swing-wall and 4H-level classes behind the Telegram 🧱 alert (4H strong touch 84.0 vs 88.2 %).
  - **Proposal: DROP the volume part everywhere.** CME futures are 10 min delayed live, and the rules decide at the bar close or touch + 2. Awaiting Ashraf's approval; nothing changed live.
- **(bz2) 2026-10-17 — [relabelled from (bz): the letter clashed with the parallel VOLUME AUDIT entry] SWING-CANDLE STUDY PHASE 1: the candle atlas at swing points on 16 timeframes. Spec `docs/SWING_CANDLE_SPEC.md` (+ clarifications, addendum A: post-extreme selection bias found by a trial audit and fixed before the full run; addendum B: effect-size labels). `study_swing_candle_atlas.mjs` → `swing_candle_atlas.json` → `docs/SWING_CANDLE_ATLAS.md`. Smoke `smoke_swing_atlas` 4/4 (planted pattern recovered 100 % vs 0 %).**
  - **Swings:** 3× ATR ZigZag. 1m: 128 k per side; 1H: 1,935 per side; 1D: 78 per side. 2D / 3D / 1W / 1M have < 30 OOS swings → described only.
  - **Swings look alike on every timeframe:** a median size of 5.1-5.7 ATR, confirmed about 6-7 candles after the extreme. Only 7-21 % are confirmed by candle +1 … +3.
  - **AT the extreme (knowable at its close):**
    - real swing extremes are LARGE candles (1H lows 41 % vs failed 29 % vs random 15 %; highs 37 / 23 / 19) on 1m-2H;
    - a HIGH-impact USD release in the extreme candle or the 3 before: 25 % vs 16-17 % (1H, 6 TFs, both sides);
    - outside bar / engulfing / sweep-reclaim are moderate or tiny.
  - **DXY and silver direction at the extreme: no meaningful difference.** Real CME volume (2-year cells): heavy volume 62 % vs 56 % at 3m/5m lows (small).
  - **AFTER the extreme (still holding, fair comparison):** the clearest, most repeated facts (9 TFs, 1m-4H):
    - the candle after a real low is bullish 75 % vs 61 % and closes in its top third 54 % vs 38 % (1H);
    - mirror at highs: bearish 76 % vs 64 %;
    - candles +2 / +3 continue the same way (gaps of 15-25 points).
  - **4H and up: few or no findings.** 4H 2, 6H 5, 9H / 1D 0 (n 90-200), 2D+ described only.
  - Next: Phase 2 (footprint) and Phase 3 (flip ladder), each with its own pre-registered addendum.
- **(ca) 2026-10-17 — SWING STUDY PHASE 2: CME footprint at swing points (spec `docs/SWING_FOOTPRINT_SPEC.md`, `study_swing_footprint.mjs` → `swing_footprint_atlas.json` → `docs/SWING_FOOTPRINT_ATLAS.md`; smoke 5/5). Recorded in full in `docs/SWING_STUDY_BOOK.md` §5 + appendix `docs/swing_book/phase2/` (9,960 rows).**
  - **82 footprint findings, almost all AFTER the extreme.** Head-to-head on the same events: the candle shape at the same offset separates better (gaps of 15-26 pt vs 10-20).
  - **AT the extreme, the classic signs mark an extreme, not a turn:** delta divergence 39-51 % real vs 38-48 % failed vs 10-16 % random; absorption 0-9 % everywhere; selling into the low is normal.
  - **Follow-through:** real reversals trade high relative volume and stacked imbalances; failed ones are low-volume.
  - 1H+ is underpowered (2 years).
- **(cb) 2026-10-17 — SWING STUDY PHASE 3: THE FLIP LADDER (spec `docs/SWING_LADDER_SPEC.md`, `study_swing_ladder.mjs` → `swing_ladder_atlas.json` → `docs/SWING_LADDER_ATLAS.md`; smoke 2/2). Recorded in `docs/SWING_STUDY_BOOK.md` §5B + appendix `docs/swing_book/phase3/`.**
  - **The turn climbs the ladder in order:** the smaller timeframe flips first, 95-99 % up to 2H.
  - **EVIDENCE — when the timeframe ONE STEP BELOW confirms at the exact same extreme, the anchor becomes real (OOS / TRAIN):**
    - 15m 5m → 63 / 60 % vs base 44 / 40;
    - 1H 30m → 76 / 69 % vs 46 / 41;
    - 4H 3H → 83 / 80 % vs 46 / 39;
    - 1D 9H → 68 / 59 % vs 49 / 36.
  - **Leads:** hours for 1H / 4H, days for 1D. Trade-off on 4H: 1H 57 % / 22 h, 2H 72 % / 14 h, 3H 83 % / 4 h.
  - 1m / 3m carry no evidence.
  - DXY / silver do not lead; they agree more at real swings, but only in hindsight.
- **(cc) 2026-10-17 — SWING STUDY PHASE 3B: next candle + ladder (spec `docs/SWING_COMBINE_SPEC.md`, `study_swing_combine.mjs` → `swing_combine_atlas.json` → `docs/SWING_COMBINE_ATLAS.md`; smoke 3/3, incl. exact reproduction of Phase 3). Book §5C.**
  - **No combination beats the ladder alone:** strong next candle +0-3 pt, not significant (1H lows 76 → 76 %, 4H lows 83 → 86 % with n 117).
  - A weak next candle costs only 2-7 pt.
  - The strong next candle alone: 46-58 %.
  - The one-step-below flip already contains the next-candle information.
- **(cd) 2026-10-17 — SWING STUDY PHASE 3C: silver / DXY as extra evidence (spec `docs/SWING_SILVER_SPEC.md`, `study_swing_silver.mjs` → `swing_silver_atlas.json` → `docs/SWING_SILVER_ATLAS.md`; smoke 2/2, incl. exact reproduction of Phase 3). Book §5D.**
  - **No cell is a FINDING:** silver already confirmed +1-6 pt (1H lows 79 % vs 73 %, TRAIN flat), DXY about 0.
  - Waiting for silver +4 pt for a short wait (15-60 min), dropping 30 % of cases.
  - 1D cells (n 8-24, TRAIN sign flips) need more data.
  - **The ladder alone stays the sign.**
- **(ce) 2026-10-17 — SWING STUDY PHASE 4: 4A the understanding (book §5E, no new numbers); 4B the ladder as a trade rule (spec `docs/SWING_TRADE_SPEC.md`, `study_swing_trade.mjs` → `swing_trade_atlas.json` + every trade `swing_trades.csv`; smoke 4/4). Book §5F.**
  - **0 / 12 cells pass.** Examples:
    - 1H long E2: WR 69.6 %, −0.007 R;
    - 4H long E2: WR 80.4 %, +0.001 R;
    - 4H long E1: +0.142 R but LB −0.024.
  - **Root cause, measured:** at entry, price is already 1.8-2.4 anchor ATRs from the extreme. Risk 1.9-2.5 ATR; E2 reward : risk 0.22-0.65; breakeven WR 62-80 % vs actual 56-76 %.
  - **The sign is right but late.** The understanding stands as context; there is no entry edge with a stop beyond the extreme.
  - 1D described only (n 40-53, longs +0.24 R).
  - **Nothing wired live.**
- **(cf) 2026-10-17 — SWING STUDY PHASE 4C: ladder trade with a TIGHTER stop (spec `docs/SWING_TIGHTSTOP_SPEC.md`, `study_swing_tightstop.mjs` → `swing_tightstop.json` + every trade; smoke 2/2 incl. exact reproduction of all 51,403 Phase 4B trades). Book §5G.**
  - **0 / 24 pass.**
  - **S2 (1× lower-TF ATR):** noise stops; 15m WR 27-42 %, −0.19 to −0.30 R (the far stop on the same signals: −0.07).
  - **S1 (confirmed higher low):** rarely exists in time (1H 70-79 trades, 4H 2-7), and is barely tighter.
  - **Study verdict:** the ladder tells WHICH swing is real (60-83 %), but it is not tradeable with positive R after costs. Use it as context only.
  - 1D S2 E2 +0.27 R (n 49) is described only.
- **(cg) 2026-10-17 — SWING STUDY PHASE 4D: entering on an EARLIER ladder step (spec `docs/SWING_EARLYSTEP_SPEC.md`, `study_swing_earlystep.mjs` → `swing_earlystep.json` + every trade; smoke 1/1 = exact reproduction of Phase 4B). Book §5H.**
  - **0 / 24 pass. Across 4B-4D: 0 / 60.**
  - **The trade-off is priced:** reward : risk 0.44 → 2.8 as entries get earlier, but the target-hit rate falls in proportion, staying 3-7 pt under breakeven. Examples: 4H on the 1H flip hit 49 % vs 52 % needed (+0.04 R); 15m on the 1m flip 30 % vs 34 % (−0.11 R).
  - **Verdict:** the ladder is context, not an entry. 4H / 1D longs least bad (drift).
- **(ch) 2026-10-17 — LADDER CONTEXT on the chart (rules `docs/LADDER_CONTEXT_SPEC.md`; Ashraf chose "Ladder context on the chart"). INFORMATION ONLY.**
  - **What it shows:** per anchor (15m / 1H / 4H / 1D), the live leg's running extreme, which lower timeframes CONFIRMED a swing at exactly that price, and the swing study's OOS odds (quoted from `swing_ladder_atlas.json`).
  - **Code:** `src/master/ladderContext.js` (pure) · `scripts/ladder_tick.mjs` → `data/master/ladder_state.json` (fail-closed; `--dry`; `--now` replay) · `GET /api/ladder` · chart chip "Ladder … · info only, no trade".
  - **`smoke_ladder_context` 4/4:** window parity with full-history swings; replay = study flips + atlas odds (3 moments 2024-26); no look-ahead; footer present, no trade words.
  - Preview verified on a temporary chart server (port 7446, Friday-close replay); the preview file was removed.
  - **LIVE 2026-10-17 (Ashraf: "Yes, make it live now"):** run_twin hook every 3 min (30 s after each 3m close) while the market is open, + once at start; app restarted.
- **(ci) 2026-10-17 — FAKE SPOT VOLUME REMOVED EVERYWHERE (Ashraf: "Yes, remove it everywhere"; the audit (bz) / `docs/VOLUME_AUDIT_RESULTS.md` §5 DROP proposal). `docs/DATA_CONTRACT.md` §6 marked FIXED.**
  - **Code:**
    - `wallDefense.js`: `WEIGHT = () => 1` (walls = time-at-price), `barDelta` = close position.
    - `marketState.js`: `volMult = 0` default; the volume words are gone from the messages; the chart shows "volume needed: none" and plain trigger labels.
    - `fvg.js`: STRONG = big + s1 + s3 (s2 kept as a record).
    - `orderBlock.js`: STRONG = disp ≥ 2.5 (relVol kept as a record).
    - `study_fvg_strong.mjs` now uses the shared `F.strong` (ONE RULE; it had recomputed s1 && s2 && s3).
  - **Re-run (data/master), all = audit DROP:**
    - `c4h_level_study`, `wall_bubbles_study` (47,928 tests; holds 60.1 / 71.1 / 50.8; SHOWN DEFENSE 70.1 % +9.9 pp, STRONG 76.5 % +16.3 pp, DEF>PUSH 75.0 % +14.8 pp OOS; p66 0.571), `swing_walls_study` (3m + 15m SHOWN DEFENSE / DEF>PUSH / STRONG), `wall_context_study` (nothing informative), `fvg_strong_study` (STRONG_FVG_DOES_NOT_HOLD, 0/12) and `order_block_study` (ORDER_BLOCKS_DO_NOT_HOLD, 0 diffs vs the audit).
    - `vol_audit/verify_drop_live.mjs`: 5/5 identical.
    - fvg skips only the record-only S2 row and random-control values (control, net_lb), which shift because the S2 row draws from the shared seeded rng. MEASURED: the live study run with only s2 forced equals the audit file on every value except the rules text.
  - **Live effect (as §6 of the audit):**
    - The IMPULSE_CONT paper gate admits far more fires (it is unpowered either way).
    - Wall/swing bubbles + 🧱 alerts come from time-at-price walls.
    - Strong FVG boxes are about 10× more frequent, each labelled DOES_NOT_HOLD.
  - **Smokes updated to the new rules:**
    - market_state 9/9 (the opt-in volMult still blocks);
    - wall_bubbles 5/5 (pins the DROP run);
    - gamma_fvg 7/7 (low v stays strong, a weak body does not);
    - order_block 4/4 (displacement-only);
    - twin_parity 3/3. The state MECHANISM = Turbo2 when run at Turbo2's volMult 1.4. Turbo2 itself still uses the tick count and was not touched. The live twin's gate differs from Turbo2 on 20 of 111 shared fires: the approved divergence.
    - All other smokes are green, except `smoke_macro_tick`: its clock check needs an 8H bar under 14 h old, and it is the weekend.
  - **Found on the way, a CALENDAR BUG (fixed):** at 17:59 UTC the Fed site failed (fetch failed / HTTP 406), and `fetch_calendar.mjs` rewrote `data/calendar/history.json` without every FOMC decision and Fed speech (2003 → 836 events).
    - New `mergeHistory` (`src/data/calendar.js`): a failed source keeps its own types from the previous file.
    - File restored from git and refreshed (2,004 events, all sources ok); the damaged copy is kept in the session scratchpad.
    - `smoke_calendar` 6/6, incl. a simulated Fed outage.
    - Exposure in the window (MEASURED):
      - The inv90 forward test rebuilt its dataset at 18:36 UTC with the shrunken file, but both ledgers got only 4 "scan" rows each, up to the Friday-close bar (market closed). No signal was scored or recorded, and its next run rebuilds the features from the restored file.
      - None of the re-run volume studies reads the calendar (grep).
      - The `run_chart` board names re-read the file hourly.
- **(cj) 2026-10-18 — DATA HEALTH WATCHER + ALERTS + SIGNAL STOP + NEW YORK MARKET HOURS (Ashraf: "how we can tell if we have any issue with full system database? and can we get alert for this?" → existing Telegram group, "also stop signal trigger and make a note on the App 'Database Stale' with flash red color", daily OK; then "include market working time so when market closing hrs our system understand why no feeding"). Full rules: `docs/DATA_CONTRACT.md` §9.**
  - **Verdict, ONE place:** `src/core/dataHealth.js` reads what the existing checks write and judges 9 things: market, app + live flows, gold stream, gap repair, recording audit, futures recorder + stored futures minutes, weekly full check, calendar, disk.
    - CRITICAL → STALE → signals stop.
    - WARN → message only.
  - **Watcher:** `scripts/health_tick.mjs` (`--dry`, `--now` seams) runs every 2 min first in run_twin's loop, and from the watchdog when the app is HALTED.
    - It writes `data_health.json`, an alert memory (once + recovered; CRITICAL after 2 ticks, WARN after 3) and a change-only history.
    - The daily check runs after 21:45 UTC.
  - **Signal gate `signalsHalted()`** (fail closed when the verdict is missing or older than 10 min) stops: `telegram.sendText` (the watcher bypasses it), the twin_tick fire, new matrix boxes + watch markers, the inv90 forward ledger.
  - **Chart:** `/api/health`, with a flashing red / amber / blue market-closed banner.
  - **Weekly full check:** `verify_database.mjs` on Saturdays at/after 06:00 UTC (retry after 2 h on failure). A network crash writes no result; only a real mismatch reports FAILED.
  - **MARKET HOURS FIX:** `freshness.marketOpen` hard-coded summer UTC hours. From 2026-11-01 it would have expected data an hour before every Sunday open and inside the winter daily break.
    - Now New York time + measured holidays (`marketSession`: status + next open).
    - Easter comes from `usHolidays.js`. That file stays the NYSE calendar, a different market.
    - Proof on 3.72 M stored minutes 2016-2026: closed-time minutes 0.21 % vs 1.49 % (old), open hours with no data 2.78 % vs 4.20 %.
    - The 4 July early close (13:00 NY) holds 8/11 years (2022-24 traded thinly about 95 min longer).
    - My first version ran the early close past midnight; the measurement found it and it is fixed.
  - **Disk check added (prevention):** 373 GB free today.
  - **Found:** a dry-run send always logs, even with `log:false`. The smoke's one stray line was removed from `data/telegram/sent.jsonl`.
  - **Smokes:**
    - `smoke_data_health` 12/12 (new, registered);
    - `smoke_freshness` 7/7 (+ winter session, + measured holidays);
    - full suite 64/64 green (incl. the silver + DXY-pair stream check added the same day).
- **(ck) 2026-10-18 — PRE-OPEN READINESS + POLYGON REVISIONS (Ashraf: "make an early preventive action to avoid 100% stale data flow … before time"; approved "Pre-open readiness check"). Details: `docs/DATA_CONTRACT.md` §9a.**
  - **`scripts/preopen_check.mjs`** runs at T-60 and T-15 before every open (`dataHealth.preopenSlot`; daily break T-15 only, NOT READY only). Its 15 checks: Polygon + plan, PC clock, store = Polygon on 11 series, stream, health.
    - First run READY 15/15; the bad-key run gives NOT READY with the plan classification.
  - **MEASURED: Polygon revises past minutes.**
    - 2026-10-15 was re-published overnight: forex corrected by reconcile_1m (7,575); 7 GLD minutes.
    - The recorder never re-checked, so `verify_database` FAILED.
    - Fix: `src/data/recordRevisions.js` + a 6-hourly 5-day re-check in record_futures (atomic rewrite + old → new ledger).
  - **Live loop proven:** Telegram 🟥 09:03 → fix → full check ✅ → Telegram ✅ "DATA OK AGAIN — signals resumed" 09:11.
  - **Bug fixed:** `verify_database` window was hard-coded (12-16 Oct); it is now rolling to the last market close.
  - **Feed facts:** spot real-time ticks; futures 10-min-delayed 1m bars (plan), context only.
  - **Smokes:** data_health 14/14 (+ pre-open schedule + verdict), recorder 5/5 (+ revisions).
- **(cl) 2026-10-18 — EVERY TIMEFRAME BUILT PERFECTLY: full-history audit + 3 history fixes (Ashraf: "confirm … our history for each time frame is built perfectly"; then "Measure 2020 first"). Details: `docs/DATA_CONTRACT.md` §10.**
  - **`audit_timeframes.mjs`:** 12 series × 16 TradingView timeframes, independent regroup + live-loader parity, self-tested. ✅ all pass after the fixes.
  - **Fix 1, repair at 1 minute only:** the coarse-candle repair had erased the real 2017-07-06 silver flash crash. XAU unchanged.
  - **Fix 2, Polygon's 2020-11-15 → 12-31 New-York-local stamps (+5 h, `sourceQuirks.js`):**
    - Proven by structure, by our store = Polygon, and by TradingView daily ($3.32 → $0.60 vs controls $0.27-0.75).
    - Raw switch `TWIN_RAW_POLYGON_TIMES=1`.
  - **Fix 3, weekend-dated minutes dropped in `cleanForTv`** (counted).
  - **Measured effect on earlier results:**
    - IMPULSE_CONT TRAIN net/t −0.1964 → −0.2977 (OOS = live label unchanged).
    - Level Radar (superseded) 166 / 9,124 candidates differ.
    - Both reproduce exactly on the raw stamps; their smokes now certify that.
  - **New tools:** `smoke_source_quirks` 4/4; TradingView daily reference `data/master/tv_daily_reference_2018_2026.json` (via `scripts/measure_tv_daily.cjs`, chart restored).
  - **Live check (market closed):** pre-open READY 15/15 · store = Polygon on 11 series · stream 8/8 · TradingView anchors XAU / XAG 17/17.
- **(cm) 2026-10-18 — 15m SWINGS: THE NEXT MOVE (spec `docs/SWING_NEXTMOVE_15M_SPEC.md` + ADDENDUM A; Ashraf: all four meanings, "Yes, run it as written"). Book `docs/SWING_STUDY_BOOK.md` §5I, observations 36-40; atlas `docs/SWING_NEXTMOVE_15M_ATLAS.md` (generated from the JSON); every event `docs/swing_book/nextmove15m/events_k3.csv`.**
  - 15,331 confirmed 15m swings (k = 3; 6,014 OOS), all measured from the confirmation close, on the corrected history.
  - **Q1, direction:** 0 / 6. The leg continues like a random close (OOS 50.3 % vs 49.1 % at 1 ATR); k = 2 / 5 flip signs.
  - **Q2, size (ATR, stable TRAIN ↔ OOS):**
    - remaining after confirmation: median 1.95 ATR (P25 0.91, P75 4.09);
    - adverse first: median 0.52 ATR (P75 1.09);
    - full leg: median 4.97 ATR.
    - Dollars doubled with the price level.
  - **Q3, timing:** the next extreme comes a median 7 bars after confirmation (P75 19), confirmed at a median 16 bars.
  - **Q4, levels:** the pre-registered check flagged the previous opposite 15m swing and $10 round numbers. **ADDENDUM A** (distance-matched placebo, written before its numbers) REFUTES both: 7.0 vs 7.7 %, 10.2 vs 10.0 %. 0 / 6 robust. The previous-day extreme is hit LESS than chance (passed through).
  - **Splits:** 0 pass. The ladder is uninformative at 15m confirmation (98.5 % have all three steps flipped).
  - **No trade rule.** Lesson: a level control must match DISTANCE (observation 38).
  - **Code:** `scripts/lib/swing_nextmove.mjs`, `study_swing_nextmove15m.mjs`, `report_swing_nextmove15m.mjs`, `smoke_swing_nextmove` 6/6.
- **(cn) 2026-10-18 — LAST-YEAR SWINGS ON 16 TIMEFRAMES + THE REASONS CHECKLIST: XAU, XAG, WTI, DXY (Ashraf: "start with XAU first … mark the Swing points", "confirm it with exact Candles time frame on trading view", "list down all the reasons … check list … for each swings point at daily Candles and 4H candles", "do same exact for Silver, DXY, WTI"; DXY "i need both").**
  - **Window** 2025-10-16 → 2026-10-16. Swings: ZigZag 3 × ATR(14) per timeframe on full history; confirmed swings only. Tables `docs/swing_book/<xau|xag|wti|dxy|dxy_ice>_1y_swings/<tf>.csv` + `data/master/<short>_1y_swings.json` (`scripts/swings_1y.mjs <SYM>`).
  - **Candles per instrument (`scripts/lib/series_1m.mjs` kit, ONE loader):**
    - XAU / XAG: Polygon spot, gold session (`nyCandles`) + reopen clamp (18:00-18:04 NY minutes clamped to the next 10 minutes' range; measured best of 2 rules; study candles only).
    - WTI: CME crude 1m on the CME session (`src/core/sessionCandles.js` `cme`), no clamp (measured: raw = TradingView).
    - DXY: rebuilt from the 6 pairs, on the gold grid (joint analysis with gold); DXY_ICE: the same minutes on TradingView's ICE session (`dxyIce`, 56 measured closed dates embedded to 2026-10-16). No clamp (no help measured).
    - `smoke_session_candles` 3/3 (gold session = `nyCandles` exactly over 13 y × 16 TFs; WTI vs `tv_anchor_reference_CL1.json`; DXY vs `tv_anchor_reference_DXY.json`).
  - **TradingView check (`scripts/compare_tv_swings.mjs`, `<short>_1y_swings_tv_check.json`):** same swing candle XAU 99-100 %, XAG 99-100 %, WTI 99.9-100 % (price diff median $0), DXY_ICE 95-97 % below 1H and 100 % from 2H. Same extreme candle: XAU 89-100 %, XAG 85-100 %, WTI 96-100 %, DXY_ICE 61-94 % on intraday (rebuilt DXY minutes carry no real intra-minute wicks). DXY on the gold grid fails 3H+ by design (different session).
  - **Reasons checklist** (spec `docs/SWING_REASONS_CHECKLIST_SPEC.md`; `scripts/study_swing_reasons.mjs <SYM>` + `report_swing_reasons.mjs <SYM>`; atlases `docs/SWING_REASONS_ATLAS.md`, `_XAG`, `_WTI`, `_DXY_ICE`, `_DXY`): each reason at the swing candle ± 1 vs 3 random candles per swing (same TF + hour), Holm across the family. Partner: XAU↔XAG, others vs gold.
    - **Common to all four at 4H (significant after Holm): liquidity sweep** (XAU 55 vs 29 %, XAG 58 vs 21 %, WTI 67 vs 24 %, DXY 61 vs 24 %). **Climax candle** XAU / XAG / DXY; **CME volume ≥ 2×** XAU / XAG / WTI.
    - Specific: WTI and DXY swings come with gold DIVERGING (24 vs 8 %, 35 vs 12 %); DXY: RSI divergence 18 vs 5 % and risk-off 15 vs 5 % pass on the ICE session only (gold grid: same direction, not significant after Holm; sweep / gold diverges / climax pass on both DXY versions); XAG 1D month end 7/15 (control rate 2 % is low by chance; calendar base ≈ 15 %, so still unusual, n small).
    - Caveat: sweep / climax are partly built into being the extreme candle. 1D samples (10-15 swings) describe, not prove. No trade rule.
- **(co) 2026-10-18 — 3m STRUCTURE CONFIRMATION AT THE LAST-YEAR SWING TIPS: XAU, XAG, DXY (ICE), WTI (spec `docs/STRUCTURE_3M_CONFIRMATION_SPEC.md`; Ashraf: "Yes, run it as written"). Atlas `docs/STRUCTURE_3M_CONFIRMATION_ATLAS.md`; every tip `docs/swing_book/structure3m/<asset>_<tf>.csv`; JSON `data/master/structure_3m_confirmation.json`.**
  - **Anchors** = exactly the published 15m / 1H / 4H / 1D swing tables (rebuilt and checked equal, all 16). Controls = failed extremes (pullback ≥ 1 ATR); audit adds EVERY failed extreme (that filter is hindsight).
  - **The exact level:** for a low, the last 3m lower high (3-candle pivot) of the leg; confirmation = the first 3m CLOSE above it. Median distance from the tip 2.1 / 1.2 / 0.6-0.8 / 0.3-0.4 anchor ATR (15m / 1H / 4H / 1D), about 4.5-6 3m-ATR at every timeframe. It prints a median 40-85 minutes after the tip and BEFORE the anchor ZigZag confirms in 87-90 % (15m) and 96-100 % (1H+).
  - **Real-time precision** (share real among all tips that got a 3m confirmation, every failed extreme counted): 15m 64-67 %, 1H 36-44 %, 4H 23-31 %, 1D 15-22 %. So it is a useful early filter only on 15m; on 4H / 1D most 3m confirmations at a running extreme fail.
  - **At the tip (15m, all four assets, Holm-significant vs failed):** a 3m higher low / lower high before confirmation (52-60 % vs 32-43 %); V-turns are more common at failed tips; after confirmation price comes back to the level at 78-85 % of real tips, and a retest that HOLDS (no close back through) is 14-22 % real vs 4-7 % failed. Sweep of the previous 3m pivot (14-21 %), double tip, strong confirming candle: same at real and failed = not informative.
  - **Same or different:** XAU, Silver and WTI: 0 significant differences in 312 asset-pair comparisons. All 17 differences involve DXY, 11 of them candle shape / wick (rebuilt DXY minutes have no wicks: confirming body / range 0.98 vs 0.72). No trade rule.
  - **Code:** `scripts/lib/structure3m.mjs` (ONE implementation), `study_structure_3m.mjs <SYM>`, `report_structure_3m.mjs`, `smoke_structure_3m` 5/5 (in smoke_all).
- **(cp) 2026-10-18 — TRENDLINES 1W / 1D / 4H / 1H, BOTH SIDES, 6 YEARS: XAU, XAG, DXY (ICE); WTI 2 years (spec `docs/TRENDLINE_STUDY_SPEC.md`; Ashraf: "Yes, run it as written, WTI on 2 years only"). Atlas `docs/TRENDLINE_STUDY_ATLAS.md`; JSON `data/master/trendlines_study.json`; app page http://127.0.0.1:7444/trendlines (📐 button on the live chart).**
  - Objective lines: two confirmed pivots (major = ZigZag 3×ATR, minor = fractal 5), no close through between them, born at the 2nd pivot's confirmation; touch within 0.25 ATR after being ≥ 1 ATR away; RESPECTED = 1 ATR bounce before a close 0.25 ATR through. Control = each line shifted ±0.75 / ±1.5 ATR (placebo).
  - **Result: trendlines are NOT respected beyond chance, on any asset or timeframe.** XAU real 44-47 % vs placebo 45-47 % (lift −1.9…+1.1 pp, every 95 % interval spans 0); Silver, DXY, WTI the same. 264 kinds tested (scale × side × trend/counter × 1st/2nd+ test × steepness): 0 beat placebo after Holm. Walk-forward (first 3 y vs last 3 y): 5 kinds pass vs 6 passing the reversed test = chance level. Per-year lifts flip sign year to year.
  - Assets: 3 differences in raw respect rate (XAU vs WTI 4H counter resistance; Silver vs DXY 1H supports), but the placebo rates move with them = how each asset bounces off ANY line, not trendlines.
  - **Audit:** independent second evaluator 0 differences in 24,000 line evaluations (4 assets × 4H / 1D); positive control (cheating lines at the real next swing low) respected 98-100 % vs placebo 44-57 % → the method detects respect when it exists; the null is measured.
  - **Code:** `src/master/trendlines.js` (ONE implementation, also used by the app page), `scripts/study_trendlines.mjs <SYM>`, `report_trendlines.mjs`, `audit_trendlines.mjs <SYM> <tf>`, `smoke_trendlines` 9/9 (in smoke_all); page `ops/trendlines/index.html` + `/api/trendlines` in `run_chart.mjs` (read-only; display lines = study artifacts; active lines drawn only within 5 ATR of price). Display refresh = re-run the study (not yet scheduled).
- **(cq) 2026-10-18 — LIVE MAJOR-TRENDLINE ALERTS, 4H + 1D, both sides: XAU, Silver, DXY (ICE); WTI computed but BLOCKED (Ashraf: "when ever it reach those major trend lines from both sides we need alert for either a bounce or a major break" → "4H and 1D", "Telegram group + app", "All three"; then "same for DXY and silver, WTI").**
  - Honest framing in every message: the study measured NO edge at a touch (bounce first ≈ random line), so the alerts report WHAT HAPPENED, never a forecast. Numbers come from `trendlines_study.json` per kind of line.
  - 📐 **AT LINE** (an armed major line, forming candle within 0.25 ATR) and ✅ **BOUNCED** (1 ATR away after a touch on an earlier candle) → `scripts/trendline_tick.mjs`, every minute (25 s after the close) while the market is open. ❌ **BROKEN** (closed candle ≥ 0.25 ATR through, touched or not) → `scripts/trendline_lines.mjs <SYM>`, the full-history line refresh with the study's code on closed candles, queued per asset whenever the tick sees a newer closed candle (each session's own 4H / 1D close; all four at start).
  - Fail-closed: no fresh minute; lines file older than the last closed candle; 18:00-18:16 New York (reopen clamp settling); data-health gate (DATABASE STALE). **WTI is BLOCKED by the red rule** (Polygon feed 10 min delayed): computed + shown in the app, never sent, until Ashraf decides.
  - **Proof: minute-by-minute replay with the live code vs the study's truth** (`scripts/replay_trendline_alerts.mjs`): XAU 30 d 39/39 and 180 d 224 events, missing 0; silver 90 d 68/68; DXY 90 d 87/87. One documented difference (XAU, 1 in 180 d): a live BOUNCED whose candle then closed back through — the study counts that as BROKEN; live sends BOUNCED, then BROKEN at the close (the BOUNCED message says so; the replay allows it only when the same-candle BROKEN is also sent).
  - **Code:** `scripts/lib/trendline_live.mjs` (`liveLines`, `tickCheck` — ONE implementation), `scripts/lib/trendline_alerts.mjs` (messages, measured odds, ledger `data/telegram/trendline_alerts.json`, red-rule block), `src/master/trendlines.js` (+ live state armed / pending), `smoke_trendlines` 12/12, `smoke_trendline_alerts` (in smoke_all), hooks in `run_twin.mjs`. App: live alert box on http://127.0.0.1:7444/trendlines (state `data/master/trendline_tick_state.json`); 4H / 1D page data now refresh live.
- **(cr) 2026-10-18 — S/R LEVELS 1H / 4H / 1D / 1W / 1M, XAU / XAG / DXY (ICE) + WTI (2 y, DELAYED): measured strength + live refresh + zero-stale monitoring (spec `docs/SR_LEVELS_SPEC.md`; Ashraf: "Yes, run it as written", WTI "Show, marked DELAYED"). Atlas `docs/SR_LEVELS_ATLAS.md`; app http://127.0.0.1:7444/sr (🧱 S/R button).**
  - Levels = confirmed ZigZag 3×ATR swings of each timeframe (born at confirmation); test HELD = 1 ATR bounce before a close 0.5 ATR through; a close-through FLIPS the level (support ↔ resistance), a second retires it. Control = each level shifted ±0.75 / ±1.5 ATR.
  - **Result: no strength class is STRONG.** 176 classes (tf, confluence across timeframes, earlier holds, reaction size, CME volume 2 y, flipped, score S): 0 beat placebo after Holm (2 worse); walk-forward 1 vs 7 reversed = chance. All-level hold: XAU 55 / 55 / 60 % on 1H / 4H / 1D vs placebo 55 / 56 / 59 %; 1W hints (XAU 78 vs 62 %, n 23) are described only. Agrees with §7 (ai) (multi-touch = random).
  - **Audit:** independent evaluator 0 differences (8 asset × TF runs, 20,000 evaluations); positive control 99-100 % vs placebo 55-61 %.
  - **Live:** `scripts/sr_refresh.mjs <SYM>` every hour at :04 while open (+ at start), all four assets queued, never together with the trendline refresh; full Polygon history, study code on closed candles; each level's own record (held / tests, flips) + its classes' measured hold % (`scripts/lib/sr_live.mjs`). Fail-closed: stale newest minute → exit 2, nothing written. **Replay proof** (`replay_sr_levels.mjs`, 90 d every 6 h): live on the history available then = full-history truth, 0 differences in 5.9 M level states (XAU, XAG, DXY, WTI).
  - **Zero-stale monitoring** (`src/core/dataHealth.js` §9, Telegram after 3 checks): SR_FEED_STALE (> 75 min while open), TL_FEED_STALE (> 4.5 h), TL_TICK_STALE (> 5 min), FEED_REFRESH_FAILED (2 failed refreshes; exit 2 = stale minutes) — WARN (derived feeds; the raw feeds stay CRITICAL and halt every signal). The S/R page blinks STALE (data gate halted, or S/R > 75 min old while open). WTI labelled DELAYED (Polygon plan).
  - **Code:** `src/master/srLevels.js`, `study_sr_levels.mjs`, `report_sr_levels.mjs`, `audit_sr_levels.mjs`, `replay_sr_levels.mjs`, `sr_refresh.mjs`, `scripts/lib/sr_live.mjs`, page `ops/sr/index.html` + `/api/sr`; smokes `smoke_sr_levels` 8/8, `smoke_sr_live` 13/13, `smoke_data_health` 15/15. No S/R notices (none measured strong — spec §4 asks only after the result).
- **(cs) 2026-10-19 — MONEY TEST: entering on the 3m confirmation at 15m swing tips, overall and AT S/R levels (spec `docs/CONFIRM3M_MONEY_SPEC.md` + addenda A full spread / B raw minutes; Ashraf: "Yes, run it as written", "can u check this specially at strong S/R levels"). Atlas `docs/CONFIRM3M_MONEY_ATLAS.md`; last week `docs/REVIEW_WEEK_2026-10-12.md`.**
  - Entry = real-time 3m confirmation (confirmed pivot only) at the running tip of a 15m leg; stop tip ∓ 0.1 ATR15; targets 1R / 2R / 1 ATR / 2 ATR; 300-min time stop; 1m fills stop-first; second arm = holding retest. 13 y XAU (17,190 entries, 3.6 / day), XAG (16,918), DXY (21,410, R only), WTI 2 y (2,554, R only).
  - **Result: 0 / 384 cells pass.** Before costs it is a COIN FLIP: XAU 1R WR 50 % (+0.006 R), the same at S/R levels (at a level +0.003 R, 1D level −0.009 R, "usual strong" +0.004 R) and on Silver / DXY / WTI. After the measured spread XAU loses −$0.41 / trade (−0.115 R), every split; Silver −$0.03 (1R WR 30 %: its spread is large against its small stops). The 3m confirmation finds REAL turns (64-67 %) but the entry after it has no edge on the next move.
  - **Audit (all four):** independent trigger finder identical (745 / 718 / 777 / 693 entries, 180 d); causal prefix replay 0 differences; independent simulator 0 / 2,400; positive control (entry at the true tip) 1500/1500 (Silver 1436/1500).
  - **Silver spread measured** for this test: `spread_table_XAGUSD.json` (Polygon quotes, 3,551 samples; ≈ $0.04, 2022-24 ≈ $0.01 where the quote archive is thin). `measure_spread_polygon.mjs` takes `SPREAD_SYM`.
  - **Last week (2026-10-12 → 16), descriptive:** XAU 6 S/R tests (5 held), 31 entries, 1R 16/30 (+$42.67); Silver 21 tests (7 held), 1R 10/25 (−$1.93); DXY 34 tests (14 held), 1R 12/28 (−3.5 R); WTI 21 tests (8 held), 1R 11/18 (+3.5 R).
  - **Code:** `scripts/lib/confirm3m.mjs`, `study_confirm3m.mjs <SYM> [--gross]`, `report_confirm3m.mjs`, `audit_confirm3m.mjs`, `review_week_sr3m.mjs [from] [to]`, `smoke_confirm3m` 9/9.
- **(ct) 2026-10-19 — XAU + DXY TOGETHER AT S/R LEVELS, SAME TIMEFRAME (spec `docs/XAU_DXY_SR_SPEC.md`, written before the numbers; Ashraf: "what if XAU and DXY check them at the same time frame at S/R level"). Atlas `docs/XAU_DXY_SR_ATLAS.md`; `scripts/study_xau_dxy_sr.mjs`.**
  - DXY on the gold grid (identical candle times). Part 1: every XAU level test tagged by DXY testing its own level on the same candle — OPPOSITE side (gold support + DXY resistance) / SAME / NONE — vs placebo copies under the same tag. Part 2: XAU 3m entries with an opposite DXY 3m confirmation in the 15 / 60 min before entry, money after spreads.
  - **Part 1:** no lift in any cell (0 Holm passes). With DXY at the opposite level on the same candle XAU levels hold LESS (1H 42 % vs 58 % with no DXY test, 4H 47 % vs 56 %) — but XAU's placebo copies drop the same (43 %, 52 %): it marks a moment when both markets move hard (any line breaks more), not a level effect. 1D / 1W / 1M too few.
  - **Part 2:** DXY agreeing does NOT help: before costs WR 49 % (−0.02 R) with DXY opposite in 15 min vs 50 % without; after spreads −$0.51 vs −$0.40 per trade; both at levels with DXY agreeing 48 % (−0.07 R). 0 pass. Consistent with 2026-08-21: DXY co-moves with gold, it does not lead.
- **(cu) 2026-10-18 22:20 UTC — POLYGON SENT NO PRICES AFTER THE SUNDAY OPEN; the health watcher missed it → fixed (Ashraf: "i think we are stale and no health warning").**
  - Measured: Polygon REST had no XAU / XAG minute after 21:00 UTC and 0 gold quotes in the last 15 min; FX pairs stopped 21:42-21:56; the websocket closed every ~30 s (code 1005, 38 reconnects). Upstream outage, not our store.
  - Why no warning: the stream marks an empty minute "quiet" and still advances `settled_through` (78 quiet minutes counted as settled), and the 40-min reopen grace suspends the live checks. **Fix:** `dataHealth` check 2c **NO_LIVE_TICKS** (CRITICAL): once the market has been open 10 min, the newest REAL tick of gold, silver and every DXY pair must be < 10 min old, regardless of the grace. Live verdict switched to STALE at 22:22, Telegram announced 22:24 (sent, 200), red banner up; the chart pill can no longer say "LIVE · ticks verified" while health is STALE ("NOT LIVE · no ticks (STALE)"). `smoke_data_health` 15/15 (reopen test rewritten: 22:05 no alarm, 22:12 STALE by NO_LIVE_TICKS alone).
  - Also found + fixed: the TradingView cleaner drops trading dates < 60 min as holiday stubs — live, that hid EVERY session's first hour from the trendline alerts and the S/R refresh (the replay proofs used complete history, so they could not see it). `cleanForTv` / `sessionCandles.clean` take `keepLastDate`; `series_1m.kit(sym, { live: true })` / `clean1m(sym, { live: true })` are used by `trendline_tick`, `trendline_lines`, `sr_refresh`; studies keep the default.
- **(cv) 2026-10-19 — DXY WARNING ON THE S/R TAB (Ashraf: "add the DXY warning to the S/R tab").** `src/master/srDxyWarning.js` (ONE rule, `smoke_sr_dxy_warning` 8/8): forming 1H / 4H candle — XAU touches an armed level AND gold-grid DXY touches an armed OPPOSITE level → ⚠ "break more likely" with the measured numbers (1H held 42 % vs 58 %, 4H 47 % vs 56 %; placebo the same → both markets moving hard, not a level effect). Gold-grid DXY S/R (`sr_live_dxy.json`) joins the hourly refresh (`SR_SYMS`); health judges its feed (S/R only). Fail-closed: reopen 18:00-18:16 New York, stale minutes, levels one candle behind.
- **(cw) 2026-10-18 23:00 UTC — HISTORY DATABASE: NO DUPLICATES (Ashraf: "make sure we do not have duplication with history database").** New `scripts/scan_store_duplicates.mjs` streams EVERY line of all 21 stored 1m series (≈ 100 M minutes, 2009 →): 0 duplicates, 0 out-of-order, 0 unreadable (`data/master/store_duplicates_scan.json`) — after tonight's outage, 56 stream reconnects and REST refills. `audit_recording.mjs 3`: clean — every hole of the last 3 days (incl. 22:00-22:34 tonight) has no bars at Polygon either (provider outage), our misses 0. App restarted 22:38 UTC (Ashraf OK): startup refreshes OK (trendlines ×4, S/R XAU / XAG / WTI / gold-grid DXY; DXY_ICE killed by the 5-min limit while the full scan loaded the machine — re-runs hourly). The S/R refresh now sees the forming session (last minute 22:45-22:55), DXY warning computing.
- **(cx) 2026-10-18 23:15 UTC — BUILD-01 CLOSED, ZERO-DRIFT HANDOFF (Ashraf: "save all our in this chat 100% … add the Claude skill that makes you remember everything … what to tell for next chat").** `docs/HANDOFF_BUILD02.md` (live jobs, every piece of build-01 with its §7 letter (cj)…(cw), answers, binding decisions, open items, file map, working rules; verified to contain every letter and every referenced file). New Claude skill `twin-turbo-continuity` (resume §A / keep current §B / handoff §C); magic phrase **"Ferrari Twin Turbo build-02"** in the global CLAUDE.md; memory index top line + `project_twin_turbo_build01_handoff.md`.
- **(cy) 2026-10-19 — SELL TRIGGER: GOLD SWEEPS A HIGH, SILVER DOES NOT CONFIRM — REFUTED 0/24 (Ashraf: "we need to improve the sell trigger as well above 85%-95% WR, please work in it intensively" → "Yes, run it as written"). Spec `docs/SELL_SMT_SWEEP_SPEC.md` + ADDENDUM A (raw minutes, entries at the next candle's first minute, gaps, overlaps — written before any number); atlas `docs/SELL_SMT_SWEEP_ATLAS.md`.** Code `scripts/lib/sell_smt.mjs` (ONE implementation), `scripts/study_sell_smt_sweep.mjs` → `data/master/sell_smt_sweep_study.json` (+ trades), `scripts/audit_sell_smt_sweep.mjs` → `sell_smt_sweep_audit.json`. 1H / 4H, 2013-07 → 2026-10, TRAIN to 2021-06, measured spread. 1H: 3,715 sweeps, 1,343 with silver not confirming; 4H: 980 / 386. **Highest OOS WR 77.6 %** (1H SMT, 3m break, 0.25R; n 295, ~1/week; OOS +$0.14 LB −$0.76; TRAIN −$0.51) — a random SELL with the same hour / stop / target wins 75.3 %; every cell is within ±4 WR points of its random control → the WR is the geometry. 1H silver non-confirmation loses less than all sweeps (−$0.28 vs −$0.58), still a loss; 4H worse. Oracle positive control (next 4 candles fall) only 82-84 % WR at 0.25R → 85 %+ with a stop above the sweep is out of reach even with hindsight. Audit CLEAN: independent evaluator 300 trades 0 differences; prefix check 200 cuts, 517,304 signals + 9,040 3m entries 0 differences. A first-run bug (3m-break search key → 0 T2 trades) was fixed before reporting. Seventh SELL family measured; nothing wired, the live app unchanged.
- **(cz) 2026-10-19 — STALE TRENDLINE PAGES + WHALES 15m "unavailable" FIXED (Ashraf: "i think we have a stale issues in the App" with the 1H trendlines tab ending Friday; "also i noticed that whales is not working 15m").** (1) **Trendlines:** only 4H / 1D page data were refreshed live; 1H / 1W were the 10-18 study snapshot, and an open page never reloaded. `liveLines` gained `displayTfs` (page-only timeframes, same rules, never alerts, never in `live.tf`); `trendline_lines.mjs` now writes 1H + 1W too (atomic tmp+rename). Proof (refactor-then-diff): at the study's cut the new code gives the study's 1H candles + lines IDENTICAL on XAU / XAG / DXY_ICE / WTI (15,322 / 15,587 / 14,742 / 3,900 lines); 1W identical once the new week has opened (on the weekend the finished week is still the forming candle by the closed-candle rule — conservative, by design). run_twin queues the trendline refresh 2 min after every hour as well (1H page), and the refresh limit is 10 min (DXY_ICE took 223 s). The page reloads every 5 min and shows a blinking STALE banner (`stale` from run_chart: snapshot / DATA STALE / not refreshed within 75 min (1H) or 4.5 h (4H/1D/1W) while open). Ran all four now: 1H through the 06:00 candle. (2) **Whales:** the pill fetched 3 calendar days of GC 1m; the gauge needs 100 closed 15m bars, and on a Monday morning 3 days held 91 (weekend inside) → null → "unavailable" until ~10:00 UTC every Monday. Now 7 days (reading at 07:40: QUIET, max 1.89× normal); a null now says why on the pill. Rule (goldWhale.js) unchanged; the verdict stays "no direction edge". Smokes: trendlines 12/12, trendline alerts 11/11, gold whale 4/4, chart 14/14, package sync 3/3. Needs a restart of run_chart (pages/API) and run_twin (hourly queue) to go live.
- **(da) 2026-10-19 11:50 UTC — WTI S/R "not refreshed / failed twice" FIXED (Ashraf: "pls fix all including whales").** Cause, measured from `child_runs.jsonl`: `sr_refresh.mjs` refused WTI when its newest minute was > 20 min old, but WTI's newest stored minute is NORMALLY 13-28 min old (10 min Polygon delay + 12-min finality, recorded every 15 min at :08/:23/:38/:53). Until 08:11 the WTI refresh happened to run at ~:12 (data ~17 min old → OK); after (cz) put the hourly trendline refresh first, it ran at :17-:19 (22-24 min → exit 2 every hour from 08:47) → SR_FEED_STALE + FEED_REFRESH_FAILED. Fix: WTI lagMax 35 min (normal max + margin; a stopped recorder still fails closed). Manual WTI refresh 11:47 OK (logged in child_runs); health 11:49 OK, 0 issues, all feeds fresh. Whales checked: working — BEARISH on one 2.29× GC bar at 10:30 UTC that closed near its low (pressure −0.6), 10 min delayed as designed; verdict stays "no direction edge". No restart needed (run_twin spawns sr_refresh fresh each hour).
- **(db) 2026-10-19 12:40 UTC — STALE PREVENTION, measured from 7 days of `child_runs.jsonl` (Ashraf: "we need to solve issues of stales never happen again").** Audit of every job's failures (7 d): calendar Fed sources failed one attempt in **39 / 310 runs** (fed_fomc "fetch failed", fed_speeches HTTP 406) → a 30-min DATA WARNING each time; S/R DXY_ICE **killed 3×** (runs 190-306 s vs a 300 s limit; gold-grid DXY the same range); S/R WTI refused 5× (fixed in (da)); single provider/DNS blips in matrix_tick / reconcile / record_futures healed next run (no action). Fixes: (1) `calendar.js getText`: 3 tries (backoff 2 s / 6 s), correct Accept per resource (speeches JSON asked as text/html → 406), then curl (other network stack; both Fed URLs 200 by curl); historical FOMC pages 2 tries. (2) run_twin: calendar re-runs 5 min after a run with a failed source (was 30); its limit 6 min. (3) run_twin: S/R refresh limit 5 → 10 min; every S/R + trendline refresh row now carries `ms` + `limit_ms`. (4) `dataHealth.js` FEED_SLOW (WARN): 2 of the last 3 timed runs ≥ 80 % of the limit → warned BEFORE a kill. Smokes: data health 15/15 (+ FEED_SLOW cases), calendar 6/6; live calendar fetch 11 s, all sources OK. Items (1) and (4) are live at once (spawned per run); (2) and (3) need a run_twin restart.
- **(dc) 2026-10-19 — MATRIX SCALP: veto a gold BUY when DXY's OWN Matrix BUY fires at the same time — NO PASS (0/2) (Ashraf: "DXY is triggered for buy at the same time XAU does … that should not trigger the trade if it is true at the same time until we know which is fake"; spec `docs/MATRIX_DXY_CONFLICT_SPEC.md` before any number).** Today's journal: 8 SCALP BUYs, 2 wins (+$12.11, +$4.69), 6 SL; ≈ −$8.40/oz; every entry passed the existing DXY rule (DXY 3m close < EMA10). The app never ran the Matrix ON DXY; now measured: DXY BUY = `matrixSignals(dxy3m, dxy3m, wti)` on gold-grid DXY. **Today none of the 8 gold BUYs had a DXY Matrix BUY on the same candle or within 15 min** (DXY BUYs 00:06-00:42, 02:15, 05:45, 07:03-07:06, 11:00 UTC) — Ashraf's TradingView "Direct Long" is on DX1! (ICE futures, real wicks); our DXY is rebuilt from 6 Polygon pairs (wickless minutes) and ICE futures are not on Polygon, so wall touches differ. History (`study_matrix_dxy_conflict.mjs` → `matrix_dxy_conflict_study.json`, money path = the gate's sequence, veto before sequencing): V0 same candle — 2 y OOS vetoed −$1.48/t (n 100) vs kept −$0.90, book −$0.918 vs baseline −$0.936; but 13 y TRAIN reversed (vetoed −$0.55 vs kept −$0.72) → FAIL; V15 fails 2 y OOS too. The conflict is not why the SCALP loses (book ≈ −$0.92/t either way). Nothing wired; `matrix_trades.mjs` gained an optional `keep` filter (default unchanged).
- **(dd) 2026-10-19 — DXY MATRIX info chip (Ashraf: "Yes, show DXY's own Matrix BUY/SELL as an info chip on the chart").** `matrix_tick.mjs` now also runs the Matrix ON DXY each 3m close (`matrixSignals(dxy3m, dxy3m, wti)`, gold-grid DXY, fail-closed on stale data / health STALE) → `matrix_state.dxyMatrix` {last signal of the past 60 min, on this candle?, same candle as a new gold box?}; `/api/matrix` passes it (≤ 9 min old); chart chip "DXY Matrix BUY/SELL · this candle / N min ago · ⚠ same candle as the gold box · info only, veto measured: no edge", tooltip states the DX1! (ICE, wicks) vs rebuilt-DXY difference. Nothing gates a trade. Also fixed `smoke_chart`: its market-state list missed TREND_UP / TREND_DOWN (failed only on trending days). Smokes: ferrari matrix 8/8, chart 14/14. matrix_tick change is live at once; the chart server (run_chart) needs a restart for the chip.
- **(de) 2026-10-19 17:30 UTC — Whales chip shows its data time (Ashraf: "why whale is not feeding").** Measured: it WAS feeding — last delivered GC 15m bar 17:00-17:15 UTC (10 min delay as designed), GOLD_FUT recorded to 17:10; reading QUIET (busiest bar 0.99× normal; a reading needs ≥ 2×). The grey QUIET text looked dead, so the chip now prints "bar HH:MM–HH:MM UTC" on every live state and "needs 2×" on QUIET. Page-only change (served per request, no restart); browser-checked; smoke_chart 14/14.
- **(de2) 2026-10-20 — 4H CHoCH that really changes the trend + ADX + the exact entry — 0 PASS (Ashraf: "study the real ChoCH … read the ADX at the levels at 4H … find the method for the exact entry … confirm it works 100%"; then mid-run: only at the broken S/R, retest, no OB cross, green confirmation, ADX change; long swing only; retest INTO the OB and the first CHoCH inside the OB).** Spec `docs/CHOCH_4H_ADX_SPEC.md` + ADDENDA A-F, each committed before its numbers; atlas `docs/CHOCH_4H_ADX_ATLAS.md`; code `scripts/lib/choch4h.mjs` (ONE implementation), `study_choch_4h_adx.mjs`, `study_choch_retest.mjs` (`--structure --long --ob`), `study_choch_drift_control.mjs`, `audit_choch_4h.mjs`. XAU 13 y primary, XAG replication. (A) CHoCH REAL 64-65 % vs random 45-51 % was GEOMETRY (tip 2.6 vs 1.3 ATR); distance-matched: BUY no edge (63.7 vs 66.6 %), SELL +8.8 pts p 0.02 (neither window alone), silver none. ADX: 0/18 Holm. Money (all variants, gold + silver): 0 pass. Strict S/R setup: 8 in 13 y (unpowered). OB-retest + first 15m CHoCH inside the OB (≈ 10/yr): gold BUY positive both halves (hold to the opposite CHoCH: +$4.25 / +$24.08, WR ≈ 35 %), SELL loses, silver loses; drift control (F): setup − random BUY with the same stop/exit +$4.6…+$13.6 but every 95 % interval includes 0 → not proven beyond gold's rise. Audit CLEAN (200 trades 0 diff; 100 prefix cuts, 27,388 events + 7,530 setups 0 diff; oracle +$20.67 vs +$10.12). 100 % is not reachable with any of these rules.
- **(df) 2026-10-20 — Matrix SCALP kept buying in a bearish market: last 2 days reviewed + structure gates measured (Ashraf: "the market confirm reversal to Bearish trend and we keep sending signal to buy and it fails most of the times … and we never trigger a sell trades").** Since the 10-18 22:00 open: 13 SCALP BUYs, 2 wins, 11 SL, −$27.91/oz, 0 SELLs; gold 4175 → 4123. Structure (`choch4h`): 1H bearish CHoCH 10-19 11:00 (close 4161.27 broke the 4165.53 higher low), lower high 4146.90, lower low 4115.57 — 1H LH+LL confirmed only 10-20 07:00; 4H LH+LL (highs 4200.24 → 4198.60 → 4190.17), ADX 14 (weak), −DI > +DI. The SCALP never reads the trend; its SELL rule fired 4× in 2 y (§7 (bh)); every SELL family measured since loses (§7 (as), (bi), (cy)). Spec `docs/MATRIX_STRUCTURE_GATE_SPEC.md` (+ ADDENDUM A), `study_matrix_structure_gate.mjs` → `matrix_structure_gate_study.json` / `_choch_study.json`. **V1H (no BUY while 1H pivots are LH+LL) PASSES:** 2 y vetoed −$0.74 / −$1.33 vs kept −$0.03 / −$0.77 (TRAIN / OOS), book −$0.03 vs −$0.20 and −$0.72 vs −$0.94; 13 y same signs. V4H fails (TRAIN reversed); C1H / C4H (last CHoCH bearish) fail (signs flip). V1H would have vetoed NONE of the last 2 days' 13 BUYs (LH+LL confirmed after them). The SCALP still loses with the gate (−$0.72/t OOS) → stays SHADOW. NOT wired yet (Ashraf to decide).
- **(dg) 2026-10-20 09:00 UTC — V1H STRUCTURE GATE WIRED INTO THE LIVE SCALP (Ashraf: "Yes, wire the V1H structure gate into the live SCALP").** ONE rule `scripts/lib/choch4h.mjs` `V1H` + `structureStateAt` (1H gold-session pivots 3/3, DOWN = last two pivot highs AND lows descending; read on the last 1H candle whose WHOLE hour has passed — a live forming candle's close_t is only its last minute + 1, caught on the first static tick at 08:57). `matrix_tick.mjs`: every 3m tick computes the gate from 45 days of live-cleaned minutes → `matrix_state.structureGate`; a BUY signal while DOWN (or the state unknown — fail-closed) opens NO box and is logged to `data/paper/matrix_vetoed.jsonl` (outside the trade journal, so the paper SCALP-85 boxes never show it). SELL signals unchanged. Study re-run with the live closed-candle rule: V1H numbers identical (pass holds). `smoke_structure_gate` 3/3 (hand-built LH+LL → DOWN and the forming candle not read; live 45-day window = full-history state at 300 random times 2014-2026, 0 differences; wiring fail-closed, vetoes outside the journal) — added to smoke_all; smoke_chart 14/14. Live since the 09:00 tick: 1H DOWN → SCALP BUYs blocked. Chart chip "1H structure DOWN · SCALP BUYs blocked" (`/api/matrix structureGate`) needs a chart-server restart. The SCALP stays SHADOW (−$0.72/t OOS with the gate).
- **(dh) 2026-10-20 09:35 UTC — Trendline 1D / 1W pages looked stale (Ashraf: "on the trend we have stale on the daily and weekly reading").** Measured: NOT stale — refreshed 09:01; the pages draw CLOSED candles only, so on 1W the last candle is last week (close 4163.82) and on 1D yesterday (4140.12), and the axis label showed that close. Fix (page only, served per request): a gold LIVE price line from `/api/live` (bid, every 30 s) + a note line "Candles = CLOSED <tf> candles only — the last one is … ; the forming candle is not drawn"; WTI: "No live price (10 min delayed feed)" (red rule). Browser-checked 1W / 1D / WTI.
- **(di) 2026-10-20 — TOP-DOWN SYSTEM (Ashraf's method as ONE system): HTF CHoCH = direction → swing (S-REV OB retest, S-CONT 1H continuation CHoCH) → scalps on 1H pullbacks (15m CHoCH, TP = last 1H swing) — 0/28 PASS (Ashraf: "trigger when a real reversal trigger on the HTF then go with its continuation trades … on the pull backs we can do a Scalp trades … take profit at the expected Continuation of the trend level"; "Yes, run it as written").** Spec `docs/TOPDOWN_SYSTEM_SPEC.md` (before any number); atlas `docs/TOPDOWN_SYSTEM_ATLAS.md`; `scripts/study_topdown_system.mjs` → `topdown_system_study[_xag].json`; `audit_topdown_system.mjs` CLEAN (200 trades 0 diff; 60 prefix cuts, 327,434 CHoCH events 0 diff; oracle +$7.87 / +$6.81 vs −$0.49 / +$1.22). Gold: LONG layers positive OOS but no better than the same entries without the regime or random longs (drift); SHORT swing layers lose; closest: 4H-regime SHORT scalps +$3.29/t OOS n 85 WR 42 %, beat random shorts OOS, but LB −$2.76, TRAIN +$0.29, silver −$0.01 → not proven. 1D regime similar or worse. Silver: every cell ≈ 0 or negative. `choch4h.trade` gained target type 'P' (absolute price). Nothing wired.
- **(dj) 2026-10-20 13:10 UTC — BUILD-02 CLOSED, ZERO-DRIFT HANDOFF (Ashraf: "Better start New chat").** `docs/HANDOFF_BUILD03.md` (live jobs + build-02 changes, every piece with its §7 letter (cy)…(di), answers, binding decisions, open items, file map, working rules). Memory: `project_twin_turbo_build02_handoff.md` + index top line. Resume phrase **"Ferrari Twin Turbo build-03"**. State at close: health OK, V1H gate live (1H DOWN → SCALP BUYs blocked).
- **(dk) 2026-10-20 14:20 UTC — DXY_ICE S/R REFRESH NEARLY KILLED → DXY 1m CACHE (Ashraf: "Yes, measure why DXY_ICE S/R refresh is slow and fix it (no restart without asking)").** Found at the build-03 resume: `sr_refresh DXY_ICE` ran 228-596 s today, 10:28 UTC = 596 s of its 600 s kill limit (FEED_SLOW did not fire: it needs 2 of 3 runs ≥ 80 %). Stage profile (quiet machine): DXY rebuilt from the 6 pair 1m stores **166 s**, ICE-session clean 26 s, candle builds 1H…1M 72 s, `findHoles` 3.5 s × 5 (once per timeframe), levels 1 s; gold's single store loads in 16 s. Three hourly jobs paid the DXY rebuild (S/R DXY_ICE, S/R DXY, trendlines DXY_ICE). Fix (commit 7ba0217): `src/data/dxy.js` 1m cache `data/cache/dxy_1m.bin` (gitignored) = joined minutes before a cutoff 10 days back, newer minutes always read fresh; invalid on pair-store identity / shrink / 33 sampled 4 KB blocks changed, a new correction line for a minute before the cutoff, or reader-code change; full rebuild every 7 days; `TWIN_DXY_NO_CACHE=1` = plain read. `sr_live.closedCandles` runs `findHoles` once. Proof `smoke_dxy_cache` 13/13 (added to smoke_all): 4,616,387 1m bars sha1-identical (plain full read vs rebuilt + extended vs hit) + 1h across the cutoff; full read 212 s → hit 15 s. smoke_sr_live 13/13 (its text checks were stale since build-02: SR_SYMS incl. DXY, WTI 35 min — fixed), sr_levels 8/8, sr_dxy_warning 8/8, ferrari_matrix 8/8, trendline_alerts 11/11. Live without restart (refreshes are spawned per run), 14:00 hour: S/R DXY_ICE **139 s**, S/R DXY **105 s**, trendlines DXY_ICE **161 s**; whole hourly refresh chain 14:02 → 14:21 (was ≈ 35 min). Incident: an Edit briefly broke dxy.js syntax (< 1 min, between two matrix_tick runs; none failed) → `node --check` after editing a module live jobs import. Also found: unrecorded watchdog restart 2026-10-19 21:59:43 UTC ("pid 10904 is dead (beat 55 min old)"), app died ≈ 21:04 UTC in the daily break, cause not measured, the 22:00 open not missed.
- **(dl) 2026-10-20 14:20 UTC — "we are not triggering any trades, why" (Ashraf).** Two gates blocked every signal today (both books SHADOW / paper): V1H (§7 (dg)) vetoed 10 SCALP BUYs 12:33-13:39 UTC while 1H stayed DOWN (LH+LL) and gold rallied 4111.55 → 4143.90; scored on Polygon 1m (stop first, TP1, no spread): 5 TP (≈ +$60/oz), 2 SL (≈ −$12), 3 open in profit at 14:19 (4138.48). IMPULSE_CONT state gate refused 2 SELLs (05:45, 06:00 UTC, "state favours BUY") — ~~both would have hit target in 15 min~~ **CORRECTED in (dn):** that was a first-touch check that ignored the book's LIMIT entry; priced by the live resolver they filled only at 06:15 (after the target touches) → SCRATCH +$0.88 and STOPPED −$8.81. One correlated rally ≈ 1 observation; V1H's 2 y + 13 y pass stands; nothing changed. Options put to Ashraf: keep + auto-score vetoes, or pre-register a faster-release gate study.
- **(dm) 2026-10-20 14:27 UTC — V1H KEPT + AUTOMATIC VETO SCORING LIVE (Ashraf: "Keep the V1H gate live as measured. Add automatic outcome scoring of every vetoed signal so the one-week review is ready with real numbers").** `scripts/lib/veto_score.mjs` (ONE place): each vetoed SCALP BUY is priced exactly as the box it would have been — `ferrariMatrix.resolveMatrixTrade` (fill + live spread + slip, stop first, TP1 half → stop to entry, TP2, 24 h horizon) on verified 1m bars with live spreads — once its trade is done → `data/paper/matrix_vetoed_scored.jsonl` (append-only); summary `data/master/matrix_veto_review.json`: vetoed (every signal / one box at a time — a pending box holds later signals) vs boxes KEPT since the gate went live (2026-10-20 09:00 UTC). `matrix_tick.mjs` calls it every tick (inside try, settles only on live data, never `--static`); live from the 14:24 tick without a restart (spawned per run), tick 3.6 s. `scripts/review_vetoed.mjs [--dry]` prints the review. `smoke_veto_score` 5/5 (hand-built TP1+TP2 +12.5 / same-bar stop first −5; no bars after now; sequencing; all real vetoes = resolveMatrixTrade; wiring) in smoke_all; structure_gate 3/3, ferrari_matrix 8/8, matrix_watch 4/4. First numbers (0.2 days, one rally ≈ 1 observation, NOT a verdict): 10 vetoed, 7 settled: every signal WR 71 % +$59.04/oz (+$8.43/t); one box at a time n 2 +$10.59 (1 box still open); kept 0. Review due ≈ 2026-10-27.
- **(dn) 2026-10-20 15:00 UTC — AUTOMATIC SCORING OF EVERY REFUSED IMPULSE_CONT SIGNAL (Ashraf: "Yes, add automatic outcome scoring of every REFUSED IMPULSE_CONT signal (same resolver as the live book), so we can see what the state gate costs on SELLs").** `scripts/lib/refusal_score.mjs`: each REFUSED row's `wouldBe` plan is copied once into its own journal `data/paper/impulse_refused_wouldbe.jsonl` as the PENDING row the book would have recorded (`wouldBeRow`, field-for-field the `recordSignals` trade row) and settled by the SAME `paperTrader.resolveOpen` (limit fill at the wick tip, 1m sub-bar fill sequencing, BE arm/lock with EA semantics, stop first, measured live spread) on the tick's own 15m bars; `trades.jsonl` is never written. Summary `data/master/impulse_refusal_review.json` per side, refused vs taken; WR = targets / (targets + stops) like the shipped 73.6 %. `twin_tick.mjs` runs it after the live resolve (inside try); live from the 15:00 tick (31 s, exit 0). `scripts/review_refused.mjs [--dry]`. `smoke_refusal_score` 6/6 (hand-built SELL TARGET +4.40; unpriceable → no row; **PARITY: both real taken trades replayed as refusals reproduce their recorded state / pnl / exit (BUY SCRATCH +0.939, SELL STOPPED −16.94)**; stats; dry run writes nothing; wiring) in smoke_all; paper_trader 37/37, paper_review 8/8. First numbers (journal since 10-09, 5 refusals): refused SELL 2 → 1 scratch +0.88, 1 stop −8.81 (net −$7.93); refused BUY 3 → 2 expired unfilled, 1 scratch +0.97; taken 2 → SELL stop −16.94, BUY scratch +0.94. **Correction of (dl):** today's 2 refused SELLs did NOT win — the earlier first-touch check assumed an immediate fill; the book enters on a limit that filled only at 06:15. Lesson: price every counterfactual with the live resolver, never a first-touch shortcut.
- **(do) 2026-10-20 15:30 UTC — NEON TRADE-TYPE NAMES ON THE CHART (Ashraf: "for the Swing, I need a NEON Box with clear Name 'Swing Trade', can u do that, and for Scalp Neon Box with 'Scalp Trade'").** `ops/chart/index.html` (page only, served per request → no restart): ONE helper `nameBox` draws a neon frame round the whole trade (entry, target and stop zones, clipped to the pane) + a big badge above it — **SCALP TRADE** (green #00ff9c) on the live Matrix box and the SCALP 85 % box (open / latest), **SWING TRADE** (gold #ffd23f) on the forward-arm swing boxes (arm 2 adds "record only"); finished trades fade. Badge only on an open trade + the latest DRAWABLE finished trade per arm (five same-day swing boxes stacked their badges; a signal in the 21:00 UTC daily break has no 1H candle and is skipped). Browser-checked on the live chart 7444: 1H 10-09 → 7 gold frames, badges "SWING TRADE · BUY" + "SWING TRADE · BUY · record only"; 3m → "SCALP TRADE · BUY · 85% exit"; a test Matrix box injected in the tab's memory only → green "SCALP TRADE · BUY" frame; no console errors. smoke_chart 15/15 (new check: one helper, both kinds wired). The SCALP/SWING Telegram alerts were already named ("TRADE SETUP READY — SCALP / SWING TRADE").
- **(dp) 2026-10-20 17:00 UTC — FULL APP SCAN (Ashraf: "pls scan the full app make sure everything is working perfect").** **smoke_all 78/78 suites green** (3,329 s; incl. the new dxy_cache, veto_score, refusal_score); no live job failed or was killed during it (47 runs; S/R 160-172 s, trendlines ≤ 221 s of 600 s; matrix_tick ≤ 6 s). Data health OK, 0 issues; stream live (8/8 symbols ticking), futures recorder, calendar 7/7 sources. 27/27 chart endpoints HTTP 200 without error fields (`/api/drivers` slow, 9.4 s); pages /, /sr, /trendlines 200. 24 h child_runs audit: matrix_tick 458/0, twin_tick 92/0, record_futures 93/0, swing scans 93/0 ×2, calendar 47/0; Telegram 32 sent / 0 failed; run_twin + chart logs clean. **Every failure in 24 h measured to the PC SLEEPING** (Windows System log): 10-19 21:04:53 → 21:59:23 UTC (event 42 + **187 = a user-mode process called SetSuspendState**, not the idle timer) — app down 55 min, children died with 0xC0000142 / 0x40010004, the daily-break T-15 pre-open check (21:45) never ran, watchdog restarted the app on wake; and **10-20 07:13:24 → 07:22:51 UTC** (London session) — 10 min without data (refilled), the silver S/R refresh (596 s on the wall clock) and a trendline tick killed on wake. `powercfg` (read only): Sleep-after never, **Hibernate-after still 3 h (0x2A30)** — the 09-06 setting was never changed. Not the app: power settings are Ashraf's (I may not change them). Earlier "unrecorded restart" (dk) = this 21:04 sleep.
- **(dq) 2026-10-20 17:10 UTC — KEEP-AWAKE LIVE (Ashraf: "Yes, add a keep-awake request to the app (it needs one app restart; ask me before restarting)"; then "Yes, restart the app now").** `scripts/keep_awake.ps1` (hidden PowerShell child of run_twin) holds `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` — the standard media-player request: idle sleep / idle hibernate (still 3 h on this PC) cannot fire while it is held; no Windows setting is changed; NOT display (the screen may still turn off); it does NOT block a sleep someone requests (Start > Sleep, lid, power button). Re-asserted every 60 s → `data/master/keep_awake.json`; exits within 60 s once run_twin is gone (tested standalone). `run_twin.mjs` `ensureAwake()` supervises it each cycle (respawn ≤ 60 s) and kills it on shutdown. `dataHealth.js` check 8b → `checks.keep_awake` + WARN **KEEP_AWAKE_OFF** when the stamp is > 3 min old or Windows refused it while the app runs (no file = not started yet → no issue). smoke_data_health 16/16 (new cases + wiring), watchdog 6/6, freshness 7/7; commit b2fd630. **App restarted 17:10:40 UTC** (Ashraf OK; taskkill /T + ops/watchdog_launch.vbs): keep-awake stamped 17:10:45 `ok:true`; **Windows confirms** CallNtPowerInformation(SystemExecutionState) = 0x1 → SYSTEM_REQUIRED held; health 17:16 OK, `keep_awake: held`; every job since exit 0 (matrix_tick, twin_tick, reconcile, calendar, futures, gamma, macro, trendlines XAU); chart /, /api/health, /api/matrix, /api/forward, /api/sr 200.
- **(dr) 2026-10-20 18:30 UTC — BLOCKED SCALP BUYs MADE VISIBLE (Ashraf: "i did not see any NEON Box appeared … i did not receive any Telegram msg"; then "Stop sending PREPARE while V1H blocks BUYs, draw a grey 'SCALP BLOCKED' box on the chart for each vetoed BUY, and send one Telegram notice per blocked episode (not every signal)").** Measured first: both channels worked — Telegram 32/32 delivered in 24 h (last TRADE SETUP READY 06:18, PREPARE 12:09 / 12:57 / 17:18, status 200); the last box opened 06:18; since V1H went live (09:00) all 17 BUYs were vetoed silently (1H DOWN all day). Fault found: the 17:18 PREPARE ("TRADE SETUP READY follows if it triggers") announced a BUY the gate then vetoed. Fixes (no restart — matrix_tick is spawned per run, the page is served per request, /api/matrix passes structureGate whole): (1) `matrix_tick` sends PREPARE only when `!structureGate.blocksBuy` (chart WATCH line unchanged); (2) `tradeAlert.alertBlocked` / `formatBlockedAlert` — "🧭 SCALP BLOCKED — BUY not opened" (entry/SL/TPs, reason 1H DOWN, later BUYs of the stretch not messaged, SHADOW) ONCE per blocked episode: `structureGate.blockedSince` = the 3m close BUYs became blocked, carried tick to tick, ledger key `BLOCKED:<blockedSince>` in alerted.json, sent after the state write, honours TWIN_ALERT_SCALP; (3) `structureGate.recent` = the vetoed BUYs of 24 h with their scored outcome (`veto_score.recentVetoes`) → chart `blkDraw` on its own layer `blkOverlay`: grey dashed frame entry → TP2 / SL + dashed entry/TP2/SL lines, from the signal to its scored exit (or now); latest named "SCALP BLOCKED · BUY <entry> · 1H DOWN (V1H) · would-be open / would have: <outcome> <$>", older ones a small "⛔ <outcome>" at their entry (7 same-hour boxes stacked their names). Browser-checked: 17 grey boxes 3m, names + outcomes; live 18:21 tick wrote blockedSince + recent (17), /api/matrix passes them. smoke_trade_alert 11/11 (PREPARE gated; one notice per episode, new stretch notifies again, no episode → nothing, throwing sender), smoke_chart 16/16, structure_gate 3/3, veto_score 5/5, matrix_watch 4/4. Note: the first stretch counted from the deploy tick (blockedSince 18:21 UTC), so the next vetoed BUY sends the first BLOCKED notice.
- **(ds) 2026-10-20 19:20 UTC — GREY BLOCKED BOXES REDESIGNED (Ashraf, with a screenshot: "i can not understand anything from these gray boxes").** His page showed 17 overlapping boxes (one per vetoed BUY; his tab still had the first version). Now ONE BOX AT A TIME, like the live SCALP and the same rule `veto_score.oneAtATime` prices: a blocked BUY gets a box only when no earlier blocked box is still running; BUYs that fire meanwhile are a count. Box = grey dashed frame, target side faintly green, stop side faintly red, from the signal to its scored exit (or now). Label in two lines: "⛔ BLOCKED BUY <entry> · 1H trend DOWN (V1H)" / "would have WON +19.07 (TP1 + TP2) · +8 more BUY signals meanwhile" (or LOST … (stop hit) / won … (TP1, rest closed at entry) / still running); labels pushed down so they never overlap. Today: 17 vetoed BUYs → 3 boxes (LOST −8.48, WON +19.07 +8 more, still running +6 more). Browser-checked at 1366×700: 3 labels, 0 overlaps. smoke_chart 16/16. Same screenshot's 🟧 DATA WARNING: Forex Factory this-week source failed once at 19:11 UTC (HTTP 0); the 5-min retry at 19:16 got 7/7 sources → health OK 19:17 (the retry rule of §7 (db) working). His screenshot also shows 1H structure MIXED → SCALP BUYs allowed again.
- **(dt) 2026-10-21 20:17 UTC — INDEPENDENT APP (INSTALL_PACKAGE) BROUGHT FULLY UP TO DATE (Ashraf: "pls let us update the independent App with new and latest update we made").** Measured first: the CODE was already current — the post-commit hook (`build_package.mjs --code`) syncs docs/ops/scripts/src after every commit; smoke_package_sync 3/3 at b07580a. The DATA was not: last full build 2026-10-15 (history 5-6 days old; new artifacts missing — sr_levels_study.json, matrix_vetoed*.jsonl, impulse_refused_wouldbe.jsonl, review files). `build_package.mjs` now also skips `dxy_1m.bin` (the DXY cache is fingerprinted to this PC's stores — the other PC builds its own) and `keep_awake.json` (runtime stamp) (commit 21bec4d). Full build (robocopy /MIR, incremental) → VERSION.json built_at 2026-10-21T20:17:19Z, commit 21bec4d, 17 GB. Independent check (read-only script): 4,822 live data files, 0 missing in the package, 0 torn .jsonl last lines; spot sizes identical (XAUUSD 1m 420,662,349 B, EURUSD, GOLD_FUT, both paper journals, veto/refusal journals, S/R study); only chart/settings/stream logs newer in mtime (open by the running app; same size). smoke_package_sync 3/3. Keys (.env), locks, heartbeats, the Telegram de-dup ledger and the watchdog marker are never copied. On the other PC: copy the folder, double-click INSTALL.cmd (asks for the keys).
- **(du) 2026-10-22 19:15 UTC — S/R tab "is this stale?" → NOT stale; LIVE price line added (Ashraf, screenshot of /sr XAU 1H: "pls check is this stale").** Measured: his last candle (close 4045.99) = the 17:00 UTC 1H candle → screenshot taken 18:08-19:07, while gold traded ~4030; the page draws CLOSED candles only and refreshes after each 1H close (sr_refresh XAUUSD 17:08 / 18:08 / 19:10, 124-161 s, exit 0; sr_live_xau.json 19:07, last minute 19:06; health OK, no STALE banner). So the last candle lags the price by up to ~70 min — the same confusion as the trendline pages (§7 (dh)). Fix (page only, served per request, no restart): `ops/sr/index.html` gold LIVE price line from /api/live (bid, every 30 s) + note "LIVE <bid> (<time>). Candles = CLOSED <tf> candles only — the last one is … (close …); the forming candle is not drawn. Levels refresh after each 1H close."; WTI: "No live price (10 min delayed feed)" (red rule). Browser-checked: XAU 1H LIVE 4026.36 under the last close 4030.33; WTI note. smoke_sr_live 14/14 (new page check), sr_dxy_warning 8/8, chart 16/16.
- **(dv) 2026-10-22 19:55 UTC — "losing trades for the past 5 hrs, check the reason" (Ashraf).** Measured (paper SCALP journal + the live gate functions at each decision): 6 SCALP BUYs closed 14:27-19:34 UTC — 1 TP1+BE +4.57, 5 SL (−5.49, −3.43, −3.14, −4.30, −6.34) = −$18.11/oz. Gold fell 4054.48 → 4027.28 (−27.20) in the window. At every entry the 1H structure read MIXED (V1H allowed BUYs — it blocks only LH+LL) while 4H read DOWN. Each loser was stopped in 4-20 min and gold then fell a further $10-13 within the hour (best rise ≤ +3.81) → wrong direction, not tight stops (a wider stop would have lost more). The SCALP's SELL side did not fire (it fires ~4×/2 y). A 4H-structure gate (V4H) was measured 10-20 and FAILED (TRAIN reversed, §7 (df)) — not a proven fix; nothing changed.
- **(dw) 2026-10-22 — SCALP aligned with structure + wall, structure-aligned SELLs, and the 92 % WR search — 0 PASS (Ashraf: "we did not take short trades … buy trades keeps running but with taking the correct structure and time on the correct wall levels"; "make sure you do not make errors with buy setting only fix the failing errors"; "we need to avoid losing trades"; "keep my 92% WR for both buy/sell … checking the scalp until you reach 92% WR in both buy and sell").** Spec `docs/MATRIX_ALIGNED_SPEC.md` + ADDENDUM A (exact definitions) + ADDENDUM B (92 % search, K 96), each committed before its numbers; atlas `docs/MATRIX_ALIGNED_ATLAS.md`; ONE place `scripts/lib/matrix_aligned.mjs`; studies `study_matrix_aligned.mjs` (K 7) → `matrix_aligned_study.json`, `study_matrix_wr92.mjs` → `matrix_wr92_study.json`; `audit_matrix_aligned.mjs` CLEAN (independent resolver 200 trades 0 diff; 1H + 4H structure full-history = live 45-day window, 50 cuts each, 0 diff; oracle SELL n 290 +$11.44/t); parity study red+DXY SELLs = matrixSignals 561 = 561 identical; refactor onto the lib → rerun identical. `matrix_trades.mjs` gained optional `signals` + `data` (default unchanged). Results: BUY filters B1-B4 0 pass (B1 "no BUY while 4H DOWN" helps OOS + 13 y but TRAIN reversed +0.203 vs −0.095 — same as V4H); SELLs with 1H + 4H DOWN lose on 13 y (S1 −$0.31/t n 692, S2 −$0.28, S3 n 9). 92 % search: SELL reaches 92 % WR only with a 0.10 × risk target / 4 × risk stop and loses (S1 13 y 92.4 % −$0.245/t n 759); BUY never reaches 92 % (best OOS 79.8 %, 13 y 53 % — a BUY pays the ask, tiny targets sit inside the spread); 0 of 96 cells $ > 0 in both TRAIN and OOS. Time of day not re-tested (no lift §7 (bs)). Nothing live changed; live BUY rules untouched.
- **(dx) 2026-10-23 — NEW SCALP ENTRIES (not the Matrix walls) for 92 % WR with money, BUY + SELL — v2: 0/18 PASS (Ashraf: "Search a different SCALP entry (not the Matrix walls) for 92% WR with profit on both BUY and SELL, pre-registered the same way. Try again").** Spec `docs/SCALP_ENTRY_V2_SPEC.md` (before any number); ONE place `scripts/lib/scalp_v2.mjs` (A = ATR14 of closed UTC hours; spike rule `spikeAt`); `study_scalp_v2.mjs` → `scalp_v2_study.json`; `audit_scalp_v2.mjs` CLEAN (independent resolver `scripts/lib/independent_resolver.mjs` 200 trades 0 diff of 149,437; F1k3 / F1k5 / F2 entries on 50 tape cuts each 0 diff; oracle n 3,046 WR 98.0 % +$1.02/t). Entries: F1 1m SPIKE FADE (range ≥ 3 / 5 × ATR14(1m), body ≥ 60 %), F2 1H SWEEP & RECLAIM (3m close back inside the previous hour's high/low after ≥ 0.10 A beyond); exits X1 0.25A/2A, X2 0.15A/2A, X3 0.25A/3A; 13 y, TRAIN < 2021-06-30 ≤ OOS; random control per cell (same side / UTC hour / era / count / exit). Closest: **F1k3 BUY X3 — OOS 2021-26 WR 95.6 % +$0.165/t (n 3,677, LB −0.33), control 91.9 % −$0.72; TRAIN 91.2 % −$0.315** (the 2013-21 target 0.25 A was ~2 spreads); F1k5 BUY X3 OOS 95.5 % +$0.116 (2 y −$0.24). Every SELL cell and every F2 cell loses. X2 BUY TRAIN WR ~51 % (a 0.15 A target sat inside the spread in 2013-21). `audit_matrix_aligned.mjs` now imports the same independent resolver (moved, same text).
- **(dy) 2026-10-24 — SCALP entries v3: 0/10 PASS, but the strongest result yet on BUY (Ashraf: "Try again").** Spec `docs/SCALP_ENTRY_V3_SPEC.md` (before any v3 number; P cells = post-hoc, forward-candidate only); atlas `docs/SCALP_ENTRY_ATLAS.md`; `study_scalp_v3.mjs` → `scalp_v3_study.json`; `audit_scalp_v3.mjs` CLEAN (200 trades 0 diff; P1/P2/N1/N2 on 50 tape cuts with silver 0 diff; oracle 98.7 %). Spike rule refactored into `spikeAt` (v2 signals identical: 39,602 / 5,853 / 39,456). **N2 "gold-only spike" BUY X3** (gold 1m spike while silver's minute is not): OOS 2021-26 WR 97.2 % +$0.572/t (n 1,271, LB +0.123), last 2 y +$0.765, control −$0.192; TRAIN 91.5 % −$0.201 → fails (TRAIN). Diagnostic `diag_scalp_n2_years.mjs`: lost EVERY year 2013-19 (spread ≈ 60 % of the $0.55-1.00 target), won EVERY year 2020-26 (spread 18-32 % of target, WR 95-98.7 %) — post-hoc explanation, only a forward test can confirm. SELL: still nothing with money (best N2 SELL X3 OOS 92.0 % −$0.12). Nothing live changed.
- **(dz) 2026-10-24 — SELL v4: time stops on the spike-fade SELLs — 0/12 PASS (Ashraf: "Keep searching for a SELL entry with 92% WR and profit before anything goes live").** Spec `docs/SCALP_SELL_V4_SPEC.md` (before any v4 number); `study_scalp_sell_v4.mjs` → `scalp_sell_v4_study.json`; `matrix_trades.mjs` + `independent_resolver.mjs` gained an optional `horizonMin` (default 24 h, unchanged). F1k3 SELL and N2 SELL × X1/X3 × 30/60/120-min time stops: WR collapses (OOS 53-78 %) because most SELLs have not reached the 0.25 A target when the clock closes them; OOS $/t −0.21 … +0.016 (N2 X1 120 m, LB −0.12), TRAIN −0.28 … −0.46, last 2 y negative everywhere. Audit: independent resolver 200 trades 0 diff (of 130,052); oracle +$1.03/t (positive, as the spec requires) but WR 89.4 % < the script's extra 95 % bar — the oracle's 1m check used bid prices without the full spread at the time stop (a control-construction limit, not a pricing fault). SELL tally since 10-16: Matrix red / prevlow / choch, EMA downtrend, silver SMT, top-down shorts, structure-aligned, 92 % exit grid, spike fade, gold-only spike, two-bar exhaustion, time stops — none with money in both periods.
- **(ea) 2026-10-25 — MACHINE-LEARNING SELL SCALP: X3 PASSES every pre-registered check + robustness — the FIRST pass on either side (Ashraf: "Next: a pre-registered machine-learning SELL model on 1m/3m features (gold, silver, DXY, time, spikes), 92% WR + profit, both periods, same audit"; "what about DXY when it is bullish" → DXY bullish flag + slope + moves are features).** Spec `docs/SCALP_SELL_ML_SPEC.md` + ADDENDUM A (robustness), each before its numbers; lib `scripts/lib/scalp_ml.mjs` (31 causal features on every closed 3m bar 2013-26, 1,535,000 rows; labels = live resolver SELL $; walk-forward GBDT `scripts/inv90/gbdt.mjs`: fit < Y−1, threshold on Y−1, trade Y; one trade at a time); `study_scalp_sell_ml.mjs` → `scalp_sell_ml_study.json`; `robust_scalp_sell_ml.mjs` → `scalp_sell_ml_robust.json`; atlas `docs/SCALP_ENTRY_ATLAS.md`. **X3 (target 0.25 A / stop 3 A): P1 2016 → 2021-06-30 n 2,157 WR 94.1 % (Wilson LB 93.0) +$0.456/t (LB +0.263); P2 → 2026-10-22 n 2,595 WR 95.8 % (LB 95.0) +$1.181/t (LB +0.475); last 2 y +$1.739; random SELL control −$0.22 / −$0.20 → PASS.** X1 (0.25 A / 2 A): P2 92.2 % +$0.765 but P1 87.8 % −$0.035 → fail. Audit CLEAN: independent resolver 0 diff; label leak 0 years; feature prefix cuts 50 / 0 diff; shuffled labels → X3 n 45 −$0.006 (no edge), X1 0 trades; oracle WR 100 %; run 2 reproduced run 1 (the first run was cut off by a session end after X1 — the study now saves after each exit). Robustness PASS: every year 2016-2026 positive (WR 93.4-97.6 %, +$0.15 … +$2.31/t), spread × 1.5 still positive (P1 +$0.35, P2 +$0.95), 1.3-1.6 SELLs per trading day. **Caveat:** one pass among ~150 SELL cells searched since 10-16 → a forward PAPER record first; nothing live without Ashraf's OK.
- **(eb) 2026-10-25 — ML SELL X3 LIVE PAPER forward test built (Ashraf: "Yes, build the live PAPER forward test of the ML SELL X3 model (same feature code, scored like the other paper books, chart box SELL only, no Telegram trade alerts yet)") + GLD late-minute fix that cleared a CRITICAL database check.** (1) `scripts/freeze_ml_sell.mjs --year=2026` → `data/scalp_ml/ml_sell_x3_2026.json`: the EXACT walk-forward model measured for 2026 (fit < 2024-12-31, threshold 0.94793 = top 5 % of 2025, cal n 5,695 WR 96.7 % +$2.04), re-run with the same seed and required to reproduce the study's 8,621 selected 2026 rows (it did). `scalp_ml.walkForward` gained an optional `capture` (default none, results unchanged). (2) `scripts/lib/ml_sell_live.mjs` (ONE place): `scoreAt` builds the study's features (`buildFeatures`) on a 20-day window (Wilder ATR of hours settles to 4e-16) with the measured spread TABLE for the cost feature (as trained); `mlSellTick` resolves the open paper SELL with the live spreads (`resolveMatrixTrade`), then — data live + health OK, nothing open — scores the just-closed 3m bar and opens ONE paper SELL when score ≥ threshold (0.25 A target / 3 A stop, 24 h); journal `data/paper/ml_sell_trades.jsonl`, state `ml_sell_state.json`, review `ml_sell_review.json` (n / WR / $ vs the measured backtest; no verdict before 30). No model for the year → no trade (re-freeze each January). No Telegram anywhere. Wired in `matrix_tick.mjs` (every 3m close, inside try, never `--static`) → live from the next open without a restart. (3) Chart: `/api/mlsell` (run_chart — needs a chart-server restart) + page `mlDraw`: the open paper SELL as a neon "SCALP TRADE · SELL · ML paper" box (target zone below, risk above), 48 h of closed ones faded with results, and a tally line vs the backtest. `smoke_ml_sell` 5/5 (live 20-day score = walk-forward score at 60 random selected 2026 decisions, worst |Δ| 0; replayed tick opens one paper SELL with the frozen geometry and writes nothing in write:false; fail-closed without a model / without live data; wiring + no Telegram) added to smoke_all; trade_alert 11/11, veto_score 5/5, structure_gate 3/3, ferrari_matrix 8/8, chart 16/16. (4) **GLD late minutes:** health was STALE all weekend — the Saturday `verify_database` FAILED every retry (GLD 2933/2937, 4 missing) because Polygon published GLD pre-market minutes LATE (10-19 08:03, 10-20 08:00 / 08:02 / 08:05, 10-21 08:06 UTC) after a later minute had been appended, and the revision pass only repaired minutes we already had. `recordRevisions.diffRevisions` now also returns `absent` (Polygon's minutes not in our store); `applyRevisions(file, revised, inserts)` inserts them in time order (all-or-nothing, returns lines written); `record_futures` inserts late FINAL GLD minutes (futures: reported only) and logs `late_minute_inserted`; `--revisions-days=N` for a one-off wider catch-up. Applied: 5 late minutes inserted (GLD 355,596 lines, dup 0, out-of-order 0); `verify_database` re-run → **all passed** (GLD 2937/2937); missed daily `audit_recording` re-run → clean; health OK 15:50 UTC. smoke_recorder 5/5 (new insert test). (5) Measured: the PC slept 4× since Friday (Windows event 42; 10-23 18:39 for 2 min DURING market hours, 21:22 → 10-24 10:11, 17:38 → 18:47, 18:50 → 10-25 08:01) — requested sleeps keep-awake cannot block; they caused the missed audits.
  - **Chart server restarted 2026-10-25 20:33:19 UTC (Ashraf: "Yes, restart the chart server (display only) so the ML SELL paper box appears")** — port-7444 process stopped, run_twin respawned it in 4 s; `/api/mlsell` 200 (empty until the 22:00 UTC open), /, /api/matrix, /api/health 200. Page wording: before the first tick the tally line says "starts with the next market tick" (not "not updating"). Browser-checked with a test SELL held in the tab's memory only: neon "SCALP TRADE · SELL · ML paper · ENTRY …" frame, risk zone above, target zone below, tally line.
  - **smoke_chart then FAILED (DXY 1m "close-based" check) — measured: not today's change; a weekend lookback bug.** The chart's intraday windows were CALENDAR days (1m = 2 days): on Sunday 20:37 UTC the 1m chart reached back only to Friday's last ~20 minutes (23 closed DXY bars; the check needs > 100) — the 1m chart was nearly empty every Sunday evening. Fix: `run_chart.tradingFrom(now, days)` adds back every Saturday / Sunday the window crosses (Sun 20:40 → Wed 20:40 = 2 trading days). smoke_chart 17/17 (it runs its own server from the current code on port 7449; new check of the window). The LIVE chart server picks it up on its next restart. (My command chain had committed 60b0b78 before seeing the failure — `| tail -1` hid the exit code; corrected here.)
  - **Chart server restarted again 2026-10-26 07:08:39 UTC (Ashraf: "Yes, restart the chart server once more (display only) so the trading-days fix is live")** — back in 6 s; DXY 1m now 2,822 closed bars from Thu 10-22 07:08 (2 trading days across the weekend); /, /sr, /api/mlsell, /api/matrix, /api/health 200; health OK. ML SELL paper running since the 22:00 UTC open: 182 matrix ticks, 0 failures, 0 ML errors; last decision 07:03 bar score 0.901 < threshold 0.948 (no paper SELL yet). Cost: matrix_tick median 2.9 s (Fri) → 4.4 s; the 3 runs > 15 s coincide with other jobs, as on earlier days (1-7 per day before the ML hook).
- **(ec) 2026-10-26 13:30 UTC — "we are not getting any sell trades" (Ashraf) — measured: working as designed; the model saw no SELL setup.** Replay of the frozen model on all 304 closed 3m bars since the 10-25 22:00 open: max score 0.9187 (12:30 UTC), p99 0.9146, median 0.898 vs threshold 0.94793 → 0 qualifying bars; live tick score = replay exactly (13:09 bar 0.89712 both); no NaN feature on any bar; health OK; 0 tick errors. The model's own 2026 record (parity rows): SELL-qualifying bars on only 92 of ~205 trading days; since 09-14 on 7 of 29 weekdays (Thu 09-17, Fri 09-18, Fri 09-25, Mon 09-28, Fri 10-02, Fri 10-09, Fri 10-16) and on NO Monday-Wednesday since mid-September → a quiet Monday is in line with the backtest; "1.5 trades a day" was an average over clustered days. Added: `data/paper/ml_sell_scores.jsonl` — every tick's score (or skip reason), so "how close did it get" needs no replay (smoke_ml_sell 5/5; live from the 13:24 tick).
- **(ed) 2026-10-26 13:35 UTC — WEEKEND BUG in the trade resolver: the SCALP was blocked all Monday; backtests silently dropped weekend-crossing trades (Ashraf: "what about buy, did we pls check if everything is fine").** Measured live: the SCALP BUY opened Fri 10-23 20:51 UTC (entry 3993.73, SL 3991.18) was still OPEN on Monday 13:30 → one-at-a-time → 0 SCALP boxes and 0 vetoes since the Sunday open. Cause (`ferrariMatrix.resolveMatrixTrade`): the 24 h horizon fell on Saturday; the loop stopped at the first bar after the horizon without checking it, and the "close at the market" rule needs a bar AT the horizon → the trade could never close (live: blocks the book; backtests: `done:false` → `matrix_trades.mjs` silently SKIPPED it). Fix: when the horizon falls while the market is closed, close at the FIRST price after it (that bar's open; SELL at open + spread) less slip; before the reopen it stays open. Mirrored in `scripts/lib/independent_resolver.mjs`; both give the same $ on the stuck trade's shape (BUY −6.28 / SELL +5.18 test). Live: the next matrix_tick closed the stuck box (TIME +$0.31, at the first stored minute after the horizon — a raw Polygon minute at Sun 21:00 UTC) → SCALP unblocked. Smokes: ferrari_matrix 8/8, veto_score 5/5, ml_sell 5/5, matrix_watch 4/4, trade_alert 11/11. Affects every book priced by this resolver (SCALP, veto scoring, ML SELL paper); paperTrader (IMPULSE_CONT, refusals) counts its horizon in bars and is not affected. **Re-measuring the ML SELL study with the fixed resolver** (its labels and trades included only trades that resolved before a weekend gap) — result decides whether the frozen live model stands.
- **(ee) 2026-10-26 — ⚠ ML SELL PASS WITHDRAWN (§7 (ea) was an artefact of the weekend bug).** Re-run of `study_scalp_sell_ml.mjs` with the fixed resolver (`scalp_sell_ml_study.json`; the pre-fix file kept in the session scratchpad): X3 rows priced 1,533,806 (was 1,488,977 — ~45,000 weekend-crossing SELL rows had been unpriced → dropped from labels AND trades); base SELL WR 87.1 % (was 89.2 %) → the dropped rows were worse than average. **X3: P1 n 653 WR 89.0 % −$0.257/t (LB −0.557); P2 n 1,351 WR 90.0 % −$0.392/t (LB −0.968); last 2 y −$0.694 → FAIL** (was 94.1 % +$0.456 / 95.8 % +$1.181). X1: P1 86.7 % −$0.181, P2 89.1 % −$0.011 → fail (was P2 92.2 % +$0.765). Audit still clean (resolver 0 diff, no leak, 50 feature cuts 0 diff, shuffle → 0 trades, oracle 100 %) — the code was right, the trade COUNT was biased. Consequences: the ML SELL is NOT a validated system; the paper test (§7 (eb)) runs a model built on biased labels (Ashraf to decide: pause or keep as a record); the retest test (`SCALP_SELL_ML_RETEST_SPEC.md`) is moot (no valid base). Every study priced through `matrix_trades.mjs` before 10-26 (Matrix gates incl. the LIVE V1H, matrix aligned/WR92, scalp v2/v3 incl. the N2 BUY lead) dropped weekend-crossing trades the same way → re-measuring V1H first (live).
