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
        
        for (let i = 0; i < window.bml_grid.length; i++) {
            if (Math.random() < density) {
                // Split 50/50 between East and South moving cars
                window.bml_grid[i] = Math.random() < 0.5 ? 1 : 2;
            } else {
                window.bml_grid[i] = 0;
            }
        }
        
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
    const move_east = window.frame_count % 2 === 0; // Let's start with East on 0 (even) for simplicity, or swap.
    // Actually, usually it alternates. Let's say Even=East, Odd=South.
    
    const next_grid = new Int8Array(window.bml_grid); // Copy current state
    const rows = window.rows;
    const cols = window.columns;
    
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
