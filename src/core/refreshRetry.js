// ════════════════════════════════════════════════════════════════════════════════
// refreshRetry.js — ONE retry rule for the hourly refresh queues in run_twin.mjs (S/R levels, trendlines). 2026-10-29, Ashraf: "why this keeps
// happening, we need to find the reason and solve it permanent … i need fix with preventing it happen again".
// MEASURED cause that day: a 5-minute internet / DNS outage (15:04-15:09 UTC, DNS_ALL_FAILED, 10 stream disconnects) hit while the 15:07 S/R refresh
// ran → XAGUSD / DXY_ICE / DXY correctly refused stale data (exit 2) — and the queue only runs once per hour, so a 5-min blip left the levels ~2 h
// stale (SR_FEED_STALE). Rule: a refresh that fails (any non-zero exit, kill, timeout) is re-queued afterMs later, again and again until it succeeds;
// a success clears it. The fail-closed guard inside the refresh stays exactly as it is.
// ════════════════════════════════════════════════════════════════════════════════
export const RETRY = Object.freeze({ afterMs: 5 * 60000 })

/** A retry book for keys like 'sr:XAGUSD'. done(key, ok, now) after every run; dueKeys(now) returns (and clears) the keys to re-queue now. */
export function makeRetry() {
  const due = new Map()
  return {
    done(key, ok, now) { if (ok) due.delete(key); else due.set(key, now + RETRY.afterMs) },
    dueKeys(now) { const k = [...due].filter(([, t]) => now >= t).map(([key]) => key); for (const x of k) due.delete(x); return k },
    pending() { return [...due.keys()] },
  }
}
