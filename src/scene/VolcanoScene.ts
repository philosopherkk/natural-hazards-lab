import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { computeEruptionState, type EruptionState } from '../model/eruptionModel'
import { buildVolcano } from './volcanoBuilder'
import { lumpyCloud, revealChannel } from './meshForms'
import { AshPlumeSystem, SparkSystem } from './particles'
import { ConduitTracerSystem } from './conduitTracers'
import { applyHouseSeverity } from './villageBuilder'
import { ensurePbrLibraryAsync, getPbrLibrary } from './pbrLibrary'
import { logInitPhase, scheduleIdle, yieldFrame } from './initTiming'
import { addAtmosphere, addOutdoorLighting, createStandardRenderer } from './sceneBootstrap'

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
  private ash: AshPlumeSystem | null = null
  private sparks: SparkSystem | null = null
  private tracers: ConduitTracerSystem | null = null
  private build: ReturnType<typeof buildVolcano> | null = null
  private plumeGroup: THREE.Group | null = null
  private craterSprite: THREE.Sprite | null = null
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
    addAtmosphere(this.scene, 'volcano')

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180)
    this.camera.position.set(13.2, 7.2, 13.4)

    this.renderer = createStandardRenderer(container)
    this.renderer.localClippingEnabled = true

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
    this.controls.maxDistance = 28
    this.controls.target.set(0.4, 2.5, 0.2)

    addOutdoorLighting(this.scene, 16, 'volcano')

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
    await ensurePbrLibraryAsync()
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

    const lib = getPbrLibrary()
    this.plumeGroup = new THREE.Group()
    const plumeColors = [0x2e2926, 0x4a433c, 0x6a635c, 0x8c8680, 0xb2ada6, 0xd0ccc6, 0xe4e1dc]
    for (let i = 0; i < plumeColors.length; i++) {
      const mesh = new THREE.Mesh(
        lumpyCloud(0.7 + i * 0.22, 3 + i * 1.7),
        new THREE.MeshStandardMaterial({
          color: plumeColors[i],
          transparent: true,
          opacity: 0.22,
          roughness: 1,
          metalness: 0,
          depthWrite: false,
        }),
      )
      mesh.position.y = 5.4 + i * 0.95
      this.plumeGroup.add(mesh)
    }
    this.scene.add(this.plumeGroup)

    const spriteMat = new THREE.SpriteMaterial({
      map: lib.softGlow,
      color: 0xff7722,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.0,
    })
    this.craterSprite = new THREE.Sprite(spriteMat)
    this.craterSprite.position.set(0, 4.7, 0)
    this.craterSprite.scale.set(2.4, 2.4, 1)
    this.scene.add(this.craterSprite)
  }

  private mountParticleEffects() {
    if (this.ash) return
    this.ash = new AshPlumeSystem()
    this.sparks = new SparkSystem()
    this.tracers = new ConduitTracerSystem()
    this.scene.add(this.ash.points)
    this.scene.add(this.sparks.points)
    this.build?.conduit.add(this.tracers.points)
    if (this.lastState) {
      this.ash.sync(this.lastState.timeSec, this.lastState.activity)
      this.sparks.sync(this.lastState.timeSec, this.lastState.activity)
      this.tracers.renderAt(this.lastState.timeSec, this.lastState.Q_m3s, this.lastState.activity)
    }
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
      { text: texts.plume, pos: new THREE.Vector3(0.8, 8.2, 0.4) },
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
    if (!this.build || !this.plumeGroup) return
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

    this.build.craterGlow.intensity = a * 4.2 * state.intensity
    const lavaMat = this.build.lavaFlow.material as THREE.MeshStandardMaterial
    const thermal = THREE.MathUtils.clamp((state.T_magma_C - 1000) / 250, 0, 1)
    lavaMat.emissive.setHSL(0.08 - thermal * 0.04, 1, 0.45 + thermal * 0.2)
    lavaMat.emissiveIntensity = (0.55 + a * 2.1) * (state.Q_m3s > 0 || state.ventOpen ? 1 : 0.2)
    if (lavaMat.map) lavaMat.map.offset.y = state.timeSec * 0.02

    const reach = state.ventOpen
      ? THREE.MathUtils.clamp(Math.max((state.timeSec - 9.5) / 14, state.lavaFrontM / 500), 0, 1)
      : 0
    revealChannel(this.build.lavaFlow, this.build.lavaBase, this.build.lavaAlong, reach, 0.02)
    const crustMat = this.build.lavaCrust.material as THREE.MeshStandardMaterial
    const crustFrac = THREE.MathUtils.clamp(1 - thermal + state.timeSec * 0.012, 0, 0.9)
    crustMat.opacity = reach > 0.05 ? 0.35 + crustFrac * 0.55 : 0
    crustMat.emissiveIntensity = (1 - crustFrac) * 0.9 + 0.2
    revealChannel(
      this.build.lavaCrust,
      this.build.lavaBase,
      this.build.lavaAlong,
      reach,
      0.05,
      Math.max(0.08, reach * (0.45 + crustFrac * 0.4)),
    )
    this.build.craterCrust.scale.setScalar(0.85 + crustFrac * 0.2)

    const coneMat = this.build.cone.material as THREE.MeshStandardMaterial
    const ash = a * 0.28
    coneMat.color.setRGB(1 - ash, 0.97 - ash * 1.05, 0.94 - ash * 1.15)

    this.plumeGroup.visible = a > 0.08
    this.plumeGroup.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial
      const grow = 0.85 + a * (1.6 + i * 0.35)
      mesh.scale.set(grow * (0.7 + i * 0.28), (0.9 + a * 1.4) * (1 + i * 0.08), grow * (0.65 + i * 0.22))
      mat.opacity = (0.16 + a * 0.28) * (1 - i * 0.08)
      mesh.position.y = 5.3 + i * (0.7 + a * 0.85)
      mesh.position.x = a * 0.55 * i + Math.sin(state.timeSec * 0.15 + i) * 0.12
      mesh.position.z = Math.cos(state.timeSec * 0.11 + i * 0.8) * a * 0.35 * i
    })

    if (this.craterSprite) {
      const spriteMat = this.craterSprite.material as THREE.SpriteMaterial
      spriteMat.opacity = a * 0.9
      const s = 1.5 + a * 3.1
      this.craterSprite.scale.set(s, s, 1)
    }

    const buildUp = state.timeSec < 10 ? Math.sin(state.timeSec * 0.8) * 0.02 : 0
    this.build.chamber.scale.y = 0.75 + buildUp + a * 0.08 + (state.P_chamber_MPa / 30) * 0.04

    for (let i = 0; i < this.build.geologyLayers.length; i++) {
      const layer = this.build.geologyLayers[i]!
      const mat = layer.material as THREE.MeshStandardMaterial
      mat.emissive.setHex(0x331100)
      mat.emissiveIntensity = state.meltFraction * 0.12 * (i / 5)
    }
    this.build.dikes.forEach((dike, i) => {
      const mat = dike.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.12 + state.meltFraction * 0.35 * (state.timeSec > 5 + i * 2 ? 1 : 0.3)
    })

    state.structures.forEach((st, i) => {
      const house = this.build!.houses[i]
      if (!house) return
      applyHouseSeverity(house, st.severity, (st.severityIndex % 5) / 5)
    })

    this.ash?.sync(state.timeSec, a)
    this.sparks?.sync(state.timeSec, a)
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
      this.controls.update()
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
