import { tooltip, density_chars } from "../utils.js";

export default (this_animation) => {
  const w = window.columns;
  const h = window.rows;
  const palette = density_chars;
  const max_idx = palette.length - 1;

  const threshold = 2.5;
  const sqrt_threshold = Math.sqrt(threshold);

  if (window.frame_count === 0) {
    const ball_count = Math.max(2, Math.floor((w * h) / 800));
    const min_dim = Math.min(w, h);
    window.metaballs = [];
    for (let i = 0; i < ball_count; i++) {
      const r = min_dim * (0.3 + Math.random() * 0.3);
      const eff_r_x = r / sqrt_threshold;
      const eff_r_y = eff_r_x * (window.char_width / window.char_height);
      window.metaballs.push({
        x: eff_r_x + Math.random() * (w - 1 - 2 * eff_r_x),
        y: eff_r_y + Math.random() * (h - 1 - 2 * eff_r_y),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: r
      });
    }
    tooltip("metaballs", 0);
  }

  // Update ball positions
  for (let ball of window.metaballs) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    const eff_r_x = ball.r / sqrt_threshold;
    const eff_r_y = eff_r_x * (window.char_width / window.char_height);

    if (ball.x < eff_r_x) {
      ball.vx *= -1;
      ball.x = 2 * eff_r_x - ball.x;
    } else if (ball.x >= w - 1 - eff_r_x) {
      ball.vx *= -1;
      ball.x = 2 * (w - 1 - eff_r_x) - ball.x;
    }

    if (ball.y < eff_r_y) {
      ball.vy *= -1;
      ball.y = 2 * eff_r_y - ball.y;
    } else if (ball.y >= h - 1 - eff_r_y) {
      ball.vy *= -1;
      ball.y = 2 * (h - 1 - eff_r_y) - ball.y;
    }
  }

  let text = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let ball of window.metaballs) {
        // Calculate distance in pixel-space for better circularity
        const dx = (x - ball.x) * window.char_width;
        const dy = (y - ball.y) * window.char_height;
        const d2 = dx * dx + dy * dy;
        
        // Influence radius also in pixel-space
        const r_pixels = ball.r * window.char_width;
        if (d2 > 0) {
          sum += (r_pixels * r_pixels) / d2;
        } else {
          sum += 1000;
        }
      }

      // Use a simple binary threshold for rendering
      // Values above the threshold are "inside" the metaballs
      text += (sum >= threshold) ? "o" : ".";
    }
    text += "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
