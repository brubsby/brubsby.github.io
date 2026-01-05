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
    static fromString(symbol) {
        const parts = symbol.trim().split(/\s+/);
        let p, q, r, type;
        
        // Find pipe index
        const pipeIndex = parts.indexOf('|');
        const nums = parts.filter(x => x !== '|').map(x => parseInt(x));
        
        if (pipeIndex === 0) { // | p q r (Snub)
            type = 0;
            p = nums[0]; q = nums[1]; r = nums[2];
        } else if (pipeIndex === 1) { // p | q r
            type = 1;
            p = nums[0]; q = nums[1]; r = nums[2];
        } else if (pipeIndex === 2) { // p q | r
            type = 2;
            p = nums[0]; q = nums[1]; r = nums[2];
        } else if (pipeIndex === 3 || pipeIndex === -1) { // p q r | (Omnitruncated) - assuming end if missing
             type = 3;
             p = nums[0]; q = nums[1]; r = nums[2];
        }

        return Generator.generateWythoff(p, q, r, type);
    }

    static generateWythoff(p, q, r, type) {
        let active;
        let snub = false;

        switch (type) {
            case 0: // | p q r (Snub)
                active = [true, true, true];
                snub = true;
                break;
            case 1: // p | q r (Regular)
                active = [false, false, true];
                break;
            case 2: // p q | r (Truncated)
                active = [true, false, true];
                break;
            case 3: // p q r | (Omnitruncated)
                active = [true, true, true];
                break;
            default:
                throw new Error("Invalid Wythoff type: " + type);
        }

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

        let faces = [];
        const faceSet = new Set();
        const pairs = [[0, 1], [1, 2], [2, 0]];

        function orderFace(faceIndices, verts = vertices) {
            let cx=0, cy=0, cz=0;
            for(const idx of faceIndices) {
                const v = verts[idx];
                cx += v.x; cy += v.y; cz += v.z;
            }
            cx /= faceIndices.length; cy /= faceIndices.length; cz /= faceIndices.length;
            const center = new Vec3(cx, cy, cz);
            
            const v0 = verts[faceIndices[0]].sub(center).normalize();
            const normal = center.normalize();
            const v1 = new Vec3(
                normal.y * v0.z - normal.z * v0.y,
                normal.z * v0.x - normal.x * v0.z,
                normal.x * v0.y - normal.y * v0.x
            ).normalize();
            
            const ordered = [...faceIndices].sort((a, b) => {
                const va = verts[a].sub(center);
                const vb = verts[b].sub(center);
                return Math.atan2(va.dot(v1), va.dot(v0)) - Math.atan2(vb.dot(v1), vb.dot(v0));
            });

            // Ensure CCW from outside
            const e1 = verts[ordered[1]].sub(verts[ordered[0]]);
            const e2 = verts[ordered[2]].sub(verts[ordered[0]]);
            const n = new Vec3(
                e1.y * e2.z - e1.z * e2.y,
                e1.z * e2.x - e1.x * e2.z,
                e1.x * e2.y - e1.y * e2.x
            );
            if (n.dot(verts[ordered[0]]) < 0) {
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

        if (snub) {
            // Calculate parity of vertices
            const parity = new Int8Array(vertices.length).fill(-1);
            const q = [0];
            parity[0] = 0;
            let qHead = 0;
            let isBipartite = true;
            
            while(qHead < q.length) {
                const u = q[qHead++];
                const p = parity[u];
                for (const neighbor of reflections[u]) {
                    if (parity[neighbor] === -1) {
                        parity[neighbor] = 1 - p;
                        q.push(neighbor);
                    } else if (parity[neighbor] === p) {
                        isBipartite = false;
                    }
                }
            }

            if (!isBipartite) {
                console.warn("Cannot generate snub form: Parent polyhedron is not bipartite (contains odd cycles). Returning original form.");
                return { vertices, faces };
            }

            // Build adjacency of original mesh to find neighbors of removed vertices
            const adj = new Array(vertices.length).fill().map(() => new Set());
            for (const face of faces) {
                for (let i = 0; i < face.length; i++) {
                    const a = face[i];
                    const b = face[(i + 1) % face.length];
                    adj[a].add(b);
                    adj[b].add(a);
                }
            }

            const newVertices = [];
            const oldToNew = new Int32Array(vertices.length).fill(-1);
            
            // Keep even vertices
            for (let i = 0; i < vertices.length; i++) {
                if (parity[i] === 0) {
                    oldToNew[i] = newVertices.length;
                    newVertices.push(vertices[i]);
                }
            }

            const newFaces = [];
            
            // Transform existing faces
            for (const face of faces) {
                const newFace = [];
                for (const idx of face) {
                    if (parity[idx] === 0) {
                        newFace.push(oldToNew[idx]);
                    }
                }
                if (newFace.length >= 3) {
                    newFaces.push(newFace);
                }
            }

            // Create new faces from gaps (odd vertices)
            for (let i = 0; i < vertices.length; i++) {
                if (parity[i] === 1) {
                    const neighbors = Array.from(adj[i]);
                    // Neighbors of an odd vertex must be even (in bipartite graph)
                    const newFace = neighbors.map(idx => oldToNew[idx]);
                    // We must order them to ensure correct face normal
                    if (newFace.length >= 3) {
                        newFaces.push(orderFace(newFace, newVertices));
                    }
                }
            }

            return { vertices: newVertices, faces: newFaces };
        }

        return { vertices, faces };
    }
}
