import { Camera, Intersection, Matrix4, Mesh, Object3D, Ray, Raycaster } from 'three';
import { BVH, Node } from '../core/BVH';
import { IncrementalBuilder } from '../core/incrementalBuilder';
import { Frustum } from './frustum';
import { ascSortIntersection, getBox } from './utils';

type N = {};
type L = Object3D;

export class SceneBVH {
  public bvh: BVH<N, L>;
  public verbose: boolean;
  protected _frustum = new Frustum();

  constructor(margin = 5, verbose = false) {
    this.bvh = new BVH(new IncrementalBuilder(margin));
    this.verbose = verbose;
  }

  public insert(object: Mesh): void {  // TODO fix if don't use only mesh
    const node = this.bvh.insert(object, getBox(object));
    _map.set(object, node);
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

  public updateCulling(camera: Camera, result: Object3D[]): void {
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    this.verbose && console.time('culling');

    this._frustum.setFromProjectionMatrix(_projScreenMatrix);
    this.traverseVisibility(this.bvh.root, 0b111111, result);

    this.verbose && console.timeEnd('culling');
  }

  private traverseVisibility(node: Node<N, L>, mask: number, result: Object3D[]): void {
    mask = this._frustum.intesectsBoxMask(node.box, mask);

    if (mask < 0) return; // -1 = out

    if (mask === 0) return this.showAll(node, result); // 0 = in

    // 1+ = intersect
    if (node.object) {
      result.push(node.object);
      return;
    }

    this.traverseVisibility(node.left, mask, result);
    this.traverseVisibility(node.right, mask, result);
  }

  private showAll(node: Node<N, L>, result: Object3D[]): void {
    if (node.object) {
      result.push(node.object);
      return;
    }

    this.showAll(node.left, result);
    this.showAll(node.right, result);
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
