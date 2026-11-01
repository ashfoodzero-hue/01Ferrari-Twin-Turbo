// smoke_all.mjs — Ferrari Twin Turbo: run every smoke in sequence, exit non-zero on the first red suite.
//   node scripts/smoke_all.mjs          fast set (~2-3 min: bar loads dominate)
//   node scripts/smoke_all.mjs --full   + the frozen-artifact reproduction (8 GB heap, +1-2 min)
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const FULL = process.argv.includes('--full')
const FAST = [
  ['smoke_execution.mjs'], ['smoke_seq_resolver.mjs'], ['smoke_paper_trader.mjs'], ['smoke_paper_review.mjs'], ['smoke_trial_journal.mjs'], ['smoke_tick_stream.mjs', '--max-old-space-size=2048'], ['smoke_level_radar.mjs', '--max-old-space-size=6144'], ['smoke_watchdog.mjs'], ['smoke_chart.mjs'], ['smoke_ferrari_matrix.mjs', '--max-old-space-size=4096'], ['smoke_gold_whale.mjs'], ['smoke_gamma_fvg.mjs'], ['smoke_fib.mjs', '--max-old-space-size=4096'], ['smoke_ema.mjs', '--max-old-space-size=4096'], ['smoke_day_levels.mjs'], ['smoke_volume_profile.mjs'], ['smoke_elliott.mjs', '--max-old-space-size=4096'], ['smoke_gann.mjs'], ['smoke_calendar.mjs'], ['smoke_trade_monitor.mjs', '--max-old-space-size=4096'], ['smoke_break_continue.mjs'], ['smoke_release_bracket.mjs'], ['smoke_matrix_variants.mjs'], ['smoke_orderflow.mjs'], ['smoke_order_block.mjs'], ['smoke_inv90.mjs'], ['smoke_strong_levels.mjs'], ['smoke_reconcile_plan.mjs'], ['smoke_refresh_retry.mjs'], ['smoke_trade_alert.mjs'], ['smoke_settings.mjs'], ['smoke_matrix_watch.mjs', '--max-old-space-size=4096'], ['smoke_package_sync.mjs'], ['smoke_macro_magnet.mjs', '--max-old-space-size=4096'], ['smoke_macro_tick.mjs', '--max-old-space-size=4096'], ['smoke_wall_bubbles.mjs', '--max-old-space-size=4096'], ['smoke_level_tick.mjs'], ['smoke_swing_start.mjs', '--max-old-space-size=4096'], ['smoke_ny_candles.mjs', '--max-old-space-size=8192'], ['smoke_ny_candles.mjs', '--max-old-space-size=8192', 'XAGUSD'], ['smoke_source_quirks.mjs', '--max-old-space-size=8192'], ['smoke_swing_nextmove.mjs'], ['smoke_structure_3m.mjs'], ['smoke_trendlines.mjs'], ['smoke_trendline_alerts.mjs'], ['smoke_sr_levels.mjs'], ['smoke_sr_live.mjs'], ['smoke_confirm3m.mjs'], ['smoke_sr_dxy_warning.mjs'], ['smoke_session_candles.mjs', '--max-old-space-size=10000'], ['smoke_swing_tools.mjs', '--max-old-space-size=8192'], ['smoke_footprint_tf.mjs', '--max-old-space-size=8192'], ['smoke_study_stats.mjs'], ['smoke_market_context.mjs'], ['smoke_data_contract.mjs', '--max-old-space-size=12000'], ['smoke_recorder.mjs', '--max-old-space-size=4096'], ['smoke_swing_atlas.mjs'], ['smoke_swing_footprint.mjs'], ['smoke_swing_ladder.mjs', '--max-old-space-size=8192'], ['smoke_swing_combine.mjs'], ['smoke_swing_silver.mjs'], ['smoke_swing_trade.mjs'], ['smoke_swing_tightstop.mjs'], ['smoke_swing_earlystep.mjs'], ['smoke_ladder_context.mjs', '--max-old-space-size=14000'], ['smoke_data_health.mjs'], ['smoke_structure_gate.mjs', '--max-old-space-size=8192'], ['smoke_dxy_cache.mjs', '--max-old-space-size=8192'], ['smoke_veto_score.mjs'], ['smoke_refusal_score.mjs', '--max-old-space-size=4096'], ['smoke_ml_sell.mjs', '--max-old-space-size=4096'], ['smoke_matrix_parity.mjs'],
  ['smoke_freshness.mjs'], ['smoke_netresolve.mjs'], ['smoke_temporal_guarantee.mjs'], ['smoke_gdelt_events.mjs'], ['smoke_words_actions.mjs'],
  ['smoke_pro_signal.mjs', '--max-old-space-size=4096'], ['smoke_market_state.mjs', '--max-old-space-size=4096'],
  ['smoke_twin_roster.mjs', '--max-old-space-size=4096'], ['smoke_twin_parity.mjs', '--max-old-space-size=6144'],
  ['smoke_readiness.mjs', '--max-old-space-size=4096'], ['smoke_regime_splitter.mjs', '--max-old-space-size=4096'],
]
const HEAVY = [['smoke_impulse_frozen.mjs', '--max-old-space-size=8192']]
const list = FULL ? [...FAST, ...HEAVY] : FAST
// per-suite time limit (default 20 min). 2026-10-28: twin_roster measured 1607 s alone on 10-27 → killed at 1200 s inside smoke:all.
const LIMIT_MS = { 'smoke_twin_roster.mjs': 2400000 }
let green = 0
const t0 = Date.now()
for (const [script, heap, ...args] of list) {   // extra entries = script arguments (2026-10-17: smoke_ny_candles XAGUSD)
  const t = Date.now()
  try {
    execFileSync(process.execPath, [...(heap ? [heap] : []), path.join(here, script), ...args], { stdio: 'inherit', timeout: LIMIT_MS[script] ?? 1200000, cwd: path.join(here, '..') })
    green++; console.log(`── ${script} GREEN (${((Date.now() - t) / 1000).toFixed(0)}s)\n`)
  } catch (e) { console.error(`\n🚨 ${script} RED (exit ${e.status}) after ${((Date.now() - t) / 1000).toFixed(0)}s — stopping`); process.exit(1) }
}
console.log(`✅ smoke:all — ${green}/${list.length} suites green in ${((Date.now() - t0) / 1000).toFixed(0)}s${FULL ? ' (full)' : ''}`)
