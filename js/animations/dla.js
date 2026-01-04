import { tooltip, ObjectSampler } from '../utils.js';

export default function dla(this_animation) {
  if (window.frame_count === 0) {
    window.grid = [];
    for (let r = 0; r < window.rows; r++) {
      window.grid[r] = new Uint8Array(window.columns);
    }

    window.dla_modes = new ObjectSampler()
      .put("dot", 1)
      .put("line", 1);
    
    window.sub_animation_size = window.dla_modes.size();
    let mode;
    let mode_index;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < window.dla_modes.size()) {
      mode_index = window.sub_animation_index;
      mode = window.dla_modes.get_index(mode_index);
    } else {
      mode = window.dla_modes.sample();
      mode_index = window.dla_modes.index_of(mode);
    }
    window.dla_mode = mode;
    window.dla_toroidal = Math.random() < 0.5;
    window.dla_particle_visible = Math.random() < 0.5;
    window.dla_spawn_mode = Math.random() < 0.5 ? 0 : 1; // 0 for circle, 1 for random (dot mode only)

    window.cluster_count = 0;
    if (window.dla_mode === "dot") {
      // Seed in the center
      const midR = Math.floor(window.rows / 2);
      const midC = Math.floor(window.columns / 2);
      window.grid[midR][midC] = 1;
      window.cluster_count = 1;
      tooltip(`dla<br>m=0 s=${window.dla_spawn_mode} t=${window.dla_toroidal ? 1 : 0} p=${window.dla_particle_visible ? 1 : 0}`, mode_index);
    } else if (window.dla_mode === "line") {
      // Seed an entire edge
      const edge = Math.floor(Math.random() * 4);
      window.initial_edge = edge;
      if (edge === 0) { // Top
        for (let c = 0; c < window.columns; c++) { window.grid[0][c] = 1; window.cluster_count++; }
      } else if (edge === 1) { // Bottom
        for (let c = 0; c < window.columns; c++) { window.grid[window.rows - 1][c] = 1; window.cluster_count++; }
      } else if (edge === 2) { // Left
        for (let r = 0; r < window.rows; r++) { window.grid[r][0] = 1; window.cluster_count++; }
      } else { // Right
        for (let r = 0; r < window.rows; r++) { window.grid[r][window.columns - 1] = 1; window.cluster_count++; }
      }
      tooltip(`dla<br>m=1 e=${edge} t=${window.dla_toroidal ? 1 : 0} p=${window.dla_particle_visible ? 1 : 0}`, mode_index);
    }
    
    // Active particles for DLA
    window.particles = [];
  }

  const MAX_PARTICLES = window.dla_particle_visible ? Math.min(200, Math.floor(window.columns * window.rows / 20)) : 1;
  const STEPS_PER_FRAME = window.dla_particle_visible ? 1 * window.animation_speed_multiplier : 100 * window.animation_speed_multiplier;

  // Add particles if needed
  let stopSpawning = false;
  if (window.dla_mode === "line") {
    const opposite = [1, 0, 3, 2][window.initial_edge];
    if (opposite === 0) { for (let c = 0; c < window.columns; c++) if (window.grid[0][c]) { stopSpawning = true; break; } }
    else if (opposite === 1) { for (let c = 0; c < window.columns; c++) if (window.grid[window.rows - 1][c]) { stopSpawning = true; break; } }
    else if (opposite === 2) { for (let r = 0; r < window.rows; r++) if (window.grid[r][0]) { stopSpawning = true; break; } }
    else if (opposite === 3) { for (let r = 0; r < window.rows; r++) if (window.grid[r][window.columns - 1]) { stopSpawning = true; break; } }
  } else if (window.dla_mode === "dot") {
    for (let c = 0; c < window.columns; c++) if (window.grid[0][c] || window.grid[window.rows - 1][c]) { stopSpawning = true; break; }
    if (!stopSpawning) {
      for (let r = 0; r < window.rows; r++) if (window.grid[r][0] || window.grid[r][window.columns - 1]) { stopSpawning = true; break; }
    }
  }

  while (window.particles.length < MAX_PARTICLES && window.cluster_count < window.rows * window.columns * 0.2 && !stopSpawning) {
    let r, c;
    if (window.dla_mode === "dot") {
      if (window.dla_spawn_mode === 0) { // Circle spawn
        const theta = Math.random() * 2 * Math.PI;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        const midR = (window.rows - 1) / 2;
        const midC = (window.columns - 1) / 2;
        
        const t_top = (0 - midR) / sinT;
        const t_bottom = (window.rows - 1 - midR) / sinT;
        const t_left = (0 - midC) / cosT;
        const t_right = (window.columns - 1 - midC) / cosT;
        
        const t_candidates = [];
        if (t_top > 0) t_candidates.push(t_top);
        if (t_bottom > 0) t_candidates.push(t_bottom);
        if (t_left > 0) t_candidates.push(t_left);
        if (t_right > 0) t_candidates.push(t_right);
        
        const t = Math.min(...t_candidates);
        
        r = Math.max(0, Math.min(window.rows - 1, Math.round(midR + t * sinT)));
        c = Math.max(0, Math.min(window.columns - 1, Math.round(midC + t * cosT)));
      } else { // Random grid spawn
        r = Math.floor(Math.random() * window.rows);
        c = Math.floor(Math.random() * window.columns);
      }
    } else {
      // For line mode (toroidal or not), spawn ONLY across from the initial edge
      const opposite = [1, 0, 3, 2][window.initial_edge];
      if (opposite === 0) { r = 0; c = Math.floor(Math.random() * window.columns); }
      else if (opposite === 1) { r = window.rows - 1; c = Math.floor(Math.random() * window.columns); }
      else if (opposite === 2) { c = 0; r = Math.floor(Math.random() * window.rows); }
      else { c = window.columns - 1; r = Math.floor(Math.random() * window.rows); }
    }

    if (!window.grid[r][c]) {
      window.particles.push({ r, c });
    }
    if (window.particles.length >= MAX_PARTICLES) break;
    // Avoid infinite loops if grid is very full
    if (Math.random() < 0.01) break;
  }

  // Move particles
  let clusterChanged = false;
  for (let s = 0; s < STEPS_PER_FRAME; s++) {
    for (let pIdx = window.particles.length - 1; pIdx >= 0; pIdx--) {
      const p = window.particles[pIdx];
      
      // Random walk (8-way)
      const dr = Math.floor(Math.random() * 3) - 1;
      const dc = Math.floor(Math.random() * 3) - 1;
      
      if (dr === 0 && dc === 0) continue;

      let nextR = p.r + dr;
      let nextC = p.c + dc;
      
      if (window.dla_toroidal) {
        nextR = (nextR + window.rows) % window.rows;
        nextC = (nextC + window.columns) % window.columns;
      }

      if (nextR >= 0 && nextR < window.rows && nextC >= 0 && nextC < window.columns) {
        // Check if stuck (neighbors in cluster)
        let stuck = false;
        for (let tr = -1; tr <= 1; tr++) {
          for (let tc = -1; tc <= 1; tc++) {
            if (tr === 0 && tc === 0) continue;
            let nr = nextR + tr;
            let nc = nextC + tc;
            if (window.dla_toroidal) {
              // For line mode, disable crystallization across the border opposite the line
              if (window.dla_mode === "line") {
                const isHorizontalLine = window.initial_edge <= 1; // Top or Bottom
                if (isHorizontalLine && (nr < 0 || nr >= window.rows)) continue;
                if (!isHorizontalLine && (nc < 0 || nc >= window.columns)) continue;
              }
              nr = (nr + window.rows) % window.rows;
              nc = (nc + window.columns) % window.columns;
            }
            if (nr >= 0 && nr < window.rows && nc >= 0 && nc < window.columns) {
              if (window.grid[nr][nc]) {
                stuck = true;
                break;
              }
            }
          }
          if (stuck) break;
        }
        
        if (stuck) {
          if (!window.grid[nextR][nextC]) {
            window.grid[nextR][nextC] = 1;
            window.cluster_count++;
            clusterChanged = true;
          }
          window.particles.splice(pIdx, 1);
        } else {
          p.r = nextR;
          p.c = nextC;
        }
      } else {
        // Out of bounds, kill and it will respawn
        window.particles.splice(pIdx, 1);
      }
    }
    if (window.particles.length === 0) {
      if (!window.dla_particle_visible && !stopSpawning) {
        // For p=0, if we're not visible and we need to spawn more, do it immediately to keep simulation moving
        // But we need to break out to check stopSpawning logic again soon
        break; 
      }
      if (window.particles.length === 0) break;
    }
    // For p=0, if a cluster changed, we want to render it, so we stop the steps early
    if (!window.dla_particle_visible && clusterChanged) break;
  }

  // Render
  if (window.dla_particle_visible || clusterChanged || window.frame_count === 0) {
    let text = "";
    // Create a quick lookup for particle positions
    const particleMap = new Uint8Array(window.rows * window.columns);
    if (window.dla_particle_visible) {
      for (const p of window.particles) {
        particleMap[p.r * window.columns + p.c] = 1;
      }
    }

    for (let r = 0; r < window.rows; r++) {
      for (let c = 0; c < window.columns; c++) {
        if (window.grid[r][c] || particleMap[r * window.columns + c]) {
          text += "o";
        } else {
          text += ".";
        }
      }
      text += "\n";
    }

    window.canvas.text(text);
    window.frame_count++;
  }
  
  if (window.particles.length > 0 || !stopSpawning) {
    setTimeout(() => this_animation(this_animation), window.dla_particle_visible ? 20 : 0);
  }
}
