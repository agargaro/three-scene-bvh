import { Camera, Intersection, Matrix4, Mesh, Object3D, Raycaster } from 'three';
import { BVH, FloatArray, Node } from '../core/BVH';
import { IncrementalBuilder } from '../core/incrementalBuilder';
import { Frustum } from './frustum';
import { getBox } from './utils';

export class FrustumBVH extends BVH<{}, Object3D> {
  public verbose: boolean;
  protected _frustum = new Frustum();

  constructor(margin?: number, verbose = false) {
    super(new IncrementalBuilder(margin));
    this.verbose = verbose;
  }

  public override insert(object: Mesh, box?: FloatArray): Node {  // TODO fix if don't use mesh
    if (box === undefined) box = getBox(object);
    return super.insert(object, box);
  }

  public override move(node: Node): void {
    getBox(node.object as Mesh, node.box); // TODO fix if don't use mesh
    super.move(node);
  }

  public updateCulling(camera: Camera, result: Object3D[]): void {
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    this.verbose && console.time('Culling');

    this._frustum.setFromProjectionMatrix(_projScreenMatrix);
    this.traverseVisibility(this.root, 0b111111, result);

    this.verbose && console.timeEnd('Culling');
  }

  private traverseVisibility(node: Node, mask: number, result: Object3D[]): void {
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

  private showAll(node: Node, result: Object3D[]): void {
    if (node.object) {
      result.push(node.object);
      return;
    }

    this.showAll(node.left, result);
    this.showAll(node.right, result);
  }

  public raycast(raycaster: Raycaster, result: Intersection[]): void {
    this.verbose && console.time("raycast");

    const origin = new Float32Array(3); // cache it?
    const dir = new Float32Array(3); // cache it?
    const ray = raycaster.ray;

    origin[0] = ray.origin.x;
    origin[1] = ray.origin.y;
    origin[2] = ray.origin.z;

    dir[0] = ray.direction.x;
    dir[1] = ray.direction.y;
    dir[2] = ray.direction.z;

    this.intersectRay(dir, origin, raycaster.near, raycaster.far, _target);

    const intersections: Intersection[] = [] // cache it?

    for (let i = 0, l = _target.length; i < l; i++) {
      const object = _target[i];

      if (!object.visible) continue;

      _mesh.geometry = object.geometry;
      _mesh.material = object.material; // do we need also material?
      _mesh.matrixWorld = object.matrixWorld;

      _mesh.raycast(raycaster, intersections); // capire se metodo migliore

      result.push(...intersections);

      intersections.length = 0;
    }

    // TODO add sort?

    _target.length = 0;

    this.verbose && console.timeEnd("raycast");
  }
}

const _projScreenMatrix = new Matrix4();
const _mesh = new Mesh();
const _target: Mesh[] = [];
