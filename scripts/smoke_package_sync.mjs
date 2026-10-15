// smoke_package_sync.mjs — the install package carries the SAME code, settings and docs as the live app (2026-10-16; Ashraf: "the live app and
// the independent app must always meet the same setting and improvement"). Kept in sync by .git/hooks/post-commit (build_package.mjs --code).
// Compares docs/ ops/ scripts/ src/ + root files byte-for-byte; files with uncommitted changes are skipped (the hook syncs them at commit).
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PKG = path.join(APP, 'INSTALL_PACKAGE', 'FerrariTwinTurbo')
console.log('\n██ PACKAGE SYNC SMOKE ██')
if (!fs.existsSync(PKG)) { console.log('  (no package built on this PC — nothing to compare)'); process.exit(0) }
const dirty = new Set(execFileSync('git', ['-C', APP, 'status', '--porcelain', '--untracked-files=all', '--', 'docs', 'ops', 'scripts', 'src', 'README.md', 'package.json', '.gitignore'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, '').replace(/\//g, path.sep)))
const list = (root, rel = '') => fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? list(root, path.join(rel, e.name)) : [path.join(rel, e.name)])
await ok('every committed code / settings / doc file in the package equals the live app (byte for byte)', async () => {
  const diff = []
  for (const d of ['docs', 'ops', 'scripts', 'src']) for (const f of list(APP, d)) { if (dirty.has(f)) continue
    const p = path.join(PKG, f); if (!fs.existsSync(p)) { diff.push('missing ' + f); continue }
    if (!fs.readFileSync(p).equals(fs.readFileSync(path.join(APP, f)))) diff.push('differs ' + f) }
  for (const f of ['README.md', 'package.json', '.gitignore']) if (!dirty.has(f) && !fs.readFileSync(path.join(PKG, f)).equals(fs.readFileSync(path.join(APP, f)))) diff.push('differs ' + f)
  assert(!diff.length, diff.slice(0, 8).join(', ') + (diff.length > 8 ? ` … +${diff.length - 8}` : ''))
})
await ok('no stale file: everything in the package code folders still exists in the live app', async () => {
  const stale = []; for (const d of ['docs', 'ops', 'scripts', 'src']) for (const f of list(PKG, d)) if (!fs.existsSync(path.join(APP, f))) stale.push(f)
  assert(!stale.length, stale.slice(0, 8).join(', '))
})
await ok('the package is at the live commit (or the commit only touched data) and carries no keys', async () => {
  const v = JSON.parse(fs.readFileSync(path.join(PKG, 'VERSION.json'), 'utf8')), head = execFileSync('git', ['-C', APP, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  if (v.commit !== head) { const changed = execFileSync('git', ['-C', APP, 'diff', '--name-only', v.commit, head, '--', 'docs', 'ops', 'scripts', 'src', 'README.md', 'package.json', 'INSTALL_PACKAGE'], { encoding: 'utf8' }).trim(); assert(!changed, `package at ${v.commit}, live at ${head}; code changed: ${changed.split('\n').slice(0, 5).join(', ')}`) }
  assert(!fs.existsSync(path.join(PKG, '.env')) && !fs.existsSync(path.join(PKG, '.env.previous')))
  assert(fs.existsSync(path.join(APP, '.git', 'hooks', 'post-commit')) && fs.readFileSync(path.join(APP, '.git', 'hooks', 'post-commit'), 'utf8').includes('build_package.mjs --code'), 'the post-commit sync hook is missing')
})
console.log(process.exitCode ? '✗ PACKAGE SYNC SMOKE FAILED' : `✅ PACKAGE SYNC SMOKE: ${n} passed, 0 failed`)
