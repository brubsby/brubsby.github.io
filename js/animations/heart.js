import { init_flat_index_list, first_frame_tooltip, get_coords, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  init_flat_index_list(window.rows, window.columns);
  var isminmax = window.constant_random_boolean;
  first_frame_tooltip(`<3<br>${isminmax ? 'out' : 'in'}`);
  var center_x = window.columns / 2;
  var center_y = window.rows / 4 - (window.frame_count * 0.0001);
  var heart_multiplier = isminmax ? 2 : 45 * (window.animation_speed_multiplier + 2);
  var pixels_changed = 0;
  var tries = 0;
  while (pixels_changed < window.animation_speed_multiplier * 10) {
    window.frame_count++;
    var minmax_dist = 9999999 * (isminmax ? 1 : -1);
    var minmax_dist_index = -1;
    for (var i = 0; i < window.flat_index_list.length; i++) {
      var coords = get_coords(window.columns, window.flat_index_list[i]);
      var dist = Math.sqrt(Math.pow((coords[0] - center_x) * window.char_width, 2) + Math.pow((coords[1] - center_y) * window.char_height, 2))
      var theta = Math.atan2((center_y - coords[1]) * window.char_height, (center_x - coords[0]) * window.char_width);
      var heart_radius =
        heart_multiplier * (2 - 2 * Math.sin(theta) + Math.sin(theta)
        * (Math.sqrt(Math.abs(Math.cos(theta))) / (Math.sin(theta) + 1.4)));
      if (isminmax && dist < minmax_dist && dist < heart_radius || !isminmax && dist > minmax_dist && dist > heart_radius) {
        minmax_dist = dist;
        minmax_dist_index = i;
      }
    }
    if (minmax_dist_index == -1) {
      tries++;
      if (tries > 1000) {
        while (true) {
          setCharAtIndex(window.canvas, window.flat_index_list[0], "o");
          window.flat_index_list.shift();
          if (window.flat_index_list.length <= 0) {
            return;
          }
        }
      }
      heart_multiplier += 3 * (isminmax ? 1 : -1);
      continue;
    }
    setCharAtIndex(window.canvas, window.flat_index_list[minmax_dist_index], "o");
    pixels_changed++;
    window.flat_index_list.splice(minmax_dist_index, 1);
    if (window.flat_index_list.length <= 0) {
      return;
    }
  }
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
