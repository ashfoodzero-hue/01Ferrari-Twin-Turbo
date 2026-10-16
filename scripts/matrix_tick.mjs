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
import { matrixSignals, resolveMatrixTrade, matrixStructure, matrixArmedAt, emaSeries, WATCH, MATRIX } from '../src/master/ferrariMatrix.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { makeSpreadAt, loadLiveSpreads } from '../src/master/spreadModel.js'
import { alertSetup, scalpSetup, alertPrepare } from '../src/master/tradeAlert.js'

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
let opened = null, structure = null; try { structure = B.length && B.at(-1).t === lastClose - MATRIX.tfMs ? matrixStructure(B, D, W) : null } catch (e) { console.error('  ⚠ matrix structure: ' + e.message) }
const out = { structure, at: new Date(now).toISOString(), bar: new Date(lastClose - MATRIX.tfMs).toISOString(), data_live: st.live, data_why: st.why, verdict, open: state.open, last_closed: state.last_closed ?? null }

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
// 3) a new setup only with no open trade, on live verified data, on the just-closed 3m candle
if (!out.open && st.live && B.length && B.at(-1).t === lastClose - MATRIX.tfMs) {
  const sigs = matrixSignals(B, D, W, { from: B.length - 1 })
  const s = sigs.find((x) => x.i === B.length - 1)
  if (s && (!state.last_closed || Date.parse(state.last_closed.closedAt) < s.decisionT)) {
    out.open = { id: `MATRIX@${s.decisionT}`, sig: { ...s, ctx: undefined }, ctx: s.ctx, opened: new Date(now).toISOString(), status: 'OPEN', verdict: verdict.verdict }
    if (!STATIC) fs.appendFileSync(JOURNAL, JSON.stringify({ ...out.open, status: 'OPENED' }) + '\n')
    opened = s
    console.log(`  🟩 matrix ${s.side} @ ${s.entry.toFixed(2)} · SL ${s.sl.toFixed(2)} · TP1 ${s.tp1.toFixed(2)} · TP2 ${s.tp2.toFixed(2)} (${verdict.verdict})`)
  }
}
if (!out.open && !st.live) console.log(`  ⛔ matrix: no new trade — data not live (${st.why})`)
// 👁 WATCH (2026-10-16, Ashraf "option 2 — chart only"): BUY context aligned + the low ≥ 0.25 ATR through the buy wall, no trade, on live data.
// ONE rule: matrixArmedAt (the study's own function). Measured 82.3 % → a BUY signal within 60 min (post-hoc). NEVER sent to Telegram.
out.watch = null
if (!out.open && st.live && B.length && B.at(-1).t === lastClose - MATRIX.tfMs) {
  const dEma = emaSeries(D, MATRIX.dxyEma), arm = matrixArmedAt(B, atrArr(B, 14), B.length - 1, new Map(D.map((b) => [b.t, b])), dEma, W)
  if (arm?.buyCtx && arm.buyDist <= WATCH.k) { out.watch = { side: 'BUY', barT: B.at(-1).t, line: +arm.buyLine.toFixed(2), dist_atr: +arm.buyDist.toFixed(2), measured: WATCH }; console.log(`  👁 matrix WATCH BUY: wall touched (${arm.buyDist.toFixed(2)} ATR), waiting for the green trigger candle`) }
}
if (STATIC) { console.log(JSON.stringify({ ...out, open: out.open && { ...out.open, ctx: undefined } }, null, 1)); process.exit(0) }
fs.mkdirSync(TURBO.paper, { recursive: true })
fs.writeFileSync(STATE + '.tmp', JSON.stringify(out, null, 1)); fs.renameSync(STATE + '.tmp', STATE)
// 📨 Telegram "TRADE SETUP READY" (2026-10-16) — after the box is written, once per trade; never blocks or breaks the tick
if (out.watch && !out.open) { const r = await alertPrepare(out.watch, B.at(-1)?.c); console.log(`  📨 telegram PREPARE: ${r.sent ? 'sent' : r.dryRun ? 'dry run' : r.skipped || r.error}`) }   // 👁 → Telegram (2026-10-16)
if (opened) { const r = await alertSetup(scalpSetup(opened, { verdict: verdict.verdict })); console.log(`  📨 telegram SCALP: ${r.sent ? 'sent' : r.dryRun ? 'dry run (no TWIN_TELEGRAM_* in .env)' : r.skipped || r.error || 'not sent ' + r.status}`) }
