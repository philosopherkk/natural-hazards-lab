import { mountAvalancheApp } from './avalancheApp'
import { mountEarthquakeApp } from './earthquakeApp'
import { mountTsunamiApp } from './tsunamiApp'
import { mountVolcanoApp } from './volcanoApp'
import {
  avalancheStageBand,
  avalancheStageIndex,
  earthquakeStageBand,
  earthquakeStageIndex,
  tsunamiStageBand,
  tsunamiStageIndex,
  volcanoStageBand,
  volcanoStageIndex,
} from '../i18n/hazards'

export const HAZARDS = {
  volcano: {
    mount: mountVolcanoApp,
    stageBand: volcanoStageBand,
    stageIndex: volcanoStageIndex,
  },
  avalanche: {
    mount: mountAvalancheApp,
    stageBand: avalancheStageBand,
    stageIndex: avalancheStageIndex,
  },
  tsunami: {
    mount: mountTsunamiApp,
    stageBand: tsunamiStageBand,
    stageIndex: tsunamiStageIndex,
  },
  earthquake: {
    mount: mountEarthquakeApp,
    stageBand: earthquakeStageBand,
    stageIndex: earthquakeStageIndex,
  },
}

export type HazardId = keyof typeof HAZARDS

export function isHazardId(value: string): value is HazardId {
  return Object.hasOwn(HAZARDS, value)
}

export function stageBandFor(hazard: HazardId, index: number) {
  return HAZARDS[hazard].stageBand(index)
}

export function stageIndexForTime(hazard: HazardId, seconds: number) {
  return HAZARDS[hazard].stageIndex(seconds)
}
