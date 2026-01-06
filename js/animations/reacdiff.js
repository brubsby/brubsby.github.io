import { tooltip, density_chars } from "../utils.js";

export default (this_animation) => {
  if (window.frame_count === 0) {
    const w = window.columns;
    const h = window.rows;
    
    // Configurable parameter sets (Feed, Kill)
    // Source: http://www.karlsims.com/rd.html
    const presets = [
      { name: "Spots", f: 0.055, k: 0.062 },
      { name: "Corals", f: 0.0545, k: 0.062 },
      { name: "Spirals", f: 0.018, k: 0.051 },
      { name: "Worms", f: 0.078, k: 0.061 },
      { name: "Chaos", f: 0.026, k: 0.051 }, // Mazes/Chaos
      { name: "Mitosis", f: 0.0367, k: 0.0649 },
      { name: "U-Skate", f: 0.062, k: 0.0609 },
      { name: "Solitons", f: 0.03, k: 0.062 },
      { name: "Pulsating", f: 0.025, k: 0.06 },
      { name: "Holes", f: 0.039, k: 0.058 },
      { name: "Random" }
    ];

    window.sub_animation_size = presets.length;
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < presets.length) {
      mode_idx = window.sub_animation_index;
    } else {
      mode_idx = Math.floor(Math.random() * presets.length);
    }
    
    const params = presets[mode_idx];
    if (params.name === "Random") {
      // Heuristic: Interpolate between two known good presets to stay in the "interesting" manifold
      // Filter out the "Random" preset itself from the selection pool
      const valid_presets = presets.filter(p => p.name !== "Random");
      const p1 = valid_presets[Math.floor(Math.random() * valid_presets.length)];
      const p2 = valid_presets[Math.floor(Math.random() * valid_presets.length)];
      
      const t = Math.random();
      const jitter_f = (Math.random() - 0.5) * 0.004;
      const jitter_k = (Math.random() - 0.5) * 0.004;

      params.f = Math.max(0.001, (p1.f + (p2.f - p1.f) * t) + jitter_f);
      params.k = Math.max(0.001, (p1.k + (p2.k - p1.k) * t) + jitter_k);
    }

    // Initialize grids
    // Using Float32Array for performance
    const size = w * h;
    const gridA = new Float32Array(size).fill(1.0);
    const gridB = new Float32Array(size).fill(0.0);
    const nextA = new Float32Array(size).fill(1.0);
    const nextB = new Float32Array(size).fill(0.0);

    // Seed the center
    const seed_radius = Math.min(w, h) / 10;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    
    // Add some random seeds for variety
    for(let i=0; i<5; i++) {
        const rx = Math.floor(Math.random() * w);
        const ry = Math.floor(Math.random() * h);
        const r_rad = Math.floor(Math.random() * 5) + 2;
        for(let y = ry - r_rad; y <= ry + r_rad; y++) {
            for(let x = rx - r_rad; x <= rx + r_rad; x++) {
                if(x >= 0 && x < w && y >= 0 && y < h) {
                    gridB[y * w + x] = 1.0;
                }
            }
        }
    }
    
    // Always seed center
    for(let y = cy - seed_radius; y <= cy + seed_radius; y++) {
        for(let x = cx - seed_radius; x <= cx + seed_radius; x++) {
            if(x >= 0 && x < w && y >= 0 && y < h) {
               gridB[y * w + x] = 1.0; 
            }
        }
    }

    window.rd = {
      gridA, gridB, nextA, nextB,
      w, h,
      dA: 1.0,
      dB: 0.5,
      f: params.f,
      k: params.k,
      mode_idx,
      name: params.name
    };

    const tt = `reacdiff<br>${params.name.toLowerCase()} f=${params.f.toFixed(4)} k=${params.k.toFixed(4)}`;
    tooltip(tt, mode_idx);
  }

  const rd = window.rd;
  const w = rd.w;
  const h = rd.h;
  const size = w * h;
  
  // Simulation constants
  const dt = 1.0;
  
  // Laplacian weights
  //  0.05  0.2  0.05
  //  0.2  -1.0  0.2
  //  0.05  0.2  0.05
  
  // Run multiple steps per frame to speed up animation
  const steps_per_frame = 8;

  for (let s = 0; s < steps_per_frame; s++) {
    // Current buffers
    const A = rd.gridA;
    const B = rd.gridB;
    const nA = rd.nextA;
    const nB = rd.nextB;

    for (let y = 0; y < h; y++) {
      // Pre-calculate row offsets for wrapping
      const y_up = (y === 0 ? h - 1 : y - 1) * w;
      const y_curr = y * w;
      const y_down = (y === h - 1 ? 0 : y + 1) * w;

      for (let x = 0; x < w; x++) {
        const idx = y_curr + x;

        // Calculate column indices for wrapping
        const x_left = x === 0 ? w - 1 : x - 1;
        const x_right = x === w - 1 ? 0 : x + 1;

        // Neighbor indices (Toroidal)
        const i_l = y_curr + x_left;
        const i_r = y_curr + x_right;
        const i_u = y_up + x;
        const i_d = y_down + x;
        
        const i_ul = y_up + x_left;
        const i_ur = y_up + x_right;
        const i_dl = y_down + x_left;
        const i_dr = y_down + x_right;
        
        // Laplacian convolution
        const a = A[idx];
        const b = B[idx];
        
        const lapA = 
          (A[i_l] + A[i_r] + A[i_u] + A[i_d]) * 0.2 +
          (A[i_ul] + A[i_ur] + A[i_dl] + A[i_dr]) * 0.05 -
          a;
          
        const lapB = 
          (B[i_l] + B[i_r] + B[i_u] + B[i_d]) * 0.2 +
          (B[i_ul] + B[i_ur] + B[i_dl] + B[i_dr]) * 0.05 -
          b;

        const abb = a * b * b;
        
        // Gray-Scott formulas
        nA[idx] = a + (rd.dA * lapA - abb + rd.f * (1 - a)) * dt;
        nB[idx] = b + (rd.dB * lapB + abb - (rd.k + rd.f) * b) * dt;
        
        if (nA[idx] < 0) nA[idx] = 0; else if (nA[idx] > 1) nA[idx] = 1;
        if (nB[idx] < 0) nB[idx] = 0; else if (nB[idx] > 1) nB[idx] = 1;
      }
    }
    
    // Swap buffers
    const tempA = rd.gridA;
    rd.gridA = rd.nextA;
    rd.nextA = tempA;
    
    const tempB = rd.gridB;
    rd.gridB = rd.nextB;
    rd.nextB = tempB;
  }

  // Render
  let text = "";
  const len = density_chars.length;
  
  for (let y = 0; y < h; y++) {
    let row_str = "";
    let idx = y * w;
    for (let x = 0; x < w; x++) {
      // Visualizing B concentration
      // B usually goes from 0 to ~0.5 or so in patterns
      let val = rd.gridB[idx];
      
      // Scaling for visibility (B is often low)
      // Standardize mapping: 0.0 -> 0.0, 0.4 -> 1.0 (approx)
      val = Math.min(1, val * 2.5); 
      
      // Or visualize A-B difference for more contrast?
      // val = (1 - rd.gridA[idx]) + rd.gridB[idx];
      
      const char_idx = Math.floor(val * (len - 1));
      row_str += density_chars[char_idx] || density_chars[0];
      idx++;
    }
    text += row_str + "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 30);
};
