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
