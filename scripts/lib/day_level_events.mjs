// day_level_events.mjs — the ONE event logic for levels that live for one UTC day (2026-10-09): tool 3 (previous-days / today's H/L) and
// tool 4 (previous-day volume profile). Bounce event = bounceTest.race + random-level control + bounceTest.limitTrade (as tools 1-2);
// magnet = the level reached during the day vs its mirror at the same distance from the day's first-minute open.
import { race, limitTrade } from '../../src/master/bounceTest.js'

export function dayLevelRunner({ M, TO, SPLIT, HZ, rnd, spreadAt }) {
  /** one bounce event at 1m index kT (up = support test); pushes into `ev` */
  function levelEvent(ev, kT, up, lvl, a) {
    const D = 0.25 * a, tEnd = M[kT].t + HZ; if (tEnd > TO) return
    const tgt = up ? lvl + D : lvl - D, stop = up ? lvl - D : lvl + D
    const bounce = (up ? M[kT].l <= stop : M[kT].h >= stop) ? false : race(M, kT + 1, up, tgt, stop, tEnd)
    const kc = Math.min(M.length - 2, Math.max(0, kT + Math.round((rnd() * 2 - 1) * 14400))), c0 = M[kc].c
    const ctrl = race(M, kc + 1, up, up ? c0 + D : c0 - D, up ? c0 - D : c0 + D, M[kc].t + HZ)
    ev.push({ t: M[kT].t, part: M[kT].t < SPLIT ? 'TRAIN' : 'OOS', up, bounce, ctrl, net: limitTrade(M, kT, up, lvl, stop, tgt, spreadAt, Math.min(0.3, 0.05 * a), tEnd), D })
  }
  /** a level in force for the whole day S: its first touch from the opening side (bounce event) + the magnet test */
  function priorDayLevel(S, lvl, a, ev, mag) {
    const open = M[S.firstK].o, part = S.day < SPLIT ? 'TRAIN' : 'OOS', support = open > lvl
    for (let k = S.firstK; k <= S.lastK; k++) { if (support ? M[k].l <= lvl : M[k].h >= lvl) { levelEvent(ev, k, support, lvl, a); break } }
    if (open === lvl) return
    const mirror = 2 * open - lvl; let hit = false, hitM = false
    for (let k = S.firstK; k <= S.lastK; k++) { const b = M[k]; if (b.l <= lvl && b.h >= lvl) hit = true; if (b.l <= mirror && b.h >= mirror) hitM = true; if (hit && hitM) break }
    if (M[S.firstK].l <= lvl && M[S.firstK].h >= lvl) return   // the opening minute already trades the level → not a magnet test
    mag.push({ part, hit, hitM, dist: Math.abs(lvl - open) / a })
  }
  return { levelEvent, priorDayLevel }
}
