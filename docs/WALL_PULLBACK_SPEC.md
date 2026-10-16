# PULLBACK LIMIT ENTRY after a defended wall — $4 first, then BE (pre-registered 2026-10-16)

**Request (Ashraf):** "we need to figure out how we can confirm the $4 only, then we do BE SL".

**Why this test.** Study (be): after the bubble, a MARKET entry reached +$4 before the stop only ~43 % of the time — the bounce happens before the entry, and the stop beyond the wall sits ~$4.7 away. This test changes the ENTRY, not the exit: wait for price to come back to the DEFENDED wall.

## Setup

- **Levels:** L4H = closed NY 4H candle highs/lows (main); L1H = closed 1H candle highs/lows. The test engine is `swingWallEvents` (touch, zone/push defence, decision at touch + 2).
- **Bubble:** strong defence only (DEF>PUSH or STRONG; STRONG = the variant's TRAIN p66).
- **Limit order:**
  - placed at the decision, at wall ∓ 1 bin (SELL limit wall − 1 bin at a ceiling; BUY limit wall + 1 bin at a floor);
  - valid 30 min;
  - filled when the BID (SELL) / ASK (BUY) reaches it, using 1m bars and the measured spread;
  - cancelled if price first closes beyond wall ± 2 bins (the wall broke).
- **Stop:** wall ± 3 bins. Hit when the ask (SELL) / bid (BUY) reaches it; stop first inside a minute; slippage min($0.30, 0.15 × ATR14 1m).
- **Exits:**
  - **SPLIT4** (Ashraf's exit): half at $4, then the stop moves to entry, the other half at $10.
  - **T4** (reported only: everything at $4).
- **Horizon:** 4 h after the fill. One position at a time per variant.

## Cells and verdict

- **Cells (K = 2):** {L4H, L1H} × SPLIT4.
- **Split:** TRAIN = first 60 %, OOS = last 40 %. Window 2013-07-21 → 2026-10-09T06:00.
- **PASS** ⇔ all of these hold:
  - OOS n ≥ 100;
  - **WR ≥ 0.85** with Wilson LB at z(α/K) ≥ 0.80;
  - mean $ / trade > 0 with bootstrap LB at α/K > 0;
  - TRAIN mean > 0.
- **Reported:**
  - fill rate (the share of bubbles where price came back);
  - the share of fills reaching +$4;
  - average risk;
  - by side;
  - pre/post 2020;
  - T4.

Study: `scripts/study_wall_pullback.mjs` → `data/master/wall_pullback_study.json`.
