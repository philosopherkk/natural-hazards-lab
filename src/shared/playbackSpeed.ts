const STORAGE_KEY = 'hazards-lab-playback-speed'

export const PLAYBACK_SPEED_OPTIONS = [0.5, 1, 2, 4] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEED_OPTIONS)[number]

export function getPlaybackSpeed(): PlaybackSpeed {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  const n = raw ? parseFloat(raw) : 1
  return (PLAYBACK_SPEED_OPTIONS as readonly number[]).includes(n) ? (n as PlaybackSpeed) : 1
}

export function setPlaybackSpeed(speed: PlaybackSpeed): void {
  sessionStorage.setItem(STORAGE_KEY, String(speed))
}
