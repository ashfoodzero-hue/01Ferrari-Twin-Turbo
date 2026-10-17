// ════════════════════════════════════════════════════════════════════════════════
// vol_audit/preload.mjs — VOLUME AUDIT harness (docs/VOLUME_AUDIT_SPEC.md, pre-registered 2026-10-17). RESEARCH ONLY.
// Run an UNCHANGED study with:  VOL_MODE=raw|drop|cme VOL_WINDOW=full|cme2y node --import ./scripts/vol_audit/preload.mjs scripts/study_x.mjs
// ────────────────────────────────────────────────────────────────────────────────
// • XAUUSD bars from loadBars / streamBars get v per mode: raw = unchanged · drop = 1 · cme = Σ GOLD_FUT 1m volume over [t, t + tf) (TIME only).
// • drop also treats the modules' volume THRESHOLDS as satisfied (fvg s2, orderBlock strong, marketState volMult 0) through wrapper modules.
// • cme2y: HISTORY_CONTINUOUS_FROM := 2024-12-01 (the study's own FROM / split then sit inside the CME era).
// • VOL_CAND_FROM (ISO): candidates_15m_full.jsonl is read filtered to t ≥ it (state-gate study: its bar indices need the full window).
// • Every write into data/master/ goes to data/master/vol_audit/<mode>_<window>/; reads prefer that folder when the file exists there.
// No file in src/ is modified; nothing live imports this.
// ════════════════════════════════════════════════════════════════════════════════
import { registerHooks, syncBuiltinESMExports } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const MODE = process.env.VOL_MODE || 'raw', WINDOW = process.env.VOL_WINDOW || 'full'
if (!['raw', 'drop', 'cme'].includes(MODE) || !['full', 'cme2y'].includes(WINDOW)) throw new Error(`vol_audit: bad VOL_MODE ${MODE} / VOL_WINDOW ${WINDOW}`)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const W = (f) => pathToFileURL(path.join(ROOT, 'scripts', 'vol_audit', 'wrap', f)).href
const REDIRECT = { 'src/data/backfillReader.js': W('backfillReader.mjs') }
if (WINDOW === 'cme2y') REDIRECT['src/core/paths.js'] = W('paths.mjs')
if (MODE === 'drop') Object.assign(REDIRECT, { 'src/master/fvg.js': W('fvg.mjs'), 'src/master/orderBlock.js': W('orderBlock.mjs'), 'src/master/marketState.js': W('marketState.mjs') })
const targets = Object.entries(REDIRECT).map(([rel, to]) => [pathToFileURL(path.join(ROOT, rel)).href, to])

registerHooks({
  resolve(specifier, context, next) {
    const r = next(specifier, context)
    if (r.url.includes('?vol_orig')) return r
    for (const [from, to] of targets) if (r.url === from) return { ...r, url: to, shortCircuit: true }
    return r
  },
})

// ── artifact isolation ─────────────────────────────────────────────────────────
const TAG = `${MODE}_${WINDOW}${process.env.VOL_TAG ? '_' + process.env.VOL_TAG : ''}`
const MASTER = path.join(ROOT, 'data', 'master'), OUTDIR = path.join(MASTER, 'vol_audit', TAG)
fs.mkdirSync(OUTDIR, { recursive: true })
const inMaster = (p) => typeof p === 'string' && path.dirname(path.resolve(p)).toLowerCase() === MASTER.toLowerCase()
const to = (p) => path.join(OUTDIR, path.basename(p))
const { writeFileSync, appendFileSync, readFileSync } = fs
const CAND_FROM = process.env.VOL_CAND_FROM ? Date.parse(process.env.VOL_CAND_FROM) : null
fs.writeFileSync = (p, ...a) => writeFileSync(inMaster(p) ? to(p) : p, ...a)
fs.appendFileSync = (p, ...a) => appendFileSync(inMaster(p) ? to(p) : p, ...a)
fs.readFileSync = (p, ...a) => {
  if (inMaster(p) && fs.existsSync(to(p))) return readFileSync(to(p), ...a)
  const out = readFileSync(p, ...a)
  if (CAND_FROM != null && typeof p === 'string' && path.basename(p) === 'candidates_15m_full.jsonl')
    return String(out).split('\n').filter((l) => l && JSON.parse(l).t >= CAND_FROM).join('\n') + '\n'
  return out
}
syncBuiltinESMExports()
process.env.VOL_AUDIT_ACTIVE = TAG
console.log(`[vol_audit] mode ${MODE} · window ${WINDOW}${CAND_FROM != null ? ' · candidates from ' + process.env.VOL_CAND_FROM : ''} · artifacts → ${path.relative(ROOT, OUTDIR)}`)
