import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeAvalancheState, type AvalancheState } from '../model/avalancheModel'
import { getRockTextures } from './textures'
import { scheduleIdle } from './initTiming'
import {
  addOutdoorLighting,
  bindResize,
  createStandardRenderer,
  runSceneBootstrap,
  type SceneInitStep,
} from './sceneBootstrap'

export type AvalancheInitStep = SceneInitStep

function slopeHeight(x: number, z: number): number {
  const along = -x * 0.38 + z * 0.08
  const ridge = Math.exp(-((x + 4) ** 2) / 18) * 3.2
  const noise = Math.sin(x * 0.7) * 0.15 + Math.cos(z * 0.5) * 0.12
  return Math.max(0, along + ridge + noise)
}

export class AvalancheScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private unbindResize: () => void
  private terrain!: THREE.Mesh
  private snowCap!: THREE.Mesh
  private fracture!: THREE.Mesh
  private flowCore!: THREE.Mesh
  private flowTail!: THREE.Mesh
  private runoutFan!: THREE.Mesh
  private powder!: THREE.Points
  private powderVel = new Float32Array(0)
  private trees = new THREE.Group()
  private chalets: THREE.Group[] = []
  private debris: THREE.Mesh[] = []
  private clock = new THREE.Clock()
  private intensity = 0.65
  private timeSec = 0
  private raf = 0
  private lastFlow = 0

  private constructor(container: HTMLElement) {
    this.scene.background = new THREE.Color(0x9ec5e8)
    this.scene.fog = new THREE.FogExp2(0xb8d4f0, 0.032)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220)
    this.camera.position.set(16, 11, 18)

    this.renderer = createStandardRenderer(container)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.target.set(2, 3.5, 0)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06

    addOutdoorLighting(this.scene, 16)
    this.unbindResize = bindResize(container, this.camera, this.renderer)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: AvalancheInitStep) => void,
  ): Promise<AvalancheScene> {
    const instance = new AvalancheScene(container)
    await runSceneBootstrap(onProgress, () => instance.buildWorld())
    instance.applyState(computeAvalancheState(0, instance.intensity))
    instance.renderOnce()

    scheduleIdle(() => {
      instance.mountPowder()
      onProgress?.('effects')
    })

    return instance
  }

  private buildWorld() {
    const { map, roughnessMap, normalMap } = getRockTextures()

    const geo = new THREE.PlaneGeometry(36, 28, 64, 48)
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
      new THREE.MeshStandardMaterial({
        map,
        roughnessMap,
        normalMap,
        color: 0x6b5344,
        roughness: 0.92,
      }),
    )
    this.terrain.receiveShadow = true
    this.scene.add(this.terrain)

    const snowGeo = geo.clone()
    const snowPos = snowGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < snowPos.count; i++) {
      const x = snowPos.getX(i)
      const z = snowPos.getZ(i)
      const h = slopeHeight(x, z)
      snowPos.setY(i, h + (h > 1.8 ? 0.22 + Math.random() * 0.06 : 0))
    }
    snowGeo.computeVertexNormals()
    this.snowCap = new THREE.Mesh(
      snowGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf4f9ff,
        roughness: 0.82,
        metalness: 0.02,
        transparent: true,
        opacity: 0.95,
      }),
    )
    this.snowCap.receiveShadow = true
    this.scene.add(this.snowCap)

    this.fracture = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x2a3540,
        emissive: 0x334455,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    )
    this.fracture.rotation.x = -Math.PI / 2
    this.fracture.rotation.z = -0.38
    this.fracture.position.set(-5.5, 4.1, 0)
    this.scene.add(this.fracture)

    this.flowCore = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.55, 3.5),
      new THREE.MeshStandardMaterial({
        color: 0xe8f4ff,
        roughness: 0.55,
        emissive: 0x88bbee,
        emissiveIntensity: 0.06,
      }),
    )
    this.flowCore.castShadow = true
    this.flowCore.visible = false
    this.scene.add(this.flowCore)

    this.flowTail = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.35, 5),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.35,
      }),
    )
    this.flowTail.visible = false
    this.scene.add(this.flowTail)

    this.runoutFan = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshStandardMaterial({
        color: 0xd8e8f5,
        roughness: 0.9,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    )
    this.runoutFan.rotation.x = -Math.PI / 2
    this.runoutFan.position.y = 0.08
    this.runoutFan.visible = false
    this.scene.add(this.runoutFan)

    for (let i = 0; i < 28; i++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.09, 0.45, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3528, roughness: 1 }),
      )
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.9, 7),
        new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.95 }),
      )
      crown.position.y = 0.65
      const tree = new THREE.Group()
      tree.add(trunk, crown)
      const tx = -2 + Math.random() * 14
      const tz = -6 + Math.random() * 12
      tree.position.set(tx, slopeHeight(tx, tz), tz)
      tree.rotation.y = Math.random() * Math.PI
      this.trees.add(tree)
    }
    this.trees.castShadow = true
    this.scene.add(this.trees)

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group()
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.75, 0.95),
        new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.88 }),
      )
      body.position.y = 0.38
      body.castShadow = true
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 0.45, 4),
        new THREE.MeshStandardMaterial({ color: 0x6b3e2e, roughness: 0.92 }),
      )
      roof.position.y = 0.92
      roof.rotation.y = Math.PI / 4
      g.add(body, roof)
      const cx = 8 + i * 1.35
      const cz = -2 + (i % 2) * 2.2
      g.position.set(cx, slopeHeight(cx, cz), cz)
      this.scene.add(g)
      this.chalets.push(g)
    }

    for (let i = 0; i < 12; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.08, 0),
        new THREE.MeshStandardMaterial({ color: 0x8a9aaa, roughness: 0.85 }),
      )
      rock.visible = false
      this.scene.add(rock)
      this.debris.push(rock)
    }
  }

  private mountPowder() {
    const count = 2200
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    this.powderVel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2
      positions[i * 3 + 1] = 2 + Math.random() * 2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2
      this.powderVel[i * 3] = (Math.random() - 0.5) * 0.08
      this.powderVel[i * 3 + 1] = Math.random() * 0.04
      this.powderVel[i * 3 + 2] = (Math.random() - 0.5) * 0.08
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.powder = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xf0f8ff,
        size: 0.12,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    )
    this.powder.visible = false
    this.scene.add(this.powder)
  }

  setTime(t: number) {
    this.timeSec = t
    this.applyState(computeAvalancheState(t, this.intensity))
  }

  setIntensity(v: number) {
    this.intensity = THREE.MathUtils.clamp(v, 0, 1)
    this.applyState(computeAvalancheState(this.timeSec, this.intensity))
  }

  getState(): AvalancheState {
    return computeAvalancheState(this.timeSec, this.intensity)
  }

  private applyState(s: AvalancheState) {
    const runNorm = THREE.MathUtils.clamp(s.runoutDistance_m / 1200, 0, 1)
    const active = s.runoutDistance_m > 15

    this.fracture.visible = s.slabFractureDepth_m > 0.05
    const fractureMat = this.fracture.material as THREE.MeshStandardMaterial
    fractureMat.opacity = THREE.MathUtils.clamp(s.slabFractureDepth_m * 2, 0.2, 1)
    fractureMat.emissiveIntensity =
      0.2 + s.slabFractureDepth_m * 0.8

    this.snowCap.scale.set(1 - runNorm * 0.35, 1, 1 - runNorm * 0.2)
    this.snowCap.position.x = -runNorm * 1.2

    this.flowCore.visible = active
    this.flowTail.visible = active
    const fx = -4 + runNorm * 14
    const fy = slopeHeight(fx, 0) + 0.35
    this.flowCore.position.set(fx, fy, 0)
    this.flowCore.scale.set(1 + runNorm * 3.5, 0.7 + s.flowSpeed_m_s * 0.04, 1 + runNorm * 2.2)
    this.flowTail.position.set(fx - 1.2, fy - 0.15, 0)
    this.flowTail.scale.set(1 + runNorm * 4, 1, 1 + runNorm * 3)
    this.flowTail.rotation.z = -0.38

    this.runoutFan.visible = runNorm > 0.25
    this.runoutFan.scale.setScalar(0.5 + runNorm * 7)
    this.runoutFan.position.set(6 + runNorm * 6, slopeHeight(6 + runNorm * 6, 0) + 0.05, 0)

    this.lastFlow = runNorm

    if (this.powder) {
      this.powder.visible = active && s.flowSpeed_m_s > 8
      this.powder.position.set(fx, fy + 0.6, 0)
      const mat = this.powder.material as THREE.PointsMaterial
      mat.opacity = 0.15 + runNorm * 0.45
    }

    s.chalets.forEach((c, i) => {
      const g = this.chalets[i]
      if (!g) return
      const body = g.children[0] as THREE.Mesh
      const roof = g.children[1] as THREE.Mesh
      const wallMat = body.material as THREE.MeshStandardMaterial
      if (c.severityIndex >= 3) {
        wallMat.color.setHex(0x6b7280)
        g.scale.y = 0.35
        g.rotation.z = 0.35
        roof.rotation.z = 0.4
      } else if (c.severityIndex >= 2) {
        wallMat.color.setHex(0xa89078)
        g.rotation.z = 0.22
      } else if (c.severityIndex >= 1) {
        wallMat.color.setHex(0xc4b498)
        g.scale.y = 0.85
      } else {
        wallMat.color.setHex(0xd4c4a8)
        g.scale.y = 1
        g.rotation.z = 0
      }
    })

    this.debris.forEach((d, i) => {
      d.visible = runNorm > 0.35
      const angle = (i / this.debris.length) * Math.PI * 0.8 - 0.4
      const rad = 4 + runNorm * 8
      d.position.set(6 + Math.cos(angle) * rad, slopeHeight(6 + Math.cos(angle) * rad, Math.sin(angle) * 2) + 0.1, Math.sin(angle) * rad)
    })

    this.trees.children.forEach((tree, i) => {
      const buried = runNorm > 0.55 && i % 3 === 0
      tree.visible = !buried || runNorm < 0.85
      tree.scale.y = buried ? 0.2 : 1
    })
  }

  private updatePowder(dt: number) {
    if (!this.powder?.visible) return
    const pos = this.powder.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const speed = 0.6 + this.lastFlow * 2
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] += this.powderVel[i * 3]! * speed * dt
      arr[i * 3 + 1] += this.powderVel[i * 3 + 1]! * speed * dt
      arr[i * 3 + 2] += this.powderVel[i * 3 + 2]! * speed * dt
      if (arr[i * 3 + 1]! > 4) {
        arr[i * 3] = (Math.random() - 0.5) * 2
        arr[i * 3 + 1] = 0.5 + Math.random()
        arr[i * 3 + 2] = (Math.random() - 0.5) * 2
      }
    }
    pos.needsUpdate = true
  }

  private renderOnce() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min(this.clock.getDelta(), 0.05)
      this.updatePowder(dt)
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
