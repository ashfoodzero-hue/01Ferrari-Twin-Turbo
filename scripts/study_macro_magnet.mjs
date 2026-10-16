// ════════════════════════════════════════════════════════════════════════════════
// study_macro_magnet.mjs — the 4H Macro Magnet (Ashraf's Pine) + the DXY cross-check on 13 y (2026-10-16). Pre-registered: docs/MACRO_MAGNET_SPEC.md.
// Output: data/master/macro_magnet_study.json (incl. the display lookup table the dashboard reads).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { streamBars } from '../src/data/backfillReader.js'
import { streamDxy1m } from '../src/data/dxy.js'
import { resample4h, magnetScores } from '../src/master/macroMagnet.js'
import { wilsonLB, zOf } from './inv90/gate.mjs'

const FROM = HISTORY_CONTINUOUS_FROM + 7 * 86400000, TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), SPLIT = FROM + 0.6 * (TO - FROM)
const ANCHORS = ['ny', 'ny21', 'utc'], K = 8, Z = zOf(K), Y2020 = Date.UTC(2020, 0, 1)
console.log('building 4H candles (gold + DXY, 3 anchors, one pass each) …')
const G = await resample4h(streamBars('XAUUSD', '1m', { from: FROM - 120 * 86400000, to: TO }), ANCHORS)
const D = await resample4h(streamDxy1m({ from: FROM - 120 * 86400000, to: TO }), ANCHORS)
const rate = (xs, f) => { const n = xs.length, w = xs.filter(f).length; return { n, rate: n ? +(w / n).toFixed(4) : null, lb: n ? +wilsonLB(w, n, Z).toFixed(4) : null } }
function analyse(anchor) {
  const g = G[anchor], d = D[anchor], sg = magnetScores(g), sd = magnetScores(d), dByT = new Map(sd.filter(Boolean).map((r) => [r.t, r]))
  const rows = []
  for (let k = 0; k + 6 < g.length; k++) { const s = sg[k]; if (!s || g[k].t < FROM) continue
    const c = g[k].c, dx = dByT.get(g[k].t) ?? null
    const conf = dx ? dx.side !== s.side : null                                   // DXY on the OTHER side confirms gold
    rows.push({ t: g[k].t, s, dx, conf, up4: g[k + 1].c > c, dn4: g[k + 1].c < c, up24: g[k + 6].c > c, dn24: g[k + 6].c < c, upSelf: k > 0 && c > g[k - 1].c, k }) }
  const split = (f) => ({ train: rows.filter((r) => r.t < SPLIT && f(r)), oos: rows.filter((r) => r.t >= SPLIT && f(r)) })
  const all = split(() => true), base = { train: { up4: rate(all.train, (r) => r.up4).rate, dn4: rate(all.train, (r) => r.dn4).rate, up24: rate(all.train, (r) => r.up24).rate, dn24: rate(all.train, (r) => r.dn24).rate },
    oos: { up4: rate(all.oos, (r) => r.up4).rate, dn4: rate(all.oos, (r) => r.dn4).rate, up24: rate(all.oos, (r) => r.up24).rate, dn24: rate(all.oos, (r) => r.dn24).rate } }
  // ── the 8 pre-registered cells ──
  const cells = {}
  for (const hz of ['4', '24']) for (const side of ['LONG', 'SHORT']) for (const dx of ['alone', 'dxy_confirms']) {
    const f = (r) => (side === 'LONG' ? r.s.long >= 65 : r.s.short >= 65) && (dx === 'alone' || r.conf === true), hit = (r) => side === 'LONG' ? r[`up${hz}`] : r[`dn${hz}`], bk = side === 'LONG' ? `up${hz}` : `dn${hz}`
    const S = split(f), T = rate(S.train, hit), O = rate(S.oos, hit)
    const verdict = O.n >= 300 && O.rate - base.oos[bk] >= 0.03 && O.lb > base.oos[bk] && T.rate - base.train[bk] > 0 ? 'INFORMATIVE' : O.n < 300 ? 'UNDERPOWERED' : 'NO_EDGE'
    cells[`${hz}h|${side}>=65|${dx}`] = { train: { ...T, base: base.train[bk], lift: +(T.rate - base.train[bk]).toFixed(4) }, oos: { ...O, base: base.oos[bk], lift: +(O.rate - base.oos[bk]).toFixed(4) }, verdict } }
  // ── reported: every score value, each vector, pre/post 2020, Method E, O3 magnet, display lookup ──
  const byScore = {}, lookup = {}
  for (const v of [...new Set(rows.map((r) => r.s.long))].sort((a, b) => a - b)) { const S = split((r) => r.s.long === v)
    byScore[v] = { oos_up4: rate(S.oos, (r) => r.up4), oos_up24: rate(S.oos, (r) => r.up24), train_up4: rate(S.train, (r) => r.up4).rate }
    for (const dk of ['confirms', 'against', 'none']) { const ok = (r) => r.s.long === v && (dk === 'none' ? r.conf == null : dk === 'confirms' ? r.conf === true : r.conf === false)
      const So = rows.filter((r) => r.t >= SPLIT && ok(r)); if (So.length) lookup[`${v}|${dk}`] = { n: So.length, up4: rate(So, (r) => r.up4).rate, dn4: rate(So, (r) => r.dn4).rate, up24: rate(So, (r) => r.up24).rate, dn24: rate(So, (r) => r.dn24).rate } } }
  const vectors = Object.fromEntries('ABCD'.split('').map((x) => { const S = split((r) => r.s[x]), Sn = split((r) => !r.s[x]); return [x, { oos_up4_when_long: rate(S.oos, (r) => r.up4).rate, oos_up4_when_short: rate(Sn.oos, (r) => r.up4).rate, oos_up24_when_long: rate(S.oos, (r) => r.up24).rate, oos_up24_when_short: rate(Sn.oos, (r) => r.up24).rate }] }))
  const era = Object.fromEntries([['pre2020', (r) => r.t < Y2020], ['post2020', (r) => r.t >= Y2020]].map(([k, f]) => [k, { long65_up4: rate(rows.filter((r) => f(r) && r.s.long >= 65), (r) => r.up4).rate, base_up4: rate(rows.filter(f), (r) => r.up4).rate, short65_dn4: rate(rows.filter((r) => f(r) && r.s.short >= 65), (r) => r.dn4).rate, base_dn4: rate(rows.filter(f), (r) => r.dn4).rate }]))
  const oosL = all.oos.filter((r) => r.s.long >= 65), methodE = { pine_view_bar_itself_up: rate(oosL, (r) => r.upSelf).rate, live_view_next_bar_up: rate(oosL, (r) => r.up4).rate, note: 'LONG>=65, OOS. The Pine (lookahead_on) colours bar k with bar k\'s final score, so its history shows the first number; a live reader gets the second.' }
  // O3: the magnet claim — with both BSL and SSL set, is the NEARER one touched first more often than distance alone predicts?
  let o3n = 0, o3near = 0, o3exp = 0, o3amb = 0
  for (const r of all.oos) { const { bsl, ssl } = r.s; if (bsl == null || ssl == null) continue
    const c = g[r.k].c, dB = Math.abs(bsl - c), dS = Math.abs(ssl - c), nearIsB = dB < dS
    for (let j = r.k + 1; j <= Math.min(g.length - 1, r.k + 30); j++) { const hb = g[j].h >= bsl, hs = g[j].l <= ssl
      if (hb && hs) { o3amb++; break } if (hb || hs) { o3n++; if (hb === nearIsB) o3near++; o3exp += (nearIsB ? dS : dB) / (dB + dS); break } } }
  const magnet = { n: o3n, near_first: o3n ? +(o3near / o3n).toFixed(4) : null, distance_only_expectation: o3n ? +(o3exp / o3n).toFixed(4) : null, same_bar_ambiguous: o3amb }
  return { bars: g.length, rows: rows.length, dxy_rows: rows.filter((r) => r.conf != null).length, pivot_ties: { gold: sg.ties, dxy: sd.ties }, base, cells, byScore, vectors, era, methodE, magnet, lookup }
}
const res = { at: new Date().toISOString(), spec: 'docs/MACRO_MAGNET_SPEC.md', window: [new Date(FROM).toISOString(), new Date(TO).toISOString()], split: new Date(SPLIT).toISOString(), anchors: {} }
for (const a of ANCHORS) { res.anchors[a] = analyse(a); const A = res.anchors[a]
  console.log(`\n── anchor ${a}: ${A.rows} scored 4H bars (DXY on ${A.dxy_rows}) · OOS base up4 ${A.base.oos.up4} dn4 ${A.base.oos.dn4} · pivot ties gold ${A.pivot_ties.gold} dxy ${A.pivot_ties.dxy}`)
  for (const [k, c] of Object.entries(A.cells)) console.log(`  ${k.padEnd(28)} OOS n ${String(c.oos.n).padStart(5)} hit ${c.oos.rate} (LB ${c.oos.lb}) base ${c.oos.base} lift ${(c.oos.lift * 100).toFixed(1)}pp · TRAIN lift ${(c.train.lift * 100).toFixed(1)}pp → ${c.verdict}`)
  console.log(`  Method E: Pine view ${A.methodE.pine_view_bar_itself_up} vs live ${A.methodE.live_view_next_bar_up} · magnet: near first ${A.magnet.near_first} vs distance-only ${A.magnet.distance_only_expectation} (n ${A.magnet.n})`) }
res.primary = 'ny'; res.informative = Object.entries(res.anchors.ny.cells).filter(([, c]) => c.verdict === 'INFORMATIVE').map(([k]) => k)
fs.writeFileSync(path.join(TURBO.master, 'macro_magnet_study.json'), JSON.stringify(res, null, 1))
console.log(`\n=> primary (ny) INFORMATIVE cells: ${res.informative.length ? res.informative.join(', ') : 'none'}`)
