# Money test: entering on the 3m confirmation at 15m swing tips — overall and AT S/R levels

Written 2026-10-19. Status: **RUN 2026-10-19** (Ashraf: "Yes, run it as written"). Results `docs/CONFIRM3M_MONEY_ATLAS.md`: 0 / 384 pass; before costs a coin flip (1R WR 50 %). ADDENDUM A (before numbers): bid minutes → FULL spread per round trip. ADDENDUM B (before numbers): raw minutes (the TradingView reopen clamp looks 10 min ahead). Silver spread measured for this test (`spread_table_XAGUSD.json`). Method: skills `gold-measured-study`, `swing-structure-study`.

## Request (Ashraf, 2026-10-18 / 19)

> "dose the confirmation of swing on 3m time frame add value to our signal" → "ok, and can u check this specially at strong S/R levels"

## 0. What we know going in

- **3m confirmation as a turn detector:** a 3m confirmation at a running 15m extreme becomes a real 15m swing 64-67 % of the time (base 44 %). It prints before the 15m swing confirms in 87-90 % of cases (`STRUCTURE_3M_CONFIRMATION_ATLAS.md`).
- **"Real swing" is not profit:** the direction after a confirmed 15m swing is close to a coin flip (`SWING_NEXTMOVE_15M_ATLAS.md`). So only a money test can answer the question.
- **S/R:** no level class is measured strong (`SR_LEVELS_ATLAS.md`). Here we test whether being AT a level (by class) changes the money result of the 3m entry.

## 1. Candidates (strictly causal, minute by minute)

- **The 15m leg:**
  - The leg direction comes from the last CONFIRMED 15m ZigZag 3 × ATR swing (the swing-table rule).
  - The running extreme of the current leg is the TIP. Every new extreme replaces it.
- **Confirmation level:** the last 3m pivot of the leg against the tip (3 left / 3 right).
  - **It must already be confirmed when used** (pivot + 3 candles closed). This is stricter than the descriptive study, where 91 % of levels were known at the tip.
- **Trigger:** the first 3m CLOSE beyond that level while the tip is unbroken.
  - Low tip → BUY; high tip → SELL.
  - One trade per tip.

## 2. The trade (fixed before any number)

- **Entry:** the open of the minute after the confirming 3m close, plus half the spread (`spreadModel.makeSpreadAt`, measured).
- **Stop:** the tip ∓ 0.1 ATR(15m), plus the spread.
- **Targets (K = 4, Holm across them):** 1R, 2R, 1 × ATR(15m), 2 × ATR(15m).
- **Time stop:** 20 × 15m candles, exit at the close.
- **Fill:** resolved on 1m candles. If the stop and target fall in the same minute, the STOP comes first (conservative).
- **Reported per arm:**
  - trades per day;
  - win rate WITH $ per trade and R per trade after spreads;
  - Wilson lower bound;
  - week-block bootstrap lower bound of $/trade;
  - max drawdown.

## 3. AT S/R levels (the question asked)

- **At a level:** at the trigger, the tip is within 0.25 ATR(tf) of an ALIVE S/R level of that timeframe.
  - The level must be known before the tip: born at its swing confirmation (`src/master/srLevels.js`, live state).
  - Its side must match the trade: a support for a BUY, a resistance for a SELL.
- **Splits, each against "not at any level":**
  - at a level on 1H / 4H / 1D / 1W / 1M (the highest timeframe present);
  - confluence 2+ (levels from ≥ 2 other timeframes within 0.25 ATR(1D));
  - level held before ≥ 2 times;
  - the "usual strong" union: 1D-or-higher OR confluence 2+ OR held ≥ 2.
- **Add-ons from the structure study, tested as filters:**
  - a 3m higher low / lower high before the confirmation;
  - entry on a holding retest of the level instead of the confirming close (a second arm).

## 4. Data and validation

- **Assets and windows:**
  - XAU and Silver: 2013-07 → 2026-10 (13 y), Polygon spot.
  - DXY: 2015 → (results in R only; DXY is not tradable, so there are no spreads).
  - WTI: 2024-10 → (2 y; CME 1m, real volume; described only).
- **Walk-forward:** the 8 gate folds (0-4 TRAIN / 5-7 OOS), plus the last 3 years separately.
- **PASS** (per arm and split), only if ALL hold:
  - $/trade after spreads > 0 with the bootstrap lower bound > 0 in TRAIN and in OOS;
  - the same sign in ≥ 6 of 8 folds;
  - n ≥ 100 OOS trades;
  - Holm across all arms × splits.
- **Proof:**
  - an independent second trade simulator gives 0 differences on a random sample;
  - a positive control: the same rules with entry at the TRUE 15m swing tip (look-ahead on purpose) must show a large profit;
  - the replay is causal (the candidate list on a history prefix equals the full run cut at that time).

## 5. Honest limits

- **Only signals that pay the spread can pass.** Earlier books died at the broker-spread wall.
- **Few weekly and monthly levels:** their splits will mostly be "described only".
- **No live signal from this study.** A PASS gives a candidate that still needs the forward paper test and Ashraf's approval.
