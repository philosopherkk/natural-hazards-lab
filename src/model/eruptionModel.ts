/**
 * Volcano — chamber bulk modulus + Hagen–Poiseuille conduit (deterministic).
 *
 * Input → equation → estimate
 *   H (m) edifice height. Conduit length L = H.
 *   T (°C) magma boundary temperature.
 *         η = η_ref exp(Ea/R (1/T − 1/T_ref))
 *   V (×10⁶ m³) erupted-volume scenario.
 *         Dike radius from inverting Hagen–Poiseuille at the reference
 *         pressure so the conduit can carry V: r = r₀ (V/V_ref)^(1/4).
 *         Stored strain ε = β V / V_chamber sets a bulk-modulus pressure
 *         ΔP_K = K ε. Conduit resistance R_c = η L / r⁴ holds that
 *         pressure up when the pipe is harder to bleed:
 *           P = P_K(V, t) · (R_c / R_ref)^0.45
 *         Discharge is Hagen–Poiseuille at that pressure:
 *           Q = π r⁴ ΔP / (8 η L)
 *   Lava front from volume continuity, dx_f = Q dt / (W d), on a compressed
 *   effusion clock (each timeline second stands for FLOW_CLOCK seconds).
 *   Channel depth d ~ (Q)^0.38. Houses are reached when x_f passes them.
 *   Façade load q = ½ ρ_air u² with u = √(2 ΔP / ρ_magma) · Q/(Q+Q_ref),
 *   gated by the eruption activity envelope.
 */
const R_GAS = 8.314
const P_ATM_PA = 101_325
const T_REF_K = 1373.15 // 1100 °C reference for viscosity
const ETA_REF = 8e3 // Pa·s at T_ref (andesitic melt order-of-magnitude)
const EA_J = 180_000 // activation energy for Arrhenius viscosity
const CHAMBER_V0 = 4.5e6 // m³ nominal chamber volume
const CONDUIT_R0 = 1.8 // m radius at the reference erupted volume
const BULK_MOD_MPA = 120 // effective magma/chamber stiffness (MPa per unit strain)
const RHO_MAGMA = 2500
const RHO_AIR = 1.2
const V_REF_M3 = 8e6
const FLOW_CLOCK = 3200
const CHANNEL_WIDTH_M = 55
const STORED_FRACTION = 0.028

const INTEGRATION_DT = 0.05

export const VOLCANO_HEIGHT = { min: 400, max: 3500, step: 10, defaultValue: 2200 }
export const VOLCANO_VOLUME = { min: 0.1, max: 50, step: 0.1, defaultValue: 8 }
export const VOLCANO_TEMP = { min: 1000, max: 1250, step: 5, defaultValue: 1120 }

export const VOLCANO_CONDITION_SPECS = {
  heightM: VOLCANO_HEIGHT,
  lavaVolume_Mm3: VOLCANO_VOLUME,
  magmaTempC: VOLCANO_TEMP,
} as const

export interface VolcanoConditions {
  /** Edifice height H (m). Conduit length L = H. */
  heightM: number
  /** Erupted lava volume V (×10⁶ m³). */
  lavaVolume_Mm3: number
  /** Magma temperature T (°C) for Arrhenius viscosity. */
  magmaTempC: number
}

export const DEFAULT_VOLCANO_CONDITIONS: VolcanoConditions = {
  heightM: VOLCANO_HEIGHT.defaultValue,
  lavaVolume_Mm3: VOLCANO_VOLUME.defaultValue,
  magmaTempC: VOLCANO_TEMP.defaultValue,
}

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
  /** Edifice height used as conduit length (m). */
  edificeHeightM: number
  /** Scenario erupted volume (×10⁶ m³). */
  scenarioVolume_Mm3: number
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
  if (deltaP_Pa <= 0 || eta_Pas <= 0 || lengthM <= 0) return 0
  return (Math.PI * radiusM ** 4 * deltaP_Pa) / (8 * eta_Pas * lengthM)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function resolveVolcanoConditions(partial?: Partial<VolcanoConditions>): VolcanoConditions {
  const d = DEFAULT_VOLCANO_CONDITIONS
  return {
    heightM: clamp(partial?.heightM ?? d.heightM, VOLCANO_HEIGHT.min, VOLCANO_HEIGHT.max),
    lavaVolume_Mm3: clamp(
      partial?.lavaVolume_Mm3 ?? d.lavaVolume_Mm3,
      VOLCANO_VOLUME.min,
      VOLCANO_VOLUME.max,
    ),
    magmaTempC: clamp(partial?.magmaTempC ?? d.magmaTempC, VOLCANO_TEMP.min, VOLCANO_TEMP.max),
  }
}

/** House footprints along east flank (m from summit vent). */
export const STRUCTURE_DISTANCES_M = [420, 580, 720, 890, 1050, 1180, 1320, 1480]

function severityForStructure(
  t: number,
  intensity: number,
  lavaFrontM: number,
  activity: number,
  distM: number,
  dynamicPressure_kPa: number,
  volRatio: number,
): { severity: StructureSeverity; index: number } {
  const size = clamp(Math.pow(volRatio, 0.5), 0.08, 1.8)
  // Ash and fire stay on the near slope; farther houses are reached by the lava front.
  const ashBand = clamp((560 - distM) / 200, 0, 1)
  const ash = smoothstep(4, 11, t) * (0.5 + intensity * 0.25) * size * ashBand
  const blast =
    smoothstep(9.5, 13, t) *
    activity *
    clamp(dynamicPressure_kPa / 8, 0, 1.2) *
    (distM < 700 ? 1 : 0.2)
  const fire = smoothstep(12, 16, t) * intensity * size * ashBand * 0.65
  const collapse =
    smoothstep(15, 19, t) * (ash * 0.45 + fire * 0.35) +
    smoothstep(17, 22, t) * 0.15 * intensity * size * ashBand
  const buried = lavaFrontM >= distM - 40 ? 1 : lavaFrontM >= distM - 120 ? 0.5 : 0

  const score = ash * 0.9 + blast * 1.1 + fire * 1.0 + collapse * 1.2 + buried * 1.5

  if (buried >= 0.85 || score > 3.2) return { severity: 'buried', index: 5 }
  if (collapse > 0.55 || score > 2.4) return { severity: 'collapse', index: 4 }
  if (fire > 0.45 || score > 1.85) return { severity: 'fire', index: 3 }
  if (blast > 0.4 || score > 1.35) return { severity: 'blast', index: 2 }
  if (ash > 0.25 || score > 0.65) return { severity: 'ash', index: 1 }
  return { severity: 'intact', index: 0 }
}

function activityAt(timeSec: number, intensity: number): number {
  const t = timeSec
  let phase = 0
  if (t < 6) phase = (t / 6) * 0.15
  else if (t < 10) phase = 0.15 + ((t - 6) / 4) * 0.25
  else if (t < 14) phase = 0.4 + ((t - 10) / 4) * 0.35
  else if (t < 24) phase = 0.75 + ((t - 14) / 10) * 0.25
  else phase = Math.max(0, 1 - (t - 24) / 6)
  return clamp(phase * (0.35 + intensity * 0.85), 0, 1)
}

/**
 * Deterministic lumped chamber + 1D conduit from t = 0 → timeSec.
 * Pressure and flux are closed by Hagen–Poiseuille and bulk modulus;
 * the loop carries the lava-front integral on the compressed clock.
 */
export function computeEruptionState(
  timeSec: number,
  intensity: number,
  raw?: Partial<VolcanoConditions>,
): EruptionState {
  const cond = resolveVolcanoConditions(raw)
  const I = clamp(intensity, 0, 1)
  const L = cond.heightM
  const V_m3 = cond.lavaVolume_Mm3 * 1e6
  const volRatio = V_m3 / V_REF_M3
  const rScale = Math.pow(volRatio, 0.25)
  const etaRef = viscosityPas(VOLCANO_TEMP.defaultValue)
  const resistanceRef = etaRef * VOLCANO_HEIGHT.defaultValue / CONDUIT_R0 ** 4

  let T_C = cond.magmaTempC
  let rConduit = CONDUIT_R0 * rScale
  let ventOpen = false
  let lavaFrontM = 0
  let Q = 0
  let P_MPa = 0.6

  const steps = Math.max(0, Math.ceil(timeSec / INTEGRATION_DT))
  for (let s = 0; s <= steps; s++) {
    const t = Math.min(timeSec, s * INTEGRATION_DT)
    const cool = ventOpen ? (t - 10) * (0.35 + I * 0.25) : 0
    T_C = clamp(cond.magmaTempC - cool, VOLCANO_TEMP.min, VOLCANO_TEMP.max)
    const eta = viscosityPas(T_C)

    if (t >= 10 || (t >= 8.5 && volRatio > 1.4)) ventOpen = true
    rConduit = CONDUIT_R0 * rScale * (ventOpen ? 1 + smoothstep(10, 22, t) * 0.28 * I : 0.92)

    const resistance = (eta * L) / rConduit ** 4
    const choke = clamp(Math.pow(resistance / resistanceRef, 0.45), 0.35, 2.8)
    const storedStrain = (STORED_FRACTION * V_m3) / CHAMBER_V0
    const dP0 = BULK_MOD_MPA * storedStrain
    const build = 0.18 + 0.82 * smoothstep(1.2, 9, t)
    const ventRelief = ventOpen ? 0.62 + 0.38 * (1 - smoothstep(10, 26, t)) : 1
    P_MPa = clamp((5.5 + I * 3.5 + dP0) * build * ventRelief * choke, 0.35, 38)

    const deltaP = Math.max(0, P_MPa * 1e6 - P_ATM_PA)
    Q = ventOpen ? hagenPoiseuilleQ_m3s(deltaP, rConduit, eta, L) * (0.55 + I * 0.95) : 0

    if (ventOpen && Q > 0) {
      const dChan = clamp(0.5 + Math.pow(Q * 0.42, 0.38) * 2.1, 0.4, 16)
      lavaFrontM += (Q / (CHANNEL_WIDTH_M * dChan)) * INTEGRATION_DT * FLOW_CLOCK
    }
  }

  const activity = activityAt(timeSec, I)
  const eta = viscosityPas(T_C)
  const fill = clamp(0.38 + 0.22 * Math.pow(volRatio, 0.35) + (ventOpen ? -0.06 : 0.04), 0.2, 0.96)
  const meltFraction = clamp(0.55 + (T_C - 950) / 350 - (1 - fill) * 0.15, 0.2, 0.98)

  const uJet = Math.sqrt((2 * P_MPa * 1e6) / RHO_MAGMA)
  // Façade wind needs both Bernoulli speed and a jet that actually leaves the vent.
  const jetOpen = Q / (Q + 2)
  const uBlast = uJet * activity * (ventOpen ? jetOpen : 0.15)
  const dynamicPressure_kPa = clamp(0.5 * RHO_AIR * uBlast * uBlast * 1e-3, 0, 40)

  const structures: StructureState[] = STRUCTURE_DISTANCES_M.map((distanceM, i) => {
    const { severity, index } = severityForStructure(
      timeSec,
      I,
      lavaFrontM,
      activity,
      distanceM,
      dynamicPressure_kPa,
      volRatio,
    )
    return { id: `h${i}`, distanceM, severity, severityIndex: index }
  })

  const affected = structures.filter((s) => s.severityIndex > 0).length
  const meanSeverity = structures.reduce((a, s) => a + s.severityIndex, 0) / Math.max(1, structures.length)
  const crystalFraction = clamp(1 - meltFraction, 0.02, 0.8)

  const groundTiltMicrostrain = clamp((P_MPa / 18) * fill * 520 + activity * 40, 0, 980)
  const tremorRMS_mm_s = clamp(0.04 + activity * 2.8 + Math.sqrt(Math.max(Q, 0)) * 0.65, 0, 12)
  const gasFluxSO2_t_d = clamp(activity * I * (ventOpen ? 1800 : 120) * (0.35 + P_MPa / 28) * Math.pow(volRatio, 0.35), 0, 9000)

  const deltaT = Math.max(0, T_C - 900)
  const heatFlux_MW = clamp(Q * RHO_MAGMA * 1200 * deltaT * 1e-6, 0, 20000)

  const ashLoadFactor = smoothstep(4, 14, timeSec) * 0.35 * I * clamp(Math.pow(volRatio, 0.4), 0.15, 1.4)
  const yieldStrengthMargin = clamp(1 - dynamicPressure_kPa / 14 - ashLoadFactor - meanSeverity * 0.08, 0.05, 1)

  const lavaChannelDepth_m = ventOpen && Q > 0 ? clamp(0.6 + Math.pow(Q * 0.42, 0.38) * 2.2, 0.2, 18) : 0

  return {
    timeSec,
    intensity: I,
    edificeHeightM: L,
    scenarioVolume_Mm3: cond.lavaVolume_Mm3,
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
  key: keyof Pick<EruptionState, 'P_chamber_MPa' | 'T_magma_C' | 'eta_Pas' | 'Q_m3s' | 'lavaFrontM'>,
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
