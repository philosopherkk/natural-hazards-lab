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
  renderer.toneMappingExposure = 1.08
  container.appendChild(renderer.domElement)
  return renderer
}

export type AtmospherePreset = 'volcano' | 'alpine' | 'marine' | 'seismic'

const ATMOSPHERE: Record<
  AtmospherePreset,
  { zenith: number; horizon: number; fog: number; density: number; hemiSky: number; hemiGround: number; sun: number; sunIntensity: number }
> = {
  volcano: {
    zenith: 0x6a5348,
    horizon: 0xc4a090,
    fog: 0xc4a090,
    density: 0.018,
    hemiSky: 0xffc8a4,
    hemiGround: 0x3a2a22,
    sun: 0xffe2c4,
    sunIntensity: 1.7,
  },
  alpine: {
    zenith: 0x3d6eab,
    horizon: 0xd5e4f2,
    fog: 0xd5e4f2,
    density: 0.014,
    hemiSky: 0xd6e8ff,
    hemiGround: 0x6a7a88,
    sun: 0xfff6ea,
    sunIntensity: 1.65,
  },
  marine: {
    zenith: 0x2f6794,
    horizon: 0xc5d7e4,
    fog: 0xb7c9d6,
    density: 0.012,
    hemiSky: 0xc5ddf5,
    hemiGround: 0x3d4e3a,
    sun: 0xfff4e0,
    sunIntensity: 1.75,
  },
  seismic: {
    zenith: 0x6d7c88,
    horizon: 0xc3b8a8,
    fog: 0xc3b8a8,
    density: 0.016,
    hemiSky: 0xe4d7c4,
    hemiGround: 0x4a4036,
    sun: 0xfff0dc,
    sunIntensity: 1.55,
  },
}

export function addAtmosphere(scene: THREE.Scene, preset: AtmospherePreset): void {
  const p = ATMOSPHERE[preset]
  scene.background = new THREE.Color(p.horizon)
  scene.fog = new THREE.FogExp2(p.fog, p.density)

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        zenith: { value: new THREE.Color(p.zenith) },
        horizon: { value: new THREE.Color(p.horizon) },
        sunDir: { value: new THREE.Vector3(0.45, 0.78, 0.38).normalize() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 zenith;
        uniform vec3 horizon;
        uniform vec3 sunDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = smoothstep(-0.02, 0.55, d.y);
          vec3 col = mix(horizon, zenith, h);
          float sun = pow(max(dot(d, sunDir), 0.0), 36.0);
          col += vec3(1.0, 0.86, 0.68) * sun * 0.65;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  )
  sky.frustumCulled = false
  sky.renderOrder = -1
  scene.add(sky)
}

export function addOutdoorLighting(
  scene: THREE.Scene,
  shadowBounds = 14,
  preset: AtmospherePreset = 'alpine',
): THREE.DirectionalLight {
  const p = ATMOSPHERE[preset]
  const hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, 0.46)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(p.sun, p.sunIntensity)
  sun.position.set(8, 14, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 60
  const b = shadowBounds
  sun.shadow.camera.left = -b
  sun.shadow.camera.right = b
  sun.shadow.camera.top = b
  sun.shadow.camera.bottom = -b
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.025
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0xb9cbe0, 0.22)
  fill.position.set(-7, 5, -8)
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
