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

    window.cluster_count = 0;
    if (window.dla_mode === "dot") {
      // Seed in the center
      const midR = Math.floor(window.rows / 2);
      const midC = Math.floor(window.columns / 2);
      window.grid[midR][midC] = 1;
      window.cluster_count = 1;
      tooltip("dla s=dot", mode_index);
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
      const edgeNames = ["top", "bottom", "left", "right"];
      tooltip(`dla s=line e=${edgeNames[edge]}`, mode_index);
    }
    
    // Active particles for DLA
    window.particles = [];
  }

  const MAX_PARTICLES = Math.min(200, Math.floor(window.columns * window.rows / 20));
  const STEPS_PER_FRAME = 1 * window.animation_speed_multiplier;

  // Add particles if needed
  const availableEdges = [];
  {
    let topReached = false; for (let c = 0; c < window.columns; c++) if (window.grid[0][c]) { topReached = true; break; }
    if (!topReached) availableEdges.push(0);
    let bottomReached = false; for (let c = 0; c < window.columns; c++) if (window.grid[window.rows - 1][c]) { bottomReached = true; break; }
    if (!bottomReached) availableEdges.push(1);
    let leftReached = false; for (let r = 0; r < window.rows; r++) if (window.grid[r][0]) { leftReached = true; break; }
    if (!leftReached) availableEdges.push(2);
    let rightReached = false; for (let r = 0; r < window.rows; r++) if (window.grid[r][window.columns - 1]) { rightReached = true; break; }
    if (!rightReached) availableEdges.push(3);
  }

  while (window.particles.length < MAX_PARTICLES && window.cluster_count < window.rows * window.columns * 0.2 && availableEdges.length > 0) {
    const edge = availableEdges[Math.floor(Math.random() * availableEdges.length)];
    let r, c;
    if (edge === 0) { r = 0; c = Math.floor(Math.random() * window.columns); }
    else if (edge === 1) { r = window.rows - 1; c = Math.floor(Math.random() * window.columns); }
    else if (edge === 2) { c = 0; r = Math.floor(Math.random() * window.rows); }
    else { c = window.columns - 1; r = Math.floor(Math.random() * window.rows); }
    window.particles.push({ r, c });
  }

  if (availableEdges.length === 0) {
    window.particles = [];
  }

  // Move particles
  for (let s = 0; s < STEPS_PER_FRAME; s++) {
    for (let pIdx = window.particles.length - 1; pIdx >= 0; pIdx--) {
      const p = window.particles[pIdx];
      
      // Random walk (8-way)
      const dr = Math.floor(Math.random() * 3) - 1;
      const dc = Math.floor(Math.random() * 3) - 1;
      
      if (dr === 0 && dc === 0) continue;

      const nextR = p.r + dr;
      const nextC = p.c + dc;
      
      if (nextR >= 0 && nextR < window.rows && nextC >= 0 && nextC < window.columns) {
        // Check if stuck (neighbors in cluster)
        let stuck = false;
        for (let tr = -1; tr <= 1; tr++) {
          for (let tc = -1; tc <= 1; tc++) {
            if (tr === 0 && tc === 0) continue;
            const nr = nextR + tr;
            const nc = nextC + tc;
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
          window.grid[nextR][nextC] = 1;
          window.cluster_count++;
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
    if (window.particles.length === 0) break;
  }

  // Render
  let text = "";
  // Create a quick lookup for particle positions
  const particleMap = new Uint8Array(window.rows * window.columns);
  for (const p of window.particles) {
    particleMap[p.r * window.columns + p.c] = 1;
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
  
  if (window.cluster_count < window.rows * window.columns * 0.2) {
    setTimeout(() => this_animation(this_animation), 20);
  }
}
