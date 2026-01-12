import {
  tooltip,
  setCharAtIndex,
  get_canvas_index,
} from "../utils.js";

export default (this_animation) => {
  // Config
  const K = 2; // Half-length of toothpick. Total length = 2*K + 1
  const VAL_INCREMENT = 10;
  
  // Initialize state
  if (
    !window.toothpick_state ||
    window.toothpick_state.rows !== window.rows ||
    window.toothpick_state.cols !== window.columns
  ) {
    const startR = Math.floor(window.rows / 2);
    const startC = Math.floor(window.columns / 2);
    
    const grid = new Uint8Array(window.rows * window.columns).fill(0);
    const CHAR_V = "|";
    const CHAR_H = "-";
    const CHAR_CROSS = "+";
    
    // Initial toothpick: Vertical
    // Centered at startR, startC
    // Points: (startR - K, startC) to (startR + K, startC)
    // Tips: Top and Bottom
    
    const initialTips = [];
    
    // Draw initial vertical toothpick
    for (let r = startR - K; r <= startR + K; r++) {
       if (r >= 0 && r < window.rows) {
           const idx = r * window.columns + startC;
           // 1 for vertical, 2 for horizontal. 3 for cross?
           // Actually just store direction mask: 1=V, 2=H
           grid[idx] |= 1; 
           setCharAtIndex(window.canvas, get_canvas_index(window.columns, startC, r), CHAR_V);
       }
    }
    
    // Add tips
    // Tip format: { r, c, dir }
    // dir: 0 for Vertical (meaning this tip is end of a V-line, needs H-growth), 1 for Horizontal
    // Wait, if it's a V-line, growth must be H.
    initialTips.push({ r: startR - K, c: startC, dir: 1 }); // Top tip, needs H growth
    initialTips.push({ r: startR + K, c: startC, dir: 1 }); // Bottom tip, needs H growth

    window.toothpick_state = {
      rows: window.rows,
      cols: window.columns,
      grid: grid,
      tips: initialTips,
      generation: 1,
      toothpick_count: 1,
      chars: { v: CHAR_V, h: CHAR_H, x: CHAR_CROSS }
    };
    
    tooltip(`toothpick sequence<br>gen: 1`);
  }

  const state = window.toothpick_state;
  const chars = state.chars;
  
  // Process one generation per frame (or slowed down)
  // Since it grows exponentially, maybe limit speed?
  // Let's do 1 generation every few frames?
  // Or just 1 gen per call.
  
  if (state.tips.length > 0) {
      const nextGenCandidates = new Map(); // key: "r,c" -> {r, c, dir, count, oldCollision}
      
      // 1. Analyze all tips and potential new endpoints
      for (const tip of state.tips) {
          const r = tip.r;
          const c = tip.c;
          const dir = tip.dir; // 1 = Horizontal, 0 = Vertical
          
          let dr = 0; 
          let dc = 0;
          if (dir === 1) dc = 1; else dr = 1;

          // Check if endpoints collide with OLD grid
          // Tips at +/- K
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
                  
                  // Update canvas
                  let val = state.grid[idx];
                  let char = " ";
                  if (val === 3) char = chars.x;
                  else if (val === 2) char = chars.h;
                  else if (val === 1) char = chars.v;
                  
                  setCharAtIndex(window.canvas, get_canvas_index(state.cols, nc, nr), char);
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
  // Slow down slightly to make it visible
  setTimeout(() => {
    requestAnimationFrame(this_animation.bind(null, this_animation));
  }, 100); 
};
