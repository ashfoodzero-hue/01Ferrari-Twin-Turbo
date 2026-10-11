// build_bigmove_catalog.mjs — EXTREME TRIGGER · Phase 1: the complete catalog of BIG gold moves (23y, causal zigzag).
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Ashraf's mandate (Extreme Ferrari Signal Trigger — SEPARATE module): before any detector, build the full event
// catalog — every big leg up (sky-rocket) and down (waterfall) in the history — so the driver research traces REAL
// events, not assumptions. Definition kept honest on BOTH scales: a leg qualifies if |move| ≥ $50 ABSOLUTE (Ashraf's
// literal threshold) OR ≥ 2.5% RELATIVE ($50 at $340 gold in 2003 is a 14.7% crash; $50 at $4,200 is 1.2% — a $-only
// gate would make the catalog all-2025). Each event is annotated with the context the 6D research needs.
// Output: data/master/bigmove_catalog.json + summary. Zigzag reversal = 1.0% (a leg ends when price retraces 1%).
import '../src/core/bootEnv.js'
import { loadBars } from '../src/data/backfillReader.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'   // twin 2026-10-08: own Polygon 1m tape (resampled), from 2013-07-14

const REV = 0.010            // zigzag reversal threshold (1.0% of price) — ends a leg
const ABS_USD = 50, REL = 0.025
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0

console.log('\n████ EXTREME TRIGGER · Phase 1 — the 23y BIG-MOVE CATALOG ████\n')
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM })

// causal zigzag: track running extreme; a 1% retrace closes the leg
const legs = []
let dir = 0, extI = 0, startI = 0
for (let i = 1; i < bars.length; i++) {
  const b = bars[i]
  if (dir >= 0) { // in an up-leg (or undecided)
    if (b.h > bars[extI].h || dir === 0) { if (b.h > bars[extI].h) extI = i; if (dir === 0 && b.h > bars[startI].h) dir = 1 }
    if (bars[extI].h - b.l >= REV * bars[extI].h) { // reversal down
      if (dir === 1) legs.push({ from: startI, to: extI, dir: 'UP' })
      dir = -1; startI = extI; extI = i
    }
  }
  if (dir <= 0) { // in a down-leg
    if (b.l < bars[extI].l) extI = i
    if (b.h - bars[extI].l >= REV * bars[extI].l) { // reversal up
      if (dir === -1) legs.push({ from: startI, to: extI, dir: 'DOWN' })
      dir = 1; startI = extI; extI = i
    }
  }
}
// annotate + filter to BIG legs
const isNfpDay = (t) => { const d = new Date(t); if (d.getUTCDay() !== 5) return false; const firstFri = 1 + ((5 - new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).getUTCDay() + 7) % 7); return d.getUTCDate() === firstFri }
const sessionOf = (t) => { const h = new Date(t).getUTCHours(); return h < 7 ? 'ASIA' : h < 12 ? 'LONDON' : h < 17 ? 'NY' : 'LATE' }
const events = []
for (const L of legs) {
  const a = bars[L.from], b = bars[L.to]
  const px0 = L.dir === 'UP' ? a.l : a.h, px1 = L.dir === 'UP' ? b.h : b.l
  const usd = Math.abs(px1 - px0), rel = usd / px0
  if (usd < ABS_USD && rel < REL) continue
  const durH = (b.t - a.t) / 3600000
  // pre-leg context: 5d return into the leg start; post-leg: 24h continuation after the extreme
  const pre5dI = Math.max(0, L.from - 480)
  const post24I = Math.min(bars.length - 1, L.to + 96)
  events.push({
    start: new Date(a.t).toISOString(), end: new Date(b.t).toISOString(), dir: L.dir,
    from: +px0.toFixed(2), to: +px1.toFixed(2), usd: +usd.toFixed(1), pct: +(rel * 100).toFixed(2),
    meets_50usd: usd >= ABS_USD, meets_2p5pct: rel >= REL,
    duration_h: +durH.toFixed(1), speed_usd_h: +(usd / Math.max(durH, 0.25)).toFixed(2),
    start_session: sessionOf(a.t), nfp_day_inside: [...Array(Math.min(20, Math.ceil(durH / 24) + 1))].some((_, k) => isNfpDay(a.t + k * 86400000) && a.t + k * 86400000 <= b.t + 86400000),
    pre5d_pct: +((bars[L.from].c - bars[pre5dI].c) / bars[pre5dI].c * 100).toFixed(2),
    post24h_pct: +((bars[post24I].c - px1) / px1 * 100).toFixed(2),
    year: new Date(a.t).getUTCFullYear(),
  })
}
const yrs = (bars.at(-1).t - bars[0].t) / (365.25 * 86400000)
const up = events.filter((e) => e.dir === 'UP'), dn = events.filter((e) => e.dir === 'DOWN')
console.log(`bars ${bars.length} (${yrs.toFixed(1)}y) · zigzag legs ${legs.length} · BIG events: ${events.length} (${(events.length / yrs).toFixed(1)}/yr)`)
console.log(`  🟩 SKY-ROCKETS (up): ${up.length} · median $${[...up].sort((a, b) => a.usd - b.usd)[Math.floor(up.length / 2)]?.usd} · median dur ${[...up].sort((a, b) => a.duration_h - b.duration_h)[Math.floor(up.length / 2)]?.duration_h}h`)
console.log(`  🟥 WATERFALLS  (dn): ${dn.length} · median $${[...dn].sort((a, b) => a.usd - b.usd)[Math.floor(dn.length / 2)]?.usd} · median dur ${[...dn].sort((a, b) => a.duration_h - b.duration_h)[Math.floor(dn.length / 2)]?.duration_h}h`)
console.log(`  meeting the literal ≥$50: ${events.filter((e) => e.meets_50usd).length} (${events.filter((e) => e.meets_50usd && e.year < 2020).length} pre-2020 — the $-scale shifted with the price level)`)
console.log(`\n── texture (the first driver clues) ──`)
for (const s of ['ASIA', 'LONDON', 'NY', 'LATE']) console.log(`  starts in ${s.padEnd(7)}: ${events.filter((e) => e.start_session === s).length}`)
console.log(`  contains an NFP day: ${events.filter((e) => e.nfp_day_inside).length} of ${events.length} (${(100 * events.filter((e) => e.nfp_day_inside).length / events.length).toFixed(0)}%)`)
console.log(`  avg pre-5d drift before UP legs: ${mean(up.map((e) => e.pre5d_pct)).toFixed(2)}% · before DOWN legs: ${mean(dn.map((e) => e.pre5d_pct)).toFixed(2)}%`)
console.log(`  avg post-24h after UP extremes: ${mean(up.map((e) => e.post24h_pct)).toFixed(2)}% · after DOWN extremes: ${mean(dn.map((e) => e.post24h_pct)).toFixed(2)}%`)
const byYear = {}; for (const e of events) byYear[e.year] = (byYear[e.year] || 0) + 1
console.log(`  by year: ${Object.entries(byYear).map(([y, n]) => `${y}:${n}`).join(' ')}`)
fs.writeFileSync(path.join(TURBO.master, 'bigmove_catalog.json'), JSON.stringify({ at: new Date().toISOString(), years: +yrs.toFixed(1),
  definition: `zigzag(rev ${REV * 100}%) legs with usd>=${ABS_USD} OR pct>=${REL * 100}%`, count: events.length, per_year: +(events.length / yrs).toFixed(1), events }, null, 1))
console.log(`\n✅ wrote data/master/bigmove_catalog.json (${events.length} events — Phase 1 foundation for the 6D driver annotation)\n`)
