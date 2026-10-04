// Draws the logical cube (src/cube) with the Blender cubie and sticker from
// public/models/cube.glb: 27 instanced bodies, 54 instanced stickers, and one
// layer turning at a time. Classic sticker colours on black plastic — no
// material effects (docs/cube/CUBE.md). The only thing that changes with the
// page is a warm, paper-tinted rim light that fades up over the dark spreads,
// so a black cube never sinks into a dark-red ground.
import {
  Box3,
  Color,
  DynamicDrawUsage,
  GLSL3,
  Group,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STICKERS, FACE_AXIS, moveQuarterTurns, faceOfNormal } from '../cube/model';

const SPACING = 1.02;
/** Half the cube's outer size in model units (cubies at ±1.02, half-edge 0.5, sticker proud 0.085). */
export const CUBE_HALF = 1.605;
/** Radius that contains the cube at any orientation (its corner), in model units. */
export const CUBE_REACH = 2.62;

// sRGB, tuned to sit with the press palette: the "white" is the paper cream
// and the red is the press red.
const STICKER_SRGB = {
  W: '#f2ece0',
  Y: '#f4c430',
  G: '#1d8c4f',
  B: '#2353b0',
  R: '#d1262a',
  O: '#f07b1f',
};
const PLASTIC = '#121010';
const RIM = '#f4e7d2';

const vert = /* glsl */ `
out vec3 vN;
out vec3 vWP;
out vec3 vCol;
out vec3 vLocalN;
void main() {
  mat4 im = instanceMatrix;
  vec4 wp = modelMatrix * im * vec4(position, 1.0);
  vWP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * (mat3(im) * normal));
  vLocalN = normalize(mat3(im) * vec3(0.0, 1.0, 0.0));
#ifdef USE_INSTANCING_COLOR
  vCol = instanceColor;
#else
  vCol = vec3(0.0);
#endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
precision highp float;
in vec3 vN;
in vec3 vWP;
in vec3 vCol;
in vec3 vLocalN;
out vec4 outColor;

uniform vec3 uPlastic;
uniform vec3 uRimCol;
uniform float uRim;
uniform float uHover;
uniform vec3 uHoverN;

void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWP);
  // a soft key from the upper left, a dim fill from the right
  vec3 L = normalize(vec3(-0.45, 0.78, 0.55));
  vec3 F = normalize(vec3(0.7, -0.15, 0.6));
  float wrap = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
  float fill = max(dot(N, F), 0.0);
  vec3 H = normalize(L + V);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

#ifdef STICKER
  vec3 base = vCol;
  float spec = pow(max(dot(N, H), 0.0), 70.0) * 0.32;
  vec3 col = base * (0.34 + 0.78 * wrap + 0.12 * fill) + spec;
  float hov = step(0.92, dot(vLocalN, uHoverN)) * uHover;
  col = mix(col, col * 1.18 + 0.05, hov);
#else
  vec3 base = uPlastic;
  float spec = pow(max(dot(N, H), 0.0), 36.0) * 0.22;
  vec3 col = base * (0.6 + 0.9 * wrap) + spec * vec3(1.0, 0.96, 0.9);
#endif
  // over the dark spreads a warm rim keeps the silhouette on the page
  col += uRimCol * fres * uRim * 0.55;
  outColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;

const m4 = (r, p) =>
  new Matrix4().set(r[0], r[1], r[2], p[0] * SPACING, r[3], r[4], r[5], p[1] * SPACING, r[6], r[7], r[8], p[2] * SPACING, 0, 0, 0, 1);

/** Turn progress shaped like a lightly under-damped spring (ζ ≈ 0.72), settled at p = 1. */
export function turnCurve(p) {
  if (p >= 1) return 1;
  const z = 0.72;
  const w = 9.2;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * p) * (Math.cos(wd * p) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * p));
}

const linear = (hex) => new Color(hex).convertSRGBToLinear();

export async function createCubeView(director) {
  const gltf = await new GLTFLoader().loadAsync('/models/cube.glb');
  const geo = (name) => gltf.scene.getObjectByName(name).geometry;
  const bodyGeo = geo('cubie_body');
  const stickerGeo = geo('sticker');

  const uniforms = {
    uPlastic: { value: linear(PLASTIC) },
    uRimCol: { value: linear(RIM) },
    uRim: { value: 0 },
    uHover: { value: 0 },
    uHoverN: { value: new Vector3(0, 0, 1) },
  };
  const bodyMat = new ShaderMaterial({ glslVersion: GLSL3, vertexShader: vert, fragmentShader: frag, uniforms });
  const stickerMat = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    defines: { STICKER: 1 },
  });

  const bodies = new InstancedMesh(bodyGeo, bodyMat, 27);
  const stickers = new InstancedMesh(stickerGeo, stickerMat, STICKERS.length);
  bodies.instanceMatrix.setUsage(DynamicDrawUsage);
  stickers.instanceMatrix.setUsage(DynamicDrawUsage);
  bodies.frustumCulled = stickers.frustumCulled = false;
  const colours = Object.fromEntries(Object.entries(STICKER_SRGB).map(([k, v]) => [k, linear(v)]));
  STICKERS.forEach((s) => stickers.setColorAt(s.id, colours[s.colour]));
  if (stickers.instanceColor) stickers.instanceColor.needsUpdate = true;

  // rotation that carries the exported sticker (on +Y) onto each sticker's home face
  const up = new Vector3(0, 1, 0);
  const stickerBase = STICKERS.map((s) => {
    const n = new Vector3(...s.homeNormal);
    const q = n.y < -0.5 ? new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI) : new Quaternion().setFromUnitVectors(up, n);
    return new Matrix4().makeRotationFromQuaternion(q);
  });

  const scene = new Scene();
  const group = new Group();
  group.add(bodies, stickers);
  scene.add(group);
  // one model unit ≈ one CSS pixel at z = 0 once resize() places the camera
  const camera = new PerspectiveCamera(24, 1, 10, 40000);

  const cubieM = Array.from({ length: 27 }, () => new Matrix4());
  const tmp = new Matrix4();
  const layerRot = new Matrix4();
  const axisV = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  let layerFor = null;
  let layer = new Set();

  const update = () => {
    const a = director.active;
    if (a !== layerFor) {
      layerFor = a;
      layer = new Set(a ? director.state.layer(a.move.face) : []);
    }
    if (a) layerRot.makeRotationAxis(axisV[FACE_AXIS[a.move.face].axis], ((moveQuarterTurns(a.move) * Math.PI) / 2) * turnCurve(director.progress));
    for (const c of director.state.cubies) {
      const m = cubieM[c.id].copy(m4(c.rot, c.pos));
      if (a && layer.has(c.id)) m.premultiply(layerRot);
      bodies.setMatrixAt(c.id, m);
    }
    for (const s of STICKERS) {
      tmp.multiplyMatrices(cubieM[s.cubie], stickerBase[s.id]);
      stickers.setMatrixAt(s.id, tmp);
    }
    bodies.instanceMatrix.needsUpdate = true;
    stickers.instanceMatrix.needsUpdate = true;
  };
  update();

  const ray = new Raycaster();
  const ndc = new Vector2();
  const box = new Box3(new Vector3(-CUBE_HALF, -CUBE_HALF, -CUBE_HALF), new Vector3(CUBE_HALF, CUBE_HALF, CUBE_HALF));
  const inv = new Matrix4();
  const hit = new Vector3();
  let vw = 1;
  let vh = 1;

  return {
    scene,
    camera,
    group,
    uniforms,
    resize(w, h) {
      vw = w;
      vh = h;
      camera.aspect = w / h;
      camera.position.set(0, 0, h / 2 / Math.tan((camera.fov * Math.PI) / 360));
      camera.updateProjectionMatrix();
    },
    update,
    /** The face under a viewport point, or null if the ray misses the cube. */
    pick(x, y) {
      if (group.scale.x < 0.01) return null;
      ndc.set((x / vw) * 2 - 1, -(y / vh) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      group.updateMatrixWorld();
      inv.copy(group.matrixWorld).invert();
      ray.ray.applyMatrix4(inv);
      if (!ray.ray.intersectBox(box, hit)) return null;
      const ax = [Math.abs(hit.x), Math.abs(hit.y), Math.abs(hit.z)];
      const i = ax.indexOf(Math.max(...ax));
      const n = [0, 0, 0];
      n[i] = Math.sign([hit.x, hit.y, hit.z][i]);
      return faceOfNormal(n);
    },
    dispose() {
      bodyMat.dispose();
      stickerMat.dispose();
      bodyGeo.dispose();
      stickerGeo.dispose();
    },
  };
}
