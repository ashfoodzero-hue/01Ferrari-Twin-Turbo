# Real S/R levels on 1H / 4H / 1D / 1W / 1M — XAU, Silver, DXY, WTI — with a MEASURED, live-updated strength and zero-stale feeding

Written 2026-10-18. Status: **STUDY RUN 2026-10-18** (Ashraf: "Yes, run it as written"; WTI "Show, marked DELAYED"). Results: `docs/SR_LEVELS_ATLAS.md` — no strength class beats placebo (0 / 176 after Holm). Audit: independent evaluator 0 differences, positive control 99-100 %. Method: skills `gold-measured-study` + `trendline-study` (same placebo / walk-forward / replay discipline).

## Request (Ashraf, 2026-10-18)

> "build the real strong S/R levels at 1H, 4H, 1D, 1W, 1Month for all XAU, DXY, Silver, WTI but make sure the real levels and keep updating the strength of those level from the correct source make sure we have no stales during feeding and make sure to monitor health feeding with zerostale"

## 0. What we already know (it shapes the design)

- **2026-10-11 (MASTER §7 (ai)):** XAU 1H multi-touch clusters did NOT bounce more than random levels (≥ 3 touches 48.2 % vs 47.8 %).
  - "Strong" must therefore be MEASURED, never assumed.
  - A level is called **strong** only if its strength class beats distance-matched placebo levels in TRAIN and in the last 3 years.
- **2026-10-16:** 4H candle levels held 70-78 % WHEN DEFENDED (walls), but that is a reaction already in progress, not a property of the level beforehand.
- **2026-10-18:** trendlines are not respected beyond placebo.
- If no strength class passes, the levels are still shown with their honest measured hold %, and the word "strong" is not used.

## 1. Candidate levels (objective, causal — known only after confirmation)

- **Swing levels:** the published ZigZag 3 × ATR swings of each timeframe (the swing-table rule).
  - A swing high gives a resistance level, a swing low a support level.
  - Each is known at its confirmation candle.
- **Merging:** levels of the same asset within 0.25 ATR(1D) are merged into ONE level zone.
  - All timeframes are merged together, which gives "confluence".
  - The zone keeps every contributing swing.
- **Life:**
  - A level is alive until a candle of its OWN timeframe CLOSES 0.5 ATR(tf) beyond it.
  - After that it is "flipped" (support becomes resistance) and is tracked once more as a flipped level.
  - A second close-through retires it.

## 2. Strength features (fixed before any number)

| Feature | Definition |
|---|---|
| tf rank | Highest timeframe that contributed (1H < 4H < 1D < 1W < 1M) |
| confluence | Number of distinct timeframes inside the zone |
| touches | Number of earlier tests that held (rule of §3) |
| reaction | ATR size of the move away from the level when it was created (the swing leg) |
| age | Candles since creation (tf units) |
| flipped | 0 / 1 |
| volume at the level | Real CME volume share at the level price (GC for XAU, SI for silver, CL for WTI). **2 years only; no volume for DXY.** Tested separately. |

- **Candidate strength classes (pre-registered, each tested):** tf rank, confluence, touches, reaction tercile, and the simple sum score S = tf rank + confluence + min(touches, 3).

## 3. The test (identical to the trendline method)

- **Touch:** price comes within 0.25 ATR(tf) of the level after having been ≥ 1 ATR(tf) away.
  - **HELD:** 1 ATR bounce before a close 0.5 ATR through.
  - **BROKE:** the reverse. A candle that does both counts as broke (conservative).
  - Tested on the timeframe of the level's tf rank.
- **Placebo:** the same level shifted ±0.75 / ±1.5 ATR, through the same rules.
- **Strength is real only if:**
  - hold % beats placebo with a week-block bootstrap lower bound > 0, after Holm correction;
  - the lift is positive in TRAIN (first 3 of the last 6 years) AND in the last 3 years;
  - the reversed walk-forward test gives the chance level.
- **Coverage:** 6 years for XAU, Silver and DXY; WTI 2 years (Polygon; described only).

## 4. Live (keep updating the strength)

- The same code runs after every candle close of each timeframe (per asset, per session, like the trendline refresh):
  - new levels are born at swing confirmation;
  - every touch's outcome updates that level's touches / held / broke counters;
  - a close-through flips or retires the level.
- The **strength shown** is the measured hold % of its class (from the study), plus its own live record (e.g. "3 tests, 3 held").
- **App:**
  - an S/R tab on the chart server: levels per asset and timeframe, zone width, strength class with its measured hold % vs placebo, own record, nearest levels above and below;
  - optional Telegram notices at the strongest MEASURED class only (asked after the result).

## 5. Feeding health with zero stale

- **Source:** Polygon only (red rule).
  - XAU / XAG: live stream.
  - DXY: rebuilt every minute from the 6 live pairs.
  - WTI: CME front month, 10 min DELAYED on our plan, so it is labelled DELAYED and is never "live".
- **New watcher checks** (data health, every 2 min; Telegram on change; the app shows a red STALE banner):
  - per asset, last minute age vs the market state;
  - per asset × timeframe, the levels state written after the last closed candle;
  - the level refresh child runs succeed;
  - candle continuity, with no missing minutes since the last reconcile.
- **Stale stops it:** any STALE stops the S/R notices (the existing gate) and marks the S/R tab STALE.
- **Proof:**
  - a minute-by-minute replay of the live code vs the study's truth (missing 0 / extra 0);
  - a forced-stale test (feed stopped → STALE within one check, notices blocked, recovery announced).

## 6. Honest limits

- **Few candles on the top timeframes:** 1W has about 310 candles in 6 years, and 1M about 72, so their levels are few and their results thin. That is said, not hidden.
- **WTI:** 2 years, delayed.
- **Volume:** 2 years, futures only.
