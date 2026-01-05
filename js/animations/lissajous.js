import { tooltip, density_chars } from "../utils.js";

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

export default (this_animation) => {
  if (window.frame_count === 0) {
    const is_rational = Math.random() < 0.5;
    
    let a, b;
    if (is_rational) {
      const possible_values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      a = possible_values[Math.floor(Math.random() * possible_values.length)];
      b = possible_values[Math.floor(Math.random() * possible_values.length)];
    } else {
      a = 1 + Math.random() * 9;
      b = 1 + Math.random() * 9;
    }
    
    const delta = Math.random() * Math.PI * 2;
    
    window.lissajous = {
      is_rational,
      a,
      b,
      delta,
      t: 0,
      period: is_rational ? (2 * Math.PI / gcd(a, b)) : Infinity,
      max_density: 0,
      is_complete: false
    };

    window.grid = [];
    for (let r = 0; r < window.rows; r++) {
      window.grid[r] = new Array(window.columns).fill(is_rational ? false : 0);
    }
    
    const tooltip_a = is_rational ? a : a.toFixed(2);
    const tooltip_b = is_rational ? b : b.toFixed(2);
    tooltip(`lissajous<br>a=${tooltip_a} b=${tooltip_b} d=${(delta/Math.PI).toFixed(2)}π`, 0);
  }

  const { is_rational, a, b, delta, period } = window.lissajous;
  const steps_per_frame = 100;
  const dt = is_rational ? 0.0001 : 0.001;

  if (!window.lissajous.is_complete) {
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
          if (window.grid[y][x] > window.lissajous.max_density) {
            window.lissajous.max_density = window.grid[y][x];
          }
        }
      }
    }
  }

  // Render
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
  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 30);
};
