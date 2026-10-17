# Swing study Phase 3B: next candle + ladder

Generated 2026-10-17T16:40:12.667Z. Spec `docs/SWING_COMBINE_SPEC.md`. OOS from 2021-06-23. Each cell counts a candidate only if its outcome was still undecided at the moment its signs were all visible.

**Caution:** leads are medians over different pools. Waiting for a later sign drops the swings that confirmed quickly, so a later cell can show a LONGER median lead. Compare leads only within a cell.

## 15m lows (one step below = 5m, two steps = 3m)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **63%** | 62% – 64% | 4725 | — | 62% (n 7398) | 55 min | REFERENCE |
| C1: ladder + STRONG next candle | **64%** | 62% – 66% | 2721 | 59% | 64% (n 3870) | 1.0 h | NOT_ABOVE_LADDER |
| C2: ladder + next candle in the right direction | **62%** | 60% – 64% | 3534 | 62% | 62% (n 5473) | 1.0 h | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **64%** | 62% – 66% | 2622 | 59% | 64% (n 3734) | 1.0 h | NOT_ABOVE_LADDER |
| C4: TWO steps below + strong next candle | **55%** | 54% – 57% | 3143 | 48% | 55% (n 4468) | 1.2 h | NOT_ABOVE_LADDER |
| C5: strong next candle alone (no ladder) | **52%** | 50% – 53% | 3380 | 43% | 52% (n 4768) | 1.3 h | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **59%** | 57% – 62% | 1719 | 64% | 59% (n 3041) | 1.1 h | REPORTED |

## 15m highs (one step below = 5m, two steps = 3m)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **60%** | 58% – 61% | 4978 | — | 61% (n 7529) | 1.0 h | REFERENCE |
| C1: ladder + STRONG next candle | **61%** | 60% – 63% | 2465 | 56% | 62% (n 3936) | 55 min | NOT_ABOVE_LADDER |
| C2: ladder + next candle in the right direction | **59%** | 58% – 61% | 3722 | 57% | 61% (n 5709) | 1.0 h | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **61%** | 59% – 63% | 2412 | 56% | 62% (n 3821) | 55 min | NOT_ABOVE_LADDER |
| C4: TWO steps below + strong next candle | **54%** | 52% – 55% | 2845 | 45% | 54% (n 4552) | 1.1 h | NOT_ABOVE_LADDER |
| C5: strong next candle alone (no ladder) | **50%** | 48% – 52% | 3055 | 39% | 52% (n 4817) | 1.3 h | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **56%** | 54% – 58% | 2240 | 61% | 58% (n 3145) | 1.2 h | REPORTED |

## 1H lows (one step below = 30m, two steps = 15m)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **76%** | 73% – 78% | 982 | — | 73% (n 1482) | 3.0 h | REFERENCE |
| C1: ladder + STRONG next candle | **76%** | 72% – 80% | 530 | 73% | 72% (n 709) | 3.0 h | NO_EVIDENCE |
| C2: ladder + next candle in the right direction | **76%** | 73% – 79% | 702 | 69% | 71% (n 1062) | 3.0 h | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **76%** | 72% – 79% | 515 | 73% | 71% (n 684) | 3.0 h | NO_EVIDENCE |
| C4: TWO steps below + strong next candle | **61%** | 57% – 64% | 679 | 55% | 56% (n 933) | 4.8 h | NO_EVIDENCE |
| C5: strong next candle alone (no ladder) | **54%** | 50% – 57% | 769 | 45% | 50% (n 1042) | 6.0 h | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **73%** | 68% – 77% | 386 | 76% | 71% (n 655) | 4.0 h | REPORTED |

## 1H highs (one step below = 30m, two steps = 15m)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **69%** | 66% – 72% | 1054 | — | 72% (n 1520) | 3.0 h | REFERENCE |
| C1: ladder + STRONG next candle | **68%** | 64% – 72% | 502 | 67% | 71% (n 749) | 3.5 h | NO_EVIDENCE |
| C2: ladder + next candle in the right direction | **67%** | 63% – 70% | 777 | 70% | 72% (n 1139) | 3.5 h | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **68%** | 64% – 72% | 495 | 67% | 72% (n 728) | 3.5 h | NO_EVIDENCE |
| C4: TWO steps below + strong next candle | **52%** | 49% – 56% | 671 | 49% | 56% (n 967) | 5.0 h | NO_EVIDENCE |
| C5: strong next candle alone (no ladder) | **46%** | 43% – 50% | 768 | 40% | 49% (n 1120) | 6.0 h | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **67%** | 62% – 71% | 464 | 68% | 71% (n 680) | 4.0 h | REPORTED |

## 4H lows (one step below = 3H, two steps = 2H)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **83%** | 78% – 88% | 205 | — | 82% (n 303) | 4.0 h | REFERENCE |
| C1: ladder + STRONG next candle | **86%** | 79% – 91% | 117 | 78% | 80% (n 156) | 5.0 h | NO_EVIDENCE |
| C2: ladder + next candle in the right direction | **83%** | 76% – 88% | 157 | 83% | 82% (n 235) | 5.0 h | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **86%** | 78% – 91% | 112 | 79% | 80% (n 156) | 5.0 h | NO_EVIDENCE |
| C4: TWO steps below + strong next candle | **75%** | 68% – 81% | 145 | 64% | 68% (n 200) | 12.0 h | NO_EVIDENCE |
| C5: strong next candle alone (no ladder) | **58%** | 51% – 65% | 195 | 39% | 46% (n 316) | 1.0 d | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **78%** | 68% – 86% | 82 | 86% | 81% (n 134) | 5.0 h | REPORTED |

## 4H highs (one step below = 3H, two steps = 2H)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **80%** | 74% – 85% | 205 | — | 88% (n 281) | 3.0 h | REFERENCE |
| C1: ladder + STRONG next candle | **76%** | 66% – 84% | 83 | 81% | 86% (n 145) | 3.0 h | NO_EVIDENCE |
| C2: ladder + next candle in the right direction | **79%** | 72% – 85% | 144 | 78% | 88% (n 222) | 4.0 h | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **76%** | 66% – 84% | 80 | 81% | 88% (n 140) | 3.0 h | NO_EVIDENCE |
| C4: TWO steps below + strong next candle | **62%** | 53% – 70% | 116 | 69% | 72% (n 184) | 8.0 h | NO_EVIDENCE |
| C5: strong next candle alone (no ladder) | **40%** | 33% – 47% | 188 | 41% | 49% (n 276) | 20.0 h | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **81%** | 73% – 87% | 110 | 76% | 89% (n 124) | 4.0 h | REPORTED |

## 1D lows (one step below = 9H, two steps = 6H)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **68%** | 54% – 79% | 50 | — | 59% (n 74) | 7.3 d | REFERENCE |
| C1: ladder + STRONG next candle | **74%** | 55% – 87% | 27 | 61% | 63% (n 38) | 7.6 d | DESCRIBED_ONLY |
| C2: ladder + next candle in the right direction | **67%** | 51% – 79% | 39 | 73% | 59% (n 54) | 7.6 d | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **74%** | 55% – 87% | 27 | 61% | 67% (n 36) | 7.6 d | DESCRIBED_ONLY |
| C4: TWO steps below + strong next candle | **69%** | 51% – 83% | 29 | 54% | 59% (n 41) | 9.0 d | DESCRIBED_ONLY |
| C5: strong next candle alone (no ladder) | **54%** | 38% – 69% | 37 | 45% | 53% (n 45) | 9.0 d | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **61%** | 41% – 78% | 23 | 74% | 55% (n 33) | 6.3 d | REPORTED |

## 1D highs (one step below = 9H, two steps = 6H)

| cell | real (OOS) | Wilson 95 % | n | real without the extra sign | TRAIN real | median lead before anchor confirmation | verdict |
|---|---|---|---|---|---|---|---|
| R1: ladder alone (one step below) — reference | **59%** | 47% – 71% | 59 | — | 56% (n 78) | 5.3 d | REFERENCE |
| C1: ladder + STRONG next candle | **59%** | 42% – 74% | 32 | 48% | 65% (n 43) | 6.0 d | NO_EVIDENCE |
| C2: ladder + next candle in the right direction | **57%** | 42% – 70% | 44 | 44% | 60% (n 60) | 5.6 d | NO_EVIDENCE |
| C3: ladder + strong AND right direction | **61%** | 44% – 76% | 31 | 45% | 65% (n 43) | 6.0 d | NO_EVIDENCE |
| C4: TWO steps below + strong next candle | **54%** | 38% – 70% | 35 | 34% | 58% (n 48) | 6.8 d | NO_EVIDENCE |
| C5: strong next candle alone (no ladder) | **45%** | 31% – 60% | 42 | 26% | 50% (n 56) | 7.0 d | REPORTED |
| M1: ladder + WEAK next candle (mirror) | **48%** | 28% – 68% | 21 | 59% | 42% (n 33) | 6.0 d | REPORTED |

