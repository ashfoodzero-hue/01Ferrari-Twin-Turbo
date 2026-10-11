// run_stream.mjs — Ferrari Twin Turbo: the LIVE tick streamer (src/data/tickStream.js) as its own long-running process.
// Single instance (data/master/run_stream.lock); the ONLY writer of data/history/<SYM>/1m.jsonl while it runs.
// Started and supervised by run_twin.mjs (npm start); can be run alone with: npm run stream
import '../src/core/bootEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { TURBO } from '../src/core/paths.js'
import { pidAlive } from '../src/core/pidAlive.js'
import { startTickStream } from '../src/data/tickStream.js'

const LOCK = path.join(TURBO.master, 'run_stream.lock')
fs.mkdirSync(TURBO.master, { recursive: true })
try { const l = JSON.parse(fs.readFileSync(LOCK, 'utf8')); if (l.pid !== process.pid && pidAlive(l.pid)) { console.error(`run_stream already running (pid ${l.pid}) — exiting`); process.exit(2) } } catch { /* no lock */ }
fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))
console.log(`run_stream pid ${process.pid} — Polygon forex ticks for all symbols → verified 1m bars`)
const s = startTickStream()
const stop = () => { s.stop(); try { fs.unlinkSync(LOCK) } catch { /* */ } process.exit(0) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
