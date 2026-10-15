# FWD signal + 3m CHoCH → retest entry with a minimum SL: pre-registered test (2026-10-15)

Ashraf: *"check the entry strategy … on 3m TF a CHOCH and retest then we entry … could min. our SL"*.
Written **before any result was seen**.

## Base signals (exactly the forward-test arms, walk-forward, 2017-2026)
- **FWD (92 %):** BUY_D1-x scores. Per-year threshold from `part4_pooled_x_results.json`.
- **FWD1 (≈ 1/day):** BUY_D1-xs scores. Per-year threshold from `part7_results.json` (frequency-anchored).
- **Policy:** the D1 policy (≤ 5 open, ≤ 5 new/day, ≥ 1 h apart), positions known from the original outcomes. This must reproduce the published counts: FWD1 n = 3,416; FWD n = 980.

## Refined entry (BUY only, the arms' side)
After a signal at time T, on closed 3m XAU spot bars (Polygon bid), within 24 h:
1. **CHoCH:** a 3m close above the last CONFIRMED swing high H (`confirmedPivots`, 5 bars each side, as the Matrix).
2. **Retest:** within the next 10 bars, a bar whose low ≤ H + 0.1·ATR14(3m) and that closes GREEN above H. That bar is the entry bar.
3. **Cancel:** a close below H before the retest (failed break). A new CHoCH may start the sequence again inside the 24 h window.
4. **No entry within 24 h** = MISSED (counted, $0).

**Trade**
- **Entry:** buy at the ask at the entry bar's close.
- **SL:** entry-bar low − $0.50 (the minimum stop), hit when the bid trades there; slippage min($0.30, 0.05·ATR3m).
- **Targets:**
  - (a) the signal's ORIGINAL target price (signal entry + 0.2·ATR1d); MISSED if the refined entry is already at or above it;
  - (b) 2 R;
  - (c) 3 R.
- **Horizon:** 7 days; exit at the bid.

## Reported per arm
- The base (original entry, wide SL): WR, $/trade.
- Refined, per target: fill rate, WR, $/trade, average SL in $, **$ per SIGNAL** (missed = 0), by year.

## Verdict
- **Cells:** 2 arms × 3 targets → K = 6 → α = 0.05/6.
- **PASS ⇔** refined trades ≥ 100 AND WR ≥ 90 % AND mean $/trade bootstrap lower bound (α/K) > 0 AND mean $ > 0 in ≥ 80 % of years with ≥ 20 trades.
- **Secondary (descriptive):** does the refined entry beat the base in $ per $1 risked?

## RESULT v1 (3m only): 0 / 6 PASS
- The base signals reproduced exactly (980 / 3,416).
- **FWD:** min SL ≈ $2.8 → 26.3 % WR, −$0.20/t at the original target (base: 92.0 %, +$2.51, SL ≈ $90).
- **FWD1:** min SL ≈ $2.0 → 25.9 % WR, −$0.48/t (base: 90.8 %, +$0.46).
- 2 R / 3 R also negative. A $2-3 stop is inside the normal dip before the $15 target.

## VARIANT v2: pre-registered BEFORE its run (Ashraf: "first we need the confirmation on the 15m TF then we enter on the 3 min")
- After the signal at T: wait (≤ 24 h) for a **15m bullish CHoCH**, i.e. a closed 15m bar closing above the last CONFIRMED 15m swing high (5/5 pivots on 15m).
- Then, from that 15m close, run the same 3m CHoCH → retest → green-close entry (≤ 24 h). The same minimum SL, targets, costs and verdict.
- K becomes 12 (α = 0.05/12).

## RESULT v2 (15m CHoCH first, then the 3m entry): 0 / 6 PASS
| Arm | Fill | Target | WR | $ / trade |
|---|---|---|---|---|
| FWD | 89.5 % | original | 24.8 % | −$0.15 |
| FWD | — | 2 R | 25.2 % | −$0.03 |
| FWD | — | 3 R | 18.5 % | +$0.27 (LB −0.68, 1/7 years) |
| FWD1 | — | original | 22.9 % | −$0.58 |
| FWD1 | — | 2 R / 3 R | 21.7 / 15.5 % | negative |

**Conclusion:** the minimum SL ($2-3) is incompatible with the high win rate. The forward arms keep their tested wide stop.
