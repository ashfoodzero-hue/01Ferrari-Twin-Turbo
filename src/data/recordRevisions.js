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

/** Pure. mine = stored bars, rest = Polygon bars in the SAME shape ({t, tk?, o, h, l, c, v, …}). → { revised:[{t, tk, old, new}], missing:[t], same:n } */
export function diffRevisions(mine, rest) {
  const m = new Map(rest.map((r) => [key(r), r])), revised = [], missing = []; let n = 0
  for (const b of mine) { const r = m.get(key(b)); if (!r) missing.push(b.t); else if (same(b, r)) n++; else revised.push({ t: b.t, tk: b.tk ?? null, old: b, new: { ...b, ...r } }) }
  return { revised, missing, same: n }
}

/** Rewrite the revised minutes of a 1m.jsonl store in place (temp file + rename). @returns number of lines replaced */
export async function applyRevisions(file, revised) {
  if (!revised.length) return 0
  const byKey = new Map(revised.map((x) => [`${x.t}|${x.tk ?? ''}`, x.new])), tmp = file + '.rev.tmp', out = fs.createWriteStream(tmp)
  let replaced = 0
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })
  for await (const line of rl) { if (!line) continue
    let nl = line
    if (line.includes('"t":')) { try { const b = JSON.parse(line), nb = byKey.get(key(b)); if (nb) { nl = JSON.stringify(nb); replaced++ } } catch { /* keep the line as it is */ } }
    if (!out.write(nl + '\n')) await new Promise((r) => out.once('drain', r)) }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())))
  if (replaced !== revised.length) { fs.rmSync(tmp, { force: true }); throw new Error(`recordRevisions: matched ${replaced} of ${revised.length} revised minutes — file left unchanged`) }
  fs.renameSync(tmp, file)
  return replaced
}
