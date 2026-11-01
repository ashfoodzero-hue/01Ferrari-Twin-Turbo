// T1 step 2 (spec 2026-11-01 §3): the ONE parser for Forex Factory value text ("0.3%", "245K", "-75.4B", "52.1").
// The number is kept in the unit FF prints it in (245K -> 245, unit 'K'); predictions are made in that same unit.
export function ffValue(s) {
  if (s == null) return null
  const m = /^\s*([+-]?\d+(?:\.\d+)?)\s*([KMBT%]?)\s*$/.exec(String(s))
  return m ? { value: Number(m[1]), unit: m[2] || '' } : null
}
