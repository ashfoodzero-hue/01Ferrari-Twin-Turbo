// smoke_gamma_fvg.mjs — GLD gamma levels (src/data/gldGamma.js), the shared bounce race (src/master/bounceTest.js), and the FVG /
// gamma study artifacts the chart and docs quote (2026-10-09).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bsGamma, gexLevels, gammaProfile, toXau } from '../src/data/gldGamma.js'
import { race, seeded } from '../src/master/bounceTest.js'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ GAMMA + FVG SMOKE ██')
await ok('Black-Scholes gamma: peaks at the money, symmetric-ish in log space, 0 for expired / no IV', () => {
  const g = (K) => bsGamma(100, K, 30 / 365, 0.2); assert(g(100) > g(95) && g(100) > g(105)); assert.equal(bsGamma(100, 100, 0, 0.2), 0); assert.equal(bsGamma(100, 100, 0.1, 0), 0)
  assert(Math.abs(bsGamma(100, 100, 1, 0.2) - 0.019848) < 1e-4, 'textbook value S=K=100, T=1, σ=20 % → 0.01985')
})
await ok('GEX levels: call GEX positive / put GEX negative (dealer convention), walls = the largest strikes, regime by the total sign', () => {
  const rows = [{ strike: 100, type: 'call', oi: 1000, gamma: 0.05 }, { strike: 105, type: 'call', oi: 3000, gamma: 0.04 }, { strike: 95, type: 'put', oi: 2000, gamma: 0.05 }, { strike: 90, type: 'put', oi: 500, gamma: 0.02 }]
  const L = gexLevels(rows, 100); assert.equal(L.call_wall.strike, 105); assert.equal(L.put_wall.strike, 95); assert(L.call_wall.gex > 0 && L.put_wall.gex < 0)
  assert.equal(L.total_net_gex > 0, L.regime.startsWith('POSITIVE')); const X = toXau({ ...L, flip: 98 }, 10.9); assert.equal(X.call_wall, 1144.5); assert.equal(X.flip, 1068.2)
})
await ok('zero-gamma flip: puts below + calls above → the re-priced profile crosses zero between them; one-signed chain → no flip', () => {
  const now = Date.UTC(2026, 9, 9, 12), exp = '2026-11-06'
  const rows = [{ strike: 95, type: 'put', oi: 5000, gamma: 0, iv: 0.2, exp }, { strike: 105, type: 'call', oi: 5000, gamma: 0, iv: 0.2, exp }]
  const P = gammaProfile(rows, 100, now); assert(P.flip > 95 && P.flip < 105, 'flip ' + P.flip)
  assert.equal(gammaProfile([rows[1]], 100, now).flip, null)
})
await ok('bounce race: target before stop = true; stop first inside a minute; unresolved by the horizon = null', () => {
  const M = [{ t: 0, h: 101, l: 99 }, { t: 60000, h: 103, l: 100 }, { t: 120000, h: 104, l: 96 }]
  assert.equal(race(M, 0, true, 103, 97, 1e9), true); assert.equal(race(M, 2, true, 104, 97, 1e9), false); assert.equal(race(M, 0, true, 110, 90, 1e9), null)
  const a = seeded(1), b = seeded(1); assert.equal(a(), b())
})
const master = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'master')
await ok('FVG study artifact: 6 pre-registered variants, every verdict follows its own numbers', () => {
  const s = JSON.parse(fs.readFileSync(path.join(master, 'fvg_study.json'), 'utf8')); assert.equal(Object.keys(s.results).length, 6)
  for (const r of Object.values(s.results)) { const holds = r.oos.resolved >= 100 && r.oos.bounce_lb > r.oos.control && r.train.bounce > r.train.control && r.oos.net_lb > 0; assert.equal(r.verdict, holds ? 'HOLDS' : 'DOES_NOT_HOLD') }
  assert.equal(s.verdict, Object.values(s.results).some((r) => r.verdict === 'HOLDS') ? 'SOME_FVG_HOLDS' : 'FVG_DOES_NOT_HOLD')
})
await ok('gamma snapshot + forward test: the latest file has ≥ 90 % OI coverage and a same-minute ratio; the study is INSUFFICIENT below 100 touches', () => {
  const dir = path.join(master, '..', 'options', 'gld'), f = fs.readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().at(-1); assert(f, 'no snapshot')
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); assert(d.coverage.oi_coverage >= 0.9); assert(Math.abs(d.ratio - d.xau_same_minute / d.gld_price) < 1e-5)
  const s = JSON.parse(fs.readFileSync(path.join(master, 'gamma_levels_study.json'), 'utf8')); if (s.all.resolved < 100) assert.equal(s.verdict, 'INSUFFICIENT')
})
await ok('STRONG FVG rule (src/master/fvg.js): big + displacement + activity + 1h/4h trend; any missing piece → not strong; artifact verdicts self-consistent', async () => {
  const { fvgAt } = await import('../src/master/fvg.js')
  const B = Array.from({ length: 30 }, (_, k) => ({ o: 100, h: 101, l: 99, c: 100, v: 10 })); B[27] = { o: 101, h: 101.5, l: 100.5, c: 101, v: 10 }; B[28] = { o: 101, h: 106, l: 101, c: 105.8, v: 40 }; B[29] = { o: 105.8, h: 107, l: 103, c: 106.5, v: 10 }
  const A = B.map(() => 2), up = () => 'BULL'
  B[29].l = 102; const F = fvgAt(B, A, 29, 0, up); assert(F && F.up && F.top === 102 && F.bot === 101.5 && F.big === false, 'zone 0.5 < 0.5·ATR 1.0 is not big')
  B[29].l = 104; const G = fvgAt(B, A, 29, 0, up); assert(G.big && G.s1 && G.s2 && G.s3 && G.strong)
  assert.equal(fvgAt(B, A, 29, 0, () => 'MIXED').strong, false); B[28].v = 14; assert.equal(fvgAt(B, A, 29, 0, up).strong, false)
  const S = JSON.parse(fs.readFileSync(path.join(master, 'fvg_strong_study.json'), 'utf8')); assert.equal(Object.keys(S.cells).length, 12)
  for (const c of Object.values(S.cells)) assert.equal(c.verdict, c.oos.resolved < 100 ? 'UNDERPOWERED' : c.oos.bounce_lb > c.oos.control && c.train.bounce > c.train.control && c.oos.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')
  assert.equal(S.reached_95, Object.values(S.cells).some((c) => c.oos.resolved >= 100 && c.oos.bounce_lb >= 0.95))
})
console.log(process.exitCode ? '✗ GAMMA + FVG SMOKE FAILED' : `✅ GAMMA + FVG SMOKE: ${n} passed, 0 failed`)
