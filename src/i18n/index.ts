import { en } from './en'
import { zhTW } from './zh-TW'
import type { Locale, Translations } from './types'

const STORAGE_KEY = 'volcano-lab-locale'

const catalogs: Record<Locale, Translations> = {
  en,
  'zh-TW': zhTW,
}

let currentLocale: Locale = 'en'

export function getLocale(): Locale {
  return currentLocale
}

export function getTranslations(): Translations {
  return catalogs[currentLocale]
}

export function initLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored && stored in catalogs) {
    currentLocale = stored
  } else {
    const nav = navigator.language
    currentLocale = nav.startsWith('zh') ? 'zh-TW' : 'en'
  }
  document.documentElement.lang = getTranslations().htmlLang
  return currentLocale
}

export function toggleLocale(): Locale {
  currentLocale = currentLocale === 'en' ? 'zh-TW' : 'en'
  localStorage.setItem(STORAGE_KEY, currentLocale)
  document.documentElement.lang = getTranslations().htmlLang
  return currentLocale
}

export function stageIndexForTime(seconds: number): number {
  if (seconds < 6) return 0
  if (seconds < 10) return 1
  if (seconds < 14) return 2
  if (seconds < 24) return 3
  return 4
}

export const TIMELINE_DURATION = 30
