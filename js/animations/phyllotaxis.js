import { tooltip, density_chars } from "../utils.js";

export default (this_animation) => {
  const aspect = window.char_width / window.char_height;
  
  if (window.frame_count === 0) {
    window.sub_animation_size = 16;
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 16) {
      mode_idx = window.sub_animation_index;
    } else {
      mode_idx = Math.floor(Math.random() * 16);
    }

    const target_r = Math.sqrt(Math.pow(window.columns, 2) + Math.pow(window.rows / aspect, 2)) * 0.55;
    const max_n = Math.floor(target_r * 40);
    const c = target_r / Math.sqrt(max_n);

    window.phyllotaxis = {
      n: 0,
      base_c: c,
      golden_angle: Math.PI * (3 - Math.sqrt(5)),
      max_n: max_n,
      t: 0,
      target_r: target_r,
      // Use bits of mode_idx to enable dimensions
      do_angle: (mode_idx & 1) !== 0,
      do_scale: (mode_idx & 2) !== 0,
      do_exp:   (mode_idx & 4) !== 0,
      do_flow:  (mode_idx & 8) !== 0,
      // Random speeds for each
      speed_angle: Math.random(),
      speed_scale: Math.random(),
      speed_exp: Math.random(),
      speed_flow: Math.random(),
      // Random amplitudes for each
      amp_angle: Math.random() * 0.001,
      amp_scale: Math.random() * 0.1,
      amp_exp: Math.random() * 0.1,
      amp_flow: Math.random() * 4
    };

    // Construct tooltip based on active dimensions
    let active = [];
    if (window.phyllotaxis.do_angle) active.push("angle");
    if (window.phyllotaxis.do_scale) active.push("scale");
    if (window.phyllotaxis.do_exp) active.push("exp");
    if (window.phyllotaxis.do_flow) active.push("flow");
    
    const desc = active.length > 0 ? active.join("+") : "static";
    tooltip(`phyllotaxis<br>${desc}`, mode_idx);
  }

  const p = window.phyllotaxis;
  const centerX = window.columns / 2;
  const centerY = window.rows / 2;
  
  p.t += 0.02; // Global time

  // Calculate perturbed parameters
  const current_angle = p.golden_angle + (p.do_angle ? Math.sin(p.t * p.speed_angle) * p.amp_angle : 0);
  const current_c = p.base_c * (p.do_scale ? (1 + Math.sin(p.t * p.speed_scale) * p.amp_scale) : 1);
  const current_exp = 0.5 + (p.do_exp ? Math.sin(p.t * p.speed_exp) * p.amp_exp : 0);
  const flow_offset = p.do_flow ? Math.sin(p.t * p.speed_flow) * p.amp_flow : 0;

  // Dynamically calculate max_n needed to reach target_r with current parameters
  // target_r = current_c * Math.pow(max_n, current_exp)
  // max_n = Math.pow(target_r / current_c, 1 / current_exp)
  const required_max_n = Math.ceil(Math.pow(p.target_r / current_c, 1 / current_exp));
  
  const grid = Array.from({ length: window.rows }, () => new Array(window.columns).fill("."));

  // Growth: increment visible florets
  if (p.n < required_max_n) {
    p.n += Math.max(1, Math.floor(window.animation_speed_multiplier));
  }
  
  const limit = Math.min(p.n, required_max_n);
  for (let i = 0; i < limit; i++) {
    // Apply perturbations to Vogel's formula
    const n_val = Math.max(0, i + flow_offset);
    const r = current_c * Math.pow(n_val, current_exp);
    const theta = i * current_angle;
    
    const x = Math.round(centerX + r * Math.cos(theta));
    const y = Math.round(centerY + r * Math.sin(theta) * aspect);
    
    if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
      grid[y][x] = "o";
    }
  }

  let text = "";
  for (let r = 0; r < window.rows; r++) {
    text += grid[r].join("") + "\n";
  }
  window.canvas.text(text);

  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};