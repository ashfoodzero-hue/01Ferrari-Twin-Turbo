// backfill_ff_history.mjs — Forex Factory USD calendar HISTORY with actual / forecast / previous, week by week from 2013-07-14 (2026-10-17;
// Ashraf: "make sure we also have the news and macros at the same time of the candles reading"). Same parser + rules as the live calendar
// (src/data/calendar.js fetchForexFactory: USD rows only, UTC dateline). Polite: one week every ~3 s; resumable (weeks already saved are skipped).
// Output: data/calendar/ff_history.jsonl — one event per line { src:'FF', id, t, name, impact, actual, forecast, previous, revision, better, week }
//         data/calendar/ff_history_progress.json — weeks done / failed.
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { fetchForexFactory } from '../src/data/calendar.js'

const DIR = path.join(TURBO.data, 'calendar'), OUT = path.join(DIR, 'ff_history.jsonl'), PROG = path.join(DIR, 'ff_history_progress.json')
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const prog = (() => { try { return JSON.parse(fs.readFileSync(PROG, 'utf8')) } catch { return { done: [], failed: {} } } })(), done = new Set(prog.done)
const seen = new Set(); try { for (const l of fs.readFileSync(OUT, 'utf8').split('\n')) if (l) seen.add(JSON.parse(l).id) } catch {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let d = Date.UTC(2013, 6, 14), added = 0   // a Sunday (FF weeks run Sunday → Saturday)
const end = Date.now()
for (; d < end; d += 7 * 86400000) {
  const x = new Date(d), key = `${MON[x.getUTCMonth()]}${x.getUTCDate()}.${x.getUTCFullYear()}`
  if (done.has(key)) continue
  let ok = false
  for (let a = 0; a < 3 && !ok; a++) {
    try { const ev = await fetchForexFactory(key), lines = []
      for (const e of ev) if (!seen.has(e.id)) { seen.add(e.id); lines.push(JSON.stringify({ ...e, week: key })) }
      if (lines.length) fs.appendFileSync(OUT, lines.join('\n') + '\n'); added += lines.length; done.add(key); delete prog.failed[key]; ok = true
      console.log(`  ${key}: ${ev.length} USD events (${lines.length} new)`) }
    catch (e) { prog.failed[key] = e.message; await sleep(8000 * (a + 1)) } }
  prog.done = [...done]; fs.writeFileSync(PROG, JSON.stringify(prog))
  await sleep(2500 + Math.random() * 1500)
}
console.log(`FF history: ${done.size} weeks done, ${Object.keys(prog.failed).length} failed, ${added} events added → ${OUT}`)
