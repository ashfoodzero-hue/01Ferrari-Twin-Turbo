# Ferrari Twin Turbo — HANDOFF for "build-03" (written 2026-10-20 13:05 UTC, end of chat "build-02")

**A new chat that reads this file + `docs/MASTER_DOCUMENT.md` §7 entries (cy)…(dj) has the full state. Nothing important lives only in the old chat.**
Project root: `C:\01Ferrari Twin Turbo` (git; last commit of build-02: see `git log -1`). Owner: Ashraf. Resume phrase: **"Ferrari Twin Turbo build-03"** (Claude skill `twin-turbo-continuity`).

---

## 1. What is LIVE right now (run by `scripts/run_twin.mjs`, started by the watchdog task → `ops/watchdog_launch.vbs`)

Everything in HANDOFF_BUILD02 §1, plus / changed in build-02:

| Job | Cadence | Change in build-02 |
|---|---|---|
| trendline refresh `trendline_lines.mjs <SYM>` | after each 4H close **+ 2 min after every hour** | also writes the 1H + 1W page data (were a study snapshot); limit 10 min; rows log `ms` / `limit_ms` (§7 (cz), (db)) |
| S/R refresh `sr_refresh.mjs <SYM>` | :04 hourly | limit 5 → 10 min (DXY took 190-333 s); WTI stale limit 20 → 35 min (§7 (da), (db)) |
| calendar `fetch_calendar.mjs` | 30 min, **5 min after a failed source** | Fed fetch: 3 tries + right Accept + curl fallback (§7 (db)) |
| data health `health_tick.mjs` | 2 min | new **FEED_SLOW** (2 of last 3 refreshes ≥ 80 % of their limit) (§7 (db)) |
| Matrix SCALP `matrix_tick.mjs` | every 3m close | **V1H structure gate LIVE**: no BUY box while the 1H pivot structure is LH+LL (fail-closed; vetoes → `data/paper/matrix_vetoed.jsonl`, 5 so far) (§7 (dg)); computes **DXY's own Matrix** each tick (info) (§7 (dd)) |
| chart 7444 | always | chips: **DXY Matrix**, **1H structure** (DOWN · SCALP BUYs blocked), Whales shows its bar time; trendlines page: STALE banner, 5-min reload, **LIVE price line** + closed-candle note (§7 (cz), (dd), (de), (dg), (dh)) |

- State at handoff (13:04 UTC): health **OK**, 0 issues; 1H structure **DOWN** → SCALP BUYs blocked; no SCALP box open.
- Restarts this build (all with Ashraf's OK): app 10-19 08:28 and 13:40 UTC; chart server 10-19 15:15 and 10-20 09:18 UTC. Restart procedure unchanged (HANDOFF_BUILD02 §1).

## 2. Everything done in build-02 (detail in MASTER §7)

1. **(cy) SELL "gold sweeps a high + silver does not confirm"** — 0/24; best OOS WR 77.6 % ≈ random sell with the same geometry.
2. **(cz) Stale trendline 1H/1W pages + Whales "unavailable"** — 1H/1W now refreshed live hourly (= study, proof 0 diff); Whales lookback 3 → 7 days (Monday mornings had < 100 15m bars).
3. **(da) WTI S/R refused every hour** — 20-min stale limit vs WTI's normal 13-28 min age → 35 min.
4. **(db) Stale prevention from a 7-day `child_runs` audit** — calendar 39/310 one-try failures fixed; S/R DXY killed 3× → 10 min; durations logged; FEED_SLOW.
5. **(dc) Veto a gold BUY when DXY's own Matrix BUY fires** — 0/2; today's losing BUYs had no DXY conflict on Polygon DXY (TV DX1! = ICE futures with wicks ≠ our rebuilt DXY).
6. **(dd) DXY Matrix info chip.**
7. **(de) Whales chip shows its bar time** (it was feeding; QUIET looked dead).
8. **(de2) 4H CHoCH + ADX + exact entry (spec A-F)** — CHoCH "real" rate = geometry; ADX no information; strict S/R setup 8 in 13 y; OB-retest + 15m CHoCH gold BUY profit = drift; 0 pass; audit clean.
9. **(df) SCALP kept buying in a bearish market** — 13 BUYs −$27.91 in 2 days, 0 SELLs; **V1H gate PASSED** (2 y + 13 y); last-CHoCH gates failed.
10. **(dg) V1H gate wired live** (smoke_structure_gate 3/3; live window = full history at 300 random times).
11. **(dh) Trendline 1D/1W "stale"** — not stale (closed candles only); LIVE price line added.
12. **(di) TOP-DOWN SYSTEM** (HTF CHoCH regime → S-REV / S-CONT swings → SC pullback scalps) — 0/28 gold, silver ≈ 0; closest = 4H-regime SHORT scalps +$3.29/t OOS (n 85, WR 42 %) not proven; audit clean.

## 3. The answers Ashraf got (never re-litigate without a NEW mechanism)

- Everything in HANDOFF_BUILD02 §3 still holds.
- **SELL:** 8 families measured (incl. silver non-confirmation, top-down SHORT swings) — none ≥ 85 % WR with money. Gold's 13-year rise is the reason buys look good and sells lose.
- **4H CHoCH:** not better than random at the same tip distance (BUY); ADX at it carries no information; OB-retest / 15m-CHoCH entries make money on gold BUYs only as much as random buys do.
- **Top-down (HTF direction filter):** adds nothing over the same entries without it, or random entries in the same direction.
- **100 % WR is not reachable** with any rule measured; long-swing exits run 20-45 % WR.
- **Matrix SCALP** stays SHADOW (paper): −$0.72/trade OOS even with the V1H gate.

## 4. Ashraf's decisions in build-02 (binding)

- Restarts approved each time (app ×2, chart ×2) — keep asking every time.
- "Yes, show DXY's own Matrix BUY/SELL as an info chip" — info only.
- **"Yes, wire the V1H structure gate into the live SCALP"** — live since 2026-10-20 09:00 UTC.
- Long-swing only for the CHoCH setups ("not scalp"); the OB-retest + first-CHoCH-inside-the-OB entry is his exact rule (ADDENDUM E).
- His method = top-down (HTF reversal → swing + continuation → scalps on pullbacks with TP at the continuation level) — measured as one system in (di).
- WTI stays BLOCKED for alerts; no paid feeds bought.

## 5. Open items / ideas (none started)

- The SCALP still loses; its SELL side practically never fires (4 in 2 y). A real improvement needs NEW information (longer real order flow, positioning), not another price-only rule.
- 4H-regime SHORT scalps (+$3.29/t OOS, not proven, silver flat) — a forward paper record only if Ashraf asks.
- DXY_ICE S/R refresh ~333 s under load — FEED_SLOW will warn if it approaches the 10-min limit.
- `matrix_vetoed.jsonl` — review the vetoed BUYs after a week (did they lose?).
- Silver spread table 2022-24 thin (from build-01), Polygon stream reconnects (watch).

## 6. Where everything is

- **Master record:** `docs/MASTER_DOCUMENT.md` §7. **Data contract:** `docs/DATA_CONTRACT.md`.
- **Build-02 specs → atlases:** `SELL_SMT_SWEEP_*`, `MATRIX_DXY_CONFLICT_SPEC`, `CHOCH_4H_ADX_SPEC` (+ A-F) → `CHOCH_4H_ADX_ATLAS`, `MATRIX_STRUCTURE_GATE_SPEC` (+ A), `TOPDOWN_SYSTEM_SPEC` → `TOPDOWN_SYSTEM_ATLAS` in `docs/`.
- **Shared code added:** `scripts/lib/sell_smt.mjs`, `scripts/lib/choch4h.mjs` (CHoCH, OB setups, trades, **V1H gate** `structureStateAt`), `scripts/lib/matrix_trades.mjs` (`keep` filter). Studies `study_sell_smt_sweep`, `study_matrix_dxy_conflict`, `study_choch_4h_adx`, `study_choch_retest` (`--structure --long --ob`), `study_choch_drift_control`, `study_matrix_structure_gate` (`--choch`), `study_topdown_system`; audits `audit_sell_smt_sweep`, `audit_choch_4h`, `audit_topdown_system`.
- **Smokes added:** `smoke_structure_gate` (in smoke_all); `smoke_data_health` gained FEED_SLOW cases; `smoke_chart` accepts TREND_UP/TREND_DOWN.
- **Memory:** index `MEMORY.md`; build-02 topic files `project_sell_smt_sweep_refuted_2026-10-19.md`, `project_choch_4h_adx_refuted_2026-10-20.md`, `project_twin_turbo_build02_handoff.md`.

## 7. Working rules (unchanged from build-01, plus)

Pre-register every study; addenda dated before their numbers · controls (distance-matched, drift / random-entry, no-regime) · no look-ahead (prefix checks; live forming candles are NOT closed — check the whole period passed) · independent evaluator + positive control before reporting · WR always with $ / R after the measured spread · audit `child_runs.jsonl` failure rates before calling a feed fixed · lookbacks in trading bars, not calendar days · commit with explicit paths as Ashraf · ask before every restart.
