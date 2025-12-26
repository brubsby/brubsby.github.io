import { ObjectSampler, tooltip, get_canvas_index, setCharAtIndex, get_coords } from '../utils.js';

// Helper to generate neighbor offsets based on type and range
function get_neighbor_offsets(range, type) {
    let offsets = [];
    for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
            if (dx === 0 && dy === 0) continue;
            
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
    
    // Calculate max neighbors to determine valid born/survive range
    // We can do this by getting offsets size
    let ltl_offsets = get_neighbor_offsets(ltl_range, ltl_type);
    let max_n = ltl_offsets.length;
    
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
    
    let ltl_name = `R${ltl_range},C2,S${format_ranges(s_ltl)},B${format_ranges(b_ltl)},N${ltl_type}`;
    
    rulesets.put(prep_rule({
        born: b_ltl,
        survive: s_ltl,
        range: ltl_range,
        type: ltl_type,
        name: ltl_name
    }), 2); // Weight 2 for random LtL
    
    window.sub_animation_size = rulesets.size();
    
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < rulesets.size()) {
      window.rules = rulesets.get_index(window.sub_animation_index);
    } else {
      window.rules = rulesets.sample();
    }
    
    // Pre-calculate neighbor offsets for the ACTIVE rule
    window.neighbor_offsets = get_neighbor_offsets(window.rules.range, window.rules.type);
    
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
    
    window.tile_rules = [".", "o"];
  }

  // Render current state
  var full_text = "";
  for (var y = 0; y < window.rows; y++) {
      for (var x = 0; x < window.columns; x++) {
          let idx = y * window.columns + x;
          full_text += window.tile_rules[window.universe[idx] ? 1 : 0];
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
