import { Vec3 } from './utils.js';

// Ensure Vec3 has all necessary methods
if (!Vec3.prototype.add) Vec3.prototype.add = function(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); };
if (!Vec3.prototype.mul) Vec3.prototype.mul = function(s) { return new Vec3(this.x * s, this.y * s, this.z * s); };
if (!Vec3.prototype.div) Vec3.prototype.div = function(s) { return new Vec3(this.x / s, this.y / s, this.z / s); };

export class Wythoff {
    static toTriangles(poly) {
        const triFaces = [];
        const vertices = [...poly.vertices];
        for (const face of poly.faces) {
            if (face.length < 3) continue;
            // Calculate face centroid
            let center = new Vec3(0, 0, 0);
            for (const idx of face) {
                center = center.add(vertices[idx]);
            }
            center = center.div(face.length);
            const centerIdx = vertices.length;
            vertices.push(center);

            // Triangle fan from centroid
            for (let i = 0; i < face.length; i++) {
                triFaces.push([centerIdx, face[i], face[(i + 1) % face.length]]);
            }
        }
        return { vertices: vertices, faces: triFaces };
    }
}

export class Generator {
    static fromString(symbol) {
        const parts = symbol.trim().split(/\s+/);
        function parseNum(s) {
            if (s.includes('/')) {
                const [a, b] = s.split('/').map(Number);
                return a / b;
            }
            return Number(s);
        }
        const pipeIndex = parts.indexOf('|');
        const nums = parts.filter(x => x !== '|').map(parseNum);
        let p, q, r, type;
        if (pipeIndex === 0) { type = 0; p = nums[0]; q = nums[1]; r = nums[2]; }
        else if (pipeIndex === 1) { type = 1; p = nums[0]; q = nums[1]; r = nums[2]; }
        else if (pipeIndex === 2) { type = 2; p = nums[0]; q = nums[1]; r = nums[2]; }
        else if (pipeIndex === 3) { type = 3; p = nums[0]; q = nums[1]; r = nums[2]; }
        else { type = 3; p = nums[0]; q = nums[1]; r = nums[2]; } // Default
        return Generator.generateWythoff(p, q, r, type);
    }

    static generateWythoff(p, q, r, type) {
        const schwarz = new Schwarz(p, q, r);
        let active = [false, false, false];
        let snub = false;
        switch (type) {
            case 0: active = [true, true, true]; snub = true; break; // | p q r
            case 1: active = [true, false, false]; break; // p | q r
            case 2: active = [true, true, false]; break; // p q | r
            case 3: active = [true, true, true]; break; // p q r |
        }

        let bary;
        if (snub) {
            bary = schwarz.snubBary;
            // Normalize snub barycentric coordinates to project to unit sphere
            const s = schwarz.points[0].mul(bary[0])
                .add(schwarz.points[1].mul(bary[1]))
                .add(schwarz.points[2].mul(bary[2]));
            const len = s.length();
            bary = [bary[0] / len, bary[1] / len, bary[2] / len];
        } else if (type === 1) {
            bary = [1, 0, 0];
        } else if (type === 2) {
            bary = schwarz.tri2bary([1, 1, 0]);
        } else {
            bary = schwarz.tri2bary([1, 1, 1]);
        }

        const vertices = [];
        const vMap = new Map();
        function getVIndex(v) {
            const precision = 1000000;
            const key = Math.round(v.x * precision) + "," + Math.round(v.y * precision) + "," + Math.round(v.z * precision);
            if (vMap.has(key)) return vMap.get(key);
            const idx = vertices.length;
            vertices.push(v);
            vMap.set(key, idx);
            return idx;
        }

        const faces = [];
        const regions = schwarz.regions;
        const regionPoints = regions.map(reg => {
            if (snub && reg.p === 1) return null; // Only parity 0 regions have vertices in Snub
            const v0 = schwarz.points[reg.v[0]];
            const v1 = schwarz.points[reg.v[1]];
            const v2 = schwarz.points[reg.v[2]];
            return v0.mul(bary[0]).add(v1.mul(bary[1])).add(v2.mul(bary[2]));
        });

        for (let t = 0; t < 3; t++) {
            const n = schwarz.angles[t];
            const onM1 = Math.abs(bary[(t + 1) % 3]) < 1e-6;
            const onM2 = Math.abs(bary[(t + 2) % 3]) < 1e-6;
            
            let orbitSize;
            if (onM1 && onM2) orbitSize = 1;
            else if (onM1 || onM2) orbitSize = n;
            else orbitSize = 2 * n;

            if (snub) orbitSize /= 2;
            // if (orbitSize <= 2.001) continue; // Incorrectly filters star polygons

            const faceTypeRegions = schwarz.faceRegions[t];
            for (let i = 0; i < faceTypeRegions.length; i++) {
                const fRegs = faceTypeRegions[i];
                if (!fRegs) continue;
                
                const inc = snub ? 2 : 1;
                const pIndices = [];
                let start = 0;
                if (snub && !regionPoints[fRegs[0]]) start = 1;
                for (let j = start; j < fRegs.length; j += inc) {
                    const p = regionPoints[fRegs[j]];
                    if (!p) continue;
                    const idx = getVIndex(p);
                    if (pIndices.length === 0 || idx !== pIndices[pIndices.length - 1]) {
                        pIndices.push(idx);
                    }
                }
                if (pIndices.length > 1 && pIndices[0] === pIndices[pIndices.length - 1]) {
                    pIndices.pop();
                }
                
                if (pIndices.length < 3) continue;

                const p0 = vertices[pIndices[0]];
                const p1 = vertices[pIndices[1]];
                const p2 = vertices[pIndices[2]];
                const faceCenter = schwarz.points[i];
                const normal = p1.sub(p0).cross(p2.sub(p0));
                
                if (normal.dot(faceCenter) < 0) {
                    pIndices.reverse();
                }
                faces.push(pIndices);
            }
        }
        
        if (snub) {
            for (let i = 0; i < regions.length; i++) {
                if (regions[i].p === 1) {
                    const adj = schwarz.adjacent[i];
                    const p0 = regionPoints[adj[0]], p1 = regionPoints[adj[1]], p2 = regionPoints[adj[2]];
                    // In Snub, adjacents are parity 0, so they have points
                    if (!p0 || !p1 || !p2) continue;
                    const v0 = getVIndex(p0), v1 = getVIndex(p1), v2 = getVIndex(p2);
                    if (v0 !== v1 && v1 !== v2 && v2 !== v0) {
                        const n = p1.sub(p0).cross(p2.sub(p0));
                        if (n.dot(p0) >= 0) faces.push([v0, v1, v2]);
                        else faces.push([v0, v2, v1]);
                    }
                }
            }
        }

        return { vertices, faces };
    }
}

class Schwarz {
    constructor(p, q, r) {
        this.angles = [p, q, r];
        const A = Math.PI / p, B = Math.PI / q, C = Math.PI / r;
        const ca = (Math.cos(A) + Math.cos(B) * Math.cos(C)) / (Math.sin(B) * Math.sin(C));
        const cb = (Math.cos(B) + Math.cos(C) * Math.cos(A)) / (Math.sin(C) * Math.sin(A));
        const cc = (Math.cos(C) + Math.cos(A) * Math.cos(B)) / (Math.sin(A) * Math.sin(B));
        const a = Math.acos(ca), b = Math.acos(cb), c = Math.acos(cc);

        const v0 = new Vec3(0, 0, 1);
        const v1 = new Vec3(0, Math.sin(c), Math.cos(c));
        const ry = (Math.cos(a) - v1.z * Math.cos(b)) / v1.y;
        const rz = Math.cos(b);
        const t = 1 - ry * ry - rz * rz;
        const v2 = new Vec3(Math.sqrt(Math.max(0, t)), ry, rz);
        
        this.points = [v0, v1, v2];
        this.regions = [{ v: [0, 1, 2], p: 0 }];
        this.adjacent = [];
        this.faceRegions = [[], [], []];

        this.B = [
            this.getBary(v0, v1, v2, this.reflect(v1, v2, v0)),
            this.getBary(v0, v1, v2, this.reflect(v2, v0, v1)),
            this.getBary(v0, v1, v2, this.reflect(v0, v1, v2))
        ];

        const regionMap = new Map();
        function regKey(v, p) { return v.join(",") + "," + p; }
        regionMap.set(regKey([0, 1, 2], 0), 0);

        for (let i = 0; i < this.regions.length; i++) {
            if (this.regions.length > 2000) break;
            const reg = this.regions[i];
            const v = reg.v.map(idx => this.points[idx]);
            this.adjacent[i] = [];

            for (let m = 0; m < 3; m++) {
                const rvIdx = this.getPoint(this.applyBary(this.B[m], v[0], v[1], v[2]));
                const nextV = [reg.v[0], reg.v[1], reg.v[2]];
                nextV[m] = rvIdx;
                const nextP = 1 - reg.p;
                const key = regKey(nextV, nextP);
                if (regionMap.has(key)) {
                    this.adjacent[i][m] = regionMap.get(key);
                } else {
                    const nextIdx = this.regions.length;
                    this.regions.push({ v: nextV, p: nextP });
                    regionMap.set(key, nextIdx);
                    this.adjacent[i][m] = nextIdx;
                }
            }
            for (let t = 0; t < 3; t++) {
                if (!this.faceRegions[t][reg.v[t]]) this.faceRegions[t][reg.v[t]] = [];
                this.faceRegions[t][reg.v[t]].push(i);
            }
        }
        
        for (let t = 0; t < 3; t++) {
            const m1 = (t + 1) % 3, m2 = (t + 2) % 3;
            for (let i = 0; i < this.faceRegions[t].length; i++) {
                const fRegs = this.faceRegions[t][i];
                if (!fRegs || fRegs.length < 2) continue;
                const sorted = [fRegs[0]];
                const seen = new Set([fRegs[0]]);
                while (sorted.length < fRegs.length) {
                    const curr = sorted[sorted.length - 1];
                    let found = false;
                    for (const m of [m1, m2]) {
                        const next = this.adjacent[curr][m];
                        if (fRegs.includes(next) && !seen.has(next)) {
                            sorted.push(next);
                            seen.add(next);
                            found = true;
                            break;
                        }
                    }
                    if (!found) break;
                }
                this.faceRegions[t][i] = sorted;
            }
        }
        this.snubBary = this.calculateSnubBary();
    }

    getPoint(p) {
        const eps = 1e-4;
        for (let i = 0; i < this.points.length; i++) {
            if (this.points[i].sub(p).length() < eps) return i;
        }
        this.points.push(p);
        return this.points.length - 1;
    }

    getBary(p1, p2, p3, s) {
        const P = p2.cross(p3), Q = p3.cross(p1), R = p1.cross(p2);
        const k = p1.dot(P);
        return [s.dot(P) / k, s.dot(Q) / k, s.dot(R) / k];
    }

    applyBary(b, p1, p2, p3) {
        return p1.mul(b[0]).add(p2.mul(b[1])).add(p3.mul(b[2]));
    }

    reflect(p1, p2, s) {
        const n = p1.cross(p2).normalize();
        return s.sub(n.mul(2 * s.dot(n)));
    }

    tri2bary(h) {
        const p = this.points[0], q = this.points[1], r = this.points[2];
        const P = q.cross(r), Q = r.cross(p), R = p.cross(q);
        const bary = [P.length() * h[0], Q.length() * h[1], R.length() * h[2]];
        const s = p.mul(bary[0]).add(q.mul(bary[1])).add(r.mul(bary[2]));
        const len = s.length();
        return [bary[0] / len, bary[1] / len, bary[2] / len];
    }

    calculateSnubBary() {
        const p = this.points[0], q = this.points[1], r = this.points[2];
        const seeds = [
            [0.33, 0.33],
            [0.1, 0.1], [0.1, 0.8], [0.8, 0.1],
            [0.5, 0.2], [0.2, 0.5],
            [0.4, 0.4], [0.2, 0.2], [0.6, 0.2]
        ];

        function f(a, b) {
            const s = p.mul(a).add(q.mul(b)).add(r.mul(1 - a - b)).normalize();
            const n01 = p.cross(q).normalize(), n12 = q.cross(r).normalize(), n20 = r.cross(p).normalize();
            const s0 = s.sub(n01.mul(2 * s.dot(n01))), s1 = s.sub(n12.mul(2 * s.dot(n12))), s2 = s.sub(n20.mul(2 * s.dot(n20)));
            return [s0.sub(s1).length() - s1.sub(s2).length(), s1.sub(s2).length() - s2.sub(s0).length()];
        }

        const solutions = [];

        for (const seed of seeds) {
            let a = seed[0], b = seed[1];
            let converged = false;
            for (let i = 0; i < 20; i++) {
                const eps = 1e-6;
                const res = f(a, b);
                if (Math.abs(res[0]) < 1e-9 && Math.abs(res[1]) < 1e-9) {
                    converged = true;
                    break;
                }
                const resA = f(a + eps, b), resB = f(a, b + eps);
                const da1 = (resA[0] - res[0]) / eps, da2 = (resA[1] - res[1]) / eps;
                const db1 = (resB[0] - res[0]) / eps, db2 = (resB[1] - res[1]) / eps;
                const det = da1 * db2 - da2 * db1;
                if (Math.abs(det) < 1e-12) break;
                a -= (res[0] * db2 - res[1] * db1) / det;
                b -= (da1 * res[1] - da2 * res[0]) / det;
            }
            
            const c = 1 - a - b;
            // Check for non-degenerate solution (all barycentric coords non-zero)
            if (converged && Math.abs(a) > 1e-4 && Math.abs(b) > 1e-4 && Math.abs(c) > 1e-4) {
                // Check if this solution is already found
                let found = false;
                for (const sol of solutions) {
                    if (Math.abs(sol[0] - a) < 1e-4 && Math.abs(sol[1] - b) < 1e-4) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    solutions.push([a, b, c]);
                }
            }
        }

        if (solutions.length > 0) {
            // Find solution with maximum edge length for snub triangle
            // This is a heuristic to prefer "Great" / spiky variants when multiple solutions exist
            let bestSol = solutions[0];
            let maxEdgeLen = -1;

            for (const sol of solutions) {
                const s = p.mul(sol[0]).add(q.mul(sol[1])).add(r.mul(sol[2])).normalize();
                // Calculate reflection points
                const n01 = p.cross(q).normalize(), n12 = q.cross(r).normalize();
                const s0 = s.sub(n01.mul(2 * s.dot(n01)));
                const s1 = s.sub(n12.mul(2 * s.dot(n12)));
                const edgeLen = s0.sub(s1).length();
                
                if (edgeLen > maxEdgeLen) {
                    maxEdgeLen = edgeLen;
                    bestSol = sol;
                }
            }
            return bestSol;
        }

        // Fallback to default if no good solution found
        return [0.33, 0.33, 0.34];
    }
}