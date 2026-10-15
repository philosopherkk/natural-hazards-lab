import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeTsunamiState, type TsunamiState } from '../model/tsunamiModel'
import { scheduleIdle } from './initTiming'
import {
  addOutdoorLighting,
  bindResize,
  createStandardRenderer,
  runSceneBootstrap,
  type SceneInitStep,
} from './sceneBootstrap'

export type TsunamiInitStep = SceneInitStep

export class TsunamiScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private unbindResize: () => void
  private water!: THREE.Mesh
  private fault!: THREE.Mesh
  private waveRing!: THREE.Mesh
  private floodPlane!: THREE.Mesh
  private houses: THREE.Group[] = []
  private baseWaterY = 0.35
  private oceanBase: Float32Array | null = null
  private clock = new THREE.Clock()
  private intensity = 0.65
  private timeSec = 0
  private raf = 0

  private constructor(container: HTMLElement) {
    this.scene.background = new THREE.Color(0x6a8fad)
    this.scene.fog = new THREE.FogExp2(0x87a4bc, 0.028)

    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 240)
    this.camera.position.set(14, 9, 16)

    this.renderer = createStandardRenderer(container)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(4, 1.2, 0)

    addOutdoorLighting(this.scene, 18)
    this.unbindResize = bindResize(container, this.camera, this.renderer)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: TsunamiInitStep) => void,
  ): Promise<TsunamiScene> {
    const instance = new TsunamiScene(container)
    await runSceneBootstrap(onProgress, () => instance.buildWorld())
    instance.applyState(computeTsunamiState(0, instance.intensity))
    instance.renderOnce()

    scheduleIdle(() => onProgress?.('effects'))
    return instance
  }

  private buildWorld() {
    const oceanGeo = new THREE.PlaneGeometry(48, 48, 72, 72)
    oceanGeo.rotateX(-Math.PI / 2)
    this.oceanBase = (oceanGeo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array
    this.water = new THREE.Mesh(
      oceanGeo,
      new THREE.MeshStandardMaterial({
        color: 0x1a5f8a,
        roughness: 0.25,
        metalness: 0.12,
        transparent: true,
        opacity: 0.92,
      }),
    )
    this.water.position.y = this.baseWaterY
    this.water.receiveShadow = true
    this.scene.add(this.water)

    this.fault = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.35, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0x3d2914,
        emissive: 0xff4422,
        emissiveIntensity: 0.15,
        roughness: 0.95,
      }),
    )
    this.fault.position.set(-8, 0.15, 0)
    this.scene.add(this.fault)

    const coast = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.45, 18),
      new THREE.MeshStandardMaterial({ color: 0xc2a878, roughness: 0.95 }),
    )
    coast.position.set(11, 0.22, 0)
    coast.receiveShadow = true
    this.scene.add(coast)

    const promenade = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x707880, roughness: 0.9 }),
    )
    promenade.position.set(6.2, 0.42, 0)
    this.scene.add(promenade)

    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group()
      const floors = 1 + (i % 3)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.35 * floors, 0.75),
        new THREE.MeshStandardMaterial({ color: 0xd8ccb8, roughness: 0.88 }),
      )
      body.position.y = (0.35 * floors) / 2
      body.castShadow = true
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.08, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.85 }),
      )
      roof.position.y = 0.35 * floors + 0.04
      g.add(body, roof)
      g.position.set(9 + (i % 4) * 1.15, 0.45, -4 + Math.floor(i / 4) * 3.2)
      this.scene.add(g)
      this.houses.push(g)
    }

    this.waveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.65, 48),
      new THREE.MeshBasicMaterial({
        color: 0xaeeeff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    )
    this.waveRing.rotation.x = -Math.PI / 2
    this.waveRing.position.y = this.baseWaterY + 0.05
    this.scene.add(this.waveRing)

    this.floodPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 16),
      new THREE.MeshStandardMaterial({
        color: 0x2a6a9a,
        transparent: true,
        opacity: 0.55,
        roughness: 0.2,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    )
    this.floodPlane.rotation.x = -Math.PI / 2
    this.floodPlane.position.set(10, 0.5, 0)
    this.floodPlane.visible = false
    this.scene.add(this.floodPlane)
  }

  setTime(t: number) {
    this.timeSec = t
    this.applyState(computeTsunamiState(t, this.intensity))
  }

  setIntensity(v: number) {
    this.intensity = THREE.MathUtils.clamp(v, 0, 1)
    this.applyState(computeTsunamiState(this.timeSec, this.intensity))
  }

  getState(): TsunamiState {
    return computeTsunamiState(this.timeSec, this.intensity)
  }

  private applyState(s: TsunamiState) {
    const pos = this.water.geometry.attributes.position as THREE.BufferAttribute
    const base = this.oceanBase!
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]!
      const z = base[i * 3 + 2]!
      const dist = Math.hypot(x + 8, z)
      const waveFront = s.timeSec * 3.2 - dist * 0.35
      const swell = Math.sin(waveFront) * Math.exp(-dist * 0.045)
      const h = s.waveHeight_m * 0.09 * swell
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    this.water.geometry.computeVertexNormals()

    this.water.position.y = this.baseWaterY + s.inundationDepth_m * 0.055

    const slip = THREE.MathUtils.clamp(s.faultSlip_m, 0, 12)
    this.fault.position.x = -8 + slip * 0.12
    this.fault.rotation.z = slip * 0.02
    ;(this.fault.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + slip * 0.08

    const ringScale = 0.5 + s.waveHeight_m * 0.25 + s.timeSec * 0.35
    this.waveRing.scale.set(ringScale, ringScale, ringScale)
    ;(this.waveRing.material as THREE.MeshBasicMaterial).opacity = 0.12 + s.waveHeight_m * 0.04

    const flood = s.inundationDepth_m > 0.4
    this.floodPlane.visible = flood
    this.floodPlane.position.y = 0.42 + s.inundationDepth_m * 0.07
    ;(this.floodPlane.material as THREE.MeshStandardMaterial).opacity = 0.25 + s.inundationDepth_m * 0.05

    s.structures.forEach((st, i) => {
      const g = this.houses[i]
      if (!g) return
      const body = g.children[0] as THREE.Mesh
      const mat = body.material as THREE.MeshStandardMaterial
      if (st.severityIndex >= 3) {
        mat.color.setHex(0x444444)
        g.scale.y = 0.4
        g.rotation.z = 0.28
      } else if (st.severityIndex >= 2) {
        mat.color.setHex(0x8899aa)
        g.scale.y = 0.75
      } else if (st.severityIndex >= 1) {
        mat.color.setHex(0xb8a890)
      } else {
        mat.color.setHex(0xd8ccb8)
        g.scale.y = 1
        g.rotation.z = 0
      }
    })
  }

  private renderOnce() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.clock.getDelta()
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
