import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Mesh, MeshNormalMaterial, Object3D, Scene, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SceneBVH } from '../core/sceneBVH';
import { SceneBVHHelper } from '../core/sceneBVHHelper';
import { PRNG } from './utils/random';
import { HybridBuilder } from 'bvh.js';

const count = 20;
const halfRadius = 50; // to positioning meshes
const marginBVH = 0;
const random = new PRNG(count);

const builder = new HybridBuilder<Object3D>(marginBVH);
const sceneBVH = new SceneBVH(builder);

const scene = new Scene();
scene.activeSmartRendering(); // render only if necessary
scene.matrixAutoUpdate = false;
scene.matrixWorldAutoUpdate = false;

scene.on('drag', (e) => {
  const mesh = e.target as Mesh;

  mesh.matrix.compose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.matrixWorld.copy(mesh.matrix);

  sceneBVH.move(mesh); // update mesh inside bvh
  // helper.update();
});

const camera = new PerspectiveCameraAuto(70).translateZ(halfRadius * 2);

const geometries = [new BoxGeometry(10, 10, 10), new SphereGeometry(5, 15, 15), new ConeGeometry(5, 10, 15, 15), new TorusGeometry(5, 1, 15, 15)];
const material = new MeshNormalMaterial();

for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);

  mesh.draggable = true;

  mesh.position.x = random.range(-halfRadius, halfRadius);
  mesh.position.y = random.range(-halfRadius, halfRadius);
  mesh.position.z = random.range(-halfRadius, halfRadius);

  mesh.quaternion.random();

  mesh.matrix.compose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.matrixWorld.copy(mesh.matrix);

  const axis = new Vector3().randomDirection();

  mesh.on('animate', (e) => {
    mesh.rotateOnAxis(axis, e.delta);
    mesh.matrix.compose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.matrixWorld.copy(mesh.matrix);
    sceneBVH.move(mesh);
  });

  scene.add(mesh);

  sceneBVH.insert(mesh); // insert inside BVH
}

scene.on('animate', () => helper.update());

const helper = new SceneBVHHelper(sceneBVH, 40, true);
helper.interceptByRaycaster = false;
scene.add(helper);

const main = new Main();
main.createView({ scene, camera, backgroundColor: 'black' });

const controls = new OrbitControls(camera, main.renderer.domElement);
scene.on(['pointerdown', 'pointerup', 'dragend'], (e) => (controls.enabled = e.type === 'pointerdown' ? e.target === scene : true));

document.getElementById("loading").remove();
