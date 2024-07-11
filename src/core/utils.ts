import { FloatArray } from "bvh.js/core/BVHNode";
import { Box3, Intersection, Line, Mesh, Points, Sprite } from "three";

export type RenderableObject = Mesh | Line | Points | Sprite;

const box3 = new Box3();

export function getBox(object: RenderableObject, array: FloatArray = new Float64Array(6)): FloatArray {
  if (!object.geometry.boundingBox) {
    object.geometry.computeBoundingBox();
  }

  box3.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);

  const min = box3.min;
  const max = box3.max;

  array[0] = min.x;
  array[1] = max.x;
  array[2] = min.y;
  array[3] = max.y;
  array[4] = min.z;
  array[5] = max.z;

  return array;
}

export function ascSortIntersection(a: Intersection, b: Intersection): number {
  return a.distance - b.distance;
}
