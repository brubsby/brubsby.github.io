import { tooltip, density_chars, sq_dist, find_n_nearest, get_bresenham_line_points } from "../utils.js";

export default (this_animation) => {
  if (window.frame_count === 0) {
    window.sub_animation_size = 16;
    let mode_idx;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < 16) {
      mode_idx = window.sub_animation_index;
    } else {
      mode_idx = Math.floor(Math.random() * 16);
    }

    // Independent bitmask for settings
    // Bit 0: start_all (1: true, 0: false)
    // Bit 1: moving (1: true, 0: false)
    // Bit 2: show_seeds (1: true, 0: false)
    // Bit 3: style (1: 'edge', 0: 'area')
    
    const start_all = (mode_idx & 1) !== 0;
    const moving = (mode_idx & 2) !== 0;
    const show_seeds = (mode_idx & 4) !== 0;
    const style = (mode_idx & 8) !== 0 ? 'edge' : 'area';

    // Seed variables
    const num_seeds = 10 + Math.floor(Math.random() * 15);
    const seeds = [];
    
    // Choose character set for area mode
    let char_mode = 'rand';
    if (style === 'area') {
      const char_rand = Math.random();
      if (char_rand < 0.33) char_mode = 'alnum';
      else if (char_rand < 0.66) char_mode = 'rand';
      else char_mode = 'order';
    }

    const alnum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < num_seeds; i++) {
      let char;
      if (char_mode === 'alnum') {
        char = alnum[i % alnum.length];
      } else if (char_mode === 'order') {
        char = density_chars[i % density_chars.length];
      } else {
        char = density_chars[Math.floor(Math.random() * density_chars.length)];
      }

      seeds.push({
        pos: [Math.random() * window.columns, Math.random() * window.rows],
        vel: [(Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4],
        active: start_all,
        char: char
      });
    }

    window.voronoi = {
      mode_idx,
      seeds,
      char_mode,
      start_all,
      moving,
      show_seeds,
      style,
      max_seeds: num_seeds,
      active_count: start_all ? num_seeds : 0
    };

    const char_suffix = style === 'area' ? ` c=${char_mode}` : '';
    const tt = `voronoi<br>m=${mode_idx} s=${start_all?'all':'grad'} v=${moving?'mov':'stat'} d=${show_seeds?'on':'off'} r=${style}${char_suffix}`;
    tooltip(tt, mode_idx);
  }

  const v = window.voronoi;

  // Update seeds
  if (!v.start_all && v.active_count < v.max_seeds && window.frame_count % 30 === 0) {
    v.seeds[v.active_count].active = true;
    v.active_count++;
  }

  if (v.moving) {
    v.seeds.forEach(s => {
      if (!s.active) return;
      s.pos[0] += s.vel[0];
      s.pos[1] += s.vel[1];

      // Bounce with specular reflection
      if (s.pos[0] < 0) {
        s.pos[0] = 0;
        s.vel[0] *= -1;
      } else if (s.pos[0] >= window.columns) {
        s.pos[0] = window.columns - 1;
        s.vel[0] *= -1;
      }

      if (s.pos[1] < 0) {
        s.pos[1] = 0;
        s.vel[1] *= -1;
      } else if (s.pos[1] >= window.rows) {
        s.pos[1] = window.rows - 1;
        s.vel[1] *= -1;
      }
    });
  }

  const active_seeds = v.seeds.filter(s => s.active);

  // Initialize grid with background
  const grid = [];
  for (let r = 0; r < window.rows; r++) {
    grid[r] = new Array(window.columns).fill(".");
  }

  if (active_seeds.length > 0) {
    if (v.style === 'edge') {
      // Analytical Voronoi Edges + Bresenham
      for (let i = 0; i < active_seeds.length; i++) {
        for (let j = i + 1; j < active_seeds.length; j++) {
          const s1 = active_seeds[i].pos;
          const s2 = active_seeds[j].pos;

          // Midpoint and Direction
          const mx = (s1[0] + s2[0]) / 2;
          const my = (s1[1] + s2[1]) / 2;
          const dx = s2[0] - s1[0];
          const dy = s2[1] - s1[1];
          // Perpendicular vector
          const vx = -dy;
          const vy = dx;

          // Clip the line P(t) = M + tV against all other seeds
          let t_min = -2000, t_max = 2000;

          // Clip against other seeds
          for (let k = 0; k < active_seeds.length; k++) {
            if (k === i || k === j) continue;
            const s3 = active_seeds[k].pos;
            
            const d31x = s3[0] - s1[0];
            const d31y = s3[1] - s1[1];
            const B = (s3[0]*s3[0] + s3[1]*s3[1] - s1[0]*s1[0] - s1[1]*s1[1]) / 2 - (mx * d31x + my * d31y);
            const A = vx * d31x + vy * d31y;

            if (A > 0) {
              t_max = Math.min(t_max, B / A);
            } else if (A < 0) {
              t_min = Math.max(t_min, B / A);
            } else if (B < 0) {
              t_min = 1; t_max = -1; // No edge
            }
          }

          // Clip against screen boundaries
          const x0 = 0, x1 = window.columns - 1;
          const y0 = 0, y1 = window.rows - 1;

          if (vx !== 0) {
            const t1 = (x0 - mx) / vx;
            const t2 = (x1 - mx) / vx;
            t_min = Math.max(t_min, Math.min(t1, t2));
            t_max = Math.min(t_max, Math.max(t1, t2));
          } else if (mx < x0 || mx > x1) {
            t_min = 1; t_max = -1;
          }

          if (vy !== 0) {
            const t1 = (y0 - my) / vy;
            const t2 = (y1 - my) / vy;
            t_min = Math.max(t_min, Math.min(t1, t2));
            t_max = Math.min(t_max, Math.max(t1, t2));
          } else if (my < y0 || my > y1) {
            t_min = 1; t_max = -1;
          }

          if (t_max >= t_min) {
            const p1 = [Math.round(mx + t_min * vx), Math.round(my + t_min * vy)];
            const p2 = [Math.round(mx + t_max * vx), Math.round(my + t_max * vy)];
            const line_pts = get_bresenham_line_points([p1, p2]);
            for (let pt of line_pts) {
              const rr = pt[1];
              const cc = pt[0];
              if (rr >= 0 && rr < window.rows && cc >= 0 && cc < window.columns) {
                grid[rr][cc] = "o";
              }
            }
          }
        }
      }
    } else {
      // Area mode (Grid-based for simplicity and consistency)
      for (let r = 0; r < window.rows; r++) {
        for (let c = 0; c < window.columns; c++) {
          const nearest = find_n_nearest([c, r], active_seeds.map(s => s.pos), 1);
          grid[r][c] = active_seeds[nearest[0].idx].char;
        }
      }
    }

    // Always draw seeds if requested
    if (v.show_seeds) {
      for (let s of active_seeds) {
        const r = Math.round(s.pos[1]);
        const c = Math.round(s.pos[0]);
        if (r >= 0 && r < window.rows && c >= 0 && c < window.columns) {
          grid[r][c] = "o";
        }
      }
    }
  }

  // Render text
  let text = "";
  for (let r = 0; r < window.rows; r++) {
    text += grid[r].join("") + "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 30);
};
