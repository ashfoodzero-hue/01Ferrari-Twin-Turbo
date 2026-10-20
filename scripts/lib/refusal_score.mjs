// refusal_score.mjs — OUTCOME of every IMPULSE_CONT signal the market-state gate REFUSED (2026-10-20, Ashraf: "add automatic outcome scoring of every
// REFUSED IMPULSE_CONT signal (same resolver as the live book), so we can see what the state gate costs on SELLs"). A refusal's plan travels in its
// `wouldBe` block (paperTrader.recordSignals); it is copied ONCE into its own journal as the PENDING row the book would have recorded, and settled by
// the SAME paperTrader.resolveOpen the live book uses (limit fill, 1m sub-bar fill sequencing, BE arm/lock, stop first, measured live spread).
// The live journal (trades.jsonl) is never written here.
//   data/paper/impulse_refused_wouldbe.jsonl   the would-be rows (PENDING → OPEN → TARGET / SCRATCH / STOPPED / EXPIRED)
//   data/master/impulse_refusal_review.json    refused (priced) vs taken, per side
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TURBO, quotesFile } from '../../src/core/paths.js'
import { loadBarsLive } from '../../src/data/liveBars.js'
import { loadJournal, resolveOpen } from '../../src/master/paperTrader.js'
import { makeSubBarIndex } from '../../src/core/seqResolver.js'
import { makeSpreadAt, loadLiveSpreads } from '../../src/master/spreadModel.js'

export const LIVE = path.join(TURBO.paper, 'trades.jsonl'), WOULDBE = path.join(TURBO.paper, 'impulse_refused_wouldbe.jsonl'), REVIEW = path.join(TURBO.master, 'impulse_refusal_review.json')

/** Pure: the PENDING row the book would have recorded for this refusal (field-for-field the recordSignals trade row); null if unpriceable. */
export function wouldBeRow(r) {
  const w = r.wouldBe; if (!w || w.entry == null || w.stop == null || w.target == null || !w.side) return null
  return { id: r.id, tier: r.tier, state: 'PENDING', shadow: true, refusedWhy: r.why ?? null, beTriggerR: w.beTriggerR ?? null, beLockR: w.beLockR ?? null, beApplied: false,
    side: w.side, entry: w.entry, stop: w.stop, target: w.target, controlAgree: null, atr: w.atr ?? null, risk: +Math.abs(w.entry - w.stop).toFixed(2),
    tf: '15m', t: r.t, recordedAtBar: r.recordedAtBar, reasons: [], trendGate: r.trendGate ?? null, htfSweep: r.htfSweep ?? null, offHoursStart: r.offHoursStart ?? null }
}

const DONE = new Set(['TARGET', 'SCRATCH', 'STOPPED', 'EXPIRED'])
/** Pure: book-style stats — WR = targets / (targets + stops) (scratches apart, as the shipped 73.6 % is defined), $ = resolver pnl per filled trade. */
export function bookStats(rows) {
  const done = rows.filter((r) => DONE.has(r.state)), filled = done.filter((r) => r.state !== 'EXPIRED'), c = (s) => done.filter((r) => r.state === s).length
  const w = c('TARGET'), l = c('STOPPED'), net = filled.reduce((a, r) => a + (r.pnl ?? 0), 0)
  return { settled: done.length, target: w, scratch: c('SCRATCH'), stopped: l, expired: c('EXPIRED'), wr_ex_scratch: w + l ? +(w / (w + l)).toFixed(3) : null,
    net: +net.toFixed(2), per_filled_trade: filled.length ? +(net / filled.length).toFixed(3) : null, open: rows.filter((r) => !DONE.has(r.state)).length }
}
const bySide = (rows) => Object.fromEntries(['BUY', 'SELL'].map((s) => [s, bookStats(rows.filter((r) => r.side === s))]))
export function refusalSummary(live, wb, nowT) {
  const refused = live.filter((r) => r.state === 'REFUSED'), taken = live.filter((r) => r.state !== 'REFUSED')
  const whys = refused.reduce((m, r) => ((m[r.why ?? '?'] = (m[r.why ?? '?'] ?? 0) + 1), m), {})
  return { at: new Date(nowT).toISOString(), journal_since: live.length ? new Date(Math.min(...live.map((r) => r.t))).toISOString() : null,
    refused_signals: refused.length, unpriceable: refused.filter((r) => !wouldBeRow(r)).length, refused_why: whys,
    refused_priced: { all: bookStats(wb), ...bySide(wb) }, taken: { all: bookStats(taken), ...bySide(taken) },
    priced_as: 'paperTrader.resolveOpen — the live book resolver (limit fill, 1m sub-bars, BE arm/lock, stop first, live spread); WR excludes scratches like the shipped 73.6 %',
    note: 'state-gate study (state_gate_on_impulse.json): VETOED arm break-even, unpowered — few refusals a week are a forward record, not a verdict' }
}

/** IO: copy new refusals in, settle them with the live resolver on the tick's own 15m bars, rewrite the summary. dry → works on a temp copy. */
export async function updateRefusalScores({ b15 = null, nowT = Date.now(), dry = false } = {}) {
  const live = loadJournal(LIVE), file = dry ? path.join(os.tmpdir(), `impulse_refused_wouldbe.${process.pid}.jsonl`) : WOULDBE
  if (dry) fs.writeFileSync(file, fs.existsSync(WOULDBE) ? fs.readFileSync(WOULDBE) : '')
  const wb = loadJournal(file), have = new Set(wb.map((r) => r.id)), add = live.filter((r) => r.state === 'REFUSED' && !have.has(r.id)).map(wouldBeRow).filter(Boolean)
  if (add.length) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, add.map((r) => JSON.stringify(r)).join('\n') + '\n') }
  const open = [...wb, ...add].filter((r) => r.state === 'PENDING' || r.state === 'OPEN'); let res = null
  if (open.length) {
    const from = Math.min(...open.map((r) => r.t)) - 86400000
    const B = b15 ?? (await loadBarsLive('XAUUSD', '15m', { from })).bars, { bars: m1 } = await loadBarsLive('XAUUSD', '1m', { from })
    res = resolveOpen(file, B, undefined, { subBarsOf: m1?.length ? makeSubBarIndex(m1) : null, spreadAt: makeSpreadAt({ live: loadLiveSpreads(quotesFile('XAUUSD'), { from }) }) })
  }
  const rows = loadJournal(file), sum = refusalSummary(live, rows, nowT)
  if (dry) fs.rmSync(file, { force: true })
  else { fs.writeFileSync(REVIEW + '.tmp', JSON.stringify(sum, null, 1)); fs.renameSync(REVIEW + '.tmp', REVIEW) }
  return { added: add.length, resolved: res, rows, summary: sum }
}
