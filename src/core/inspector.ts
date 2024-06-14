import { BVH, Node } from "./BVH";
import { areaBox } from "./boxUtils";

// https://github.com/gkjohnson/three-mesh-bvh/blob/master/src/core/Constants.js#L15
export const TRIANGLE_INTERSECT_COST = 1.25;
export const TRAVERSAL_COST = 1;

export class BVHInspector {
    public totalNodes = 0;
    public totalLeafNodes = 0;
    public surfaceScore = 0;
    public minDepth = Infinity;
    public maxDepth = 0;
    public memory = 0; // TODO
    protected _bvh: BVH<{}, {}>;

    constructor(bvh: BVH<{}, {}>) {
        this._bvh = bvh;
        this.update();
    }

    public update(): void {
        this.reset();
        this.getNodeData(this._bvh.root, 0);
    }

    protected reset(): void {
        this.totalNodes = 0;
        this.totalLeafNodes = 0;
        this.surfaceScore = 0;
        this.minDepth = Infinity;
        this.maxDepth = 0;
        this.memory = 0;
    }

    protected getNodeData(node: Node<{}, {}>, depth: number): void {
        this.totalNodes++;

        const surfaceArea = areaBox(node.box);

        if (node.object) {
            this.totalLeafNodes++;

            if (depth < this.minDepth) this.minDepth = depth;
            if (depth > this.maxDepth) this.maxDepth = depth;

            this.surfaceScore += surfaceArea * TRIANGLE_INTERSECT_COST; // * count;

            return;
        }

        this.surfaceScore += surfaceArea * TRAVERSAL_COST;

        depth++;

        this.getNodeData(node.left, depth);
        this.getNodeData(node.right, depth);
    }
}