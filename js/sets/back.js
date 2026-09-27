// BACK set: the room seen from behind his chair, with a real perspective camera (world in cm:
// x right, y up, z toward the desk wall). The desk stands against the wall at z = 75, the window is
// to the left of the monitor, the lamp to the right. He sits at (0, 47, -17), facing +z.
import { C, rect, line, shape, ellipse, circle, rectPts, ellipsePts, text, brush, softShadow, poly, curScale, ZH_FONT, HAND_FONT } from '../draw.js';
import { Fig } from '../figure.js';
import { Cam, billboard, projPoly, projPts, planePoly, planePts, Stage } from '../world.js';
import { drawBack, inkFor } from '../human/body.js';
import { chairBack } from '../furniture.js';
import { drawScreen } from '../screen.js';
import { mugSide } from './props.js';
import { LightMap, addGlow } from '../light.js';
import { ambient, sunK, rgbs, skyTop, skyMid, skyLow, stars, clockMinutes } from './tod.js';
import { clamp, lerp, hash2, TAU, noise1 } from '../core.js';

export const W = { wallZ: 75, deskY: 74, seat: [0, 47, -17], mon: { x0: -29, x1: 29, y0: 88, y1: 121, z: 46 }, win: { x0: -140, x1: -52, y0: 100, y1: 205 }, kb: { x0: -22, x1: 22, z0: 6, z1: 21, y: 75.6 } };
export const BACK_CUPS = [[-44, 30], [40, 28], [52, 12], [-58, 14], [24, 40], [-34, 48], [62, 36]];

export function drawBackSet(ctx, S, cam, o = {}) {
  const tod = S.tod ?? 0;
  const P = (x, y, z) => cam.project(x, y, z);
  // ---------------- walls & floor
  poly(ctx, projPoly(cam, [[-400, 0, W.wallZ], [400, 0, W.wallZ], [400, 290, W.wallZ], [-400, 290, W.wallZ]]), '#e9ddc6');
  billboard(ctx, cam, 0, 0, W.wallZ, (c) => {
    c.fillStyle = 'rgba(210,190,160,0.28)';
    for (let x = -400; x < 400; x += 20) c.fillRect(x, -290, 7, 290);
    c.fillStyle = '#dccbae'; c.fillRect(-400, -9, 800, 9);
  });
  poly(ctx, projPoly(cam, [[170, 0, W.wallZ], [170, 0, -400], [170, 290, -400], [170, 290, W.wallZ]]), '#e2d4bb');
  poly(ctx, projPoly(cam, [[-170, 0, W.wallZ], [-170, 0, -400], [-170, 290, -400], [-170, 290, W.wallZ]]), '#e2d4bb');
  poly(ctx, projPoly(cam, [[-170, 0, W.wallZ], [170, 0, W.wallZ], [170, 0, -400], [-170, 0, -400]]), '#c29f76');
  // floorboards
  ctx.strokeStyle = 'rgba(90,60,40,0.25)'; ctx.lineWidth = 2;
  for (let x = -160; x <= 160; x += 20) { const p = projPts(cam, [[x, 0, W.wallZ], [x, 0, -300]]); if (p.length === 2) { ctx.beginPath(); ctx.moveTo(...p[0]); ctx.lineTo(...p[1]); ctx.stroke(); } }
  // rug
  shape(ctx, planePoly(cam, 0.2, [[-70, 20], [70, 20], [80, -90], [-80, -90]]), { fill: 'rgba(126,150,170,0.6)', seed: 801, lw: 2.2, noStroke: true });
  drawWindow(ctx, cam, S);
  // shelf on the wall (right) with books and a plant; the little friend doodle; a wall clock
  billboard(ctx, cam, 95, 150, W.wallZ, (c, p) => {
    const fig = new Fig(c, { lw: inkFor(p.s) * 0.85, seed: 811 });
    fig.add('board', rectPts(-45, 0, 90, 3.5, 0.5, 1), { fill: C.wood, z: 0, sharp: true });
    const cols = ['#e2574c', '#8fb3d9', '#f6d365', '#9bc59d', '#e8a26b', '#b9a5d6', '#7f9dba'];
    let x = -42;
    for (let i = 0; i < 9; i++) {
      const w = 3.5 + hash2(i, 5) * 3, h = 16 + hash2(i, 6) * 8;
      fig.add('bk' + i, rectPts(x, -h, w, h, 0.4, 1), { fill: cols[i % 7], z: 1 + i * 0.01, edge: true });
      x += w + 0.4;
    }
    fig.add('pot', [[18, 0], [32, 0], [31, -11], [19, -11]], { fill: '#e7b98f', z: 1 });
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; fig.line([[25, -10], [25 + Math.cos(a) * 16, -10 + Math.sin(a) * 16]], { z: 0.8, lw: 3.8, color: '#6f9e72', brush: 'out' }); }
    fig.draw();
  });
  billboard(ctx, cam, 128, 205, W.wallZ, (c, p) => {
    const fig = new Fig(c, { lw: inkFor(p.s) * 0.85, seed: 821 });
    const mins = S.clock ?? clockMinutes(tod);
    fig.add('clock', ellipsePts(0, 0, 13, 13, 28), { fill: '#fffaf0', z: 0 });
    const ha = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2, ma = ((mins % 60) / 60) * TAU - Math.PI / 2;
    fig.line([[0, 0], [Math.cos(ha) * 6.5, Math.sin(ha) * 6.5]], { z: 1, lw: 3.5, brush: 'out' });
    fig.line([[0, 0], [Math.cos(ma) * 9.5, Math.sin(ma) * 9.5]], { z: 1, lw: 2.6, brush: 'out' });
    fig.draw();
  });
  // ---------------- desk
  const dy = W.deskY;
  shape(ctx, projPoly(cam, [[-82, dy, 0], [82, dy, 0], [82, dy, W.wallZ], [-82, dy, W.wallZ]]), { fill: '#d6b48b', seed: 831, lw: 2.6 });
  shape(ctx, projPoly(cam, [[-82, dy - 3.5, 0], [82, dy - 3.5, 0], [82, dy, 0], [-82, dy, 0]]), { fill: '#b8936a', seed: 832, lw: 2.6 });
  for (const x of [-78, 74]) shape(ctx, projPoly(cam, [[x, 0, 3], [x + 4, 0, 3], [x + 4, dy - 3.5, 3], [x, dy - 3.5, 3]]), { fill: '#b8936a', seed: 833 + x, lw: 2.4 });
  // mouse pad + mouse
  shape(ctx, planePoly(cam, dy + 0.2, [[26, 4], [48, 4], [48, 26], [26, 26]]), { fill: '#5f6d82', seed: 835, lw: 2.2 });
  const st = new Stage();
  const bb = (x, y, z, fn, order = 0) => st.add(cam.view(x, z)[1], () => billboard(ctx, cam, x, y, z, fn), order);
  // monitor (stand, bezel, screen)
  bb(0, dy, 52, (c, p) => {
    const fig = new Fig(c, { lw: inkFor(p.s) * 0.9, seed: 841 });
    fig.add('foot', [[-12, 0], [12, 0], [11, -2], [-11, -2]], { fill: '#b9b1a6', z: 0 });
    fig.add('neck', [[-3, -1], [3, -1], [3, -18], [-3, -18]], { fill: '#aca397', z: 0 });
    fig.draw();
  });
  const m = W.mon;
  st.add(cam.view(0, m.z)[1], () => {
    const outer = projPoly(cam, [[m.x0 - 1.8, m.y0 - 2.6, m.z], [m.x1 + 1.8, m.y0 - 2.6, m.z], [m.x1 + 1.8, m.y1 + 1.8, m.z], [m.x0 - 1.8, m.y1 + 1.8, m.z]]);
    shape(ctx, outer, { fill: '#2b2927', seed: 842, lw: 2.8, sharp: true });
    billboard(ctx, cam, m.x0, m.y1, m.z, (c) => {
      c.save();
      c.beginPath(); c.rect(0, 0, m.x1 - m.x0, m.y1 - m.y0); c.clip();
      c.scale((m.x1 - m.x0) / 1920, (m.y1 - m.y0) / 1080);
      if (S.screenDraw) S.screenDraw(c); else drawScreen(c, S.scr || {}, S.t || 0);
      c.restore();
      if ((S.screen ?? 1) < 1) { c.fillStyle = `rgba(0,0,0,${1 - (S.screen ?? 1)})`; c.fillRect(0, 0, m.x1 - m.x0, m.y1 - m.y0); }
    });
    // sticky notes on the bezel
    const notes = S.notes ?? 6;
    const NOTE = [[m.x0 - 1.6, m.y1 - 1.2, -0.12, '#f6d365', 'fix it'], [m.x1 - 3, m.y1 + 1.6, 0.1, '#f5a3a0', '喝水'], [m.x1 + 1.4, m.y1 - 8, -0.06, '#a8d8b0', 'sleep?'], [m.x0 - 1.8, m.y1 - 8.5, 0.08, '#9fd0f0', ':)'], [m.x0 + 7, m.y1 + 1.8, -0.04, '#f6d365', 'TODO'], [m.x1 + 1.6, m.y1 - 15, 0.12, '#f6d365', '别慌']];
    NOTE.slice(0, notes).forEach(([x, y, a, col, s], i) => billboard(ctx, cam, x, y, m.z - 0.3, (c, p) => {
      c.save(); c.rotate(a);
      const fig = new Fig(c, { lw: inkFor(p.s) * 0.7, seed: 850 + i });
      fig.add('n', [[-2.5, -2.5], [2.5, -2.5], [2.6, 2.4], [-2.4, 2.6]], { fill: col, z: 0, sharp: true });
      fig.after((cc) => text(cc, s, 0, 0.2, { size: 1.5, font: /[a-z:)?]/i.test(s) ? HAND_FONT : ZH_FONT, color: '#3b3530' }), 1);
      fig.draw();
      c.restore();
    }));
  }, 1);
  // keyboard: plate + keys at true depth
  {
    const k = W.kb;
    st.add(cam.view(0, k.z1)[1], () => {
      shape(ctx, projPoly(cam, [[k.x0, k.y, k.z0], [k.x1, k.y, k.z0], [k.x1, k.y, k.z1], [k.x0, k.y, k.z1]]), { fill: '#e9e2d6', seed: 861, lw: 2.4 });
      ctx.fillStyle = '#f8f4ec';
      for (let r = 0; r < 5; r++) for (let i = 0; i < 14; i++) {
        const x0 = k.x0 + 1.2 + i * 2.95, z0 = k.z0 + 1.2 + r * 2.7;
        const q = projPoly(cam, [[x0, k.y + 0.6, z0], [x0 + 2.4, k.y + 0.6, z0], [x0 + 2.4, k.y + 0.6, z0 + 2.2], [x0, k.y + 0.6, z0 + 2.2]]);
        ctx.beginPath(); q.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      }
    }, -1);
  }
  bb(37, dy + 0.3, 15, (c, p) => { const fig = new Fig(c, { lw: inkFor(p.s) * 0.8, seed: 871 }); fig.add('m', ellipsePts(0, -1.4, 3.2, 1.8, 16), { fill: '#efe9df' }); fig.draw(); });
  // lamp
  bb(58, dy, 50, (c, p) => drawLampFront(c, p, S.lamp ?? 1), 0);
  // mugs
  const cups = S.cups ?? 3;
  BACK_CUPS.slice(0, cups).forEach(([x, z], i) => bb(x, dy, z, (c, p) => { mugSide(c, i, 0.45, { flip: x < 0 }); }, 0));
  st.draw(ctx);
  // ---------------- the character and his chair
  const [sx, sy, sz] = W.seat;
  if (S.human) billboard(ctx, cam, sx, sy, sz, (c) => drawBack(c, S.human.P, S.human.D, { lights: S.human.lights, seed: 21 }));
  billboard(ctx, cam, sx, sy, sz - 6, (c) => chairBack(c, { tilt: S.chairTilt || 0 }));
  if (o.after) o.after(ctx, cam);
  lightBack(ctx, cam, S);
}

function drawLampFront(c, p, on) {
  const fig = new Fig(c, { lw: inkFor(p.s) * 0.85, seed: 881 });
  fig.add('base', [[-7, 0], [7, 0], [6, -2.2], [-6, -2.2]], { fill: '#3f4a5c', z: 0 });
  fig.add('arm', [[-1, -1.5], [1, -1.5], [-2, -27], [-4, -27]], { fill: '#3f4a5c', z: 0 });
  fig.add('arm2', [[-3.8, -27.6], [-2, -25.8], [-17, -32], [-18, -30]], { fill: '#3f4a5c', z: 0 });
  fig.add('shade', [[-14, -37], [-24, -34], [-27, -24], [-12, -25]], { fill: '#e2574c', z: 1 });
  if (on > 0.01) fig.line(ellipsePts(-19.5, -24.6, 7, 1.6, 16), { z: 1.1, fill: `rgba(255,238,196,${on})`, lw: 1.4 });
  fig.draw();
}

function drawWindow(ctx, cam, S) {
  const tod = S.tod ?? 0;
  const { x0, x1, y0, y1 } = W.win;
  billboard(ctx, cam, (x0 + x1) / 2, y0, W.wallZ, (c, p) => {
    const w = x1 - x0, h = y1 - y0;
    const g = c.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, `rgb(${rgbs(skyTop(tod))})`); g.addColorStop(0.55, `rgb(${rgbs(skyMid(tod))})`); g.addColorStop(1, `rgb(${rgbs(skyLow(tod))})`);
    c.fillStyle = g; c.fillRect(-w / 2, -h, w, h);
    const sa = stars(tod);
    for (let i = 0; i < 24 && sa > 0.01; i++) {
      const sx = -w / 2 + hash2(i, 11) * w, sy = -h + hash2(i, 12) * h * 0.6;
      const tw = 0.55 + 0.45 * Math.sin((S.t || 0) * (1 + hash2(i, 13) * 2) + i);
      c.fillStyle = `rgba(255,244,210,${(0.3 + 0.5 * tw) * sa})`;
      c.beginPath(); c.arc(sx, sy, 0.3 + hash2(i, 14) * 0.4, 0, TAU); c.fill();
    }
    // rooftops and a few windows still lit
    const roof = tod > 0.7 ? `rgb(${Math.round(lerp(40, 120, (tod - 0.7) / 0.3))},${Math.round(lerp(44, 100, (tod - 0.7) / 0.3))},${Math.round(lerp(78, 120, (tod - 0.7) / 0.3))})` : '#282e52';
    c.fillStyle = roof;
    c.beginPath(); c.moveTo(-w / 2, 0);
    [[-40, -26], [-30, -34], [-18, -22], [-4, -30], [10, -24], [22, -38], [34, -27], [44, -21]].forEach(([x, y]) => { c.lineTo(x - 6, y); c.lineTo(x + 6, y); });
    c.lineTo(w / 2, 0); c.closePath(); c.fill();
    c.fillStyle = `rgba(255,214,140,${0.8 * (1 - clamp((tod - 0.75) / 0.2))})`;
    [[-36, -24], [-10, -20], [20, -30], [24, -30], [33, -18]].forEach(([x, y]) => c.fillRect(x, y, 1.6, 2));
    // sun rising behind the roofs
    const sk = clamp((tod - 0.82) / 0.18);
    if (sk > 0) { c.fillStyle = `rgba(255,236,190,${sk})`; c.beginPath(); c.arc(w * 0.18, -26 - sk * 12, 7, 0, TAU); c.fill(); }
    const fig = new Fig(c, { lw: inkFor(p.s) * 0.95, seed: 891 });
    fig.add('f1', [[-w / 2 - 3, -h - 3], [w / 2 + 3, -h - 3], [w / 2 + 3, -h], [-w / 2 - 3, -h]], { fill: '#f3ead9', z: 0, sharp: true });
    fig.add('f2', [[-w / 2 - 3, 0], [w / 2 + 3, 0], [w / 2 + 3, 3], [-w / 2 - 3, 3]], { fill: '#f3ead9', z: 0, sharp: true });
    fig.add('f3', [[-w / 2 - 3, -h], [-w / 2, -h], [-w / 2, 0], [-w / 2 - 3, 0]], { fill: '#f3ead9', z: 0, sharp: true });
    fig.add('f4', [[w / 2, -h], [w / 2 + 3, -h], [w / 2 + 3, 0], [w / 2, 0]], { fill: '#f3ead9', z: 0, sharp: true });
    fig.add('mull', [[-1.2, -h], [1.2, -h], [1.2, 0], [-1.2, 0]], { fill: '#f3ead9', z: 0, sharp: true });
    fig.add('sill', [[-w / 2 - 6, 0], [w / 2 + 6, 0], [w / 2 + 6, 3.5], [-w / 2 - 6, 3.5]], { fill: '#f7efe2', z: 1, sharp: true });
    const sway = Math.sin((S.t || 0) * 0.6) * 0.8;
    for (const side of [-1, 1]) {
      const cx = side * (w / 2 + 4);
      fig.add('cur' + side, [[cx - 9, -h - 7], [cx + 9, -h - 7], [cx + 9 + sway * side, 6], [cx + 3, 10], [cx - 3 + sway, 6], [cx - 9 + sway, 10]], { fill: '#f0c9a8', z: 2 });
      for (let k = -1; k <= 1; k++) fig.line([[cx + k * 4.5, -h - 4], [cx + k * 4.5 + sway, 5]], { z: 2.1, lw: 1.6, color: '#d9a987', clip: ['cur' + side] });
    }
    fig.add('rod', [[-w / 2 - 18, -h - 10], [w / 2 + 18, -h - 10], [w / 2 + 18, -h - 7], [-w / 2 - 18, -h - 7]], { fill: C.wood, z: 3 });
    fig.draw();
  });
}

function lightBack(ctx, cam, S) {
  const tod = S.tod ?? 0;
  const P = (x, y, z) => cam.project(x, y, z);
  const L = new LightMap(ctx, `rgb(${rgbs(ambient(tod))})`);
  const scr = S.screen ?? 1;
  const sRGB = S.screenRGB || '170,190,255';
  const m = W.mon;
  const sc = P(0, (m.y0 + m.y1) / 2, m.z);
  // monitor: glow around the screen, a pool on the desk/keyboard, light on his head and shoulders
  L.point(sc.x, sc.y, 95 * sc.s, sRGB, 0.9 * scr, 1.2, 1);
  const kp = P(0, W.deskY, 18);
  L.point(kp.x, kp.y, 70 * kp.s, sRGB, 0.55 * scr, 1.6, 0.6);
  const hp = P(0, 110, -17);
  L.point(hp.x, hp.y, 55 * hp.s, sRGB, 0.35 * scr, 1, 1.2);
  // lamp pool
  const lamp = S.lamp ?? 1;
  const lp = P(40, W.deskY, 38);
  L.point(lp.x, lp.y, 48 * lp.s, '255,210,150', 0.8 * lamp, 1.7, 0.7);
  const lw = P(58, 120, W.wallZ);
  L.point(lw.x, lw.y, 70 * lw.s, '255,200,140', 0.3 * lamp, 1, 1.2);
  // window: moonlight at night, a warm shaft at dawn
  const wc = P((W.win.x0 + W.win.x1) / 2, (W.win.y0 + W.win.y1) / 2, W.wallZ);
  L.point(wc.x, wc.y, 80 * wc.s, rgbs(skyLow(tod)), 0.5, 1, 1);
  const sk = sunK(tod);
  if (sk > 0.001) {
    const beam = projPoly(cam, [[W.win.x0, 0, -40], [W.win.x1 + 30, 0, -60], [W.win.x1, W.win.y0, W.wallZ], [W.win.x0, W.win.y1, W.wallZ]]);
    L.poly(beam, '255,196,130', 0.5 * sk, 20);
    L.fill('255,190,150', 0.14 * sk);
  }
  if (S.extraLights) S.extraLights(L, cam);
  L.apply();
  addGlow(ctx, sc.x, sc.y, 40 * sc.s, sRGB, 0.16 * scr, 1.2, 0.9);
  if (lamp > 0.01) { const lh = P(58 - 19.5, W.deskY + 25, 50); addGlow(ctx, lh.x, lh.y, 10 * lh.s, '255,230,170', 0.5 * lamp, 1.3, 0.6); }
}
