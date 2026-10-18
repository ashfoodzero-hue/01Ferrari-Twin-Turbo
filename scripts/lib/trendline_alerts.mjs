// trendline_alerts.mjs — the ONE message format + ledger for live MAJOR-TRENDLINE alerts (2026-10-18; Ashraf: "when ever it reach those major trend
// lines from both sides we need alert for either a bounce or a major break" → 4H + 1D, Telegram group + app, all three alerts; then "same for DXY and
// silver, WTI"). INFORMATION ONLY. The rules are the study's (src/master/trendlines.js); every number in a message comes from
// data/master/trendlines_study.json (measured: a touch bounces first about as often as at a random line — said in every message).
//   📐 AT LINE  — an ARMED active major line is touched by the forming candle (within 0.25 ATR)          (scripts/trendline_tick.mjs, every minute)
//   ✅ BOUNCED  — after a touch, price moved 1 ATR away before any candle closed 0.25 ATR through          (trendline_tick.mjs, live)
//   ❌ BROKEN   — a closed candle went ≥ 0.25 ATR through the line; the line is retired                   (scripts/trendline_lines.mjs, at the close)
// Ledger (dedupe + the app's alert list): data/telegram/trendline_alerts.json.
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../src/core/paths.js'
import { sendText } from '../../src/master/telegram.js'

export const TL_ALERT_ASSETS = Object.freeze({ XAUUSD: { name: 'XAU', label: 'gold', dp: 2 }, XAGUSD: { name: 'SILVER', label: 'silver', dp: 3 }, DXY_ICE: { name: 'DXY', label: 'DXY', dp: 3 }, WTI: { name: 'WTI', label: 'WTI', dp: 2 } })
// RED RULE (Polygon LIVE only; delayed = not live): WTI futures are 10 min delayed on our Polygon plan → its alerts are BLOCKED (computed + shown in
// the app as DELAYED, never sent) until Ashraf decides otherwise.
export const TL_ALERT_BLOCKED = Object.freeze({ WTI: 'WTI is 10 min DELAYED on our Polygon plan (red rule: delayed = not live)' })
export const TL_ALERT_TFS = ['4H', '1D']
export const LEDGER = path.join(TURBO.data, 'telegram', 'trendline_alerts.json')
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
export const loadLedger = () => readJ(LEDGER) ?? {}

/** The study's measured numbers for this kind of line (major, side, trend / counter) on this asset + timeframe. */
export function measuredFor(sym, tf, side, cls) {
  const S = readJ(path.join(TURBO.master, 'trendlines_study.json')), k = S?.by_kind?.[`${sym}|${tf}`]?.[`major ${side} (${cls})`]
  return k ? { real: k.all.real, placebo: k.all.placebo, n: k.all.n_real, lift: k.all.lift, lo: k.all.lo, hi: k.all.hi } : null
}
const pc = (x) => (x == null ? '—' : Math.round(100 * x) + '%'), day = (t) => new Date(t).toISOString().slice(0, 10)

/** ev: { type 'AT'|'BOUNCED'|'BROKEN', sym, tf, side, cls, value, price, atr, test, t1, t2, beyond? } */
export function alertText(ev) {
  const A = TL_ALERT_ASSETS[ev.sym], f = (x) => (+x).toFixed(A.dp), kind = `${ev.side === 'support' ? 'SUPPORT' : 'RESISTANCE'} (${ev.cls === 'trend' ? 'trend line' : 'channel line'})`
  const m = measuredFor(ev.sym, ev.tf, ev.side, ev.cls)
  const odds = m ? `measured (${ev.sym === 'WTI' ? '2 y' : '6 y'}, major ${ev.side} ${ev.cls} lines ${ev.tf}): bounced first ${pc(m.real)} of ${m.n} touches vs ${pc(m.placebo)} for random lines at the same angle → <b>no edge either way</b>` : 'measured: —'
  const line = `${A.name} ${ev.tf} MAJOR ${kind}`, anchors = `line through the swing ${ev.side === 'support' ? 'lows' : 'highs'} of ${day(ev.t1)} and ${day(ev.t2)}`
  const body = ev.type === 'AT' ? [`📐 <b>AT LINE — ${line} — ${f(ev.value)}</b>`, `${A.label} ${f(ev.price)} · line ${f(ev.value)} (${(Math.abs(ev.price - ev.value) / ev.atr).toFixed(2)} ATR away) · test #${ev.test} · ${anchors}`, odds, 'watch for ✅ BOUNCED (1 ATR away first) or ❌ BROKEN (a candle closes 0.25 ATR through)']
    : ev.type === 'BOUNCED' ? [`✅ <b>BOUNCED — ${line} — ${f(ev.value)}</b>`, `${A.label} ${f(ev.price)}: moved 1 ATR (${f(ev.atr)}) away from the line before any ${ev.tf} close through it · test #${ev.test} · ${anchors}`, `<i>if this ${ev.tf} candle still closes 0.25 ATR back through the line, it counts as ❌ BROKEN (you will get that message)</i>`, odds]
    : [`❌ <b>BROKEN — ${line} — ${f(ev.value)}</b>`, `the ${ev.tf} candle closed ${f(ev.close)} = ${ev.beyond.toFixed(2)} ATR through the line (rule ≥ 0.25) · the line is retired · ${anchors}`, odds]
  return ['🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎', ...body, 'chart: http://127.0.0.1:7444/trendlines', '<i>ⓘ information only — not a trade</i>'].join('\n')
}
/** Dedupe by key, send (or print with dry), record in the ledger. Returns the number sent. */
export async function sendAlerts(events, { dry = false, now = Date.now() } = {}) {
  if (!events.length) return 0
  const led = loadLedger(); let n = 0
  for (const ev of events) { if (led[ev.key]) continue
    const text = alertText(ev), blocked = TL_ALERT_BLOCKED[ev.sym]
    if (dry) { console.log('--- (dry) ' + ev.key + ' ---\n' + text.replace(/<[^>]+>/g, '')); continue }
    const r = blocked ? { sent: false, blocked: 'RED_RULE', why: blocked } : await sendText(text).catch((e) => ({ sent: false, error: e.message }))
    const rec = { at: new Date(now).toISOString(), sent: !!r.sent, type: ev.type, sym: ev.sym, tf: ev.tf, side: ev.side, cls: ev.cls, value: +ev.value.toFixed(5), price: +ev.price.toFixed(5), test: ev.test ?? null, ...(r.sent ? {} : { not_sent: r.blocked || r.error || (r.dryRun ? 'no TWIN_TELEGRAM_*' : r.status) }) }
    // a send blocked by the data-health gate (DATABASE STALE) is NOT recorded, so a real event is not lost when the data comes back
    if (r.sent || r.dryRun || r.blocked === 'RED_RULE') { led[ev.key] = rec; n += r.sent ? 1 : 0 }
    console.log(`  📨 ${ev.key}: ${r.sent ? 'sent' : r.blocked ? 'blocked ' + r.blocked : r.dryRun ? 'dry run (no TWIN_TELEGRAM_*)' : 'not sent ' + (r.error || r.status)}`) }
  if (!dry) { fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); fs.writeFileSync(LEDGER + '.tmp', JSON.stringify(led, null, 1)); fs.renameSync(LEDGER + '.tmp', LEDGER) }
  return n
}
