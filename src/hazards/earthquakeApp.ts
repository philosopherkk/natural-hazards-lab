import { computeEarthquakeState } from '../model/earthquakeModel'
import { getHazardCopy } from '../i18n'
import { formatEarthquakeMetric } from '../shared/formatMetricValue'
import { mountHazardShell } from '../shared/hazardShell'
import { EarthquakeScene } from '../scene/EarthquakeScene'

export function mountEarthquakeApp(): () => void {
  let scene: EarthquakeScene | null = null
  let intensity = 0.65

  return mountHazardShell({
    hazard: 'earthquake',
    formatMetric: (id) =>
      formatEarthquakeMetric(id, scene?.getState() ?? computeEarthquakeState(0, intensity)),
    onIntensityChange: (v) => {
      intensity = v
      scene?.setIntensity(v)
    },
    onTimeChange: (t) => scene?.setTime(t),
    onMount: async (refs) => {
      const copy = getHazardCopy('earthquake')
      refs.loading.textContent = copy.loadingWebgl
      scene = await EarthquakeScene.create(refs.canvasWrap)
      intensity = parseFloat(refs.intensity.value)
      scene.setIntensity(intensity)
      scene.setTime(0)
      refs.loading.hidden = true
      refs.refreshReadouts()
      scene.start()
    },
  })
}
