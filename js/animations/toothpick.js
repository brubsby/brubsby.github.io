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
      
      window.sub_animation_size = 5;
      let mode = window.sub_animation_index;
      if (isNaN(mode) || mode < 0 || mode >= 5) {
          mode = Math.floor(Math.random() * 5);
      }
  
      let startVertical = Math.random() < 0.5;
      let startR, startC;
  
      if (mode === 0) {
          startVertical = true;
          startR = Math.floor(rows / 2);
          startC = Math.floor(cols / 2);
      } else if (mode === 1) {
          startVertical = false;
          startR = Math.floor(rows / 2);
          startC = Math.floor(cols / 2);
      } else if (mode === 2 || mode === 3) {
          const edge = Math.floor(Math.random() * 4); // 0:T, 1:B, 2:L, 3:R
          const atEdgeCenter = (mode === 2);
          if (edge === 0) { // Top
              startR = 0;
              startC = atEdgeCenter ? Math.floor(cols / 2) : Math.floor(Math.random() * cols);
          } else if (edge === 1) { // Bottom
              startR = rows - 1;
              startC = atEdgeCenter ? Math.floor(cols / 2) : Math.floor(Math.random() * cols);
          } else if (edge === 2) { // Left
              startR = atEdgeCenter ? Math.floor(rows / 2) : Math.floor(Math.random() * rows);
              startC = 0;
          } else { // Right
              startR = atEdgeCenter ? Math.floor(rows / 2) : Math.floor(Math.random() * rows);
              startC = cols - 1;
          }
      } else { // mode 4
          startR = Math.floor(Math.random() * rows);
          startC = Math.floor(Math.random() * cols);
      }
      
      const grid = new Uint8Array(rows * cols).fill(0);
      
      // Initial toothpick: Vertical or Horizontal
      const initialTips = [];
      
      if (startVertical) {
          // Draw initial vertical toothpick
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
          // Add tips (grow horizontally)
          initialTips.push({ r: startR - Kv, c: startC, dir: 1 }); 
          initialTips.push({ r: startR + Kv, c: startC, dir: 1 }); 
          
      } else {
          // Draw initial horizontal toothpick
          for (let c = startC - Kh; c <= startC + Kh; c++) {
             if (c >= 0 && c < cols) {
                 const idx = startR * cols + c;
                 let mask = 0;
                 if (c > startC - Kh) mask |= 4; // Left connection
                 if (c < startC + Kh) mask |= 8; // Right connection
                 
                 grid[idx] |= mask;
                 setCharAtIndex(window.canvas, get_canvas_index(cols, c, startR), CHAR_MAP[grid[idx]]);
             }
          }
          // Add tips (grow vertically)
          initialTips.push({ r: startR, c: startC - Kh, dir: 0 }); 
          initialTips.push({ r: startR, c: startC + Kh, dir: 0 }); 
      }
  
      window.toothpick_state = {
        window_rows: rows,
        rows: rows,
        cols: cols,
        grid: grid,
        tips: initialTips,
        generation: 1,
        toothpick_count: 1,
        mode: mode
      };
      
          const modes_short = ['v', 'h', 'ec', 'er', 'r'];
          tooltip(`toothpick<br>m=${modes_short[mode]} g=1 c=1`, mode);
        }
      
        const state = window.toothpick_state;  if (state.tips.length > 0) {
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
      
      const modes_short = ['v', 'h', 'ec', 'er', 'r'];
      tooltip(`toothpick<br>m=${modes_short[state.mode]} g=${state.generation} c=${state.toothpick_count}`, state.mode);
  }

  // Next frame
  setTimeout(() => {
    requestAnimationFrame(this_animation.bind(null, this_animation));
  }, 100); 
};

