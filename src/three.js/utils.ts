import { Box3, Intersection, Mesh } from "three";
import { FloatArray } from "../core/BVH";

const box3 = new Box3();

export function getBox(mesh: Mesh, array: FloatArray = new Float64Array(6)): FloatArray {
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }

  box3.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

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
