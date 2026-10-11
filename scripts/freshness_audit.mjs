// freshness_audit.mjs — print the twin's freshness report (every declared flow judged against its own contract).
import { freshnessReport } from '../src/core/freshness.js'
const r = freshnessReport()
console.log(`freshness @ ${r.at} · market ${r.market_open ? 'OPEN' : 'closed'} · stale critical ${r.stale_critical} · stale any ${r.stale_any}`)
for (const f of r.flows) console.log(`  ${f.state.padEnd(8)} ${f.file.padEnd(24)} age ${f.age_s == null ? '—' : f.age_s + 's'} / max ${f.max_age_s ?? '—'}s · ${f.writer}${f.why ? ' · ' + f.why : ''}`)
process.exitCode = r.stale_critical ? 1 : 0
