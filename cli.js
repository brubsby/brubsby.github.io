#!/usr/bin/env node

import { animations } from './js/animations_list.js';

// --- Mocks & Polyfills ---

global.window = {
  innerWidth: process.stdout.columns,
  innerHeight: process.stdout.rows,
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
      width: process.stdout.columns,
      height: process.stdout.rows,
      availWidth: process.stdout.columns,
      availHeight: process.stdout.rows,
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
    // Throttle to ~30fps or so to avoid flickering and high CPU
    setTimeout(() => callback(Date.now()), 1000 / 30);
};

// jQuery Mock
const jqMock = {
    width: () => process.stdout.columns * (window.char_width || 1),
    height: () => process.stdout.rows * (window.char_height || 1),
    empty: () => { 
        if (window.canvas) window.canvas._content = ""; 
    },
    append: (str) => { 
        if (window.canvas) window.canvas._content += str; 
    },
    text: (str) => {
        if (str === undefined) return window.canvas ? window.canvas._content : "";
        if (window.canvas) {
            window.canvas._content = str;
            // ANSI Clear Screen and Home Cursor
            process.stdout.write('\x1b[2J\x1b[H');
            process.stdout.write(str);
        }
    },
    children: [ { text: "DARK" } ],
    on: (evt, cb) => {
        if (evt === 'load') {
            // Execute load immediately
            setTimeout(cb, 0);
        }
    }
};
// Allow property access on jqMock to return itself for chaining/properties
const jqProxy = new Proxy(function(selector) {
    return jqMock;
}, {
    get: function(target, prop) {
        if (prop in jqMock) return jqMock[prop];
        return jqMock;
    }
});

global.$ = jqProxy;
global.jQuery = jqProxy;


// Import utils to trigger their side-effects (like attaching to window)
import './js/utils.js';

// Load SimplexNoise (Side-effect: attaches to window.SimplexNoise because we defined window)
await import('./js/simplex-noise.js');
global.SimplexNoise = window.SimplexNoise;

// --- CLI Logic ---

const cleanup = () => {
    // Restore main screen buffer and show cursor
    process.stdout.write('\x1b[?1049l\x1b[?25h');
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const args = process.argv.slice(2);
let animationName = args[0];

// Handle Help
if (args.includes('--help') || args.includes('-h')) {
    console.log("Usage: node cli.js [animation_name]");
    console.log("Available animations:");
    // We can iterate the animations sampler
    // The sampler structure is opaque but we can peek or just list known files
    // The ObjectsSampler.objects is an array of {obj: "name", ...}
    animations.objects.forEach(o => console.log(`  ${o.obj}`));
    process.exit(0);
}

// Select Animation
if (!animationName) {
    animationName = animations.sample();
    console.log(`No animation specified. Randomly selected: ${animationName}`);
    // Give user a moment to see the name
    await new Promise(r => setTimeout(r, 1500));
} else {
    // Check if valid
    // simple linear search since we don't have direct keys access in public API easily without iterating
    const valid = animations.objects.some(o => o.obj === animationName);
    if (!valid) {
        console.error(`Animation '${animationName}' not found.`);
        console.log("Available animations:");
        animations.objects.forEach(o => console.log(`  ${o.obj}`));
        process.exit(1);
    }
}

// Set up URL params mock if needed by utils.getUrlParameter
// We can pass params like name=val via args if we want, but for now simple name selection
global.window.location.search = `?a=${animations.index_of(animationName)}`;

// Switch to alternate screen buffer and hide cursor
process.stdout.write('\x1b[?1049h\x1b[?25l');

// Load and Run
try {
    const modulePath = `./js/animations/${animationName}`;
    const module = await import(modulePath);
    const animationFunc = module.default;

    // Initialize Canvas Mock State
    window.canvas = { _content: "" };
    // Bind jQuery text/etc methods to this state? 
    // The jQuery mock writes to window.canvas._content if it exists.
    
    // Call reset_canvas from utils (it's imported so it should be available? 
    // actually utils exports functions, it doesn't just attach to window unless we explicitly do so.
    // index.html does `import { reset_canvas } ...`.
    // The animation files assume `reset_canvas` has been called.
    
    // We need to import `reset_canvas` here and call it.
    const utils = await import('./js/utils.js');
    utils.reset_canvas(); // This sets window.rows/cols/etc.

    // Run
    animationFunc(animationFunc);

} catch (err) {
    console.error(`Failed to load or run animation '${animationName}':`, err);
    process.exit(1);
}
