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
