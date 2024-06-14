import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Intersection, Mesh, MeshBasicMaterial, MeshNormalMaterial, RingGeometry, Scene, SphereGeometry } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { SceneBVH } from './three.js/sceneBVH';

/**
 * In this example, a BVH is used to perform frustum culling and raycasting.
 * START CAN BE A LITTLE SLOW...
 */

const useBVH = true; // you can test performance changing this. if you set false is the native three.js frustum culling and NO raycasting.
const count = 100000;
const animatedCount = 1000;
const radius = 10000; // to positioning meshes
const marginBVH = 5;
const verbose = false;

const bvh = useBVH ? new SceneBVH(marginBVH, verbose) : null;

const scene = new Scene();
scene.interceptByRaycaster = false; // disable three.ez events
scene.matrixAutoUpdate = false; // if I don't put this there's a bug... already opened in three.js repo
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70, 0.1, 1000).translateZ(10);

const material = new MeshNormalMaterial();
const materialHover = new MeshBasicMaterial({ color: 'yellow' });

const geometries = [new BoxGeometry(1, 1, 1), new SphereGeometry(0.5, 9, 9), new ConeGeometry(0.5, 1, 9, 9), new RingGeometry(0.5, 1, 9, 9)];

console.time('building');

for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);
  mesh.frustumCulled = !useBVH;

  mesh.quaternion.random();
  mesh.position.setFromSphericalCoords((Math.random() * 0.99 + 0.01) * radius, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  scene.add(mesh);

  const node = useBVH ? bvh.insert(mesh) : undefined;

  if (animatedCount <= i) continue;

  mesh.on('animate', (e) => {
    mesh.position.x += e.delta;

    mesh.updateMatrix();
    mesh.updateWorldMatrix(false, false);

    if (useBVH) bvh.move(node);
  });
}

console.timeEnd('building');

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
    bvh.updateCulling(camera, frustumResult);
    scene.children = frustumResult;
    
    intersections.length = 0;
    bvh.raycast(main.raycaster, intersections);

    const intersected = intersections[0]?.object as Mesh;

    if (lastHovered !== intersected) {
      if (lastHovered) lastHovered.material = material;
      if (intersected) intersected.material = materialHover;
      lastHovered = intersected;
    }
  },

  onAfterRender: () => {
    scene.children = originalChildren;
  }
});

const controls = new MapControls(camera, main.renderer.domElement);
controls.panSpeed = 10;
