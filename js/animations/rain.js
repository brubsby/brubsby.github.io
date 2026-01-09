import { tooltip, Particle, init_simplex_noise, get_simplex_noise_at, get_canvas_index, smootherstep } from '../utils.js';

export default async (this_animation) => {
  if (window.frame_count == 0) {
    await init_simplex_noise();
    window.raindrops = [];
    tooltip("rain");
  }

  // Use simplex noise for smooth changes in wind and density
  var time = window.frame_count * 0.0025;
  
  var density_noise = get_simplex_noise_at([time, 100], 0.1, 2.0, 2); // range ~ -3 to 3
  var rain_intensity = smootherstep(-3, 3, density_noise); // 0 to 1
  var density = Math.pow(rain_intensity, 2.5) * 0.33;

  var wind_noise = get_simplex_noise_at([time, 0], 0.2, 2.0, 2); // range ~ -3 to 3
  // map wind: noise -3 -> -1.5, noise 0 -> 0, noise 3 -> 1.5, then scale by rain
  var wind_raw;
  if (wind_noise > 0) {
    wind_raw = smootherstep(0, 3, wind_noise) * 1.5;
  } else {
    wind_raw = smootherstep(0, 3, -wind_noise) * -1.5;
  }
  var wind = wind_raw * rain_intensity;

  // Spawn new raindrops at the top
  var spawn_expected = density * window.columns;
  var spawn_count = Math.floor(spawn_expected) + (Math.random() < (spawn_expected % 1) ? 1 : 0);
  
  for (var i = 0; i < spawn_count; i++) {
    var x = Math.random() * window.columns;
    var y = -1;
    var drop_speed = 0.8 + Math.random() * 0.7;
    window.raindrops.push(new Particle([x, y], null, [wind * drop_speed, drop_speed]));
  }

  // Update, wrap (horizontally), and filter (vertically) raindrops
  for (var i = window.raindrops.length - 1; i >= 0; i--) {
    var drop = window.raindrops[i];
    // Update velocity based on current wind
    drop.velocity[0] = drop.velocity[0] * 0.95 + (wind * drop.velocity[1]) * 0.05;
    drop.step([0, 0], 1, true);

    // Horizontal toroidal wrapping (Cylinder)
    drop.position[0] = (drop.position[0] % window.columns + window.columns) % window.columns;

    // Filter out drops that go off the bottom
    if (drop.position[1] > window.rows) {
      window.raindrops.splice(i, 1);
    }
  }

  // Optimized rendering
  var total_chars = (window.columns + 1) * window.rows;
  var chars = new Array(total_chars);
  for (var i = 0; i < total_chars; i++) {
    if (i % (window.columns + 1) === window.columns) {
      chars[i] = "\n";
    } else {
      chars[i] = ".";
    }
  }

  for (var i = 0; i < window.raindrops.length; i++) {
    var drop = window.raindrops[i];
    var ix = Math.floor(drop.position[0]);
    var iy = Math.floor(drop.position[1]);
    
    if (ix >= 0 && ix < window.columns && iy >= 0 && iy < window.rows) {
      var index = get_canvas_index(window.columns, ix, iy);
      if (index >= 0 && index < total_chars) {
        chars[index] = "o";
      }
    }
  }
  
  window.canvas.text(chars.join(''));
  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
