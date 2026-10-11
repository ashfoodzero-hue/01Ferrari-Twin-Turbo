// inv90/gbdt.mjs — a small histogram gradient-boosted tree classifier (logistic loss), self-contained (no downloads). 2026-10-11.
// fitBins(X, rows, F) → per-feature quantile edges (≤ 254) learned on TRAINING rows only; bin 0 = NaN.
// train(Xb, y, rows, opts) → model; predict(model, Xb, row) → probability. Xb = Uint8Array column-major [f * n + r].
export function fitBins(X, n, F, rows, maxBins = 254) {
  const edges = []
  for (let f = 0; f < F; f++) {
    const v = []; for (let k = 0; k < rows.length; k += Math.max(1, Math.floor(rows.length / 50000))) { const x = X[rows[k] * F + f]; if (Number.isFinite(x)) v.push(x) }
    v.sort((a, b) => a - b); const e = []
    for (let q = 1; q < maxBins; q++) { const x = v[Math.floor((q * v.length) / maxBins)]; if (x !== undefined && (e.length === 0 || x > e[e.length - 1])) e.push(x) }
    edges.push(Float64Array.from(e))
  }
  return edges
}
export function binAll(X, n, F, edges) {
  const Xb = new Uint8Array(n * F)
  for (let f = 0; f < F; f++) { const e = edges[f]
    for (let r = 0; r < n; r++) { const x = X[r * F + f]; if (!Number.isFinite(x)) { Xb[f * n + r] = 0; continue }
      let lo = 0, hi = e.length; while (lo < hi) { const m = (lo + hi) >> 1; if (e[m] < x) lo = m + 1; else hi = m } Xb[f * n + r] = lo + 1 } }
  return Xb
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

export function train(Xb, n, F, y, rows, { trees = 150, depth = 4, lr = 0.05, minLeaf = 300, lambda = 1, sub = 0.3, col = 0.8, seed = 7 } = {}) {
  const rnd = seeded(seed), m = rows.length; let pos = 0; for (const r of rows) pos += y[r]
  const p0 = Math.min(0.999, Math.max(0.001, pos / m)), base = Math.log(p0 / (1 - p0)), raw = new Float64Array(n).fill(base)
  const g = new Float64Array(n), h = new Float64Array(n), model = { base, trees: [] }
  const HG = new Float64Array(256), HH = new Float64Array(256), HC = new Int32Array(256)
  for (let t = 0; t < trees; t++) {
    const S = []; for (const r of rows) if (rnd() < sub) S.push(r)
    for (const r of S) { const p = 1 / (1 + Math.exp(-raw[r])); g[r] = p - y[r]; h[r] = Math.max(1e-6, p * (1 - p)) }
    const feats = []; for (let f = 0; f < F; f++) if (rnd() < col) feats.push(f)
    const nodes = []   // { f, thr (bin ≤ thr → left), nanLeft, left, right } or { leaf }
    const grow = (idx, d) => {
      let G = 0, Hs = 0; for (const r of idx) { G += g[r]; Hs += h[r] }
      const me = nodes.length; nodes.push(null)
      const leafVal = -G / (Hs + lambda)
      if (d >= depth || idx.length < 2 * minLeaf) { nodes[me] = { leaf: lr * leafVal }; return me }
      const parentScore = (G * G) / (Hs + lambda); let best = null
      for (const f of feats) { HG.fill(0); HH.fill(0); HC.fill(0); const off = f * n
        for (const r of idx) { const b = Xb[off + r]; HG[b] += g[r]; HH[b] += h[r]; HC[b]++ }
        for (const nanLeft of [false, true]) { let gl = nanLeft ? HG[0] : 0, hl = nanLeft ? HH[0] : 0, cl = nanLeft ? HC[0] : 0
          for (let b = 1; b < 255; b++) { gl += HG[b]; hl += HH[b]; cl += HC[b]; const cr = idx.length - cl; if (cl < minLeaf) continue; if (cr < minLeaf) break
            const gr = G - gl, hr = Hs - hl, gain = (gl * gl) / (hl + lambda) + (gr * gr) / (hr + lambda) - parentScore
            if (!best || gain > best.gain) best = { gain, f, thr: b, nanLeft } } } }
      if (!best || best.gain <= 0) { nodes[me] = { leaf: lr * leafVal }; return me }
      const L = [], R = [], off = best.f * n
      for (const r of idx) { const b = Xb[off + r]; if (b === 0 ? best.nanLeft : b <= best.thr) L.push(r); else R.push(r) }
      const node = { f: best.f, thr: best.thr, nanLeft: best.nanLeft, left: -1, right: -1 }; nodes[me] = node
      node.left = grow(L, d + 1); node.right = grow(R, d + 1); return me
    }
    grow(S, 0)
    model.trees.push(nodes)
    for (const r of rows) raw[r] += evalTree(nodes, Xb, n, r)
  }
  return model
}
function evalTree(nodes, Xb, n, r) { let k = 0; for (;;) { const nd = nodes[k]; if (nd.leaf !== undefined) return nd.leaf; const b = Xb[nd.f * n + r]; k = (b === 0 ? nd.nanLeft : b <= nd.thr) ? nd.left : nd.right } }
export function predict(model, Xb, n, r) { let s = model.base; for (const t of model.trees) s += evalTree(t, Xb, n, r); return 1 / (1 + Math.exp(-s)) }
/** split-gain importance by feature (sum of the number of times used) */
export function usage(model, F) { const u = new Array(F).fill(0); for (const t of model.trees) for (const nd of t) if (nd.leaf === undefined) u[nd.f]++; return u }
