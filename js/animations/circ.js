import { init_flat_index_list, first_frame_tooltip, get_coords, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  init_flat_index_list(window.rows, window.columns);
  var isminmax = window.constant_random_boolean;
  first_frame_tooltip("circ<br>" + (isminmax ? "out" : "in"));
  var center_x = window.columns / 2;
  var center_y = window.rows / 2;
  for (var n = 0; n < window.animation_speed_multiplier; n++) {
    var minmax_dist = 9999999 * (isminmax ? 1 : -1);
    var minmax_dist_index = -1;
    for (var i = 0; i < window.flat_index_list.length; i++) {
      var coords = get_coords(window.columns, window.flat_index_list[i]);
      var dist = Math.sqrt(Math.pow((center_x - coords[0]) * window.char_width, 2) + Math.pow((center_y - coords[1]) * window.char_height, 2))
      if (isminmax && dist < minmax_dist || !isminmax && dist > minmax_dist) {
        minmax_dist = dist;
        minmax_dist_index = i;
      }
    }
    setCharAtIndex(window.canvas, window.flat_index_list[minmax_dist_index], "o");
    window.flat_index_list.splice(minmax_dist_index, 1);
    if (window.flat_index_list.length <= 0) {
      return;
    }
  }
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
