// vol_audit/wrap/backfillReader.mjs — loadBars / streamBars with the audit's XAUUSD volume (docs/VOLUME_AUDIT_SPEC.md). RESEARCH ONLY.
import * as O from '../../../src/data/backfillReader.js?vol_orig'
import { applyVolume } from './volume.mjs'
export * from '../../../src/data/backfillReader.js?vol_orig'
const tfKey = (tf) => String(tf).replace(/H$/, 'h').replace(/D$/, 'd')
export async function loadBars(symbol, tf, opts) {
  const r = await O.loadBars(symbol, tf, opts)
  if (symbol === 'XAUUSD') applyVolume(r.bars, tfKey(tf))
  return r
}
export async function* streamBars(symbol, tf, opts) {
  for await (const b of O.streamBars(symbol, tf, opts)) { if (symbol === 'XAUUSD') applyVolume([b], tfKey(tf)); yield b }
}
