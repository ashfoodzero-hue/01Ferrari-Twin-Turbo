// study_stats.mjs — the ONE scoring of level studies and Matrix filter studies (2026-10-09): Fib (tool 1), EMA (tool 2), and every later tool.
import { wilsonLowerBound } from '../../src/core/stats.js'

/** Level events [{ bounce, ctrl, net, D }] → bounce share (+ Wilson LB at z), control share, money mean + bootstrap 2.5 % bound, R. */
export function levelStat(E, rnd, z) {
  const r = E.filter((e) => e.bounce != null), w = r.filter((e) => e.bounce).length, c = E.filter((e) => e.ctrl != null), mn = E.filter((e) => e.net != null)
  const mean = mn.length ? mn.reduce((s, e) => s + e.net, 0) / mn.length : null, boots = []
  for (let b = 0; b < 1000 && mn.length; b++) { let s = 0; for (let j = 0; j < mn.length; j++) s += mn[(rnd() * mn.length) | 0].net; boots.push(s / mn.length) }; boots.sort((x, y) => x - y)
  return { events: E.length, resolved: r.length, bounce: r.length ? +(w / r.length).toFixed(4) : null, bounce_lb: r.length ? +wilsonLowerBound(w, r.length, z).toFixed(4) : null,
    control: c.length ? +(c.filter((e) => e.ctrl).length / c.length).toFixed(4) : null, trades: mn.length, net: mean == null ? null : +mean.toFixed(4), net_lb: boots.length ? +boots[25].toFixed(4) : null,
    net_R: mn.length ? +(mn.reduce((s, e) => s + e.net / e.D, 0) / mn.length).toFixed(4) : null }
}
/** A level cell's pre-registered verdict. */
export const levelVerdict = (TR, OOS, minN) => (OOS.resolved < minN ? 'UNDERPOWERED' : OOS.bounce_lb > OOS.control && TR.bounce > TR.control && OOS.net_lb > 0 ? 'HOLDS' : 'DOES_NOT_HOLD')

/** Matrix trades [{ outcome, net }] → n, decisive WR (+ Wilson LB), mean $/trade + bootstrap 95 % interval. */
export function tradeSummary(xs, rnd) {
  const W = xs.filter((f) => f.outcome === 'WIN').length, L = xs.filter((f) => f.outcome === 'LOSS').length
  const mean = xs.length ? xs.reduce((s, f) => s + f.net, 0) / xs.length : null, boots = []
  for (let b = 0; b < 2000 && xs.length; b++) { let s = 0; for (let j = 0; j < xs.length; j++) s += xs[(rnd() * xs.length) | 0].net; boots.push(s / xs.length) }; boots.sort((a, b) => a - b)
  return { n: xs.length, wr: W + L ? +(W / (W + L)).toFixed(4) : null, wr_lb: W + L ? +wilsonLowerBound(W, W + L).toFixed(4) : null, net: mean == null ? null : +mean.toFixed(4),
    net_lb: boots.length ? +boots[50].toFixed(4) : null, net_ub: boots.length ? +boots[1949].toFixed(4) : null }
}
/** A Matrix filter's pre-registered verdict. */
export const filterVerdict = (oos, train, minN) => (oos.n < minN ? 'UNDERPOWERED' : oos.net_lb > 0 && train.net > 0 ? 'PASS' : 'FAIL')
