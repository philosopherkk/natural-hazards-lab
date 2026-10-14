import { hazardFromHash, mountHub } from './hub'
import { initLocale } from './i18n'
import { mountAvalancheApp } from './hazards/avalancheApp'
import { mountEarthquakeApp } from './hazards/earthquakeApp'
import { mountTsunamiApp } from './hazards/tsunamiApp'
import { mountVolcanoApp } from './hazards/volcanoApp'

let teardown: (() => void) | null = null

function navigate() {
  teardown?.()
  teardown = null

  const target = hazardFromHash(location.hash)
  switch (target) {
    case 'volcano':
      teardown = mountVolcanoApp()
      break
    case 'avalanche':
      teardown = mountAvalancheApp()
      break
    case 'tsunami':
      teardown = mountTsunamiApp()
      break
    case 'earthquake':
      teardown = mountEarthquakeApp()
      break
    case 'hub':
    default:
      mountHub()
      break
  }
}

export function initRouter(): void {
  initLocale()
  window.addEventListener('hashchange', navigate)
  if (!location.hash || location.hash === '#') {
    location.hash = '#/'
  }
  navigate()
}
