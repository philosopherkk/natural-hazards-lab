import { computeTsunamiState } from '../model/tsunamiModel'
import { getHazardCopy } from '../i18n'
import { formatTsunamiMetric } from '../shared/formatMetricValue'
import { mountHazardShell } from '../shared/hazardShell'
import { TsunamiScene } from '../scene/TsunamiScene'

export function mountTsunamiApp(): () => void {
  let scene: TsunamiScene | null = null
  let intensity = 0.65

  return mountHazardShell({
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
      refs.loading.textContent = copy.loadingWebgl
      scene = await TsunamiScene.create(refs.canvasWrap)
      intensity = parseFloat(refs.intensity.value)
      scene.setIntensity(intensity)
      scene.setTime(0)
      refs.loading.hidden = true
      refs.refreshReadouts()
      scene.start()
    },
  })
}
