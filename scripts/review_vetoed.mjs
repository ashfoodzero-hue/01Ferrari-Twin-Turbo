// review_vetoed.mjs [--dry] — the V1H veto review (2026-10-20, Ashraf: "so the one-week review is ready with real numbers"). Scores any vetoed SCALP
// BUY whose trade is done (same code as the live tick: scripts/lib/veto_score.mjs) and prints vetoed vs kept. --dry: print only, write nothing.
import '../src/core/bootEnv.js'
import { updateVetoScores } from './lib/veto_score.mjs'

const DRY = process.argv.includes('--dry'), now = Date.now(), nowT = Math.floor(now / 60000) * 60000
const { added, summary: S } = await updateVetoScores({ nowT, write: !DRY })
const line = (name, x) => `  ${name.padEnd(26)} n ${String(x.n).padStart(3)} · WR ${x.wr == null ? '—' : (100 * x.wr).toFixed(0) + ' %'} · TP1 ${x.tp1_rate == null ? '—' : (100 * x.tp1_rate).toFixed(0) + ' %'} · net ${x.net >= 0 ? '+' : ''}${x.net} $/oz · ${x.per_trade == null ? '—' : (x.per_trade >= 0 ? '+' : '') + x.per_trade + ' $/trade'} · ${JSON.stringify(x.outcomes)}`
console.log(`🧭 V1H veto review — gate live since ${S.gate_live_since} (${S.days} days)${DRY ? ' (dry)' : ''}`)
console.log(`  vetoed BUY signals ${S.vetoed_signals} · scored ${S.vetoed_signals - S.pending} (+${added.length} now) · pending ${S.pending}`)
console.log(line('vetoed — every signal', S.vetoed_all)); console.log(line('vetoed — one box at a time', S.vetoed_one_at_a_time) + (S.vetoed_one_at_a_time.pending_box ? ' · 1 box still open (later signals wait)' : '')); console.log(line(`kept boxes (${S.kept.buys} BUY / ${S.kept.sells} SELL)`, S.kept))
console.log(`  priced as: ${S.priced_as}\n  ⚠ ${S.note}`)
