// Furniture in the three character views (same centimetre space as the human: origin = seat centre,
// +y down; seat surface at y = 0, floor at y = +47, desk top at y = -27).
import { Fig } from './figure.js';
import { C, rect, line, shape, ellipse, circle, curScale, rectPts, ellipsePts, text } from './draw.js';
import { inkFor } from './human/body.js';
import { clamp, lerp } from './core.js';

export const SEAT_H = 47;
export const DESK_Y = -27;      // desk top relative to the seat
export const DESK_FRONT = 17;   // side view: x of the desk's front edge
export const CHAIR = { seat: '#4f5663', seatLight: '#5f6776', frame: '#3b4049', metal: '#9aa0a8', mesh: '#454b57' };

// ---------------------------------------------------------------- chair, seen from behind (occludes the back)
export function chairBack(ctx, o = {}) {
  const ups = curScale(ctx);
  const tilt = o.tilt || 0; // leaning back: backrest comes toward camera (lower, bigger)
  const fig = new Fig(ctx, { lw: inkFor(ups) * 0.95, seed: 301 });
  const top = -31 + tilt * 6, bot = -8;
  const w = 18 + tilt * 1.5;
  fig.add('rest', [[-w, top + 3], [-w + 3, top], [w - 3, top], [w, top + 3], [w - 0.5, bot - 4], [w - 4, bot], [-w + 4, bot], [-w + 0.5, bot - 4]], { fill: CHAIR.mesh, z: 2 });
  fig.line([[-w + 3, top + 4], [w - 3, top + 4]], { z: 2.1, lw: 2, color: '#5b6272', clip: ['rest'], seed: 3 });
  // mesh texture
  fig.after((c) => {
    c.save(); c.globalAlpha = 0.18; c.strokeStyle = '#8b93a3'; c.lineWidth = 1.2 / ups;
    for (let x = -w; x < w; x += 2.2) { c.beginPath(); c.moveTo(x, top); c.lineTo(x + 3, bot); c.stroke(); }
    c.restore();
  }, 2.05, ['rest']);
  // spine bar down to the seat
  fig.add('bar', [[-2.2, bot - 1], [2.2, bot - 1], [2.2, 3], [-2.2, 3]], { fill: CHAIR.frame, z: 1 });
  // seat seen from behind (the back edge of the cushion)
  fig.add('seat', [[-23, -1], [23, -1], [22, 5.5], [-22, 5.5]], { fill: CHAIR.seat, z: 0 });
  // gas lift, base, wheels
  fig.add('lift', [[-2, 5], [2, 5], [2, 30], [-2, 30]], { fill: CHAIR.metal, z: -1 });
  fig.add('base', [[-28, 36], [-3, 30], [3, 30], [28, 36], [27, 38.5], [-27, 38.5]], { fill: CHAIR.frame, z: -0.5 });
  for (const x of [-26, 0, 26]) fig.add('w' + x, ellipsePts(x, 42.5, 3.4, 4.2, 14), { fill: '#2f333a', z: -0.4 });
  fig.draw();
}

// ---------------------------------------------------------------- chair, side view (facing +x); drawn behind the human
export function chairSide(ctx, o = {}) {
  const ups = curScale(ctx);
  const tilt = o.tilt || 0;
  const fig = new Fig(ctx, { lw: inkFor(ups) * 0.95, seed: 311 });
  // backrest pivots at the back of the seat
  const piv = [-19, -4];
  const R = (p) => { const a = -0.12 - tilt * 0.25; const c = Math.cos(a), s = Math.sin(a); const x = p[0] - piv[0], y = p[1] - piv[1]; return [piv[0] + x * c - y * s, piv[1] + x * s + y * c]; };
  fig.add('rest', [[-13.4, -8], [-16.8, -10], [-17.8, -22], [-16.8, -33], [-13.6, -35], [-12.4, -32], [-13.2, -22], [-12, -10]].map(R), { fill: CHAIR.mesh, z: 0 });
  fig.add('arm', [[-18.4, -3], [-16.2, -3], [-13.2, -9], [-15.4, -10.5]].map(R), { fill: CHAIR.frame, z: -1 });
  fig.add('seat', [[-21, -2.5], [-15, -4], [16, -3.6], [21, -2], [21.5, 2.5], [17, 5.5], [-18, 5.5], [-21.5, 2.5]], { fill: CHAIR.seat, z: 1 });
  fig.add('lift', [[-1.8, 5], [1.8, 5], [1.8, 30], [-1.8, 30]], { fill: CHAIR.metal, z: -1 });
  fig.add('base', [[-24, 36.5], [-2.5, 30], [2.5, 30], [24, 36.5], [23, 38.8], [-23, 38.8]], { fill: CHAIR.frame, z: -0.5 });
  for (const x of [-22, 22]) fig.add('w' + x, ellipsePts(x, 42.8, 4.2, 4.2, 14), { fill: '#2f333a', z: -0.4 });
  fig.draw();
}

// ---------------------------------------------------------------- desk, side view: slab + keyboard + monitor (all at x >= DESK_FRONT)
export function deskSide(ctx, o = {}) {
  const ups = curScale(ctx);
  const fig = new Fig(ctx, { lw: inkFor(ups) * 0.95, seed: 321 });
  const x0 = DESK_FRONT, x1 = x0 + 72, y = DESK_Y;
  fig.add('slab', [[x0, y], [x1, y], [x1, y + 3.4], [x0, y + 3.4]], { fill: C.wood, z: 0, sharp: true });
  fig.add('leg', [[x1 - 7, y + 3], [x1 - 3, y + 3], [x1 - 3, SEAT_H], [x1 - 7, SEAT_H]], { fill: C.woodDark, z: -1, sharp: true });
  // keyboard (low wedge)
  const kx = x0 + 6;
  fig.add('kb', [[kx, y - 0.2], [kx + 16, y - 0.2], [kx + 15.6, y - 2.6], [kx + 0.6, y - 1.8]], { fill: '#e9e2d6', z: 1 });
  for (let i = 0; i < 5; i++) fig.add('key' + i, rectPts(kx + 1.2 + i * 2.9, y - 2.3 - i * 0.14, 2.4, 1.1, 0.35, 0.5), { fill: '#f6f1e8', z: 1.1 + i * 0.01, edge: true });
  // monitor on a stand
  const mx = x0 + 40;
  fig.add('stand', [[mx - 5, y - 0.2], [mx + 6, y - 0.2], [mx + 6, y - 1.6], [mx + 1, y - 2], [mx + 1.5, y - 16], [mx - 1, y - 16], [mx - 1.5, y - 2], [mx - 5, y - 1.4]], { fill: '#b9b1a6', z: 1 });
  fig.add('mon', [[mx - 3.5, y - 14], [mx - 0.5, y - 14.5], [mx + 0.6, y - 48], [mx - 2.6, y - 48]], { fill: '#3b3935', z: 2 });
  fig.draw();
}

// the monitor seen from the front with its screen content (for the sheet: dark terminal + the little friend)
export function monitorFront(ctx, w, h, screenFn) {
  const ups = curScale(ctx);
  const fig = new Fig(ctx, { lw: inkFor(ups) * 0.95, seed: 331 });
  fig.add('bezel', rectPts(-w / 2 - 1.6, -h - 1.6, w + 3.2, h + 4.6, 1.2, 1), { fill: '#3b3935', z: 0 });
  fig.add('neck', [[-2.5, 2.8], [2.5, 2.8], [3, 14], [-3, 14]], { fill: '#b9b1a6', z: -1 });
  fig.add('foot', [[-10, 13], [10, 13], [10.5, 15.5], [-10.5, 15.5]], { fill: '#b9b1a6', z: -0.5 });
  fig.after((c) => {
    c.save(); c.beginPath(); c.rect(-w / 2, -h, w, h); c.clip();
    c.translate(-w / 2, -h); screenFn(c, w, h);
    c.restore();
  }, 1);
  fig.draw();
}
