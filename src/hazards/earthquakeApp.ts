import { computeEarthquakeState, resolveEarthquakeConditions, EARTHQUAKE_CONDITION_SPECS } from '../model/earthquakeModel'
import { getCatalog, getHazardCopy } from '../i18n'
import { loadConditionValues } from '../shared/conditionsStore'
import { formatEarthquakeMetric } from '../shared/formatMetricValue'
import { mountHazardShell } from '../shared/hazardShell'
import { hazardLoadingMessage } from '../shared/hazardSceneInit'
import { EarthquakeScene } from '../scene/EarthquakeScene'
import { WebGLUnavailableError } from '../scene/sceneBootstrap'

export function mountEarthquakeApp(): () => void {
  let scene: EarthquakeScene | null = null
  let intensity = 0.65
  let conditions = loadConditionValues('earthquake', EARTHQUAKE_CONDITION_SPECS)

  const shellTeardown = mountHazardShell({
    hazard: 'earthquake',
    formatMetric: (id) =>
      formatEarthquakeMetric(
        id,
        scene?.getState() ?? computeEarthquakeState(0, intensity, resolveEarthquakeConditions(conditions)),
      ),
    onIntensityChange: (v) => {
      intensity = v
      scene?.setIntensity(v)
    },
    onConditionsChange: (values) => {
      conditions = values
      scene?.setConditions(resolveEarthquakeConditions(values))
    },
    onTimeChange: (t) => scene?.setTime(t),
    onMount: async (refs) => {
      const copy = getHazardCopy('earthquake')
      const common = getCatalog().common
      refs.loading.textContent = copy.loadingWebgl
      try {
        scene = await EarthquakeScene.create(refs.canvasWrap, (step) => {
          refs.loading.textContent = hazardLoadingMessage('earthquake', step)
        })
        intensity = parseFloat(refs.intensity.value)
        conditions = refs.getConditions()
        scene.setConditions(resolveEarthquakeConditions(conditions))
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
