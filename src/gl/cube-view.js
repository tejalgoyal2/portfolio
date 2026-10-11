// Draws the logical cube (src/cube) as a stickerless speedcube: 27 cubies of
// solid coloured plastic, one InstancedMesh, one layer turning at a time.
//
// Each cubie is the rounded cube modelled in Blender (scripts/blender/cubie.py
// → public/models/cubie.glb). It carries no stickers and no black body: the
// shader colours every face of every cubie from a small table — the classic
// colour on a face that's on the outside of the solved cube, a soft warm core
// colour on the faces that only show inside a turn — picked per fragment from
// the face's own normal, so the colour seams fall exactly on the middle of each
// rounded edge, like moulded tiles. Each of the six centre pieces carries one
// of the site's pencil icons debossed into its face — pencil on white, bulb on
// yellow, code on green, database on blue, sparkles on red, rocket on orange —
// the way a speedcube's centre cap carries its logo; they turn with their face.
// A hairline gap between cubies keeps every
// twist legible. Matte plastic under soft light: MeshStandardMaterial, no
// environment map, no clearcoat, fully opaque. Over the dark grounds a warm
// edge light fades up so the silhouette never sinks into the ink.
import {
  Box3,
  CanvasTexture,
  Color,
  DataTexture,
  DirectionalLight,
  DynamicDrawUsage,
  FloatType,
  Group,
  HemisphereLight,
  InstancedMesh,
  LinearFilter,
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
import { ICON } from '../life/icons';

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
// the icon each colour's centre carries, in atlas order
const CENTRE_ICON = ['pencil', 'lightbulb', 'code', 'database', 'sparkles', 'rocket'];
const ICON_FOR = { W: 0, Y: 1, G: 2, B: 3, R: 4, O: 5 };
const ICON_PX = 160;

/** The six centre icons as one white-on-clear atlas strip. */
async function iconAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_PX * CENTRE_ICON.length;
  canvas.height = ICON_PX;
  const g = canvas.getContext('2d');
  await Promise.all(
    CENTRE_ICON.map(
      (name, i) =>
        new Promise((resolve) => {
          const svg = (ICON[name] || '')
            .replace(/stroke="currentColor"/g, 'stroke="#ffffff"')
            .replace(/width="24" height="24"/, `width="${ICON_PX}" height="${ICON_PX}"`);
          const img = new Image();
          img.onload = () => {
            g.drawImage(img, i * ICON_PX, 0, ICON_PX, ICON_PX);
            resolve();
          };
          img.onerror = resolve;
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        })
    )
  );
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/** 6 × 27 colour table: for each cubie, each face's plastic in linear RGB. */
function faceTable() {
  const data = new Float32Array(6 * 27 * 4);
  const c = new Color();
  let id = 0;
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1]) {
        const home = [x, y, z];
        const centre = home.filter((v) => v !== 0).length === 1;
        SLOTS.forEach((face, slot) => {
          const { axis, side } = FACE_AXIS[face];
          const outer = home[axis] === side;
          c.set(outer ? PLASTIC[HOME_COLOUR[face]] : CORE);
          const o = (id * 6 + slot) * 4;
          data[o] = c.r;
          data[o + 1] = c.g;
          data[o + 2] = c.b;
          // alpha: which icon this face carries (1–6), 0 for none
          data[o + 3] = outer && centre ? ICON_FOR[HOME_COLOUR[face]] + 1 : 0;
        });
        id++;
      }
  const tex = new DataTexture(data, 6, 27, RGBAFormat, FloatType);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Colour each fragment by its cubie and face; edge light. */
function stickerless(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
flat out int vCubie;
out vec3 vObjN;
out vec3 vObjP;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vCubie = gl_InstanceID;
vObjN = normal;
vObjP = position;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uFaces;
uniform sampler2D uIcons;
uniform float uEdge;
uniform vec3 uEdgeCol;
flat in int vCubie;
in vec3 vObjN;
in vec3 vObjP;`
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec3 an = abs(vObjN);
int slot = an.x >= an.y && an.x >= an.z ? (vObjN.x > 0.0 ? 0 : 1)
         : an.y >= an.z ? (vObjN.y > 0.0 ? 2 : 3)
         : (vObjN.z > 0.0 ? 4 : 5);
vec4 face = texelFetch(uFaces, ivec2(slot, vCubie), 0);
vec3 plastic = face.rgb;
// a centre piece's icon, debossed: the face seen from outside, right and up
if (face.a > 0.5) {
  vec3 R = slot == 0 ? vec3(0.,0.,-1.) : slot == 1 ? vec3(0.,0.,1.) : slot == 5 ? vec3(-1.,0.,0.) : vec3(1.,0.,0.);
  vec3 U = slot == 2 ? vec3(0.,0.,-1.) : slot == 3 ? vec3(0.,0.,1.) : vec3(0.,1.,0.);
  vec2 uv = vec2(dot(vObjP, R), dot(vObjP, U)) / 0.6 + 0.5;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
    float ink = texture(uIcons, vec2((uv.x + face.a - 1.0) / 6.0, 1.0 - uv.y)).a;
    plastic = mix(plastic, plastic * 0.62, ink * 0.9);
  }
}
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

/** Turn progress: eases in and out (quintic smootherstep), so turns never snap or rattle. */
export function turnCurve(p) {
  if (p >= 1) return 1;
  if (p <= 0) return 0;
  return p * p * p * (p * (p * 6 - 15) + 10);
}

export async function createCubeView(director) {
  const gltf = await new GLTFLoader().loadAsync('/models/cubie.glb');
  let geo = null;
  gltf.scene.traverse((o) => {
    if (!geo && o.isMesh) geo = o.geometry;
  });

  const uniforms = {
    uFaces: { value: faceTable() },
    uIcons: { value: await iconAtlas() },
    uEdge: { value: 0 },
    uEdgeCol: { value: new Color(EDGE) },
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
      uniforms.uIcons.value.dispose();
    },
  };
}
