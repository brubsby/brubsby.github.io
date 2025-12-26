import { ObjectSampler, tooltip, get_canvas_index, setCharAtIndex, get_coords } from '../utils.js';

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
    let rule = { born: [], survive: [], range: 1, type: 'M', states: 2, include_center: false, name: rule_str };
    
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
            else if (current_mode === 'N') rule.type = val || 'M'; // Default to M if just "N"
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
    window.is_toroidal = Math.random() < 0.5;

    // Helper to format standard rules
    // Default to Moore, Range 1 if not specified
    const prep_rule = (r) => {
        if (!r.range) r.range = 1;
        if (!r.type) r.type = 'M';
        
        // Convert array to Set for faster lookup if not already
        r.born_set = new Set(r.born);
        r.survive_set = new Set(r.survive);
        return r;
    };

    // Outer Totalistic Moore Rulesets
    var rulesets = new ObjectSampler()
      .put(prep_rule({ born: [3], survive: [2, 3], name: "Life" }), 20)
      // ... (rest of rulesets) ...

      .put(prep_rule({ born: [3, 6], survive: [2, 3], name: "HighLife" }), 4)
      .put(prep_rule({ born: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8], name: "Day & Night" }), 4)
      .put(prep_rule({ born: [3, 6], survive: [1, 2, 5], name: "2x2" }), 3)
      .put(prep_rule({ born: [3, 4], survive: [3, 4], name: "3-4 Life" }), 3)
      .put(prep_rule({ born: [3, 5, 6, 7, 8], survive: [5, 6, 7, 8], name: "Diamoeba" }), 3)
      .put(prep_rule({ born: [3], survive: [0, 2, 3], name: "DotLife" }), 4)
      .put(prep_rule({ born: [3], survive: [2, 3, 8], name: "EightLife" }), 3)
      .put(prep_rule({ born: [3, 4, 5, 7], survive: [4, 5, 6, 8], name: "Gems" }), 3)
      .put(prep_rule({ born: [3, 4, 5, 7, 8], survive: [4, 5, 6], name: "Gems Minor" }), 3)
      .put(prep_rule({ born: [3], survive: [0, 1, 2, 3, 4, 5, 6, 7, 8], name: "Life Without Death" }), 3)
      .put(prep_rule({ born: [2], survive: [0], name: "Live Free or Die" }), 1)
      .put(prep_rule({ born: [3, 6], survive: [2, 4, 5], name: "Logarithmic Replicator" }), 3)
      .put(prep_rule({ born: [3, 4, 5], survive: [5], name: "LongLife" }), 3)
      .put(prep_rule({ born: [3], survive: [1, 2, 3, 4, 5], name: "Maze" }), 3)
      .put(prep_rule({ born: [3], survive: [1, 2, 3, 4], name: "Mazectric" }), 3)
      .put(prep_rule({ born: [3, 6, 8], survive: [2, 4, 5], name: "Move" }), 3)
      .put(prep_rule({ born: [3, 8], survive: [2, 3], name: "Pedestrian Life" }), 3)
      .put(prep_rule({ born: [1, 3, 5, 7], survive: [1, 3, 5, 7], name: "Replicator" }), 1)
      .put(prep_rule({ born: [1, 3, 5, 7], survive: [0, 2, 4, 6, 8], name: "Fredkin" }), 1)
      .put(prep_rule({ born: [2], survive: [], name: "Seeds" }), 3)
      .put(prep_rule({ born: [4, 6, 7, 8], survive: [3, 5, 6, 7, 8], name: "Anneal" }), 3)
      .put(prep_rule({ born: [4, 5, 6, 7, 8], survive: [2, 3, 4, 5], name: "Walled Cities" }), 3)
      .put(prep_rule({ born: [2, 3, 4], survive: [], name: "Serviettes" }), 3)
      .put(prep_rule({ born: [3, 6, 7, 8], survive: [2, 3, 5, 6, 7, 8], name: "Stains" }), 3)
      .put(prep_rule({ born: [3, 7, 8], survive: [2, 3, 5, 6, 7, 8], name: "Coagulations" }), 3)
      .put(prep_rule({ born: [3, 4, 5], survive: [4, 5, 6, 7], name: "Assimilation" }), 3)
      .put(prep_rule({ born: [3], survive: [4, 5, 6, 7, 8], name: "Corral" }), 3)
      .put(prep_rule({ born: [5, 6, 7, 8], survive: [4, 5, 6, 7, 8], name: "Vote" }), 1);

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
    rulesets.put(prep_rule({ born: b, survive: s, name: r_name }), 1);

    // Random LtL Rule
    // Range 1 to 4
    // Neighborhoods: M, N, 2, C, +, X, *, B, D, #
    let ltl_range = Math.floor(Math.random() * 4) + 1;
    let ltl_types = ['M', 'N', '2', 'C', '+', 'X', '*', 'B', 'D', '#'];
    let ltl_type = ltl_types[Math.floor(Math.random() * ltl_types.length)];
    let ltl_include_center = Math.random() < 0.5;
    
    // Calculate max neighbors to determine valid born/survive range
    let max_n = get_max_neighbors(ltl_range, ltl_type, ltl_include_center);
    
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
    
    // Helper to format ranges for name
    const format_ranges = (arr) => {
        if (arr.length === 0) return "";
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
    
    let ltl_name = `R${ltl_range},C2,M${ltl_include_center?1:0},S${format_ranges(s_ltl)},B${format_ranges(b_ltl)},N${ltl_type}`;
    
    rulesets.put(prep_rule({
        born: b_ltl,
        survive: s_ltl,
        range: ltl_range,
        type: ltl_type,
        include_center: ltl_include_center,
        name: ltl_name
    }), 2); // Weight 2 for random LtL
    
    window.sub_animation_size = rulesets.size();
    
    if (window.forced_rule_string) {
        window.rules = parse_rule(window.forced_rule_string);
        console.log("Parsed forced rule:", window.rules);
    } else if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < rulesets.size()) {
      window.rules = rulesets.get_index(window.sub_animation_index);
    } else {
      window.rules = rulesets.sample();
    }
    
    // Pre-calculate neighbor offsets for the ACTIVE rule
    window.neighbor_offsets = get_neighbor_offsets(window.rules.range, window.rules.type, window.rules.include_center);
    
    // Tooltip Logic
    var rules_index = rulesets.index_of(window.rules);
    var tor_str = window.is_toroidal ? "toroidal " : "";
    var display_str = "";
    
    if (window.rules.range === 1 && window.rules.type === 'M') {
        // Standard Life-like format
        var rule_str = `b${window.rules.born.join('')}/s${window.rules.survive.join('')}`;
        var name_str = window.rules.name.toLowerCase();
        var display_name = (name_str === rule_str) ? rule_str : `${rule_str} (${name_str})`;
        display_str = `${tor_str}${display_name}`;
    } else {
        // LtL Format
        // Name usually IS the rule string for random ones
        display_str = `${tor_str}${window.rules.name}`;
    }

    tooltip(`2d automata<br>${display_str}`, rules_index);
    
    // Universe Initialization
    window.universe = new Array(window.rows * window.columns).fill(false);
    
    // Random Fill
    for(let i=0; i<window.universe.length; i++) {
        window.universe[i] = Math.random() < 0.2; // 20% density
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
