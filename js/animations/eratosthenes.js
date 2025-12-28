import {
  first_frame_tooltip,
  setCharAtIndex,
  getCharAtIndex,
} from "../utils.js";

export default (this_animation) => {
  first_frame_tooltip("eratosthenes");

  const total_cells = window.rows * window.columns;

  if (
    !window.eratosthenes_state ||
    window.eratosthenes_state.total_cells !== total_cells
  ) {
    window.eratosthenes_state = {
      total_cells: total_cells,
      p: 2,
      multiple: 4,
      mode: "marking",
      search_index: 3,
      initialized: false,
    };
  }

  const state = window.eratosthenes_state;

  const map_n_to_index = (n) => {
    const row = Math.floor(n / window.columns);
    const col = n % window.columns;
    return row * (window.columns + 1) + col;
  };

  if (!state.initialized) {
    if (total_cells > 2) setCharAtIndex(window.canvas, map_n_to_index(2), "o");
    state.initialized = true;
  }

  for (let k = 0; k < window.animation_speed_multiplier; k++) {
    if (state.mode === "marking") {
      if (state.multiple < state.total_cells) {
        let idx = map_n_to_index(state.multiple);
        let currentChar = getCharAtIndex(window.canvas, idx);

        if (currentChar === ".") {
          setCharAtIndex(window.canvas, idx, "x");
        }
        state.multiple += state.p;
      } else {
        state.mode = "searching";
        state.search_index = state.p + 1;
      }
    } else if (state.mode === "searching") {
      if (state.search_index < state.total_cells) {
        let idx = map_n_to_index(state.search_index);
        let currentChar = getCharAtIndex(window.canvas, idx);

        if (currentChar === ".") {
          setCharAtIndex(window.canvas, idx, "o");
          state.p = state.search_index;
          state.multiple = state.p * 2;
          state.mode = "marking";
        } else {
          if (currentChar === "x") {
            setCharAtIndex(window.canvas, idx, ".");
          }
          state.search_index++;
        }
      } else {
        return;
      }
    }
  }

  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
