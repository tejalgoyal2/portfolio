// The car in Let's talk (docs/REVAMP.md §5): the little rally car
// (public/models/car-display.glb) on a road along the bottom of the red
// finale. It drives in from the right the first time the road comes into
// view and pulls up by the gratitude sheet — quick off the edge, a long easy
// roll to a stop — then idles with a
// small engine shiver, and rolls a little with the page's scroll. Point at it
// and it stops, flashes its headlights twice, and a pen note says where it's
// headed (src/data/site.js switches the note to a link once the game is live).
//
// Its own small canvas, the width of the road and only as tall as the car: a
// second, tiny WebGL view (one shared canvas round both the cube and the car
// would have to span most of the screen down here). Drawn from the shared
// gsap.ticker, only while the road is on screen. three.js is already loaded
// by the cube's stage by the time anyone scrolls this far.
// Reduced motion: it's parked in its spot; the headlights still wink.
import {
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { prefs } from '../life/prefs';
import { scroll } from '../life/scroll';
import { found } from '../life/discover';

const HEADLIGHT = new Color('#fff1c2');

export async function startCarStage({ road, canvas, hit, note, beam }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', stencil: false });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const gltf = await new GLTFLoader().loadAsync('/models/car-display.glb');
  const model = gltf.scene;

  // the wheels on their own pivots (so they spin about their axles), the body on its own (so it can shiver)
  const car = new Group();
  const body = new Group();
  car.add(body);
  body.add(model);
  model.updateMatrixWorld(true);
  const wheels = [];
  const wheelNodes = [];
  model.traverse((o) => /^pv_wheel\d$/.test(o.name) && wheelNodes.push(o));
  for (const w of wheelNodes) {
    const centre = new Box3().setFromObject(w).getCenter(new Vector3());
    const pivot = new Group();
    pivot.position.copy(centre);
    car.add(pivot);
    car.updateMatrixWorld(true);
    pivot.attach(w);
    wheels.push(pivot);
  }
  // the headlights, so they can wink
  const lamps = [];
  model.traverse((o) => {
    if (!o.isMesh || !/^(headlights|headlightsPod\d)$/.test(o.name)) return;
    o.material = o.material.clone();
    o.material.emissive = HEADLIGHT.clone();
    o.material.emissiveIntensity = 0;
    lamps.push(o.material);
  });

  const size = new Box3().setFromObject(car).getSize(new Vector3());
  const scene = new Scene();
  // a three-quarter view: turned a touch towards you, seen a little from above,
  // nose to the left (the model faces +x, so it's turned round: DIR is which way it drives)
  const DIR = -1;
  const stand = new Group();
  stand.add(car);
  stand.rotation.set(0.26, Math.PI + 0.38, 0);
  scene.add(stand);
  scene.add(new HemisphereLight('#fffaf0', '#5a2a24', 1.9));
  const key = new DirectionalLight('#fff6ea', 1.6);
  key.position.set(-0.4, 1, 0.8);
  scene.add(key);

  // one unit = one css px: the canvas is the road's width and the car's height
  const camera = new OrthographicCamera(0, 1, 1, 0, -2000, 2000);
  let W = 1;
  let H = 1;
  let scale = 1;
  let sinceDraw = 0;
  let placedAt = NaN; // where the car's hit box, note and beam were last put
  const resize = () => {
    placedAt = NaN;
    W = road.clientWidth;
    const len = W < 720 ? 150 : 230; // the car's length on screen
    scale = len / size.x;
    H = Math.ceil(size.y * scale * 1.5 + 16);
    renderer.setSize(W, H, false);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    camera.left = 0;
    camera.right = W;
    camera.top = H;
    camera.bottom = 0;
    camera.updateProjectionMatrix();
    stand.scale.setScalar(scale);
  };
  resize();
  window.addEventListener('resize', resize);

  // where it is (px along the road), how fast, and what it's doing
  // beside the sheet on a wide page (the sheet keeps to the left 860px), towards the right on a phone
  const parkAt = () => {
    if (W < 1100) return W * (W < 720 ? 0.64 : 0.7);
    const pad = Math.min(96, Math.max(24, W * 0.05)); // the section's side padding (sections.css)
    return Math.min(W - 150, Math.max(W * 0.7, pad + 860 + 150));
  };
  const offstage = () => W + size.x * scale;
  let x = prefs.reduced ? parkAt() : offstage();
  let v = 0;
  let spin = 0;
  let hovering = false;
  let arrived = prefs.reduced;
  let t = 0;
  let flashT = -1;
  let on = false;

  const io = new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    // the first time the road comes into view, it drives in
    if (on && !arrived) arrived = true;
  });
  io.observe(road);

  const flash = () => (flashT = 0);
  const showNote = (show) => note?.classList.toggle('is-on', show);
  let hideNote = 0;
  const onEnter = () => {
    found('car');
    hovering = true;
    clearTimeout(hideNote);
    showNote(true);
    flash();
  };
  const onLeave = () => {
    hovering = false;
    clearTimeout(hideNote);
    hideNote = setTimeout(() => showNote(false), 1400);
  };
  hit.addEventListener('pointerenter', onEnter);
  hit.addEventListener('pointerleave', onLeave);
  hit.addEventListener('focus', onEnter);
  hit.addEventListener('blur', onLeave);
  hit.addEventListener('click', flash);

  const place = () => {
    // the car stands on the road: wheels at the bottom edge of the canvas, a few px in
    stand.position.set(x, 12, 0);
    const len = size.x * scale;
    hit.style.transform = `translate3d(${(x - len * 0.55).toFixed(1)}px,0,0)`;
    hit.style.width = `${(len * 1.1).toFixed(0)}px`;
    // the note ends over its tail, so it never runs off the right edge; the beam throws ahead of its nose
    if (note) note.style.transform = `translate3d(${(x + len * 0.45).toFixed(1)}px,0,0)`;
    if (beam) beam.style.transform = `translate3d(${(x + DIR * len * 0.42).toFixed(1)}px,0,0) scaleX(${DIR})`;
  };

  const tick = (time, deltaMs) => {
    if (!on || document.hidden) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    t += dt;
    const goal = arrived ? parkAt() + (hovering || prefs.reduced ? 0 : Math.max(-70, Math.min(70, scroll.v * 0.06))) : offstage();
    if (prefs.reduced) {
      x = goal;
      v = 0;
    } else {
      // a soft spring: pulls away quickly, a long easy roll to a stop; holds still while you point at it
      const k = hovering ? 40 : 9;
      v += (k * (goal - x) - 2 * 0.92 * Math.sqrt(k) * v) * dt;
      x += v * dt;
    }
    spin -= (DIR * v * dt) / (0.42 * scale);
    for (const w of wheels) w.rotation.z = spin;
    // the engine idling: a small shiver of the body; a squat as it pulls away, a dip as it brakes
    const idle = prefs.reduced || hovering ? 0 : Math.sin(t * 38) * 0.006 + Math.sin(t * 11) * 0.004;
    body.position.y = idle;
    body.rotation.z += (Math.max(-0.06, Math.min(0.06, -DIR * v * 0.00018)) - body.rotation.z) * Math.min(1, dt * 8);
    // the headlights: two winks
    if (flashT >= 0) {
      flashT += dt;
      const p = flashT / 0.7;
      const k = p >= 1 ? 0 : Math.max(0, Math.sin(p * Math.PI * 4)) ** 0.6;
      for (const m of lamps) m.emissiveIntensity = k * 2.4;
      beam?.style.setProperty('--on', k.toFixed(3));
      if (p >= 1) flashT = -1;
    }
    // parked and only idling: the shiver reads the same at 30 fps, for half the draws
    sinceDraw += dt;
    const parked = Math.abs(v) < 0.5 && Math.abs(goal - x) < 0.5 && flashT < 0;
    if (parked && sinceDraw < 1 / 30 - 0.002) return;
    sinceDraw = 0;
    if (!(Math.abs(x - placedAt) <= 0.05)) {
      placedAt = x;
      place();
    }
    renderer.render(scene, camera);
  };
  gsap.ticker.add(tick);
  place();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');

  return () => {
    gsap.ticker.remove(tick);
    io.disconnect();
    clearTimeout(hideNote);
    window.removeEventListener('resize', resize);
    hit.removeEventListener('pointerenter', onEnter);
    hit.removeEventListener('pointerleave', onLeave);
    hit.removeEventListener('focus', onEnter);
    hit.removeEventListener('blur', onLeave);
    hit.removeEventListener('click', flash);
    renderer.dispose();
  };
}
