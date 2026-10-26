# ML SELL — enter on a RETEST instead of at the signal close (pre-registered 2026-10-26, before any number)

**Ashraf (2026-10-26):** "and sell we do it on the retest correct" → "yes pls test".

## Signals (unchanged)
The ML SELL X3 walk-forward selections (`scripts/lib/scalp_ml.mjs`, same seed, the weekend-fixed resolver of §7 (ed)): every 3m bar whose score ≥ the
year's threshold. Today's rule (**IMMEDIATE**) sells at that bar's close — it is the baseline here.

## Retest entries (a SELL LIMIT placed at the signal; no fill in time → no trade)
- **RT1 shallow:** limit at signal close + 0.10 A, valid 30 min.
- **RT2 deep:** limit at signal close + 0.25 A, valid 60 min.
- **RT3 signal-bar high:** limit at the signal 3m bar's high, valid 60 min.
A = the signal's ATR14 of closed hours. **Fill rule (conservative):** a 1m bar (bid) whose high ≥ limit + $0.10 (memory: fill-through tolerance) — a bare
touch is not a fill. Fill price = the limit (no improvement).

## Exit (same geometry as the passing model, measured from the FILL)
Target 0.25 A below the fill, stop 3 A above it, 24 h (weekend rule), priced by the live resolver (`resolveMatrixTrade`). The fill minute itself: if its
high (+ spread) reaches the stop, the trade is a stop-out (checked from the fill minute); otherwise resolution starts at the next minute (a target touched
in the fill minute is never credited — it may have come before the fill). One trade at a time, by fill time (`matrix_trades.mjs` sequencing).

## Periods, control, pass — K = 3
P1 2016-01-01 → 2021-06-30, P2 → 2026-10-22. A retest variant **passes** when it meets the ML SELL pass rule (P1 and P2: WR ≥ 92 % with Wilson LB ≥ 88 %,
$/t > 0 with week-block LB > 0 at α/3, n ≥ 30 each, last 2 y $/t > 0) **and beats IMMEDIATE's $/t in both P1 and P2**. Reported for every variant:
fill rate, n, WR, $/t, LB, last 2 y. Nothing changes live without Ashraf's OK.

## Audit
Independent resolver on 200 retest trades (0 diff); fills re-derived by a second, independent scan (0 diff); the baseline IMMEDIATE reproduces the
re-measured study's P1 / P2 counts.
