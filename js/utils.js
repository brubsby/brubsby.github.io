/*----------- Class Definitions -----------*/
export class ObjectSampler {
  constructor() {this.objects=[];this.total_weight=0;return this;}
  put(obj, weight=1) {
    this.total_weight+=weight;
    this.objects.push({"obj":obj,"weight":weight,"total_weight":this.total_weight});
    return this;
  };
  uniform_sample() {return this.objects[Math.floor(this.objects.length * Math.random())]["obj"];}
  sample() {
    var index_val = this.total_weight * Math.random();
    for (var i = 0; i < this.objects.length; i++) {
      if (index_val < this.objects[i]["total_weight"]) return this.objects[i]["obj"];
    }
    throw "sample error, random value was " + index_val + " but total weight was " + this.total_weight;
  }
  get_index(i) {return this.objects[i]["obj"];}
  index_of(o) {
    for (var i = 0; i < this.objects.length; i++) {
      if (this.objects[i]["obj"] === o) return i;
    }
  }
  size() {return this.objects.length;}
}

export class SortedSet {
  constructor(array = [], compare=() => {if (a === b) return 0; return a < b ? -1 : 1;}) {
      if (typeof array === 'function') { compare = array; array = []; } 
      this._array = []; this.compare = compare;
      const length = array.length; let index = 0;
      while (index < length) { this.add(array[index++]); } 
  }
  get size() { return this._array.length; } 
  [Symbol.iterator]() { return this._array[Symbol.iterator](); } 
  clear() { this._array = []; return this; } 
  add(element) { let high = this._array.length; let low = 0;
      while (high > low) {
          const index = Math.floor((high + low) / 2);
          const ordering = this.compare(this._array[index], element);
          if (ordering < 0) { low = index + 1; } 
          else if (ordering > 0) { high = index } else { return this; } 
      }
      this._array.splice(low, 0, element); return this; } 
  has(element) { return this.indexOf(element) !== -1; } 
  indexOf(element) { let high = this._array.length; let low = 0;
    while (high > low) {
          const index = Math.floor((high + low) / 2);
          const ordering = this.compare(this._array[index], element);
          if (ordering < 0) { low = index + 1; } 
          else if (ordering > 0) { high = index; } 
          else { return index; }} return -1;}
  delete(element) {
      const index = this.indexOf(element);
      if (index === -1) { return; } 
      const removed = this._array[index]; this._array.splice(index, 1);
      return removed; } 
  pop_index(index) {
      const removed = this._array[index]; this._array.splice(index, 1);
      return removed; } 
  get_index(index) { return this._array[index]; } 
}

export class Particle {
  constructor(position, speed_limit=null, velocity=[0, 0]) {
    this.position = position;
    this.velocity = velocity;
    this.speed_limit = speed_limit;
    this.framecount = 0;
  }
  step(vector, timestep, acceleration_or_velocity=true) {
    this.framecount++;
    if(acceleration_or_velocity) {
      this.velocity = [this.velocity[0] + vector[0] * timestep,
        this.velocity[1] + vector[1] * timestep];
      if (this.speed_limit) {
        var speed = Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2));
        if (speed > this.speed_limit) {
          var angle = Math.atan2(this.velocity[1], this.velocity[0]);
          this.velocity = [this.speed_limit * Math.cos(angle), this.speed_limit * Math.sin(angle)];
        }
      }
    } else {
      this.velocity = [vector[0], vector[1]];
    }
    this.position = [this.position[0] + this.velocity[0] * timestep,
      this.position[1] + this.velocity[1] * timestep];
  }
  inbounds(width, height) {
    return this.position[0] > 0 && this.position[0] < width
      && this.position[1] > 0 && this.position[1] < height;
  }
  framecount_under(test_value) {
    return this.framecount < test_value;
  }
}

export class Vec3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  sub(v) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  cross(v) {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }

  reflect(n) {
    const d = this.dot(n);
    return new Vec3(
      this.x - 2 * d * n.x,
      this.y - 2 * d * n.y,
      this.z - 2 * d * n.z
    );
  }
}

export class Mat4 {
  constructor() {
    this.m = new Float32Array(16);
    this.identity();
  }

  identity() {
    this.m.fill(0);
    this.m[0] = this.m[5] = this.m[10] = this.m[15] = 1;
  }

  static rotationX(angle) {
    const mat = new Mat4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    mat.m[5] = c; mat.m[6] = s;
    mat.m[9] = -s; mat.m[10] = c;
    return mat;
  }

  static rotationY(angle) {
    const mat = new Mat4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    mat.m[0] = c; mat.m[2] = -s;
    mat.m[8] = s; mat.m[10] = c;
    return mat;
  }

  static rotationZ(angle) {
    const mat = new Mat4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    mat.m[0] = c; mat.m[1] = s;
    mat.m[4] = -s; mat.m[5] = c;
    return mat;
  }

  multiplyVec3(v) {
    const x = v.x * this.m[0] + v.y * this.m[4] + v.z * this.m[8] + this.m[12];
    const y = v.x * this.m[1] + v.y * this.m[5] + v.z * this.m[9] + this.m[13];
    const z = v.x * this.m[2] + v.y * this.m[6] + v.z * this.m[10] + this.m[14];
    return new Vec3(x, y, z);
  }
}

/*----------- Helper Functions -----------*/

export var loadGlobalLibrary = async (url, globalName) => {
    if (typeof window !== 'undefined' && window[globalName]) return;
    
    // Check for Node.js environment
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        if (global[globalName]) return;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        const code = await res.text();
        const vm = await import('node:vm');
        vm.runInThisContext(code);
        if (global.window && !global.window[globalName] && global[globalName]) {
            global.window[globalName] = global[globalName];
        }
        if (global[globalName] && !global.window[globalName]) {
             global.window[globalName] = global[globalName];
        }
        return;
    }

    // Browser environment
    if (typeof window !== 'undefined' && !window[globalName]) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

export var init_flat_index_list = (rows, columns, sort_func=null) => {
    if (!window.flat_index_list) {
      window.flat_index_list = [];
      for (var i = 0; i < (columns + 1) * rows - 1; i++) {
        if (i % (columns + 1) == columns) continue;
        window.flat_index_list.push(i);
      }
      if (sort_func) {
        window.flat_index_list.sort(sort_func)
      }
    }
};

export var init_simplex_noise = async () => {
    if (!window.simplex_noise) {
      await loadGlobalLibrary('https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.4.0/simplex-noise.min.js', 'SimplexNoise');
      window.simplex_noise = new window.SimplexNoise(Math.random().toString());
    }
};

export var init_math = async () => {
    if (!window.math) {
        await loadGlobalLibrary('https://cdnjs.cloudflare.com/ajax/libs/mathjs/6.2.2/math.min.js', 'math');
    }
}

export var init_mapgen_tiles = () => {
    if (!window.mapgen_tiles) {
      // drop ttf into fontdrop.info for codepoints
      // ≈.,`ⁿ⌠τ↑♠ⁿ∩⌂▲ΔΛп
      window.mapgen_tiles = ['≈', '.', ',', '∩', '\u007F', '\u001E'];
      window.flat_mapgen_tiles = [];
      for (var i = 0; i < window.mapgen_tiles.length; i++) {
        if (Array.isArray(window.mapgen_tiles[i])) {
          window.flat_mapgen_tiles.push(window.mapgen_tiles[i][Math.floor(Math.random() * window.mapgen_tiles[i].length)]);
        } else {
          window.flat_mapgen_tiles.push(window.mapgen_tiles[i]);
        }
      }
    }
};
export var init_falloff_map = (rows, columns, char_width, char_height) => {
    if (!window.falloff_map) {
      window.falloff_map = (coords) => {
        var width = columns * char_width;
        var height = rows * char_height;
        var x = (coords[0] / width) * 2 - 1;
        var y = (coords[1] / height) * 2 - 1;
        var value = Math.max(Math.abs(x), Math.abs(y));
        var a = 3;
        var b = 2.2;
        value = Math.pow(value, a) / (Math.pow(value, a) + Math.pow((b - b * value), a))
        return value;
      }
    }
};
export var get_ascii_char_from_canvas_index = (ascii_art, canvas_columns, canvas_rows, canvas_index) => {
  var ascii_width = ascii_art[0].length;
  var ascii_height = ascii_art.length;
  var ascii_midpoint = [Math.floor(ascii_width / 2), Math.floor(ascii_height / 2)];
  var canvas_midpoint = [Math.floor(canvas_columns / 2), Math.floor(canvas_rows / 2)];
  var canvas_coords = get_coords(canvas_columns, canvas_index);
  var ascii_x = canvas_coords[0] - canvas_midpoint[0] + ascii_midpoint[0];
  var ascii_y = canvas_coords[1] - canvas_midpoint[1] + ascii_midpoint[1];
  ascii_x = Math.min(Math.max(0, ascii_x), ascii_width - 1);
  ascii_y = Math.min(Math.max(0, ascii_y), ascii_height - 1);
  return ascii_art[ascii_y][ascii_x];
}
export var get_canvas_index = (columns, x, y) => { return x + y * (columns + 1); };
export var get_coords = (columns, index) => { return [index % (columns + 1), Math.floor(index / (columns + 1))];};
export var get_pixel_coords = (columns, index, char_width, char_height) => {
  var coords = get_coords(columns, index);
  return [coords[0] * char_width, coords[1] * char_height];
}
export var get_simplex_noise_at = (coords, frequency, amplitude, octaves=1, lacunarity=2, gain=0.5) => {
  var octave_amplitude = amplitude;
  var octave_frequency = frequency;
  var result = 0;
  for (var i = 0; i < octaves; i++) {
    if (Array.isArray(coords)) {
      switch (coords.length) {
        case 1:
          result += octave_amplitude * window.simplex_noise.noise2D(octave_frequency * coords[0], 0);
          break;
        case 2:
          result += octave_amplitude * window.simplex_noise.noise2D(octave_frequency * coords[0], octave_frequency * coords[1]);
          break;
        case 3:
          result += octave_amplitude * window.simplex_noise.noise3D(octave_frequency * coords[0], octave_frequency * coords[1], octave_frequency * coords[2]);
          break;
        case 4:
          result += octave_amplitude * window.simplex_noise.noise4D(octave_frequency * coords[0], octave_frequency * coords[1], octave_frequency * coords[2], octave_frequency * coords[3]);
          break;
      }
    } else {
        result += octave_amplitude * window.simplex_noise.noise2D(octave_frequency * coords, 0);
    }
    octave_amplitude *= gain;
    octave_frequency *= lacunarity;
  }
  return result;
}
export var simplex_value_to_vector = (amplitude, simplex_value, jitter_magnitude=0) => {
  var vector = [amplitude * Math.cos(simplex_value * Math.PI),
    amplitude * Math.sin(simplex_value * Math.PI) + jitter_magnitude * Math.sin(Math.random() * 2 * Math.PI)];
  if (jitter_magnitude != 0) {
    var random_theta = Math.random() * 2 * Math.PI;
    vector = [vector[0] + jitter_magnitude * Math.cos(random_theta),
      vector[1] + jitter_magnitude * Math.sin(random_theta)];
  }
  return vector;
}
export var setCharAtIndex = (canvas,index,chr) => {
  var str = canvas.text();
  if(index > str.length-1) return str;
  var new_str = str.substr(0,index) + chr + str.substr(index+1);
  canvas.text(new_str);
  window.canvas.text(new_str);
};
export var setHalfPixel = (canvas,x,y,on_off=true,rules=[' ', '.', '`', ':']) => {
  // set "pixel" defined at top or bottom half of char, in this coord system
  // there are twice as many y rows
  var canvas_index = get_canvas_index(window.columns, x, Math.floor(y/2));
  var old_char = getCharAtIndex(canvas, canvas_index);
  var old_char_index = rules.indexOf(old_char);
  if (old_char_index == -1) {
    old_char_index = 0; // treat as neight pixel set
  }
  var top_val = old_char_index > 1;
  var bottom_val = old_char_index == 1 || old_char_index == 3;
  var is_bottom_val = y % 2;
  if (is_bottom_val) {
    bottom_val = on_off;
  } else {
    top_val = on_off;
  }
  var new_char_index = (bottom_val ? 1 : 0) + (top_val ? 2 : 0);
  setCharAtIndex(canvas, canvas_index, rules[new_char_index]);
  return old_char;
}
export var getOtherHalfCoord = (x, y) => [x,  ((y % 2) ? -1 : 1) + y];
export var getCharAtIndex = (canvas,index) => {
  return canvas.text().charAt(index);
};
export var get_bresenham_line_points = (line_points, is_connected=false) => {
  var return_points = [];
  for (var i = 0; i < line_points.length; i++) {
    var x0 = line_points[i][0];
    var y0 = line_points[i][1];
    var x1, y1;
    if (i == line_points.length - 1) {
      if (is_connected && line_points.length > 2) {
        x1 = line_points[0][0];
        y1 = line_points[0][1];
      } else {
        break;
      }
    } else {
      x1 = line_points[i+1][0];
      y1 = line_points[i+1][1];
    }
    if (isNaN(x0) || isNaN(x1) || isNaN(y0) || isNaN(y1)) {
      throw "NaNs detected";
    }
    var dx = Math.abs(x1-x0);
    var sx = x0<x1 ? 1 : -1;
    var dy = -Math.abs(y1-y0);
    var sy = y0<y1 ? 1 : -1;
    var err = dx+dy;
    while (true) {
      return_points.push([x0, y0]);
      if (x0==x1 && y0==y1) break;
      var e2 = 2*err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  return return_points;
}
export var get_bresenham_circle_points = function (x0, y0, radius) {
  var return_points = [];
  if (isNaN(x0) || isNaN(y0) || isNaN(radius)) {
    throw "NaNs detected";
  }
  var x = radius;
  var y = 0;
  var radiusError = 1 - x;

  while (x >= y) {
    return_points.push([x + x0, y + y0]);
    return_points.push([y + x0, x + y0]);
    return_points.push([-x + x0, y + y0]);
    return_points.push([-y + x0, x + y0]);
    return_points.push([-x + x0, -y + y0]);
    return_points.push([-y + x0, -x + y0]);
    return_points.push([x + x0, -y + y0]);
    return_points.push([y + x0, -x + y0]);
    y++;

    if (radiusError < 0) {
        radiusError += 2 * y + 1;
      }
      else {
          x--;
          radiusError+= 2 * (y - x + 1);
      }
  }
  return return_points;
};
export var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = window.location.search.substring(1),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;
  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
    }
  }
};
export var gcd = (a, b) => {
  return b ? gcd(b, a % b) : a;
}

export var isInt = (a) => { return (typeof a==='number' && (a%1)===0); };
export var roundFloat = (a, precision = 2) => {
  if (a === null || a === undefined) return "";
  return a.toFixed(precision).replace(/(^|(?<=-))0+/,'');
};
export var get_random_int_with_expected_float_average = (expected) => (Math.random() < expected % 1 ? 1 : 0) + Math.floor(expected)
export var get_coord_offset = (coord, offset) => [coord[0] + offset[0], coord[1] + offset[1]];
export var mark_grid = (grid, coord, value) => {grid[coord[0]][coord[1]] = value}
export var is_grid_offset_in_bounds = (grid, coord, offset) => {
  var new_coord = get_coord_offset(coord, offset);
  if (new_coord[0] >= 0 && new_coord[1] >= 0 && new_coord[0] < grid.length && new_coord[1] < grid[0].length) {
    return true;
  }
  return false;
}
export var is_grid_offset_true = (grid, coord, offset) => {
  var new_coord = get_coord_offset(coord, offset);
  return grid[new_coord[0]][new_coord[1]];
}

export var render_grid = (grid, char_func) => {
  let text = "";
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      text += char_func(grid[r][c], r, c);
    }
    text += "\n";
  }
  return text;
}

export var render_density_grid = (grid) => {
  let text = "";
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const d = grid[r][c];
      const char_idx = Math.min(Math.floor(d), density_chars.length - 1);
      text += density_chars[char_idx];
    }
    text += "\n";
  }
  return text;
}

export var smoothstep = (edge0, edge1, x) => {
  x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

export var smootherstep = (edge0, edge1, x) => {
  x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export var sq_dist = (p1, p2) => {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

export var find_n_nearest = (p, points, n, dist_func = sq_dist) => {
  const distances = points.map((pt, idx) => ({ idx, dist: dist_func(p, pt) }));
  distances.sort((a, b) => a.dist - b.dist);
  return distances.slice(0, n);
}


/*----------- Data Init -----------*/

export var init_poob_details = () => {
    window.poob_detail = [];
    window.poob_detail.push([
      "#%&%%@,((##..*********.**.,(,******",
      "@@@@@@@.%(@@.*,/((((/*****,,..*****",
      "@@@@@@,#////((#(##%#(///***/*******",
      "@@@@#*(###%#%##(/####(((((((//*,***",
      "@@@(#((((/(((////////(###%####(//**",
      "%&/#((((/(////****//**//(######//**",
      "###%###(%%#(/********//((#&&%%#((//",
      "#####@@@@@&&&%%(/****///*//&&@(/***",
      "####&@@@@@@@@&&((//****//#%@@(/****",
      "%###@@@@@@@@@@@@%(((((((/////##&(((",
      "%%%%@@@@@@@@@@@&((/////////*///##%(",
      "&&&&&@@@@@@@&%#(((/(//(((////*/%/((",
      "&&&&@@@&&&%%##(((#(//////(//////#((",
      "@@&@@@&&@&%&%%#((#(#%#///(//////(((",
      "&&&&@@@@@@&&%%%#(####%##(/((////(##",
      "&&&&&&@@@@@@&%#%##########((((//(#(",
      "@&&&&&&&&&@@@&&%%%#####%%#####((###",
      "@&&&&&&&&&&&@@&&%%%%%##%&%%&%##(###",
      "@@&&&%&&&&&&&&&@&&&&%%%%&&&&&%#((##"
    ]);
    window.poob_detail.push([
      "###%%%%%%%%%##################(//(((//#/,**(/*,***",
      "####%%%%%%%%#%%%%#/((#%((#/###(/#(/*,(*****,/*...*",
      "%######%%%%%#(%(##///(((((/((///(#(/*/(/*//,,,*,,*",
      "#%%%%%%%%%#(/*/*/(//**/((//#(//((/(//(//(/(/*,//,*",
      "%%%%%%%%%%(/////*//(*,*///**////**/*//(((##/,.,//*",
      "%%%%%%%%#////((//////**////***//**//////((/(*,*,.*",
      "%%%%%%%#((((//(///*//****/////**//////(((((/,,,.,*",
      "%%%%%###((#(//****/*******/(///*/*/*/((/((/*/**(,*",
      "%%&&&%##(((((((/(/**/*****,/(//(##(///*((/((/*****",
      "%%&&%#####(((###(#/*(///*****(/%#(/#(((//((///****",
      "%%&&%%%%########(/((/*//*//***/*((#(//(((((((///**",
      "%%&&%###(###%&@(##((////*///**//*////***////**/***",
      "%&&%####%&@&(//////////////*/*////////////**(*****",
      "%%&%#%%%%%&&%#%((((((////**/*/**********/***///***",
      "%%&&%%&&&%#####((///**///***//****,*****/////*///*",
      "%&%&&&&&%%%%###((///((////(%%&&&&&&&*******/////(*",
      "&%%&&&&%%%######%%(/////(&&@&&%&%%&&&(**//*////((*",
      "%%%%&&&%%#%##(((((((((//&@@@@&&%&&@@@%***//**/((/*",
      "%%&&&&%%%###%##%###(#(//#@@@@@@@&&@@@(***/**/((//*",
      "%&&&&&%%%%#%%%########(//(#&@&@@&@&&(/***///((///*",
      "%%&&&&%%%%%##%###%%#%#((////#&&&&@#//*///(//(((//*",
      "%&&&&&%%%%%%%#######((///#((#(/%#(##(((###(((((***",
      "&&&&@@%%&&%%%&%##&&%%##(####(##%&&%%(///((#(#((#(*",
      "&&&&@@&%%%%%#(#%&&&&&&&&%%#%%%####(////((((%###((*",
      "&&&&%#%#%##&@@%&&&&&&%####((//(((/(((/##(##(#*****",
      "&&&&%##%#%%#%&%%%&&&%%%###(#/##(#(/#((##%#%((*****",
      "&&%%%%###%%%((#(#%&&%%%%%%%#%###%(##%#%%#%###(#***",
      "%&%#(%##%%%####%%%%%%%%%&&&&&%%%%%%%%%%#(#%%(((((*",
      "%#%###%%###%%%%%%###%#%#%#%%&&&&@@&@&&%%(&%%#%#((*",
      "&%(%%%#&&%##%#%######%##%%%##%%#%%%%###(#%%#%#%##*"
    ]);
    window.poob_detail.push([
      "####%%%%%%%%%%%%%%%%%%%%%%################%###################(((/((/*/#(/***((((*,*,,,///(#/,*(##/*",
      "#####%%%%%%%%%%%%%%%%%%##########(##(#((#%%%#(((##%###%(######(/((//**//*//##/**,,,/*/(((/,,*,,**/,*",
      "##########%%%%%%%%%%%%%%%####%%%###((((((#####((#(###(/###%%##(/((((/((/***//,,*/***,,/*,/**,...,,,*",
      "#########%##%%%%%%%%%%%##%##%%##%%%%#//(/(((#%#(((#(((/####(/(/((##(///*,**/**//*/////*,,,,,,,**/***",
      "####%#%#%%#%%%%%%%%%%%%%###%%#%#####((//*/(((((##(#((/((#((/((((/(/#((/***///((/*,*,//**,*,/////(/**",
      "####%#%%%%%%%%%%%%%%%%%%##(/(#######(///**/((#((((/((/((((//////(//(///////(((///////****,,.,,,**,,*",
      "##%%%%%%%%%%%%%%%%%%%##((///////(((((//*/**//(##(/((//(#((//(/((//////((////(///////*******,*((#(/,*",
      "#%%%%%%%%%%%%%%%%%%%%#(((/(//**///(((//******//((((///(#(//////(///(/////((((///(((((((((/***,*/,,**",
      "#%%%%%%%%%%%%%%%%%%###(///((////**////(//*,***//////**/*/****/*///////((/////((((((((##///,...,*/***",
      "%%%%%%%%%%%%%%%%%%%######((////////**//(//****///////**////**/************//((((((((((/***,,*//*,,,*",
      "%%#%%%%%%%%%%%&%%#(((//((((((////////*////**,**//**///***//*****************//((((((//***,,,**,....*",
      "%%%%%%%%%%%%%%%#((((///////(/(////////**///****/*/*/////*/***/////((###((((((/((((((((/((/,..,,,,***",
      "%%%%%%%%%%%&%%#(#(((((((/////(///////****//******////////*/***///////***///////(###(/((/**,,,,,,..**",
      "%%%%%%%%%%%%#%#((((((##((/////(/*////**/**//*//***/*/(((/////*/***////////////((((#((((((/,,****///*",
      "%%%%%%%%%%%#####(####((((/(//******/*********/****/////(///////******/**/////////****/////(//*,*****",
      "%%%%%%%%%&&%%%%(((((((((//////**////*/*/******/*****//(/((/////////////***//((((((((((/////,***,.,**",
      "%%%%%%%&&%%%%%#(##(((((((/(/(((/((//*/***/*/**//******/(((////(/(/(((((/*///**/(((((((///(/,*,,,,,**",
      "%&%&&&&&&&###((((((((((((((((((#(/*****//*/*/*********//(///(%&@@%((//////////((((//(((/***/(***,***",
      "%%%&&&&&&&%#######((((((((#(((((((#((***///////(********///(((%&@@##%%#((((((/(((//(((((((///((///**",
      "%%%%%&&&&%#####(#######(((##########((//(*//**/*/*********(//**/##&&((////##((((((///((((////*******",
      "%%%%&&&&####%%##(#######((##%%%###(((//*/*/****///*********////(((%%#(/////((((((((((((///**/*******",
      "%%%%%&&&%#%%%%%%###########(////////**//////*/*/*/////*****/*/*////((/////*////((///((((((////******",
      "%%%%%&&&%%########((#####%%&((#%##(////***/(/////////***/**/**///////******//////(///*/////*********",
      "%%%%&&&&########(###%%&@@@&&/%##((((((/(////*//*//////*//*////////////////*/*///////////*////***/***",
      "%%%%&&&&%##%%#######%%%&@@@@@&&%%(((///////////(/////////**/**/**///*///////////////////////*****//*",
      "%%%%&&&&%%%#((#####%%%&@@@@@%(((/(((((((/((/////////////*//******/**//**////**////////********////**",
      "%%%%%&&##%%%##%#%#%&&&&&%%####(((//(((((/(((//*//*/*///*////*****//****/******////////////////******",
      "%%%&&&&%%%%&&&&&&&&%%&&%%%##%####((((((////////////****//////*/*******************/*/******/***//***",
      "%%%&&&&&&&%%%&&&&&&%%%%%%####((((((///******/*//**//*****////*/*******,***********/**/////****////**",
      "%%%%&&&&&&%%&&@&&&%%%##%##(####(((((//////*******//***/***//*///((//*******,***/////////////*////***",
      "%%%%%&&&&&&&&&&&&%%%%%%#####((((((((###((//////***////(((((#%&&&&&&&&***,,**///*///*///*****/////***",
      "&%&&&&&&&&&&&&&&%%%%%%%#(#######((////////(//((////((#%&&&&&&&&&&&&&&&&&*,***///****/////(((((/((***",
      "%&%%%&&&&&&&&&&%%%%%%%##############(/*/**//////((#%&&&&&@&&&&%&%%%%%&&&&&&*****///////////////((//*",
      "%%%%%%%&&&&&&&&%%%%%%#######%######%%%%%(///*////#&@&&&@@&%%%%#%%&%&&&@&&&&%*****////**///////(((((*",
      "%%%%%&%&&&&&&%&%%%%%%################((####(////(&@@@@@@&%&&@&%&&&&%&@@@@&&%********/*****///((/(//*",
      "%%%%%&%&&&&&&&%%%%##%%#####(((((((((#((((((/////(&@@@@@@&&@@@@&&&&&&@@@@@@******////////((//(((//***",
      "%%%&&&&&&&&&&%&%%%########################(((///(%@@@@@@&@@@@@@@&&&&&@@@&&%(******///////(((((((//**",
      "%%%&&&&%&&&&&&%%%%###########%#%##########((////((#&@@@@@@@@@@@@&&@&&&&&&@%/*******///**//(#((/////*",
      "%&&&&&&&&&&&&%%%%%#%%%##%%%%%#############(((((///((%%&&&%&&&@@@&&@@&&&&&%(/*******//*////((/(/(//**",
      "%&&%%&&&&&&&%%%%###%%%%%#%%#######%###%%%####((((((/((#%@@@@@@@&&&@@&&&((/***//*///////((((//////***",
      "%%&&&&&&&&&&&%%##%%%%%&%###%######%%%%%%%#%%#(((//((//((%&@@@@&&&&@&&((////*/////////(/((((////(/***",
      "%%&&&&&&&&%%%%#%#%%%%%#%#%%%######%%%%%%###(((((((((/////(%#%%#%%%&@#(#(((//////(((((/((((((//////(*",
      "%%%&&&&&&&&%&&%%%%&%%%%%%%%#######%%########((///////(#//#/(((((####(##/#((((/((###(##((((//(((((***",
      "%%&&&&&&&@@&%&%%%&&%%%%&%%#%%####%%#########(((((((((#((((((((((###(%%(#(((((((####(#(((/(((##(*****",
      "&&&&&&&&&&&@@&%%&%&%%%%%%&%%&%%###%&%%%%%%%###(((((#(#((#(((#(#####%&%&%%%(((//(((((#(#((#(((((###(*",
      "&&&&&&&&&&@@&%%%%&%&%%%%%%%%%%%%#%&&&%&&%%######%%##%#####&&%&&&%&&%%#(((//////((((#####(((((((((***",
      "&&&&&&&&&@@@&&&%%%%%%%%%%%%###%%%&&&&&&&&&%%%#&&&%%%%%%%%%&&%&&%&&%%%((*//*///((((((/(###(((##(#(((*",
      "&&&&&&&&&@@@@%%#%%%%%%%####%%%&%&&&&&@@%@&%&&&&&%%#########((/#/((((*/////((/(((((((%%%#(#(##((#(***",
      "&&&&&&&&&&&%%%%%#%##%#%####%&&&&&%&&&&&@&&&&&&&&%%%###(#(((((///(/(((((/(((//((/(((#((%####((((#(***",
      "&&&&&&&&@%%&%###%%#%%%%###&&&&@@&%%%%&&&&&&%%&%#######(((((/*((//((/((/(##(/(((#######%%#####((##***",
      "&&&&&&&@&@&##%%%###%%##%%&&&&%%%%%%%&&&&&&&%%#%##%####((#/(##(((((((((###((((###%%##%#####((#*******",
      "&&&&&&%#%###%%%%#%#%%%#%&&%####%%%%%&&&&&&&%%#%###%%%%####(((#(#((###(((%%%#((%%%%%%%#%%#####((((***",
      "&&&&%%%%#&%#%%#%%%&%###########%&&&&&%%&%##%#%%%%%%%##%#(###%#(#%##(((%##%(#%&&%%%%%%%###((((##*****",
      "%&&&%##%&%%#(#%###%#%#####(#(#(##%%%%%&%%%%%%%%%%%%%%%%%%%#(%%%####(##((#####%##%#######(((#####/((*",
      "&%&%&%#(#%####################%%%&&&%%%%%%%%%&&&&&&&&%%&%%%&%#%%%##%%%%%%%%%%#%%##%%##(((/((((#((***",
      "%&&%%#%#(#%%#%%####&%%#####%%%%%%%%%##%%##%%&%%&&&&&&&&%%%&&&&%%%%%%%%&%%%%%#%#(#%&%%%%#((((((((/***",
      "&%#%%&(##(%%#%&%#%#%%%##%%#%#%%%%%%%##%%%%#%###%%#%%%%&%%&&&&&&&&%&&&&%%%%%%%#%(#&&&%%%###((((/((***",
      "%%%#%%%#(%#%%##%(##(##%%%%%%%%%%%%#######%%%%%%##%%#%%%%%%&%&&%%&&&&@@@&&&%%#%%%(#%&%&%%%#%%#(#((((*",
      "#&&%((#(%#%#%&&%%###%%##%%%%#############%####%#%%%#%#%%###%%%%%&%%&%%%%%###%#(##&%%%%%#%%#%#(((#***",
      "%%%#(((#%%%#&%&&#%%#%%%%%%%%#((#####%%##%%#######%%####%%%####%%%%%#######(/(#%%%##(((##(######*****"
    ]);
    window.poob_detail_dims = [];
    for (var i = 0; i < window.poob_detail.length; i++) {
      window.poob_detail_dims.push([window.poob_detail[i][0].length, window.poob_detail[i].length]);
    }
  }

export var init_lorem_ipsum = () => {
  window.lorem_ipsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed"
    + "do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim"
    + " ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut al"
    + "iquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit "
    + "in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Except"
    + "eur sint occaecat cupidatat non proident, sunt in culpa qui officia de"
    + "serunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. "
    + "Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, "
    + "est eros bibendum elit, nec luctus magna felis sollicitudin mauris. In"
    + "teger in mauris eu nibh euismod gravida. Duis ac tellus et risus vulpu"
    + "tate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorp"
    + "er, ligula eu tempor congue, eros est euismod turpis, id tincidunt sap"
    + "ien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pe"
    + "llentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo"
    + " eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet"
    + ", felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. Cr"
    + "as mollis scelerisque nunc. Nullam arcu. Aliquam consequat. Curabitur "
    + "augue lorem, dapibus quis, laoreet et, pretium ac, nisi. Aenean magna "
    + "nisl, mollis quis, molestie eu, feugiat in, orci. In hac habitasse pla"
    + "tea dictumst.";
}

export var init_browser_info = () => {
  var info = {};
  info["timeOpened"] = (new Date()).toString();
  info["timeZone"] = ((new Date()).getTimezoneOffset()/60).toString();
  info["javaEnabled"] = navigator.javaEnabled();
  info["pageon"] = window.location.pathname
  info["referrer"] = document.referrer;
  info["previousSites"] = history.length;
  info["browserName"] = navigator.appName;
  info["browserEngine"] = navigator.product;
  info["browserVersion1a"] = navigator.appVersion;
  info["browserVersion1b"] = navigator.userAgent;
  info["browserLanguage"] = navigator.language;
  info["browserOnline"] = navigator.onLine;
  info["browserPlatform"] = navigator.platform;
  info["dataCookiesEnabled"] = navigator.cookieEnabled;
  info["dataCookies2"] = decodeURIComponent(document.cookie.split(";"));
  info["dataCookies1"] = document.cookie;
  info["dataStorage"] = localStorage;
  info["sizeScreenW"] = screen.width;
  info["sizeScreenH"] = screen.height;
  info["sizeDocW"] = document.width;
  info["sizeInW"] = innerWidth;
  info["sizeDocH"] = document.height;
  info["sizeInH"] = innerHeight;
  info["sizeAvailH"] = screen.availHeight;
  info["sizeAvailW"] = screen.availWidth;
  info["scrColorDepth"] = screen.colorDepth;
  info["scrPixelDepth"] = screen.pixelDepth;
  window.browser_info = JSON.stringify(info);
}

export var density_chars =
    "·.∙`-':_,─;^~÷⌐/=°¬\"+()º<>┘═[]»≤≥«%|└\\iªⁿt±┐╛c!l{}¡²¿íï≡?xI┌┴rì≈*ετ7u╘╧fvΓsCJz┬ea1σîo2çü╕πL√4αn∞dÇ3TäæSwëùú⌡YΣ╒╙╜V¢éj╚59ö⌠╝6£èƒ│ßàáûδFPZm╨Gq¥êòó∩■âk0Xb╩&Aô┤╤gΘ░µ╓╖UΩh├Oy½8φpåΦ╡╥H#@ÜñEÖ┼DÄK¼₧$ÅÉ╞RBÿÆMNQW╔╗╪╦▀▌Ñ║╟╢╠╣╫╬▐▄▒▓█";

export var reset_canvas = function() {
    window.canvas = $(".ascii");
    var width = window.canvas.width();
    var height = window.canvas.height();

    // globals: rows, columns, char_height, char_width, animation_speed_multiplier, max_dim, min_dim
    // char_height and char_width are defined in index.html, need to ensure they are available on window
    
    window.rows = Math.max(1, Math.floor(height / window.char_height));
    window.columns = Math.max(1, Math.floor(width / window.char_width));
    window.animation_speed_multiplier = Math.max(1, Math.floor(window.rows * window.columns / 750));
    window.max_dim = Math.max(1, Math.max(window.rows, window.columns));
    window.min_dim = Math.max(1, Math.min(window.rows, window.columns));
    var row_text = ".".repeat(window.columns);

    window.canvas.empty();
    for (var i = 0; i < window.rows; i++) {
      window.canvas.append(row_text + "\n");
    }
}

export var first_frame_tooltip = function(txt) {
  if (window.frame_count == 0) {
    tooltip(txt);
  }
}

export var tooltip = function(txt, sub_index = null, extra_url_params = {}) {
    var tooltip = $("span.tooltip");
    tooltip.empty();
    if (txt) {
      var index = -1;
      if (window.animations && window.animation) {
          index = window.animations.index_of(window.animation);
      }
      
      var c_param = getUrlParameter("c");
      var href = "?a=" + index;
      
      // Use provided sub_index, or the global one if it matches this animation
      var b_val = sub_index;
      if (b_val === null && !isNaN(window.sub_animation_index)) {
          b_val = window.sub_animation_index;
      }
      
      // If rule is provided, it overrides 'b' (sub_animation)
      if (!extra_url_params.hasOwnProperty("rule") && b_val !== null) {
          href += "&b=" + b_val;
      }
      
      if (c_param) href += "&c=" + c_param;
      
      for (var key in extra_url_params) {
          if (extra_url_params.hasOwnProperty(key)) {
              href += "&" + key + "=" + encodeURIComponent(extra_url_params[key]);
          }
      }
      
      tooltip.append('<a href="' + href + '">' + txt + '</a>');
    }
}
