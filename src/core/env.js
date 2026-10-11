// ════════════════════════════════════════════════════════════════════════════════
// env.js — Turbo-2's OWN .env loader (dependency-free). Keeps the app self-contained (isolation). (R6.)
// ────────────────────────────────────────────────────────────────────────────────
// Ashraf Ferrari Turbo 2 — AI Trading. Go-live (2026-06-27).
//
// Loads <ROOT>/.env into process.env so `npm start` and the scripts pick up POLYGON_API_KEY +
// TURBO_TELEGRAM_* without manual shell setup — Turbo-2 stays INDEPENDENT (its own .env, never reads
// the old app's at runtime). Real shell env always WINS (a value already in process.env is never
// overwritten). No dependency (no dotenv). Tolerant parse: skips blanks/comments, strips optional quotes.
// ════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Parse .env text → {KEY:VALUE} (pure; for tests). Skips comments/blanks; strips wrapping quotes. */
export function parseEnv(text) {
  const out = {}
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (key) out[key] = val
  }
  return out
}

/**
 * Load <ROOT>/.env into process.env (real env wins). @returns {{loaded:string[], file:string|null}}
 * @param {string} [file]  override path (tests). @param {object} [env]  target (tests).
 */
export function loadEnv(file = path.join(ROOT, '.env'), env = process.env) {
  if (!fs.existsSync(file)) return { loaded: [], file: null }
  const parsed = parseEnv(fs.readFileSync(file, 'utf8'))
  const loaded = []
  for (const [k, v] of Object.entries(parsed)) {
    if (env[k] == null || env[k] === '') { env[k] = v; loaded.push(k) }   // real shell env wins
  }
  return { loaded, file }
}
