import { tooltip, density_chars, gcd, render_grid, render_density_grid } from "../utils.js";

const MAX_VAL = 25;

export default (this_animation) => {
  if (window.frame_count === 0) {
    window.sub_animation_size = 4; // 0: Rational Hypo, 1: Rational Epi, 2: Irrational Hypo, 3: Irrational Epi
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 4) {
      mode_idx = window.sub_animation_index;
    } else {
      mode_idx = Math.floor(Math.random() * 4);
    }

    const is_irrational = mode_idx >= 2;
    const sub_mode = (mode_idx === 0 || mode_idx === 2) ? "hypo" : "epi";

    // Parameters for Spirograph
    let r, R, d;
    if (is_irrational) {
      r = 1 + Math.random() * (MAX_VAL - 2);
      R = r + 2 + Math.random() * (MAX_VAL - (r + 2));
      d = 1 + Math.random() * (2 * R - 1);
    } else {
      r = 1 + Math.floor(Math.random() * (MAX_VAL - 2));
      R = (r + 2) + Math.floor(Math.random() * (MAX_VAL - (r + 2) + 1));
      d = 1 + Math.random() * (2 * R - 1);
    }
    
    const common = is_irrational ? 1 : gcd(R, r);
    const period = is_irrational ? Infinity : 2 * Math.PI * (r / common);
    const dt = is_irrational ? 0.02 : 0.01;
    
    // Target 5 seconds at ~30 FPS (150 frames)
    const target_frames = 150;
    const steps_per_frame = is_irrational ? 500 : Math.ceil((period / dt) / target_frames);

    window.spirograph = {
      mode: sub_mode,
      is_irrational,
      R, r, d, dt,
      steps_per_frame,
      t: 0,
      period,
      is_complete: false
    };

    window.grid = [];
    for (let r = 0; r < window.rows; r++) {
      window.grid[r] = new Array(window.columns).fill(0);
    }
    
    const R_text = is_irrational ? R.toFixed(2) : Math.round(R);
    const r_text = is_irrational ? r.toFixed(2) : Math.round(r);
    const mode_text = (sub_mode === "hypo" ? "hypotrochoid" : "epitrochoid");
    tooltip(`spirograph<br>${mode_text}<br>R=${R_text} r=${r_text} d=${d.toFixed(2)}`, 0);
  }

  const { mode, is_irrational, R, r, d, period, dt } = window.spirograph;
  let steps_per_frame = window.spirograph.steps_per_frame;

  if (is_irrational) {
    // Accelerate from 10 to 1000
    steps_per_frame = Math.min(1000, 10 + window.frame_count * 0.2);
  }

  if (!window.spirograph.is_complete) {
    for (let i = 0; i < steps_per_frame; i++) {
      window.spirograph.t += dt;
      const t = window.spirograph.t;
      
      if (!is_irrational && t >= period) {
        window.spirograph.is_complete = true;
        break;
      }
      
      let x_norm, y_norm;
      if (mode === "hypo") {
        x_norm = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        y_norm = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      } else {
        x_norm = (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
        y_norm = (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
      }

      const max_R = mode === "hypo" ? Math.abs(R - r) + d : (R + r + d);
      const max_pixel_width = window.columns * window.char_width;
      const max_pixel_height = window.rows * window.char_height;
      const pixel_radius = Math.min(max_pixel_width, max_pixel_height) / 2 * 0.9;
      
      const x_pixel = (x_norm / max_R) * pixel_radius;
      const y_pixel = (y_norm / max_R) * pixel_radius;
      
      const x = Math.round(x_pixel / window.char_width + (window.columns - 1) / 2);
      const y = Math.round(y_pixel / window.char_height + (window.rows - 1) / 2);
      
      if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
        window.grid[y][x]++;
      }
    }
  }

  let text;
  if (is_irrational) {
    text = render_density_grid(window.grid);
  } else {
    text = render_grid(window.grid, (val) => val ? "o" : ".");
  }
  window.canvas.text(text);

  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
};
