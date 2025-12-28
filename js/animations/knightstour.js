import {
  first_frame_tooltip,
  tooltip,
  setCharAtIndex,
  get_canvas_index,
} from "../utils.js";

export default (this_animation) => {
  first_frame_tooltip("knight's tour");

  const check_solvability = (r, c, sr, sc) => {
    const min = Math.min(r, c);
    const max = Math.max(r, c);
    if (min === 1 && max > 1) return false;
    if (min === 2) return false;
    if (min === 3 && max === 3) return false;
    if (min === 4 && max === 4) return false;

    if ((r * c) % 2 !== 0) {
      if ((sr + sc) % 2 !== 0) return false;
    }
    return true;
  };

  // Init state if needed
  if (
    !window.knight_state ||
    window.knight_state.rows !== window.rows ||
    window.knight_state.cols !== window.columns
  ) {
    let startR = Math.floor(Math.random() * window.rows);
    let startC = Math.floor(Math.random() * window.columns);

    // Parity check for odd-sized boards: must start on majority color
    if ((window.rows * window.columns) % 2 !== 0) {
      if ((startR + startC) % 2 !== 0) {
        // We are on an Odd square, need Even.
        // Move to any valid neighbor (neighbors always flip parity).
        if (startC < window.columns - 1) startC++;
        else if (startC > 0) startC--;
        else if (startR < window.rows - 1) startR++;
        else if (startR > 0) startR--;
      }
    }

    const startFlatIdx = startR * window.columns + startC;

    // Initialize visited grid
    const visited = new Int8Array(window.rows * window.columns).fill(0);
    visited[startFlatIdx] = 1;

    const startIdx = get_canvas_index(window.columns, startC, startR);
    setCharAtIndex(window.canvas, startIdx, "K");

    const isSolvable = check_solvability(
      window.rows,
      window.columns,
      startR,
      startC,
    );
    if (!isSolvable) {
      tooltip("knight's tour (impossible)");
    }

    window.knight_state = {
      rows: window.rows,
      cols: window.columns,
      visited: visited,
      r: startR,
      c: startC,
      total_cells: window.rows * window.columns,
      path: [{ r: startR, c: startC, flatIdx: startFlatIdx }],
      mode: "forward", // 'forward' or 'rewind'
      complete: false,
      failed: false,
      solvable: isSolvable,
      // Exponential backoff state
      current_backoff: 1,
      max_depth: 1,
      rewind_until: 0,
    };
  }

  const state = window.knight_state;
  const moves = [
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
  ];

  // Run multiple steps per frame for speed
  for (let k = 0; k < window.animation_speed_multiplier; k++) {
    if (state.complete) return;

    if (state.mode === "forward") {
      // Check for completion
      if (state.path.length === state.total_cells) {
        state.complete = true;
        const idx = get_canvas_index(state.cols, state.c, state.r);
        setCharAtIndex(window.canvas, idx, "o"); // Success!
        return;
      }

      // Generate candidates
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
        // STUCK! Calculate exponential backoff.
        state.mode = "rewind";

        state.rewind_until = Math.max(
          1,
          state.path.length - state.current_backoff,
        );

        state.current_backoff *= 2;

        continue; // Start rewinding next iteration
      }

      // Warnsdorff's Rule: Sort by degree (number of onward moves)
      for (let cand of candidates) {
        let degree = 0;
        for (let i = 0; i < moves.length; i++) {
          const nr = cand.r + moves[i][0];
          const nc = cand.c + moves[i][1];
          if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
            const flatIdx = nr * state.cols + nc;
            if (state.visited[flatIdx] === 0) {
              degree++;
            }
          }
        }
        cand.degree = degree;
      }

      // Sort ascending by degree with randomized tie-breaking
      candidates.sort(
        (a, b) =>
          a.degree + Math.random() * 0.5 - (b.degree + Math.random() * 0.5),
      );

      // Pick the best candidate
      const move = candidates[0];

      // Visuals: Old Head -> Trail
      const oldIdx = get_canvas_index(state.cols, state.c, state.r);
      setCharAtIndex(window.canvas, oldIdx, "o");

      // Update State
      state.r = move.r;
      state.c = move.c;
      state.visited[move.flatIdx] = 1;
      state.path.push(move);

      // Exponential Backoff Reset Check
      if (state.path.length > state.max_depth) {
        state.max_depth = state.path.length;
        state.current_backoff = 1;
      }

      // Visuals: New Head -> Knight
      const newIdx = get_canvas_index(state.cols, state.c, state.r);
      setCharAtIndex(window.canvas, newIdx, "K");
    } else if (state.mode === "rewind") {
      // Rewind logic
      if (state.path.length > state.rewind_until) {
        // Pop current head
        const current = state.path.pop();

        // Clear visuals for current
        const currentIdx = get_canvas_index(state.cols, current.c, current.r);
        setCharAtIndex(window.canvas, currentIdx, ".");

        // Mark unvisited
        state.visited[current.flatIdx] = 0;

        // Restore K to previous
        const prev = state.path[state.path.length - 1];
        state.r = prev.r;
        state.c = prev.c;
        const prevIdx = get_canvas_index(state.cols, prev.c, prev.r);
        setCharAtIndex(window.canvas, prevIdx, "K");
      } else {
        // Reached target rewind point.
        state.mode = "forward";
        if (state.path.length === 1) {
          state.current_backoff = 1;
          state.max_depth = 1;
        }
      }
    }
  }

  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
