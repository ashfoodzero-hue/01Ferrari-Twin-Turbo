// vol_audit/radar_identity.mjs — levelRadar reads no volume: every 4H decision must be IDENTICAL with spot v = raw vs v = 0
// (docs/VOLUME_AUDIT_SPEC.md). Full history, causal radar (the live/validator path). RESEARCH ONLY — writes data/master/vol_audit/radar_identity.json.
import '../../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { loadBars } from '../../src/data/backfillReader.js'
import { TURBO, HISTORY_CONTINUOUS_FROM } from '../../src/core/paths.js'
import { buildRadar, decisionAt, closedH4Count } from '../../src/master/levelRadar.js'

const TO = Date.parse(process.env.TURBO_VAL_TO || '2026-10-09T06:00:00Z')
const B = (await loadBars('XAUUSD', '15m', { from: HISTORY_CONTINUOUS_FROM, to: TO })).bars
const run = (bars) => { const R = buildRadar(bars), n = closedH4Count(R, TO), out = []; for (let i = 0; i < n; i++) out.push(decisionAt(R, i)); return out }
const a = run(B), b = run(B.map((x) => ({ ...x, v: 0 })))
let diff = 0, dec = 0; for (let i = 0; i < a.length; i++) { if (a[i]) dec++; if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) diff++ }
const res = { at: new Date().toISOString(), m15: B.length, h4_points: a.length, decisions: dec, differing: diff, verdict: diff === 0 ? 'IDENTICAL — levelRadar carries no volume' : 'DIFFERS' }
fs.mkdirSync(path.join(TURBO.master, 'vol_audit'), { recursive: true })
fs.writeFileSync(path.join(TURBO.master, 'vol_audit', 'radar_identity.json'), JSON.stringify(res, null, 1))
console.log(JSON.stringify(res))
