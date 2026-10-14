import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeAvalancheState, type AvalancheState } from '../model/avalancheModel'
import { yieldFrame } from './initTiming'

export class AvalancheScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private flowMesh: THREE.Mesh
  private snowCap: THREE.Mesh
  private chalets: THREE.Mesh[] = []
  private intensity = 0.65
  private timeSec = 0
  private raf = 0
  private container: HTMLElement

  private constructor(container: HTMLElement) {
    this.container = container
    this.scene.background = new THREE.Color(0x9ec5e8)
    this.scene.fog = new THREE.FogExp2(0xb8d4f0, 0.028)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
    this.camera.position.set(14, 9, 14)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 3, 0)

    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(8, 14, 6)
    sun.castShadow = true
    this.scene.add(sun)
    this.scene.add(new THREE.AmbientLight(0xc8dff5, 0.45))

    const slopeGeo = new THREE.BoxGeometry(22, 1.2, 16)
    const slopeMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 })
    const slope = new THREE.Mesh(slopeGeo, slopeMat)
    slope.position.set(2, 0.2, 0)
    slope.rotation.z = -0.42
    slope.receiveShadow = true
    this.scene.add(slope)

    this.snowCap = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xf0f8ff, roughness: 0.85 }),
    )
    this.snowCap.position.set(-3, 4.2, 0)
    this.snowCap.rotation.z = -0.42
    this.scene.add(this.snowCap)

    this.flowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.5, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 0.08 }),
    )
    this.flowMesh.visible = false
    this.scene.add(this.flowMesh)

    for (let i = 0; i < 6; i++) {
      const chalet = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xd4c4a8 }),
      )
      chalet.position.set(6 + i * 1.1, 0.35, -2 + (i % 2) * 1.5)
      chalet.castShadow = true
      this.scene.add(chalet)
      this.chalets.push(chalet)
    }

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  static async create(container: HTMLElement): Promise<AvalancheScene> {
    await yieldFrame()
    return new AvalancheScene(container)
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
    const runNorm = s.runoutDistance_m / 1200
    this.flowMesh.visible = s.runoutDistance_m > 20
    this.flowMesh.position.set(-2 + runNorm * 10, 1.2 - runNorm * 0.8, 0)
    this.flowMesh.scale.set(1 + runNorm * 4, 0.6 + s.flowSpeed_m_s * 0.05, 1 + runNorm * 2)

    this.snowCap.scale.x = 1 - s.slabFractureDepth_m * 0.15
    this.snowCap.position.x = -3 - runNorm * 0.5

    s.chalets.forEach((c, i) => {
      const mesh = this.chalets[i]
      if (!mesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (c.severityIndex >= 3) {
        mat.color.setHex(0x6b7280)
        mesh.scale.y = 0.35
      } else if (c.severityIndex >= 2) {
        mat.color.setHex(0xa89078)
        mesh.rotation.z = 0.25
      } else if (c.severityIndex >= 1) {
        mat.color.setHex(0xc4b498)
      } else {
        mat.color.setHex(0xd4c4a8)
        mesh.scale.y = 1
        mesh.rotation.z = 0
      }
    })
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
    window.removeEventListener('resize', this.handleResize)
    this.renderer.dispose()
  }

  private handleResize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }
}
