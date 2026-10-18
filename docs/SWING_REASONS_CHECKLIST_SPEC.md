# Why gold makes waves — the reasons list, the checklist, and the reasons at every 1D / 4H swing (last year)

Written 2026-10-18. Status: **WRITTEN, NOT RUN.** Shown to Ashraf before any swing is tagged.

## Request (Ashraf, 2026-10-18)

> "markets goes on waves, and the reason that market is behaving like this has many reasons, we need to list down all the reasons in full and then make a check list for those reasons and list down for each swings point at daily Candles and 4H candles the reasons from the check list that created the waves in that period"

## 1. The full list of reasons, and what we can measure

Every reason that moves gold is listed, including those we cannot measure. Each is marked:
- ✅ **measured** from data we hold, as known at that time;
- ◐ **partial**: a proxy, or thin coverage;
- ❌ **no data**: listed so nothing is forgotten, never guessed.

| # | Group | Reason | How it is checked (exact rule) | Data | Status |
|---|---|---|---|---|---|
| 1 | US dollar | DXY moves against gold | DXY change over the window opposes gold's turn by ≥ 0.15 % | DXY rebuilt from 6 pairs | ✅ |
| 2 | Rates | US 10-year yield moves | Daily 10y change on the swing day ≥ 5 bp (up = gold-bearish, down = gold-bullish) | Treasury yields (daily) | ✅ |
| 3 | Rates | Real yields | 10y minus inflation expectations, change of the month | Inflation expectations (monthly) | ◐ |
| 4 | Fed | FOMC decision / statement | Released inside the window | Fed calendar (official times) | ✅ |
| 5 | Fed | Fed Chair / Board speech | Inside the window | Fed speeches | ✅ |
| 6 | Data | Inflation release (CPI / PPI / PCE) + surprise | Inside the window; surprise = actual vs forecast (hotter = gold-bearish) | Forex Factory | ✅ |
| 7 | Data | Jobs release (NFP / claims / JOLTS) + surprise | Same | Forex Factory | ✅ |
| 8 | Data | Growth release (retail sales / ISM / PMI / GDP) + surprise | Same | Forex Factory | ✅ |
| 9 | Data | Any other high-impact USD release | Forex Factory impact = high, inside the window | Forex Factory | ✅ |
| 10 | Liquidity | Holiday / early close / thin day | Polygon holiday list or a measured spot holiday | Calendar | ✅ |
| 11 | Geopolitics | War / attack / conflict headline | Keyword match in headlines inside the window | Polygon news (1,914 headlines, sparse) | ◐ |
| 12 | Policy | Tariffs / trade-war headline | Keyword match | Polygon news | ◐ |
| 13 | Fiscal | Shutdown / debt / deficit headline | Keyword match | Polygon news | ◐ |
| 14 | Risk mood | Risk-off: yen bid (USDJPY ≤ −0.5 %) or Bitcoin drop ≥ 5 % | Inside the window | USDJPY, BTCUSD | ✅ |
| 15 | EM stress | USDTRY or USDZAR jump ≥ 1 % | Inside the window | USDTRY, USDZAR | ✅ |
| 16 | Demand | China demand proxy: yuan weakens (USDCNH ≥ +0.3 %) | Inside the window | USDCNH | ◐ proxy |
| 17 | Demand | India demand proxy: rupee weakens (USDINR ≥ +0.3 %) | Inside the window | USDINR | ◐ proxy |
| 18 | Demand | Central-bank gold buying | — | (monthly, not in our data) | ❌ |
| 19 | Flows | Gold ETF flows | GLD volume ≥ 2× its 20-day normal on the swing day (holdings: no data) | GLD 1m | ◐ |
| 20 | Positioning | COT / speculative positioning | — | (CFTC, not in our data) | ❌ |
| 21 | Stocks | Equity sell-off / VIX spike | — | (no index data stored) | ❌ |
| 22 | Cross-asset | Silver confirms the turn | Silver has a same-side swing within ±1 candle | XAGUSD | ✅ |
| 23 | Cross-asset | Silver diverges | Gold makes a new extreme, silver does not | XAGUSD | ✅ |
| 24 | Cross-asset | Oil shock | WTI move ≥ 3 % inside the window | WTI futures | ✅ |
| 25 | Big players | CME futures volume spike | GC volume on the swing candle ≥ 2× the median of that hour (20 days) | GOLD_FUT (real volume) | ✅ |
| 26 | Big players | Order-flow absorption at the extreme | Footprint: aggressive selling (at lows) / buying (at highs) absorbed, delta against the close | CME footprints (to 2026-10-08) | ✅ |
| 27 | Structure | Prior swing level tested | Within 0.25 ATR of a prior same-side swing (same timeframe or higher) | Price | ✅ |
| 28 | Structure | Liquidity sweep | Took out the previous high / low, then closed back inside | Price | ✅ |
| 29 | Structure | Round number | $50 / $100 level within 0.25 ATR | Price | ✅ |
| 30 | Structure | Previous day / week high-low tested | Within 0.25 ATR | Price | ✅ |
| 31 | Momentum | RSI(14) divergence | Price beyond the previous same-side swing, RSI not | Price | ✅ |
| 32 | Momentum | Overextension | Distance from EMA50 above that timeframe's 1-year P90 (in ATR), or the leg above its P90 | Price | ✅ |
| 33 | Volatility | Climax candle | Swing candle range ≥ 2 ATR | Price | ✅ |
| 34 | Trend | Higher-timeframe trend | The 1W leg (for 1D swings) / 1D leg (for 4H swings): with or against the turn | Price | ✅ |
| 35 | Trend | Lower timeframes already turned | Ladder: 1H / 2H / 3H (for 4H) and 4H / 6H / 9H (for 1D) flipped at the same price | Price | ✅ |
| 36 | Time | Session of the swing candle | Asia / London / New York (New York hour) | Clock | ✅ |
| 37 | Time | Weekly open / month-end / quarter-end | The swing candle holds the week's first hour, or the last 2 trading days of a month or quarter | Clock | ✅ |
| 38 | Time | CME gold options expiry | The 4th-last business day of the month before the contract month | Rule | ◐ |
| 39 | Seasonality | Seasonal tendency | — (descriptive only; one year cannot test it) | — | ◐ |

## 2. Which swings, which window

- **Swings:** the last-year tables (`docs/swing_book/xau_1y_swings/1D.csv`: 13; `4H.csv`: 78). Same rule: ZigZag 3 × ATR(14), TradingView-exact candles.
- **Window:** "the period that created the wave" is checked twice:
  - **Trigger window:** the swing candle ± 1 candle (4H: ± 4 h; 1D: ± 1 trading day). This catches what hit at the turn.
  - **Leg window:** from the previous swing to this one. This catches what drove the wave into the turn: DXY / yields direction, the macro surprises in the leg.
- Every item uses only information **published by that time**.

## 3. What is reported

- **One row per swing, one column per checklist item** (✅ / ❌ / value, with the event name and time).
  - Files: `docs/swing_book/xau_reasons/1D.csv` and `4H.csv`.
  - A readable table in `docs/SWING_REASONS_ATLAS.md`.
- **How common each reason is at swings vs ordinary candles:** the same checklist on random 4H / 1D candles (same hour, same months).
  - Without this, a reason present at 90 % of swings could simply be present at 90 % of all candles. Every reason shows: at swings / at random candles.
- **Honest limits, stated in the report:**
  - **Underpowered:** 13 daily and 78 4H swings in one year cannot PROVE a reason causes swings. This is a descriptive map: which reasons were present.
  - **Coincidence:** "present at the swing" is not "caused it". The random-candle comparison shows which reasons are more frequent than chance.
  - **❌ items** are shown as "no data", never filled in.
