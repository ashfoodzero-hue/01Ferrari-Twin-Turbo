// ════════════════════════════════════════════════════════════════════════════════
// recordRevisions.js — POLYGON REVISIONS for the RECORDED series (GOLD_FUT, SILVER_FUT, WTI, GLD) (2026-10-18).
// ────────────────────────────────────────────────────────────────────────────────
// MEASURED 2026-10-18: Polygon re-published past minutes overnight — the 8 forex symbols for 2026-10-15 (≈ 13 % of an 8-day window; mean
// $0.12, max $1.22 on XAU; reconcile_1m corrected them) and 7 GLD minutes the same day (prices re-rounded to 4 dp, two 1-cent closes).
// The spot stores are re-checked by reconcile_1m; the recorder's files were append-only and never re-checked, so verify_database failed.
// This is the recorder's own re-check: same "identical" rule as verify_database (o/h/l/c within 1e-9, volume equal), matched by minute
// (+ contract for futures). A revised minute is REWRITTEN to Polygon's current value (atomic temp + rename; the recorder is the only writer)
// and every change is logged with its old and new values (data/master/recorder_revisions.jsonl). A minute Polygon no longer serves is
// REPORTED, never deleted (zero guessing).
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import readline from 'node:readline'

const same = (a, b) => ['o', 'h', 'l', 'c'].every((k) => Math.abs(a[k] - b[k]) < 1e-9) && a.v === b.v
const key = (b) => `${b.t}|${b.tk ?? ''}`

/** Pure. mine = stored bars, rest = Polygon bars in the SAME shape ({t, tk?, o, h, l, c, v, …}).
 *  → { revised:[{t, tk, old, new}], missing:[t] (ours, no longer at Polygon), absent:[bar] (Polygon's, NOT in our store), same:n }
 *  absent (2026-10-25, measured): Polygon published GLD pre-market minutes late (10-20 08:00/08:02/08:05, 10-21 08:06 UTC) — after a later minute was
 *  already appended, so the append-only recorder never added them and verify_database failed every Saturday retry. */
export function diffRevisions(mine, rest) {
  const m = new Map(rest.map((r) => [key(r), r])), have = new Set(mine.map(key)), revised = [], missing = []; let n = 0
  for (const b of mine) { const r = m.get(key(b)); if (!r) missing.push(b.t); else if (same(b, r)) n++; else revised.push({ t: b.t, tk: b.tk ?? null, old: b, new: { ...b, ...r } }) }
  const absent = rest.filter((r) => !have.has(key(r)))
  return { revised, missing, absent, same: n }
}

/** Rewrite a 1m.jsonl store in place (temp file + rename): the revised minutes replaced, and `inserts` (late-published minutes) placed in time order.
 *  Every revised minute must match a stored line and every insert must land, or the file is left unchanged. @returns lines replaced + inserted */
export async function applyRevisions(file, revised, inserts = []) {
  if (!revised.length && !inserts.length) return 0
  const byKey = new Map(revised.map((x) => [`${x.t}|${x.tk ?? ''}`, x.new])), tmp = file + '.rev.tmp', out = fs.createWriteStream(tmp)
  const ins = [...inserts].sort((a, b) => a.t - b.t); let replaced = 0, inserted = 0, k = 0
  const put = async (s) => { if (!out.write(s + '\n')) await new Promise((r) => out.once('drain', r)) }
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })
  for await (const line of rl) { if (!line) continue
    let nl = line, t = null
    if (line.includes('"t":')) { try { const b = JSON.parse(line), nb = byKey.get(key(b)); t = b.t; if (nb) { nl = JSON.stringify(nb); replaced++ } } catch { /* keep the line as it is */ } }
    while (t != null && k < ins.length && ins[k].t < t) { await put(JSON.stringify(ins[k++])); inserted++ }
    await put(nl) }
  while (k < ins.length) { await put(JSON.stringify(ins[k++])); inserted++ }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())))
  if (replaced !== revised.length || inserted !== ins.length) { fs.rmSync(tmp, { force: true }); throw new Error(`recordRevisions: matched ${replaced}/${revised.length} revised, inserted ${inserted}/${ins.length} — file left unchanged`) }
  fs.renameSync(tmp, file)
  return replaced + inserted
}
