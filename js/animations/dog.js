import { first_frame_tooltip, init_poob_details, init_flat_index_list, get_coords, setCharAtIndex, get_ascii_char_from_canvas_index } from '../utils.js';

export default (this_animation) => {
  var isminmax = window.constant_random_boolean;
  first_frame_tooltip(`dog<br>${isminmax ? "out" : "in"}`);
  var center_x = window.columns / 2;
  var center_y = window.rows / 2;
  init_poob_details();
  init_flat_index_list(window.rows, window.columns, (index1, index2) => {
    var coords1 = get_coords(window.columns, index1);
    var coords2 = get_coords(window.columns, index2);
    var diff =  Math.sqrt(Math.pow((center_x - coords1[0]) * window.char_width, 2) + Math.pow((center_y - coords1[1]) * window.char_height, 2))
    - Math.sqrt(Math.pow((center_x - coords2[0]) * window.char_width, 2) + Math.pow((center_y - coords2[1]) * window.char_height, 2));
    return diff * (isminmax ? 1 : -1)
  });
  var poob_detail_index = -1;
  var poob_detail_score = 99999999999;
  for (var i = 0; i < window.poob_detail_dims.length; i++) {
    var score;
    var ascii_dims = window.poob_detail_dims[i];
    var canvas_dims = [window.columns, window.rows];
    if ((ascii_dims[0] <= canvas_dims[0] && ascii_dims[1] <= canvas_dims[1])
      || (ascii_dims[0] >= canvas_dims[0] && ascii_dims[1] >= canvas_dims[1])) {
      score = Math.abs(ascii_dims[0] * ascii_dims[1] - canvas_dims[0] * canvas_dims[1]);
    } else if (ascii_dims[0] > canvas_dims[0] && ascii_dims[1] < canvas_dims[1]) {
      score = (ascii_dims[0] - canvas_dims[0]) * ascii_dims[1]
        + (canvas_dims[1] - ascii_dims[1]) * canvas_dims[0];
    } else if (ascii_dims[0] < canvas_dims[0] && ascii_dims[1] > canvas_dims[1]) {
      score = (canvas_dims[0] - ascii_dims[0]) * canvas_dims[1]
        + (ascii_dims[1] - canvas_dims[1]) * ascii_dims[0];
    }
    if (score < poob_detail_score) {
      poob_detail_score = score;
      poob_detail_index = i;
    }
  }
  for (var n = 0; n < window.animation_speed_multiplier; n++) {
    var index = window.flat_index_list[0];
    setCharAtIndex(window.canvas, index, get_ascii_char_from_canvas_index(window.poob_detail[poob_detail_index], window.columns, window.rows, index));
    window.flat_index_list.shift();
    if (window.flat_index_list.length <= 0) {
      return;
    }
  }
  requestAnimationFrame(this_animation.bind(null, this_animation));
  window.frame_count++;
}
