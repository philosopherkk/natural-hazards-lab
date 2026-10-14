/** Physical constants (SI); values scaled for teaching visualization. */
const R_GAS = 8.314
const P_ATM_PA = 101_325
const T_REF_K = 1373.15 // 1100 °C reference for viscosity
const ETA_REF = 8e3 // Pa·s at T_ref (andesitic melt order-of-magnitude)
const EA_J = 180_000 // activation energy for Arrhenius viscosity
const CHAMBER_V0 = 4.5e6 // m³ nominal (display uses derived MPa)
const CONDUIT_L = 3200 // m (geologic scale; mapped to scene height)
const CONDUIT_R0 = 1.8 // m radius
const BULK_MOD_MPA = 120 // effective magma/chamber stiffness (MPa per unit strain)

const INTEGRATION_DT = 0.05

export type StructureSeverity = 'intact' | 'ash' | 'blast' | 'fire' | 'collapse' | 'buried'

export interface StructureState {
  id: string
  distanceM: number
  severity: StructureSeverity
  severityIndex: number
}

export interface EruptionState {
  timeSec: number
  intensity: number
  /** Gauge overpressure above atmospheric (MPa). */
  P_chamber_MPa: number
  T_magma_C: number
  eta_Pas: number
  /** Volumetric flux in conduit (m³/s), Hagen–Poiseuille when vent open. */
  Q_m3s: number
  effusionRate_m3s: number
  /** Down-flank distance of lava front from vent (m). */
  lavaFrontM: number
  chamberFill: number
  meltFraction: number
  crystalFraction: number
  ventOpen: boolean
  activity: number
  conduitRadiusM: number
  /** Ground tilt / strain proxy (μstrain) from chamber pressurization. */
  groundTiltMicrostrain: number
  /** Tremor RMS (mm/s) scaled from seismic energy proxy. */
  tremorRMS_mm_s: number
  /** SO₂ mass flux (t/d) from degassing activity. */
  gasFluxSO2_t_d: number
  /** Thermal output at vent (MW), Q·ρ·c·ΔT sketch. */
  heatFlux_MW: number
  /** Structural margin: 1 − demand/yield (dimensionless). */
  yieldStrengthMargin: number
  /** Blast dynamic pressure on façades (kPa), q = ½ρu². */
  dynamicPressure_kPa: number
  /** Channelized lava depth (m), empirical from effusion. */
  lavaChannelDepth_m: number
  structures: StructureState[]
  structuresAffected: number
  meanSeverity: number
}

/** Arrhenius viscosity η(T) = η_ref exp(Ea/R (1/T − 1/T_ref)). */
export function viscosityPas(T_C: number): number {
  const T = T_C + 273.15
  return ETA_REF * Math.exp((EA_J / R_GAS) * (1 / T - 1 / T_REF_K))
}

/** Laminar pipe flow: Q = π r⁴ ΔP / (8 η L). */
export function hagenPoiseuilleQ_m3s(
  deltaP_Pa: number,
  radiusM: number,
  eta_Pas: number,
  lengthM: number,
): number {
  if (deltaP_Pa <= 0 || eta_Pas <= 0) return 0
  return (Math.PI * radiusM ** 4 * deltaP_Pa) / (8 * eta_Pas * lengthM)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** House footprints along east flank (m from summit vent). */
export const STRUCTURE_DISTANCES_M = [420, 580, 720, 890, 1050, 1180, 1320, 1480]

function severityForStructure(
  t: number,
  intensity: number,
  lavaFrontM: number,
  activity: number,
  distM: number,
): { severity: StructureSeverity; index: number } {
  const ash = smoothstep(4, 11, t) * (0.35 + intensity * 0.65)
  const blast = smoothstep(9.5, 12.5, t) * activity * (distM < 900 ? 1 : 0.55)
  const fire = smoothstep(12, 16, t) * intensity * (distM < 1100 ? 1 : 0.4)
  const collapse =
    smoothstep(15, 19, t) * (ash * 0.55 + fire * 0.45) +
    smoothstep(17, 22, t) * 0.25 * intensity
  const buried = lavaFrontM >= distM - 40 ? 1 : lavaFrontM >= distM - 120 ? 0.5 : 0

  const score = ash * 0.9 + blast * 1.1 + fire * 1.0 + collapse * 1.2 + buried * 1.5

  if (buried >= 0.85 || score > 3.2) return { severity: 'buried', index: 5 }
  if (collapse > 0.55 || score > 2.4) return { severity: 'collapse', index: 4 }
  if (fire > 0.45 || score > 1.85) return { severity: 'fire', index: 3 }
  if (blast > 0.4 || score > 1.35) return { severity: 'blast', index: 2 }
  if (ash > 0.25 || score > 0.65) return { severity: 'ash', index: 1 }
  return { severity: 'intact', index: 0 }
}

/**
 * Deterministic lumped chamber + 1D conduit integration from t = 0 → timeSec.
 * Mass balance: dV/dt = q_in − Q; pressure tied to fill via bulk modulus.
 */
export function computeEruptionState(timeSec: number, intensity: number): EruptionState {
  const I = clamp(intensity, 0, 1)
  let fill = 0.62 // normalized chamber fill 0–1
  let P_MPa = 12 + I * 6
  let T_C = 1180 - I * 20
  let rConduit = CONDUIT_R0
  let ventOpen = false
  let lavaFrontM = 0
  let Q = 0

  const steps = Math.ceil(timeSec / INTEGRATION_DT)
  for (let s = 0; s <= steps; s++) {
    const t = s * INTEGRATION_DT
    const eta = viscosityPas(T_C)

    const qIn =
      t < 24
        ? (0.35 + I * 1.15) * (t < 6 ? 0.35 : t < 10 ? 0.85 : 1)
        : (0.12 + I * 0.25) * Math.max(0, 1 - (t - 24) / 6)

    if (t >= 10) ventOpen = true
    if (P_MPa > 22 + I * 8 && t >= 8.5) ventOpen = true

    if (ventOpen) {
      rConduit = CONDUIT_R0 + smoothstep(10, 22, t) * 0.9 * I
    }

    const P_pa = P_MPa * 1e6
    const deltaP = Math.max(0, P_pa - P_ATM_PA)
    Q = ventOpen ? hagenPoiseuilleQ_m3s(deltaP, rConduit, eta, CONDUIT_L) : 0
    Q *= 0.55 + I * 0.95

    const dV = (qIn - Q) * INTEGRATION_DT
    const strain = dV / CHAMBER_V0
    fill = clamp(fill + strain * 2.8e5, 0.15, 0.98)

    P_MPa = clamp(P_MPa - strain * BULK_MOD_MPA * (ventOpen ? 0.85 : 1.1) + qIn * 0.002 * INTEGRATION_DT, 0.4, 28 + I * 6)

    if (ventOpen) {
      const cool = (0.08 + Q * 0.015) * INTEGRATION_DT * (1 + I * 0.5)
      T_C -= cool
    } else {
      T_C += qIn * 0.012 * INTEGRATION_DT
    }
    T_C = clamp(T_C, 950, 1250)

    if (ventOpen && Q > 0) {
      const effWidth = 0.65 + I * 0.5
      lavaFrontM += Q * effWidth * INTEGRATION_DT * 0.018
    }
    if (t > 24) lavaFrontM *= 1 - 0.02 * INTEGRATION_DT
  }

  const activity = (() => {
    const t = timeSec
    let phase = 0
    if (t < 6) phase = (t / 6) * 0.15
    else if (t < 10) phase = 0.15 + ((t - 6) / 4) * 0.25
    else if (t < 14) phase = 0.4 + ((t - 10) / 4) * 0.35
    else if (t < 24) phase = 0.75 + ((t - 14) / 10) * 0.25
    else phase = Math.max(0, 1 - (t - 24) / 6)
    return clamp(phase * (0.35 + I * 0.85), 0, 1)
  })()

  const eta = viscosityPas(T_C)
  const meltFraction = clamp(0.55 + (T_C - 950) / 350 - (1 - fill) * 0.15, 0.2, 0.98)

  const structures: StructureState[] = STRUCTURE_DISTANCES_M.map((distanceM, i) => {
    const { severity, index } = severityForStructure(timeSec, I, lavaFrontM, activity, distanceM)
    return { id: `h${i}`, distanceM, severity, severityIndex: index }
  })

  const affected = structures.filter((s) => s.severityIndex > 0).length
  const meanSeverity =
    structures.reduce((a, s) => a + s.severityIndex, 0) / Math.max(1, structures.length)

  const crystalFraction = clamp(1 - meltFraction, 0.02, 0.8)

  // ε_proxy ∝ (P/P_ref)(fill) mapped to microstrain for flank tilt gauges.
  const groundTiltMicrostrain = clamp((P_MPa / 18) * fill * 520 + activity * 40, 0, 980)

  // RMS ∝ √(seismic moment rate) ~ activity·√Q (mm/s teaching scale).
  const tremorRMS_mm_s = clamp(0.04 + activity * 2.8 + Math.sqrt(Math.max(Q, 0)) * 0.65, 0, 6.5)

  // Degassing SO₂: t/d ~ activity·I·vent factor (order-of-magnitude teaching flux).
  const gasFluxSO2_t_d = clamp(
    activity * I * (ventOpen ? 1800 : 120) * (0.35 + P_MPa / 28),
    0,
    4200,
  )

  // Q·ρ·c·ΔT with ρ≈2500 kg/m³, c≈1200 J/(kg·K), ΔT from T_C.
  const deltaT = Math.max(0, T_C - 900)
  const heatFlux_MW = clamp(Q * 2500 * 1200 * deltaT * 1e-6, 0, 8500)

  // Blast wind speed u (m/s) from eruptive jet proxy; q = ½ρ_air u² (Pa → kPa).
  const uBlast = activity * (55 + I * 45) * (ventOpen ? 1 : 0.15)
  const dynamicPressure_kPa = clamp(0.5 * 1.2 * uBlast * uBlast * 1e-3, 0, 28)

  const ashLoadFactor = smoothstep(4, 14, timeSec) * 0.35 * I
  const yieldStrengthMargin = clamp(1 - dynamicPressure_kPa / 14 - ashLoadFactor - meanSeverity * 0.08, 0.05, 1)

  // Channel depth d ~ k(Q/v)^0.35 with v from effusion width (m).
  const lavaChannelDepth_m =
    ventOpen && Q > 0 ? clamp(0.6 + Math.pow(Q * 0.42, 0.38) * 2.2, 0.2, 12) : 0

  return {
    timeSec,
    intensity: I,
    P_chamber_MPa: P_MPa,
    T_magma_C: T_C,
    eta_Pas: eta,
    Q_m3s: Q,
    effusionRate_m3s: Q,
    lavaFrontM,
    chamberFill: fill,
    meltFraction,
    crystalFraction,
    ventOpen,
    activity,
    conduitRadiusM: rConduit,
    groundTiltMicrostrain,
    tremorRMS_mm_s,
    gasFluxSO2_t_d,
    heatFlux_MW,
    yieldStrengthMargin,
    dynamicPressure_kPa,
    lavaChannelDepth_m,
    structures,
    structuresAffected: affected,
    meanSeverity,
  }
}

export function formatEngineeringValue(
  key: keyof Pick<
    EruptionState,
    'P_chamber_MPa' | 'T_magma_C' | 'eta_Pas' | 'Q_m3s' | 'lavaFrontM'
  >,
  state: EruptionState,
): string {
  switch (key) {
    case 'P_chamber_MPa':
      return state.P_chamber_MPa.toFixed(2)
    case 'T_magma_C':
      return state.T_magma_C.toFixed(0)
    case 'eta_Pas':
      return state.eta_Pas >= 1e4 ? state.eta_Pas.toExponential(2) : state.eta_Pas.toFixed(1)
    case 'Q_m3s':
      return state.Q_m3s.toFixed(3)
    case 'lavaFrontM':
      return state.lavaFrontM.toFixed(0)
    default:
      return '—'
  }
}
