// Simplified hands, drawn as one silhouette (palm + fingers + thumb merge into a single outline).
// Hand-local units: cm, wrist at the origin, fingers pointing along +x, thumb on the -y side.
// views: 'back' (back of the hand), 'side' (little-finger side, fingers curl toward +y), 'front'
//        (knuckles toward camera), 'fist', 'point', 'palm' (inside of the hand, e.g. waving / cheering).
import { apAll } from '../mat.js';
import { tube, rotP, lerpP } from '../figure.js';
import { clamp, lerp } from '../core.js';

export const HAND_DEFAULT = { view: 'back', curl: 0.15, spread: 0.3, thumb: 0.4, press: [0, 0, 0, 0], rot: 0, scale: 1 };

// finger as a short chain that curls toward +y (relative to its direction)
function fingerPts(base, ang, len, curl, k1 = 0.55, k2 = 1.0) {
  const a1 = ang + curl * k1, a2 = a1 + curl * k2;
  const p1 = [base[0] + Math.cos(a1) * len * 0.55, base[1] + Math.sin(a1) * len * 0.55];
  const p2 = [p1[0] + Math.cos(a2) * len * 0.45, p1[1] + Math.sin(a2) * len * 0.45];
  return [base, lerpP(base, p1, 0.5), p1, lerpP(p1, p2, 0.5), p2];
}

export function drawHand(fig, M, D, hp0, z, name = 'hand', o = {}) {
  const hp = { ...HAND_DEFAULT, ...hp0 };
  const X = (pts) => apAll(M, pts);
  const skin = o.skin || D.skin;
  const mitten = D.hands === 'mitten';
  const add = (n, pts, zz, opt = {}) => fig.add(name + n, X(pts), { fill: skin, z: zz, per: 3, ...opt });
  const press = hp.press || [0, 0, 0, 0];
  const v = hp.view;
  const lwFine = 1.6;
  if (v === 'back' || v === 'point' || v === 'palm') {
    add('p', [[0, -2.6], [2.5, -3.2], [5.4, -3.5], [6.7, -2.9], [7.0, 0], [6.7, 2.8], [5.4, 3.3], [2.5, 3.0], [0, 2.5]], z);
    if (mitten) {
      const c = clamp(hp.curl);
      const sp = fingerPts([5.8, 0.2], 0, 6.2, c * 1.3, 0.5, 0.9);
      const t = tube(sp, [[0, 3.3], [0.55, 3.2], [1, 2.6]], { capStart: 'round', capStartK: 0.5, step: 0.4 });
      add('f', t.outline, z + 0.01);
      const tip = sp[4];
      fig.line(X([lerpP(sp[2], [tip[0], tip[1] - 1.2], 0.2), [tip[0] - 0.2, tip[1] - 1.0]]), { z: z + 0.05, lw: lwFine, clip: [name + 'f'], seed: 7, alpha: 0.8 });
    } else {
      const bases = [-2.5, -0.84, 0.84, 2.45];
      const lens = [4.7, 5.3, 5.0, 4.0];
      const tips = [];
      for (let i = 0; i < 4; i++) {
        const fan = (bases[i] / 2.5) * (0.06 + hp.spread * 0.22);
        let curl = clamp(hp.curl + press[i] * 0.6);
        if (v === 'point' && i > 0) curl = 1;
        if (v === 'point' && i === 0) curl = 0;
        // seen from the back, curling shortens the finger
        const L = lens[i] * (1 - 0.62 * curl);
        const b = [6.1, bases[i] * 0.98];
        const tip = [b[0] + Math.cos(fan) * L, b[1] + Math.sin(fan) * L];
        tips.push({ b, tip, L });
        const t = tube([b, lerpP(b, tip, 0.5), tip], [[0, 0.98], [0.75, 0.95], [1, 0.86]], { capStart: 'round', capStartK: 0.5, step: 0.35 });
        add('f' + i, t.outline, z + 0.01 * (i + 1));
        if (curl > 0.45) fig.line(X([[tip[0] - 1.1, tip[1] - 0.75], [tip[0] - 0.55, tip[1]], [tip[0] - 1.1, tip[1] + 0.75]]), { z: z + 0.1, lw: lwFine, clip: [name + 'f' + i], seed: 11 + i, alpha: 0.6 });
      }
      // separation lines between fingers that touch
      for (let i = 0; i < 3; i++) {
        const a = tips[i], b = tips[i + 1];
        const gap = Math.hypot(a.tip[0] - b.tip[0], a.tip[1] - b.tip[1]);
        if (gap > 2.4) continue;
        const m = lerpP(a.tip, b.tip, 0.5);
        const back = lerpP(lerpP(a.b, b.b, 0.5), m, 0.35);
        fig.line(X([m, back]), { z: z + 0.1, lw: lwFine, brush: 'out', seed: 15 + i, alpha: 0.85 });
      }
    }
    // thumb grows out of the palm (edge lines fade in from its root: no seam)
    const ta = -0.62 - hp.thumb * 0.55;
    const tb = [2.0, -2.2];
    const tt = [tb[0] + Math.cos(ta) * 4.5, tb[1] + Math.sin(ta) * 4.5];
    const tm = [(tb[0] + tt[0]) / 2 + 0.35, (tb[1] + tt[1]) / 2 + 0.1];
    const th = tube([tb, tm, tt], [[0, 1.55], [0.55, 1.3], [1, 1.12]], { capStart: 'round', capStartK: 0.5, step: 0.35 });
    add('t', th.outline, v === 'palm' ? z - 0.05 : z + 0.06, { edge: v === 'palm' ? false : [name + 'p'], edgeLines: [th.left, th.right], edgeMul: 0.8 });
    if (v === 'palm') fig.line(X([[1.5, 1.2], [3.6, 0.2], [5.2, -1.6]]), { z: z + 0.1, lw: lwFine, clip: [name + 'p'], seed: 19, alpha: 0.5 });
  } else if (v === 'side') {
    // little-finger side: back of the hand on top, fingers curling down onto the keys
    const c = clamp(hp.curl);
    // thumb hides on the far side, peeking under the palm
    add('t', tube([[2.4, 1.0], [4.6, 1.9], [6.2, 2.6]], [[0, 1.25], [1, 1.05]], { capStart: 'round', capStartK: 0.5, step: 0.35 }).outline, z - 0.02);
    add('p', [[0, -1.6], [2.6, -2.3], [5.4, -2.5], [7.2, -1.9], [8.0, -0.6], [7.6, 1.0], [5.6, 1.7], [3.0, 1.8], [0, 1.6]], z);
    if (mitten) {
      add('f', tube(fingerPts([6.6, -0.3], 0.12, 6.4, c * 1.25, 0.5, 1.0), [[0, 1.85], [0.6, 1.75], [1, 1.45]], { capStart: 'round', capStartK: 0.5, step: 0.35 }).outline, z + 0.02);
    } else {
      // three visible fingers, the far ones a touch further forward
      // i = 0 little finger (nearest), the others step forward so each fingertip reads on its own
      for (let i = 3; i >= 0; i--) {
        const pr = press[3 - i] || 0;
        const sp = fingerPts([6.3 + i * 0.75, -0.6 - i * 0.28], 0.1 - i * 0.05 + pr * 0.3, 4.3 + i * 0.35, c * (1 + i * 0.06) + pr * 0.3, 0.55, 1.0);
        const t = tube(sp, [[0, 1.05], [0.7, 1.0], [1, 0.9]], { capStart: 'round', capStartK: 0.5, step: 0.3 });
        add('f' + i, t.outline, z + 0.02 + (3 - i) * 0.01, i < 3 ? { edge: [name + 'f' + (i + 1)], edgeLines: [t.left, t.right], edgeMul: 0.75 } : {});
      }
      fig.line(X([[6.2, -1.7], [6.6, -0.9]]), { z: z + 0.1, lw: lwFine, clip: [name + 'p'], seed: 21, alpha: 0.45 });
    }
  } else if (v === 'front') {
    // back of the hand strongly foreshortened, knuckles toward the camera, fingers curling down (+x)
    add('p', [[0, -2.9], [1.7, -3.4], [3.3, -3.6], [4.0, -1.8], [4.1, 0], [4.0, 1.8], [3.3, 3.5], [1.7, 3.3], [0, 2.8]], z);
    if (mitten) {
      add('f', [[3.2, -3.4], [5.4, -3.2], [6.4, -1.4], [6.5, 1.4], [5.4, 3.2], [3.2, 3.4]], z + 0.01);
    } else {
      const ys = [-2.55, -0.85, 0.85, 2.5];
      for (let i = 0; i < 4; i++) {
        const L = 2.9 + (i === 1 || i === 2 ? 0.5 : 0) + press[i] * 0.7 - hp.curl * 0.6;
        add('f' + i, tube([[3.3, ys[i]], [3.3 + L * 0.5, ys[i]], [3.3 + L, ys[i] * 1.02]], [[0, 0.95], [1, 0.86]], { capStart: 'round', capStartK: 0.5, step: 0.3 }).outline, z + 0.01 * (i + 1));
      }
      for (let i = 0; i < 3; i++) fig.line(X([[5.1, (ys[i] + ys[i + 1]) / 2], [4.2, (ys[i] + ys[i + 1]) / 2]]), { z: z + 0.1, lw: lwFine, brush: 'out', seed: 25 + i, alpha: 0.8 });
      fig.line(X([[2.9, -2.2], [3.3, -1.0]]), { z: z + 0.1, lw: lwFine, clip: [name + 'p'], seed: 29, alpha: 0.4 });
    }
    const th = tube([[1.0, -2.6], [2.6, -3.9], [4.2, -3.9]], [[0, 1.3], [1, 1.1]], { capStart: 'round', capStartK: 0.5, step: 0.3 });
    add('t', th.outline, z + 0.06, { edge: [name + 'p'], edgeLines: [th.left, th.right], edgeMul: 0.8 });
  } else if (v === 'fist') {
    add('p', [[0, -2.7], [3.8, -3.4], [6.4, -3.1], [7.6, -1.6], [7.8, 0.6], [7.2, 2.8], [4.4, 3.4], [0, 2.8]], z);
    if (!mitten) for (const y of [-1.7, 0, 1.7]) fig.line(X([[7.6, y - 0.1], [6.3, y + 0.2]]), { z: z + 0.05, lw: lwFine, clip: [name + 'p'], seed: 23 + y, alpha: 0.9 });
    const th = tube([[1.8, -2.4], [4.6, -3.0], [6.4, -1.7]], [[0, 1.35], [1, 1.1]], { capStart: 'round', capStartK: 0.5, step: 0.35 });
    add('t', th.outline, z + 0.05, { edge: [name + 'p'], edgeLines: [th.left, th.right], edgeMul: 0.8 });
  }
}
