import { init_flat_index_list, first_frame_tooltip, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  init_flat_index_list(window.rows, window.columns);
  first_frame_tooltip("rndfill");
  for (var n = 0; n < window.animation_speed_multiplier; n++) {
    var index = Math.floor(Math.random() * window.flat_index_list.length);
    setCharAtIndex(window.canvas, window.flat_index_list[index], "o");
    window.flat_index_list.splice(index, 1);
    if (window.flat_index_list.length <= 0) {
      return;
    }
  }
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
