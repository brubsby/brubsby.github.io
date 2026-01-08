import {
  tooltip,
  setCharAtIndex,
  get_canvas_index,
} from "../utils.js";

export default (this_animation) => {
  // Initialize state
  if (
    !window.saw_state ||
    window.saw_state.rows !== window.rows ||
    window.saw_state.cols !== window.columns
  ) {
    const startR = Math.floor(window.rows / 2);
    const startC = Math.floor(window.columns / 2);
    const startFlatIdx = startR * window.columns + startC;

    const visited = new Int8Array(window.rows * window.columns).fill(0);
    visited[startFlatIdx] = 1;

    // Visual start
    const idx = get_canvas_index(window.columns, startC, startR);
    setCharAtIndex(window.canvas, idx, "o");

    window.saw_state = {
      rows: window.rows,
      cols: window.columns,
      visited: visited,
      r: startR,
      c: startC,
      path: [{ r: startR, c: startC, flatIdx: startFlatIdx }],
      history: [],
      mode: "walking", // 'walking' or 'rewinding'
      last_length: 0,
      min_length: Infinity,
      max_length: -Infinity,
    };
  }

  const state = window.saw_state;
  const moves = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  for (let k = 0; k < window.animation_speed_multiplier; k++) {
    if (state.mode === "walking") {
      const candidates = [];
      for (let i = 0; i < moves.length; i++) {
        const nr = state.r + moves[i][0];
        const nc = state.c + moves[i][1];

        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          const flatIdx = nr * state.cols + nc;
          if (state.visited[flatIdx] === 0) {
            candidates.push({ r: nr, c: nc, flatIdx: flatIdx });
          }
        }
      }

      if (candidates.length === 0) {
        // TRAPPED!
        state.mode = "rewinding";
        state.last_length = state.path.length;
        state.history.push(state.last_length);
        if (state.last_length < state.min_length) state.min_length = state.last_length;
        if (state.last_length > state.max_length) state.max_length = state.last_length;

        const meanVal = state.history.reduce((a, b) => a + b, 0) / state.history.length;
        const meanStr = meanVal.toFixed(1).padStart(4, "0");
        const minStr = state.min_length.toString().padStart(2, "0");
        const maxStr = state.max_length.toString().padStart(3, "0");

        tooltip(`saw<br>${meanStr} [${minStr}–${maxStr}]`);
        continue;
      }

      // Pick random move
      const move = candidates[Math.floor(Math.random() * candidates.length)];
      state.r = move.r;
      state.c = move.c;
      state.visited[move.flatIdx] = 1;
      state.path.push(move);

      const idx = get_canvas_index(state.cols, state.c, state.r);
      setCharAtIndex(window.canvas, idx, "o");
    } else if (state.mode === "rewinding") {
      if (state.path.length > 0) {
        const current = state.path.pop();
        state.visited[current.flatIdx] = 0;
        const idx = get_canvas_index(state.cols, current.c, current.r);
        setCharAtIndex(window.canvas, idx, ".");

        if (state.path.length > 0) {
          const prev = state.path[state.path.length - 1];
          state.r = prev.r;
          state.c = prev.c;
        }
      } else {
        // Reset to middle
        state.mode = "walking";
        state.r = Math.floor(state.rows / 2);
        state.c = Math.floor(state.cols / 2);
        const startFlatIdx = state.r * state.cols + state.c;
        state.visited[startFlatIdx] = 1;
        state.path = [{ r: state.r, c: state.c, flatIdx: startFlatIdx }];

        const idx = get_canvas_index(state.cols, state.c, state.r);
        setCharAtIndex(window.canvas, idx, "o");
      }
    }
  }

  window.frame_count++;
  setTimeout(() => {
    requestAnimationFrame(this_animation.bind(null, this_animation));
  }, 20); 
};
