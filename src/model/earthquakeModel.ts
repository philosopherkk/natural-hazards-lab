/** Earthquake — magnitude / PGA / spectral acceleration teaching proxies. */
const TIMELINE = 30

export type BuildingSeverity = 'stable' | 'cracked' | 'heavy' | 'collapse'

export interface BuildingState {
  id: string
  distKm: number
  severity: BuildingSeverity
  severityIndex: number
}

export interface EarthquakeState {
  timeSec: number
  intensity: number
  /** Moment magnitude Mw proxy from slip × area. */
  magnitudeMw: number
  /** Peak ground acceleration PGA (m/s²). */
  peakGroundAccel_m_s2: number
  /** Fault slip δ (m). */
  faultSlip_m: number
  /** Rupture duration (s). */
  ruptureDuration_s: number
  /** Spectral acceleration Sa at 0.3 s (g). */
  spectralAccel_g: number
  /** P-wave front radius (km). */
  pWaveRadius_km: number
  /** S-wave front radius (km). */
  sWaveRadius_km: number
  /** Shaking envelope 0–1. */
  shaking: number
  buildings: BuildingState[]
  buildingsAffected: number
}

const BUILDING_DIST_KM = [0.8, 1.2, 1.8, 2.5, 3.2, 4.0]

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Mw ≈ (2/3)(log10 M0 − 9.1) with M0 ∝ μ A δ (μ≈30 GPa sketch).
 * PGA decays with distance; Sa from bracketed response spectrum shape.
 */
export function computeEarthquakeState(timeSec: number, intensity: number): EarthquakeState {
  const I = clamp(intensity, 0, 1)
  const ruptureStart = 4
  const ruptureEnd = 4 + 6 + I * 4
  const inRupture = timeSec >= ruptureStart && timeSec <= ruptureEnd
  const ruptureDuration_s = ruptureEnd - ruptureStart

  const slipRate = inRupture ? smoothstep(ruptureStart, ruptureStart + 2, timeSec) : 0
  const faultSlip_m = clamp(
    (timeSec - ruptureStart) * (0.35 + I * 0.55) * (timeSec >= ruptureStart && timeSec <= ruptureEnd ? 1 : 0),
    0,
    3.5 + I * 4,
  )

  const area_km2 = 12 + I * 28
  const mu = 30e9
  const M0 = mu * area_km2 * 1e6 * faultSlip_m
  const magnitudeMw = M0 > 0 ? clamp((2 / 3) * (Math.log10(M0) - 9.1), 4.5, 8.2) : 4.5 + I * 0.5

  const tSince = Math.max(0, timeSec - ruptureStart)
  const pWaveRadius_km = 6 * tSince
  const sWaveRadius_km = 3.5 * tSince

  const shaking =
    inRupture || timeSec < ruptureEnd + 8
      ? clamp(
          slipRate * (0.6 + I * 0.9) +
            Math.sin(timeSec * (4 + I * 3)) * 0.25 * smoothstep(ruptureStart, ruptureEnd, timeSec),
          0,
          1,
        )
      : Math.max(0, 1 - (timeSec - ruptureEnd - 8) / 10)

  const pgaNear = 0.15 * Math.pow(10, 0.5 * (magnitudeMw - 6)) * (0.8 + I * 0.6)
  const peakGroundAccel_m_s2 = pgaNear * shaking * (1 + faultSlip_m * 0.15)

  const spectralAccel_g = clamp(peakGroundAccel_m_s2 / 9.81 * (1.1 + I * 0.35), 0, 1.8)

  const buildings: BuildingState[] = BUILDING_DIST_KM.map((distKm, i) => {
    const decay = Math.exp(-distKm / (2.2 + I))
    const demand = spectralAccel_g * decay
    let severity: BuildingSeverity = 'stable'
    let index = 0
    if (demand > 0.55) {
      severity = 'collapse'
      index = 3
    } else if (demand > 0.32) {
      severity = 'heavy'
      index = 2
    } else if (demand > 0.12) {
      severity = 'cracked'
      index = 1
    }
    return { id: `b${i}`, distKm, severity, severityIndex: index }
  })

  return {
    timeSec,
    intensity: I,
    magnitudeMw,
    peakGroundAccel_m_s2,
    faultSlip_m,
    ruptureDuration_s,
    spectralAccel_g,
    pWaveRadius_km,
    sWaveRadius_km,
    shaking,
    buildings,
    buildingsAffected: buildings.filter((b) => b.severityIndex > 0).length,
  }
}

export const EARTHQUAKE_TIMELINE = TIMELINE

export { earthquakeStageIndex } from '../i18n/hazards/earthquake.stages'
