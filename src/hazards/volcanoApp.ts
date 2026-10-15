import { getCatalog, getHazardCopy } from '../i18n'
import { computeEruptionState, resolveVolcanoConditions, VOLCANO_CONDITION_SPECS } from '../model/eruptionModel'
import { loadConditionValues } from '../shared/conditionsStore'
import { formatVolcanoMetric } from '../shared/formatMetricValue'
import { mountHazardShell, type HazardShellRefs } from '../shared/hazardShell'
import { VolcanoScene, type InitProgressStep } from '../scene/VolcanoScene'
import { WebGLUnavailableError } from '../scene/sceneBootstrap'

export function mountVolcanoApp(): () => void {
  let scene: VolcanoScene | null = null
  let intensity = 0.65
  let conditions = loadConditionValues('volcano', VOLCANO_CONDITION_SPECS)

  const shellTeardown = mountHazardShell({
    hazard: 'volcano',
    defaultIntensity: intensity,
    extraKeyboard: [
      { keys: 'C', action: 'Toggle cutaway interior' },
      { keys: 'L', action: 'Toggle anatomy labels' },
    ],
    onLocaleChange: () => {
      const labels = getHazardCopy('volcano').sceneLabels
      if (labels && scene) scene.updateLabelTexts(labels)
    },
    formatMetric: (id) => {
      const st = scene?.getLastState() ?? computeEruptionState(0, intensity, resolveVolcanoConditions(conditions))
      return formatVolcanoMetric(id, st)
    },
    onIntensityChange: (v) => {
      intensity = v
      scene?.setIntensity(v)
    },
    onConditionsChange: (values) => {
      conditions = values
      scene?.setConditions(resolveVolcanoConditions(values))
    },
    onTimeChange: (t) => scene?.setTime(t),
    onMount: (refs) => initVolcano(refs),
  })

  return () => {
    scene?.dispose()
    scene = null
    shellTeardown()
  }

  async function initVolcano(refs: HazardShellRefs) {
    const copy = getHazardCopy('volcano')
    const common = getCatalog().common
    try {
      scene = await VolcanoScene.create(refs.canvasWrap, (step: InitProgressStep) => {
        refs.loading.textContent = loadingMsg(step, copy)
      })
      const cut = refs.queryToggle('cutaway')
      const labels = refs.queryToggle('labels')
      scene.setCutaway(cut?.checked ?? true)
      scene.setLabelsVisible(labels?.checked ?? true)
      conditions = refs.getConditions()
      scene.setConditions(resolveVolcanoConditions(conditions))
      scene.setIntensity(parseFloat(refs.intensity.value))
      scene.setTime(0)
      intensity = parseFloat(refs.intensity.value)

      cut?.addEventListener('change', () => scene?.setCutaway(cut.checked))
      labels?.addEventListener('change', () => scene?.setLabelsVisible(labels.checked))

      window.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement) return
        if (e.key === 'c' || e.key === 'C') {
          if (cut) {
            cut.checked = !cut.checked
            scene?.setCutaway(cut.checked)
          }
        }
        if (e.key === 'l' || e.key === 'L') {
          if (labels) {
            labels.checked = !labels.checked
            scene?.setLabelsVisible(labels.checked)
          }
        }
      })

      scene.onEngineeringReadout(() => refs.refreshReadouts())
      const sl = copy.sceneLabels
      if (sl) scene.updateLabelTexts(sl)
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
  }
}

function loadingMsg(step: InitProgressStep, copy: ReturnType<typeof getHazardCopy>): string {
  switch (step) {
    case 'webgl':
      return copy.loadingWebgl
    case 'textures':
      return getCatalog().common.loading
    case 'model':
      return copy.loadingModel
    case 'effects':
      return copy.loadingEffects
    default:
      return getCatalog().common.loading
  }
}
