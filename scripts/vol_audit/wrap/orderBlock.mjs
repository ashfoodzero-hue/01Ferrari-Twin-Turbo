// vol_audit/wrap/orderBlock.mjs — DROP: STRONG = displacement only (relVol ignored). RESEARCH ONLY.
import * as O from '../../../src/master/orderBlock.js?vol_orig'
export * from '../../../src/master/orderBlock.js?vol_orig'
export function orderBlockAt(...a) { const r = O.orderBlockAt(...a); return r && { ...r, strong: r.disp >= O.OB_RULE.strongDisp } }
