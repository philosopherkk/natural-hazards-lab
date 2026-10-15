export interface StageBand {
  startSec: number
  endSec: number
}

/** Deterministic stage index from timeline position only (last band whose startSec ≤ t). */
export function stageIndexForBands(bands: readonly StageBand[], t: number): number {
  const clamped = Math.max(0, Math.min(bands[bands.length - 1]?.endSec ?? 30, t))
  let idx = 0
  for (let i = 0; i < bands.length; i++) {
    if (clamped >= bands[i]!.startSec) idx = i
  }
  return idx
}

export function stageBandAt(bands: readonly StageBand[], index: number): StageBand {
  return bands[index] ?? bands[bands.length - 1]!
}
