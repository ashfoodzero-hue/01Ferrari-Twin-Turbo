# Order-flow footprint confirmation — strategy spec (Trader Dale method)

Written 2026-10-11, **before any result was seen**. Source: Trader Dale, *"ORDER FLOW: How to Read Buyers & Sellers at Key Levels"* (YouTube `6i62I67w8Co`, 42 min), from the full transcript Ashraf pasted. Data for the test: Databento GLBX.MDP3 `tbbo` for GC (CME gold futures), 2024-10-01 → 2026-10-09 — every trade with the exchange's aggressor flag plus the best bid/ask just before it. This is **test-only research data** (the R0 exception Ashraf approved on 2026-10-11) and is never used for live signals.

---

## Part 1 — The method as Trader Dale teaches it

**Idea.** A support or resistance level is likely to hold when order flow at the level shows the other side taking control. The level itself can come from any method (he mainly uses volume profile). Order flow is only the **confirmation**, and **only at a strong S/R zone**. The same patterns anywhere else on the chart are "just noise".

**Chart.** A 5-minute footprint: for every price inside each candle, the volume traded at the bid (aggressive sellers) and at the ask (aggressive buyers), with delta printed under each candle.

**The five confirmations** (a short at resistance is shown; a long at support is the mirror):

| # | Setup | What he looks for |
|---|---|---|
| 1 | **Absorption** (his favourite) | Unusually heavy volume at BOTH the bid and the ask at the SAME price, at the zone. They don't need to be equal. One side pushes, the other absorbs it, and price stops. |
| 2 | **Big limit order** | Short at resistance: unusually heavy volume at the **ask** (a resting sell limit order prints at the ask). Long at support: unusually heavy volume at the **bid**. Seen at the top or bottom of the candle. |
| 3 | **Trapped traders** | Heavy volume (best with imbalances) at the top of a rising candle into resistance, then the next footprint goes the other way (bearish). The trapped buyers must exit with market sells, which fuels the drop. Mirror at support. |
| 4 | **Aggressive traders** | At resistance, heavy volume at the **bid** (aggressive market sellers) appears and pushes price away. At support, heavy volume at the **ask**. |
| 5 | **Change in delta** | Delta flips in the trade's direction at the level: positive → negative at resistance, negative → positive at support. |

**Imbalance** (from the trapped-traders section): compared diagonally (ask volume at one price vs bid volume one tick lower, and vice versa). One side much heavier than the other = an imbalance.

**Entry.** At the **close of the footprint** in which the confirmations appear. One clear confirmation at a good level can be enough for him; two or three is normal, and more is better.

**First touch only.** In example 7 he says he only trades the first touch; after a strong move away, "the level is spent", so don't chase.

**Not covered in the video:** stop-loss, take-profit, position management and how the zones are found. He points to his book for those. **So the stop and target below are OURS, not his.**

---

## Part 2 — The testable translation (pre-registered numbers, chosen by me)

Everything here is fixed before the first run. Nothing is tuned afterwards.

**Instrument and candles.**
- GC front month (`GC.v.0`, Databento continuous by volume).
- 5-minute footprints (his timeframe), using the CME tick of $0.10.
- Each trade is assigned bid or ask by the exchange's aggressor flag: `B` = buyer aggressor → ask volume, `A` = seller aggressor → bid volume, `N` ignored.

**"Unusually heavy" (the video gives no number).** A cell (one price × one side × one candle) is HEAVY when its volume is at least **3× the median non-zero cell volume of the previous 100 footprints** (a rolling, causal baseline), and at least 20 contracts.

**Imbalance.** Diagonal ratio ≥ 3:1 (TradingView's default 300%), on cells with at least 10 contracts.

**Levels (his main tool is volume profile).** Each one is tested separately:
- **L-VP:** the previous trading day's POC / VAH / VAL, built from the same GC trades (real futures volume).
- **L-HL:** the previous day's high and low.

A level is "touched" by a footprint whose range reaches it. Only the **first touch** of the day counts. Support or resistance depends on which side price approached from. "At the zone" means the setup's cell lies within **0.5 × ATR14 (5m)** of the level.

**The five confirmations, mechanically** (short at resistance; mirror for a long at support):
1. **ABSORPTION:** a price within the zone where the bid cell AND the ask cell are both HEAVY, inside the touching footprint or the next one.
2. **BIG LIMIT:** a HEAVY **ask** cell in the top 2 ticks of the footprint (bottom 2 ticks and a HEAVY **bid** cell for a long).
3. **TRAPPED TRADERS:** footprint F₁ touches the level and closes UP with ≥ 2 buy imbalances in its top third. The next footprint F₂ closes DOWN, below F₁'s open.
4. **AGGRESSIVE TRADERS:** a HEAVY **bid** cell in the footprint after the touch (a HEAVY **ask** cell for a long), and that footprint closes in the trade's direction.
5. **CHANGE IN DELTA:** the previous footprint's delta > 0 and the current one's < 0 (short; reversed for a long), within the touch footprint or the next one.

**Decision.** The count of confirmations (0–5) is evaluated at the close of the touching footprint and the following one (his "wait for the next footprint" option). The entry is at the close of the footprint where the count is first reached. Signal variants tested:
- each confirmation **alone**;
- **count ≥ 1, ≥ 2, ≥ 3**.

**Trade (our pre-registered exit, since the video gives none).**
- Market entry at the footprint close, on the GC price path.
- Stop 0.5 × ATR14(5m) beyond the level.
- Target **1 R** and, separately, **2 R**.
- 8-hour horizon.

**Costs.** We will trade SPOT XAUUSD, so the spread and slippage come from the measured spot spread table, applied to the GC path.

**Controls.**
- **Same level, no confirmation:** the first touch with count = 0.
- **Random time:** the same trade construction at a random 5m close within ±2 weeks.

The question is whether confirmations add anything **beyond the level itself**.

**Validation (the same bar as every tool so far).**
- Chronological split: TRAIN = first 60 %, OOS = last 40 %.
- **PASS** ⇔ OOS trades ≥ 100, the OOS mean $/trade bootstrap bound > 0 (Bonferroni over every variant tested), TRAIN mean > 0, and it beats the no-confirmation control.
- Win rate and R reported. Frozen tape.

**Live-feasibility check.** From the same `tbbo` rows, infer each trade's side the way Massive Advanced would have to (price ≥ ask → buy, ≤ bid → sell, otherwise the tick rule) and measure the agreement with the exchange flag. Then re-run every PASSING variant on inferred sides. Massive Advanced is only worth it if the result holds on inferred sides too.

---

## Part 3 — What is not in this test
- Market depth / resting orders behind the best bid/ask: not in this dataset, and not available on Massive at any tier ("coming soon").
- His discretionary judgement: he sometimes calls one cell "either big limit or trapped traders". The mechanical rules count each by its own definition.
