import { tooltip } from '../utils.js';

export default (this_animation) => {
    if (window.frame_count === 0) {
        window.sub_animation_size = 1;
        tooltip("rotozoom", 0);
    }

    const t = window.frame_count * 0.01;

    // Aggressive, non-linear rotation
    const angle = t * 0.5 + Math.sin(t * 0.7) * 2.0;

    // Aggressive zoom: oscillates between extreme close-up and tiled view
    // Note: Larger value = zoomed out (more tiles visible)
    const zoom = Math.pow(2, Math.sin(t * 4.5) * 1.5 - 5.0);
    
    const cosA = Math.cos(angle) * zoom;
    const sinA = Math.sin(angle) * zoom;

    // Camera drift / panning
    const shiftX = Math.sin(t * 0.42) * 20;
    const shiftY = Math.cos(t * 0.58) * 20;

    const centerX = window.columns / 2;
    const centerY = window.rows / 2;
    const aspect = window.char_height / window.char_width;

    let out = "";
    for (let y = 0; y < window.rows; y++) {
        for (let x = 0; x < window.columns; x++) {
            const dx = x - centerX;
            const dy = (y - centerY) * aspect;

            const rotX = dx * cosA - dy * sinA + shiftX;
            const rotY = dx * sinA + dy * cosA + shiftY;

            const check = (Math.floor(rotX) + Math.floor(rotY)) % 2 === 0;
            out += check ? "o" : ".";
        }
        out += "\n";
    }

    window.canvas.text(out);

    window.frame_count++;
    setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 40);
};