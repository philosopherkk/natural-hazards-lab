/** Per-hazard physical conditions, persisted in sessionStorage. */

export interface NumericSpec {
  min: number
  max: number
  step: number
  defaultValue: number
}

const PREFIX = 'nhl-conditions:'

export function clampCondition(value: number, spec: NumericSpec): number {
  if (!Number.isFinite(value)) return spec.defaultValue
  const clamped = Math.min(spec.max, Math.max(spec.min, value))
  const steps = Math.round((clamped - spec.min) / spec.step)
  const snapped = spec.min + steps * spec.step
  const decimals = (spec.step.toString().split('.')[1] ?? '').length
  return Number(snapped.toFixed(Math.min(4, decimals)))
}

export function loadConditionValues(
  hazard: string,
  specs: Record<string, NumericSpec>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, spec] of Object.entries(specs)) out[id] = spec.defaultValue
  try {
    const raw = sessionStorage.getItem(PREFIX + hazard)
    if (!raw) return out
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const [id, spec] of Object.entries(specs)) {
      const value = parsed[id]
      if (typeof value === 'number') out[id] = clampCondition(value, spec)
    }
  } catch {
    /* keep defaults when storage is blocked or corrupt */
  }
  return out
}

export function saveConditionValues(hazard: string, values: Record<string, number>): void {
  try {
    sessionStorage.setItem(PREFIX + hazard, JSON.stringify(values))
  } catch {
    /* private mode or quota */
  }
}
