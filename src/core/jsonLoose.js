// jsonLoose.js — parse JSON that a provider has damaged with an invalid backslash escape (2026-09-13).
// Origin: GDELT answered a whole day (2025-10-08) with a body whose title carried a lone backslash — JSON.parse threw
// "Bad escaped character" and the backfill marked the day FAILED on every run since. Strict parse first; only when the
// strict parse throws, every backslash that does not start a legal escape is doubled and the parse is retried. A body
// that is broken in any other way still throws — this never invents data.
const ILLEGAL = /\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g
export function parseJsonLoose(text) {
  try { return JSON.parse(text) } catch (e) {
    const fixed = String(text).replace(ILLEGAL, '\\\\')
    if (fixed === text) throw e
    return JSON.parse(fixed)
  }
}
