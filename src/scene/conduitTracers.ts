import * as THREE from 'three'

/** Deterministic magma parcel positions along conduit from time and flow rate. */
export class ConduitTracerSystem {
  readonly points: THREE.Points
  private count: number
  private conduitBottomY = 0.9
  private conduitTopY = 4.4

  constructor(count = 48) {
    this.count = count
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffaa44,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(geo, mat)
  }

  renderAt(timeSec: number, Q_m3s: number, activity: number) {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const speed = 0.15 + Math.min(2.5, Q_m3s * 8) * activity
    for (let i = 0; i < this.count; i++) {
      const phase = (timeSec * speed + i / this.count) % 1
      const y = this.conduitBottomY + phase * (this.conduitTopY - this.conduitBottomY)
      const wobble = Math.sin(timeSec * 3 + i * 0.7) * 0.04 * activity
      arr[i * 3] = wobble
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = wobble * 0.5
    }
    pos.needsUpdate = true
    const mat = this.points.material as THREE.PointsMaterial
    mat.opacity = activity > 0.08 ? 0.25 + activity * 0.65 : 0
    mat.size = 0.08 + activity * 0.1
    this.points.visible = activity > 0.05 && Q_m3s > 0
  }
}
