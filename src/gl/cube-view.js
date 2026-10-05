// Draws the logical cube (src/cube): the Blender cubie body from
// public/models/cube.glb, 27 instanced bodies and 54 instanced stickers, one
// layer turning at a time. Classic sticker colours on black plastic — no
// material effects (docs/cube/CUBE.md).
//
// Materials are plain MeshStandardMaterial under two lights: matte, fully
// opaque stickers (roughness 0.85) and a satin body (0.6), no environment map,
// clearcoat or transparency. The stickers are built here as thick rounded
// tiles seated into each face (their base sits below the face, their edge runs
// out over the cubie's rounded edge), so the colour reads solid with only a
// thin black seam between tiles. The one thing that changes with the page is
// a warm edge light that fades up over the dark grounds, so a black cube never
// sinks into ink.
import {
  Box3,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STICKERS, FACE_AXIS, moveQuarterTurns, faceOfNormal } from '../cube/model';

const SPACING = 1.02;
/** Half the cube's outer size in model units (cubies at ±1.02, half-edge 0.5, tiles proud 0.042). */
export const CUBE_HALF = 1.562;
/** Radius that contains the cube at any orientation (its corner), in model units. */
export const CUBE_REACH = 2.6;

// sRGB, tuned to sit with the press palette: the "white" is the paper cream
// and the red is the press red.
const STICKER_SRGB = {
  W: '#efe9dc',
  Y: '#f2c12e',
  G: '#1f8a4c',
  B: '#2452ad',
  R: '#cf2a2c',
  O: '#ee7a20',
};
const PLASTIC = '#141211';
const WHITE = new Color('#ffffff');
const EDGE = '#f4e7d2';

/** A sticker tile: a rounded square slab, its base sunk below the cubie face. */
function tileGeometry() {
  const h = 0.455; // half-size of the flat top, before the bevel
  const r = 0.075; // corner radius
  const s = new Shape();
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  const geo = new ExtrudeGeometry(s, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geo.rotateX(-Math.PI / 2); // extrude along +Y, the cubie's +Y face
  geo.translate(0, 0.48, 0); // spans y 0.468 → 0.542: seated into the face, 0.042 proud
  geo.computeVertexNormals();
  return geo;
}

/** Adds a fresnel edge light (uEdge, uEdgeCol) to a standard material. */
function withEdgeLight(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEdge = uniforms.uEdge;
    shader.uniforms.uEdgeCol = uniforms.uEdgeCol;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uEdge;\nuniform vec3 uEdgeCol;')
      .replace(
        '#include <opaque_fragment>',
        `float edgeF = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
outgoingLight += uEdgeCol * edgeF * uEdge * 0.6;
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
  const gltf = await new GLTFLoader().loadAsync('/models/cube.glb');
  const bodyGeo = gltf.scene.getObjectByName('cubie_body').geometry;
  const stickerGeo = tileGeometry();

  const uniforms = {
    uEdge: { value: 0 },
    uEdgeCol: { value: new Color(EDGE) },
  };
  const bodyMat = withEdgeLight(new MeshStandardMaterial({ color: PLASTIC, roughness: 0.6, metalness: 0 }), uniforms);
  const stickerMat = withEdgeLight(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0 }), uniforms);

  const bodies = new InstancedMesh(bodyGeo, bodyMat, 27);
  const stickers = new InstancedMesh(stickerGeo, stickerMat, STICKERS.length);
  bodies.instanceMatrix.setUsage(DynamicDrawUsage);
  stickers.instanceMatrix.setUsage(DynamicDrawUsage);
  bodies.frustumCulled = stickers.frustumCulled = false;
  const colours = Object.fromEntries(Object.entries(STICKER_SRGB).map(([k, v]) => [k, new Color(v)]));
  const lit = new Color();
  const paintStickers = (face, amount) => {
    for (const s of STICKERS) {
      const c = colours[s.colour];
      if (face && amount > 0.01 && director.state.stickerFace(s) === face) {
        lit.copy(c).lerp(WHITE, 0.16 * amount);
        stickers.setColorAt(s.id, lit);
      } else stickers.setColorAt(s.id, c);
    }
    stickers.instanceColor.needsUpdate = true;
  };
  paintStickers(null, 0);

  // rotation that carries the tile (built on +Y) onto each sticker's home face
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
  // soft room light plus a key from the upper left and a dim fill from the right
  scene.add(new HemisphereLight('#fff8ec', '#6b6157', 1.6));
  const key = new DirectionalLight('#fffaf0', 1.9);
  key.position.set(-0.45, 0.78, 0.55);
  const fill = new DirectionalLight('#f3efe8', 1.05);
  fill.position.set(0.75, -0.25, 0.65);
  scene.add(key, fill);
  // one model unit ≈ one CSS pixel at z = 0 once resize() places the camera
  const camera = new PerspectiveCamera(24, 1, 10, 40000);

  const cubieM = Array.from({ length: 27 }, () => new Matrix4());
  const tmp = new Matrix4();
  const layerRot = new Matrix4();
  const axisV = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  let layerFor = null;
  let layer = new Set();
  let hoverFace = null;
  let hoverAmt = 0;
  let paintedKey = '';

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
    // the face under the cursor brightens a touch (repainted only when it changes)
    const pk = `${hoverFace}|${hoverAmt.toFixed(2)}|${director.k}|${director.visitor.length}|${a ? 1 : 0}`;
    if (pk !== paintedKey) {
      paintedKey = pk;
      paintStickers(a ? null : hoverFace, hoverAmt);
    }
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
    setHover(face, amount) {
      hoverFace = face;
      hoverAmt = amount;
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
      bodyMat.dispose();
      stickerMat.dispose();
      bodyGeo.dispose();
      stickerGeo.dispose();
    },
  };
}
