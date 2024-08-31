import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, ConeGeometry, Mesh, MeshNormalMaterial, Scene, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SceneBVH } from '../core/sceneBVH';
import { SceneBVHHelper } from '../core/sceneBVHHelper';
import { PRNG } from './utils/random';

const count = 50;
const radius = 100; // to positioning meshes
const marginBVH = 0;
const random = new PRNG(count);

const sceneBVH = new SceneBVH(marginBVH);

const scene = new Scene();
scene.timeScale = 0.2;

scene.on('drag', (e) => {
  const mesh = e.target as Mesh;
  sceneBVH.move(mesh); // update mesh inside bvh
});

const camera = new PerspectiveCameraAuto(70).translateZ(radius * 2);

const geometries = [new BoxGeometry(10, 10, 10), new SphereGeometry(5), new ConeGeometry(5, 10), new TorusGeometry(5, 1)];
const material = new MeshNormalMaterial();

for (let i = 0; i < count; i++) {
  const mesh = new Mesh(geometries[i % geometries.length], material);

  mesh.draggable = true;

  const r = random.range(5, radius);
  const phi = random.range(1, 2);
  const theta = random.range(1, 2);

  mesh.position.setFromSphericalCoords(r, phi, theta);

  mesh.quaternion.random();

  const axis = new Vector3().randomDirection();

  mesh.on('animate', (e) => {
    mesh.rotateOnAxis(axis, e.delta);
    mesh.position.setFromSphericalCoords(r, e.total * phi, theta * e.total * theta);
    sceneBVH.move(mesh);
  });

  scene.add(mesh);
  sceneBVH.insert(mesh); // insert inside BVH
}

scene.on('animate', () => helper.update());

const helper = new SceneBVHHelper(sceneBVH);
helper.interceptByRaycaster = false;
scene.add(helper);

const main = new Main();
main.createView({ scene, camera, backgroundColor: 'black', onBeforeRender: () => controls.update() });

const controls = new OrbitControls(camera, main.renderer.domElement);
scene.on(['pointerdown', 'pointerup', 'dragend'], (e) => (controls.enabled = e.type === 'pointerdown' ? e.target === scene : true));

document.getElementById("loading").remove();
