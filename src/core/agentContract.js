// ════════════════════════════════════════════════════════════════════════════════
// agentContract.js — the shared shape EVERY sub-agent implements (framework skeleton).
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. Foundation v1.0.0 (2026-06-24).
// This is the contract that guarantees "no missing circle": uniform output, mandatory
// data-health, traceable evidence, and history persistence. Sub-agents are built on
// top of this; the Master only trusts outputs that satisfy it.
// (Skeleton only — no agent logic yet. See docs/ARCHITECTURE.md §3.)
// ════════════════════════════════════════════════════════════════════════════════

export const DIRECTION = Object.freeze({ UP: 'UP', DOWN: 'DOWN', NEUTRAL: 'NEUTRAL' })
export const TIMEFRAMES = Object.freeze(['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1w'])

/**
 * Build a validated agent output. Throws if the contract is violated, so a malformed
 * agent can never reach the Master silently.
 * @returns {AgentSignal}
 */
export function makeAgentSignal({
  agent, tf, direction, score, confidence, evidence = [], dataHealth, tsUtc,
}) {
  if (!agent) throw new Error('agentContract: agent name required')
  if (!Object.values(DIRECTION).includes(direction)) throw new Error(`agentContract: bad direction ${direction}`)
  if (!(score >= 0 && score <= 100)) throw new Error('agentContract: score must be 0..100')
  if (!(confidence >= 0 && confidence <= 100)) throw new Error('agentContract: confidence must be 0..100')
  if (!dataHealth || typeof dataHealth.ok !== 'boolean') throw new Error('agentContract: dataHealth.ok required')
  return {
    agent,
    tf: tf ?? 'multi',
    direction,
    score: +score.toFixed(2),
    confidence: +confidence.toFixed(2),
    evidence,                                   // [{ label, value, weight }] — provenance
    data_health: dataHealth,                    // { ok, sources:[{name, age_s, fresh}], missing:[] }
    ts_utc: tsUtc ?? new Date().toISOString(),
    contract_version: '1.0.0',
  }
}

/** Standard data-health builder. A source that is stale/missing flips ok=false → the
 *  Master abstains/down-weights this agent (never treats missing as a zero vote). */
export function makeDataHealth(sources = []) {
  const missing = sources.filter(s => !s.fresh).map(s => s.name)
  return { ok: missing.length === 0, sources, missing }
}

/**
 * The interface every sub-agent module must export:
 *   export const meta = { id, name, owns: [...taxonomy rows], tfs: [...] }
 *   export async function run(ctx): Promise<AgentSignal>   // pure read; uses makeAgentSignal
 *   export async function backtest(opts): Promise<{ wr, lb, tpd, n, ... }>   // 23y, fillable, no look-ahead
 *   export function uiCard(signal): object   // data for the cockpit card
 * The runner enforces: history-append, data-health gate, audit hook.
 */
export const AGENT_INTERFACE = Object.freeze(['meta', 'run', 'backtest', 'uiCard'])
