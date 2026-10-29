# Nowcast check — 2026-10-29 12:30 UTC releases (recorded BEFORE the release, 12:07 UTC)

Ashraf: "can u try do a quick check research use the method we agreed on, and check if you build it now, would your result be similar to their's" → "but not simple make it deep study".
This is a pre-release SNAPSHOT of the public bottom-up nowcast models (the method we agreed: build the number from its components before the
announcement). Our OWN component-by-component build is next week's deep study (protocol first); this file only fixes, with a git timestamp,
what the bottom-up models said before the number came out, so the comparison afterwards cannot be bent.

## 1. Advance GDP q/q (Q3 2026, SAAR) — released 12:30 UTC

| source | estimate | as of | notes |
|---|---|---|---|
| Atlanta Fed **GDPNow** (bottom-up from component data) | **3.3 %** | 2026-10-28 | previous 3.4 % (10-27); gross private domestic investment nowcast 19.1 % (from 19.4 %); net exports contribution −2.95 pp (from −2.86) |
| GDPNow history this quarter | 6.2 % (08-03 peak) → 4.3 % (08-14) → 3.7 % (10-06) → 3.6 % (10-15: consumer spending 3.6 %, inventories +1.87 pp) → 3.4 % → **3.3 %** | | |
| Economists' consensus (app calendar, Forex Factory) | **3.2 %** | 2026-10-29 | previous quarter 1.5 % |
| **Pre-release call** | GDPNow is 0.1 pp ABOVE consensus → a small upside surprise expected, i.e. essentially in line | | |

## 2. Core PCE (calendar row "Core PCE Price Index m/m") — released 12:30 UTC

| source | estimate | as of | notes |
|---|---|---|---|
| Economists' consensus (app calendar) | **0.3 %** m/m | 2026-10-29 | previous 0.2 % |
| Cleveland Fed inflation nowcast | October 2026 core PCE m/m **0.25 %**; September core PCE cell BLANK (= the page treats it as already published) | 2026-10-28 | ⚠ The released figure's exact reference period is not confirmed in this snapshot (the calendar labels it m/m; the Cleveland table has no open September value). No clean independent nowcast for the released number → NO pre-release call on PCE. |

## 3. Advance GDP Price Index q/q — consensus 3.2 % (previous 6.2 %); no independent nowcast captured → no call.
## 4. Unemployment Claims — consensus 198K (previous 194K); no independent nowcast captured → no call.

## ADDENDUM 1 — written 12:09 UTC, BEFORE the release (gold-measured-study skill: pre-register + control + no look-ahead)
- Surprise = actual − consensus (consensus = the app calendar value above, as known before 12:30). Nowcast error = actual − GDPNow 3.3 %.
  "Closer" = smaller absolute error. Actual = the official BEA / DOL release value read from the app calendar's `actual` (Forex Factory,
  src/master/marketContext.js) AND checked against the BEA release page; first print only (revisions ignored).
- Gold reaction (spot XAUUSD, Polygon 1m via loadBars, closed minutes only): range 12:30-13:30 UTC and close-to-close move, both in units of
  the 60-min range of the SAME clock window (12:30-13:30 UTC) on the 20 previous weekdays WITHOUT a high-impact USD release at 12:30 (the
  control = median of those 20). Report: ratio vs control, direction (DESCRIPTIVE ONLY — one event, n = 1, no claim), time of the 60-min high / low.
- Power: n = 1 release → nothing here is "proven"; this is a calibration of the process, not a result. The method's accuracy needs the full
  history study (next week, its own SPEC under docs/, gold-measured-study §1).

## RESULT — scored 13:32 UTC by scripts/research/score_nowcast_2026-10-29.mjs (commit 105cef0, written before the release) → data/research/nowcast_check_2026-10-29.json
Actuals = the app calendar's first-print values (Forex Factory); the BEA page check is still OPEN (not yet indexed at 13:35 UTC).

| release | actual | consensus | bottom-up nowcast | surprise | result |
|---|---|---|---|---|---|
| Advance GDP q/q | **3.4 %** | 3.2 % | GDPNow **3.3 %** | +0.2 | **WIN (narrow): nowcast error 0.1 vs consensus 0.2**; both said "above 3.2", right sign |
| Core PCE m/m | 0.3 % | 0.3 % | none | 0 | no call (in line) |
| GDP Price Index q/q | **2.3 %** | 3.2 % | none | **−0.9** | **MISSED — the day's biggest surprise, and we had no call** |
| Unemployment claims | 194K | 198K | none | −4K | no call |

Gold 12:30-13:30 UTC: range $15.88 vs the control median $17.92 (same hour, 20 quiet weekdays) = **0.89× — QUIETER than a normal hour**; net +$0.91;
high 12:38, low 12:55. n = 1: descriptive only.

What we missed (loss autopsy, measured from what was on screen BEFORE 12:30): the Cleveland Fed table fetched at 12:05 already showed **2026:Q3 CPI
annualized 1.97 % and core CPI 2.33 %** — far below the 3.2 % deflator consensus. The GDP price index is a different measure (it includes investment
and government prices, excludes imports), so CPI is not the answer, but it pointed the right way (low) by a wide margin. We did not use it because
there was no deflator model. Lesson for the deep study: build the deflator from Q3 CPI / PPI / import prices with GDP shares, and test on every past
advance release whether that bottom-up deflator beats the consensus.
- GDP actual vs GDPNow 3.3 % vs consensus 3.2 % → which was closer; the size of each error.
- Gold's reaction 12:30-13:30 UTC (Polygon 1m) — measured, no direction claim.

Limits stated up front: one release is ONE observation — it proves nothing about the method's accuracy. The deep study (next week) scores the
nowcast vs consensus over every past release (GDPNow history back to 2011, each value as known before the release), component by component.

Sources: [GDPNow commentaries](https://www.atlantafed.org/research-and-data/data/gdpnow/current-and-past-gdpnow-commentaries) ·
[Cleveland Fed inflation nowcasting](https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting) ·
[investinglive GDPNow 10-15](https://investinglive.com/central-banks/atlanta-fed-gdpnow-holds-at-3-6-for-q3-as-consumer-spending-outlook-improves/)
