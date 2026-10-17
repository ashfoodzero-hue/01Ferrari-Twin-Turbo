#!/usr/bin/env bash
# vol_audit/run_all.sh — runs every pre-registered re-test (docs/VOLUME_AUDIT_SPEC.md) in two lanes. Logs: data/master/vol_audit/logs/.
# RESEARCH ONLY: studies run unchanged under scripts/vol_audit/preload.mjs; artifacts land in data/master/vol_audit/<tag>/.
cd "$(dirname "$0")/../.." || exit 1
LOG=data/master/vol_audit/logs; mkdir -p "$LOG"
# swing_walls before wall_context / sell_downtrend (they read its artifact)
STUDIES="study_swing_walls study_wall_bubbles study_c4h_levels study_wall_context study_wall_scalp study_wall_pullback study_wall_defense_money study_sell_downtrend study_matrix_loss_autopsy study_fvg_strong study_order_block study_ob_weak4h study_volume_profile study_vp_matrix_filter"
one() { # mode window study [tag] [candFrom]
  local tag="$1_$2${4:+_$4}" t0=$(date +%s)
  VOL_MODE=$1 VOL_WINDOW=$2 VOL_TAG=$4 VOL_CAND_FROM=$5 node --max-old-space-size=8192 --import ./scripts/vol_audit/preload.mjs "scripts/$3.mjs" > "$LOG/${tag}__$3.log" 2>&1; local rc=$?
  echo "$(date -u +%H:%M:%S) $tag $3 exit $rc $(( $(date +%s) - t0 ))s" | tee -a "$LOG/progress.txt"
}
config() { for s in $STUDIES; do one "$1" "$2" "$s"; done; }
lane1() { one raw full study_state_gate_on_impulse; config raw full; config raw cme2y; config cme cme2y
  one cme full study_state_gate_on_impulse cmeera 2024-12-08T00:00:00Z; }
lane2() { one drop full study_state_gate_on_impulse; config drop full; config drop cme2y
  one raw full study_state_gate_on_impulse cmeera 2024-12-08T00:00:00Z; one drop full study_state_gate_on_impulse cmeera 2024-12-08T00:00:00Z
  node --max-old-space-size=8192 scripts/vol_audit/radar_identity.mjs > "$LOG/radar_identity.log" 2>&1; rc=$?; echo "$(date -u +%H:%M:%S) radar_identity exit $rc" | tee -a "$LOG/progress.txt"
  node --max-old-space-size=8192 scripts/vol_audit/state_agreement.mjs > "$LOG/state_agreement.log" 2>&1; rc=$?; echo "$(date -u +%H:%M:%S) state_agreement exit $rc" | tee -a "$LOG/progress.txt"; }
: > "$LOG/progress.txt"
lane1 & lane2 & wait
echo "ALL DONE" | tee -a "$LOG/progress.txt"
