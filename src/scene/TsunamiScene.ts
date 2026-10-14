import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeTsunamiState, type TsunamiState } from '../model/tsunamiModel'
import { yieldFrame } from './initTiming'

export class TsunamiScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private water: THREE.Mesh
  private houses: THREE.Mesh[] = []
  private intensity = 0.65
  private timeSec = 0
  private raf = 0
  private container: HTMLElement
  private baseWaterY = 0.4

  private constructor(container: HTMLElement) {
    this.container = container
    this.scene.background = new THREE.Color(0x87a4bc)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
    this.camera.position.set(12, 7, 12)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 1, 0)

    this.scene.add(new THREE.HemisphereLight(0xddeeff, 0x224466, 0.7))
    const sun = new THREE.DirectionalLight(0xfff5e6, 1)
    sun.position.set(5, 10, 3)
    this.scene.add(sun)

    const oceanGeo = new THREE.PlaneGeometry(40, 40, 48, 48)
    oceanGeo.rotateX(-Math.PI / 2)
    this.water = new THREE.Mesh(
      oceanGeo,
      new THREE.MeshStandardMaterial({ color: 0x1e6b9c, roughness: 0.35, metalness: 0.05 }),
    )
    this.water.position.y = this.baseWaterY
    this.scene.add(this.water)

    const beach = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.3, 14),
      new THREE.MeshStandardMaterial({ color: 0xc2a878 }),
    )
    beach.position.set(10, 0.15, 0)
    this.scene.add(beach)

    for (let i = 0; i < 6; i++) {
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.6, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xd4c4a8 }),
      )
      house.position.set(9 + (i % 3) * 1.2, 0.45, -3 + Math.floor(i / 3) * 2.5)
      this.scene.add(house)
      this.houses.push(house)
    }

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  static async create(container: HTMLElement): Promise<TsunamiScene> {
    await yieldFrame()
    return new TsunamiScene(container)
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
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const phase = s.timeSec * 2 - (x + z) * 0.15
      const h = s.waveHeight_m * 0.08 * Math.sin(phase) * Math.exp(-x * 0.04)
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    this.water.geometry.computeVertexNormals()

    this.water.position.y = this.baseWaterY + s.inundationDepth_m * 0.06

    s.structures.forEach((st, i) => {
      const h = this.houses[i]
      if (!h) return
      const mat = h.material as THREE.MeshStandardMaterial
      if (st.severityIndex >= 3) {
        mat.color.setHex(0x444444)
        h.scale.y = 0.4
        h.rotation.z = 0.3
      } else if (st.severityIndex >= 2) {
        mat.color.setHex(0x8899aa)
      } else if (st.severityIndex >= 1) {
        mat.color.setHex(0xb8a890)
      } else {
        mat.color.setHex(0xd4c4a8)
        h.scale.y = 1
        h.rotation.z = 0
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
