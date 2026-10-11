// smoke_netresolve.mjs — pins the DNS-survival mechanism. (2026-08-21)
// The forecast died with `ENOTFOUND after 3 attempts` and the cockpit shouted STALE. The cause was MEASURED, not
// guessed: this machine's DNS server is 127.0.0.1 (a local proxy) and it — plus 1.1.1.1 and 8.8.8.8 — each fail
// independently on roughly 1 in 3 cold starts. These checks pin the three things that make the fix a fix rather
// than a bigger retry, and the one thing that would make it a security regression.
//
// ⚠ POWER NOTE: a plain "does it fetch?" test passes while DNS is healthy and therefore proves NOTHING about the
// outage. Every check below forces the failure path instead of waiting to be lucky.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveResilient, fetchJsonResilient, rememberIp, cachedIp } from '../src/data/netResolve.js'

const CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cache', 'dns_hosts.json')
const FAKE = 'turbo2-dns-probe.invalid'                       // .invalid can never resolve (RFC 2606) — a reliable outage
let pass = 0, fail = 0
const ok = (n, f) => f().then(() => { pass++; console.log('  ✓ ' + n) }).catch((e) => { fail++; console.log('  ✗ ' + n + ' — ' + e.message) })

// ── OFFLINE DETECTION (2026-08-29). This suite twice failed the whole smoke:all chain while the MACHINE had no
// egress at all (000 to every host, raw-IP probes included). An assertion that needs the internet cannot say
// "no" from an offline box — by the house rule, an unpowered test returns NO INFORMATION, never a failure.
// The probe below uses RAW IPs on two independent networks (no DNS involved), so it cannot itself be fooled by
// the very resolver under test. Both dead => live-path assertions are SKIPPED with a loud banner; every
// offline-capable assertion (disk cache, expiry, throw path, family hook) still runs and can still fail.
// If EITHER probe answers, nothing is skipped and a resolution failure is a real failure again.
import net from 'node:net'
const tcpAlive = (host, port = 443, ms = 4000) => new Promise((res) => {
  const s = net.connect({ host, port }); const t = setTimeout(() => { s.destroy(); res(false) }, ms)
  s.on('connect', () => { clearTimeout(t); s.destroy(); res(true) })
  s.on('error', () => { clearTimeout(t); res(false) })
})
const ONLINE = (await Promise.all([tcpAlive('1.1.1.1'), tcpAlive('8.8.8.8')])).some(Boolean)
let skipped = 0
const okLive = (n, f) => ONLINE ? ok(n, f) : (skipped++, console.log('  ○ SKIPPED (machine OFFLINE — raw-IP probes to 1.1.1.1 and 8.8.8.8 both dead): ' + n), Promise.resolve())
if (!ONLINE) console.log('  🚨 MACHINE OFFLINE — live-path assertions return NO INFORMATION and are skipped, not failed.')
console.log('\n██ RESILIENT DNS SMOKE ██')

await okLive('a healthy host resolves to a v4 address and the answer is remembered on disk', async () => {
  const r = await resolveResilient('api.polygon.io')
  assert(Array.isArray(r.ips) && r.ips.length, 'must return an ORDERED address list — one retired A record must not fail the cycle')
  assert(r.ips.every((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)), 'all must be v4 addresses, got ' + r.ips.join(','))
  assert(['system', '1.1.1.1', '8.8.8.8', '9.9.9.9', 'disk-cache'].includes(r.via), 'via must name the winner: ' + r.via)
  assert.equal(cachedIp('api.polygon.io'), r.ips[0], 'a cold child inherits nothing in memory — the answer must reach disk')
})

await ok('🚨 when EVERY live resolver fails, the DISK CACHE carries the request (this is the outage path)', async () => {
  rememberIp(FAKE, '198.44.194.216')
  const r = await resolveResilient(FAKE)                      // .invalid cannot resolve anywhere — only the cache can answer
  assert.equal(r.via, 'disk-cache', 'expected the cache to answer, got via=' + r.via)
  assert.deepEqual(r.ips, ['198.44.194.216'])
})

await ok('🚨 a remembered address EXPIRES — polygon rotates its single A record and a stale IP times out at 21s', async () => {
  rememberIp(FAKE, '198.44.194.216')
  const c = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  c[FAKE].at = new Date(Date.now() - 11 * 60000).toISOString()        // 11 minutes old — past the 10-minute TTL
  fs.writeFileSync(CACHE, JSON.stringify(c, null, 1))
  assert.equal(cachedIp(FAKE), null, 'an expired address must not be served — that manufactures the outage it was meant to survive')
})

await ok('🚨 with no cache and no resolver, it THROWS — an outage never returns fabricated data', async () => {
  const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); delete c[FAKE]; fs.writeFileSync(CACHE, JSON.stringify(c, null, 1))
  await assert.rejects(() => resolveResilient(FAKE), (e) => e.message === 'DNS_ALL_FAILED', 'must fail honestly, not silently')
})

await okLive('🚨 TLS still validates against the HOSTNAME — an IP in the URL would have been a security regression', async () => {
  rememberIp(FAKE, '198.44.194.216')                          // a REAL polygon address behind a WRONG hostname
  // The proof is "the connection is REFUSED on the certificate name". A transient transport fault (reset, timeout —
  // seen once in the suite while two validator replays saturated the box, 2026-09-09) proves nothing either way, so
  // it is retried; only a connection that SUCCEEDS without a certificate error fails the guard.
  let last = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { await fetchJsonResilient('https://' + FAKE + '/v1/marketstatus/now'); last = new Error('connected without a certificate error'); break }
    catch (e) { last = e; const s = String(e.code) + ' ' + e.message
      if (/ERR_TLS_CERT_ALTNAME_INVALID|altname|certificate/i.test(s)) break                       // the proof
      if (/ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|socket hang up|aborted|timeout/i.test(s) && attempt < 3) { await new Promise((r) => setTimeout(r, 2000)); continue }
      break }
  }
  assert(last && /ERR_TLS_CERT_ALTNAME_INVALID|altname|certificate/i.test(String(last.code) + last.message),
    'the certificate must be checked against ' + FAKE + ' — proof that servername is the hostname, not the address (got: ' + (last ? String(last.code) + ' ' + last.message : 'no error') + ')')
  const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); delete c[FAKE]; fs.writeFileSync(CACHE, JSON.stringify(c, null, 1))
})

await ok('🚨 the lookup hook honours autoSelectFamily ({all:true} → array), which cost 8/8 connects when it did not', async () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'netResolve.js'), 'utf8')
  assert(/o\s*&&\s*o\.all\s*\?\s*cb\(null,\s*\[\{\s*address/.test(src),
    'the {all:true} branch is the difference between connecting and ERR_INVALID_IP_ADDRESS in 40ms')
})

console.log(`\n${fail ? '✗' : '✅'} RESILIENT DNS SMOKE: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
