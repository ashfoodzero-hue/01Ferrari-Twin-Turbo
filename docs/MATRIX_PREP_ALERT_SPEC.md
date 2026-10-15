# Matrix SCALP — "prepare" alert (pre-registered 2026-10-16)

**Request (Ashraf):** "send a preparation alert before the trade trigger, when we feel the setup is about to be ready 98%".

**Question.** Is there a causal state, seen on a closed 3m candle before any Matrix signal, after which a real Matrix SCALP of the same side follows within N bars ≥ 98 % of the time?

## Definition (same formulas as `matrixSignals`)

At a closed 3m bar `i` with **no** Matrix signal at `i`:

| | ARMED BUY | ARMED SELL |
|---|---|---|
| Context | WTI 1h as delivered **not bullish** · DXY 3m close **< EMA10** | WTI **bullish** · DXY close **> EMA10** |
| Proximity | bar low ≤ `buyLine` + k·ATR | bar high ≥ `sellLine` − k·ATR |

**Episodes.**
- The first armed bar opens an episode, and the alert is sent once per episode.
- The episode ends at the first same-side signal, or N bars after the alert. A new episode needs a bar that is not armed first.

**Converted** = a real Matrix signal of the same side within N bars after the alert bar.

## Grid and windows

- **Grid (K = 9):** k ∈ {0.25, 0.5, 1.0} ATR × N ∈ {5, 10, 20} bars (15 / 30 / 60 min).
- **Window:** 2024-10-10 → 2026-10-09. This is the live rule with WTI, the same window as the Matrix gate.
- **Split:** TRAIN = first 60 %, OOS = last 40 % (time order).

## Metrics (per cell, TRAIN and OOS)

- episodes, and alerts per trading day;
- conversion rate, with a Wilson lower bound at z(α/K);
- median lead in minutes;
- recall: the share of real signals that had an alert before them.

## Pass rule (fixed before the run)

A cell passes only if all of these hold:
- OOS episodes ≥ 100;
- OOS conversion ≥ 0.98, with a Wilson lower bound ≥ 0.95;
- TRAIN conversion ≥ 0.98.

If no cell passes, the frontier is reported (best conversion, and its alerts per day) and nothing is called "98 %".

Output: `data/master/matrix_prep_alert_study.json`. Script: `scripts/study_matrix_prep_alert.mjs`.
