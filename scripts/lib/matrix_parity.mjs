// ════════════════════════════════════════════════════════════════════════════════
// matrix_parity.mjs — LIVE PARITY WATCHER for the Matrix SCALP (2026-10-27, Ashraf: "we need to prevent this from happening again … i kept asking why
// we have no buy signal and u did not know that we have this problem … so please fix permanent").
// MEASURED that day: over 7 days, 11 BUY signals in the recompute (same matrixSignals, today's data) were neither opened nor vetoed by the live tick,
// and the tick kept no record of why. This watcher closes that hole for good: every tick re-computes the recent window with the SAME function on the
// data as it is now and accounts for every signal — OPENED / VETOED / BUSY (a trade was open) / NOT_LIVE (data gate) / TICK_FAILED (tick killed or no
// run) / MISSED (none of these: the live tick saw something else). Each non-opened signal carries what the live tick SAW (matrix_decisions.jsonl) and
// the measured reason (which condition differed live vs now). MISSED / TICK_FAILED → data health WARN (dataHealth.js MATRIX_PARITY) → Telegram.
// WATCH ONLY: it never opens, vetoes or changes a trade.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'
import { matrixSignals, MATRIX } from '../../src/master/ferrariMatrix.js'

export const PARITY = Object.freeze({ lookMs: 150 * 60000, settleMs: 15 * 60000, keepMs: 24 * 3600000 })   // window: decisions 150 → 15 min ago (WTI delivered ≥ 10 min)
export const PARITY_FILE = () => path.join(TURBO.master, 'matrix_parity.json'), MISSED_FILE = () => path.join(TURBO.paper, 'matrix_missed.jsonl')
const rd = (f) => { try { return fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) } catch { return [] } }
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const hhmm = (t) => new Date(t).toISOString().slice(11, 16)

/** Which BUY / SELL conditions the live tick saw FALSE (its checklist) — the measured reason a signal that exists now did not fire live. */
export function liveDiff(side, row) {
  const c = side === 'BUY' ? row?.buy : row?.sell; if (!c) return null
  const off = Object.entries(c).filter(([, v]) => v !== true).map(([k, v]) => `${k}=${v}`)
  if (!off.length) return 'live saw every condition TRUE but opened nothing'
  const w = row.wti ? ` (WTI hour o ${row.wti.o} c ${row.wti.c}, last minute ${hhmm(row.wti.lastMinuteT)})` : row.wtiN === 0 ? ' (WTI: no minutes delivered)' : ''
  return `live saw ${off.join(', ')}${off.some((x) => x.startsWith('wti')) ? w : ''} — the data changed after the decision`
}

/**
 * PURE. Account for every recomputed signal. @param sigs matrixSignals output (window only) @param o.decisions matrix_decisions rows keyed by bar t
 * @param o.opened Set of decisionT · o.vetoed Set · o.busy [[openDecisionT, closedT]] · o.runs matrix_tick child_runs (bar ISO → exit)
 * @returns rows {t, decisionT, side, entry, status, reason}
 */
export function classifyParity(sigs, { decisions = new Map(), opened = new Set(), vetoed = new Set(), busy = [], runs = new Map() } = {}) {
  return sigs.map((s) => {
    const base = { t: s.t, decisionT: s.decisionT, side: s.side, entry: +s.entry.toFixed(2) }
    if (opened.has(s.decisionT)) return { ...base, status: 'OPENED', reason: null }
    if (vetoed.has(s.decisionT)) return { ...base, status: 'VETOED', reason: 'V1H structure gate' }
    const row = decisions.get(s.t), run = runs.get(s.decisionT)
    if (row?.open || (!row && busy.some(([a, b]) => s.decisionT > a && s.decisionT <= b))) return { ...base, status: 'BUSY', reason: 'a SCALP trade was already open' }
    if (run && run.exit !== 0) return { ...base, status: 'TICK_FAILED', reason: `matrix_tick ${run.killed ? 'killed' : 'exit ' + run.exit} after ${Math.round((run.ms ?? 0) / 1000)} s — this bar was never evaluated` }
    if (!row) return { ...base, status: 'TICK_FAILED', reason: run ? 'the tick ran but left no decision record' : 'no matrix_tick run for this bar' }
    if (row.halted || row.live === false) return { ...base, status: 'NOT_LIVE', reason: row.halted ? 'database STALE (health gate)' : `data not live: ${row.why}` }
    if (!row.barPresent) return { ...base, status: 'MISSED', reason: 'the closed 3m gold bar was not in the store at the decision' }
    return { ...base, status: 'MISSED', reason: liveDiff(s.side, row) }
  })
}

/** Called by matrix_tick each tick with the bars it already loaded. Writes matrix_parity.json; appends new MISSED / TICK_FAILED rows once each. */
export function runParity({ nowT, B, D, W }) {
  const from = nowT - PARITY.lookMs, to = nowT - PARITY.settleMs, i0 = B.findIndex((b) => b.t + MATRIX.tfMs >= from)
  const sigs = i0 < 0 ? [] : matrixSignals(B, D, W, { from: i0 }).filter((s) => s.decisionT >= from && s.decisionT <= to)
  const J = rd(path.join(TURBO.paper, 'matrix_trades.jsonl')).filter((r) => r.sig?.decisionT >= from - 2 * 86400000)
  const decisions = new Map(rd(path.join(TURBO.paper, 'matrix_decisions.jsonl')).slice(-200).map((r) => [Date.parse(r.bar), r]))
  const runs = new Map(rd(path.join(TURBO.master, 'child_runs.jsonl')).slice(-600).filter((r) => r.script === 'matrix_tick.mjs' && r.bar).map((r) => [Date.parse(r.bar), r]))
  const st = readJ(path.join(TURBO.master, 'matrix_state.json')), busy = J.filter((r) => r.status === 'CLOSED').map((r) => [r.sig.decisionT, Date.parse(r.closedAt)])
  if (st?.open?.sig) busy.push([st.open.sig.decisionT, Infinity])
  const rows = classifyParity(sigs, { decisions, opened: new Set(J.filter((r) => r.status === 'OPENED').map((r) => r.sig.decisionT)),
    vetoed: new Set(rd(path.join(TURBO.paper, 'matrix_vetoed.jsonl')).map((r) => r.sig?.decisionT)), busy, runs })
  const prev = readJ(PARITY_FILE()), known = new Set((prev?.problems ?? []).map((p) => p.decisionT)), fresh = rows.filter((r) => (r.status === 'MISSED' || r.status === 'TICK_FAILED') && !known.has(r.decisionT))
  for (const r of fresh) fs.appendFileSync(MISSED_FILE(), JSON.stringify({ ...r, found: new Date(nowT).toISOString(), live: decisions.get(r.t) ?? null }) + '\n')
  const problems = [...(prev?.problems ?? []).filter((p) => p.decisionT >= nowT - PARITY.keepMs), ...fresh.map((r) => ({ ...r, found: new Date(nowT).toISOString() }))]
  const counts = Object.fromEntries(['OPENED', 'VETOED', 'BUSY', 'NOT_LIVE', 'TICK_FAILED', 'MISSED'].map((k) => [k, rows.filter((r) => r.status === k).length]))
  const out = { at: new Date(nowT).toISOString(), window: { from: new Date(from).toISOString(), to: new Date(to).toISOString() }, signals: rows.length, counts, rows, problems }
  fs.writeFileSync(PARITY_FILE() + '.tmp', JSON.stringify(out, null, 1)); fs.renameSync(PARITY_FILE() + '.tmp', PARITY_FILE())
  return { ...out, fresh }
}
