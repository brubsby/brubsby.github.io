import { tooltip } from "../utils.js";

export default (this_animation) => {
  const ASPECT_RATIO = window.char_height / window.char_width;
  const PARTICLE_DENSITY = 0.05 + window.constant_random_values[0] * 0.15; // 0.05 - 0.2
  const RADIUS = 0.75; // Collision radius in column-width units
  const COLLISION_DIST_SQ = (2 * RADIUS) * (2 * RADIUS);

  if (window.frame_count === 0) {
    const area = window.columns * window.rows;
    const particle_count = Math.max(10, Math.floor(area * PARTICLE_DENSITY));
    
    window.particles = [];
    for (let i = 0; i < particle_count; i++) {
      window.particles.push({
        x: Math.random() * window.columns,
        y: Math.random() * window.rows,
        vx: (Math.random() - 0.5) * 1.6,
        vy: (Math.random() - 0.5) * 1.6 / ASPECT_RATIO,
      });
    }
    tooltip(`gas<br>n=${particle_count}`, 0);
  }

  const particles = window.particles;

  // Physics Step
  // 1. Update positions & Wall Collisions
  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    // Bounce off walls
    if (p.x < 0) {
      p.x = 0;
      p.vx *= -1;
    }
    if (p.x >= window.columns) {
      p.x = window.columns - 0.001;
      p.vx *= -1;
    }
    if (p.y < 0) {
      p.y = 0;
      p.vy *= -1;
    }
    if (p.y >= window.rows) {
      p.y = window.rows - 0.001;
      p.vy *= -1;
    }
  }

  // 2. Particle Collisions
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];

      const dx = p1.x - p2.x;
      const dy = (p1.y - p2.y) * ASPECT_RATIO;
      const distSq = dx * dx + dy * dy;

      if (distSq < COLLISION_DIST_SQ && distSq > 0.0001) {
        // Elastic collision in "stretched" space
        const dist = Math.sqrt(distSq);
        
        // Normal vector in stretched space
        const nx = dx / dist;
        const ny = dy / dist;

        // Relative velocity in stretched space
        const dvx = p1.vx - p2.vx;
        const dvy = (p1.vy - p2.vy) * ASPECT_RATIO;

        // Velocity along normal
        const velAlongNormal = dvx * nx + dvy * ny;

        if (velAlongNormal > 0) continue;

        const j_impulse = -velAlongNormal;

        // Apply impulse (scale y back)
        p1.vx += j_impulse * nx;
        p1.vy += (j_impulse * ny) / ASPECT_RATIO;
        p2.vx -= j_impulse * nx;
        p2.vy -= (j_impulse * ny) / ASPECT_RATIO;

        // Separate particles (scale y back)
        const overlap = (2 * RADIUS) - dist;
        const separationX = nx * overlap * 0.5;
        const separationY = (ny * overlap * 0.5) / ASPECT_RATIO;
        
        p1.x += separationX;
        p1.y += separationY;
        p2.x -= separationX;
        p2.y -= separationY;
      }
    }
  }

  // Render
  let grid = [];
  for (let r = 0; r < window.rows; r++) {
    grid[r] = new Array(window.columns).fill(".");
  }

  for (let p of particles) {
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
      grid[y][x] = "o";
    }
  }

  let text = "";
  for (let r = 0; r < window.rows; r++) {
    text += grid[r].join("") + "\n";
  }

  window.canvas.text(text);

  window.frame_count++;
  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), 50);
};
