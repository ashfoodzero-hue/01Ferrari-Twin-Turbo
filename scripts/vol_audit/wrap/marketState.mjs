// vol_audit/wrap/marketState.mjs — DROP: volMult 0 (every range break counts as volume-confirmed). RESEARCH ONLY.
import * as O from '../../../src/master/marketState.js?vol_orig'
export * from '../../../src/master/marketState.js?vol_orig'
export const marketStateGeometry = (bars, o = {}) => O.marketStateGeometry(bars, { ...o, volMult: 0 })
export const readMarketState = (bars, o = {}) => O.readMarketState(bars, { ...o, volMult: 0 })
