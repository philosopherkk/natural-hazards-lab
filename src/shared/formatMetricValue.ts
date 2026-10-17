import type { MetricIdFor } from '../i18n'
import type { AvalancheState } from '../model/avalancheModel'
import type { EarthquakeState } from '../model/earthquakeModel'
import type { EruptionState } from '../model/eruptionModel'
import type { TsunamiState } from '../model/tsunamiModel'

export function formatVolcanoMetric(id: MetricIdFor<'volcano'>, s: EruptionState): string {
  switch (id) {
    case 'p_chamber':
      return s.P_chamber_MPa.toFixed(2)
    case 't_magma':
      return s.T_magma_C.toFixed(0)
    case 'eta':
      return s.eta_Pas >= 1e4 ? s.eta_Pas.toExponential(2) : s.eta_Pas.toFixed(1)
    case 'q':
      return s.Q_m3s.toFixed(3)
    case 'lava_front':
      return s.lavaFrontM.toFixed(0)
    case 'melt':
      return s.meltFraction.toFixed(2)
    case 'crystal':
      return s.crystalFraction.toFixed(2)
    case 'ground_tilt':
      return s.groundTiltMicrostrain.toFixed(0)
    case 'tremor':
      return s.tremorRMS_mm_s.toFixed(2)
    case 'so2':
      return s.gasFluxSO2_t_d.toFixed(0)
    case 'heat_flux':
      return s.heatFlux_MW.toFixed(1)
    case 'yield_margin':
      return s.yieldStrengthMargin.toFixed(2)
    case 'dynamic_p':
      return s.dynamicPressure_kPa.toFixed(2)
    case 'channel_depth':
      return s.lavaChannelDepth_m.toFixed(2)
    case 'structures':
      return `${s.structuresAffected} / ${s.structures.length}`
    default: {
      const leftover: never = id
      return leftover
    }
  }
}

export function formatAvalancheMetric(id: MetricIdFor<'avalanche'>, s: AvalancheState): string {
  switch (id) {
    case 'slope':
      return s.slopeAngleDeg.toFixed(1)
    case 'friction':
      return s.frictionMu.toFixed(2)
    case 'density':
      return s.snowDensity_kg_m3.toFixed(0)
    case 'runout':
      return s.runoutDistance_m.toFixed(0)
    case 'speed':
      return s.flowSpeed_m_s.toFixed(1)
    case 'impact_p':
      return s.impactPressure_kPa.toFixed(2)
    case 'slab_depth':
      return s.slabFractureDepth_m.toFixed(2)
    case 'volume':
      return s.releasedVolume_k_m3.toFixed(1)
    case 'chalets':
      return `${s.chaletsAffected} / ${s.chalets.length}`
    default: {
      const leftover: never = id
      return leftover
    }
  }
}

export function formatTsunamiMetric(id: MetricIdFor<'tsunami'>, s: TsunamiState): string {
  switch (id) {
    case 'slip':
      return s.faultSlip_m.toFixed(2)
    case 'wave_h':
      return s.waveHeight_m.toFixed(2)
    case 'wavelength':
      return s.wavelength_km.toFixed(1)
    case 'celerity':
      return s.celerity_m_s.toFixed(1)
    case 'runup':
      return s.runup_m.toFixed(2)
    case 'froude':
      return s.froudeNumber.toFixed(2)
    case 'inundation':
      return s.inundationDepth_m.toFixed(2)
    case 'front':
      return s.waveFront_km.toFixed(1)
    case 'structures':
      return `${s.structuresAffected} / ${s.structures.length}`
    default: {
      const leftover: never = id
      return leftover
    }
  }
}

export function formatEarthquakeMetric(id: MetricIdFor<'earthquake'>, s: EarthquakeState): string {
  switch (id) {
    case 'mw':
      return s.magnitudeMw > 0.2 ? s.magnitudeMw.toFixed(2) : '—'
    case 'pga':
      return s.peakGroundAccel_m_s2.toFixed(2)
    case 'slip':
      return s.faultSlip_m.toFixed(2)
    case 'rupture_length':
      return s.ruptureLength_km.toFixed(1)
    case 'moment':
      return s.seismicMoment_Nm > 0 ? s.seismicMoment_Nm.toExponential(2) : '—'
    case 'duration':
      return s.ruptureDuration_s.toFixed(1)
    case 'sa':
      return s.spectralAccel_g.toFixed(2)
    case 'p_radius':
      return s.pWaveRadius_km.toFixed(1)
    case 's_radius':
      return s.sWaveRadius_km.toFixed(1)
    case 'shaking':
      return s.shaking.toFixed(2)
    case 'buildings':
      return `${s.buildingsAffected} / ${s.buildings.length}`
    default: {
      const leftover: never = id
      return leftover
    }
  }
}
