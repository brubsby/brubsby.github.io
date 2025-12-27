import { ObjectSampler, tooltip, get_canvas_index, setCharAtIndex, get_coords, get_bresenham_line_points, get_bresenham_circle_points, init_simplex_noise, get_simplex_noise_at } from '../utils.js';

function get_max_neighbors(r, t, include_center) {
    let result = 8;
    if ('+X'.includes(t)) result = r * 4;
    else if ('*#'.includes(t)) result = r * 8;
    else if ('BD'.includes(t)) result = ((2 * r + 1) ** 2 - 1) / 2;
    else if (t === 'M') result = (2 * r + 1) ** 2 - 1;
    else if (t === 'N') result = 2 * r * (r + 1);
    
    else if ('C2'.includes(t)) {
        let count = 0, r2 = t === 'C' ? r * (r + 1) : r * r;
        for (let i = -r; i <= r; i++) {
            let w = 0;
            while ((w + 1) ** 2 + i * i <= r2) w++;
            count += 2 * w + 1;
        }
        result = count - 1;
    }
    return result + (include_center ? 1 : 0);
}

// Helper to generate neighbor offsets based on type and range
function get_neighbor_offsets(range, type, include_center) {
    let offsets = [];
    for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
            if (!include_center && dx === 0 && dy === 0) continue;
            
            let dist_sq = dx * dx + dy * dy;
            let dist_manhattan = Math.abs(dx) + Math.abs(dy);
            let dist_chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
            
            let include = false;
            
            switch (type) {
                case 'M': // Moore
                    include = dist_chebyshev <= range;
                    break;
                case 'N': // Von Neumann
                    include = dist_manhattan <= range;
                    break;
                case '2': // Euclidean
                    include = dist_sq <= range * range;
                    break;
                case 'C': // Circular (approx Euclidean r+0.5)
                    include = dist_sq <= range * (range + 1); 
                    break;
                case '+': // Cross
                    include = (dx === 0 || dy === 0) && dist_chebyshev <= range;
                    break;
                case 'X': // Saltire
                    include = Math.abs(dx) === Math.abs(dy) && dist_chebyshev <= range;
                    break;
                case '*': // Star (Cross + Saltire)
                    include = ((dx === 0 || dy === 0) || Math.abs(dx) === Math.abs(dy)) && dist_chebyshev <= range;
                    break;
                case 'B': // Checkerboard (Odd parity sum relative to center)
                    include = dist_chebyshev <= range && ((dx + dy) % 2 !== 0);
                    break;
                case 'D': // Aligned Checkerboard (Even parity sum relative to center)
                    include = dist_chebyshev <= range && ((dx + dy) % 2 === 0);
                    break;
                case '#': // Hash (Hashtag shape)
                    include = dist_chebyshev <= range && (Math.abs(dx) === 1 || Math.abs(dy) === 1);
                    break;
            }
            
            if (include) {
                offsets.push([dx, dy]);
            }
        }
    }
    return offsets;
}

// Helper to parse rule string
function parse_rule(rule_str) {
    rule_str = rule_str.toUpperCase().replace(/\s/g, '');
    let suffix = "";
    if (rule_str.includes(':')) {
        let parts = rule_str.split(':');
        rule_str = parts[0];
        suffix = parts[1];
    }

    let rule = { born: [], survive: [], range: 1, type: 'M', states: 2, include_center: false, name: rule_str };
    
    // Parse suffix if present
    if (suffix) {
        let topo_char = suffix.charAt(0);
        let dims = suffix.substring(1).split(',').map(x => parseInt(x, 10));
        if (dims.length >= 2) {
            rule.width = dims[0];
            rule.height = dims[1];
            if (topo_char === 'T') rule.topology = 'toroidal';
            else if (topo_char === 'P') rule.topology = 'plane';
        }
    }

    // 1. Check for Kellie Evans' notation: 5 integers separated by commas
    // r,b_min,b_max,s_min,s_max
    if (/^\d+,\d+,\d+,\d+,\d+$/.test(rule_str)) {
        let parts = rule_str.split(',').map(x => parseInt(x, 10));
        rule.range = parts[0];
        let b_min = parts[1], b_max = parts[2];
        let s_min = parts[3], s_max = parts[4];
        
        for (let i = b_min; i <= b_max; i++) rule.born.push(i);
        for (let i = s_min; i <= s_max; i++) rule.survive.push(i);
        
        rule.include_center = true; // Evans' implies totalistic (M1)
        rule.type = 'M';
        rule.states = 2;
    } 
    // 2. Check for LtL / HROT (Start with R)
    else if (rule_str.startsWith('R')) {
        let tokens = rule_str.split(',');
        let current_mode = null;
        let m_found = false;

        const parse_ranges = (val, target_array) => {
            // Handle single number, "min..max", or "min-max"
            // Note: "-" can be ambiguous if we had negative numbers, but here we don't.
            let range_sep = val.includes('..') ? '..' : '-';
            if (val.includes(range_sep)) {
                let r_parts = val.split(range_sep);
                let min = parseInt(r_parts[0], 10);
                let max = parseInt(r_parts[1], 10);
                for (let k = min; k <= max; k++) target_array.push(k);
            } else {
                let n = parseInt(val, 10);
                if (!isNaN(n)) target_array.push(n);
            }
        };

        for (let token of tokens) {
            let match = token.match(/^([RCMSBN])(.*)/);
            let val = token;
            
            if (match) {
                current_mode = match[1];
                val = match[2];
            }
            
            if (val === "" && match) continue; // Just a mode switch like "S" then next token "2"
            
            if (current_mode === 'R') rule.range = parseInt(val, 10);
            else if (current_mode === 'C') {
                rule.states = parseInt(val, 10);
                if (rule.states === 0) rule.states = 2;
            }
            else if (current_mode === 'M') {
                rule.include_center = (val === '1');
                m_found = true;
            }
            else if (current_mode === 'N') {
                if (val === 'H') rule.type = '#';
                else if (val === 'S') rule.type = '*';
                else if (val === 'P') rule.type = '+';
                else rule.type = val || 'M'; // Default to M if just "N"
            }
            else if (current_mode === 'S') parse_ranges(val, rule.survive);
            else if (current_mode === 'B') parse_ranges(val, rule.born);
        }
        
        // HROT defaults to M0 if M not specified
        if (!m_found) rule.include_center = false;
        
    } 
    // 3. Life-like (B.../S... or .../...)
    else {
        let parts = rule_str.split('/');
        let b_part = parts.find(p => p.startsWith('B'));
        let s_part = parts.find(p => p.startsWith('S'));
        
        if (b_part) {
            rule.born = b_part.substring(1).split('').map(d => parseInt(d, 10));
        }
        if (s_part) {
            rule.survive = s_part.substring(1).split('').map(d => parseInt(d, 10));
        }
        
        // Fallback for just numbers like "23/3" -> S23/B3 (Conway standard order often S/B in pure numbers)
        // But requested to be permissive. If strict B/S prefixes missing:
        if (!b_part && !s_part && parts.length === 2) {
             // Assume S/B (Survival / Birth) common in "23/3"
             rule.survive = parts[0].split('').map(d => parseInt(d, 10));
             rule.born = parts[1].split('').map(d => parseInt(d, 10));
        }
    }
    
    // Ensure sets and uniqueness
    rule.born = [...new Set(rule.born)].sort((a,b)=>a-b);
    rule.survive = [...new Set(rule.survive)].sort((a,b)=>a-b);
    rule.born_set = new Set(rule.born);
    rule.survive_set = new Set(rule.survive);
    
    return rule;
}

export default (this_animation) => {
  if (window.frame_count == 0) {
    window.is_toroidal = Math.random() < 0.75;

    // Helper to format ranges for name
    const format_ranges = (arr) => {
        if (!arr || arr.length === 0) return "";
        let sorted = [...new Set(arr)].sort((a,b)=>a-b);
        let parts = [];
        let start = sorted[0];
        let prev = start;
        for(let i=1; i<sorted.length; i++) {
            if (sorted[i] !== prev + 1) {
                parts.push(start === prev ? `${start}` : `${start}-${prev}`);
                start = sorted[i];
            }
            prev = sorted[i];
        }
        parts.push(start === prev ? `${start}` : `${start}-${prev}`);
        return parts.join(',');
    };

    const named_rule = (str, name) => {
        let r = parse_rule(str);
        r.name = name;
        return r;
    };

    // Outer Totalistic Moore Rulesets
    var rulesets = new ObjectSampler()
      .put(named_rule("B3/S23", "Life"), 20)
      .put(named_rule("B36/S23", "HighLife"), 2)
      .put(named_rule("B3678/S34678", "Day & Night"), 2)
      .put(named_rule("B36/S125", "2x2"), 2)
      .put(named_rule("B34/S34", "3-4 Life"), 2)
      .put(named_rule("B35678/S5678", "Diamoeba"), 2)
      .put(named_rule("B3/S023", "DotLife"), 3)
      .put(named_rule("B3/S238", "EightLife"), 2)
      .put(named_rule("B3457/S4568", "Gems"), 2)
      .put(named_rule("B34578/S456", "Gems Minor"), 2)
      .put(named_rule("B3/S012345678", "Life Without Death"), 2)
      .put(named_rule("B2/S0", "Live Free or Die"), 1)
      .put(named_rule("B36/S245", "Logarithmic Replicator"), 2)
      .put(named_rule("B345/S5", "LongLife"), 2)
      .put(named_rule("B3/S12345", "Maze"), 2)
      .put(named_rule("B3/S1234", "Mazectric"), 2)
      .put(named_rule("B368/S245", "Move"), 2)
      .put(named_rule("B38/S23", "Pedestrian Life"), 2)
      .put(named_rule("B1357/S1357", "Replicator"), 1)
      .put(named_rule("B1357/S02468", "Fredkin"), 1)
      .put(named_rule("B2/S", "Seeds"), 2)
      .put(named_rule("B4678/S35678", "Anneal"), 2)
      .put(named_rule("B45678/S2345", "Walled Cities"), 2)
      .put(named_rule("B234/S", "Serviettes"), 2)
      .put(named_rule("B3678/S235678", "Stains"), 2)
      .put(named_rule("B378/S235678", "Coagulations"), 2)
      .put(named_rule("B345/S4567", "Assimilation"), 2)
      .put(named_rule("B3/S45678", "Corral"), 2)
      .put(named_rule("B5678/S45678", "Vote"), 1)
      .put(named_rule("R5,C2,M1,S34..58,B34..45,NM", "Bosco"), 2)
      .put(named_rule("R10,C2,M1,S123..170,B122..211,NM", "Bugs"), 2)
      .put(named_rule("R8,C2,M1,S163..223,B74..252,NM", "Globe"), 2)
      .put(named_rule("R7,C2,M1,S123..170,B75..170,NM", "Major"), 2)
      .put(named_rule("R5,C255,M1,S25..45,B33..57,NM", "Modern Art"), 2);

    // Random standard Moore (Life-like) rule
    let b_bits = Math.floor(Math.random() * 256);
    let s_bits = Math.floor(Math.random() * 256);
    let b = [];
    let s = [];
    for (let j = 0; j < 8; j++) {
      if ((b_bits >> j) & 1) b.push(j);
      if ((s_bits >> j) & 1) s.push(j);
    }
    let r_name = `b${b.join('')}/s${s.join('')}`;
    rulesets.put(named_rule(r_name, r_name), 1);

    // Random LtL Rule
    // Range 1 to 4
    // Neighborhoods: M, N, 2, C, +, X, *, B, D, #
    // Using aliases H (#), S (*), P (+) for URL safety
    let ltl_range = Math.floor(Math.random() * 4) + 1;
    let ltl_types = ['M', 'N', '2', 'C', 'P', 'X', 'S', 'H', 'B', 'D'];
    let ltl_type = ltl_types[Math.floor(Math.random() * ltl_types.length)];
    let ltl_include_center = Math.random() < 0.5;
    
    // Calculate max neighbors to determine valid born/survive range
    // Map aliases to real types for calculation
    let real_type = ltl_type;
    if (ltl_type === 'H') real_type = '#';
    else if (ltl_type === 'S') real_type = '*';
    else if (ltl_type === 'P') real_type = '+';
    
    let max_n = get_max_neighbors(ltl_range, real_type, ltl_include_center);
    
    // Generate random born/survive ranges
    // For LtL, often defined as ranges e.g. B 30..40
    let b_ltl = [];
    let s_ltl = [];
    
    // Simple random generation: pick a few ranges
    let num_ranges = Math.floor(Math.random() * 2) + 1;
    for(let k=0; k<num_ranges; k++) {
        let min = Math.floor(Math.random() * max_n);
        let max = Math.min(max_n, min + Math.floor(Math.random() * (max_n - min) * 0.3)); // 30% width max
        for(let j=min; j<=max; j++) b_ltl.push(j);
    }
    num_ranges = Math.floor(Math.random() * 2) + 1;
    for(let k=0; k<num_ranges; k++) {
        let min = Math.floor(Math.random() * max_n);
        let max = Math.min(max_n, min + Math.floor(Math.random() * (max_n - min) * 0.3));
        for(let j=min; j<=max; j++) s_ltl.push(j);
    }
    
    let ltl_name = `R${ltl_range},C2,M${ltl_include_center?1:0},S${format_ranges(s_ltl)},B${format_ranges(b_ltl)},N${ltl_type}`;
    
    rulesets.put(parse_rule(ltl_name), 40); // Weight 2 for random LtL
    
    window.sub_animation_size = rulesets.size();
    
    if (window.forced_rule_string) {
        window.rules = parse_rule(window.forced_rule_string);
        console.log("Parsed forced rule:", window.rules);
    } else if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < rulesets.size()) {
      window.rules = rulesets.get_index(window.sub_animation_index);
    } else {
      window.rules = rulesets.sample();
    }
    
    // Apply topology/size overrides from rule
    if (window.rules.topology) {
        window.is_toroidal = (window.rules.topology === 'toroidal');
    }
    if (window.rules.width && window.rules.height) {
        window.columns = window.rules.width;
        window.rows = window.rules.height;
    }
    
    // Pre-calculate neighbor offsets for the ACTIVE rule
    window.neighbor_offsets = get_neighbor_offsets(window.rules.range, window.rules.type, window.rules.include_center);
    
    // Tooltip Logic
    var rules_index = rulesets.index_of(window.rules);

    // Construct suffix: :Tcols,rows or :Pcols,rows
    var suffix_str = `:${window.is_toroidal ? 'T' : 'P'}${window.columns},${window.rows}`;
    var display_str = "";
    var link_rule_str = "";
    
    if (window.rules.range === 1 && window.rules.type === 'M' && !window.rules.include_center) {
        // Standard Life-like format
        var rule_str = `B${window.rules.born.join('')}/S${window.rules.survive.join('')}`;
        var name_str = window.rules.name.toLowerCase();
        
        var parenthetical = "";
        // If the name is the same as the rule string, or if it looks like an LtL definition (starts with 'r'),
        // just show the compact rule string.
        if (name_str !== rule_str && !name_str.startsWith('r')) {
            parenthetical = ` (${window.rules.name})`;
        }
        
        display_str = `${rule_str}${suffix_str}${parenthetical}`;
        link_rule_str = rule_str + suffix_str;
    } else {
        // LtL Format - Reconstruct canonical string
        // Map real types back to aliases if preferred? Or just standard chars.
        // Standard Golly uses #, +, etc. My aliases H, S, P were for input/URL.
        // Let's use standard chars for display.
        let type_char = window.rules.type;
        // Construct: Rr,Cc,Mm,Ss..s,Bb..b,Nn
        let s_part = format_ranges(window.rules.survive);
        let b_part = format_ranges(window.rules.born);
        let ltl_canon = `R${window.rules.range},C${window.rules.states||2},M${window.rules.include_center?1:0},S${s_part},B${b_part},N${type_char}`;
        
        if (window.rules.name && window.rules.name !== ltl_canon && !window.rules.name.toUpperCase().startsWith('R')) {
             display_str = `${ltl_canon}${suffix_str} (${window.rules.name})`;
        } else {
             display_str = `${ltl_canon}${suffix_str}`;
        }
        link_rule_str = ltl_canon + suffix_str;
    }

    tooltip(`2d automata<br>${display_str}`, rules_index, { rule: link_rule_str });
    
    // Universe Initialization
    window.universe = new Array(window.rows * window.columns).fill(false);
    
    // Initial State Generation
    if (window.pause_at_generation === 1 && window.rules.born_set.has(1)) {
        let cx = Math.floor(window.columns / 2);
        let cy = Math.floor(window.rows / 2);
        window.universe[cy * window.columns + cx] = true;
    } else {
        // Generic Sampler
        var init_sampler = new ObjectSampler()
            .put("20p", 10)
            .put("50p", 5)
            .put("80p", 5)
            .put("rand_p", 10)
            .put("single", 1)
            .put("rect", 2)
            .put("circ", 2)
            .put("lines", 1)
            .put("simplex", 5);
            
        let range_substrate_valid = false;
        let min_rho = 0;
        let max_rho = 1;
        
        if (window.rules.range >= 2) {
             let max_n = window.neighbor_offsets.length;
             if (max_n > 0) {
                 let all_counts = [...window.rules.born, ...window.rules.survive];
                 if (all_counts.length > 0) {
                     let min_k = Math.min(...all_counts);
                     let max_k = Math.max(...all_counts);
                     min_rho = min_k / max_n;
                     max_rho = max_k / max_n;
                     range_substrate_valid = true;
                     init_sampler.put("range_substrate", 200);
                 }
             }
        }
            
        if (window.rules.name === "Life") {
            init_sampler.put("glider", 1).put("gun", 1);
        }
            
        let choice = init_sampler.sample();
        
        if (choice === "20p") {
            for(let i=0; i<window.universe.length; i++) window.universe[i] = Math.random() < 0.2;
        } else if (choice === "50p") {
            for(let i=0; i<window.universe.length; i++) window.universe[i] = Math.random() < 0.5;
        } else if (choice === "80p") {
            for(let i=0; i<window.universe.length; i++) window.universe[i] = Math.random() < 0.8;
        } else if (choice === "rand_p") {
            let p = Math.random();
            for(let i=0; i<window.universe.length; i++) window.universe[i] = Math.random() < p;
        } else if (choice === "range_substrate") {
            let rho = min_rho + Math.random() * (max_rho - min_rho);
            for(let i=0; i<window.universe.length; i++) window.universe[i] = Math.random() < rho;
        } else if (choice === "simplex") {
            init_simplex_noise();
            let freq = Math.random() * 0.1 + 0.05;
            for (var y = 0; y < window.rows; y++) {
                for (var x = 0; x < window.columns; x++) {
                    let val = get_simplex_noise_at([x, y], freq, 1);
                    if (val > 0) {
                        window.universe[y * window.columns + x] = true;
                    }
                }
            }
        } else if (choice === "single") {
            let cx = Math.floor(window.columns / 2);
            let cy = Math.floor(window.rows / 2);
            window.universe[cy * window.columns + cx] = true;
        } else if (choice === "rect") {
            // Rectangle fitting in viewport
            let w = Math.floor(Math.random() * (window.columns - 2)) + 1;
            let h = Math.floor(Math.random() * (window.rows - 2)) + 1;
            let x = Math.floor(Math.random() * (window.columns - w));
            let y = Math.floor(Math.random() * (window.rows - h));
            let filled = Math.random() < 0.5;
            
            for(let j=y; j<y+h; j++) {
                for(let i=x; i<x+w; i++) {
                    if (filled || j===y || j===y+h-1 || i===x || i===x+w-1) {
                         window.universe[j * window.columns + i] = true;
                    }
                }
            }
        } else if (choice === "circ") {
            let radius = Math.floor(Math.random() * (Math.min(window.rows, window.columns) / 2 - 2)) + 1;
            let cx = Math.floor(Math.random() * (window.columns - 2 * radius)) + radius;
            let cy = Math.floor(Math.random() * (window.rows - 2 * radius)) + radius;
            let filled = Math.random() < 0.5;
            
            if (filled) {
                let r2 = radius * radius;
                for(let j=cy-radius; j<=cy+radius; j++) {
                    for(let i=cx-radius; i<=cx+radius; i++) {
                        if ((i-cx)**2 + (j-cy)**2 <= r2) {
                             if (j>=0 && j<window.rows && i>=0 && i<window.columns)
                                 window.universe[j * window.columns + i] = true;
                        }
                    }
                }
            } else {
                let pts = get_bresenham_circle_points(cx, cy, radius);
                for(let pt of pts) {
                    let px = pt[0], py = pt[1];
                     if (py>=0 && py<window.rows && px>=0 && px<window.columns)
                         window.universe[py * window.columns + px] = true;
                }
            }
        } else if (choice === "lines") {
            let num_lines = Math.floor(Math.random() * 10) + 1;
            for(let k=0; k<num_lines; k++) {
                let x0 = Math.floor(Math.random() * window.columns);
                let y0 = Math.floor(Math.random() * window.rows);
                let x1 = Math.floor(Math.random() * window.columns);
                let y1 = Math.floor(Math.random() * window.rows);
                let pts = get_bresenham_line_points([[x0,y0], [x1,y1]]);
                for(let pt of pts) {
                    let px = pt[0], py = pt[1];
                     if (py>=0 && py<window.rows && px>=0 && px<window.columns)
                         window.universe[py * window.columns + px] = true;
                }
            }
        } else if (choice === "glider") {
            let cx = Math.floor(window.columns / 2);
            let cy = Math.floor(window.rows / 2);
            let offsets = [[0, -1], [1, 0], [-1, 1], [0, 1], [1, 1]];
            for (let off of offsets) {
                let idx = (cy + off[1]) * window.columns + (cx + off[0]);
                if (idx >= 0 && idx < window.universe.length) window.universe[idx] = true;
            }
        } else if (choice === "gun") {
            let cx = Math.floor(window.columns / 2);
            let cy = Math.floor(window.rows / 2);
            // Gosper Glider Gun (Top-Left aligned relative to center)
            // 36x9
            let gun_str = [
                "........................O...........",
                "......................O.O...........",
                "............OO......OO............OO",
                "...........O...O....OO............OO",
                "OO........O.....O...OO..............",
                "OO........O...O.OO....O.O...........",
                "..........O.....O.......O...........",
                "...........O...O....................",
                "............OO......................"
            ];
            // Center the gun
            let start_y = cy - 4;
            let start_x = cx - 18;
            for(let i=0; i<gun_str.length; i++) {
                for(let j=0; j<gun_str[i].length; j++) {
                    if (gun_str[i][j] === 'O') {
                        let y = start_y + i;
                        let x = start_x + j;
                        if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
                             window.universe[y * window.columns + x] = true;
                        }
                    }
                }
            }
        }
    }
    
    window.tile_rules = [];
    const C = window.rules.states || 2;
    if (C > 2) {
        // Modulo cycle for C > 2 using requested palette
        // Easily alterable: just change the string or logic below
        const palette = "1234567890";
        for (let i = 0; i < C; i++) {
            window.tile_rules.push(palette[i % palette.length]);
        }
    } else {
        // Default binary look
        window.tile_rules = [".", "o"];
    }
  }

  // Render current state
  var full_text = "";
  for (var y = 0; y < window.rows; y++) {
      for (var x = 0; x < window.columns; x++) {
          let idx = y * window.columns + x;
          // Number() cast handles both boolean (false->0, true->1) and integer states
          full_text += window.tile_rules[Number(window.universe[idx])];
      }
      full_text += "\n";
  }
  window.canvas.text(full_text);

  if (typeof window.pause_at_generation !== 'undefined' && window.frame_count === window.pause_at_generation) {
      return;
  }

  // Calculate next generation
  var next_universe = new Array(window.universe.length).fill(false);
  
  // Cache globals for loop
  const rows = window.rows;
  const cols = window.columns;
  const is_toroidal = window.is_toroidal;
  const offsets = window.neighbor_offsets;
  const born_set = window.rules.born_set;
  const survive_set = window.rules.survive_set;
  const universe = window.universe;

  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      var neighbors = 0;
      
      for(let i=0; i<offsets.length; i++) {
          let off = offsets[i];
          let nx = x + off[0];
          let ny = y + off[1];
          
          if (is_toroidal) {
            // Modulo arithmetic for wrapping
            nx = (nx % cols + cols) % cols;
            ny = (ny % rows + rows) % rows;
          } else {
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          }
          
          if (universe[ny * cols + nx]) {
            neighbors++;
          }
      }
      
      var idx = y * cols + x;
      var alive = universe[idx];
      
      if (alive) {
        if (survive_set.has(neighbors)) {
          next_universe[idx] = true;
        }
      } else {
        if (born_set.has(neighbors)) {
          next_universe[idx] = true;
        }
      }
    }
  }
  
  window.universe = next_universe;

  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 100);
}
