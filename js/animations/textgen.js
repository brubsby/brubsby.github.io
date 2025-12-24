import { ObjectSampler, init_flat_index_list, setCharAtIndex, tooltip, init_lorem_ipsum, init_browser_info } from '../utils.js';

export default (this_animation) => {
  init_flat_index_list(window.rows, window.columns);
  if (window.frame_count == 0) {
    var char_level_generator = (num_chars, generator) => {
        var text = "";
        for (var i = 0; i < num_chars; i++) {
          text += generator();
        }
        return text;
    };
    var radix_digit_generator =
      (num_chars, radix) => char_level_generator(num_chars, () =>
        Math.floor(Math.random() * radix).toString(radix));
    //duplicates text and removes spaces at start of lines for aesthetics
    var text_formatter = (input_text, num_chars) => {
      var text = input_text;
      while (text.length < num_chars + window.columns) {
        text += " " + input_text;
      }
      for (var i = 0; i < window.rows; i++) {
        var index = i * window.columns;
        while (text[index] == " ") {
          text = text.substr(0, index) + text.substr(index + 1);
        }
      }
      text = text.substring(0, num_chars);
      return text;
    }
    var textgen_funcs = new ObjectSampler()
      .put([(num_chars) => $('html').html().replace(/\s/g, "").substring(0, num_chars), "html"])
      .put([(num_chars) => radix_digit_generator(num_chars, 16), "rnd(hex)"], 1) // hex
      .put([(num_chars) => radix_digit_generator(num_chars, 2), "rnd(bin)"], 1) // binary
      .put([(num_chars) => radix_digit_generator(num_chars, 10), "rnd(dec)"], 0.5) // base 10
      .put([(num_chars) => radix_digit_generator(num_chars, 8), "rnd(oct)"], 0.5) // octal
      .put([(num_chars) => radix_digit_generator(num_chars, 36), "rnd(hexatridec)"], 0.5) // hexatridecimal
      .put([(num_chars) => char_level_generator(num_chars, () => Math.floor(
        Math.random() * 24 + 10).toString(36)), "rnd(letter)"], 1) // letters
      .put([(num_chars) => { // lorem ipsum
        init_lorem_ipsum();
        return text_formatter(window.lorem_ipsum, num_chars);
      }, "lorem"], 1.25)
      .put([(num_chars) => {
        init_browser_info();
        return text_formatter(window.browser_info, num_chars);
      }, "browser"], 1.25);

    try {  // pi (some browsers don't have bigint support)
      textgen_funcs.put([(num_chars) => {
        let i = BigInt(1);
        let x = BigInt(3) * (BigInt(10) ** BigInt(num_chars+20)+BigInt(20));
        let pi = x;
        while (x > 0) {
                x = x * i / ((i + BigInt(1)) * BigInt(4));
                pi += x / (i + BigInt(2));
                i += BigInt(2);
        }
        var text = (pi / (BigInt(10) ** BigInt(20))).toString();
        text = "3." + text.substring(1);
        text = text.substring(0, num_chars);
        return text;
      }, "pi"], 1);
    } catch(e) {}

        var textgen_sample;
        var textgen_index;
        if (!isNaN(window.sub_animation_index) && window.sub_animation_index >= 0 && window.sub_animation_index < textgen_funcs.size()) {
          textgen_index = window.sub_animation_index;
          textgen_sample = textgen_funcs.get_index(textgen_index);
        } else {
          textgen_sample = textgen_funcs.sample();
          textgen_index = textgen_funcs.index_of(textgen_sample);
        }

        text_to_print = textgen_sample[0](window.columns*window.rows);
        var textgen_description = textgen_sample[1];
        tooltip("textgen<br>" + textgen_description, textgen_index);
      }
  setCharAtIndex(window.canvas, window.flat_index_list[0], window.text_to_print[0]);
  window.flat_index_list.shift();
  window.text_to_print = window.text_to_print.slice(1);
  if (window.flat_index_list.length <= 0) {
    return;
  }
  requestAnimationFrame(this_animation.bind(null, this_animation));
  window.frame_count++;
}
