export type FloatArray = Float32Array | Float64Array;

export type Node<NodeData = {}, LeafData = any> = {
  box: FloatArray;
  object?: LeafData;
  left?: Node<NodeData>;
  right?: Node<NodeData>;
} & NodeData;

export interface IBVHBuilder<NodeData = {}, LeafData = any> {
  root: Node<NodeData, LeafData>;
  insert(object: LeafData, box: FloatArray): Node<NodeData, LeafData>;
  move(node: Node<NodeData, LeafData>): void;
  delete(node: Node<NodeData, LeafData>): Node<NodeData, LeafData>;
}

export class BVH<NodeData = {}, LeafData = any> {
  public builder: IBVHBuilder<NodeData, LeafData>;
  public verbose: boolean;

  public get root(): Node<NodeData, LeafData> {
    return this.builder.root;
  }

  constructor(builder: IBVHBuilder<NodeData, LeafData>, verbose = false) {
    this.builder = builder;
    this.verbose = verbose;
  }

  public insert(object: LeafData, box: FloatArray): Node<NodeData, LeafData> {
    return this.builder.insert(object, box);
  }

  //update node.box before calling this function
  public move(node: Node<NodeData, LeafData>): void {
    this.builder.move(node);
  }

  public delete(node: Node<NodeData, LeafData>): void {
    this.builder.delete(node);
  }

  // public raycast(raycaster: Raycaster, intersects: Intersection[]): void {
  //   this.verbose && console.time("raycast");

  //   const origin = new Float32Array(3); // cache it?
  //   const dirInv = new Float32Array(3); // cache it?
  //   const sign = new Uint8Array(3);

  //   const ray = raycaster.ray;
  //   const distance = raycaster.far;

  //   origin[0] = ray.origin.x;
  //   origin[1] = ray.origin.y;
  //   origin[2] = ray.origin.z;

  //   dirInv[0] = 1 / ray.direction.x;
  //   dirInv[1] = 1 / ray.direction.y;
  //   dirInv[2] = 1 / ray.direction.z;

  //   sign[0] = dirInv[0] < 0 ? 1 : 0;
  //   sign[1] = dirInv[1] < 0 ? 1 : 0;
  //   sign[2] = dirInv[2] < 0 ? 1 : 0;

  //   _mesh.geometry = this._target.geometry;
  //   _mesh.material = this._target.material;

  //   this.checkIntersection(raycaster, this.root, origin, dirInv, sign, distance, intersects);

  //   this.verbose && console.timeEnd("raycast");
  // }

  // private checkIntersection(raycaster: Raycaster, node: Node, origin: Float32Array, dirInv: Float32Array, sign: Uint8Array, distance: number, intersects: Intersection[]): void {
  //   if (!intersectRayBox(node.bbox, origin, dirInv, sign, distance)) return;

  //   if (node.leaves !== undefined) {
  //     const leaves = node.leaves;
  //     const matrixWorld = this._target.matrixWorld;

  //     for (let i = 0, l = leaves.length; i < l; i++) {
  //       if (!leaves[i]._visible) continue;

  //       _instanceWorldMatrix.multiplyMatrices(matrixWorld, leaves[i].matrix);
  //       _mesh.matrixWorld = _instanceWorldMatrix;

  //       _mesh.raycast(raycaster, _instanceIntersects);

  //       for (let j = 0, l = _instanceIntersects.length; j < l; j++) {
  //         const intersect = _instanceIntersects[j];
  //         intersect.instanceId = leaves[i]._id;
  //         intersect.object = this._target;
  //         intersects.push(intersect);
  //       }

  //       _instanceIntersects.length = 0;
  //     }
  //   } else {
  //     this.checkIntersection(raycaster, node.left, origin, dirInv, sign, distance, intersects);
  //     this.checkIntersection(raycaster, node.right, origin, dirInv, sign, distance, intersects);
  //   }
  // }

}
