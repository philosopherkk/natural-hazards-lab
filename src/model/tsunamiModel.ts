/**
 * Tsunami — shallow-water celerity and the existing shoaling / run-up chain.
 *
 * Input → equation → estimate
 *   D (m) offshore fault slip, the scenario maximum.
 *         The existing slip pulse still shapes D(t); the peak is the slider.
 *         Source height H₀ ∝ D (same H ~ D · bathymetry factor as before).
 *   h (m) shelf / nearshore depth.
 *         Celerity c = √(g h). Wave front x = c Δt.
 *         Green's law shoals the wave onto that shelf:
 *           H = H₀ (h_ref / h)^(1/4)
 *   Run-up keeps R = H · (slope amplification from intensity) · arrival.
 *   Inundation depth is the existing shoreline proxy of R.
 *   Coastal structures flood, or collapse, from inundation depth.
 */
const G = 9.81
const TIMELINE = 30
const SHELF_REF_M = 18

export const TSUNAMI_SLIP = { min: 0.5, max: 15, step: 0.1, defaultValue: 5 }
export const TSUNAMI_SHELF = { min: 8, max: 160, step: 1, defaultValue: 18 }

export const TSUNAMI_CONDITION_SPECS = {
  slipM: TSUNAMI_SLIP,
  shelfDepthM: TSUNAMI_SHELF,
} as const

export interface TsunamiConditions {
  /** Offshore fault slip D (m), scenario maximum. */
  slipM: number
  /** Shelf / nearshore water depth h (m) in c = √(gh). */
  shelfDepthM: number
}

export const DEFAULT_TSUNAMI_CONDITIONS: TsunamiConditions = {
  slipM: TSUNAMI_SLIP.defaultValue,
  shelfDepthM: TSUNAMI_SHELF.defaultValue,
}

export type CoastalSeverity = 'dry' | 'surge' | 'flooded' | 'collapsed'

export interface CoastalStructure {
  id: string
  shoreDistM: number
  severity: CoastalSeverity
  severityIndex: number
}

export interface TsunamiState {
  timeSec: number
  intensity: number
  /** Fault slip D (m). */
  faultSlip_m: number
  /** Shelf depth h (m). */
  shelfDepth_m: number
  /** Offshore / shoaled wave height H (m). */
  waveHeight_m: number
  /** Wavelength λ (km). */
  wavelength_km: number
  /** Shallow-water celerity c = √(gh) (m/s). */
  celerity_m_s: number
  /** Coastal run-up R (m). */
  runup_m: number
  /** Froude number Fr = U/√(gH). */
  froudeNumber: number
  /** Inundation depth at shoreline proxy (m). */
  inundationDepth_m: number
  /** Wave front distance from fault (km). */
  waveFront_km: number
  structures: CoastalStructure[]
  structuresAffected: number
}

const COAST_STRUCTURES = [0.2, 0.35, 0.5, 0.65, 0.8, 1.0] // km inland

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function resolveTsunamiConditions(partial?: Partial<TsunamiConditions>): TsunamiConditions {
  const d = DEFAULT_TSUNAMI_CONDITIONS
  return {
    slipM: clamp(partial?.slipM ?? d.slipM, TSUNAMI_SLIP.min, TSUNAMI_SLIP.max),
    shelfDepthM: clamp(partial?.shelfDepthM ?? d.shelfDepthM, TSUNAMI_SHELF.min, TSUNAMI_SHELF.max),
  }
}

/** Slip pulse t≈2–6 s; wave propagates at c; run-up peaks t≈16–22 s. */
export function computeTsunamiState(
  timeSec: number,
  intensity: number,
  raw?: Partial<TsunamiConditions>,
): TsunamiState {
  const cond = resolveTsunamiConditions(raw)
  const I = clamp(intensity, 0, 1)
  const slipPulse = smoothstep(1.5, 5, timeSec) * (1 - smoothstep(6, 8, timeSec))
  const residual = smoothstep(5, 12, timeSec)
  const faultSlip_m = cond.slipM * (slipPulse * 0.85 + residual * 0.15)
  // The wave keeps the source amplitude after the slip pulse (it has already left the fault).
  const generated = smoothstep(2, 7, timeSec)
  const sourceSlip = cond.slipM * generated

  const h0 = generated * 0.15 + sourceSlip * (0.22 + I * 0.12)
  const shoal = Math.pow(SHELF_REF_M / cond.shelfDepthM, 0.25)
  const waveHeight_m = clamp(h0 * shoal, 0, 24)
  const wavelength_km = 40 + I * 70 + waveHeight_m * 6 + cond.shelfDepthM * 0.15

  const celerity_m_s = Math.sqrt(G * cond.shelfDepthM)

  const tTravel = Math.max(0, timeSec - 6)
  const waveFront_km = (celerity_m_s * tTravel) / 1000

  const arrival = smoothstep(10, 14, timeSec)
  const runup_m = waveHeight_m * (0.85 + I * 0.75) * arrival

  const phaseSpeed = celerity_m_s * (0.85 + 0.15 * Math.sin(timeSec * 0.4))
  const froudeNumber = waveHeight_m > 0.01 ? phaseSpeed / Math.sqrt(G * waveHeight_m) : 0

  const inundationDepth_m = clamp(runup_m * smoothstep(14, 20, timeSec) - 0.4, 0, runup_m)

  const structures: CoastalStructure[] = COAST_STRUCTURES.map((shoreDistM, i) => {
    const depthAt = inundationDepth_m * Math.max(0, 1 - shoreDistM / 1.2)
    let severity: CoastalSeverity = 'dry'
    let index = 0
    if (depthAt > 2.5) {
      severity = 'collapsed'
      index = 3
    } else if (depthAt > 1.2) {
      severity = 'flooded'
      index = 2
    } else if (depthAt > 0.35) {
      severity = 'surge'
      index = 1
    }
    return { id: `s${i}`, shoreDistM, severity, severityIndex: index }
  })

  return {
    timeSec,
    intensity: I,
    faultSlip_m,
    shelfDepth_m: cond.shelfDepthM,
    waveHeight_m,
    wavelength_km,
    celerity_m_s,
    runup_m,
    froudeNumber,
    inundationDepth_m,
    waveFront_km,
    structures,
    structuresAffected: structures.filter((s) => s.severityIndex > 0).length,
  }
}

export const TSUNAMI_TIMELINE = TIMELINE

export { tsunamiStageIndex } from '../i18n/hazards/tsunami.stages'
