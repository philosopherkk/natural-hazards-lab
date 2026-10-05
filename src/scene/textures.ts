import * as THREE from 'three'

/** Procedural rocky albedo + roughness for PBR strata. */
export function createRockTextures(): {
  map: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
} {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0, '#5c4033')
  grad.addColorStop(0.35, '#7a5234')
  grad.addColorStop(0.55, '#4a3728')
  grad.addColorStop(0.75, '#6b4f3a')
  grad.addColorStop(1, '#3d2b1f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const g = 40 + Math.random() * 80
    ctx.fillStyle = `rgba(${g + 40}, ${g + 20}, ${g}, ${0.08 + Math.random() * 0.12})`
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }

  for (let band = 0; band < 12; band++) {
    const y = (band / 12) * size + Math.random() * 8
    ctx.strokeStyle = `rgba(30, 20, 15, ${0.15 + Math.random() * 0.2})`
    ctx.lineWidth = 2 + Math.random() * 4
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.05) * 3 + Math.random() * 2)
    }
    ctx.stroke()
  }

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(2, 3)

  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = size
  roughCanvas.height = size
  const rctx = roughCanvas.getContext('2d')!
  const img = rctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 180 + Math.random() * 60
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  rctx.putImageData(img, 0, 0)
  const roughnessMap = new THREE.CanvasTexture(roughCanvas)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(2, 3)

  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = size
  normalCanvas.height = size
  const nctx = normalCanvas.getContext('2d')!
  nctx.fillStyle = '#8080ff'
  nctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 6000; i++) {
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

  return { map, roughnessMap, normalMap }
}

export function createLavaTexture(): THREE.CanvasTexture {
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
