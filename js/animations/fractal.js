import { ObjectSampler, tooltip, roundFloat, isInt } from "../utils.js";

var grid_coords_to_complex = (
  y,
  x,
  height,
  width,
  char_height,
  char_width,
  bounds,
) => {
  var re_range = bounds[1].re - bounds[0].re;
  var im_range = bounds[1].im - bounds[0].im;
  var re_pos = (((x + 0.5) * char_width) / width) * re_range + bounds[0].re;
  var im_pos = (((y + 0.5) * char_height) / height) * im_range + bounds[0].im;
  return window.math.complex(re_pos, im_pos);
};

var fractal_iteration = (
  point,
  formula,
  max_iterations,
  start = 0,
  threshold = 2,
) => {
  var iterations = 0;
  var value = start === null ? point : start;
  while (iterations < max_iterations && window.math.abs(value) < threshold) {
    value = formula(value, point);
    iterations++;
  }
  return [iterations, window.math.abs(value)];
};

var find_boundary_point = (
  center_finder_iterations,
  center_finder_max_radius,
  center_finder_num_recurses,
  fractal,
  mode = "edge",
) => {
  var sample_count = 100;
  var max_attempts = 20;

  for (var attempt = 0; attempt < max_attempts; attempt++) {
    var theta = fractal["theta_func"]();
    var low = 0;
    var high = center_finder_max_radius;

    // Stage 1: Linear sampling to find a boundary transition
    var found = false;
    var low_status = null;
    var epsilon = 0.001;

    for (var i = 0; i <= sample_count; i++) {
      var r =
        epsilon + (i / sample_count) * (center_finder_max_radius - epsilon);
      var p = window.math.complex(r * Math.cos(theta), r * Math.sin(theta));
      var [iter_count] = fractal_iteration(
        p,
        fractal["formula"],
        center_finder_num_recurses,
        fractal["start"],
        fractal.render_threshold,
      );
      var status = iter_count == center_finder_num_recurses;

      if (i > 0 && status !== low_status) {
        low =
          epsilon +
          ((i - 1) / sample_count) * (center_finder_max_radius - epsilon);
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
        candidate_point = window.math.complex(
          candidate_radius * Math.cos(theta),
          candidate_radius * Math.sin(theta),
        );
        var [iter_count] = fractal_iteration(
          candidate_point,
          fractal["formula"],
          center_finder_num_recurses,
          fractal["start"],
          fractal.render_threshold,
        );
        if ((iter_count == center_finder_num_recurses) === low_status) {
          low = candidate_radius;
        } else {
          high = candidate_radius;
        }
        candidate_radius = (low + high) / 2;
      }

      var final_r = candidate_radius;
      if (mode === "inner") {
        final_r = Math.random() * candidate_radius;
      } else if (mode === "dust") {
        final_r = candidate_radius + Math.random();
      }

      return window.math.complex(
        final_r * Math.cos(theta),
        final_r * Math.sin(theta),
      );
    }
  }

  var r_rand = Math.random() * center_finder_max_radius;
  var theta_rand = Math.random() * 2 * Math.PI;
  return window.math.complex(
    r_rand * Math.cos(theta_rand),
    r_rand * Math.sin(theta_rand),
  );
};

var find_interesting_point = (fractal, iterations) => {
  var current_center = find_boundary_point(50, 4.0, iterations, fractal);
  var current_radius = 2.0;
  var zoom_steps = 60;
  var samples_per_step = 25;
  var total_retries = 0;

  for (var step = 0; step < zoom_steps; step++) {
     var best_step_point = current_center;
     var max_step_variance = -1;

     // Sample candidates around current center
     for (var i = 0; i < samples_per_step; i++) {
        var r_offset = Math.random() * current_radius;
        var theta = Math.random() * 2 * Math.PI;
        var candidate = window.math.complex(
            current_center.re + r_offset * Math.cos(theta),
            current_center.im + r_offset * Math.sin(theta)
        );

        // Score this candidate (variance of neighbors)
        var neighbor_samples = [];
        var epsilon = current_radius * 0.05;
        var offsets = [0, epsilon, -epsilon];
        
        for (var dx of offsets) {
          for (var dy of offsets) {
             var p = window.math.complex(candidate.re + dx, candidate.im + dy);
             var [iters] = fractal_iteration(p, fractal.formula, iterations, fractal.start, fractal.render_threshold);
             neighbor_samples.push(iters);
          }
        }
        
        var mean = neighbor_samples.reduce((a,b)=>a+b) / neighbor_samples.length;
        var variance = neighbor_samples.reduce((a,b)=>a + Math.pow(b-mean, 2), 0) / neighbor_samples.length;
        
        // Penalize "inside" (0 variance, max iters) and "deep space"
        if (mean >= iterations * 0.99 || mean <= 2) variance = 0;

        if (variance > max_step_variance) {
           max_step_variance = variance;
           best_step_point = candidate;
        }
     }
     
     // Move to best point found in this step
     if (max_step_variance > 0) {
        current_center = best_step_point;
     } else {
        // If we found nothing interesting, jump to a random spot and restart
        if (total_retries < 10) {
            var r = Math.random() * 2.0;
            var t = Math.random() * 2 * Math.PI;
            current_center = window.math.complex(r * Math.cos(t), r * Math.sin(t));
            current_radius = 2.0;
            step = -1;
            total_retries++;
            continue;
        }
     }
     
     // Zoom in
     current_radius *= 0.5;
     if (current_radius < 1e-15) break;
  }
  return current_center;
};

export default (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var iterations = 41;
  var this_timestamp = new Date().getTime();
  var framerate = 1000 / (this_timestamp - window.last_timestamp);
  window.last_timestamp = this_timestamp;

  if (window.frame_count == 0) {
    var center_finder_iterations = 100;
    var center_finder_max_radius = 4;

    var createFractal = (props) =>
      Object.assign(
        {
          theta_func: () => Math.random() * 2 * Math.PI,
          boundary_finder_iteration_multiplier: 1,
          start_func: () => window.math.complex(0, 0),
          zoom_speed: 0.02,
          degree: 2,
          setup: function (seed) {
            return { formula: this.formula, start: seed };
          },
        },
        props,
      );

    var mandelbrot = createFractal({
      formula: (z, c) => window.math.add(window.math.pow(z, 2), c),
      description: "mandelbrot",
    });
    var tricorn = createFractal({
      formula: (z, c) =>
        window.math.add(window.math.pow(window.math.conj(z), 2), c),
      theta_func: () =>
        (Math.random() * 2 - 1) * 0.13 +
        Math.PI +
        (Math.floor(Math.random() * 3) * 2 * Math.PI) / 3,
      description: "tricorn",
    });
    var burningShip = createFractal({
      formula: (z, c) =>
        window.math.add(
          window.math.pow(
            window.math.complex(window.math.abs(z.re), window.math.abs(z.im)),
            2,
          ),
          c,
        ),
      theta_func: () => -(Math.random() * 0.69 * Math.PI + Math.PI * 0.32),
      description: "burning ship",
    });
    var cubic = createFractal({
      formula: (z, c) => window.math.add(window.math.pow(z, 3), c),
      description: "cubic mandelbrot",
      degree: 3,
    });
    var quartic = createFractal({
      formula: (z, c) => window.math.add(window.math.pow(z, 4), c),
      description: "quartic mandelbrot",
      degree: 4,
    });
    var celtic = createFractal({
      formula: (z, c) => {
        var z2 = window.math.pow(z, 2);
        return window.math.add(
          window.math.complex(window.math.abs(z2.re), z2.im),
          c,
        );
      },
      theta_func: () => Math.PI + (Math.random() - 0.5) * Math.PI * 0.75,
      description: "celtic mandelbrot",
    });
    var tippetts = createFractal({
      formula: (z, c) => {
        var x = z.re * z.re - z.im * z.im + c.re;
        var y = 2 * x * z.im + c.im;
        return window.math.complex(x, y);
      },
      description: "tippetts mandelbrot",
    });

    var zubietaMandel = createFractal({
      formula: (z, c) =>
        window.math.add(window.math.pow(z, 2), window.math.divide(c, z)),
      start_func: () => window.math.complex(1, 0),
      setup: function (seed) {
        return { formula: this.formula, start: window.math.complex(1, 0) };
      },
    });

    var cactus = createFractal({
      description: "cactus",
      formula: (z, c) =>
        window.math.subtract(
          window.math.add(
            window.math.pow(z, 3),
            window.math.multiply(window.math.subtract(c, 1), z),
          ),
          c,
        ),
      degree: 3,
      setup: function (seed) {
        return { formula: this.formula, start: null };
      },
    });
    var marek = createFractal({
      description: "marek",
      setup: function (seed) {
        var r;
        if (Math.random() < 0.5) {
          r = Math.random();
        } else {
          r = 1 - (Math.sqrt(2) - Math.sqrt(3) + Math.sqrt(5)) / 2.0;
        }
        this.r = r;
        var zc = window.math.exp(window.math.complex(0, 2 * Math.PI * r));
        return {
          formula: (z) =>
            window.math.add(window.math.multiply(zc, z), window.math.pow(z, 2)),
          start: null,
        };
      },
    });
    var lemon = createFractal({
      description: "lemon",
      formula: (z, c) => {
        var z2 = window.math.pow(z, 2);
        var num = window.math.multiply(z2, window.math.add(z2, 1));
        var den = window.math.pow(window.math.subtract(z2, 1), 2);
        return window.math.multiply(c, window.math.divide(num, den));
      },
      boundary_finder_iteration_multiplier: 0.9,
      max_radius: 4,
      zoom_speed: 0.1,
      threshold: 100,
      setup: function (seed) {
        return {
          formula: this.formula,
          start: null,
          threshold: this.threshold,
        };
      },
    });
    var insideout = createFractal({
      description: "insideout",
      threshold: 10,
      setup: function (seed) {
        var dens = [
          { d: (r) => 1 + r + Math.pow(r, 7), s: "1+r+r^7" },
          { d: (r) => 1 + Math.pow(r, 3), s: "1+r^3" },
          { d: (r) => 1 + r, s: "1+r" },
          { d: (r) => Math.pow(1 + r * r, 2), s: "(1+r^2)^2" },
          { d: (r) => 1 + r + r * r, s: "1+r+r^2" },
        ];
        var choice = dens[Math.floor(Math.random() * dens.length)];
        this.d_str = choice.s;
        var den_func = choice.d;

        return {
          formula: (z, c) => {
            var r = window.math.abs(z);
            var common_den = den_func(r);
            var r2 = r * r;
            var common_factor = (r * (r2 - 1)) / common_den;
            var f = (1 + 2 * r + r2) * common_factor;
            var g = (1 - 2 * r + r2) * common_factor;
            return window.math.add(
              window.math.pow(z, 2),
              window.math.complex(f, g),
            );
          },
          start: null,
          threshold: this.threshold,
        };
      },
    });
    var mandelpower = createFractal({
      description: "mandelpower",
      setup: function (seed) {
        var M;
        if (Math.random() < 0.5) {
          // Integer
          if (Math.random() < 0.5) {
            // 3 to 10
            M = Math.floor(Math.random() * (10 - 3 + 1)) + 3;
          } else {
            // -10 to -2
            M = Math.floor(Math.random() * (-2 - -10 + 1)) - 10;
          }
        } else {
          // Non-integer
          M = Math.random() * 20 - 10;
        }
        this.M = M;
        return {
          formula: (z, c) => window.math.add(window.math.pow(z, M), c),
          start: null,
          degree: Math.abs(M),
        };
      },
    });

    var multimandel = createFractal({
      description: "multimandel",
      setup: function (seed) {
        var ps = [0, 1, 2, -1];
        var p = ps[Math.floor(Math.random() * ps.length)];
        this.p = p;
        return {
          formula: (z, c) => {
            var cp = p === 0 ? 1 : p === 1 ? c : window.math.pow(c, p);
            return window.math.add(
              window.math.multiply(cp, window.math.pow(z, -2)),
              c,
            );
          },
          start: null,
        };
      },
    });

    var zubieta = createFractal({
      description: "zubieta",
      is_julia: true,
      start_func: () =>
        find_boundary_point(
          center_finder_iterations,
          4.0,
          iterations,
          zubietaMandel,
        ),
      setup: function (s) {
        return {
          formula: (z) =>
            window.math.add(window.math.pow(z, 2), window.math.divide(s, z)),
          start: null,
          threshold: this.threshold,
        };
      },
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
      .put(insideout, 2)
      .put(mandelpower, 2)
      .put(multimandel, 2)
      .put(zubieta, 0);

    var addJuliaVariants = (sampler, baseFractal, power, prefix) => {
      var modes = [
        {
          mode: "edge",
          suffix: "mandelborder",
          weight: 2,
          find_iters: iterations,
        },
        {
          mode: "inner",
          suffix: "innermandel",
          weight: 1,
          find_iters: iterations,
        },
        { mode: "dust", suffix: "dust", weight: 1, find_iters: 5000 },
      ];

      modes.forEach((m) => {
        var name = prefix
          ? `${prefix} julia (${m.suffix})`
          : `julia (${m.suffix})`;
        sampler.put(
          createFractal({
            start_func: () =>
              find_boundary_point(
                center_finder_iterations,
                center_finder_max_radius,
                m.find_iters,
                baseFractal,
                m.mode,
              ),
            description: name,
            is_julia: true,
            degree: power,
            setup: function (s) {
              return {
                formula: (z) => window.math.add(window.math.pow(z, power), s),
                start: null,
              };
            },
          }),
          m.weight,
        );
      });
    };

    addJuliaVariants(window.fractals, mandelbrot, 2);
    addJuliaVariants(window.fractals, cubic, 3, "cubic");

    window.render_strategies = new ObjectSampler()
      .put("density", 1)
      .put("digit", 1);
    window.render_strategy = window.render_strategies.sample();

    window.sub_animation_size = window.fractals.size();
    if (
      !isNaN(window.sub_animation_index) &&
      window.sub_animation_index >= 0 &&
      window.sub_animation_index < window.fractals.size()
    ) {
      window.fractal = window.fractals.get_index(window.sub_animation_index);
    } else {
      window.fractal = window.fractals.sample();
    }
    var fractal_index = window.fractals.index_of(window.fractal);
    var fresh_seed = window.fractal["start_func"]();
    var config = window.fractal.setup(fresh_seed);
    window.fractal.formula = config.formula;
    window.fractal.start = config.start;
    window.fractal.render_threshold = config.threshold || 10;
    window.fractal.degree = config.degree || window.fractal.degree || 2;

    var center_finder_num_recurses = Math.floor(
      iterations * window.fractal["boundary_finder_iteration_multiplier"],
    );
    var current_max_radius =
      window.fractal.max_radius || center_finder_max_radius;
    window.center = find_interesting_point(window.fractal, iterations);

    var desc = window.fractal["description"];
    if (desc === "mandelpower") {
      var m_display = isInt(window.fractal.M)
        ? window.fractal.M.toString()
        : roundFloat(window.fractal.M);
      desc += ` M=${m_display}`;
    } else if (desc === "multimandel") {
      desc += ` p=${window.fractal.p}`;
    } else if (desc === "marek") {
      desc += ` r=${roundFloat(window.fractal.r, 4)}`;
    } else if (desc === "insideout") {
      desc += ` d=${window.fractal.d_str}`;
    }

    if (window.fractal.is_julia) {
      desc += ` c=${roundFloat(fresh_seed.re, 4)}${fresh_seed.im < 0 ? "" : "+"}${roundFloat(fresh_seed.im, 4)}i`;
    }

    tooltip(
      `${desc}<br>${roundFloat(window.center["re"], 4)}${window.center["im"] < 0 ? "" : "+"}${roundFloat(window.center["im"], 4)}i`,
      fractal_index,
    );

    window.target_framerate = 30;
    window.average_framerate = window.target_framerate;
    window.update_prob = 0.23;
  }

  // Dynamic adjustment disabled for time-budgeted rendering
  /*
  var framerate_adjuster_magnitude = 0.001;
  var smoothing_alpha = 0.05;
  window.average_framerate = window.average_framerate * (1 - smoothing_alpha) + framerate * smoothing_alpha;
  window.update_prob = (window.update_prob || 0.23) + framerate_adjuster_magnitude * (window.average_framerate - window.target_framerate);
  window.update_prob = Math.max(0.01, Math.min(1.0, window.update_prob));
  */
  // iterations = Math.max(iterations, 50);

  var radius =
    10 * Math.pow(Math.E, -window.frame_count * window.fractal.zoom_speed);
  var min_x, max_x, min_y, max_y, x_radius, y_radius;
  if (window.rows < window.columns) {
    min_y = window.center.im - radius;
    max_y = window.center.im + radius;
    x_radius = (radius * width) / height;
    min_x = window.center.re - x_radius;
    max_x = window.center.re + x_radius;
  } else {
    min_x = window.center.re - radius;
    max_x = window.center.re + radius;
    y_radius = (radius * height) / width;
    min_y = window.center.im - y_radius;
    max_y = window.center.im + y_radius;
  }
  var window_corners = [
    window.math.complex(min_x, min_y),
    window.math.complex(max_x, max_y),
  ];

  if (
    !window.char_grid ||
    window.char_grid.length != window.rows ||
    window.char_grid[0].length != window.columns
  ) {
    window.char_grid = [];
    for (var y = 0; y < window.rows; y++) {
      window.char_grid.push(new Array(window.columns).fill("."));
    }
  }

  // var density_threshold = Math.floor(iterations / 2);
  var density_chars =
    "·.∙`-':_,─;^~÷⌐/=°¬\"+()º<>┘═[]»≤≥«%|└\\iªⁿt±┐╛c!l{}¡²¿íï≡?xI┌┴rì≈*ετ7u╘╧fvΓsCJz┬ea1σîo2çü╕πL√4αn∞dÇ3TäæSwëùú⌡YΣ╒╙╜V¢éj╚59ö⌠╝6£èƒ│ßàáûδFPZm╨Gq¥êòó∩■âk0Xb╩&Aô┤╤gΘ░µ╓╖UΩh├Oy½8φpåΦ╡╥H#@ÜñEÖ┼DÄK¼₧$ÅÉ╞RBÿÆMNQW╔╗╪╦▀▌Ñ║╟╢╠╣╫╬▐▄▒▓█";
  var strategy = window.render_strategy;

  var start_time = performance.now();
  var time_budget = 1000 / window.target_framerate;
  var batch_size = 100;

  while (performance.now() - start_time < time_budget) {
    for (var i = 0; i < batch_size; i++) {
      var ry = Math.floor(Math.random() * window.rows);
      var rx = Math.floor(Math.random() * window.columns);

      var current_char = window.char_grid[ry][rx];
      var is_edge = false;
      var neighbors = [
        [ry - 1, rx],
        [ry + 1, rx],
        [ry, rx - 1],
        [ry, rx + 1],
      ];
      for (var n = 0; n < neighbors.length; n++) {
        var ny = neighbors[n][0];
        var nx = neighbors[n][1];
        if (ny >= 0 && ny < window.rows && nx >= 0 && nx < window.columns) {
          if (window.char_grid[ny][nx] !== current_char) {
            is_edge = true;
            break;
          }
        }
      }

      if (!is_edge && Math.random() < 0.9) continue;

      var p = grid_coords_to_complex(
        ry,
        rx,
        height,
        width,
        window.char_height,
        window.char_width,
        window_corners,
      );
      var [iters, mag] = fractal_iteration(
        p,
        window.fractal["formula"],
        iterations,
        window.fractal["start"],
        window.fractal.render_threshold,
      );

      if (strategy === "digit") {
        if (iters == iterations) {
          window.char_grid[ry][rx] = ".";
        } else {
          window.char_grid[ry][rx] = (iters % 10).toString();
        }
      } else {
        if (iters == iterations) {
          window.char_grid[ry][rx] = " ";
        } else {
          var log_z = Math.log(mag);
          var nu =
            Math.log(log_z / Math.log(window.fractal.render_threshold)) /
            Math.log(window.fractal.degree);
          var smooth_val = iters + 1 - nu;

          var val = smooth_val / iterations;
          var char_idx = Math.floor(val * density_chars.length);
          window.char_grid[ry][rx] =
            density_chars[
              Math.max(0, Math.min(char_idx, density_chars.length - 1))
            ];
        }
      }
    }
  }

  var is_uniform = true;
  var first_char = null;
  var text = "";
  for (var y = 0; y < window.rows; y++) {
    for (var x = 0; x < window.columns; x++) {
      var char = window.char_grid[y][x];
      text += char;

      if (first_char === null) first_char = char;
      if (char !== first_char) is_uniform = false;
    }
    text += "\n";
  }
  window.canvas.text(text);
  if (window.frame_count > 10 && is_uniform) return;

  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 0);
};
