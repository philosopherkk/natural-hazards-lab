import * as THREE from 'three'
import { yieldFrame } from './initTiming'

export type SceneInitStep = 'webgl' | 'terrain' | 'model' | 'interactive' | 'effects'

export class WebGLUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebGLUnavailableError'
  }
}

export function probeWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false })
    return gl != null
  } catch {
    return false
  }
}

export function showWebGLFault(container: HTMLElement, message: string): void {
  const panel = document.createElement('div')
  panel.className = 'webgl-fault'
  panel.setAttribute('role', 'alert')
  panel.innerHTML = `
    <p class="webgl-fault-title">WebGL unavailable</p>
    <p class="webgl-fault-body">${message}</p>
    <p class="webgl-fault-hint">Try another browser, enable hardware acceleration, or update graphics drivers.</p>
  `
  container.appendChild(panel)
}

export function createStandardRenderer(container: HTMLElement): THREE.WebGLRenderer {
  if (!probeWebGL()) {
    showWebGLFault(
      container,
      'This lab needs WebGL to render the 3D timeline. Your browser could not create a WebGL context.',
    )
    throw new WebGLUnavailableError('WebGL context unavailable')
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.appendChild(renderer.domElement)
  return renderer
}

export function addOutdoorLighting(scene: THREE.Scene, shadowBounds = 14): THREE.DirectionalLight {
  const hemi = new THREE.HemisphereLight(0xddeeff, 0x3d4a2a, 0.55)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.25)
  sun.position.set(8, 14, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 48
  const b = shadowBounds
  sun.shadow.camera.left = -b
  sun.shadow.camera.right = b
  sun.shadow.camera.top = b
  sun.shadow.camera.bottom = -b
  sun.shadow.bias = -0.00035
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0xaaccff, 0.32)
  fill.position.set(-6, 5, -8)
  scene.add(fill)

  return sun
}

export async function runSceneBootstrap(
  onProgress: ((step: SceneInitStep) => void) | undefined,
  build: () => void,
): Promise<void> {
  onProgress?.('webgl')
  await yieldFrame()
  onProgress?.('terrain')
  await yieldFrame()
  build()
  onProgress?.('model')
  await yieldFrame()
  onProgress?.('interactive')
}

export function bindResize(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  extra?: (w: number, h: number) => void,
): () => void {
  const apply = () => {
    const w = Math.max(container.clientWidth, 1)
    const h = Math.max(container.clientHeight, 1)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    extra?.(w, h)
  }
  apply()
  window.addEventListener('resize', apply)
  return () => window.removeEventListener('resize', apply)
}
