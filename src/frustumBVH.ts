import { Camera, Matrix4, Mesh, Object3D } from 'three';
import { Frustum } from './frustum';
import { BVH, FloatArray, Node } from './BVH';
import { updateBox } from './utils';
import { IncrementalBuilder } from './IncrementalBuilder';

export class FrustumBVH extends BVH<{}, Object3D> {
  protected _frustum = new Frustum();

  constructor(margin?: number, verbose?: boolean) {
    super(new IncrementalBuilder(margin), verbose);
    this.verbose = verbose;
  }

  public override insert(object: Mesh, box?: FloatArray): Node {  // TODO fix if don't use mesh
    if (box === undefined) {
      box = updateBox(object); // get bbox from Mesh
    }

    return super.insert(object, box);
  }

  public override move(node: Node): void {
    updateBox(node.object as Mesh, node.box); // TODO fix if don't use mesh

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
}

const _projScreenMatrix = new Matrix4();
