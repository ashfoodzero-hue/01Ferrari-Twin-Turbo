// ════════════════════════════════════════════════════════════════════════════════
// gldGamma.js — dealer GAMMA levels from GLD options (Polygon), converted to XAU spot (2026-10-09; Ashraf: "build gamma levels from GLD").
// ────────────────────────────────────────────────────────────────────────────────
// MEASURED reach (2026-10-09): /v3/snapshot/options/GLD gives the CURRENT chain only — open interest (prior close, updated once a day)
// + Polygon's greeks (98.3 % of OI has gamma) — a `date` parameter is ignored → NO historical OI → gamma levels cannot be backtested.
// They are recorded once a day from now on (scripts/gamma_snapshot.mjs → data/options/gld/YYYY-MM-DD.json) so a FORWARD test can grow.
// GLD stock bars are DELAYED 15 min on our plan; the GLD→XAU ratio uses the same minute on both (zero guessing: no minute pair = no ratio).
// Convention (standard dealer-GEX, an ASSUMPTION about who holds what — stated, not hidden): dealers are long calls / short puts →
//   call GEX = +γ·OI·100·S²·1 %, put GEX = −γ·OI·100·S²·1 %  ($ of GLD delta change per 1 % move)
// Levels: CALL WALL = strike with the largest call GEX · PUT WALL = strike with the largest |put GEX| · MAGNETS = the 5 largest |net GEX|
// strikes · FLIP = zero-gamma spot from Black-Scholes re-pricing with each contract's IV (gammaProfile) · regime = sign
// of total net GEX (+ = dealers long gamma: they sell rallies / buy dips; − = they chase moves). Contracts without gamma are skipped and
// the OI coverage is reported.
// ════════════════════════════════════════════════════════════════════════════════
import { polygonKey } from './liveFeed.js'
import { fetchJsonResilient } from './netResolve.js'

export const GAMMA = Object.freeze({ maxDays: 60, magnets: 5 })

/** The current GLD chain out to maxDays: [{ strike, type, exp, oi, gamma, iv }] + OI coverage. */
export async function fetchGldChain({ maxDays = GAMMA.maxDays, now = Date.now() } = {}) {
  const lte = new Date(now + maxDays * 86400000).toISOString().slice(0, 10), gte = new Date(now).toISOString().slice(0, 10)
  let url = `https://api.polygon.io/v3/snapshot/options/GLD?expiration_date.gte=${gte}&expiration_date.lte=${lte}&limit=250&apiKey=${polygonKey()}`
  const rows = []; let oiAll = 0, pages = 0
  while (url && pages < 80) {
    const r = await fetchJsonResilient(url, { timeoutMs: 20000 }); pages++
    if (!r.json?.results) throw new Error('GLD chain: no results (page ' + pages + ')')
    for (const x of r.json.results) { const oi = x.open_interest || 0; oiAll += oi
      if (x.greeks?.gamma == null || !(oi > 0)) continue
      rows.push({ strike: x.details.strike_price, type: x.details.contract_type, exp: x.details.expiration_date, oi, gamma: x.greeks.gamma, iv: x.implied_volatility ?? null }) }
    url = r.json.next_url ? r.json.next_url + `&apiKey=${polygonKey()}` : null
  }
  const oiG = rows.reduce((s, r) => s + r.oi, 0)
  return { rows, pages, contracts_with_gamma: rows.length, oi_total: oiAll, oi_with_gamma: oiG, oi_coverage: oiAll ? +(oiG / oiAll).toFixed(4) : 0 }
}

// Black-Scholes gamma (r = 0 — stated assumption; for ≤ 60-day options the rate moves gamma negligibly). T in years to 20:00 UTC on expiry.
const nPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
export function bsGamma(S, K, T, iv) { if (!(T > 0) || !(iv > 0)) return 0; const v = iv * Math.sqrt(T), d1 = (Math.log(S / K) + 0.5 * iv * iv * T) / v; return nPdf(d1) / (S * v) }
const yearsTo = (exp, now) => (Date.parse(exp + 'T20:00:00Z') - now) / (365.25 * 86400000)

/**
 * ZERO-GAMMA ("flip"): total dealer GEX re-priced with each contract's own IV at hypothetical spots S' = S·(0.90 … 1.10) step 0.25 %;
 * the flip = the sign change nearest S (linear interpolation). null when GEX keeps one sign over ±10 %. Contracts already expired skipped.
 */
export function gammaProfile(rows, S, now = Date.now()) {
  const live = rows.filter((r) => yearsTo(r.exp, now) > 0 && r.iv > 0), prof = []
  for (let k = -40; k <= 40; k++) { const Sp = S * (1 + k * 0.0025); let g = 0
    for (const r of live) g += bsGamma(Sp, r.strike, yearsTo(r.exp, now), r.iv) * r.oi * 100 * Sp * Sp * 0.01 * (r.type === 'call' ? 1 : -1)
    prof.push({ S: +Sp.toFixed(3), gex: Math.round(g) }) }
  let flip = null, best = Infinity
  for (let k = 1; k < prof.length; k++) { const a = prof[k - 1], b = prof[k]
    if (Math.sign(a.gex) !== Math.sign(b.gex) && a.gex !== 0) { const z = a.S + (b.S - a.S) * (a.gex / (a.gex - b.gex)); if (Math.abs(z - S) < best) { best = Math.abs(z - S); flip = +z.toFixed(3) } } }
  return { flip, profile: prof, contracts: live.length }
}

/** GEX levels in GLD prices (pure). S = GLD price. */
export function gexLevels(rows, S) {
  const by = new Map()
  for (const r of rows) { const g = r.gamma * r.oi * 100 * S * S * 0.01 * (r.type === 'call' ? 1 : -1)
    const e = by.get(r.strike) ?? { strike: r.strike, call: 0, put: 0, oi: 0 }; if (r.type === 'call') e.call += g; else e.put += g; e.oi += r.oi; by.set(r.strike, e) }
  const K = [...by.values()].map((e) => ({ ...e, net: e.call + e.put })).sort((a, b) => a.strike - b.strike)
  if (!K.length) return null
  const callWall = K.reduce((m, e) => (e.call > m.call ? e : m)), putWall = K.reduce((m, e) => (e.put < m.put ? e : m))
  const total = K.reduce((s, e) => s + e.net, 0)
  const magnets = [...K].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, GAMMA.magnets).map((e) => ({ strike: e.strike, net: Math.round(e.net) }))
  return { S, total_net_gex: Math.round(total), regime: total >= 0 ? 'POSITIVE (dealers long gamma — they sell rallies, buy dips)' : 'NEGATIVE (dealers short gamma — they chase moves)',
    call_wall: { strike: callWall.strike, gex: Math.round(callWall.call) }, put_wall: { strike: putWall.strike, gex: Math.round(putWall.put) }, flip: null, magnets,
    strikes: K.filter((e) => Math.abs(e.strike - S) / S <= 0.12).map((e) => ({ strike: e.strike, call: Math.round(e.call), put: Math.round(e.put), net: Math.round(e.net) })) }
}

/** Convert a GLD-price level object to XAU spot with the measured same-minute ratio. */
export function toXau(L, ratio) {
  const x = (v) => (v == null ? null : +(v * ratio).toFixed(2))
  return { call_wall: x(L.call_wall.strike), put_wall: x(L.put_wall.strike), flip: x(L.flip), magnets: L.magnets.map((m) => ({ xau: x(m.strike), strike: m.strike, net: m.net })) }
}
