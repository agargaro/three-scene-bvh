import { Camera, Intersection, Matrix4, Mesh, Object3D, Ray, Raycaster } from 'three';
import { BVH, FloatArray, IBVHBuilder, Node } from '../core/BVH';
import { IncrementalBuilder } from '../builder/incrementalBuilder';
import { Frustum } from './frustum';
import { ascSortIntersection, getBox } from './utils';
import { TopDownBuilder } from '../builder/topDownBuilder';

type N = {};
type L = Object3D;

export class SceneBVH {
  public bvh: BVH<N, L>;
  public verbose: boolean;
  protected _frustum = new Frustum();

  constructor(builder: IBVHBuilder<N, L>, verbose = false) {
    this.bvh = new BVH(builder);
    this.verbose = verbose;
  }

  public insert(object: Mesh): void {  // TODO fix if don't use only mesh
    const node = this.bvh.insert(object, getBox(object));
    _map.set(object, node);
  }

  public insertRange(objects: Mesh[]): void {  // TODO fix if don't use only mesh
    const count = objects.length;
    const boxes: FloatArray[] = new Array(objects.length);

    for (let i = 0; i < count; i++) {
      boxes[i] = getBox(objects[i], new Float32Array(6));
    }

    this.bvh.builder.createFromArray(objects, boxes);
    // todo add map
  }

  public move(object: Mesh): void {
    const node = _map.get(object);
    getBox(object, node.box);
    this.bvh.move(node);
  }

  public delete(object: Mesh): void {
    const node = _map.get(object);
    this.bvh.delete(node); // add check delete only if exists
    // _map.delete(object); do only if delete and not move
  }

  public updateCulling(camera: Camera, result: Object3D[]): number {
    const frustum = this._frustum;
    let count = 0;

    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    this.verbose && console.time('culling');

    frustum.setFromProjectionMatrix(_projScreenMatrix);
    traverseVisibility(this.bvh.root, 0b111111);

    this.verbose && console.timeEnd('culling');

    return count;

    function traverseVisibility(node: Node<N, L>, mask: number): void {
      mask = frustum.intesectsBoxMask(node.box, mask);

      if (mask < 0) return; // -1 = out

      if (mask === 0) { // 0 = in
        showAll(node);
        return;
      }

      // 1+ = intersect
      if (node.object) {
        result[count++] = node.object;
        return;
      }

      traverseVisibility(node.left, mask);
      traverseVisibility(node.right, mask);
    }

    function showAll(node: Node<N, L>): void {
      if (node.object) {
        result[count++] = node.object;
        return;
      }

      showAll(node.left);
      showAll(node.right);
    }
  }

  public raycast(raycaster: Raycaster, result: Intersection[]): void {
    this.verbose && console.time("raycast");

    const ray = raycaster.ray;

    _origin[0] = ray.origin.x;
    _origin[1] = ray.origin.y;
    _origin[2] = ray.origin.z;

    _dir[0] = ray.direction.x;
    _dir[1] = ray.direction.y;
    _dir[2] = ray.direction.z;

    this.bvh.intersectRay(_dir, _origin, raycaster.near, raycaster.far, _target);

    for (let i = 0, l = _target.length; i < l; i++) {
      const object = _target[i];

      if (!object.visible) continue;

      object.raycast(raycaster, result);
      // avoid using 'object.raycast()' we can skip bSphere validation
    }

    result.sort(ascSortIntersection);

    _target.length = 0;

    this.verbose && console.timeEnd("raycast");
  }
}

const _projScreenMatrix = new Matrix4();
const _target: Mesh[] = [];
const _origin = new Float64Array(3);
const _dir = new Float64Array(3);
const _map = new WeakMap<Object3D, Node<N, L>>();
