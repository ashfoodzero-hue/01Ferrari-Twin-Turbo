// build_package.mjs — builds the copy-to-any-PC package of Ferrari Twin Turbo (2026-10-16; Ashraf: "make me a sub folder inside the Twin Turbo
// folder that includes this App to be installed independent on any PC with full setting").
//   node INSTALL_PACKAGE/build_package.mjs          → INSTALL_PACKAGE/FerrariTwinTurbo/  FULL: code + all settings + all data (~16 GB, ready at once)
//   node INSTALL_PACKAGE/build_package.mjs --lite   → same without the price history / order-flow ticks (~0.5 GB; the installer downloads history)
// NEVER copied: .env / .env.previous (your keys — the installer asks for them), locks, heartbeats, the watchdog halt marker, .git.
// Reads the live app; writes ONLY under INSTALL_PACKAGE/FerrariTwinTurbo/. Safe to run while the app is live (files are copied, nothing is moved).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..'), OUT = path.join(HERE, 'FerrariTwinTurbo'), LITE = process.argv.includes('--lite')
const XF = ['.env', '.env.*', '*.lock', '*.tmp', 'stream_heartbeat.json', 'live_heartbeat.json', 'WATCHDOG_HALT.marker', 'alerted.json']
const XD = ['self_heal', ...(LITE ? ['history', 'orderflow', 'release_ticks'] : [])]
const robo = (from, to, extra = []) => { const r = spawnSync('robocopy', [from, to, '/MIR', '/R:1', '/W:1', '/NFL', '/NDL', '/NP', '/NJH', '/MT:8', '/XF', ...XF, '/XD', ...XD, ...extra], { encoding: 'utf8', windowsHide: true })
  if (r.status >= 8) throw new Error(`robocopy ${from} failed (${r.status}): ${r.stdout?.slice(-600)}`); return r.stdout }
console.log(`building ${LITE ? 'LITE' : 'FULL'} package → ${OUT}`)
fs.mkdirSync(OUT, { recursive: true })
for (const d of ['docs', 'ops', 'scripts', 'src', 'data']) { const t0 = Date.now(); robo(path.join(APP, d), path.join(OUT, d)); console.log(`  ✓ ${d} (${((Date.now() - t0) / 1000).toFixed(0)} s)`) }
for (const f of ['README.md', 'package.json', '.gitignore']) fs.copyFileSync(path.join(APP, f), path.join(OUT, f))
for (const f of ['INSTALL.cmd', 'README_INSTALL.md']) fs.copyFileSync(path.join(HERE, f), path.join(OUT, f))
let commit = null; try { commit = execFileSync('git', ['-C', APP, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() } catch { /* no git */ }
fs.writeFileSync(path.join(OUT, 'VERSION.json'), JSON.stringify({ app: 'Ferrari Twin Turbo', built_at: new Date().toISOString(), commit, lite: LITE, node_min: 22 }, null, 1))
// self-check: no key file, no lock, the installer + launchers present
const bad = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/^\.env($|\.)|\.lock$/.test(e.name)) bad.push(p) } }
walk(OUT); if (bad.length) throw new Error('package contains secrets/locks: ' + bad.join(', '))
for (const f of ['INSTALL.cmd', 'ops/setup.mjs', 'scripts/run_settings.mjs', 'scripts/run_twin.mjs', 'src/master/tradeAlert.js']) if (!fs.existsSync(path.join(OUT, f))) throw new Error('missing ' + f)
console.log(`✅ package ready: ${OUT} (commit ${commit}${LITE ? ', lite' : ''}) — copy this folder to the other PC and double-click INSTALL.cmd`)
