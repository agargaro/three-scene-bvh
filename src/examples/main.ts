import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BVHInspector } from 'bvh.js/src';
import { BoxGeometry, ConeGeometry, Intersection, LineSegments, Mesh, MeshBasicMaterial, MeshNormalMaterial, Scene, SphereGeometry, TorusGeometry } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { SceneBVH } from '../core/sceneBVH';
import { PRNG } from './utils/random';

/**
 * In this example, a BVH is used to perform frustum culling and raycasting.
 * START CAN BE A LITTLE SLOW...
*/

const useBVH = true; // you can test performance changing this. if you set false is the native three.js frustum culling and NO raycasting.
const count = 100000;
const animatedCount = 20000;
const halfRadius = 20000; // to positioning meshes
const marginBVH = 200;
const random = new PRNG(count);
const statsFPSRefresh = 5;
const meshes: Mesh[] = new Array(count);

const sceneBVH = useBVH ? new SceneBVH(marginBVH) : null;

const scene = new Scene();
scene.interceptByRaycaster = false; // disable three.ez events
scene.matrixAutoUpdate = false;
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70, 0.1, 3000).translateZ(100);

const material = new MeshNormalMaterial();
const materialHover = new MeshBasicMaterial({ color: 'yellow' });

const geometries = [new BoxGeometry(10, 10, 10), new SphereGeometry(5, 15, 15), new ConeGeometry(5, 10, 15, 15), new TorusGeometry(5, 1, 15, 15)];

for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);
  mesh.frustumCulled = !useBVH;

  const userData = mesh.userData;

  const r = userData.r = random.range(halfRadius * 0.05, halfRadius * 2);
  const phi = userData.phi = random.range(0, Math.PI * 2);
  const theta = userData.theta = random.range(0, Math.PI * 2);

  mesh.position.setFromSphericalCoords(r, phi, theta);

  mesh.matrix.setPosition(mesh.position);
  mesh.matrixWorld.copy(mesh.matrix);

  scene.add(mesh);
  meshes[i] = mesh;
}

const start = performance.now();

if (useBVH) {
  // sceneBVH.createFromArray(scene.children as Mesh[]);
  sceneBVH.insertRange(scene.children as Mesh[]);
}

const buildTime = performance.now() - start;

scene.on('animate', (e) => {
  for (let i = 0; i < animatedCount; i++) {
    const mesh = meshes[i];
    const userData = mesh.userData;

    mesh.position.setFromSphericalCoords(userData.r, userData.phi + e.total * 0.01, userData.theta + e.total * 0.01);

    mesh.matrix.setPosition(mesh.position);
    mesh.matrixWorld.copy(mesh.matrix);

    if (useBVH) sceneBVH.move(mesh);
  }
});

let raycastingTime: number;
let frustumCullingTime: number;

const originalChildren = scene.children;
const frustumResult: (Mesh | LineSegments)[] = [];
const intersections: Intersection[] = [];
let lastHovered: Mesh;

const main = new Main();

main.createView({
  scene,
  camera,
  backgroundColor: 'white',
  // visible: false,

  onBeforeRender: () => {
    camera.updateMatrix();
    camera.updateWorldMatrix(false, false);

    intersections.length = 0;

    if (useBVH) {
      frustumResult.length = 0;
      frustumCullingTime -= performance.now();
      sceneBVH.frustumCulling(camera, frustumResult);
      frustumCullingTime += performance.now();
      scene.children = frustumResult;
    }

    raycastingTime -= performance.now();
    if (useBVH) sceneBVH.raycast(main.raycaster, intersections);
    else main.raycaster.intersectObjects(scene.children, false, intersections);
    raycastingTime += performance.now();

    const intersected = intersections[0]?.object as Mesh;

    if (lastHovered !== intersected) {
      if (lastHovered) lastHovered.material = material;
      if (intersected) intersected.material = materialHover;
      lastHovered = intersected;
    }
  },

  onAfterRender: () => {
    scene.children = originalChildren;

    if (main.renderer.info.render.frame % statsFPSRefresh !== 0) return;

    frustumCullingTime /= statsFPSRefresh;
    raycastingTime /= statsFPSRefresh;

    document.getElementById("renderInfo").innerText =
      `drawCall        : ${main.renderer.info.render.calls}\n` +
      `raycasting      : ${raycastingTime.toFixed(2)} ms\n`;

    if (useBVH) {
      document.getElementById("renderInfo").innerText += `frustum culling : ${frustumCullingTime.toFixed(2)} ms\n`;
    }

    frustumCullingTime = 0;
    raycastingTime = 0;
  }
});

const controls = new MapControls(camera, main.renderer.domElement);
controls.panSpeed = 10;

document.getElementById("loading").remove();

if (useBVH) {
  const inspector = new BVHInspector(sceneBVH.bvh);

  document.getElementById("info").innerText =
    `construction time  : ${buildTime.toFixed(2)}ms\n` +
    `surface area score : ${inspector.surfaceScore.toFixed(2)}\n` +
    `area proportion    : ${inspector.areaProportion.toFixed(2)}\n` +
    `total nodes        : ${inspector.totalNodes}\n` +
    `total leaf nodes   : ${inspector.totalLeafNodes}\n` +
    `min / max depth    : ${inspector.minDepth} / ${inspector.maxDepth}\n`;
}
