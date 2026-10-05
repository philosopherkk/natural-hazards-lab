import * as THREE from 'three'

export class AshPlumeSystem {
  readonly points: THREE.Points
  private velocities: Float32Array
  private count: number
  private spread = 2.2

  constructor(count = 4000) {
    this.count = count
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.4
      positions[i * 3 + 1] = 4.5 + Math.random() * 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      this.resetVelocity(i)
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0x9ca3af,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    this.points = new THREE.Points(geo, mat)
  }

  private resetVelocity(i: number) {
    this.velocities[i * 3] = (Math.random() - 0.5) * 0.03
    this.velocities[i * 3 + 1] = 0.12 + Math.random() * 0.25
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03
  }

  update(_dt: number, activity: number, wind = 0.4) {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < this.count; i++) {
      if (activity < 0.05) continue
      arr[i * 3] += (this.velocities[i * 3] + wind * 0.02) * activity
      arr[i * 3 + 1] += this.velocities[i * 3 + 1] * activity
      arr[i * 3 + 2] += this.velocities[i * 3 + 2] * activity
      const dx = arr[i * 3]
      const dz = arr[i * 3 + 2]
      if (arr[i * 3 + 1] > 4.5 + activity * 8 || Math.hypot(dx, dz) > this.spread + activity * 3) {
        arr[i * 3] = (Math.random() - 0.5) * 0.3
        arr[i * 3 + 1] = 4.5 + Math.random() * 0.2
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3
        this.resetVelocity(i)
      }
    }
    pos.needsUpdate = true
    const mat = this.points.material as THREE.PointsMaterial
    mat.opacity = 0.15 + activity * 0.5
    mat.size = 0.05 + activity * 0.12
  }
}

export class SparkSystem {
  readonly points: THREE.Points
  private velocities: Float32Array
  private count: number

  constructor(count = 800) {
    this.count = count
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      this.respawn(i, positions)
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffcc33,
      size: 0.06,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(geo, mat)
  }

  private respawn(i: number, arr: Float32Array) {
    arr[i * 3] = (Math.random() - 0.5) * 0.25
    arr[i * 3 + 1] = 4.6
    arr[i * 3 + 2] = (Math.random() - 0.5) * 0.25
    const speed = 0.4 + Math.random() * 0.8
    const angle = Math.random() * Math.PI * 2
    this.velocities[i * 3] = Math.cos(angle) * speed * 0.15
    this.velocities[i * 3 + 1] = speed * (0.5 + Math.random())
    this.velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.15
  }

  update(dt: number, activity: number) {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < this.count; i++) {
      if (activity < 0.1) continue
      arr[i * 3] += this.velocities[i * 3] * dt * activity
      arr[i * 3 + 1] += this.velocities[i * 3 + 1] * dt * activity
      arr[i * 3 + 2] += this.velocities[i * 3 + 2] * dt * activity
      this.velocities[i * 3 + 1] -= 2.5 * dt
      if (arr[i * 3 + 1] < 4.2) this.respawn(i, arr)
    }
    pos.needsUpdate = true
    ;(this.points.material as THREE.PointsMaterial).opacity = Math.min(1, activity * 1.2)
  }
}
