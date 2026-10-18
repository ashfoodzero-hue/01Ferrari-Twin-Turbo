# Ferrari Twin Turbo — HANDOFF for "build-02" (written 2026-10-18 23:10 UTC, end of chat "build-01")

**A new chat that reads this file + `docs/MASTER_DOCUMENT.md` §7 entries (cj)…(cw) has the full state. Nothing important lives only in the old chat.**
Project root: `C:\01Ferrari Twin Turbo` (git, last commit of build-01: see `git log -1`). Owner: Ashraf. Resume phrase: **"Ferrari Twin Turbo build-02"** (Claude skill `twin-turbo-continuity`).

---

## 1. What is LIVE right now (run by `scripts/run_twin.mjs`, started by the watchdog task `FerrariTwinTurbo_Watchdog` → `ops/watchdog_launch.vbs`)

| Job | Cadence | What it does | State file |
|---|---|---|---|
| tick stream `run_stream.mjs` | always | Polygon websocket, XAU, XAG + 6 DXY pairs → verified 1m store | `stream_heartbeat.json` |
| chart server `run_chart.mjs` | always | http://127.0.0.1:7444 — live chart, `/trendlines`, `/sr` tabs (read-only) | — |
| settings `run_settings.mjs` | always | http://127.0.0.1:7445 (API keys, Telegram) | — |
| data health `health_tick.mjs` | every 2 min | verdict OK / WARN / STALE, Telegram on change, red banner, STALE stops every signal | `data_health.json` |
| trendline minute check `trendline_tick.mjs` | every minute (market open) | 📐 AT LINE / ✅ BOUNCED alerts, major 4H + 1D lines, XAU / XAG / DXY_ICE (WTI computed, BLOCKED) | `trendline_tick_state.json` |
| trendline refresh `trendline_lines.mjs <SYM>` | per asset when a new 4H closes (+ at start) | full-history lines, ❌ BROKEN alerts, page data | `trendline_live_lines_<sh>.json` |
| S/R refresh `sr_refresh.mjs <SYM>` | :04 every hour (+ at start), XAU XAG DXY_ICE WTI + gold-grid DXY | all 5 timeframes' levels + own records | `sr_live_<sh>.json` |
| others (older) | see MASTER §7 | level_tick, ladder_tick, macro_tick, matrix_tick, recorder, reconcile, audit, preopen | — |

- **Restart procedure (needs Ashraf's OK every time):** `taskkill /PID <run_twin> /T /F` then `wscript.exe "C:\01Ferrari Twin Turbo\ops\watchdog_launch.vbs"`. The chart server alone (display-only) may be restarted by stopping the process on port 7444 — run_twin respawns it within 60 s.
- Last restart: 2026-10-18 22:38 UTC (Ashraf OK). All startup refreshes OK except `sr_refresh DXY_ICE` (killed by the 5-min limit while a full scan loaded the machine — re-runs hourly).

## 2. Everything done in build-01 (chronological; detail in MASTER §7)

1. **(cj) Data health watcher** — Telegram alerts, red DATABASE STALE banner, signal stop, daily OK, New York market hours (DST + measured holidays).
2. **(ck) Pre-open readiness** (T-60 / T-15) + Polygon revisions for recorded series + rolling verify window.
3. **(cl) Every timeframe built perfectly** — full-history audit; repair at 1 minute only (kept the real 2017-07-06 silver crash); Polygon 2020-11-15→12-31 New-York-local stamps shifted +5 h (measured); weekend-dated minutes dropped.
4. **(cm) 15m swing next move** — direction = coin flip; size / timing stable in ATR; levels refuted by distance-matched placebo.
5. **(cn) Last-year swings on 16 timeframes for XAU, XAG, WTI, DXY (gold grid + ICE session)**, TradingView-checked (99-100 % same candle); session candles for any instrument (`src/core/sessionCandles.js`: gold / cme / dxyIce); reopen clamp (XAU / XAG study candles only); **reasons checklist** at every 1D / 4H swing — common at 4H on all four: liquidity sweep.
6. **(co) 3m structure confirmation** at the swing tips — level = last 3m lower high / higher low of the leg; real-time precision 15m 64-67 %, 4H 23-31 %; XAU / XAG / WTI act the same; DXY differences = wickless rebuilt minutes.
7. **(cp) Trendlines** 1W / 1D / 4H / 1H, both sides, 6 y — NOT respected beyond placebo anywhere (0 / 264 after Holm); app tab `/trendlines`.
8. **(cq) Live major-trendline alerts** (4H + 1D, both sides; Telegram + app; WTI blocked: delayed feed). Replay proof: live code = study truth (missing 0 / extra 0) on XAU 180 d, XAG / DXY / WTI 90 d.
9. **(cr) S/R levels** 1H / 4H / 1D / 1W / 1M for all four — NO strength class is strong (0 / 176 after Holm); live hourly refresh with each level's own record; `/sr` tab blinks STALE; zero-stale analysis-feed checks (SR_FEED_STALE / TL_FEED_STALE / TL_TICK_STALE / FEED_REFRESH_FAILED).
10. **(cs) Money test of the 3m-confirmation entry**, overall and at S/R levels — 0 / 384 pass; before costs a coin flip (XAU 1R WR 50 %); after spreads XAU −$0.41 / trade. Silver spread measured (`spread_table_XAGUSD.json`). Last-week review `docs/REVIEW_WEEK_2026-10-12.md`.
11. **(ct) XAU + DXY together at S/R, same timeframe** — no lift; DXY at the opposite level on the same candle → XAU levels hold LESS (1H 42 % vs 58 %) but placebo the same (both markets moving hard).
12. **(cu) Polygon outage 2026-10-18 22:00-22:34 UTC** — health missed it (quiet minutes counted as settled + 40-min reopen grace) → **NO_LIVE_TICKS** check (CRITICAL); chart pill can no longer say LIVE while STALE. Also fixed: the TradingView cleaner dropped every session's first hour from the live jobs (`kit(sym, { live: true })` / `clean1m(sym, { live: true })`).
13. **(cv) DXY warning on the S/R tab** (`src/master/srDxyWarning.js`).
14. **(cw) History database: no duplicates** — `scripts/scan_store_duplicates.mjs`: 21 series, ~100 M minutes, 0 duplicates / out-of-order; 3-day recording audit clean.

## 3. The answers Ashraf got (never re-litigate without a NEW mechanism)

- Trendlines, S/R levels (any "strength" class), the 3m confirmation as an entry, DXY agreement — **all measured: no edge** (≈ 50 / 50 before costs; losers after spreads). They are CONTEXT (information, alerts), not signals.
- The 3m confirmation DOES find real turns (64-67 % at 15m) and prints before the 15m swing confirms (87-90 %) — but the trade after it has no edge on the next move.
- Every candidate so far fails at the same place: the ENTRY has no directional edge, then the spread makes it lose. A future candidate needs a new reason to expect DIRECTION.
- "Strong" may only be used for a level class listed in `data/master/sr_levels_study.json` `summary.strong` (empty on 2026-10-18).

## 4. Ashraf's decisions in build-01 (binding)

- WTI = 2 years only (Polygon keeps ≈ 2 y of futures); WTI trendline alerts **kept BLOCKED** (10-min delayed feed, red rule); WTI S/R **shown, marked DELAYED**.
- DXY: keep BOTH versions — gold grid (`DXY`, joint analysis with gold) and TradingView ICE session (`DXY_ICE`, exact TV candle times).
- Paid feeds: none bought ("keep the paid for later").
- Alerts: major trendlines 4H + 1D, all three types, Telegram group + app.
- No S/R Telegram notices (none measured strong).
- Restarts: always ask first.

## 5. Open items / ideas (none started)

- `sr_refresh DXY_ICE` killed once by the 5-min limit under load (2026-10-18 22:55) — check it ran OK at the next hourly cycle (`child_runs.jsonl`); raise the limit if it repeats.
- The 1W / 1H trendline page data are the 2026-10-18 study snapshot (4H / 1D refresh live).
- Silver spread table 2022-24 values (≈ $0.01) look thin (Polygon quote archive) — flagged, not fixed.
- Polygon stream reconnected ~56 times during the outage (code 1005) — watch whether it recurs on normal days.
- Possible next research only with a NEW directional mechanism (see §3).

## 6. Where everything is

- **Master record:** `docs/MASTER_DOCUMENT.md` §7 (one lettered entry per piece of work). **Data contract:** `docs/DATA_CONTRACT.md`.
- **Studies (spec → atlas):** `SWING_NEXTMOVE_15M_*`, `SWING_REASONS_CHECKLIST_SPEC` + `SWING_REASONS_ATLAS*` (one atlas per asset), `STRUCTURE_3M_CONFIRMATION_*`, `TRENDLINE_STUDY_*`, `SR_LEVELS_*`, `CONFIRM3M_MONEY_*`, `XAU_DXY_SR_*` in `docs/`.
- **Shared code (ONE implementation each):** `scripts/lib/series_1m.mjs` (candles per asset), `src/core/sessionCandles.js`, `src/master/swings.js`, `scripts/lib/structure3m.mjs`, `src/master/trendlines.js`, `scripts/lib/trendline_live.mjs`, `scripts/lib/trendline_alerts.mjs`, `src/master/srLevels.js`, `scripts/lib/sr_live.mjs`, `scripts/lib/confirm3m.mjs`, `src/master/srDxyWarning.js`, `src/core/dataHealth.js`, `src/core/studyStats.js`, `src/master/spreadModel.js`.
- **Smokes added in build-01** (all in `scripts/smoke_all.mjs`): smoke_session_candles, smoke_structure_3m, smoke_trendlines, smoke_trendline_alerts, smoke_sr_levels, smoke_sr_live, smoke_confirm3m, smoke_sr_dxy_warning, smoke_data_health (15/15).
- **Claude skills:** `gold-measured-study`, `swing-structure-study`, `trendline-study`, `twin-turbo-continuity` (in `C:\Users\Ashraf\.claude\skills\`).
- **Memory:** `C:\Users\Ashraf\.claude\projects\C--Users-Ashraf-AppData-Roaming-Claude\memory\` — index `MEMORY.md`; build-01 detail in `project_swings_reasons_4assets_2026-10-18.md`, `project_data_health_watcher_2026-10-18.md`, `project_twin_turbo_build01_handoff.md`.

## 7. Working rules that held all build-01 (from memory / CLAUDE.md)

Pre-register every study (spec before numbers; addenda dated before their numbers) · every "at the level / swing" claim needs a control (placebo / failed extremes) and n · no look-ahead (causal replays, prefix checks) · independent second implementation + positive control before trusting a null · WR always with $ / R after the MEASURED spread · Polygon is the only data source (TradingView = checks only) · red rule: delayed = not live, unavailable = BLOCKED · commit with explicit paths as Ashraf, never `git add -A` · no python heredoc code edits · ask before app restarts.
