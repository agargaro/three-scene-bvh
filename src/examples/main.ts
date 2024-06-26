import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Intersection, LineSegments, Mesh, MeshBasicMaterial, MeshNormalMaterial, Scene, SphereGeometry, TorusGeometry } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { SceneBVH } from '../three.js/sceneBVH';
import { BVHInspector } from '../core/inspector';
import { SceneBVHHelper } from '../three.js/sceneBVHHelper';
import { PRNG } from './utils/random';

/**
 * In this example, a BVH is used to perform frustum culling and raycasting.
 * START CAN BE A LITTLE SLOW...
 */

const useBVH = true; // you can test performance changing this. if you set false is the native three.js frustum culling and NO raycasting.
const count = 100;
const animatedCount = 20;
const halfRadius = 100; // to positioning meshes
const marginBVH = 0;
const verbose = false;
const random = new PRNG(count);

const sceneBVH = useBVH ? new SceneBVH(marginBVH, verbose) : null;

const scene = new Scene();
scene.interceptByRaycaster = false; // disable three.ez events
scene.matrixAutoUpdate = false; // if I don't put this there's a bug... already opened in three.js repo
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70, 0.1, 10000).translateZ(500);

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
  const children = scene.children;

  for (let i = 0, l = children.length; i < l; i++) {
    sceneBVH.insert(children[i] as Mesh);
  }
}

const time = performance.now() - start;

const originalChildren = scene.children;
const frustumResult: (Mesh | LineSegments)[] = [];
const intersections: Intersection[] = [];
let lastHovered: Mesh;
let helper: SceneBVHHelper;

if (useBVH) {
  helper = new SceneBVHHelper(sceneBVH, 40, true);
  scene.add(helper);
}

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
      sceneBVH.updateCulling(camera, frustumResult);
      scene.children = frustumResult;

      if (animatedCount > 0) helper.update();
      frustumResult.push(helper);

      sceneBVH.raycast(main.raycaster, intersections);
    } else {
      main.raycaster.intersectObjects(scene.children, false, intersections);
    }

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
