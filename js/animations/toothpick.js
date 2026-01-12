import {
  tooltip,
  setHalfPixel,
} from "../utils.js";

export default (this_animation) => {
  // Config
  const K = 2; // Half-length of toothpick.
  // With double vertical resolution (setHalfPixel), pixels are roughly square.
  // H-line length = 2K+1 columns.
  // V-line length = 2K+1 half-rows.
  // Visual physical length is roughly equal.
  
  const HALF_PIXEL_RULES = ['.', '▄', '▀', '█'];

  // Initialize state
  if (
    !window.toothpick_state ||
    window.toothpick_state.window_rows !== window.rows ||
    window.toothpick_state.cols !== window.columns
  ) {
    // Virtual rows = window.rows * 2
    const vRows = window.rows * 2;
    const vCols = window.columns;
    
    const startR = Math.floor(vRows / 2);
    const startC = Math.floor(vCols / 2);
    
    const grid = new Uint8Array(vRows * vCols).fill(0);
    
    // Initial toothpick: Vertical
    // Centered at startR, startC
    // Points: (startR - K, startC) to (startR + K, startC)
    
    const initialTips = [];
    
    // Draw initial vertical toothpick
    for (let r = startR - K; r <= startR + K; r++) {
       if (r >= 0 && r < vRows) {
           const idx = r * vCols + startC;
           grid[idx] |= 1; 
           setHalfPixel(window.canvas, startC, r, true, HALF_PIXEL_RULES);
       }
    }
    
    // Add tips
    // dir: 0 for Vertical (meaning this tip is end of a V-line, needs H-growth), 1 for Horizontal
    initialTips.push({ r: startR - K, c: startC, dir: 1 }); 
    initialTips.push({ r: startR + K, c: startC, dir: 1 }); 

    window.toothpick_state = {
      window_rows: window.rows,
      rows: vRows,
      cols: vCols,
      grid: grid,
      tips: initialTips,
      generation: 1,
      toothpick_count: 1
    };
    
    tooltip(`toothpick sequence<br>gen: 1`);
  }

  const state = window.toothpick_state;
  
  if (state.tips.length > 0) {
      const nextGenCandidates = new Map(); // key: "r,c" -> {r, c, dir, count, oldCollision}
      
      // 1. Analyze all tips and potential new endpoints
      for (const tip of state.tips) {
          const r = tip.r;
          const c = tip.c;
          const dir = tip.dir; 
          
          let dr = 0; 
          let dc = 0;
          if (dir === 1) dc = 1; else dr = 1;

          // Check if endpoints collide with OLD grid
          const endpoints = [
             { r: r - K * dr, c: c - K * dc },
             { r: r + K * dr, c: c + K * dc }
          ];
          
          for (const ep of endpoints) {
              if (ep.r < 0 || ep.r >= state.rows || ep.c < 0 || ep.c >= state.cols) continue;
              
              const idx = ep.r * state.cols + ep.c;
              const oldCollision = state.grid[idx] !== 0;
              
              const key = `${ep.r},${ep.c}`;
              if (!nextGenCandidates.has(key)) {
                  nextGenCandidates.set(key, { 
                      r: ep.r, c: ep.c, dir: 1 - dir, 
                      count: 0, 
                      oldCollision: oldCollision 
                  });
              }
              const cand = nextGenCandidates.get(key);
              cand.count++;
              if (oldCollision) cand.oldCollision = true;
          }
      }

      // 2. Draw lines (visual only, and update grid for NEXT gen collision checks)
      for (const tip of state.tips) {
          const r = tip.r;
          const c = tip.c;
          const dir = tip.dir;
          let dr = 0; let dc = 0;
          if (dir === 1) dc = 1; else dr = 1;
          
          for (let k = -K; k <= K; k++) {
              const nr = r + k * dr;
              const nc = c + k * dc;
              
              if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
                  const idx = nr * state.cols + nc;
                  const isVert = (dir === 0);
                  const mask = isVert ? 1 : 2;
                  
                  state.grid[idx] |= mask;
                  
                  setHalfPixel(window.canvas, nc, nr, true, HALF_PIXEL_RULES);
              }
          }
          state.toothpick_count++;
      }
      
      // 3. Filter candidates for next generation
      const validTips = [];
      for (const cand of nextGenCandidates.values()) {
          // Rule: Must be unique (count === 1) AND not colliding with old structure
          if (cand.count === 1 && !cand.oldCollision) {
              validTips.push({ r: cand.r, c: cand.c, dir: cand.dir });
          }
      }
      
      state.tips = validTips;
      state.generation++;
      
      tooltip(`toothpick sequence<br>gen: ${state.generation}<br>cnt: ${state.toothpick_count}`);
  }

  // Next frame
  setTimeout(() => {
    requestAnimationFrame(this_animation.bind(null, this_animation));
  }, 100); 
};
