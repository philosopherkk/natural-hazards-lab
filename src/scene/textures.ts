import type * as THREE from 'three'
import { ensurePbrLibraryAsync, getPbrLibrary, type PbrSet } from './pbrLibrary'

export type RockTextureSet = {
  map: THREE.Texture
  roughnessMap: THREE.Texture
  normalMap: THREE.Texture
}

function asRock(set: PbrSet): RockTextureSet {
  return { map: set.map, roughnessMap: set.roughnessMap, normalMap: set.normalMap }
}

/** Synchronous access when the PBR library was already built. */
export function getRockTextures(): RockTextureSet {
  return asRock(getPbrLibrary().rock)
}

export function getLavaTexture(): THREE.Texture {
  return getPbrLibrary().lava.map
}

/** @deprecated Prefer ensurePbrLibraryAsync from ./pbrLibrary */
export function ensureRockTexturesAsync(): Promise<RockTextureSet> {
  return ensurePbrLibraryAsync().then((lib) => asRock(lib.rock))
}

/** @deprecated Prefer getRockTextures */
export function createRockTextures(): RockTextureSet {
  return getRockTextures()
}

/** @deprecated Prefer getLavaTexture */
export function createLavaTexture(): THREE.Texture {
  return getLavaTexture()
}
