// ════════════════════════════════════════════════════════════════════════════════
// swing_start_tick.mjs — 🌱 SWING START WATCH, UNCONFIRMED (2026-10-16; Ashraf: "Watch + live record"). Run by run_twin after every NY daily close.
// The ONE rule measured in study (bl) (data/master/swing_start_study.json, A-SWEEP+DISC bull): a completed NY day whose low sweeps the prior 20-day
// low and closes back above it, in the bottom 25 % of the 60-day range; repeats within 10 days count once. UNPROVEN (n 34, mostly post-2020) — the
// message says so. Live record (append-only): data/paper/swing_start_ledger.jsonl — 'alert' rows + 'resolve' rows (+5 % before a daily close below
// the alert-day low, within 60 trading days). INFORMATION ONLY. --dry: compute + print, send / write nothing.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { nyOffsetMs } from '../src/master/macroMagnet.js'
import { sendText } from '../src/master/telegram.js'

const DRY = process.argv.includes('--dry'), now = Date.now(), DAY = 86400000
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const S = readJ(path.join(TURBO.master, 'swing_start_study.json'))?.cells?.['A-SWEEP+DISC|bull']; if (!S) { console.log('  swing_start_tick: study missing'); process.exit(0) }
const LEDGER = path.join(TURBO.paper, 'swing_start_ledger.jsonl')
const L = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
const dayStart = (t) => { const off = nyOffsetMs(t); return Math.floor((t + off - 17 * 3600000) / DAY) * DAY + 17 * 3600000 - off }
const M = (await loadBars('XAUUSD', '1m', { from: now - 420 * DAY })).bars
const D = []; { let c = null; for (const b of M) { const d = dayStart(b.t); if (!c || c.t !== d) { if (c) D.push(c); c = { t: d, o: b.o, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } if (c && dayStart(now) > c.t) D.push(c) }   // completed days only
const minL = (i, n) => { let m = Infinity; for (let k = i - n; k < i; k++) m = Math.min(m, D[k].l); return m }, maxH = (i, n) => { let m = -Infinity; for (let k = i - n; k < i; k++) m = Math.max(m, D[k].h); return m }
const pos60 = (i) => { const lo = Math.min(minL(i, 59), D[i].l), hi = Math.max(maxH(i, 59), D[i].h); return hi > lo ? (D[i].c - lo) / (hi - lo) : 0.5 }
const fires = (i) => i >= 60 && D[i].l < minL(i, 20) && D[i].c > minL(i, 20) && pos60(i) <= 0.25
const add = [], alerts = L.filter((e) => e.type === 'alert'), resolved = new Set(L.filter((e) => e.type === 'resolve').map((e) => e.day_t))
// newest completed day (catch-up: the last 5 completed days, each once)
for (let i = Math.max(60, D.length - 5); i < D.length; i++) { const t = D[i].t
  if (!fires(i) || alerts.some((e) => e.day_t === t) || [...alerts, ...add].some((e) => e.day_t < t && t - e.day_t <= 14 * DAY)) continue   // 10 trading days ≈ 14 calendar days
  add.push({ type: 'alert', day_t: t, day: new Date(t + 7 * 3600000).toISOString().slice(0, 10), close: D[i].c, low: D[i].l, swept: +minL(i, 20).toFixed(2), pos60: +pos60(i).toFixed(3), target5: +(D[i].c * 1.05).toFixed(2), recorded_at: new Date(now).toISOString() }) }
// resolve open alerts
for (const a of [...alerts, ...add]) { if (resolved.has(a.day_t)) continue; const i = D.findIndex((d) => d.t === a.day_t); if (i < 0) continue
  for (let k = i + 1; k < D.length && k <= i + 60; k++) { if (D[k].h >= a.close * 1.05) { add.push({ type: 'resolve', day_t: a.day_t, hit: true, days: k - i }); break } if (D[k].c < a.low) { add.push({ type: 'resolve', day_t: a.day_t, hit: false, days: k - i }); break } if (k === i + 60) add.push({ type: 'resolve', day_t: a.day_t, hit: false, days: 60 }) } }
const all = [...L, ...add], res = all.filter((e) => e.type === 'resolve'), live = `${res.filter((r) => r.hit).length}/${res.length}`
const pc = (x) => (100 * x).toFixed(1) + '%'
for (const a of add.filter((x) => x.type === 'alert')) {
  const text = ['🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎', '🌱 <b>SWING START WATCH — UNCONFIRMED (bull)</b> · XAUUSD daily',
    `the ${a.day} candle swept the 20-day low (${a.swept}) and closed back above at <b>${a.close.toFixed(2)}</b>, in the bottom 25% of the 60-day range`,
    `measured (13 y): started a +5% swing before the sweep low broke <b>${pc(S.all.s5)}</b> (n ${S.all.n}) vs ${pc(S.oos.base)} on normal days · +10% ${pc(S.all.s10)} · avg ${S.all.avg_R >= 0 ? '+' : ''}${S.all.avg_R}R if traded`,
    `⚠ UNPROVEN: too few cases and mostly a post-2020 effect (${pc(S.era.pre2020)} before 2020 vs ${pc(S.era.post2020)} after) · +5% target ${a.target5} · invalid on a daily close below ${a.low.toFixed(2)}`,
    `<i>ⓘ information only — not a trade · live record ${live}</i>`].join('\n')
  if (DRY) { console.log('--- (dry) ---\n' + text.replace(/<[^>]+>/g, '')); continue }
  const r = await sendText(text).catch((e) => ({ sent: false, error: e.message })); console.log(`  📨 swing start ${a.day}: ${r.sent ? 'sent' : r.dryRun ? 'dry run' : 'not sent ' + (r.error || r.status)}`) }
console.log(`  🌱 swing_start_tick: last completed day ${D.length ? new Date(D.at(-1).t + 7 * 3600000).toISOString().slice(0, 10) : '—'} · fires ${D.length ? fires(D.length - 1) : false} · new rows ${add.length} · live ${live}`)
if (!DRY && add.length) { fs.mkdirSync(TURBO.paper, { recursive: true }); fs.appendFileSync(LEDGER, add.map((x) => JSON.stringify(x)).join('\n') + '\n') }
