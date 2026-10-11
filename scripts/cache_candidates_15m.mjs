// cache_candidates_15m.mjs — WINDOWED candidate generation → cached set (the scalable method).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P7 item ⑦ (2026-06-27). Carried VERBATIM into Ferrari Twin Turbo 2026-10-08 with ONE change:
// the bars are the twin's 15m RESAMPLED FROM ITS OWN POLYGON 1m STORE, from HISTORY_CONTINUOUS_FROM (2013-07-14) — the
// 1m-only history Ashraf directed. Output: the twin's data/master/candidates_15m_full.jsonl (never Turbo2's).
//
// generateCandidates() over the full 23y in ONE pass is impractical: the World-Model's active-level
// set grows across 564,577 bars so query(at) cost climbs (superlinear) — which is exactly why the
// prior 97% search WINDOWED the history. We do the same: generate per ~40k-bar window (WM reset each
// window keeps query() bounded → fast), with a PAD of left-context bars so levels near the window
// start are reconstructed, then KEEP only candidates whose GLOBAL bar index lands in the window's own
// disjoint range (no double-count). Each candidate's local index is remapped to the GLOBAL index so
// the harness's fold-assignment / grading / resolution all line up with the full bars array.
// Look-ahead-free is preserved (WM.query(at) is causal within each window). Honest limitation: levels
// older than PAD bars at a window boundary aren't carried across — negligible vs the full-load (the
// vast majority of armed setups reference recent structure; documented, not hidden).
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../src/data/backfillReader.js'
import { generateCandidates } from '../src/agents/strategy/search.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../src/core/paths.js'

const WIN = +(process.argv[2] || 40000)    // window size (bars) generated per pass
const PAD = +(process.argv[3] || 2000)     // left-context bars (≈3 weeks of 15m) for level reconstruction
const OUT = path.join(TURBO.master, 'candidates_15m_full.jsonl')
const META = path.join(TURBO.master, 'candidates_15m_full.meta.json')

const t0 = Date.now()
const VAL_TO = process.env.TURBO_VAL_TO ? Date.parse(process.env.TURBO_VAL_TO) : undefined   // frozen tape end (twin re-validation: 2026-10-08T15:45Z)
const { bars } = await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: VAL_TO })
const N = bars.length
console.log(`loaded ${N.toLocaleString()} bars in ${Date.now() - t0}ms (${new Date(bars[0].t).toISOString().slice(0, 10)} → ${new Date(bars.at(-1).t).toISOString().slice(0, 10)})`)

fs.mkdirSync(TURBO.master, { recursive: true })
const ws = fs.createWriteStream(OUT)
let total = 0, windows = 0
const tGen = Date.now()
for (let gStart = 0; gStart < N - 1; gStart += WIN) {
  const gEnd = Math.min(N, gStart + WIN)               // disjoint global range [gStart, gEnd)
  const sliceStart = Math.max(0, gStart - PAD)
  const slice = bars.slice(sliceStart, gEnd)
  const warmup = Math.max(200, gStart - sliceStart)    // skip the pad → candidates begin at global gStart
  const tw = Date.now()
  const { candidates } = generateCandidates(slice, { warmup })
  let kept = 0
  for (const c of candidates) {
    const gi = sliceStart + c.i                          // local → GLOBAL index
    if (gi < gStart || gi >= gEnd) continue              // keep only this window's own range (no overlap dbl-count)
    ws.write(JSON.stringify({ i: gi, t: c.t, setup: c.setup, direction: c.direction, entry: c.entry, atr: c.atr, score: c.score, confidence: c.confidence, lead_atr: c.lead_atr, in_discount: c.in_discount, aligned: c.aligned, mom_dir: c.mom_dir, mom_score: c.mom_score }) + '\n')
    kept++
  }
  total += kept; windows++
  console.log(`  window ${windows} [${new Date(bars[gStart].t).toISOString().slice(0, 10)}→${new Date(bars[gEnd - 1].t).toISOString().slice(0, 10)}] +${kept} cand (${Math.round((Date.now() - tw) / 1000)}s)`)
}
ws.end(); await new Promise((res) => ws.on('finish', res))

const meta = {
  symbol: 'XAUUSD', tf: '15m', base: 'polygon 1m (twin store), resampled', history_from: new Date(HISTORY_CONTINUOUS_FROM).toISOString(), method: 'windowed', win: WIN, pad: PAD, windows,
  bars: N, from: bars[0].t, to: bars.at(-1).t,
  from_iso: new Date(bars[0].t).toISOString().slice(0, 10), to_iso: new Date(bars.at(-1).t).toISOString().slice(0, 10),
  candidates: total, gen_seconds: Math.round((Date.now() - tGen) / 1000),
}
fs.writeFileSync(META, JSON.stringify(meta, null, 2))
console.log(`\nwrote ${total.toLocaleString()} candidates → ${OUT}`)
console.log(JSON.stringify(meta, null, 2))
