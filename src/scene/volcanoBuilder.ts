import * as THREE from 'three'
import { getLavaTexture, getRockTextures } from './textures'
import { buildVillage, type HouseBuild } from './villageBuilder'

export interface VolcanoBuildResult {
  root: THREE.Group
  chamber: THREE.Mesh
  conduit: THREE.Mesh
  lavaFlow: THREE.Mesh
  lavaCrust: THREE.Mesh
  craterGlow: THREE.PointLight
  clipMaterials: THREE.Material[]
  geologyLayers: THREE.Mesh[]
  dikes: THREE.Mesh[]
  village: THREE.Group
  houses: HouseBuild[]
  magmaCore: THREE.Mesh
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
  const { map, roughnessMap, normalMap } = getRockTextures()
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

  const geologyLayers: THREE.Mesh[] = []
  const layerColors = [0x3d4a3a, 0x4a4035, 0x5c5040, 0x6a5544, 0x524638]
  for (let layer = 0; layer < 5; layer++) {
    const y0 = 0.15 + layer * 0.55
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5 - layer * 0.35, 5.8 - layer * 0.35, 0.08, 48, 1, true),
      new THREE.MeshStandardMaterial({
        color: layerColors[layer]!,
        roughness: 0.95,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      }),
    )
    disk.position.y = y0
    clipMaterials.push(disk.material as THREE.Material)
    root.add(disk)
    geologyLayers.push(disk)
  }

  const dikes: THREE.Mesh[] = []
  for (let d = 0; d < 3; d++) {
    const dike = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.8 + d * 0.4, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x2a1810,
        emissive: 0x441100,
        emissiveIntensity: 0.15,
        roughness: 0.85,
      }),
    )
    dike.position.set(-1.2 + d * 1.1, 0.5 + d * 0.3, -0.6 + d * 0.4)
    dike.rotation.z = 0.15 - d * 0.08
    clipMaterials.push(dike.material as THREE.Material)
    root.add(dike)
    dikes.push(dike)
  }

  const coneGeo = new THREE.LatheGeometry(volcanoProfilePoints(), 48)
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

  const { group: village, houses } = buildVillage()
  root.add(village)

  const chamberGeo = new THREE.SphereGeometry(1.15, 32, 24)
  const lavaTex = getLavaTexture()
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

  const magmaCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 24, 16),
    new THREE.MeshStandardMaterial({
      emissive: 0xffaa00,
      emissiveIntensity: 1.2,
      color: 0xff6600,
      transparent: true,
      opacity: 0.9,
    }),
  )
  magmaCore.position.copy(chamber.position)
  magmaCore.scale.copy(chamber.scale)
  clipMaterials.push(magmaCore.material as THREE.Material)
  root.add(magmaCore)

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

  const lavaFlowGeo = new THREE.PlaneGeometry(3.2, 7, 16, 32)
  const pos = lavaFlowGeo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const seed = Math.sin(i * 12.9898) * 43758.5453
    const r = seed - Math.floor(seed)
    pos.setZ(i, Math.sin(x * 1.2) * 0.15 + r * 0.05)
    pos.setY(i, y - Math.abs(x) * 0.28)
  }
  lavaFlowGeo.rotateX(-Math.PI / 2)
  lavaFlowGeo.translate(2.0, 0.05, 1.2)
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

  const crustGeo = lavaFlowGeo.clone()
  const crustMat = new THREE.MeshStandardMaterial({
    color: 0x1a1110,
    roughness: 0.98,
    metalness: 0.02,
    emissive: 0x220800,
    emissiveIntensity: 0.05,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  })
  const lavaCrust = new THREE.Mesh(crustGeo, crustMat)
  lavaCrust.position.copy(lavaFlow.position)
  lavaCrust.rotation.copy(lavaFlow.rotation)
  lavaCrust.scale.copy(lavaFlow.scale)
  root.add(lavaCrust)

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

  return {
    root,
    chamber,
    conduit,
    lavaFlow,
    lavaCrust,
    craterGlow,
    clipMaterials,
    geologyLayers,
    dikes,
    village,
    houses,
    magmaCore,
  }
}
