import { first_frame_tooltip, init_simplex_noise, init_flat_index_list, get_pixel_coords, get_simplex_noise_at, setCharAtIndex, density_chars } from '../utils.js';

export default async (this_animation) => {
  if (window.frame_count == 0) {
    window.sub_animation_size = 2;
    if (isNaN(window.sub_animation_index) || window.sub_animation_index === null) {
      window.sub_animation_index = Math.floor(Math.random() * window.sub_animation_size);
    }
    window.simplex_mode = window.sub_animation_index === 1 ? "density" : "growth";
  }

  var simplex_frequency = window.animation_speed_multiplier * -0.0001635 + 0.00237;
  var simplex_amplitude = 1;
  var octaves = Math.floor(window.constant_random_values[0] * Math.min(window.animation_speed_multiplier - 1, 3)) + 1;
  first_frame_tooltip(`simplex<br>m=${window.simplex_mode === "density" ? "d" : "g"} oct=${octaves}`)
  await init_simplex_noise();

  if (window.simplex_mode === "growth") {
    init_flat_index_list(window.rows, window.columns, (index1, index2) => {
      var coords1 = get_pixel_coords(window.columns, index1, window.char_width, window.char_height);
      var coords2 = get_pixel_coords(window.columns, index2, window.char_width, window.char_height);
      return get_simplex_noise_at(coords1, simplex_frequency, simplex_amplitude, octaves)
      - get_simplex_noise_at(coords2, simplex_frequency, simplex_amplitude, octaves);
    });
    for (var n = 0; n < window.animation_speed_multiplier; n++) {
      if (window.flat_index_list.length > 0) {
        setCharAtIndex(window.canvas, window.flat_index_list[0], "o");
        window.flat_index_list.shift();
      }
    }
    if (window.flat_index_list.length <= 0) {
      return;
    }
  } else {
    var full_text = "";
    var noise_z = window.frame_count * 0.1 * window.animation_speed_multiplier;
    var max_noise_val = 0;
    for (var i = 0; i < octaves; i++) {
      max_noise_val += Math.pow(0.5, i);
    }
    max_noise_val *= simplex_amplitude;

    for (var y = 0; y < window.rows; y++) {
      for (var x = 0; x < window.columns; x++) {
        var coords = [x * window.char_width, y * window.char_height, noise_z];
        var noise_val = get_simplex_noise_at(coords, simplex_frequency * 2, simplex_amplitude, octaves);
        var char_index = Math.floor(((noise_val / max_noise_val + 1) / 2) * density_chars.length);
        char_index = Math.max(0, Math.min(density_chars.length - 1, char_index));
        full_text += density_chars[char_index];
      }
      full_text += "\n";
    }
    window.canvas.text(full_text);
  }

  requestAnimationFrame(this_animation.bind(null, this_animation));
  window.frame_count++;
}
