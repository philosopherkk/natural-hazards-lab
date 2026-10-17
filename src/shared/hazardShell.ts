import { APP_VERSION, UPDATE_DATE } from '../version'
import {
  getCatalog,
  getHazardCopy,
  stageIndexForTime,
  stageTimeRangeFor,
  TIMELINE_DURATION,
  toggleLocale,
  type HazardId,
  type MetricIdFor,
} from '../i18n'
import type { ConditionCopy, HazardCopy, MetricCopy, StageCopy } from '../i18n/types'
import { clampCondition, loadConditionValues, saveConditionValues, type NumericSpec } from './conditionsStore'
import { getExplainMode, setExplainMode, type ExplainMode } from './explainMode'
import {
  getPlaybackSpeed,
  PLAYBACK_SPEED_OPTIONS,
  setPlaybackSpeed,
  type PlaybackSpeed,
} from './playbackSpeed'

export interface HazardShellOptions<H extends HazardId> {
  hazard: H
  defaultIntensity?: number
  onMount: (root: HazardShellRefs) => void | Promise<void>
  onTimeChange?: (timeSec: number) => void
  onIntensityChange?: (intensity: number) => void
  onConditionsChange?: (values: Record<string, number>) => void
  formatMetric: (metricId: MetricIdFor<H>) => string
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
  getConditions: () => Record<string, number>
}

export function mountHazardShell<H extends HazardId>(options: HazardShellOptions<H>): () => void {
  const app = document.querySelector('#app')!
  app.innerHTML = ''
  app.className = 'layout'

  const hazardCopy: HazardCopy = getHazardCopy(options.hazard)
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
      <section class="side-block conditions-panel" id="conditions-panel">
        <h2 id="conditions-heading"></h2>
        <div id="conditions-root" class="conditions-list"></div>
      </section>
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
  const conditionSpecs: Record<string, NumericSpec> = {}
  for (const condition of hazardCopy.conditions ?? []) {
    conditionSpecs[condition.id] = condition
  }
  let conditionValues = loadConditionValues(options.hazard, conditionSpecs)
  const conditionsPanel = main.querySelector('#conditions-panel') as HTMLElement
  const conditionsRoot = main.querySelector('#conditions-root') as HTMLElement

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
    getConditions: () => ({ ...conditionValues }),
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
    main.querySelector('#conditions-heading')!.textContent = commonNow.conditionsHeading
    conditionsPanel.setAttribute('aria-label', commonNow.conditionsAria)
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
    renderConditions()
    renderReadouts()
    renderStage()
    options.onLocaleChange?.()
  }

  function formatConditionNumber(value: number, step: number): string {
    const decimals = step < 1 ? Math.min(3, (step.toString().split('.')[1] ?? '').length) : 0
    return value.toFixed(decimals)
  }

  function commitCondition(id: string, raw: number) {
    const spec = conditionSpecs[id]
    if (!spec) return
    conditionValues[id] = clampCondition(raw, spec)
    saveConditionValues(options.hazard, conditionValues)
    options.onConditionsChange?.({ ...conditionValues })
    renderReadouts()
  }

  function renderConditions() {
    const copy = getHazardCopy(options.hazard)
    const list: readonly ConditionCopy[] = copy.conditions ?? []
    conditionsPanel.hidden = list.length === 0
    conditionsRoot.innerHTML = ''
    for (const condition of list) {
      const value = conditionValues[condition.id] ?? condition.defaultValue
      conditionValues[condition.id] = value
      conditionsRoot.appendChild(buildConditionControl(condition, value, explainMode))
    }
  }

  function buildConditionControl(condition: ConditionCopy, value: number, mode: ExplainMode): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'condition'
    const shown = formatConditionNumber(value, condition.step)
    const note = mode === 'simple' ? condition.simple : condition.equation
    wrap.innerHTML = `
      <div class="condition-head">
        <label for="cond-${options.hazard}-${condition.id}">${condition.label} <span class="metric-symbol">(${condition.symbol})</span></label>
        <span class="condition-value">
          <input type="number" id="cond-num-${options.hazard}-${condition.id}" min="${condition.min}" max="${condition.max}" step="${condition.step}" value="${shown}" aria-label="${condition.aria}" />
          <span class="unit">${condition.unit}</span>
        </span>
      </div>
      <input type="range" id="cond-${options.hazard}-${condition.id}" min="${condition.min}" max="${condition.max}" step="${condition.step}" value="${shown}" aria-valuemin="${condition.min}" aria-valuemax="${condition.max}" aria-valuenow="${shown}" />
      <p class="condition-bounds">${formatConditionNumber(condition.min, condition.step)}–${formatConditionNumber(condition.max, condition.step)} ${condition.unit}</p>
      <p class="condition-note">${note}</p>
    `
    const range = wrap.querySelector('input[type="range"]') as HTMLInputElement
    const number = wrap.querySelector('input[type="number"]') as HTMLInputElement
    const syncPair = (next: number, source: 'range' | 'number') => {
      const spec = conditionSpecs[condition.id]
      if (!spec) return
      const snapped = clampCondition(next, spec)
      const text = formatConditionNumber(snapped, spec.step)
      if (source !== 'range') range.value = text
      if (source !== 'number') number.value = text
      range.setAttribute('aria-valuenow', text)
      commitCondition(condition.id, snapped)
    }
    range.addEventListener('input', () => syncPair(parseFloat(range.value), 'range'))
    number.addEventListener('input', () => {
      const parsed = parseFloat(number.value)
      if (!Number.isFinite(parsed) || parsed < condition.min || parsed > condition.max) return
      syncPair(parsed, 'number')
    })
    number.addEventListener('change', () => syncPair(parseFloat(number.value), 'number'))
    return wrap
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
    renderConditions()
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
      if (dt > 0) {
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
