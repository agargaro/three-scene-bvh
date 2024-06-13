import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Mesh, MeshNormalMaterial, Object3D, RingGeometry, Scene, SphereGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FrustumBVH } from './frustumBVH';

/**
 * In this example, a BVH is used to perform frustum culling.
 * START CAN BE A LITTLE SLOW...
 */

const applyFrustumBVH = true; // you can test performance changing this. if you set false is the native three.js frustum culling
const count = 200000;
const animatedCount = 1000;
const radius = 50000; // to positioning meshes
const marginBVH = 5;
const verbose = false;

const bvh = applyFrustumBVH ? new FrustumBVH(marginBVH, verbose) : null;

const scene = new Scene();
scene.matrixAutoUpdate = false; // if I don't put this there's a bug... already opened in three.js repo
scene.matrixWorldAutoUpdate = false;

const camera = new PerspectiveCameraAuto(70, 0.1).translateZ(10);

const material = new MeshNormalMaterial();

const geometries = [new BoxGeometry(1, 1, 1), new SphereGeometry(0.5, 9, 9), new ConeGeometry(0.5, 1, 9, 9), new RingGeometry(0.5, 1, 9, 9)];

for (const geometry of geometries) {
  geometry.computeBoundingBox();
}

console.time('building');

for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);
  mesh.frustumCulled = !applyFrustumBVH;

  mesh.quaternion.random();
  mesh.position.randomDirection().multiplyScalar(Math.random() * radius + 20);

  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  scene.add(mesh);

  const node = applyFrustumBVH ? bvh.insert(mesh) : undefined;

  if (animatedCount > i) {

    mesh.on('animate', (e) => {
      mesh.position.x += e.delta * 10;

      mesh.updateMatrix();
      mesh.updateWorldMatrix(false, false);

      if (applyFrustumBVH) bvh.move(node);
    });

  }
}

console.timeEnd('building');

const result: Object3D[] = [];
const originalChildren = scene.children;

const main = new Main();

main.createView({
  scene,
  camera,
  backgroundColor: 'white',
  enabled: false, // disable three.ez events

  onBeforeRender: () => {
    if (!applyFrustumBVH) return;

    camera.updateMatrix();
    camera.updateWorldMatrix(false, false);

    result.length = 0;
    bvh.updateCulling(camera, result);

    scene.children = result;
  },

  onAfterRender: () => {
    scene.children = originalChildren;
  }
});

const controls = new OrbitControls(camera, main.renderer.domElement);
// scene.on(['pointerdown', 'pointerup', 'dragend'], (e) => (controls.enabled = e.type === 'pointerdown' ? e.target === scene : true));
