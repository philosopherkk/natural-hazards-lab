import * as THREE from 'three'
import type { StructureSeverity } from '../model/eruptionModel'
import { getPbrLibrary, pbrMaterial } from './pbrLibrary'

export interface HouseBuild {
  root: THREE.Group
  walls: THREE.Mesh
  roof: THREE.Object3D
  windows: THREE.Mesh[]
  fireGlow: THREE.PointLight
  ashOverlay: THREE.Mesh
  cracks: THREE.Mesh
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

let windowMaterial: THREE.MeshPhysicalMaterial | null = null

function glassMaterial(): THREE.MeshPhysicalMaterial {
  if (!windowMaterial) {
    windowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc5dcea,
      roughness: 0.04,
      metalness: 0.02,
      transparent: true,
      opacity: 0.55,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
    })
  }
  return windowMaterial
}

function makeHouse(): Omit<HouseBuild, 'distanceScene'> {
  const lib = getPbrLibrary()
  const root = new THREE.Group()
  const wallMat = pbrMaterial(lib.stucco, { repeat: [2, 2], normalScale: 0.7, roughness: 0.95 })
  const roofMat = pbrMaterial(lib.roof, { repeat: [3, 2], normalScale: 1.1, roughness: 0.88 })
  const woodMat = pbrMaterial(lib.bark, { repeat: [1, 2], normalScale: 0.8, color: 0xc4a080 })

  const walls = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.48), wallMat)
  walls.position.y = 0.23
  walls.castShadow = true
  walls.receiveShadow = true
  root.add(walls)

  const roof = new THREE.Group()
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.56), roofMat)
  left.position.set(-0.15, 0.52, 0)
  left.rotation.z = 0.48
  left.castShadow = true
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.56), roofMat)
  right.position.set(0.15, 0.52, 0)
  right.rotation.z = -0.48
  right.castShadow = true
  roof.add(left, right)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), wallMat)
  chimney.position.set(-0.12, 0.66, -0.08)
  chimney.castShadow = true
  roof.add(chimney)
  root.add(roof)

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.12), woodMat)
  door.position.set(0.3, 0.14, 0)
  root.add(door)

  const windows: THREE.Mesh[] = []
  const winMat = glassMaterial()
  for (const oz of [0.14, -0.14]) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.12, 0.1),
      pbrMaterial(lib.bark, { color: 0x3a2a22, roughness: 0.8, metalness: 0.05 }),
    )
    frame.position.set(0.3, 0.28, oz)
    root.add(frame)
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.09), winMat)
    w.position.set(0.312, 0.28, oz)
    w.rotation.y = Math.PI / 2
    root.add(w)
    windows.push(w)
  }

  const ashOverlay = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.5, 0.54),
    pbrMaterial(lib.snow, {
      repeat: [2, 2],
      color: 0x8d8478,
      transparent: true,
      opacity: 0,
      roughness: 1,
      depthWrite: false,
    }),
  )
  ashOverlay.position.y = 0.24
  root.add(ashOverlay)

  const cracks = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.4),
    new THREE.MeshStandardMaterial({
      map: lib.crack,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    }),
  )
  cracks.position.set(0.295, 0.26, 0)
  cracks.rotation.y = Math.PI / 2
  root.add(cracks)

  const fireGlow = new THREE.PointLight(0xff6622, 0, 2.5, 2)
  fireGlow.position.set(0, 0.35, 0)
  root.add(fireGlow)

  return { root, walls, roof, windows, fireGlow, ashOverlay, cracks }
}

export function buildVillage(): { group: THREE.Group; houses: HouseBuild[] } {
  const lib = getPbrLibrary()
  const group = new THREE.Group()
  const houses: HouseBuild[] = []

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 8),
    pbrMaterial(lib.asphalt, { repeat: [1, 4], normalScale: 0.5, roughness: 0.92 }),
  )
  road.rotation.x = -Math.PI / 2
  road.position.set(6.2, 0.012, 3.5)
  road.rotation.z = -0.35
  road.receiveShadow = true
  group.add(road)

  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 2.2),
      pbrMaterial(lib.soil, { repeat: [1, 2], normalScale: 0.6 }),
    )
    strip.rotation.x = -Math.PI / 2
    strip.position.set(4.8 + i * 1.1, 0.016, 1.2 + (i % 2) * 3.5)
    strip.receiveShadow = true
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
  let crackOp = 0

  house.walls.rotation.z = 0
  house.roof.rotation.z = 0
  house.walls.scale.y = 1
  house.root.position.y = 0.02
  house.root.scale.y = 1
  house.root.visible = true
  house.windows.forEach((w) => {
    w.visible = true
  })

  const wallMat = house.walls.material as THREE.MeshStandardMaterial
  wallMat.color.setHex(0xffffff)

  switch (severity) {
    case 'ash':
      ashOp = 0.35 + t * 0.25
      crackOp = 0.05
      break
    case 'blast':
      ashOp = 0.45
      crackOp = 0.55
      house.windows.forEach((w) => {
        w.visible = false
      })
      wallMat.color.setHex(0xc8b8a4)
      break
    case 'fire':
      ashOp = 0.5
      crackOp = 0.7
      fire = 0.7 + t * 0.3
      house.windows.forEach((w) => {
        w.visible = false
      })
      wallMat.color.setHex(0xb89a86)
      break
    case 'collapse':
      ashOp = 0.55
      crackOp = 0.9
      roofSink = 0.35
      wallTilt = 0.25
      fire = 0.3
      house.windows.forEach((w) => {
        w.visible = false
      })
      wallMat.color.setHex(0x9a8c80)
      break
    case 'buried':
      ashOp = 0.65
      crackOp = 0.45
      roofSink = 0.55
      wallTilt = 0.4
      buried = 1
      fire = 0
      house.windows.forEach((w) => {
        w.visible = false
      })
      wallMat.color.setHex(0x8a8074)
      break
    default:
      break
  }

  const ashMat = house.ashOverlay.material as THREE.MeshStandardMaterial
  ashMat.opacity = ashOp
  const crackMat = house.cracks.material as THREE.MeshStandardMaterial
  crackMat.opacity = crackOp
  house.roof.position.y = -roofSink
  house.roof.rotation.z = wallTilt * 0.6
  house.walls.rotation.z = wallTilt * 0.4
  house.walls.scale.y = 1 - buried * 0.35
  house.fireGlow.intensity = fire * 1.8
  if (severity === 'buried') {
    house.root.scale.y = Math.max(0.12, 1 - t * 0.88)
    house.root.position.y = 0.02 - t * 0.28
  }
}
