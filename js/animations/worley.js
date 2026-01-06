import { tooltip, density_chars } from "../utils.js";

export default (this_animation) => {
  if (window.frame_count === 0) {
    window.sub_animation_size = 2;
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 2) {
      mode_idx = window.sub_animation_index;
    } else {
      mode_idx = Math.floor(Math.random() * 2);
    }

    const inverted = mode_idx === 1;
    const max_cs = Math.min(window.columns, window.rows);
    const cell_size = 8 + Math.floor(Math.random() * (Math.max(8, max_cs) - 8 + 1));
    
    // Store seeds in a 2D grid for O(1) spatial lookup
    const seed_grid = {};
    const gx_min = -1;
    const gx_max = Math.ceil(window.columns / cell_size) + 1;
    const gy_min = -1;
    const gy_max = Math.ceil(window.rows / cell_size) + 1;

    for (let gx = gx_min; gx <= gx_max; gx++) {
      seed_grid[gx] = {};
      for (let gy = gy_min; gy <= gy_max; gy++) {
        seed_grid[gx][gy] = {
          base: [gx * cell_size, gy * cell_size],
          offset: [Math.random() * cell_size, Math.random() * cell_size],
          vel: [(Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2],
          t: Math.random() * Math.PI * 2,
          current_pos: [0, 0]
        };
      }
    }

    window.worley = {
      mode_idx,
      seed_grid,
      gx_min, gx_max, gy_min, gy_max,
      inverted,
      cell_size
    };

    const tt = `worley<br>i=${inverted?1:0} cs=${cell_size}`;
    tooltip(tt, mode_idx);
  }

  const w = window.worley;

  // Update seed positions (always moving)
  for (let gx = w.gx_min; gx <= w.gx_max; gx++) {
    for (let gy = w.gy_min; gy <= w.gy_max; gy++) {
      const s = w.seed_grid[gx][gy];
      s.t += 0.05;
      s.offset[0] = (w.cell_size / 2) + (w.cell_size / 2.5) * Math.sin(s.t + s.vel[0] * 10);
      s.offset[1] = (w.cell_size / 2) + (w.cell_size / 2.5) * Math.cos(s.t + s.vel[1] * 10);
      s.current_pos = [s.base[0] + s.offset[0], s.base[1] + s.offset[1]];
    }
  }

  let text = "";
  const scale = 1.0 / (w.cell_size * 0.5);

  // Optimization: Reuse array for neighbors to avoid allocation per pixel
  const neighbors = new Array(9);
  let neighbors_count = 0;
  let prev_gx = -999;
  let prev_gy = -999;

  for (let r = 0; r < window.rows; r++) {
    const gy = Math.floor(r / w.cell_size);
    for (let c = 0; c < window.columns; c++) {
      const gx = Math.floor(c / w.cell_size);
      
      // Only rebuild neighbors list when moving to a new grid cell
      if (gx !== prev_gx || gy !== prev_gy) {
        prev_gx = gx;
        prev_gy = gy;
        neighbors_count = 0;
        
        for (let ox = -1; ox <= 1; ox++) {
          const sgx = gx + ox;
          const row_seeds = w.seed_grid[sgx];
          if (row_seeds) {
            for (let oy = -1; oy <= 1; oy++) {
              const sgy = gy + oy;
              const seed = row_seeds[sgy];
              if (seed) {
                neighbors[neighbors_count++] = seed.current_pos;
              }
            }
          }
        }
      }

      // Inline finding the 2 nearest neighbors (using squared distance to avoid sqrt)
      let min_sq_dist1 = Infinity;
      let min_sq_dist2 = Infinity;

      for (let i = 0; i < neighbors_count; i++) {
        const p = neighbors[i];
        const dx = p[0] - c;
        const dy = p[1] - r;
        const d2 = dx * dx + dy * dy;

        if (d2 < min_sq_dist1) {
          min_sq_dist2 = min_sq_dist1;
          min_sq_dist1 = d2;
        } else if (d2 < min_sq_dist2) {
          min_sq_dist2 = d2;
        }
      }

      // Calculate value based on difference of distances
      // We need real distances here, so we sqrt now (only twice per pixel)
      const dist1 = Math.sqrt(min_sq_dist1);
      const dist2 = Math.sqrt(min_sq_dist2);
      
      let val = (dist2 - dist1) * scale;

      let norm = Math.max(0, Math.min(1, val));
      if (w.inverted) norm = 1 - norm;
      
      const char_idx = Math.floor(norm * (density_chars.length - 1));
      text += density_chars[char_idx];
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 50);
};
