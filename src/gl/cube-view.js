// Draws the logical cube (src/cube) as a stickerless speedcube: 27 cubies of
// solid coloured plastic, one InstancedMesh, one layer turning at a time.
//
// Each cubie is the rounded cube modelled in Blender (scripts/blender/cubie.py
// → public/models/cubie.glb). It carries no stickers and no black body: the
// shader colours every face of every cubie from a small table — the classic
// colour on a face that's on the outside of the solved cube, a soft warm core
// colour on the faces that only show inside a turn — picked per fragment from
// the face's own normal, so the colour seams fall exactly on the middle of each
// rounded edge, like moulded tiles. A hairline gap between cubies keeps every
// twist legible. Matte plastic under soft light: MeshStandardMaterial, no
// environment map, no clearcoat, fully opaque. Over the dark grounds a warm
// edge light fades up so the silhouette never sinks into the ink.
import {
  Box3,
  Color,
  DataTexture,
  DirectionalLight,
  DynamicDrawUsage,
  FloatType,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  Raycaster,
  RGBAFormat,
  Scene,
  Vector2,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FACE_AXIS, moveQuarterTurns, faceOfNormal } from '../cube/model';

const SPACING = 1.03; // cubie pitch: a 1.0 cubie leaves a hairline gap
/** Half the cube's outer size in model units. */
export const CUBE_HALF = SPACING + 0.5;
/** Radius that contains the cube at any orientation (its corner), in model units. */
export const CUBE_REACH = Math.sqrt(3) * CUBE_HALF;

// sRGB — saturated, slightly warm moulded plastics, tuned to sit with the press
// palette (the white is warm, the red is close to the press red)
const PLASTIC = {
  W: '#f3eee4',
  Y: '#ffcf1f',
  G: '#12a153',
  B: '#1b5fd1',
  R: '#de2a2b',
  O: '#ff7b16',
};
const CORE = '#ddd5c7'; // the inner faces, seen only mid-turn
const EDGE = '#f4e7d2';

// face slots in the table, in the order the shader picks them: +X −X +Y −Y +Z −Z
const SLOTS = ['R', 'L', 'U', 'D', 'F', 'B'];
const HOME_COLOUR = { R: 'R', L: 'O', U: 'Y', D: 'W', F: 'G', B: 'B' };

/** 6 × 27 colour table: for each cubie, each face's plastic in linear RGB. */
function faceTable() {
  const data = new Float32Array(6 * 27 * 4);
  const c = new Color();
  let id = 0;
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1]) {
        const home = [x, y, z];
        SLOTS.forEach((face, slot) => {
          const { axis, side } = FACE_AXIS[face];
          c.set(home[axis] === side ? PLASTIC[HOME_COLOUR[face]] : CORE);
          const o = (id * 6 + slot) * 4;
          data[o] = c.r;
          data[o + 1] = c.g;
          data[o + 2] = c.b;
          data[o + 3] = 1;
        });
        id++;
      }
  const tex = new DataTexture(data, 6, 27, RGBAFormat, FloatType);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Colour each fragment by its cubie and face; light the hovered face; edge light. */
function stickerless(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
flat out int vCubie;
out vec3 vObjN;
out vec3 vCubeN;
out vec3 vCubiePos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vCubie = gl_InstanceID;
vObjN = normal;
vCubeN = mat3(instanceMatrix) * normal;
vCubiePos = instanceMatrix[3].xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uFaces;
uniform float uEdge;
uniform vec3 uEdgeCol;
uniform float uHover;
uniform vec3 uHoverN;
flat in int vCubie;
in vec3 vObjN;
in vec3 vCubeN;
in vec3 vCubiePos;`
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec3 an = abs(vObjN);
int slot = an.x >= an.y && an.x >= an.z ? (vObjN.x > 0.0 ? 0 : 1)
         : an.y >= an.z ? (vObjN.y > 0.0 ? 2 : 3)
         : (vObjN.z > 0.0 ? 4 : 5);
vec3 plastic = texelFetch(uFaces, ivec2(slot, vCubie), 0).rgb;
// the face under the cursor: this cubie is in that layer, and this side faces out of it
float lit = step(0.72, dot(normalize(vCubeN), uHoverN)) * step(0.5, dot(vCubiePos, uHoverN));
plastic = mix(plastic, plastic * 1.12 + 0.035, lit * uHover);
vec4 diffuseColor = vec4( plastic, opacity );`
      )
      .replace(
        '#include <opaque_fragment>',
        `float edgeF = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
outgoingLight += uEdgeCol * edgeF * uEdge * 0.5;
#include <opaque_fragment>`
      );
  };
  return material;
}

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

export async function createCubeView(director) {
  const gltf = await new GLTFLoader().loadAsync('/models/cubie.glb');
  let geo = null;
  gltf.scene.traverse((o) => {
    if (!geo && o.isMesh) geo = o.geometry;
  });

  const uniforms = {
    uFaces: { value: faceTable() },
    uEdge: { value: 0 },
    uEdgeCol: { value: new Color(EDGE) },
    uHover: { value: 0 },
    uHoverN: { value: new Vector3(0, 0, 1) },
  };
  const material = stickerless(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0 }), uniforms);

  const cubies = new InstancedMesh(geo, material, 27);
  cubies.instanceMatrix.setUsage(DynamicDrawUsage);
  cubies.frustumCulled = false;

  const scene = new Scene();
  const group = new Group();
  group.add(cubies);
  scene.add(group);
  // soft studio light: a big warm sky, a gentle key from the upper left, a fill
  scene.add(new HemisphereLight('#fffaf0', '#8a7f72', 1.7));
  const key = new DirectionalLight('#fffaf2', 1.55);
  key.position.set(-0.45, 0.8, 0.6);
  const fill = new DirectionalLight('#f1ece4', 0.85);
  fill.position.set(0.8, -0.2, 0.55);
  scene.add(key, fill);
  // one model unit ≈ one CSS pixel at z = 0 once resize() places the camera
  const camera = new PerspectiveCamera(24, 1, 10, 40000);

  const cubieM = Array.from({ length: 27 }, () => new Matrix4());
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
      cubies.setMatrixAt(c.id, m);
    }
    cubies.instanceMatrix.needsUpdate = true;
  };
  update();

  const ray = new Raycaster();
  const ndc = new Vector2();
  const box = new Box3(new Vector3(-CUBE_HALF, -CUBE_HALF, -CUBE_HALF), new Vector3(CUBE_HALF, CUBE_HALF, CUBE_HALF));
  const inv = new Matrix4();
  const hit = new Vector3();
  const hoverN = { R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] };
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
    setHover(face, amount) {
      uniforms.uHover.value = director.active ? 0 : amount;
      if (face) uniforms.uHoverN.value.set(...hoverN[face]);
    },
    setEdge(v) {
      uniforms.uEdge.value = v;
    },
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
      material.dispose();
      geo.dispose();
      uniforms.uFaces.value.dispose();
    },
  };
}
