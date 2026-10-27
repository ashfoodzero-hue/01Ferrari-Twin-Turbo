// matrix_tick.mjs — the FERRARI MATRIX scalp, live (2026-10-09): one tick 4 s after every 3m close (run_twin.mjs). PAPER ONLY.
//   1. wait until the tick stream has SETTLED the closed minute for gold and DXY's six pairs (fail closed: no new trade on stale data)
//   2. an OPEN trade is replayed on the verified 1m bars with the SAME resolver as the backtest (ferrariMatrix.resolveMatrixTrade);
//      when it ends (TP1+TP2 / TP1+BE / SL / TIME) it is journaled and the box disappears (data/master/matrix_state.json → open: null)
//   3. with NO open trade, the just-closed 3m candle is evaluated (ferrariMatrix.matrixSignals) — a signal opens a paper trade = the box
// WTI is read as delivered (≥ 10 min old) — Ashraf's explicit R0 exception for this signal. Verdict label from ferrari_matrix_gate.json.
//   --static : evaluate and print, write nothing
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, quotesFile } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars, DXY_WEIGHTS } from '../src/data/dxy.js'
import { wtiBars } from '../src/data/wti.js'
import { waitStreamSettled, streamStatus } from '../src/data/tickStream.js'
import { pidAlive } from '../src/core/pidAlive.js'
import { matrixSignals, resolveMatrixTrade, matrixStructure, matrixArmedAt, emaSeries, WATCH, WALL_TOUCH, MATRIX } from '../src/master/ferrariMatrix.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt, loadLiveSpreads } from '../src/master/spreadModel.js'
import { alertSetup, scalpSetup, alertPrepare, alertBlocked } from '../src/master/tradeAlert.js'
import { signalsHalted } from '../src/core/dataHealth.js'
import { clean1m, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { V1H, structureStateAt } from './lib/choch4h.mjs'
import { updateVetoScores, recentVetoes } from './lib/veto_score.mjs'
import { mlSellTick } from './lib/ml_sell_live.mjs'
import { runParity } from './lib/matrix_parity.mjs'

const STATIC = process.argv.includes('--static')
const STATE = path.join(TURBO.master, 'matrix_state.json'), JOURNAL = path.join(TURBO.paper, 'matrix_trades.jsonl')
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const gate = readJ(path.join(TURBO.master, 'ferrari_matrix_gate.json'))
const verdict = gate ? { verdict: gate.verdict, oos_net: gate.primary?.oos?.net, oos_wr: gate.primary?.oos?.wr, window: gate.primary?.window } : { verdict: 'UNVALIDATED' }

const now = Date.now(), lastClose = Math.floor(now / MATRIX.tfMs) * MATRIX.tfMs
const syms = ['XAUUSD', ...Object.keys(DXY_WEIGHTS)]
const st = STATIC ? streamStatus({ needMinute: lastClose - 60000, symbols: syms, pidAlive }) : await waitStreamSettled({ needMinute: lastClose - 60000, symbols: syms, timeoutMs: 25000, pidAlive })
const state = readJ(STATE) ?? { open: null }
const from = lastClose - 3 * 86400000
const [B, D, W, M1] = await Promise.all([
  loadBars('XAUUSD', '3m', { from }).then((r) => r.bars.filter((b) => b.t + MATRIX.tfMs <= lastClose)),
  loadDxyBars('3m', { from }).then((r) => r.bars.filter((b) => b.t + MATRIX.tfMs <= lastClose)),
  wtiBars('1m', lastClose - 4 * 3600000).then((r) => r.bars).catch(() => []),
  loadBars('XAUUSD', '1m', { from: (state.open?.sig?.decisionT ?? lastClose) - 60000 }).then((r) => r.bars.filter((b) => b.t + 60000 <= lastClose)),
])
const spreadAt = makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from: lastClose - 2 * 86400000 }) })
let opened = null, blocked = null, structure = null; try { structure = B.length && B.at(-1).t === lastClose - MATRIX.tfMs ? matrixStructure(B, D, W) : null } catch (e) { console.error('  ⚠ matrix structure: ' + e.message) }
// DATA HEALTH GATE (2026-10-18): with the database STALE no new box opens (an open box still resolves on the bars that exist)
const health = signalsHalted()
const out = { structure, at: new Date(now).toISOString(), bar: new Date(lastClose - MATRIX.tfMs).toISOString(), data_live: st.live && !health.halted, data_why: health.halted ? `DATABASE STALE — ${health.why}` : st.why, verdict, open: state.open, last_closed: state.last_closed ?? null }

// 2) manage the open trade
if (state.open) {
  const r = resolveMatrixTrade(state.open.sig, M1, spreadAt, { nowT: lastClose })
  if (r.done) {
    const row = { ...state.open, status: 'CLOSED', outcome: r.outcome, pnl: r.pnl, fill: r.fill, legs: r.legs, events: r.events, closedAt: new Date(r.exitT).toISOString() }
    if (!STATIC) fs.appendFileSync(JOURNAL, JSON.stringify(row) + '\n')
    out.open = null; out.last_closed = { side: row.sig.side, outcome: r.outcome, pnl: r.pnl, closedAt: row.closedAt }
    console.log(`  ⬛ matrix ${row.sig.side} closed: ${r.outcome} ${r.pnl >= 0 ? '+' : ''}${r.pnl}/oz — box removed`)
  } else { out.open = { ...state.open, progress: { tp1Hit: r.tp1Hit, events: r.events, fill: r.fill } }; console.log(`  ▣ matrix ${state.open.sig.side} open · TP1 ${r.tp1Hit ? 'hit (stop at entry)' : 'not yet'}`) }
}
// 🧭 V1H STRUCTURE GATE (2026-10-20, Ashraf "Yes, wire the V1H structure gate into the live SCALP"; PASSED 2 y + 13 y, §7 (df)): no BUY box while the
// 1H pivot structure is DOWN (LH + LL), read on the last 1H candle closed by the decision. ONE rule: choch4h.structureStateAt. FAIL-CLOSED: unknown → no BUY.
let SG = null
try { const M45 = await clean1m('XAUUSD', { from: lastClose - V1H.lookbackDays * 86400000, reopenClamp: false, live: true }), Mx = M45.filter((b) => b.t + 60000 <= lastClose)
  const C1 = kit('XAUUSD', { reopenClamp: false, live: true }).build(Mx, V1H.tf); markIncomplete(C1, findHoles(Mx)); SG = structureStateAt(C1, Mx, lastClose) } catch (e) { console.error('  ⚠ structure gate: ' + e.message) }
out.structureGate = { state: SG ? (SG.state === -1 ? 'DOWN' : SG.state === 1 ? 'UP' : 'MIXED') : 'UNKNOWN', barT: SG?.barT ?? null, blocksBuy: !SG || SG.state === -1, vetoed: null, spec: V1H.spec }
// blocked EPISODE (2026-10-20, Ashraf: "one Telegram notice per blocked episode"): the 3m close at which BUYs became blocked, carried tick to tick
out.structureGate.blockedSince = out.structureGate.blocksBuy ? (state.structureGate?.blocksBuy && state.structureGate.blockedSince ? state.structureGate.blockedSince : lastClose) : null
// 3) a new setup only with no open trade, on live verified data, on the just-closed 3m candle
if (!out.open && st.live && !health.halted && B.length && B.at(-1).t === lastClose - MATRIX.tfMs) {
  const sigs = matrixSignals(B, D, W, { from: B.length - 1 })
  const s = sigs.find((x) => x.i === B.length - 1)
  if (s && s.side === 'BUY' && out.structureGate.blocksBuy) {
    out.structureGate.vetoed = { decisionT: s.decisionT, entry: +s.entry.toFixed(2) }
    if (!STATIC) fs.appendFileSync(path.join(TURBO.paper, 'matrix_vetoed.jsonl'), JSON.stringify({ id: `MATRIX@${s.decisionT}`, status: 'VETOED_V1H', sig: { ...s, ctx: undefined }, gate: out.structureGate.state, at: new Date(now).toISOString() }) + '\n')
    console.log(`  🧭 matrix BUY @ ${s.entry.toFixed(2)} NOT opened — 1H structure ${out.structureGate.state} (V1H gate)`)
    blocked = s
  } else if (s && (!state.last_closed || Date.parse(state.last_closed.closedAt) < s.decisionT)) {
    out.open = { id: `MATRIX@${s.decisionT}`, sig: { ...s, ctx: undefined }, ctx: s.ctx, opened: new Date(now).toISOString(), status: 'OPEN', verdict: verdict.verdict }
    if (!STATIC) fs.appendFileSync(JOURNAL, JSON.stringify({ ...out.open, status: 'OPENED' }) + '\n')
    opened = s
    console.log(`  🟩 matrix ${s.side} @ ${s.entry.toFixed(2)} · SL ${s.sl.toFixed(2)} · TP1 ${s.tp1.toFixed(2)} · TP2 ${s.tp2.toFixed(2)} (${verdict.verdict})`)
  }
}
// 🧮 VETO SCORING (2026-10-20, Ashraf: "Keep the V1H gate live as measured. Add automatic outcome scoring of every vetoed signal"): each vetoed BUY
// is priced as the box it would have been (resolveMatrixTrade, live spreads) once its trade is done → matrix_vetoed_scored.jsonl + matrix_veto_review.json.
// Never breaks the tick; settles nothing on stale data.
if (!STATIC) try { const vr = await updateVetoScores({ nowT: lastClose, dataLive: st.live && !health.halted })
  for (const a of vr.added) console.log(`  🧮 vetoed BUY ${new Date(a.decisionT).toISOString().slice(11, 16)} scored: ${a.outcome} ${a.pnl >= 0 ? '+' : ''}${a.pnl}/oz`) } catch (e) { console.error('  ⚠ veto scoring: ' + e.message) }
// grey "SCALP BLOCKED" boxes (2026-10-20): the last 24 h of vetoed BUYs with their scored outcome ride on structureGate (/api/matrix passes it whole)
try { out.structureGate.recent = recentVetoes(lastClose) } catch (e) { console.error('  ⚠ recent vetoes: ' + e.message) }
// 🤖 ML SELL X3 — PAPER forward test (2026-10-25, Ashraf: "build the live PAPER forward test of the ML SELL X3 model (same feature code, scored like the other
// paper books, chart box SELL only, no Telegram trade alerts yet)"): the frozen walk-forward model scores this closed 3m bar; one paper SELL at a time, priced
// with the live spreads. Data live + health OK only; never Telegram; never breaks the tick. scripts/lib/ml_sell_live.mjs (SCALP_SELL_ML_SPEC, §7 (ea)).
if (!STATIC) try { const ml = await mlSellTick({ lastClose, dataLive: st.live && !health.halted, why: health.halted ? health.why : st.why, spreadAt })
  if (ml.open && ml.open.id && !ml.decision?.skipped && ml.decision?.fires) console.log(`  🤖 ML SELL paper @ ${ml.open.sig.entry.toFixed(2)} · score ${ml.decision.score} ≥ ${ml.decision.threshold}`)
  else if (ml.last_closed && ml.last_closed.closedAt > new Date(lastClose - 180000).toISOString()) console.log(`  🤖 ML SELL paper closed: ${ml.last_closed.outcome} ${ml.last_closed.pnl}/oz`) } catch (e) { console.error('  ⚠ ml sell: ' + e.message) }
if (!out.open && (!st.live || health.halted)) console.log(`  ⛔ matrix: no new trade — ${health.halted ? "DATABASE STALE (" + health.why + ")" : "data not live (" + st.why + ")"}`)
// 👁 WATCH (2026-10-16, Ashraf "option 2 — chart only"): BUY context aligned + the low ≥ 0.25 ATR through the buy wall, no trade, on live data.
// ONE rule: matrixArmedAt (the study's own function). Measured 82.3 % → a BUY signal within 60 min (post-hoc). NEVER sent to Telegram.
out.watch = null; out.wallTouch = null
if (!out.open && st.live && !health.halted && B.length && B.at(-1).t === lastClose - MATRIX.tfMs) {
  const dEma = emaSeries(D, MATRIX.dxyEma), arm = matrixArmedAt(B, atrArr(B, 14), B.length - 1, new Map(D.map((b) => [b.t, b])), dEma, W)
  if (arm?.buyCtx && arm.buyDist <= WATCH.k) { out.watch = { side: 'BUY', barT: B.at(-1).t, line: +arm.buyLine.toFixed(2), dist_atr: +arm.buyDist.toFixed(2), measured: WATCH }; console.log(`  👁 matrix WATCH BUY: wall touched (${arm.buyDist.toFixed(2)} ATR), waiting for the green trigger candle`) }
  // 🫴 WALL TOUCH (chart only, 2026-10-16): price through the wall but WTI / DXY not aligned yet — the earlier, weaker level
  else if (arm && arm.buyDist <= WALL_TOUCH.k) out.wallTouch = { side: 'BUY', barT: B.at(-1).t, line: +arm.buyLine.toFixed(2), dist_atr: +arm.buyDist.toFixed(2), wti_ok: arm.buyCtx, measured: WALL_TOUCH }
}
// 💵 DXY's OWN MATRIX (2026-10-19, Ashraf: "show DXY's own Matrix BUY/SELL as an info chip on the chart"): the same script run ON DXY
// (matrixSignals(dxy3m, dxy3m, wti) — on DX1! the script's "DXY" series is DXY itself), gold-grid DXY rebuilt from the 6 Polygon pairs (wickless
// minutes — TradingView DX1! is ICE futures with wicks, so its signals can differ). INFORMATION ONLY: vetoing a gold BUY on it was measured,
// no pass (§7 (dc), matrix_dxy_conflict_study.json). Last signal of the past 60 min + whether it is on the just-closed candle (same as gold's).
out.dxyMatrix = null
if (st.live && !health.halted && D.length && D.at(-1).t === lastClose - MATRIX.tfMs) {
  try { const ds = matrixSignals(D, D, W, { from: Math.max(0, D.length - 20) }), last = ds.at(-1)
    out.dxyMatrix = { barT: D.at(-1).t, last: last ? { side: last.side, decisionT: last.decisionT, close: +last.entry.toFixed(4) } : null, now: !!last && last.i === D.length - 1,
      gold_same_candle: !!last && last.i === D.length - 1 && !!opened && opened.decisionT === last.decisionT, measured: 'veto measured: no pass (§7 dc)' }
    if (out.dxyMatrix.now) console.log(`  💵 DXY Matrix ${last.side} on this candle${out.dxyMatrix.gold_same_candle ? ' — SAME candle as the gold box (conflict)' : ''}`) } catch (e) { console.error('  ⚠ dxy matrix: ' + e.message) } }
if (STATIC) { console.log(JSON.stringify({ ...out, open: out.open && { ...out.open, ctx: undefined } }, null, 1)); process.exit(0) }
fs.mkdirSync(TURBO.paper, { recursive: true })
fs.writeFileSync(STATE + '.tmp', JSON.stringify(out, null, 1)); fs.renameSync(STATE + '.tmp', STATE)
// 🔎 DECISION LOG (2026-10-27, Ashraf: "double check everything"): a 7-day parity check found 11 BUY signals in today's recompute that the live tick
// neither opened nor vetoed, and the tick kept no record of why a bar gave no signal (inference ≠ measurement). One line per tick = exactly what the
// tick SAW (gold bar, DXY, WTI as delivered, every BUY / SELL condition). LOGGING ONLY — no decision reads it. Never breaks the tick.
try { const s = structure, gb = B.at(-1)
  fs.appendFileSync(path.join(TURBO.paper, 'matrix_decisions.jsonl'), JSON.stringify({ bar: new Date(lastClose - MATRIX.tfMs).toISOString(), at: out.at, live: st.live, why: st.why ?? null,
    halted: health.halted, open: !!state.open, gate: out.structureGate.state, barPresent: !!gb && gb.t === lastClose - MATRIX.tfMs,
    gold: gb ? { t: gb.t, o: gb.o, h: gb.h, l: gb.l, c: gb.c } : null, buyLine: s ? +s.levels.buyLine.toFixed(2) : null, sellLine: s ? +s.levels.sellLine.toFixed(2) : null,
    buy: s?.buy ?? null, sell: s?.sell ?? null, dxy: s?.dxy ?? null, dxyBarT: D.at(-1)?.t ?? null, wti: s?.wti ?? null, wtiN: W.length, wtiLastT: W.at(-1)?.t ?? null,
    opened: opened ? opened.side : null, vetoed: blocked ? blocked.side : null }) + '\n') } catch (e) { console.error('  ⚠ decision log: ' + e.message) }
// 🔁 LIVE PARITY WATCHER (2026-10-27, Ashraf: "so please fix permanent"): every recent signal recomputed and accounted for — a MISSED / TICK_FAILED
// signal goes to matrix_missed.jsonl and data health (MATRIX_PARITY WARN → Telegram). Watch only. scripts/lib/matrix_parity.mjs
try { const p = runParity({ nowT: lastClose, B, D, W })
  for (const r of p.fresh) console.log(`  🔁 PARITY ${r.status}: ${r.side} ${new Date(r.t).toISOString().slice(11, 16)} @ ${r.entry} — ${r.reason}`) } catch (e) { console.error('  ⚠ parity watcher: ' + e.message) }
// 📨 Telegram "TRADE SETUP READY" (2026-10-16) — after the box is written, once per trade; never blocks or breaks the tick
// PREPARE is a BUY watch: never sent while the V1H gate blocks BUYs (2026-10-20, Ashraf: "Stop sending PREPARE while V1H blocks BUYs") — the 17:18 notice
// announced a BUY the gate then vetoed. The chart keeps drawing the WATCH line (information).
if (out.watch && !out.open && out.structureGate.blocksBuy) console.log('  📨 telegram PREPARE: not sent — SCALP BUYs blocked (V1H, 1H ' + out.structureGate.state + ')')
if (blocked) { const r = await alertBlocked(blocked, out.structureGate); console.log(`  📨 telegram BLOCKED: ${r.sent ? 'sent' : r.dryRun ? 'dry run' : r.skipped || r.error || 'not sent ' + r.status}`) }
if (out.watch && !out.open && !out.structureGate.blocksBuy) { const r = await alertPrepare(out.watch, B.at(-1)?.c); console.log(`  📨 telegram PREPARE: ${r.sent ? 'sent' : r.dryRun ? 'dry run' : r.skipped || r.error}`) }   // 👁 → Telegram (2026-10-16)
if (opened) { let silverUp = null; try { const S3 = (await loadBars('XAGUSD', '3m', { from: lastClose - 2 * 86400000 })).bars.filter((b) => b.t + MATRIX.tfMs <= lastClose); if (S3.length > 20) { const e = emaSeries(S3, 10); silverUp = S3.at(-1).c > e.get(S3.at(-1).t) } } catch { /* info only */ }
  const r = await alertSetup(scalpSetup(opened, { verdict: verdict.verdict, gate: verdict, silverUp })); console.log(`  📨 telegram SCALP: ${r.sent ? 'sent' : r.dryRun ? 'dry run (no TWIN_TELEGRAM_* in .env)' : r.skipped || r.error || 'not sent ' + r.status}`) }
