export type Locale = 'en' | 'zh-TW'

export interface StageCopy {
  id: string
  title: string
  description: string
}

export interface LegendItem {
  color: string
  label: string
}

export interface KeyboardHint {
  keys: string
  action: string
}

export interface Translations {
  htmlLang: string
  appTitle: string
  appSubtitle: string
  langToggle: string
  langToggleAria: string
  timeline: string
  timelineAria: string
  intensity: string
  intensityAria: string
  cutaway: string
  cutawayAria: string
  labels: string
  labelsAria: string
  play: string
  pause: string
  reverse: string
  reverseAria: string
  reset: string
  resetAria: string
  stageHeading: string
  stageTime: string
  legendHeading: string
  helpHeading: string
  helpIntro: string
  footerVersion: string
  footerUpdated: string
  canvasAria: string
  loading: string
  loadingWebgl: string
  loadingTextures: string
  loadingModel: string
  loadingEffects: string
  stages: StageCopy[]
  legend: LegendItem[]
  keyboard: KeyboardHint[]
  labelChamber: string
  labelConduit: string
  labelCrater: string
  labelLavaFlow: string
  labelPlume: string
  engineeringHeading: string
  readoutPChamber: string
  readoutTMagma: string
  readoutViscosity: string
  readoutFlowQ: string
  readoutEffusion: string
  readoutLavaFront: string
  readoutStructures: string
  readoutMeltFraction: string
  unitMPa: string
  unitCelsius: string
  unitPas: string
  unitM3s: string
  unitMeters: string
}
