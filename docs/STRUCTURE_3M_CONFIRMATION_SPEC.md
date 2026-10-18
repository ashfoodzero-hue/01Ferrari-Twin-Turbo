# 3m structure confirmation at the swing tips — XAU, XAG, DXY, WTI (last year)

Written 2026-10-18. Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-18)

> "check all the structure confirmation on 3m time frame, and find me the exact confirmation level on the swing point and how it works exactly at the tip level, this to be done on XAU, Silver, DXY, WTI and tell me what is in common with high % … and do they act same? … but only on the swing confirmation levels which we already identified for past year … if not please tell me the exact difference"

## 1. Which swing tips

- Only the swings already identified for the last year (`docs/swing_book/<xau|xag|dxy_ice|wti>_1y_swings/`), on the anchor timeframes **15m, 1H, 4H and 1D**.
- **DXY:** the TradingView-session version (`dxy_ice`), because its candle times are the ones you see.
- Every candle is TradingView-exact for its instrument, and the 3m candles come from the same minutes.

## 2. The 3m structure at each tip (definitions fixed before the run)

- **3m pivots:** a 3m candle whose high (low) is the highest (lowest) of the 3 candles on each side. Known only when the 3rd candle after it closes.
- **The CONFIRMATION LEVEL of a LOW tip** = the last 3m pivot HIGH that formed before the tip, inside the leg into the tip (the last lower high). Mirrored for a HIGH tip.
- **Confirmation (change of structure)** = the first 3m CLOSE beyond that level after the tip.
  - Measured: the level's distance from the tip (anchor ATR, 3m ATR, $ / %), the time from tip to confirmation (3m candles, minutes), and how far the confirming candle closed beyond it.
  - Also measured: a close beyond vs only a wick beyond first.
- **Second confirmation (continuation):** the first 3m close beyond the next 3m pivot in the new direction.

## 3. How it works at the tip (each counted, with its rate)

| Pattern at the tip (3m) | Definition |
|---|---|
| Liquidity sweep | The tip takes out the previous 3m pivot low / high by ≥ 0 and the 3m candle closes back inside |
| V-turn | The confirmation level breaks with NO higher low (lower high) first |
| Higher-low / lower-high turn | A 3m pivot higher low (lower high) forms after the tip, before the confirmation |
| Double tip | A second test within 0.25 anchor-ATR of the tip before the confirmation |
| Retest after confirmation | After the confirming close, price comes back to the confirmation level (± 0.1 3m-ATR) before going on, and whether it HOLDS (no 3m close back through it) |
| Confirmation candle type | Its body / range and close location (strong close vs weak) |

## 4. The control: is this special to real swings?

- The same measures at **failed extremes** on the same anchor timeframe: a running extreme that looked like the turn (a pullback of ≥ 1 anchor ATR) but was then broken.
- **The key number, per pattern:** at real swing tips vs at failed tips. For example: "a 3m confirmation happened at 95 % of real tips, but also at 80 % of failed tips".
- **Precision of the 3m confirmation** = of all tips where it fired, the share that turned out to be real swings.

## 5. Across the four instruments

- The same table per instrument and anchor timeframe.
- **"Act the same"** = no significant difference between instruments (two-proportion tests, Holm across the comparisons).
- **Where they differ,** the exact difference is reported: which pattern, by how much, at which timeframe, with n.

## 6. Reported

- `data/master/structure_3m_confirmation.json`, `docs/STRUCTURE_3M_CONFIRMATION_ATLAS.md`, and every tip as a row (CSV).
- Honest limits:
  - **Hindsight:** the anchor swing is known only afterwards, so this describes what happened at real tips. Only the failed-tip comparison says whether it helps in real time.
  - **DXY minutes have no real intra-minute wicks** (rebuilt from 6 pairs), so its 3m pivots are slightly smoother.
  - **Small samples:** the 1D anchors have about 10-15 tips per instrument: described, not proven.
