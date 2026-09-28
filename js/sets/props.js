// Desk props drawn with the silhouette engine, in centimetres. Each takes an origin at its base.
import { Fig } from '../figure.js';
import { C, rectPts, ellipsePts, text, curScale, ZH_FONT, HAND_FONT } from '../draw.js';
import { inkFor } from '../human/body.js';
import { hash2, clamp } from '../core.js';

const MUGS = [
  { body: '#e9e2d4', band: '#e8743b', inside: '#5a3f2e' },
  { body: '#9ab6cf', band: '#f3ecdf', inside: '#4a3326' },
  { body: '#f2d27a', band: '#e9e2d4', inside: '#5a3f2e' },
  { body: '#c7d8b4', band: '#8fa77a', inside: '#4a3326' },
  { body: '#f0b8a8', band: '#fff4e6', inside: '#5a3f2e' },
  { body: '#e9e2d4', band: '#7f9dba', inside: '#4a3326' },
];
// a mug seen from the side (x = centre, base at y = 0). el: how much of the top we see (0..1)
export function mugSide(ctx, i, el = 0.18, o = {}) {
  const m = MUGS[i % MUGS.length];
  const fig = new Fig(ctx, { lw: inkFor(curScale(ctx)) * 0.9, seed: 500 + i });
  const w = 8, h = 9.5, ry = 4 * el;
  const flip = o.flip ? -1 : 1;
  fig.add('handle', [[w / 2 - 0.3, -h * 0.78], [w / 2 + 2.6, -h * 0.74], [w / 2 + 3.0, -h * 0.46], [w / 2 + 2.2, -h * 0.22], [w / 2 - 0.3, -h * 0.26], [w / 2 + 1.3, -h * 0.36], [w / 2 + 1.5, -h * 0.62], [w / 2 - 0.3, -h * 0.63]].map(([x, y]) => [x * flip, y]), { fill: m.body, z: 0 });
  const body = [[-w / 2, -h]];
  for (let k = 0; k <= 12; k++) { const a = Math.PI - (k / 12) * Math.PI; body.push([Math.cos(a) * w / 2, Math.sin(a) * ry]); }
  body.push([w / 2, -h]);
  fig.add('body', body, { fill: m.body, z: 1, sharp: false });
  fig.line([[-w / 2 + 0.2, -h * 0.7], [w / 2 - 0.2, -h * 0.7]], { z: 1.1, lw: 3.2, color: m.band, brush: false, clip: ['body'] });
  fig.add('rim', ellipsePts(0, -h, w / 2, Math.max(0.3, ry), 20), { fill: m.body, z: 2, edge: true });
  if (el > 0.08) fig.line(ellipsePts(0, -h + ry * 0.25, w / 2 - 0.6, Math.max(0.2, ry * 0.7), 16), { z: 2.1, fill: o.empty === false ? '#4a2f22' : '#6b5646', stroke: false });
  // coffee ring stain / steam are handled by the scene
  fig.draw();
}

// the desk lamp seen from the side (base at 0,0), head toward -x (pointing back at the keyboard)
export function lampSide(ctx, on = 1) {
  const fig = new Fig(ctx, { lw: inkFor(curScale(ctx)) * 0.9, seed: 520 });
  fig.add('base', [[-7, 0], [7, 0], [6, -2.2], [-6, -2.2]], { fill: '#3f4a5c', z: 0 });
  fig.add('arm1', [[-0.9, -1.5], [0.9, -1.5], [4.8, -26], [3, -26.4]], { fill: '#3f4a5c', z: 0 });
  fig.add('arm2', [[3.2, -27.5], [4.6, -25.4], [-12.4, -35.6], [-13.4, -33.4]], { fill: '#3f4a5c', z: 0 });
  fig.add('joint', ellipsePts(3.9, -26.2, 1.8, 1.8, 10), { fill: '#56637a', z: 0.1, edge: true });
  fig.add('shade', [[-10.4, -38.4], [-17.6, -32], [-22.8, -24.8], [-12.8, -24.2], [-13.6, -29.6], [-8.8, -35]], { fill: '#e2574c', z: 1 });
  if (on > 0.01) fig.line([[-22.2, -24.8], [-17.8, -23.2], [-13.2, -24.2]], { z: 1.1, fill: `rgba(255,236,190,${on})`, lw: 1.5 });
  fig.draw();
}

// monitor, side profile (stand base centre at 0,0; screen faces -x)
export function monitorSide(ctx, o = {}) {
  const fig = new Fig(ctx, { lw: inkFor(curScale(ctx)) * 0.9, seed: 530 });
  fig.add('foot', [[-6, 0], [10, 0], [9.4, -1.5], [-5.4, -1.6]], { fill: '#b9b1a6', z: 0 });
  fig.add('neck', [[3.2, -1.2], [5.6, -1.2], [5.4, -27], [3.0, -27]], { fill: '#aca397', z: -0.5 });
  fig.add('back', [[0.8, -18.5], [4.4, -22], [4.8, -38], [1.0, -42.5]], { fill: '#3e3b37', z: 0.5 });
  fig.add('panel', [[-1.5, -12.4], [1.4, -12.4], [1.6, -47.2], [-1.3, -47.2]], { fill: '#2f2d2a', z: 1 });
  fig.draw();
}

// keyboard, side profile; keys pressed via o.press (0..1 depth)
export function keyboardSide(ctx, o = {}) {
  const fig = new Fig(ctx, { lw: inkFor(curScale(ctx)) * 0.85, seed: 540 });
  fig.add('kb', [[0, 0], [16, 0], [15.7, -2.4], [0.6, -1.7]], { fill: '#e9e2d6', z: 0 });
  for (let i = 0; i < 5; i++) {
    const dn = (o.press && o.press[i]) || 0;
    fig.add('key' + i, rectPts(1.2 + i * 2.9, -2.35 - i * 0.14 + dn * 0.5, 2.4, 1.1, 0.35, 0.5), { fill: '#f6f1e8', z: 0.1 + i * 0.01, edge: true });
  }
  fig.draw();
}

// cable, plant, notebook etc. can be added later
