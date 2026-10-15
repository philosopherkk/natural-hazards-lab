import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeTsunamiState, type TsunamiState } from '../model/tsunamiModel'
import { fbm, mulberry32 } from './noise'

function coastHeight(x: number, z: number): number {
  const beach = THREE.MathUtils.smoothstep(x, 4.5, 8.5) * 0.42
  const dune = Math.exp(-((x - 8.2) ** 2) / 5.5) * (0.32 + 0.14 * Math.sin(z * 0.42))
  const town = THREE.MathUtils.smoothstep(x, 9, 12.5) * 0.38
  const n = (fbm(x * 0.32, z * 0.32, 14, 3) - 0.5) * 0.18
  return Math.max(0, beach + dune + town + n)
}
import { ensurePbrLibraryAsync, getPbrLibrary, pbrMaterial } from './pbrLibrary'
import { contactDisc, createBoreMaterial, createSeaMaterial } from './surfaceShaders'
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
  private bore!: THREE.Mesh
  private readonly boreZ = 32
  private readonly boreP = 12
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
    this.camera.position.set(8, 3.4, 14)

    this.renderer = createStandardRenderer(container)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(6, 0.7, 0)
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
    this.water = new THREE.Mesh(oceanGeo, createSeaMaterial(0.9))
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

    const coastGeo = new THREE.PlaneGeometry(18, 26, 48, 40)
    coastGeo.rotateX(-Math.PI / 2)
    const cPos = coastGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i) + 11
      const z = cPos.getZ(i)
      cPos.setY(i, coastHeight(x, z))
    }
    coastGeo.computeVertexNormals()
    const coast = new THREE.Mesh(
      coastGeo,
      pbrMaterial(lib.sand, { repeat: [6, 5], color: 0xe4d0a8, normalScale: 0.85, roughness: 0.9 }),
    )
    coast.position.set(11, 0, 0)
    coast.receiveShadow = true
    this.scene.add(coast)

    const roadGeo = new THREE.PlaneGeometry(0.7, 18, 1, 24)
    roadGeo.rotateX(-Math.PI / 2)
    const rPos = roadGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < rPos.count; i++) {
      const z = rPos.getZ(i)
      rPos.setY(i, coastHeight(9.2, z) + 0.03)
    }
    const road = new THREE.Mesh(
      roadGeo,
      pbrMaterial(lib.asphalt, { repeat: [1, 8], normalScale: 0.4, roughness: 0.88 }),
    )
    road.position.set(9.2, 0, 0)
    road.receiveShadow = true
    this.scene.add(road)

    const rand = mulberry32(8)
    const wall = pbrMaterial(lib.stucco, { repeat: [2, 2], normalScale: 0.6, roughness: 0.9 })
    const roofMat = pbrMaterial(lib.roof, { repeat: [2, 2], normalScale: 0.9, roughness: 0.84 })
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group()
      const floors = 1 + (i % 3)
      const w = 0.85 + (i % 2) * 0.25
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42 * floors, 0.75), wall.clone())
      body.position.y = (0.42 * floors) / 2
      body.castShadow = true
      body.receiveShadow = true
      const pitch = roofMat.clone()
      const left = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.07, 0.9), pitch)
      left.position.set(-w * 0.22, 0.42 * floors + 0.16, 0)
      left.rotation.z = 0.48
      left.castShadow = true
      const right = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.07, 0.9), pitch)
      right.position.set(w * 0.22, 0.42 * floors + 0.16, 0)
      right.rotation.z = -0.48
      right.castShadow = true
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.16),
        new THREE.MeshStandardMaterial({
          color: 0xffe2b8,
          emissive: 0xffaa55,
          emissiveIntensity: 0.9,
          roughness: 0.12,
          metalness: 0.02,
        }),
      )
      glass.position.set(0, 0.28 * floors, 0.39)
      g.add(body, left, right, glass, contactDisc(0.7))
      const col = i % 5
      const row = Math.floor(i / 5)
      const hx = 10.4 + row * 1.7
      const hz = -6.2 + col * 2.5
      const hy = coastHeight(hx, hz)
      g.position.set(hx, hy, hz)
      g.rotation.y = (rand() - 0.5) * 0.25
      this.scene.add(g)
      this.houses.push(g)
      this.houseBaseY.push(hy)
    }

    this.bore = this.buildBore(lib.waterNormal)

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

    this.floodPlane = new THREE.Mesh(new THREE.PlaneGeometry(8, 16, 20, 18), createSeaMaterial(0.55))
    this.floodPlane.rotation.x = -Math.PI / 2
    this.floodPlane.position.set(11.4, 0, 0)
    this.floodPlane.visible = false
    this.scene.add(this.floodPlane)
  }

  private buildBore(normal: THREE.Texture): THREE.Mesh {
    const zSeg = this.boreZ
    const pSeg = this.boreP
    const positions = new Float32Array((zSeg + 1) * (pSeg + 1) * 3)
    const uvs: number[] = []
    const indices: number[] = []
    const row = pSeg + 1
    for (let z = 0; z <= zSeg; z++) {
      for (let p = 0; p <= pSeg; p++) {
        uvs.push(z / zSeg, p / pSeg)
      }
    }
    for (let z = 0; z < zSeg; z++) {
      for (let p = 0; p < pSeg; p++) {
        const a = z * row + p
        indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    void normal
    const mesh = new THREE.Mesh(geo, createBoreMaterial())
    mesh.frustumCulled = false
    this.scene.add(mesh)
    return mesh
  }

  private shapeBore(frontX: number, height: number, travel: number) {
    const zSeg = this.boreZ
    const pSeg = this.boreP
    const attr = this.bore.geometry.getAttribute('position') as THREE.BufferAttribute
    const length = 16
    let v = 0
    for (let z = 0; z <= zSeg; z++) {
      const zz = (z / zSeg - 0.5) * length
      const jag = 1 + Math.sin(zz * 1.3) * 0.08
      for (let p = 0; p <= pSeg; p++) {
        const u = p / pSeg
        let px: number
        let py: number
        if (u < 0.55) {
          const t = u / 0.55
          px = 0.12 * t
          py = height * jag * t
        } else {
          const t = (u - 0.55) / 0.45
          px = -1.35 * t
          py = height * jag * (1 - 0.25 * t)
        }
        attr.setXYZ(v, frontX + px, this.baseWaterY + py, zz)
        v++
      }
    }
    attr.needsUpdate = true
    this.bore.geometry.computeVertexNormals()
    this.bore.visible = height > 0.25 && travel > 0.05 && travel < 0.98
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
      const h = s.waveHeight_m * 0.42 * shape * packet * shoal * landDamp + chop * 1.8
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    this.water.geometry.computeVertexNormals()

    const waterMat = this.water.material as THREE.ShaderMaterial
    waterMat.uniforms.uTime!.value = s.timeSec
    waterMat.uniforms.uCamPos!.value.copy(this.camera.position)
    this.water.position.y = this.baseWaterY + s.inundationDepth_m * 0.04

    const slip = THREE.MathUtils.clamp(s.faultSlip_m, 0, 12)
    this.fault.position.x = -8 + slip * 0.08
    this.fault.rotation.z = slip * 0.015
    ;(this.fault.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + slip * 0.1

    const ringScale = 0.6 + travel * 14 + s.waveHeight_m * 0.15
    this.waveRing.scale.set(ringScale, ringScale, 1)
    this.waveRing.position.x = frontX
    ;(this.waveRing.material as THREE.MeshBasicMaterial).opacity = 0.08 + s.waveHeight_m * 0.03

    this.shapeBore(frontX, Math.max(0.35, s.waveHeight_m * 0.85 * (1 + travel * 1.6)), travel)
    const boreMat = this.bore.material as THREE.ShaderMaterial
    boreMat.uniforms.uTime!.value = s.timeSec
    boreMat.uniforms.uCamPos!.value.copy(this.camera.position)

    const flood = s.inundationDepth_m > 0.35
    this.floodPlane.visible = flood
    this.floodPlane.position.set(11.4, coastHeight(11.4, 0) + 0.08 + s.inundationDepth_m * 0.12, 0)
    const floodMat = this.floodPlane.material as THREE.ShaderMaterial
    floodMat.uniforms.uTime!.value = s.timeSec
    floodMat.uniforms.uCamPos!.value.copy(this.camera.position)
    floodMat.uniforms.uAlpha!.value = THREE.MathUtils.clamp(0.32 + s.inundationDepth_m * 0.08, 0.28, 0.7)
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
