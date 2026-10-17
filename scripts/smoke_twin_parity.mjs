// smoke_twin_parity.mjs — THE CARRY-OVER IS EXACT: the twin emitter and Turbo2's liveSignalRoster agree fire-for-fire
// on the same closed bars. Turbo2's roster is imported READ-ONLY from C:\Ashraf-Ferrari-Turbo2 by file URL (it reads
// its own stores — the same files). Cut points: every IMPULSE_CONT row Turbo2's journal holds in the window (so the
// check is POWERED on real fires), plus evenly spaced quiet points (both must emit null together).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadBars } from '../src/data/backfillReader.js'
import { REF } from '../src/core/paths.js'
import { emitTwinRoster } from '../src/master/twinRoster.js'
import { readMarketState, stateAllows } from '../src/master/marketState.js'

let pass = 0, fail = 0
const ok = (n, f) => { try { f(); pass++; console.log('  ✓ ' + n) } catch (e) { fail++; console.log('  ✗ ' + n + ' — ' + e.message) } }
console.log('\n██ TWIN ↔ TURBO2 PARITY SMOKE ██')
const T2 = await import(pathToFileURL(path.join(REF.turbo2Root, 'src', 'master', 'liveSignalRoster.js')).href)
const rs = (m, ms) => { const o = []; let c = null; for (const b of m) { const k = Math.floor(b.t / ms) * ms
  if (!c || c.t !== k) { if (c) o.push(c); c = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 } } else { c.h = Math.max(c.h, b.h); c.l = Math.min(c.l, b.l); c.c = b.c; c.v += b.v || 0 } } if (c) o.push(c); return o }

const WINDOW_D = 150
const b15 = (await loadBars('XAUUSD', '15m', { from: Date.now() - WINDOW_D * 86400000 })).bars
const idx = new Map(b15.map((b, k) => [b.t, k]))
const journal = path.join(REF.turbo2Paper, 'trades.jsonl')
const rows = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
const fireTs = [...new Set(rows.filter((r) => r.tier === 'IMPULSE_CONT' && idx.has(r.t)).map((r) => r.t))].sort((a, b) => a - b)
const cuts = new Set()
for (const t of fireTs) { const k = idx.get(t); for (const d of [0, 1, 3]) if (k + d < b15.length) cuts.add(k + d) }   // visible for 4 bars
const quiet = 16; for (let q = 1; q <= quiet; q++) cuts.add(Math.floor(b15.length * q / (quiet + 1)))
const FIELDS = ['tier', 'side', 'direction', 't', 'i', 'entry', 'stop', 'target', 'riskUsd', 'targetUsd', 'atr', 'setup', 'beTriggerR', 'beLockR']
let both = 0, neither = 0, mism = [], gateMism = [], dropDiff = 0
for (const cut of [...cuts].sort((a, b) => a - b)) {
  const upto = b15.slice(0, cut + 1); if (upto.length < 2000) continue
  const now = upto.at(-1).t + 900000
  const tw = emitTwinRoster(upto, { now }).impulseCont
  const t2 = T2.emitSignalTiers(upto, rs(upto, 3600000), { includeSwingTrade: true }).impulseCont
  if (!tw && !t2) { neither++; continue }
  if (!tw || !t2) { mism.push(`cut ${new Date(upto.at(-1).t).toISOString()}: twin=${tw ? 'fire' : 'null'} turbo2=${t2 ? 'fire' : 'null'}`); continue }
  both++
  for (const f of FIELDS) if (JSON.stringify(tw[f]) !== JSON.stringify(t2[f])) mism.push(`${new Date(tw.t).toISOString()} ${f}: twin ${JSON.stringify(tw[f])} vs turbo2 ${JSON.stringify(t2[f])}`)
  // VOLUME DROPPED 2026-10-17 in the twin (volMult 0); Turbo2 still gates on its tick-count volume (volMult 1.4). The MECHANISM parity is checked
  // with the twin's gate run at Turbo2's volMult; the live (DROP) disagreements are counted as the measured, approved divergence.
  const agree14 = !!stateAllows(tw, readMarketState(upto, { volMult: 1.4 })).allow
  if (agree14 !== !t2.blocked) gateMism.push(`${new Date(tw.t).toISOString()}: twin@1.4 agrees=${agree14} turbo2 blocked=${t2.blocked} (${t2.blockedWhy})`)
  if (tw.stateRead.agrees !== !t2.blocked) dropDiff++
}
ok(`POWER: ${both} cut point(s) where BOTH emitters fired (journal fires in window: ${fireTs.length}; quiet points agreeing on null: ${neither})`, () => assert(both >= 3, 'fewer than 3 shared fires — the parity check is unpowered'))
ok('every shared fire is IDENTICAL on ' + FIELDS.length + ' fields and no cut point fires on one side only', () => assert.equal(mism.length, 0, mism.slice(0, 6).join(' · ')))
ok(`the market-state MECHANISM agrees (twin gate at Turbo2's volMult 1.4 ⇔ Turbo2 not blocked); live twin (volume dropped) differs on ${dropDiff} shared fire(s) — the approved divergence`, () => assert.equal(gateMism.length, 0, gateMism.slice(0, 4).join(' · ')))
console.log(`\n${fail ? '✗' : '✅'} TWIN ↔ TURBO2 PARITY: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
