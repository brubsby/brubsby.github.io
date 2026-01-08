import { first_frame_tooltip, init_flat_index_list, get_coords } from '../utils.js';

export default (this_animation) => {
    if (window.frame_count === 0) {
        window.grid = [];
        window.wall_indices = [];
        window.bottom_touched = false;
        window.water_count = 0;
        window.removal_accumulator = 0;
        
        // Initialize with all walls
        for (let r = 0; r < window.rows; r++) {
            window.grid[r] = new Int8Array(window.columns);
            for (let c = 0; c < window.columns; c++) {
                window.grid[r][c] = 1; // 1 = wall (.)
            }
        }
        
        // Use flat_index_list helper to get all cell indices for random removal
        init_flat_index_list(window.rows, window.columns);
        window.wall_indices = [...window.flat_index_list];
        window.total_cells = window.wall_indices.length;

        // Shuffle wall indices for random removal
        for (let i = window.wall_indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [window.wall_indices[i], window.wall_indices[j]] = [window.wall_indices[j], window.wall_indices[i]];
        }

        window.active_water = [];
        first_frame_tooltip("percolation");
    }

    // Determine removal rate based on progress and state
    let progress = (window.total_cells - window.wall_indices.length) / window.total_cells;
    let water_progress = window.water_count / window.total_cells;
    
    let rate_factor = 0.5; // Base Phase 2 rate
    if (window.bottom_touched && water_progress > 0.666) {
        // Phase 3: Transition from 0.5 to 6.0
        let t = Math.min(1, (water_progress - 0.666) / (1.0 - 0.666));
        rate_factor = 0.5 + (6.0 - 0.5) * t;
    } else if (progress < 0.33) {
        // Phase 1: Transition from 3.0 down to 0.5
        rate_factor = 3.0 + (0.5 - 3.0) * (progress / 0.33);
    }

    // Use an accumulator for smooth discrete removals at any rate
    window.removal_accumulator += rate_factor * window.animation_speed_multiplier;
    let removal_count = Math.floor(window.removal_accumulator);
    window.removal_accumulator -= removal_count;

    // 1. Remove walls
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    for (let n = 0; n < removal_count; n++) {
        if (window.wall_indices.length > 0) {
            const index = window.wall_indices.pop();
            const [c, r] = get_coords(window.columns, index);
            if (r < window.rows && c < window.columns) {
                window.grid[r][c] = 0; // 0 = empty ( )
                
                // Check if this new hole should immediately be water
                let neighbor_water = (r === 0);
                if (!neighbor_water) {
                    for (const [dr, dc] of directions) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < window.rows && nc >= 0 && nc < window.columns) {
                            if (window.grid[nr][nc] === 2) {
                                neighbor_water = true;
                                break;
                            }
                        }
                    }
                }
                
                if (neighbor_water) {
                    window.grid[r][c] = 2;
                    window.water_count++;
                    window.active_water.push([r, c]);
                    if (r === window.rows - 1) window.bottom_touched = true;
                }
            }
        }
    }

    // 2. Percolate water
    if (window.active_water.length > 0) {
        const next_water = [];
        for (const [r, c] of window.active_water) {
            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < window.rows && nc >= 0 && nc < window.columns) {
                    if (window.grid[nr][nc] === 0) {
                        window.grid[nr][nc] = 2;
                        window.water_count++;
                        next_water.push([nr, nc]);
                        if (nr === window.rows - 1) window.bottom_touched = true;
                    }
                }
            }
        }
        window.active_water = next_water;
    }

    // 3. Render
    let output = "";
    let walls_left = false;
    for (let r = 0; r < window.rows; r++) {
        for (let c = 0; c < window.columns; c++) {
            const val = window.grid[r][c];
            if (val === 1) {
                output += ".";
                walls_left = true;
            } else if (val === 2) {
                output += "o";
            } else {
                output += " ";
            }
        }
        output += "\n";
    }
    window.canvas.text(output);

    // End condition
    if (!walls_left && window.active_water.length === 0) {
        return; 
    }

    window.frame_count++;
    setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
}

