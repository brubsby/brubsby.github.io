import { tooltip, SortedSet, get_bresenham_line_points, getOtherHalfCoord, setHalfPixel } from '../utils.js';

export default (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var is_growth = window.constant_random_boolean;
  var is_connected = window.constant_random_values[2] < 0.5;
  var growth_per_frame = Math.floor(window.constant_random_values[0] * window.animation_speed_multiplier * 5 + window.frame_count / 100);
  if (window.frame_count == 0) {
    var number_points = Math.floor(Math.min(Math.random(), Math.random(), Math.random()) * 5) + 2;
    tooltip(`bresenham<br>p=${number_points} g=${is_growth ? 'T' : 'F'} c=${is_connected ? 'T' : 'F'} f=${growth_per_frame}`);
    window.bounces = 0;
    window.line_points = [];
    window.position_pixels = [];
    window.velocity_pixels = [];
    var distance_from_edge = (coord) => Math.min(coord[0], coord[1], window.columns - coord[0] - 1, window.rows * 2 - coord[1] - 1) + 0.0000001 * coord[0] + 0.0001 * coord[1];
    window.empty_half_pixels = new SortedSet((coord1, coord2) => distance_from_edge(coord1) - distance_from_edge(coord2));
    var thetas = [];
    var point_speeds = [];
    for (var i = 0; i < number_points; i++) {
      window.line_points.push([Math.floor(Math.random() * window.columns),
      Math.floor(Math.random() * window.rows) * 2]);
      point_speeds.push(Math.random() * 15 + 5);
      thetas.push(Math.random() * 2 * Math.PI);
      window.velocity_pixels.push([point_speeds[i] * Math.cos(thetas[i]), point_speeds[i] * Math.sin(thetas[i])]);
      window.position_pixels.push([window.line_points[i][0] * window.char_width, window.line_points[i][1] * window.half_char_height]);
    }
    for (var x = 0; x < window.columns; x++) {
      for (var y = 0; y < window.rows; y++) {
        window.empty_half_pixels.add([x, y * 2]);
      }
    }
  }

  var bresenham_points = get_bresenham_line_points(window.line_points, is_connected);
  if(window.last_points) {
    for (var i = 0; i < window.last_points.length; i++) {
      var coords = window.last_points[i];
      var other_half_coords = getOtherHalfCoord(coords[0], coords[1]);
      setHalfPixel(window.canvas, coords[0], coords[1], false);
      setHalfPixel(window.canvas, other_half_coords[0], other_half_coords[1], false);
      window.empty_half_pixels.add(coords);
      window.empty_half_pixels.add(other_half_coords);
    }
  }
  if (is_growth) {
    var rules = [" ", "."];
    var added_pixels = 0;
    while (added_pixels < growth_per_frame) {
      var randomness = Math.min(Math.random(), Math.random(), Math.random(), Math.random());
      var search_window_size = (window.constant_random_values[1] * 1000 + 200) * window.animation_speed_multiplier;
      var index = Math.floor(randomness * Math.min(search_window_size, window.empty_half_pixels.size));
      var coords = window.empty_half_pixels.pop_index(index);
      setHalfPixel(window.canvas, coords[0], coords[1], true);
      added_pixels++;
      if (window.empty_half_pixels.size <= 0) {
        return;
      }
    }
  } else {
    if (window.empty_half_pixels.size >= window.rows * 2 * window.columns) {
      return;
    }
  }
  for (var i = 0; i < bresenham_points.length; i++) {
    var coords = bresenham_points[i];
    setHalfPixel(window.canvas, coords[0], coords[1], true);
  }
  window.last_points = bresenham_points;
  for (var i = 0; i < window.position_pixels.length; i++) {
    window.position_pixels[i][0] = window.position_pixels[i][0] + window.velocity_pixels[i][0];
    window.position_pixels[i][1] = window.position_pixels[i][1] + window.velocity_pixels[i][1];
  }
  for (var i = 0; i < window.position_pixels.length; i++) {
    if (window.position_pixels[i][0] < 0) {
      window.velocity_pixels[i][0] *= -1;
      window.position_pixels[i][0] -= 2 * window.position_pixels[i][0];
      window.bounces++;
    } else if (window.position_pixels[i][0] >= width) {
      window.velocity_pixels[i][0] *= -1;
      window.position_pixels[i][0] -= 2 * (window.position_pixels[i][0] - width);
      window.bounces++;
    }
    if (window.position_pixels[i][1] < 0) {
      window.velocity_pixels[i][1] *= -1;
      window.position_pixels[i][1] -= 2 * (window.position_pixels[i][1]);
      window.bounces++;
    } else if (window.position_pixels[i][1] >= height) {
      window.velocity_pixels[i][1] *= -1;
      window.position_pixels[i][1] -= 2 * (window.position_pixels[i][1] - height);
      window.bounces++;
    }
  }
  for (var i = 0; i < window.line_points.length; i++) {
    window.line_points[i][0] = Math.floor(window.position_pixels[i][0] / window.char_width);
    window.line_points[i][1] = Math.floor(window.position_pixels[i][1] / window.half_char_height);
  }
  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 25);
}
