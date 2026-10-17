import { hazardFromHash, mountHub } from './hub'
import { initLocale } from './i18n'
import { HAZARDS } from './hazards/registry'

let teardown: (() => void) | null = null

function navigate() {
  teardown?.()
  teardown = null

  const target = hazardFromHash(location.hash)
  if (target === 'hub') {
    mountHub()
    return
  }
  teardown = HAZARDS[target].mount()
}

export function initRouter(): void {
  initLocale()
  window.addEventListener('hashchange', navigate)
  if (!location.hash || location.hash === '#') {
    location.hash = '#/'
  }
  navigate()
}
