// telegram.js — Ferrari Twin Turbo: the tier alert formatter + sender, carried from Turbo2's src/master/telegram.js
// with its refuted-engine imports (signalService, pivotSwingLong, moveStrength) REMOVED. Credentials are the TWIN's
// OWN env names (TWIN_TELEGRAM_BOT_TOKEN / TWIN_TELEGRAM_CHAT_ID) so this app can never post into Turbo2's channel
// by accident. Without them every send is a dry run (logged under data/telegram/sent.jsonl).
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../core/paths.js'

export const TELEGRAM_CONFIG = Object.freeze({
  token: process.env.TWIN_TELEGRAM_BOT_TOKEN || null,
  chatId: process.env.TWIN_TELEGRAM_CHAT_ID || null,
})
const f2 = (x) => (x == null ? '—' : Number(x).toFixed(2))

export function mapExtensions(side, target) {
  try {
    const fc = JSON.parse(fs.readFileSync(path.join(TURBO.master, 'forecast.json'), 'utf8'))
    const pool = [fc.bestTrade?.t1, fc.bestTrade?.t2, fc.bestTrade?.t3, ...((fc.path || []).map((p) => p.price))]
      .filter((v) => typeof v === 'number' && isFinite(v))
    const up = side === 'BUY'
    return [...new Set(pool.filter((v) => up ? v > target + 0.5 : v < target - 0.5).map((v) => +v.toFixed(2)))]
      .sort((a, b) => up ? a - b : b - a).slice(0, 2)
  } catch { return [] }
}
export function formatTierAlert(st) {
  if (!st || st.blocked || st.t == null) return ''
  const dir = st.side === 'BUY' ? '🟢 <b>BUY</b>' : '🔴 <b>SELL</b>'
  const o = st.outcomes || {}
  const ext = mapExtensions(st.side, st.target)
  const L = []
  // 🚨 2026-08-15: the headline is DERIVED from the tier's class, never asserted. When the sequenced-fill re-ship
  // demoted this book, a hard-coded "CONFIRMED TRADE" banner would have kept telling a group of people that an
  // unproven signal was confirmed. A label is a claim; claims follow the measurement.
  // 🏷 THE NAME IS A STATE, THE CLASS IS A CLAIM (2026-08-20, Ashraf: "I need the trade to show 'confirmed Swing
  // Trade' and show Entry, SL, TP1, TP2, TP3"). "CONFIRMED" here means THE TRIGGER FIRED — a fact about this bar,
  // and his own vocabulary since 2026-08-14 ("the fire's NAME — never says forecast"). It is NOT a statement that
  // the book's edge is validated; that lives on its own line and follows the measurement. So the header always
  // reads CONFIRMED SWING TRADE, and a shadowed book still says plainly that it is not traded.
  // 🚨 AND THE BANNER MUST NAME THE BOOK THAT ACTUALLY FIRED (2026-08-21). Hardcoding "SWING TRADE" was the
  // same class of error as hardcoding the alert to roster.swingTrade: when IMPULSE_CONT became the only live
  // book, an alert for IT would have gone out labelled SWING TRADE. The tier names itself now, from the signal.
  const _tier = String(st.tier ?? 'TRADE').replace(/_/g, ' ')
  const _tf = st.tf ? ' ' + st.tf : ''
  L.push(`✅ <b>CONFIRMED ${_tier}</b> · XAUUSD${_tf}`)
  if (st.shadow) L.push(`⚠️ <b>STUDY ONLY — not traded, never sent to the EA.</b> Sequenced-fill re-measurement (2026-08-15): OOS positive but TRAIN negative ⇒ UNPROVEN.`)
  // An absent field is OMITTED, never rendered as the word "undefined". A reader cannot tell a missing grade
  // from a grade literally called undefined, and one of those looks like a broken system.
  const _bits = [dir]
  if (st.setup) _bits.push(`<b>${esc(st.setup)}</b>`)
  if (st.grade) _bits.push(`grade ${esc(st.grade)}`)
  if (st.killzone) _bits.push(esc(st.killzone))
  L.push(_bits.join(' · '))
  L.push(`ENTRY <b>${f2(st.entry)}</b> (maker limit) · SL <b>${f2(st.stop)}</b>`)
  L.push(`TP1 <b>${f2(st.target)}</b> — validated target [${st.rr ?? 0.75}:1] · BE arms +${st.beTriggerR}R / locks +${st.beLockR}R`)
  // TP2/TP3 ALWAYS render. Preferred source is the forecast map (real levels price reacted at); when the map has
  // none — or the forecast is stale — they fall back to R-multiples off the SAME risk, and the line SAYS which
  // source it used. Omitting them (the old behaviour) left the card looking incomplete exactly when the map was
  // down; inventing "validated" levels would be worse. Label the source, never fake the grade.
  { const up = st.side === 'BUY', risk = Math.abs(st.entry - st.stop) || 0
    const tp2 = ext[0] ?? (up ? st.entry + 1.0 * risk : st.entry - 1.0 * risk)
    const tp3 = ext[1] ?? (up ? st.entry + 1.5 * risk : st.entry - 1.5 * risk)
    const src = ext.length >= 2 ? 'map extensions — real levels, not validated targets'
      : ext.length === 1 ? 'TP2 from the map · TP3 = 1.5R — not validated targets'
        : 'R-multiples off the same risk (1.0R / 1.5R) — the map had no level, not validated targets'
    L.push(`TP2 <b>${f2(tp2)}</b> · TP3 <b>${f2(tp3)}</b> — ${src}`) }
  if (st.nyDispDay) L.push(`⚡ NY-open displacement day — this class of afternoon measured STRONGER (context, never a gate)`)
  if (st.preArm?.line) L.push(esc(st.preArm.line))   // 📰 news pre-arm (2026-09-17): range + next release, direction-free, context only
  L.push(`risk $${f2(st.riskUsd)} · target $${f2(st.targetUsd)}`)
  // 🚨 THE WIN RATE HAS BEEN PRINTING "undefined" IN EVERY ALERT (2026-08-21). This read st.confidencePct /
  // st.confidenceLbPct; roster signals carry `wr` and `wrLb`. Neither field has ever existed on a live signal,
  // so the one number a reader most wants was blank in every message that ever went out. Same silent-undefined
  // as the news line's "undefined↑/undefined↓" — a template that interpolates a missing field does not throw,
  // it just ships a hole. Derived from what the roster actually publishes, with the old names as a fallback.
  const _wrPct = st.wr != null ? (st.wr * 100).toFixed(2) : (st.confidencePct ?? null)
  const _wrLbPct = st.wrLb != null ? (st.wrLb * 100).toFixed(2) : (st.confidenceLbPct ?? null)
  if (o.win != null) L.push(`per 100: ${Math.round(o.win * 100)} win / ${Math.round(o.scratch * 100)} scratch / ${Math.round(o.loss * 100)} loss`
    + (_wrPct != null ? ` · WR ${_wrPct}%${_wrLbPct != null ? ` (LB ${_wrLbPct}%)` : ''}` : '')
    + (st.n != null ? ` · n=${st.n}` : ''))
  L.push(st.shadow
    ? `<i>sequenced-fill measurement · OOS positive but TRAIN negative ⇒ UNPROVEN · study only · not auto-executed</i>`
    : `<i>backtest-validated 23y · paper/study · not auto-executed</i>`)
  L.push(`<code>${esc(new Date(st.t).toISOString())}</code>`)
  return L.join('\n')
}
function logSend(kind, text, result) {
  try {
    const dir = path.join(TURBO.root ?? '.', 'data', 'telegram')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'sent.jsonl'), JSON.stringify({
      at: new Date().toISOString(), kind,
      sent: !!result?.sent, dry_run: !!result?.dryRun, status: result?.status ?? null,
      chars: (text || '').length, text: (text || '').slice(0, 1200),
    }) + String.fromCharCode(10))
  } catch { /* a log must never break an alert */ }
}
export async function sendText(text, { token = TELEGRAM_CONFIG.token, chatId = TELEGRAM_CONFIG.chatId, dryRun = false } = {}) {
  if (!text) return { sent: false, reason: 'empty' }
  if (dryRun || !token || !chatId) { const r = { sent: false, dryRun: true, text }; logSend('group', text, r); return r }
  // 15s bound (2026-09-07): Node's fetch has no default timeout — a stalled socket here would hold the paper tick
  // (and the fire it is announcing) until the child budget kills it. A late alert beats a hung recorder.
  // RETRY (2026-10-16, measured: a 10:5x UTC network blip timed out a send — ETIMEDOUT to api.telegram.org — while the next try 1 min later worked).
  // A trade alert is sent ONCE when the trade opens, so a single failed attempt lost it. Up to 3 attempts (waits 3 s, 8 s) on a network error /
  // timeout / HTTP 5xx / 429; a 4xx (bad token, chat) is final. Never throws: the caller gets { sent:false, error } and the tick carries on.
  const waits = [3000, 8000]; let last = null
  for (let attempt = 0; attempt <= waits.length; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }), signal: AbortSignal.timeout(15_000) })
      const j = await res.json().catch(() => ({}))
      last = { sent: !!(res.ok && j.ok), status: res.status, response: j, attempts: attempt + 1 }
      if (last.sent || (res.status >= 400 && res.status < 500 && res.status !== 429)) break
    } catch (e) { last = { sent: false, error: e.cause?.code || e.message, attempts: attempt + 1 } }
    if (attempt < waits.length) await new Promise((r) => setTimeout(r, waits[attempt]))
  }
  logSend('group', text, last)
  return last
}
