import { enCatalog } from './catalog/en'
import { zhTWCatalog } from './catalog/zh-TW'
import type { Locale } from './types'
import type { StageBand } from './hazards/stageUtils'
import { stageBandFor, stageIndexForTime, type HazardId } from '../hazards/registry'

export type { HazardId, Locale, LocaleCatalog } from './types'
export { stageBandFor, stageIndexForTime }

const STORAGE_KEY = 'hazards-lab-locale'

const catalogs = {
  en: enCatalog,
  'zh-TW': zhTWCatalog,
} as const

export type MetricIdFor<H extends HazardId> = (typeof catalogs)[Locale]['hazards'][H]['metrics'][number]['id']

let currentLocale: Locale = 'en'

export function getLocale(): Locale {
  return currentLocale
}

export function getCatalog() {
  return catalogs[currentLocale]
}

export function getHazardCopy<H extends HazardId>(id: H) {
  return catalogs[currentLocale].hazards[id]
}

/** @deprecated use getCatalog().common — kept for volcano keyboard extras */
export function getTranslations() {
  return getCatalog()
}

export function initLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored && stored in catalogs) {
    currentLocale = stored
  } else {
    const nav = navigator.language
    currentLocale = nav.startsWith('zh') ? 'zh-TW' : 'en'
  }
  document.documentElement.lang = getCatalog().common.htmlLang
  return currentLocale
}

export function toggleLocale(): Locale {
  currentLocale = currentLocale === 'en' ? 'zh-TW' : 'en'
  localStorage.setItem(STORAGE_KEY, currentLocale)
  document.documentElement.lang = getCatalog().common.htmlLang
  return currentLocale
}

export const TIMELINE_DURATION = 30

/** Volcano-only alias */
export function volcanoStageIndexForTime(seconds: number): number {
  return stageIndexForTime('volcano', seconds)
}

export function stageTimeRangeFor(hazard: HazardId, stageIndex: number): StageBand {
  return stageBandFor(hazard, stageIndex)
}

export type { StageBand } from './hazards/stageUtils'
