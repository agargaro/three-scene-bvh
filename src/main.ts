import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Intersection, Mesh, MeshBasicMaterial, MeshNormalMaterial, Scene, SphereGeometry, TorusGeometry } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { SceneBVH } from './three.js/sceneBVH';
import { BVHInspector } from './core/inspector';

/**
 * In this example, a BVH is used to perform frustum culling and raycasting.
 * START CAN BE A LITTLE SLOW...
 */

const useBVH = true; // you can test performance changing this. if you set false is the native three.js frustum culling and NO raycasting.
const count = 100000;
const animatedCount = 0;
const radius = 10000; // to positioning meshes
const marginBVH = 5;
const verbose = false;
const random = PRNG(count);

const sceneBVH = useBVH ? new SceneBVH(marginBVH, verbose) : null;

const scene = new Scene();
scene.interceptByRaycaster = false; // disable three.ez events
scene.matrixAutoUpdate = false; // if I don't put this there's a bug... already opened in three.js repo
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70).translateZ(10);

const material = new MeshNormalMaterial();
const materialHover = new MeshBasicMaterial({ color: 'yellow' });

const geometries = [new BoxGeometry(10, 10, 10), new SphereGeometry(5, 15, 15), new ConeGeometry(5, 10, 15, 15), new TorusGeometry(5, 1, 15, 15)];


for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);
  mesh.frustumCulled = !useBVH;

  mesh.position.x = random.range(-radius, radius);
  mesh.position.y = random.range(-radius, radius);
  mesh.position.z = random.range(-radius, radius);

  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  scene.add(mesh);

  if (animatedCount <= i) continue;

  mesh.on('animate', (e) => {
    mesh.position.x += e.delta;

    mesh.updateMatrix();
    mesh.updateWorldMatrix(false, false);

    if (useBVH) sceneBVH.move(mesh);
  });
}

const start = performance.now();

if (useBVH) {
  const children = scene.children;
  for (let i = 0, l = children.length; i < l; i++) {
    sceneBVH.insert(children[i] as Mesh);
  }
}

const time = performance.now() - start;

const originalChildren = scene.children;
const frustumResult: Mesh[] = [];
const intersections: Intersection[] = [];
let lastHovered: Mesh;

const main = new Main();

main.createView({
  scene,
  camera,
  backgroundColor: 'white',
  // visible: false,

  onBeforeRender: () => {
    if (!useBVH) return;

    camera.updateMatrix();
    camera.updateWorldMatrix(false, false);

    frustumResult.length = 0;
    sceneBVH.updateCulling(camera, frustumResult);
    scene.children = frustumResult;

    intersections.length = 0;
    sceneBVH.raycast(main.raycaster, intersections);

    const intersected = intersections[0]?.object as Mesh;

    if (lastHovered !== intersected) {
      if (lastHovered) lastHovered.material = material;
      if (intersected) intersected.material = materialHover;
      lastHovered = intersected;
    }
  },

  onAfterRender: () => {
    scene.children = originalChildren;

    document.getElementById("drawCall").innerText = `drawCall: ${main.renderer.info.render.calls}`;
  }
});

const controls = new MapControls(camera, main.renderer.domElement);
controls.panSpeed = 10;

document.getElementById("loading").remove();

if (useBVH) {
  const inspector = new BVHInspector(sceneBVH.bvh);

  document.getElementById("info").innerText =
    `construction time  : ${time.toFixed(2)}ms\n` +
    `surface area score : ${inspector.surfaceScore.toFixed(2)}\n` +
    `total nodes        : ${inspector.totalNodes}\n` +
    `total leaf nodes   : ${inspector.totalLeafNodes}\n` +
    `min / max depth    : ${inspector.minDepth} / ${inspector.maxDepth}\n`;
}

export function PRNG(seed: number) {
  const value = mulberry32(seed);
  return {
    range(min, max) {
      return min + (max - min) * value();
    },
  };
}

function mulberry32(a: number) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
