import { Node } from "./core/BVH";

declare module 'three/src/core/Object3D' {
  export interface Object3D {
    bvhNode: Node<{}, Object3D>;
  }
}