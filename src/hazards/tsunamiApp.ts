import { computeTsunamiState } from '../model/tsunamiModel'
import { getCatalog, getHazardCopy } from '../i18n'
import { formatTsunamiMetric } from '../shared/formatMetricValue'
import { mountHazardShell } from '../shared/hazardShell'
import { hazardLoadingMessage } from '../shared/hazardSceneInit'
import { TsunamiScene } from '../scene/TsunamiScene'
import { WebGLUnavailableError } from '../scene/sceneBootstrap'

export function mountTsunamiApp(): () => void {
  let scene: TsunamiScene | null = null
  let intensity = 0.65

  const shellTeardown = mountHazardShell({
    hazard: 'tsunami',
    formatMetric: (id) =>
      formatTsunamiMetric(id, scene?.getState() ?? computeTsunamiState(0, intensity)),
    onIntensityChange: (v) => {
      intensity = v
      scene?.setIntensity(v)
    },
    onTimeChange: (t) => scene?.setTime(t),
    onMount: async (refs) => {
      const copy = getHazardCopy('tsunami')
      const common = getCatalog().common
      refs.loading.textContent = copy.loadingWebgl
      try {
        scene = await TsunamiScene.create(refs.canvasWrap, (step) => {
          refs.loading.textContent = hazardLoadingMessage('tsunami', step)
        })
        intensity = parseFloat(refs.intensity.value)
        scene.setIntensity(intensity)
        scene.setTime(0)
        scene.start()
        refs.loading.hidden = true
        refs.refreshReadouts()
      } catch (err) {
        const msg =
          err instanceof WebGLUnavailableError
            ? common.webglUnavailable
            : err instanceof Error
              ? err.message
              : String(err)
        refs.loading.textContent = `${common.loadingFailed}: ${msg}`
      }
    },
  })

  return () => {
    scene?.dispose()
    scene = null
    shellTeardown()
  }
}
