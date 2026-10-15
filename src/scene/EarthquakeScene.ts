import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeEarthquakeState, type EarthquakeState } from '../model/earthquakeModel'
import { buildVillage, applyHouseSeverity } from './villageBuilder'
import { fbm } from './noise'
import { ensurePbrLibraryAsync, getPbrLibrary, pbrMaterial } from './pbrLibrary'
import { scheduleIdle, yieldFrame } from './initTiming'
import {
  addAtmosphere,
  addOutdoorLighting,
  bindResize,
  createStandardRenderer,
  type SceneInitStep,
} from './sceneBootstrap'

export type EarthquakeInitStep = SceneInitStep

const SEVERITY_MAP = ['intact', 'ash', 'blast', 'fire', 'collapse', 'buried'] as const

export class EarthquakeScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private unbindResize: () => void
  private strata: THREE.Mesh[] = []
  private faultGlow!: THREE.Mesh
  private pRings: THREE.Mesh[] = []
  private sRings: THREE.Mesh[] = []
  private crack!: THREE.Mesh
  private ground!: THREE.Mesh
  private groundBase!: Float32Array
  private cityRoot = new THREE.Group()
  private village!: ReturnType<typeof buildVillage>
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), -1.2)
  private intensity = 0.65
  private timeSec = 0
  private raf = 0

  private constructor(container: HTMLElement) {
    addAtmosphere(this.scene, 'seismic')

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220)
    this.camera.position.set(12, 7.5, 13)

    this.renderer = createStandardRenderer(container)
    this.renderer.localClippingEnabled = true
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(1, 1.4, 1)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04

    addOutdoorLighting(this.scene, 16, 'seismic')
    this.unbindResize = bindResize(container, this.camera, this.renderer)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: EarthquakeInitStep) => void,
  ): Promise<EarthquakeScene> {
    onProgress?.('webgl')
    await yieldFrame()
    const instance = new EarthquakeScene(container)
    onProgress?.('terrain')
    await ensurePbrLibraryAsync()
    await yieldFrame()
    onProgress?.('model')
    instance.buildWorld()
    await yieldFrame()
    instance.applyState(computeEarthquakeState(0, instance.intensity))
    instance.renderOnce()
    onProgress?.('interactive')
    scheduleIdle(() => onProgress?.('effects'))
    return instance
  }

  private buildWorld() {
    const lib = getPbrLibrary()

    const groundGeo = new THREE.PlaneGeometry(36, 36, 90, 90)
    groundGeo.rotateX(-Math.PI / 2)
    const gPos = groundGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i)
      const z = gPos.getZ(i)
      const micro = (fbm(x * 0.35, z * 0.35, 9, 3) - 0.5) * 0.16
      gPos.setY(i, micro)
    }
    groundGeo.computeVertexNormals()
    this.groundBase = (gPos.array as Float32Array).slice()
    this.ground = new THREE.Mesh(
      groundGeo,
      pbrMaterial(lib.soil, { repeat: [7, 7], color: 0xc4b49a, normalScale: 0.9, roughness: 0.94 }),
    )
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    const strataSpec = [
      { h: 0.28, y: -0.85, tint: 0x5c463c, set: lib.crust, repeat: [1.2, 1] as [number, number] },
      { h: 0.26, y: -0.56, tint: 0x7a5a4c, set: lib.rock, repeat: [1.4, 1] as [number, number] },
      { h: 0.24, y: -0.3, tint: 0x9a7460, set: lib.rock, repeat: [1.6, 1] as [number, number] },
      { h: 0.22, y: -0.06, tint: 0xc4a27a, set: lib.sand, repeat: [1.8, 1] as [number, number] },
      { h: 0.2, y: 0.16, tint: 0xd8c6a4, set: lib.soil, repeat: [2, 1] as [number, number] },
    ]
    for (const spec of strataSpec) {
      const mat = pbrMaterial(spec.set, {
        repeat: spec.repeat,
        color: spec.tint,
        normalScale: 0.85,
        roughness: 0.94,
        side: THREE.DoubleSide,
      })
      mat.clippingPlanes = [this.clipPlane]
      mat.clipShadows = true
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(14, spec.h, 6.5), mat)
      mesh.position.set(0, spec.y, -2.4)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.scene.add(mesh)
      this.strata.push(mesh)
    }

    this.faultGlow = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.08, 0.22),
      pbrMaterial(lib.crust, {
        repeat: [4, 1],
        color: 0xff5533,
        emissive: 0xff2200,
        emissiveIntensity: 0.45,
        roughness: 0.55,
        normalScale: 0.8,
      }),
    )
    this.faultGlow.position.set(0, 0.08, -0.4)
    this.scene.add(this.faultGlow)

    const ringMat = (color: number) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })

    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.52, 48), ringMat(0x9fd0ea))
      p.rotation.x = -Math.PI / 2
      p.position.y = 0.05 + i * 0.012
      this.pRings.push(p)
      this.scene.add(p)

      const s = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.52, 48), ringMat(0xe7c27a))
      s.rotation.x = -Math.PI / 2
      s.position.y = 0.06 + i * 0.012
      this.sRings.push(s)
      this.scene.add(s)
    }

    const crackGeo = new THREE.PlaneGeometry(14, 0.35, 40, 3)
    const cPos = crackGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i)
      cPos.setY(i, (fbm(x * 0.4, i * 0.2, 4, 2) - 0.5) * 0.12)
    }
    this.crack = new THREE.Mesh(
      crackGeo,
      new THREE.MeshStandardMaterial({
        map: lib.crack,
        color: 0x1a1614,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.crack.rotation.x = -Math.PI / 2
    this.crack.position.y = 0.04
    this.scene.add(this.crack)

    this.village = buildVillage()
    this.village.group.scale.setScalar(0.85)
    this.village.group.position.set(-1, 0, 2.2)
    this.cityRoot.add(this.village.group)
    this.scene.add(this.cityRoot)
  }

  setTime(t: number) {
    this.timeSec = t
    this.applyState(computeEarthquakeState(t, this.intensity))
  }

  setIntensity(v: number) {
    this.intensity = THREE.MathUtils.clamp(v, 0, 1)
    this.applyState(computeEarthquakeState(this.timeSec, this.intensity))
  }

  getState(): EarthquakeState {
    return computeEarthquakeState(this.timeSec, this.intensity)
  }

  private applyState(s: EarthquakeState) {
    const slip = s.faultSlip_m
    this.faultGlow.position.x = slip * 0.16
    const glowMat = this.faultGlow.material as THREE.MeshStandardMaterial
    glowMat.emissiveIntensity = 0.25 + s.shaking * 1.15

    this.strata.forEach((mesh, i) => {
      mesh.position.x = (i - 2) * slip * 0.055
    })

    const pos = this.ground.geometry.attributes.position as THREE.BufferAttribute
    const base = this.groundBase
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]!
      const y0 = base[i * 3 + 1]!
      const z = base[i * 3 + 2]!
      const band = Math.exp(-z * z * 5.5)
      const scarp = (z >= 0 ? 0.28 : -0.1) * slip * 0.04 * Math.exp(-z * z * 14)
      const crackDrop = -slip * 0.025 * Math.exp(-Math.abs(z) * 3.2)
      const jitter =
        Math.sin(x * 2.7 + s.timeSec * 19) * s.shaking * 0.02 * (1 - Math.min(1, Math.abs(z) / 5))
      pos.setXYZ(i, x + Math.sign(z || 1) * slip * 0.012 * band, y0 + scarp + crackDrop + jitter, z)
    }
    pos.needsUpdate = true
    this.ground.geometry.computeVertexNormals()

    const pScale = Math.max(0.01, s.pWaveRadius_km * 0.32)
    this.pRings.forEach((ring, i) => {
      const scale = pScale * (1 + i * 0.12)
      ring.scale.set(scale, scale, scale)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.08 + s.shaking * 0.22 - i * 0.04)
    })

    const sScale = Math.max(0.01, s.sWaveRadius_km * 0.32)
    this.sRings.forEach((ring, i) => {
      const scale = sScale * (1 + i * 0.15)
      ring.scale.set(scale, scale, scale)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.07 + s.shaking * 0.26 - i * 0.05)
    })

    const shake = s.shaking * 0.1
    this.cityRoot.position.x = Math.sin(s.timeSec * 24) * shake
    this.cityRoot.position.z = Math.cos(s.timeSec * 21) * shake
    this.camera.position.x = 12 + Math.sin(s.timeSec * 18) * shake * 0.35
    this.camera.position.z = 13 + Math.cos(s.timeSec * 16) * shake * 0.35

    this.crack.scale.x = 0.35 + slip * 0.16
    this.crack.position.y = 0.05 + slip * 0.01
    const crackMat = this.crack.material as THREE.MeshStandardMaterial
    crackMat.opacity = THREE.MathUtils.clamp(0.25 + slip * 0.12 + s.shaking * 0.4, 0.2, 1)

    s.buildings.forEach((b, i) => {
      const house = this.village.houses[i]
      if (!house) return
      const sev = SEVERITY_MAP[THREE.MathUtils.clamp(b.severityIndex, 0, 5)] ?? 'intact'
      applyHouseSeverity(house, sev, (b.severityIndex % 5) / 5)
      house.root.rotation.z = Math.sin(s.timeSec * 27 + i * 1.3) * s.shaking * 0.08
      house.root.rotation.x = Math.sin(s.timeSec * 23 + i * 0.7) * s.shaking * 0.05
      house.root.position.y += Math.sin(s.timeSec * 31 + i) * s.shaking * 0.035
    })
  }

  private renderOnce() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.unbindResize()
    this.renderer.dispose()
  }
}
