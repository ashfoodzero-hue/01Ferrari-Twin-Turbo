// veto_score.mjs — OUTCOME of every SCALP BUY the V1H structure gate vetoed (2026-10-20, Ashraf: "Keep the V1H gate live as measured. Add automatic
// outcome scoring of every vetoed signal so the one-week review is ready with real numbers"). Each vetoed signal is priced EXACTLY as the box it would
// have been: ferrariMatrix.resolveMatrixTrade (same fill + spread + slip, stop first, TP1 half → stop to entry, TP2, 24 h horizon) on the verified 1m
// bars, with the live spreads (spreadModel). ONE place: matrix_tick calls updateVetoScores every tick; scripts/review_vetoed.mjs prints the review.
//   data/paper/matrix_vetoed_scored.jsonl  one row per vetoed signal once its trade is DONE (append-only, never rewritten)
//   data/master/matrix_veto_review.json    summary: vetoed (all / one-box-at-a-time) vs the boxes the gate KEPT since it went live
// Scored only while the data is live (health not halted): a trade is never settled on a gap.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, quotesFile } from '../../src/core/paths.js'
import { loadBars } from '../../src/data/backfillReader.js'
import { resolveMatrixTrade } from '../../src/master/ferrariMatrix.js'
import { makeSpreadAt, loadLiveSpreads } from '../../src/master/spreadModel.js'

export const GATE_LIVE_T = Date.parse('2026-10-20T09:00:00Z')   // V1H wired live (§7 (dg))
export const VETOED = path.join(TURBO.paper, 'matrix_vetoed.jsonl'), SCORED = path.join(TURBO.paper, 'matrix_vetoed_scored.jsonl')
export const KEPT = path.join(TURBO.paper, 'matrix_trades.jsonl'), REVIEW = path.join(TURBO.master, 'matrix_veto_review.json')
const rows = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) } catch { return [] } }

/** Pure: resolve each not-yet-scored veto; returns the rows whose trade is DONE. */
export function scoreVetoes(vetoes, scoredIds, m1, spreadAt, nowT) {
  const out = []
  for (const v of vetoes) { if (scoredIds.has(v.id)) continue
    const r = resolveMatrixTrade(v.sig, m1, spreadAt, { nowT })
    if (r.done) out.push({ id: v.id, status: 'SCORED', side: v.sig.side, decisionT: v.sig.decisionT, entry: v.sig.entry, sl: v.sig.sl, tp1: v.sig.tp1, tp2: v.sig.tp2,
      gate: v.gate, outcome: r.outcome, pnl: r.pnl, fill: r.fill, legs: r.legs, events: r.events, exitT: r.exitT, closedAt: new Date(r.exitT).toISOString(), scoredAt: new Date(nowT).toISOString() }) }
  return out
}

const stats = (L) => { const n = L.length, pnl = L.map((x) => x.pnl), net = pnl.reduce((a, b) => a + b, 0)
  return { n, wins: pnl.filter((p) => p > 0).length, wr: n ? +(pnl.filter((p) => p > 0).length / n).toFixed(3) : null, tp1_rate: n ? +(L.filter((x) => /TP1/.test(x.outcome)).length / n).toFixed(3) : null,
    net: +net.toFixed(2), per_trade: n ? +(net / n).toFixed(2) : null, outcomes: L.reduce((m, x) => ((m[x.outcome] = (m[x.outcome] ?? 0) + 1), m), {}) } }
/** Pure: one box at a time (what the live SCALP could have held): a veto is taken only if no earlier taken veto or kept box is still open. A taken
 *  veto whose trade is not done yet (pending) holds the box until it is → everything after it waits ({ taken, pending }). */
export function oneAtATime(vetoes, scored, kept) {
  const byId = new Map(scored.map((s) => [s.id, s])), busy = kept.map((k) => [k.sig.decisionT, Date.parse(k.closedAt)]), taken = []; let freeAt = -Infinity, pending = 0
  for (const v of [...vetoes].sort((a, b) => a.sig.decisionT - b.sig.decisionT)) { const t = v.sig.decisionT
    if (t < freeAt || busy.some(([a, b]) => t >= a && t < b)) continue
    const s = byId.get(v.id); if (!s) { pending++; freeAt = Infinity; continue }
    taken.push(s); freeAt = s.exitT }
  return { taken, pending }
}
/** Pure: the review summary. */
export function vetoSummary(vetoes, scored, keptClosed, nowT) {
  const v = vetoes.filter((x) => x.sig.decisionT >= GATE_LIVE_T), sc = scored.filter((x) => x.decisionT >= GATE_LIVE_T), k = keptClosed.filter((x) => x.sig.decisionT >= GATE_LIVE_T)
  const one = oneAtATime(v, sc, k)
  return { at: new Date(nowT).toISOString(), gate_live_since: new Date(GATE_LIVE_T).toISOString(), days: +((nowT - GATE_LIVE_T) / 86400000).toFixed(1),
    vetoed_signals: v.length, pending: v.length - sc.length,
    vetoed_all: stats(sc), vetoed_one_at_a_time: { ...stats(one.taken), pending_box: one.pending }, kept: { ...stats(k.map((x) => ({ pnl: x.pnl, outcome: x.outcome }))), buys: k.filter((x) => x.sig.side === 'BUY').length, sells: k.filter((x) => x.sig.side === 'SELL').length },
    priced_as: 'resolveMatrixTrade: fill + live spread + slip, stop first, TP1 half → stop to entry, TP2, 24 h horizon ($/oz)',
    note: 'vetoed signals of one move are correlated — count independent moves before judging; the measured pass is 2 y + 13 y (§7 (df))' }
}

/** IO: the vetoed BUYs of the last `hours` for the chart's grey "SCALP BLOCKED" boxes (2026-10-20) — each with its scored outcome once settled. */
export function recentVetoes(nowT, hours = 24) {
  const by = new Map(rows(SCORED).map((s) => [s.id, s]))
  return rows(VETOED).filter((v) => v.sig.decisionT >= nowT - hours * 3600000).map((v) => { const s = by.get(v.id), r = (x) => +(+x).toFixed(2)
    return { id: v.id, t: v.sig.t, decisionT: v.sig.decisionT, side: v.sig.side, entry: r(v.sig.entry), sl: r(v.sig.sl), tp1: r(v.sig.tp1), tp2: r(v.sig.tp2), gate: v.gate ?? null,
      status: s ? s.outcome : 'OPEN', pnl: s?.pnl ?? null, exitT: s?.exitT ?? null } })
}

/** IO: score what is due, append it, rewrite the summary. Called by matrix_tick every tick (dataLive = stream live and health not halted). */
export async function updateVetoScores({ nowT, dataLive = true, write = true } = {}) {
  const vetoes = rows(VETOED), scored = rows(SCORED), ids = new Set(scored.map((x) => x.id)), due = vetoes.filter((v) => !ids.has(v.id))
  let added = []
  if (dataLive && due.length) {
    const from = Math.min(...due.map((v) => v.sig.decisionT)) - 60000
    const m1 = (await loadBars('XAUUSD', '1m', { from })).bars.filter((b) => b.t + 60000 <= nowT)
    const spreadAt = makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from: from - 86400000 }) })
    added = scoreVetoes(due, ids, m1, spreadAt, nowT)
    if (write && added.length) fs.appendFileSync(SCORED, added.map((r) => JSON.stringify(r)).join('\n') + '\n')
  }
  const sum = vetoSummary(vetoes, [...scored, ...added], rows(KEPT).filter((x) => x.status === 'CLOSED'), nowT)
  if (write) { fs.writeFileSync(REVIEW + '.tmp', JSON.stringify(sum, null, 1)); fs.renameSync(REVIEW + '.tmp', REVIEW) }
  return { added, summary: sum }
}
