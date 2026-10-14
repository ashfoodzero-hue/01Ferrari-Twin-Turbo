// probe_history_revisions.mjs — READ-ONLY probe (2026-10-14): for sample UTC days, compare the 1m store (with corrections applied) against
// Polygon's CURRENT 1m bars, per symbol. Writes nothing to the store. usage: node scripts/probe_history_revisions.mjs SYM YYYY-MM-DD [...]
import '../src/core/bootEnv.js'
import { BY_SYM } from '../src/data/symbols.js'
import { loadBars } from '../src/data/backfillReader.js'
import { fetchAggs } from '../src/data/liveFeed.js'
import { diffMinutes } from '../src/data/corrections.js'
const [sym, ...days] = process.argv.slice(2)
for (const d of days) { const from = Date.parse(d + 'T00:00:00Z'), to = from + 86400000 - 1
  const store = (await loadBars(sym, '1m', { from, to })).bars, rest = (await fetchAggs(BY_SYM[sym].poly, '1m', from, to)).filter((b) => b.t >= from && b.t <= to), r = diffMinutes(store, rest)
  let maxd = 0, sum = 0; const S = new Map(store.map((b) => [b.t, b])); for (const c of r.corrections) { const s = S.get(c.t), dd = Math.max(...['o', 'h', 'l', 'c'].map((k) => Math.abs(c[k] - s[k]))); maxd = Math.max(maxd, dd); sum += dd }
  console.log(`${sym} ${d}: store ${store.length} polygon ${rest.length} same ${r.same} differ ${r.corrections.length} (max $${maxd.toFixed(3)}, avg $${(r.corrections.length ? sum / r.corrections.length : 0).toFixed(3)}) missing ${r.missing.length} extra ${r.extra.length}`) }
