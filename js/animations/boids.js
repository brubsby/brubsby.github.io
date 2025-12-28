import { tooltip } from "../utils.js";

export default (this_animation) => {
  // Configuration
  const VISUAL_RANGE = 6;
  const PROTECTED_RANGE = 2; // Separation distance
  const CENTERING_FACTOR = 0.0125; // Cohesion strength
  const AVOID_FACTOR = 0.06; // Separation strength
  const MATCHING_FACTOR = 0.03; // Alignment strength
  const EDGE_TURN_FACTOR = 0.1; // Radians to turn away from wall per frame
  const EDGE_MARGIN = 3; // Distance from edge to start turning (non-toroidal)
  const DAMPING_MARGIN = 1; // Distance from edge to start damping
  const WALL_DAMPING = 0.9; // Friction applied when near wall
  const WALL_STEER_THRESHOLD = 0.05; // Minimum velocity towards wall to trigger steering
  const WALL_REPULSION = 0.025; // Force pushing away from wall
  const NOISE_FACTOR = 0.025; // Random noise to prevent stable loops
  const MAX_SPEED = 0.75;
  const MIN_SPEED = 0.1;
  
  // Directions for rendering: N, NE, E, SE, S, SW, W, NW
  const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

  // Initialize state
  if (window.frame_count === 0) {
    window.is_toroidal = Math.random() < 0.25;
    window.boids_style = Math.random() < 0.9 ? "simple" : "arrows";
    
    // Calculate boid count based on grid area
    const area = window.columns * window.rows;
    const boid_count = Math.max(20, Math.floor(area / 100));
    
    window.boids = [];
    for (let i = 0; i < boid_count; i++) {
      window.boids.push({
        x: Math.random() * window.columns,
        y: Math.random() * window.rows,
        vx: (Math.random() - 0.5) * MAX_SPEED,
        vy: (Math.random() - 0.5) * MAX_SPEED,
      });
    }
    tooltip("boids", 0);
  }

  // Helper: Distance squared
  const distSq = (b1, b2) => {
    let dx = b1.x - b2.x;
    let dy = b1.y - b2.y;
    
    if (window.is_toroidal) {
      // Toroidal distance check
      if (Math.abs(dx) > window.columns / 2) dx = window.columns - Math.abs(dx);
      if (Math.abs(dy) > window.rows / 2) dy = window.rows - Math.abs(dy);
    }
    
    return dx * dx + dy * dy;
  };

  // Helper: Rotate angle towards target angle
  const rotateTowards = (currentAngle, targetAngle, maxStep) => {
    let diff = targetAngle - currentAngle;
    // Normalize diff to -PI to +PI
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    
    if (Math.abs(diff) < maxStep) return targetAngle;
    return currentAngle + Math.sign(diff) * maxStep;
  };

  // Update Boids
  for (let boid of window.boids) {
    let close_dx = 0, close_dy = 0;
    let x_vel_avg = 0, y_vel_avg = 0, neighbors = 0;
    let x_pos_avg = 0, y_pos_avg = 0;

    for (let other of window.boids) {
      if (boid === other) continue;

      let d2 = distSq(boid, other);

      if (d2 < VISUAL_RANGE * VISUAL_RANGE) {
        // Alignment & Cohesion (accumulate)
        x_vel_avg += other.vx;
        y_vel_avg += other.vy;
        x_pos_avg += other.x;
        y_pos_avg += other.y;
        neighbors++;
      }

      if (d2 < PROTECTED_RANGE * PROTECTED_RANGE) {
        // Separation
        // We need the raw difference vector
        let dx = boid.x - other.x;
        let dy = boid.y - other.y;
        
        if (window.is_toroidal) {
          // Wrap logic for vector direction
          if (dx > window.columns / 2) dx -= window.columns;
          if (dx < -window.columns / 2) dx += window.columns;
          if (dy > window.rows / 2) dy -= window.rows;
          if (dy < -window.rows / 2) dy += window.rows;
        }

        close_dx += dx;
        close_dy += dy;
      }
    }

    // Apply Separation
    boid.vx += close_dx * AVOID_FACTOR;
    boid.vy += close_dy * AVOID_FACTOR;

    // Apply Alignment and Cohesion
    if (neighbors > 0) {
      x_vel_avg /= neighbors;
      y_vel_avg /= neighbors;
      boid.vx += (x_vel_avg - boid.vx) * MATCHING_FACTOR;
      boid.vy += (y_vel_avg - boid.vy) * MATCHING_FACTOR;

      x_pos_avg /= neighbors;
      y_pos_avg /= neighbors;
      
      // Cohesion vector
      let dx = x_pos_avg - boid.x;
      let dy = y_pos_avg - boid.y;
      
      if (window.is_toroidal) {
        if (dx > window.columns / 2) dx -= window.columns;
        if (dx < -window.columns / 2) dx += window.columns;
        if (dy > window.rows / 2) dy -= window.rows;
        if (dy < -window.rows / 2) dy += window.rows;
      }

      boid.vx += dx * CENTERING_FACTOR;
      boid.vy += dy * CENTERING_FACTOR;
    }

    // Apply Random Noise
    boid.vx += (Math.random() - 0.5) * NOISE_FACTOR;
    boid.vy += (Math.random() - 0.5) * NOISE_FACTOR;

    // Apply Boundary Conditions (Steering / Forces)
    if (window.is_toroidal) {
      // Wrap Position
      if (boid.x < 0) boid.x += window.columns;
      if (boid.x >= window.columns) boid.x -= window.columns;
      if (boid.y < 0) boid.y += window.rows;
      if (boid.y >= window.rows) boid.y -= window.rows;
    }

    if (!window.is_toroidal) {
      // Apply steering and damping if near edge
      let in_margin = false;
      let speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
      let angle = Math.atan2(boid.vy, boid.vx);
      let originalAngle = angle;

      // Wall Steering (Turn parallel, but avoid corners)
      // Only steer if moving towards the wall.
      // If in a corner, choose the parallel direction that points away from the corner.

      // Left Wall (x < MARGIN)
      if (boid.x < EDGE_MARGIN && boid.vx < -WALL_STEER_THRESHOLD) {
        let target = (boid.vy > 0) ? Math.PI / 2 : -Math.PI / 2; // Default: keep current N/S
        if (boid.y < EDGE_MARGIN) target = Math.PI / 2; // Top-Left -> Go South
        if (boid.y > window.rows - EDGE_MARGIN) target = -Math.PI / 2; // Bot-Left -> Go North
        
        angle = rotateTowards(angle, target, EDGE_TURN_FACTOR);
        in_margin = true;
      }
      // Right Wall (x > W - MARGIN)
      else if (boid.x > window.columns - EDGE_MARGIN && boid.vx > WALL_STEER_THRESHOLD) {
        let target = (boid.vy > 0) ? Math.PI / 2 : -Math.PI / 2;
        if (boid.y < EDGE_MARGIN) target = Math.PI / 2; // Top-Right -> Go South
        if (boid.y > window.rows - EDGE_MARGIN) target = -Math.PI / 2; // Bot-Right -> Go North

        angle = rotateTowards(angle, target, EDGE_TURN_FACTOR);
        in_margin = true;
      }
      
      // Top Wall (y < MARGIN)
      if (boid.y < EDGE_MARGIN && boid.vy < -WALL_STEER_THRESHOLD) {
        let target = (boid.vx > 0) ? 0 : Math.PI; // Default: keep current E/W
        if (boid.x < EDGE_MARGIN) target = 0; // Top-Left -> Go East
        if (boid.x > window.columns - EDGE_MARGIN) target = Math.PI; // Top-Right -> Go West

        angle = rotateTowards(angle, target, EDGE_TURN_FACTOR);
        in_margin = true;
      }
      // Bottom Wall (y > H - MARGIN)
      else if (boid.y > window.rows - EDGE_MARGIN && boid.vy > WALL_STEER_THRESHOLD) {
        let target = (boid.vx > 0) ? 0 : Math.PI;
        if (boid.x < EDGE_MARGIN) target = 0; // Bot-Left -> Go East
        if (boid.x > window.columns - EDGE_MARGIN) target = Math.PI; // Bot-Right -> Go West

        angle = rotateTowards(angle, target, EDGE_TURN_FACTOR);
        in_margin = true;
      }

      if (in_margin) {
        // Apply rotation
        boid.vx = Math.cos(angle) * speed;
        boid.vy = Math.sin(angle) * speed;
      }
      
      // Apply damping
      if (boid.x < DAMPING_MARGIN || boid.x > window.columns - DAMPING_MARGIN) {
        boid.vx *= WALL_DAMPING;
      }
      if (boid.y < DAMPING_MARGIN || boid.y > window.rows - DAMPING_MARGIN) {
        boid.vy *= WALL_DAMPING;
      }

      // Apply wall repulsion
      if (boid.x < EDGE_MARGIN) boid.vx += WALL_REPULSION;
      if (boid.x > window.columns - EDGE_MARGIN) boid.vx -= WALL_REPULSION;
      if (boid.y < EDGE_MARGIN) boid.vy += WALL_REPULSION;
      if (boid.y > window.rows - EDGE_MARGIN) boid.vy -= WALL_REPULSION;
    }

    // Speed Limits
    let speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
    if (speed < MIN_SPEED) {
      boid.vx = (boid.vx / speed) * MIN_SPEED;
      boid.vy = (boid.vy / speed) * MIN_SPEED;
    }
    if (speed > MAX_SPEED) {
      boid.vx = (boid.vx / speed) * MAX_SPEED;
      boid.vy = (boid.vy / speed) * MAX_SPEED;
    }

    // Move
    boid.x += boid.vx;
    boid.y += boid.vy;
    
    // Final clamp and zero-velocity on impact for non-toroidal
    if (!window.is_toroidal) {
       if (boid.x < 0) { 
         boid.x = 0; 
         if (boid.vx < 0) boid.vx = 0; 
       }
       if (boid.x >= window.columns) { 
         boid.x = window.columns - 0.1; 
         if (boid.vx > 0) boid.vx = 0; 
       }
       if (boid.y < 0) { 
         boid.y = 0; 
         if (boid.vy < 0) boid.vy = 0; 
       }
       if (boid.y >= window.rows) { 
         boid.y = window.rows - 0.1; 
         if (boid.vy > 0) boid.vy = 0; 
       }
    }
  }

  // Render
  // Initialize grid
  let grid = [];
  let empty_char = window.boids_style === "simple" ? "." : " ";
  for (let y = 0; y < window.rows; y++) {
    grid[y] = new Array(window.columns).fill(empty_char);
  }

  // Place Boids
  for (let boid of window.boids) {
    let x = Math.floor(boid.x);
    let y = Math.floor(boid.y);
    
    if (window.is_toroidal) {
       x = x % window.columns;
       y = y % window.rows;
       if (x < 0) x += window.columns;
       if (y < 0) y += window.rows;
    }
    
    if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
        if (window.boids_style === "simple") {
            grid[y][x] = "o";
        } else {
            let angle = Math.atan2(boid.vy, boid.vx); // -PI to PI
            let index = Math.round((angle + Math.PI * 0.5) / (Math.PI * 0.25));
            index = (index + 8) % 8;
            grid[y][x] = ARROWS[index];
        }
    }
  }

  // Convert to string
  let text = "";
  for (let y = 0; y < window.rows; y++) {
    text += grid[y].join("") + "\n";
  }

  window.canvas.text(text);
  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 50);
};
