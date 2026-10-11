// validate_level_radar_seq.mjs — Ashraf (2026-09-26): R14 Method E for the LEVEL RADAR's fade playbook. The 23y study resolved the
// fade on 15m bars with a pessimistic fill-bar rule; the fill-bar SEQUENCE bug (2026-08-14) inflated the old books' WRs by 20-35pp,
// so every fade candidate from 2013-07 (the 1m store) is re-resolved here with the SAME 1m-sequenced resolver every shipping book
// uses (src/core/seqResolver.js: limit at the level, SL 0.5·ATR(4h), TP 1.0·ATR(4h), no BE, fill window = the touch window, horizon
// 96 × 15m). Per-cell agreement between the 15m and the sequenced result is the verdict. RESEARCH ONLY.
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { TURBO } from '../src/core/paths.js'
import { resolveManagedLimitSeq, makeSubBarIndex } from '../src/core/seqResolver.js'
import { netDollars, netDollarsBidAsk } from '../src/master/execution.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
// twin 2026-10-08 — MONEY PATH switches (same as validate_impulse_cont_ship): TURBO_BIDASK=1 (BID bars, ask-side orders clear the MEASURED
// spread, cost = slippage only) · TURBO_SEQ_ALL=1 (every bar on 1m — the live trial's rule) · TURBO_VAL_OUT redirects the artifact.
const BIDASK = process.env.TURBO_BIDASK === '1', SEQ_ALL = process.env.TURBO_SEQ_ALL === '1', spreadAt = BIDASK ? makeSpreadAt() : null
import { wilsonLowerBound } from '../src/core/stats.js'
const OUT = process.env.TURBO_STUDY_OUT || path.join(TURBO.master, 'level_radar_seq_validation.json')
const cands = fs.readFileSync(path.join(TURBO.master, 'level_radar_fade_candidates.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const FROM = Date.parse('2013-07-15T00:00:00Z')
console.log(`\n████ LEVEL RADAR fade — 1m-SEQUENCED re-resolution (2013-07 → tape end) ████`)
const { bars } = await loadBars('XAUUSD', '15m', { from: FROM - 30 * 86400000 })
const idxByT = new Map(bars.map((b, k) => [b.t, k]))
const m1 = (await loadBars('XAUUSD', '1m', { from: FROM - 86400000 })).bars
const subBarsOf = makeSubBarIndex(m1)
console.log('15m', bars.length, '· 1m', m1.length, '· candidates', cands.length, '→ in 1m span', cands.filter((c) => c.decisionT >= FROM).length)
const mean = (a, k) => a.length ? a.reduce((s, x) => s + (k ? x[k] : x), 0) / a.length : 0
const rows = []
for (const c of cands) { if (c.decisionT < FROM) continue
  const up = c.dir === 'UP'; const plan = { entry: c.level, sl: up ? c.level - c.stop : c.level + c.stop, tp: up ? c.level + c.tgt : c.level - c.tgt }
  const i = idxByT.get(Math.floor(c.decisionT / 900000) * 900000); if (i == null) continue
  // the resolver's signal bar = the 4H close bar; the limit may fill within 96 bars (the study's 24h window)
  const r = resolveManagedLimitSeq({ direction: c.dir, plan, ts_utc: new Date(bars[i].t).toISOString() }, bars, idxByT, subBarsOf, { fillWindow: 96, horizon: 96, beTriggerR: 0, beLockR: 0, tfMs: 900000, lockMode: 'level', spreadAt, seqAll: SEQ_ALL })
  if (r.outcome === 'NOFILL' || r.outcome === 'NOTRADE') { rows.push({ comp: c.comp, seq: 'NOFILL', net15m: c.net15m, netSeq: null, res15m: c.res15m }); continue }
  const net = BIDASK ? netDollarsBidAsk({ grossMove: r.grossMove, atr: c.atr4 / 4, exitType: r.exitType }) : netDollars({ grossMove: r.grossMove, entryHourUtc: r.entryHourUtc, atr: c.atr4 / 4, exitType: r.exitType })
  rows.push({ comp: c.comp, seq: r.outcome, net15m: c.net15m, netSeq: net, res15m: c.res15m, R: net / c.stop, year: new Date(c.decisionT).getUTCFullYear() }) }
const filled = rows.filter((x) => x.netSeq != null)
const st = (xs) => { const W = xs.filter((x) => x.seq === 'WIN').length, L = xs.filter((x) => x.seq === 'LOSS').length; const years = {}; for (const x of xs) { years[x.year] = (years[x.year] || 0) + x.netSeq } const ys = Object.values(years); let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }; const bs = []; for (let b = 0; b < 1000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[(rnd() * xs.length) | 0].netSeq; bs.push(s / xs.length) } bs.sort((a, b) => a - b); return { n: xs.length, win: W, loss: L, time: xs.length - W - L, wr: +(W / Math.max(1, W + L)).toFixed(4), wilson_lb: +wilsonLowerBound(W, Math.max(1, W + L)).toFixed(4), net_seq: +mean(xs, 'netSeq').toFixed(4), net_seq_lb: +bs[25].toFixed(4), net_seq_ub: +bs[974].toFixed(4), net_15m_same_trades: +mean(xs, 'net15m').toFixed(4), avgR: +mean(xs, 'R').toFixed(4), years_positive: ys.filter((v) => v > 0).length, years: ys.length } }
const out = { at: new Date().toISOString(), from: new Date(FROM).toISOString().slice(0, 10), candidates_in_span: rows.length, filled: filled.length, nofill: rows.length - filled.length, all: st(filled), cells: {} }
console.log(`ALL (sequenced): ${JSON.stringify(out.all)} · NOFILL ${out.nofill}`)
const byComp = {}; for (const x of filled) (byComp[x.comp] = byComp[x.comp] || []).push(x)
const cells = Object.entries(byComp).filter(([, xs]) => xs.length >= 80).map(([comp, xs]) => ({ comp, ...st(xs) })).sort((a, b) => b.net_seq_lb - a.net_seq_lb)
for (const c of cells) out.cells[c.comp] = c
console.log('\nper cell (n ≥ 80 in the 13y span), sequenced vs 15m on the SAME trades:'); for (const c of cells.slice(0, 14)) console.log(`  ${c.comp.padEnd(52)} n=${String(c.n).padStart(4)} WR ${c.wr} (LB ${c.wilson_lb}) · net SEQ $${String(c.net_seq).padStart(7)}/t [${c.net_seq_lb},${c.net_seq_ub}] vs 15m $${c.net_15m_same_trades} · avgR ${c.avgR} · years+ ${c.years_positive}/${c.years}`)
console.log('\nworst cells:'); for (const c of cells.slice(-4)) console.log(`  ${c.comp.padEnd(52)} n=${String(c.n).padStart(4)} net SEQ $${c.net_seq}/t vs 15m $${c.net_15m_same_trades}`)
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log('-> ' + OUT)
