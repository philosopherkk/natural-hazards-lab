import * as THREE from 'three'
import { yieldFrame } from './initTiming'

export type RockTextureSet = {
  map: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
}

let rockTexturesCache: RockTextureSet | null = null
let rockTexturesPromise: Promise<RockTextureSet> | null = null
let lavaTextureCache: THREE.CanvasTexture | null = null

/** Synchronous access when textures were already built (e.g. after async preload). */
export function getRockTextures(): RockTextureSet {
  if (!rockTexturesCache) {
    rockTexturesCache = createRockTexturesSync()
  }
  return rockTexturesCache
}

export function getLavaTexture(): THREE.CanvasTexture {
  if (!lavaTextureCache) {
    lavaTextureCache = createLavaTextureSync()
  }
  return lavaTextureCache
}

/** Builds rock PBR textures once, yielding to the main thread between heavy steps. */
export function ensureRockTexturesAsync(): Promise<RockTextureSet> {
  if (rockTexturesCache) return Promise.resolve(rockTexturesCache)
  if (!rockTexturesPromise) {
    rockTexturesPromise = createRockTexturesAsync().then((set) => {
      rockTexturesCache = set
      return set
    })
  }
  return rockTexturesPromise
}

/** @deprecated Prefer getRockTextures / ensureRockTexturesAsync */
export function createRockTextures(): RockTextureSet {
  return getRockTextures()
}

/** @deprecated Prefer getLavaTexture */
export function createLavaTexture(): THREE.CanvasTexture {
  return getLavaTexture()
}

function createRockTexturesSync(): RockTextureSet {
  const size = 384
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  paintRockAlbedo(ctx, size)

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(2, 3)

  const roughnessMap = buildRoughnessTexture(size)
  const normalMap = buildNormalTexture(size)

  return { map, roughnessMap, normalMap }
}

async function createRockTexturesAsync(): Promise<RockTextureSet> {
  const size = 384
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  paintRockAlbedo(ctx, size)
  await yieldFrame()

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(2, 3)

  const roughnessMap = await buildRoughnessTextureAsync(size)
  const normalMap = await buildNormalTextureAsync(size)

  return { map, roughnessMap, normalMap }
}

function paintRockAlbedo(ctx: CanvasRenderingContext2D, size: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0, '#5c4033')
  grad.addColorStop(0.35, '#7a5234')
  grad.addColorStop(0.55, '#4a3728')
  grad.addColorStop(0.75, '#6b4f3a')
  grad.addColorStop(1, '#3d2b1f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const g = 40 + Math.random() * 80
    ctx.fillStyle = `rgba(${g + 40}, ${g + 20}, ${g}, ${0.08 + Math.random() * 0.12})`
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }

  for (let band = 0; band < 10; band++) {
    const y = (band / 10) * size + Math.random() * 8
    ctx.strokeStyle = `rgba(30, 20, 15, ${0.15 + Math.random() * 0.2})`
    ctx.lineWidth = 2 + Math.random() * 4
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.05) * 3 + Math.random() * 2)
    }
    ctx.stroke()
  }
}

function buildRoughnessTexture(size: number): THREE.CanvasTexture {
  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = size
  roughCanvas.height = size
  const rctx = roughCanvas.getContext('2d')!
  fillRoughnessPixels(rctx, size)
  const roughnessMap = new THREE.CanvasTexture(roughCanvas)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(2, 3)
  return roughnessMap
}

async function buildRoughnessTextureAsync(size: number): Promise<THREE.CanvasTexture> {
  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = size
  roughCanvas.height = size
  const rctx = roughCanvas.getContext('2d')!
  await fillRoughnessPixelsAsync(rctx, size)
  const roughnessMap = new THREE.CanvasTexture(roughCanvas)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(2, 3)
  return roughnessMap
}

function fillRoughnessPixels(ctx: CanvasRenderingContext2D, size: number): void {
  const img = ctx.createImageData(size, size)
  const data = img.data
  for (let i = 0; i < data.length; i += 4) {
    const v = 180 + Math.random() * 60
    data[i] = data[i + 1] = data[i + 2] = v
    data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

async function fillRoughnessPixelsAsync(
  ctx: CanvasRenderingContext2D,
  size: number,
): Promise<void> {
  const img = ctx.createImageData(size, size)
  const data = img.data
  const rowStride = size * 4
  for (let row = 0; row < size; row++) {
    const rowStart = row * rowStride
    for (let col = 0; col < size; col++) {
      const i = rowStart + col * 4
      const v = 180 + Math.random() * 60
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
    if (row % 48 === 47) await yieldFrame()
  }
  ctx.putImageData(img, 0, 0)
}

function buildNormalTexture(size: number): THREE.CanvasTexture {
  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = size
  normalCanvas.height = size
  const nctx = normalCanvas.getContext('2d')!
  nctx.fillStyle = '#8080ff'
  nctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const nx = 128 + (Math.random() - 0.5) * 40
    const ny = 128 + (Math.random() - 0.5) * 40
    nctx.fillStyle = `rgb(${nx}, ${ny}, 255)`
    nctx.fillRect(x, y, 2, 2)
  }
  const normalMap = new THREE.CanvasTexture(normalCanvas)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(2, 3)
  return normalMap
}

async function buildNormalTextureAsync(size: number): Promise<THREE.CanvasTexture> {
  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = size
  normalCanvas.height = size
  const nctx = normalCanvas.getContext('2d')!
  nctx.fillStyle = '#8080ff'
  nctx.fillRect(0, 0, size, size)
  const chunk = 400
  for (let done = 0; done < 2200; done += chunk) {
    const end = Math.min(2200, done + chunk)
    for (let i = done; i < end; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const nx = 128 + (Math.random() - 0.5) * 40
      const ny = 128 + (Math.random() - 0.5) * 40
      nctx.fillStyle = `rgb(${nx}, ${ny}, 255)`
      nctx.fillRect(x, y, 2, 2)
    }
    await yieldFrame()
  }
  const normalMap = new THREE.CanvasTexture(normalCanvas)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(2, 3)
  return normalMap
}

function createLavaTextureSync(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, '#fff4a3')
  g.addColorStop(0.25, '#ff6b1a')
  g.addColorStop(0.6, '#c41e0a')
  g.addColorStop(1, '#3d0a02')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
