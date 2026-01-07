import { first_frame_tooltip, init_simplex_noise, init_flat_index_list, get_pixel_coords, get_simplex_noise_at, setCharAtIndex } from '../utils.js';

export default async (this_animation) => {
  var simplex_frequency = window.animation_speed_multiplier * -0.0001635 + 0.00237;
  var simplex_amplitude = 1;
  var octaves = Math.floor(window.constant_random_values[0] * Math.min(window.animation_speed_multiplier - 1, 3)) + 1;
  first_frame_tooltip(`simplex growth<br>oct=${octaves}`)
  await init_simplex_noise();
  init_flat_index_list(window.rows, window.columns, (index1, index2) => {
    var coords1 = get_pixel_coords(window.columns, index1, window.char_width, window.char_height);
    var coords2 = get_pixel_coords(window.columns, index2, window.char_width, window.char_height);
    return get_simplex_noise_at(coords1, simplex_frequency, simplex_amplitude, octaves)
    - get_simplex_noise_at(coords2, simplex_frequency, simplex_amplitude, octaves);
  });
  for (var n = 0; n < window.animation_speed_multiplier; n++) {
    setCharAtIndex(window.canvas, window.flat_index_list[0], "o");
    window.flat_index_list.shift();
    if (window.flat_index_list.length <= 0) {
      return;
    }
  }
  requestAnimationFrame(this_animation.bind(null, this_animation));
  window.frame_count++;
}
