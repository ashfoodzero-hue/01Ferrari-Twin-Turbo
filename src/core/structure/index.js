// ════════════════════════════════════════════════════════════════════════════════
// structure/index.js — barrel export for the deterministic SMC structure suite.
// Ashraf Ferrari Turbo 2 — AI Trading. P2.2 World-Model (2026-06-24).
// ════════════════════════════════════════════════════════════════════════════════
export { detectSwings } from './swings.js'
export { detectLevels } from './supportResistance.js'
export { detectOrderBlocks } from './orderBlocks.js'
export { detectFVGs } from './fvg.js'
export { detectLiquidity } from './liquidity.js'
export { computeVolumeProfile, barDelta, cumulativeDeltaProxy } from './volumeProfile.js'
