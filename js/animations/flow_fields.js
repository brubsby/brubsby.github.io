import { tooltip, ObjectSampler, roundFloat, Particle, init_simplex_noise, get_simplex_noise_at, simplex_value_to_vector, get_random_int_with_expected_float_average, get_canvas_index } from '../utils.js';

export default (this_animation) => {
  var width = window.columns * window.char_width;
  var height = window.rows * window.char_height;
  var center = [width/2, height/2];
  var acceleration_or_velocity = window.constant_random_boolean;
  var expected_value_new_particles_per_frame = window.constant_random_values[0] * 2;
  if (window.frame_count == 0) {
    window.remaining_particles = Math.floor(10000 * expected_value_new_particles_per_frame);
    window.particles = [];
    window.random_edge_point_sampler = new ObjectSampler()
      .put(() => [Math.random() * width, 0], width)
      .put(() => [Math.random() * width, height], width)
      .put(() => [0, Math.random() * height], height)
      .put(() => [width, Math.random() * height], height);
    
    window.sub_animation_size = window.random_edge_point_sampler.size();
    var sampler_index;
    if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < window.random_edge_point_sampler.size()) {
      sampler_index = window.sub_animation_index;
    } else {
      var sampled_func = window.random_edge_point_sampler.sample();
      sampler_index = window.random_edge_point_sampler.index_of(sampled_func);
    }
    window.current_sampler_index = sampler_index;
    tooltip(`flow fields<br>p=${roundFloat(expected_value_new_particles_per_frame)} a=${acceleration_or_velocity ? 'T' : 'F'}`, sampler_index);
  }
  var simplex_frequency = window.animation_speed_multiplier * -0.0001635 + 0.00237;
  var simplex_amplitude = 1;
  var octaves = Math.floor(window.constant_random_values[1] * Math.min(window.animation_speed_multiplier - 1, 3)) + 1;
  var particle_lifespan = window.constant_random_values[2] * 5000 + 7500;
  var new_particles_this_frame = get_random_int_with_expected_float_average(expected_value_new_particles_per_frame);
  var vector_multiplier = acceleration_or_velocity ? window.constant_random_values[3] * 2 + 1 : 30;
  var timestep = 0.05;
  var max_new_particle_tries = 100;
  var speed_limit = window.constant_random_values[4] * 20 + 25;
  var jitter_magnitude = acceleration_or_velocity ? window.constant_random_values[5] : window.constant_random_values[5] * 25 + 12;
  init_simplex_noise();
  var new_particle_count = 0;
  var new_particle_tries = 0;
  while (window.remaining_particles > 0 && new_particle_count < new_particles_this_frame) {
    var particle_position = window.random_edge_point_sampler.get_index(window.current_sampler_index)();
    var particle_to_center_angle = Math.atan2(center[1] - particle_position[1], center[0] - particle_position[0]);
    var particle_speed = window.constant_random_values[6] * 25;
    var velocity_vector = [particle_speed * Math.cos(particle_to_center_angle), particle_speed * Math.sin(particle_to_center_angle)];
    var particle = new Particle(particle_position, speed_limit, velocity_vector);
    var simplex_value = get_simplex_noise_at(particle.position, simplex_frequency, simplex_amplitude, octaves)
    var vector = simplex_value_to_vector(vector_multiplier, simplex_value, jitter_magnitude);
    particle.step(vector, timestep, acceleration_or_velocity);
    if (particle.inbounds(width, height)) {
      window.particles.push(particle);
      new_particle_count++;
    }
    new_particle_tries++;
    if (new_particle_tries > max_new_particle_tries) {
      return;
    }
  }
  window.remaining_particles -= new_particle_count;

  for (var i = 0; i < window.particles.length; i++) {
    var particle = window.particles[i];
    var simplex_value = get_simplex_noise_at(particle.position, simplex_frequency, simplex_amplitude, octaves)
    var vector = simplex_value_to_vector(vector_multiplier, simplex_value, jitter_magnitude);
    particle.step(vector, timestep, acceleration_or_velocity);
  }

  window.particles = window.particles.filter(particle => particle.inbounds(width, height));
  window.particles = window.particles.filter(particle => particle.framecount_under(particle_lifespan));

  var text = (".".repeat(window.columns) + "\n").repeat(window.rows);
  for (var i = 0; i < window.particles.length; i++) {
    var particle = window.particles[i];
    var coordinates = [Math.floor(particle.position[0] / window.char_width),
      Math.floor(particle.position[1] / window.char_height)];
    var index = get_canvas_index(window.columns, coordinates[0], coordinates[1]);
    text = text.substr(0, index) + "o" + text.substr(index + 1);
  }
  window.canvas.text(text);
  window.frame_count++;
  if (window.particles.length == 0 && window.frame_count > 1000) return;
  requestAnimationFrame(this_animation.bind(null, this_animation));
}
