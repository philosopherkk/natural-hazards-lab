import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { buildVolcano } from './volcanoBuilder'
import { AshPlumeSystem, SparkSystem } from './particles'

export interface LabelTexts {
  chamber: string
  conduit: string
  crater: string
  lavaFlow: string
  plume: string
}

export class VolcanoScene {
  readonly renderer: THREE.WebGLRenderer
  readonly labelRenderer: CSS2DRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private clock = new THREE.Clock()
  private ash: AshPlumeSystem
  private sparks: SparkSystem
  private build: ReturnType<typeof buildVolcano>
  private plumeMesh: THREE.Mesh
  private clipPlane: THREE.Plane
  private cutawayEnabled = true
  private labelsVisible = true
  private labelObjects: CSS2DObject[] = []
  private animationId = 0
  private timeSec = 0
  private intensity = 0.65
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87a4bc)
    this.scene.fog = new THREE.FogExp2(0x9eb5c9, 0.045)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)
    this.camera.position.set(9, 5.5, 9)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.localClippingEnabled = true
    container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.inset = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.labelRenderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05
    this.controls.minDistance = 4
    this.controls.maxDistance = 22
    this.controls.target.set(0, 2.2, 0)

    const hemi = new THREE.HemisphereLight(0xddeeff, 0x3d4a2a, 0.55)
    this.scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.35)
    sun.position.set(6, 12, 4)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 40
    sun.shadow.camera.left = -12
    sun.shadow.camera.right = 12
    sun.shadow.camera.top = 12
    sun.shadow.camera.bottom = -12
    sun.shadow.bias = -0.0004
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0xaaccff, 0.35)
    fill.position.set(-5, 4, -6)
    this.scene.add(fill)

    this.build = buildVolcano()
    this.scene.add(this.build.root)

    this.ash = new AshPlumeSystem()
    this.sparks = new SparkSystem()
    this.scene.add(this.ash.points)
    this.scene.add(this.sparks.points)

    const plumeGeo = new THREE.CylinderGeometry(0.15, 1.2, 6, 16, 1, true)
    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0xb0b8c4,
      transparent: true,
      opacity: 0.35,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      emissive: 0x444455,
      emissiveIntensity: 0.15,
    })
    this.plumeMesh = new THREE.Mesh(plumeGeo, plumeMat)
    this.plumeMesh.position.set(0, 7.2, 0)
    this.scene.add(this.plumeMesh)

    this.clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)
    this.applyClipPlanes()

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  private applyClipPlanes() {
    const planes = this.cutawayEnabled ? [this.clipPlane] : []
    this.build.clipMaterials.forEach((m) => {
      m.clippingPlanes = planes
    })
    this.renderer.clippingPlanes = planes
  }

  setCutaway(on: boolean) {
    this.cutawayEnabled = on
    this.applyClipPlanes()
  }

  setLabelsVisible(on: boolean) {
    this.labelsVisible = on
    this.labelObjects.forEach((l) => {
      l.visible = on
    })
  }

  updateLabelTexts(texts: LabelTexts) {
    this.clearLabels()
    const defs: { text: string; pos: THREE.Vector3 }[] = [
      { text: texts.chamber, pos: new THREE.Vector3(-0.5, 0.9, 0) },
      { text: texts.conduit, pos: new THREE.Vector3(-0.6, 2.8, 0) },
      { text: texts.crater, pos: new THREE.Vector3(0.3, 4.7, 0.3) },
      { text: texts.lavaFlow, pos: new THREE.Vector3(2.8, 0.4, 2) },
      { text: texts.plume, pos: new THREE.Vector3(0.5, 8, 0.5) },
    ]
    for (const d of defs) {
      const el = document.createElement('span')
      el.className = 'volcano-label'
      el.textContent = d.text
      const obj = new CSS2DObject(el)
      obj.position.copy(d.pos)
      this.build.root.add(obj)
      this.labelObjects.push(obj)
      obj.visible = this.labelsVisible
    }
  }

  private clearLabels() {
    for (const l of this.labelObjects) {
      l.removeFromParent()
    }
    this.labelObjects = []
  }

  setTime(seconds: number) {
    this.timeSec = seconds
    this.applyEruptionState()
  }

  setIntensity(value: number) {
    this.intensity = THREE.MathUtils.clamp(value, 0, 1)
    this.applyEruptionState()
  }

  /** Eruption activity 0–1 from timeline stage + intensity slider. */
  private activityFactor(): number {
    const t = this.timeSec
    let phase = 0
    if (t < 6) phase = t / 6 * 0.15
    else if (t < 10) phase = 0.15 + ((t - 6) / 4) * 0.25
    else if (t < 14) phase = 0.4 + ((t - 10) / 4) * 0.35
    else if (t < 24) phase = 0.75 + ((t - 14) / 10) * 0.25
    else phase = Math.max(0, 1 - (t - 24) / 6)
    return THREE.MathUtils.clamp(phase * (0.35 + this.intensity * 0.85), 0, 1)
  }

  private applyEruptionState() {
    const a = this.activityFactor()
    const chamberMat = this.build.chamber.material as THREE.MeshStandardMaterial
    chamberMat.emissiveIntensity = 0.35 + a * 1.4
    const conduitMat = this.build.conduit.material as THREE.MeshStandardMaterial
    conduitMat.emissiveIntensity = 0.1 + a * 0.9
    this.build.craterGlow.intensity = a * 3.5 * this.intensity
    this.build.lavaFlow.visible = a > 0.35
    const lavaMat = this.build.lavaFlow.material as THREE.MeshStandardMaterial
    lavaMat.emissiveIntensity = a * 1.8

    const plumeMat = this.plumeMesh.material as THREE.MeshStandardMaterial
    plumeMat.opacity = 0.08 + a * 0.45
    this.plumeMesh.scale.set(0.6 + a * 1.2, 0.4 + a * 1.6, 0.6 + a * 1.2)
    this.plumeMesh.visible = a > 0.12

    const buildUp = this.timeSec < 10 ? Math.sin(this.timeSec * 0.8) * 0.02 : 0
    this.build.chamber.scale.y = 0.75 + buildUp + a * 0.08
  }

  private handleResize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.labelRenderer.setSize(w, h)
  }

  start() {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop)
      const dt = Math.min(this.clock.getDelta(), 0.05)
      this.controls.update()
      const a = this.activityFactor()
      this.ash.update(dt, a)
      this.sparks.update(dt, a)
      this.renderer.render(this.scene, this.camera)
      this.labelRenderer.render(this.scene, this.camera)
    }
    loop()
  }

  dispose() {
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.handleResize)
    this.clearLabels()
    this.renderer.dispose()
  }
}
