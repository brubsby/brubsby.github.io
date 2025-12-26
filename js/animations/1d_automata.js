import { ObjectSampler, tooltip, get_canvas_index, setCharAtIndex } from '../utils.js';

export default (this_animation) => {
  if (window.frame_count == 0) {
    var universe_generators = new ObjectSampler()
    //uniform random
    .put(length => Array(length).fill(null).map(_ => Math.random() < 0.5), 2)
    //skewed uniform random
    .put(length => Array(length).fill(null).map(_ => Math.random() < (window.constant_random_values[0] * 0.8) + 0.1), 1)
    //single cell in middle
    .put(length => {
      let arr = Array(length).fill(false);
      arr[Math.floor(length / 2)] = true;
      return arr;
    }, 1);
    var rulesets = new ObjectSampler();
    for (var i = 0; i < 256; i++) {
      var ruleset = {"dec" : i};
      var weight = 1;
      if ([30, 90, 110, 184].includes(i)) { // rules with wikipedia articles
        weight = 5;
      } else if ([54, 60, 62, 90, 94, 102, 126, 150, 158, 182, 188,
        190, 220, 222].includes(i)) { // with wolfram mathworld articles
        weight = 4;
      } else if ([0, 8, 32, 40, 64, 96, 128, 136, 160, 168, 192, 234, 238,
        239, 248, 249, 250, 251, 252, 253, 254, 255].includes(i)) {
          // rules that would confuse the audience / class 1
        weight = 0.1;
      }
                rulesets.put(ruleset, weight);
              }
              window.sub_animation_size = rulesets.size();
              window.universe = universe_generators.sample()(window.columns);            if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < rulesets.size()) {
              window.rules = rulesets.get_index(window.sub_animation_index);
            } else {
              window.rules = rulesets.sample();
            }
            var rules_index = rulesets.index_of(window.rules);
            tooltip(`1d automata<br>rule ${window.rules["dec"]}`, rules_index);    console.log("Rule " + window.rules["dec"]);
    window.tile_rules = [".", "o"];
    var RuleLookup = class {
      constructor(wolfram_rule) {
        this.lookup = Array(8).fill(null).map((_, index) => (Math.pow(2, index) & wolfram_rule) != 0);
      }
      next_state(left, center, right) {
        var index = (right ? 1 : 0) + (center ? 2 : 0) + (left ? 4 : 0);
        return this.lookup[index];
      }
    };
    window.rules["lookup"] = new RuleLookup(window.rules["dec"]);

  }
  var y = window.frame_count;
  for (var x = 0; x < window.columns; x++) {
    var index = get_canvas_index(window.columns, x, y);
    setCharAtIndex(window.canvas, index, window.tile_rules[window.universe[x] ? 1 : 0]);
  }
  var next_state = [];
  for (var i = 0; i < window.universe.length; i++) {
    var left = window.universe[(i + window.universe.length - 1) % window.universe.length];
    var center = window.universe[i];
    var right = window.universe[(i + 1) % window.universe.length];
    next_state.push(window.rules["lookup"].next_state(left, center, right));
  }
  window.universe = next_state;
  if (window.frame_count >= window.rows) return;
  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 50);
}
