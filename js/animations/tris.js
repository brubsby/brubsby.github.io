import { init_flat_index_list, roundFloat, first_frame_tooltip, get_coords, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  init_flat_index_list(window.rows, window.columns);
  var theta = window.constant_random_values[0] * Math.PI * 2;
  var a = Math.cos(theta);
  var b = Math.sin(theta);
  var c = window.constant_random_values[0] * 100000;
  first_frame_tooltip(`tris<br>a=${roundFloat(a)} b=${roundFloat(b)}`);
  for (var n = 0; n < window.animation_speed_multiplier; n++) {
    var min_dist = 9999999;
    var max_dist = -9999999;
    var min_dist_index = -1;
    var max_dist_index = -1;
    for (var i = 0; i < window.flat_index_list.length; i++) {
      var coords = get_coords(window.columns, window.flat_index_list[i]);
      var pixel_coords = [coords[0] * window.char_width, coords[1] * window.char_height];
      var dist = Math.abs(a * pixel_coords[0] + b * pixel_coords[1] + c) / Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
      if (dist < min_dist) {
        min_dist = dist;
        min_dist_index = i;
      }
      if (dist > max_dist) {
        max_dist = dist;
        max_dist_index = i;
      }
    }
    setCharAtIndex(window.canvas, window.flat_index_list[min_dist_index], "o");
    setCharAtIndex(window.canvas, window.flat_index_list[max_dist_index], "o");
    window.flat_index_list.splice(max_dist_index, 1);
    if (max_dist_index != min_dist_index) {
      if (max_dist_index < min_dist_index) {
        window.flat_index_list.splice(min_dist_index - 1, 1);
      } else {
        window.flat_index_list.splice(min_dist_index, 1);
      }
    }
    if (window.flat_index_list.length <= 0) {
      return;
    }
  }
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
