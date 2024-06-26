import { BufferAttribute, LineBasicMaterial, LineSegments } from "three";
import { SceneBVH } from "./sceneBVH";

const indices = new Uint8Array([
    0, 4, 1, 5, 2, 6, 3, 7, // x axis
    0, 2, 1, 3, 4, 6, 5, 7, // y axis
    0, 1, 2, 3, 4, 5, 6, 7  // z axis
]);

/** https://github.com/gkjohnson/three-mesh-bvh/blob/master/src/objects/MeshBVHHelper.js */
export class SceneBVHHelper extends LineSegments {
    public depth: number;
    public displayParents: boolean;
    public sceneBVH: SceneBVH;

    constructor(sceneBVH: SceneBVH, depth = 10, displayParents = true) {
        super(undefined, new LineBasicMaterial({
            color: 0x00FF88,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
        }));

        this.sceneBVH = sceneBVH;
        this.depth = depth;
        this.displayParents = displayParents;

        this.update();
    }

    public update(): void {
        const geometry = this.geometry;
        const nodesCount = this.countNodes();
        const useSameBuffer = nodesCount === geometry.index?.count;
        let positionArray: Float32Array;
        let indexArray: Uint16Array | Uint32Array;

        if (useSameBuffer) {
            positionArray = geometry.getAttribute("position").array as Float32Array;
            indexArray = geometry.index.array as Uint32Array; // use right type uIntArray
        } else {
            positionArray = new Float32Array(8 * 3 * nodesCount);
            indexArray = positionArray.length > 65535 ? new Uint32Array(indices.length * nodesCount) : new Uint16Array(indices.length * nodesCount);
        }

        this.populatePositions(positionArray);
        this.populateIndexes(indexArray);

        if (useSameBuffer) {
            geometry.getAttribute("position").needsUpdate = true;
            geometry.index.needsUpdate = true;
        } else {
            geometry.setIndex(new BufferAttribute(indexArray, 1, false));
            geometry.setAttribute("position", new BufferAttribute(positionArray, 3, false));
        }
    }

    protected countNodes(): number {
        const displayParents = this.displayParents;
        const maxDepth = this.depth;
        let count = 0;

        this.sceneBVH.bvh.traverse((node, depth) => {
            if (depth >= maxDepth || node.object) {
                count++;
                return true;
            } else if (displayParents) {
                count++;
            }
        });

        return count;
    }

    protected populatePositions(array: Float32Array): void { // TODO use generic floatArray
        const maxDepth = this.depth - 1;
        const displayParents = this.displayParents;
        const bvh = this.sceneBVH.bvh;
        let posIndex = 0;

        bvh.traverse((node, depth) => {
            const terminate = depth >= maxDepth || node.object !== undefined;

            if (terminate || displayParents) {
                const box = node.box;

                for (let x = -1; x <= 1; x += 2) {
                    const xVal = x < 0 ? box[0] : box[1];

                    for (let y = -1; y <= 1; y += 2) {
                        const yVal = y < 0 ? box[2] : box[3];

                        for (let z = -1; z <= 1; z += 2) {
                            const zVal = z < 0 ? box[4] : box[5];
                            array[posIndex] = xVal;
                            array[posIndex + 1] = yVal;
                            array[posIndex + 2] = zVal;

                            posIndex += 3;
                        }
                    }
                }

                return terminate;
            }
        });
    }

    protected populateIndexes(array: Uint16Array | Uint32Array): void { // create custom type
        const indexLength = indices.length;
        const nodesCount = array.length;

        for (let i = 0; i < nodesCount; i++) {
            const posOffset = i * 8;
            const indexOffset = i * indexLength;
            for (let j = 0; j < indexLength; j++) {
                array[indexOffset + j] = posOffset + indices[j];
            }
        }
    }
}
