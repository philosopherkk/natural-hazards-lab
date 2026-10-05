import type { Translations } from './types'

export const en: Translations = {
  htmlLang: 'en',
  appTitle: 'Volcano Lab',
  appSubtitle: 'Interactive Eruption Timeline',
  langToggle: '中文',
  langToggleAria: 'Switch language to Traditional Chinese',
  timeline: 'Timeline',
  timelineAria: 'Scrub eruption timeline from 0 to 30 seconds',
  intensity: 'Eruption intensity',
  intensityAria: 'Scale vent discharge, plume height, and lava output',
  cutaway: 'Cutaway interior',
  cutawayAria: 'Reveal magma chamber, conduit, and crustal structure',
  labels: 'Anatomy labels',
  labelsAria: 'Show or hide callout labels on the 3D model',
  play: 'Play',
  pause: 'Pause',
  reverse: 'Reverse',
  reverseAria: 'Play timeline backward',
  reset: 'Reset',
  resetAria: 'Return to start of timeline',
  stageHeading: 'Eruption stage',
  stageTime: 'Elapsed',
  legendHeading: 'Legend',
  helpHeading: 'Controls & accessibility',
  helpIntro:
    'Explore how magma storage, conduit transport, and surface processes evolve through a stylized 30-second eruption cycle. Drag the timeline or use keyboard shortcuts.',
  footerVersion: 'Version',
  footerUpdated: 'Updated',
  canvasAria: 'Three-dimensional volcano model with eruption animation',
  loading: 'Initializing WebGL scene…',
  labelChamber: 'Magma chamber',
  labelConduit: 'Vent conduit',
  labelCrater: 'Summit crater',
  labelLavaFlow: 'Lava flow',
  labelPlume: 'Eruption plume',
  legend: [
    { color: '#8b4513', label: 'Basaltic strata / country rock' },
    { color: '#c45c26', label: 'Molten magma & lava' },
    { color: '#6b7280', label: 'Ash & tephra column' },
    { color: '#fbbf24', label: 'Incandescent sparks & gas glow' },
  ],
  keyboard: [
    { keys: 'Space', action: 'Play or pause timeline' },
    { keys: '← / →', action: 'Step timeline backward / forward' },
    { keys: 'Home', action: 'Jump to timeline start' },
    { keys: 'End', action: 'Jump to timeline end' },
    { keys: 'C', action: 'Toggle cutaway interior' },
    { keys: 'L', action: 'Toggle anatomy labels' },
    { keys: 'R', action: 'Toggle reverse playback' },
  ],
  stages: [
    {
      id: 'build-up',
      title: 'Build-up — Magma accumulation & crustal stress',
      description:
        'During prolonged repose, basaltic or andesitic melt collects in a shallow magma reservoir fed by dikes from deeper sources. Volatile species (H₂O, CO₂, S) remain dissolved at lithostatic pressure but increase the bulk compressibility of the mush. Thermal convection and crystal fractionation gradually enrich the upper chamber in silica and volatiles. Elastic strain energy accumulates in the surrounding edifice and basement as magma influx inflates the system; microseismicity and subtle ground deformation (GPS, InSAR) often herald this stage long before any surface eruption. In this phase the conduit may be partially sealed by quenched glass and hydrothermal minerals, trapping pressurized gas.',
    },
    {
      id: 'pre-eruptive',
      title: 'Pre-eruptive — Degassing, pressurization & unsealing',
      description:
        'As overpressure approaches the tensile strength of the cap rock, fractures propagate upward through the conduit zone. Exsolution of volatiles forms a separate vapor phase; bubbles nucleate, coalesce, and rise, lowering effective magma density and accelerating buoyancy-driven ascent. Long-period seismic tremor and harmonic events reflect fluid resonance in the conduit. Summit fumaroles intensify, issuing SO₂ and H₂S; acid leaching may destabilize crater walls. The free surface in the chamber sloshes and fragments the foamy cap, sending the first batches of gas-rich magma toward the vent. This is the critical transition from closed-system pressurization to open-system degassing.',
    },
    {
      id: 'eruption-onset',
      title: 'Eruption onset — Vent opening & initial discharge',
      description:
        'When the conduit connects the chamber to the atmosphere, pressure drops abruptly along a decompression path. The leading magma fragments by homogeneous or heterogeneous bubble nucleation, producing a mixture of liquid clots, crystals, and expanding gas — a multiphase jet emerges from the crater. Early activity is often Vulcanian or Strombolian: discrete bursts eject incandescent bombs and lithic blocks from the vent walls. Pyroclastic density currents are unlikely until column collapse begins; instead, short lava fountains and spatter ramps may construct ephemeral cones within the crater. Ash advection downwind begins as fine particles from ruptured bubble walls enter the plume.',
    },
    {
      id: 'active',
      title: 'Active eruption — Sustained plume, lava effusion & tephra fallout',
      description:
        'With steady magma supply, the eruption enters a sustained discharge regime. The eruption column rises through momentum flux from the vent and buoyancy from superheated gas; entrainment of ambient air lowers bulk density until the plume reaches the level of neutral buoyancy. Fine ash (<2 mm) undergoes turbulent diffusion and gravitational settling, producing tephra fallout fans and aviation hazards. Simultaneously, low-viscosity lava may pour from flank fissures or the summit, forming channelized flows whose rheology follows a temperature-dependent Bingham or Newtonian model with crusting and levees. Lightning in the plume arises from triboelectric charging of ice-coated particles in the umbrella cloud. Conduit erosion widens the vent, modulating mass eruption rate.',
    },
    {
      id: 'settling',
      title: 'Settling — Waning discharge, column collapse & post-eruptive cooling',
      description:
        'As chamber pressure and volatile content decline, mass flux decreases and the plume weakens. The column may become underpowered, leading to partial collapse and pyroclastic flows that sweep radial drainages — even during otherwise effusive-dominated episodes. Lava flows stagnate as supply wanes; surface crust thickens and insulates the interior, prolonging emplacement of lobes. Secondary lahars can form if ash mantles slopes and later mixes with rain or meltwater. Degassing shifts to passive fumarolic release; the conduit begins to heal with intrusive plugs and hydrothermal alteration. Geodetic signals often show deflation as the magma reservoir empties, completing the cycle until the next build-up.',
    },
  ],
}
