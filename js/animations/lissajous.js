import { tooltip, density_chars } from "../utils.js";

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

export default (this_animation) => {
  if (window.frame_count === 0) {
    window.sub_animation_size = 3;
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 3) {
      mode_idx = window.sub_animation_index;
    } else {
      mode_idx = Math.floor(Math.random() * 3);
    }

    const is_rational = mode_idx === 0 || mode_idx === 2;
    const is_dynamic = mode_idx === 2;
    
    let a, b;
    if (is_rational) {
      const possible_values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      a = possible_values[Math.floor(Math.random() * possible_values.length)];
      b = possible_values[Math.floor(Math.random() * possible_values.length)];
      const common = gcd(a, b);
      a /= common;
      b /= common;
    } else {
      a = 1 + Math.random() * 19;
      b = 1 + Math.random() * 19;
    }
    
    const delta = Math.random() * Math.PI * 2;
    
    window.lissajous = {
      is_rational,
      is_dynamic,
      a,
      b,
      delta,
      t: 0,
      period: is_rational ? (2 * Math.PI / gcd(a, b)) : Infinity,
      max_density: 0,
      is_complete: false
    };

    if (!is_dynamic) {
      window.grid = [];
      for (let r = 0; r < window.rows; r++) {
        window.grid[r] = new Array(window.columns).fill(is_rational ? false : 0);
      }
    }
    
    const tooltip_a = is_rational ? a : a.toFixed(2);
    const tooltip_b = is_rational ? b : b.toFixed(2);
    tooltip(`lissajous<br>a=${tooltip_a} b=${tooltip_b} d=${(delta/Math.PI).toFixed(2)}π`, 0);
  }

  const { is_rational, is_dynamic, a, b, period } = window.lissajous;
  
  if (is_dynamic) {
    // Dynamic mode: Redraw entire curve every frame with varying delta
    window.lissajous.delta += 0.01;
    const delta = window.lissajous.delta;

    const tooltip_a = a;
    const tooltip_b = b;
    tooltip(`lissajous<br>a=${tooltip_a} b=${tooltip_b} d=${((delta/Math.PI) % 2).toFixed(2)}π`, 0);
    
    // Clear/Re-init grid every frame
    const grid = [];
    for (let r = 0; r < window.rows; r++) {
      grid[r] = new Array(window.columns).fill(false);
    }

    // Draw full period
    const dt = 0.001;
    for (let t = 0; t <= period; t += dt) {
      const x_norm = Math.sin(a * t + delta);
      const y_norm = Math.sin(b * t);
      const x = Math.round((x_norm + 1) * 0.5 * (window.columns - 1));
      const y = Math.round((y_norm + 1) * 0.5 * (window.rows - 1));
      if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
        grid[y][x] = true;
      }
    }

    // Render
    let text = "";
    for (let r = 0; r < window.rows; r++) {
      for (let c = 0; c < window.columns; c++) {
        text += grid[r][c] ? "o" : ".";
      }
      text += "\n";
    }
    window.canvas.text(text);

  } else {
    // Original incremental mode
    const steps_per_frame = 100;
    const dt = is_rational ? 0.0001 : 0.001;

    if (!window.lissajous.is_complete) {
      const delta = window.lissajous.delta;
      for (let i = 0; i < steps_per_frame; i++) {
        window.lissajous.t += dt;
        const t = window.lissajous.t;
        
        if (is_rational && t >= period) {
          window.lissajous.is_complete = true;
          break;
        }
        
        const x_norm = Math.sin(a * t + delta);
        const y_norm = Math.sin(b * t);
        const x = Math.round((x_norm + 1) * 0.5 * (window.columns - 1));
        const y = Math.round((y_norm + 1) * 0.5 * (window.rows - 1));
        
        if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
          if (is_rational) {
            window.grid[y][x] = true;
          } else {
            window.grid[y][x]++;
          }
        }
      }
    }

    // Render grid
    let text = "";
    if (is_rational) {
      for (let r = 0; r < window.rows; r++) {
        for (let c = 0; c < window.columns; c++) {
          text += window.grid[r][c] ? "o" : ".";
        }
        text += "\n";
      }
    } else {
      for (let r = 0; r < window.rows; r++) {
        for (let c = 0; c < window.columns; c++) {
          const d = window.grid[r][c];
          const char_idx = Math.min(d, density_chars.length - 1);
          text += density_chars[char_idx];
        }
        text += "\n";
      }
    }
    window.canvas.text(text);
  }

  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 30);
};