import { isHazardId, type HazardId } from './hazards/registry'
import { getCatalog, initLocale, toggleLocale } from './i18n'
import { APP_VERSION, UPDATE_DATE } from './version'

export function mountHub(): void {
  initLocale()
  const catalog = getCatalog()
  const app = document.querySelector('#app')!
  app.innerHTML = ''
  app.className = 'layout hub-layout'

  const header = document.createElement('header')
  header.className = 'top-bar'
  header.innerHTML = `
    <div class="brand">
      <h1>${catalog.hub.appTitle}</h1>
      <p class="subtitle">${catalog.hub.appSubtitle}</p>
    </div>
    <button type="button" id="lang-toggle" class="btn btn-ghost">${catalog.common.langToggle}</button>
  `
  app.appendChild(header)

  const main = document.createElement('main')
  main.className = 'hub-grid'
  main.innerHTML = `<h2 class="hub-pick">${catalog.hub.pickHazard}</h2>`

  const grid = document.createElement('div')
  grid.className = 'hazard-cards'
  grid.setAttribute('role', 'list')

  for (const card of catalog.hub.cards) {
    const a = document.createElement('a')
    a.href = `#/${card.id}`
    a.className = 'hazard-card'
    a.setAttribute('role', 'listitem')
    a.innerHTML = `
      <span class="hazard-icon" aria-hidden="true">${card.icon}</span>
      <h3>${card.title}</h3>
      <p>${card.blurb}</p>
    `
    grid.appendChild(a)
  }
  main.appendChild(grid)
  app.appendChild(main)

  const footer = document.createElement('footer')
  footer.className = 'site-footer'
  footer.innerHTML = `<div class="footer-meta"><span>${catalog.common.footerVersion} ${APP_VERSION}</span><span>${catalog.common.footerUpdated} ${UPDATE_DATE}</span></div>`
  app.appendChild(footer)

  document.title = catalog.hub.appTitle

  header.querySelector('#lang-toggle')!.addEventListener('click', () => {
    toggleLocale()
    mountHub()
  })
}

export function hazardFromHash(hash: string): HazardId | 'hub' {
  const path = hash.replace(/^#\/?/, '').split('?')[0]?.toLowerCase() ?? ''
  if (isHazardId(path)) return path
  return 'hub'
}
