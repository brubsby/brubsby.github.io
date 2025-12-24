import { roundFloat, tooltip, get_canvas_index } from '../utils.js';

export default (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var ball_radius_pixels = Math.min((Math.min(width, height) / 3), window.constant_random_values[0] * Math.max(25, window.max_dim) + 75);
  if (window.frame_count == 0) {
    window.bounces = 0;
    var ball_speed = Math.min(Math.random(), Math.random(), Math.random()) * Math.min(Math.min(width, height) - 2 * ball_radius_pixels, 50);
    var theta = Math.random() * 2 * Math.PI;
    window.velocity_pixels = [ball_speed * Math.cos(theta), ball_speed * Math.sin(theta)];
    window.position_pixels = [Math.random() * (width - 2 * ball_radius_pixels) + ball_radius_pixels,
      Math.random() * (height - 2 * ball_radius_pixels) + ball_radius_pixels];
    tooltip(`dvdball<br>r=${roundFloat(ball_radius_pixels)} v=${roundFloat(ball_speed)}`);
  }
  var ball_coords = [];
  var min_x = Math.max(0, Math.floor(-1 + (window.position_pixels[0] - ball_radius_pixels) / window.char_width));
  var max_x = Math.min(window.columns, Math.floor(1 + (window.position_pixels[0] + ball_radius_pixels) / window.char_width));
  var min_y = Math.max(0, Math.floor(-1 + (window.position_pixels[1] - ball_radius_pixels) / window.char_height));
  var max_y = Math.min(window.rows, Math.floor(1 + (window.position_pixels[1] + ball_radius_pixels) / window.char_height));
  for (var i = min_x; i < max_x; i++) {
    for (var j = min_y; j < max_y; j++) {
      var x_pixels = (i + 0.5) * window.char_width;
      var y_pixels = (j + 0.5) * window.char_height;
      if (Math.sqrt(Math.pow(x_pixels - window.position_pixels[0], 2) + Math.pow(y_pixels - window.position_pixels[1], 2)) <= ball_radius_pixels) {
        ball_coords.push([i, j]);
      }
    }
  }
  var text = (".".repeat(window.columns) + "\n").repeat(window.rows);
  for (var i = 0; i < ball_coords.length; i++) {
    var index = get_canvas_index(window.columns, ball_coords[i][0], ball_coords[i][1]);
    text = text.substr(0, index) + "o" + text.substr(index + 1);
  }
  window.canvas.text(text);

  window.position_pixels = [window.position_pixels[0] + window.velocity_pixels[0],
    window.position_pixels[1] + window.velocity_pixels[1]];
  if (window.bounces < 100) {
    if (window.position_pixels[0] < ball_radius_pixels) {
      window.velocity_pixels[0] *= -1;
      window.position_pixels[0] += 2 * (ball_radius_pixels - window.position_pixels[0]);
      window.bounces++;
    } else if (window.position_pixels[0] > width - ball_radius_pixels) {
      window.velocity_pixels[0] *= -1;
      window.position_pixels[0] -= 2 * (window.position_pixels[0] + ball_radius_pixels - width);
      window.bounces++;
    }
    if (window.position_pixels[1] < ball_radius_pixels) {
      window.velocity_pixels[1] *= -1;
      window.position_pixels[1] += 2 * (ball_radius_pixels - window.position_pixels[1]);
      window.bounces++;
    } else if (window.position_pixels[1] > height - ball_radius_pixels) {
      window.velocity_pixels[1] *= -1;
      window.position_pixels[0] -= 2 * (window.position_pixels[1] + ball_radius_pixels - height);
      window.bounces++;
    }
  } else {
    if (window.position_pixels[0] < -ball_radius_pixels
      || window.position_pixels[1] < -ball_radius_pixels
      || window.position_pixels[0] > width + ball_radius_pixels
      || window.position_pixels[1] > height + ball_radius_pixels) {
      return;
    }
  }
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
