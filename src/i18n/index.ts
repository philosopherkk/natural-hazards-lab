import { enCatalog } from './catalog/en'
import { zhTWCatalog } from './catalog/zh-TW'
import type { HazardId, Locale, LocaleCatalog } from './types'
import type { StageBand } from './hazards/stageUtils'

export type { HazardId, Locale, LocaleCatalog } from './types'
import {
  avalancheStageIndex,
  earthquakeStageIndex,
  stageBandFor,
  tsunamiStageIndex,
  volcanoStageIndex,
} from './hazards'

const STORAGE_KEY = 'hazards-lab-locale'

const catalogs: Record<Locale, LocaleCatalog> = {
  en: enCatalog,
  'zh-TW': zhTWCatalog,
}

let currentLocale: Locale = 'en'

export function getLocale(): Locale {
  return currentLocale
}

export function getCatalog(): LocaleCatalog {
  return catalogs[currentLocale]
}

export function getHazardCopy(id: HazardId) {
  return getCatalog().hazards[id]
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

export function stageIndexForTime(hazard: HazardId, seconds: number): number {
  switch (hazard) {
    case 'avalanche':
      return avalancheStageIndex(seconds)
    case 'tsunami':
      return tsunamiStageIndex(seconds)
    case 'earthquake':
      return earthquakeStageIndex(seconds)
    case 'volcano':
    default:
      return volcanoStageIndex(seconds)
  }
}

/** Volcano-only alias */
export function volcanoStageIndexForTime(seconds: number): number {
  return stageIndexForTime('volcano', seconds)
}

export function stageTimeRangeFor(hazard: HazardId, stageIndex: number): StageBand {
  return stageBandFor(hazard, stageIndex)
}

export type { StageBand } from './hazards/stageUtils'
