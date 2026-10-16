// ════════════════════════════════════════════════════════════════════════════════
// level_tick.mjs — 4H S/R LEVEL notices to Telegram (2026-10-16; Ashraf: "send this msg about 5 m before it reaches the defended level price …
// so I watch it · for S/R · also show Macro bias strength on what favour"). INFORMATION ONLY — never a trade. Run by run_twin every minute.
//   ⏳ APPROACHING: price comes within ONE 5m-ATR14 (≈ one 5-minute candle, median 4 min to the touch) of an active 4H candle level, once per level / 2 h
//   🧱 DEFENDED:    a STRONG-defence touch of a 4H candle level (swingWallEvents, the study's TRAIN p66), once per test
// Levels = closed NY 4H candle highs / lows kept until a 1m close beyond (study c4h_level_study.json), from the last 90 days of 1m.
// Every number in a message comes from data/master/c4h_level_study.json (+ the 4H Macro state, labelled score / no edge). Dedupe:
// data/telegram/level_alerts.json.   --dry : compute and print the messages, send nothing, write nothing.
// ════════════════════════════════════════════════════════════════════════════════
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { swingWallEvents } from '../src/master/wallDefense.js'
import { resample4h } from '../src/master/macroMagnet.js'
import { sendText } from '../src/master/telegram.js'

const DRY = process.argv.includes('--dry'), now = Date.now(), H4 = 4 * 3600000
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const S = readJ(path.join(TURBO.master, 'c4h_level_study.json')); if (!S) { console.log('  level_tick: c4h_level_study.json missing — nothing sent'); process.exit(0) }
const LEDGER = path.join(TURBO.data, 'telegram', 'level_alerts.json'), led = readJ(LEDGER) ?? {}
const M = (await loadBars('XAUUSD', '1m', { from: now - 90 * 86400000 })).bars.filter((b) => b.t + 60000 <= now)
if (!M.length || now - M.at(-1).t > 5 * 60000) { console.log('  level_tick: no fresh minute — nothing sent'); process.exit(0) }   // never alert on stale data
async function* it() { for (const b of M) yield b }
const G4 = (await resample4h(it(), ['ny'], { closedBy: now })).ny
const LV = { highs: G4.map((b) => ({ knownT: b.t + H4, px: b.h })), lows: G4.map((b) => ({ knownT: b.t + H4, px: b.l })) }
// active levels now (known, never closed beyond on 1m since)
const alive = (L, up) => L.filter((x) => x.knownT <= now && !M.some((b) => b.t >= x.knownT && (up ? b.c > x.px : b.c < x.px)))
const last = M.at(-1), price = last.c
const ceil = alive(LV.highs, true).filter((x) => x.px > price).sort((a, b) => a.px - b.px)[0] ?? null
const floor = alive(LV.lows, false).filter((x) => x.px < price).sort((a, b) => b.px - a.px)[0] ?? null
// 5m ATR14 of the last day (closed 5m bars)
const B5 = []; { let c = null; for (const b of M.slice(-1500)) { const t = Math.floor(b.t / 300000) * 300000; if (!c || c.t !== t) { if (c) B5.push(c); c = { t, h: b.h, l: b.l, c: b.c } } else { if (b.h > c.h) c.h = b.h; if (b.l < c.l) c.l = b.l; c.c = b.c } } }
let atr5 = null; for (let i = 1; i < B5.length; i++) { const tr = Math.max(B5[i].h - B5[i].l, Math.abs(B5[i].h - B5[i - 1].c), Math.abs(B5[i].l - B5[i - 1].c)); atr5 = atr5 == null ? tr : (atr5 * 13 + tr) / 14 }
// the 4H Macro bias (Ashraf: "show Macro bias strength on what favour") — score, labelled with its measured result
const mg = readJ(path.join(TURBO.master, 'macro_magnet_state.json')), g = mg?.gold
const macroLine = g ? `4H Macro bias: <b>${g.side} ${g.side === 'LONG' ? g.long : g.short}</b> (favours ${g.side === 'LONG' ? 'BUY' : 'SELL'}; score, not probability) · DXY ${mg.dxy_relation ?? '—'} · measured: no edge${mg.measured?.this_score ? ` (${(100 * mg.measured.this_score.up4).toFixed(1)}% up next 4H)` : ''}` : '4H Macro bias: —'
const pc = (x) => x == null ? '—' : (100 * x).toFixed(1) + '%', A = S.approach.oos, T = S.touch
const head = '🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎', foot = '<i>ⓘ information only — not a trade</i>'
const out = []
// ⏳ APPROACHING
for (const [type, lv] of [['ceiling', ceil], ['floor', floor]]) { if (!lv || !(atr5 > 0)) continue
  const dist = Math.abs(lv.px - price), key = `A:${type}:${lv.px}`, touchedRecently = M.some((b) => b.t >= now - 2 * 3600000 && (type === 'ceiling' ? b.h >= lv.px : b.l <= lv.px))
  if (dist <= atr5 * (DRY ? +(process.env.LEVEL_TEST_MULT || 1) : 1) && dist > 0.25 && !touchedRecently && !(led[key] && now - Date.parse(led[key].at) < 2 * 3600000)) {
    const side = type === 'ceiling' ? 'RESISTANCE' : 'SUPPORT'
    out.push({ key, text: [head, `⏳ <b>4H ${side} AHEAD — ${lv.px.toFixed(2)}</b>`, `gold ${price.toFixed(2)} · $${dist.toFixed(2)} away (≈ one 5-minute candle)`,
      `measured: reaches it within 15 min ${pc(A.touch_within_15m)} (median ${A.median_minutes_to_touch} min) · when it touches, it holds ${pc(A.hold_if_touched)} → watch for the 🧱 DEFENDED message`, macroLine, foot].join('\n') }) } }
// 🧱 DEFENDED (strong defence at a 4H level, decided in the last 10 min)
const ev = swingWallEvents(M.filter((b) => b.t >= now - 2 * 86400000), LV, { from: now - 15 * 60000 }).filter((e) => e.decisionT >= now - 10 * 60000 && (e.defStronger || (e.defense && e.mag > T.strong_threshold_train_p66)))
for (const e of ev) { const key = `D:${e.type}:${e.wall}:${e.t}`; if (led[key]) continue; const side = e.type === 'ceiling' ? 'RESISTANCE' : 'SUPPORT'
  out.push({ key, text: [head, `🧱 <b>4H ${side} DEFENDED — ${e.wall.toFixed(2)}</b> (strong defence)`, `measured: holds ${pc(T.oos.strong.hold)} (~$4 back-off from the level within 60 min) · after holding, ≥ $10 within 4 h ${pc(T.oos_after_hold_ft10)}`,
    macroLine, '<i>ⓘ reading only — a scalp here measured 43.5% WR, losing (study be)</i>'].join('\n') }) }
console.log(`  🧱 level_tick ${new Date(now).toISOString().slice(11, 16)}: gold ${price} · 4H ceiling ${ceil?.px ?? '—'} · floor ${floor?.px ?? '—'} · 5m ATR ${atr5?.toFixed(2)} · notices ${out.length}`)
for (const o of out) {
  if (DRY) { console.log('--- (dry) ---\n' + o.text.replace(/<[^>]+>/g, '')); continue }
  const r = await sendText(o.text).catch((e) => ({ sent: false, error: e.message }))
  if (r.sent || r.dryRun) { led[o.key] = { at: new Date(now).toISOString(), sent: !!r.sent } }
  console.log(`  📨 ${o.key}: ${r.sent ? 'sent' : r.dryRun ? 'dry run (no TWIN_TELEGRAM_*)' : 'not sent ' + (r.error || r.status)}`) }
if (!DRY && out.length) { fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); fs.writeFileSync(LEDGER + '.tmp', JSON.stringify(led, null, 1)); fs.renameSync(LEDGER + '.tmp', LEDGER) }
