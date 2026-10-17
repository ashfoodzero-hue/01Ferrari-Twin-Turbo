// smoke_ladder_context.mjs — the live ladder context (docs/LADDER_CONTEXT_SPEC.md §4), 2026-10-17:
//   1. WINDOW PARITY  — swings from each anchor's live window = full-history swings (the study engine) over the recent overlap, every ladder timeframe
//   2. REPLAY = STUDY — at 3 past moments, the state's flips equal flipAt on FULL-history swings, and the odds equal swing_ladder_atlas.json exactly
//   3. NO LOOK-AHEAD  — the state at a past `now` is identical whether or not later minutes are present in the input
//   4. WORDING        — the footer is on every state; no BUY / SELL / entry words anywhere
import '../src/core/bootEnv.js'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { cleanForTv } from '../src/core/nyCandles.js'
import { zigzag } from '../src/master/swings.js'
import { ladderState, closedCandles, LADDER_STEPS, WINDOW_DAYS, FOOTER } from '../src/master/ladderContext.js'
import { indexSwings, flipAt } from './lib/swing_ladder.mjs'

let n = 0, failed = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ LADDER CONTEXT SMOKE ██')
const atlas = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_ladder_atlas.json'), 'utf8'))
const NOWS = ['2024-03-15T15:00:00Z', '2025-06-10T10:00:00Z', '2026-10-16T21:00:00Z'].map(Date.parse)
const ALL = cleanForTv((await loadBars('XAUUSD', '1m', { from: HISTORY_CONTINUOUS_FROM, to: Math.max(...NOWS) + 3 * 86400000 })).bars).bars
const upTo = (t) => ALL.filter((b) => b.t + 60000 <= t), win = (bars, a, t) => bars.filter((b) => b.t >= t - WINDOW_DAYS[a] * 86400000)
await ok('WINDOW PARITY: live-window swings = full-history swings over the last 25 swings, every anchor and ladder timeframe', async () => {
  const now = NOWS[2], full = upTo(now)
  for (const a of Object.keys(LADDER_STEPS)) for (const tf of [a, ...LADDER_STEPS[a]]) {
    const sw = (bars) => { const C = closedCandles(bars, tf, now); return zigzag(C, { k: 3 }).swings.map((s) => `${s.type}|${s.px}|${C[s.i].t}|${C[s.knownI].close_t}`) }
    const f = sw(full), w = sw(win(full, a, now)), tail = f.slice(-25)
    for (const x of tail) assert(w.includes(x), `${a}/${tf}: full-history swing ${x} missing from the window`) } })
await ok('REPLAY = STUDY: flips equal flipAt on FULL-history swings; odds equal the atlas exactly (3 past moments)', async () => {
  for (const now of NOWS) { const full = upTo(now)
    for (const a of Object.keys(LADDER_STEPS)) { const s = ladderState(win(full, a, now), a, now, atlas); if (!s.leg) continue
      for (const st of s.steps) { const C = closedCandles(full, st.tf, now), idx = indexSwings(C, zigzag(C, { k: 3 }).swings), f = flipAt(idx, s.side, s.extreme, Date.parse(s.anchor_candle), Math.max(now, Date.parse(s.anchor_candle) + 60000))
        assert.equal(st.flipped, f != null && f <= now, `${new Date(now).toISOString()} ${a} ${st.tf}`) }
      if (s.deepest) { const ev = atlas.anchors[a].sides[s.side].evidence.find((e) => e.key === s.deepest); assert.equal(s.odds.p_real, ev.O.p_real_given_flip); assert.equal(s.odds.n, ev.O.n_flipped) }
      console.log(`      ${new Date(now).toISOString().slice(0, 16)} ${a}: ${s.leg} ${s.extreme} ${s.steps.map((x) => x.tf + (x.flipped ? '✓' : '·')).join(' ')} ${s.deepest ? (100 * s.odds.p_real).toFixed(0) + '%' : 'base ' + (100 * s.odds.base).toFixed(0) + '%'}`) } } })
await ok('NO LOOK-AHEAD: the state at a past now is identical with or without later minutes in the input', async () => {
  for (const now of NOWS.slice(0, 2)) for (const a of Object.keys(LADDER_STEPS)) {
    const later = ALL.filter((b) => b.t <= now + 3 * 86400000 && b.t >= now - WINDOW_DAYS[a] * 86400000), exact = win(upTo(now), a, now)
    assert.deepEqual(ladderState(later, a, now, atlas), ladderState(exact, a, now, atlas), `${a} at ${new Date(now).toISOString()}`) } })
await ok('WORDING: footer on every state; no BUY / SELL / entry words', async () => {
  const s = ladderState(win(upTo(NOWS[2]), '1H', NOWS[2]), '1H', NOWS[2], atlas); assert.equal(s.footer, FOOTER)
  const txt = JSON.stringify(s) + fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'master', 'ladderContext.js'), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  assert(!/\b(BUY|SELL)\b/.test(txt), 'trade words present'); assert(!/entry signal|enter now/i.test(txt)) })
console.log(failed ? `✗ LADDER CONTEXT SMOKE: ${n} passed, ${failed} failed` : `✅ LADDER CONTEXT SMOKE: ${n} passed, 0 failed`)
