import { tooltip, ObjectSampler, init_simplex_noise, get_simplex_noise_at } from '../utils.js';

export default async (this_animation) => {
    if (window.frame_count == 0) {
        window.universe = new Array(window.rows * window.columns).fill(0).map(() => Math.random() < 0.5 ? 1 : -1);
        window.sub_animation_size = 2;

        let temps = new ObjectSampler()
            .put(2.269, 1)
            .put(() => 1 + Math.random() * 2, 1)
            .put(() => 2.269 + (Math.random() * 0.2 - 0.1), 1);
        
        let sampled_t = temps.sample();
        window.base_T = (typeof sampled_t === 'function') ? sampled_t() : sampled_t;
        window.T = window.base_T;

        if (window.sub_animation_index === 1) {
            await init_simplex_noise();
        }
    }

    if (window.sub_animation_index === 1) {
        // Vary global temperature over time using 1D simplex noise
        // Noise is sampled using frame_count, centered at base_T with a 0.5 amplitude
        let noise_val = get_simplex_noise_at([window.frame_count * 0.0025], 1, 0.5);
        window.T = window.base_T + noise_val;
    }

    tooltip(`ising model<br>T=${window.T.toFixed(3)}`, window.sub_animation_index);

    const rows = window.rows;
    const cols = window.columns;
    const current_T = window.T;
    
    // Perform fewer Metropolis updates per frame to slow down evolution
    const iterations = Math.floor(rows * cols / 8); 

    for (let i = 0; i < iterations; i++) {
        let x = Math.floor(Math.random() * cols);
        let y = Math.floor(window.rows * Math.random());
        let idx = y * cols + x;
        let s = window.universe[idx];

        // Nearest neighbor spins with toroidal boundary conditions
        let n = window.universe[((y - 1 + rows) % rows) * cols + x];
        let s_s = window.universe[((y + 1) % rows) * cols + x];
        let w = window.universe[y * cols + (x - 1 + cols) % cols];
        let e = window.universe[y * cols + (x + 1) % cols];

        // Energy change for flipping spin s: dE = 2 * s * sum(neighbors)
        let dE = 2 * s * (n + s_s + w + e);

        if (dE <= 0 || Math.random() < Math.exp(-dE / current_T)) {
            window.universe[idx] = -s;
        }
    }

    // Render the whole grid to the canvas
    let full_text = "";
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            full_text += (window.universe[y * cols + x] === 1 ? "o" : ".");
        }
        full_text += "\n";
    }
    window.canvas.text(full_text);

    window.frame_count++;
    // Use a small timeout to keep the animation smooth but visible
    setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 30);
}