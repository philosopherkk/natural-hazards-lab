const STORAGE_KEY = 'hazards-lab-explain-mode'

export type ExplainMode = 'simple' | 'engineering'

export function initExplainMode(): ExplainMode {
  const stored = localStorage.getItem(STORAGE_KEY) as ExplainMode | null
  if (stored === 'simple' || stored === 'engineering') return stored
  return 'engineering'
}

export function getExplainMode(): ExplainMode {
  return initExplainMode()
}

export function setExplainMode(mode: ExplainMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
}

export function toggleExplainMode(): ExplainMode {
  const next = getExplainMode() === 'simple' ? 'engineering' : 'simple'
  setExplainMode(next)
  return next
}
