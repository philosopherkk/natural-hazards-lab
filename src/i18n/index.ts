import { enCatalog } from './catalog/en'
import { zhTWCatalog } from './catalog/zh-TW'
import type { HazardId, Locale, LocaleCatalog } from './types'

export type { HazardId, Locale, LocaleCatalog } from './types'
import { avalancheStageIndex } from '../model/avalancheModel'
import { earthquakeStageIndex } from '../model/earthquakeModel'
import { tsunamiStageIndex } from '../model/tsunamiModel'

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
      if (seconds < 6) return 0
      if (seconds < 10) return 1
      if (seconds < 14) return 2
      if (seconds < 24) return 3
      return 4
  }
}

/** Volcano-only alias */
export function volcanoStageIndexForTime(seconds: number): number {
  return stageIndexForTime('volcano', seconds)
}
