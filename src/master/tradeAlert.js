// tradeAlert.js — Telegram "TRADE SETUP READY" alerts for the two live boxes (2026-10-16; Ashraf: "make it send msg to Telegram when
// trade setup is ready, showing Entry Price, SL, and Tp1, Tp2, Tp3"). ONE formatter, ONE sender, ONE de-dup ledger — used by
// scripts/matrix_tick.mjs (SCALP) and scripts/inv90/forward_buyd1.mjs (SWING TRADE). PAPER ONLY: an alert is a notice, never an order.
// ────────────────────────────────────────────────────────────────────────────────
// TP3 IS LABELLED, NEVER FAKED. No live rule has a measured TP3: the Matrix exits TP1/TP2, the swing arms exit one target. The
// measured targets print as they are; the extra TPs are equal steps beyond them and the line SAYS "reference — not in the measured exit"
// (same convention as telegram.js since 2026-08-20). Settings (.env): TWIN_TELEGRAM_BOT_TOKEN + TWIN_TELEGRAM_CHAT_ID (without them every
// send is a dry run logged under data/telegram/sent.jsonl), TWIN_ALERT_SCALP=0 / TWIN_ALERT_SWING=0 switch a kind off (default on),
// TWIN_ALERT_MAX_LATE_MIN (default 30; a live swing scan lands ~9-14 min after its bar close): a setup recorded later than this after its bar is NOT sent — a stale entry is not "ready".
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../core/paths.js'
import { sendText } from './telegram.js'
import { tradeAllowed, MIN_WR } from './wrGate.js'
// THE 92 % WR RULE (2026-10-28, src/master/wrGate.js): every trade alert below is skipped unless its signal's MEASURED WR ≥ 92 %
// (SCALP prepare / setup / blocked → 'SCALP', SWING TRADE → 'SWING'). The callers still record everything; only the message is not sent.
const wrBlocked = (kind, allowed = tradeAllowed) => allowed(kind) ? null : { skipped: `below the ${Math.round(100 * MIN_WR)}% WR rule (${kind})` }

const LEDGER = path.join(TURBO.data, 'telegram', 'alerted.json')
const f2 = (x) => (x == null || !isFinite(x) ? '—' : Number(x).toFixed(2))
const on = (v) => !/^(0|off|false|no)$/i.test(String(v ?? '1').trim())
export const alertSettings = () => ({ scalp: on(process.env.TWIN_ALERT_SCALP), swing: on(process.env.TWIN_ALERT_SWING), maxLateMin: +(process.env.TWIN_ALERT_MAX_LATE_MIN || 30) })

/** SCALP (Ferrari Matrix) setup → alert fields. sig = matrix signal (side, entry, sl, tp1, tp2, decisionT). */
// WARNING (2026-10-16, Ashraf "keep, with a loud warning" — study (bs): no pre-trigger filter fixes the SCALP): every SCALP alert opens with the
// measured gate result (ferrari_matrix_gate.json via `gate`) and says whether silver 3m confirms (the only same-sign fact in both periods, unproven).
export function scalpSetup(sig, { verdict, gate, silverUp } = {}) {
  const up = sig.side === 'BUY', tp3 = sig.tp2 + (sig.tp2 - sig.tp1)
  const warning = gate?.oos_net != null ? `⚠️ <b>SHADOW system</b> — measured ${gate.oos_net >= 0 ? '+' : '−'}$${Math.abs(Number(gate.oos_net)).toFixed(2)}/trade on unseen data${gate.oos_wr != null ? `, ${(100 * gate.oos_wr).toFixed(0)}% full wins` : ''} · NOT a trade recommendation` : null
  const info = silverUp == null ? null : `silver 3m ${silverUp === up ? 'CONFIRMS ✅' : 'does NOT confirm ❌'} (info only — the one fact that pointed the same way in both test periods, not proven)`
  return { id: `MATRIX@${sig.decisionT}`, kind: 'SCALP', name: 'Ferrari Matrix 3m', side: sig.side, t: sig.decisionT, entry: sig.entry, sl: sig.sl, tp1: sig.tp1, tp2: sig.tp2, tp3,
    measured: 'TP1 + TP2 (half each, stop to entry after TP1)', reference: ['tp3'], up, verdict, warning, info }
}
/** SWING TRADE (forward arm) signal → alert fields. s = ledger signal (entry_ask, stop, target, t, atr_1d); BUY only by construction. */
export function swingSetup(s, { arm, summary } = {}) {
  const step = s.target - s.entry_ask
  return { id: s.id, kind: 'SWING TRADE', name: arm === 'freq' ? 'forward arm 2 (≈1/day)' : s.bracket === 'E3' ? 'forward arm 1 · E3 (stop 1× daily ATR)' : 'forward arm 1 (92 %)', side: 'BUY', t: s.t, entry: s.entry_ask, sl: s.stop, tp1: s.target, tp2: s.target + step, tp3: s.target + 2 * step,
    measured: s.bracket === 'E3' ? 'TP1 = 0.5× daily ATR (one target, 7-day limit) · measured 13 y: 73.0% WR, +$3.76/t (2022-26), beats random buys by +$3.78/t' : 'TP1 (one target, 7-day limit)', reference: ['tp2', 'tp3'], up: true, verdict: summary?.verdict, lateMin: s.late_min }
}
export function formatSetupAlert(a) {
  const dir = a.side === 'BUY' ? '🟢 <b>BUY</b>' : '🔴 <b>SELL</b>'
  const tp = (k, label) => `${label} <b>${f2(a[k])}</b>${a.reference.includes(k) ? ' <i>(reference — not in the measured exit)</i>' : ''}`
  return [
    `🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎`,   // Ashraf 2026-10-16: the Twin shares Turbo 2's group — the first line names the app
    ...(a.warning ? [a.warning] : []),
    `🚨 <b>TRADE SETUP READY — ${a.kind}</b> · XAUUSD`,
    `${dir} · ${a.name}`,
    `ENTRY <b>${f2(a.entry)}</b>`,
    `SL <b>${f2(a.sl)}</b>  (risk $${f2(Math.abs(a.entry - a.sl))}/oz)`,
    tp('tp1', 'TP1'), tp('tp2', 'TP2'), tp('tp3', 'TP3'),
    `<i>measured exit: ${a.measured}${a.verdict ? ' · ' + a.verdict : ''}</i>`,
    ...(a.info ? [`<i>${a.info}</i>`] : []),
    `<i>Ferrari Twin Turbo · PAPER — a notice, not an order</i>`,
    `<code>${new Date(a.t).toISOString().replace('.000Z', 'Z')}</code>`,
  ].join('\n')
}
/** 👁 SCALP PREPARE (2026-10-16, Ashraf: "an alert prior the trade setup … to prepare waiting the trigger msg"): the chart's WATCH BUY state sent to
 *  Telegram ONCE per watch episode (≥ 45 min since the last prepare notice) and never while a trade is open. Numbers = the WATCH study (post-hoc). */
export function formatPrepareAlert(w, close) { const m = w.measured, pc = (x) => (100 * x).toFixed(1) + '%'
  return ['🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎', '👁 <b>SCALP PREPARE — WATCH BUY</b> · XAUUSD', `gold ${close != null ? Number(close).toFixed(2) + ' ' : ''}pushed through the Matrix BUY wall (~${w.line}) · waiting for the green trigger candle`,
    `measured: ${pc(m.conversion)} of these became a BUY signal within 60 min (median ${m.lead_min} min) · ⚠ only ${pc(m.recall)} of SCALP trades get this warning — many trigger with none`,
    '<i>Matrix SCALP = SHADOW (paper) · get ready — the TRADE SETUP READY message follows if it triggers</i>'].join('\n') }
export async function alertPrepare(w, close, { now = Date.now(), send = sendText, ledger = LEDGER, allowed = tradeAllowed } = {}) {   // allowed: the 92 % rule (test seam)
  const wb = wrBlocked('SCALP', allowed); if (wb) return wb
  try { const led = readLedger(ledger), last = led['PREPARE:last'] ? Date.parse(led['PREPARE:last'].at) : -Infinity
    if (now - last < 45 * 60000) return { skipped: 'same watch episode' }
    const r = await send(formatPrepareAlert(w, close))
    if (r?.sent || r?.dryRun) { led['PREPARE:last'] = { at: new Date(now).toISOString(), sent: !!r.sent }; fs.mkdirSync(path.dirname(ledger), { recursive: true }); fs.writeFileSync(ledger + '.tmp', JSON.stringify(led, null, 1)); fs.renameSync(ledger + '.tmp', ledger) }
    return { sent: !!r?.sent, dryRun: !!r?.dryRun }
  } catch (e) { return { sent: false, error: e.message } } }
const readLedger = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return {} } }
/** Send once per setup id. Never throws (an alert must never break the tick that found the trade). Returns { sent, dryRun, skipped }. */
export async function alertSetup(a, { now = Date.now(), dryRun = false, send = sendText, ledger = LEDGER, allowed = tradeAllowed } = {}) {
  try {
    const wb = wrBlocked(a.kind === 'SWING TRADE' ? 'SWING' : a.kind, allowed); if (wb) return wb
    const cfg = alertSettings()
    if (a.kind === 'SCALP' && !cfg.scalp) return { skipped: 'TWIN_ALERT_SCALP off' }
    if (a.kind === 'SWING TRADE' && !cfg.swing) return { skipped: 'TWIN_ALERT_SWING off' }
    const late = a.lateMin ?? Math.round((now - a.t) / 60000)
    if (late > cfg.maxLateMin) return { skipped: `stale (${late} min after the bar > ${cfg.maxLateMin})` }
    const led = readLedger(ledger); if (led[a.id]) return { skipped: 'already alerted' }
    const r = await send(formatSetupAlert(a), { dryRun })
    if (r?.sent || r?.dryRun) { led[a.id] = { at: new Date(now).toISOString(), sent: !!r.sent }; fs.mkdirSync(path.dirname(ledger), { recursive: true }); fs.writeFileSync(ledger + '.tmp', JSON.stringify(led, null, 1)); fs.renameSync(ledger + '.tmp', ledger) }
    return { sent: !!r?.sent, dryRun: !!r?.dryRun, status: r?.status }
  } catch (e) { return { sent: false, error: e.message } }
}
/** 🧭 SCALP BLOCKED (2026-10-20, Ashraf: "send one Telegram notice per blocked episode (not every signal)"): the FIRST BUY signal the V1H gate vetoes in
 *  a blocked stretch (episode = blockedSince, the 3m close at which BUYs became blocked) → one notice; later vetoes of the same stretch are silent. */
export function formatBlockedAlert(s, g) {
  return ['🏎🏎 <b>FERRARI TWIN TURBO</b> 🏎🏎', '🧭 <b>SCALP BLOCKED — BUY not opened</b> · XAUUSD',
    `🟢 BUY signal ENTRY <b>${f2(s.entry)}</b> · SL ${f2(s.sl)} · TP1 ${f2(s.tp1)} · TP2 ${f2(s.tp2)}`,
    `reason: <b>1H structure ${g.state}</b>${g.state === 'DOWN' ? ' (lower highs + lower lows)' : g.state === 'UNKNOWN' ? ' (could not be read — fail-closed)' : ''} — the V1H gate blocks SCALP BUYs`,
    '<i>more BUYs while it stays blocked are NOT messaged · each one is drawn grey on the chart and priced as if opened (review ≈ 2026-10-27)</i>',
    '<i>V1H measured 2 y + 13 y: the BUYs it skips lost more · Matrix SCALP = SHADOW (paper) · a notice, not an order</i>',
    `<code>${new Date(s.decisionT).toISOString().replace('.000Z', 'Z')}</code>`].join('\n')
}
export async function alertBlocked(s, g, { now = Date.now(), dryRun = false, send = sendText, ledger = LEDGER, allowed = tradeAllowed } = {}) {
  try {
    const wb = wrBlocked('SCALP', allowed); if (wb) return wb
    if (!alertSettings().scalp) return { skipped: 'TWIN_ALERT_SCALP off' }
    if (!g?.blockedSince) return { skipped: 'no blocked episode' }
    const key = `BLOCKED:${g.blockedSince}`, led = readLedger(ledger); if (led[key]) return { skipped: 'episode already notified' }
    const r = await send(formatBlockedAlert(s, g), { dryRun })
    if (r?.sent || r?.dryRun) { led[key] = { at: new Date(now).toISOString(), sent: !!r.sent, first: `MATRIX@${s.decisionT}` }; fs.mkdirSync(path.dirname(ledger), { recursive: true }); fs.writeFileSync(ledger + '.tmp', JSON.stringify(led, null, 1)); fs.renameSync(ledger + '.tmp', ledger) }
    return { sent: !!r?.sent, dryRun: !!r?.dryRun, status: r?.status }
  } catch (e) { return { sent: false, error: e.message } }
}
