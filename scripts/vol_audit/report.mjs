// vol_audit/report.mjs — the headline table of docs/VOLUME_AUDIT_SPEC.md (rules 2-4) from the re-run artifacts. Writes
// data/master/vol_audit/headline.json and prints markdown rows. Every number carries its n; TRAIN and OOS side by side.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), VA = path.join(ROOT, 'data', 'master', 'vol_audit')
const TAGS = ['raw_full', 'drop_full', 'raw_cme2y', 'drop_cme2y', 'cme_cme2y']
const J = (tag, f) => { const p = path.join(VA, tag, f + '.json'); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null }
const pc = (x) => x == null ? '—' : (100 * x).toFixed(1) + '%', usd = (x) => x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(2)

// each row: [module, label, (json) => { oos: {n, rate, net}, train: {n, rate, net}, verdict }]
const holdRow = (c) => c && { oos: { n: c.oos_n, rate: c.oos_hold }, train: { n: c.train_n, rate: c.train_hold }, verdict: c.verdict }
const cellRow = (c, rate = 'bounce', n = 'resolved') => c && { oos: { n: c.oos[n], rate: c.oos[rate], ctl: c.oos.control, net: c.oos.net }, train: { n: c.train[n], rate: c.train[rate], ctl: c.train.control, net: c.train.net }, verdict: c.verdict }
const moneyRow = (c) => c && { oos: { n: c.oos.n, rate: c.oos.wr, net: c.oos.net }, train: { n: c.train.n, rate: c.train.wr, net: c.train.net }, verdict: c.verdict }
const ROWS = [
  ['wallDefense', 'volume walls DEFENSE hold', (j) => holdRow(j.wall_bubbles_study?.classes?.DEFENSE)],
  ['wallDefense', 'volume walls DEF>PUSH hold', (j) => holdRow(j.wall_bubbles_study?.classes?.['DEF>PUSH'])],
  ['wallDefense', 'volume walls STRONG hold', (j) => holdRow(j.wall_bubbles_study?.classes?.STRONG)],
  ['wallDefense', 'volume walls ATTACK hold', (j) => holdRow(j.wall_bubbles_study?.classes?.ATTACK)],
  ['wallDefense', 'swing 3m DEF>PUSH hold', (j) => holdRow(j.swing_walls_study?.variants?.['3m']?.classes?.['DEF>PUSH'])],
  ['wallDefense', 'swing 3m STRONG hold', (j) => holdRow(j.swing_walls_study?.variants?.['3m']?.classes?.STRONG)],
  ['wallDefense', 'swing 15m STRONG hold', (j) => holdRow(j.swing_walls_study?.variants?.['15m']?.classes?.STRONG)],
  ['wallDefense', '4H level touch: defended hold', (j) => { const t = j.c4h_level_study?.touch; return t && { oos: { n: t.oos.defended.n, rate: t.oos.defended.hold }, train: { n: t.train.defended.n, rate: t.train.defended.hold } } }],
  ['wallDefense', '4H level touch: strong hold (Telegram 🧱)', (j) => { const t = j.c4h_level_study?.touch; return t && { oos: { n: t.oos.strong.n, rate: t.oos.strong.hold }, train: { n: t.train.strong.n, rate: t.train.strong.hold } } }],
  ['wallDefense', 'wall-defense money STRONG bounce', (j) => moneyRow(j.wall_defense_money?.cells?.['STRONG|BOUNCE'])],
  ['wallDefense', 'wall-defense money DEFENSE bounce', (j) => moneyRow(j.wall_defense_money?.cells?.['DEFENSE|BOUNCE'])],
  ['wallDefense', 'wall scalp C4H T4', (j) => moneyRow(j.wall_scalp_study?.cells?.['C4H|T4'])],
  ['wallDefense', 'wall scalp cells passing', (j) => j.wall_scalp_study && { count: Object.values(j.wall_scalp_study.cells).filter((c) => c.verdict === 'PASS').length + '/' + Object.keys(j.wall_scalp_study.cells).length }],
  ['wallDefense', 'pullback L4H SPLIT4', (j) => moneyRow(j.wall_pullback_study?.cells?.['L4H|SPLIT4'])],
  ['marketState', 'sell-downtrend R-STATE S-BREAK R2', (j) => moneyRow(j.sell_downtrend_study?.cells?.['R-STATE|S-BREAK|R2'])],
  ['fvg', 'STRONG FVG 3m X0.25 bounce', (j) => cellRow(j.fvg_strong_study?.cells?.['3m|0.25'])],
  ['fvg', 'STRONG FVG 3m X0.5 bounce', (j) => cellRow(j.fvg_strong_study?.cells?.['3m|0.5'])],
  ['fvg', 'STRONG FVG 15m X0.25 bounce', (j) => cellRow(j.fvg_strong_study?.cells?.['15m|0.25'])],
  ['orderBlock', 'OB 5m STRONG 1R', (j) => cellRow(j.order_block_study?.cells?.['5m|STRONG|1R'])],
  ['orderBlock', 'OB 15m STRONG 1R', (j) => cellRow(j.order_block_study?.cells?.['15m|STRONG|1R'])],
  ['orderBlock', 'OB 1h STRONG 1R', (j) => cellRow(j.order_block_study?.cells?.['1h|STRONG|1R'])],
  ['orderBlock', 'OB 5m ALL 1R (no volume)', (j) => cellRow(j.order_block_study?.cells?.['5m|ALL|1R'])],
  ['orderBlock', 'weak 4H OB (disp only)', (j) => { const w = j.ob_weak4h_confirm; return w && { oos: { n: w.oos.n, rate: w.oos.bounce, ctl: w.oos.control, net: w.oos.net }, train: { n: w.train.n, rate: w.train.bounce, ctl: w.train.control, net: w.train.net } } }],
  ['volumeProfile', 'prev-day SPOT POC bounce', (j) => cellRow(j.volume_profile_study?.spot?.cells?.POC)],
  ['volumeProfile', 'prev-day SPOT VAH bounce', (j) => cellRow(j.volume_profile_study?.spot?.cells?.VAH)],
  ['volumeProfile', 'prev-day SPOT VAL bounce', (j) => cellRow(j.volume_profile_study?.spot?.cells?.VAL)],
  ['volumeProfile', 'SPOT naked-POC magnet hit', (j) => { const m = j.volume_profile_study?.spot?.magnet; return m && { oos: { n: m.oos.n, rate: m.oos.hit, ctl: m.oos.mirror }, train: { n: m.train.n, rate: m.train.hit, ctl: m.train.mirror }, verdict: m.verdict } }],
  ['volumeProfile', 'Matrix filter AT_VAL', (j) => { const f = j.vp_matrix_filter?.primary?.filters?.AT_VAL; return f && { oos: { n: f.oos.n, rate: f.oos.wr, net: f.oos.net }, train: { n: f.train.n, rate: f.train.wr, net: f.train.net }, verdict: f.verdict } }],
]
const FILES = ['wall_bubbles_study', 'swing_walls_study', 'c4h_level_study', 'wall_defense_money', 'wall_scalp_study', 'wall_pullback_study', 'sell_downtrend_study', 'fvg_strong_study', 'order_block_study', 'ob_weak4h_confirm', 'volume_profile_study', 'vp_matrix_filter']
const art = Object.fromEntries(TAGS.map((t) => [t, Object.fromEntries(FILES.map((f) => [f, J(t, f)]))]))
const out = []
const fmt = (r, side) => { const s = r?.[side]; if (r?.count) return r.count; if (!s) return '—'; return `${pc(s.rate)}${s.ctl != null ? ' vs ' + pc(s.ctl) : ''}${s.net != null ? ' ' + usd(s.net) : ''} n${s.n ?? '—'}` }
for (const [mod, label, fn] of ROWS) {
  const v = Object.fromEntries(TAGS.map((t) => [t, fn(art[t])])); out.push({ module: mod, label, ...v })
  console.log(`| ${mod} | ${label} | ${TAGS.map((t) => `${fmt(v[t], 'oos')}${v[t]?.verdict ? ' ' + v[t].verdict : ''}<br>T: ${fmt(v[t], 'train')}`).join(' | ')} |`)
}
fs.writeFileSync(path.join(VA, 'headline.json'), JSON.stringify({ at: new Date().toISOString(), tags: TAGS, rows: out }, null, 1))
