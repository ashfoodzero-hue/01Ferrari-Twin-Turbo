// vol_audit/wrap/fvg.mjs — DROP: the activity (volume) condition s2 treated as satisfied. RESEARCH ONLY.
import * as O from '../../../src/master/fvg.js?vol_orig'
export * from '../../../src/master/fvg.js?vol_orig'
export function fvgAt(...a) { const r = O.fvgAt(...a); return r && { ...r, s2: true, strong: r.big && r.s1 && r.s3 === true } }
