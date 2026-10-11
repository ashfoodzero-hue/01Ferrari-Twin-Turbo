// fetch_databento_job.mjs — download a finished Databento BATCH job (2026-10-11; Ashraf approved: GC trades + BBO (tbbo), 2 y, $114.45 of the
// free credit; TEST-ONLY research data — the R0 exception approved by Ashraf: never used for live signals).
// Polls batch.list_jobs until the job is 'done', then downloads every file listed by batch.list_files into data/orderflow/gc_tbbo/ and verifies
// each file's size and SHA-256 against Databento's listing. Batch files can be re-downloaded without a new charge, so a failed file is simply
// fetched again. Re-runnable: files already present with the right hash are skipped.
//   usage: node scripts/fetch_databento_job.mjs [jobId]   (default: data/orderflow/databento_job.json)
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { TURBO } from '../src/core/paths.js'

const KEY = process.env.DATABENTO_API_KEY; if (!KEY) { console.error('no DATABENTO_API_KEY in .env'); process.exit(1) }
const AUTH = 'Basic ' + Buffer.from(KEY + ':').toString('base64'), API = 'https://hist.databento.com/v0/'
const DIR = path.join(TURBO.root, 'data', 'orderflow'), OUT = path.join(DIR, 'gc_tbbo')
const jobId = process.argv[2] || JSON.parse(fs.readFileSync(path.join(DIR, 'databento_job.json'), 'utf8')).id
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const api = async (p, params = {}) => { const r = await fetch(API + p + '?' + new URLSearchParams(params), { headers: { Authorization: AUTH } }); if (!r.ok) throw new Error(`${p} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`); return r.json() }

let job = null
for (let i = 0; i < 240; i++) {   // up to ~2 h
  const jobs = await api('batch.list_jobs', { states: 'queued,processing,done,expired' })
  job = jobs.find((j) => j.id === jobId); if (!job) throw new Error('job not found: ' + jobId)
  if (job.state === 'done') break
  if (job.state === 'expired') throw new Error('job expired')
  if (i % 4 === 0) console.log(`  job ${jobId}: ${job.state} …`)
  await sleep(30000)
}
if (job.state !== 'done') throw new Error('job not done after waiting: ' + job.state)
console.log(`job done · cost $${job.cost_usd} · records ${job.record_count} · billed ${job.billed_size} B`)
const files = await api('batch.list_files', { job_id: jobId })
fs.mkdirSync(OUT, { recursive: true })
const sha = (f) => new Promise((res, rej) => { const h = crypto.createHash('sha256'); fs.createReadStream(f).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej) })
let ok = 0
for (const f of files) {
  const dest = path.join(OUT, f.filename), want = String(f.hash || '').replace(/^sha256:/, '')
  if (fs.existsSync(dest) && fs.statSync(dest).size === f.size && (!want || (await sha(dest)) === want)) { ok++; continue }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const url = f.urls?.https ?? f.urls?.download; if (!url) throw new Error('no https url for ' + f.filename)
    const r = await fetch(url, { headers: { Authorization: AUTH } }); if (!r.ok) { console.log(`  ${f.filename}: HTTP ${r.status} (attempt ${attempt})`); await sleep(5000); continue }
    await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(dest + '.part')); fs.renameSync(dest + '.part', dest)
    const got = await sha(dest)
    if (fs.statSync(dest).size === f.size && (!want || got === want)) { ok++; console.log(`  ✓ ${f.filename} (${(f.size / 1e6).toFixed(1)} MB)`); break }
    console.log(`  ✗ ${f.filename}: size/hash mismatch (attempt ${attempt})`); fs.unlinkSync(dest)
  }
}
fs.writeFileSync(path.join(DIR, 'gc_tbbo_manifest.json'), JSON.stringify({ job: { id: job.id, cost_usd: job.cost_usd, record_count: job.record_count, billed_size: job.billed_size, schema: job.schema, symbols: job.symbols, start: job.start, end: job.end },
  source: 'Databento GLBX.MDP3 (CME Globex MDP 3.0) tbbo — every trade with the exchange aggressor side + the BBO just before it', use: 'TEST-ONLY research (R0 exception approved by Ashraf 2026-10-11); never live',
  files: files.map((f) => ({ name: f.filename, size: f.size, hash: f.hash })), downloaded_ok: ok, at: new Date().toISOString() }, null, 1))
console.log(`files ${ok}/${files.length} verified → ${OUT}`)
