// Code-world shots: the world, its effects and its two actors, seen through a 2D camera.
import { drawCodeWorld } from '../codeworld.js';
import { worldCW, cubeCW, bugCW } from './cw.js';
import { drawLantern, drawFootprints, drawGates, drawSearchlight, drawFindBar, drawErrorRain, drawRewind, drawGreenWave, drawShelf, drawNewJar, drawStars } from './cwfx.js';
import { drawCube2 } from '../cube2.js';
import { drawBug } from '../bug.js';
import { onTwos, follow } from '../anim.js';
import { cubePos } from './cw.js';

// camera helpers
export function followCube(t, o = {}) {
  const fx = follow((tt) => cubePos(tt).x, t, o.freq ?? 0.8, 0.95, 1.6);
  const fy = follow((tt) => cubePos(tt).y, t, o.freqY ?? 0.6, 0.95, 1.8);
  return { x: fx + (o.dx || 0), y: fy + (o.dy ?? -120), zoom: o.zoom ?? 1 };
}

export function drawCW(ctx, t, cam, o = {}) {
  const tc = onTwos(t);
  const W = worldCW(tc);
  const cube = o.noCube ? null : cubeCW(tc);
  const bug = o.noBug ? null : bugCW(tc);
  W.hook = {
    behind: (c) => { drawShelf(c, tc); drawGreenWave(c, tc); drawFootprints(c, tc); drawLantern(c, tc); },
    front: (c) => {
      drawGates(c, tc);
      if (bug) drawBug(c, bug);
      if (cube) { drawCube2(c, cube); drawStars(c, cube, tc); }
      drawNewJar(c, tc);
      if (bug && tc >= 236.8) drawBug(c, bug); // inside the jar, in front of its glass
      drawErrorRain(c, tc);
      o.front?.(c, tc);
    },
  };
  if (o.dim) W.dim = o.dim;
  drawCodeWorld(ctx, cam, W);
  drawSearchlight(ctx, cam, tc);
  drawFindBar(ctx, tc);
  drawRewind(ctx, tc);
  o.overlay?.(ctx, tc);
}

// digital "pixel" transition: the frame breaks into blocks of size `b` (screen px)
let PX = null;
export function pixelate(ctx, b) {
  if (b <= 1.5) return;
  const cv = ctx.canvas;
  const w = Math.max(1, Math.round(cv.width / b)), h = Math.max(1, Math.round(cv.height / b));
  if (!PX) PX = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  PX.width = w; PX.height = h;
  const px = PX.getContext('2d');
  px.imageSmoothingEnabled = true;
  px.drawImage(cv, 0, 0, w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(PX, 0, 0, cv.width, cv.height);
  ctx.restore();
}
// camera path through keyframes [[t, x, y, zoom, ease?], …] (zoom interpolated in log space)
export function camPath(t, keys) {
  const k = (i) => keys[i];
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], zoom: keys[0][3] };
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = k(i - 1), b = k(i);
      const u = (t - a[0]) / (b[0] - a[0]);
      const e = ({ linear: (x) => x, in: (x) => x * x, out: (x) => 1 - (1 - x) * (1 - x), inOut: (x) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)), in3: (x) => x * x * x })[b[4] || 'inOut'](u);
      return { x: a[1] + (b[1] - a[1]) * e, y: a[2] + (b[2] - a[2]) * e, zoom: Math.exp(Math.log(a[3]) + (Math.log(b[3]) - Math.log(a[3])) * e) };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l[1], y: l[2], zoom: l[3] };
}
