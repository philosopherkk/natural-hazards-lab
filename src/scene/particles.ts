import * as THREE from 'three'
import { hash2 } from './noise'
import { getPbrLibrary } from './pbrLibrary'

const TAU = Math.PI * 2

export class AshPlumeSystem {
  readonly points: THREE.Points
  private count: number

  constructor(count = 2600) {
    this.count = count
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const lib = getPbrLibrary()
    const mat = new THREE.PointsMaterial({
      color: 0xc5bfb6,
      size: 0.16,
      map: lib.softGlow,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geo, mat)
  }

  /** Rebuilds the plume from time so scrub and reverse match. */
  sync(timeSec: number, activity: number) {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const rise = 1.1 + activity * 7.2
    for (let i = 0; i < this.count; i++) {
      const u = hash2(i, 1, 3)
      const v = hash2(i, 7, 9)
      const life = (timeSec * (0.18 + activity * 0.22) + u) % 1
      const ang = v * TAU + timeSec * 0.12
      const rad = life * life * (0.25 + activity * 2.6)
      arr[i * 3] = Math.cos(ang) * rad + life * activity * 1.15
      arr[i * 3 + 1] = 4.55 + life * rise
      arr[i * 3 + 2] = Math.sin(ang) * rad * 0.85
    }
    pos.needsUpdate = true
    const mat = this.points.material as THREE.PointsMaterial
    mat.opacity = activity < 0.05 ? 0 : 0.12 + activity * 0.5
    mat.size = 0.08 + activity * 0.16
  }
}

export class SparkSystem {
  readonly points: THREE.Points
  private count: number

  constructor(count = 520) {
    this.count = count
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const lib = getPbrLibrary()
    const mat = new THREE.PointsMaterial({
      color: 0xffcc66,
      size: 0.09,
      map: lib.softGlow,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geo, mat)
  }

  sync(timeSec: number, activity: number) {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < this.count; i++) {
      const u = hash2(i, 3, 11)
      const v = hash2(i, 5, 13)
      const w = hash2(i, 9, 17)
      const life = (timeSec * (0.85 + u * 0.7) + v) % 1
      const ang = w * TAU
      const speed = 0.7 + u * 1.1
      const vx = Math.cos(ang) * speed * 0.42
      const vz = Math.sin(ang) * speed * 0.42
      const vy = speed * (0.85 + v * 0.8)
      const t = life
      const y = 4.58 + vy * t * 1.35 - 3.4 * t * t
      if (activity < 0.12 || y < 4.35) {
        arr[i * 3] = 0
        arr[i * 3 + 1] = 4.5
        arr[i * 3 + 2] = 0
      } else {
        arr[i * 3] = vx * t * (0.4 + activity)
        arr[i * 3 + 1] = y
        arr[i * 3 + 2] = vz * t * (0.4 + activity)
      }
    }
    pos.needsUpdate = true
    ;(this.points.material as THREE.PointsMaterial).opacity = Math.min(1, activity * 1.15)
  }
}
