# Real-time futures feed options (research only — NO purchase)

2026-10-18. Ashraf: "we need to make sure that we are getting the live data flow (ticks) for Spot and future with zero delay". Approved: "Yes, research options". Nothing was bought or changed.

## Where we are today (measured, in the code)

| Feed | Delay | Ticks / bid-ask | Used for |
|---|---|---|---|
| Spot XAU, XAG, 6 DXY pairs (Polygon forex WebSocket) | real-time | yes (ticks → verified 1m) | every signal |
| Futures GC, SI, CL (Massive **Futures Starter**, $29/mo) | **10 min** | no (1m bars) | delayed CONTEXT: whale gauge, WTI for the Matrix; live footprint BLOCKED |
| Footprint (Databento historical tbbo) | history only | yes, 2024-10 → 2026-10 | studies |

## Options (from the providers' own pricing pages, read 2026-10-18)

| | Massive **Futures Advanced** | Databento CME **Standard** | Databento CME **Plus** |
|---|---|---|---|
| Price | **$199/mo** (monthly) | $199/mo (monthly) | $1,750/mo license fees, **annual contract** |
| Delay | **real-time** | page says "Live data", but the comparison column reads "Delayed data" → **unclear, must be confirmed** | real-time ("Enhanced live data") |
| Ticks | WebSocket trades + top-of-book quotes, second aggregates | trades / TBBO / MBP-1 (12 months history), MBO 1 month | trades / TBBO / MBP-1 16+ y |
| History | 7+ years | OHLCV 16+ y | 16+ y |
| Exchanges | CME, CBOT, NYMEX, COMEX (GC, SI, CL all covered) | all four | all four |
| Use | individual / non-professional only | personal use, up to 2 devices | commercial possible |
| Exchange fees | **not shown** on the page — must be asked | "no license fees" (Standard) | included in the $1,750 |

Not confirmed anywhere: order-book depth (a third-party comparison lists it as "upcoming" at Massive).

## What it would unlock

- Whale gauge and WTI **without the 10-minute delay**.
- **Live futures bid/ask and buyer/seller flow**: the live footprint, currently BLOCKED by the red rule, could run.
- The pre-open and health checks would hold futures to the same 4-minute live rule as spot.

## The honest part (measured before, never re-litigated)

- No signal waits on futures today. Every decision runs on real-time spot.
- Every futures-flow idea tested so far (order-flow footprint on 5 timeframes, wall defense, whale gauge) **failed the money test** on history.
- A real-time feed removes the delay. It does not by itself create an edge: any use of it must pass the same pre-registered test first.

## Recommendation (for Ashraf's decision)

1. **If you upgrade, choose Massive Futures Advanced ($199/mo, +$170 over today).** It is the same provider as everything else (RED RULE: Polygon/Massive is THE source), real-time, with tick trades + quotes, and it plugs into the existing futures code.
2. **Before paying, ask Massive two questions:**
   - Are any CME exchange fees on top of $199?
   - Does "individual use" fit your account?
3. **Databento Standard:** only after Databento confirms in writing that live streaming is included. Plus is annual and 9× the price.
4. **After an upgrade:** record live futures ticks forward and test any use of them before a signal may read them.

## Sources

- [Massive pricing (futures)](https://massive.com/pricing?product=futures)
- [Massive: Futures Data Has Arrived](https://massive.com/blog/futures-data-has-arrived)
- [Databento pricing](https://databento.com/pricing)
- [Databento: updates to subscription pricing](https://databento.com/blog/updates-to-subscription-pricing)
- [Databento GLBX.MDP3](https://databento.com/datasets/GLBX.MDP3)
- [Edgeful 2026 comparison](https://www.edgeful.com/blog/posts/futures-data-api-polygon-databento-edgeful-comparison) (third party)
