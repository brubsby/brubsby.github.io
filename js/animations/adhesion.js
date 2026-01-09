import { tooltip } from '../utils.js';

export default (this_animation) => {
    const width = window.columns;
    const height = window.rows;

    // Configuration
    const T = 2.0; // Temperature for Metropolis algorithm (fluctuation)
    const ATTEMPTS_PER_FRAME = width * height * 0.1; // Speed of simulation
    
    if (window.frame_count === 0) {
        // Randomly choose number of cell types (2 to 5)
        window.num_types = 2 + Math.floor(Math.random() * 4);
        window.chars = [".", "1", "2", "3", "4", "5", "6", "7", "8", "9"].slice(0, window.num_types + 1);

        // Seed random cells
        let mode_name = "";
        if (Math.random() < 0.5) {
            mode_name = "orb";
            // Mode 1: Center blob (Ellipse: width = 2 * height)
            const cx = width / 2;
            const cy = height / 2;
            const ry = Math.min(width / 2, height) * 0.4;
            const rx = ry * 2;
            
            window.grid = new Uint8Array(width * height);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (((x - cx) / rx)**2 + ((y - cy) / ry)**2 < 1) {
                        window.grid[y * width + x] = 1 + Math.floor(Math.random() * window.num_types);
                    } else {
                        window.grid[y * width + x] = 0;
                    }
                }
            }
        } else {
            mode_name = "random";
            // Mode 2: Full grid random
            window.grid = new Uint8Array(width * height);
            const density = 0.4 + Math.random() * 0.4; // 40-80% filled
            for (let i = 0; i < width * height; i++) {
                if (Math.random() < density) {
                    window.grid[i] = 1 + Math.floor(Math.random() * window.num_types);
                } else {
                    window.grid[i] = 0;
                }
            }
        }

        tooltip(`adhesion<br>${mode_name} n=${window.num_types}`);

        // Procedurally generate Adhesion Matrix J
        window.J = Array.from({ length: window.num_types + 1 }, () => new Float32Array(window.num_types + 1));
        for (let i = 1; i <= window.num_types; i++) {
            const tension = 20 - ((i - 1) / (window.num_types - 1)) * 12;
            window.J[0][i] = window.J[i][0] = tension;
            window.J[i][i] = 2;
            for (let j = 1; j <= window.num_types; j++) {
                if (i !== j) {
                    window.J[i][j] = 10 + Math.abs(i - j) * 1; 
                }
            }
        }
    }

    const grid = window.grid;
    const J = window.J;
    const chars = window.chars;

    // Helper to get neighbor (wrapping)
    const get_idx = (x, y) => {
        return ((y + height) % height) * width + ((x + width) % width);
    };

    // Calculate energy contribution of a single cell at (x,y) with its neighbors
    // We only need half the neighbors to avoid double counting if summing total,
    // but for local delta, we check all neighbors of the changing cell.
    const calc_local_energy = (x, y, self_type) => {
        let e = 0;
        // 8-neighbor Moore neighborhood
        const neighbors = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];

        for (let n of neighbors) {
            const nx = x + n[0];
            const ny = y + n[1];
            // Handle boundaries (Toroidal or Wall? Let's do Toroidal for simplicity, or Wall?)
            // JS modulo for negative numbers handling:
            const neighbors_idx = get_idx(nx, ny);
            const neighbor_type = grid[neighbors_idx];
            e += J[self_type][neighbor_type];
        }
        return e;
    };

    // Monte Carlo Steps - Skip on frame 0 so we see the initial state
    if (window.frame_count > 0) {
        for (let k = 0; k < ATTEMPTS_PER_FRAME; k++) {
        // Pick a random cell location
        const x1 = Math.floor(Math.random() * width);
        const y1 = Math.floor(Math.random() * height);
        
        // Pick a random neighbor of that cell to swap with
        const neighbors = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        const n_off = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Wrapping coordinates
        const x2 = (x1 + n_off[0] + width) % width;
        const y2 = (y1 + n_off[1] + height) % height;

        const idx1 = y1 * width + x1;
        const idx2 = y2 * width + x2;

        const type1 = grid[idx1];
        const type2 = grid[idx2];

        if (type1 === type2) continue; // No point swapping same types

        // Calculate Energy Change (Delta H)
        // We only need to check the local neighborhood of the two cells.
        // E_initial = Energy(cell1 at pos1) + Energy(cell2 at pos2)
        // E_final   = Energy(cell2 at pos1) + Energy(cell1 at pos2)
        // Note: The bond *between* cell1 and cell2 (if they are adjacent) is counted in both,
        // but since we swap them, the bond type 1-2 remains 2-1 (same energy).
        // So we can just sum neighbors of pos1 (excluding pos2) and neighbors of pos2 (excluding pos1).
        // Or simpler: Just calc full local energy for both pos before and after. 
        // The bond between them is counted twice (once for pos1, once for pos2), but consistent.

        const E_initial = calc_local_energy(x1, y1, type1) + calc_local_energy(x2, y2, type2);
        const E_final   = calc_local_energy(x1, y1, type2) + calc_local_energy(x2, y2, type1);
        
        const delta_E = E_final - E_initial;

        // Metropolis Criterion
        // If delta_E < 0 (Energy decreases), always accept.
        // If delta_E > 0, accept with prob e^(-delta_E / T)
        if (delta_E <= 0 || Math.random() < Math.exp(-delta_E / T)) {
            // Swap
            grid[idx1] = type2;
            grid[idx2] = type1;
        }
    }
}

    // Render
    let text = "";
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            text += chars[grid[y * width + x]];
        }
        text += "\n";
    }

    window.canvas.text(text);
    window.frame_count++;
    requestAnimationFrame(this_animation.bind(null, this_animation));
};
