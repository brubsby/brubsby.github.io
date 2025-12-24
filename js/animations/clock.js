import { get_bresenham_circle_points, get_bresenham_line_points, setHalfPixel, tooltip } from '../utils.js';

export default (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var center_point = [Math.floor(window.columns / 2), window.rows];
  var clock_radius = Math.floor(Math.min(window.columns, window.rows * 2)/3);
  var second_hand_radius = clock_radius * 0.75;
  var minute_hand_radius = clock_radius * 0.85;
  var hour_hand_radius = clock_radius * 0.6;
  var current_time = new Date();
  var normalized_milliseconds = current_time.getMilliseconds() / 1000;
  var normalized_seconds = (current_time.getSeconds() + normalized_milliseconds) / 60;
  var normalized_quantized_seconds = current_time.getSeconds() / 60;
  var normalized_minutes = (current_time.getMinutes() + normalized_seconds) / 60;
  var normalized_hours = (current_time.getHours() % 12 + normalized_minutes) / 12;
  var seconds_theta = 2 * Math.PI * (normalized_quantized_seconds - 0.25);
  var minutes_theta = 2 * Math.PI * (normalized_minutes - 0.25);
  var hours_theta = 2 * Math.PI * (normalized_hours - 0.25);
  var second_hand_end_point = [
    Math.round(second_hand_radius * Math.cos(seconds_theta) + center_point[0]),
    Math.round(second_hand_radius * Math.sin(seconds_theta) + center_point[1])];
  var minute_hand_end_point = [
    Math.round(minute_hand_radius * Math.cos(minutes_theta) + center_point[0]),
    Math.round(minute_hand_radius * Math.sin(minutes_theta) + center_point[1])];
  var hour_hand_end_point = [
    Math.round(hour_hand_radius * Math.cos(hours_theta) + center_point[0]),
    Math.round(hour_hand_radius * Math.sin(hours_theta) + center_point[1])];

  var circle_points = get_bresenham_circle_points(center_point[0], center_point[1], clock_radius);
  var second_hand_points = get_bresenham_line_points([center_point, second_hand_end_point]);
  var minute_hand_points = get_bresenham_line_points([center_point, minute_hand_end_point]);
  var hour_hand_points = get_bresenham_line_points([center_point, hour_hand_end_point]);
  var shapes = [circle_points, second_hand_points, minute_hand_points, hour_hand_points];

  var text = (" ".repeat(window.columns) + "\n").repeat(window.rows);
  window.canvas.text(text);
  for (var i = 0; i < shapes.length; i++) {
    var shape_points = shapes[i];
    for (var j = 0; j < shape_points.length; j++) {
      var point = shape_points[j];
      setHalfPixel(window.canvas, point[0], point[1]);
    }
  }
  tooltip(`clock<br>${current_time.getHours().toString().padStart(2,'0')}:${current_time.getMinutes().toString().padStart(2,'0')}`);
  setTimeout(this_animation.bind(null, this_animation), 333);
}
