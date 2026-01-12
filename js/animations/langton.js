import { ObjectSampler, tooltip, setCharAtIndex, get_canvas_index } from '../utils.js';

export default (this_animation) => {
    const steps_per_frame = 1;
    
    if (window.frame_count === 0) {
        // --- Initialization ---
        
        // Define rules
        var len = Math.min(
            Math.floor(Math.random() * 18) + 3,
            Math.floor(Math.random() * 18) + 3
        );
        var random_rule = "";
        for (var i = 0; i < len; i++) {
            random_rule += Math.random() < 0.5 ? "R" : "L";
        }

        // Format: string of L/R (and U=U-turn, N=No-turn if we want, but L/R is standard)
        var rulesets = new ObjectSampler()
            .put("RL", 10)         // Standard Langton's Ant
            .put("LLRR", 2)        // Symmetric
            .put("LRRRRRLLR", 1)   // Chaotic 1
            .put("LLRRRLRLRLLR", 1)// Chaotic 2
            .put("RRL", 1)         // Tri-state
            .put("RRLL", 1)        // Cardioid
            .put("LRL", 1)         // Chaotic
            .put("RLR", 1)         // Chaotic
            .put("LLRRRLRLRLLR", 1)
            .put(random_rule, 5);

        window.sub_animation_size = rulesets.size();
        
        // Select rule
        if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < rulesets.size()) {
            window.ant_rule = rulesets.get_index(window.sub_animation_index);
        } else {
            window.ant_rule = rulesets.sample();
        }
        
        var rule_index = rulesets.index_of(window.ant_rule);
        
        // Init Ants
        window.ants = [];
        const num_ants = Math.min(
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        );
        const rule_len = window.ant_rule.length;
        
        for (let i = 0; i < num_ants; i++) {
            // Each ant gets a rule of the same length
            let ant_rule = window.ant_rule;
            if (i > 0 && Math.random() < 0.5) {
                // Generate a random rule of the same length
                ant_rule = "";
                for (let j = 0; j < rule_len; j++) {
                    ant_rule += Math.random() < 0.5 ? "R" : "L";
                }
            }

            if (num_ants === 1) {
                window.ants.push({
                    x: Math.floor(window.columns / 2),
                    y: Math.floor(window.rows / 2),
                    dir: 0,
                    rule: ant_rule
                });
            } else {
                window.ants.push({
                    x: Math.floor(Math.random() * window.columns),
                    y: Math.floor(Math.random() * window.rows),
                    dir: Math.floor(Math.random() * 4),
                    rule: ant_rule
                });
            }
        }
        
        let rules_text = window.ants.map(a => a.rule).join("<br>");
        tooltip(`langton<br>${rules_text}`, rule_index);
        
        // Init Grid
        window.ant_grid = new Uint8Array(window.columns * window.rows).fill(0);
        
        // Palette
        const chars = ".oO@";
        window.ant_palette = [];
        if (window.ant_rule.length <= chars.length) {
            for(let i=0; i<window.ant_rule.length; i++) {
                window.ant_palette.push(chars[i]);
            }
        } else {
            window.ant_palette.push(".");
            for(let i=1; i<window.ant_rule.length; i++) {
                window.ant_palette.push((i % 10).toString());
            }
        }
        
        // Draw initial background
        let bg = "";
        for(let y=0; y<window.rows; y++) {
            bg += ".".repeat(window.columns) + "\n";
        }
        window.canvas.text(bg);
    }
    
    const rule = window.ant_rule;
    const num_states = rule.length;
    const palette = window.ant_palette;
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // Up, Right, Down, Left
    
    // --- Simulation Steps ---
    for (let s = 0; s < steps_per_frame; s++) {
        for (let a = 0; a < window.ants.length; a++) {
            let ant = window.ants[a];
            let x = ant.x;
            let y = ant.y;
            
            // Wrap coordinates (Toroidal)
            if (x < 0) x = window.columns - 1;
            if (x >= window.columns) x = 0;
            if (y < 0) y = window.rows - 1;
            if (y >= window.rows) y = 0;
            
            let idx = y * window.columns + x;
            let current_state = window.ant_grid[idx];
            
            // Apply Rule
            // 1. Turn based on current state
            let turn = ant.rule[current_state]; // 'R' or 'L'
            
            if (turn === 'R') {
                ant.dir = (ant.dir + 1) % 4;
            } else if (turn === 'L') {
                ant.dir = (ant.dir + 3) % 4; // -1 equivalent
            } else if (turn === 'U') {
                 ant.dir = (ant.dir + 2) % 4;
            }
            
            // 2. Change color
            let next_state = (current_state + 1) % num_states;
            window.ant_grid[idx] = next_state;
            
            // 3. Move forward
            ant.x = x + directions[ant.dir][0];
            ant.y = y + directions[ant.dir][1];
            
            // Wrap check for next iteration's read
            if (ant.x < 0) ant.x = window.columns - 1;
            if (ant.x >= window.columns) ant.x = 0;
            if (ant.y < 0) ant.y = window.rows - 1;
            if (ant.y >= window.rows) ant.y = 0;
        }
    }
    
    // --- Rendering ---
    let out = "";
    // We also want to draw the ants on top
    const ant_chars = "^>v<";
    const ant_map = new Map();
    for (let a = 0; a < window.ants.length; a++) {
        let ant = window.ants[a];
        let idx = ant.y * window.columns + ant.x;
        ant_map.set(idx, ant_chars[ant.dir]);
    }
    
    for (let y = 0; y < window.rows; y++) {
        for (let x = 0; x < window.columns; x++) {
            let i = y * window.columns + x;
            if (ant_map.has(i)) {
                out += ant_map.get(i);
            } else {
                out += palette[window.ant_grid[i]];
            }
        }
        out += "\n";
    }
    
    window.canvas.text(out);

    window.frame_count++;
    setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 0);
};
