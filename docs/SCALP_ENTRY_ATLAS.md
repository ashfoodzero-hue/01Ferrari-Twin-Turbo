# New SCALP entries for 92 % WR with money (BUY + SELL) — RESULTS v2 + v3 (2026-10-23 / 24)

Specs (each committed before its numbers): `docs/SCALP_ENTRY_V2_SPEC.md`, `docs/SCALP_ENTRY_V3_SPEC.md`. ONE place: `scripts/lib/scalp_v2.mjs`.
Studies: `study_scalp_v2.mjs` → `scalp_v2_study.json`, `study_scalp_v3.mjs` → `scalp_v3_study.json`; diagnostic `diag_scalp_n2_years.mjs` → `diag_scalp_n2_years.json`.
Audits CLEAN: `audit_scalp_v2.mjs`, `audit_scalp_v3.mjs` (independent resolver 200 trades 0 diff each; every entry on 50 tape cuts 0 diff, silver cut too;
oracle WR 98.0 % / 98.7 %). Money = the live resolver, measured spreads; 13 y, TRAIN 2013-07 → 2021-06-30 ≤ OOS → 2026-10-22; random control per cell.

## Verdict: 0 pass on BUY, 0 pass on SELL (v2 0/18, v3 0/10). Closest = v3 N2 "gold-only spike" BUY.
**N2:** a 1m gold spike (range ≥ 3 × ATR14(1m), body ≥ 60 %) while silver's same minute is NOT a spike (< 1.5 × its ATR) → fade it at the close.
A = ATR14 of the closed UTC hours; X3 = target 0.25 A / stop 3 A; X1 = 0.25 A / 2 A.

| N2 BUY | TRAIN 2013-21 | OOS 2021-26 | last 2 y | control OOS | missed |
|---|---|---|---|---|---|
| X3 | n 1,489 · 91.5 % · −$0.201 | n 1,271 · **97.2 % · +$0.572 (LB +0.123)** | +$0.765 | −$0.192 | TRAIN WR < 92 %, TRAIN $ |
| X1 | n 1,517 · 88.1 % · −$0.274 | n 1,280 · 95.2 % · +$0.479 (LB +0.116) | +$0.796 | −$0.551 | TRAIN WR, TRAIN $ |

**Year by year (X3, measured):** 2013-2019 lost every year (WR 87-92 %, −$0.20…−$0.80/t) with the spread ≈ 60 % of the target ($0.55-1.00);
2020-2026 won every year (WR 95.0-98.7 %, +$0.03…+$4.05/t) with the spread ≈ 18-32 % of the target ($0.88-5.17). The failure is the cost-to-target
ratio of the small 2013-19 market, not the entry. This explanation is POST-HOC: a rule built on it can only be confirmed forward (no unseen history left).

**Other cells:** v2 F1 spike fade BUY X3 OOS 95.6 % +$0.165 (LB −0.33), TRAIN −$0.315; F2 1H sweep & reclaim loses on both sides; v3 P1 (cost floor) and P2
(1-bar confirmation) post-hoc — fail; N1 two-bar exhaustion loses both sides. **SELL:** nothing makes money — best N2 SELL X3 OOS 92.0 % −$0.122,
v2 F1k3 SELL X2 93.6 % −$0.103. Gold's up-drift keeps every fade-the-up-spike SELL slightly negative.

# ML SELL (2026-10-25) — FIRST PASS on either side: walk-forward GBDT SELL, exit X3
Spec `docs/SCALP_SELL_ML_SPEC.md` (+ ADDENDUM A robustness, each before its numbers); lib `scripts/lib/scalp_ml.mjs`; `study_scalp_sell_ml.mjs` →
`scalp_sell_ml_study.json`; `robust_scalp_sell_ml.mjs` → `scalp_sell_ml_robust.json`. Rows = every closed 3m bar 2013-26 (1,535,000), 31 causal features
(gold, 1m spikes, silver, DXY incl. the bullish flag, time, cost); model fit < Y−1, threshold on Y−1 (unsequenced cal WR ≥ 93 %, $ > 0), traded in Y.

| ML SELL | P1 2016 → 2021-06-30 | P2 → 2026-10-22 | last 2 y | random SELL control P1 / P2 | verdict |
|---|---|---|---|---|---|
| **X3** (0.25 A / 3 A) | n 2,157 · **94.1 %** (LB 93.0) · **+$0.456** (LB +0.263) | n 2,595 · **95.8 %** (LB 95.0) · **+$1.181** (LB +0.475) | +$1.739 | −$0.217 / −$0.199 | **PASS** |
| X1 (0.25 A / 2 A) | n 580 · 87.8 % · −$0.035 | n 2,599 · 92.2 % · +$0.765 (LB +0.311) | +$1.166 | −$0.303 / −$0.208 | fail (P1) |

**Audit CLEAN (both exits):** independent resolver 0 diff; label-leak years 0; feature prefix cuts 50 / 0 diff; shuffled-label control X3 n 45, −$0.006
(no edge), X1 n 0; oracle control WR 100 %. Run 2 reproduced run 1's X1 exactly (deterministic).
**Robustness (ADDENDUM A) PASS:** X3 positive in all 11 years 2016-2026 (WR 93.4-97.6 %, +$0.15 … +$2.31/t); spread × 1.5: P1 +$0.35 (93.2 %), P2 +$0.95
(95.3 %); 1.31 / 1.57 trades per trading day. **Caveat:** one pass among many SELL searches since 10-16 → forward PAPER record before anything live.

# ⚠ 2026-10-26 — the ML SELL PASS ABOVE IS WITHDRAWN (MASTER §7 (ee))
The resolver never closed a trade whose 24 h horizon fell on a weekend; `matrix_trades.mjs` silently skipped such trades and their label rows were unpriced.
Re-measured with the fix: **X3 P1 89.0 % −$0.257/t, P2 90.0 % −$0.392/t, last 2 y −$0.694 → FAIL**; X1 fail. The v2/v3 rows above (incl. N2 BUY) were priced
the same way and must be re-measured before they are quoted.
