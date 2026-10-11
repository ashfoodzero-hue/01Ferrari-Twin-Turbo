// gamma_snapshot.mjs — record TODAY's GLD gamma levels (src/data/gldGamma.js) → data/options/gld/YYYY-MM-DD.json (2026-10-09).
// Polygon keeps no historical open interest, so this daily file IS the history the forward test (scripts/study_gamma_levels.mjs) needs.
// Run by run_twin.mjs once per US trading day at 14:30 UTC (after the US open: greeks priced on the day's quotes; OI = prior close).
//   --force : rewrite today's file  ·  --print : print the levels, write nothing
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { loadBars } from '../src/data/backfillReader.js'
import { polygonKey } from '../src/data/liveFeed.js'
import { fetchJsonResilient } from '../src/data/netResolve.js'
import { fetchGldChain, gexLevels, gammaProfile, toXau, GAMMA } from '../src/data/gldGamma.js'

const DIR = path.join(TURBO.root, 'data', 'options', 'gld'), day = new Date().toISOString().slice(0, 10), FILE = path.join(DIR, day + '.json')
if (fs.existsSync(FILE) && !process.argv.includes('--force') && !process.argv.includes('--print')) { console.log('  gamma: today already recorded'); process.exit(0) }
// GLD price + the GLD→XAU ratio on the SAME minute (GLD is 15 min delayed; the newest GLD minute that gold also has)
const g = await fetchJsonResilient(`https://api.polygon.io/v2/aggs/ticker/GLD/range/1/minute/${new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10)}/${day}?limit=5000&sort=desc&apiKey=${polygonKey()}`, { timeoutMs: 15000 })
const G = (g.json?.results ?? []).map((b) => ({ t: b.t, c: b.c }))
if (!G.length) { console.error('  ⛔ gamma: no GLD minute bars — BLOCKED (no ratio, no levels)'); process.exit(2) }
const X = new Map((await loadBars('XAUUSD', '1m', { from: G.at(-1).t, to: G[0].t })).bars.map((b) => [b.t, b.c]))
const pair = G.find((b) => X.has(b.t)); if (!pair) { console.error('  ⛔ gamma: no minute where both GLD and XAU exist — BLOCKED'); process.exit(2) }
const ratio = X.get(pair.t) / pair.c
const chain = await fetchGldChain()
if (chain.oi_coverage < 0.9) { console.error(`  ⛔ gamma: greeks cover only ${(100 * chain.oi_coverage).toFixed(1)} % of OI — BLOCKED`); process.exit(2) }
const L = gexLevels(chain.rows, pair.c), P = gammaProfile(chain.rows, pair.c); L.flip = P.flip; L.profile = P.profile
const out = { day, at: new Date().toISOString(), source: 'Polygon /v3/snapshot/options/GLD (OI = prior close; greeks by Polygon) · GLD 1m (15 min delayed) · XAU 1m (twin store)',
  params: GAMMA, gld_price: pair.c, gld_minute: new Date(pair.t).toISOString(), xau_same_minute: X.get(pair.t), ratio: +ratio.toFixed(6),
  coverage: { pages: chain.pages, contracts_with_gamma: chain.contracts_with_gamma, oi_total: chain.oi_total, oi_with_gamma: chain.oi_with_gamma, oi_coverage: chain.oi_coverage },
  gld_levels: L, xau_levels: toXau(L, ratio), chain: chain.rows }
if (process.argv.includes('--print')) { console.log(JSON.stringify({ ...out, chain: `${out.chain.length} rows`, gld_levels: { ...L, strikes: `${L.strikes.length} strikes`, profile: L.profile.filter((_, k) => k % 8 === 0) } }, null, 1)); process.exit(0) }
fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE + '.tmp', JSON.stringify(out)); fs.renameSync(FILE + '.tmp', FILE)
console.log(`  γ gamma ${day}: ${L.regime.split(' ')[0]} · call wall ${out.xau_levels.call_wall} · put wall ${out.xau_levels.put_wall} · flip ${out.xau_levels.flip} (XAU) · OI cov ${(100 * chain.oi_coverage).toFixed(1)} %`)
