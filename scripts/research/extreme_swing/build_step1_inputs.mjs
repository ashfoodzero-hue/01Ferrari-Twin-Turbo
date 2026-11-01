// build_step1_inputs.mjs — EXTREME SWING spec §6 step 1 (2026-11-01; Ashraf: "Yes, start step 1"): verify + build the C1 (COT) and C2 (GLD holdings)
// histories with the time each value became PUBLIC (known_t). Raw sources (downloaded 2026-11-01, kept under data/research/extreme_swing/raw/):
//   COT: CFTC disaggregated futures-only yearly files fut_disagg_txt_2013…2026.zip, gold = CFTC code 088691 (COMEX).
//   COT release delays: CFTC "COT Historical Special Announcements" page (saved html) → the 2025 shutdown publish-date tables.
//   GLD: SPDR historical archive xlsx (api.spdrgoldshares.com/api/v1/historical-archive?product=gld).
// known_t rules (spec addendum A, written before any study number):
//   COT normal: report Tuesday + 7 days 00:00 UTC (CFTC publishes Friday 15:30 ET; holiday delays move it to Monday 15:30 ET — 2026 schedule).
//   COT 2025 shutdown: max(new publish dates in the CFTC tables) + 1 day 00:00 UTC.
//   COT MISSING (no exact CFTC catch-up dates found; conservative windows): 2013-09-24…2013-11-26 (2013 shutdown), 2018-12-18…2019-03-12
//     (2018-19 shutdown; the CFTC catch-up table 7864-19 has no dates in its text), 2023-01-31…2023-04-04 (ION cyber incident delays).
//   GLD: date D (NY) → known D + 1 day 14:30 UTC (published after the close; single current snapshot, no vintages → HIST class).
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../../../src/core/paths.js'

const RAW = path.join(TURBO.root, 'data', 'research', 'extreme_swing', 'raw'), OUT = path.join(TURBO.root, 'data', 'research', 'extreme_swing', 'inputs'), DAY = 86400000
fs.mkdirSync(OUT, { recursive: true })
const check = {}

// ── COT ──
const csvSplit = (l) => { const o = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur.trim()); cur = '' } else cur += ch } o.push(cur.trim()); return o }
const rows = []; let header = null
for (const d of fs.readdirSync(path.join(RAW, 'cot')).filter((f) => !f.endsWith('.zip')).sort()) for (const f of fs.readdirSync(path.join(RAW, 'cot', d))) {
  const L = fs.readFileSync(path.join(RAW, 'cot', d, f), 'utf8').split(/\r?\n/); header ??= csvSplit(L[0])
  for (const l of L.slice(1)) { if (!l.includes('088691')) continue; const c = csvSplit(l), r = Object.fromEntries(header.map((h, i) => [h, c[i]])); if (r.CFTC_Contract_Market_Code === '088691') rows.push(r) } }
const num = (r, k) => Number(r[k])
const sa = fs.readFileSync(path.join(RAW, 'cot_special_announcements.html'), 'utf8').replace(/<[^>]+>/g, ' ')
const delay = new Map()   // report date → latest announced publish date (both 2025 tables)
for (const m of sa.matchAll(/(\d{2})\/(\d{2})\/(20\d{2})\s+(\d{2})\/(\d{2})\/(20\d{2})\s+(\d{2})\/(\d{2})\/(20\d{2})/g)) {
  const rep = `${m[3]}-${m[1]}-${m[2]}`, pub = `${m[9]}-${m[7]}-${m[8]}`; if (!rep.startsWith('2025')) continue; if (!delay.has(rep) || pub > delay.get(rep)) delay.set(rep, pub) }
const MISSING = [['2013-09-24', '2013-11-26', '2013 shutdown, no CFTC catch-up dates found'], ['2018-12-18', '2019-03-12', '2018-19 shutdown, catch-up table has no dates in text'], ['2023-01-31', '2023-04-04', 'ION cyber incident delays']]
const cot = rows.map((r) => {
  const rep = r.Report_Date_as_YYYY_MM_DD ?? r['Report_Date_as_YYYY-MM-DD'], miss = MISSING.find(([a, b]) => rep >= a && rep <= b)
  const known = miss ? null : delay.has(rep) ? Date.parse(delay.get(rep) + 'T00:00:00Z') + DAY : Date.parse(rep + 'T00:00:00Z') + 7 * DAY
  const mmL = num(r, 'M_Money_Positions_Long_All'), mmS = num(r, 'M_Money_Positions_Short_All')
  return { report_date: rep, known_t: known, known_iso: known ? new Date(known).toISOString() : null, missing_why: miss?.[2] ?? null, delayed_publish: delay.get(rep) ?? null,
    oi: num(r, 'Open_Interest_All'), mm_long: mmL, mm_short: mmS, mm_spread: num(r, 'M_Money_Positions_Spread_All'), mm_net: mmL - mmS,
    prod_long: num(r, 'Prod_Merc_Positions_Long_All'), prod_short: num(r, 'Prod_Merc_Positions_Short_All'), swap_long: num(r, 'Swap_Positions_Long_All'), swap_short: num(r, 'Swap__Positions_Short_All'),
    other_long: num(r, 'Other_Rept_Positions_Long_All'), other_short: num(r, 'Other_Rept_Positions_Short_All'), nonrep_long: num(r, 'NonRept_Positions_Long_All'), nonrep_short: num(r, 'NonRept_Positions_Short_All') }
}).sort((a, b) => a.report_date.localeCompare(b.report_date))
const uniq = new Set(cot.map((r) => r.report_date))
check.cot = { rows: cot.length, unique_dates: uniq.size, first: cot[0].report_date, last: cot.at(-1).report_date, missing_rows: cot.filter((r) => !r.known_t).length, delayed_2025_rows: cot.filter((r) => r.delayed_publish).length,
  gaps_over_8d: cot.slice(1).filter((r, i) => Date.parse(r.report_date) - Date.parse(cot[i].report_date) > 8 * DAY).map((r) => r.report_date),
  known_before_report: cot.filter((r) => r.known_t && r.known_t <= Date.parse(r.report_date + 'T00:00:00Z')).length,
  nan_fields: cot.filter((r) => Object.values(r).some((v) => typeof v === 'number' && !Number.isFinite(v) && v !== null)).length,
  // CFTC identity: open interest = Σ longs of every category + every spread position (producer, swap, managed money, other reportable, non-reportable)
  oi_identity_fail: rows.filter((r) => { const s = ['Prod_Merc_Positions_Long_All', 'Swap_Positions_Long_All', 'Swap__Positions_Spread_All', 'M_Money_Positions_Long_All', 'M_Money_Positions_Spread_All',
    'Other_Rept_Positions_Long_All', 'Other_Rept_Positions_Spread_All', 'NonRept_Positions_Long_All'].reduce((a, k) => a + num(r, k), 0); return Math.abs(s - num(r, 'Open_Interest_All')) > 1 }).length }
fs.writeFileSync(path.join(OUT, 'cot_gold_088691.jsonl'), cot.map((r) => JSON.stringify(r)).join('\n') + '\n')

// ── GLD holdings ──
const X = path.join(RAW, 'gldx', 'xl'), ss = (fs.readFileSync(path.join(X, 'sharedStrings.xml'), 'utf8').match(/<si>[\s\S]*?<\/si>/g) ?? []).map((s) => s.replace(/<[^>]+>/g, ''))
const cell = (c) => { const v = (c.match(/<v>([^<]*)<\/v>/) ?? [])[1]; return v == null ? '' : /t="s"/.test(c) ? ss[+v] : v }
const R = fs.readFileSync(path.join(X, 'worksheets', 'sheet2.xml'), 'utf8').match(/<row[\s\S]*?<\/row>/g).map((r) => (r.match(/<c [\s\S]*?(?:<\/c>|\/>)/g) ?? []).map(cell))
const H = R[0], iD = H.indexOf('Date'), iOz = H.findIndex((h) => /Total Ounces/i.test(h)), iT = H.findIndex((h) => /Tonnes/i.test(h)), iC = H.indexOf('Closing Price')
const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
const gld = []; let bad = 0, holiday = 0
for (const r of R.slice(1)) { const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(r[iD] ?? ''); const oz = Number(r[iOz]), tn = Number(r[iT])
  if (m && r[iT] === 'US Holiday') { holiday++; continue }   // the archive marks US holidays with text in every column (no values)
  if (!m || !Number.isFinite(tn)) { bad++; continue }
  const d = `${m[3]}-${MON[m[2]]}-${m[1].padStart(2, '0')}`; gld.push({ date: d, known_t: Date.parse(d + 'T00:00:00Z') + DAY + 14.5 * 3600000, tonnes: tn, ounces: oz, close: Number(r[iC]) }) }
gld.sort((a, b) => a.date.localeCompare(b.date))
check.gld = { rows: gld.length, first: gld[0].date, last: gld.at(-1).date, us_holiday_rows: holiday, unparsed_rows: bad, duplicate_dates: gld.length - new Set(gld.map((r) => r.date)).size,
  gaps_over_5d: gld.slice(1).filter((r, i) => Date.parse(r.date) - Date.parse(gld[i].date) > 5 * DAY).map((r) => r.date).filter((d) => d >= '2013'),
  rows_since_2013: gld.filter((r) => r.date >= '2013-07-14').length, tonnes_range: [Math.min(...gld.map((r) => r.tonnes)), Math.max(...gld.map((r) => r.tonnes))] }
fs.writeFileSync(path.join(OUT, 'gld_holdings.jsonl'), gld.map((r) => JSON.stringify(r)).join('\n') + '\n')
fs.writeFileSync(path.join(TURBO.root, 'data', 'research', 'extreme_swing', '2026-11-01_step1_inputs_verification.json'), JSON.stringify({ at: new Date().toISOString(), check }, null, 1))
console.log(JSON.stringify(check, null, 1))
