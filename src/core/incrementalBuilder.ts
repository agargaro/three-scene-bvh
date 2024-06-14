import { FloatArray, IBVHBuilder, InsertElement } from './BVH';
import { areaBox, areaFromTwoBoxes, isBoxInsideBox, unionBox } from './boxUtils';

export type Node<NodeData, LeafData> = {
  box: FloatArray;
  parent?: Node<NodeData, LeafData>;
  object?: LeafData; // remove this three.js reference to make it general
  left?: Node<NodeData, LeafData>;
  right?: Node<NodeData, LeafData>;
  area?: number; // this use more memory but makes add faster
} & NodeData;

interface QueueElement<N, L> {
  node: Node<N, L>;
  inheritedCost: number;
}

export class IncrementalBuilder<N, L> implements IBVHBuilder<N, L> {
  public root: Node<N, L> = null;
  protected _margin: number;

  constructor(margin: number) {
    this._margin = margin;
  }

  public insert(object: L, box: FloatArray): Node<N, L> {
    const leaf = this.createLeafNode(object, box);

    if (this.root === null) {
      leaf.area = areaBox(box);
      this.root = leaf;
    } else {
      this.insertLeaf(leaf);
    }

    return leaf;
  }

  public insertRange(items: InsertElement<L>[]): Node<N, L>[] {
    const leaves: Node<N, L>[] = new Array(items.length);

    // for (let i = 0, l = items.length; i < l; i++) {
    //   const item = items[i];
    //   const leaf = this.createLeafNode(item.object, item.box);

    //   if (this.root === null) { // remove from for?
    //     leaf.area = areaBox(item.box);
    //     this.root = leaf;
    //   } else {
    //     this.insertLeaf(leaf);
    //   }

    //   leaves.push(leaf);
    // }

    return leaves;
  }

  protected insertLeaf(leaf: Node<N, L>, newParent?: Node<N, L>): void {
    leaf.area = areaBox(leaf.box); // if only move we don't need to recalculate it?

    const sibling = this.findBestSibling(leaf.box, leaf.area);

    const oldParent = sibling.parent;

    if (newParent === undefined) {
      newParent = this.createInternalNode(oldParent, sibling, leaf);
    } else {
      newParent.parent = oldParent;
      newParent.left = sibling;
      newParent.right = leaf;
    }

    sibling.parent = newParent;
    leaf.parent = newParent;

    if (oldParent === null) {
      // The sibling was the root
      this.root = newParent;
    } else {
      if (oldParent.left == sibling) oldParent.left = newParent;
      else oldParent.right = newParent;
    }

    this.refitAndRotate(newParent);
  }

  //update node.box before calling this function
  public move(node: Node<N, L>): void {
    if (isBoxInsideBox(node.box, node.parent.box)) return;

    const deletedNode = this.delete(node);
    this.insertLeaf(node, deletedNode);
  }

  public delete(node: Node<N, L>): Node<N, L> {
    const parent = node.parent;
    const parent2 = parent.parent;

    const oppositeLeaf = parent.left === node ? parent.right : parent.left;

    if (parent2.left === parent) parent2.left = oppositeLeaf;
    else parent2.right = oppositeLeaf;

    oppositeLeaf.parent = parent2;
    node.parent = null;
    // parent.parent = null;
    // parent.left = null;
    // parent.right = null; // GC should work anyway

    this.refit(parent2); // i don't think we need rotation here

    return parent;
  }

  protected createLeafNode(object: L, box: FloatArray): Node<N, L> {
    return { box, object, parent: null } as Node<N, L>;
  }

  protected createInternalNode(parent: Node<N, L>, sibling: Node<N, L>, leaf: Node<N, L>): Node<N, L> {
    return { parent, left: sibling, right: leaf, box: new Float64Array(6) } as Node<N, L>;
  }

  // Branch and Bound
  protected findBestSibling(leafBox: FloatArray, leafArea: number): Node<N, L> {
    const queue: QueueElement<N, L>[] = [{ node: this.root, inheritedCost: 0 }]; // we can avoid to recreate every time?

    let bestNode = null;
    let bestCost = Infinity;
    let item: QueueElement<N, L>;
    let node: Node<N, L>;
    let inheritedCost: number;

    while ((item = queue.pop())) {
      node = item.node;
      inheritedCost = item.inheritedCost;

      const directCost = areaFromTwoBoxes(leafBox, node.box);
      const currentCost = directCost + inheritedCost;

      if (bestCost > currentCost) {
        bestNode = node;
        bestCost = currentCost;
      }

      if (node.object === undefined) {
        // is not leaf
        inheritedCost += directCost - node.area;
        const lowCost = leafArea + inheritedCost;

        if (bestCost > lowCost) {
          queue.push({ node: node.left, inheritedCost }); // use a sortedQueue instead?
          queue.push({ node: node.right, inheritedCost });
        }
      }
    }

    return bestNode;
  }

  protected refit(node: Node<N, L>): void {
    do {
      const left = node.left;
      const right = node.right;
      const nodeBox = node.box;

      // FIX if area doesn't change, stop iterating

      unionBox(left.box, right.box, nodeBox, this._margin);
      node.area = areaBox(nodeBox);

      node = node.parent;
    } while (node);
  }

  protected refitAndRotate(node: Node<N, L>): void {
    do {
      const left = node.left;
      const right = node.right;
      const nodeBox = node.box;

      unionBox(left.box, right.box, nodeBox, this._margin);
      node.area = areaBox(nodeBox);

      this.rotate(node);

      node = node.parent;
    } while (node);
  }

  protected rotate(node: Node<N, L>): void {
    const L = node.left;
    const R = node.right;

    let nodeSwap1: Node<N, L>;
    let nodeSwap2: Node<N, L>;
    let bestCost = 0; // todo can we use rotatationBestCostTolerance?

    if (R.object === undefined) {
      //is not leaf
      const RL = R.left;
      const RR = R.right;

      const diffRR = R.area - areaFromTwoBoxes(L.box, RL.box);
      const diffRL = R.area - areaFromTwoBoxes(L.box, RR.box);

      if (diffRR > diffRL) {
        if (diffRR > 0) {
          nodeSwap1 = L;
          nodeSwap2 = RR;
          bestCost = diffRR;
        }
      } else if (diffRL > 0) {
        nodeSwap1 = L;
        nodeSwap2 = RL;
        bestCost = diffRL;
      }
    }

    if (L.object === undefined) {
      //is not leaf
      const LL = L.left;
      const LR = L.right;

      const diffLR = L.area - areaFromTwoBoxes(R.box, LL.box);
      const diffLL = L.area - areaFromTwoBoxes(R.box, LR.box);

      if (diffLR > diffLL) {
        if (diffLR > bestCost) {
          nodeSwap1 = R;
          nodeSwap2 = LR;
        }
      } else if (diffLL > bestCost) {
        nodeSwap1 = R;
        nodeSwap2 = LL;
      }
    }

    if (nodeSwap1 !== undefined) {
      this.swap(nodeSwap1, nodeSwap2);
    }
  }

  // this works only for rotation
  protected swap(A: Node<N, L>, B: Node<N, L>): void {
    const parentA = A.parent;
    const parentB = B.parent;
    const parentBox = parentB.box;

    if (parentA.left === A) parentA.left = B;
    else parentA.right = B;

    if (parentB.left === B) parentB.left = A;
    else parentB.right = A;

    A.parent = parentB;
    B.parent = parentA;

    unionBox(parentB.left.box, parentB.right.box, parentBox, this._margin);
    parentB.area = areaBox(parentBox);
  }

}
