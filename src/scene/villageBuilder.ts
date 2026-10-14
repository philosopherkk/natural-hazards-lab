import * as THREE from 'three'
import type { StructureSeverity } from '../model/eruptionModel'

export interface HouseBuild {
  root: THREE.Group
  walls: THREE.Mesh
  roof: THREE.Mesh
  windows: THREE.Mesh[]
  fireGlow: THREE.PointLight
  ashOverlay: THREE.Mesh
  distanceScene: number
}

const HOUSE_LAYOUT: { x: number; z: number; rot: number; distM: number }[] = [
  { x: 5.2, z: 2.1, rot: -0.35, distM: 420 },
  { x: 6.1, z: 3.4, rot: -0.2, distM: 580 },
  { x: 7.0, z: 1.2, rot: 0.15, distM: 720 },
  { x: 5.8, z: 4.8, rot: -0.5, distM: 890 },
  { x: 8.2, z: 2.8, rot: 0.05, distM: 1050 },
  { x: 7.5, z: 5.2, rot: -0.25, distM: 1180 },
  { x: 9.0, z: 4.0, rot: 0.2, distM: 1320 },
  { x: 8.8, z: 6.1, rot: -0.15, distM: 1480 },
]

function makeHouse(): Omit<HouseBuild, 'distanceScene'> {
  const root = new THREE.Group()
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.88, metalness: 0 })
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6b3e2e, roughness: 0.92, metalness: 0 })
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x112233,
    emissiveIntensity: 0.15,
  })

  const walls = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.45), wallMat)
  walls.position.y = 0.21
  walls.castShadow = true
  walls.receiveShadow = true
  root.add(walls)

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 4), roofMat)
  roof.position.y = 0.55
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  root.add(roof)

  const windows: THREE.Mesh[] = []
  for (const oz of [0.23, -0.23]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), winMat)
    w.position.set(0.276, 0.22, oz)
    w.rotation.y = Math.PI / 2
    root.add(w)
    windows.push(w)
  }

  const ashOverlay = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.44, 0.48),
    new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 1,
      transparent: true,
      opacity: 0,
    }),
  )
  ashOverlay.position.y = 0.22
  root.add(ashOverlay)

  const fireGlow = new THREE.PointLight(0xff6622, 0, 2.5, 2)
  fireGlow.position.set(0, 0.35, 0)
  root.add(fireGlow)

  return { root, walls, roof, windows, fireGlow, ashOverlay }
}

export function buildVillage(): { group: THREE.Group; houses: HouseBuild[] } {
  const group = new THREE.Group()
  const houses: HouseBuild[] = []

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 }),
  )
  road.rotation.x = -Math.PI / 2
  road.position.set(6.2, 0.01, 3.5)
  road.rotation.z = -0.35
  group.add(road)

  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1 }),
    )
    strip.rotation.x = -Math.PI / 2
    strip.position.set(4.8 + i * 1.1, 0.015, 1.2 + (i % 2) * 3.5)
    group.add(strip)
  }

  for (const layout of HOUSE_LAYOUT) {
    const h = makeHouse()
    h.root.position.set(layout.x, 0.02, layout.z)
    h.root.rotation.y = layout.rot
    group.add(h.root)
    houses.push({ ...h, distanceScene: layout.distM })
  }

  return { group, houses }
}

export function applyHouseSeverity(house: HouseBuild, severity: StructureSeverity, blend: number) {
  const t = blend
  let ashOp = 0
  let roofSink = 0
  let wallTilt = 0
  let fire = 0
  let buried = 0

  house.walls.rotation.z = 0
  house.roof.rotation.z = 0
  house.walls.scale.y = 1
  house.root.position.y = 0.02
  house.root.scale.y = 1
  house.root.visible = true
  house.windows.forEach((w) => {
    w.visible = true
  })

  switch (severity) {
    case 'ash':
      ashOp = 0.35 + t * 0.25
      break
    case 'blast':
      ashOp = 0.45
      house.windows.forEach((w) => {
        w.visible = false
      })
      break
    case 'fire':
      ashOp = 0.5
      fire = 0.7 + t * 0.3
      house.windows.forEach((w) => {
        w.visible = false
      })
      break
    case 'collapse':
      ashOp = 0.55
      roofSink = 0.35
      wallTilt = 0.25
      fire = 0.3
      house.windows.forEach((w) => {
        w.visible = false
      })
      break
    case 'buried':
      ashOp = 0.65
      roofSink = 0.55
      wallTilt = 0.4
      buried = 1
      fire = 0
      house.windows.forEach((w) => {
        w.visible = false
      })
      break
    default:
      break
  }

  const ashMat = house.ashOverlay.material as THREE.MeshStandardMaterial
  ashMat.opacity = ashOp
  house.roof.position.y = 0.55 - roofSink
  house.roof.rotation.z = wallTilt * 0.6
  house.walls.rotation.z = wallTilt * 0.4
  house.walls.scale.y = 1 - buried * 0.35
  house.fireGlow.intensity = fire * 1.8
  if (severity === 'buried') {
    house.root.scale.y = Math.max(0.12, 1 - t * 0.88)
    house.root.position.y = 0.02 - t * 0.28
  }
}
