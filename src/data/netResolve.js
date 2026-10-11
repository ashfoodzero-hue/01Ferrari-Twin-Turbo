// ════════════════════════════════════════════════════════════════════════════════
// netResolve.js — a data fetch that survives THIS MACHINE'S DNS.
// ────────────────────────────────────────────────────────────────────────────────
// 🚨 ROOT CAUSE, MEASURED 2026-08-21 (not inferred). Ashraf: "pls find the source and check stale issue."
// The forecast child kept dying on `polygon network: ENOTFOUND after 3 attempts`, leaving forecast.json to age
// and the cockpit to shout STALE. Every earlier guess (rate limit, payload size, IPv6, plan) was WRONG. A raw
// node:https probe with socket-event timing put the failure in ONE place:
//     dns @11445ms → ERROR ENOTFOUND @11448ms       (tcp and tls were never reached)
// and a resolver A/B named the culprit:
//     system servers: 127.0.0.1      ← a LOCAL DNS proxy (VPN / filtering client), not the router
//     cold #1: dns.lookup FAIL ENOTFOUND 20ms   · 1.1.1.1 ok 2078ms
//     cold #2: dns.lookup ok 5385ms             · 1.1.1.1 FAIL ETIMEOUT 28220ms
//     cold #3: dns.lookup ok 14ms               · 8.8.8.8 FAIL ETIMEOUT 31252ms
// So NO single resolver is reliable here, they fail INDEPENDENTLY, and the app is spawning a COLD child every
// 60s that must resolve from scratch. That is not an app fault — but "not our fault" does not put a bar on the
// chart, so the app is made to survive it.
//
// THE MECHANISM (why this is a fix and not a bigger retry):
//   • RACE the resolvers instead of trusting one. System lookup gets a short head start (it is 1-14ms when it
//     works); if it has not answered in RACE_MS, 1.1.1.1 and 8.8.8.8 run in PARALLEL and first answer wins.
//   • REMEMBER the answer on DISK. api.polygon.io's address is stable for hours, and a cold child inherits
//     nothing in memory. A cached IP turns the next outage into a non-event; it is only ever used when live
//     resolution fails, so we never pin a rotated address while DNS is healthy.
//   • KEEP SNI CORRECT. The IP goes to the socket via the `lookup` hook while `host` stays the hostname, so TLS
//     still validates against api.polygon.io. Putting an IP in the URL would break the certificate — the naive
//     version of this fix is a security regression.
// It NEVER fabricates data: if every resolver and the cache fail, this throws and the cycle fails honestly.
// ════════════════════════════════════════════════════════════════════════════════
import https from 'node:https'
import dns from 'node:dns'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CACHE = path.join(HERE, '..', '..', 'data', 'cache', 'dns_hosts.json')
const CACHE_TTL_MS = 10 * 60000        // a remembered address is a LAST RESORT and goes stale fast (see cachedIps)
const RACE_MS = 2500                    // how long the (usually instant) system resolver gets alone
const PUBLIC_MS = 6000                  // per public-resolver budget
const PUBLIC_SERVERS = [['1.1.1.1'], ['8.8.8.8'], ['9.9.9.9']]

const readCache = () => { try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')) } catch { return {} } }
const writeCache = (o) => { try { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(o, null, 1)) } catch { /* cache is an optimisation, never a dependency */ } }

export function cachedIps(host) {
  const c = readCache()
  const e = c[host]
  if (!e || !Array.isArray(e.ips) || !e.ips.length) return []
  // 🚨 TTL IS NOT OPTIONAL (measured 2026-08-21). api.polygon.io hands back a DIFFERENT single A record on almost
  // every lookup (198.44.194.67 · .147 · .216 …) and the retired address stops accepting TCP: connecting to a
  // remembered IP failed with ETIMEDOUT after 21s in 4 of 8 cold starts, while a FRESHLY resolved address
  // connected in ~170ms. A long-lived cache does not rescue an outage here, it manufactures one.
  if (Date.now() - Date.parse(e.at || 0) > CACHE_TTL_MS) return []
  return e.ips
}
export function rememberIps(host, ips) { const c = readCache(); c[host] = { ips, at: new Date().toISOString() }; writeCache(c) }
export function forgetHost(host) { const c = readCache(); delete c[host]; writeCache(c) }
export function cachedIp(host) { return cachedIps(host)[0] || null }
export function rememberIp(host, ip) { rememberIps(host, [ip]) }

const sysLookup = (host) => new Promise((res, rej) => dns.lookup(host, { family: 4, all: true }, (e, a) => (e ? rej(e) : res(a.map((x) => x.address)))))
const viaServers = (host, servers) => new Promise((res, rej) => {
  const r = new dns.Resolver({ timeout: PUBLIC_MS, tries: 1 })
  r.setServers(servers)
  const to = setTimeout(() => { try { r.cancel() } catch { /* already settled */ } rej(new Error('ETIMEOUT')) }, PUBLIC_MS)
  r.resolve4(host, (e, a) => { clearTimeout(to); if (e || !a?.length) rej(e || new Error('ENODATA')); else res(a) })
})

/**
 * resolveResilient — the first usable answer from {system, 1.1.1.1, 8.8.8.8, 9.9.9.9}, with a SHORT-lived disk
 * memory as the last resort. Measured on this machine: any ONE resolver fails on roughly 1 in 3 cold starts, and
 * they fail INDEPENDENTLY — so racing them is what turns a 1-in-3 outage into a non-event.
 * Returns { ips, via }. `ips` is ordered: the caller tries the next address when a connect dies.
 */
export async function resolveResilient(host) {
  let sysErr = null
  const sys = sysLookup(host).catch((e) => { sysErr = e; return null })
  // the race timer is CLEARED when the system resolver wins (2026-09-08): left armed it held every child process
  // alive for RACE_MS after all its work — one of the ref'd timers the child-exit guard found
  let raceT = null
  const head = await Promise.race([sys, new Promise((r) => { raceT = setTimeout(() => r('__slow__'), RACE_MS) })])
  if (raceT) clearTimeout(raceT)
  if (head && head !== '__slow__') { rememberIps(host, head); return { ips: head, via: 'system' } }
  const racers = [
    sys.then((v) => (v ? { ips: v, via: 'system' } : Promise.reject(sysErr || new Error('ENOTFOUND')))),
    ...PUBLIC_SERVERS.map((s) => viaServers(host, s).then((ips) => ({ ips, via: s[0] }))),
  ]
  try {
    const win = await Promise.any(racers)
    rememberIps(host, win.ips)
    return win
  } catch {
    const ips = cachedIps(host)
    if (ips.length) return { ips, via: 'disk-cache' }
    throw new Error('DNS_ALL_FAILED')
  }
}

/**
 * fetchJsonResilient — GET a JSON URL over HTTPS through the resolver above. Returns {status, ok, json, via}.
 * Every candidate address is tried in turn: a single retired A record must not fail the cycle, and a dead
 * DISK-CACHED address is FORGOTTEN so the next call resolves fresh instead of re-timing-out on it.
 */
export async function fetchJsonResilient(url, { timeoutMs = 20000 } = {}) {
  const u = new URL(url)
  const { ips, via } = await resolveResilient(u.hostname)
  let last = null
  for (const ip of ips.slice(0, 3)) {
    try { return await getVia(u, ip, via, timeoutMs) } catch (e) { last = e }
  }
  if (via === 'disk-cache') forgetHost(u.hostname)      // a remembered address that will not connect is worse than none
  throw last || new Error('DNS_ALL_FAILED')
}

// 🚨 EVERY PAGE WAS A FRESH CONNECT (2026-08-21). A 160-day 15m pull is 3 pages, and on this machine each new
// socket is an independent ~40% chance of a 12s stall — measured 2/3 whole-fetch success with per-page connects.
// One keep-alive pool means the risk is paid ONCE per process and every later page rides the warm socket.
const AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000, maxSockets: 4, scheduling: 'fifo' })

function getVia(u, ip, via, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: u.hostname,                                  // SNI + certificate identity stay the HOSTNAME
      servername: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'GET',
      timeout: timeoutMs,
      agent: AGENT,
      // 🚨 Node 20+ enables autoSelectFamily, which calls the hook with {all:true} and expects an ARRAY.
      // Returning the (documented) 3-arg form there fails every connect with ERR_INVALID_IP_ADDRESS in ~40ms —
      // measured 8/8 before this branch existed. Both shapes are honoured.
      lookup: (h, o, cb) => (o && o.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4)),
    }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (d) => { body += d })
      res.on('end', () => {
        let json = {}
        try { json = JSON.parse(body) } catch { json = {} }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json, via, ip })
      })
    })
    req.on('timeout', () => { const e = new Error('request timeout'); e.code = 'UND_ERR_CONNECT_TIMEOUT'; req.destroy(e) })
    req.on('error', (e) => reject(e))
    req.end()
  })
}
