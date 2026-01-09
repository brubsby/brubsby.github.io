import { tooltip, density_chars } from "../utils.js";

// Classic plasma effect using combined sine waves
export default (this_animation) => {
  const w = window.columns;
  const h = window.rows;
  const palette = density_chars;
  const max_idx = palette.length - 1;

  if (window.frame_count === 0) {
    tooltip("plasma", 0);
  }

  const t = window.frame_count * 0.03;
  let text = "";

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Use irrational frequencies and multiple scales to increase aperiodicity
      const nx = x / w;
      const ny = y / h;

      let v = 0;
      // Combine multiple sine waves with "random" phases and irrational frequencies
      v += Math.sin(nx * 7.53 + t * 0.71);
      v += Math.sin(ny * 9.11 + t * 0.89);
      v += Math.sin((nx + ny + t) * 5.23);
      
      const dist = Math.sqrt(Math.pow(nx - 0.5 - 0.2 * Math.sin(t * 0.37), 2) + 
                             Math.pow(ny - 0.5 - 0.2 * Math.cos(t * 0.43), 2));
      v += Math.sin(dist * 15.7 + t);
      
      // Add a rotating component
      const angle = t * 0.13;
      const rx = nx * Math.cos(angle) - ny * Math.sin(angle);
      const ry = nx * Math.sin(angle) + ny * Math.cos(angle);
      v += Math.sin(rx * 12.1 + ry * 8.3 + t * 0.5);

      // Normalize v from roughly [-5, 5] to [0, 1]
      let normalized = (v + 5) / 10;
      normalized = Math.max(0, Math.min(1, normalized));

      const char_idx = Math.floor(normalized * max_idx);
      text += palette[char_idx];
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
