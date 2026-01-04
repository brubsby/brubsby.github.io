import { tooltip } from '../utils.js';

export default function dla(this_animation) {
  if (window.frame_count === 0) {
    window.grid = [];
    for (let r = 0; r < window.rows; r++) {
      window.grid[r] = new Uint8Array(window.columns);
    }
    // Seed in the center
    const midR = Math.floor(window.rows / 2);
    const midC = Math.floor(window.columns / 2);
    window.grid[midR][midC] = 1;
    window.cluster_count = 1;
    
    // Active particles for DLA
    window.particles = [];
    tooltip("dla");
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
