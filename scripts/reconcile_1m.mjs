// reconcile_1m.mjs — nightly: the twin's 1m store vs Polygon's CURRENT 1m bars (2026-10-08, R0). Polygon re-issues minutes (late quotes,
// whole ranges — measured); the store is append-only, so every minute Polygon now serves differently gets a CORRECTION line
// (src/data/corrections.js, ver 'reconcile'); minutes missing on either side are REPORTED, never invented. Window: the last N days up to
// 15 minutes ago (the newest minutes belong to the streamer's own late re-check). Output: data/master/reconcile_1m.json.
// Run by run_twin.mjs when src/core/reconcilePlan.js says so (every app start + daily + retries; window ≥ 7 days); by hand: node scripts/reconcile_1m.mjs [days=2]
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO, correctionsFile } from '../src/core/paths.js'
import { SYMBOLS } from '../src/data/symbols.js'
import { loadBars } from '../src/data/backfillReader.js'
import { fetchAggs } from '../src/data/liveFeed.js'
import { diffMinutes, appendCorrection, appendDeletion } from '../src/data/corrections.js'

const DAYS = +(process.argv[2] || 2), now = Date.now(), to = Math.floor((now - 15 * 60000) / 60000) * 60000 - 1, from = Math.floor((now - DAYS * 86400000) / 60000) * 60000
const out = { at: new Date(now).toISOString(), window: [new Date(from).toISOString(), new Date(to).toISOString()], symbols: {} }
for (const s of SYMBOLS) {
  try {
    const store = (await loadBars(s.sym, '1m', { from, to })).bars
    const rest = (await fetchAggs(s.poly, '1m', from, to)).filter((b) => b.t >= from && b.t <= to)
    const d = diffMinutes(store, rest)
    for (const c of d.corrections) appendCorrection(correctionsFile(s.sym), c, { src: 'rest', ver: 'reconcile' })
    // EXTRA minutes (stored, but no longer in Polygon's current data — Polygon removes minutes it once published, measured 2026-10-17) are
    // DELETED at read time, with a safeguard against a transient REST gap: only minutes ≥ 6 h old whose surroundings REST does cover
    // (a REST bar within 30 min before AND after) — otherwise they stay reported only.
    const rt = rest.map((b) => b.t).sort((a, b) => a - b), near = (t, dir) => rt.some((x) => (dir < 0 ? x < t && t - x <= 1800000 : x > t && x - t <= 1800000))
    const removable = d.extra.filter((t) => t < now - 6 * 3600000 && near(t, -1) && near(t, 1))
    for (const t of removable) appendDeletion(correctionsFile(s.sym), t, { src: 'rest', ver: 'reconcile-removed' })
    out.symbols[s.sym] = { store: store.length, rest: rest.length, same: d.same, corrected: d.corrections.length, removed: removable.length, missing: d.missing.length, extra: d.extra.length,
      missing_sample: d.missing.slice(0, 5).map((t) => new Date(t).toISOString()), extra_sample: d.extra.slice(0, 5).map((t) => new Date(t).toISOString()) }
  } catch (e) { out.symbols[s.sym] = { error: String(e.message).slice(0, 200) } }
}
fs.writeFileSync(path.join(TURBO.master, 'reconcile_1m.json'), JSON.stringify(out, null, 1))
for (const [k, v] of Object.entries(out.symbols)) console.log(k.padEnd(7), JSON.stringify(v))
// STATE for src/core/reconcilePlan.js (2026-10-14): success only when EVERY symbol was reconciled; any error → failedAt + exit code 1,
// so run_twin logs the failure and retries (before: a DNS failure was logged as exit 0 and never retried)
const SFILE = path.join(TURBO.master, 'reconcile_state.json'), errs = Object.entries(out.symbols).filter(([, v]) => v.error).map(([k]) => k)
let st = {}; try { st = JSON.parse(fs.readFileSync(SFILE, 'utf8')) } catch { /* first run */ }
if (errs.length) Object.assign(st, { failedAt: now, failedSymbols: errs, lastError: out.symbols[errs[0]].error })
else Object.assign(st, { okAt: now, coveredFrom: from, coveredTo: to, days: DAYS, corrected: Object.values(out.symbols).reduce((a, v) => a + (v.corrected || 0), 0), missing: Object.values(out.symbols).reduce((a, v) => a + (v.missing || 0), 0) })
fs.writeFileSync(SFILE, JSON.stringify(st, null, 1))
fs.appendFileSync(path.join(TURBO.master, 'reconcile_history.jsonl'), JSON.stringify({ at: out.at, days: DAYS, ok: !errs.length, errors: errs, corrected: st.corrected, missing: st.missing }) + '\n')
if (errs.length) { console.error(`reconcile FAILED for ${errs.join(', ')} — will retry`); process.exitCode = 1 }
