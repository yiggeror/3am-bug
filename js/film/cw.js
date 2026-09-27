// Everything that happens inside the code world, as a pure function of story time:
// the little friend's path & acting, the bug's path & acting, and the world's state (scrambled
// characters, the lantern, gates, the collapse and the rewind, the fix, the jar).
// Used by the code-world shots *and* by the editor on his screen (miniatures), so they always agree.
import { T } from './times.js';
import { resolve, evalPath, squashAt, landings, takeoffs, cell } from './path.js';
import { LINES, charCX, charX, CW } from '../codeworld.js';
import { key, ease, clamp, lerp, hash2, noise1, TAU } from '../core.js';
import { blinksAt } from '../anim.js';

const K = key;
export const CUBE_SIZE = 112, BUG_SIZE = 56;

// ------------------------------------------------------------------ the little friend's path
const topOf = (line, col) => [charCX(col), LINES[line].ground - 900];
export const CUBE_PATH = resolve([
  { type: 'fall', t0: 66.55, t1: 67.4, from: topOf(4, 9), to: [4, 9], hard: 1.2 },
  { type: 'stand', t0: 67.4, t1: 78.6, at: [4, 9] },
  // the chase begins: down the steps after the bug
  { type: 'run', t0: 78.6, t1: 79.1, line: 4, c0: 9, c1: 14, ease: 'in' },
  { type: 'jump', t0: 79.1, t1: 79.55, from: [4, 14], to: [5, 17], h: 60 },
  { type: 'run', t0: 79.55, t1: 80.2, line: 5, c0: 17, c1: 30, ease: 'linear' },
  { type: 'jump', t0: 80.2, t1: 80.65, from: [5, 30], to: [7, 33], h: 50 },
  { type: 'jump', t0: 80.8, t1: 81.3, from: [7, 33], to: [9, 12], h: 40 },
  { type: 'stand', t0: 81.3, t1: 84.0, at: [9, 12] },
  // lost it: wandering on line 9 / 10 while he wakes up
  { type: 'run', t0: 84.0, t1: 85.4, line: 9, c0: 12, c1: 4, ease: 'inOut' },
  { type: 'stand', t0: 85.4, t1: 86.6, at: [9, 4] },
  { type: 'jump', t0: 86.6, t1: 87.1, from: [9, 4], to: [10, 8], h: 40 },
  { type: 'run', t0: 87.1, t1: 90.0, line: 10, c0: 8, c1: 18, ease: 'inOut' },
  { type: 'stand', t0: 90.0, t1: 91.2, at: [10, 18] },
  { type: 'run', t0: 91.2, t1: 93.0, line: 10, c0: 18, c1: 9, ease: 'inOut' },
  { type: 'stand', t0: 93.0, t1: 104.0, at: [10, 9] },
  // the searchlight finds the fake "o": sneak, then the lunge (near miss #1)
  { type: 'run', t0: 104.0, t1: 106.6, line: 10, c0: 9, c1: 19, ease: 'inOut' },
  { type: 'stand', t0: 106.6, t1: 107.1, at: [10, 19] },
  { type: 'jump', t0: 107.1, t1: 107.55, from: [10, 19], to: [10, 25], h: 70, hard: 1.4 },
  { type: 'stand', t0: 107.55, t1: 112.5, at: [10, 25] },
  // following the bug down into applyCoupon (mostly off camera), then the footprints
  { type: 'jump', t0: 112.5, t1: 113.0, from: [10, 25], to: [12, 22], h: 40 },
  { type: 'jump', t0: 113.2, t1: 113.9, from: [12, 22], to: [15, 20], h: 40 },
  { type: 'jump', t0: 114.2, t1: 114.8, from: [15, 20], to: [17, 22], h: 40 },
  { type: 'stand', t0: 114.8, t1: 119.4, at: [17, 22] },
  { type: 'jump', t0: 119.4, t1: 119.9, from: [17, 22], to: [18, 14], h: 40 },
  { type: 'jump', t0: 120.2, t1: 120.7, from: [18, 14], to: [19, 18], h: 40 },
  { type: 'jump', t0: 121.0, t1: 121.5, from: [19, 18], to: [20, 22], h: 40 },
  // lost among the braces
  { type: 'run', t0: 122.2, t1: 123.4, line: 20, c0: 22, c1: 34, ease: 'inOut' },
  { type: 'stand', t0: 123.4, t1: 124.4, at: [20, 34] },
  { type: 'run', t0: 124.4, t1: 125.9, line: 20, c0: 34, c1: 19, ease: 'inOut' },
  { type: 'stand', t0: 125.9, t1: 134.0, at: [20, 19] },
  // flattened by the error rain (pose), rewound by Ctrl+Z
  { type: 'stand', t0: 134.0, t1: 152.9, at: [20, 19] },
  // near miss #2: the bug taunts on line 18 — lunge, the bug hops over
  { type: 'jump', t0: 152.9, t1: 153.4, from: [20, 19], to: [19, 14], h: 90 },
  { type: 'stand', t0: 153.4, t1: 154.9, at: [19, 14] },
  { type: 'jump', t0: 154.9, t1: 155.5, from: [19, 14], to: [18, 9], h: 110, hard: 1.4 },
  { type: 'stand', t0: 155.5, t1: 160.5, at: [18, 9] },
  // the quiet moment: sits on the end of line 18, legs dangling
  { type: 'run', t0: 160.5, t1: 162.6, line: 18, c0: 9, c1: 16, ease: 'inOut' },
  { type: 'stand', t0: 162.6, t1: 179.0, at: [18, 16] },
  // back up to the loop (off camera, montage): arrives on line 4
  { type: 'fall', t0: 191.0, t1: 191.6, from: topOf(4, 5), to: [4, 5], hard: 0.7 },
  { type: 'stand', t0: 191.6, t1: 192.4, at: [4, 5] },
  { type: 'run', t0: 192.4, t1: 193.6, line: 4, c0: 5, c1: 11, ease: 'inOut' },
  { type: 'jump', t0: 193.6, t1: 194.1, from: [4, 11], to: [5, 9], h: 40 },
  { type: 'stand', t0: 194.1, t1: 195.3, at: [5, 9] },
  { type: 'run', t0: 195.3, t1: 197.6, line: 5, c0: 9, c1: 12, ease: 'inOut' },
  { type: 'stand', t0: 197.6, t1: 200.6, at: [5, 12] },
  // the bug has become the "=": step, step … stop
  { type: 'run', t0: 200.6, t1: 202.6, line: 5, c0: 12, c1: 16, ease: 'inOut' },
  { type: 'stand', t0: 202.6, t1: 206.6, at: [5, 16] },
  // THE POUNCE
  { type: 'jump', t0: 206.6, t1: 207.25, from: [5, 16], to: [5, 21], h: 120, hard: 1.5 },
  { type: 'move', t0: 207.25, t1: 208.2, from: cell(5, 21), to: cell(5, 24), ease: 'out' },
  { type: 'stand', t0: 208.2, t1: 234.6, at: [5, 24] },
  // to the bottom of the file, where the jars are kept
  { type: 'fall', t0: 234.6, t1: 235.2, from: topOf(25, 6), to: [25, 6], hard: 0.6 },
  { type: 'stand', t0: 235.2, t1: 250, at: [25, 6] },
]);

// ------------------------------------------------------------------ the bug's path
export const BUG_PATH = resolve([
  { type: 'stand', t0: 73.4, t1: 76.2, at: [6, 18], dir: -1 },
  { type: 'run', t0: 76.2, t1: 76.9, line: 6, c0: 18, c1: 25, ease: 'in' },
  { type: 'jump', t0: 76.9, t1: 77.3, from: [6, 25], to: [7, 29], h: 30 },
  { type: 'run', t0: 77.3, t1: 77.7, line: 7, c0: 29, c1: 34, ease: 'linear' },
  { type: 'jump', t0: 77.7, t1: 78.25, from: [7, 34], to: [10, 36], h: 30 },
  { type: 'run', t0: 78.25, t1: 79.8, line: 10, c0: 36, c1: 5, ease: 'linear' },
  { type: 'run', t0: 79.8, t1: 81.2, line: 10, c0: 5, c1: 30, ease: 'inOut' },
  { type: 'run', t0: 81.2, t1: 82.6, line: 10, c0: 30, c1: 12, ease: 'inOut' },
  { type: 'run', t0: 82.6, t1: 84.6, line: 10, c0: 12, c1: 36, ease: 'inOut' },
  { type: 'stand', t0: 84.6, t1: 86.0, at: [10, 36], dir: -1 },
  { type: 'run', t0: 86.0, t1: 88.6, line: 10, c0: 36, c1: 27, ease: 'inOut' },
  { type: 'run', t0: 88.6, t1: 91.0, line: 10, c0: 27, c1: 33, ease: 'inOut' },
  { type: 'run', t0: 91.0, t1: 92.8, line: 10, c0: 33, c1: 25, ease: 'inOut' },
  // hides as the "o" of the second "total" (col 25)
  { type: 'stand', t0: 92.8, t1: 107.2, at: [10, 25], dir: -1 },
  // escapes the lunge: out, down, away into applyCoupon
  { type: 'jump', t0: 107.2, t1: 107.7, from: [10, 25], to: [12, 18], h: 90 },
  { type: 'run', t0: 107.7, t1: 108.5, line: 12, c0: 18, c1: 4, ease: 'linear' },
  { type: 'jump', t0: 108.5, t1: 109.2, from: [12, 4], to: [15, 10], h: 30 },
  { type: 'run', t0: 109.2, t1: 109.9, line: 15, c0: 10, c1: 24, ease: 'linear' },
  { type: 'jump', t0: 109.9, t1: 110.4, from: [15, 24], to: [17, 30], h: 30 },
  { type: 'jump', t0: 110.6, t1: 111.1, from: [17, 30], to: [19, 22], h: 30 },
  { type: 'stand', t0: 111.1, t1: 117.0, at: [19, 22] },
  // runs past the lantern (footprints!) and vanishes deeper
  { type: 'jump', t0: 117.0, t1: 117.4, from: [19, 22], to: [20, 12], h: 40 },
  { type: 'run', t0: 117.4, t1: 118.4, line: 20, c0: 12, c1: 40, ease: 'linear' },
  { type: 'jump', t0: 118.4, t1: 118.9, from: [20, 40], to: [22, 6], h: 30 },
  { type: 'run', t0: 118.9, t1: 119.4, line: 22, c0: 6, c1: 4, ease: 'linear' },
  { type: 'jump', t0: 119.4, t1: 119.9, from: [22, 4], to: [24, 8], h: 30 },
  { type: 'stand', t0: 119.9, t1: 151.8, at: [24, 8] },
  // near miss #2: pops up on line 18, taunts, hops over the lunge, flees upward
  { type: 'jump', t0: 151.8, t1: 152.5, from: [24, 8], to: [18, 9], h: 260 },
  { type: 'stand', t0: 152.5, t1: 155.05, at: [18, 9], dir: 1 },
  { type: 'jump', t0: 155.05, t1: 155.6, from: [18, 9], to: [19, 20], h: 150 },
  { type: 'run', t0: 155.6, t1: 156.2, line: 19, c0: 20, c1: 31, ease: 'linear' },
  { type: 'jump', t0: 156.2, t1: 156.8, from: [19, 31], to: [17, 40], h: 260 },
  { type: 'jump', t0: 157.0, t1: 157.8, from: [17, 40], to: [15, 30], h: 260 },
  { type: 'jump', t0: 158.0, t1: 158.9, from: [15, 30], to: [12, 20], h: 300 },
  { type: 'jump', t0: 159.2, t1: 160.2, from: [12, 20], to: [7, 20], h: 400 },
  // hiding in the loop; later trapped between the gates
  { type: 'stand', t0: 160.2, t1: 188.0, at: [7, 20] },
  { type: 'run', t0: 188.0, t1: 189.2, line: 7, c0: 20, c1: 33, ease: 'inOut' },
  { type: 'jump', t0: 189.4, t1: 189.9, from: [7, 33], to: [9, 8], h: 30 },                   // tries the way down…
  { type: 'jump', t0: 190.1, t1: 190.6, from: [9, 8], to: [7, 10], h: 180, dir: 1 },            // …the gate: bounces back
  { type: 'run', t0: 190.8, t1: 192.2, line: 7, c0: 10, c1: 30, ease: 'inOut' },
  { type: 'jump', t0: 192.2, t1: 192.8, from: [7, 30], to: [6, 22], h: 200 },
  { type: 'run', t0: 192.8, t1: 194.2, line: 6, c0: 22, c1: 6, ease: 'inOut' },
  { type: 'run', t0: 194.2, t1: 196.4, line: 6, c0: 6, c1: 18, ease: 'inOut' },
  { type: 'jump', t0: 196.8, t1: 197.4, from: [6, 18], to: [5, 21], h: 150 },
  { type: 'stand', t0: 197.4, t1: 207.25, at: [5, 21], dir: -1 },
  // caught — carried by the little friend
  { type: 'move', t0: 207.25, t1: 208.2, from: cell(5, 21), to: cell(5, 24), ease: 'out' },
  { type: 'stand', t0: 208.2, t1: 250, at: [5, 24] },
]);

export const cubePos = (t) => evalPath(CUBE_PATH, t);
export const bugPos = (t) => evalPath(BUG_PATH, t);
export const inCodeWorld = (t) => t >= 66.55 && t < 262;

// ------------------------------------------------------------------ the little friend's acting
export function cubeCW(t) {
  if (!inCodeWorld(t)) return null;
  const p = evalPath(CUBE_PATH, t);
  const S = { x: p.x, y: p.y, size: CUBE_SIZE, flip: p.dir >= 0 ? 1 : -1, ink: '#1a1512' };
  S.sq = squashAt(CUBE_PATH, t);
  S.blink = blinksAt(t, [68.9, 70.6, 72.1, 75.8, 83.2, 86.9, 90.6, 95.4, 99.1, 102.2, 109.6, 113.6, 116.6, 121.9, 124.1, 150.2, 158.3, 164.4, 168.9, 171.3, 176.6, 183.3, 192.9, 199.2, 204.3, 212.5, 216.8, 225.2, 231.9, 239.4, 244.8]);
  // running / in the air
  if (p.type === 'run') {
    const sp = Math.min(1, Math.abs(p.vx) / 700);
    S.walk = p.dist / (CUBE_SIZE * 0.34); S.walkAmt = Math.max(0.4, sp);
    S.lean = -0.14 * sp; S.bend = 0.15 * sp * S.flip; S.rot = 0.08 * sp;
    S.y -= Math.abs(Math.sin(S.walk * Math.PI)) * 8 * sp;
    S.armL = { a: Math.sin(S.walk * TAU) * 0.8 * sp }; S.armR = { a: -Math.sin(S.walk * TAU) * 0.8 * sp };
    S.lookX = 0.7;
  }
  if (p.air) {
    const k = p.k;
    S.sq = (S.sq || 0) + (k < 0.3 ? -0.2 : k > 0.75 ? -0.14 : 0);
    S.rot = lerp(-0.18, 0.14, k);
    S.bend = lerp(0.3, -0.15, k);
    S.legSpread = Math.sin(k * Math.PI) * 1.1;
    S.armL = { a: lerp(1.3, 0.5, k) }; S.armR = { a: lerp(1.5, 0.7, k) };
    S.eyes = k < 0.4 ? 'squeeze' : 'wide';
    if (p.seg.type === 'fall') { S.eyes = 'wide'; S.armL = { a: 1.4 + Math.sin(t * 30) * 0.3 }; S.armR = { a: 1.4 - Math.sin(t * 30) * 0.3 }; S.rot = Math.sin(t * 9) * 0.15; S.sq = -0.12; }
  }
  const at = (a, b) => t >= a && t < b;
  // arrival: awe, looking around the world
  if (at(67.4, 73.4)) { S.lookX = K(t, [[67.9, 0], [68.5, -0.8, 'out5'], [69.8, -0.8], [70.3, 0.8, 'out5'], [71.6, 0.8], [72.2, 0, 'out5']]); S.lookY = K(t, [[68.5, -0.6], [70.3, -0.3], [72.2, 0]]); S.eyes = 'wide'; S.mouth = 'o'; S.mouthK = 0.5; }
  // sees the bug
  if (at(73.9, 78.6)) {
    S.lookX = 0.9; S.lookY = 0.6;
    S.eyes = t < 76.0 ? 'wide' : 'normal'; S.brows = t > 76.2 ? -0.8 : 0;
    S.emote = { type: t < 76.2 ? '!' : 'puff', k: K(t, [[73.9, 0], [74.05, 1, 'outBack'], [75.8, 1], [76.0, 0], [76.4, 1, 'outBack'], [77.6, 1], [77.9, 0]]), dx: 0.2 };
    S.sq += K(t, [[73.9, 0], [74.0, -0.2], [74.3, 0.08], [74.5, 0]]);
    if (t > 77.9) { S.sq += K(t, [[77.9, 0], [78.55, 0.3, 'in']]); S.lean = K(t, [[77.9, 0], [78.55, -0.18]]); }
  }
  // lost it
  if (at(81.3, 84.0) || at(85.4, 86.6) || at(90.0, 91.2) || at(93.0, 103.2)) { S.lookX = Math.sin(t * 0.9) * 0.9; S.emote = { type: '?', k: K(t % 6, [[0, 0], [0.3, 1, 'outBack'], [2.8, 1], [3.1, 0]]), dx: 0.25 }; }
  // the fake "o" is spotted
  if (at(103.2, 107.1)) { S.lookX = 0.9; S.eyes = t < 104 ? 'wide' : 'sly'; S.emote = { type: '!', k: K(t, [[103.2, 0], [103.35, 1, 'outBack'], [103.9, 1], [104.1, 0]]), dx: 0.2 }; if (t > 104) { S.walkAmt = (S.walkAmt || 0) * 0.5; S.sq += 0.1; S.lean = 0.05; } }
  if (at(106.6, 107.1)) { S.sq += K(t, [[106.6, 0], [107.05, 0.35, 'in']]); S.eyes = 'squeeze'; }
  // near miss #1: belly flop, dazed, gets up
  if (at(107.55, 112.5)) {
    const d = t - 107.55;
    S.sq = Math.max(S.sq, K(d, [[0, 0.55], [1.2, 0.5], [1.6, 0.0, 'outBack']]));
    S.eyes = d < 1.5 ? 'squeeze' : 'normal'; S.mouth = d < 1.5 ? 'wave' : null;
    S.armL = { a: -0.3 }; S.armR = { a: -0.3 };
    if (d > 2.2) { S.lookX = Math.sin(t * 2) * 0.9; S.brows = 0.5; S.emote = { type: '?', k: K(d, [[2.2, 0], [2.4, 1, 'outBack'], [4.4, 1], [4.6, 0]]), dx: 0.25 }; }
  }
  // following the footprints / lost among the braces
  if (at(114.8, 119.4)) { S.lookX = K(t, [[115, 0.4], [117.2, 0.9], [118.5, 0.9]]); S.lookY = 0.7; S.eyes = t > 117.3 && t < 118.3 ? 'wide' : 'normal'; }
  if (at(122.2, 134.0)) {
    S.lookX = p.type === 'run' ? 0.8 : Math.sin(t * 1.6) * 0.95;
    S.lookY = Math.cos(t * 1.1) * 0.4 - 0.2;
    S.brows = 0.7; S.mouth = 'wave';
    if (p.type !== 'run') { S.emote = { type: '?', k: K((t - 123.4) % 3.2, [[0, 0], [0.25, 1, 'outBack'], [2.5, 1], [2.7, 0]]), dx: 0.25 }; S.rot = Math.sin(t * 1.6) * 0.06; }
    if (t > 131) { S.lookY = -0.8; S.eyes = t > 134.4 ? 'wide' : 'normal'; }
  }
  // hit by the error rain → flat & dizzy; the rewind (Ctrl+Z) plays it backwards; shakes it off
  const flat = flatK(t);
  if (flat > 0) {
    S.sq = lerp(S.sq, 0.62, flat); S.sx = 1 + 0.3 * flat;
    S.eyes = flat > 0.5 ? 'dizzy' : S.eyes; S.spin = t * 7; S.mouth = flat > 0.5 ? 'wave' : S.mouth;
    S.rot = Math.sin(t * 6) * 0.05 * flat;
    S.stars = flat;
  }
  if (at(146.6, 148.0)) { const d = t - 146.6; S.shake = d < 0.7 ? d * 50 : 0; S.eyes = d < 0.8 ? 'squeeze' : 'normal'; S.sq = K(d, [[0, 0.1], [0.8, 0], [1.0, -0.08], [1.4, 0]]); }
  if (at(148.0, 152.9)) { S.lookX = Math.sin(t * 1.3) * 0.8; S.brows = 0.4; }
  // near miss #2
  if (at(152.3, 154.9)) { S.lookX = -0.9; S.lookY = -0.3; S.eyes = t < 153 ? 'wide' : 'normal'; S.brows = t > 153.5 ? -0.9 : 0; S.emote = { type: 'puff', k: K(t, [[153.6, 0], [153.8, 1, 'outBack'], [154.6, 1], [154.8, 0]]), dx: 0.3 }; }
  if (at(154.5, 154.9)) { S.sq += K(t, [[154.5, 0], [154.88, 0.36, 'in']]); S.eyes = 'squeeze'; }
  if (at(155.5, 160.5)) {
    const d = t - 155.5;
    S.sq = Math.max(S.sq, K(d, [[0, 0.5], [1.4, 0.45], [2.2, 0.05, 'inOut']]));
    S.eyes = d < 1.6 ? 'squeeze' : 'normal';
    if (d > 2.2) { S.lookX = K(d, [[2.2, -0.9], [3.5, 0.9]]); S.lookY = -0.5; S.brows = 0.8; S.mouth = 'frown'; }
  }
  // the quiet moment: sitting on the edge, legs dangling, then a small wave to him
  if (at(162.6, 179.0)) {
    S.y += CUBE_SIZE * 0.2;                // sit on the edge: body rests on the platform
    S.legs = [0, 1, 2, 3].map((i) => ({ dy: 0.2 + Math.sin(t * 1.3 + i * 1.7) * 0.02 * (i % 2 ? 1 : -1), fx: Math.sin(t * 1.6 + i) * 0.03 }));
    S.tuck = -0.4;
    S.eyes = 'normal'; S.blink = Math.max(S.blink, K(t, [[162.6, 0], [163.2, 0.45]]));
    S.lookY = K(t, [[162.6, 0.6], [170.4, 0.7], [171.2, -0.9, 'out'], [178, -0.9]]); S.lookX = K(t, [[170.4, 0.2], [171.2, 0]]);
    S.sq = -0.02 + Math.sin(t * 1.2) * 0.015; S.mouth = t < 171.4 ? 'frown' : t < 173.6 ? null : 'smile';
    S.flip = 1;
    if (t > 172) { const w = K(t, [[172.0, 0], [172.4, 1, 'outBack'], [174.6, 1], [175.2, 0]]); S.armR = { a: w * 1.9 + Math.sin(t * 9) * 0.25 * w, front: true, len: 1 + 0.25 * w }; S.eyes = t > 173.4 ? 'happy' : 'normal'; S.blink = 0; }
  }
  // determined walk down to the loop
  if (at(191.6, 200.6)) { S.brows = -0.7; S.lookX = 0.6; S.lookY = 0.3; }
  // looking around: where did it go?
  if (at(200.6, 205.2)) { S.brows = K(t, [[202.6, 0], [203.2, 0.6]]); S.lookX = p.type === 'run' ? 0.5 : K(t, [[202.6, 0.2], [203.1, -0.9, 'out5'], [203.9, -0.9], [204.3, 0.95, 'out5']]); S.lookY = K(t, [[204.3, 0.2], [204.7, 0.7]]); S.emote = { type: '?', k: K(t, [[202.7, 0], [202.9, 1, 'outBack'], [204.0, 1], [204.2, 0]]), dx: 0.25 }; }
  if (at(204.7, 206.6)) { S.lookX = 0.95; S.lookY = 0.7; S.eyes = t < 205.5 ? 'normal' : 'sly'; S.blink = t > 205.1 && t < 205.25 ? 1 : 0; S.sq += K(t, [[205.8, 0], [206.55, 0.45, 'in']]); S.lean = K(t, [[205.8, 0], [206.55, 0.2]]); }
  // pounce → catch → tumble → hold the bug up
  if (at(206.6, 207.25)) { S.sx = 1.35; S.sy = 0.74; S.eyes = 'squeeze'; S.armL = { a: 0.1, len: 1.4 }; S.armR = { a: 0.2, len: 1.4 }; S.bend = 0.3; S.rot = 0.05; }
  if (at(207.25, 208.4)) { const d = t - 207.25; S.rot = K(d, [[0, 0], [0.5, TAU * 0.5], [0.95, TAU], [1.15, TAU]], 'out') * 1; S.sq = 0.2 * Math.sin(d * 9) * Math.exp(-d * 2); S.eyes = 'squeeze'; S.armL = { a: -0.6, front: true }; S.armR = { a: -0.6, front: true }; }
  if (at(208.4, 234.6)) {
    const d = t - 208.4;
    S.eyes = d < 1.2 ? 'squeeze' : 'happy'; S.mouth = 'grin';
    S.armL = { a: K(d, [[0, -0.4], [1.2, 1.6, 'outBack']]), front: true }; S.armR = { a: K(d, [[0, -0.4], [1.2, 1.6, 'outBack']]), front: true };
    S.sq = K(d, [[0, 0.2], [1.2, -0.12, 'outBack'], [1.6, 0]]);
    if (t > T.green) { const j = (t - T.green) % 0.7; S.y -= Math.max(0, Math.sin((j / 0.7) * Math.PI)) * 70 * (t < T.green + 8 ? 1 : 0); S.sq += j < 0.1 ? 0.2 : 0; S.emote = { type: 'burst', k: 1, dx: 0 }; }
  }
  // the jar
  if (t >= 235.2) jarActing(S, t);
  return S;
}
// flattened amount: 0 → hit at T.hit … rewound at T.rewind (plays backwards) … 0
export function flatK(t) {
  if (t < T.hit) return 0;
  if (t < T.rewind) return K(t, [[T.hit, 0], [T.hit + 0.08, 1, 'out'], [T.rewind, 1]]);
  if (t < T.rewind + 2.3) return K(t, [[T.rewind, 1], [T.rewind + 1.6, 1], [T.rewind + 2.3, 0, 'in']]);
  return 0;
}

function jarActing(S, t) {
  const d = t - 235.2;
  S.flip = 1;
  S.eyes = d < 6.4 ? 'normal' : 'happy'; S.lookX = K(d, [[0, 0.8], [3.6, 0.8], [4.2, 0.5], [6.2, 0], [6.6, -0.2]]);
  S.armL = { a: K(d, [[0, 0.6], [1.4, 0.2], [2.4, 0.4], [3.4, 0.1]]), front: true };
  S.armR = { a: K(d, [[0, 0.6], [1.2, 0.8], [1.8, 1.4], [2.2, 0.6], [2.6, 1.2], [3.0, 0.5], [4.2, 0.3], [5.4, -0.1]]), front: true };
  S.x += K(d, [[3.6, 0], [4.8, 70, 'inOut'], [5.6, 0, 'inOut']]);
  if (d > 6.2) { S.emote = { type: 'heart', k: K(d, [[6.2, 0], [6.5, 1, 'outBack']]), dx: 0 }; S.mouth = 'smile'; }
}

// ------------------------------------------------------------------ the bug's acting
export function bugCW(t) {
  if (t < T.bugAppear || t >= 262) return null;
  const p = evalPath(BUG_PATH, t);
  const S = { x: p.x, y: p.y, size: BUG_SIZE, flip: p.dir >= 0 ? 1 : -1 };
  S.sq = squashAt(BUG_PATH, t, { land: 0.3, crouch: 0.25, wind: 0.12, stretch: 0.25 });
  if (p.type === 'run') { S.run = p.dist / (BUG_SIZE * 0.22); S.runAmt = 1; S.rot = 0.1; S.ant = -0.6; S.eyes = 'normal'; }
  if (p.air) { S.rot = lerp(-0.3, 0.3, p.k); S.runAmt = 0.6; S.run = t * 8; S.ant = -0.8; }
  const at = (a, b) => t >= a && t < b;
  S.ant = (S.ant || 0) + Math.sin(t * 7) * 0.25;
  // appears out of the text: pops up, looks at the cube, taunts
  if (at(73.4, 76.2)) {
    const d = t - 73.4;
    S.hop = K(d, [[0, -0.6], [0.25, 0.4, 'out'], [0.45, 0]]); S.alpha = clamp(d / 0.15);
    S.eyes = d < 1.0 ? 'wide' : 'sly'; S.lookX = -1; S.lookY = -0.5; S.flip = -1;
    S.mouth = d > 1.3 ? 'tongue' : 'o'; S.mouthK = 0.6 + 0.4 * Math.sin(t * 14);
    S.rot = d > 1.3 ? Math.sin(t * 16) * 0.12 : 0;
    S.emote = { type: 'note', k: K(d, [[1.4, 0], [1.6, 1], [2.4, 1], [2.6, 0]]) };
  }
  if (at(84.6, 86.0)) { S.flip = -1; S.mouth = 'tongue'; S.eyes = 'sly'; }
  // the fake "o"
  if (at(92.8, 107.2)) {
    const d = t - 92.8;
    S.disguise = K(d, [[0, 0], [0.35, 1, 'out']]); S.glyph = 'o'; S.glyphColor = '#e6e1d6';
    S.peek = t > 103.0 && t < 106.9 ? 0.2 + 0.2 * Math.sin(t * 3) : 0.55;
    S.lookX = t > 103 ? 1 : 0;
    S.tremble = t > 106.2 ? t : 0;
    if (t > 106.9) S.disguise = K(t, [[106.9, 1], [107.15, 0]]);
  }
  if (at(107.15, 107.8)) { S.eyes = 'wide'; S.mouth = 'o'; }
  if (at(111.1, 117.0)) { S.flip = -1; S.lookX = -0.6; S.eyes = 'sly'; S.mouth = 'grin'; }
  // near miss #2: taunts, hops over
  if (at(152.5, 155.05)) {
    const d = t - 152.5;
    S.flip = 1; S.eyes = 'sly'; S.mouth = 'tongue'; S.mouthK = 0.7 + 0.3 * Math.sin(t * 18);
    S.rot = Math.sin(t * 14) * 0.15 * (d > 0.6 ? 1 : 0); S.hop = Math.max(0, Math.sin(d * 9)) * 0.15 * (d > 0.6 && d < 1.8 ? 1 : 0);
    S.emote = { type: 'note', k: K(d, [[0.6, 0], [0.8, 1], [1.9, 1], [2.1, 0]]) };
  }
  // trapped: bumps into the gate, panics
  if (at(189.9, 190.2)) { S.eyes = 'wide'; S.mouth = 'o'; S.sq = 0.3; }
  if (at(190.6, 197.4)) { S.eyes = 'wide'; S.mouth = 'o'; S.ant = Math.sin(t * 20) * 0.5; S.emote = { type: 'sweat', k: 1 }; }
  // becomes the "=" of "<="
  if (at(197.4, 207.25)) {
    const d = t - 197.4;
    S.disguise = K(d, [[0.3, 0], [0.8, 1, 'out']]); S.glyph = '='; S.glyphColor = '#89ddff';
    S.peek = t > 203.9 && t < 204.6 ? 0.9 : t > 205.2 ? 0.3 : 0.45; S.lookX = t > 203.9 ? -0.8 : 0;
    S.feet = t > 204.2 ? K(t, [[204.2, 0], [204.5, 1], [205.1, 1], [205.3, 0]]) : 0;
    S.tremble = t > 204.2 ? t : 0;
    if (t > 207.0) S.disguise = K(t, [[207.0, 1], [207.25, 0]]);
  }
  // caught: held up by the little friend, wriggling
  if (at(207.25, 235.2)) {
    const d = t - 207.25;
    S.eyes = d < 2 ? 'squeeze' : t > T.green ? 'dizzy' : 'wide'; S.mouth = 'frown'; S.runAmt = 1; S.run = t * 6;
    const cp = cubeCW(t);
    if (cp) { S.x = cp.x + 6; S.y = cp.y - CUBE_SIZE * (0.84 * (1 - (cp.sq || 0))) - 14 + (d < 1.2 ? 30 : 0); S.rot = Math.sin(t * 11) * 0.2; S.flip = -1; }
  }
  if (t >= 235.2) { const c = cubeCW(t); if (c) { const j = jarBug(t, c); Object.assign(S, j); } }
  // disguised, it sinks into the row of text (the glyph sits where a real character would)
  if (S.disguise > 0) S.y += S.disguise * 55;
  return S;
}

// ------------------------------------------------------------------ the jar
export function jarState(t) {
  if (t < 235.2) return null;
  const d = t - 235.2;
  const c = cubeCW(t);
  // jar appears in the little friend's hands, the bug goes in, lid on, pushed onto the shelf
  const shelfX = charCX(6) + 150, shelfY = LINES[25].ground + 6;
  const held = d < 3.6;
  const x = held ? c.x + 70 : lerp(c.x + 70, shelfX, clamp((d - 3.6) / 1.0));
  return { x, y: held ? c.y - 20 : shelfY, lid: clamp((d - 2.0) / 0.8), label: d > 2.8, k: clamp(d / 0.4) };
}
function jarBug(t, c) {
  const d = t - 235.2;
  const J = jarState(t);
  if (d < 1.6) return { x: c.x + 6 + d * 40, y: c.y - CUBE_SIZE * 0.84 - 14 - Math.sin(d * 2) * 40, eyes: 'wide', mouth: 'o', rot: Math.sin(t * 11) * 0.3 };
  // inside the jar: sulks, then shrugs and waves
  return { x: J.x, y: J.y - 20, size: BUG_SIZE * 0.8, eyes: d < 5 ? 'wide' : d < 7 ? 'sly' : 'normal', mouth: d < 6 ? 'frown' : d < 7.2 ? 'tongue' : 'grin', flip: -1, ant: Math.sin(t * 3) * 0.4, runAmt: 0, rot: 0, hop: d > 7.4 ? Math.max(0, Math.sin((d - 7.4) * 8)) * 0.1 : 0 };
}

// ------------------------------------------------------------------ world state (effects, scrambles…)
// the bug scrambles characters as it runs over them: precompute when it passed each cell
const PASS = new Map(); // line → [[t, col], …]
for (let t = T.bugAppear; t < 208; t += 1 / 30) {
  const p = evalPath(BUG_PATH, t);
  if (p.air || (p.type === 'stand' && !(t > 73.4 && t < 76.2))) continue;
  const line = LINES.findIndex((L) => Math.abs(L.ground + 6 - p.y) < 2);
  if (line < 0) continue;
  const col = Math.round((p.x - CW.cw / 2) / CW.cw);
  if (!PASS.has(line)) PASS.set(line, []);
  PASS.get(line).push([t, col]);
}
const GLYPHS = '#@%&$!?*~^0x7fΔ¥';
function scramble(i, c, t) {
  const list = PASS.get(i);
  if (!list) return null;
  let best = null;
  for (const [tp, cp] of list) {
    if (tp > t) break;
    if (t - tp > 1.4) continue;
    if (Math.abs(cp - c) <= 1) best = tp;
  }
  if (best === null) return null;
  const age = t - best, k = 1 - age / 1.4;
  const f = Math.floor(t * 12);
  return { ch: hash2(i * 131 + c, f) < 0.65 * k + 0.2 ? GLYPHS[Math.floor(hash2(c * 7 + f, i) * GLYPHS.length)] : null, dx: (hash2(c, f + i) - 0.5) * 14 * k, dy: (hash2(c + 5, f) - 0.5) * 18 * k, col: k > 0.5 ? '#ff7ad9' : null };
}

export function worldCW(t) {
  const W = { t };
  W.scramble = scramble;
  // the failing line keeps flashing until the tests pass
  W.errorLine = 7; W.errorK = t < T.green + 0.8 ? 1 : clamp(1 - (t - T.green - 0.8) / 1.2);
  // the missing "}" (backspace) → collapse; Ctrl+Z → back
  const col = collapseK(t);
  if (col.removed) W.removed = { 21: [6] };
  if (col.k > 0) W.collapse = { from: 21, k: col.k };
  // the fix: the "=" is gone from "<="
  if (t >= T.caught) W.removed = { ...(W.removed || {}), 5: [21] };
  // search highlights
  W.highlights = [];
  if (t >= T.search + 3 && t < T.log) for (const [line, c0] of [[4, 6], [7, 4], [10, 4], [10, 24], [12, 21]]) W.highlights.push({ line, c0, c1: c0 + 5, k: clamp((t - T.search - 3) / 0.4) });
  if (t >= T.pin + 1.0 && t < T.caught) W.highlights.push({ line: 6, c0: 17, c1: 25, k: clamp((t - T.pin - 1.0) / 0.4) });
  // the fake "o": the text's own "o" is hidden while the bug sits in its place
  const b = bugCW(t);
  if (b && b.disguise > 0.5 && b.glyph === 'o') W.removed = { ...(W.removed || {}), 10: [25] };
  if (b && b.disguise > 0.5 && b.glyph === '=') W.removed = { ...(W.removed || {}), 5: [...((W.removed || {})[5] || []), 21] };
  return W;
}
export function collapseK(t) {
  const r = { k: 0, removed: false };
  if (t >= T.collapse && t < T.rewind + 2.3) {
    r.removed = t < T.rewind + 1.2;
    r.k = t < T.rewind ? K(t, [[T.collapse, 0], [T.collapse + 1.1, 1, 'in']]) : K(t, [[T.rewind, 1], [T.rewind + 0.4, 1], [T.rewind + 1.9, 0, 'inOut']]);
  }
  return r;
}

// sound cues from the choreography (for the mix)
export const CW_CUES = [
  ...landings(CUBE_PATH).map((l) => ({ t: l.t, type: 'cube_land', v: l.hard })),
  ...takeoffs(CUBE_PATH).map((t) => ({ t, type: 'cube_jump' })),
  ...landings(BUG_PATH).map((l) => ({ t: l.t, type: 'bug_land', v: l.hard })),
  ...takeoffs(BUG_PATH).map((t) => ({ t, type: 'bug_jump' })),
  ...BUG_PATH.filter((s) => s.type === 'run').map((s) => ({ t: s.t0, type: 'bug_skitter', dur: s.t1 - s.t0 })),
  ...CUBE_PATH.filter((s) => s.type === 'run').map((s) => ({ t: s.t0, type: 'cube_run', dur: s.t1 - s.t0 })),
];
