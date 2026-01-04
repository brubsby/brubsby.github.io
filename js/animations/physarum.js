import { tooltip, density_chars } from '../utils.js';

export default (this_animation) => {
  const width = window.columns;
  const height = window.rows;
  const num_particles = Math.floor(width * height * 0.2);
  const sensor_angle = 35 * Math.PI / 180;
  const sensor_dist = 3;
  const turn_speed = 0.2;
  const move_speed = 0.5;
  const decay_rate = 0.92;
  const aspect_ratio = window.char_height / window.char_width;

  if (window.frame_count === 0) {
    window.sub_animation_size = 2;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 2) {
      window.is_toroidal = window.sub_animation_index === 1;
    } else {
      window.is_toroidal = Math.random() < 0.5;
    }
    
    window.particles = [];
    for (let i = 0; i < num_particles; i++) {
      window.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * 2 * Math.PI
      });
    }
    window.pheromone_grid = new Float32Array(width * height);
    window.pheromone_grid_back = new Float32Array(width * height);
    tooltip(`physarum t=${window.is_toroidal ? 1 : 0}`, window.is_toroidal ? 1 : 0);
  }

  // Decay and Diffuse
  const w_h = 1.0;
  const w_v = 1.0 / (aspect_ratio * aspect_ratio);
  const w_d = 1.0 / (1 + aspect_ratio * aspect_ratio);
  const w_c = 2.0;
  const total_weight = w_c + 2 * w_h + 2 * w_v + 4 * w_d;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let weight = 0;
          if (dx === 0 && dy === 0) weight = w_c;
          else if (dx === 0) weight = w_v;
          else if (dy === 0) weight = w_h;
          else weight = w_d;

          let nx = x + dx;
          let ny = y + dy;
          if (window.is_toroidal) {
            nx = (nx + width) % width;
            ny = (ny + height) % height;
          } else {
            nx = Math.max(0, Math.min(width - 1, nx));
            ny = Math.max(0, Math.min(height - 1, ny));
          }
          sum += window.pheromone_grid[ny * width + nx] * weight;
        }
      }
      const avg = sum / total_weight;
      window.pheromone_grid_back[y * width + x] = avg * decay_rate;
    }
  }
  
  // Swap buffers
  let temp = window.pheromone_grid;
  window.pheromone_grid = window.pheromone_grid_back;
  window.pheromone_grid_back = temp;

  // Particle Step
  for (let i = 0; i < window.particles.length; i++) {
    const p = window.particles[i];

    const sense = (angle_offset) => {
      const angle = p.angle + angle_offset;
      // Subtract 0.5 to align sampling with cell centers
      let sx = p.x + Math.cos(angle) * sensor_dist - 0.5;
      let sy = p.y + Math.sin(angle) * sensor_dist / aspect_ratio - 0.5;
      
      const sample = (x, y) => {
        let gx = x;
        let gy = y;
        if (window.is_toroidal) {
          gx = (gx % width + width) % width;
          gy = (gy % height + height) % height;
        } else {
          gx = Math.max(0, Math.min(width - 1, gx));
          gy = Math.max(0, Math.min(height - 1, gy));
        }
        return window.pheromone_grid[Math.floor(gy) * width + Math.floor(gx)];
      };

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const tx = sx - x0;
      const ty = sy - y0;

      const v00 = sample(x0, y0);
      const v10 = sample(x1, y0);
      const v01 = sample(x0, y1);
      const v11 = sample(x1, y1);

      return (v00 * (1 - tx) * (1 - ty) +
              v10 * tx * (1 - ty) +
              v01 * (1 - tx) * ty +
              v11 * tx * ty);
    };

    const v_center = sense(0);
    const v_left = sense(-sensor_angle);
    const v_right = sense(sensor_angle);

    if (v_center > v_left && v_center > v_right) {
      // Continue straight
    } else if (v_center < v_left && v_center < v_right) {
      p.angle += (Math.random() - 0.5) * 2 * turn_speed;
    } else if (v_left > v_right) {
      p.angle -= turn_speed;
    } else if (v_right > v_left) {
      p.angle += turn_speed;
    }
    
    // Idea 3: Small wiggle to prevent locking into perfect axes
    p.angle += (Math.random() - 0.5) * 0.1;

    p.x += Math.cos(p.angle) * move_speed;
    p.y += Math.sin(p.angle) * move_speed / aspect_ratio;

    if (window.is_toroidal) {
      if (p.x < 0) p.x += width;
      if (p.x >= width) p.x -= width;
      if (p.y < 0) p.y += height;
      if (p.y >= height) p.y -= height;
    } else {
      if (p.x < 0 || p.x >= width) {
        p.angle = Math.PI - p.angle;
        p.x = Math.max(0, Math.min(width - 0.01, p.x));
      }
      if (p.y < 0 || p.y >= height) {
        p.angle = -p.angle;
        p.y = Math.max(0, Math.min(height - 0.01, p.y));
      }
    }

    const gx = Math.floor(p.x);
    const gy = Math.floor(p.y);
    window.pheromone_grid[gy * width + gx] += 0.5;
  }

  // Render
  let text = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = window.pheromone_grid[y * width + x];
      if (val < 0.1) {
        text += " ";
      } else {
        const char_idx = Math.min(density_chars.length - 1, Math.floor(val * 10));
        text += density_chars[char_idx];
      }
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};