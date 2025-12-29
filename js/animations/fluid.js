import { tooltip } from "../utils.js";

var gravity = 1;
var pressure = 4;
var viscosity = 7;

class Particle {
  constructor() {
    this.xPos = 0.0;
    this.yPos = 0.0;
    this.density = 0.0;
    this.xForce = 0.0;
    this.yForce = 0.0;
    this.xVelocity = 0.0;
    this.yVelocity = 0.0;
    this.wallflag = 0;
  }
}

var MAX_PARTICLES = 10000; 
var GRID_CELL_SIZE = 4; // Interaction radius is < 4

// Global simulation state
var grid_head = null;
var particle_next = new Int16Array(MAX_PARTICLES);
var grid_cols = 0;
var grid_rows = 0;

var add_wall = (cx, cy) => {
  if (window.fluid_particles.length > 1500) return; // Hard safety limit
  var p1 = new Particle();
  var p2 = new Particle();
  p1.wallflag = 1;
  p2.wallflag = 1;
  p1.xPos = cx;
  p1.yPos = cy * 2;
  p2.xPos = cx;
  p2.yPos = cy * 2 + 1;
  window.fluid_particles.push(p1);
  window.fluid_particles.push(p2);
};

var add_water = (cx, cy) => {
  if (window.fluid_particles.length >= MAX_PARTICLES) return;
  var p1 = new Particle();
  var p2 = new Particle();
  p1.xPos = cx;
  p1.yPos = cy * 2;
  p2.xPos = cx;
  p2.yPos = cy * 2 + 1;
  window.fluid_particles.push(p1);
  window.fluid_particles.push(p2);
};

var addWalls = (x, y, w, h) => {
  for (var i = x; i < x + w; i++) {
    for (var j = y; j < y + h; j++) {
      add_wall(i, j);
    }
  }
};

var addWater = (x, y, w, h) => {
  for (var i = x; i < x + w; i++) {
    for (var j = y; j < y + h; j++) {
      add_water(i, j);
    }
  }
};

var generators = [
  // Column
  {
    name: "Column",
    fn: (w, h) => {
      addWalls(0, 0, 2, h - 2);
      var rightWallStartY = Math.max(0, h - 13);
      var rightWallEndY = h - 2;
      addWalls(w - 3, rightWallStartY, 2, rightWallEndY - rightWallStartY);
      addWalls(1, h - 3, w - 3, 2);
      addWater(2, 0, Math.floor(w / 3) - 1, h - 4);
    },
  },
  // Pour-out
  {
    name: "Pour-out",
    fn: (w, h) => {
      var cupW = 13;
      var cupH = 4;
      var tankH = Math.min(h, 14);
      var tankW = Math.min(31, w - 6 - cupW);
      var tankR = tankW - 4;
      var spoutX = tankR + 2;
      var spoutY = tankH - 6;
      var peakX = spoutX + 4;
      var peakY = spoutY - 2;
      var dist = spoutX - peakX;
      var a = (spoutY - peakY) / (dist * dist);

      var cupY = h - cupH - 1;
      var cupCenterX = peakX + Math.sqrt((cupY - peakY) / a);
      var cupX = cupCenterX - Math.floor(cupW / 2);
      if (cupX + cupW - 1 > w) {
        cupX = w - cupW - 1;
        cupCenterX = cupX + Math.floor(cupW / 2);
        cupY = a * (cupCenterX - peakX) * (cupCenterX - peakX) + peakY;
      }
      cupX = Math.max(cupX, tankW + 5);

      addWalls(0, 0, 3, tankH - 2);
      addWalls(1, tankH - 3, tankW, 2);
      addWalls(tankW, tankH - 4, 2, 2);
      addWalls(tankW + 1, tankH - 5, 2, 2);
      addWalls(tankR, 0, 3, tankH - 6);
      addWalls(tankR, tankH - 6, 2, 1);
      addWalls(cupX, cupY, 2, 3);
      addWalls(cupX + 1, cupY + cupH - 1, cupW - 2, 1);
      addWalls(cupX + cupW - 2, cupY, 2, 3);
      addWater(4, 1, tankR - 4 - 1, 9);
    },
  },
  // Terraces
  {
    name: "Terraces",
    fn: (w, h) => {
      var stepW = Math.min(12, Math.max(8, Math.floor(w / 5)));
      var stepH = Math.min(4, Math.max(2, Math.floor((h - 4) / 5)));
      var containerW = Math.min(32, Math.floor(w / 3));
      var containerH = Math.min(12, Math.max(8, Math.floor(h / 3)));
      var steps = Math.min(
        Math.floor((h - containerH - 2) / stepH),
        Math.floor((w - containerW - 2) / stepW),
      );

      addWalls(0, 0, 2, containerH);
      addWalls(0, containerH, containerW, 1);

      for (var i = 0; i < steps; i++) {
        var x = i * stepW + containerW;
        var y = i * stepH + containerH;
        var floorW = Math.min(stepW, w - x);
        if (floorW > 0) addWalls(x, y + stepH, floorW, 1);
        addWalls(x, y - 2, 2, stepH + 2);
      }
      addWalls(
        steps * stepW + containerW,
        steps * stepH + containerH - 2,
        2,
        3,
      );
      addWater(2, 2, containerW - 2, containerH - 2);
    },
  },
  // Funnel
  {
    name: "Funnel",
    fn: (w, h) => {
      var midX = Math.floor(w / 2);
      var bottomY = h - 5;
      var prevLeft = midX - 2 - bottomY;
      var prevRight = midX + 2 + bottomY;

      for (var y = 0; y < bottomY; y++) {
        var ratio = y / bottomY;
        var currLeft = Math.floor((midX - 2) * ratio);
        var currRight = w - 1 - currLeft;

        var startL = Math.min(prevLeft, currLeft);
        var endL = Math.max(prevLeft, currLeft);
        if (y === 0) {
          startL = currLeft;
          endL = currLeft;
        }
        for (var cx = startL; cx <= endL; cx++) {
          add_wall(cx, y);
          add_wall(cx - 1, y);
        }

        var startR = Math.min(prevRight, currRight);
        var endR = Math.max(prevRight, currRight);
        if (y === 0) {
          startR = currRight;
          endR = currRight;
        }
        for (var cx = startR; cx <= endR; cx++) {
          add_wall(cx, y);
          add_wall(cx + 1, y);
        }

        prevLeft = currLeft;
        prevRight = currRight;
      }

      for (var y = bottomY; y < h; y++) {
        add_wall(midX - 2, y);
        add_wall(midX - 3, y);
        add_wall(midX + 2, y);
        add_wall(midX + 3, y);
      }

      for (var x = 5; x < w - 5; x++) {
        for (var y = 0; y < Math.floor(h / 4); y++) {
          if (Math.abs(x - midX) < w / 3) add_water(x, y);
        }
      }
    },
  },
  {
    name: "Empty",
    fn: (w, h) => {
      for (var x = 0; x < w - 1; x++) {
        add_wall(x, 5);
      }
    },
  },
];

var init_fluid = () => {
  window.fluid_particles = [];
  var selected_example_index = Math.floor(Math.random() * generators.length);
  if (
    !isNaN(window.sub_animation_index) &&
    window.sub_animation_index >= 0 &&
    window.sub_animation_index < generators.length
  ) {
    selected_example_index = window.sub_animation_index;
  }

  tooltip(`fluid: ${generators[selected_example_index].name}`, selected_example_index);
  window.sub_animation_size = generators.length;

  var sim_width = window.columns;
  var sim_height = window.rows;

  generators[selected_example_index].fn(sim_width, sim_height);
  
  // Force grid resize on next frame
  grid_cols = 0;
};

// Spatial Grid Management
var updateGrid = () => {
  // Check if grid dimensions need update
  var new_grid_cols = Math.ceil(window.columns / GRID_CELL_SIZE);
  // Y coordinates are scaled by 2 in physics
  var new_grid_rows = Math.ceil((window.rows * 2) / GRID_CELL_SIZE); 

  if (!grid_head || new_grid_cols !== grid_cols || new_grid_rows !== grid_rows) {
      grid_cols = new_grid_cols;
      grid_rows = new_grid_rows;
      grid_head = new Int16Array(grid_cols * grid_rows);
  }

  // Clear grid
  grid_head.fill(-1);

  // Populate grid
  for (var i = 0; i < window.fluid_particles.length; i++) {
      var p = window.fluid_particles[i];
      var gx = Math.floor(p.xPos / GRID_CELL_SIZE);
      var gy = Math.floor(p.yPos / GRID_CELL_SIZE);

      // Clamp to grid bounds to be safe
      if (gx < 0) gx = 0;
      if (gx >= grid_cols) gx = grid_cols - 1;
      if (gy < 0) gy = 0;
      if (gy >= grid_rows) gy = grid_rows - 1;

      var cellIdx = gx + gy * grid_cols;
      
      particle_next[i] = grid_head[cellIdx];
      grid_head[cellIdx] = i;
  }
};

var calculateDensities = () => {
  for (var i = 0; i < window.fluid_particles.length; i++) {
    var p1 = window.fluid_particles[i];
    p1.density = p1.wallflag * 9;

    var gx = Math.floor(p1.xPos / GRID_CELL_SIZE);
    var gy = Math.floor(p1.yPos / GRID_CELL_SIZE);

    // Check 3x3 neighbor cells
    for (var nx = gx - 1; nx <= gx + 1; nx++) {
        if (nx < 0 || nx >= grid_cols) continue;
        for (var ny = gy - 1; ny <= gy + 1; ny++) {
            if (ny < 0 || ny >= grid_rows) continue;
            
            var cellIdx = nx + ny * grid_cols;
            var j = grid_head[cellIdx];
            while (j !== -1) {
                var p2 = window.fluid_particles[j];
                
                var xDist = p1.xPos - p2.xPos;
                var yDist = p1.yPos - p2.yPos;
                // Avoid sqrt for early reject
                if (Math.abs(xDist) < 4 && Math.abs(yDist) < 4) {
                    var dist = Math.sqrt(xDist * xDist + yDist * yDist);
                    var interaction = dist / 2.0 - 1.0;
                    if (Math.floor(1.0 - interaction) > 0) {
                        p1.density += interaction * interaction;
                    }
                }
                j = particle_next[j];
            }
        }
    }
  }
};

var calculateForces = () => {
  for (var i = 0; i < window.fluid_particles.length; i++) {
    var p1 = window.fluid_particles[i];
    if (p1.wallflag === 1) continue;

    p1.yForce = gravity;
    p1.xForce = 0;

    var gx = Math.floor(p1.xPos / GRID_CELL_SIZE);
    var gy = Math.floor(p1.yPos / GRID_CELL_SIZE);

    for (var nx = gx - 1; nx <= gx + 1; nx++) {
        if (nx < 0 || nx >= grid_cols) continue;
        for (var ny = gy - 1; ny <= gy + 1; ny++) {
            if (ny < 0 || ny >= grid_rows) continue;
            
            var cellIdx = nx + ny * grid_cols;
            var j = grid_head[cellIdx];
            while (j !== -1) {
                var p2 = window.fluid_particles[j];
                
                var xDist = p1.xPos - p2.xPos;
                var yDist = p1.yPos - p2.yPos;
                
                 if (Math.abs(xDist) < 4 && Math.abs(yDist) < 4) {
                    var dist = Math.sqrt(xDist * xDist + yDist * yDist);
                    var interaction = dist / 2.0 - 1.0;

                    if (Math.floor(1.0 - interaction) > 0) {
                        var pressureTerm = (3 - p1.density - p2.density) * pressure;
                        var xTerm =
                        xDist * pressureTerm +
                        p1.xVelocity * viscosity -
                        p2.xVelocity * viscosity;
                        var yTerm =
                        yDist * pressureTerm +
                        p1.yVelocity * viscosity -
                        p2.yVelocity * viscosity;

                        p1.xForce += (interaction * xTerm) / p1.density;
                        p1.yForce += (interaction * yTerm) / p1.density;
                    }
                }
                j = particle_next[j];
            }
        }
    }
  }
};

var updatePhysics = () => {
    updateGrid();
    calculateDensities();
    calculateForces();
    
    for (var i = 0; i < window.fluid_particles.length; i++) {
        var p = window.fluid_particles[i];

        if (p.wallflag === 0) {
        var forceMag = Math.sqrt(p.xForce * p.xForce + p.yForce * p.yForce);
        if (forceMag < 4.2) {
            p.xVelocity += p.xForce / 10;
            p.yVelocity += p.yForce / 10;
        } else {
            p.xVelocity += p.xForce / 11;
            p.yVelocity += p.yForce / 11;
        }

        p.xPos += p.xVelocity;
        p.yPos += p.yVelocity;
        }
    }
}

export default (this_animation) => {
  if (window.frame_count === 0) {
    init_fluid();
  }

  // optionally speed up rendering, but let's not.
  for(var step = 0; step < 1; step++) {
      updatePhysics();
  }

  // Render setup
  if (
    !window.fluid_screen_buffer ||
    window.fluid_screen_buffer.length !== window.columns * window.rows
  ) {
    window.fluid_screen_buffer = new Int8Array(window.columns * window.rows);
  }
  window.fluid_screen_buffer.fill(0);

  for (var i = 0; i < window.fluid_particles.length; i++) {
    var p = window.fluid_particles[i];

    // Render mapping
    var x = Math.floor(p.xPos);
    var y = Math.floor(p.yPos / 2); // 2x vertical resolution

    if (y >= 0 && y < window.rows) {
      if (x >= 0 && x < window.columns) {
        var idx = x + window.columns * y;
        window.fluid_screen_buffer[idx] |= 8;

        if (x + 1 < window.columns) window.fluid_screen_buffer[idx + 1] |= 4;

        if (y + 1 < window.rows) {
          window.fluid_screen_buffer[idx + window.columns] |= 2;
          if (x + 1 < window.columns)
            window.fluid_screen_buffer[idx + window.columns + 1] |= 1;
        }
      }
    }
  }

  // Output to string
  var text = "";
  var chars = " '`-.|//,\\|\\_\\/#";
  for (var i = 0; i < window.fluid_screen_buffer.length; i++) {
    if (i > 0 && i % window.columns === 0) {
      text += "\n";
    }
    text += chars[window.fluid_screen_buffer[i]];
  }

  window.canvas.text(text);

  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
