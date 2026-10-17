// ════════════════════════════════════════════════════════════════════════════════
// corrections.js — append-only CORRECTIONS to the 1m store (2026-10-08). One place for read and write.
// ────────────────────────────────────────────────────────────────────────────────
// WHY (measured): Polygon re-issues minutes after first serving them — late quotes are folded in (USDSEK 16:10: written with 45 ticks
// by the stream, served with 173 by REST an hour later; the 128 were the stream's "late" ticks), and whole ranges are re-issued
// (gold 2026-07-01 → 10-05). R0: Polygon's CURRENT bar is the truth. The store stays append-only (one writer, never rewritten); a
// correction line {t,o,h,l,c,v,src,ver,…} in data/history/<SYM>/1m_corrections.jsonl supersedes that minute at READ time — the
// LATEST line for a minute wins. Every reader goes through backfillReader.streamBars, so every timeframe inherits the correction.
// A correction only REPLACES a minute the store has; a minute the store lacks is reported (reconcile), never invented here.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'

const cache = new Map()   // file → { key: 'mtime|size', map }

/** Map(t → corrected raw bar) from a corrections file; cached by mtime+size; latest line per minute wins. */
export function loadCorrections(file) {
  let st; try { st = fs.statSync(file) } catch { return new Map() }
  const key = `${st.mtimeMs}|${st.size}`, hit = cache.get(file)
  if (hit && hit.key === key) return hit.map
  const map = new Map()
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) { if (!l) continue; try { const c = JSON.parse(l); if (Number.isFinite(c.t)) map.set(c.t, c) } catch { /* a torn last line is ignored */ } }
  cache.set(file, { key, map })
  return map
}

/** The corrected bar for a store bar (or the bar itself). Pure. */
// DELETION (2026-10-17, measured: Polygon published EURUSD 2026-10-13 00:00-00:28 live — the stream verified them against Polygon's own CA
// aggregate — then REMOVED them from its final history). A correction line with `deleted: true` removes that minute at read time → null.
export const applyCorrection = (bar, map) => { const c = map?.get(bar.t); return c ? (c.deleted ? null : { ...c }) : bar }
/** Append one deletion line (provenance mandatory): the minute t no longer exists in Polygon's current data. */
export function appendDeletion(file, t, meta) {
  if (!meta?.src || !meta?.ver) throw new Error('appendDeletion: src and ver are mandatory (provenance)')
  fs.appendFileSync(file, JSON.stringify({ t, deleted: true, ...meta, corrected_at: new Date().toISOString() }) + '\n')
}

/** Append one correction line (provenance mandatory). */
export function appendCorrection(file, bar, meta) {
  if (!meta?.src || !meta?.ver) throw new Error('appendCorrection: src and ver are mandatory (provenance)')
  fs.appendFileSync(file, JSON.stringify({ t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v, ...meta, corrected_at: new Date().toISOString() }) + '\n')
}

/**
 * Pure reconciliation diff: store bars (already corrections-applied) vs Polygon's REST bars over the same window.
 * @returns {{corrections: Bar[], missing: number[], extra: number[], same: number}}  corrections = REST bars that differ (o,h,l,c,v);
 *   missing = minutes REST has and the store lacks (reported, never invented); extra = minutes the store has and REST does not.
 */
export function diffMinutes(storeBars, restBars) {
  const S = new Map(storeBars.map((b) => [b.t, b])), R = new Map(restBars.map((b) => [b.t, b]))
  const corrections = [], missing = [], extra = []; let same = 0
  for (const [t, r] of R) {
    const s = S.get(t); if (!s) { missing.push(t); continue }
    const eq = ['o', 'h', 'l', 'c'].every((k) => Math.abs(s[k] - r[k]) < 1e-9) && (s.v ?? 0) === (r.v ?? 0)
    if (eq) same++; else corrections.push({ t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v })
  }
  for (const t of S.keys()) if (!R.has(t)) extra.push(t)
  return { corrections, missing, extra, same }
}
