import { first_frame_tooltip, init_falloff_map, init_simplex_noise, init_mapgen_tiles, get_simplex_noise_at, init_flat_index_list, get_pixel_coords, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  var isisland = window.constant_random_boolean;
  var frequency = window.animation_speed_multiplier * -0.0001635 + 0.00237;
  var amplitude = 1;
  var octaves = Math.floor(Math.min(window.animation_speed_multiplier - 1, 3)) + 1;
  first_frame_tooltip(`mapgen<br>oct=${octaves} island=${isisland ? "T" : "F"}`)
  var lacunarity = 2;
  var gain = 0.5;
  var pixels_changed = 0;
  init_falloff_map(window.rows, window.columns, window.char_width, window.char_height);
  init_simplex_noise();
  init_mapgen_tiles();
  var value_at = (coords) => {
    var value = get_simplex_noise_at(coords, frequency, amplitude, octaves, lacunarity, gain);
    if (isisland) {
      value -= window.falloff_map(coords);
    }
    return value;
  }
  init_flat_index_list(window.rows, window.columns, (index1, index2) => {
    var coords1 = get_pixel_coords(window.columns, index1, window.char_width, window.char_height);
    var coords2 = get_pixel_coords(window.columns, index2, window.char_width, window.char_height);
    return value_at(coords1)
    - value_at(coords2);
  });
  if (!window.mapgen_probabilities) {
    window.mapgen_probabilities = [];
    var max_amplitude = amplitude * (Math.pow(gain, octaves) - 1) / (gain - 1);
    window.mapgen_probabilities.push(max_amplitude);
    window.mapgen_probabilities.push(-0.15);
    for (var i = 0; i < window.flat_mapgen_tiles.length - 2; i++) {
      window.mapgen_probabilities.push((i + 1) * amplitude / (window.flat_mapgen_tiles.length - 1));
    }
    window.mapgen_probabilities.sort();
    for (var i = 0; i < window.flat_mapgen_tiles.length; i++) {
      window.index_lists.push([]);
    }
    var current_noise;
    var current_tile_index = 0;
    for (var i = 0; i < window.flat_index_list.length; i++) {
      var current_coords = get_pixel_coords(window.columns, window.flat_index_list[i], window.char_width, window.char_height);
      current_noise = value_at(current_coords);
      for (var j = 0; j <= current_tile_index; j++) {
        window.index_lists[j].push(window.flat_index_list[i]);
      }
      if (current_noise > window.mapgen_probabilities[current_tile_index]) {
        current_tile_index = Math.min(current_tile_index + 1, window.flat_mapgen_tiles.length - 1);
      }
    }
  }
  var any_pixels = false;
  for (var i = 0; i < window.index_lists.length; i++) {
    while(window.index_lists[i].length > 0 && pixels_changed < window.animation_speed_multiplier * 4) {
      setCharAtIndex(window.canvas, window.index_lists[i][0], window.flat_mapgen_tiles[i]);
      window.index_lists[i].shift();
      pixels_changed++;
      any_pixels = true;
    }
  }
  if (!any_pixels) return;
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
