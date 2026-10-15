import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeEarthquakeState, type EarthquakeState } from '../model/earthquakeModel'
import { buildVillage, applyHouseSeverity } from './villageBuilder'
import { scheduleIdle } from './initTiming'
import {
  addOutdoorLighting,
  bindResize,
  createStandardRenderer,
  runSceneBootstrap,
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
  private faultCut!: THREE.Mesh
  private faultGlow!: THREE.Mesh
  private pRings: THREE.Mesh[] = []
  private sRings: THREE.Mesh[] = []
  private crack!: THREE.Mesh
  private cityRoot = new THREE.Group()
  private village = buildVillage()
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.2)
  private intensity = 0.65
  private timeSec = 0
  private raf = 0

  private constructor(container: HTMLElement) {
    this.scene.background = new THREE.Color(0x7a8f9e)
    this.scene.fog = new THREE.FogExp2(0x8fa3b0, 0.035)

    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 200)
    this.camera.position.set(11, 7, 11)

    this.renderer = createStandardRenderer(container)
    this.renderer.localClippingEnabled = true
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 1.8, 2)

    addOutdoorLighting(this.scene, 14)
    this.unbindResize = bindResize(container, this.camera, this.renderer)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: EarthquakeInitStep) => void,
  ): Promise<EarthquakeScene> {
    const instance = new EarthquakeScene(container)
    await runSceneBootstrap(onProgress, () => instance.buildWorld())
    instance.applyState(computeEarthquakeState(0, instance.intensity))
    instance.renderOnce()

    scheduleIdle(() => onProgress?.('effects'))
    return instance
  }

  private buildWorld() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.faultCut = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.2, 8),
      new THREE.MeshStandardMaterial({
        color: 0x5c4033,
        roughness: 0.92,
        clippingPlanes: [this.clipPlane],
        clipShadows: true,
      }),
    )
    this.faultCut.position.set(0, 0.55, -1)
    this.scene.add(this.faultCut)

    this.faultGlow = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.25, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0xff5533,
        emissive: 0xff2200,
        emissiveIntensity: 0.35,
        roughness: 0.6,
      }),
    )
    this.faultGlow.position.set(0, 0.35, 0)
    this.scene.add(this.faultGlow)

    const ringMat = (color: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })

    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 40), ringMat(0x88ccff))
      p.rotation.x = -Math.PI / 2
      p.position.y = 0.04 + i * 0.01
      this.pRings.push(p)
      this.scene.add(p)

      const s = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 40), ringMat(0xffd166))
      s.rotation.x = -Math.PI / 2
      s.position.y = 0.05 + i * 0.01
      this.sRings.push(s)
      this.scene.add(s)
    }

    this.crack = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1, side: THREE.DoubleSide }),
    )
    this.crack.rotation.x = -Math.PI / 2
    this.crack.position.y = 0.03
    this.scene.add(this.crack)

    this.village.group.scale.setScalar(0.85)
    this.village.group.position.set(-1, 0, 1.5)
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
    this.faultGlow.position.x = s.faultSlip_m * 0.18
    this.faultCut.position.x = s.faultSlip_m * 0.08
    const glowMat = this.faultGlow.material as THREE.MeshStandardMaterial
    glowMat.emissiveIntensity = 0.2 + s.shaking * 1.1

    const pScale = Math.max(0.01, s.pWaveRadius_km * 0.32)
    this.pRings.forEach((ring, i) => {
      const scale = pScale * (1 + i * 0.12)
      ring.scale.set(scale, scale, scale)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.1 + s.shaking * 0.25 - i * 0.04
    })

    const sScale = Math.max(0.01, s.sWaveRadius_km * 0.32)
    this.sRings.forEach((ring, i) => {
      const scale = sScale * (1 + i * 0.15)
      ring.scale.set(scale, scale, scale)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.08 + s.shaking * 0.3 - i * 0.05
    })

    const shake = s.shaking * 0.12
    this.cityRoot.position.x = Math.sin(s.timeSec * 24) * shake
    this.cityRoot.position.z = Math.cos(s.timeSec * 21) * shake
    this.camera.position.x = 11 + Math.sin(s.timeSec * 18) * shake * 0.35
    this.camera.position.z = 11 + Math.cos(s.timeSec * 16) * shake * 0.35

    this.crack.scale.x = 0.3 + s.faultSlip_m * 0.15
    const crackMat = this.crack.material as THREE.MeshStandardMaterial
    crackMat.transparent = true
    crackMat.opacity = THREE.MathUtils.clamp(s.shaking, 0.2, 1)

    s.buildings.forEach((b, i) => {
      const house = this.village.houses[i]
      if (!house) return
      const sev = SEVERITY_MAP[THREE.MathUtils.clamp(b.severityIndex, 0, 5)] ?? 'intact'
      applyHouseSeverity(house, sev, (b.severityIndex % 5) / 5)
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
