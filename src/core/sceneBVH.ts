import { BVH, CoordinateSystem, HybridBuilder, WebGLCoordinateSystem, BVHNode, FloatArray } from 'bvh.js/src';
import { Camera, Intersection, Matrix4, Object3D, Raycaster } from 'three';
import { ascSortIntersection, getBox, RenderableObject } from './utils';

type NodeData = {};
type LeafData = Object3D;

export class SceneBVH {
  public bvh: BVH<NodeData, LeafData>;
  public map = new WeakMap<Object3D, BVHNode<NodeData, LeafData>>();

  constructor(protected margin = 0, coordinateSystem: CoordinateSystem = WebGLCoordinateSystem) {
    this.bvh = new BVH(new HybridBuilder(false), coordinateSystem);
  }

  public createFromArray(objects: RenderableObject[]): void {
    this.clear();

    const count = objects.length;
    const boxes: FloatArray[] = new Array(count); // TODO change to float64Array?

    for (let i = 0; i < count; i++) {
      boxes[i] = getBox(objects[i]); // this creates float64array
    }

    this.bvh.createFromArray(objects, boxes, (node) => {
      this.map.set(node.object, node);
    });
  }

  public insert(object: RenderableObject): void {
    const node = this.bvh.insert(object, getBox(object), this.margin);
    this.map.set(object, node);
  }

  public insertRange(objects: RenderableObject[]): void {
    const count = objects.length;
    const boxes: FloatArray[] = new Array(count);

    for (let i = 0; i < count; i++) {
      boxes[i] = getBox(objects[i]); // this creates float32array
    }

    this.bvh.insertRange(objects, boxes, this.margin, (node) => {
      this.map.set(node.object, node);
    });
  }

  public move(object: RenderableObject): void {
    const node = this.map.get(object);
    getBox(object, node.box); // update box
    this.bvh.move(node, this.margin);
  }

  public delete(object: RenderableObject): void {
    const node = this.map.get(object);
    this.bvh.delete(node);
    this.map.delete(object);
  }

  public clear(): void {
    this.bvh.clear();
    this.map = new WeakMap<Object3D, BVHNode<NodeData, LeafData>>();
  }

  public frustumCulling(camera: Camera, result: Object3D[]): void {
    const margin = this.margin;

    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.bvh.frustumCulling(_projScreenMatrix.elements, (node, frustum, mask) => {

      if (frustum.isIntersected(node.box, mask, margin)) result.push(node.object);

    });
  }

  public raycast(raycaster: Raycaster, result: Intersection[]): void {
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

      object.raycast(raycaster, result); // avoid using 'object.raycast()' we can skip bSphere validation
    }

    result.sort(ascSortIntersection);

    _target.length = 0;
  }
}

const _projScreenMatrix = new Matrix4();
const _target: RenderableObject[] = [];
const _origin = new Float64Array(3);
const _dir = new Float64Array(3);
