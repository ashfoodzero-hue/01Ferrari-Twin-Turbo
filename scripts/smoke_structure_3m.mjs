// smoke_structure_3m.mjs — proves every rule of scripts/lib/structure3m.mjs on hand-built 3m candles (LOW tip + its HIGH mirror + 3 variants).
import { makeStructure } from './lib/structure3m.mjs'

const T0 = Date.UTC(2026, 0, 5, 14), S = 3 * 60000
//            h      l      o      c
const RAW = [[110, 108, 109, 108.5], [109, 107, 108, 107.5], [108, 106, 107, 106.5], [111, 105, 106, 105.5], [107, 104, 105, 104.5], [106, 103, 104, 103.5],
  [105, 101, 103, 101.5], [104, 100, 101, 100.5], [106, 102, 102, 105], [107, 103, 105, 104], [106, 102.5, 104, 103], [105, 99, 104, 101],          // 0-11: 11 = tip (sweeps pivot low 7)
  [103, 101, 101, 102], [108, 102, 102, 106], [105, 101.2, 105, 102], [103, 100.5, 102, 101], [104, 101, 101, 103.5], [105, 102, 103.5, 104.5],   // 13 wicks above 107; 15 = higher low
  [106.5, 103, 104.5, 106], [109, 105.5, 106, 108.8], [110, 107.3, 108.8, 109], [109.5, 107.1, 109, 108], [112, 108, 108, 111], [116, 110, 111, 115], // 19 = confirmation; 21 retest; 23 extension
  [115, 112, 115, 113], [114, 111, 113, 112], [113, 110, 112, 111], [118, 112, 111, 117.5], [117, 115, 117, 116], [116, 114, 116, 115], [115, 113, 115, 114]]   // 27 closes above pivot high 23
const mk = (raw, neg = false) => raw.map(([h, l, o, c], i) => (neg ? { t: T0 + i * S, h: -l, l: -h, o: -o, c: -c } : { t: T0 + i * S, h, l, o, c }))
const run = (raw, type = 'L', neg = false) => { const C = mk(raw, neg); return makeStructure(C, C.map(() => 2)).measure({ type, c: { t: C[10].t, close_t: C[12].t }, px: neg ? -99 : 99, aAtr: 8, legStartT: C[0].t, endT: C.at(-1).t + S }) }
let pass = 0, fail = 0
const check = (name, got, want) => { const bad = Object.entries(want).filter(([k, v]) => got[k] !== v); if (bad.length) { fail++; console.log(`  ✗ ${name}: ${bad.map(([k, v]) => `${k} = ${got[k]} (want ${v})`).join(', ')}`) } else { pass++; console.log(`  ✓ ${name}`) } }

const base = { status: 'ok', has_level: true, level_known_at_tip: false, level_dist_anchor_atr: 1, sweep: true, confirmed: true, tip_broken_before_conf: false, candles_to_conf: 8, minutes_to_conf: 27,
  wick_first: true, strong_conf_candle: true, hl_turn: true, v_turn: false, double_tip: true, retest: true, retest_held: true, after_conf: 'extension', second_conf: true }
const L = run(RAW); check('LOW tip: level = last lower high 107 (pivot 9), every rule', L, { ...base, level: 107 })
check('HIGH tip = exact mirror of the LOW tip', run(RAW, 'H', true), { ...base, level: -107 })
const broken = RAW.map((r) => [...r]); broken[14][1] = 98.5
check('tip broken before the confirming close → not confirmed', run(broken), { confirmed: false, tip_broken_before_conf: true })
const failRetest = RAW.map((r) => [...r]); failRetest[21][3] = 106.5
check('retest closes back below the level → does not hold', run(failRetest), { retest: true, retest_held: false })
const noSweep = RAW.map((r) => [...r]); noSweep[11][3] = 99.5
check('tip candle closes below the prior pivot low → no sweep', run(noSweep), { sweep: false })
console.log(`${fail ? '❌' : '✅'} STRUCTURE 3M SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
