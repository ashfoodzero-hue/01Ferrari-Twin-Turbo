// report_swing_nextmove15m.mjs — docs/SWING_NEXTMOVE_15M_ATLAS.md generated FROM data/master/swing_nextmove_15m.json (display derives from the
// artifact; never typed by hand).
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'

const S = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'swing_nextmove_15m.json'), 'utf8'))
const p = (x) => (x == null ? '—' : (100 * x).toFixed(1) + ' %'), f = (x, d = 2) => (x == null ? '—' : (+x).toFixed(d)), L = []
L.push('# 15m swings — the NEXT MOVE: atlas', '', `Generated from \`data/master/swing_nextmove_15m.json\` (${S.at}). Rules: \`docs/SWING_NEXTMOVE_15M_SPEC.md\` (+ ADDENDUM A). Book: \`docs/SWING_STUDY_BOOK.md\` §5I.`, '',
  `Window ${S.window[0].slice(0, 10)} → ${S.window[1].slice(0, 16)} · split ${S.split.slice(0, 10)} · events k=3: **${S.events.k3.toLocaleString()}** (TRAIN ${S.events.train.toLocaleString()} / OOS ${S.events.oos.toLocaleString()}).`, '',
  `**Claims:** Q1 ${S.claims.q1.join(', ') || 'none'} · Q4 (pre-registered) ${S.claims.q4.join(', ') || 'none'} · Q4 robust to the distance-matched placebo ${S.claims.q4_robust_addendum_a.join(', ') || '**none**'} · context splits ${S.claims.splits.join(', ') || 'none'}.`, '')
L.push('## Q1 — does the confirmed leg carry on? (race +X ATR with the leg before −X ATR against, from the confirmation close)', '', '| X · side | TRAIN leg | TRAIN control | OOS leg (Wilson LB) | OOS control | OOS n | p (Holm) | claim |', '|---|---|---|---|---|---|---|---|')
for (const [k, t] of Object.entries(S.q1)) if (!k.endsWith('both')) L.push(`| ${k.replace('|L', ' · after LOW (up)').replace('|H', ' · after HIGH (down)')} | ${p(t.TRAIN.cont)} | ${p(t.TRAIN.ctrl)} | ${p(t.OOS.cont)} (${p(t.OOS.cont_lb)}) | ${p(t.OOS.ctrl)} | ${t.OOS.n} | ${f(t.OOS.p_holm, 3)} | ${t.claim ? '✅' : '—'} |`)
L.push('', '## Q2 — size (ATR of the confirmation candle; $ shown for reference — it scales with the price level)', '', '| Measure | Part | P10 | P25 | P50 | P75 | P90 | n | stable |', '|---|---|---|---|---|---|---|---|---|')
for (const [k, o] of Object.entries(S.q2)) for (const part of ['TRAIN', 'OOS']) { const q = o.both[part]; L.push(`| ${k} | ${part} | ${f(q.p10)} | ${f(q.p25)} | ${f(q.p50)} | ${f(q.p75)} | ${f(q.p90)} | ${q.n} | ${part === 'OOS' ? (o.stable ? 'yes' : 'no') : ''} |`) }
L.push('', '## Q3 — timing (15m bars from the confirmation close)', '', '| Measure | Part | P10 | P25 | P50 | P75 | P90 | n |', '|---|---|---|---|---|---|---|---|')
for (const k of ['bars_to_extreme', 'bars_to_confirm']) for (const part of ['TRAIN', 'OOS']) { const q = S.q3[k].both[part]; L.push(`| ${k} | ${part} | ${q.p10} | ${q.p25} | ${q.p50} | ${q.p75} | ${q.p90} | ${q.n} |`) }
L.push('', `Hazard (chance the next extreme is in bar n, given not yet), OOS, bars 1-12: ${S.q3.hazard.OOS.slice(0, 12).map((x) => p(x)).join(' · ')}`, '')
L.push('## Q4 — does the next extreme stop at a level known at the confirmation close? (hit = within ±0.25 ATR)', '', '| Level | OOS hit (LB) | pre-registered control (shifted 1-3 ATR) | **ADDENDUM A placebo (same distance)** | OOS n | pre-reg claim | robust |', '|---|---|---|---|---|---|---|')
for (const [k, t] of Object.entries(S.q4)) { const a = S.q4_addendum_a.placebo[k]; L.push(`| ${k} | ${p(t.OOS.hit)} (${p(t.OOS.hit_lb)}) | ${p(t.OOS.ctrl)} | ${p(a.OOS.placebo)} | ${t.OOS.n} | ${t.claim ? 'yes' : '—'} | ${a.robust ? '✅' : '❌'} |`) }
L.push('', 'Round numbers vs a uniform position inside the band:', '')
for (const [k, o] of Object.entries(S.q4_addendum_a.round_uniform)) L.push(`- ${k}: OOS ${p(o.OOS.observed)} (LB ${p(o.OOS.observed_lb)}) vs uniform ${p(o.OOS.expected_uniform)} · TRAIN ${p(o.TRAIN.observed)} vs ${p(o.TRAIN.expected_uniform)}`)
L.push('', '## Context splits (Q1 at 1 ATR, both sides; remaining-move median in ATR)', '', '| Split | Value | OOS leg | OOS control | OOS n | TRAIN leg | TRAIN control | rem median OOS | claim |', '|---|---|---|---|---|---|---|---|---|')
for (const [name, vals] of Object.entries(S.splits)) for (const [v, t] of Object.entries(vals)) L.push(`| ${name} | ${v} | ${p(t.OOS.cont)} | ${p(t.OOS.ctrl)} | ${t.OOS.n} | ${p(t.TRAIN.cont)} | ${p(t.TRAIN.ctrl)} | ${f(t.rem_atr_median.OOS)} | ${t.claim ? '✅' : '—'} |`)
L.push('', '## Robustness (k = 2, k = 5)', '')
for (const [k, o] of Object.entries(S.robustness)) L.push(`- ${k}: ${o.events.toLocaleString()} events · Q1 at 1 ATR OOS diff: after LOW ${p(o.q1.L.oos_diff)} (same sign as k3: ${o.q1.L.same_sign_as_k3}), after HIGH ${p(o.q1.H.oos_diff)} (${o.q1.H.same_sign_as_k3}) · remaining median TRAIN ${o.q2_rem_median.TRAIN} / OOS ${o.q2_rem_median.OOS} ATR`)
fs.writeFileSync(path.join(TURBO.root, 'docs', 'SWING_NEXTMOVE_15M_ATLAS.md'), L.join('\n') + '\n')
console.log('written docs/SWING_NEXTMOVE_15M_ATLAS.md (' + L.length + ' lines)')
