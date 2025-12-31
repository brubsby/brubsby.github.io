import { tooltip, get_bresenham_line_points } from "../utils.js";

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

var addWall = (cx, cy) => {
  if (window.fluid_particles.length >= MAX_PARTICLES) return;
  var key = cx + "," + cy;
  if (window.fluid_wall_cache.has(key)) return;
  window.fluid_wall_cache.add(key);

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

var addWater = (cx, cy) => {
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

var addWallRect = (x, y, w, h) => {
  for (var i = x; i < x + w; i++) {
    for (var j = y; j < y + h; j++) {
      addWall(i, j);
    }
  }
};

var addWaterRect = (x, y, w, h) => {
  for (var i = x; i < x + w; i++) {
    for (var j = y; j < y + h; j++) {
      addWater(i, j);
    }
  }
};

var addWaterLine = (x0, y0, x1, y1) => {
  var points = get_bresenham_line_points([[x0, y0], [x1, y1]]);
  for (var i = 0; i < points.length; i++) {
    addWater(points[i][0], points[i][1]);
  }
};

var addWallLine = (x0, y0, x1, y1) => {
  var points = get_bresenham_line_points([[x0, y0], [x1, y1]]);
  for (var i = 0; i < points.length; i++) {
    addWall(points[i][0], points[i][1]);
  }
};

var generators = [
  {
    name: "column",
    fn: (w, h) => {
      addWallRect(0, 0, 2, h - 2);
      addWallRect(w - 3, 0, 2, h - 2);
      addWallRect(1, h - 3, w - 3, 2);
      addWaterRect(2, 0, Math.floor(w / 3) - 1, h - 4);
    },
  },
  {
    name: "pour-out",
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

      addWallRect(0, 0, 3, tankH - 2);
      addWallRect(1, tankH - 3, tankW, 2);
      addWallRect(tankW, tankH - 4, 2, 2);
      addWallRect(tankW + 1, tankH - 5, 2, 2);
      addWallRect(tankR, 0, 3, tankH - 6);
      addWallRect(tankR, tankH - 6, 2, 1);
      addWallRect(cupX, cupY, 2, 3);
      addWallRect(cupX + 1, cupY + cupH - 1, cupW - 2, 1);
      addWallRect(cupX + cupW - 2, cupY, 2, 3);
      addWaterRect(4, 1, tankR - 4 - 1, 9);
    },
  },
  {
    name: "tanada",
    fn: (w, h) => {
      var stepW = Math.min(12, Math.max(8, Math.floor(w / 5)));
      var stepH = Math.min(4, Math.max(2, Math.floor((h - 4) / 5)));
      var containerW = Math.min(32, Math.floor(w / 3));
      var containerH = Math.min(12, Math.max(8, Math.floor(h / 3)));
      var steps = Math.min(
        Math.floor((h - containerH - 2) / stepH),
        Math.floor((w - containerW - 2) / stepW),
      );

      addWallRect(0, 0, 2, containerH);
      addWallRect(0, containerH, containerW, 1);

      for (var i = 0; i < steps; i++) {
        var x = i * stepW + containerW;
        var y = i * stepH + containerH;
        var floorW = Math.min(stepW, w - x);
        if (floorW > 0) addWallRect(x, y + stepH, floorW, 1);
        addWallRect(x, y - 2, 2, stepH + 2);
      }
      addWallRect(
        steps * stepW + containerW,
        steps * stepH + containerH - 2,
        2,
        3,
      );
      addWaterRect(2, 2, containerW - 2, containerH - 2);
    },
  },
  {
    name: "clock",
    fn: (w, h) => {
	var hourglassW = Math.floor(Math.min(w-1, Math.max(6, h)) / 2) * 2;
	var hourglassW2 = Math.ceil(hourglassW / 2);	
	var hourglassH = Math.floor((h - 2) / 4) * 4;
	var hourglassX0 = Math.floor((w - hourglassW) / 2);
	var hourglassY0 = Math.floor((h - hourglassH - 2) / 2);
	var hourglassX1 = hourglassX0 + hourglassW;
	var hourglassY1 = hourglassY0 + hourglassH;
	var segmentH = Math.floor(hourglassH / 4);
	addWallRect(hourglassX0, hourglassY0, hourglassW, 1);
	addWallRect(hourglassX0, hourglassY1, hourglassW, 1);
	addWallRect(hourglassX0, hourglassY0, 2, segmentH);
	addWallRect(hourglassX1 - 2, hourglassY0, 2, segmentH);
	addWallRect(hourglassX0, hourglassY1 - segmentH, 2, segmentH);
	addWallRect(hourglassX1 - 2, hourglassY1 - segmentH , 2, segmentH);
	for( var k = 0; k < 4; k++) {
	    let x0 = hourglassX0 + k;
	    let x2 = hourglassX0 + hourglassW2 - 5 + k;
	    let x1 = Math.floor((x0 + x2) / 2) - 1;
            let x3 = hourglassX1 - hourglassW2 + 4 - k;
	    let x5 = hourglassX1 - k - 1;
	    let x4 = Math.ceil((x3 + x5) / 2) + 1;
	    let y0 = hourglassY0 + segmentH;
	    let y1 = hourglassY0 + Math.floor(segmentH * 1.6);
	    let y2 = hourglassY0 + segmentH * 2;
	    let y3 = hourglassY1 - Math.floor(segmentH * 1.6);
	    let y4 = hourglassY1 - segmentH;
	    addWallLine(x0, y0, x1, y1);
	    addWallLine(x1, y1, x2, y2);
	    addWallLine(x5, y0, x4, y1);
	    addWallLine(x4, y1, x3, y2);
	    addWallLine(x0, y4, x1, y3);
	    addWallLine(x1, y3, x2, y2);
	    addWallLine(x5, y4, x4, y3);
	    addWallLine(x4, y3, x3, y2);
	}
	addWaterRect(hourglassX0 + 2, hourglassY0 + 1, hourglassW - 3, segmentH);
    },
  }
];

var init_fluid = () => {
  window.fluid_particles = [];
  window.fluid_wall_cache = new Set();
  var selected_example_index = Math.floor(Math.random() * generators.length);
  if (
    !isNaN(window.sub_animation_index) &&
    window.sub_animation_index >= 0 &&
    window.sub_animation_index < generators.length
  ) {
    selected_example_index = window.sub_animation_index;
  }

  tooltip(`fluid<br>${generators[selected_example_index].name.toLowerCase()}`, selected_example_index);
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
  var chars = ".'`-.|//,\\|\\_\\/#";
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
