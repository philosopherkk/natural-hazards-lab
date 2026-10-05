const DEV = import.meta.env.DEV

export function yieldFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function logInitPhase(label: string, startMs: number): void {
  if (!DEV) return
  console.log(`[volcano:init] ${label} +${(performance.now() - startMs).toFixed(1)}ms`)
}

export function scheduleIdle(task: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => task(), { timeout: 2000 })
  } else {
    setTimeout(task, 16)
  }
}
