// SIDE set: the programmer in profile at his desk (facing +x). 2D layout in body centimetres
// (origin = seat centre, +y down) with parallax layers for depth: the far (right) wall with the
// bookshelf and clock, the floor, the desk wall with the window's light coming in from the right.
import { C, rect, line, shape, ellipse, circle, rectPts, ellipsePts, text, brush, softShadow, curScale, ZH_FONT, HAND_FONT } from '../draw.js';
import { Fig } from '../figure.js';
import { drawSide, inkFor } from '../human/body.js';
import { chairSide, DESK_Y, DESK_FRONT, SEAT_H } from '../furniture.js';
import { mugSide, lampSide, monitorSide, keyboardSide } from './props.js';
import { LightMap, addGlow } from '../light.js';
import { ambient, sunK, rgbs, skyMid, skyLow, clockMinutes, stars } from './tod.js';
import { clamp, lerp, hash2, noise1, TAU } from '../core.js';

export const SIDE_D = 300;          // camera distance to the character's plane (cm)
export const DESK_BACK = 92;        // body-x of the desk wall
export const FAR = 170;             // depth of the far wall
export const MON_X = 57;
export const CUP_SPOTS = [[68, 32], [76, -22], [85, 6], [63, -40], [80, 44], [71, -6], [87, -32]]; // [x, depth]

export function sideProj(cam) {
  const f = cam.zoom * SIDE_D;
  const s = (d) => f / (SIDE_D + d);
  return {
    s,
    // screen position of body point p at depth d
    P: (x, y, d = 0) => [960 + (x - cam.x) * s(d), 540 + (y - cam.y) * s(d)],
    layer: (ctx, d, fn) => { const k = s(d); ctx.save(); ctx.translate(960 - cam.x * k, 540 - cam.y * k); ctx.scale(k, k); fn(ctx, k); ctx.restore(); },
  };
}

// S: { t, tod, lamp, screen (0..1), screenRGB, cups, human: { P, D }, chairTilt, wallClock, dust }
export function drawSideSet(ctx, S, cam, o = {}) {
  const pj = sideProj(cam);
  const { P, layer } = pj;
  const tod = S.tod ?? 0;
  // ---------------- far wall
  layer(ctx, FAR, (c) => {
    c.fillStyle = '#e8dcc6'; c.fillRect(-600, -400, 1400, 480);
    // wallpaper stripes
    c.fillStyle = 'rgba(210,190,160,0.25)';
    for (let x = -600; x < 800; x += 18) c.fillRect(x, -400, 7, 447);
    // baseboard
    c.fillStyle = '#d9c9ae'; c.fillRect(-600, 38, 1400, 9);
    const fig = new Fig(c, { lw: inkFor(pj.s(FAR)) * 0.8, seed: 601 });
    // bookshelf
    fig.add('shelf', rectPts(-150, -40, 90, 87, 1, 2), { fill: '#c9a47a', z: 0, sharp: true });
    for (let r = 0; r < 3; r++) fig.line([[-148, -12 + r * 29], [-62, -12 + r * 29]], { z: 0.5, lw: 2.2, brush: false });
    const cols = ['#e2574c', '#8fb3d9', '#f6d365', '#9bc59d', '#e8a26b', '#b9a5d6', '#7f9dba', '#e9e2d4'];
    for (let r = 0; r < 3; r++) {
      let x = -146;
      for (let i = 0; i < 9; i++) {
        const w = 5 + hash2(i, r + 3) * 4, h = 16 + hash2(i, r + 9) * 8;
        if (x + w > -64) break;
        fig.add(`b${r}${i}`, rectPts(x, -14 + r * 29 - h, w, h, 0.5, 2), { fill: cols[(i + r * 3) % 8], z: 1 + i * 0.01, edge: true });
        x += w + 0.6;
      }
    }
    // plant on the shelf
    fig.add('pot', [[-120, -40], [-104, -40], [-106, -52], [-118, -52]], { fill: '#e7b98f', z: 1 });
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin((S.t || 0) * 0.5 + i) * 0.02;
      const L = 18 + i % 2 * 5;
      fig.line([[-112, -51], [-112 + Math.cos(a) * L * 0.6, -51 + Math.sin(a) * L * 0.6 - 3], [-112 + Math.cos(a) * L, -51 + Math.sin(a) * L]], { z: 0.8, lw: 4.5, color: '#6f9e72', brush: 'out' });
    }
    // clock (shows the real time of the story)
    const mins = S.clock ?? clockMinutes(tod);
    fig.add('clock', ellipsePts(10, -150, 16, 16, 28), { fill: '#fffaf0', z: 0 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; fig.line([[10 + Math.cos(a) * 12.5, -150 + Math.sin(a) * 12.5], [10 + Math.cos(a) * 14.2, -150 + Math.sin(a) * 14.2]], { z: 0.2, lw: 1.8, brush: false }); }
    const ha = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2, ma = ((mins % 60) / 60) * TAU - Math.PI / 2;
    fig.line([[10, -150], [10 + Math.cos(ha) * 7.5, -150 + Math.sin(ha) * 7.5]], { z: 0.3, lw: 4, brush: 'out' });
    fig.line([[10, -150], [10 + Math.cos(ma) * 11.5, -150 + Math.sin(ma) * 11.5]], { z: 0.3, lw: 3, brush: 'out' });
    // poster: a doodle of the little friend he drew once
    fig.add('poster', rectPts(90, -190, 46, 60, 1, 2), { fill: '#fbf6ea', z: 0 });
    fig.add('pcube', rectPts(100, -165, 26, 17, 2, 1), { fill: C.orange, z: 0.5, edge: true });
    fig.line([[107, -160], [107, -155]], { z: 0.6, lw: 3.5, brush: false });
    fig.line([[119, -160], [119, -155]], { z: 0.6, lw: 3.5, brush: false });
    fig.after((cc) => text(cc, 'ship it!', 113, -177, { size: 7, font: HAND_FONT, color: '#e8743b' }), 1);
    fig.draw();
  });
  // ---------------- floor between the far wall and us
  {
    const yFar = P(0, SEAT_H, FAR)[1];
    const g = ctx.createLinearGradient(0, yFar, 0, 1080);
    g.addColorStop(0, '#b8966e'); g.addColorStop(1, '#caa57a');
    ctx.fillStyle = g; ctx.fillRect(0, yFar, 1920, 1080 - yFar);
    ctx.strokeStyle = 'rgba(90,60,40,0.28)'; ctx.lineWidth = 2;
    for (const d of [140, 105, 72, 42, 14, -12, -36, -58, -80]) { const y = P(0, SEAT_H, d)[1]; if (y > 1090) continue; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1920, y); ctx.stroke(); }
    // rug under the chair
    const r0 = P(-30, SEAT_H, 60), r1 = P(60, SEAT_H, -60);
    ctx.fillStyle = 'rgba(126,150,170,0.55)';
    ctx.beginPath(); ctx.ellipse((r0[0] + r1[0]) / 2, (r0[1] + r1[1]) / 2, Math.abs(r1[0] - r0[0]) * 0.6, Math.abs(r1[1] - r0[1]) * 0.5, 0, 0, TAU); ctx.fill();
  }
  // ---------------- desk wall (the wall the desk stands against), seen edge-on to the right
  {
    const top = -213, bot = SEAT_H;
    const a0 = P(DESK_BACK, top, FAR), a1 = P(DESK_BACK, bot, FAR), b0 = P(DESK_BACK, top, -180), b1 = P(DESK_BACK, bot, -180);
    ctx.fillStyle = '#e3d5bd';
    ctx.beginPath(); ctx.moveTo(...a0); ctx.lineTo(...b0); ctx.lineTo(...b1); ctx.lineTo(...a1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,30,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...a0); ctx.lineTo(...a1); ctx.stroke();
    // the window on that wall (between depth -130 and -50): a bright slanted panel
    const w0 = P(DESK_BACK, -160, -50), w1 = P(DESK_BACK, -60, -50), w2 = P(DESK_BACK, -60, -130), w3 = P(DESK_BACK, -160, -130);
    const g = ctx.createLinearGradient(0, w0[1], 0, w1[1]);
    g.addColorStop(0, `rgb(${rgbs(skyMid(tod))})`); g.addColorStop(1, `rgb(${rgbs(skyLow(tod))})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...w0); ctx.lineTo(...w1); ctx.lineTo(...w2); ctx.lineTo(...w3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#efe4d0'; ctx.lineWidth = 7 * pj.s(-90) / 7; ctx.stroke();
    ctx.strokeStyle = 'rgba(43,38,34,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    const m0 = P(DESK_BACK, -160, -90), m1 = P(DESK_BACK, -60, -90);
    ctx.strokeStyle = '#efe4d0'; ctx.lineWidth = 5 * pj.s(-90) / 7; ctx.beginPath(); ctx.moveTo(...m0); ctx.lineTo(...m1); ctx.stroke();
  }
  // ---------------- desk and what is on it (behind the character's plane first)
  const cups = S.cups ?? 3;
  const cupList = CUP_SPOTS.slice(0, cups).map(([x, d], i) => ({ x, d, i })).sort((a, b) => b.d - a.d);
  const drawCup = (cp) => layer(ctx, cp.d, (c) => { c.save(); c.translate(cp.x, DESK_Y); mugSide(c, cp.i, 0.2 + 0.1 * clamp((cam.y - DESK_Y) / -40)); c.restore(); });
  // lamp at the far side
  layer(ctx, 55, (c) => { c.save(); c.translate(88, DESK_Y); lampSide(c, S.lamp ?? 1); c.restore(); });
  for (const cp of cupList) if (cp.d > 0) drawCup(cp);
  layer(ctx, 0, (c) => {
    const fig = new Fig(c, { lw: inkFor(pj.s(0)) * 0.95, seed: 611 });
    const x0 = DESK_FRONT, x1 = DESK_BACK, y = DESK_Y;
    fig.add('slab', [[x0, y], [x1 + 5, y], [x1 + 5, y + 3.6], [x0, y + 3.6]], { fill: C.wood, z: 0, sharp: true });
    fig.add('apron', [[x0 + 3, y + 3.4], [x1, y + 3.4], [x1, y + 10], [x0 + 3, y + 10]], { fill: C.woodDark, z: -1, sharp: true });
    fig.add('leg', [[x1 - 8, y + 3], [x1 - 3, y + 3], [x1 - 3, SEAT_H], [x1 - 8, SEAT_H]], { fill: C.woodDark, z: -1, sharp: true });
    fig.line([[x0 + 1, y + 1.4], [x1 + 3, y + 1.4]], { z: 0.1, lw: 1.6, color: C.woodDark, brush: false, alpha: 0.6 });
    fig.draw();
    c.save(); c.translate(MON_X, y); monitorSide(c); c.restore();
    c.save(); c.translate(23, y); keyboardSide(c, { press: S.kbPress }); c.restore();
    // mouse
    const mf = new Fig(c, { lw: inkFor(pj.s(0)) * 0.9, seed: 620 });
    mf.add('mouse', [[43, y], [50, y], [49.4, y - 2.2], [46.5, y - 3.2], [43.6, y - 1.8]], { fill: '#efe9df', z: 0 });
    mf.draw();
  });
  // chair, then the character
  const hum = S.human;
  layer(ctx, 0, (c) => { chairSide(c, { tilt: S.chairTilt || 0 }); });
  // desk-front things that he can touch (drawn inside his figure so arms rest on them) — none needed in profile
  let hfig = null;
  if (hum) layer(ctx, 0, (c) => { hfig = drawSide(c, hum.P, hum.D, { lights: hum.lights, seed: 31 }); });
  for (const cp of cupList) if (cp.d <= 0) drawCup(cp);
  if (o.after) layer(ctx, 0, (c) => o.after(c, pj));
  // ---------------- light
  lightSide(ctx, S, pj);
}

function lightSide(ctx, S, pj) {
  const { P } = pj;
  const tod = S.tod ?? 0;
  const L = new LightMap(ctx, `rgb(${rgbs(ambient(tod))})`);
  const scr = S.screen ?? 1;
  const sRGB = S.screenRGB || '170,190,255';
  const k = pj.s(0);
  // monitor light: strongest in front of the screen, falling on his face and hands
  const sc = P(MON_X - 3, DESK_Y - 30, 0);
  L.point(sc[0] - 38 * k, sc[1] + 4 * k, 90 * k, sRGB, 0.72 * scr, 1.25, 0.9);
  L.point(sc[0] - 60 * k, sc[1] - 5 * k, 70 * k, sRGB, 0.45 * scr, 1.2, 1.1);
  // desk lamp: a warm pool on the desk
  const lp = P(68, DESK_Y - 6, 30);
  L.point(lp[0], lp[1], 62 * k, '255,214,150', 0.65 * (S.lamp ?? 1), 1.7, 0.7);
  L.point(lp[0] - 20 * k, lp[1] - 25 * k, 90 * k, '255,200,140', 0.25 * (S.lamp ?? 1), 1.2, 1);
  // dawn: sun through the window from the right
  const sk = sunK(tod);
  if (sk > 0.001) {
    const a = P(DESK_BACK, -150, -80), b = P(DESK_BACK, -60, -80);
    const beam = [a, b, P(-10, 0, -60), P(-40, -90, -60)];
    L.poly(beam, '255,200,130', 0.55 * sk, 26 * k / 7);
    L.fill('255,190,150', 0.12 * sk);
  }
  if (S.extraLights) S.extraLights(L, pj);
  L.apply();
  // emissive: the screen's bright edge
  addGlow(ctx, sc[0] - 3 * k, sc[1], 22 * k, sRGB, 0.08 * scr, 0.25, 1.2);
  if ((S.lamp ?? 1) > 0.01) { const lh = P(68, DESK_Y - 24, 55); addGlow(ctx, lh[0], lh[1], 14 * k, '255,230,170', 0.5 * (S.lamp ?? 1), 1.3, 0.8); }
  // dust in the sunbeam
  if (sk > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const u = hash2(i, 3), v = hash2(i, 7);
      const tt = (S.t || 0) * (0.02 + hash2(i, 9) * 0.03);
      const x = lerp(P(-40, 0, 0)[0], P(DESK_BACK, 0, 0)[0], (u + tt) % 1);
      const y = lerp(P(0, -140, 0)[1], P(0, 10, 0)[1], (v + noise1(tt * 20 + i, 4) * 0.03 + 1) % 1);
      const r = (0.6 + hash2(i, 11) * 1.6) * (k / 7);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin((S.t || 0) * (0.5 + hash2(i, 13)) + i));
      ctx.fillStyle = `rgba(255,230,190,${0.35 * sk * tw})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}
