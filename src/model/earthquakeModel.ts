/**
 * Earthquake — moment magnitude, distance decay, and the existing PGA relation.
 *
 * Input → equation → estimate
 *   Mw scenario moment magnitude.
 *         Invert the file's magnitude definition:
 *           M₀ = 10^((3/2) Mw + 9.1)
 *         Close M₀ = μ A δ with a constant strain drop ε = δ / L and
 *         seismogenic width W (A = L W):
 *           L = √(M₀ / (μ W ε)),   δ = ε L
 *         From t = 4 s the rupture fraction f grows across the teaching
 *         clock; M₀(t) = f M₀ so Mw, slip, and length climb to the slider.
 *   R (km) distance from the site to the fault.
 *         PGA₀ = 0.15 · 10^(0.5 (Mw − 6))     (existing magnitude term)
 *         D(R) = ((R_sat + R_ref) / (R_sat + R))^1.5
 *         PGA(R) = PGA₀ · D(R) · shaking envelope
 *         Sa(0.3 s) uses the existing spectrum factor on PGA.
 *         Building i sits at R · f_i and damages from Sa · D(R_i).
 */
const TIMELINE = 30
const MU_PA = 30e9
const WIDTH_M = 15_000
const STRAIN_DROP = 1e-4
const RUPTURE_START = 4
const R_SAT_KM = 4
const R_REF_KM = 8

export const EARTHQUAKE_MW = { min: 5, max: 8, step: 0.1, defaultValue: 6.8 }
export const EARTHQUAKE_DISTANCE = { min: 1, max: 80, step: 0.5, defaultValue: 8 }

export const EARTHQUAKE_CONDITION_SPECS = {
  magnitudeMw: EARTHQUAKE_MW,
  distanceKm: EARTHQUAKE_DISTANCE,
} as const

export interface EarthquakeConditions {
  /** Scenario moment magnitude Mw. */
  magnitudeMw: number
  /** Distance from the site to the fault (km). */
  distanceKm: number
}

export const DEFAULT_EARTHQUAKE_CONDITIONS: EarthquakeConditions = {
  magnitudeMw: EARTHQUAKE_MW.defaultValue,
  distanceKm: EARTHQUAKE_DISTANCE.defaultValue,
}

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
  /** Moment magnitude Mw at this time (climbs to the scenario value). */
  magnitudeMw: number
  /** Scenario magnitude the slider is set to. */
  scenarioMw: number
  /** Distance to fault R (km). */
  distanceKm: number
  /** Seismic moment M₀ (N·m). */
  seismicMoment_Nm: number
  /** Peak ground acceleration PGA at the site (m/s²). */
  peakGroundAccel_m_s2: number
  /** Fault slip δ (m). */
  faultSlip_m: number
  /** Subsurface rupture length (km). */
  ruptureLength_km: number
  /** Rupture duration (s) on the teaching clock. */
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

/** Relative distance of each building from the site distance R. */
const BUILDING_FACTORS = [0.4, 0.65, 0.9, 1.2, 1.7, 2.4]

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function resolveEarthquakeConditions(partial?: Partial<EarthquakeConditions>): EarthquakeConditions {
  const d = DEFAULT_EARTHQUAKE_CONDITIONS
  return {
    magnitudeMw: clamp(partial?.magnitudeMw ?? d.magnitudeMw, EARTHQUAKE_MW.min, EARTHQUAKE_MW.max),
    distanceKm: clamp(partial?.distanceKm ?? d.distanceKm, EARTHQUAKE_DISTANCE.min, EARTHQUAKE_DISTANCE.max),
  }
}

/** Geometric spreading used for the site and for each building. */
export function distanceDecay(distanceKm: number): number {
  const R = Math.max(0.5, distanceKm)
  return Math.pow((R_SAT_KM + R_REF_KM) / (R_SAT_KM + R), 1.5)
}

function sourceFromMw(Mw: number): { M0: number; lengthM: number; slipM: number } {
  const M0 = 10 ** (1.5 * Mw + 9.1)
  const lengthM = Math.sqrt(M0 / (MU_PA * WIDTH_M * STRAIN_DROP))
  const slipM = STRAIN_DROP * lengthM
  return { M0, lengthM, slipM }
}

/**
 * Mw ≈ (2/3)(log10 M0 − 9.1) with M0 ∝ μ A δ.
 * PGA = 0.15 · 10^(0.5(Mw−6)) · D(R) · envelope.
 */
export function computeEarthquakeState(
  timeSec: number,
  intensity: number,
  raw?: Partial<EarthquakeConditions>,
): EarthquakeState {
  const cond = resolveEarthquakeConditions(raw)
  const I = clamp(intensity, 0, 1)
  const source = sourceFromMw(cond.magnitudeMw)
  const ruptureDuration_s = clamp(5 + ((cond.magnitudeMw - 5) / 3) * 9, 5, 16)
  const ruptureEnd = RUPTURE_START + ruptureDuration_s
  const fraction =
    timeSec <= RUPTURE_START ? 0 : smoothstep(RUPTURE_START, ruptureEnd, Math.min(timeSec, ruptureEnd))

  const seismicMoment_Nm = source.M0 * fraction
  const magnitudeMw =
    fraction > 0.02 ? clamp((2 / 3) * (Math.log10(seismicMoment_Nm) - 9.1), 0, 9.5) : 0
  const grown = Math.sqrt(fraction)
  const faultSlip_m = source.slipM * grown
  const ruptureLength_km = (source.lengthM * grown) / 1000

  const tSince = Math.max(0, timeSec - RUPTURE_START)
  const pWaveRadius_km = timeSec >= RUPTURE_START ? 6 * tSince : 0
  const sWaveRadius_km = timeSec >= RUPTURE_START ? 3.5 * tSince : 0

  let shaking = 0
  if (timeSec >= RUPTURE_START && timeSec <= ruptureEnd) {
    const wobble = Math.sin(timeSec * (3.2 + (cond.magnitudeMw - 5) * 0.4)) * 0.12
    shaking = clamp(0.3 + 0.7 * fraction + wobble, 0, 1)
  } else if (timeSec > ruptureEnd) {
    shaking = Math.max(0, 1 - (timeSec - ruptureEnd) / 10)
  }

  const pgaMagnitude =
    magnitudeMw > 0 ? 0.15 * Math.pow(10, 0.5 * (magnitudeMw - 6)) * (0.7 + I * 0.55) : 0
  const peakGroundAccel_m_s2 = pgaMagnitude * distanceDecay(cond.distanceKm) * shaking

  const spectralAccel_g = clamp((peakGroundAccel_m_s2 / 9.81) * (1.15 + I * 0.25), 0, 2.5)

  const buildings: BuildingState[] = BUILDING_FACTORS.map((factor, i) => {
    const distKm = Math.max(0.4, cond.distanceKm * factor)
    const pgaHere = pgaMagnitude * distanceDecay(distKm) * shaking
    let severity: BuildingSeverity = 'stable'
    let index = 0
    if (pgaHere > 0.85) {
      severity = 'collapse'
      index = 3
    } else if (pgaHere > 0.5) {
      severity = 'heavy'
      index = 2
    } else if (pgaHere > 0.22) {
      severity = 'cracked'
      index = 1
    }
    return { id: `b${i}`, distKm, severity, severityIndex: index }
  })

  return {
    timeSec,
    intensity: I,
    magnitudeMw,
    scenarioMw: cond.magnitudeMw,
    distanceKm: cond.distanceKm,
    seismicMoment_Nm,
    peakGroundAccel_m_s2,
    faultSlip_m,
    ruptureLength_km,
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
