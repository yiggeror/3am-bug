// The bug: a small, quick, cheeky beetle. Magenta shell, big white eyes, springy antennae, six scurrying legs.
// It can disguise itself as a character (the "=" of "<=") by flattening into two cyan bars with its eyes peeking.
import { Fig, tube } from './figure.js';
import { C, curScale, ellipsePts, rectPts, emote } from './draw.js';
import { clamp, lerp, TAU, hash2 } from './core.js';

export const BUG = {
  x: 0, y: 0, size: 40, flip: 1, alpha: 1,
  run: 0, runAmt: 0, sq: 0, rot: 0, hop: 0,
  lookX: 0, lookY: 0, eyes: 'normal', blink: 0, mouth: 'grin', mouthK: 1,
  ant: 0, antK: 1,           // antenna sway (follow-through) and length
  disguise: 0,               // 0 beetle … 1 "=" glyph
  glyphColor: '#89ddff', shell: '#c44ee8', shellDark: '#8f2fb3', body: '#3b2448', ink: '#140f18',
  emote: null, shake: 0, tremble: 0,
};
export function bugState(o) { return { ...BUG, ...o }; }

function mix(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}

// unit space: origin at the feet centre, facing +x, body ~1 wide, ~0.7 tall
export function drawBug(ctx, st) {
  const s = { ...BUG, ...st };
  if (s.alpha <= 0) return;
  ctx.save();
  if (s.alpha < 1) ctx.globalAlpha *= s.alpha;
  const sh = s.shake ? Math.sin(s.shake * 91.7) * s.size * 0.05 : 0;
  const tr = s.tremble ? Math.sin(s.tremble * 173) * s.size * 0.015 : 0;
  ctx.translate(s.x + sh + tr, s.y - s.hop * s.size);
  ctx.scale(s.size * s.flip, s.size);
  ctx.translate(0, -0.35); ctx.rotate(s.rot * s.flip); ctx.translate(0, 0.35);
  const ups = curScale(ctx);
  const lw = clamp(ups * 0.06, 1.8, 4.5);
  const fig = new Fig(ctx, { lw, seed: 1701, ink: s.ink, amp: 0.6 });
  const dk = clamp(s.disguise);
  const sq = s.sq;
  const H = 0.62 * (1 - sq) * (1 - dk * 0.35), Wd = 1.0 * (1 + sq * 0.6);
  if (dk < 0.98) {
    const legK = 1 - dk;
    // legs: three per side (we see the near three strongly, the far three darker)
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 3; i++) {
        const ph = s.run * TAU + i * 2.1 + side * Math.PI;
        const lift = Math.max(0, Math.sin(ph)) * 0.09 * s.runAmt;
        const sw = Math.cos(ph) * 0.12 * s.runAmt;
        const bx = -0.28 + i * 0.28 + side * 0.05;
        const root = [bx, -0.14];
        const knee = [bx + sw * 0.5 - 0.06 + i * 0.03, -0.09 - lift * 0.5];
        const foot = [bx + sw + (i - 1) * 0.1, -lift * legK];
        fig.add(`leg${side}${i}`, tube([root, knee, foot], [[0, 0.035], [1, 0.03]], { capStart: 'round', capEnd: 'round', step: 0.01 }).outline, { fill: side ? '#2a1833' : s.body, z: side ? -3 : -1, per: 1 });
      }
    }
    // body (belly) + head block in front
    const body = ellipsePts(0.02, -0.1 - H * 0.42, Wd * 0.5, H * 0.46, 26);
    fig.add('belly', body, { fill: s.body, z: 0 });
    // shell: a dome that covers the back two-thirds
    const shellCol = mix(s.shell, s.glyphColor, dk);
    const shp = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; shp.push([-0.12 + Math.cos(a) * Wd * 0.48, -0.16 + Math.sin(a) * H * 0.95]); }
    shp.push([0.34 * Wd, -0.13], [-0.12, -0.08], [-0.58 * Wd, -0.13]);
    fig.add('shell', shp, { fill: shellCol, z: 1, edge: true });
    fig.line([[-0.12, -0.16 - H * 0.93], [-0.14, -0.12]], { z: 1.1, lw: lw * 0.8, clip: ['shell'], brush: 'soft' });
    if (dk < 0.5) {
      for (const [sx, sy, r] of [[-0.35, -0.3, 0.07], [-0.2, -0.48, 0.06], [0.07, -0.34, 0.06], [-0.46, -0.16, 0.05]]) fig.line(ellipsePts(sx * Wd, -0.1 + sy * H / 0.62, r, r * 0.9, 10), { z: 1.2, fill: s.shellDark, stroke: false, alpha: 1 - dk * 2 });
      fig.line([[-0.42 * Wd, -0.16 - H * 0.72], [-0.2 * Wd, -0.16 - H * 0.86]], { z: 1.25, lw: lw * 1.2, color: 'rgba(255,220,255,0.6)', clip: ['shell'] });
    }
    // head / face at the front
    const hx = 0.3 * Wd, hy = -0.1 - H * 0.42;
    fig.add('head', ellipsePts(hx, hy, 0.26, 0.24 * (1 - sq * 0.4), 20), { fill: s.body, z: 2, edge: true });
    // antennae with follow-through
    for (const k of [0, 1]) {
      const base = [hx - 0.02 + k * 0.1, hy - 0.2];
      const a = -0.95 - k * 0.75 + s.ant * 0.6;
      const L = 0.34 * s.antK;
      const mid = [base[0] + Math.cos(a) * L * 0.55, base[1] + Math.sin(a) * L * 0.55];
      const tip = [base[0] + Math.cos(a + s.ant * 0.5) * L, base[1] + Math.sin(a + s.ant * 0.5) * L];
      fig.line([base, mid, tip], { z: k ? 1.9 : 2.2, lw: lw * 0.75, brush: 'out', color: s.ink });
      fig.line(ellipsePts(tip[0], tip[1], 0.045, 0.045, 8), { z: 2.3, fill: shellCol, lw: lw * 0.5 });
    }
    // eyes
    const ex = hx + 0.04 + s.lookX * 0.03, ey = hy - 0.03 + s.lookY * 0.02;
    for (const i of [-1, 1]) {
      const px = ex + i * 0.085;
      if (s.eyes === 'closed' || s.blink > 0.8) { fig.line([[px - 0.05, ey], [px, ey + 0.03], [px + 0.05, ey]], { z: 3, lw: lw * 0.8, color: '#fff', brush: 'soft' }); continue; }
      if (s.eyes === 'squeeze') { fig.line([[px + i * 0.05, ey - 0.05], [px - i * 0.03, ey], [px + i * 0.05, ey + 0.05]], { z: 3, lw: lw * 0.8, color: '#fff', brush: 'soft', smooth: false }); continue; }
      const r = s.eyes === 'wide' ? 0.1 : 0.085;
      const hh = s.eyes === 'sly' ? 0.5 : 1;
      fig.line(ellipsePts(px, ey, r, r * hh * (1 - s.blink), 14), { z: 3, fill: '#fffaf0', lw: lw * 0.5 });
      if (s.eyes === 'dizzy') { fig.line([[px - 0.03, ey - 0.03], [px + 0.03, ey + 0.03]], { z: 3.1, lw: lw * 0.6, brush: false }); fig.line([[px + 0.03, ey - 0.03], [px - 0.03, ey + 0.03]], { z: 3.1, lw: lw * 0.6, brush: false }); continue; }
      fig.line(ellipsePts(px + 0.018 + s.lookX * 0.02, ey + 0.012 * hh + s.lookY * 0.02, r * 0.48, r * 0.52 * hh * (1 - s.blink), 10), { z: 3.1, fill: '#140f18', stroke: false });
      if (s.eyes === 'sly') fig.line([[px - r * 1.1, ey - r * 0.35], [px + r * 1.1, ey - r * 0.55]], { z: 3.2, lw: lw * 0.9, color: s.body, brush: 'soft' });
    }
    // mouth
    const mx = ex + 0.03, my = ey + 0.1;
    if (s.mouth === 'grin') fig.line([[mx - 0.07, my - 0.01], [mx, my + 0.03], [mx + 0.06, my - 0.02]], { z: 3.2, lw: lw * 0.6, color: '#fff', brush: 'soft' });
    else if (s.mouth === 'tongue') {
      fig.line([[mx - 0.07, my - 0.01], [mx + 0.06, my - 0.01]], { z: 3.2, lw: lw * 0.6, color: '#fff', brush: 'soft' });
      fig.line([[mx - 0.02, my - 0.01], [mx + 0.03, my - 0.01], [mx + 0.035, my + 0.06 * s.mouthK], [mx - 0.015, my + 0.065 * s.mouthK]], { z: 3.3, fill: '#ff7aa8', lw: lw * 0.4 });
    } else if (s.mouth === 'o') fig.line(ellipsePts(mx, my + 0.01, 0.03, 0.04, 10), { z: 3.2, fill: '#ff7aa8', lw: lw * 0.4 });
    else if (s.mouth === 'frown') fig.line([[mx - 0.06, my + 0.02], [mx, my - 0.015], [mx + 0.06, my + 0.02]], { z: 3.2, lw: lw * 0.6, color: '#fff', brush: 'soft' });
  }
  if (dk > 0.02 && s.glyph === 'o') {
    const k = clamp((dk - 0.3) / 0.7);
    ctx.save(); ctx.globalAlpha *= k;
    const g = new Fig(ctx, { lw: lw * 0.7, seed: 1711, ink: s.ink });
    const ring = ellipsePts(0, -0.34, 0.34, 0.36, 24), hole = ellipsePts(0, -0.34, 0.17, 0.2, 18).reverse();
    g.add('ring', ring, { fill: s.glyphColor, z: 0 });
    g.add('hole', ellipsePts(0, -0.34, 0.16, 0.19, 18), { fill: s.holeColor || '#232536', z: 0.5, edge: true, noOutline: true });
    const peek = s.peek ?? 0.5;
    if (peek > 0.05) for (const i of [-1, 1]) { g.line(ellipsePts(i * 0.075 + s.lookX * 0.04, -0.37, 0.05, 0.06 * peek, 10), { z: 1, fill: '#fffaf0', lw: lw * 0.35 }); g.line(ellipsePts(i * 0.075 + s.lookX * 0.06, -0.365, 0.022, 0.03 * peek, 8), { z: 1.1, fill: '#140f18', stroke: false }); }
    g.draw();
    ctx.restore();
  } else if (dk > 0.02) {
    // the disguise: two cyan bars of an "=", eyes peeking from the top bar
    const k = clamp((dk - 0.3) / 0.7);
    const col = s.glyphColor;
    const bw = lerp(0.3, 0.46, k), bh = 0.1, gap = lerp(0.02, 0.13, k);
    ctx.save(); ctx.globalAlpha *= k;
    const g = new Fig(ctx, { lw: lw * 0.7, seed: 1709, ink: s.ink });
    g.add('bar1', rectPts(-bw, -0.34 - gap / 2 - bh, bw * 2, bh, 0.04, 0.02), { fill: col, z: 0 });
    g.add('bar2', rectPts(-bw, -0.34 + gap / 2, bw * 2, bh, 0.04, 0.02), { fill: col, z: 0 });
    const peek = s.peek ?? 0.5;
    if (peek > 0.05) for (const i of [-1, 1]) g.line(ellipsePts(i * 0.1 + s.lookX * 0.05, -0.34 - gap / 2 - bh * 0.5, 0.035, 0.035 * peek, 8), { z: 1, fill: '#140f18', stroke: false });
    // tiny feet giving it away
    if (s.feet) for (const i of [-1, 0, 1]) g.line([[i * 0.18, -0.34 + gap / 2 + bh], [i * 0.18 + 0.02, -0.22]], { z: -1, lw: lw * 0.6, brush: false, color: s.ink, alpha: s.feet });
    g.draw();
    ctx.restore();
  }
  fig.alpha = 1 - clamp((dk - 0.2) / 0.5);
  if (fig.alpha > 0.01) fig.draw();
  ctx.restore();
  if (s.emote && s.emote.k > 0) emote(ctx, s.emote.type, s.x + s.size * 0.3 * s.flip, s.y - s.size * (0.95 + s.hop), s.size * 0.6, s.emote.k, 13);
}
