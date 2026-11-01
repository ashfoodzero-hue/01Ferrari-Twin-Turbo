// smoke_gdelt_events.mjs — the GDELT daily event builder (scripts/research/geo/gdelt_events.mjs, 2026-11-01): zip reader, fresh / stale / other-day rules,
// FIPS → ISO country keys, conflict-only dyads, and the stored 2026-10-31 row against an independent awk count of the raw file.
import assert from 'node:assert'
import zlib from 'node:zlib'
import { unzipOne, aggregateDay, loadGdeltDays } from './research/geo/gdelt_events.mjs'
let n = 0
const ok = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name) } catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1 } }
console.log('\n██ GDELT EVENTS SMOKE ██')

// one GDELT 1.0 row (58 columns) with the fields the builder reads
const row = ({ sql = '20261031', a1 = '', a2 = '', root = '19', quad = 4, gold = -10, art = 2, tone = -5, geo = 'IR', added = '20261031' }) => {
  const f = Array(58).fill(''); Object.assign(f, { 1: sql, 7: a1, 17: a2, 28: root, 29: String(quad), 30: String(gold), 33: String(art), 34: String(tone), 51: geo, 56: added }); return f.join('\t') }

await ok('zip reader: deflated entry whose local header defers the sizes (data-descriptor style)', () => {
  const body = Buffer.from('a\tb\n'.repeat(1000)), comp = zlib.deflateRawSync(body), name = Buffer.from('x.CSV')
  const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(8, 6); loc.writeUInt16LE(8, 8); loc.writeUInt16LE(name.length, 26)   // sizes 0 here
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(body.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(0, 42)
  const cdOff = loc.length + name.length + comp.length, end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt32LE(cdOff, 16)
  assert(unzipOne(Buffer.concat([loc, name, comp, cd, name, end])).equals(body))
})
await ok('fresh / stale / other-day / bad rows are separated; only fresh rows are counted', () => {
  const t = [row({}), row({ sql: '20261024' }), row({ sql: '20261023' }), row({ added: '20261030' }), 'short\trow', row({ quad: 9 })].join('\n') + '\n'
  const d = aggregateDay('2026-10-31', t)
  assert.deepEqual([d.rows, d.stale, d.other_day, d.bad, d.world.n], [6, 1, 1, 2, 2])   // 10-24 = day − 7 is fresh, 10-23 stale
})
await ok('country by ActionGeo FIPS → ISO 3 (Gaza + West Bank = PSE); off-list places count in world only', () => {
  const d = aggregateDay('2026-10-31', [row({ geo: 'GZ' }), row({ geo: 'WE', quad: 3, root: '13' }), row({ geo: 'FR' }), row({ geo: 'IR', quad: 1, root: '04', gold: 4, art: 6, tone: 1 })].join('\n'))
  assert.deepEqual(Object.keys(d.by_country), ['IRN', 'PSE'])
  assert.deepEqual(d.by_country.PSE.q, [0, 0, 1, 1]); assert.equal(d.by_country.PSE.r['13'], 1); assert.equal(d.by_country.PSE.r['19'], 1)
  assert.equal(d.by_country.PSE.aq4, 2); assert.equal(d.by_country.IRN.r['15'], 0); assert.equal(d.world.n, 4)
  assert.equal(d.by_country.IRN.g, 4); assert.equal(d.by_country.PSE.g, -10); assert.equal(d.by_country.PSE.tone, -5)
})
await ok('dyads: conflict only (quad 3-4), both actors on the watch list, never a country with itself', () => {
  const d = aggregateDay('2026-10-31', [row({ a1: 'USA', a2: 'IRN' }), row({ a1: 'USA', a2: 'IRN', quad: 1 }), row({ a1: 'USA', a2: 'FRA' }), row({ a1: 'ISR', a2: 'ISR' }), row({ a1: 'ISR', a2: 'IRN', quad: 3 })].join('\n'))
  assert.deepEqual(Object.keys(d.dyads), ['ISR>IRN', 'USA>IRN']); assert.deepEqual(d.dyads['USA>IRN'].q, [0, 0, 0, 1])
})
await ok('stored 2026-10-31 = independent awk count of the raw file (Iran, fresh, material conflict 166; stale 562; 73,394 rows)', () => {
  const r = loadGdeltDays().get('2026-10-31'); if (!r) { console.log('    (2026-10-31 not stored here — skipped)'); return }
  assert.deepEqual([r.rows, r.stale, r.bad, r.by_country.IRN.q[3]], [73394, 562, 0, 166])
})
console.log(`gdelt events smoke: ${n} passed`)
