// ════════════════════════════════════════════════════════════════════════════════
// wrGate.js — THE 92 % WR RULE (2026-10-28, Ashraf: "pls i do not need any trades fire less than 92% WR" → "Yes, apply the 92% rule: stop all
// Telegram trade alerts and trade boxes for anything measured below 92% WR, keep recording silently.").
// ONE place: a trade signal may send a Telegram trade alert or draw a trade box on the chart ONLY if its MEASURED win rate ≥ MIN_WR.
// Every WR is read from the signal's own study / verdict artifact (display derives from artifacts); a missing or unreadable record = BLOCKED
// (fail-closed). Recording is untouched: every book keeps writing its ledger / journal / paper record as before.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../core/paths.js'
import { TIER_STATS } from './tierStats.js'

export const MIN_WR = 0.92
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(TURBO.master, f), 'utf8')) } catch { return null } }
const minOf = (...xs) => { const v = xs.filter((x) => Number.isFinite(x)); return v.length === xs.length ? Math.min(...v) : null }

/** The measured WR of every signal that can alert or draw a trade box (the lower of its measured windows). */
export function measuredWr() {
  const st = J('matrix_state.json'), s85 = J('matrix_85wr_study.json'), ml = J('scalp_sell_ml_study.json'), sw = J('swing_scalp_entry_lots3.json')
  return {
    SCALP: { wr: st?.verdict?.oos_wr ?? null, source: 'matrix_state.json verdict (2 y with WTI, unseen data)' },
    SCALP85: { wr: minOf(s85?.primary_noWTI_13y?.['stop3r|tp0.25r']?.oos?.wr, s85?.report_WTI_2y?.['stop3r|tp0.25r']?.oos?.wr), source: 'matrix_85wr_study.json stop 3r / target 0.25r (13 y + 2 y)' },
    ML_SELL: { wr: minOf(ml?.cells?.X3?.P1?.wr, ml?.cells?.X3?.P2?.wr), source: 'scalp_sell_ml_study.json X3 P1 / P2 (after the 10-26 weekend fix)' },
    SWING: { wr: minOf(sw?.cells?.['arm1|P|L4H|tp1_10']?.oos?.wr, sw?.cells?.['arm2|P|L4H|tp1_10']?.oos?.wr), source: 'swing_scalp_entry_lots3.json L4H 3 lots TP1 $10 (setups in profit, 13 y OOS)' },
    IMPULSE_CONT: { wr: TIER_STATS.IMPULSE_CONT?.wr ?? null, source: 'tierStats.js IMPULSE_CONT' },
  }
}
/** May this signal kind alert / draw? kind ∈ SCALP · SCALP85 · ML_SELL · SWING · IMPULSE_CONT; unknown kind or no record → false. */
export function tradeAllowed(kind, M = measuredWr()) { const wr = M[kind]?.wr; return Number.isFinite(wr) && wr >= MIN_WR }
/** For the chart / API: every kind with its WR and verdict. */
export function wrGateState() { const M = measuredWr()
  return { min_wr: MIN_WR, at: new Date().toISOString(), signals: Object.fromEntries(Object.entries(M).map(([k, v]) => [k, { ...v, allowed: tradeAllowed(k, M) }])) } }
