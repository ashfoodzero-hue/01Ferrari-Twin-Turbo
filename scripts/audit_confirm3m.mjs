// audit_confirm3m.mjs <SYM> — Perfection-Gate audit of the 3m-confirmation money test (2026-10-19), on real candles (raw minutes, as the study):
//   (1) an INDEPENDENT second trigger finder (written separately: explicit leg / tip / pivot bookkeeping) must list exactly the same entries over the
//       last 180 days;
//   (2) CAUSAL prefix replay: the triggers found on candles available at time T equal the full run's triggers up to T (5 cut times);
//   (3) an INDEPENDENT second trade simulator must give the same exit / P&L on 600 random trades × 4 targets;
//   (4) POSITIVE CONTROL: the same trade rules entered AT the true 15m swing tip (look-ahead on purpose: entry = tip price + spread at the tip minute)
//       must show a large profit — otherwise a null result would mean nothing.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { clean1m, SHORT, kit } from './lib/series_1m.mjs'
import { findHoles, markIncomplete } from '../src/core/dataHoles.js'
import { atr as atrArr } from '../src/core/indicators.js'
import { zigzag } from '../src/master/swings.js'
import { rng } from '../src/core/studyStats.js'
import { makeSpreadAt, loadSpreadTable } from '../src/master/spreadModel.js'
import { findTriggers, simulate, C3M } from './lib/confirm3m.mjs'

const SYM = process.argv[2] || 'XAUUSD', K = kit(SYM, { reopenClamp: false }), M = await clean1m(SYM, { reopenClamp: false }), holes = findHoles(M)
const spreadAt = SYM === 'XAUUSD' ? makeSpreadAt() : SYM === 'XAGUSD' && fs.existsSync(path.join(TURBO.master, 'spread_table_XAGUSD.json')) ? makeSpreadAt({ table: loadSpreadTable(path.join(TURBO.master, 'spread_table_XAGUSD.json')) }) : () => 0
const C3 = K.build(M, '3m'), C15 = K.build(M, '15m'); markIncomplete(C15, holes)
const breaks15 = new Set(C15.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), END = M.at(-1).t, W0 = END - 180 * 86400000
const key = (t) => `${t.side}|${t.tipT}|${t.level}|${t.trigT}`
const lib = findTriggers(C3, C15, breaks15, { from: W0 })
// (1) independent finder
function naive() {
  const sw = zigzag(C15, { k: 3, breaks: breaks15 }).swings.map((s) => ({ type: s.type, t: C15[s.i].t, kc: C15[s.knownI].close_t }))
  const pivot = (i, hi) => { if (i < 3 || i > C3.length - 4) return false; for (let d = 1; d <= 3; d++) { if (hi ? !(C3[i].h > C3[i - d].h && C3[i].h >= C3[i + d].h) : !(C3[i].l < C3[i - d].l && C3[i].l <= C3[i + d].l)) return false } return true }
  const res = []; let s = null, tip = -1, done = false, leg0 = 0
  for (let j = 0; j < C3.length; j++) { const c = C3[j]
    const last = sw.filter((x) => x.kc <= c.close_t).at(-1)
    if (last && last !== s) { s = last; leg0 = C3.findIndex((x) => x.t >= s.t); tip = -1; done = false; for (let k = leg0; k <= j; k++) if (tip < 0 || (s.type === 'H' ? C3[k].l < C3[tip].l : C3[k].h > C3[tip].h)) tip = k }
    if (!s) continue
    const down = s.type === 'H'
    if (down ? c.l < C3[tip].l : c.h > C3[tip].h) { tip = j; done = false; continue }
    if (done || tip === j || c.close_t < W0) continue
    let p = -1; for (let k = Math.min(tip - 1, j - 3); k >= leg0; k--) if (pivot(k, down)) { p = k; break }
    if (p < 0) continue
    const lvl = down ? C3[p].h : C3[p].l
    if (down ? c.c > lvl : c.c < lvl) { done = true; res.push({ side: down ? 'BUY' : 'SELL', tipT: C3[tip].t, level: lvl, trigT: c.close_t }) } }
  return res }
const t0 = Date.now(); const lw = C3.findIndex((c) => c.t >= W0 - 40 * 86400000)   // the naive finder is slow: same window, warm start 40 days earlier is NOT allowed (legs) → full scan
const nv = naive(), A = new Set(lib.filter((t) => t.trigT >= W0).map(key)), B = new Set(nv.map(key))
const miss = [...B].filter((k) => !A.has(k)), extra = [...A].filter((k) => !B.has(k))
console.log(`  (1) independent trigger finder, last 180 d: lib ${A.size} · naive ${B.size} · only-naive ${miss.length} · only-lib ${extra.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
// (2) causal prefix replay
let pdiff = 0; const full = findTriggers(C3, C15, breaks15)
for (const f of [0.5, 0.7, 0.85, 0.95, 0.99]) { const T = M[0].t + f * (END - M[0].t)
  const c3 = C3.filter((c) => c.close_t <= T), c15 = C15.filter((c) => c.close_t <= T), b15 = new Set(c15.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0))
  const pre = new Set(findTriggers(c3, c15, b15).map(key)), cut = new Set(full.filter((t) => t.trigT <= T).map(key))
  const d = [...pre].filter((k) => !cut.has(k)).length + [...cut].filter((k) => !pre.has(k)).length; pdiff += d }
console.log(`  (2) causal prefix replay (5 cut times): differences ${pdiff}`)
// (3) independent simulator
function naiveSim(tr, tg) { const buy = tr.side === 'BUY'; let k = 0; while (k < M.length && M[k].t < tr.trigT) k++; if (k >= M.length) return null
  const entry = M[k].o + (buy ? spreadAt(M[k].t) : 0), stop = tr.tipPx + (buy ? -1 : 1) * 0.1 * tr.atr15, R = buy ? entry - stop : stop - entry; if (!(R > 0)) return 'skip'
  const tp = entry + (buy ? 1 : -1) * (tg[1] === 'R' ? tg[2] * R : tg[2] * tr.atr15), end = M[k].t + 300 * 60000; let last = null
  for (; k < M.length && M[k].t < end; k++) { const b = M[k], s = buy ? 0 : spreadAt(b.t); last = b
    if (buy ? b.l <= stop : b.h + s >= stop) return `stop@${b.t}`
    if (buy ? b.h >= tp : b.l + s <= tp) return `tp@${b.t}` }
  return last ? `time@${last.t}` : null }
const R = rng(5); let sdiff = 0, sn = 0
for (let n = 0; n < 600; n++) { const tr = full[(R() * full.length) | 0]; for (const tg of C3M.TARGETS) { const a = simulate(M, tr, tg, spreadAt), b = naiveSim(tr, tg); sn++
  const as = !a ? null : a.skipped ? 'skip' : a.open ? null : `${a.how === 'target' ? 'tp' : a.how}@${a.exitT}`; if (as !== b && !(a?.open)) { sdiff++; if (sdiff <= 3) console.log('   sim diff', as, b) } } }
console.log(`  (3) independent simulator: ${sn} trade checks · differences ${sdiff}`)
// (4) positive control: entry AT the true 15m swing tip
const A15 = atrArr(C15, 14), pc = []
for (const s of zigzag(C15, { k: 3, breaks: breaks15 }).swings) { const c = C15[s.i]; let k = 0; const ms = M.filter((b) => b.t >= c.t && b.t < c.close_t); const m = ms.find((b) => (s.type === 'L' ? b.l === s.px : b.h === s.px)); if (!m || !(A15[s.i - 1] > 0)) continue
  const buy = s.type === 'L', sp = spreadAt(m.t), entry = buy ? s.px + sp : s.px, stop = buy ? s.px - 0.1 * A15[s.i - 1] : s.px + 0.1 * A15[s.i - 1] + sp, Rr = Math.abs(entry - stop), tp = buy ? entry + Rr : entry - Rr
  let out = 0; for (const b of M.slice(M.indexOf(m) + 1, M.indexOf(m) + 301)) { const x = buy ? 0 : spreadAt(b.t); if (buy ? b.l <= stop : b.h + x >= stop) { out = -1; break } if (buy ? b.h >= tp : b.l + x <= tp) { out = 1; break } }
  if (out) pc.push(out); if (pc.length >= 1500) break }
const pw = pc.filter((x) => x > 0).length
console.log(`  (4) positive control (entry at the true 15m tip, 1R): won ${pw}/${pc.length} = ${Math.round(100 * pw / pc.length)} %`)
fs.writeFileSync(path.join(TURBO.master, `confirm3m_audit_${SHORT[SYM]}.json`), JSON.stringify({ at: new Date().toISOString(), symbol: SYM, finder: { lib: A.size, naive: B.size, only_naive: miss.length, only_lib: extra.length, sample: miss.concat(extra).slice(0, 6) },
  prefix_differences: pdiff, simulator: { checks: sn, differences: sdiff }, positive_control_1R: { won: pw, n: pc.length } }, null, 1))
process.exit(miss.length || extra.length || pdiff || sdiff ? 1 : 0)
