import { APP_VERSION, UPDATE_DATE } from '../version'
import {
  getCatalog,
  getHazardCopy,
  stageIndexForTime,
  stageTimeRangeFor,
  TIMELINE_DURATION,
  toggleLocale,
  type HazardId,
} from '../i18n'
import type { MetricCopy, StageCopy } from '../i18n/types'
import { getExplainMode, setExplainMode, type ExplainMode } from './explainMode'
import {
  getPlaybackSpeed,
  PLAYBACK_SPEED_OPTIONS,
  setPlaybackSpeed,
  type PlaybackSpeed,
} from './playbackSpeed'

export interface HazardShellOptions {
  hazard: HazardId
  defaultIntensity?: number
  onMount: (root: HazardShellRefs) => void | Promise<void>
  onTimeChange?: (timeSec: number) => void
  onIntensityChange?: (intensity: number) => void
  formatMetric: (metricId: string) => string
  extraKeyboard?: { keys: string; action: string }[]
  onLocaleChange?: () => void
}

export interface HazardShellRefs {
  canvasWrap: HTMLElement
  loading: HTMLElement
  timeline: HTMLInputElement
  intensity: HTMLInputElement
  stageTitle: HTMLElement
  stageDesc: HTMLElement
  stageTime: HTMLElement
  readoutGrid: HTMLElement
  legendList: HTMLElement
  keyboardList: HTMLElement
  playBtn: HTMLButtonElement
  reverseBtn: HTMLButtonElement
  resetBtn: HTMLButtonElement
  explainBtn: HTMLButtonElement
  getExplainMode: () => ExplainMode
  setTime: (sec: number) => void
  getTime: () => number
  setPlaying: (p: boolean) => void
  getPlaying: () => boolean
  getReverse: () => boolean
  toggleReverse: () => void
  refreshReadouts: () => void
  refreshStage: () => void
  applyLocale: () => void
  queryToggle: (id: string) => HTMLInputElement | null
}

export function mountHazardShell(options: HazardShellOptions): () => void {
  const app = document.querySelector('#app')!
  app.innerHTML = ''
  app.className = 'layout'

  const hazardCopy = getHazardCopy(options.hazard)
  const common = getCatalog().common

  const header = document.createElement('header')
  header.className = 'top-bar'
  header.innerHTML = `
    <div class="brand">
      <a href="#/" class="hub-link" id="back-hub">${hazardCopy.backToHub}</a>
      <h1 id="hazard-title">${hazardCopy.title}</h1>
      <p class="subtitle" id="hazard-subtitle">${hazardCopy.subtitle}</p>
    </div>
    <div class="top-actions">
      <button type="button" id="explain-toggle" class="btn btn-ghost" aria-pressed="true"></button>
      <button type="button" id="lang-toggle" class="btn btn-ghost">${common.langToggle}</button>
    </div>
  `
  app.appendChild(header)

  const main = document.createElement('main')
  main.className = 'main-grid'
  main.innerHTML = `
    <section class="viewport-panel">
      <div id="canvas-wrap" class="canvas-wrap" role="img">
        <p id="loading" class="loading" role="status">${common.loading}</p>
      </div>
      <div class="transport" role="group" aria-label="Timeline transport">
        <button type="button" id="play-btn" class="btn btn-primary">${common.play}</button>
        <button type="button" id="reverse-btn" class="btn">${common.reverse}</button>
        <button type="button" id="reset-btn" class="btn">${common.reset}</button>
      </div>
      <div class="speed-row" role="group" id="speed-group" aria-labelledby="speed-label">
        <span id="speed-label" class="speed-label">${common.playbackSpeed}</span>
        <div class="speed-buttons" id="speed-buttons"></div>
      </div>
      <label class="control-row">
        <span id="timeline-label">${common.timeline}</span>
        <input type="range" id="timeline" min="0" max="${TIMELINE_DURATION}" step="0.1" value="0" />
      </label>
      <label class="control-row">
        <span id="intensity-label">${hazardCopy.intensityLabel}</span>
        <input type="range" id="intensity" min="0" max="1" step="0.01" value="${options.defaultIntensity ?? 0.65}" />
      </label>
      <div class="toggles" id="hazard-toggles"></div>
    </section>
    <aside class="info-panel">
      <article class="stage-card" aria-live="polite">
        <h2 id="stage-heading">${hazardCopy.stageHeading}</h2>
        <h3 id="stage-title" class="stage-title"></h3>
        <p id="stage-time" class="stage-time"></p>
        <p id="stage-desc" class="stage-desc"></p>
      </article>
      <section class="side-block engineering-panel">
        <h2 id="engineering-heading">${hazardCopy.engineeringHeading}</h2>
        <dl class="readout-grid" id="readout-grid"></dl>
      </section>
      <section class="side-block">
        <h2 id="legend-heading">${common.legendHeading}</h2>
        <ul id="legend-list" class="legend-list"></ul>
      </section>
      <section class="side-block">
        <h2 id="help-heading">${common.helpHeading}</h2>
        <p id="help-intro" class="help-intro"></p>
        <ul id="keyboard-list" class="keyboard-list"></ul>
      </section>
    </aside>
  `
  app.appendChild(main)

  const footer = document.createElement('footer')
  footer.className = 'site-footer'
  footer.innerHTML = `<div id="footer-meta" class="footer-meta"></div>`
  app.appendChild(footer)

  const togglesRoot = main.querySelector('#hazard-toggles')!
  for (const t of hazardCopy.toggles ?? []) {
    const label = document.createElement('label')
    label.className = 'toggle'
    label.innerHTML = `<input type="checkbox" id="toggle-${t.id}" checked /><span>${t.label}</span>`
    togglesRoot.appendChild(label)
  }

  let timeSec = 0
  let playing = false
  let reverse = false
  let lastFrame = 0
  let explainMode = getExplainMode()
  let playbackSpeed: PlaybackSpeed = getPlaybackSpeed()
  const speedButtonsRoot = main.querySelector('#speed-buttons')!

  const refs: HazardShellRefs = {
    canvasWrap: main.querySelector('#canvas-wrap')!,
    loading: main.querySelector('#loading')!,
    timeline: main.querySelector('#timeline')!,
    intensity: main.querySelector('#intensity')!,
    stageTitle: main.querySelector('#stage-title')!,
    stageDesc: main.querySelector('#stage-desc')!,
    stageTime: main.querySelector('#stage-time')!,
    readoutGrid: main.querySelector('#readout-grid')!,
    legendList: main.querySelector('#legend-list')!,
    keyboardList: main.querySelector('#keyboard-list')!,
    playBtn: main.querySelector('#play-btn')!,
    reverseBtn: main.querySelector('#reverse-btn')!,
    resetBtn: main.querySelector('#reset-btn')!,
    explainBtn: header.querySelector('#explain-toggle')!,
    getExplainMode: () => explainMode,
    setTime: (sec) => setTime(sec),
    getTime: () => timeSec,
    setPlaying: (p) => {
      playing = p
      syncTransport()
    },
    getPlaying: () => playing,
    getReverse: () => reverse,
    toggleReverse: () => {
      reverse = !reverse
      syncTransport()
    },
    refreshReadouts: () => renderReadouts(),
    refreshStage: () => renderStage(),
    applyLocale: () => applyLocale(),
    queryToggle: (id) => document.querySelector(`#toggle-${id}`),
  }

  function formatTime(sec: number): string {
    return `${sec.toFixed(1)} s / ${TIMELINE_DURATION} s`
  }

  function renderReadouts() {
    const copy = getHazardCopy(options.hazard)
    const grid = refs.readoutGrid
    grid.innerHTML = ''
    for (const m of copy.metrics) {
      grid.appendChild(buildMetricRow(m, options.formatMetric(m.id), explainMode))
    }
  }

  function renderStage() {
    const copy = getHazardCopy(options.hazard)
    const commonNow = getCatalog().common
    const idx = stageIndexForTime(options.hazard, timeSec)
    const stage: StageCopy = copy.stages[idx]!
    refs.stageTitle.textContent = stage.title
    refs.stageDesc.textContent =
      explainMode === 'simple' ? stage.descriptionSimple : stage.descriptionEngineering
    const band = stageTimeRangeFor(options.hazard, idx)
    refs.stageTime.textContent = `${commonNow.stageStepWindow}: ${band.startSec.toFixed(1)}–${band.endSec.toFixed(1)} s · ${commonNow.stageTime}: ${formatTime(timeSec)}`
  }

  function syncExplainBtn() {
    const copy = getHazardCopy(options.hazard)
    const isEng = explainMode === 'engineering'
    refs.explainBtn.textContent = isEng ? copy.explainEngineering : copy.explainSimple
    refs.explainBtn.setAttribute('aria-pressed', isEng ? 'true' : 'false')
    refs.explainBtn.setAttribute('aria-label', copy.explainToggleAria)
  }

  function syncTransport() {
    const commonNow = getCatalog().common
    refs.playBtn.textContent = playing ? commonNow.pause : commonNow.play
    refs.playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false')
    refs.reverseBtn.setAttribute('aria-pressed', reverse ? 'true' : 'false')
    refs.resetBtn.textContent = commonNow.reset
    refs.reverseBtn.textContent = commonNow.reverse
  }

  function buildSpeedButtons() {
    const commonNow = getCatalog().common
    main.querySelector('#speed-label')!.textContent = commonNow.playbackSpeed
    const group = main.querySelector('#speed-group')!
    group.setAttribute('aria-label', commonNow.playbackSpeedAria)
    speedButtonsRoot.innerHTML = ''
    for (const rate of PLAYBACK_SPEED_OPTIONS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn btn-speed'
      btn.textContent = `${rate}×`
      btn.setAttribute('aria-pressed', playbackSpeed === rate ? 'true' : 'false')
      btn.setAttribute('aria-label', commonNow.playbackSpeedOptionAria(rate))
      btn.addEventListener('click', () => {
        playbackSpeed = rate
        setPlaybackSpeed(rate)
        buildSpeedButtons()
      })
      speedButtonsRoot.appendChild(btn)
    }
  }

  function applyLocale() {
    const copy = getHazardCopy(options.hazard)
    const commonNow = getCatalog().common
    document.title = `${copy.title} — ${copy.subtitle}`
    header.querySelector('#back-hub')!.textContent = copy.backToHub
    header.querySelector('#hazard-title')!.textContent = copy.title
    header.querySelector('#hazard-subtitle')!.textContent = copy.subtitle
    main.querySelector('#timeline-label')!.textContent = commonNow.timeline
    main.querySelector('#intensity-label')!.textContent = copy.intensityLabel
    main.querySelector('#stage-heading')!.textContent = copy.stageHeading
    main.querySelector('#engineering-heading')!.textContent = copy.engineeringHeading
    main.querySelector('#legend-heading')!.textContent = commonNow.legendHeading
    main.querySelector('#help-heading')!.textContent = commonNow.helpHeading
    main.querySelector('#help-intro')!.textContent = copy.helpIntro
    refs.timeline.setAttribute('aria-label', commonNow.timelineAria)
    refs.intensity.setAttribute('aria-label', copy.intensityAria)
    refs.canvasWrap.setAttribute('aria-label', copy.canvasAria)
    header.querySelector('#lang-toggle')!.textContent = commonNow.langToggle
    header.querySelector('#lang-toggle')!.setAttribute('aria-label', commonNow.langToggleAria)
    header.querySelector('#back-hub')!.setAttribute('aria-label', copy.backToHubAria)

    refs.legendList.innerHTML = copy.legend
      .map(
        (item) =>
          `<li><span class="legend-swatch" style="background:${item.color}"></span>${item.label}</li>`,
      )
      .join('')

    const kbd = [...commonNow.keyboard, ...(options.extraKeyboard ?? [])]
    refs.keyboardList.innerHTML = kbd.map((k) => `<li><kbd>${k.keys}</kbd> ${k.action}</li>`).join('')

    footer.querySelector('#footer-meta')!.innerHTML = `<span>${commonNow.footerVersion} ${APP_VERSION}</span><span>${commonNow.footerUpdated} ${UPDATE_DATE}</span>`

    syncExplainBtn()
    syncTransport()
    buildSpeedButtons()
    renderReadouts()
    renderStage()
    options.onLocaleChange?.()
  }

  function setTime(sec: number) {
    timeSec = Math.max(0, Math.min(TIMELINE_DURATION, sec))
    refs.timeline.value = String(timeSec)
    options.onTimeChange?.(timeSec)
    renderStage()
    renderReadouts()
  }

  refs.timeline.addEventListener('input', () => {
    playing = false
    syncTransport()
    setTime(parseFloat(refs.timeline.value))
  })

  refs.intensity.addEventListener('input', () => {
    options.onIntensityChange?.(parseFloat(refs.intensity.value))
    renderReadouts()
  })

  refs.playBtn.addEventListener('click', () => {
    playing = !playing
    lastFrame = performance.now()
    syncTransport()
  })

  refs.reverseBtn.addEventListener('click', () => {
    reverse = !reverse
    syncTransport()
  })

  refs.resetBtn.addEventListener('click', () => {
    playing = false
    reverse = false
    syncTransport()
    setTime(0)
  })

  refs.explainBtn.addEventListener('click', () => {
    explainMode = explainMode === 'simple' ? 'engineering' : 'simple'
    setExplainMode(explainMode)
    syncExplainBtn()
    renderReadouts()
    renderStage()
  })

  header.querySelector('#lang-toggle')!.addEventListener('click', () => {
    toggleLocale()
    applyLocale()
  })

  header.querySelector('#back-hub')!.addEventListener('click', (e) => {
    e.preventDefault()
    location.hash = '#/'
  })

  window.addEventListener('keydown', onKey)
  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return
    switch (e.key) {
      case ' ':
        e.preventDefault()
        playing = !playing
        lastFrame = performance.now()
        syncTransport()
        break
      case 'ArrowRight':
        setTime(timeSec + 0.5)
        break
      case 'ArrowLeft':
        setTime(timeSec - 0.5)
        break
      case 'Home':
        setTime(0)
        break
      case 'End':
        setTime(TIMELINE_DURATION)
        break
      case 'r':
      case 'R':
        reverse = !reverse
        syncTransport()
        break
      default:
        break
    }
  }

  let raf = 0
  function tick(now: number) {
    if (playing) {
      const dt = (now - lastFrame) / 1000
      const dir = reverse ? -1 : 1
      let next = timeSec + dt * dir * playbackSpeed
      if (next >= TIMELINE_DURATION) {
        next = TIMELINE_DURATION
        playing = false
        syncTransport()
      } else if (next <= 0) {
        next = 0
        playing = false
        syncTransport()
      }
      setTime(next)
    }
    lastFrame = now
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  applyLocale()
  void options.onMount(refs)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKey)
  }
}

function buildMetricRow(m: MetricCopy, value: string, mode: ExplainMode): HTMLElement {
  const row = document.createElement('div')
  row.className = 'readout-row'
  if (mode === 'simple') {
    row.innerHTML = `
      <dt>${m.label}</dt>
      <dd class="metric-value">${value} <span class="unit">${m.unit !== '—' && m.unit !== 'count' && m.unit !== '戶' ? m.unit : ''}</span></dd>
      <dd class="metric-simple">${m.simple}</dd>
    `
  } else {
    row.innerHTML = `
      <dt>${m.label} <span class="metric-symbol">(${m.symbol})</span></dt>
      <dd class="metric-value">${value} <span class="unit">${m.unit !== '—' && m.unit !== 'count' && m.unit !== '戶' ? m.unit : ''}</span></dd>
      <dd class="metric-formula">${m.formula}</dd>
    `
  }
  return row
}
