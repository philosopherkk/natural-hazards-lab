import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  computeEarthquakeState,
  DEFAULT_EARTHQUAKE_CONDITIONS,
  type EarthquakeConditions,
  type EarthquakeState,
} from '../model/earthquakeModel'
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
  private crackBranches: THREE.Mesh[] = []
  private roads: THREE.Mesh[] = []
  private readonly faultZ = 2
  private ground!: THREE.Mesh
  private groundBase!: Float32Array
  private cityRoot = new THREE.Group()
  private village!: ReturnType<typeof buildVillage>
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), -1.2)
  private intensity = 0.65
  private conditions: EarthquakeConditions = { ...DEFAULT_EARTHQUAKE_CONDITIONS }
  private timeSec = 0
  private raf = 0

  private constructor(container: HTMLElement) {
    addAtmosphere(this.scene, 'seismic')

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220)
    this.camera.position.set(11, 6.8, 12)

    this.renderer = createStandardRenderer(container)
    this.renderer.localClippingEnabled = true
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0.2, 0.6, 2)
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
    instance.applyState(computeEarthquakeState(0, instance.intensity, instance.conditions))
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
        opacity: 0.14,
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

    const crackGeo = new THREE.PlaneGeometry(16, 0.9, 48, 4)
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
    this.crack.position.set(0, 0.05, this.faultZ)
    this.scene.add(this.crack)
    for (const x of [-2.1, 2.2]) {
      const branch = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 6, 2, 20),
        (this.crack.material as THREE.Material).clone(),
      )
      branch.rotation.x = -Math.PI / 2
      branch.position.set(x, 0.05, this.faultZ)
      this.scene.add(branch)
      this.crackBranches.push(branch)
    }

    const roadMat = pbrMaterial(lib.asphalt, { repeat: [6, 1], normalScale: 0.35, roughness: 0.9 })
    for (const z of [0.7, 2, 3.4]) {
      const geo = new THREE.PlaneGeometry(12, 0.48, 36, 2)
      geo.rotateX(-Math.PI / 2)
      const road = new THREE.Mesh(geo, roadMat)
      road.position.set(0, 0.03, z)
      road.receiveShadow = true
      this.scene.add(road)
      this.roads.push(road)
    }
    for (const x of [-3.2, -1.1, 1.1, 3.3]) {
      const geo = new THREE.PlaneGeometry(0.42, 5.2, 2, 24)
      geo.rotateX(-Math.PI / 2)
      const road = new THREE.Mesh(geo, roadMat)
      road.position.set(x, 0.03, 2.05)
      road.receiveShadow = true
      this.scene.add(road)
      this.roads.push(road)
    }

    this.village = buildVillage()
    this.village.group.position.set(0, 0, 0)
    const spots: [number, number][] = [
      [-3.2, 0.7],
      [-1.1, 0.7],
      [1.1, 0.7],
      [3.3, 0.7],
      [-3.2, 3.4],
      [-1.1, 3.4],
      [1.1, 3.4],
      [3.3, 3.4],
    ]
    this.village.houses.forEach((house, i) => {
      const spot = spots[i]
      if (!spot) return
      house.root.position.set(spot[0], 0.02, spot[1])
      house.root.userData.baseX = spot[0]
      house.root.userData.baseZ = spot[1]
    })
    this.cityRoot.add(this.village.group)
    this.scene.add(this.cityRoot)
  }

  private scarpAt(z: number, slip: number, shaking: number, timeSec: number, x: number): number {
    const dz = z - this.faultZ
    const step = Math.tanh(dz * 4.2) * slip * 0.22
    const drop = -slip * 0.08 * Math.exp(-dz * dz * 10)
    const jitter = Math.sin(x * 2.4 + timeSec * 19) * shaking * 0.03 * Math.exp(-dz * dz * 1.5)
    return step + drop + jitter
  }

  setTime(t: number) {
    this.timeSec = t
    this.applyState(computeEarthquakeState(t, this.intensity, this.conditions))
  }

  setIntensity(v: number) {
    this.intensity = THREE.MathUtils.clamp(v, 0, 1)
    this.applyState(computeEarthquakeState(this.timeSec, this.intensity, this.conditions))
  }

  setConditions(conditions: EarthquakeConditions) {
    this.conditions = { ...conditions }
    this.applyState(computeEarthquakeState(this.timeSec, this.intensity, this.conditions))
  }

  getState(): EarthquakeState {
    return computeEarthquakeState(this.timeSec, this.intensity, this.conditions)
  }

  private applyState(s: EarthquakeState) {
    const slip = Math.tanh(s.faultSlip_m / 5) * 5
    this.faultGlow.position.set(slip * 0.12, 0.06 + slip * 0.04, this.faultZ)
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
      const dz = z - this.faultZ
      const shear = Math.sign(dz || 1) * slip * 0.02 * Math.exp(-dz * dz * 4)
      pos.setXYZ(i, x + shear, y0 + this.scarpAt(z, slip, s.shaking, s.timeSec, x), z)
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

    const shake = Math.min(0.62, s.shaking * (0.02 + s.peakGroundAccel_m_s2 * 0.1))
    const zFar = THREE.MathUtils.clamp((s.distanceKm - 8) * 0.05, -0.7, 3.4)
    this.cityRoot.position.x = Math.sin(s.timeSec * 24) * shake
    this.cityRoot.position.z = zFar + Math.cos(s.timeSec * 21) * shake
    this.camera.position.x = 12 + Math.sin(s.timeSec * 18) * shake * 0.35
    this.camera.position.z = 13 + Math.cos(s.timeSec * 16) * shake * 0.35

    this.crack.scale.set(0.45 + slip * 0.12, 0.7 + slip * 0.22, 1)
    this.crack.position.y = 0.06 + slip * 0.03
    this.crack.position.z = this.faultZ
    const crackMat = this.crack.material as THREE.MeshStandardMaterial
    crackMat.opacity = THREE.MathUtils.clamp(0.35 + slip * 0.1 + s.shaking * 0.35, 0.25, 1)
    this.crackBranches.forEach((branch) => {
      branch.scale.y = 0.4 + slip * 0.18
      branch.position.y = this.crack.position.y
      ;(branch.material as THREE.MeshStandardMaterial).opacity = crackMat.opacity * 0.85
    })
    this.roads.forEach((road) => {
      const attr = road.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < attr.count; i++) {
        const x = attr.getX(i) + road.position.x
        const z = attr.getZ(i) + road.position.z
        attr.setY(i, 0.04 + this.scarpAt(z, slip, s.shaking, s.timeSec, x))
      }
      attr.needsUpdate = true
    })

    s.buildings.forEach((b, i) => {
      const house = this.village.houses[i]
      if (!house) return
      const sev =
        b.severityIndex >= 3 ? 'buried' : b.severityIndex === 2 ? 'collapse' : b.severityIndex === 1 ? 'blast' : 'intact'
      applyHouseSeverity(house, sev, b.severityIndex >= 2 ? 0.85 : 0.4)
      const lean = b.severityIndex * 0.16
      house.root.rotation.z = Math.sin(s.timeSec * 27 + i * 1.3) * s.shaking * 0.1 + lean
      house.root.rotation.x = Math.sin(s.timeSec * 23 + i * 0.7) * s.shaking * 0.06 + lean * 0.35
      const baseX = (house.root.userData.baseX as number) ?? house.root.position.x
      const baseZ = (house.root.userData.baseZ as number) ?? house.root.position.z
      const dz = baseZ - this.faultZ
      house.root.position.x = baseX + Math.sign(dz || 1) * slip * 0.04
      house.root.position.z = baseZ
      house.root.position.y += this.scarpAt(baseZ, slip, 0, s.timeSec, baseX)
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
