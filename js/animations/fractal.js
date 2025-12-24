import { ObjectSampler, tooltip, roundFloat, isInt } from '../utils.js';

var grid_coords_to_complex = (y, x, height, width, char_height, char_width, bounds) => {
  var re_range = bounds[1].re - bounds[0].re;
  var im_range = bounds[1].im - bounds[0].im;
  var re_pos = ((x + 0.5) * char_width / width) * re_range + bounds[0].re;
  var im_pos = ((y + 0.5) * char_height / height) * im_range + bounds[0].im;
  return window.math.complex(re_pos, im_pos);
}

var fractal_iteration = (point, formula, max_iterations, start=0, threshold=2) => {
  var iterations = 0;
  var value = start === null ? point : start;
  while (iterations < max_iterations && window.math.abs(value) < threshold) {
    value = formula(value, point);
    iterations++;
  }
  return iterations == max_iterations;
}

var find_boundary_point = (center_finder_iterations, center_finder_max_radius, center_finder_num_recurses, fractal) => {
  var sample_count = 20;
  var max_attempts = 10;
  
  for (var attempt = 0; attempt < max_attempts; attempt++) {
    var theta = fractal["theta_func"]();
    var low = 0;
    var high = center_finder_max_radius;
    
    // Stage 1: Linear sampling to find a boundary transition
    // Start slightly above 0 to avoid the origin singularity
    var found = false;
    var low_status = null;
    var epsilon = 0.001;
    
    for (var i = 0; i <= sample_count; i++) {
      var r = epsilon + (i / sample_count) * (center_finder_max_radius - epsilon);
      var p = window.math.complex(r * Math.cos(theta), r * Math.sin(theta));
      var status = fractal_iteration(p, fractal["formula"], center_finder_num_recurses, fractal["start"]);
      if (i > 0 && status !== low_status) {
        low = epsilon + ((i - 1) / sample_count) * (center_finder_max_radius - epsilon);
        high = r;
        found = true;
        break;
      }
      low_status = status;
    }

    if (found) {
      // Stage 2: Binary search on the identified segment
      var candidate_radius = (low + high) / 2;
      var candidate_point;
      for (var i = 0; i < center_finder_iterations; i++) {
        candidate_point = window.math.complex(candidate_radius * Math.cos(theta), candidate_radius * Math.sin(theta));
        if (fractal_iteration(candidate_point, fractal["formula"], center_finder_num_recurses, fractal["start"]) === low_status) {
          low = candidate_radius;
        } else {
          high = candidate_radius;
        }
        candidate_radius = (low + high) / 2;
      }
      return candidate_point;
    }
  }

  // Fallback: Pick a random point if no boundary found after all attempts
  var r_rand = Math.random() * center_finder_max_radius;
  var theta_rand = Math.random() * 2 * Math.PI;
  return window.math.complex(r_rand * Math.cos(theta_rand), r_rand * Math.sin(theta_rand));
}

export default (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var iterations = Math.floor(150000 / (window.rows * window.columns));
  var this_timestamp = (new Date()).getTime();
  var framerate = 1000 / (this_timestamp - window.last_timestamp);
  window.last_timestamp = this_timestamp;

  if (window.frame_count == 0) {
    var center_finder_iterations = iterations;
    var center_finder_max_radius = 4;

    var createFractal = (props) => Object.assign({
      "theta_func" : () => Math.random() * 2 * Math.PI,
      "boundary_finder_iteration_multiplier" : 0.5,
      "start_func" : () => window.math.complex(0, 0),
      "zoom_speed" : 0.1,
      "setup": function(seed) { return { formula: this.formula, start: seed }; }
    }, props);

    var mandelbrot = createFractal({
      "formula" : (z, c) => window.math.add(window.math.pow(z, 2), c),
      "description" : "mandelbrot"
    });
    var tricorn = createFractal({
      "formula" : (z, c) => window.math.add(window.math.pow(window.math.conj(z), 2), c),
      "theta_func" : () => (Math.random() * 2 - 1) * 0.13 + Math.PI + (Math.floor(Math.random() * 3) * 2 * Math.PI / 3),
      "boundary_finder_iteration_multiplier" : 0.99,
      "description" : "tricorn"
    });
    var burningShip = createFractal({
      "formula" : (z, c) => window.math.add(window.math.pow(window.math.complex(window.math.abs(z.re), window.math.abs(z.im)), 2), c),
      "theta_func" : () => -(Math.random() * 0.69 * Math.PI + Math.PI * 0.32),
      "boundary_finder_iteration_multiplier" : 0.95,
      "description" : "burning ship"
    });
    var cubic = createFractal({
      "formula" : (z, c) => window.math.add(window.math.pow(z, 3), c),
      "description" : "cubic mandelbrot"
    });
    var quartic = createFractal({
      "formula" : (z, c) => window.math.add(window.math.pow(z, 4), c),
      "description" : "quartic mandelbrot"
    });
    var celtic = createFractal({
      "formula" : (z, c) => {
        var z2 = window.math.pow(z, 2);
        return window.math.add(window.math.complex(window.math.abs(z2.re), z2.im), c);
      },
      "theta_func" : () => Math.PI + (Math.random() - 0.5) * Math.PI * 0.75,
      "description" : "celtic mandelbrot"
    });
    var tippetts = createFractal({
      "formula" : (z, c) => {
        var x = z.re * z.re - z.im * z.im + c.re;
        var y = 2 * x * z.im + c.im;
        return window.math.complex(x, y);
      },
      "description" : "tippetts mandelbrot"
    });
    var cactus = createFractal({
      "description" : "cactus",
      "formula" : (z, c) => window.math.subtract(window.math.add(window.math.pow(z, 3), window.math.multiply(window.math.subtract(c, 1), z)), c),
      "setup": function(seed) { return { formula: this.formula, start: null }; }
    });
    var marek = createFractal({
      "description" : "marek",
      "setup": function(seed) {
          var r;
          if (Math.random() < 0.5) {
            r = Math.random();
          } else {
            r = (1 - (Math.sqrt(2) - Math.sqrt(3) + Math.sqrt(5)) / 2.0);
          }
          this.r = r;
          var zc = window.math.exp(window.math.complex(0, 2 * Math.PI * r));
          return {
            formula: (z) => window.math.add(window.math.multiply(zc, z), window.math.pow(z, 2)),
            start: null
          };
      }
    });
    var lemon = createFractal({
      "description" : "lemon",
      "formula" : (z, c) => {
        var z2 = window.math.pow(z, 2);
        var num = window.math.multiply(z2, window.math.add(z2, 1));
        var den = window.math.pow(window.math.subtract(z2, 1), 2);
        return window.math.multiply(c, window.math.divide(num, den));
      },
      "boundary_finder_iteration_multiplier" : 0.9,
      "max_radius": 4,
      "zoom_speed" : 0.1,
      "threshold" : 100,
      "setup": function(seed) { return { formula: this.formula, start: null, threshold: this.threshold }; }
    });
    var mandelpower = createFractal({
      "description" : "mandelpower",
      "setup": function(seed) {
          var M;
          if (Math.random() < 0.5) { // Integer
              if (Math.random() < 0.5) { // 3 to 10
                  M = Math.floor(Math.random() * (10 - 3 + 1)) + 3;
              } else { // -10 to -2
                  M = Math.floor(Math.random() * (-2 - (-10) + 1)) - 10;
              }
          } else { // Non-integer
              M = Math.random() * 20 - 10;
          }
          this.M = M;
          return { formula: (z, c) => window.math.add(window.math.pow(z, M), c), start: null };
      }
    });

    var multimandel = createFractal({
      "description" : "multimandel",
      "setup": function(seed) {
          var ps = [0, 1, 2, -1];
          var p = ps[Math.floor(Math.random() * ps.length)];
          this.p = p;
          return {
            formula: (z, c) => {
              var cp = p === 0 ? 1 : (p === 1 ? c : window.math.pow(c, p));
              return window.math.add(window.math.multiply(cp, window.math.pow(z, -2)), c);
            },
            start: null
          };
      }
    });

    var julia = createFractal({
      "boundary_finder_iteration_multiplier" : 0.75,
      "start_func" : () => find_boundary_point(center_finder_iterations, center_finder_max_radius, 5000, mandelbrot),
      "description" : "julia",
      "setup": function(seed) { return { formula: (z) => window.math.add(window.math.pow(z, 2), seed), start: null }; }
    });

    window.fractals = new ObjectSampler()
      .put(mandelbrot, 2)
      .put(tricorn, 2)
      .put(burningShip, 2)
      .put(cubic, 2)
      .put(quartic, 2)
      .put(celtic, 2)
      .put(tippetts, 2)
      .put(cactus, 2)
      .put(marek, 2)
      .put(lemon, 0)
      .put(mandelpower, 2)
      .put(multimandel, 2)
      .put(julia, 4);

    window.sub_animation_size = window.fractals.size();
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < window.fractals.size()) {
      window.fractal = window.fractals.get_index(window.sub_animation_index);
    } else {
      window.fractal = window.fractals.sample();
    }
    var fractal_index = window.fractals.index_of(window.fractal);
    var seed = window.fractal["start_func"]();
    var config = window.fractal.setup(seed);
    window.fractal.formula = config.formula;
    window.fractal.start = config.start;
    window.fractal.render_threshold = config.threshold || 2;

    var center_finder_num_recurses = Math.floor(iterations * window.fractal["boundary_finder_iteration_multiplier"]);
    var current_max_radius = window.fractal.max_radius || center_finder_max_radius;
    window.center = find_boundary_point(center_finder_iterations, current_max_radius, center_finder_num_recurses, window.fractal);
    
    var desc = window.fractal["description"];
    if (desc === "mandelpower") {
      var m_display = isInt(window.fractal.M) ? window.fractal.M.toString() : roundFloat(window.fractal.M);
      desc += ` M=${m_display}`;
    } else if (desc === "multimandel") {
      desc += ` p=${window.fractal.p}`;
    } else if (desc === "marek") {
      desc += ` r=${roundFloat(window.fractal.r, 4)}`;
    }
    
    if (window.fractal["description"] === 'julia') {
      desc += ` c=${roundFloat(seed.re, 4)}${seed.im < 0 ? '' : '+'}${roundFloat(seed.im, 4)}i`;
    }

    tooltip(`${desc}<br>${roundFloat(window.center["re"], 4)}${window.center['im'] < 0 ? '' : '+'}${roundFloat(window.center["im"], 4)}i`, fractal_index);
    
    window.target_framerate = 30;
    window.average_framerate = window.target_framerate;
  }

  var framerate_adjuster_magnitude = 2;
  var buffered_framecount = 10 + window.frame_count;
  window.average_framerate = (window.average_framerate * buffered_framecount + framerate) / (buffered_framecount + 1);
  iterations = Math.floor(iterations + framerate_adjuster_magnitude * (window.average_framerate - window.target_framerate));

  var radius = 10 * Math.pow(Math.E, -window.frame_count * window.fractal.zoom_speed);
  var min_x, max_x, min_y, max_y, x_radius, y_radius;
  if (window.rows < window.columns) {
    min_y = window.center.im - radius;
    max_y = window.center.im + radius;
    x_radius = radius * width / height;
    min_x = window.center.re - x_radius;
    max_x = window.center.re + x_radius;
  } else {
    min_x = window.center.re - radius;
    max_x = window.center.re + radius;
    y_radius = radius * height / width;
    min_y = window.center.im - y_radius;
    max_y = window.center.im + y_radius;
  }
  var window_corners = [window.math.complex(min_x, min_y), window.math.complex(max_x, max_y)];
  var grid = [];
  for (var y = 0; y < window.rows; y++) {
    var row = [];
    for (var x = 0; x < window.columns; x++) {
      row.push(grid_coords_to_complex(y, x, height, width, window.char_height, window.char_width, window_corners));
    }
    grid.push(row);
  }

  var fractal_iteration_currier = (formula, iterations, start, threshold) => (point) => fractal_iteration(point, formula, iterations, start, threshold);
  var curried_fractal_iteration = fractal_iteration_currier(window.fractal["formula"], iterations, window.fractal["start"], window.fractal.render_threshold);

  var graphics_grid = window.math.map(grid, curried_fractal_iteration);

  var any_empty = false;
  var any_filled = false;
  var text = "";
  for (var y = 0; y < window.rows; y++) {
    for (var x = 0; x < window.columns; x++) {
      if (graphics_grid[y][x]) {
        text += "o";
        any_filled = true;
      } else {
        text += ".";
        any_empty = true;
      }
    }
    text += "\n";
  }
  window.canvas.text(text);
  if (window.frame_count > 10 && (!any_empty || !any_filled)) return;

  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 0);
}
