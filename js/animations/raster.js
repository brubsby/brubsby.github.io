import { Rasterizer, Mat4, Vec3 } from '../ascii_rasterizer.js';
import { tooltip, ObjectSampler } from '../utils.js';
import { Generator, Wythoff } from '../polyhedra.js';

let rasterizer = null;
let angleX = 0;
let angleY = 0;
let angleZ = 0;
let shape_sampler = null;

const SHAPES = {};
const groups = [
  { name: "Tetrahedral", p: 3, q: 3 },
  { name: "Octahedral", p: 4, q: 3 },
  { name: "Icosahedral", p: 5, q: 3 }
];

const patterns = [
  { suffix: "Parent", gen: (p, q) => `${q} | ${p} 2` },
  { suffix: "Truncated", gen: (p, q) => `2 ${q} | ${p}` },
  { suffix: "Rectified", gen: (p, q) => `2 | ${p} ${q}` },
  { suffix: "Bitruncated", gen: (p, q) => `2 ${p} | ${q}` },
  { suffix: "Birectified", gen: (p, q) => `${p} | ${q} 2` },
  { suffix: "Cantellated", gen: (p, q) => `${p} ${q} | 2` },
  { suffix: "Omnitruncated", gen: (p, q) => `${p} ${q} 2 |` },
  { suffix: "Snub", gen: (p, q) => `| ${p} ${q} 2` }
];

const seenSymbols = new Set();

groups.forEach(group => {
  patterns.forEach(pat => {
    const symbol = pat.gen(group.p, group.q);
    // Normalize symbol for deduplication check (mostly for Tetrahedral self-duality)
    // We treat "3 | 3 2" and "3 | 2 3" as potentially distinct in string but geometrically similar?
    // Actually, user's formulas are specific.
    // For Tetra (3,3):
    // Parent: 3 | 3 2
    // Birectified: 3 | 3 2
    // These strings are identical.
    
    if (!seenSymbols.has(symbol)) {
      seenSymbols.add(symbol);
      SHAPES[`${group.name} ${pat.suffix}`] = symbol;
    }
  });
});

export default (this_animation) => {
  if (!rasterizer || rasterizer.width !== window.columns || rasterizer.height !== window.rows) {
    rasterizer = new Rasterizer(window.columns, window.rows);
  }

  rasterizer.backgroundChar = '.';
  rasterizer.clear();

  const shapeKeys = Object.keys(SHAPES);
  window.sub_animation_size = shapeKeys.length;

  if (!shape_sampler) {
    shape_sampler = new ObjectSampler();
    shapeKeys.forEach((key, i) => shape_sampler.put(i, 1));
  }

  if (isNaN(window.sub_animation_index)) {
    window.sub_animation_index = shape_sampler.sample();
  }

  const shapeName = shapeKeys[window.sub_animation_index % shapeKeys.length];
  const symbol = SHAPES[shapeName];
  const geoType = Wythoff.toTriangles(Generator.fromString(symbol));

  tooltip(`raster<br>${shapeName}<br>${symbol}`);
  
  // Create rotation matrices
  const rotX = Mat4.rotationX(angleX);
  const rotY = Mat4.rotationY(angleY);
  const rotZ = Mat4.rotationZ(angleZ);

  // Transform vertices
  const transformedVertices = geoType.vertices.map(v => {
    let tv = rotX.multiplyVec3(v);
    tv = rotY.multiplyVec3(tv);
    tv = rotZ.multiplyVec3(tv);
    return tv;
  });

  // Draw faces
  geoType.faces.forEach(face => {
    const p1 = transformedVertices[face[0]];
    const p2 = transformedVertices[face[1]];
    const p3 = transformedVertices[face[2]];

    // Calculate normal for lighting and culling
    const v1 = p2.sub(p1);
    const v2 = p3.sub(p1);
    const normal = v1.cross(v2).normalize();

    rasterizer.drawTriangle(p1, p2, p3, normal);
  });

  // Update DOM
  window.canvas.text(rasterizer.renderToString());

  // Update angles
  angleX += 0.03;
  angleY += 0.02;
  angleZ += 0.01;

  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
