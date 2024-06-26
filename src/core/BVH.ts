import { intersectRayBox } from "./intersectUtils";

export type FloatArray = Float32Array | Float64Array;

export type Node<NodeData, LeafData> = {
  box: FloatArray; // [minX, maxX, minY, maxY, minZ, maxZ]
  object?: LeafData;
  left?: Node<NodeData, LeafData>;
  right?: Node<NodeData, LeafData>;
} & NodeData;

export type InsertElement<L> = { object: L, box: FloatArray };

export interface IBVHBuilder<N, L> {
  root: Node<N, L>;
  insert(object: L, box: FloatArray): Node<N, L>;
  insertRange(items: InsertElement<L>[]): Node<N, L>[];
  move(node: Node<N, L>): void;
  delete(node: Node<N, L>): Node<N, L>;
}

export class BVH<N, L> {
  public builder: IBVHBuilder<N, L>;

  public get root(): Node<N, L> {
    return this.builder.root;
  }

  constructor(builder: IBVHBuilder<N, L>) {
    this.builder = builder;
  }

  public insert(object: L, box: FloatArray): Node<N, L> {
    return this.builder.insert(object, box);
  }

  public move(node: Node<N, L>): void {
    this.builder.move(node);
  }

  public delete(node: Node<N, L>): void {
    this.builder.delete(node);
  }

  public traverse(callback: (node: Node<N, L>, depth: number) => boolean): void {
    _traverse(this.root, 0);

    function _traverse(node: Node<N, L>, depth: number): void {

      if (node.object) { // is leaf
        callback(node, depth);
        return;
      }

      const stopTraversal = callback(node, depth);

      if (!stopTraversal) {
        _traverse(node.left, depth + 1);
        _traverse(node.right, depth + 1);
      }
    }
  }

  public intersectRay(dir: FloatArray, origin: FloatArray, near = 0, far = Infinity, result: L[] = []): L[] {
    _dirInv[0] = 1 / dir[0];
    _dirInv[1] = 1 / dir[1];
    _dirInv[2] = 1 / dir[2];

    _sign[0] = _dirInv[0] < 0 ? 1 : 0;
    _sign[1] = _dirInv[1] < 0 ? 1 : 0;
    _sign[2] = _dirInv[2] < 0 ? 1 : 0;

    // use inner function
    this._intersectRay(this.root, origin, _dirInv, _sign, near, far, result);

    return result;
  }

  // TODO check dirInv and sign useless to pass as parameter?
  protected _intersectRay(node: Node<N, L>, origin: FloatArray, dirInv: FloatArray, sign: Uint8Array, near: number, far: number, result: L[]): void {

    if (!intersectRayBox(node.box, origin, dirInv, sign, near, far)) return;

    if (node.object) {
      result.push(node.object);
      return;
    }

    this._intersectRay(node.left, origin, dirInv, sign, near, far, result);
    this._intersectRay(node.right, origin, dirInv, sign, near, far, result);
  }

}

const _dirInv = new Float64Array(3);
const _sign = new Uint8Array(3);
