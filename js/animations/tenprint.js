import { ObjectSampler, roundFloat, get_canvas_index, setCharAtIndex, tooltip } from '../utils.js';

let character_generator;

export default (this_animation) => {
  var isupdown = window.constant_random_boolean;
  if (window.frame_count == 0) {
    var character_generators = new ObjectSampler()
      .put([() => ['/', '\\'][Math.floor(Math.random()*2)], ".5\\/"], 2)
      .put([() => ['/', '\\'][Math.floor(Math.random()+window.constant_random_values[0])], roundFloat(window.constant_random_values[0])+"\\/"], 2)
      .put([() => ['\u2502', '\u2500'][Math.floor(Math.random()*2)], ".5\u2500\u2502"], 2)
      .put([() => ['\u2502', '\u2500'][Math.floor(Math.random()+window.constant_random_values[0])], roundFloat(window.constant_random_values[0])+"\u2500\u2502"], 2)
      .put([() => {window.flip ^= true; return ['/', '\\'][window.flip];}, "/\\/\\"], 1.5)
      .put([() => ['/', '\\', ' ', ' '][Math.floor(Math.random()*4)], "/\\__"], 0.75)
      .put([() => ['/', ' ', ' '][Math.floor(Math.random()*3)], "/__"], 1)
      .put([() => ['\\', ' ', ' '][Math.floor(Math.random()*3)], "\\__"], 1)
      .put([() => ['\u2588', ' '][Math.floor(Math.random()*2)], ".5\u2588_"], 0.25)
      .put([() => '\\', "\\"], 0.5)
      .put([() => '/', "/"], 0.5);
    var character_generator_sample = character_generators.sample()
    character_generator = character_generator_sample[0];
    tooltip(`${character_generator_sample[1]}<br>${isupdown ? "up" : "down"}`);
  }
  var y = window.frame_count;
  for (var x = 0; x < window.columns; x++) {
    var index = get_canvas_index(window.columns, x, isupdown ? window.rows - y : y);
    var random_slash = character_generator();
    setCharAtIndex(window.canvas, index, random_slash);
  }
  if (window.frame_count >= window.rows) return;
  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 50);
}
