// ════════════════════════════════════════════════════════════════════════════════
// study_wall_defense_money.mjs — WALL DEFENSE as a TRADE (2026-10-15). Rules pre-registered in docs/WALL_DEFENSE_MONEY_SPEC.md.
// Event engine copied from Turbo 2 scripts/validate_wall_defense.mjs (the 71.5 % / 78.8 % hold finding); money path added.
// Output: data/master/wall_defense_money.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { loadDxyBars } from '../src/data/dxy.js'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { emaSeries } from '../src/master/ferrariMatrix.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, SPLIT = FROM + 0.6 * (TO - FROM)
const PROFILE_MIN = 1440, BIN_FRAC = 0.00025, WALL_RATIO = 2.5, BAND = 1.5, BREAK = 2, BOUNCE = 4, STOP_BINS = 3, FEAT = 3, APPROACH = 5, HZ = 60, COOL = 120 * 60000, K = 8, ALPHA = 0.05 / K
const spreadAt = makeSpreadAt()
const barDelta = (b) => { const r = b.h - b.l, pos = r > 0 ? (b.c - b.l) / r : 0.5; return (b.v || 0) * (2 * pos - 1) }   // Turbo 2 volumeProfile.barDelta
const M = (await loadBars('XAUUSD', '1m', { from: FROM - 3 * 86400000, to: TO })).bars
console.log('1m bars', M.length.toLocaleString())
// 3m DXY / silver bias (close vs EMA10, closed 3m bar at or before the decision)
const D3 = (await loadDxyBars('3m', { from: FROM - 3 * 86400000, to: TO })).bars, S3 = (await loadBars('XAGUSD', '3m', { from: FROM - 3 * 86400000, to: TO })).bars
const dE = emaSeries(D3, 10), sE = emaSeries(S3, 10), D3t = Float64Array.from(D3.map((b) => b.t)), S3t = Float64Array.from(S3.map((b) => b.t))
const lastClosed = (T, arr) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] + 180000 <= T) lo = m + 1; else hi = m } return lo - 1 }
// ATR14 on 1m (Wilder) for the slippage cap
const atr = new Float64Array(M.length); { let a = null; for (let i = 1; i < M.length; i++) { const tr = Math.max(M[i].h - M[i].l, Math.abs(M[i].h - M[i - 1].c), Math.abs(M[i].l - M[i - 1].c)); a = a == null ? tr : (a * 13 + tr) / 14; atr[i] = a } }

// ── event engine (Turbo 2, verbatim logic) — records decision index, wall, defense flag, normalized magnitude ──
const events = []; let binW = 0, med = 0, medAt = -1
const bins = new Map(), win = [], active = [], lastFire = new Map()
const median = () => { const vs = [...bins.values()].map((x) => x.v).filter((v) => v > 0).sort((a, b) => a - b); return vs.length ? vs[Math.floor(vs.length / 2)] : 0 }
for (let i = 0; i < M.length; i++) { const b = M[i]
  if (!binW || Math.abs(b.c * BIN_FRAC / binW - 1) > 0.5) { binW = Math.max(0.1, +(b.c * BIN_FRAC).toFixed(2)); bins.clear(); win.length = 0 }
  const binOf = (px) => Math.round(px / binW)
  for (const ev of active) { if (ev.state !== 'feature') continue
    ev.zone += barDelta(b); ev.fb++
    if (ev.fb >= FEAT) { ev.state = 'done'; ev.di = i
      const beyond = ev.type === 'ceiling' ? b.c >= ev.wall + BREAK * ev.binW : b.c <= ev.wall - BREAK * ev.binW
      if (!beyond && b.t >= FROM) events.push(ev) } }
  for (let k = active.length - 1; k >= 0; k--) if (active[k].state === 'done') active.splice(k, 1)
  if (win.length >= PROFILE_MIN * 0.8 && i >= APPROACH) {
    if (i - medAt >= 64) { med = median(); medAt = i }
    if (med > 0) { const prev = M[i - 1]
      for (const type of ['ceiling', 'floor']) { if (active.some((e) => e.type === type)) continue
        const dir = type === 'ceiling' ? 1 : -1, start = binOf(prev.c) + dir * Math.ceil(BAND + 0.5); let wb = null
        for (let s = 0; s <= 40; s++) { const c = start + dir * s, cell = bins.get(c); if (!cell || cell.v < WALL_RATIO * med) continue
          const n1 = [c - 1, c + 1, c - 2, c + 2].map((q) => bins.get(q)?.v ?? 0); if (n1.every((v) => cell.v >= v)) { wb = c; break } }
        if (wb == null) continue
        const wall = wb * binW, touched = type === 'ceiling' ? b.h >= wall - BAND * binW : b.l <= wall + BAND * binW, wasOut = type === 'ceiling' ? prev.c < wall - BAND * binW : prev.c > wall + BAND * binW
        if (touched && wasOut && b.t - (lastFire.get(type + ':' + wb) ?? -Infinity) > COOL) { lastFire.set(type + ':' + wb, b.t)
          let absSum = 0; for (const w of win) absSum += Math.abs(w.d)
          active.push({ type, wall, binW, t: b.t, flowScale: win.length ? 3 * absSum / win.length : 0, zone: barDelta(b), fb: 1, state: 'feature' }) } } } }
  const k = binOf(b.c), cell = bins.get(k) ?? { v: 0, d: 0 }; cell.v += b.v || 0; cell.d += barDelta(b); bins.set(k, cell)
  win.push({ t: b.t, k, v: b.v || 0, d: barDelta(b) }); const cut = b.t - PROFILE_MIN * 60000
  while (win.length && win[0].t < cut) { const o = win.shift(), c2 = bins.get(o.k); if (c2) { c2.v -= o.v; c2.d -= o.d; if (c2.v <= 0) bins.delete(o.k) } }
}
for (const e of events) { e.hold = undefined; const attack = e.type === 'ceiling' ? 1 : -1; e.defense = Math.sign(e.zone) === -attack; e.mag = e.flowScale > 0 ? Math.abs(e.zone) / e.flowScale : 0
  const T = M[e.di].t + 60000, up = e.type === 'floor', di = lastClosed(T, D3t), si = lastClosed(T, S3t)
  const dx = di >= 0 ? D3[di].c > dE.get(D3[di].t) : null, sv = si >= 0 ? S3[si].c > sE.get(S3[si].t) : null
  e.agree = dx != null && sv != null && (up ? !dx && sv : dx && !sv) }
// REPLICATION CHECK (must reproduce Turbo 2's hold rates before the money numbers mean anything): close beyond wall ± 2 bins = BREAK,
// close retreating 4 bins = BOUNCE, within 60 bars from the decision; timeouts excluded
for (const e of events) { e.hold = null
  for (let j = e.di + 1; j < M.length && j <= e.di + HZ; j++) { const c = M[j].c
    if (e.type === 'ceiling' ? c >= e.wall + BREAK * e.binW : c <= e.wall - BREAK * e.binW) { e.hold = false; break }
    if (e.type === 'ceiling' ? c <= e.wall - BOUNCE * e.binW : c >= e.wall + BOUNCE * e.binW) { e.hold = true; break } } }
const holdRate = (f) => { const r = events.filter((e) => e.hold != null && f(e)); return `${(100 * r.filter((e) => e.hold).length / r.length).toFixed(1)}% (n ${r.length})` }
console.log(`REPLICATION hold rate · all ${holdRate(() => true)} · defense ${holdRate((e) => e.defense)} · attack ${holdRate((e) => !e.defense)}   [Turbo 2: 60.4 / 71.5 / ~49]`)
const trainMags = events.filter((e) => M[e.di].t < SPLIT && e.defense).map((e) => e.mag).sort((a, b) => a - b), m66 = trainMags[Math.floor(trainMags.length * 2 / 3)] ?? Infinity
console.log(`events ${events.length.toLocaleString()} · defense ${events.filter((e) => e.defense).length.toLocaleString()} · strong threshold (TRAIN p66.7) ${m66.toFixed(3)}`)

// ── money path ──
function trade(e, tgtMode) { const up = e.type === 'floor', i0 = e.di, T = M[i0].t + 60000, s0 = spreadAt(T), entry = up ? M[i0].c + s0 : M[i0].c
  const stop = up ? e.wall - STOP_BINS * e.binW : e.wall + STOP_BINS * e.binW, R = up ? entry - stop : stop - entry; if (!(R > 0)) return null
  const tgt = tgtMode === 'BOUNCE' ? (up ? e.wall + BOUNCE * e.binW : e.wall - BOUNCE * e.binW) : (up ? entry + tgtMode * R : entry - tgtMode * R)
  if (up ? tgt <= entry : tgt >= entry) return null
  const slip = Math.min(0.3, 0.05 * atr[i0] * 3); let j = i0 + 1
  for (; j < M.length && j <= i0 + HZ; j++) { const b = M[j], s = spreadAt(b.t)
    if (up ? b.l <= stop : b.h + s >= stop) return { net: -(R + slip), R, exitT: b.t }
    if (up ? b.h >= tgt : b.l + s <= tgt) return { net: Math.abs(tgt - entry), R, exitT: b.t } }
  const z = M[Math.min(j, M.length - 1)]; return { net: up ? z.c - entry : entry - (z.c + spreadAt(z.t)), R, exitT: z.t }
}
function book(filter, mode) { const out = []; let busy = -Infinity
  for (const e of events) { const T = M[e.di].t + 60000; if (T < busy || !filter(e)) continue; const r = trade(e, mode); if (!r) continue; busy = r.exitT + 60000; out.push({ t: T, side: e.type === 'floor' ? 'BUY' : 'SELL', ...r }) } return out }
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const summ = (tr, days) => { const n = tr.length, w = tr.filter((x) => x.net > 0).length, m = n ? tr.reduce((s, x) => s + x.net, 0) / n : null, rnd = seeded(3), bs = []
  for (let q = 0; q < 4000 && n; q++) { let s = 0; for (let j = 0; j < n; j++) s += tr[(rnd() * n) | 0].net; bs.push(s / n) } bs.sort((a, b) => a - b)
  return { n, per_day: days ? +(n / days).toFixed(2) : null, wr: n ? +(w / n).toFixed(4) : null, net: m == null ? null : +m.toFixed(3), net_lb: n ? +bs[Math.floor(ALPHA * bs.length)].toFixed(3) : null,
    avg_R: n ? +(tr.reduce((s, x) => s + x.R, 0) / n).toFixed(2) : null, net_R: n ? +(tr.reduce((s, x) => s + x.net / x.R, 0) / n).toFixed(3) : null } }
const wd = (a, b) => ((b - a) / 86400000) * 5 / 7
const F = { DEFENSE: (e) => e.defense, STRONG: (e) => e.defense && e.mag > m66, 'STRONG+DXY+SILVER': (e) => e.defense && e.mag > m66 && e.agree, ATTACK_ref: (e) => !e.defense, ALL_ref: () => true }
const PLAN = { DEFENSE: [1, 2, 'BOUNCE'], STRONG: [1, 2, 'BOUNCE'], 'STRONG+DXY+SILVER': [1, 'BOUNCE'], ATTACK_ref: [1], ALL_ref: [1] }
const cells = {}
for (const [name, modes] of Object.entries(PLAN)) for (const mode of modes) { const tr = book(F[name], mode)
  const TR = summ(tr.filter((x) => x.t < SPLIT), wd(FROM, SPLIT)), OOS = summ(tr.filter((x) => x.t >= SPLIT), wd(SPLIT, TO))
  const side = Object.fromEntries(['SELL', 'BUY'].map((s) => [s, summ(tr.filter((x) => x.t >= SPLIT && x.side === s))]))
  const era = { pre2020: summ(tr.filter((x) => x.t < Date.UTC(2020, 0, 1))), post2020: summ(tr.filter((x) => x.t >= Date.UTC(2020, 0, 1))) }
  const ref = name.endsWith('_ref'), verdict = ref ? 'REFERENCE' : OOS.n >= 100 && OOS.net_lb > 0 && TR.net > 0 ? 'PASS' : OOS.n < 100 ? 'UNDERPOWERED' : 'FAIL'
  cells[`${name}|${mode}`] = { train: TR, oos: OOS, oos_by_side: side, era, verdict }
  console.log(`${(name + ' ' + mode).padEnd(26)} OOS n ${String(OOS.n).padStart(5)} (${OOS.per_day}/d) WR ${OOS.wr} $/t ${OOS.net} [LB ${OOS.net_lb}] R$ ${OOS.avg_R} netR ${OOS.net_R} · TRAIN WR ${TR.wr} $/t ${TR.net} · pre20 ${era.pre2020.net} post20 ${era.post2020.net} → ${verdict}`) }
const pass = Object.entries(cells).filter(([, c]) => c.verdict === 'PASS').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'wall_defense_money.json'), JSON.stringify({ at: new Date().toISOString(), spec: 'docs/WALL_DEFENSE_MONEY_SPEC.md', events: events.length, strong_threshold_train_p66: m66, k: K, cells, passing: pass, verdict: pass.length ? 'SOME_PASS' : 'NO_PASS' }, null, 1))
console.log(`\n=> WALL DEFENSE MONEY: ${pass.length ? 'PASS ' + pass.join(', ') : 'NO_PASS'}`)
