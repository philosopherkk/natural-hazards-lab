import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { computeEarthquakeState, type EarthquakeState } from '../model/earthquakeModel'
import { yieldFrame } from './initTiming'

export class EarthquakeScene {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private faultBlock: THREE.Mesh
  private pRing: THREE.Mesh
  private sRing: THREE.Mesh
  private buildings: THREE.Group[] = []
  private cityRoot = new THREE.Group()
  private intensity = 0.65
  private timeSec = 0
  private raf = 0
  private container: HTMLElement

  private constructor(container: HTMLElement) {
    this.container = container
    this.scene.background = new THREE.Color(0x6b7c8a)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
    this.camera.position.set(10, 6, 10)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 2, 0)

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.1)
    sun.position.set(4, 8, 2)
    this.scene.add(sun)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.faultBlock = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff6b4a, emissive: 0x441100, emissiveIntensity: 0.2 }),
    )
    this.faultBlock.position.set(0, 0.5, 0)
    this.scene.add(this.faultBlock)

    const ringMat = (color: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    this.pRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), ringMat(0x88ccff))
    this.pRing.rotation.x = -Math.PI / 2
    this.pRing.position.y = 0.05
    this.scene.add(this.pRing)

    this.sRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), ringMat(0xffd166))
    this.sRing.rotation.x = -Math.PI / 2
    this.sRing.position.y = 0.06
    this.scene.add(this.sRing)

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group()
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xd4c4a8 }),
      )
      body.position.y = 0.6
      g.add(body)
      g.position.set(-4 + i * 1.6, 0, 3 + (i % 2) * 1.5)
      this.cityRoot.add(g)
      this.buildings.push(g)
    }
    this.scene.add(this.cityRoot)

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  static async create(container: HTMLElement): Promise<EarthquakeScene> {
    await yieldFrame()
    return new EarthquakeScene(container)
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
    this.faultBlock.position.x = s.faultSlip_m * 0.15
    const mat = this.faultBlock.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.15 + s.shaking * 0.8

    const pScale = Math.max(0.01, s.pWaveRadius_km * 0.35)
    this.pRing.scale.set(pScale, pScale, pScale)
    ;(this.pRing.material as THREE.MeshBasicMaterial).opacity = 0.15 + s.shaking * 0.35

    const sScale = Math.max(0.01, s.sWaveRadius_km * 0.35)
    this.sRing.scale.set(sScale, sScale, sScale)

    const shake = s.shaking * 0.08
    this.cityRoot.position.x = Math.sin(s.timeSec * 22) * shake
    this.cityRoot.position.z = Math.cos(s.timeSec * 19) * shake

    s.buildings.forEach((b, i) => {
      const g = this.buildings[i]
      if (!g) return
      const body = g.children[0] as THREE.Mesh
      const m = body.material as THREE.MeshStandardMaterial
      if (b.severityIndex >= 3) {
        m.color.setHex(0x555555)
        body.scale.y = 0.35
        g.rotation.z = 0.2
      } else if (b.severityIndex >= 2) {
        m.color.setHex(0xa08070)
        body.scale.y = 0.75
      } else if (b.severityIndex >= 1) {
        m.color.setHex(0xc8b8a0)
      } else {
        m.color.setHex(0xd4c4a8)
        body.scale.y = 1
        g.rotation.z = 0
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
