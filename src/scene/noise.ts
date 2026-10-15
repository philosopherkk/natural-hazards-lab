/** Deterministic value noise. The same seed always rebuilds the same field. */

export function hash2(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed | 0, 1442695041)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function fade(t: number): number {
  return t * t * (3 - 2 * t)
}

export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const v00 = hash2(x0, y0, seed)
  const v10 = hash2(x0 + 1, y0, seed)
  const v01 = hash2(x0, y0 + 1, seed)
  const v11 = hash2(x0 + 1, y0 + 1, seed)
  const a = v00 + (v10 - v00) * tx
  const b = v01 + (v11 - v01) * tx
  return a + (b - a) * ty
}

/** Tileable value noise. `period` is the integer lattice period. */
export function valueNoisePeriodic(x: number, y: number, seed: number, period: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const wrap = (i: number) => ((i % period) + period) % period
  const v00 = hash2(wrap(x0), wrap(y0), seed)
  const v10 = hash2(wrap(x0 + 1), wrap(y0), seed)
  const v01 = hash2(wrap(x0), wrap(y0 + 1), seed)
  const v11 = hash2(wrap(x0 + 1), wrap(y0 + 1), seed)
  const a = v00 + (v10 - v00) * tx
  const b = v01 + (v11 - v01) * tx
  return a + (b - a) * ty
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let v = 0
  let a = 0.5
  let f = 1
  let sum = 0
  for (let o = 0; o < octaves; o++) {
    v += a * valueNoise(x * f, y * f, seed + o * 19)
    sum += a
    a *= 0.5
    f *= 2.03
  }
  return v / sum
}

export function fbmPeriodic(
  x: number,
  y: number,
  seed: number,
  period: number,
  octaves = 4,
): number {
  let v = 0
  let a = 0.5
  let f = 1
  let sum = 0
  for (let o = 0; o < octaves; o++) {
    const per = Math.max(1, Math.round(period * f))
    v += a * valueNoisePeriodic(x * f, y * f, seed + o * 19, per)
    sum += a
    a *= 0.5
    f *= 2
  }
  return v / sum
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
