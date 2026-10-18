// smoke_sr_dxy_warning.mjs — the live DXY warning for XAU S/R levels (src/master/srDxyWarning.js) on hand-built inputs + its wiring.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dxyWarning } from '../src/master/srDxyWarning.js'

let pass = 0, fail = 0
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${info}`) } }
const P = 1000, lv = (px, side, armed = true) => ({ px, side_now: side, armed })
const xau = (levels, last = P) => ({ tf: { '1H': { last_closed: last, atr: 10, levels }, '4H': { last_closed: last, atr: 20, levels: [] } } })
const dxy = (levels, last = P) => ({ tf: { '1H': { last_closed: last, atr: 0.1, levels }, '4H': { last_closed: last, atr: 0.2, levels: [] } } })
const study = { part1: { '1H': { cond: { OPPOSITE: { all: { real: 0.42, placebo: 0.43, n_real: 807 } }, NONE: { all: { real: 0.58, placebo: 0.58, n_real: 3247 } } } }, '4H': { cond: { OPPOSITE: { all: { real: 0.47, placebo: 0.52, n_real: 131 } }, NONE: { all: { real: 0.56, placebo: 0.56, n_real: 877 } } } } } }
const F = (h, l) => ({ t: P + 3600000, h, l }), base = { prevOpen: { '1H': P, '4H': P }, study }
let w = dxyWarning({ ...base, xau: xau([lv(4100, 'support')]), dxy: dxy([lv(99.5, 'resistance')]), formX: { '1H': F(4120, 4102), '4H': F(4120, 4102) }, formD: { '1H': F(99.48, 99.3), '4H': F(99.48, 99.3) } })
ok('XAU touches armed support (low 4102 ≤ 4100 + 2.5) AND DXY touches armed resistance (high 99.48 ≥ 99.5 − 0.025) → WARNING with the measured 42 % vs 58 %', w['1H'].state === 'WARNING' && w['1H'].rows[0].cond === 'OPPOSITE' && w['1H'].measured.opposite.held === 0.42 && w['1H'].measured.none.held === 0.58, JSON.stringify(w['1H']))
w = dxyWarning({ ...base, xau: xau([lv(4100, 'support')]), dxy: dxy([lv(99.5, 'resistance')]), formX: { '1H': F(4120, 4103) }, formD: { '1H': F(99.48, 99.3) } })
ok('XAU low 4103 > 4100 + 2.5 → not at a level (no warning)', w['1H'].state === 'XAU not at a level')
w = dxyWarning({ ...base, xau: xau([lv(4100, 'support')]), dxy: dxy([lv(99.5, 'resistance')]), formX: { '1H': F(4120, 4101) }, formD: { '1H': F(99.47, 99.3) } })
ok('DXY high 99.47 < 99.475 → DXY not at the level → no warning', w['1H'].state === 'XAU at a level, DXY not opposite' && w['1H'].rows[0].cond === 'NONE')
w = dxyWarning({ ...base, xau: xau([lv(4100, 'support')]), dxy: dxy([lv(99.2, 'support')]), formX: { '1H': F(4120, 4101) }, formD: { '1H': F(99.4, 99.21) } })
ok('DXY at a SAME-side level (support with gold support) → not a warning, labelled SAME SIDE', w['1H'].state !== 'WARNING' && w['1H'].rows[0].cond === 'SAME SIDE')
w = dxyWarning({ ...base, xau: xau([lv(4100, 'support', false)]), dxy: dxy([lv(99.5, 'resistance')]), formX: { '1H': F(4120, 4101) }, formD: { '1H': F(99.6, 99.3) } })
ok('XAU level not armed (already being tested) → no new test → no warning', w['1H'].state === 'XAU not at a level')
w = dxyWarning({ ...base, xau: xau([lv(4100, 'support')], P - 3600000), dxy: dxy([lv(99.5, 'resistance')]), formX: { '1H': F(4120, 4101) }, formD: { '1H': F(99.6, 99.3) } })
ok('fail-closed: live levels one candle behind → waiting for the refresh', /waiting/.test(w['1H'].state))
w = dxyWarning({ ...base, xau: xau([lv(4100, 'support')]), dxy: dxy([lv(99.5, 'resistance')]), formX: {}, formD: {} })
ok('no forming candle (market closed) → no warning', w['1H'].state === 'no forming candle')
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), src = (f) => fs.readFileSync(path.join(root, f), 'utf8')
ok('wiring: run_twin refreshes gold-grid DXY S/R hourly; /api/sr serves the warning for XAU; the page shows it; health judges the dxy S/R feed', src('scripts/run_twin.mjs').includes("const SR_SYMS = [...TL_SYMS, 'DXY']") && src('scripts/run_chart.mjs').includes('dxyWarning(') && src('ops/sr/index.html').includes('DXY warning') && src('src/core/dataHealth.js').includes("SR_ASSETS = ['xau', 'xag', 'dxy_ice', 'wti', 'dxy']"))
console.log(`${fail ? '❌' : '✅'} SR DXY WARNING SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
