import { tooltip, density_chars } from "../utils.js";

export default (this_animation) => {
  if (window.frame_count === 0) {
    window.sub_animation_size = 3;
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 3) {
      mode_idx = window.sub_animation_index;
    } else {
      const rand = Math.random();
      if (rand < 0.4) {
        mode_idx = 0; // circles (2/5)
      } else if (rand < 0.6) {
        mode_idx = 1; // lines (1/5)
      } else {
        mode_idx = 2; // hybrid (2/5)
      }
    }

    const f1 = 0.05 + Math.random() * 0.1;
    const f2 = f1 * (0.8 + Math.random() * 0.4);
    
    window.moire = {
      mode_idx: mode_idx,
      f1: f1,
      f2: f2,
      t: 0,
      speed: 0.01 + Math.random() * 0.02,
      angle1: Math.random() * Math.PI * 2,
      angle2: Math.random() * Math.PI * 2,
      rot_speed1: (Math.random() - 0.5) * 0.02,
      rot_speed2: (Math.random() - 0.5) * 0.02
    };

    const names = ["circles", "lines", "hybrid"];
    tooltip(`moire<br>${names[mode_idx]}`, mode_idx);
  }

  const m = window.moire;
  m.t += m.speed;
  m.angle1 += m.rot_speed1;
  m.angle2 += m.rot_speed2;

  // Orbiting centers for modes that need them
  const c1x = window.columns / 2 + Math.cos(m.t) * (window.columns * 0.25);
  const c1y = window.rows / 2 + Math.sin(m.t * 0.8) * (window.rows * 0.25);
  const c2x = window.columns / 2 + Math.sin(m.t * 1.2) * (window.columns * 0.25);
  const c2y = window.rows / 2 + Math.cos(m.t * 0.9) * (window.rows * 0.25);

  let text = "";
  const cw = window.char_width;
  const ch = window.char_height;

  // Pre-calculate cos/sin for line modes
  const cos1 = Math.cos(m.angle1), sin1 = Math.sin(m.angle1);
  const cos2 = Math.cos(m.angle2), sin2 = Math.sin(m.angle2);

  for (let r = 0; r < window.rows; r++) {
    for (let c = 0; c < window.columns; c++) {
      let v1, v2;
      const px = c * cw;
      const py = r * ch;

      // Pattern 1
      if (m.mode_idx === 1) { // Lines
        v1 = Math.sin((px * cos1 + py * sin1) * m.f1);
      } else { // Circles (Mode 0 and 2)
        const dx = px - c1x * cw;
        const dy = py - c1y * ch;
        v1 = Math.sin(Math.sqrt(dx * dx + dy * dy) * m.f1);
      }

      // Pattern 2
      if (m.mode_idx === 0) { // Circles
        const dx = px - c2x * cw;
        const dy = py - c2y * ch;
        v2 = Math.sin(Math.sqrt(dx * dx + dy * dy) * m.f2);
      } else { // Lines (Mode 1 and 2)
        v2 = Math.sin((px * cos2 + py * sin2) * m.f2);
      }

      let val = Math.abs(v1 + v2) / 2;
      const char_idx = Math.floor(val * (density_chars.length - 1));
      text += density_chars[char_idx];
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
};