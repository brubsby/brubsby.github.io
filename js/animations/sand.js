import { get_random_int_with_expected_float_average, init_simplex_noise, ObjectSampler, get_simplex_noise_at, roundFloat, tooltip, is_grid_offset_in_bounds, is_grid_offset_true, get_coord_offset, mark_grid } from '../utils.js';

export default async (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var expected_value_new_sand_per_frame = window.constant_random_values[0] * 3;
  var max_new_sand_this_frame = get_random_int_with_expected_float_average(expected_value_new_sand_per_frame);
  var jitter_chance = window.constant_random_values[1] * 0.75;
  var dropper_radius = Math.min(window.constant_random_values[2],
    window.constant_random_values[3]) * window.char_width * 10 + window.char_width / 2;
  var dropper_position_frequency =  Math.min(window.constant_random_values[4],
    window.constant_random_values[5], window.constant_random_values[6]) * 0.125 + 0.001;
  var dropper_direction = window.constant_random_boolean ? 1 : -1;
  await init_simplex_noise();
  if (window.frame_count == 0) {
    window.active_sand_coords = [];
    window.grid = [];
    for (var i = 0; i < window.rows; i++) {
      window.grid.push(Array(window.columns).fill(false));
    }
    window.jitter_offsets = [[1, 1], [1, -1]];
    window.gravity_offset = [1, 0];
    // funcs range will be clamped to -1, 1 and period 2PI
    window.dropper_movement_funcs = new ObjectSampler()
      .put([(freq, i) => Math.sin(i * freq), "sin"], 0.5)
      .put([(freq, i) => Math.cos(i * freq), "cos"], 0.5)
      //triangle
      .put([(freq, i) => 2.1 * Math.asin(Math.sin(i * freq)) / Math.PI, "triangle"], 1)
      //sawtooth
      .put([(freq, i) => -2.1 * Math.atan(1 / Math.tan(i * freq / 2)) / Math.PI, "sawtooth"], 1)
      //square
      .put([(freq, i) => Math.sign(Math.cos(i * freq)), "square"], 0.75)
      //pulse
      .put([(freq, i) => Math.sign(window.constant_random_values[7] + Math.cos(i * freq)), `pulse(d=${roundFloat(window.constant_random_values[7])})`], 0.5)
      //one side
      .put([(freq, i) => 1, "right"], 0.25)
      .put([(freq, i) => get_simplex_noise_at(i * freq, 1 / (2 * Math.PI), 1.5), "simplex(o=1)"], 1)
      .put([(freq, i) => get_simplex_noise_at(i * freq, 1 / (2 * Math.PI), 1.25, 2), "simplex(o=2)"], 0.5)
                .put([(freq, i) => get_simplex_noise_at(i * freq, 1 / (2 * Math.PI), 1.125, 3), "simplex(o=3)"], 0.5);
              window.sub_animation_size = window.dropper_movement_funcs.size();
              var dropper;            var dropper_index;
            if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < window.dropper_movement_funcs.size()) {
              dropper_index = window.sub_animation_index;
              dropper = window.dropper_movement_funcs.get_index(dropper_index);
            } else {
              dropper = window.dropper_movement_funcs.sample();
              dropper_index = window.dropper_movement_funcs.index_of(dropper);
            }
            window.dropper_movement_func = dropper[0];
            tooltip(`sand m=${dropper[1]} f=${roundFloat(dropper_position_frequency)} s=${dropper_direction} p=${roundFloat(expected_value_new_sand_per_frame)} j=${roundFloat(jitter_chance)} r=${roundFloat(dropper_radius)}`, dropper_index)
          }
  //physics
  for (var i = 0; i < window.active_sand_coords.length; i++) {
    var sand_coord = window.active_sand_coords[i];
    var is_jitter = Math.random() < jitter_chance;
    var jitter_index = Math.floor(Math.random() * window.jitter_offsets.length);
    var jitter_offset = window.jitter_offsets[jitter_index];
    var has_moved = false;
    if (is_jitter) {
      if (is_grid_offset_in_bounds(window.grid, sand_coord, jitter_offset)) {
        if (!is_grid_offset_true(window.grid, sand_coord, jitter_offset)) {
          window.active_sand_coords[i] = get_coord_offset(sand_coord, jitter_offset);
          mark_grid(window.grid, sand_coord, false);
          mark_grid(window.grid, window.active_sand_coords[i], true);
          has_moved = true;
        }
      }
    }
    if (!has_moved && is_grid_offset_in_bounds(window.grid, sand_coord, window.gravity_offset)) {
      if (!is_grid_offset_true(window.grid, sand_coord, window.gravity_offset)) {
        window.active_sand_coords[i] = get_coord_offset(sand_coord, window.gravity_offset);
        mark_grid(window.grid, sand_coord, false);
        mark_grid(window.grid, window.active_sand_coords[i], true);
        has_moved = true;
      }
    }
  }

  //dropper code
  var dropper_position_optima = [dropper_radius / 2, width - (dropper_radius / 2)];
  var min_empty_x = -1;
  var max_empty_x = -1;
  for (var i = 0; i < window.columns; i++) {
    if (!window.grid[0][i]) {
      if (min_empty_x == -1) {
        min_empty_x = i;
      }
      max_empty_x = i;
    }
  }
  var new_optima = [(min_empty_x + 0.5) * window.char_width,
    (max_empty_x + 0.5) * window.char_width];
  dropper_position_optima = [Math.max(dropper_position_optima[0], new_optima[0]),
    Math.min(dropper_position_optima[1], new_optima[1])];
  var dropper_position_midpoint = (dropper_position_optima[0] + dropper_position_optima[1]) / 2;
  var dropper_position_amplitude = (dropper_position_optima[1] - dropper_position_optima[0]) / 2
  var dropper_position_pixels = dropper_position_midpoint +
    dropper_direction * window.dropper_movement_func(dropper_position_frequency, window.frame_count) * dropper_position_amplitude;
  if (dropper_position_pixels < dropper_position_optima[0]) dropper_position_pixels = dropper_position_optima[0];
  if (dropper_position_pixels > dropper_position_optima[1]) dropper_position_pixels = dropper_position_optima[1];
  var min_x = Math.max(0, Math.floor((dropper_position_pixels - dropper_radius) / window.char_width));
  var max_x = Math.min(window.columns - 1, Math.floor((dropper_position_pixels + dropper_radius) / window.char_width));
  var candidate_coordinates = [];
  for (var i = min_x; i <= max_x; i++) {
    var x_pixels = (i + 0.5) * window.char_width;
    if (x_pixels - dropper_position_pixels <= dropper_radius) {
      if (!window.grid[0][i]) {
        candidate_coordinates.push([0, i]);
      }
    }
  }
  var new_sand_count = 0;
  while(new_sand_count < max_new_sand_this_frame && candidate_coordinates.length > 0) {
      var random_index = Math.floor(Math.random() * candidate_coordinates.length);
      var random_candidate_coordinate = candidate_coordinates[random_index];
      window.active_sand_coords.push(random_candidate_coordinate);
      mark_grid(window.grid, random_candidate_coordinate, true);
      candidate_coordinates.splice(random_index, 1);
      new_sand_count++;
  }

  //render
  var any_empty = false;
  var text = "";
  for (var i = 0; i < window.grid.length; i++) {
    for (var j = 0; j < window.grid[0].length; j++) {
      if (window.grid[i][j]) {
        text += "o";
      } else {
        text += ".";
        any_empty = true;
      }
    }
    text += "\n";
  }
  window.canvas.text(text);
  if (!any_empty) return;
  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 25);
}
