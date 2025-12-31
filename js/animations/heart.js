import { init_flat_index_list, first_frame_tooltip, get_coords, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  var isminmax = window.constant_random_boolean;
  
  if (window.frame_count === 0) {
      first_frame_tooltip(`<3<br>${isminmax ? 'out' : 'in'}`);
      var center_x = window.columns / 2;
      var center_y = window.rows / 4;
      
      var get_heart_metric = (index) => {
          var coords = get_coords(window.columns, index);
          var x_disp = (center_x - coords[0]) * window.char_width;
          var y_disp = (center_y - coords[1]) * window.char_height;
          var dist = Math.sqrt(x_disp * x_disp + y_disp * y_disp);
          var theta = Math.atan2(y_disp, x_disp);
          var sin_t = Math.sin(theta);
          var cos_t = Math.cos(theta);
          
          // Shape formula
          var r_unit = 2 - 2 * sin_t + sin_t * (Math.sqrt(Math.abs(cos_t)) / (sin_t + 1.4));
          // Avoid division by zero
          if (r_unit === 0) return isminmax ? 999999 : 0;
          return dist / r_unit;
      };

      // Ensure list is initialized and sorted
      // We use pop() for O(1) removal, so we want the target pixels at the end of the array.
      // isminmax (Out/Growth): We want smallest metric first -> Sort Descending (Smallest at end).
      // !isminmax (In/Entomb): We want largest metric first -> Sort Ascending (Largest at end).
      init_flat_index_list(window.rows, window.columns, (a, b) => {
          var metric_a = get_heart_metric(a);
          var metric_b = get_heart_metric(b);
          if (isminmax) {
              return metric_b - metric_a;
          } else {
              return metric_a - metric_b;
          }
      });
  }

  var pixels_changed = 0;
  var limit = window.animation_speed_multiplier * 10;
  
  while (pixels_changed < limit && window.flat_index_list.length > 0) {
      var index = window.flat_index_list.pop();
      setCharAtIndex(window.canvas, index, "o");
      pixels_changed++;
  }

  if (window.flat_index_list.length > 0) {
      window.frame_count++;
      requestAnimationFrame(this_animation.bind(null, this_animation));
  }
}