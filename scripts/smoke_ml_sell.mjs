// smoke_ml_sell.mjs — the LIVE paper ML SELL (scripts/lib/ml_sell_live.mjs, 2026-10-25):
//   1. the live 10-day-window score = the walk-forward (full-history) score at 60 random 2026 decisions the study selected → same score, still fires;
//   2. a tick replayed at a selected 2026 decision (write:false) opens a PAPER SELL with the frozen geometry (0.25 A target, 3 A stop);
//   3. no frozen model for a year → no trade (fail-closed);  4. wiring: matrix_tick calls it inside try; the lib never imports Telegram.
import '../src/core/bootEnv.js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { makeSpreadAt } from '../src/master/spreadModel.js'
import { rng } from '../src/core/studyStats.js'
import { ML_SELL, loadModel, scoreAt, mlSellTick } from './lib/ml_sell_live.mjs'

let pass = 0, fail = 0
const t = async (name, f) => { try { await f(); pass++; console.log('  ✓ ' + name) } catch (e) { fail++; console.log('  ✗ ' + name + ' — ' + e.message) } }
const M = loadModel(2026), R = rng(2026)
await t('frozen 2026 model present with its threshold, features and the measured backtest', () => { assert(M && M.model && M.edges.length === M.features.length && M.threshold > 0 && M.parity_rows.length > 100 && M.measured?.P2) })
await t('LIVE 20-day window score = walk-forward score at 60 random selected 2026 decisions (|Δ| < 1e-9) and every one still fires', async () => {
  let worst = 0
  for (let k = 0; k < 60; k++) { const [T, sc] = M.parity_rows[Math.floor(R() * M.parity_rows.length)], s = await scoreAt(T)
    assert(!s.why, s.why); worst = Math.max(worst, Math.abs(s.score - sc)); assert(s.score >= s.threshold, `${new Date(T).toISOString()} would not fire`) }
  console.log(`    worst |Δscore| ${worst.toExponential(2)}`); assert(worst < 1e-9)
})
await t('a tick replayed at a selected decision opens ONE paper SELL: entry = the bar close, target 0.25 A below, stop 3 A above, paper:true', async () => {
  const [T] = M.parity_rows[Math.floor(M.parity_rows.length / 2)], prev = fs.existsSync(ML_SELL.state) ? fs.readFileSync(ML_SELL.state) : null
  const o = await mlSellTick({ lastClose: T, dataLive: true, spreadAt: makeSpreadAt(), write: false })
  assert(o.open && o.open.paper === true && o.open.sig.side === 'SELL'); const s = o.open.sig
  assert(Math.abs((s.entry - s.tp1) / s.atr - 0.25) < 1e-9 && Math.abs((s.sl - s.entry) / s.atr - 3) < 1e-9 && s.tp1 === s.tp2)
  assert((fs.existsSync(ML_SELL.state) ? fs.readFileSync(ML_SELL.state) : null)?.toString() === prev?.toString(), 'write:false must not touch the state')
})
await t('fail-closed: no frozen model for the year → no trade, says why; data not live → no trade', async () => {
  const s = await scoreAt(Date.parse('2031-03-03T10:03:00Z')); assert(s.why && /no frozen model/.test(s.why))
  const o = await mlSellTick({ lastClose: M.parity_rows[0][0], dataLive: false, why: 'test', spreadAt: makeSpreadAt(), write: false }); assert(!o.open && /data not live/.test(o.decision.skipped))
})
await t('wiring: matrix_tick runs it every tick inside try (never --static); the lib has no Telegram import; trades are PAPER', () => {
  const m = fs.readFileSync(new URL('./matrix_tick.mjs', import.meta.url), 'utf8'), lib = fs.readFileSync(new URL('./lib/ml_sell_live.mjs', import.meta.url), 'utf8')
  assert(/if \(!STATIC\) try \{ const ml = await mlSellTick\(\{ lastClose, dataLive: st\.live && !health\.halted/.test(m)); assert(/catch \(e\) \{ console\.error\('  ⚠ ml sell: '/.test(m))
  assert(!/telegram|sendText|alertSetup/i.test(lib.replace(/no Telegram/g, '')), 'no Telegram in the paper ML SELL'); assert(/paper: true/.test(lib))
})
console.log(fail ? `✗ ML SELL SMOKE: ${pass} passed, ${fail} failed` : `✅ ML SELL SMOKE: ${pass} passed, 0 failed`); process.exit(fail ? 1 : 0)
