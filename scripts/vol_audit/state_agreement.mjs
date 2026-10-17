// vol_audit/state_agreement.mjs — the LIVE market-state gate under three volumes (docs/VOLUME_AUDIT_SPEC.md rule 5). Descriptive.
// Every closed 15m bar from 2024-12-08 → TO: readMarketState on the last 401 bars (the state-gate study's window) with
//   RAW = spot quote count · CME = Σ GOLD_FUT 1m volume in the candle (time-aligned) · DROP = volume condition removed (volMult 0).
// RESEARCH ONLY — writes data/master/vol_audit/state_agreement.json.
import '../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { TURBO } from '../../src/core/paths.js'
import { readMarketState } from '../../src/master/marketState.js'
import { cmeVolume } from './wrap/volume.mjs'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z'), FROM = Date.UTC(2024, 11, 8)
const raw = (await loadBars('XAUUSD', '15m', { from: FROM - 10 * 86400000, to: TO })).bars
const cme = raw.map((b) => ({ ...b, v: cmeVolume(b.t, b.t + 900000) })), drop = raw.map((b) => ({ ...b, v: 1 }))
const key = (s) => s?.state ?? 'NULL', side = (s) => s?.allowedSide ?? (s?.canTrade ? 'ANY' : 'NONE')
const cnt = { n: 0, state: {}, pairs: { raw_cme: 0, raw_drop: 0, cme_drop: 0 }, side_pairs: { raw_cme: 0, raw_drop: 0, cme_drop: 0 }, by_year: {} }
for (let i = 400; i < raw.length; i++) { if (raw[i].t < FROM) continue
  const s = { raw: readMarketState(raw.slice(i - 400, i + 1)), cme: readMarketState(cme.slice(i - 400, i + 1)), drop: readMarketState(drop.slice(i - 400, i + 1), { volMult: 0 }) }
  cnt.n++; const y = new Date(raw[i].t).getUTCFullYear(); cnt.by_year[y] ??= { n: 0, raw_cme_state_diff: 0, raw_drop_state_diff: 0 }; cnt.by_year[y].n++
  for (const [m, st] of Object.entries(s)) { cnt.state[m] ??= {}; cnt.state[m][key(st)] = (cnt.state[m][key(st)] || 0) + 1 }
  for (const [p, [a, b]] of Object.entries({ raw_cme: ['raw', 'cme'], raw_drop: ['raw', 'drop'], cme_drop: ['cme', 'drop'] })) {
    if (key(s[a]) !== key(s[b])) { cnt.pairs[p]++; if (p !== 'cme_drop') cnt.by_year[y][p + '_state_diff']++ }
    if (side(s[a]) !== side(s[b])) cnt.side_pairs[p]++ } }
const pct = (x) => +(100 * x / cnt.n).toFixed(2)
const res = { at: new Date().toISOString(), from: new Date(FROM).toISOString(), to: new Date(TO).toISOString(), bars: cnt.n, state_counts: cnt.state,
  state_differs_pct: Object.fromEntries(Object.entries(cnt.pairs).map(([k, v]) => [k, pct(v)])), allowed_side_differs_pct: Object.fromEntries(Object.entries(cnt.side_pairs).map(([k, v]) => [k, pct(v)])), by_year: cnt.by_year }
fs.mkdirSync(path.join(TURBO.master, 'vol_audit'), { recursive: true })
fs.writeFileSync(path.join(TURBO.master, 'vol_audit', 'state_agreement.json'), JSON.stringify(res, null, 1))
console.log(JSON.stringify(res, null, 1))
