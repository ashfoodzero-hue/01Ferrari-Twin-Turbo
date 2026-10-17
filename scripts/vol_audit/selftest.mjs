// vol_audit/selftest.mjs — proves the harness (docs/VOLUME_AUDIT_SPEC.md): per-mode v on 1m + 15m, CME sums, threshold wrapper, window,
// artifact isolation. Run under the preload for each mode; exits 1 on any failure.
import '../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { HISTORY_CONTINUOUS_FROM, TURBO } from '../../src/core/paths.js'
import { readMarketState } from '../../src/master/marketState.js'
import { fvgAt } from '../../src/master/fvg.js'
import { cmeVolume } from './wrap/volume.mjs'

const MODE = process.env.VOL_MODE, WIN = process.env.VOL_WINDOW || 'full', fails = []
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) fails.push(m) }
const from = Date.UTC(2025, 2, 3, 14), to = from + 3600000
const m1 = (await loadBars('XAUUSD', '1m', { from, to })).bars, m15 = (await loadBars('XAUUSD', '15m', { from, to })).bars
console.log(`mode ${MODE} ${WIN} · 1m v ${m1.slice(0, 6).map((b) => b.v).join(',')} · 15m v ${m15.map((b) => b.v).join(',')}`)
if (MODE === 'drop') ok(m1.every((b) => b.v === 1) && m15.every((b) => b.v === 1), 'drop: every v = 1')
if (MODE === 'cme') { ok(m15.every((b) => b.v === cmeVolume(b.t, b.t + 900000)), 'cme: 15m v = Σ CME minutes')
  // a candle holds ALL CME minutes in its span; spot minutes with no quote are absent from spot, so Σ of spot 1m v can only be ≤
  const rows = m15.map((b) => { const ins = m1.filter((x) => x.t >= b.t && x.t < b.t + 900000); return { full: ins.length === 15, eq: b.v === ins.reduce((s, x) => s + x.v, 0), ge: b.v >= ins.reduce((s, x) => s + x.v, 0) } })
  console.log(`  15m candles with all 15 spot minutes: ${rows.filter((r) => r.full).length}/${rows.length}`)
  ok(rows.every((r) => r.ge) && rows.filter((r) => r.full).every((r) => r.eq), 'cme: 15m v = Σ of its 1m v when no spot minute is missing, ≥ otherwise') }
if (MODE === 'raw') ok(m1.some((b) => b.v !== 1), 'raw: v unchanged (not all 1)')
ok(HISTORY_CONTINUOUS_FROM === (WIN === 'cme2y' ? Date.UTC(2024, 11, 1) : Date.UTC(2013, 6, 14, 22)), `window ${WIN}: HISTORY_CONTINUOUS_FROM ${new Date(HISTORY_CONTINUOUS_FROM).toISOString()}`)
ok(String(readMarketState).includes('volMult: 0') === (MODE === 'drop'), 'marketState wrapper only in drop')
ok(String(fvgAt).includes('s2: true') === (MODE === 'drop'), 'fvg wrapper only in drop')
const name = 'vol_audit_selftest.json', real = path.join(TURBO.master, name)
fs.writeFileSync(real, '{"ok":1}')
const iso = path.join(TURBO.master, 'vol_audit', process.env.VOL_AUDIT_ACTIVE, name)
ok(fs.existsSync(iso), 'write redirected into vol_audit folder'); fs.unlinkSync(iso)
ok(!fs.existsSync(real), 'nothing written to data/master itself')
if (fails.length) { console.log('FAIL', fails.length); process.exit(1) } else console.log('selftest PASS')
