import { tooltip, Particle, init_simplex_noise, get_simplex_noise_at, get_canvas_index, smootherstep, density_chars } from '../utils.js';

export default async (this_animation) => {
  if (window.frame_count == 0) {
    await init_simplex_noise();
    window.snowflakes = [];
    // Initialize snow accumulation grid
    window.snow_grid = new Array(window.rows);
    for (let i = 0; i < window.rows; i++) {
      window.snow_grid[i] = new Uint8Array(window.columns).fill(0);
    }
    tooltip("snow");
  }

  // Use simplex noise for global wind and density
  var time = window.frame_count * 0.0001; 
  var density_noise = get_simplex_noise_at([time, 100], 0.1, 2.0);
  var snow_intensity = smootherstep(-3, 3, density_noise);
  var startup_factor = Math.min(1.0, (window.frame_count + 1000) / 10000);
  var density = Math.pow(snow_intensity, 2.0) * 0.025 * startup_factor;

  var global_wind_noise = get_simplex_noise_at([time, 0], 0.2, 2.0, 2);
  // Very slight clip for global wind
  var global_wind = (global_wind_noise > 0 ? smootherstep(0, 3, global_wind_noise) : -smootherstep(0, 3, -global_wind_noise)) * 0.3;
  global_wind *= snow_intensity;
  
  // Constant very slight breeze
  var breeze = 0.01; 

  // Spawn new snowflakes
  var spawn_expected = density * window.columns;
  var spawn_count = Math.floor(spawn_expected) + (Math.random() < (spawn_expected % 1) ? 1 : 0);
  
  for (var i = 0; i < spawn_count; i++) {
    var x = Math.random() * window.columns;
    var y = -1;
    var drop_speed = 0.02 + Math.random() * 0.03; 
    var flake = new Particle([x, y], 0.5, [breeze + global_wind, drop_speed]);
    flake.noise_offset = Math.random() * 100;
    window.snowflakes.push(flake);
  }

  // Update snowflakes
  for (var i = window.snowflakes.length - 1; i >= 0; i--) {
    var flake = window.snowflakes[i];
    
    var ltime = window.frame_count * 0.001; 
    var local_x = get_simplex_noise_at([ltime, flake.position[0] * 0.1 + flake.noise_offset, flake.position[1] * 0.1], 0.5, 0.2); // Less magnitude
    var local_y = get_simplex_noise_at([ltime + 100, flake.position[0] * 0.1, flake.position[1] * 0.1 + flake.noise_offset], 0.5, 0.1); // Less magnitude

    flake.velocity[0] = flake.velocity[0] * 0.99 + (breeze + global_wind + local_x) * 0.01;
    var target_y_vel = 0.02 + Math.random() * 0.05; 
    flake.velocity[1] = flake.velocity[1] * 0.98 + target_y_vel * 0.02 + local_y * 0.005;

    flake.step([0, 0], 1, true);

    // Horizontal wrapping
    flake.position[0] = (flake.position[0] % window.columns + window.columns) % window.columns;

    var ix = Math.floor(flake.position[0]);
    var iy = Math.floor(flake.position[1]);

    // Accumulation logic
    if (ix >= 0 && ix < window.columns && iy >= 0 && iy < window.rows) {
      if (iy === window.rows - 1 || window.snow_grid[iy + 1][ix] >= 10) {
        var best_ix = ix;
        var best_iy = iy;
        
        for (var offset of [-1, 1]) {
          var next_ix = (ix + offset + window.columns) % window.columns;
          var search_iy = iy;
          while (search_iy < window.rows - 1 && window.snow_grid[search_iy + 1][next_ix] < 10) {
            search_iy++;
          }
          
          if (search_iy > best_iy) {
            best_iy = search_iy;
            best_ix = next_ix;
          } else if (search_iy === best_iy && window.snow_grid[search_iy][next_ix] < window.snow_grid[best_iy][best_ix]) {
            best_ix = next_ix;
          }
        }

        window.snow_grid[best_iy][best_ix] = Math.min(255, window.snow_grid[best_iy][best_ix] + 1);
        window.snowflakes.splice(i, 1);
        continue;
      }
    } else if (iy >= window.rows) {
      window.snowflakes.splice(i, 1);
    }
  }

  // Rendering
  var total_chars = (window.columns + 1) * window.rows;
  var chars = new Array(total_chars);
  
  for (var y = 0; y < window.rows; y++) {
    for (var x = 0; x < window.columns; x++) {
      var char_idx = get_canvas_index(window.columns, x, y);
      var pile_val = window.snow_grid[y][x];
      if (pile_val > 0) {
        chars[char_idx] = pile_val > 5 ? "█" : "▄";
      } else {
        chars[char_idx] = ".";
      }
    }
    chars[get_canvas_index(window.columns, window.columns, y)] = "\n";
  }

  for (var i = 0; i < window.snowflakes.length; i++) {
    var flake = window.snowflakes[i];
    var ix = Math.floor(flake.position[0]);
    var iy = Math.floor(flake.position[1]);
    
    if (ix >= 0 && ix < window.columns && iy >= 0 && iy < window.rows) {
      var index = get_canvas_index(window.columns, ix, iy);
      chars[index] = "o";
    }
  }
  
  window.canvas.text(chars.join(''));
  window.frame_count++;

  // Stop the animation if the top row is completely full
  var is_full = true;
  for (var x = 0; x < window.columns; x++) {
    if (window.snow_grid[0][x] < 10) {
      is_full = false;
      break;
    }
  }

  if (!is_full) {
    requestAnimationFrame(this_animation.bind(null, this_animation));
  }
}
