import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeTsunamiState, type TsunamiState } from '../model/tsunamiModel'
import { fbm, mulberry32 } from './noise'
import { ensurePbrLibraryAsync, floodMaterial, getPbrLibrary, pbrMaterial, waterMaterial } from './pbrLibrary'
import { scheduleIdle, yieldFrame } from './initTiming'
import {
  addAtmosphere,
  addOutdoorLighting,
  bindResize,
  createStandardRenderer,
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
  private houseBaseY: number[] = []
  private baseWaterY = 0.15
  private oceanBase: Float32Array | null = null
  private intensity = 0.65
  private timeSec = 0
  private raf = 0

  private constructor(container: HTMLElement) {
    addAtmosphere(this.scene, 'marine')

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 260)
    this.camera.position.set(18, 10, 18)

    this.renderer = createStandardRenderer(container)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(3, 1.1, 0)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04

    addOutdoorLighting(this.scene, 20, 'marine')
    this.unbindResize = bindResize(container, this.camera, this.renderer)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: TsunamiInitStep) => void,
  ): Promise<TsunamiScene> {
    onProgress?.('webgl')
    await yieldFrame()
    const instance = new TsunamiScene(container)
    onProgress?.('terrain')
    await ensurePbrLibraryAsync()
    await yieldFrame()
    onProgress?.('model')
    instance.buildWorld()
    await yieldFrame()
    instance.applyState(computeTsunamiState(0, instance.intensity))
    instance.renderOnce()
    onProgress?.('interactive')
    scheduleIdle(() => onProgress?.('effects'))
    return instance
  }

  private buildWorld() {
    const lib = getPbrLibrary()

    const oceanGeo = new THREE.PlaneGeometry(52, 46, 96, 80)
    oceanGeo.rotateX(-Math.PI / 2)
    this.oceanBase = (oceanGeo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array
    this.water = new THREE.Mesh(oceanGeo, waterMaterial(lib.waterNormal))
    this.water.position.y = this.baseWaterY
    this.scene.add(this.water)

    const bedGeo = new THREE.PlaneGeometry(52, 46, 40, 32)
    bedGeo.rotateX(-Math.PI / 2)
    const bedPos = bedGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < bedPos.count; i++) {
      const x = bedPos.getX(i)
      const z = bedPos.getZ(i)
      const shelf = THREE.MathUtils.smoothstep(x, -4, 10) * 0.55
      bedPos.setY(i, -1.4 + shelf + fbm(x * 0.2, z * 0.2, 9, 3) * 0.18)
    }
    bedGeo.computeVertexNormals()
    const bed = new THREE.Mesh(
      bedGeo,
      pbrMaterial(lib.sand, { repeat: [8, 6], color: 0xc2b090, normalScale: 0.7, roughness: 0.95 }),
    )
    bed.receiveShadow = true
    this.scene.add(bed)

    this.fault = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.55, 10),
      pbrMaterial(lib.crust, {
        repeat: [1, 3],
        color: 0x5a4030,
        emissive: 0xff4422,
        emissiveIntensity: 0.2,
        roughness: 0.9,
        normalScale: 1,
      }),
    )
    this.fault.position.set(-8, -0.15, 0)
    this.scene.add(this.fault)

    const beachGeo = new THREE.PlaneGeometry(12, 22, 36, 28)
    beachGeo.rotateX(-Math.PI / 2)
    const bPos = beachGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < bPos.count; i++) {
      const x = bPos.getX(i)
      const z = bPos.getZ(i)
      const slope = THREE.MathUtils.smoothstep(x, -6, 5) * 0.85
      bPos.setY(i, slope + fbm(x * 0.5, z * 0.5, 14, 3) * 0.08)
    }
    beachGeo.computeVertexNormals()
    const beach = new THREE.Mesh(
      beachGeo,
      pbrMaterial(lib.sand, { repeat: [5, 4], normalScale: 0.8, roughness: 0.92 }),
    )
    beach.position.set(8.5, 0.02, 0)
    beach.receiveShadow = true
    this.scene.add(beach)

    const plateau = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.85, 20),
      pbrMaterial(lib.sand, { repeat: [4, 4], color: 0xe6d2b0, normalScale: 0.7, roughness: 0.9 }),
    )
    plateau.position.set(12.2, 0.42, 0)
    plateau.receiveShadow = true
    plateau.castShadow = true
    this.scene.add(plateau)

    const promenade = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.1, 16),
      pbrMaterial(lib.asphalt, { repeat: [1, 6], normalScale: 0.45, roughness: 0.88 }),
    )
    promenade.position.set(7.2, 0.9, 0)
    promenade.receiveShadow = true
    promenade.castShadow = true
    this.scene.add(promenade)

    const rand = mulberry32(8)
    const wall = pbrMaterial(lib.stucco, { repeat: [2, 2], normalScale: 0.6, roughness: 0.9 })
    const roof = pbrMaterial(lib.roof, { repeat: [2, 2], normalScale: 0.9, roughness: 0.84 })
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group()
      const floors = 1 + (i % 3)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.38 * floors, 0.78),
        wall.clone(),
      )
      body.position.y = (0.38 * floors) / 2
      body.castShadow = true
      body.receiveShadow = true
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.86), roof.clone())
      cap.position.y = 0.38 * floors + 0.05
      cap.castShadow = true
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.12),
        new THREE.MeshPhysicalMaterial({
          color: 0xb7d4e8,
          roughness: 0.05,
          transparent: true,
          opacity: 0.62,
        }),
      )
      glass.position.set(0, 0.22 * floors, 0.4)
      g.add(body, cap, glass)
      const hx = 9.2 + (i % 4) * 1.2
      const hz = -4.2 + Math.floor(i / 4) * 3.4
      const hy = 0.9 + fbm(hx, hz, 3, 2) * 0.04
      g.position.set(hx, hy, hz)
      g.rotation.y = (rand() - 0.5) * 0.2
      this.scene.add(g)
      this.houses.push(g)
      this.houseBaseY.push(hy)
    }

    this.waveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 64),
      new THREE.MeshBasicMaterial({
        color: 0xd7f4ff,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.waveRing.rotation.x = -Math.PI / 2
    this.waveRing.position.y = this.baseWaterY + 0.08
    this.scene.add(this.waveRing)

    this.floodPlane = new THREE.Mesh(new THREE.PlaneGeometry(10, 16, 24, 16), floodMaterial(lib.waterNormal))
    this.floodPlane.rotation.x = -Math.PI / 2
    this.floodPlane.position.set(10.2, 0.6, 0)
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
    const travel = THREE.MathUtils.clamp(s.waveFront_km / 0.14, 0, 1)
    const frontX = -8 + travel * 20
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]!
      const z = base[i * 3 + 2]!
      const dx = x - frontX
      const packet = Math.exp(-(dx * dx) / 5.2)
      const shape = Math.cos(dx * 0.72)
      const along = x + 8
      const shoal = 1 + THREE.MathUtils.smoothstep(along, 2, 15) ** 2 * 2.05
      const landDamp = 1 - THREE.MathUtils.smoothstep(along, 14.5, 19)
      const chop =
        Math.sin(x * 0.82 + s.timeSec * 1.25 + z * 0.15) *
        Math.cos(z * 0.64 - s.timeSec * 0.85) *
        0.035 *
        landDamp
      const h = s.waveHeight_m * 0.16 * shape * packet * shoal * landDamp + chop
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    this.water.geometry.computeVertexNormals()

    const waterMat = this.water.material as THREE.MeshPhysicalMaterial
    if (waterMat.normalMap) {
      waterMat.normalMap.offset.set(s.timeSec * 0.018, s.timeSec * 0.011)
    }
    this.water.position.y = this.baseWaterY + s.inundationDepth_m * 0.04

    const slip = THREE.MathUtils.clamp(s.faultSlip_m, 0, 12)
    this.fault.position.x = -8 + slip * 0.08
    this.fault.rotation.z = slip * 0.015
    ;(this.fault.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + slip * 0.1

    const ringScale = 0.6 + travel * 14 + s.waveHeight_m * 0.15
    this.waveRing.scale.set(ringScale, ringScale, 1)
    this.waveRing.position.x = frontX
    ;(this.waveRing.material as THREE.MeshBasicMaterial).opacity = 0.08 + s.waveHeight_m * 0.03

    const flood = s.inundationDepth_m > 0.35
    this.floodPlane.visible = flood
    this.floodPlane.position.set(11.2, 0.92 + s.inundationDepth_m * 0.09, 0)
    const floodMat = this.floodPlane.material as THREE.MeshPhysicalMaterial
    floodMat.opacity = THREE.MathUtils.clamp(0.22 + s.inundationDepth_m * 0.06, 0.2, 0.62)
    if (floodMat.normalMap) {
      floodMat.normalMap.offset.set(s.timeSec * 0.01, s.timeSec * 0.006)
    }
    const floodPos = this.floodPlane.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < floodPos.count; i++) {
      const x = floodPos.getX(i)
      const y = floodPos.getY(i)
      const rip = Math.sin(x * 1.4 + s.timeSec * 1.6) * Math.cos(y * 1.1 - s.timeSec * 1.2) * 0.04
      floodPos.setZ(i, rip * Math.min(1, s.inundationDepth_m))
    }
    floodPos.needsUpdate = true

    const wet = THREE.MathUtils.clamp(s.inundationDepth_m / 2.4, 0, 1)
    this.houses.forEach((g, i) => {
      const st = s.structures[i]
      const body = g.children[0] as THREE.Mesh
      const mat = body.material as THREE.MeshStandardMaterial
      const severity = st?.severityIndex ?? (wet > 0.85 ? 2 : wet > 0.4 ? 1 : 0)
      g.position.y = this.houseBaseY[i] ?? 0.55
      if (severity >= 3) {
        mat.color.setHex(0x6e675e)
        mat.roughness = 0.96
        mat.metalness = 0.02
        g.scale.y = 0.42
        g.rotation.z = 0.32
      } else if (severity >= 2) {
        mat.color.setRGB(0.62, 0.7, 0.74)
        mat.roughness = 0.22
        mat.metalness = 0.18
        g.scale.y = 0.78
        g.rotation.z = 0.08
      } else if (severity >= 1 || wet > 0.15) {
        const w = Math.max(wet, severity >= 1 ? 0.45 : 0)
        mat.color.setRGB(1 - w * 0.32, 1 - w * 0.24, 1 - w * 0.16)
        mat.roughness = 0.9 - w * 0.68
        mat.metalness = 0.02 + w * 0.2
        g.scale.y = 1
        g.rotation.z = 0
      } else {
        mat.color.setHex(0xffffff)
        mat.roughness = 0.92
        mat.metalness = 0.02
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
