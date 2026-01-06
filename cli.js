#!/usr/bin/env node

import { animations } from './js/animations_list.js';

// --- Argument Parsing ---

const args = process.argv.slice(2);
let animationName = null;
global.cliConfig = { targetFrame: null, width: null, height: null };

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--frame' || args[i] === '-f') {
        global.cliConfig.targetFrame = parseInt(args[i+1]);
        i++;
    } else if (args[i] === '--width' || args[i] === '-w') {
        global.cliConfig.width = parseInt(args[i+1]);
        i++;
    } else if (args[i] === '--height') {
        global.cliConfig.height = parseInt(args[i+1]);
        i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log("Usage: node cli.js [animation_name] [--frame <N>] [--width <N>] [--height <N>]");
        console.log("Available animations:");
        animations.objects.forEach(o => console.log(`  ${o.obj}`));
        process.exit(0);
    } else if (!args[i].startsWith('-')) {
        animationName = args[i];
    }
}

// --- Mocks & Polyfills ---

global.window = {
  innerWidth: (global.cliConfig.width || process.stdout.columns || 80),
  innerHeight: (global.cliConfig.height || process.stdout.rows || 24),
  location: { search: "" },
  document: {
      cookie: "",
      referrer: "",
  },
  navigator: {
      userAgent: "Node.js",
      platform: process.platform,
      javaEnabled: () => false,
      appName: "NodeCLI",
      product: "NodeJS",
      appVersion: process.version,
      language: "en-US",
      onLine: true,
      cookieEnabled: false
  },
  screen: {
      width: (global.cliConfig.width || process.stdout.columns || 80),
      height: (global.cliConfig.height || process.stdout.rows || 24),
      availWidth: (global.cliConfig.width || process.stdout.columns || 80),
      availHeight: (global.cliConfig.height || process.stdout.rows || 24),
      colorDepth: 24,
      pixelDepth: 24
  },
  constant_random_boolean: Math.random() < 0.5,
  constant_random_values: Array.from({length: 20}, () => Math.random()),
  // Animation specific globals
  canvas: null,
  flat_index_list: null,
  simplex_noise: null,
  rows: 0,
  columns: 0,
  animation_speed_multiplier: 1,
  min_dim: 0,
  max_dim: 0,
  flat_mapgen_tiles: null,
  mapgen_tiles: null,
  mapgen_probabilities: null,
  falloff_map: null,
  velocity_pixels: null,
  position_pixels: null,
  bounces: 0,
  text_to_print: null,
  flip: false,
  line_points: null,
  last_points: null,
  empty_half_pixels: null,
  browser_info: null,
  remaining_particles: 0,
  particles: null,
  random_edge_point_sampler: null,
  active_sand_coords: null,
  grid: null,
  jitter_offsets: null,
  gravity_offset: null,
  dropper_movement_funcs: null,
  dropper_movement_func: null,
  fractals: null,
  fractal: null,
  center: null,
  last_timestamp: 0,
  average_framerate: 0,
  target_framerate: 0,
  universe: null,
  rules: null,
  char_height: 24,
  char_width: 12,
  frame_count: 0,
  index_lists: [],
  sub_animation_index: NaN,
  animations: animations
};

['document', 'navigator', 'screen'].forEach(key => {
    try {
        Object.defineProperty(global, key, {
            value: window[key],
            writable: true,
            configurable: true
        });
    } catch (e) {
        console.warn(`Could not polyfill global.${key}:`, e.message);
    }
});

// Polyfill requestAnimationFrame
global.requestAnimationFrame = (callback) => {
    // Render the current frame (Interactive Mode)
    if (global.cliConfig.targetFrame === null) {
        if (window.canvas && window.canvas._content) {
            process.stdout.write('\x1b[H');
            process.stdout.write(window.canvas._content);
        }
    }

    // Frame Capture Mode
    if (global.cliConfig.targetFrame !== null) {
        if (window.frame_count > global.cliConfig.targetFrame) {
             process.stdout.write(window.canvas._content || "");
             process.exit(0);
        }
        setImmediate(() => callback(Date.now()));
    } else {
        // Interactive Mode: Throttle to ~30fps
        setTimeout(() => callback(Date.now()), 1000 / 30);
    }
};

// jQuery Mock
const createJqObj = (selector) => {
    const obj = {
        _content: "", 
        width: () => (global.cliConfig.width || process.stdout.columns || 80) * (window.char_width || 1),
        height: () => {
            const rows = global.cliConfig.height || ((process.stdout.rows || 24) - 1);
            return rows * (window.char_height || 1);
        },
        empty: () => { obj._content = ""; },
        append: (str) => { obj._content += str; },
        text: (str) => {
            if (str === undefined) return obj._content;
            obj._content = str;
        },
        children: [ { text: "DARK" } ], 
        on: (evt, cb) => {
            if (evt === 'load') setTimeout(cb, 0);
        },
        get: () => [ { href: "" } ] 
    };
    return obj;
};

const jqProxy = new Proxy(function(selector) {
    return createJqObj(selector);
}, {
    get: function(target, prop) {
        if (prop === 'on') return createJqObj(null).on; 
        return createJqObj(null)[prop]; 
    }
});

global.$ = jqProxy;
global.jQuery = jqProxy;

// Enhance document mock
window.document.getElementById = (id) => ({
    children: [ { text: "DARK" } ],
    onclick: () => {},
    onkeydown: () => {}
});


// Import utils to trigger their side-effects (like attaching to window)
import './js/utils.js';

// Load SimplexNoise (Side-effect: attaches to window.SimplexNoise because we defined window)
await import('./js/simplex-noise.js');
global.SimplexNoise = window.SimplexNoise;

// --- CLI Logic ---

const restore = () => {
    // Restore main screen buffer and show cursor (only if we entered it)
    if (global.cliConfig.targetFrame === null) {
        process.stdout.write('\x1b[?1049l\x1b[?25h');
    }
};

const cleanup = () => {
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', restore);

// Select Animation
if (!animationName) {
    animationName = animations.sample();
    if (global.cliConfig.targetFrame === null) {
        console.log(`No animation specified. Randomly selected: ${animationName}`);
        await new Promise(r => setTimeout(r, 1500));
    }
} else {
    const valid = animations.objects.some(o => o.obj === animationName);
    if (!valid) {
        console.error(`Animation '${animationName}' not found.`);
        console.log("Available animations:");
        animations.objects.forEach(o => console.log(`  ${o.obj}`));
        process.exit(1);
    }
}

// Set up URL params mock
global.window.location.search = `?a=${animations.index_of(animationName)}`;

// Switch to alternate screen buffer and hide cursor (if not capturing frame)
if (global.cliConfig.targetFrame === null) {
    process.stdout.write('\x1b[?1049h\x1b[?25l');
}

// Load and Run
try {
    const modulePath = `./js/animations/${animationName}`;
    const module = await import(modulePath);
    const animationFunc = module.default;

    window.canvas = { _content: "" };
    
    const utils = await import('./js/utils.js');
    utils.reset_canvas();

    // Run
    animationFunc(animationFunc);

} catch (err) {
    console.error(`Failed to load or run animation '${animationName}':`, err);
    process.exit(1);
}
