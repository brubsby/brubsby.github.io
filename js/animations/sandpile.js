import { ObjectSampler, tooltip } from '../utils.js';

export default (this_animation) => {
    if (window.frame_count == 0) {
        window.modes = new ObjectSampler()
            .put("fractal", 1)
            .put("random", 1);
        
        window.display_modes = new ObjectSampler()
            .put({name: "0123", chars: ["0", "1", "2", "3"]}, 1)
            .put({name: ".o.o", chars: [".", "o", ".", "o"]}, 1)
            .put({name: "-:÷+", chars: ["-", ":", "÷", "+"]}, 1);

        window.sub_animation_size = window.modes.size() * window.display_modes.size();

        if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < window.sub_animation_size) {
            let mode_idx = Math.floor(window.sub_animation_index / window.display_modes.size());
            let display_idx = window.sub_animation_index % window.display_modes.size();
            window.mode = window.modes.get_index(mode_idx);
            window.display_mode = window.display_modes.get_index(display_idx);
        } else {
            window.mode = window.modes.sample();
            window.display_mode = window.display_modes.sample();
            window.sub_animation_index = window.modes.index_of(window.mode) * window.display_modes.size() + window.display_modes.index_of(window.display_mode);
        }
        
        tooltip(`sandpile<br>${window.mode}<br>${window.display_mode.name}`, window.sub_animation_index);

        window.sandpile_grid = Array(window.rows).fill(null).map(() => Array(window.columns).fill(0));
        window.has_toppled = Array(window.rows).fill(null).map(() => Array(window.columns).fill(false));
    }

    let steps_this_frame = 1 + Math.floor(window.frame_count / 100);
    for (let s = 0; s < steps_this_frame; s++) {
        // Drop sand
        if (window.mode === "fractal") {
            let mid_r = Math.floor(window.rows / 2);
            let mid_c = Math.floor(window.columns / 2);
            
            if ((window.rows * window.columns) % 2 === 0) {
                if (window.columns % 2 === 0) {
                    window.sandpile_grid[mid_r][mid_c - 1]++;
                    window.sandpile_grid[mid_r][mid_c]++;
                } else if (window.rows % 2 === 0) {
                    window.sandpile_grid[mid_r - 1][mid_c]++;
                    window.sandpile_grid[mid_r][mid_c]++;
                } else {
                    window.sandpile_grid[mid_r][mid_c]++;
                }
            } else {
                window.sandpile_grid[mid_r][mid_c]++;
            }
        } else {
            let r = Math.floor(Math.random() * window.rows);
            let c = Math.floor(Math.random() * window.columns);
            window.sandpile_grid[r][c]++;
        }

        // Topple stable
        let to_topple = [];
        for (let r = 0; r < window.rows; r++) {
            for (let c = 0; c < window.columns; c++) {
                if (window.sandpile_grid[r][c] >= 4) {
                    to_topple.push([r, c]);
                }
            }
        }

        let safety_limit = 10000; 
        while (to_topple.length > 0 && safety_limit > 0) {
            let [r, c] = to_topple.shift();
            if (window.sandpile_grid[r][c] < 4) continue;
            
            let num_topples = Math.floor(window.sandpile_grid[r][c] / 4);
            window.sandpile_grid[r][c] %= 4;
            window.has_toppled[r][c] = true;
            safety_limit--;

            let neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
            for (let [nr, nc] of neighbors) {
                if (nr >= 0 && nr < window.rows && nc >= 0 && nc < window.columns) {
                    window.sandpile_grid[nr][nc] += num_topples;
                    if (window.sandpile_grid[nr][nc] >= 4) {
                        to_topple.push([nr, nc]);
                    }
                }
            }
        }
    }

    // Render
    let text = "";
    let chars = window.display_mode.chars;
    for (let r = 0; r < window.rows; r++) {
        for (let c = 0; c < window.columns; c++) {
            let val = window.sandpile_grid[r][c];
            if (val === 0) {
                if (window.has_toppled[r][c]) {
                    text += chars[0];
                } else {
                    text += ".";
                }
            } else {
                text += chars[val] || val.toString();
            }
        }
        text += "\n";
    }
    window.canvas.text(text);

    window.frame_count++;
    setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
};
