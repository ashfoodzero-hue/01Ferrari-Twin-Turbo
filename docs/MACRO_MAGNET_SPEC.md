# 4H MACRO MAGNET: exact copy + 13-year measurement + DXY cross-check (pre-registered 2026-10-16)

**Request (Ashraf, 2026-10-16):** add the visionHunt "4H Macro Magnet Engine" Long/Short bias to the dashboard, *"very accurate … do not miss any small information … also check DXY same method, I think this will give us extra strength on giving the Bias % if DXY shows the other side of our output score"*.

Source: the Pine v5 script pasted by Ashraf (2026-10-16). It is copied rule by rule below. Written **before** any result was seen.

## 1. The score (exact copy)

All values come from the 4H series.

| Vector | Points | LONG when | otherwise SHORT |
|---|---|---|---|
| A trend | 35 | EMA9 > EMA21 (Pine `ta.ema`: SMA-seeded) | (equal → SHORT) |
| B liquidity magnet | 35 | dist to BSL < dist to SSL | (equal or BSL missing → SHORT) |
| C RSI | 20 | RSI14 > 50 (Wilder) | (= 50 → SHORT) |
| D candle | 10 | close ≥ open | close < open |

- **LONG % = long points, SHORT % = 100 − LONG.** The display side is LONG when long ≥ short.
- **BSL / SSL registers:**
  - a pivot high (low) with 10 bars on each side becomes known 10 bars after it, and sets BSL (SSL);
  - in the same bar, a close > BSL (< SSL) clears it (na);
  - a missing register has distance 99999 (Pine).
- **Pivot ties:** the pivot bar must be strictly higher (lower) than the 10 bars on both sides. Pine does not document its tie rule, so ties are COUNTED and reported.

## 2. Bars

- **Primary:** 4H candles anchored at the forex day open, 17:00 America/New_York (TradingView OANDA convention), DST-aware. Built from the Twin's Polygon 1m (gold) and the rebuilt DXY 1m (six pairs, ICE formula).
- **Robustness:** UTC-anchored 4H (00/04/08 …), same tests.

## 3. Causality

- The score is read at the **close** of 4H bar k, from closed bars only.
- **Method E (look-ahead audit, reported):** the Pine uses `lookahead_on`. Its history colours bar k with the score from bar k's FINAL values, i.e. it "predicts" bar k itself. Both numbers are reported:
  - Pine view: P(bar k up | score_k);
  - live view: P(bar k+1 up | score_k).

## 4. Outcomes

- **O1:** next 4H direction — close[k+1] > close[k].
- **O2:** next 24 h direction — close[k+6] > close[k].
- **O3** (the magnet claim of vector B, reported):
  - with both BSL and SSL set: which is touched first within 30 bars (high ≥ BSL / low ≤ SSL);
  - compared with the distance-only expectation d_far / (d_near + d_far).

## 5. DXY cross-check

The same score is computed on DXY 4H. **DXY confirms** a gold LONG when DXY's side is SHORT (USD weak), and confirms a gold SHORT when DXY is LONG.

## 6. Cells and verdict

- **Window:** 2013-07-21 → 2026-10-09T06:00. TRAIN = first 60 %, OOS = last 40 % (time order).
- **Base:** P(up) of the same outcome over all bars in the same split. Gold drifts up, so the null is the drift, not 50 %.
- **Cells (K = 8):** {O1, O2} × {gold LONG ≥ 65, gold SHORT ≥ 65} × {gold alone, gold + DXY confirms}. LONG cells score P(up); SHORT cells score P(down) against the base P(down).
- **INFORMATIVE** ⇔ all of these hold:
  - OOS n ≥ 300;
  - OOS hit rate − base ≥ +3 pp;
  - Wilson lower bound at z(α/K) > base;
  - TRAIN hit rate − base > 0.
- **Reported, never a verdict:** every score value (0-100), each vector alone, pre/post 2020, UTC anchor, Method E, O3, pivot ties.

## 7. Display rule (fixed now)

- The dashboard shows Ashraf's score exactly as his indicator does, **plus** the MEASURED OOS hit rate for the current score bucket and DXY state.
- Never a bare "100 %". A cell that is not INFORMATIVE is labelled "no measured edge".

Output: `data/master/macro_magnet_study.json`. Engine: `src/master/macroMagnet.js`. Study: `scripts/study_macro_magnet.mjs`.
