/**
 * Simple ASCII 3D Rasterizer
 */

import { density_chars, Vec3, Mat4 } from './utils.js';


export class Rasterizer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.backgroundChar = ' ';
    this.frameBuffer = new Array(width * height).fill(this.backgroundChar);
    this.zBuffer = new Float32Array(width * height).fill(0);
    this.chars = " " + density_chars;
    this.lightDir = new Vec3(-0.5, 0.75, -1.25).normalize();
  }

  clear() {
    this.frameBuffer.fill(this.backgroundChar);
    this.zBuffer.fill(0);
  }

  drawTriangle(p1, p2, p3, normal) {
    // Basic backface culling - DISABLED for double-sided rendering
    // if (normal.z > 0) return;

    // Lighting - add a bit of ambient light so silhouettes are visible
    // For double-sided rendering, if we are seeing the backface (normal.z > 0), 
    // we flip the normal for lighting purposes.
    let lightingNormal = normal;
    if (normal.z > 0) {
      lightingNormal = normal.mul(-1);
    }

    let luminance = lightingNormal.dot(this.lightDir);
    if (luminance < 0.01) luminance = 0.01;

    let charIdx = Math.floor(luminance * (this.chars.length - 1));
    let char = this.chars[charIdx];
    
    // Use blank space instead of the background character for dark areas
    if (char === this.backgroundChar) {
      char = ' ';
    }

    // Projection
    const aspect = 0.5;
    const effectiveMinDim = Math.min(this.width, this.height / (aspect));
    const K1 = effectiveMinDim * 1.5; // Scaling factor
    const K2 = 5; // Distance factor
    
    const project = (p) => {
      const ooz = 1 / (p.z + K2); // "One over Z" 
      const xp = Math.floor(this.width / 2 + K1 * p.x * ooz);
      const yp = Math.floor(this.height / 2 - K1 * (p.y * 0.5) * ooz); // Adjust for ASCII aspect ratio
      return { x: xp, y: yp, ooz: ooz };
    };

    const t1 = project(p1);
    const t2 = project(p2);
    const t3 = project(p3);

    // Simple bounding box rasterization
    let minX = Math.max(0, Math.floor(Math.min(t1.x, t2.x, t3.x)));
    let maxX = Math.min(this.width - 1, Math.ceil(Math.max(t1.x, t2.x, t3.x)));
    let minY = Math.max(0, Math.floor(Math.min(t1.y, t2.y, t3.y)));
    let maxY = Math.min(this.height - 1, Math.ceil(Math.max(t1.y, t2.y, t3.y)));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const bary = this.getBarycentric(x, y, t1, t2, t3);
        if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
          const ooz = t1.ooz * bary.u + t2.ooz * bary.v + t3.ooz * bary.w;
          const idx = y * this.width + x;
          if (ooz > this.zBuffer[idx]) {
            this.zBuffer[idx] = ooz;
            this.frameBuffer[idx] = char;
          }
        }
      }
    }
  }

  getBarycentric(px, py, p1, p2, p3) {
    const v0 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v1 = { x: p3.x - p1.x, y: p3.y - p1.y };
    const v2 = { x: px - p1.x, y: py - p1.y };
    const d00 = v0.x * v0.x + v0.y * v0.y;
    const d01 = v0.x * v1.x + v0.y * v1.y;
    const d11 = v1.x * v1.x + v1.y * v1.y;
    const d20 = v2.x * v0.x + v2.y * v0.y;
    const d21 = v2.x * v1.x + v2.y * v1.y;
    const denom = d00 * d11 - d01 * d01;
    if (Math.abs(denom) < 0.000001) return { u: -1, v: -1, w: -1 };
    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1.0 - v - w;
    return { u, v, w };
  }

  renderToString() {
    let output = "";
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        output += this.frameBuffer[y * this.width + x];
      }
      output += "\n";
    }
    return output;
  }
};
