import * as THREE from 'three'
import { fbm } from './noise'
import { buildFlankChannel, buildGulliedCone } from './meshForms'
import { getPbrLibrary, pbrMaterial } from './pbrLibrary'
import { buildVillage, type HouseBuild } from './villageBuilder'

export interface VolcanoBuildResult {
  root: THREE.Group
  cone: THREE.Mesh
  chamber: THREE.Mesh
  conduit: THREE.Mesh
  lavaFlow: THREE.Mesh
  lavaCrust: THREE.Mesh
  craterPool: THREE.Mesh
  craterCrust: THREE.Mesh
  craterGlow: THREE.PointLight
  clipMaterials: THREE.Material[]
  geologyLayers: THREE.Mesh[]
  dikes: THREE.Mesh[]
  village: THREE.Group
  houses: HouseBuild[]
  magmaCore: THREE.Mesh
  lavaBase: Float32Array
  lavaAlong: Float32Array
}

function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z)
  const n = fbm(x * 0.55, z * 0.55, 6, 4)
  const foothill = Math.exp(-(d * d) / 22) * 0.85
  const ridge = (n - 0.5) * 0.7 * Math.min(1, d / 1.8)
  const villageFlat = THREE.MathUtils.smoothstep(x, 3.2, 5.2)
  return Math.max(0, (foothill + ridge) * (1 - villageFlat * 0.9))
}

export function buildVolcano(): VolcanoBuildResult {
  const lib = getPbrLibrary()
  const root = new THREE.Group()
  const clipMaterials: THREE.Material[] = []

  const makeRockMat = (colorTint?: number, repeat: [number, number] = [3, 2]) => {
    const mat = pbrMaterial(lib.rock, {
      repeat,
      color: colorTint ?? 0xffffff,
      normalScale: 1.15,
      roughness: 0.92,
      side: THREE.DoubleSide,
    })
    clipMaterials.push(mat)
    return mat
  }

  const geologyLayers: THREE.Mesh[] = []
  const layerTints = [0x8a9a78, 0xc4a882, 0x9a7a62, 0xb89674, 0x6e5848]
  for (let layer = 0; layer < 5; layer++) {
    const y0 = 0.18 + layer * 0.52
    const mat = pbrMaterial(lib.rock, {
      repeat: [2, 1],
      color: layerTints[layer],
      normalScale: 0.8,
      roughness: 0.95,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    })
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4 - layer * 0.32, 5.7 - layer * 0.32, 0.1, 48, 1, true),
      mat,
    )
    disk.position.y = y0
    clipMaterials.push(mat)
    root.add(disk)
    geologyLayers.push(disk)
  }

  const dikes: THREE.Mesh[] = []
  for (let d = 0; d < 3; d++) {
    const mat = pbrMaterial(lib.crust, {
      repeat: [1, 2],
      color: 0x4a3028,
      emissive: 0x441100,
      emissiveIntensity: 0.15,
      normalScale: 1,
      roughness: 0.9,
    })
    const dike = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8 + d * 0.4, 0.38), mat)
    dike.position.set(-1.2 + d * 1.1, 0.55 + d * 0.28, -0.6 + d * 0.4)
    dike.rotation.z = 0.15 - d * 0.08
    clipMaterials.push(mat)
    root.add(dike)
    dikes.push(dike)
  }

  const cone = new THREE.Mesh(buildGulliedCone(), makeRockMat(0xd2b48c, [2.5, 3]))
  cone.castShadow = true
  cone.receiveShadow = true
  root.add(cone)

  const groundGeo = new THREE.PlaneGeometry(36, 36, 80, 80)
  groundGeo.rotateX(-Math.PI / 2)
  const gPos = groundGeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i)
    const z = gPos.getZ(i)
    gPos.setY(i, groundHeight(x, z))
  }
  groundGeo.computeVertexNormals()
  const ground = new THREE.Mesh(
    groundGeo,
    pbrMaterial(lib.soil, { repeat: [8, 8], normalScale: 1.05, roughness: 0.96 }),
  )
  ground.receiveShadow = true
  root.add(ground)

  const talusGeo = new THREE.DodecahedronGeometry(0.22, 0)
  const talusMat = pbrMaterial(lib.rock, { repeat: [1, 1], color: 0x9a8070, normalScale: 1, roughness: 0.9 })
  const talus = new THREE.InstancedMesh(talusGeo, talusMat, 64)
  talus.castShadow = true
  talus.receiveShadow = true
  const dummy = new THREE.Object3D()
  const gullyAngles = [0.42, 0.42 + Math.PI, 2.0, 2.0 + Math.PI]
  for (let i = 0; i < 64; i++) {
    const ang = gullyAngles[i % gullyAngles.length]! + (i % 7) * 0.05
    const rad = 2.4 + (i % 9) * 0.28
    const x = Math.cos(ang) * rad
    const z = Math.sin(ang) * rad
    dummy.position.set(x, groundHeight(x, z) + 0.06, z)
    dummy.rotation.set(i * 0.5, ang, i * 0.17)
    dummy.scale.setScalar(0.45 + (i % 5) * 0.22)
    dummy.updateMatrix()
    talus.setMatrixAt(i, dummy.matrix)
  }
  root.add(talus)

  const { group: village, houses } = buildVillage()
  root.add(village)

  const lavaMat = pbrMaterial(lib.lava, {
    repeat: [2, 3],
    emissive: 0xff5500,
    emissiveIntensity: 1.1,
    roughness: 0.45,
    normalScale: 0.8,
    side: THREE.DoubleSide,
  })
  const chamber = new THREE.Mesh(new THREE.SphereGeometry(1.15, 36, 28), lavaMat.clone())
  const chamberMat = chamber.material as THREE.MeshStandardMaterial
  chamberMat.transparent = true
  chamberMat.opacity = 0.96
  clipMaterials.push(chamberMat)
  chamber.position.set(0, 0.85, 0)
  chamber.scale.set(1.4, 0.75, 1.2)
  root.add(chamber)

  const magmaCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 28, 20),
    new THREE.MeshStandardMaterial({
      emissive: 0xffaa22,
      emissiveIntensity: 1.3,
      color: 0xff6600,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
    }),
  )
  magmaCore.position.copy(chamber.position)
  magmaCore.scale.copy(chamber.scale)
  clipMaterials.push(magmaCore.material as THREE.Material)
  root.add(magmaCore)

  const conduitMat = pbrMaterial(lib.rock, {
    repeat: [1, 3],
    color: 0x6a5048,
    emissive: 0x331100,
    emissiveIntensity: 0.25,
    roughness: 0.88,
    normalScale: 0.9,
    side: THREE.DoubleSide,
  })
  clipMaterials.push(conduitMat)
  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.6, 28, 1, true), conduitMat)
  conduit.position.set(0, 2.6, 0)
  root.add(conduit)

  const channel = buildFlankChannel(0.42)
  const flowMat = lavaMat.clone()
  if (flowMat.map) {
    flowMat.map = flowMat.map.clone()
    flowMat.map.wrapS = flowMat.map.wrapT = THREE.RepeatWrapping
    flowMat.map.needsUpdate = true
  }
  const lavaFlow = new THREE.Mesh(channel.geometry, flowMat)
  lavaFlow.receiveShadow = true
  root.add(lavaFlow)

  const crustMat = pbrMaterial(lib.crust, {
    repeat: [2, 3],
    emissive: 0xff3300,
    emissiveIntensity: 0.35,
    roughness: 0.96,
    normalScale: 1.2,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const crustChannel = buildFlankChannel(0.42)
  const lavaCrust = new THREE.Mesh(crustChannel.geometry, crustMat)
  root.add(lavaCrust)

  const craterPool = new THREE.Mesh(new THREE.CircleGeometry(0.46, 36), flowMat)
  craterPool.rotation.x = -Math.PI / 2
  craterPool.position.y = 4.42
  root.add(craterPool)

  const craterCrust = new THREE.Mesh(new THREE.CircleGeometry(0.46, 36), crustMat)
  craterCrust.rotation.x = -Math.PI / 2
  craterCrust.position.y = 4.435
  root.add(craterCrust)

  const craterGlow = new THREE.PointLight(0xff6622, 0, 9, 1.6)
  craterGlow.position.set(0, 4.6, 0)
  root.add(craterGlow)

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.09, 12, 40), makeRockMat(0x5c4033, [2, 1]))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 4.52
  rim.castShadow = true
  root.add(rim)

  return {
    root,
    cone,
    chamber,
    conduit,
    lavaFlow,
    lavaCrust,
    craterPool,
    craterCrust,
    craterGlow,
    clipMaterials,
    geologyLayers,
    dikes,
    village,
    houses,
    magmaCore,
    lavaBase: channel.base,
    lavaAlong: channel.along,
  }
}
