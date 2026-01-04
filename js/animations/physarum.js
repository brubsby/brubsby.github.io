import { tooltip, density_chars } from '../utils.js';

export default (this_animation) => {
  const width = window.columns;
  const height = window.rows;
  const aspect_ratio = window.char_height / window.char_width;

  if (window.frame_count === 0) {
    window.num_particles = Math.floor(width * height * (0.5 + Math.random() * 0.5));
    window.sensor_angle = (20 + Math.random() * 50) * Math.PI / 180;
    window.sensor_dist = 2 + Math.random() * 10;
    window.turn_speed = 0.2 + Math.random() * 1.0;
    window.move_speed = 0.8 + Math.random() * 1.0;
    window.decay_rate = 0.85 + Math.random() * 0.1;

    window.particles = [];
    for (let i = 0; i < window.num_particles; i++) {
      window.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * 2 * Math.PI
      });
    }
    window.pheromone_grid = new Float32Array(width * height);
    window.pheromone_grid_back = new Float32Array(width * height);

    const sa_deg = Math.round(window.sensor_angle * 180 / Math.PI);
    tooltip(`physarum<br>n=${window.num_particles} sa=${sa_deg} so=${window.sensor_dist.toFixed(1)} ra=${window.turn_speed.toFixed(1)} ss=${window.move_speed.toFixed(1)} decay=${window.decay_rate.toFixed(2)}`);
  }

  const { sensor_angle, sensor_dist, turn_speed, move_speed, decay_rate } = window;

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

          let nx = (x + dx + width) % width;
          let ny = (y + dy + height) % height;
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

  // Particle Step: Pass 1 (Sense and Move)
  for (let i = 0; i < window.particles.length; i++) {
    const p = window.particles[i];

    const sense = (angle_offset) => {
      const angle = p.angle + angle_offset;
      // Subtract 0.5 to align sampling with cell centers
      let sx = p.x + Math.cos(angle) * sensor_dist - 0.5;
      let sy = p.y + Math.sin(angle) * sensor_dist / aspect_ratio - 0.5;
      
      const sample = (x, y) => {
        const gx = (Math.floor(x) % width + width) % width;
        const gy = (Math.floor(y) % height + height) % height;
        return window.pheromone_grid[gy * width + gx];
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
      p.angle += (Math.random() > 0.5 ? 1 : -1) * turn_speed;
    } else if (v_left > v_right) {
      p.angle -= turn_speed;
    } else if (v_right > v_left) {
      p.angle += turn_speed;
    }

    // Motor jitter
    p.angle += (Math.random() - 0.5) * 0.15;
    
    p.x += Math.cos(p.angle) * move_speed;
    p.y += Math.sin(p.angle) * move_speed / aspect_ratio;

    p.x = (p.x + width) % width;
    p.y = (p.y + height) % height;
  }

  // Particle Step: Pass 2 (Deposit)
  // This separation ensures no particle senses a trail dropped by another in the same frame
  for (let i = 0; i < window.particles.length; i++) {
    const p = window.particles[i];
    const gx = Math.floor(p.x);
    const gy = Math.floor(p.y);
    const idx = gy * width + gx;
    window.pheromone_grid[idx] += 0.1 * (1.0 - window.pheromone_grid[idx]);
  }

  // Render
  let text = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = window.pheromone_grid[y * width + x];
      if (val < 0.001) {
        text += " ";
      } else {
        const char_idx = Math.floor(val * (density_chars.length - 5));
        text += density_chars[char_idx];
      }
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
