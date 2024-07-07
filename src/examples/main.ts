import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Intersection, LineSegments, Mesh, MeshBasicMaterial, MeshNormalMaterial, Object3D, Scene, SphereGeometry, TorusGeometry } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { BVHInspector } from '../utils/inspector';
import { SceneBVH } from '../three.js/sceneBVH';
import { PRNG } from './utils/random';
import { TopDownBuilder } from '../builder/topDownBuilder';
import { IncrementalBuilder } from '../builder/incrementalBuilder';

/**
 * In this example, a BVH is used to perform frustum culling and raycasting.
 * START CAN BE A LITTLE SLOW...
*/
const useBVH = true; // you can test performance changing this. if you set false is the native three.js frustum culling and NO raycasting.
const marginBVH = 0;
// const builder = new TopDownBuilder<Object3D>();
const builder = new IncrementalBuilder<Object3D>(marginBVH);
const count = 80000;
const animatedCount = 0;
const halfRadius = 5000; // to positioning meshes
const verbose = false;
const random = new PRNG(count);
const statsFPSRefresh = 5;

const sceneBVH = useBVH ? new SceneBVH(builder, verbose) : null;

const scene = new Scene();
scene.interceptByRaycaster = false; // disable three.ez events
scene.matrixAutoUpdate = false; // if I don't put this there's a bug... already opened in three.js repo
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70).translateZ(100);

const material = new MeshNormalMaterial();
const materialHover = new MeshBasicMaterial({ color: 'yellow' });

const geometries = [new BoxGeometry(10, 10, 10), new SphereGeometry(5, 15, 15), new ConeGeometry(5, 10, 15, 15), new TorusGeometry(5, 1, 15, 15)];


for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);
  mesh.frustumCulled = !useBVH;

  mesh.position.x = random.range(-halfRadius, halfRadius);
  mesh.position.y = random.range(-halfRadius, halfRadius);
  mesh.position.z = random.range(-halfRadius, halfRadius);

  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  scene.add(mesh);

  if (animatedCount <= i) continue;

  mesh.on('animate', (e) => {
    mesh.position.x += e.delta * 10;

    mesh.updateMatrix();
    mesh.updateWorldMatrix(false, false);

    if (useBVH) sceneBVH.move(mesh);
  });
}

const start = performance.now();

if (useBVH) {
  sceneBVH.insertRange(scene.children as Mesh[]);
}

const buildTime = performance.now() - start;
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
      sceneBVH.updateCulling(camera, frustumResult);
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
    `efficiency         : ${inspector.efficiency.toFixed(2)}\n` +
    `total nodes        : ${inspector.totalNodes}\n` +
    `total leaf nodes   : ${inspector.totalLeafNodes}\n` +
    `min / max depth    : ${inspector.minDepth} / ${inspector.maxDepth}\n`;
}
