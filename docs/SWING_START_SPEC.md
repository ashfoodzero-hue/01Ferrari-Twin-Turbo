# SWING START WATCH — do the measured swing-origin conditions mark real trend starts? (pre-registered 2026-10-16)

**Request (Ashraf):** "if a real swing would occur at those levels, would we be able to know this level is a continuation of the main down trend, or a swing is building and price would start a bullish trend … so we take advantage and ride the big trend from the start" → "yes, measure the swing start watch".

**Origin.** Turbo 2 Study 20 (23 y, 67 ≥ 10 % up-swings): at origins, 52-week-low sweep & reclaim ×33 (precision ~35 %), RSI < 30 ×5.5, discount ×2.0. Re-measured here on the Twin's own Polygon data.

## Bars

Daily candles = NY trading days (17:00 New York → 17:00 New York, DST-aware), built from the Twin's 1m. Only COMPLETED days are used. Window 2013-07-21 → 2026-10-09T06:00.

## Alerts (known at the day's close)

| Alert | Bull (swing-UP start) | Bear |
|---|---|---|
| **A-52W** | low < the prior 252-day low AND close > that prior low | mirror: high > the prior 252-day high AND close < it |
| **A-SWEEP+EXH** | low < the prior 20-day low AND close > it, AND close in the bottom 25 % of the last 60-day range, AND daily RSI14 < 35 on this day or one of the 3 before | mirror (top 25 %, RSI > 65) |
| **A-SWEEP+DISC** | A-SWEEP+EXH without the RSI condition | mirror |

Repeat alerts within 10 days of the same side count once (the first).

## Outcome ("a swing started")

- **Bull:** from the alert-day close, price reaches **+5 %** (S5) before a daily CLOSE below the alert day's low (the sweep low), within 60 trading days. **Bear:** mirror (−5 % before a close above the alert day's high).
- **+10 % (S10)** is reported the same way.

## Base (the null)

The same outcome from EVERY day in the same split, with that day's own low (bull) / high (bear) as the invalidation line. Gold's drift is in the base.

## Cells and verdict

- **Cells:** K = 6 = {A-52W, A-SWEEP+EXH, A-SWEEP+DISC} × {bull, bear} on S5.
- **Split:** TRAIN = first 60 %, OOS = last 40 %.
- **USEFUL** ⇔ all of these hold:
  - OOS n ≥ 20;
  - OOS precision − base ≥ +10 pp, with Wilson LB at z(α/K) > base;
  - TRAIN precision − base > 0.
- Alerts are rare: a cell with OOS n < 20 is UNDERPOWERED, with the full-sample numbers reported.
- **Reported:**
  - S10;
  - alerts / year;
  - median days to +5 %;
  - the R-multiple if traded (entry at the next day's open + the measured spread, stop = a close beyond the alert-day extreme, exit at +5 % or at the stop / 60 days);
  - pre/post 2020;
  - the full-sample precision.

Study: `scripts/study_swing_start.mjs` → `data/master/swing_start_study.json`.
