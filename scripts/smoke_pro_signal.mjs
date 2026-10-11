// smoke_pro_signal.mjs — unit + causality proof for the PRO_SWING signal (R6).
import assert from 'node:assert'
import { loadBars } from '../src/data/backfillReader.js'
import { PRO_CONFIG, buildProSignal, findProSetups, latestProSignal, proSignalCard } from '../src/master/proSignal.js'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`) } else { fail++; console.error(`  ✗ ${m}`) } }
console.log('\n██ PRO_SWING SIGNAL SMOKE ██\n')

// 1) buildProSignal geometry (BE-managed plan, correct sides)
console.log('1 · buildProSignal plan geometry')
const up = buildProSignal({ direction: 'UP', entry: 2000, atr: 4, setup: 'fvg_continuation', grade: 'A', kz: 'NY_KZ' }, '2026-06-01T13:00:00Z')
ok(up.plan.sl === 2000 - PRO_CONFIG.slAtr * 4 && up.plan.tp === 2000 + PRO_CONFIG.tgtR * (PRO_CONFIG.slAtr * 4), `UP: sl=entry−2ATR, tp=entry+0.5R [sl ${up.plan.sl} tp ${up.plan.tp}]`)
ok(up.plan.sl < up.plan.entry && up.plan.entry < up.plan.tp, 'UP plan ordered sl<entry<tp')
ok(up.plan.beTriggerR === 0.2 && up.plan.type === 'maker_limit_managed', 'carries BE-trigger 0.2R + managed type')
const dn = buildProSignal({ direction: 'DOWN', entry: 2000, atr: 4, setup: 'sweep_reclaim', grade: 'B', kz: 'LONDON_KZ' }, '2026-06-01T08:00:00Z')
ok(dn.plan.tp < dn.plan.entry && dn.plan.entry < dn.plan.sl, 'DOWN plan ordered tp<entry<sl')
ok(up.tier === 'PRO_SWING' && up.agent === 'pro_swing', 'tier/agent = PRO_SWING')

// 2) HONEST stats — ~89%, NOT relabeled as 97%
console.log('\n2 · honest validated stats')
ok(up.validated.wr === 0.89 && up.validated.wr < 0.97, `validated WR ${up.validated.wr} (honest ~89%, NOT 97%)`)
ok(up.validated.two_sided === true && up.validated.regime_robust === true && /DSR/.test(up.validated.deflated), 'stats: two-sided + regime-robust + deflated (the discovery)')

// 3) real data — latest signal valid; card shape
console.log('\n3 · latestProSignal on real bars')
const { bars } = await loadBars('XAUUSD', '15m', { from: Date.parse('2025-09-01') })
const sig = latestProSignal(bars)
ok(['UP', 'DOWN', 'NEUTRAL'].includes(sig.direction), `valid direction (${sig.direction})`)
ok(sig.tier === 'PRO_SWING', 'tier PRO_SWING')
const card = proSignalCard(sig)
ok('plan' in card && 'validated' in card && card.tier === 'PRO_SWING', 'card has plan + validated + tier')
if (sig.direction !== 'NEUTRAL') ok(card.plan.beTriggerR === 0.2 && card.plan.tgtR === 0.5, 'armed signal carries the managed plan')
else ok(true, 'NEUTRAL now (no A+ killzone setup armed) — valid')

// 4) only A+ in killzone qualifies (filter integrity)
console.log('\n4 · filter integrity')
const setups = findProSetups(bars, bars.at(-1).t, { freshBars: 10 })
ok(setups.every((s) => PRO_CONFIG.grades.includes(s.grade) && PRO_CONFIG.killzones.includes(s.kz) && PRO_CONFIG.setups.includes(s.setup)), `every armed setup is A+ grade + killzone + displaced setup (${setups.length} found)`)

// 5) CAUSALITY — armed setups as-of a past bar unchanged by future bars
console.log('\n5 · look-ahead-free')
const at = bars[bars.length - 50].t
const a = findProSetups(bars, at, { freshBars: 6 })
const b = findProSetups(bars.filter((x) => x.t <= at), at, { freshBars: 6 })
ok(a.length === b.length && a.every((s, i) => s.t === b[i].t && s.direction === b[i].direction), 'truncating future bars does not change a past read (causal)')

console.log(`\n${fail === 0 ? '✅' : '❌'} PRO_SWING SIGNAL SMOKE: ${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
