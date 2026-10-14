import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { computeEruptionState, type EruptionState } from '../model/eruptionModel'
import { buildVolcano } from './volcanoBuilder'
import { AshPlumeSystem, SparkSystem } from './particles'
import { ConduitTracerSystem } from './conduitTracers'
import { applyHouseSeverity } from './villageBuilder'
import { ensureRockTexturesAsync, getLavaTexture } from './textures'
import { logInitPhase, scheduleIdle, yieldFrame } from './initTiming'

export type InitProgressStep = 'webgl' | 'textures' | 'model' | 'interactive' | 'effects'

export interface LabelTexts {
  chamber: string
  conduit: string
  crater: string
  lavaFlow: string
  plume: string
}

export type EngineeringReadoutListener = (state: EruptionState) => void

export class VolcanoScene {
  readonly renderer: THREE.WebGLRenderer
  readonly labelRenderer: CSS2DRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private clock = new THREE.Clock()
  private ash: AshPlumeSystem | null = null
  private sparks: SparkSystem | null = null
  private tracers: ConduitTracerSystem | null = null
  private build: ReturnType<typeof buildVolcano> | null = null
  private plumeMesh: THREE.Mesh | null = null
  private clipPlane: THREE.Plane
  private cutawayEnabled = true
  private labelsVisible = true
  private labelObjects: CSS2DObject[] = []
  private animationId = 0
  private timeSec = 0
  private intensity = 0.65
  private container: HTMLElement
  private loopRunning = false
  private readoutListener: EngineeringReadoutListener | null = null
  private lastState: EruptionState | null = null

  private constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87a4bc)
    this.scene.fog = new THREE.FogExp2(0x9eb5c9, 0.042)

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
    sun.shadow.mapSize.set(1024, 1024)
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

    this.clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  static async create(
    container: HTMLElement,
    onProgress?: (step: InitProgressStep) => void,
  ): Promise<VolcanoScene> {
    const t0 = performance.now()
    onProgress?.('webgl')
    await yieldFrame()

    const instance = new VolcanoScene(container)
    logInitPhase('WebGL + lights', t0)

    onProgress?.('textures')
    await ensureRockTexturesAsync()
    getLavaTexture()
    logInitPhase('textures', t0)

    onProgress?.('model')
    await yieldFrame()
    instance.mountVolcanoGeometry()
    logInitPhase('geometry', t0)

    instance.renderAt(0, 0.65)
    onProgress?.('interactive')
    logInitPhase('first frame', t0)

    scheduleIdle(() => {
      instance.mountParticleEffects()
      logInitPhase('particles (idle)', t0)
      onProgress?.('effects')
    })

    if (import.meta.env.DEV) {
      console.log(`[volcano:init] ready for interaction in ${(performance.now() - t0).toFixed(1)}ms`)
    }

    return instance
  }

  onEngineeringReadout(listener: EngineeringReadoutListener | null) {
    this.readoutListener = listener
    if (listener && this.lastState) listener(this.lastState)
  }

  private mountVolcanoGeometry() {
    this.build = buildVolcano()
    this.scene.add(this.build.root)
    this.applyClipPlanes()

    const plumeGeo = new THREE.CylinderGeometry(0.15, 1.2, 6, 12, 1, true)
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
  }

  private mountParticleEffects() {
    if (this.ash) return
    this.ash = new AshPlumeSystem()
    this.sparks = new SparkSystem()
    this.tracers = new ConduitTracerSystem()
    this.scene.add(this.ash.points)
    this.scene.add(this.sparks.points)
    this.build?.conduit.add(this.tracers.points)
  }

  private applyClipPlanes() {
    if (!this.build) return
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
    if (!this.build) return
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
    this.renderAt(seconds, this.intensity)
  }

  setIntensity(value: number) {
    this.intensity = THREE.MathUtils.clamp(value, 0, 1)
    this.renderAt(this.timeSec, this.intensity)
  }

  /** Deterministic scene + physics state from timeline position. */
  renderAt(timeSec: number, intensity: number) {
    const state = computeEruptionState(timeSec, intensity)
    this.lastState = state
    this.readoutListener?.(state)
    this.applyEruptionState(state)
  }

  getLastState(): EruptionState | null {
    return this.lastState
  }

  private applyEruptionState(state: EruptionState) {
    if (!this.build || !this.plumeMesh) return
    const a = state.activity
    const chamberMat = this.build.chamber.material as THREE.MeshStandardMaterial
    const tNorm = (state.T_magma_C - 950) / 300
    chamberMat.emissive.setHSL(0.06 + tNorm * 0.02, 1, 0.45 + state.meltFraction * 0.15)
    chamberMat.emissiveIntensity = 0.35 + a * 1.4 + state.meltFraction * 0.4

    const coreMat = this.build.magmaCore.material as THREE.MeshStandardMaterial
    coreMat.emissiveIntensity = 0.9 + state.meltFraction * 0.8
    coreMat.opacity = 0.75 + state.meltFraction * 0.2
    this.build.magmaCore.scale.set(
      1.4 * (0.85 + state.chamberFill * 0.2),
      0.75 * (0.9 + state.chamberFill * 0.15),
      1.2 * (0.85 + state.chamberFill * 0.2),
    )

    const conduitMat = this.build.conduit.material as THREE.MeshStandardMaterial
    conduitMat.emissiveIntensity = 0.1 + a * 0.9 + (state.Q_m3s > 0 ? 0.35 : 0)
    const conduitScale = 1 + (state.conduitRadiusM / 1.8 - 1) * 0.15
    this.build.conduit.scale.set(conduitScale, 1, conduitScale)

    this.build.craterGlow.intensity = a * 3.5 * state.intensity
    this.build.lavaFlow.visible = a > 0.32 || state.lavaFrontM > 30
    const lavaMat = this.build.lavaFlow.material as THREE.MeshStandardMaterial
    const thermal = THREE.MathUtils.clamp((state.T_magma_C - 1000) / 250, 0, 1)
    lavaMat.emissive.setHSL(0.08 - thermal * 0.04, 1, 0.45 + thermal * 0.2)
    lavaMat.emissiveIntensity = (0.4 + a * 1.8) * (state.Q_m3s > 0 ? 1 : 0.35)

    const frontScene = 1.2 + (state.lavaFrontM / 1500) * 6.5
    this.build.lavaFlow.scale.set(0.35 + frontScene * 0.12, 1, 0.4 + frontScene * 0.14)

    const crustMat = this.build.lavaCrust.material as THREE.MeshStandardMaterial
    const crustFrac = THREE.MathUtils.clamp(1 - thermal + state.timeSec * 0.015, 0, 0.85)
    crustMat.opacity = state.ventOpen ? crustFrac * 0.75 * a : 0
    this.build.lavaCrust.scale.copy(this.build.lavaFlow.scale)

    const plumeMat = this.plumeMesh.material as THREE.MeshStandardMaterial
    plumeMat.opacity = 0.08 + a * 0.48
    this.plumeMesh.scale.set(0.6 + a * 1.3, 0.4 + a * 1.7, 0.6 + a * 1.3)
    this.plumeMesh.visible = a > 0.12

    const buildUp = state.timeSec < 10 ? Math.sin(state.timeSec * 0.8) * 0.02 : 0
    this.build.chamber.scale.y = 0.75 + buildUp + a * 0.08 + (state.P_chamber_MPa / 30) * 0.04

    for (let i = 0; i < this.build.geologyLayers.length; i++) {
      const layer = this.build.geologyLayers[i]!
      const mat = layer.material as THREE.MeshStandardMaterial
      mat.emissive = new THREE.Color(0x331100)
      mat.emissiveIntensity = state.meltFraction * 0.08 * (i / 5)
    }
    this.build.dikes.forEach((dike, i) => {
      const mat = dike.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity =
        0.12 + state.meltFraction * 0.25 * (state.timeSec > 5 + i * 2 ? 1 : 0.3)
    })

    state.structures.forEach((st, i) => {
      const house = this.build!.houses[i]
      if (!house) return
      applyHouseSeverity(house, st.severity, (st.severityIndex % 5) / 5)
    })

    this.tracers?.renderAt(state.timeSec, state.Q_m3s, a)
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
    if (this.loopRunning) return
    this.loopRunning = true
    const loop = () => {
      this.animationId = requestAnimationFrame(loop)
      const dt = Math.min(this.clock.getDelta(), 0.05)
      this.controls.update()
      const state = this.lastState ?? computeEruptionState(this.timeSec, this.intensity)
      const a = state.activity
      this.ash?.update(dt, a)
      this.sparks?.update(dt, a)
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
