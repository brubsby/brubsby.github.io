import { first_frame_tooltip, init_falloff_map, init_simplex_noise, init_mapgen_tiles, get_simplex_noise_at, init_flat_index_list, get_pixel_coords, setCharAtIndex, get_coords, get_canvas_index, SortedSet } from '../utils.js';

export default async (this_animation) => {
  var simplex_frequency = window.animation_speed_multiplier * -0.0001635 + 0.00237;
  var flood_frequency = window.animation_speed_multiplier * 0.00015 + 0.002;
  var simplex_amplitude = 1;
  var octaves = Math.floor(Math.min(window.animation_speed_multiplier - 1, 3)) + 1;
  var lacunarity = 2;
  var gain = 0.5;
  var isisland = window.constant_random_boolean;
  first_frame_tooltip(`mapgen`)
  init_falloff_map(window.rows, window.columns, window.char_width, window.char_height);
  init_mapgen_tiles();
  await init_simplex_noise();
  var value_at = (coords) => {
    var value = get_simplex_noise_at(coords, simplex_frequency, simplex_amplitude, octaves, lacunarity, gain);
    if (isisland) {
      value -= window.falloff_map(coords);
    }
    return value;
  }
  
  // Initialize Global State for this Animation
  if (!window.mapgen_water_queue || window.mapgen_rows != window.rows || window.mapgen_cols != window.columns) {
    window.mapgen_rows = window.rows;
    window.mapgen_cols = window.columns;
    
    // State machine: 'flood', 'pause', 'rise_init', 'rise'
    window.mapgen_state = 'flood';
    
    window.mapgen_water_queue = [];
    window.mapgen_rise_queue = []; // Will hold the sorted events for Phase 2
    window.mapgen_pause_start = null;

    // Reconstruct probabilities/thresholds
    var mapgen_probabilities = [];
    var max_amplitude = simplex_amplitude * (Math.pow(gain, octaves) - 1) / (gain - 1);
    mapgen_probabilities.push(max_amplitude);
    mapgen_probabilities.push(-0.15);
    for (var i = 0; i < window.flat_mapgen_tiles.length - 2; i++) {
      mapgen_probabilities.push((i + 1) * simplex_amplitude / (window.flat_mapgen_tiles.length - 1));
    }
    mapgen_probabilities.sort((a,b) => a - b);
    window.mapgen_probabilities = mapgen_probabilities; // Save for Phase 2
    
    init_flat_index_list(window.rows, window.columns);
    var all_pixels = [];
    window.mapgen_water_char = window.flat_mapgen_tiles[0];

    // Store values for fast lookup
    var max_idx = get_canvas_index(window.columns, window.columns-1, window.rows-1) + 1;
    window.mapgen_values = new Float32Array(max_idx);
    window.mapgen_resistance = new Float32Array(max_idx);
    
    for (var i = 0; i < window.flat_index_list.length; i++) {
      var idx = window.flat_index_list[i];
      var coords = get_pixel_coords(window.columns, idx, window.char_width, window.char_height);
      var val = value_at(coords);
      
      window.mapgen_values[idx] = val;

      // Resistance for flood
      var resistance_coords = [coords[0] + 10000, coords[1] + 10000];
      var resistance_val = get_simplex_noise_at(resistance_coords, flood_frequency * 2, simplex_amplitude, 2, lacunarity, gain);
      window.mapgen_resistance[idx] = (resistance_val + 1) / 2;

      var tile_idx = 0;
      for (var j = 0; j < mapgen_probabilities.length; j++) {
        if (val > mapgen_probabilities[j]) {
            tile_idx = j + 1;
        } else {
            break;
        }
      }
      tile_idx = Math.min(tile_idx, window.flat_mapgen_tiles.length - 1);
      
      var char = window.flat_mapgen_tiles[tile_idx];
      var grid_coords = get_coords(window.columns, idx);
      
      var p = {
        index: idx,
        x: grid_coords[0],
        y: grid_coords[1],
        val: val,
        char: char, // Final char
        is_water: (tile_idx === 0)
      };
      
      all_pixels.push(p);
    }
    window.mapgen_all_pixels = all_pixels; // Save for Phase 2

    // Setup Phase 1: Dijkstra Flood
    var pq = new SortedSet([], (a, b) => (a.dist - b.dist) || (a.index - b.index));
    var dists = new Float32Array(max_idx).fill(Infinity);
    var visited = new Set();
    
    // Init edges
    for (var i = 0; i < all_pixels.length; i++) {
        var p = all_pixels[i];
        if (p.x === 0 || p.x === window.columns - 1 || p.y === 0 || p.y === window.rows - 1) {
            dists[p.index] = 0;
            pq.add({dist: 0, index: p.index, x: p.x, y: p.y});
        }
    }

    while(pq.size > 0) {
        var u = pq.pop_index(0);
        
        if (visited.has(u.index)) continue;
        visited.add(u.index);
        
        window.mapgen_water_queue.push(u.index);

        var neighbors = [
            [u.x + 1, u.y], [u.x - 1, u.y],
            [u.x, u.y + 1], [u.x, u.y - 1]
        ];
        
        for (var n of neighbors) {
            var nx = n[0];
            var ny = n[1];
            if (nx >= 0 && nx < window.columns && ny >= 0 && ny < window.rows) {
                var v_idx = get_canvas_index(window.columns, nx, ny);
                if (!visited.has(v_idx)) {
                    var r_val = window.mapgen_resistance[v_idx];
                    var cost = 1 + r_val * 15;
                    var new_dist = u.dist + cost;
                    if (new_dist < dists[v_idx]) {
                        dists[v_idx] = new_dist;
                        pq.add({dist: new_dist, index: v_idx, x: nx, y: ny});
                    }
                }
            }
        }
    }
  }

  var pixels_changed = 0;
  var speed = window.animation_speed_multiplier * 4;
  
  if (window.mapgen_state === 'flood') {
      while (window.mapgen_water_queue.length > 0 && pixels_changed < speed) {
          var idx = window.mapgen_water_queue.shift();
          setCharAtIndex(window.canvas, idx, window.mapgen_water_char);
          pixels_changed++;
      }
      if (window.mapgen_water_queue.length === 0) {
          window.mapgen_state = 'pause';
          window.mapgen_pause_start = Date.now();
      }
  }
  
  if (window.mapgen_state === 'pause') {
      if (Date.now() - window.mapgen_pause_start > 1000) {
          window.mapgen_state = 'rise_init';
      }
  }

  if (window.mapgen_state === 'rise_init') {
      // Calculate Rise Events
      var events = [];
      var probs = window.mapgen_probabilities;
      
      for (var i = 0; i < window.mapgen_all_pixels.length; i++) {
          var p = window.mapgen_all_pixels[i];
          var val = p.val;
          
          for (var j = 0; j < probs.length; j++) {
              // Transition to tile index j+1
              var threshold = probs[j];
              var trigger_offset = threshold - val;
              
              if (trigger_offset <= 0) {
                  events.push({
                      offset: trigger_offset,
                      index: p.index,
                      char: window.flat_mapgen_tiles[j + 1]
                  });
              }
          }
      }
      
      events.sort((a, b) => a.offset - b.offset);
      window.mapgen_rise_queue = events;
      
      // Calculate speed to take roughly 10 seconds based on INITIAL queue size
      // Assuming 60fps
      var target_speed = Math.ceil(window.mapgen_rise_queue.length / (10 * 60));
      window.mapgen_rise_speed = Math.max(1, target_speed);
      
      window.mapgen_state = 'rise';
  }

  if (window.mapgen_state === 'rise') {
      while (window.mapgen_rise_queue.length > 0 && pixels_changed < window.mapgen_rise_speed) {
          var event = window.mapgen_rise_queue.shift();
          setCharAtIndex(window.canvas, event.index, event.char);
          pixels_changed++;
      }
  }
  
  if (window.mapgen_state !== 'rise' || window.mapgen_rise_queue.length > 0) {
    window.frame_count++;
    requestAnimationFrame(this_animation.bind(null, this_animation));
  }
}
