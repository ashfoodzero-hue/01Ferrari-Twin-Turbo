// ════════════════════════════════════════════════════════════════════════════════
// worldModel.js — the persistent "left side of the chart" (ARCHITECTURE §0 rule 4).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
//
// Holds every structural element discovered from price — swings, S/R levels, order
// blocks, FVGs, liquidity pools, and a volume profile (POC/VAH/VAL) — each carried
// forward with status · age · strength. Two timestamps per element:
//   formed_t     = where it sits on the chart
//   confirmed_t  = when it became KNOWABLE (look-ahead-free, R3)
// plus per-lifecycle-event timestamps (mitigated/broken/filled/swept). That makes
// query(at) a PURE function of `at`: it returns only elements confirmed by `at`, with
// status derived only from events that happened by `at`. No future knowledge can leak —
// this is the invariant the smoke test proves (§4.1: this is where bias would re-enter).
//
// ingest() is batch (for backtest replay over the read-only 23y history); the same
// query(at) is what live agents will call. Writes go ONLY under TURBO.* (isolation).
// ════════════════════════════════════════════════════════════════════════════════

import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from './paths.js'
import { atr } from './indicators.js'
import {
  detectSwings, detectLevels, detectOrderBlocks, detectFVGs, detectLiquidity, computeVolumeProfile,
} from './structure/index.js'

const DEFAULT_CFG = Object.freeze({
  atrPeriod: 14,
  swing: { left: 2, right: 2 },
  level: { tolAtrMult: 0.5, minTouches: 2, breakTolMult: 0.5 },
  ob: { lookback: 20 },
  fvg: { minSize: 0 },
  liq: { tolAtrMult: 0.15, minPool: 2 },
  vp: { bins: 50, valueAreaPct: 0.70, window: 480 },   // window in bars for the rolling profile
})

export class WorldModel {
  constructor(symbol, tf, cfg = {}) {
    this.symbol = symbol
    this.tf = tf
    this.cfg = { ...DEFAULT_CFG, ...cfg }
    this.bars = []
    this.atr = []
    this.idxByT = new Map()
    this.swings = []
    this.levels = []
    this.orderBlocks = []
    this.fvgs = []
    this.liquidity = []
    this.volumeProfile = null   // profile as-of the last bar (POC/VAH/VAL exposed as levels)
    this.builtAt = null
  }

  // ── Build ────────────────────────────────────────────────────────────────────
  ingest(bars) {
    this.bars = bars
    this.idxByT = new Map(bars.map((b, i) => [b.t, i]))
    this.atr = atr(bars, this.cfg.atrPeriod)
    const atrAt = (i) => this.atr[i]

    this.swings = detectSwings(bars, this.cfg.swing)
    this.levels = detectLevels(this.swings, atrAt, this.cfg.level)
    this.orderBlocks = detectOrderBlocks(bars, this.swings, this.cfg.ob)
    this.fvgs = detectFVGs(bars, this.cfg.fvg)
    this.liquidity = detectLiquidity(this.swings, this.atr, this.cfg.liq)
    this._epoch = (this._epoch ?? 0) + 1; this._cursor = null   // rebuilt elements ⇒ the alive-set cursor is void

    this.levels.forEach((l) => this._resolveLevel(l))
    this.orderBlocks.forEach((o) => this._resolveOB(o))
    this.fvgs.forEach((f) => this._resolveFVG(f))
    this.liquidity.forEach((p) => this._resolveLiquidity(p))

    // Rolling Volume Profile over the last `window` bars (as-of the final bar).
    const w = this.cfg.vp.window
    const slice = bars.slice(Math.max(0, bars.length - w))
    this.volumeProfile = slice.length ? { ...computeVolumeProfile(slice, this.cfg.vp), confirmed_t: bars[bars.length - 1].t, window_bars: slice.length } : null

    this.builtAt = new Date().toISOString()   // metadata only (excluded from determinism checks)
    return this
  }

  /** Volume Profile as-of a query time `at` (rolling window ending at the last bar ≤ at). */
  volumeProfileAt(at) {
    const end = this._lastIdxAtOrBefore(at)
    if (end < 0) return null
    const w = this.cfg.vp.window
    const slice = this.bars.slice(Math.max(0, end - w + 1), end + 1)
    if (!slice.length) return null
    return { ...computeVolumeProfile(slice, this.cfg.vp), confirmed_t: this.bars[end].t, window_bars: slice.length }
  }

  // ── Lifecycle resolvers (each event keeps its own timestamp) ───────────────────
  _startIdx(confirmed_t) { return (this.idxByT.get(confirmed_t) ?? -1) + 1 }

  _resolveLevel(l) {
    if (l.confirmed_t == null) return
    let prevSide = null
    for (let i = this._startIdx(l.confirmed_t); i < this.bars.length; i++) {
      const b = this.bars[i]
      const tol = this.cfg.level.breakTolMult * (this.atr[i] || l.price * 0.001)
      const side = Math.sign(b.c - l.price)
      if (prevSide !== null && side !== 0 && side !== prevSide && Math.abs(b.c - l.price) > tol) { l.broken_t = b.t; break }
      if (side !== 0) prevSide = side
    }
  }

  _resolveOB(o) {
    for (let i = this._startIdx(o.confirmed_t); i < this.bars.length; i++) {
      const b = this.bars[i]
      if (o.mitigated_t == null && b.l <= o.high && b.h >= o.low) o.mitigated_t = b.t   // price returned into the zone
      if (o.direction === 'BULL' && b.c < o.low) { o.broken_t = b.t; break }            // demand invalidated
      if (o.direction === 'BEAR' && b.c > o.high) { o.broken_t = b.t; break }           // supply invalidated
    }
  }

  _resolveFVG(f) {
    for (let i = this._startIdx(f.confirmed_t); i < this.bars.length; i++) {
      const b = this.bars[i]
      if (f.entered_t == null && b.l <= f.high && b.h >= f.low) f.entered_t = b.t       // first touch into gap
      if (f.direction === 'BULL' && b.l <= f.low) { f.filled_t = b.t; break }           // gap fully filled
      if (f.direction === 'BEAR' && b.h >= f.high) { f.filled_t = b.t; break }
    }
  }

  _resolveLiquidity(p) {
    for (let i = this._startIdx(p.confirmed_t); i < this.bars.length; i++) {
      const b = this.bars[i]
      if (p.side === 'BUY_SIDE' && b.h > p.price) { p.swept_t = b.t; break }            // EQH taken
      if (p.side === 'SELL_SIDE' && b.l < p.price) { p.swept_t = b.t; break }           // EQL taken
    }
  }

  _lastIdxAtOrBefore(at) {
    // bars ascending → linear-from-end is fine for windows; binary search for big sets
    let loIdx = 0, hiIdx = this.bars.length - 1, ans = -1
    while (loIdx <= hiIdx) {
      const mid = (loIdx + hiIdx) >> 1
      if (this.bars[mid].t <= at) { ans = mid; loIdx = mid + 1 } else hiIdx = mid - 1
    }
    return ans
  }

  // ── Query (look-ahead-free) ────────────────────────────────────────────────────
  /**
   * Structure in play as-of time `at`. Returns only elements confirmed by `at`, with
   * status computed only from events that happened by `at`. `price` (optional) classifies
   * levels as support/resistance from current price. `activeOnly` drops terminal states.
   */
  query(at, { activeOnly = true, price = null, withProfile = true } = {}) {
    const knownBy = (el) => el.confirmed_t != null && el.confirmed_t <= at
    const evBy = (t) => t != null && t <= at
    const refPrice = price ?? (() => { const i = this._lastIdxAtOrBefore(at); return i >= 0 ? this.bars[i].c : null })()

    // ⏱ FAST PATH (2026-09-07). Profiled: 78% of a 113-s paper tick was THIS function — the strategy backtest calls
    // it once per bar over a 400-day window (~26k calls) and every call re-scanned and re-mapped every element.
    // With activeOnly the answer is "confirmed by `at` and not yet terminal at `at`"; because callers advance `at`
    // monotonically, a per-model cursor keeps that alive set incrementally (an element that is terminal at `at`
    // stays terminal for every later `at`). Any backward `at` or a rebuilt model resets the cursor, so the result
    // is BY CONSTRUCTION the same set the full scan returns — smoke_world_model proves byte-parity over every bar,
    // ascending and shuffled. activeOnly:false keeps the original scan below, untouched. Output order = original
    // array order, exactly as before.
    const alive = activeOnly ? this._aliveAt(at) : null
    const known = (arr, key) => (alive ? alive[key].map((i) => arr[i]) : arr.filter(knownBy))

    const levels = known(this.levels, 'levels').map((l) => ({
      kind: 'level', price: +l.price.toFixed(3), strength: l.strength, touches: l.touches.length,
      formed_t: l.formed_t, confirmed_t: l.confirmed_t,
      status: evBy(l.broken_t) ? 'broken' : 'active',
      side: refPrice == null ? undefined : (refPrice >= l.price ? 'support' : 'resistance'),
      age_ms: at - l.formed_t,
    })).filter((l) => !activeOnly || l.status === 'active')

    const orderBlocks = known(this.orderBlocks, 'orderBlocks').map((o) => ({
      kind: 'ob', direction: o.direction, low: +o.low.toFixed(3), high: +o.high.toFixed(3),
      formed_t: o.formed_t, confirmed_t: o.confirmed_t,
      status: evBy(o.broken_t) ? 'broken' : evBy(o.mitigated_t) ? 'mitigated' : 'unmitigated',
      age_ms: at - o.formed_t,
    })).filter((o) => !activeOnly || o.status !== 'broken')

    const fvgs = known(this.fvgs, 'fvgs').map((f) => ({
      kind: 'fvg', direction: f.direction, low: +f.low.toFixed(3), high: +f.high.toFixed(3),
      formed_t: f.formed_t, confirmed_t: f.confirmed_t,
      status: evBy(f.filled_t) ? 'filled' : evBy(f.entered_t) ? 'partial' : 'unfilled',
      age_ms: at - f.formed_t,
    })).filter((f) => !activeOnly || f.status !== 'filled')

    const liquidity = known(this.liquidity, 'liquidity').map((p) => ({
      kind: 'liquidity', side: p.side, level: p.level, price: +p.price.toFixed(3), count: p.count,
      formed_t: p.formed_t, confirmed_t: p.confirmed_t,
      status: evBy(p.swept_t) ? 'swept' : 'resting',
      age_ms: at - p.formed_t,
    })).filter((p) => !activeOnly || p.status === 'resting')

    const swingsKnown = this.swings.filter((s) => s.confirmed_t <= at).length

    return {
      symbol: this.symbol, tf: this.tf, at, ref_price: refPrice,
      levels, orderBlocks, fvgs, liquidity,
      volume_profile: withProfile ? this.volumeProfileAt(at) : undefined,
      counts: { levels: levels.length, orderBlocks: orderBlocks.length, fvgs: fvgs.length, liquidity: liquidity.length, swings_known: swingsKnown },
    }
  }

  // ── alive-set cursor (the fast path's state) ─────────────────────────────────
  /** Indices (original array order) of elements confirmed by `at` and not terminal at `at`, per array. */
  _aliveAt(at) {
    const KEYS = { levels: 'broken_t', orderBlocks: 'broken_t', fvgs: 'filled_t', liquidity: 'swept_t' }
    // the confirmed-order lists depend only on the element arrays (epoch), never on `at` — built once per epoch;
    // a backward `at` resets only the position/alive state (no re-sort, so alternating callers never pay a sort)
    if (!this._order || this._order.epoch !== this._epoch) {
      const o = { epoch: this._epoch }
      for (const key of Object.keys(KEYS)) {
        const order = []
        this[key].forEach((el, i) => { if (el.confirmed_t != null) order.push({ t: el.confirmed_t, i }) })
        order.sort((a, b) => (a.t - b.t) || (a.i - b.i))
        o[key] = order
      }
      this._order = o
    }
    let c = this._cursor
    if (!c || c.epoch !== this._epoch || !(at >= c.at)) {
      c = { epoch: this._epoch, at: -Infinity }
      for (const key of Object.keys(KEYS)) c[key] = { order: this._order[key], pos: 0, alive: [] }
      this._cursor = c
    }
    const out = {}
    for (const [key, term] of Object.entries(KEYS)) {
      const s = c[key], arr = this[key]
      while (s.pos < s.order.length && s.order[s.pos].t <= at) { s.alive.push(s.order[s.pos].i); s.pos++ }
      let w = 0
      for (let r = 0; r < s.alive.length; r++) { const tt = arr[s.alive[r]][term]; if (!(tt != null && tt <= at)) s.alive[w++] = s.alive[r] }
      s.alive.length = w
      out[key] = s.alive.slice().sort((a, b) => a - b)
    }
    c.at = at
    return out
  }

  // ── Persistence (TURBO.* only) ─────────────────────────────────────────────────
  snapshot() {
    return {
      symbol: this.symbol, tf: this.tf, cfg: this.cfg, builtAt: this.builtAt,
      span: this.bars.length ? [this.bars[0].t, this.bars[this.bars.length - 1].t] : [null, null],
      bars_n: this.bars.length,
      elements: { swings: this.swings, levels: this.levels, orderBlocks: this.orderBlocks, fvgs: this.fvgs, liquidity: this.liquidity },
      volumeProfile: this.volumeProfile,
    }
  }

  persist() {
    const dir = path.join(TURBO.worldModel, this.symbol)
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${this.tf}.json`)
    fs.writeFileSync(file, JSON.stringify(this.snapshot()), 'utf8')
    return file
  }

  /** Rebuild a queryable WorldModel from a persisted snapshot + the bar series it was built on. */
  static fromSnapshot(snap, bars) {
    const wm = new WorldModel(snap.symbol, snap.tf, snap.cfg)
    wm.bars = bars
    wm.idxByT = new Map(bars.map((b, i) => [b.t, i]))
    wm.atr = atr(bars, wm.cfg.atrPeriod)
    wm.swings = snap.elements.swings
    wm.levels = snap.elements.levels
    wm.orderBlocks = snap.elements.orderBlocks
    wm.fvgs = snap.elements.fvgs
    wm.liquidity = snap.elements.liquidity
    wm._epoch = (wm._epoch ?? 0) + 1; wm._cursor = null
    wm.volumeProfile = snap.volumeProfile
    wm.builtAt = snap.builtAt
    return wm
  }
}
