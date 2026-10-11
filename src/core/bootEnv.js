// bootEnv.js — import this FIRST in any entry script to load <ROOT>/.env before other modules init.
// (ESM imports run in order, so a first-position side-effect import guarantees env is populated before
//  modules that read process.env at import time, e.g. telegram's TELEGRAM_CONFIG.) Isolation-clean:
// Turbo-2 reads its OWN .env only. Real shell env always wins (see env.js).
import { loadEnv } from './env.js'
loadEnv()
