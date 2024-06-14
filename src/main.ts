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
const count = 20000;
const animatedCount = 0;
const radius = 4000; // to positioning meshes
const marginBVH = 0;
const verbose = false;

const sceneBVH = useBVH ? new SceneBVH(marginBVH, verbose) : null;

const scene = new Scene();
scene.interceptByRaycaster = false; // disable three.ez events
scene.matrixAutoUpdate = false; // if I don't put this there's a bug... already opened in three.js repo
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70, 0.1, 1000).translateZ(10);

const material = new MeshNormalMaterial();
const materialHover = new MeshBasicMaterial({ color: 'yellow' });

const geometries = [new BoxGeometry(1, 1, 1), new SphereGeometry(0.5, 15, 15), new ConeGeometry(0.5, 1, 15, 15), new TorusGeometry(0.5, 0.2, 15, 15)];

const start = performance.now();

for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);
  mesh.frustumCulled = !useBVH;

  mesh.position.random().subScalar(0.5).multiplyScalar(radius);
  mesh.scale.multiplyScalar(Math.random() * 2 + 1);
  mesh.quaternion.random();

  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  scene.add(mesh);

  if (useBVH) sceneBVH.insert(mesh);

  if (animatedCount <= i) continue;

  mesh.on('animate', (e) => {
    mesh.position.x += e.delta;

    mesh.updateMatrix();
    mesh.updateWorldMatrix(false, false);

    if (useBVH) sceneBVH.move(mesh);
  });
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
