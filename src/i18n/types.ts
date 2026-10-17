import type { HazardId } from '../hazards/registry'

export type { HazardId }

export type Locale = 'en' | 'zh-TW'

export interface StageCopy {
  id: string
  title: string
  descriptionEngineering: string
  descriptionSimple: string
}

export interface LegendItem {
  color: string
  label: string
}

export interface KeyboardHint {
  keys: string
  action: string
}

export interface MetricCopy {
  id: string
  label: string
  symbol: string
  unit: string
  /** One-line formula reference for engineering mode. */
  formula: string
  simple: string
}

/** Expert slider. The value is an input to the hazard model, not a display-only multiplier. */
export interface ConditionCopy {
  id: string
  label: string
  symbol: string
  unit: string
  min: number
  max: number
  step: number
  defaultValue: number
  /** Engineering mode: the equation this input enters. */
  equation: string
  /** Simple mode: one plain sentence. */
  simple: string
  aria: string
}

export interface HazardCopy {
  id: HazardId
  title: string
  subtitle: string
  intensityLabel: string
  intensityAria: string
  canvasAria: string
  helpIntro: string
  stageHeading: string
  engineeringHeading: string
  explainSimple: string
  explainEngineering: string
  explainToggleAria: string
  backToHub: string
  backToHubAria: string
  loadingWebgl: string
  loadingModel: string
  loadingEffects: string
  /** Expert physical conditions. Empty hides the panel. */
  conditions?: readonly ConditionCopy[]
  /** Optional hazard-specific toggles (volcano cutaway/labels). */
  toggles?: readonly { id: string; label: string; aria: string }[]
  /** Volcano anatomy labels (3D callouts). */
  sceneLabels?: {
    chamber: string
    conduit: string
    crater: string
    lavaFlow: string
    plume: string
  }
  stages: readonly StageCopy[]
  legend: readonly LegendItem[]
  metrics: readonly MetricCopy[]
}

export interface HubCopy {
  appTitle: string
  appSubtitle: string
  pickHazard: string
  cards: readonly { id: HazardId; title: string; blurb: string; icon: string }[]
}

export interface CommonCopy {
  htmlLang: string
  langToggle: string
  langToggleAria: string
  timeline: string
  timelineAria: string
  play: string
  pause: string
  reverse: string
  reverseAria: string
  reset: string
  resetAria: string
  stageTime: string
  /** Label for the active timeline step window, e.g. "Step window". */
  stageStepWindow: string
  legendHeading: string
  helpHeading: string
  conditionsHeading: string
  conditionsAria: string
  footerVersion: string
  footerUpdated: string
  loading: string
  loadingFailed: string
  webglUnavailable: string
  playbackSpeed: string
  playbackSpeedAria: string
  playbackSpeedOptionAria: (rate: number) => string
  keyboard: readonly KeyboardHint[]
}

export interface LocaleCatalog {
  common: CommonCopy
  hub: HubCopy
  hazards: Record<HazardId, HazardCopy>
}
