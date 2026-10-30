# HANDOFF — Ferrari Twin Turbo build-04 (written 2026-10-29 ~23:40 UTC, end of build-03)

Resume phrase: **"Ferrari Twin Turbo build-04"** → skill `twin-turbo-continuity` §A: read THIS file first, then `docs/MASTER_DOCUMENT.md` §7 (eg)…(fa),
`docs/research/README.md` (research map), `docs/DATA_CONTRACT.md`; load `gold-measured-study`; check reality read-only (git log, data_health.json,
child_runs.jsonl, app processes).

## 1. Live state (verified 23:24 UTC 10-29: health OK, no issues)
- App running (run_twin + stream + chart 7444 + settings + keep-awake), relaunched 23:09:45 via `FerrariTwinTurbo_Watchdog`.
- **92 % WR RULE** (`src/master/wrGate.js`): no Telegram trade alert / chart trade box unless MEASURED WR ≥ 92 %. Only **swing arm 1, checkpoint bracket E0**
  (market BUY, TP +0.2× daily ATR, SL −2× daily ATR ≈ $94-150, 92.0 % WR measured, losing years 2017/2020/2022) is allowed — record only, NO Telegram.
  Everything else records silently: SCALP (20 %; kept hidden by Ashraf 10-28), SCALP85, ML SELL (89 %, withdrawn 95.8 % never quoted), swing 1/day L4H3
  (3 lots, limit at 4 h low, SL $10, TP1 $10, runners BE → +$50), IMPULSE_CONT.
- Swing policy counts only the current bracket (the 10-28 13 h blocking bug); every ≥ threshold bar logged in `data/inv90/<arm>/decisions.jsonl`.
- SCALP parity watcher (APP_OFF for PC-off minutes); refresh retry every 5 min (`refreshRetry.js`); wake = app start (refill + reconcile);
  after start / wake the 15m tick waits for the stream refill and the recorder catches up at once (`reconcilePlan.js tickReady`, `recNow`);
  health shows S/R / trendline catch-up as "refreshing" for 30 min (`catch_up_from` heartbeat field — active from the NEXT run_twin start).
- Databases: 0 duplicates / 0 gaps verified 10-29; all UTC. No git remote (offsite backup = Ashraf's decision).

## 2. Ashraf's standing orders added this build (memory has each)
- DEEP RESEARCH STANDARD — protocol first, source statistics, every link tested, unseen years, sub-numbers (`feedback_deep_research_standard.md`).
- MERGE Turbo 2 → Twin: NOTHING applied until a written summary of best results is agreed; Turbo 2 never touched (`project_turbo2_twin_merge_plan_2026-10-29.md` (a)-(j)).
- Blind history check: predictions from vintage inputs committed BEFORE any actual is opened.
- Ask before every app restart; nothing live without his OK; no paid data (surface costs).

## 3. NEXT — the build-04 package (start Sunday after the credit reset), in this order
1. **SPEC** for the self-learning system (all tracks, questions, data, blind rules, pass bars) → `docs/research/` — committed before any number.
2. **Blind nowcast history check** (macro_nowcast): Advance GDP 52 / GDP deflator 52 / core PCE 159 / CPI 158 / NFP 159 / claims 692 releases since
   2013-07 (FF consensus + actual in `data/calendar/ff_history.jsonl`); inputs as first published (ALFRED vintages, GDPNow + Cleveland nowcast histories,
   ADP); GDP deflator model (CPI / PPI / import prices × GDP shares) — the 10-29 miss; then surprise → rate path / DXY → gold link.
3. **Level break-vs-bounce study** (3m/5m/15m/30m/1H; approach speed, candle size, CME volume 2024-10 →, wall strength, DXY, hour; 15/30-min outcome; calibration).
4. **Loss autopsy + coaching audit + Turbo 2 read-only monitor** → then the **weekly self-learning loop** (proposes, never auto-enables).
5. Written summary of best results → Ashraf agrees → only then dashboard (Tab 1 Market Coach, Tab 2 Signals) and merge.

## 4. Open items
- BEA-page confirmation of the 10-29 actuals (GDP 3.4, deflator 2.3) — open.
- N2 spike-BUY paper forward test awaits Ashraf's OK; V1H vetoed-BUYs review; matrix_trades-based studies before 10-26 need re-measuring.
- Lost-trade source = PC sleep (Start → Sleep, lid); Windows power settings are Ashraf's.
