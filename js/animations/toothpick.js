import {
  tooltip,
  setCharAtIndex,
  get_canvas_index
} from "../utils.js";

export default (this_animation) => {
  // Config
  const Kv = 1; // Vertical half-length (Length = 3)
  const Kh = 2; // Horizontal half-length (Length = 5)
  // With char aspect ratio ~1:2 (W:H), 
  // V-length 3 chars = 3 units height
  // H-length 5 chars = 2.5 units width (roughly)
  
  // Bitmask: 1=Up, 2=Down, 4=Left, 8=Right
  const CHAR_MAP = [
    ' ', '│', '│', '│', 
    '─', '┘', '┐', '┤', 
    '─', '└', '┌', '├', 
    '─', '┴', '┬', '┼'
  ];

  // Initialize state
  if (
    !window.toothpick_state ||
    window.toothpick_state.window_rows !== window.rows ||
    window.toothpick_state.cols !== window.columns
  ) {
    const rows = window.rows;
    const cols = window.columns;
    
    const startR = Math.floor(rows / 2);
    const startC = Math.floor(cols / 2);
    
    const grid = new Uint8Array(rows * cols).fill(0);
    
    // Initial toothpick: Vertical
    // Centered at startR, startC
    // Points: (startR - Kv, startC) to (startR + Kv, startC)
    
    const initialTips = [];
    
    // Draw initial vertical toothpick
    // Vertical line connects Up (1) and Down (2)
    // Top tip (startR - Kv): Connected Down (2)
    // Bottom tip (startR + Kv): Connected Up (1)
    // Middle: Connected Up and Down (3)
    
    for (let r = startR - Kv; r <= startR + Kv; r++) {
       if (r >= 0 && r < rows) {
           const idx = r * cols + startC;
           let mask = 0;
           if (r > startR - Kv) mask |= 1; // Up connection
           if (r < startR + Kv) mask |= 2; // Down connection
           
           grid[idx] |= mask;
           setCharAtIndex(window.canvas, get_canvas_index(cols, startC, r), CHAR_MAP[grid[idx]]);
       }
    }
    
    // Add tips
    // dir: 0 for Vertical (meaning this tip is end of a V-line, needs H-growth), 1 for Horizontal
    initialTips.push({ r: startR - Kv, c: startC, dir: 1 }); 
    initialTips.push({ r: startR + Kv, c: startC, dir: 1 }); 

    window.toothpick_state = {
      window_rows: rows,
      rows: rows,
      cols: cols,
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
          let K = 0;
          if (dir === 1) { // Growth is Horizontal
              dc = 1;
              K = Kh;
          } else { // Growth is Vertical
              dr = 1;
              K = Kv;
          }

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
          let dr = 0; let dc = 0; let K = 0;
          
          if (dir === 1) { // Growth is Horizontal
              dc = 1;
              K = Kh;
          } else { // Growth is Vertical
              dr = 1;
              K = Kv;
          }
          
          for (let k = -K; k <= K; k++) {
              const nr = r + k * dr;
              const nc = c + k * dc;
              
              if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
                  const idx = nr * state.cols + nc;
                  
                  let mask = 0;
                  if (dir === 1) { // Horizontal line
                      if (k > -K) mask |= 4; // Left connection
                      if (k < K)  mask |= 8; // Right connection
                  } else { // Vertical line
                      if (k > -K) mask |= 1; // Up connection
                      if (k < K)  mask |= 2; // Down connection
                  }
                  
                  state.grid[idx] |= mask;
                  setCharAtIndex(window.canvas, get_canvas_index(state.cols, nc, nr), CHAR_MAP[state.grid[idx]]);
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

