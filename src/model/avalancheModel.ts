/**
 * Snow avalanche — Voellmy speed on the existing geometric runout (deterministic).
 *
 * Input → equation → estimate
 *   h (m) slab / snow depth.
 *         Released volume V = A · h (area of the starting zone).
 *         Mass m = ρ V.
 *         Voellmy speed v = √(ξ h (sin α − μ cos α)), capped by free-fall √(2 g H).
 *         Because v² ∝ h, runout scales with h/h_ref inside the existing formula.
 *   α (degrees) slope angle. Fall height H = S sin α.
 *         Existing runout: L = (H / tan α) · max(0.15, 1 − μ / tan α) · (h / h_ref)
 *         (the form L ≈ H / (μ − tan α) is the same friction balance; this file
 *         keeps the positive rearrangement already used here).
 *   Impact pressure P = ½ ρ v².
 *   Chalets are reached when L passes their offset, with P gating impact vs scour.
 */
const G = 9.81
const TIMELINE = 30
const RELEASE_AREA_M2 = 42_000
const DEPTH_REF_M = 1.2
const VOELLMY_XI = 1400 // m/s² turbulent friction
const SLOPE_PATH_M = 1100

export const AVALANCHE_DEPTH = { min: 0.3, max: 4, step: 0.05, defaultValue: 1.2 }
export const AVALANCHE_SLOPE = { min: 25, max: 45, step: 0.5, defaultValue: 34 }

export const AVALANCHE_CONDITION_SPECS = {
  snowDepthM: AVALANCHE_DEPTH,
  slopeAngleDeg: AVALANCHE_SLOPE,
} as const

export interface AvalancheConditions {
  /** Snow depth / released slab thickness h (m). */
  snowDepthM: number
  /** Slope angle α (degrees). */
  slopeAngleDeg: number
}

export const DEFAULT_AVALANCHE_CONDITIONS: AvalancheConditions = {
  snowDepthM: AVALANCHE_DEPTH.defaultValue,
  slopeAngleDeg: AVALANCHE_SLOPE.defaultValue,
}

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
  /** Snow depth h (m), the condition input. */
  snowDepth_m: number
  /** Slope angle α (degrees). */
  slopeAngleDeg: number
  /** Coulomb friction μ. */
  frictionMu: number
  /** Snow density ρ (kg/m³). */
  snowDensity_kg_m3: number
  /** Front runout from release (m). */
  runoutDistance_m: number
  /** Flow speed (m/s). */
  flowSpeed_m_s: number
  /** Impact pressure P = ½ρv² (kPa). */
  impactPressure_kPa: number
  /** Fracture depth in slab (m). */
  slabFractureDepth_m: number
  /** Released volume (×10³ m³). */
  releasedVolume_k_m3: number
  /** Density-weighted released mass (kg), m = ρ V. */
  releasedMass_kg: number
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

export function resolveAvalancheConditions(partial?: Partial<AvalancheConditions>): AvalancheConditions {
  const d = DEFAULT_AVALANCHE_CONDITIONS
  return {
    snowDepthM: clamp(partial?.snowDepthM ?? d.snowDepthM, AVALANCHE_DEPTH.min, AVALANCHE_DEPTH.max),
    slopeAngleDeg: clamp(
      partial?.slopeAngleDeg ?? d.slopeAngleDeg,
      AVALANCHE_SLOPE.min,
      AVALANCHE_SLOPE.max,
    ),
  }
}

/**
 * Release at t≈8 s; flow accelerates until t≈18 s, then the deposit settles.
 */
export function computeAvalancheState(
  timeSec: number,
  intensity: number,
  raw?: Partial<AvalancheConditions>,
): AvalancheState {
  const cond = resolveAvalancheConditions(raw)
  const I = clamp(intensity, 0, 1)
  const slopeAngleDeg = cond.slopeAngleDeg
  const alpha = (slopeAngleDeg * Math.PI) / 180
  const frictionMu = 0.28 + (1 - I) * 0.12
  const snowDensity_kg_m3 = 180 + I * 120
  const snowDepth_m = cond.snowDepthM

  const release = smoothstep(6, 9, timeSec)
  const flowPhase = smoothstep(8, 20, timeSec) * (1 - smoothstep(22, 28, timeSec))

  const dropM = SLOPE_PATH_M * Math.sin(alpha)
  const tanA = Math.tan(alpha)
  const geometric = (dropM / tanA) * Math.max(0.15, 1 - frictionMu / tanA)
  const maxRunout = geometric * (snowDepth_m / DEPTH_REF_M)
  const runoutDistance_m = maxRunout * flowPhase * release

  const hFlow = Math.max(snowDepth_m * Math.max(release, 0.001), 0.05)
  const driving = Math.sin(alpha) - frictionMu * Math.cos(alpha)
  const vVoellmy = driving > 0 ? Math.sqrt(VOELLMY_XI * hFlow * driving) : 0
  const vFree = Math.sqrt(2 * G * dropM * 0.35)
  const flowSpeed_m_s = Math.min(vFree, vVoellmy) * flowPhase * release

  const impactPressure_kPa = 0.5 * snowDensity_kg_m3 * flowSpeed_m_s * flowSpeed_m_s * 1e-3

  const slabFractureDepth_m = snowDepth_m * release * smoothstep(5, 8, timeSec)
  const volume_m3 = RELEASE_AREA_M2 * slabFractureDepth_m * Math.max(flowPhase, release * 0.2)
  const releasedVolume_k_m3 = volume_m3 / 1000
  const releasedMass_kg = snowDensity_kg_m3 * volume_m3

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
    return { id: `c${i}`, runoutM, severity, severityIndex: index }
  })

  return {
    timeSec,
    intensity: I,
    snowDepth_m,
    slopeAngleDeg,
    frictionMu,
    snowDensity_kg_m3,
    runoutDistance_m,
    flowSpeed_m_s,
    impactPressure_kPa,
    slabFractureDepth_m,
    releasedVolume_k_m3,
    releasedMass_kg,
    chalets,
    chaletsAffected: chalets.filter((c) => c.severityIndex > 0).length,
  }
}

export const AVALANCHE_TIMELINE = TIMELINE

export { avalancheStageIndex } from '../i18n/hazards/avalanche.stages'
