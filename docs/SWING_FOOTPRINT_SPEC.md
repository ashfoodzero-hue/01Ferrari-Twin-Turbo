# Swing-candle study, Phase 2: the footprint at swing points (pre-registered 2026-10-17)

Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any number is computed.

## Request (Ashraf, 2026-10-17)

> "… after you complete this full understanding … we need to study these candles and read the footprint in a smart way and compare them with other time frames … and find out how Bear become a Bull and when Bull become a bear."
>
> Then: "yes write the Phase 2 rules".

Phase 1 (`docs/SWING_CANDLE_ATLAS.md`) showed:
- the extreme candle alone barely separates real swings from failed ones;
- the next 1-3 candles separate them clearly.

**Phase 2 asks:** does the ORDER FLOW inside those candles (who was aggressive, who absorbed, where the volume sat) separate real swings from failed extremes, and does it do so earlier than the candle shape?

## 1. Data (`docs/DATA_CONTRACT.md`)

**Footprints:** real CME gold futures from Databento tbbo, i.e. every trade with the EXCHANGE aggressor side.
- File: `data/orderflow/gc_1m_footprints.jsonl`, 2024-10-01 → 2026-10-08.
- Rolled to each timeframe by `footprintTf.footprintCandles`, using the SAME candle timing as the spot candles (`candleOpen`).
- Proof: the 1m → 5m roll-up equals the independent 5m build on 6,072 candles.

**Futures ≠ spot.** Footprints are matched to the spot candle by TIME only. A futures candle that spans a contract roll (`roll: true`) is excluded.

**Events:** exactly Phase 1's events (spot swings at 3× ATR, the C1 failed extremes, C2 random candles, the same seeds), restricted to candles inside the footprint window.

**Timeframes:**
- tested: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 3H, 4H;
- 6H and higher: fewer than 30 OOS swings in 2 years, so described only.

## 2. Footprint measures (definitions fixed in `src/master/footprintTf.js` → `footprintRead`)

For every candle at offsets −3 … +3 (addendum A applies: at offset +k a failed extreme counts only while still unbroken):

| Measure | Meaning |
|---|---|
| `delta_frac` | (buyer-aggressor − seller-aggressor volume) / volume. Binned into TRAIN-C1 terciles, plus its sign. |
| `poc_loc` | where the highest-volume price sits in the candle (0 = at the low, 1 = at the high), terciles |
| `low_vol_frac`, `high_vol_frac` | share of volume traded in the bottom / top 10 % of the candle's range. Terciles: thin = "unfinished" extreme, heavy = defended. |
| `low_sell_frac`, `high_buy_frac` | share of volume that is seller-aggression in the bottom 10 % / buyer-aggression in the top 10 %, terciles |
| `stacked_buy ≥ 3`, `stacked_sell ≥ 3` | 3 or more consecutive price levels where one side beats the other diagonally by ≥ 3 : 1 |
| `absorption_low` | heavy selling at the low (≥ 15 % of volume) while the candle closes in its upper half |
| `absorption_high` | the mirror at the high |
| `rel_volume` | candle volume / the median of its 20 previous candles, terciles (real CME volume) |

**Window measures (offsets −3 … 0):**
- `cum_delta_sign`: the sign of the summed delta of the 4 candles.
- **Delta divergence:**
  - at a low: price at offset 0 is below the lowest low of offsets −3 … −1, while the delta of offset 0 > 0;
  - at a high: the mirror (price above the highest high of −3 … −1 while the delta of offset 0 < 0).

## 3. Statistics (same rules as Phase 1)

**Split:** inside the footprint window, TRAIN = the first 60 % (2024-10-01 → ≈ 2025-12-04) and OOS = the last 40 %.

**Family:** one per timeframe × side, covering every footprint measure × offset × bin vs C1. Holm at α = 0.05 on OOS.

**A FINDING (✅)** must meet all of these:
- passes OOS Holm;
- the same sign in TRAIN;
- the same sign vs random candles (C2);
- the same sign at swings of 2× and 5× ATR.

**Labels for everything else:**
- **DESCRIBED ONLY:** fewer than 30 OOS swings on that side.
- **Effect size** (addendum B): tiny < 5 pt, moderate 5-10 pt, clear ≥ 10 pt.

**Head-to-head with Phase 1 (reported, not a pass rule).** For every footprint FINDING, also report the Phase-1 candle-shape result at the same offset on the same events in the same 2-year window. This shows whether the footprint adds anything beyond the candle shape.

## 4. Honest prior

- Earlier Twin Turbo footprint tests found no tradeable edge on any timeframe:
  - Trader Dale confirmations at prev-day VP / H-L;
  - footprint at 1H swing S/R;
  - every confirmation combined: 45.8 %;
  - (MASTER_DOCUMENT (ae), (af), (ai)).
- Those were trade tests at levels. This is a different question: description at swings vs failed extremes.
- **Power:** two years only, so the HTF cells will be thin. The results report exactly how thin.

## 5. Output

- `data/master/swing_footprint_atlas.json`.
- `docs/SWING_FOOTPRINT_ATLAS.md`: one table per timeframe and side, every row with its n, the swing / failed / random %, the verdict and the effect size.
- Recorded in full in the study book `docs/SWING_STUDY_BOOK.md`, chapter "Phase 2", including the non-findings.
- Study script: `scripts/study_swing_footprint.mjs`.
- Smoke: `smoke_swing_footprint.mjs`, with a planted absorption pattern on synthetic footprints that must be recovered.
