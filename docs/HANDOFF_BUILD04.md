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

## 3a. UPDATE 2026-10-30 — step 3.1 DONE

The self-learning SPEC v1.1 is agreed: `docs/research/self_learning/2026-10-30_self_learning_system_SPEC.md`, MASTER §7 (fb) + (fc).

**It REPLACES the order below:**
1. **T0: the wave reason ledger.** DONE 10-30 for XAU (MASTER §7 (fd)), audit VALID.
   - Result: on ≤ 3H, news / session opens / big candles show WHEN a turn is likelier; nothing shows WHICH WAY. ≥ 4H: nothing.
   - Open: XAG / DXY / WTI (v2). The 1m / 1M file clash was FIXED 10-30 (MASTER §7 (fe)): monthly tables are now `1Mo.csv`.
2. **T1 nowcast for all 85 numbered releases.** Step 1 (inventory + labels) DONE 10-30 (MASTER §7 (ff)): 33 buildable, 51 not buildable, 1 Fed.
   - NEXT: step 2, its own sub-spec first.
   - The extractor writes the inputs with known_t, never the target's actual.
   - Then the blind predictor for the 33 runs, its predictions are committed, and only then the scorer.
3. T2 reactions for all 157 event types.
4. T3 levels.
5. T4-T6.
6. T7.
7. T8: weekly loop on Sunday 10:00 UTC. Drift flags are written to files only, with no Telegram.
8. The merge summary.

## 3. (superseded order, kept for the record) the build-04 package
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

## 5. PRIORITY + CREDIT PLAN (Ashraf 10-29 night: the DATA CENTER project in Cowork comes FIRST next week; Ferrari on minimum credit)
- **Stage 0 — zero Claude credit, runs by itself:** the app keeps recording everything (prices 1m, CME volume, calendar actuals, every SCALP /
  swing decision and blocked opportunity, paper trades, health). Nothing to do. If Telegram reports a problem, one SHORT fresh chat with the screenshot.
- **Stage 1 — small (when the data-center work leaves room):** the self-learning SPEC only (step 3.1), in its own fresh chat.
- **Stage 2+ — after the data-center work is complete:** steps 3.2 → 3.5, ONE FRESH CHAT PER STEP (short context = far less credit).
- Credit savers: fresh chat per step; heavy analysis as scripts that run on the PC (not in chat); routine checks with a smaller model; no long screenshots threads.
- Full chat of build-03 saved: `C:\01Ferrari Twin Turbo CHECKPOINTS\chat_exports\2026-10-29_build-03_chat.zip` (+ the original in Downloads).
