// ════════════════════════════════════════════════════════════════════════════════
// smoke_temporal_guarantee.mjs — a field NAMED for a temporal guarantee must PROVIDE it.
// ────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS. On 2026-07-19 DIAMOND_SWING — the last "clean" money edge — was refuted because
// validate_diamond_htf.mjs carried:
//     confCloseT: bars[conf].t + 1          // ONE MILLISECOND past the confirm bar's OPEN
//     const start = after15(t.confCloseT)   // comment: "fills only AFTER the confirm bar closes"
// On a 2H bar that begins the fill scan 15 minutes IN, leaving 7 of its 8 fifteen-minute sub-bars eligible to
// fill a limit the sweep had already pierced. The NAME said close. The COMMENT said close. The ARITHMETIC said
// open+1ms. It survived weeks of review — and was cited BY ANOTHER INVESTIGATION as the correct reference
// implementation — precisely because everyone read the name instead of the number.
//
// Two guards, because the bug has two halves:
//   ① STATIC  — no temporal-guarantee field may be assigned `<expr> + <tiny literal>`. A close time is one BAR
//               WIDTH away, never a millisecond. This catches the exact regression, by shape.
//   ② BEHAVIOURAL — on real bars, prove how many sub-bars a wrong close time exposes, per timeframe, and pin the
//               15m immunity the surviving book now rests on: at 15m the confirm bar IS a base bar, so causal and
//               look-ahead starts are IDENTICAL (0 sub-bars of look-ahead) while 2h exposes 7.
//
// Usage: node scripts/smoke_temporal_guarantee.mjs
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBars } from '../src/data/backfillReader.js'

// Twin fix 2026-10-08: `new URL().pathname` percent-encodes spaces ("01Ferrari%20Twin%20Turbo"); fileURLToPath decodes them.
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✓ ${msg}`) } else { fail++; console.log(`  ✗ ${msg}`) } }

console.log('██ TEMPORAL-GUARANTEE SMOKE ██\n')

// ── ① STATIC: a "close time" may never be an open time plus a rounding crumb ──────────────────────────────────
// Matches `confCloseT: <anything>.t + 1` / `closeT = x.t + 500` etc. A legitimate close is `+ TF_MS`, `+ tfMs`,
// `+ barMs`, `+ (bars[1].t - bars[0].t)` — i.e. a WIDTH, never a numeric literal below one minute.
const FIELD = /(\w*[cC]loseT)\s*[:=]\s*([^,\n}]*?)\+\s*(\d+)\b/g
const scanDirs = ['scripts', 'src']
const offenders = []
for (const dir of scanDirs) {
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!/\.(mjs|js)$/.test(e.name)) continue
      if (p.endsWith('smoke_temporal_guarantee.mjs')) continue          // this file DOCUMENTS the bug pattern
      const src = fs.readFileSync(p, 'utf8')
      for (const m of src.matchAll(FIELD)) {
        const literal = +m[3]
        if (literal >= 60000) continue
        // The pattern legitimately appears in PROSE — code comments and `refutedWhy` strings quote the bug so a
        // future reader recognises it. Only flag matches in executable position: not after a `//` on the same
        // line, and not inside a quoted string (odd quote count before the match).
        const lineStart = src.lastIndexOf('\n', m.index) + 1
        const before = src.slice(lineStart, m.index)
        if (before.includes('//') || before.trimStart().startsWith('*')) continue
        const q = (ch) => (before.split(ch).length - 1) % 2 === 1
        if (q("'") || q('"') || q('`')) continue
        offenders.push({ file: path.relative(ROOT, p), field: m[1], literal, snippet: m[0].trim().slice(0, 70) })
      }
    }
  }
  walk(path.join(ROOT, dir))
}
ok(offenders.length === 0, `no *CloseT field is assigned open + a sub-minute literal (a close is a BAR WIDTH away)`)
for (const o of offenders) console.log(`      🚨 ${o.file}: ${o.snippet}  (+${o.literal}ms — this is the DIAMOND bug)`)

// ── ② BEHAVIOURAL: how much look-ahead does a wrong close time actually buy, per timeframe? ───────────────────
const { bars: b15 } = await loadBars('XAUUSD', '15m', { from: Date.now() - 400 * 86400000 })
const TF = 900000
// upper_bound, the same primitive every validator uses to find "the first 15m bar after t"
const after15 = (t) => { let lo = 0, hi = b15.length; while (lo < hi) { const m = (lo + hi) >> 1; if (b15[m].t > t) hi = m; else lo = m + 1 } return lo }

console.log('')
const CASES = [['15m', 900000, 0], ['30m', 1800000, 1], ['1h', 3600000, 3], ['2h', 7200000, 7]]
// pick a confirm-bar open aligned to every timeframe under test, well inside the data, whose EIGHT 15m sub-bars are
// contiguous — the window starts at now−400d so the first aligned bar moves daily, and on 2026-09-09 it landed on a
// 20:00Z bucket straddling the 21:00-22:00Z daily rollover gap (4 sub-bars, not 8): a data gap is not a look-ahead
const ai = b15.findIndex((b, k) => b.t % 7200000 === 0 && b.t > b15[500].t && b15[k + 7]?.t === b.t + 7 * 900000)
const anchor = b15[ai]
for (const [name, tfMs, expectedExposure] of CASES) {
  const openT = anchor.t
  const wrongStart = after15(openT + 1)          // the DIAMOND bug: "close" = open + 1ms
  const rightStart = after15(openT + tfMs - 1)   // the truth: first 15m bar at/after the bar's real close
  const exposure = rightStart - wrongStart       // sub-bars a fill could have used but must not
  ok(exposure === expectedExposure,
    `${name.padEnd(4)} confirm bar exposes ${exposure} illegitimate sub-bar(s) under +1ms (expected ${expectedExposure})`)
}

// the load-bearing fact: 15m is immune BY CONSTRUCTION — this is why SWING_TRADE and the frontier candidate live
{
  const openT = anchor.t
  const wrong15 = after15(openT + 1), right15 = after15(openT + TF - 1)
  ok(wrong15 === right15,
    '🛡️ 15m IMMUNITY: causal and look-ahead fill starts are IDENTICAL on a 15m entry TF (the confirm bar IS a base bar)')
  const wrong2h = after15(openT + 1), right2h = after15(openT + 7200000 - 1)
  ok(right2h > wrong2h,
    '🛡️ …and they are NOT identical on 2h — so the immunity is a property of the timeframe, not of the harness')
}

console.log(`\n${fail === 0 ? '✅' : '🚨'} TEMPORAL-GUARANTEE SMOKE: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
