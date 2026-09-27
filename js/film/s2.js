// Section 2 · the little friend dives in.
// It makes up its mind on the prompt line, marches to the edge of the terminal, leaps into the editor and
// dives into the text; we follow it through the screen into the code world, where the bug shows up.
import { T } from './times.js';
import { K, onTwos } from './perfkit.js';
import { shot } from './s1.js';
import { drawMonitorShot, cubeTerm, LAND, LEAP_END } from './screen_content.js';
import { drawCW, followCube, pixelate, camPath } from './cwshot.js';
import { cubePos, bugPos, cubeCW } from './cw.js';
import { LINES, charCX } from '../codeworld.js';
import { ease, clamp, lerp, hash2 } from '../core.js';

const g = (i) => LINES[i].ground;

// ------------------------------------------------------------------ SCREEN: resolve → march → leap → dive (one move)
function resolve(t0, t1) {
  return shot(t0, t1, 'resolve', (ctx, t) => {
    // the camera stays with the little friend: close while it decides, pans with the march,
    // opens up for the leap, then plunges into the text after it
    const cx = cubeTerm(Math.min(t, 64.0))?.x ?? 1236;
    let cam;
    if (t < 63.4) cam = { x: lerp(1760, cx + 40, clamp((t - 61.6) / 1.8)), y: lerp(890, 900, clamp((t - 58.4) / 3)), zoom: lerp(2.6, 2.9, ease.inOut(clamp((t - 58.4) / 3.2))) - 0.4 * ease.inOut(clamp((t - 61.6) / 1.8)) };
    else cam = camPath(t, [[63.4, cx + 40, 900, 2.5], [64.0, 1080, 760, 1.55, 'inOut'], [64.55, 640, 470, 1.12, 'out'], [LEAP_END, LAND[0] + 40, LAND[1] + 20, 1.9, 'inOut'], [66.4, LAND[0], LAND[1] + 4, 26, 'in3']]);
    drawMonitorShot(ctx, t, cam);
    // falling through the text: the picture breaks into pixels
    if (t > 65.8) pixelate(ctx, 1 + 46 * ease.in(clamp((t - 65.8) / 0.6)));
    if (t > 66.1) { ctx.fillStyle = `rgba(243,154,98,${0.5 * clamp((t - 66.1) / 0.3)})`; ctx.fillRect(0, 0, 1920, 1080); }
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ CODE WORLD: falling in, landing, awe, the reveal
function reveal(t0, t1) {
  return shot(t0, t1, 'cw-reveal', (ctx, t) => {
    const p = cubePos(Math.min(t, 67.4));
    const land = K(t, [[67.4, 0], [67.45, 1, 'out'], [67.8, 0]]);
    const cam = t < 67.6
      ? { x: charCX(9), y: lerp(p.y - 260, g(4) - 170, clamp((t - 66.4) / 1.2) ** 2), zoom: 1.25 }
      : camPath(t, [[67.6, charCX(9), g(4) - 170, 1.25], [68.6, charCX(9) + 30, g(4) - 150, 1.2], [72.8, 900, g(7) - 60, 0.46, 'inOut'], [73.4, 910, g(7) - 40, 0.45]]);
    cam.y += land * 14 * Math.sin(t * 90);
    drawCW(ctx, t, cam);
    const b = 1 + 46 * (1 - ease.out(clamp((t - t0) / 0.55)));
    pixelate(ctx, b);
    if (t < t0 + 0.5) { ctx.fillStyle = `rgba(243,154,98,${0.5 * (1 - (t - t0) / 0.5)})`; ctx.fillRect(0, 0, 1920, 1080); }
  }, { dissolve: 0 });
}

// ------------------------------------------------------------------ CODE WORLD: the bug (quick cuts between the two)
const onBug = (t, z = 1.7, dx = 0, dy = -70) => { const b = bugPos(t); return { x: b.x + dx, y: b.y + dy, zoom: z }; };
const onCube = (t, z = 1.5, dx = 0, dy = -90) => { const c = cubePos(t); return { x: c.x + dx, y: c.y + dy, zoom: z }; };
function bugIntro(t0, t1) {
  // the text shivers … and something pops out of it
  return shot(t0, t1, 'cw-bug', (ctx, t) => {
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    const c = onBug(73.4, lerp(1.55, 1.8, k), 60, -80);
    drawCW(ctx, t, c);
  }, { dissolve: 0 });
}
function cubeSees(t0, t1) {
  return shot(t0, t1, 'cw-cube-sees', (ctx, t) => {
    const k = ease.inOut(clamp((t - t0) / (t1 - t0)));
    drawCW(ctx, t, onCube(t, lerp(1.45, 1.65, k), 80, -100));
  }, { dissolve: 0 });
}
function bugTaunt(t0, t1) {
  return shot(t0, t1, 'cw-bug-taunt', (ctx, t) => {
    // follows the bug as it bolts: a quick whip pan
    const b = bugPos(t);
    const x = t < 76.2 ? bugPos(76.2).x + 20 : lerp(bugPos(76.2).x + 20, b.x + 60, clamp((t - 76.2) / 0.3));
    const y = t < 76.2 ? b.y - 80 : lerp(bugPos(76.2).y - 80, b.y - 80, clamp((t - 76.2) / 0.3));
    drawCW(ctx, t, { x, y, zoom: 1.6 - 0.35 * ease.inOut(clamp((t - 76.2) / 0.8)) });
  }, { dissolve: 0 });
}
function cubeGo(t0, t1) {
  return shot(t0, t1, 'cw-cube-go', (ctx, t) => {
    const k = ease.in(clamp((t - t0) / (t1 - t0)));
    drawCW(ctx, t, onCube(t, lerp(1.5, 1.8, k), 40, -95));
  }, { dissolve: 0 });
}
function chase0(t0, t1) {
  return shot(t0, t1, 'cw-chase0', (ctx, t) => {
    const cam = followCube(t, { zoom: 0.78, dy: -60, dx: 120, freq: 1.0 });
    drawCW(ctx, t, cam);
  }, { dissolve: 0 });
}

export const S2 = [
  resolve(T.resolve, 66.4),
  reveal(66.4, T.bugAppear),
  bugIntro(T.bugAppear, 74.5),
  cubeSees(74.5, 76.0),
  bugTaunt(76.0, 77.5),
  cubeGo(77.5, T.chase0),
  chase0(T.chase0, T.glitch),
];
