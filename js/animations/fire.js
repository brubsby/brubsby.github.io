import { tooltip, density_chars } from "../utils.js";

// Procedural fire effect based on the classic Doom fire algorithm.
export default (this_animation) => {
  const w = window.columns;
  const h = window.rows;
  const palette = density_chars;
  const max_heat = palette.length - 1;

  // Initialize or handle resize
  if (
    !window.fire_grid ||
    window.fire_grid_cols !== w ||
    window.fire_grid_rows !== h
  ) {
    window.fire_grid = new Int32Array(w * h).fill(0);
    window.fire_grid_cols = w;
    window.fire_grid_rows = h;

    // Set the bottom row to maximum heat
    for (let x = 0; x < w; x++) {
      window.fire_grid[(h - 1) * w + x] = max_heat;
    }

    tooltip("fire", 0);
  }

  // Update fire spread (Doom fire algorithm)
  for (let x = 0; x < w; x++) {
    for (let y = 1; y < h; y++) {
      const src_idx = y * w + x;
      const pixel = window.fire_grid[src_idx];

      if (pixel === 0) {
        window.fire_grid[src_idx - w] = 0;
      } else {
        // Random horizontal drift and cooling
        const rand_idx = Math.floor(Math.random() * 3);
        const drift = rand_idx - 1; // -1, 0, or 1
        
        // Calculate cooling to make flames die out around 1/2 up the screen
        // max_heat needs to be dissipated over (h * 0.5) rows.
        // average_cooling = max_heat / (h * 0.5)
        // cooling_base = 2 * average_cooling + 1
        const cooling_base = (max_heat / (h * 0.5)) * 2 + 1;
        const cooling = Math.floor(Math.random() * cooling_base);

        let dst_x = x + drift;
        if (dst_x < 0) dst_x = 0;
        if (dst_x >= w) dst_x = w - 1;

        const dst_idx = (y - 1) * w + dst_x;
        const next_heat = pixel - cooling;
        window.fire_grid[dst_idx] = next_heat < 0 ? 0 : next_heat;
      }
    }
  }

  // Render
  let text = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const heat = window.fire_grid[y * w + x];
      // Use '.' for the coldest heat level as requested
      text += heat === 0 ? "." : palette[heat];
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
};
