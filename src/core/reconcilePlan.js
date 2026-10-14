// ════════════════════════════════════════════════════════════════════════════════
// reconcilePlan.js — WHEN to run reconcile_1m.mjs and HOW FAR BACK (2026-10-14; Ashraf: "every time we restart or close the PC the system
// refresh automatic and cover all required data to be 100 % correct … to last ticks"). ONE rule, used by run_twin.mjs.
// ────────────────────────────────────────────────────────────────────────────────
// MEASURED reasons (2026-10-14): (1) the old rule ran only inside 00:20-00:59 UTC — a PC asleep/off then skipped the day; (2) it looked back
// 2 days, but Polygon re-issued 35 % of 2026-10-07…11 gold minutes days later (avg $0.12, max $1.85) — found only by a 7-day run;
// (3) a network failure (DNS_ALL_FAILED at 00:20 on 10-14) was logged as success and never retried.
// RULE: run (a) once per app start, 2 min after it (the stream has refilled by then); (b) whenever the last SUCCESS is ≥ 20 h old;
// (c) after a failure, again every 30 min until it succeeds. Window = days since the last successful run's end + 7, clamped to [7, 30].
// ════════════════════════════════════════════════════════════════════════════════
export const RECON = Object.freeze({ startDelayMs: 120000, dueMs: 20 * 3600000, retryMs: 30 * 60000, minDays: 7, maxDays: 30 })
const DAY = 86400000

/** state = data/master/reconcile_state.json ({ okAt, coveredTo, failedAt }) or null. Returns { run, days, why }. */
export function reconcilePlan({ now, startedAt, state, running, attemptedThisStart, lastAttemptAt }) {
  const days = Math.min(RECON.maxDays, Math.max(RECON.minDays, (state?.coveredTo ? Math.ceil((now - state.coveredTo) / DAY) : 0) + RECON.minDays))
  if (running) return { run: false, days, why: 'running' }
  if (lastAttemptAt != null && now - lastAttemptAt < RECON.retryMs) return { run: false, days, why: 'attempted recently' }
  if (!attemptedThisStart) return now - startedAt >= RECON.startDelayMs ? { run: true, days, why: 'app start' } : { run: false, days, why: 'waiting for the stream refill' }
  const failedLast = state?.failedAt != null && (state.okAt == null || state.failedAt > state.okAt)
  if (failedLast) return { run: true, days, why: 'retry after failure' }
  if (state?.okAt == null || now - state.okAt >= RECON.dueMs) return { run: true, days, why: 'daily (last success ≥ 20 h ago)' }
  return { run: false, days, why: 'up to date' }
}
