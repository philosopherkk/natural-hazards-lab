import * as THREE from 'three'
import { fbmPeriodic } from './noise'

const SUN = new THREE.Vector3(8, 14, 6).normalize()

let detailNormal: THREE.CanvasTexture | null = null

/** High-frequency tileable normal used as a second sample on rock, snow, stucco, and asphalt. */
export function getDetailNormal(): THREE.CanvasTexture {
  if (detailNormal) return detailNormal
  const size = 128
  const height = new Float32Array(size * size)
  const period = 8
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * period
      const v = (y / size) * period
      height[y * size + x] = fbmPeriodic(u, v, 91, period, 4)
    }
  }
  const data = new Uint8ClampedArray(size * size * 4)
  const strength = 3.4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hL = height[y * size + ((x - 1 + size) % size)]!
      const hR = height[y * size + ((x + 1) % size)]!
      const hU = height[((y - 1 + size) % size) * size + x]!
      const hD = height[((y + 1) % size) * size + x]!
      let nx = (hL - hR) * strength
      let ny = (hU - hD) * strength
      let nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      const o = (y * size + x) * 4
      data[o] = (nx * 0.5 + 0.5) * 255
      data[o + 1] = (ny * 0.5 + 0.5) * 255
      data[o + 2] = (nz * 0.5 + 0.5) * 255
      data[o + 3] = 255
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  img.data.set(data)
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  detailNormal = tex
  return tex
}

/** Second normal+roughness sample so standard materials keep their lighting and pick up close-range grain. */
export function applySurfaceDetail(
  mat: THREE.MeshStandardMaterial,
  repeat = 4.5,
  strength = 0.7,
): void {
  if (mat.userData.surfaceDetail) return
  mat.userData.surfaceDetail = true
  const tex = getDetailNormal()
  mat.normalScale.multiplyScalar(1.35)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetailN = { value: tex }
    shader.uniforms.uDetailR = { value: repeat }
    shader.uniforms.uDetailS = { value: strength }
    shader.fragmentShader =
      'uniform sampler2D uDetailN;\nuniform float uDetailR;\nuniform float uDetailS;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
        #ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 dN = texture2D(uDetailN, vNormalMapUv * uDetailR).xyz * 2.0 - 1.0;
          dN.xy *= uDetailS;
          normal = normalize(normal + dN.x * tbn[0] + dN.y * tbn[1]);
        #endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
        #ifdef USE_NORMALMAP_TANGENTSPACE
          float dRough = texture2D(uDetailN, vRoughnessMapUv * uDetailR).b;
          roughnessFactor *= mix(0.72, 1.18, dRough);
        #endif`,
    )
  }
  const previous = mat.customProgramCacheKey.bind(mat)
  mat.customProgramCacheKey = () => `${previous()}|detail2`
}

const seaVert = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldN;
  uniform float uTime;

  void wave(vec2 xz, vec2 dir, float amp, float freq, float speed, inout float h, inout float nx, inout float nz) {
    float phase = dot(dir, xz) * freq + uTime * speed;
    h += amp * sin(phase);
    float c = freq * amp * cos(phase);
    nx += dir.x * c;
    nz += dir.y * c;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float h = 0.0;
    float nx = 0.0;
    float nz = 0.0;
    wave(world.xz, vec2(0.95, 0.3), 0.16, 0.42, 0.85, h, nx, nz);
    wave(world.xz, vec2(-0.25, 0.97), 0.1, 0.7, 1.15, h, nx, nz);
    wave(world.xz, vec2(0.55, -0.84), 0.06, 1.25, 1.6, h, nx, nz);
    world.y += h;
    vec3 wn = normalize(mat3(modelMatrix) * normal);
    wn.x -= nx;
    wn.z -= nz;
    vWorldN = normalize(wn);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const seaFrag = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldN;
  uniform vec3 uSunDir;
  uniform vec3 uCamPos;
  uniform float uAlpha;

  void main() {
    vec3 N = normalize(vWorldN);
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 4.0);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 80.0);
    vec3 deep = vec3(0.015, 0.12, 0.24);
    vec3 mid = vec3(0.04, 0.32, 0.42);
    vec3 sky = vec3(0.72, 0.84, 0.92);
    vec3 col = mix(deep, mid, ndv);
    col = mix(col, sky, fres * 0.9);
    col += vec3(1.0, 0.93, 0.82) * spec * (0.55 + fres);
    gl_FragColor = vec4(col, mix(uAlpha * 0.78, uAlpha, fres));
  }
`

export function createSeaMaterial(alpha = 0.9): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN.clone() },
      uCamPos: { value: new THREE.Vector3() },
      uAlpha: { value: alpha },
    },
    vertexShader: seaVert,
    fragmentShader: seaFrag,
    transparent: true,
    depthWrite: false,
  })
}

const boreVert = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldN;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const boreFrag = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldN;
  varying vec2 vUv;
  uniform vec3 uSunDir;
  uniform vec3 uCamPos;
  uniform float uTime;

  void main() {
    vec3 N = normalize(vWorldN);
    float ripple = sin(vUv.x * 28.0 + uTime * 3.0) * 0.08;
    N = normalize(N + vec3(ripple, 0.0, ripple * 0.5));
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.6);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 48.0);
    float lip = smoothstep(0.38, 0.55, vUv.y) * (1.0 - smoothstep(0.66, 0.9, vUv.y));
    vec3 water = vec3(0.45, 0.7, 0.78);
    vec3 foam = vec3(0.96, 0.98, 1.0);
    vec3 col = mix(water, foam, clamp(lip * 1.35, 0.0, 1.0));
    col = mix(col, vec3(0.85, 0.93, 1.0), fres * 0.45);
    col += vec3(1.0, 0.96, 0.9) * spec * 0.45;
    float alpha = mix(0.16, 0.5, fres) + lip * 0.48;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
  }
`

export function createBoreMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN.clone() },
      uCamPos: { value: new THREE.Vector3() },
    },
    vertexShader: boreVert,
    fragmentShader: boreFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

const lavaVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldN;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const lavaFrag = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldN;
  varying vec3 vWorldPos;
  uniform float uHeat;
  uniform float uTime;
  uniform vec3 uSunDir;

  void main() {
    float across = abs(vUv.y - 0.5) * 2.0;
    float crust = smoothstep(0.22, 0.72, across);
    float flow = 0.82 + 0.18 * sin(vUv.x * 16.0 - uTime * 2.2);
    vec3 hot = vec3(1.0, 0.38 + uHeat * 0.12, 0.04) * (1.15 + uHeat) * flow;
    vec3 skin = vec3(0.06, 0.035, 0.03);
    float crack = smoothstep(0.46, 0.52, fract(vUv.x * 7.0 + across * 2.0));
    skin = mix(skin, vec3(0.55, 0.12, 0.02), crack * crust);
    vec3 N = normalize(vWorldN);
    float ndl = clamp(dot(N, normalize(uSunDir)), 0.0, 1.0);
    vec3 col = mix(hot, skin, crust);
    col *= 0.4 + 0.6 * ndl;
    col += hot * (1.0 - crust) * 0.75;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function createLavaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHeat: { value: 1 },
      uTime: { value: 0 },
      uSunDir: { value: SUN.clone() },
    },
    vertexShader: lavaVert,
    fragmentShader: lavaFrag,
    side: THREE.DoubleSide,
  })
}

const plumeVert = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const plumeFrag = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float ndv = abs(dot(normalize(vNormalV), normalize(vView)));
    float shell = pow(ndv, 0.5);
    float edge = pow(1.0 - ndv, 1.8);
    float alpha = uOpacity * shell * (1.0 - edge * 0.8);
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.55));
  }
`

export function createPlumeMaterial(color: number, opacity: number): THREE.ShaderMaterial {
  const c = new THREE.Color(color)
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
      uOpacity: { value: opacity },
    },
    vertexShader: plumeVert,
    fragmentShader: plumeFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

export function contactDisc(radius = 0.78): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 18),
    new THREE.MeshBasicMaterial({
      color: 0x120e0c,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.015
  mesh.renderOrder = 2
  return mesh
}
