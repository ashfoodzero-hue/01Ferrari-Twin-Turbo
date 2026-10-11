# Ferrari Twin Turbo — Selection Ledger (KEEP / DROP, with the measurement behind each)

> **⚠ STATUS 2026-10-08 (rev f) — RE-MEASURED ON THE TWIN'S OWN DATA.** The tables below record the carry-over from
> Turbo2's 23y Dukascopy tape. On the twin's Polygon 1m tape (Ashraf: 1m only, ticks only, R0), with measured bid/ask and the
> trial's own resolution rules: **IMPULSE_CONT = SHADOW** (money path OOS −$0.065/t, TRAIN −$0.196/t, 1/8 folds —
> `impulse_cont_twin_gate.json`); **readiness gauge = FAIL** (HOT LB 92.5 < 95, no era-A days); **LEVEL_FADE (the Level Radar
> fade) = SHADOW** — the radar study had look-ahead and a non-executable trade population; as a live order rule it loses
> (−$0.97 to −$1.49/t OOS, 0/8 folds — `level_fade_gate.json`). **No book ships.** Details: MASTER_DOCUMENT.md §3 (f)-(h).

Built 2026-10-08 from a full scan of Ashraf Ferrari Turbo 2: 193 source modules, 578 scripts, every validation artifact
under `data/master`, the generated `docs/SIGNAL_MAP.md`, the `AGENT_VALIDATION` registry and the master document's
revision log (a)…(br). The rule applied: a component enters the twin only if a measurement on real history says it is
correct, and only once (no duplicate tools). "Real win results" means the 1m-sequenced, causal, cost-charged numbers;
every look-ahead figure Turbo2 ever retracted (87.77 / 92.2 / 89.1 / 90.0 / 87.8 / 96.97 / 98.27 / 98.12 / 97.75 /
97.16 / 97.95 / 96.9) is treated as false.

**The honest headline:** no book in Turbo2 has a 95-100% win rate under causal fills. The one book that passes every
gate wins 73.59% of its decisive trades (Wilson LB 68.17%) and earns its money from break-even scratches (73% of fires).
"95-100% correct" therefore maps to the components whose *claims* are verified at that level: the engine, the
resolver, the cost model, the paper trial and the readiness gauge (97.8% precision, LB 95.3). The twin ships those and
nothing else.

## 1. Books (Turbo2 TIER_STATS, 14 tiers) — ONE kept

Sequenced-fill gate, OOS, from `docs/SIGNAL_MAP.md` (generated from the artifacts):

| tier | verdict | OOS WR (LB) | OOS $/t (CI LB) | TRAIN $/t | failed criteria | twin |
|---|---|---|---|---|---|---|
| `IMPULSE_CONT` | ✅ SHIP | 73.59% (68.17%) n=284 | +$0.3527 (+$0.1776) | +$0.0622 | — (4/4 powered folds) | **KEEP** — `tierStats.js`, `twinRoster.js` |
| `IMPULSE_CONT_BE20` | 📓 shadow | 54.55% (49.93%) | +$0.5249 (+$0.1742) | +$0.1975 | passed offline, no forward gate | DROP (shadow trial; the journal scores it in Turbo2) |
| `SWING_TRADE` | 📓 shadow | 67.09% (63.90%) | +$0.1628 (+$0.0493) | −$0.069 | C3 walk-forward, C4 folds | DROP |
| `TREND_CONT` | 📓 shadow | 61.67% (56.86%) | +$0.1597 (−$0.0616) | −$0.0247 | C2 OOS CI, C3 | DROP |
| `PULLBACK_CONT` | 📓 shadow | 68.69% (65.48%) | +$0.1507 (+$0.0306) | −$0.0697 | C3, C4 | DROP |
| `BIG_SWING_HTF` | 📓 record-only | 44.05% (40.68%) | +$0.7615 (+$0.176) | unpowered | 13y gate REFUTED (`big_swing_htf_gate.json`) | DROP |
| `BREAK_RETEST` | 📓 shadow | 55.89% (52.18%) | +$0.0739 (−$0.0553) | −$0.0845 | C2, C3, C4 | DROP |
| `OFFHOURS_REV` | 📓 shadow | 68.79% (66.45%) | +$0.1101 (+$0.038) | −$0.1639 | C3, C4 | DROP |
| `H1_STRUCT` | 📓 shadow | 58.01% (54.21%) | +$0.2907 (+$0.1323) | −$0.0401 | C3 | DROP |
| `H4_STRUCT` | 📓 shadow | 55.65% (46.86%) | +$0.9742 (+$0.5136) | −$0.1366 | C3 | DROP |
| `SCALP` | ⛔ suppressed | 25.73% (24.63%) n=5,994 | −$0.202 | — | measured negative 10y | DROP |
| `SWING` | ⛔ suppressed | 11.39% (10.61%) | −$0.267 | — | measured negative 10y | DROP |
| `SWEEP_DIVERGENCE` | ⛔ refuted | (51.16%) void | void | — | 89.34% of fills inside the confirm bar (look-ahead) | DROP |
| `DIAMOND_SWING` | ⛔ refuted | 23.36% (16.36%) causal | −$1.197 | — | `confCloseT` = open + 1 ms look-ahead | DROP |

Also dropped: MICRO (tp0.25 under the $0.30 spread — loses at a 97% WR), the frontier candidate tp0.35/sl6 (never
shipped), the long-investment trigger (record-only, +0.163R ≈ gold's drift), the dense sub-book as a *book* (era
effect; kept only as the record-only stamp the paper review already computes), the runner sleeve (refuted ungated and
readiness-gated), the hour/day filter (no lift), the 2-bar trailing stop (worse), ORB+volume+VWAP (negative 0/14 years).

**IMPULSE_CONT cost caveat (carried, not hidden):** at the measured Polygon median half-spread the book reads
−0.0202R under EA semantics; it is paper-only until a broker's real spread is logged. `outcomesTraded`
(`study_be_lock_semantics.json`) is the trial's reference distribution.

## 2. The market-state gate — measured for this book (2026-10-08)

Turbo2 refuses a fire whose side disagrees with `readMarketState()`; the validator never applied it; the live journal
had refused 20 of 42 IMPULSE_CONT rows. `scripts/study_state_gate_on_impulse.mjs` (validator loop, 1m-sequenced,
one-at-a-time inside each arm, state read at the signal bar) → `data/master/state_gate_on_impulse.json`:

| arm | n (all) | net/t all [CI] | OOS n | OOS net/t [CI] | years + |
|---|---|---|---|---|---|
| ALL (as validated) | 2,587 | $0.261 [0.17, 0.35] | 1,059 | $0.360 [0.17, 0.54] | 21/24 |
| ALLOWED (gate passes) | 1,628 | $0.342 [0.25, 0.44] | 728 | $0.443 [0.26, 0.62] | 20/24 |
| VETOED (gate removes) | 1,001 | $0.082 [−0.09, 0.24] | 343 | $0.105 [−0.38, 0.50] | 16/24 |

Veto reasons: equilibrium 44%, wrong-side 56%; no reason's arm clears zero at the LB. Pre-registered verdict:
**UNPOWERED — the vetoed fires are break-even, the gate neither costs nor proves money** → `STATE_GATE_MODE = 'block'`
(Turbo2's live behaviour, which concentrates the book without a measured loss). REFUSED rows keep carrying the priced
`wouldBe` plan so the journal continues to score the gate forward.

## 3. Context tools and agents — what the measurements say

| tool / agent | measurement | twin |
|---|---|---|
| Big-move readiness gauge (`bigmoveReadiness.js`) | HOT cell 97.8% precision, LB 95.3, 281 fires/23y, era-A 96.5 / era-B 100, live parity PASS | **KEEP** (occurrence only, never direction) |
| Era-neutral density `dens_rel ≥ 1.5` | within-era lift +$0.01-0.19/t, no Holm pass | stamp only (record) |
| Level Radar (`study_level_radar_23y`, `validate_level_radar_seq`) | with-trend pullback fade at a tested D/4H level: ALL 17,015 trades $0.58/t 24/24 yrs; Holm cells $1.26-3.01/t; 1m-sequenced $0.63/t 14/14 yrs; break-ride −$1.03/t 0/24 | **KEEP as knowledge base** (no book until Ashraf's go) |
| Weekend 1H S/R | nearest lines BREAK 57%/51%; 15m confirmation WR 68-76% at −0.25R | DROP (context, never a fade rule) |
| News → direction (×4 studies) | 0 of 207 configs beat drift, 0 survive Holm | DROP |
| News → magnitude | 1.167× range, Holm 9/11 yrs — TRUE but changes no trade | DROP (available as an add-on; not a trade tool) |
| News pre-arm as a filter | book-level UNPOWERED; mechanism NO LIFT (56k fills, 0/8 Holm) | DROP |
| DXY coupling / filter | co-moves k=0 on every TF; as a filter 0/2 tiers gain | DROP |
| Control consensus (`core/structure/control.js`) | ~50% direction on every TF (validate_control Test A) | DROP |
| Trend-agreement / HTF-sweep / off-hours stamps | +0.0106R agree-and-with-side, TRAIN negative; sweep = start-marker, reclaim book refuted | DROP |
| Market-state gate | §2 — unpowered, kept as Turbo2 live rule | KEEP (as gate, measured) |
| Volume (zoneVolume, volume gate, touch-bar volume) | REFUTED (`volume_gate.json`, radar: 55.9 vs 55.8) | DROP |
| Gann Sq-9 / Fibonacci / Elliott / Wyckoff / candle + chart patterns | Gann NEGATIVE (54.0 vs 60.3), Fib 55.8 vs 55.9, others 0 deflated edges | DROP (`fibZones.js`/`gannSquare9.js` present ONLY as the radar study's measured negative controls) |
| Liquidity grab / draw race / node execution / pullback label | REFUTED (evidence ledger) | DROP |
| Volume nodes (speed/acceptance) | CONFIRMED as description, no execution edge | DROP |
| Expected-pressure / wall defense | defense holds 71.5/78.8%, attack = coin flip; blind wall fades refuted | DROP |
| Sweep prediction / order-flow | REFUTED | DROP |
| COT / ETF flows / futures basis / options gamma / Fear&Greed / Wikipedia narrative | no standalone edge (deflated); gamma still forward-validating | DROP |
| Macro agent (FRED) / macro drawdown scenarios | context; real-yield beta measured; no trade rule | DROP |
| Session starts / win128 / box break / London first-break | NO_EDGE; folklore true (64.5% continue) but both trade arms lose | DROP |
| Swing catcher / move strength / tiered expectancy | REFUTED (deflated, 421,574 candidates) | DROP |
| Forecast (8-layer, 32/day) | direction accuracy ~40%, skill NEGATIVE | DROP |
| Cockpit, desk report, EA/MT5 bridge, alert router, fire context, miss ledger | display / ops surfaces of Turbo2 — not tools with a win result; the twin has a 2-flow contract + heartbeat instead | DROP (Turbo2 keeps them) |

## 4. Modules carried verbatim (58) — grouped

- **core** (16): `indicators`, `stats`, `resample`, `rng` (float-exact LCG), `deflation`, `regimeSplitter`, `seqResolver`, `outcomeResolver`, `agentContract`, `worldModel`, `env`, `bootEnv`, `childExit`, `pidAlive`, `heartbeatOwner`, `usHolidays`, `jsonLoose`
- **core/structure** (7): `swings`, `fvg`, `liquidity`, `orderBlocks`, `supportResistance`, `volumeProfile`, `index` (the structural primitives the A+ engine is built from)
- **agents/microstructure** (2): `marketRegime` (sessions, regime series — used by the folds and the engine), `momentum`
- **agents/strategy** (9): `_util`, `search` (generateCandidates), `setupLibrary`, six setups (`breakoutRetest`, `fvgContinuation`, `obDiscountTap`, `rangeFade`, `sweepReclaim`, `trendPullback`)
- **agents/structure** (2): `fibZones`, `gannSquare9` — negative controls for the radar study only
- **data** (5): `bars`, `backfillReader`, `liveBars`, `liveFeed`, `netResolve`
- **master** (9): `proSignal`, `setupQuality`, `marketState`, `signalLife`, `paperTrader`, `paperReview`, `execution`, `bigmoveReadiness`, `liveReadiness`
- **scripts** (12): `lib/seq_power`, `validate_impulse_cont_ship`, `study_be_lock_semantics`, `study_level_radar_23y`, `validate_level_radar_seq`, `smoke_seq_resolver`, `smoke_execution`, `smoke_paper_trader`, `smoke_pro_signal`, `smoke_market_state`, `smoke_regime_splitter`, `smoke_netresolve`, `smoke_temporal_guarantee`

Adapted (not duplicated): `paths.js` (own writes, Turbo2 read-only), `tierStats.js` (the one record, verbatim text),
`twinRoster.js` (the IMPULSE_CONT path of `emitSignalTiers`), `telegram.js` (sender + formatter only), `freshness.js`
(engine verbatim, 2-flow contract), `promotion_review.mjs` (one book), `smoke_impulse_frozen.mjs` (one book),
`smoke_paper_review.mjs` (the fixture half of Turbo2's promotion smoke). New: `twin_tick.mjs`, `run_twin.mjs`,
`smoke_twin_roster.mjs`, `smoke_twin_parity.mjs`, `smoke_readiness.mjs`, `smoke_freshness.mjs`, `smoke_all.mjs`,
`study_state_gate_on_impulse.mjs`, `freshness_audit.mjs`.

## 5. Modules NOT carried (135) — by reason

- **Refuted engines:** `agents/reversal/*` (swingReversalV2, diamondTrade, sweepDivergence), `agents/swingCatcher/*`, `agents/strategy/moveExhaustionEngine`, `sweepReclaimEngine`, `backtest`, `strategyAgent`, `master/swingTrade`, `swingSignals`, `tieredSignals`, `signalTiers`, `signalService`, `pivotSwingLong`, `postEventSignal`, `liquiditySweepReversal`, `trapDetector`, `trendFollower`, `metaLabeler`, `strategies/*`.
- **Context agents with no standalone edge:** `agents/structure/*` (16 of 18), `agents/smartMoney/*`, `agents/news/*`, `agents/macro/*`, `agents/intermarket/*`, `agents/narrative/*`, `agents/whaleSocial/*`, `agents/dxy/*`, `agents/phase/*`, `agents/_reference/*`, `analytics/*`, `core/structure/{control, marketStructure, polarityFlip, trendlines, vwap}`, `master/{confirmationScore, confluence, entryQuality, expectedPressure, wallDefense, liquidityTarget, livePressure, liveWalls, liveWaterfall, liveSwingOTE, liveSwingZones, structureBias, dxyScanner, ceilingFloor, trendAgreement, tradeWave}`.
- **Forecast / ensemble / master-agent stack:** `master/{liveForecast, multiTfForecast, forecastAccuracy, forecastTriggers, ensemble, masterAgent, orthogonalSelector, narrator, liveCoach, liveAudit, engine, liveTick, preflight}`, `core/{agentRunner, auditLoop, completenessCritic, taxonomy, boxBreak}`.
- **Turbo2 ops surfaces:** `server/*`, `master/{alertRouter, fireContext, frontierPaper, tradeJournal, agentHealthMonitor, dataHealthMonitor, agentValidation, selfHeal, liveSignalRoster (replaced by twinRoster)}`, `data/{historyStore, historyUpdater, barCache, dxyFormula, economicCalendarFeed, goldFutures, macroNews, newsFeed, optionsChain, orderFlow}`.

## 6. Verification (this folder, 2026-10-08 — `npm run smoke:all:full`, exit 0)

| suite | result | what it proves |
|---|---|---|
| smoke_execution | 16/16 | cost model (session spread, exit types) |
| smoke_seq_resolver | 12/12 | 1m-sequenced fills, level/traded lock modes, fill-through |
| smoke_paper_trader | 33/33 | recorder: refusals priced, 1m parity, readiness stamp |
| smoke_paper_review | 8/8 | one vocabulary, on-track test, sequential rule, dense sub-book |
| smoke_trial_journal | 5/5 | (added rev b) the trial = Turbo2 journal read-only + own, merged by id; parent untouched |
| smoke_freshness | 5/5 | 2-flow contract sound, market calendar, pid liveness |
| smoke_netresolve | 6/6 | resilient DNS, cache expiry, TLS by hostname |
| smoke_temporal_guarantee | 7/7 | no `closeT = open + crumb` anywhere in the twin; 15m immunity |
| smoke_pro_signal | 13/13 | the A+ engine on real bars, causal |
| smoke_market_state | 9/9 | state machine, hysteresis, coherent gate |
| smoke_twin_roster | 8/8 | ONE book; TIER_STATS = artifact field for field (+ traded block); 3 fires over 61 causal cuts all geometrically exact and impulse-true |
| smoke_twin_parity | 3/3 | 105 shared fire cut points IDENTICAL to Turbo2's roster on 14 fields; gate verdict agrees; 16 quiet points agree on null |
| smoke_readiness | 5/5 | parity artifact PASS ≥95%, cell unchanged, live gauge + 1y-median density |
| smoke_regime_splitter | 25/25 | 8 regime-spanned folds, causal |
| smoke_impulse_frozen | 5/5 | the validator on the frozen tape reproduces EVERY shipped number exactly; verdict SHIP, no failed criterion (40 s) |

Also run: `study:stategate` (§2), `study:levelradar` + `validate:levelradar` (seq ALL 9,227 trades $0.63/t [0.36, 0.88], 14/14 years — agrees with Turbo2's 09-26 artifact on the grown tape), `tick:static` (reads 26,134 closed 15m bars from Turbo2's store, writes nothing; current state EQUILIBRIUM, no fire).
