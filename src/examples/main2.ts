import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Mesh, MeshNormalMaterial, Scene, SphereGeometry, TorusGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SceneBVH } from '../three.js/sceneBVH';
import { SceneBVHHelper } from '../three.js/sceneBVHHelper';
import { PRNG } from './utils/random';

const count = 20;
const halfRadius = 50; // to positioning meshes
const marginBVH = 0;
const random = new PRNG(count);

const sceneBVH = new SceneBVH(marginBVH, false);

const scene = new Scene();
scene.activeSmartRendering();
scene.matrixAutoUpdate = false;
scene.matrixWorldAutoUpdate = false;

scene.on('drag', (e) => {
  const mesh = e.target as Mesh;
  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  sceneBVH.move(mesh); // update mesh inside bvh
  helper.update();
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

  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, false);

  scene.add(mesh);

  sceneBVH.insert(mesh); // insert inside BVH
}

const helper = new SceneBVHHelper(sceneBVH, 40, true);
helper.interceptByRaycaster = false;
scene.add(helper);

const main = new Main();
main.createView({
  scene,
  camera,
  backgroundColor: 'white',
  onBeforeRender: () => {
    camera.updateMatrix();
    camera.updateWorldMatrix(false, false);
  }
});

const controls = new OrbitControls(camera, main.renderer.domElement);
scene.on(['pointerdown', 'pointerup', 'dragend'], (e) => (controls.enabled = e.type === 'pointerdown' ? e.target === scene : true));

document.getElementById("loading").remove();
