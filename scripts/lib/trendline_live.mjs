// trendline_live.mjs — the ONE implementation of the LIVE major-trendline logic (2026-10-18), shared by scripts/trendline_lines.mjs (after each 4H
// close), scripts/trendline_tick.mjs (every minute) and scripts/replay_trendline_alerts.mjs (the proof: a minute-by-minute replay must give exactly the
// study's touches / bounces / breaks). Rules = src/master/trendlines.js.
import { findHoles, markIncomplete } from '../../src/core/dataHoles.js'
import { atr as atrArr } from '../../src/core/indicators.js'
import { candleOpen } from '../../src/core/nyCandles.js'
import { makeSession, SESSIONS } from '../../src/core/sessionCandles.js'
import { fractalPivots, majorPivots, buildLines, evaluateLine, lineAt, TL } from '../../src/master/trendlines.js'
import { kit } from './series_1m.mjs'
import { TL_ALERT_TFS } from './trendline_alerts.mjs'

const SES = { WTI: makeSession(SESSIONS.cme), DXY_ICE: makeSession(SESSIONS.dxyIce) }
export const openOf = (sym, t, tf) => (SES[sym] ? SES[sym].candleOpen(t, tf) : candleOpen(t, tf))
const NY_HM = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
export const nyMinute = (t) => { const p = NY_HM.formatToParts(new Date(t)); return (+p.find((x) => x.type === 'hour').value % 24) * 60 + +p.find((x) => x.type === 'minute').value }

const lbT = (C, t) => { let a = 0, b = C.length; while (a < b) { const m = (a + b) >> 1; if (C[m].t < t) a = m + 1; else b = m } return a }
/** Lines on CLOSED candles at `now` (M = cleaned 1m, only minutes closed by now). → { live, events, display: { tf: { candles, lines } } } */
export function liveLines(sym, M, now, { holes = null, display = false, displayFrom = -Infinity, dp = 2, candles = null } = {}) {
  const K = kit(sym), r = (x) => +x.toFixed(dp), live = { at: new Date(now).toISOString(), symbol: sym, last_minute: M.length ? new Date(M.at(-1).t).toISOString() : null, rules: TL, tf: {} }, events = [], disp = {}
  for (const tf of TL_ALERT_TFS) {
    const fo = openOf(sym, now, tf), C = candles ? candles[tf].slice(0, lbT(candles[tf], fo)) : K.build(M, tf).filter((c) => c.t < fo); if (!candles) markIncomplete(C, holes ?? findHoles(M))   // candles: prebuilt + marked (replay; closed candles never change)
    const breaks = new Set(C.map((x, i) => (x.incomplete ? i : -1)).filter((i) => i >= 0)), A = atrArr(C, 14), L = C.length - 1
    const lines = []
    for (const sc of display ? ['major', 'minor'] : ['major']) for (const ln of buildLines(C, sc === 'major' ? majorPivots(C, breaks) : fractalPivots(C), A)) { ln.scale = sc; lines.push(ln) }
    const steep = [], evs = lines.map((ln) => { const e = evaluateLine(C, A, ln); if (e.born) steep.push(Math.abs(ln.slope_atr)); return e })
    steep.sort((a, b) => a - b); const q1 = steep[Math.floor(steep.length / 3)], q2 = steep[Math.floor((2 * steep.length) / 3)], terc = (x) => (Math.abs(x) <= q1 ? 0 : Math.abs(x) <= q2 ? 1 : 2)
    const T = { last_closed: C[L].t, last_close: C[L].c, atr: A[L], lines: [] }, D = []
    lines.forEach((ln, k) => { const e = evs[k]; if (!e.born) return
      const id = `${sym}|${tf}|${ln.side}|${C[ln.i1].t}|${C[ln.i2].t}`, base = { sym, tf, side: ln.side, cls: ln.cls, t1: C[ln.i1].t, t2: C[ln.i2].t, atr: A[L] }
      if (display && C[e.endI].t >= displayFrom) D.push({ s: ln.scale[0], sd: ln.side[0], c: ln.cls[0], t1: C[ln.i1].t, p1: r(ln.p1), t2: C[ln.i2].t, p2: r(ln.p2), tb: C[ln.birth].t, te: C[e.endI].t, pe: r(lineAt(ln, e.endI)), end: e.end,
        st: terc(ln.slope_atr), tch: e.touches.map((t) => [C[t.i].t, r(lineAt(ln, t.i)), t.outcome[0], t.test]) })
      if (ln.scale !== 'major') return
      if ((e.end === 'break' || e.end === 'break_unarmed') && e.endI === L) { const s = ln.side === 'support' ? 1 : -1, v = lineAt(ln, L)
        events.push({ key: `B:${id}`, type: 'BROKEN', ...base, candle: C[L].t, value: v, price: C[L].c, close: C[L].c, beyond: (s * (v - C[L].c)) / (A[L - 1] || A[L]), test: e.touches.length }) }
      const lt = e.touches.at(-1)
      if (lt && lt.outcome === 'respect' && lt.resolvedI === L) events.push({ key: `R:${id}:${C[lt.i].t}`, type: 'BOUNCED', ...base, candle: C[L].t, value: lineAt(ln, L), price: C[L].c, atr: A[L - 1] || A[L], test: lt.test })
      if (e.end !== 'open' || Math.abs(lineAt(ln, L + 1) - C[L].c) > 10 * A[L]) return
      T.lines.push({ id, ...base, i1: ln.i1, p1: ln.p1, slope: ln.slope, last_i: L, value_next: lineAt(ln, L + 1), armed: e.armed, pending: e.pending ? { t: C[e.pending.i].t, test: e.pending.test } : null, tests: e.touches.length }) })
    live.tf[tf] = T; if (display) disp[tf] = { candles: C.filter((c) => c.t >= displayFrom).map((c) => [c.t, r(c.o), r(c.h), r(c.l), r(c.c)]), lines: D }
  }
  return { live, events, display: disp }
}

/** The minute check: L = liveLines(...).live, M = cleaned 1m since the oldest last-closed candle. → { status, price, tf: {...}, events } */
export function tickCheck(sym, L, M, now, { lagMin = 5 } = {}) {
  const out = { status: 'ok', tf: {}, events: [] }
  if (!M.length || now - M.at(-1).t > lagMin * 60000) return { ...out, status: 'no fresh minute — nothing checked' }
  const nm = nyMinute(now); if (nm >= 18 * 60 && nm < 18 * 60 + 16) return { ...out, status: 'reopen settling (18:00-18:16 New York) — waiting' }
  out.price = M.at(-1).c; out.last_minute = M.at(-1).t
  for (const tf of TL_ALERT_TFS) { const T = L.tf[tf]; if (!T) continue
    const after = kit(sym).build(M.filter((b) => b.t >= T.last_closed), tf).filter((c) => c.t > T.last_closed)
    if (after.length > 1) { out.tf[tf] = { status: 'a newer candle closed — waiting for the line refresh' }; continue }
    const F = after[0]; if (!F) { out.tf[tf] = { status: 'no forming candle yet' }; continue }
    const a = T.atr, near = []
    for (const ln of T.lines) { const s = ln.side === 'support' ? 1 : -1, v = ln.value_next, nearD = s > 0 ? F.l - v : v - F.h, farD = s > 0 ? F.h - v : v - F.l
      if (Math.abs(out.price - v) <= 5 * a) near.push({ id: ln.id, side: ln.side, cls: ln.cls, value: +v.toFixed(5), armed: ln.armed, pending: !!ln.pending, dist_atr: +((out.price - v) / a).toFixed(2), t1: ln.t1, t2: ln.t2, p1: ln.p1, slope: ln.slope, i1: ln.i1, last_i: ln.last_i })
      const base = { sym, tf, side: ln.side, cls: ln.cls, candle: F.t, value: v, price: out.price, atr: a, t1: ln.t1, t2: ln.t2 }
      if (ln.armed && nearD <= TL.TOL * a) out.events.push({ key: `T:${ln.id}:${F.t}`, type: 'AT', ...base, test: ln.tests + 1 })
      if (ln.pending && ln.pending.t < F.t && farD >= TL.R * a) out.events.push({ key: `R:${ln.id}:${ln.pending.t}`, type: 'BOUNCED', ...base, test: ln.pending.test }) }
    out.tf[tf] = { status: 'checked', forming: F.t, atr: +a.toFixed(5), lines_near: near.sort((x, y) => Math.abs(x.dist_atr) - Math.abs(y.dist_atr)) } }
  return out
}
