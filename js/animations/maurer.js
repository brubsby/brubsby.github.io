import { tooltip, render_density_grid, get_bresenham_line_points } from "../utils.js";

export default (this_animation) => {
  if (window.frame_count === 0) {
    window.sub_animation_size = 1;

    // Maurer Rose parameters
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    let n, d;
    do {
      n = 2 + Math.floor(Math.random() * 18);
      d = 1 + Math.floor(Math.random() * 359);
    } while ((n * d) % 180 === 0 || 360 / gcd(d, 360) < 75);
    
    window.maurer = {
      n, d,
      t: 0,
      prev_coords: null,
      is_complete: false
    };

    window.grid = [];
    for (let r = 0; r < window.rows; r++) {
      window.grid[r] = new Array(window.columns).fill(0);
    }
    
    tooltip(`maurer<br>n=${n} d=${d}`, 0);
  }

  const { n, d } = window.maurer;
  const steps_per_frame = 5; 

  if (!window.maurer.is_complete) {
    for (let i = 0; i < steps_per_frame; i++) {
      const k = window.maurer.t * d;
      const rad = k * Math.PI / 180;
      const r_val = Math.sin(n * rad);
      
      const x_norm = r_val * Math.cos(rad);
      const y_norm = r_val * Math.sin(rad);

      const max_pixel_width = window.columns * window.char_width;
      const max_pixel_height = window.rows * window.char_height;
      const pixel_radius = Math.min(max_pixel_width, max_pixel_height) / 2 * 0.9;
      
      const x_pixel = x_norm * pixel_radius;
      const y_pixel = y_norm * pixel_radius;
      
      const x = Math.round(x_pixel / window.char_width + (window.columns - 1) / 2);
      const y = Math.round(y_pixel / window.char_height + (window.rows - 1) / 2);
      
      if (window.maurer.prev_coords) {
        const line_points = get_bresenham_line_points([window.maurer.prev_coords, [x, y]]);
        for (const pt of line_points) {
          if (pt[0] >= 0 && pt[0] < window.columns && pt[1] >= 0 && pt[1] < window.rows) {
            window.grid[pt[1]][pt[0]]++;
          }
        }
      } else {
        if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
          window.grid[y][x]++;
        }
      }

      window.maurer.prev_coords = [x, y];
      window.maurer.t++;
      if (window.maurer.t > 360) {
        window.maurer.is_complete = true;
        break;
      }
    }
  }

  const text = render_density_grid(window.grid);
  window.canvas.text(text);

  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
};
