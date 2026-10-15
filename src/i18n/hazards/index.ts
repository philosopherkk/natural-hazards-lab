import type { HazardId } from '../types'
import type { StageBand } from './stageUtils'
import {
  avalancheStageBand,
  avalancheStageIndex,
  avalancheStagesEn,
  avalancheStagesZhTW,
} from './avalanche.stages'
import {
  earthquakeStageBand,
  earthquakeStageIndex,
  earthquakeStagesEn,
  earthquakeStagesZhTW,
} from './earthquake.stages'
import {
  tsunamiStageBand,
  tsunamiStageIndex,
  tsunamiStagesEn,
  tsunamiStagesZhTW,
} from './tsunami.stages'
import {
  volcanoStageBand,
  volcanoStageIndex,
  volcanoStagesEn,
  volcanoStagesZhTW,
} from './volcano.stages'

export {
  avalancheStageIndex,
  earthquakeStageIndex,
  tsunamiStageIndex,
  volcanoStageIndex,
  volcanoStagesEn,
  volcanoStagesZhTW,
  avalancheStagesEn,
  avalancheStagesZhTW,
  tsunamiStagesEn,
  tsunamiStagesZhTW,
  earthquakeStagesEn,
  earthquakeStagesZhTW,
}

export function stageBandFor(hazard: HazardId, index: number): StageBand {
  switch (hazard) {
    case 'avalanche':
      return avalancheStageBand(index)
    case 'tsunami':
      return tsunamiStageBand(index)
    case 'earthquake':
      return earthquakeStageBand(index)
    case 'volcano':
    default:
      return volcanoStageBand(index)
  }
}
