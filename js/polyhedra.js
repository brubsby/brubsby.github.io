import { Vec3 } from './ascii_rasterizer.js';

// Add missing methods to Vec3 if they don't exist
if (!Vec3.prototype.add) {
    Vec3.prototype.add = function(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); };
}
if (!Vec3.prototype.mul) {
    Vec3.prototype.mul = function(s) { return new Vec3(this.x * s, this.y * s, this.z * s); };
}

export class Wythoff {
    static toTriangles(poly) {
        const newFaces = [];
        for (const face of poly.faces) {
            for (let i = 1; i < face.length - 1; i++) {
                newFaces.push([face[0], face[i], face[i + 1]]);
            }
        }
        return { vertices: poly.vertices, faces: newFaces };
    }
}

export class Generator {
    static tetrahedron() {
        return Generator.generateWythoff(3, 3, 2, [true, false, false]);
    }

    static cube() {
        return Generator.generateWythoff(4, 3, 2, [true, false, false]);
    }

    static octahedron() {
        return Generator.generateWythoff(4, 3, 2, [false, false, true]);
    }

    static dodecahedron() {
        return Generator.generateWythoff(5, 3, 2, [true, false, false]);
    }

    static icosahedron() {
        return Generator.generateWythoff(5, 3, 2, [false, false, true]);
    }

    static truncatedTetrahedron() {
        return Generator.generateWythoff(3, 3, 2, [true, true, false]);
    }

    static truncatedCube() {
        return Generator.generateWythoff(4, 3, 2, [true, true, false]);
    }

    static truncatedOctahedron() {
        return Generator.generateWythoff(4, 3, 2, [false, true, true]);
    }

    static truncatedDodecahedron() {
        return Generator.generateWythoff(5, 3, 2, [true, true, false]);
    }

    static truncatedIcosahedron() {
        return Generator.generateWythoff(5, 3, 2, [false, true, true]);
    }

    static cuboctahedron() {
        return Generator.generateWythoff(4, 3, 2, [false, true, false]);
    }

    static icosidodecahedron() {
        return Generator.generateWythoff(5, 3, 2, [false, true, false]);
    }

    static rhombicuboctahedron() {
        return Generator.generateWythoff(4, 3, 2, [true, false, true]);
    }

    static rhombicosidodecahedron() {
        return Generator.generateWythoff(5, 3, 2, [true, false, true]);
    }

    static truncatedCuboctahedron() {
        return Generator.generateWythoff(4, 3, 2, [true, true, true]);
    }

    static truncatedIcosidodecahedron() {
        return Generator.generateWythoff(5, 3, 2, [true, true, true]);
    }

    static generateWythoff(p, q, r, active) {
        const cp = Math.cos(Math.PI / p);
        const cq = Math.cos(Math.PI / q);
        const cr = Math.cos(Math.PI / r);

        const n1 = new Vec3(1, 0, 0);
        const n2 = new Vec3(-cp, Math.sin(Math.PI / p), 0);
        
        const n3x = -cr;
        const n3y = (-cq + cr * cp) / Math.sin(Math.PI / p);
        const n3z_sq = 1 - n3x * n3x - n3y * n3y;
        const n3z = Math.sqrt(Math.max(0, n3z_sq));
        const n3 = new Vec3(n3x, n3y, n3z);

        const mirrors = [n1, n2, n3];

        const h = active.map(a => a ? -1 : 0);
        const Px = h[0];
        const Py = (h[1] - n2.x * Px) / n2.y;
        const Pz = n3.z !== 0 ? (h[2] - n3.x * Px - n3.y * Py) / n3.z : 0;
        let P = new Vec3(Px, Py, Pz).normalize();

        const vertices = [];
        const vMap = new Map();

        function getVIndex(v) {
            const precision = 100000;
            const key = Math.round(v.x * precision) + "," + 
                        Math.round(v.y * precision) + "," + 
                        Math.round(v.z * precision);
            if (vMap.has(key)) return vMap.get(key);
            const idx = vertices.length;
            vertices.push(v);
            vMap.set(key, idx);
            return idx;
        }

        getVIndex(P);
        let head = 0;
        while (head < vertices.length) {
            const v = vertices[head++];
            for (const n of mirrors) {
                const nv = v.reflect(n);
                getVIndex(nv);
            }
        }

        const reflections = vertices.map(v => mirrors.map(n => getVIndex(v.reflect(n))));

        const faces = [];
        const faceSet = new Set();
        const pairs = [[0, 1], [1, 2], [2, 0]];

        function orderFace(faceIndices) {
            let cx=0, cy=0, cz=0;
            for(const idx of faceIndices) {
                const v = vertices[idx];
                cx += v.x; cy += v.y; cz += v.z;
            }
            cx /= faceIndices.length; cy /= faceIndices.length; cz /= faceIndices.length;
            const center = new Vec3(cx, cy, cz);
            
            const v0 = vertices[faceIndices[0]].sub(center).normalize();
            const normal = center.normalize();
            const v1 = new Vec3(
                normal.y * v0.z - normal.z * v0.y,
                normal.z * v0.x - normal.x * v0.z,
                normal.x * v0.y - normal.y * v0.x
            ).normalize();
            
            const ordered = [...faceIndices].sort((a, b) => {
                const va = vertices[a].sub(center);
                const vb = vertices[b].sub(center);
                return Math.atan2(va.dot(v1), va.dot(v0)) - Math.atan2(vb.dot(v1), vb.dot(v0));
            });

            // Ensure CCW from outside
            const e1 = vertices[ordered[1]].sub(vertices[ordered[0]]);
            const e2 = vertices[ordered[2]].sub(vertices[ordered[0]]);
            const n = new Vec3(
                e1.y * e2.z - e1.z * e2.y,
                e1.z * e2.x - e1.x * e2.z,
                e1.x * e2.y - e1.y * e2.x
            );
            if (n.dot(vertices[ordered[0]]) < 0) {
                ordered.reverse();
            }
            return ordered;
        }

        for (const [m1, m2] of pairs) {
            const orbit = new Set([0]); // Start with P
            const queue = [0];
            let qHead = 0;
            while (qHead < queue.length) {
                const v = queue[qHead++];
                for (const m of [m1, m2]) {
                    const nv = reflections[v][m];
                    if (!orbit.has(nv)) {
                        orbit.add(nv);
                        queue.push(nv);
                    }
                }
            }
            
            if (orbit.size < 3) continue;

            const baseFace = Array.from(orbit);
            const faceQueue = [baseFace];
            const typeSeen = new Set();
            typeSeen.add([...baseFace].sort((a, b) => a - b).join(","));
            
            let fHead = 0;
            while(fHead < faceQueue.length) {
                const f = faceQueue[fHead++];
                const key = [...f].sort((a, b) => a - b).join(",");
                if (!faceSet.has(key)) {
                    faceSet.add(key);
                    faces.push(orderFace(f));
                }
                
                for (let m = 0; m < 3; m++) {
                    const rf = f.map(vIdx => reflections[vIdx][m]);
                    const rKey = [...rf].sort((a, b) => a - b).join(",");
                    if (!typeSeen.has(rKey)) {
                        typeSeen.add(rKey);
                        faceQueue.push(rf);
                    }
                }
            }
        }

        return { vertices, faces };
    }
}
