export type Locale = 'en' | 'zh-TW'

export type HazardId = 'volcano' | 'avalanche' | 'tsunami' | 'earthquake'

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
  /** Optional hazard-specific toggles (volcano cutaway/labels). */
  toggles?: { id: string; label: string; aria: string }[]
  /** Volcano anatomy labels (3D callouts). */
  sceneLabels?: {
    chamber: string
    conduit: string
    crater: string
    lavaFlow: string
    plume: string
  }
  stages: StageCopy[]
  legend: LegendItem[]
  metrics: MetricCopy[]
}

export interface HubCopy {
  appTitle: string
  appSubtitle: string
  pickHazard: string
  cards: { id: HazardId; title: string; blurb: string; icon: string }[]
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
  legendHeading: string
  helpHeading: string
  footerVersion: string
  footerUpdated: string
  loading: string
  loadingFailed: string
  webglUnavailable: string
  playbackSpeed: string
  playbackSpeedAria: string
  playbackSpeedOptionAria: (rate: number) => string
  keyboard: KeyboardHint[]
}

export interface LocaleCatalog {
  common: CommonCopy
  hub: HubCopy
  hazards: Record<HazardId, HazardCopy>
}
