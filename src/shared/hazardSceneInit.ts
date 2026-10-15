import { getCatalog, getHazardCopy, type HazardId } from '../i18n'
import type { SceneInitStep } from '../scene/sceneBootstrap'

export function hazardLoadingMessage(hazard: HazardId, step: SceneInitStep): string {
  const copy = getHazardCopy(hazard)
  const common = getCatalog().common
  switch (step) {
    case 'webgl':
      return copy.loadingWebgl
    case 'terrain':
    case 'model':
      return copy.loadingModel
    case 'effects':
      return copy.loadingEffects
    case 'interactive':
    default:
      return common.loading
  }
}
