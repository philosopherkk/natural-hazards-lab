import * as THREE from 'three'
import { fbm } from './noise'

/** Irregular stratovolcano: radial gullies, spurs, and a crater, not a lathe of revolution. */
export function buildGulliedCone(): THREE.BufferGeometry {
  const rings = 52
  const segs = 88
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const stride = segs + 1

  for (let y = 0; y <= rings; y++) {
    const t = y / rings
    const height = t * 5.05
    let baseR = 4.45 * Math.pow(1 - t, 0.78)
    if (t > 0.82) {
      const c = (t - 0.82) / 0.18
      baseR = THREE.MathUtils.lerp(baseR, 0.72, c * c)
    }
    for (let s = 0; s <= segs; s++) {
      const ang = (s / segs) * Math.PI * 2
      const gully =
        Math.pow(Math.abs(Math.sin(ang * 2 + 0.55)), 3) * 0.34 +
        Math.pow(Math.abs(Math.sin(ang * 5 - 1.2)), 8) * 0.18
      const facing = Math.exp(-((ang - 0.42) ** 2) / 0.05) * 0.42
      const spur = Math.pow(Math.max(0, Math.cos(ang * 2 + 0.55)), 3) * 0.16
      const n = fbm(Math.cos(ang) * 1.6 + t * 2.4, Math.sin(ang) * 1.6 + 2, 12, 3)
      const cut = (gully + facing) * (0.45 + 0.55 * (1 - t))
      const r = Math.max(0.22, baseR * (1 - cut + spur) + (n - 0.5) * 0.42)
      positions.push(Math.cos(ang) * r, height, Math.sin(ang) * r)
      uvs.push(s / segs * 3, t * 2)
    }
  }

  for (let y = 0; y < rings; y++) {
    for (let s = 0; s < segs; s++) {
      const a = y * stride + s
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export type FlankChannel = {
  geometry: THREE.BufferGeometry
  base: Float32Array
  along: Float32Array
}

/** Lava ribbon draped on the southeast flank, from crater to toe. */
export function buildFlankChannel(angle = 0.42): FlankChannel {
  const seg = 36
  const span = 7
  const positions: number[] = []
  const uvs: number[] = []
  const along: number[] = []
  const indices: number[] = []
  const row = span + 1

  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const height = 4.55 * (1 - t) + 0.12 * t
    const baseR = 4.45 * Math.pow(Math.max(0.04, 1 - height / 5.05), 0.78) + 0.08
    const ang = angle + Math.sin(t * Math.PI) * 0.22
    const cx = Math.cos(ang) * baseR
    const cz = Math.sin(ang) * baseR
    const width = 0.16 + t * 0.72
    const side = ang + Math.PI / 2
    for (let j = 0; j <= span; j++) {
      const u = j / span - 0.5
      const bulge = (0.5 - Math.abs(u)) * 0.1
      positions.push(
        cx + Math.cos(side) * u * width,
        height + bulge,
        cz + Math.sin(side) * u * width,
      )
      uvs.push(t * 4, j / span)
      along.push(t)
    }
  }

  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < span; j++) {
      const a = i * row + j
      indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row)
    }
  }

  const geometry = new THREE.BufferGeometry()
  const base = new Float32Array(positions)
  geometry.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return { geometry, base, along: new Float32Array(along) }
}

export function revealChannel(
  mesh: THREE.Mesh,
  base: Float32Array,
  along: Float32Array,
  reach: number,
  lift: number,
  crustCutoff = 1,
): void {
  const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < along.length; i++) {
    const t = along[i]!
    const show = t <= reach && t <= crustCutoff
    attr.setXYZ(
      i,
      base[i * 3]!,
      show ? base[i * 3 + 1]! + lift : -6,
      base[i * 3 + 2]!,
    )
  }
  attr.needsUpdate = true
  mesh.geometry.computeVertexNormals()
  mesh.visible = reach > 0.02
}

/** Soft ash blob with a lumpy surface so the plume is a volume, not a smooth ball. */
export function lumpyCloud(radius: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 16, 12)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 1.4 + seed, y * 1.1 + seed * 0.3, seed, 3)
    const s = 0.72 + n * 0.55
    pos.setXYZ(i, x * s, y * s * 1.15, z * s)
  }
  geo.computeVertexNormals()
  return geo
}

export function makeConifer(
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
  snowMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.62, 6), trunkMat)
  trunk.position.y = 0.31
  trunk.castShadow = true
  g.add(trunk)
  const layers = [
    { r: 0.48, h: 0.52, y: 0.62 },
    { r: 0.36, h: 0.46, y: 0.92 },
    { r: 0.24, h: 0.4, y: 1.2 },
  ]
  for (const layer of layers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(layer.r, layer.h, 7), leafMat)
    cone.position.y = layer.y
    cone.castShadow = true
    g.add(cone)
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 6), snowMat)
  cap.position.y = 1.42
  g.add(cap)
  return g
}
