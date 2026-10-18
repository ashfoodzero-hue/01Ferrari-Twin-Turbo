// smoke_trendline_alerts.mjs — the live major-trendline alerts (scripts/lib/trendline_live.mjs tickCheck + scripts/lib/trendline_alerts.mjs), on
// hand-built minutes: 📐 AT LINE / ✅ BOUNCED fire by the study's rules; fail-closed cases wait; messages carry the study's numbers + "information
// only"; WTI is blocked by the red rule; run_twin runs the tick every minute and queues the per-asset refresh. The full-history proof is
// scripts/replay_trendline_alerts.mjs (live code vs the study's truth, missing 0 / extra 0).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TURBO } from '../src/core/paths.js'
import { tickCheck } from './lib/trendline_live.mjs'
import { alertText, measuredFor, TL_ALERT_BLOCKED } from './lib/trendline_alerts.mjs'

let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${info}`) } }
const here = path.dirname(fileURLToPath(import.meta.url)), MIN = 60000
const LC = Date.UTC(2026, 9, 14, 9), FO = Date.UTC(2026, 9, 14, 13)            // Wed: 4H candle 05:00 NY (closed) → forming 09:00-13:00 NY (13:00-17:00 UTC)
const mins = (to, edit = () => ({})) => { const M = []; for (let t = LC; t < to; t += MIN) M.push({ t, o: 100, h: 100.2, l: 99.9, c: 100, ...edit(t) }); return M }
const line = (o) => ({ id: 'XAUUSD|4H|support|1|2', side: 'support', cls: 'trend', value_next: 99.5, armed: true, pending: null, tests: 1, t1: Date.UTC(2026, 8, 1), t2: Date.UTC(2026, 9, 1), p1: 99, slope: 0, i1: 0, last_i: 10, ...o })
const L = (ln) => ({ tf: { '4H': { last_closed: LC, atr: 1, lines: [ln] } } })
const nowAt = (t) => t + MIN + 25000

let M = mins(FO + 60 * MIN, (t) => (t === FO + 30 * MIN ? { l: 99.6 } : {}))
let r = tickCheck('XAUUSD', L(line()), M, nowAt(M.at(-1).t))
ok('📐 AT LINE: armed line, forming-candle low within 0.25 ATR → one AT event, keyed by line + candle, test #2', r.events.length === 1 && r.events[0].type === 'AT' && r.events[0].key === `T:XAUUSD|4H|support|1|2:${FO}` && r.events[0].test === 2, JSON.stringify(r.events.map((e) => e.key)))
r = tickCheck('XAUUSD', L(line({ armed: false })), M, nowAt(M.at(-1).t))
ok('not armed (just bounced, price not yet 1 ATR away for a whole candle) → no AT', r.events.length === 0)
M = mins(FO + 60 * MIN, (t) => (t === FO + 40 * MIN ? { h: 100.6 } : {}))
r = tickCheck('XAUUSD', L(line({ armed: false, pending: { t: LC, test: 1 } })), M, nowAt(M.at(-1).t))
ok('✅ BOUNCED: line touched on an earlier candle, forming high ≥ line + 1 ATR → one BOUNCED keyed by the touch', r.events.length === 1 && r.events[0].type === 'BOUNCED' && r.events[0].key === `R:XAUUSD|4H|support|1|2:${LC}`, JSON.stringify(r.events.map((e) => e.key)))
r = tickCheck('XAUUSD', L(line({ armed: false, pending: { t: FO, test: 1 } })), M, nowAt(M.at(-1).t))
ok('the touch candle itself can never bounce (study rule) → no BOUNCED', r.events.length === 0)
r = tickCheck('XAUUSD', L(line()), mins(FO + 30 * MIN, (t) => ({ l: 99.6 })), FO + 40 * MIN)
ok('fail-closed: last minute > 5 min old → nothing checked', r.events.length === 0 && /no fresh minute/.test(r.status), r.status)
M = mins(Date.UTC(2026, 9, 14, 22, 5), () => ({ l: 99.6 }))
r = tickCheck('XAUUSD', L(line()), M, nowAt(M.at(-1).t))
ok('fail-closed: 18:00-18:16 New York (reopen clamp settling) → waits', r.events.length === 0 && /reopen settling/.test(r.status), r.status)
M = mins(Date.UTC(2026, 9, 14, 17, 30), () => ({ l: 99.6 }))
r = tickCheck('XAUUSD', L(line()), M, nowAt(M.at(-1).t))
ok('fail-closed: a newer 4H candle closed than the lines file knows → that timeframe waits for the refresh', r.events.length === 0 && /newer candle closed/.test(r.tf['4H']?.status), JSON.stringify(r.tf['4H']))
const m = measuredFor('XAUUSD', '4H', 'support', 'trend'), base = { sym: 'XAUUSD', tf: '4H', side: 'support', cls: 'trend', value: 4100, price: 4100.5, atr: 20, t1: Date.UTC(2026, 8, 1), t2: Date.UTC(2026, 9, 1), test: 2 }
const txt = [alertText({ ...base, type: 'AT' }), alertText({ ...base, type: 'BOUNCED' }), alertText({ ...base, type: 'BROKEN', close: 4090, beyond: 0.5 })]
ok('messages: header, type line, the study\'s measured numbers for this kind of line, "no edge", "information only"', m && txt.every((t) => t.includes('FERRARI TWIN TURBO') && t.includes(`${Math.round(100 * m.real)}%`) && t.includes(`${Math.round(100 * m.placebo)}%`) && t.includes('no edge') && t.includes('information only — not a trade'))
  && /AT LINE/.test(txt[0]) && /BOUNCED/.test(txt[1]) && /BROKEN/.test(txt[2]) && txt[2].includes('0.50 ATR through'))
ok('red rule: WTI (10 min delayed feed) is blocked from sending', /DELAYED/.test(TL_ALERT_BLOCKED.WTI || ''))
const tw = fs.readFileSync(path.join(here, 'run_twin.mjs'), 'utf8')
ok('run_twin: tick every minute while open, per-asset refresh queue (all four at start, re-queued on "a newer candle closed")', tw.includes("'trendline_tick.mjs'") && tw.includes("'trendline_lines.mjs'") && tw.includes("startsWith('a newer candle closed')") && tw.includes("const TL_SYMS = ['XAUUSD', 'XAGUSD', 'DXY_ICE', 'WTI']"))
const rp = path.join(TURBO.master, 'trendline_alerts_replay_xau.json'), R = fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, 'utf8')) : null
ok('replay proof on file: live code = study truth for XAU (missing 0, extra 0)', R && R.missing === 0 && R.extra === 0 && R.truth > 0, R ? `${R.missing}/${R.extra}` : 'run replay_trendline_alerts.mjs')
console.log(`${fail ? '❌' : '✅'} TRENDLINE ALERTS SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
