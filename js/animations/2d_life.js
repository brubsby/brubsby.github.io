import { ObjectSampler, tooltip, get_canvas_index, setCharAtIndex, get_coords } from '../utils.js';

export default (this_animation) => {
  if (window.frame_count == 0) {
    window.is_toroidal = Math.random() < 0.5;

    // Outer Totalistic Moore Rulesets
    // Format: { born: [n, ...], survive: [n, ...], name: "Name" }
    var rulesets = new ObjectSampler()
      .put({ born: [3], survive: [2, 3], name: "Life" }, 10)
      .put({ born: [3, 6], survive: [2, 3], name: "HighLife" }, 4)
      .put({ born: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8], name: "Day & Night" }, 4)
      .put({ born: [3, 6], survive: [1, 2, 5], name: "2x2" }, 3)
      .put({ born: [3, 4], survive: [3, 4], name: "3-4 Life" }, 3)
      .put({ born: [3, 5, 6, 7, 8], survive: [5, 6, 7, 8], name: "Diamoeba" }, 3)
      .put({ born: [3], survive: [0, 2, 3], name: "DotLife" }, 4)
      .put({ born: [3], survive: [2, 3, 8], name: "EightLife" }, 3)
      .put({ born: [3, 4, 5, 7], survive: [4, 5, 6, 8], name: "Gems" }, 3)
      .put({ born: [3, 4, 5, 7, 8], survive: [4, 5, 6], name: "Gems Minor" }, 3)
      .put({ born: [3], survive: [0, 1, 2, 3, 4, 5, 6, 7, 8], name: "Life Without Death" }, 3)
      .put({ born: [2], survive: [0], name: "Live Free or Die" }, 1)
      .put({ born: [3, 6], survive: [2, 4, 5], name: "Logarithmic Replicator" }, 3)
      .put({ born: [3, 4, 5], survive: [5], name: "LongLife" }, 3)
      .put({ born: [3], survive: [1, 2, 3, 4, 5], name: "Maze" }, 3)
      .put({ born: [3], survive: [1, 2, 3, 4], name: "Mazectric" }, 3)
      .put({ born: [3, 6, 8], survive: [2, 4, 5], name: "Move" }, 3)
      .put({ born: [3, 8], survive: [2, 3], name: "Pedestrian Life" }, 3)
      .put({ born: [1, 3, 5, 7], survive: [1, 3, 5, 7], name: "Replicator" }, 1)
      .put({ born: [1, 3, 5, 7], survive: [0, 2, 4, 6, 8], name: "Fredkin" }, 1)
      .put({ born: [2], survive: [], name: "Seeds" }, 3)
      .put({ born: [4, 6, 7, 8], survive: [3, 5, 6, 7, 8], name: "Anneal" }, 3)
      .put({ born: [4, 5, 6, 7, 8], survive: [2, 3, 4, 5], name: "Walled Cities" }, 3)
      .put({ born: [2, 3, 4], survive: [], name: "Serviettes" }, 3)
      .put({ born: [3, 6, 7, 8], survive: [2, 3, 5, 6, 7, 8], name: "Stains" }, 3)
      .put({ born: [3, 7, 8], survive: [2, 3, 5, 6, 7, 8], name: "Coagulations" }, 3)
      .put({ born: [3, 4, 5], survive: [4, 5, 6, 7], name: "Assimilation" }, 3)
      .put({ born: [3], survive: [4, 5, 6, 7, 8], name: "Corral" }, 3)
      .put({ born: [5, 6, 7, 8], survive: [4, 5, 6, 7, 8], name: "Vote" }, 1);

    // Add random rule
    let b_bits = Math.floor(Math.random() * 256);
    let s_bits = Math.floor(Math.random() * 256);
    let b = [];
    let s = [];
    for (let j = 0; j < 8; j++) {
      if ((b_bits >> j) & 1) b.push(j);
      if ((s_bits >> j) & 1) s.push(j);
    }
    let r_name = `b${b.join('')}/s${s.join('')}`;
    rulesets.put({ born: b, survive: s, name: r_name }, 1);
    
    window.sub_animation_size = rulesets.size();
    
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < rulesets.size()) {
      window.rules = rulesets.get_index(window.sub_animation_index);
    } else {
      window.rules = rulesets.sample();
    }
    
    var rules_index = rulesets.index_of(window.rules);
    var rule_str = `b${window.rules.born.join('')}/s${window.rules.survive.join('')}`;
    var name_str = window.rules.name.toLowerCase();
    var display_name = (name_str === rule_str) ? rule_str : `${rule_str} (${name_str})`;
    var tor_str = window.is_toroidal ? "toroidal " : "";

    tooltip(`2d automata<br>${tor_str}${display_name}`, rules_index);
    
    // Universe Initialization
    window.universe = new Array(window.rows * window.columns).fill(false);
    
    // Random Fill
    for(let i=0; i<window.universe.length; i++) {
        window.universe[i] = Math.random() < 0.2; // 20% density usually good for life-likes
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
  // This is a bit inefficient (rebuilding whole string), but matches how setCharAtIndex works conceptually 
  // though setCharAtIndex modifies the DOM text. 
  // Let's stick to setCharAtIndex loop for consistency with other animations if possible, 
  // BUT modifying the whole DOM 2000 times a frame is slow.
  // 1d_automata only did one row. Here we do all rows.
  // Actually, window.canvas.text(new_str) is called inside setCharAtIndex. 
  // Calling that rows*cols times is bad.
  // Let's replace the whole text content once.
  window.canvas.text(full_text);


  // Calculate next generation
  var next_universe = new Array(window.universe.length).fill(false);
  
  for (var y = 0; y < window.rows; y++) {
    for (var x = 0; x < window.columns; x++) {
      var neighbors = 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          var nx = x + dx;
          var ny = y + dy;
          
          if (window.is_toroidal) {
            nx = (nx + window.columns) % window.columns;
            ny = (ny + window.rows) % window.rows;
          } else {
            if (nx < 0 || nx >= window.columns || ny < 0 || ny >= window.rows) continue;
          }
          
          if (window.universe[ny * window.columns + nx]) {
            neighbors++;
          }
        }
      }
      
      var idx = y * window.columns + x;
      var alive = window.universe[idx];
      
      if (alive) {
        if (window.rules.survive.includes(neighbors)) {
          next_universe[idx] = true;
        }
      } else {
        if (window.rules.born.includes(neighbors)) {
          next_universe[idx] = true;
        }
      }
    }
  }
  
  window.universe = next_universe;

  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 100); // Slightly slower for 2D life to be visible
}
