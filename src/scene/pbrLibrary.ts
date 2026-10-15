import * as THREE from 'three'
import { fbmPeriodic, hash2 } from './noise'
import { yieldFrame } from './initTiming'

const SIZE = 256

export type PbrSet = {
  map: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
  metalnessMap: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  emissiveMap?: THREE.CanvasTexture
}

export type PbrLibrary = {
  rock: PbrSet
  snow: PbrSet
  soil: PbrSet
  sand: PbrSet
  stucco: PbrSet
  roof: PbrSet
  bark: PbrSet
  asphalt: PbrSet
  crust: PbrSet
  lava: PbrSet
  waterNormal: THREE.CanvasTexture
  crack: THREE.CanvasTexture
  softGlow: THREE.CanvasTexture
}

type Shade = {
  albedo: [number, number, number]
  rough: number
  metal: number
  emissive?: [number, number, number]
}

let cache: PbrLibrary | null = null
let pending: Promise<PbrLibrary> | null = null

export function getPbrLibrary(): PbrLibrary {
  if (!cache) {
    throw new Error('Call ensurePbrLibraryAsync() before sampling PBR textures')
  }
  return cache
}

/** Builds every shared PBR set once, yielding between sets so the loader can paint. */
export function ensurePbrLibraryAsync(): Promise<PbrLibrary> {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = buildLibrary()
      .then((lib) => {
        cache = lib
        return lib
      })
      .catch((err) => {
        pending = null
        throw err
      })
  }
  return pending
}

async function buildLibrary(): Promise<PbrLibrary> {
  const rock = await buildField(5, 7, 4.2, (x, y, h) => {
    const grain = hash2(x, y, 11)
    const crack = ridge(x, y, h, 9)
    const lichen = hash2(x * 3, y * 3, 21) > 0.86 && h > 0.45
    let r = 78 + h * 92 + grain * 28
    let g = 58 + h * 62 + grain * 14
    let b = 46 + h * 40 + grain * 8
    if (crack < 0.16) {
      r *= 0.38
      g *= 0.36
      b *= 0.34
    }
    if (lichen) {
      r *= 0.72
      g = g * 0.85 + 28
      b *= 0.7
    }
    return { albedo: [r, g, b], rough: 168 + (1 - h) * 70 + crack * 20, metal: 8 + grain * 18 }
  })
  const snow = await buildField(3, 3, 1.15, (x, y, h) => {
    const spark = hash2(x, y, 4)
    const dirt = h < 0.32 ? (0.32 - h) * 2.2 : 0
    const r = 236 + h * 16 - dirt * 50
    const g = 240 + h * 12 - dirt * 42
    const b = 248 - dirt * 28
    const glossy = spark > 0.93
    return {
      albedo: [r, g, b],
      rough: glossy ? 70 : 150 + (1 - h) * 80,
      metal: glossy ? 40 : 6,
    }
  })
  const soil = await buildField(8, 6, 2.4, (x, y, h) => {
    const grain = hash2(x, y, 6)
    const grass = h > 0.42 && h < 0.78 && grain > 0.28
    let r = 92 + h * 70
    let g = 68 + h * 42
    let b = 42 + h * 24
    if (grass) {
      r = 54 + grain * 30
      g = 92 + h * 70
      b = 38 + grain * 16
    }
    return { albedo: [r, g, b], rough: 190 + grain * 50, metal: 4 }
  })
  const sand = await buildField(2, 10, 1.5, (x, y, h) => {
    const grain = hash2(x, y, 8)
    return {
      albedo: [186 + h * 48 + grain * 18, 158 + h * 36 + grain * 10, 112 + h * 28],
      rough: 200 + grain * 40,
      metal: 6,
    }
  })
  const stucco = await buildField(13, 8, 1.35, (x, y, h) => {
    const stain = hash2(x, y, 15)
    const drip = Math.abs(Math.sin(x * 0.11 + h * 4))
    let r = 206 + h * 28
    let g = 190 + h * 22
    let b = 168 + h * 16
    if (stain > 0.94 || (drip > 0.92 && y > SIZE * 0.35)) {
      r -= 36
      g -= 32
      b -= 24
    }
    return { albedo: [r, g, b], rough: 175 + stain * 50, metal: 4 }
  })
  const roofGroove = (x: number, y: number) => {
    const rowH = 14
    const colW = 18
    const row = Math.floor(y / rowH)
    const lx = (x + (row % 2) * (colW * 0.5)) % colW
    const ly = y % rowH
    return lx < 1.4 || ly > rowH - 1.6
  }
  const roof = await buildField(
    17,
    4,
    2.6,
    (x, y, h) => {
      const rowH = 14
      const colW = 18
      const row = Math.floor(y / rowH)
      const groove = roofGroove(x, y)
      const grain = hash2(x, y, 19)
      const tone = 0.82 + ((row + Math.floor(x / colW)) % 3) * 0.06
      let r = 148 * tone + grain * 16
      let g = 62 * tone + grain * 8
      let b = 42 * tone
      if (groove) {
        r *= 0.45
        g *= 0.42
        b *= 0.4
      }
      return { albedo: [r, g, b], rough: groove ? 210 : 145 + grain * 30 + h * 10, metal: 10 }
    },
    (x, y, h) => (roofGroove(x, y) ? h * 0.25 : 0.55 + h * 0.45),
  )
  const bark = await buildField(23, 5, 3.1, (x, y, h) => {
    const groove = Math.abs(Math.sin(x * 0.22 + h * 5)) < 0.18
    const grain = hash2(x, y, 27)
    let r = 86 + h * 48
    let g = 58 + h * 28
    let b = 36 + h * 16
    if (groove) {
      r *= 0.42
      g *= 0.4
      b *= 0.38
    }
    return { albedo: [r + grain * 10, g, b], rough: groove ? 230 : 185, metal: 3 }
  })
  const asphalt = await buildField(29, 9, 1.2, (x, y, h) => {
    const stone = hash2(x, y, 31) > 0.84
    const base = 58 + h * 28
    const r = stone ? base + 46 : base
    return { albedo: [r, r + 2, r + 4], rough: stone ? 160 : 215, metal: stone ? 18 : 8 }
  })
  const crust = await buildField(37, 8, 3.6, (_x, _y, h) => {
    const hot = h < 0.34
    const warm = h < 0.48
    if (hot) {
      return {
        albedo: [40 + h * 20, 12, 6],
        rough: 230,
        metal: 8,
        emissive: [255, 150 + (0.34 - h) * 280, 30],
      }
    }
    return {
      albedo: [18 + h * 16, 14, 12],
      rough: 245,
      metal: 4,
      emissive: warm ? [80, 18, 4] : [0, 0, 0],
    }
  })
  const lava = await buildField(41, 6, 2.2, (_x, _y, h) => {
    const crusty = h > 0.62
    const vein = h < 0.38
    if (vein) {
      return {
        albedo: [255, 210 + h * 40, 80],
        rough: 40,
        metal: 20,
        emissive: [255, 170, 40],
      }
    }
    if (crusty) {
      return {
        albedo: [48, 18, 10],
        rough: 220,
        metal: 6,
        emissive: [40, 8, 0],
      }
    }
    return {
      albedo: [220, 70 + h * 40, 16],
      rough: 90,
      metal: 12,
      emissive: [220, 60, 8],
    }
  })
  const waterNormal = await buildWaterNormal()
  const crack = await buildCrackMap()
  const softGlow = buildSoftGlow()
  return {
    rock,
    snow,
    soil,
    sand,
    stucco,
    roof,
    bark,
    asphalt,
    crust,
    lava,
    waterNormal,
    crack,
    softGlow,
  }
}

function ridge(x: number, y: number, h: number, seed: number): number {
  const n = fbmPeriodic((x / SIZE) * 10, (y / SIZE) * 10, seed, 10, 2)
  return Math.abs(Math.sin(x * 0.15 + y * 0.04 + n * 8 + h * 3))
}

async function buildField(
  seed: number,
  period: number,
  normalStrength: number,
  shade: (x: number, y: number, h: number) => Shade,
  sculpt?: (x: number, y: number, h: number) => number,
): Promise<PbrSet> {
  const height = new Float32Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = (x / SIZE) * period
      const v = (y / SIZE) * period
      const n = fbmPeriodic(u, v, seed, period, 4)
      height[y * SIZE + x] = sculpt ? sculpt(x, y, n) : n
    }
  }
  const albedo = new Uint8ClampedArray(SIZE * SIZE * 4)
  const rough = new Uint8ClampedArray(SIZE * SIZE * 4)
  const metal = new Uint8ClampedArray(SIZE * SIZE * 4)
  const normal = new Uint8ClampedArray(SIZE * SIZE * 4)
  const emissive = new Uint8ClampedArray(SIZE * SIZE * 4)
  let anyEmissive = false
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const h = height[i]!
      const sample = shade(x, y, h)
      const o = i * 4
      const [r, g, b] = sample.albedo
      albedo[o] = clamp8(r)
      albedo[o + 1] = clamp8(g)
      albedo[o + 2] = clamp8(b)
      albedo[o + 3] = 255
      const rv = clamp8(sample.rough)
      rough[o] = rough[o + 1] = rough[o + 2] = rv
      rough[o + 3] = 255
      const mv = clamp8(sample.metal)
      metal[o] = metal[o + 1] = metal[o + 2] = mv
      metal[o + 3] = 255
      if (sample.emissive) {
        anyEmissive = true
        emissive[o] = clamp8(sample.emissive[0])
        emissive[o + 1] = clamp8(sample.emissive[1])
        emissive[o + 2] = clamp8(sample.emissive[2])
        emissive[o + 3] = 255
      }
      const hL = height[y * SIZE + ((x - 1 + SIZE) % SIZE)]!
      const hR = height[y * SIZE + ((x + 1) % SIZE)]!
      const hU = height[((y - 1 + SIZE) % SIZE) * SIZE + x]!
      const hD = height[((y + 1) % SIZE) * SIZE + x]!
      let nx = (hL - hR) * normalStrength
      let ny = (hU - hD) * normalStrength
      let nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      normal[o] = clamp8((nx * 0.5 + 0.5) * 255)
      normal[o + 1] = clamp8((ny * 0.5 + 0.5) * 255)
      normal[o + 2] = clamp8((nz * 0.5 + 0.5) * 255)
      normal[o + 3] = 255
    }
  }
  const set: PbrSet = {
    map: canvasTex(albedo, true),
    roughnessMap: canvasTex(rough, false),
    metalnessMap: canvasTex(metal, false),
    normalMap: canvasTex(normal, false),
  }
  if (anyEmissive) set.emissiveMap = canvasTex(emissive, true)
  await yieldFrame()
  return set
}

async function buildWaterNormal(): Promise<THREE.CanvasTexture> {
  const height = new Float32Array(SIZE * SIZE)
  const period = 4
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = (x / SIZE) * period
      const v = (y / SIZE) * period
      const chop =
        fbmPeriodic(u, v, 53, period, 4) * 0.75 +
        fbmPeriodic(u * 2.1 + 4, v * 1.7, 59, period * 2, 3) * 0.25
      height[y * SIZE + x] = chop
    }
  }
  const normal = new Uint8ClampedArray(SIZE * SIZE * 4)
  const strength = 2.8
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const hL = height[y * SIZE + ((x - 1 + SIZE) % SIZE)]!
      const hR = height[y * SIZE + ((x + 1) % SIZE)]!
      const hU = height[((y - 1 + SIZE) % SIZE) * SIZE + x]!
      const hD = height[((y + 1) % SIZE) * SIZE + x]!
      let nx = (hL - hR) * strength
      let ny = (hU - hD) * strength
      let nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      const o = (y * SIZE + x) * 4
      normal[o] = clamp8((nx * 0.5 + 0.5) * 255)
      normal[o + 1] = clamp8((ny * 0.5 + 0.5) * 255)
      normal[o + 2] = clamp8((nz * 0.5 + 0.5) * 255)
      normal[o + 3] = 255
    }
  }
  await yieldFrame()
  return canvasTex(normal, false)
}

async function buildCrackMap(): Promise<THREE.CanvasTexture> {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = fbmPeriodic((x / SIZE) * 7, (y / SIZE) * 7, 71, 7, 3)
      const line = Math.abs(Math.sin(x * 0.09 + n * 9 + y * 0.02))
      const branch = Math.abs(Math.sin(y * 0.07 + n * 6))
      const hit = line < 0.12 || (branch < 0.08 && n > 0.55)
      const o = (y * SIZE + x) * 4
      if (hit) {
        data[o] = 28
        data[o + 1] = 26
        data[o + 2] = 24
        data[o + 3] = 210
      } else {
        data[o + 3] = 0
      }
    }
  }
  await yieldFrame()
  const tex = canvasTex(data, true)
  return tex
}

function buildSoftGlow(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}

function canvasTex(data: Uint8ClampedArray, srgb: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(SIZE, SIZE)
  img.data.set(data)
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.anisotropy = 8
  return tex
}

export type StampedMaps = {
  map: THREE.Texture
  roughnessMap: THREE.Texture
  metalnessMap: THREE.Texture
  normalMap: THREE.Texture
  emissiveMap?: THREE.Texture
}

const stampCache = new WeakMap<PbrSet, Map<string, StampedMaps>>()

export function stamped(set: PbrSet, repeatX: number, repeatY: number): StampedMaps {
  let bucket = stampCache.get(set)
  if (!bucket) {
    bucket = new Map()
    stampCache.set(set, bucket)
  }
  const key = `${repeatX}x${repeatY}`
  const hit = bucket.get(key)
  if (hit) return hit
  const maps: StampedMaps = {
    map: withRepeat(set.map, repeatX, repeatY),
    roughnessMap: withRepeat(set.roughnessMap, repeatX, repeatY),
    metalnessMap: withRepeat(set.metalnessMap, repeatX, repeatY),
    normalMap: withRepeat(set.normalMap, repeatX, repeatY),
  }
  if (set.emissiveMap) maps.emissiveMap = withRepeat(set.emissiveMap, repeatX, repeatY)
  bucket.set(key, maps)
  return maps
}

function withRepeat(tex: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const clone = tex.clone()
  clone.wrapS = clone.wrapT = THREE.RepeatWrapping
  clone.repeat.set(rx, ry)
  clone.needsUpdate = true
  return clone
}

export function pbrMaterial(
  set: PbrSet,
  opts: {
    repeat?: [number, number]
    color?: number
    normalScale?: number
    roughness?: number
    metalness?: number
    emissive?: number
    emissiveIntensity?: number
    transparent?: boolean
    opacity?: number
    side?: THREE.Side
    depthWrite?: boolean
  } = {},
): THREE.MeshStandardMaterial {
  const [rx, ry] = opts.repeat ?? [1, 1]
  const maps = stamped(set, rx, ry)
  const ns = opts.normalScale ?? 0.85
  const mat = new THREE.MeshStandardMaterial({
    map: maps.map,
    roughnessMap: maps.roughnessMap,
    metalnessMap: maps.metalnessMap,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(ns, ns),
    roughness: opts.roughness ?? 1,
    metalness: opts.metalness ?? 1,
    color: opts.color ?? 0xffffff,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? (maps.emissiveMap ? 1 : 0),
    emissiveMap: maps.emissiveMap,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  })
  if (opts.depthWrite === false) mat.depthWrite = false
  return mat
}

export function waterMaterial(normal: THREE.CanvasTexture): THREE.MeshPhysicalMaterial {
  const n = normal.clone()
  n.wrapS = n.wrapT = THREE.RepeatWrapping
  n.repeat.set(7, 7)
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color: 0x0c4f72,
    roughness: 0.06,
    metalness: 0.08,
    normalMap: n,
    normalScale: new THREE.Vector2(0.38, 0.38),
    transparent: true,
    opacity: 0.92,
    clearcoat: 0.45,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.85,
    depthWrite: false,
  })
}

export function floodMaterial(normal: THREE.CanvasTexture): THREE.MeshPhysicalMaterial {
  const n = normal.clone()
  n.wrapS = n.wrapT = THREE.RepeatWrapping
  n.repeat.set(4, 3)
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a6e96,
    roughness: 0.04,
    metalness: 0.12,
    normalMap: n,
    normalScale: new THREE.Vector2(0.28, 0.28),
    transparent: true,
    opacity: 0.46,
    clearcoat: 0.55,
    clearcoatRoughness: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}
