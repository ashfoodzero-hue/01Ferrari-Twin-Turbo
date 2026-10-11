// ════════════════════════════════════════════════════════════════════════════════
// study_gamma_levels.mjs — FORWARD test: do GLD gamma levels (call wall, put wall, zero-gamma flip, magnets — converted to XAU) make gold
// bounce? (2026-10-09). Polygon keeps no historical open interest, so the only honest test is FORWARD on the daily files written by
// gamma_snapshot.mjs (data/options/gld/YYYY-MM-DD.json) — it grows by one day per US trading day.
// ────────────────────────────────────────────────────────────────────────────────
// PRE-REGISTERED (2026-10-09, before any data):
//   window of a day's levels = from its snapshot time until the next snapshot (max 30 h)
//   event   = the FIRST 1m touch of a level in its window, approached from the side price was on when the window opened
//             (above → a support test, bounce = up; below → a resistance test, bounce = down). Levels within $1 merged.
//   bounce  = from the minute after the touch: level ± $7 in the bounce direction before level ∓ $7 against (1:1), within 24 h,
//             on the 1m BID (src/master/bounceTest.race); a touch minute that already reaches the stop line = fail
//   control = the same 1:1 race at the close of a random 1m bar within ±2 weeks of the touch (seeded)
//   verdict = INSUFFICIENT until ≥ 100 resolved events; then HOLDS ⇔ Wilson LB (z 1.96) of the bounce share > control share
//             (reported per level type too). The chart shows gamma levels as CONTEXT until this says HOLDS.
// Output: data/master/gamma_levels_study.json
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { wilsonLowerBound } from '../src/core/stats.js'
import { race, seeded } from '../src/master/bounceTest.js'

const DIR = path.join(TURBO.root, 'data', 'options', 'gld'), D = 7, MIN_N = 100
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : []
const days = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))).map((d) => ({ day: d.day, at: Date.parse(d.at), L: d.xau_levels }))
const rnd = seeded(13579), ev = []
if (days.length) {
  const M = (await loadBars('XAUUSD', '1m', { from: days[0].at - 15 * 86400000, to: Date.now() })).bars
  const MT = Float64Array.from(M.map((b) => b.t)); const lb = (t) => { let lo = 0, hi = MT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m } return lo }
  for (let d = 0; d < days.length; d++) {
    const { at, L } = days[d], end = Math.min(d + 1 < days.length ? days[d + 1].at : Infinity, at + 30 * 3600000, Date.now())
    const raw = [['call_wall', L.call_wall], ['put_wall', L.put_wall], ['flip', L.flip], ...L.magnets.map((m) => ['magnet', m.xau])].filter(([, v]) => v != null)
    const levels = []; for (const [type, px] of raw) if (!levels.some((x) => Math.abs(x.px - px) < 1)) levels.push({ type, px })
    const k0 = lb(at); if (k0 >= M.length) continue
    const start = M[k0].c
    for (const { type, px } of levels) {
      const support = start > px
      let kT = -1; for (let k = k0; k < M.length && M[k].t < end; k++) { if (support ? M[k].l <= px : M[k].h >= px) { kT = k; break } }
      if (kT < 0) continue
      const up = support, tgt = up ? px + D : px - D, stop = up ? px - D : px + D, tEnd = M[kT].t + 86400000
      const bounce = (up ? M[kT].l <= stop : M[kT].h >= stop) ? false : race(M, kT + 1, up, tgt, stop, tEnd)
      const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
      const ctrl = race(M, kc + 1, up, up ? c0 + D : c0 - D, up ? c0 - D : c0 + D, M[kc].t + 86400000)
      ev.push({ day: days[d].day, type, px, t: M[kT].t, side: up ? 'support' : 'resistance', bounce, ctrl })
    }
  }
}
const stat = (E) => { const r = E.filter((e) => e.bounce != null), w = r.filter((e) => e.bounce).length, c = E.filter((e) => e.ctrl != null)
  return { events: E.length, resolved: r.length, bounce: r.length ? +(w / r.length).toFixed(4) : null, bounce_lb: r.length ? +wilsonLowerBound(w, r.length).toFixed(4) : null, control: c.length ? +(c.filter((e) => e.ctrl).length / c.length).toFixed(4) : null } }
const all = stat(ev), byType = Object.fromEntries(['call_wall', 'put_wall', 'flip', 'magnet'].map((t) => [t, stat(ev.filter((e) => e.type === t))]))
const verdict = all.resolved < MIN_N ? 'INSUFFICIENT' : all.bounce_lb > all.control ? 'HOLDS' : 'DOES_NOT_HOLD'
const out = { at: new Date().toISOString(), days_recorded: days.length, first_day: days[0]?.day ?? null, rules: { dollars: D, min_resolved: MIN_N }, all, by_type: byType, verdict,
  reading: verdict === 'INSUFFICIENT' ? `forward test: ${all.resolved}/${MIN_N} resolved touches so far — context only until measured` : verdict === 'HOLDS' ? 'measured: gamma levels hold better than any level' : 'measured: gamma levels do not hold better than any level', events: ev.slice(-200) }
fs.writeFileSync(path.join(TURBO.master, 'gamma_levels_study.json'), JSON.stringify(out, null, 1))
console.log(`  γ gamma forward test: ${days.length} day(s), ${all.resolved} resolved touches → ${verdict}`)
