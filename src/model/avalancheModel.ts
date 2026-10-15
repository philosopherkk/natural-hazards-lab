/** Snow avalanche — simplified Voellmy / runout teaching model (deterministic). */
const G = 9.81
const TIMELINE = 30

export type ChaletSeverity = 'intact' | 'scoured' | 'impact' | 'buried'

export interface ChaletState {
  id: string
  runoutM: number
  severity: ChaletSeverity
  severityIndex: number
}

export interface AvalancheState {
  timeSec: number
  intensity: number
  /** Slope angle α (degrees). */
  slopeAngleDeg: number
  /** Coulomb friction μ. */
  frictionMu: number
  /** Snow density ρ (kg/m³). */
  snowDensity_kg_m3: number
  /** Front runout from release (m). */
  runoutDistance_m: number
  /** Flow speed (m/s), v ≈ √(2gH) with H from slope drop proxy. */
  flowSpeed_m_s: number
  /** Impact pressure P = ½ρv² (kPa). */
  impactPressure_kPa: number
  /** Fracture depth in slab (m). */
  slabFractureDepth_m: number
  /** Released volume (×10³ m³). */
  releasedVolume_k_m3: number
  chalets: ChaletState[]
  chaletsAffected: number
}

const CHALET_RUNOUTS = [380, 520, 680, 820, 960, 1100]

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Runout on inclined plane with friction: s ≈ h/tan(α) · (1 − μ/tan(α)) (Voellmy-like cap).
 * Release at t≈8 s; flow accelerates until t≈18 s.
 */
export function computeAvalancheState(timeSec: number, intensity: number): AvalancheState {
  const I = clamp(intensity, 0, 1)
  const slopeAngleDeg = 32 + I * 6
  const alpha = (slopeAngleDeg * Math.PI) / 180
  const frictionMu = 0.28 + (1 - I) * 0.12
  const snowDensity_kg_m3 = 180 + I * 120

  const release = smoothstep(6, 9, timeSec)
  const flowPhase = smoothstep(8, 20, timeSec) * (1 - smoothstep(22, 28, timeSec))

  const dropM = 420 + I * 180
  const maxRunout =
    release > 0 ? (dropM / Math.tan(alpha)) * Math.max(0.15, 1 - frictionMu / Math.tan(alpha)) : 0
  const runoutDistance_m = maxRunout * flowPhase * (0.55 + I * 0.5)

  const vMax = Math.sqrt(2 * G * dropM * 0.35) * (0.7 + I * 0.35)
  const flowSpeed_m_s = vMax * flowPhase * release

  const impactPressure_kPa = 0.5 * snowDensity_kg_m3 * flowSpeed_m_s * flowSpeed_m_s * 1e-3

  const slabFractureDepth_m = release * (0.4 + I * 1.1) * smoothstep(5, 8, timeSec)
  const releasedVolume_k_m3 = release * flowPhase * (12 + I * 38)

  const chalets: ChaletState[] = CHALET_RUNOUTS.map((runoutM, i) => {
    let severity: ChaletSeverity = 'intact'
    let index = 0
    if (runoutDistance_m >= runoutM - 30) {
      severity = 'buried'
      index = 3
    } else if (runoutDistance_m >= runoutM - 90 && impactPressure_kPa > 4) {
      severity = 'impact'
      index = 2
    } else if (runoutDistance_m >= runoutM - 160) {
      severity = 'scoured'
      index = 1
    }
    void i
    return { id: `c${i}`, runoutM, severity, severityIndex: index }
  })

  return {
    timeSec,
    intensity: I,
    slopeAngleDeg,
    frictionMu,
    snowDensity_kg_m3,
    runoutDistance_m,
    flowSpeed_m_s,
    impactPressure_kPa,
    slabFractureDepth_m,
    releasedVolume_k_m3,
    chalets,
    chaletsAffected: chalets.filter((c) => c.severityIndex > 0).length,
  }
}

export const AVALANCHE_TIMELINE = TIMELINE

export { avalancheStageIndex } from '../i18n/hazards/avalanche.stages'
