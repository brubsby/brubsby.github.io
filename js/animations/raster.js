import { Rasterizer } from '../ascii_rasterizer.js';
import { tooltip, ObjectSampler, Mat4, Vec3 } from '../utils.js';
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
      SHAPES[`${pat.suffix} ${group.name}`] = symbol;
    }
  });
});

const star_polyhedra = {
  "Octahemioctahedron": "3/2 3 | 3",
  "Tetrahemihexahedron": "3/2 3 | 2",
  "Cubohemioctahedron": "4/3 4 | 3",
  "Great dodecahedron": "5/2 | 2 5",
  "Great icosahedron": "5/2 | 2 3",
  "Great ditrigonal icosidodecahedron": "3/2 | 3 5",
  "Small cubicuboctahedron": "3/2 4 | 4",
  "Nonconvex great rhombicuboctahedron": "3/2 4 | 2",
  "Small dodecahemidodecahedron": "5/4 5 | 5",
  "Great dodecahemicosahedron": "5/4 5 | 3",
  "Small icosihemidodecahedron": "3/2 3 | 5",
  "Small dodecicosidodecahedron": "3/2 5 | 5",
  "Great icosicosidodecahedron": "3/2 5 | 3",
  "Small stellated dodecahedron": "5 | 2 5/2",
  "Great stellated dodecahedron": "3 | 2 5/2",
  "Ditrigonal dodecadodecahedron": "3 | 5/3 5",
  "Small ditrigonal icosidodecahedron": "3 | 5/2 3",
  "Stellated truncated hexahedron": "2 3 | 4/3",
  "Great cubicuboctahedron": "3 4 | 4/3",
  "Great dodecahemidodecahedron": "5/3 5/2 | 5/3",
  "Small dodecahemicosahedron": "5/3 5/2 | 3",
  "Dodecadodecahedron": "2 | 5 5/2",
  "Great icosihemidodecahedron": "3/2 3 | 5/3",
  "Great icosidodecahedron": "2 | 3 5/2",
  "Cubitruncated cuboctahedron": "4/3 3 4 |",
  "Great truncated cuboctahedron": "4/3 2 3 |",
  "Truncated great dodecahedron": "2 5/2 | 5",
  "Small stellated truncated dodecahedron": "2 5 | 5/3",
  "Great stellated truncated dodecahedron": "2 3 | 5/3",
  "Truncated great icosahedron": "2 5/2 | 3",
  "Icosidodecadodecahedron": "5/3 5 | 3",
  "Small ditrigonal dodecicosidodecahedron": "5/3 3 | 5",
  "Great ditrigonal dodecicosidodecahedron": "3 5 | 5/3",
  "Great dodecicosidodecahedron": "5/2 3 | 5/3",
  "Small icosicosidodecahedron": "5/2 3 | 3",
  "Rhombidodecadodecahedron": "5/2 5 | 2",
  "Nonconvex great rhombicosidodecahedron": "5/3 3 | 2",
  "Icositruncated dodecadodecahedron": "3 5 5/3 |",
  "Truncated dodecadodecahedron": "2 5 5/3 |",
  "Great truncated icosidodecahedron": "2 3 5/3 |",
  "Snub dodecadodecahedron": "| 2 5/2 5",
  "Inverted snub dodecadodecahedron": "| 5/3 2 5",
  "Great snub icosidodecahedron": "| 2 5/2 3",
  "Great inverted snub icosidodecahedron": "| 5/3 2 3",
  "Great retrosnub icosidodecahedron": "| 2 3/2 5/3",
  "Great snub dodecicosidodecahedron": "| 5/3 5/2 3",
  "Snub icosidodecadodecahedron": "| 5/3 3 5",
  "Small snub icosicosidodecahedron": "| 5/2 3 3",
  "Small retrosnub icosicosidodecahedron": "| 3/2 3/2 5/2",
  "Pentagrammic prism": "2 5/2 | 2",
  "Heptagrammic prism (7/2)": "2 7/2 | 2",
  "Heptagrammic prism (7/3)": "2 7/3 | 2",
  "Octagrammic prism": "2 8/3 | 2",
  "Pentagrammic antiprism": "| 2 2 5/2",
  "Pentagrammic crossed-antiprism": "| 2 2 5/3",
  "Heptagrammic antiprism (7/2)": "| 2 2 7/2",
  "Heptagrammic antiprism (7/3)": "| 2 2 7/3",
  "Heptagrammic crossed-antiprism": "| 2 2 7/4",
  "Octagrammic antiprism": "| 2 2 8/3",
  "Octagrammic crossed-antiprism": "| 2 2 8/5",
  "Small rhombihexahedron": "3/2 2 4 |",
  "Small dodecicosahedron": "3/2 3 5 |",
  "Small rhombidodecahedron": "2 5/2 5 |",
  "Rhombicosahedron": "2 5/2 3 |",
  "Great rhombihexahedron": "4/3 3/2 2 |",
  "Great dodecicosahedron": "3 5/3 5/2 |",
  "Great rhombidodecahedron": "3/2 5/3 2 |",
  "Great dirhombicosidodecahedron": "| 3/2 5/3 3 5/2"
};

Object.assign(SHAPES, star_polyhedra);

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

  tooltip(`raster<br>${shapeName.toLowerCase()}<br>${symbol}`);
  
  // Create rotation matrices
  const rotX = Mat4.rotationX(angleX);
  const rotY = Mat4.rotationY(angleY);
  const rotZ = Mat4.rotationZ(angleZ);

  const hoverY = Math.sin(window.frame_count * 0.03) * 0.15;

  // Transform vertices
  const transformedVertices = geoType.vertices.map(v => {
    let tv = rotX.multiplyVec3(v);
    tv = rotY.multiplyVec3(tv);
    tv = rotZ.multiplyVec3(tv);
    tv.y += hoverY;
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
