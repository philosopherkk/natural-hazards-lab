import * as THREE from 'three'
import { createLavaTexture, createRockTextures } from './textures'

export interface VolcanoBuildResult {
  root: THREE.Group
  chamber: THREE.Mesh
  conduit: THREE.Mesh
  lavaFlow: THREE.Mesh
  craterGlow: THREE.PointLight
  clipMaterials: THREE.Material[]
}

function volcanoProfilePoints(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  const segments = 32
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const y = t * 4.8
    let r = 4.2 * (1 - t * 0.92)
    r += Math.sin(t * 18) * 0.08 * (1 - t)
    r += Math.sin(t * 7 + 1.2) * 0.12 * (1 - t * 0.5)
    if (t > 0.88) {
      const crater = (t - 0.88) / 0.12
      r *= 1 - crater * 0.35
    }
    if (t < 0.08) r *= 0.85 + t * 2
    pts.push(new THREE.Vector2(Math.max(0.15, r), y))
  }
  return pts
}

export function buildVolcano(): VolcanoBuildResult {
  const root = new THREE.Group()
  const { map, roughnessMap, normalMap } = createRockTextures()
  const clipMaterials: THREE.Material[] = []

  const makeRockMat = (colorTint?: number) => {
    const mat = new THREE.MeshStandardMaterial({
      map,
      roughnessMap,
      normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.85,
      metalness: 0.05,
      color: colorTint ?? 0xffffff,
    })
    mat.side = THREE.DoubleSide
    clipMaterials.push(mat)
    return mat
  }

  const coneGeo = new THREE.LatheGeometry(volcanoProfilePoints(), 64)
  coneGeo.computeVertexNormals()
  const cone = new THREE.Mesh(coneGeo, makeRockMat(0xc4a882))
  cone.castShadow = true
  cone.receiveShadow = true
  root.add(cone)

  for (let layer = 0; layer < 5; layer++) {
    const y0 = 0.4 + layer * 0.85
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.5 - layer * 0.55, 0.06, 8, 48),
      makeRockMat(new THREE.Color().setHSL(0.08, 0.35, 0.32 - layer * 0.03).getHex()),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = y0
    ring.castShadow = true
    root.add(ring)
  }

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({
      color: 0x2d4a32,
      roughness: 0.95,
      metalness: 0,
    }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  root.add(ground)

  const chamberGeo = new THREE.SphereGeometry(1.15, 32, 24)
  const lavaTex = createLavaTexture()
  const chamberMat = new THREE.MeshStandardMaterial({
    map: lavaTex,
    emissive: new THREE.Color(0xff4400),
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95,
  })
  clipMaterials.push(chamberMat)
  const chamber = new THREE.Mesh(chamberGeo, chamberMat)
  chamber.position.set(0, 0.85, 0)
  chamber.scale.set(1.4, 0.75, 1.2)
  root.add(chamber)

  const conduitGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.6, 24, 1, true)
  const conduitMat = new THREE.MeshStandardMaterial({
    color: 0x4a3025,
    roughness: 0.9,
    metalness: 0.05,
    emissive: new THREE.Color(0x331100),
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  })
  clipMaterials.push(conduitMat)
  const conduit = new THREE.Mesh(conduitGeo, conduitMat)
  conduit.position.set(0, 2.6, 0)
  root.add(conduit)

  const lavaFlowGeo = new THREE.PlaneGeometry(2.5, 5, 16, 32)
  const pos = lavaFlowGeo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    pos.setZ(i, Math.sin(x * 1.2) * 0.15 + Math.random() * 0.05)
    pos.setY(i, y - Math.abs(x) * 0.3)
  }
  lavaFlowGeo.rotateX(-Math.PI / 2)
  lavaFlowGeo.translate(2.2, 0.05, 1.5)
  const lavaMat = new THREE.MeshStandardMaterial({
    map: lavaTex,
    emissive: new THREE.Color(0xff5500),
    emissiveIntensity: 1,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide,
  })
  const lavaFlow = new THREE.Mesh(lavaFlowGeo, lavaMat)
  lavaFlow.receiveShadow = true
  root.add(lavaFlow)

  const craterGlow = new THREE.PointLight(0xff6622, 0, 8, 2)
  craterGlow.position.set(0, 4.55, 0)
  root.add(craterGlow)

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.08, 12, 32),
    makeRockMat(0x5c4033),
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = 4.45
  root.add(rim)

  return { root, chamber, conduit, lavaFlow, craterGlow, clipMaterials }
}
