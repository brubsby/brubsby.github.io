import { setHalfPixel, tooltip, ObjectSampler, setCharAtIndex, get_canvas_index } from '../utils.js';
import { stars_data } from '../stars_data.js';

function toAltAz(ra, dec, lat, lon, date) {
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const d = (date - J2000) / 86400000;
  
  // Greenwich Mean Sidereal Time (approximate)
  let gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  if (gmst < 0) gmst += 24;
  
  // Local Sidereal Time
  let lst = (gmst + lon / 15) % 24;
  if (lst < 0) lst += 24;
  
  const ha = (lst - ra + 24) % 24 * 15; // HA in degrees
  
  const lat_rad = lat * Math.PI / 180;
  const dec_rad = dec * Math.PI / 180;
  const ha_rad = ha * Math.PI / 180;
  
  const sinAlt = Math.sin(dec_rad) * Math.sin(lat_rad) + Math.cos(dec_rad) * Math.cos(lat_rad) * Math.cos(ha_rad);
  const alt = Math.asin(sinAlt);
  
  const cosAz = (Math.sin(dec_rad) - Math.sin(alt) * Math.sin(lat_rad)) / (Math.cos(alt) * Math.cos(lat_rad));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  
  if (Math.sin(ha_rad) > 0) {
    az = 2 * Math.PI - az;
  }
  
  return { alt: alt * 180 / Math.PI, az: az * 180 / Math.PI };
}

const locations = new ObjectSampler()
  .put({ lat: 30.2672, lon: -97.7431 }, 1) // Austin, TX
  .put({ lat: 42.3601, lon: -71.0589 }, 1) // Boston, MA
  .put({ lat: 37.7749, lon: -122.4194 }, 1) // San Francisco, CA

let userLocation = null;
let magThreshold = 5.0;
let defaultTooltipText = "";

if (!window.stars_mouse_tracker) {
  window.stars_mouse_x = -1000;
  window.stars_mouse_y = -1000;
  $(document).mousemove(e => {
    window.stars_mouse_x = e.pageX;
    window.stars_mouse_y = e.pageY;
  });
  window.stars_mouse_tracker = true;
}

export default (this_animation) => {
  if (!userLocation) {
    userLocation = locations.sample();
    magThreshold = Math.min(2.0 + Math.random() * 4.5, 2.0 + Math.random() * 4.5);
    defaultTooltipText = `stars<br>${userLocation.lat.toFixed(2)} ${userLocation.lon.toFixed(2)}<br>${magThreshold.toFixed(1)}`;
    tooltip(defaultTooltipText);
  }

  if (!window.stars_bg || window.stars_bg.length !== window.rows || window.stars_bg[0].length !== window.columns) {
    window.stars_bg = Array(window.rows).fill(null).map(() => Array(window.columns).fill('.'));
    
    // Create and shuffle a list of all coordinates
    window.stars_reveal_queue = [];
    for (let r = 0; r < window.rows; r++) {
      for (let c = 0; c < window.columns; c++) {
        window.stars_reveal_queue.push([r, c]);
      }
    }
    // Fisher-Yates shuffle
    for (let i = window.stars_reveal_queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [window.stars_reveal_queue[i], window.stars_reveal_queue[j]] = [window.stars_reveal_queue[j], window.stars_reveal_queue[i]];
    }
  }

  let revealing = false;
  if (window.stars_reveal_queue && window.stars_reveal_queue.length > 0) {
    revealing = true;
    const fadeCount = (Math.floor((window.rows * window.columns) / 200) + 1) * 4;
    for (let i = 0; i < fadeCount; i++) {
      const coord = window.stars_reveal_queue.pop();
      if (coord) {
        window.stars_bg[coord[0]][coord[1]] = ' ';
      }
    }
  }

  const now = new Date();
  const width = window.columns;
  const height = window.rows * 2;
  const center_x = width / 2;
  const center_y = height / 2;
  
  const scale = width / 2;

  // Render background
  let text = "";
  for (let r = 0; r < window.rows; r++) {
    text += window.stars_bg[r].join('') + "\n";
  }
  window.canvas.text(text);

  if (!window.sorted_stars) {
    window.sorted_stars = [...stars_data].sort((a, b) => b[2] - a[2]);
  }

  const minMag = -1.5;
  const magRange = magThreshold - minMag;

  // Mouse calc
  let mouse_grid_x = -1000;
  let mouse_grid_y = -1000;
  if (window.canvas) {
      const offset = window.canvas.offset();
      if (offset) {
          const rel_x = window.stars_mouse_x - offset.left;
          const rel_y = window.stars_mouse_y - offset.top;
          mouse_grid_x = Math.floor(rel_x / window.char_width);
          mouse_grid_y = Math.floor(rel_y / (window.char_height / 2)); // half-row coords
      }
  }

  let closestStarName = null;
  let closestDistSq = 4; // Threshold squared (2 units)

  window.sorted_stars.forEach(star => {
    const [ra, dec, mag, name] = star;
    if (mag > magThreshold) return; // Skip stars that are too dim
    
    const pos = toAltAz(ra, dec, userLocation.lat, userLocation.lon, now);
    if (pos.alt > 0) {
      // Stereographic projection
      const r = scale * Math.tan((90 - pos.alt) * Math.PI / 360);
      const theta = (pos.az - 90) * Math.PI / 180;
      const x = Math.round(center_x - r * Math.cos(theta));
      const y = Math.round(center_y + r * Math.sin(theta));

      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (mag > magThreshold - 0.25 * magRange) {
          setHalfPixel(window.canvas, x, y);
        } else {
          let char = '+';
          if (mag <= magThreshold - 0.75 * magRange) char = 'o';
          else if (mag <= magThreshold - 0.50 * magRange) char = '*';
          
          const idx = get_canvas_index(window.columns, x, Math.floor(y / 2));
          setCharAtIndex(window.canvas, idx, char);
        }

        // Check mouse
        const dx = x - mouse_grid_x;
        const dy = y - mouse_grid_y;
        const d2 = dx*dx + dy*dy;
        if (d2 < closestDistSq) {
            closestDistSq = d2;
            closestStarName = name;
        }
      }
    }
  });

  if (closestStarName) {
      if (window.last_hovered_star !== closestStarName) {
          tooltip(closestStarName);
          window.last_hovered_star = closestStarName;
      }
  } else {
      if (window.last_hovered_star !== null) {
          tooltip(defaultTooltipText);
          window.last_hovered_star = null;
      }
  }

  setTimeout(() => requestAnimationFrame(this_animation.bind(null, this_animation)), revealing ? 50 : 333);
}
