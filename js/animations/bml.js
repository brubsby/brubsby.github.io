import {
    first_frame_tooltip
} from '../utils.js';

export default (this_animation) => {
    if (window.frame_count == 0) {
        
        // Initialize state
        // 0: Empty (.), 1: East (>), 2: South (v)
        window.bml_grid = new Int8Array(window.rows * window.columns);
        
        // Sample density twice and pick the one closer to the critical phase transition
        // Critical density increases with aspect ratio (M/N or N/M).
        const aspect_ratio = Math.max(window.rows, window.columns) / Math.min(window.rows, window.columns);
        // Heuristic: start at 0.32 for square, increase for rectangular
        let target = 0.32 + (aspect_ratio - 1) * 0.05;
        target = Math.min(target, 0.45); // Cap target, though jam can occur higher

        // Widen sampling range to [0.20, 0.60] to ensure we see both phases eventually
        const s1 = 0.20 + Math.random() * 0.40;
        const s2 = 0.20 + Math.random() * 0.40;
        const density = Math.abs(s1 - target) < Math.abs(s2 - target) ? s1 : s2;
        
        window.bml_target_density = density;
        
        // Start empty for "feed in" effect
        // 0: Empty (.), 1: East (>), 2: South (v)
        // Grid is already zero-initialized by new Int8Array
        
        first_frame_tooltip(`bml<br>d=${density.toFixed(3)}`);
        
        window.bml_chars = ['.', '>', 'v'];
    }

    // Render
    let full_text = "";
    for (let r = 0; r < window.rows; r++) {
        for (let c = 0; c < window.columns; c++) {
            full_text += window.bml_chars[window.bml_grid[r * window.columns + c]];
        }
        full_text += "\n";
    }
    window.canvas.text(full_text);

    // Update Logic
    // Odd steps: Move East (>)
    // Even steps: Move South (v)
    const move_east = window.frame_count % 2 === 0; 
    
    const next_grid = new Int8Array(window.bml_grid); // Copy current state
    const rows = window.rows;
    const cols = window.columns;

    // Feed in new cars if below density
    // Count current cars first (optimization: maybe maintain count? but grid is small enough)
    let current_cars = 0;
    for(let i=0; i<window.bml_grid.length; i++) {
        if(window.bml_grid[i] !== 0) current_cars++;
    }
    const current_density = current_cars / window.bml_grid.length;

    if (current_density < window.bml_target_density) {
        // Injection Phase
        // If moving East, inject at Left Edge (Col 0)
        // If moving South, inject at Top Edge (Row 0)
        const injection_prob = 0.1; 

        if (move_east) {
            for (let r = 0; r < rows; r++) {
                const idx = r * cols + 0;
                // Only inject if empty
                if (window.bml_grid[idx] === 0 && Math.random() < injection_prob) {
                    // We modify window.bml_grid directly so it can move immediately in this step
                    // OR we modify next_grid? 
                    // To be safe and let them "enter" naturally, let's modify bml_grid
                    // so the movement logic picks them up.
                    window.bml_grid[idx] = 1;
                }
            }
        } else {
            for (let c = 0; c < cols; c++) {
                const idx = 0 * cols + c;
                if (window.bml_grid[idx] === 0 && Math.random() < injection_prob) {
                    window.bml_grid[idx] = 2;
                }
            }
        }
    }
    
    if (move_east) {
        // Move East-moving cars (1)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                if (window.bml_grid[idx] === 1) {
                    const next_c = (c + 1) % cols;
                    const target_idx = r * cols + next_c;
                    
                    if (window.bml_grid[target_idx] === 0) {
                        next_grid[idx] = 0;
                        next_grid[target_idx] = 1;
                    }
                }
            }
        }
    } else {
        // Move South-moving cars (2)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                if (window.bml_grid[idx] === 2) {
                    const next_r = (r + 1) % rows;
                    const target_idx = next_r * cols + c;
                    
                    if (window.bml_grid[target_idx] === 0) {
                        next_grid[idx] = 0;
                        next_grid[target_idx] = 2;
                    }
                }
            }
        }
    }

    window.bml_grid = next_grid;
    window.frame_count++;
    
    requestAnimationFrame(this_animation.bind(null, this_animation));
}
