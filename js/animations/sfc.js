import {
  first_frame_tooltip,
  setCharAtIndex,
  get_canvas_index,
} from "../utils.js";

function sgn(x) {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

function* generate2d(x, y, ax, ay, bx, by) {
  const w = Math.abs(ax + ay);
  const h = Math.abs(bx + by);

  const dax = sgn(ax);
  const day = sgn(ay);
  const dbx = sgn(bx);
  const dby = sgn(by);

  if (h === 1) {
    for (let i = 0; i < w; i++) {
      yield [x, y];
      x += dax;
      y += day;
    }
    return;
  }

  if (w === 1) {
    for (let i = 0; i < h; i++) {
      yield [x, y];
      x += dbx;
      y += dby;
    }
    return;
  }

  let ax2 = Math.floor(ax / 2);
  let ay2 = Math.floor(ay / 2);
  let bx2 = Math.floor(bx / 2);
  let by2 = Math.floor(by / 2);

  const w2 = Math.abs(ax2 + ay2);
  const h2 = Math.abs(bx2 + by2);

  if (2 * w > 3 * h) {
    if (w2 % 2 && w > 2) {
      ax2 += dax;
      ay2 += day;
    }
    yield* generate2d(x, y, ax2, ay2, bx, by);
    yield* generate2d(x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
  } else {
    if (h2 % 2 && h > 2) {
      bx2 += dbx;
      by2 += dby;
    }
    yield* generate2d(x, y, bx2, by2, ax2, ay2);
    yield* generate2d(x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
    yield* generate2d(
      x + (ax - dax) + (bx2 - dbx),
      y + (ay - day) + (by2 - dby),
      -bx2,
      -by2,
      -(ax - ax2),
      -(ay - ay2)
    );
  }
}

function* gilbert2d(width, height) {
  if (width >= height) {
    yield* generate2d(0, 0, width, 0, 0, height);
  } else {
    yield* generate2d(0, 0, 0, height, width, 0);
  }
}

export default (this_animation) => {
  first_frame_tooltip("sfc<br>gilbert");

  if (
    !window.sfc_state ||
    window.sfc_state.rows !== window.rows ||
    window.sfc_state.cols !== window.columns
  ) {
    window.sfc_state = {
      rows: window.rows,
      cols: window.columns,
      generator: gilbert2d(window.columns, window.rows),
      complete: false,
    };
  }

  if (window.sfc_state.complete) return;

  for (let n = 0; n < window.animation_speed_multiplier; n++) {
    const { value, done } = window.sfc_state.generator.next();
    if (done) {
      window.sfc_state.complete = true;
      break;
    }
    const [x, y] = value;
    const idx = get_canvas_index(window.columns, x, y);
    setCharAtIndex(window.canvas, idx, "o");
  }

  window.frame_count++;
  requestAnimationFrame(this_animation.bind(null, this_animation));
};
