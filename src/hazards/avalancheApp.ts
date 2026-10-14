import { computeAvalancheState } from '../model/avalancheModel'
import { getHazardCopy } from '../i18n'
import { formatAvalancheMetric } from '../shared/formatMetricValue'
import { mountHazardShell } from '../shared/hazardShell'
import { AvalancheScene } from '../scene/AvalancheScene'

export function mountAvalancheApp(): () => void {
  let scene: AvalancheScene | null = null
  let intensity = 0.65

  return mountHazardShell({
    hazard: 'avalanche',
    formatMetric: (id) =>
      formatAvalancheMetric(id, scene?.getState() ?? computeAvalancheState(0, intensity)),
    onIntensityChange: (v) => {
      intensity = v
      scene?.setIntensity(v)
    },
    onTimeChange: (t) => scene?.setTime(t),
    onMount: async (refs) => {
      const copy = getHazardCopy('avalanche')
      refs.loading.textContent = copy.loadingWebgl
      scene = await AvalancheScene.create(refs.canvasWrap)
      intensity = parseFloat(refs.intensity.value)
      scene.setIntensity(intensity)
      scene.setTime(0)
      refs.loading.hidden = true
      refs.refreshReadouts()
      scene.start()
    },
  })
}
