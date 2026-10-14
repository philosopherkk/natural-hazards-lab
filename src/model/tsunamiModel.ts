/** Tsunami — shallow-water wave celerity c ≈ √(gh) and run-up teaching model. */
const G = 9.81
const TIMELINE = 30

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
  /** Offshore wave height H (m). */
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

/** Slip pulse t≈2–6 s; wave propagates at c; run-up peaks t≈16–22 s. */
export function computeTsunamiState(timeSec: number, intensity: number): TsunamiState {
  const I = clamp(intensity, 0, 1)
  const slipPulse = smoothstep(1.5, 5, timeSec) * (1 - smoothstep(6, 8, timeSec))
  const faultSlip_m = (2.5 + I * 6.5) * slipPulse + smoothstep(5, 12, timeSec) * I * 0.8

  const waveHeight_m = clamp(0.4 + faultSlip_m * (0.35 + I * 0.25), 0, 18)
  void (3800 - I * 800) // bathymetry sketch (deep ocean depth)
  const wavelength_km = 40 + I * 90 + waveHeight_m * 8

  const hNearshore = 12 + (1 - I) * 8
  const celerity_m_s = Math.sqrt(G * hNearshore)

  const tTravel = Math.max(0, timeSec - 6)
  const waveFront_km = (celerity_m_s * tTravel) / 1000

  const arrival = smoothstep(10, 14, timeSec)
  const runup_m = waveHeight_m * (1.2 + I * 1.8) * arrival

  const phaseSpeed = celerity_m_s * (0.85 + 0.15 * Math.sin(timeSec * 0.4))
  const froudeNumber = waveHeight_m > 0.01 ? phaseSpeed / Math.sqrt(G * waveHeight_m) : 0

  const inundationDepth_m = clamp(runup_m * smoothstep(14, 20, timeSec) - 0.5, 0, runup_m)

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

export function tsunamiStageIndex(t: number): number {
  if (t < 5) return 0
  if (t < 10) return 1
  if (t < 16) return 2
  if (t < 24) return 3
  return 4
}
