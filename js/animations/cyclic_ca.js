import { ObjectSampler, tooltip } from '../utils.js';

export default (this_animation) => {
    if (window.frame_count === 0) {
        // --- Initialization ---
        var configs = new ObjectSampler()
            .put({ states: 4, range: 1, threshold: 1, type: "M", name: "Demon 4" }, 1)
            .put({ states: 8, range: 1, threshold: 1, type: "M", name: "Demon 8" }, 1)
            .put({ states: 14, range: 1, threshold: 1, type: "M", name: "Demon 14" }, 1)
            .put({ states: 5, range: 1, threshold: 1, type: "N", name: "VonNeumann 5" }, 1)
            .put({ states: 3, range: 1, threshold: 1, type: "M", name: "RockPaperScissors" }, 0)
            .put({ states: 8, range: 2, threshold: 3, type: "M", name: "Turbulent" }, 1)
            .put({ states: 10, range: 3, threshold: 5, type: "M", name: "Range 3" }, 1);

        window.sub_animation_size = configs.size();
        
        if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < configs.size()) {
            window.cca_config = configs.get_index(window.sub_animation_index);
        } else {
            window.cca_config = configs.sample();
        }
        
        var config_index = configs.index_of(window.cca_config);
        tooltip(`cyclic ca<br>${window.cca_config.name}<br>N=${window.cca_config.states} R=${window.cca_config.range} T=${window.cca_config.threshold}`, config_index);
        
        // Init Grid
        window.cca_grid = new Uint8Array(window.columns * window.rows);
        for(let i=0; i<window.cca_grid.length; i++) {
            window.cca_grid[i] = Math.floor(Math.random() * window.cca_config.states);
        }
        
        // Pre-calculate neighbor offsets
        window.cca_offsets = [];
        const r = window.cca_config.range;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (window.cca_config.type === "N" && Math.abs(dx) + Math.abs(dy) > r) continue;
                window.cca_offsets.push([dx, dy]);
            }
        }
        
        // Palette
        const gradient = " .:-=+*#%@";
        window.cca_palette = [];
        for(let i=0; i<window.cca_config.states; i++) {
            // Map 0..N-1 to gradient indices
            let idx = Math.floor((i / (window.cca_config.states - 1)) * (gradient.length - 1));
            window.cca_palette.push(gradient[idx]);
        }
    }
    
    // --- Update ---
    const rows = window.rows;
    const cols = window.columns;
    const grid = window.cca_grid;
    const next_grid = new Uint8Array(grid.length);
    const N = window.cca_config.states;
    const thresh = window.cca_config.threshold;
    const offsets = window.cca_offsets;
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const idx = y * cols + x;
            const state = grid[idx];
            const next_state = (state + 1) % N;
            let count = 0;
            
            for (let i = 0; i < offsets.length; i++) {
                let off = offsets[i];
                // Wrap
                let nx = (x + off[0] + cols) % cols;
                let ny = (y + off[1] + rows) % rows;
                
                if (grid[ny * cols + nx] === next_state) {
                    count++;
                    if (count >= thresh) break; // Optimization
                }
            }
            
            if (count >= thresh) {
                next_grid[idx] = next_state;
            } else {
                next_grid[idx] = state;
            }
        }
    }
    
    window.cca_grid = next_grid;
    
    // --- Render ---
    let out = "";
    const palette = window.cca_palette;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            out += palette[next_grid[y * cols + x]];
        }
        out += "\n";
    }
    window.canvas.text(out);

    window.frame_count++;
    setTimeout(this_animation.bind(null, this_animation), 100);
};
