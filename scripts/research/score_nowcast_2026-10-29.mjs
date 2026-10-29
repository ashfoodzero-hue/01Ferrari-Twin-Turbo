// score_nowcast_2026-10-29.mjs — scores the pre-registered nowcast check (docs/research/nowcast_check_2026-10-29.md, ADDENDUM 1) once the
// official numbers and the full 12:30-13:30 UTC hour exist. Read-only on the app data; writes data/research/nowcast_check_2026-10-29.json.
import '../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'
import { loadBars } from '../../src/data/backfillReader.js'

const REL = Date.parse('2026-10-29T12:30:00Z'), H = 3600000, DAY = 86400000, num = (s) => (s == null ? null : parseFloat(String(s).replace(/[^0-9.\-]/g, '')))
const up = JSON.parse(fs.readFileSync(path.join(TURBO.data, 'calendar', 'upcoming.json'), 'utf8')).events.filter((e) => e.t === REL)
const pick = (re) => up.find((e) => re.test(e.name))
const rows = [['Advance GDP q/q', /Advance GDP q\/q/, 3.3], ['Core PCE Price Index m/m', /Core PCE/, null], ['Advance GDP Price Index q/q', /GDP Price/, null], ['Unemployment Claims', /Unemployment Claims/, null]]
  .map(([name, re, nowcast]) => { const e = pick(re), a = num(e?.actual), f = num(e?.forecast)
    return { name, actual: e?.actual ?? null, consensus: e?.forecast ?? null, nowcast, surprise: a != null && f != null ? +(a - f).toFixed(3) : null,
      nowcast_error: a != null && nowcast != null ? +(a - nowcast).toFixed(3) : null, consensus_error: a != null && f != null ? +(a - f).toFixed(3) : null,
      closer: a != null && nowcast != null && f != null ? (Math.abs(a - nowcast) < Math.abs(a - f) ? 'NOWCAST' : Math.abs(a - nowcast) > Math.abs(a - f) ? 'CONSENSUS' : 'TIE') : 'no call' } })
// gold reaction 12:30-13:30 vs control = same clock window on the 20 previous weekdays without a high-impact USD release at 12:30
const hist = JSON.parse(fs.readFileSync(path.join(TURBO.data, 'calendar', 'history.json'), 'utf8')).events
const M = (await loadBars('XAUUSD', '1m', { from: REL - 45 * DAY, to: REL + H })).bars
const win = (t0) => { const x = M.filter((b) => b.t >= t0 && b.t < t0 + H); if (x.length < 50) return null
  const hi = Math.max(...x.map((b) => b.h)), lo = Math.min(...x.map((b) => b.l)); return { range: hi - lo, move: x.at(-1).c - x[0].o, hiT: x.find((b) => b.h === hi).t, loT: x.find((b) => b.l === lo).t, n: x.length } }
const ctrl = []; for (let d = 1; ctrl.length < 20 && d < 45; d++) { const t0 = REL - d * DAY, wd = new Date(t0).getUTCDay(); if (wd === 0 || wd === 6) continue
  // history.json = the measured release types (CPI, NFP, FOMC, PPI, …): any within 30 min → not a control
  if (hist.some((e) => Math.abs(e.t - t0) < 30 * 60000)) continue; const w = win(t0); if (w) ctrl.push({ day: new Date(t0).toISOString().slice(0, 10), ...w }) }
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null }
const ev = win(REL), cr = med(ctrl.map((c) => c.range))
const out = { at: new Date().toISOString(), spec: 'docs/research/nowcast_check_2026-10-29.md (ADDENDUM 1)', releases: rows,
  gold: ev ? { range_usd: +ev.range.toFixed(2), move_usd: +ev.move.toFixed(2), high_at: new Date(ev.hiT).toISOString().slice(11, 16), low_at: new Date(ev.loT).toISOString().slice(11, 16),
    control_median_range_usd: cr == null ? null : +cr.toFixed(2), ratio_vs_control: cr ? +(ev.range / cr).toFixed(2) : null, control_days: ctrl.length, minutes: ev.n } : null,
  note: 'n = 1 release: a check of the process, not proof of the method; direction is descriptive only' }
fs.mkdirSync(path.join(TURBO.data, 'research'), { recursive: true }); fs.writeFileSync(path.join(TURBO.data, 'research', 'nowcast_check_2026-10-29.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1))
