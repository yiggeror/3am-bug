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
