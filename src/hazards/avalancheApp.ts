import { computeAvalancheState, resolveAvalancheConditions, AVALANCHE_CONDITION_SPECS } from '../model/avalancheModel'
import { getCatalog, getHazardCopy } from '../i18n'
import { loadConditionValues } from '../shared/conditionsStore'
import { formatAvalancheMetric } from '../shared/formatMetricValue'
import { mountHazardShell } from '../shared/hazardShell'
import { hazardLoadingMessage } from '../shared/hazardSceneInit'
import { AvalancheScene } from '../scene/AvalancheScene'
import { WebGLUnavailableError } from '../scene/sceneBootstrap'

export function mountAvalancheApp(): () => void {
  let scene: AvalancheScene | null = null
  let intensity = 0.65
  let conditions = loadConditionValues('avalanche', AVALANCHE_CONDITION_SPECS)

  const shellTeardown = mountHazardShell({
    hazard: 'avalanche',
    formatMetric: (id) =>
      formatAvalancheMetric(
        id,
        scene?.getState() ?? computeAvalancheState(0, intensity, resolveAvalancheConditions(conditions)),
      ),
    onIntensityChange: (v) => {
      intensity = v
      scene?.setIntensity(v)
    },
    onConditionsChange: (values) => {
      conditions = values
      scene?.setConditions(resolveAvalancheConditions(values))
    },
    onTimeChange: (t) => scene?.setTime(t),
    onMount: async (refs) => {
      const copy = getHazardCopy('avalanche')
      const common = getCatalog().common
      refs.loading.textContent = copy.loadingWebgl
      try {
        scene = await AvalancheScene.create(refs.canvasWrap, (step) => {
          refs.loading.textContent = hazardLoadingMessage('avalanche', step)
        })
        intensity = parseFloat(refs.intensity.value)
        conditions = refs.getConditions()
        scene.setConditions(resolveAvalancheConditions(conditions))
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
