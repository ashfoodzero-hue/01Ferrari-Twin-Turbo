// review_refused.mjs [--dry] — what the IMPULSE_CONT market-state gate refused, priced by the live book's own resolver (scripts/lib/refusal_score.mjs,
// 2026-10-20, Ashraf: "so we can see what the state gate costs on SELLs"). --dry: print only, write nothing.
import '../src/core/bootEnv.js'
import { updateRefusalScores } from './lib/refusal_score.mjs'

const DRY = process.argv.includes('--dry')
const { added, summary: S } = await updateRefusalScores({ dry: DRY })
const line = (name, x) => `  ${name.padEnd(18)} settled ${String(x.settled).padStart(3)} (open ${x.open}) · target ${x.target} · scratch ${x.scratch} · stop ${x.stopped} · expired ${x.expired} · WR ${x.wr_ex_scratch == null ? '—' : (100 * x.wr_ex_scratch).toFixed(0) + ' %'} · net ${x.net >= 0 ? '+' : ''}${x.net} $/oz · ${x.per_filled_trade == null ? '—' : (x.per_filled_trade >= 0 ? '+' : '') + x.per_filled_trade + ' $/trade'}`
console.log(`🚧 IMPULSE_CONT refusals — journal since ${S.journal_since}${DRY ? ' (dry)' : ''}\n  refused ${S.refused_signals} (+${added} new) · unpriceable ${S.unpriceable} · why ${JSON.stringify(S.refused_why)}`)
for (const k of ['SELL', 'BUY', 'all']) console.log(line(`refused ${k}`, S.refused_priced[k]))
for (const k of ['SELL', 'BUY', 'all']) console.log(line(`taken ${k}`, S.taken[k]))
console.log(`  priced as: ${S.priced_as}\n  ⚠ ${S.note}`)
