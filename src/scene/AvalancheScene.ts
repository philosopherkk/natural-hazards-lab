import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  computeAvalancheState,
  DEFAULT_AVALANCHE_CONDITIONS,
  type AvalancheConditions,
  type AvalancheState,
} from '../model/avalancheModel'
import { fbm, hash2, mulberry32 } from './noise'
import { makeConifer } from './meshForms'
import { ensurePbrLibraryAsync, getPbrLibrary, pbrMaterial } from './pbrLibrary'
import { scheduleIdle, yieldFrame } from './initTiming'
import {
  addAtmosphere,
  addOutdoorLighting,
  bindResize,
  createStandardRenderer,
  type SceneInitStep,
} from './sceneBootstrap'

export type AvalancheInitStep = SceneInitStep

function slopeHeight(x: number, z: number): number {
  const along = -x * 0.38 + z * 0.08
  const ridge = Math.exp(-((x + 4) ** 2) / 18) * 3.2
  const n = (fbm(x * 0.32, z * 0.32, 4, 4) - 0.5) * 0.7
  const gully = Math.sin(z * 0.35) * 0.22 * Math.exp(-((x + 2) ** 2) / 30)
  return Math.max(0, along + ridge + n + gully)
}

export class AvalancheScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private unbindResize: () => void
  private world = new THREE.Group()
  private terrain!: THREE.Mesh
  private snowCap!: THREE.Mesh
  private terrainY!: Float32Array
  private snowExtra!: Float32Array
  private snowDepthApplied = -1
  private fracture!: THREE.Mesh
  private slabs: THREE.Mesh[] = []
  private flowRibbon!: THREE.Mesh
  private flowSnout!: THREE.Mesh
  private flowPositions!: Float32Array
  private runoutFan!: THREE.Mesh
  private powder: THREE.Points | null = null
  private trees = new THREE.Group()
  private chalets: THREE.Group[] = []
  private debris: THREE.Mesh[] = []
  private intensity = 0.65
  private timeSec = 0
  private conditions: AvalancheConditions = { ...DEFAULT_AVALANCHE_CONDITIONS }
  private raf = 0

  private constructor(container: HTMLElement) {
    addAtmosphere(this.scene, 'alpine')

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 240)
    this.camera.position.set(12, 8.5, 14)

    this.renderer = createStandardRenderer(container)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.target.set(0.5, 3.4, 0)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04

    addOutdoorLighting(this.scene, 18, 'alpine')
    this.scene.add(this.world)
    this.unbindResize = bindResize(container, this.camera, this.renderer)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: AvalancheInitStep) => void,
  ): Promise<AvalancheScene> {
    onProgress?.('webgl')
    await yieldFrame()
    const instance = new AvalancheScene(container)
    onProgress?.('terrain')
    await ensurePbrLibraryAsync()
    await yieldFrame()
    onProgress?.('model')
    instance.buildWorld()
    await yieldFrame()
    instance.applyState(computeAvalancheState(0, instance.intensity, instance.conditions))
    instance.renderOnce()
    onProgress?.('interactive')

    scheduleIdle(() => {
      instance.mountPowder()
      instance.applyState(instance.getState())
      onProgress?.('effects')
    })

    return instance
  }

  private buildWorld() {
    const lib = getPbrLibrary()

    const geo = new THREE.PlaneGeometry(36, 28, 96, 72)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, slopeHeight(x, z))
    }
    geo.computeVertexNormals()

    this.terrain = new THREE.Mesh(
      geo,
      pbrMaterial(lib.rock, { repeat: [6, 5], color: 0xb09888, normalScale: 1.2, roughness: 0.94 }),
    )
    this.terrain.receiveShadow = true
    this.world.add(this.terrain)

    const snowGeo = geo.clone()
    const snowPos = snowGeo.attributes.position as THREE.BufferAttribute
    this.terrainY = new Float32Array(snowPos.count)
    this.snowExtra = new Float32Array(snowPos.count)
    for (let i = 0; i < snowPos.count; i++) {
      const x = snowPos.getX(i)
      const z = snowPos.getZ(i)
      const h = slopeHeight(x, z)
      const cover = THREE.MathUtils.smoothstep(h, 0.2, 1.35)
      const ridge =
        Math.sin(x * 0.85 + z * 0.35) * 0.16 * cover +
        Math.sin(z * 1.4 + x * 0.2) * 0.07 * cover
      const gully = Math.pow(Math.abs(Math.sin(z * 0.55 + x * 0.15)), 8)
      const thick = cover * (0.1 + fbm(x * 0.7, z * 0.7, 11, 2) * 0.08)
      const cut = gully > 0.72 && h < 2.4 ? -0.08 : thick + ridge + 0.03
      this.terrainY[i] = h
      this.snowExtra[i] = cut
      snowPos.setY(i, h + cut)
    }
    snowGeo.computeVertexNormals()
    const snowMat = pbrMaterial(lib.snow, {
      repeat: [8, 7],
      color: 0xf7fbff,
      normalScale: 0.85,
      roughness: 0.78,
      metalness: 0.02,
      detailRepeat: 3.2,
      detailStrength: 0.32,
    })
    snowMat.polygonOffset = true
    snowMat.polygonOffsetFactor = -1
    snowMat.polygonOffsetUnits = -2
    this.snowCap = new THREE.Mesh(snowGeo, snowMat)
    this.snowCap.receiveShadow = true
    this.snowCap.castShadow = true
    this.world.add(this.snowCap)

    const crownGeo = new THREE.PlaneGeometry(7.2, 2.1, 32, 8)
    const crownPos = crownGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < crownPos.count; i++) {
      const x = crownPos.getX(i)
      const y = crownPos.getY(i)
      const jag = fbm(x * 1.6, y * 2.2, 21, 3)
      crownPos.setZ(i, (jag - 0.5) * 0.18 * (0.4 + y))
      if (y > 0.4) crownPos.setY(i, y + (jag - 0.5) * 0.25)
    }
    crownGeo.computeVertexNormals()
    this.fracture = new THREE.Mesh(
      crownGeo,
      pbrMaterial(lib.rock, {
        repeat: [2, 1],
        color: 0x6a5a52,
        normalScale: 1,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    )
    this.fracture.position.set(-4.2, slopeHeight(-4.2, 0) + 0.2, 0.4)
    this.fracture.rotation.y = 0.15
    this.fracture.rotation.z = -0.15
    this.world.add(this.fracture)

    const slabMat = pbrMaterial(lib.snow, { repeat: [2, 2], normalScale: 0.4, roughness: 0.62, color: 0xf4f7fb })
    for (let i = 0; i < 3; i++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 1.1 + i * 0.2), slabMat)
      slab.castShadow = true
      slab.receiveShadow = true
      slab.visible = false
      this.world.add(slab)
      this.slabs.push(slab)
    }

    this.flowRibbon = this.buildFlowRibbon()
    this.world.add(this.flowRibbon)
    this.flowSnout = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 20, 14),
      pbrMaterial(lib.snow, { repeat: [1, 1], color: 0xf4f8ff, roughness: 0.55, normalScale: 0.3 }),
    )
    this.flowSnout.scale.set(2.4, 0.32, 0.85)
    this.flowSnout.castShadow = true
    this.flowSnout.visible = false
    this.world.add(this.flowSnout)

    this.runoutFan = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      pbrMaterial(lib.snow, {
        repeat: [2, 2],
        color: 0xe7eef5,
        roughness: 0.9,
        normalScale: 0.3,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.runoutFan.rotation.x = -Math.PI / 2
    this.runoutFan.position.y = 0.08
    this.runoutFan.visible = false
    this.world.add(this.runoutFan)

    const trunkMat = pbrMaterial(lib.bark, { repeat: [1, 2], normalScale: 0.9, roughness: 0.95 })
    const leafMat = pbrMaterial(lib.soil, {
      repeat: [1, 1],
      color: 0x2f6a3a,
      normalScale: 0.4,
      roughness: 0.86,
    })
    const snowLeaf = pbrMaterial(lib.snow, { repeat: [1, 1], normalScale: 0.2, roughness: 0.7 })
    const rand = mulberry32(19)
    const clusters: [number, number][] = [
      [-2.2, -3.4],
      [-1.2, 2.6],
      [1.4, -4.2],
      [2.2, 3.4],
      [4.6, -2.8],
      [5.4, 4.1],
      [7.8, -3.6],
      [8.6, 2.2],
    ]
    for (const [cx, cz] of clusters) {
      const n = 4 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const tree = makeConifer(trunkMat, leafMat, snowLeaf)
        const tx = cx + (rand() - 0.5) * 1.6
        const tz = cz + (rand() - 0.5) * 1.6
        tree.position.set(tx, slopeHeight(tx, tz), tz)
        tree.rotation.y = rand() * Math.PI
        tree.userData.uniform = 0.7 + rand() * 0.55
        tree.scale.setScalar(tree.userData.uniform as number)
        this.trees.add(tree)
      }
    }
    this.world.add(this.trees)

    const wallMat = pbrMaterial(lib.stucco, { repeat: [2, 2], normalScale: 0.65, roughness: 0.9 })
    const roofMat = pbrMaterial(lib.roof, { repeat: [2, 2], normalScale: 1, roughness: 0.86 })
    const woodMat = pbrMaterial(lib.bark, { repeat: [1, 1], color: 0xd2b48c, roughness: 0.8 })
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.98), wallMat.clone())
      body.position.y = 0.39
      body.castShadow = true
      body.receiveShadow = true
      const roofL = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 1.12), roofMat.clone())
      roofL.position.set(-0.28, 0.9, 0)
      roofL.rotation.z = 0.42
      roofL.castShadow = true
      const roofR = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 1.12), roofL.material)
      roofR.position.set(0.28, 0.9, 0)
      roofR.rotation.z = -0.42
      roofR.castShadow = true
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.08), woodMat)
      beam.position.set(0, 0.72, 0.5)
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.18),
        new THREE.MeshPhysicalMaterial({
          color: 0xc5dcea,
          roughness: 0.05,
          metalness: 0.02,
          transparent: true,
          opacity: 0.6,
        }),
      )
      win.position.set(0, 0.42, 0.5)
      g.add(body, roofL, roofR, beam, win)
      const cx = 2.4 + i * 1.55
      const cz = i % 2 === 0 ? -0.7 : 0.85
      g.scale.setScalar(1.35)
      g.position.set(cx, slopeHeight(cx, cz), cz)
      this.world.add(g)
      this.chalets.push(g)
    }

    const debrisMat = pbrMaterial(lib.rock, { repeat: [1, 1], color: 0x9aa4ae, roughness: 0.88 })
    const randD = mulberry32(44)
    for (let i = 0; i < 12; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + randD() * 0.1, 0), debrisMat)
      rock.castShadow = true
      rock.visible = false
      this.world.add(rock)
      this.debris.push(rock)
    }
  }

  private buildFlowRibbon(): THREE.Mesh {
    const lib = getPbrLibrary()
    const seg = 48
    const span = 8
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= seg; i++) {
      const t = i / seg
      const x = -6 + t * 18
      for (let j = 0; j <= span; j++) {
        const z = (j / span - 0.5) * (1.6 + t * 2.8)
        const y = slopeHeight(x, z) + 0.28
        positions.push(x, y, z)
        uvs.push(t * 4, j / span)
      }
    }
    const row = span + 1
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < span; j++) {
        const a = i * row + j
        indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row)
      }
    }
    const geo = new THREE.BufferGeometry()
    this.flowPositions = new Float32Array(positions)
    geo.setAttribute('position', new THREE.BufferAttribute(this.flowPositions.slice(), 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(
      geo,
      pbrMaterial(lib.snow, {
        repeat: [3, 1],
        color: 0xd5e4f0,
        roughness: 0.42,
        metalness: 0.08,
        normalScale: 0.55,
        transparent: true,
        opacity: 0.94,
      }),
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.visible = false
    return mesh
  }

  private mountPowder() {
    if (this.powder) return
    const count = 1800
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const lib = getPbrLibrary()
    this.powder = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xf7fbff,
        size: 0.18,
        map: lib.softGlow,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    )
    this.powder.visible = false
    this.world.add(this.powder)
  }

  setTime(t: number) {
    this.timeSec = t
    this.applyState(computeAvalancheState(t, this.intensity, this.conditions))
  }

  setIntensity(v: number) {
    this.intensity = THREE.MathUtils.clamp(v, 0, 1)
    this.applyState(computeAvalancheState(this.timeSec, this.intensity, this.conditions))
  }

  setConditions(conditions: AvalancheConditions) {
    this.conditions = { ...conditions }
    this.applyState(computeAvalancheState(this.timeSec, this.intensity, this.conditions))
  }

  getState(): AvalancheState {
    return computeAvalancheState(this.timeSec, this.intensity, this.conditions)
  }

  private applySnowThickness(depthM: number) {
    if (!this.snowCap || Math.abs(depthM - this.snowDepthApplied) < 0.001) return
    this.snowDepthApplied = depthM
    const scale = THREE.MathUtils.clamp(depthM / 1.2, 0.2, 3.6)
    const pos = this.snowCap.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const extra = this.snowExtra[i] ?? 0
      const lift = extra > 0 ? extra * scale : extra
      pos.setY(i, (this.terrainY[i] ?? 0) + lift)
    }
    pos.needsUpdate = true
    this.snowCap.geometry.computeVertexNormals()
  }

  private applyState(s: AvalancheState) {
    this.world.rotation.z = ((s.slopeAngleDeg - 34) * Math.PI) / 180 * 0.65
    this.applySnowThickness(s.snowDepth_m)
    const runNorm = THREE.MathUtils.clamp(s.runoutDistance_m / 1400, 0, 1)
    const active = s.runoutDistance_m > 15
    const depth = THREE.MathUtils.clamp(s.slabFractureDepth_m / 1.4, 0.02, 2.4)
    const bulk = THREE.MathUtils.clamp(s.snowDepth_m / 1.2, 0.25, 3.4)

    this.fracture.visible = s.slabFractureDepth_m > 0.05
    this.fracture.scale.y = depth
    this.fracture.position.y = slopeHeight(-4.2, 0.4) + 0.15 + depth * 0.45

    this.snowCap.position.x = -runNorm * 0.35

    this.slabs.forEach((slab, i) => {
      slab.visible = s.slabFractureDepth_m > 0.08
      const slide = runNorm * (3.2 + i * 1.4)
      const x = -5.2 + slide
      const z = -0.8 + i * 0.7
      slab.position.set(x, slopeHeight(x, z) + 0.2, z)
      slab.rotation.z = -0.25 - runNorm * 0.2
      slab.scale.y = 0.6 + depth * 0.8
    })

    this.updateFlowRibbon(runNorm, active, s.flowSpeed_m_s, bulk)

    this.runoutFan.visible = runNorm > 0.25
    this.runoutFan.scale.setScalar(0.6 + runNorm * 6.5)
    const fx = 6 + runNorm * 6
    this.runoutFan.position.set(fx, slopeHeight(fx, 0) + 0.06, 0)

    this.syncPowder(s, runNorm, active)

    s.chalets.forEach((c, i) => {
      const g = this.chalets[i]
      if (!g) return
      const body = g.children[0] as THREE.Mesh
      const wallMat = body.material as THREE.MeshStandardMaterial
      g.rotation.z = 0
      g.scale.y = 1
      if (c.severityIndex >= 3) {
        wallMat.color.setHex(0x8a847c)
        g.scale.y = 0.38
        g.rotation.z = 0.38
      } else if (c.severityIndex >= 2) {
        wallMat.color.setHex(0xb0a090)
        g.rotation.z = 0.22
        g.scale.y = 0.8
      } else if (c.severityIndex >= 1) {
        wallMat.color.setHex(0xd2c6b4)
        g.scale.y = 0.92
      } else {
        wallMat.color.setHex(0xffffff)
      }
    })

    this.debris.forEach((d, i) => {
      d.visible = runNorm > 0.35
      const angle = (i / this.debris.length) * Math.PI * 0.8 - 0.4
      const rad = 4 + runNorm * 8
      const x = 6 + Math.cos(angle) * rad
      const z = Math.sin(angle) * rad
      d.position.set(x, slopeHeight(x, z) + 0.12, z)
      d.rotation.y = s.timeSec * 0.2 + i
    })

    this.trees.children.forEach((tree, i) => {
      const buried = runNorm > 0.55 && i % 3 === 0
      tree.visible = !buried || runNorm < 0.85
      const uniform = (tree.userData.uniform as number) || 1
      tree.scale.set(uniform, buried ? uniform * 0.22 : uniform, uniform)
    })
  }

  private updateFlowRibbon(runNorm: number, active: boolean, speed: number, bulk: number) {
    this.flowRibbon.visible = active
    this.flowSnout.visible = active
    if (!active) return
    const attr = this.flowRibbon.geometry.getAttribute('position') as THREE.BufferAttribute
    const base = this.flowPositions
    const seg = 48
    const span = 8
    const row = span + 1
    for (let i = 0; i <= seg; i++) {
      const t = i / seg
      const revealed = t <= runNorm + 0.02
      for (let j = 0; j <= span; j++) {
        const idx = i * row + j
        const x = base[idx * 3]!
        const z = base[idx * 3 + 2]!
        if (!revealed) {
          attr.setXYZ(idx, x, -4, z)
          continue
        }
        const snout = THREE.MathUtils.clamp(1 - Math.abs(t - runNorm) * 5, 0, 1)
        const body = (0.16 + snout * 0.7) * bulk + Math.min(speed, 45) * 0.004
        const edge = 1 - Math.abs(j / span - 0.5) * 1.4
        attr.setXYZ(idx, x, slopeHeight(x, z) + body * Math.max(0.25, edge), z)
      }
    }
    attr.needsUpdate = true
    this.flowRibbon.geometry.computeVertexNormals()
    const frontX = -6 + Math.min(runNorm, 1) * 18
    this.flowSnout.visible = active
    this.flowRibbon.scale.z = 0.65 + bulk * 0.5
    this.flowSnout.position.set(frontX, slopeHeight(frontX, 0) + 0.35 * bulk + Math.min(speed, 40) * 0.008, 0)
    this.flowSnout.scale.set(
      (1.5 + runNorm * 1.8) * (0.75 + bulk * 0.3),
      (0.22 + runNorm * 0.18) * bulk,
      (0.6 + runNorm * 0.45) * (0.8 + bulk * 0.22),
    )
    this.flowSnout.rotation.z = -0.35
    const mat = this.flowRibbon.material as THREE.MeshStandardMaterial
    mat.opacity = 0.78 + Math.min(runNorm, 1) * 0.2
  }

  private syncPowder(s: AvalancheState, runNorm: number, active: boolean) {
    if (!this.powder) return
    const blowing = active && s.flowSpeed_m_s > 8
    this.powder.visible = blowing
    if (!blowing) return
    const pos = this.powder.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const count = arr.length / 3
    const frontX = -6 + runNorm * 18
    const frontY = slopeHeight(frontX, 0)
    for (let i = 0; i < count; i++) {
      const u = hash2(i, 2, 5)
      const v = hash2(i, 4, 8)
      const life = (s.timeSec * 0.4 + u) % 1
      const ang = v * Math.PI * 2
      const sheet = u < 0.65
      const ahead = sheet ? 0.4 + life * (1.6 + runNorm * 2.4) : -life * 1.4
      const spread = sheet ? (v - 0.5) * (2.2 + runNorm * 3.2) : Math.sin(ang) * life * 2.2
      arr[i * 3] = frontX + ahead
      arr[i * 3 + 1] = frontY + (sheet ? 0.25 + life * 0.9 : 0.6 + life * 1.8)
      arr[i * 3 + 2] = spread
    }
    pos.needsUpdate = true
    const mat = this.powder.material as THREE.PointsMaterial
    mat.opacity = 0.18 + runNorm * 0.5
    mat.size = 0.12 + runNorm * 0.16
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
