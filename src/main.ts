import './style.css'
import {
  getTranslations,
  initLocale,
  stageIndexForTime,
  TIMELINE_DURATION,
  toggleLocale,
} from './i18n'
import { VolcanoScene, type InitProgressStep } from './scene/VolcanoScene'
import { APP_VERSION, UPDATE_DATE } from './version'

interface UiRefs {
  stageTitle: HTMLElement
  stageDesc: HTMLElement
  stageTime: HTMLElement
  legendList: HTMLElement
  keyboardList: HTMLElement
  helpIntro: HTMLElement
  footerMeta: HTMLElement
  langBtn: HTMLButtonElement
  playBtn: HTMLButtonElement
  reverseBtn: HTMLButtonElement
  resetBtn: HTMLButtonElement
  timeline: HTMLInputElement
  intensity: HTMLInputElement
  cutaway: HTMLInputElement
  labels: HTMLInputElement
  canvasWrap: HTMLElement
  loading: HTMLElement
}

let scene: VolcanoScene | null = null
let timeSec = 0
let playing = false
let reverse = false
let lastFrame = 0

function formatTime(sec: number): string {
  return `${sec.toFixed(1)} s / ${TIMELINE_DURATION} s`
}

function applyTranslations(refs: UiRefs) {
  const t = getTranslations()
  document.title = `${t.appTitle} — ${t.appSubtitle}`
  document.querySelector<HTMLElement>('[data-i18n="title"]')!.textContent = t.appTitle
  document.querySelector<HTMLElement>('[data-i18n="subtitle"]')!.textContent = t.appSubtitle
  document.querySelector<HTMLElement>('[data-i18n="timeline-label"]')!.textContent = t.timeline
  document.querySelector<HTMLElement>('[data-i18n="intensity-label"]')!.textContent = t.intensity
  document.querySelector<HTMLElement>('[data-i18n="cutaway-label"]')!.textContent = t.cutaway
  document.querySelector<HTMLElement>('[data-i18n="labels-label"]')!.textContent = t.labels
  document.querySelector<HTMLElement>('[data-i18n="stage-heading"]')!.textContent = t.stageHeading
  document.querySelector<HTMLElement>('[data-i18n="legend-heading"]')!.textContent = t.legendHeading
  document.querySelector<HTMLElement>('[data-i18n="help-heading"]')!.textContent = t.helpHeading
  refs.helpIntro.textContent = t.helpIntro
  refs.langBtn.textContent = t.langToggle
  refs.langBtn.setAttribute('aria-label', t.langToggleAria)
  refs.timeline.setAttribute('aria-label', t.timelineAria)
  refs.intensity.setAttribute('aria-label', t.intensityAria)
  refs.cutaway.setAttribute('aria-label', t.cutawayAria)
  refs.labels.setAttribute('aria-label', t.labelsAria)
  refs.reverseBtn.setAttribute('aria-label', t.reverseAria)
  refs.resetBtn.setAttribute('aria-label', t.resetAria)
  refs.canvasWrap.setAttribute('aria-label', t.canvasAria)
  refs.loading.textContent = t.loading

  refs.legendList.innerHTML = t.legend
    .map(
      (item) =>
        `<li><span class="legend-swatch" style="background:${item.color}"></span>${item.label}</li>`,
    )
    .join('')

  refs.keyboardList.innerHTML = t.keyboard
    .map((k) => `<li><kbd>${k.keys}</kbd> ${k.action}</li>`)
    .join('')

  refs.footerMeta.innerHTML = `<span>${t.footerVersion} ${APP_VERSION}</span><span>${t.footerUpdated} ${UPDATE_DATE}</span>`

  updateStagePanel(refs)
  scene?.updateLabelTexts({
    chamber: t.labelChamber,
    conduit: t.labelConduit,
    crater: t.labelCrater,
    lavaFlow: t.labelLavaFlow,
    plume: t.labelPlume,
  })
  syncPlayButton(refs)
}

function updateStagePanel(refs: UiRefs) {
  const t = getTranslations()
  const idx = stageIndexForTime(timeSec)
  const stage = t.stages[idx]!
  refs.stageTitle.textContent = stage.title
  refs.stageDesc.textContent = stage.description
  refs.stageTime.textContent = `${t.stageTime}: ${formatTime(timeSec)}`
}

function syncPlayButton(refs: UiRefs) {
  const t = getTranslations()
  refs.playBtn.textContent = playing ? t.pause : t.play
  refs.playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false')
  refs.reverseBtn.textContent = t.reverse
  refs.reverseBtn.setAttribute('aria-pressed', reverse ? 'true' : 'false')
  refs.resetBtn.textContent = t.reset
}

function setTime(sec: number, refs: UiRefs) {
  timeSec = Math.max(0, Math.min(TIMELINE_DURATION, sec))
  refs.timeline.value = String(timeSec)
  scene?.setTime(timeSec)
  updateStagePanel(refs)
}

function tick(now: number, refs: UiRefs) {
  if (playing) {
    const dt = (now - lastFrame) / 1000
    const dir = reverse ? -1 : 1
    let next = timeSec + dt * dir
    if (next >= TIMELINE_DURATION) {
      next = TIMELINE_DURATION
      playing = false
      syncPlayButton(refs)
    } else if (next <= 0) {
      next = 0
      playing = false
      syncPlayButton(refs)
    }
    setTime(next, refs)
  }
  lastFrame = now
  requestAnimationFrame((t) => tick(t, refs))
}

function loadingMessageForStep(step: InitProgressStep): string {
  const t = getTranslations()
  switch (step) {
    case 'webgl':
      return t.loadingWebgl
    case 'textures':
      return t.loadingTextures
    case 'model':
      return t.loadingModel
    case 'effects':
      return t.loadingEffects
    case 'interactive':
    default:
      return t.loading
  }
}

function bindUi(refs: UiRefs) {
  refs.timeline.addEventListener('input', () => {
    playing = false
    syncPlayButton(refs)
    setTime(parseFloat(refs.timeline.value), refs)
  })

  refs.intensity.addEventListener('input', () => {
    scene?.setIntensity(parseFloat(refs.intensity.value))
  })

  refs.cutaway.addEventListener('change', () => {
    scene?.setCutaway(refs.cutaway.checked)
  })

  refs.labels.addEventListener('change', () => {
    scene?.setLabelsVisible(refs.labels.checked)
  })

  refs.playBtn.addEventListener('click', () => {
    playing = !playing
    lastFrame = performance.now()
    syncPlayButton(refs)
  })

  refs.reverseBtn.addEventListener('click', () => {
    reverse = !reverse
    syncPlayButton(refs)
  })

  refs.resetBtn.addEventListener('click', () => {
    playing = false
    reverse = false
    syncPlayButton(refs)
    setTime(0, refs)
  })

  refs.langBtn.addEventListener('click', () => {
    toggleLocale()
    applyTranslations(refs)
  })

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    switch (e.key) {
      case ' ':
        e.preventDefault()
        playing = !playing
        lastFrame = performance.now()
        syncPlayButton(refs)
        break
      case 'ArrowRight':
        setTime(timeSec + 0.5, refs)
        break
      case 'ArrowLeft':
        setTime(timeSec - 0.5, refs)
        break
      case 'Home':
        setTime(0, refs)
        break
      case 'End':
        setTime(TIMELINE_DURATION, refs)
        break
      case 'c':
      case 'C':
        refs.cutaway.checked = !refs.cutaway.checked
        scene?.setCutaway(refs.cutaway.checked)
        break
      case 'l':
      case 'L':
        refs.labels.checked = !refs.labels.checked
        scene?.setLabelsVisible(refs.labels.checked)
        break
      case 'r':
      case 'R':
        reverse = !reverse
        syncPlayButton(refs)
        break
      default:
        break
    }
  })
}

function main() {
  initLocale()

  const refs: UiRefs = {
    stageTitle: document.querySelector('#stage-title')!,
    stageDesc: document.querySelector('#stage-desc')!,
    stageTime: document.querySelector('#stage-time')!,
    legendList: document.querySelector('#legend-list')!,
    keyboardList: document.querySelector('#keyboard-list')!,
    helpIntro: document.querySelector('#help-intro')!,
    footerMeta: document.querySelector('#footer-meta')!,
    langBtn: document.querySelector('#lang-toggle')!,
    playBtn: document.querySelector('#play-btn')!,
    reverseBtn: document.querySelector('#reverse-btn')!,
    resetBtn: document.querySelector('#reset-btn')!,
    timeline: document.querySelector('#timeline')!,
    intensity: document.querySelector('#intensity')!,
    cutaway: document.querySelector('#cutaway')!,
    labels: document.querySelector('#labels')!,
    canvasWrap: document.querySelector('#canvas-wrap')!,
    loading: document.querySelector('#loading')!,
  }

  refs.timeline.max = String(TIMELINE_DURATION)
  refs.timeline.step = '0.1'
  refs.intensity.value = '0.65'

  bindUi(refs)
  applyTranslations(refs)

  lastFrame = performance.now()
  requestAnimationFrame((t) => tick(t, refs))

  void initScene(refs)
}

async function initScene(refs: UiRefs) {
  try {
    scene = await VolcanoScene.create(refs.canvasWrap, (step) => {
      refs.loading.textContent = loadingMessageForStep(step)
    })
    scene.setCutaway(refs.cutaway.checked)
    scene.setLabelsVisible(refs.labels.checked)
    scene.setIntensity(parseFloat(refs.intensity.value))
    scene.setTime(0)
    scene.updateLabelTexts({
      chamber: getTranslations().labelChamber,
      conduit: getTranslations().labelConduit,
      crater: getTranslations().labelCrater,
      lavaFlow: getTranslations().labelLavaFlow,
      plume: getTranslations().labelPlume,
    })
    scene.start()
    refs.loading.hidden = true
  } catch (err) {
    refs.loading.textContent = `WebGL error: ${err instanceof Error ? err.message : String(err)}`
    console.error(err)
  }
}

main()
