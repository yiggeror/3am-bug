// Character design sheet for one proposal: views, hands, expressions, palette and notes.
import { C, text, rect, line, shape, ellipse, circle, rectPts, setBoil, brush, ZH_FONT, HAND_FONT, MONO_FONT } from './draw.js';
import { Fig } from './figure.js';
import { drawFront, drawBack, drawSide, inkFor } from './human/body.js';
import { drawHand } from './human/hand.js';
import { chairBack, chairSide, deskSide, monitorFront, DESK_Y } from './furniture.js';
import { drawCube, cube } from './cube.js';
import { chain, tr, rot, sc } from './mat.js';

export const SHEET_W = 2400, SHEET_H = 1720;
const PAPER = '#f6f0e4';
const INKC = '#2b2622';

function label(ctx, zh, en, x, y) {
  text(ctx, zh, x, y, { size: 34, font: ZH_FONT, still: true });
  text(ctx, en, x, y + 38, { size: 26, color: '#6d645a', still: true });
}

// desk + keyboard seen from the monitor (added into the figure so the arms rest on them)
function frontDesk(D) {
  return (fig, z) => {
    fig.add('desk', [[-70, DESK_Y + 1.5], [70, DESK_Y + 1.5], [70, 30], [-70, 30]], { fill: '#dcc19b', z, edge: true, sharp: true, noOutline: true });
    fig.add('kb', [[-22.5, DESK_Y + 2.5], [22.5, DESK_Y + 2.5], [24, DESK_Y + 9.5], [-24, DESK_Y + 9.5]], { fill: '#ebe5da', z: z + 0.1, edge: true, sharp: true });
    fig.after((c) => {
      c.fillStyle = '#d6cebf';
      for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
        const y = DESK_Y + 3.4 + r * 2.1, x = -21 + i * 3.6 + (r % 2) * 0.8;
        c.beginPath(); c.roundRect(x, y, 2.9, 1.5, 0.4); c.fill();
      }
    }, z + 0.2, ['kb']);
  };
}

function termScreen(c, w, h) {
  c.fillStyle = '#1f2029'; c.fillRect(0, 0, w, h);
  const lines = [['$ npm test', '#e8e1d3'], ['✗ totalPrice() sums the cart', '#ef6f6c'], ['✗ applies coupon once', '#ef6f6c'], ['✓ formats currency', '#8ccf8a']];
  c.font = `2.2px ${MONO_FONT}`; c.textBaseline = 'top';
  lines.forEach(([s, col], i) => { c.fillStyle = col; c.fillText(s, 2.2, 2.2 + i * 3.4); });
  drawCube(c, cube({ x: w * 0.72, y: h - 3, size: 6.5, eyes: 'normal', lookX: -0.6, armR: { a: 1.2 } }));
}

const EXPR = [
  ['平常', 'neutral', { face: { lid: 0.12, mouth: 'line' } }],
  ['疲惫', 'tired', { face: { lid: 0.5, bags: 1, mouth: 'flat', brow: 0.35 }, hair: { mess: 0.45 }, head: { tilt: -0.06 } }],
  ['烦躁', 'frustrated', { face: { lid: 0.28, brow: -0.9, mouth: 'grit', bags: 0.6 }, hair: { mess: 0.65 } }],
  ['惊讶', 'surprised', { face: { eyes: 'wide', brow: 0.5, browY: 1, mouth: 'o', mouthK: 0.8 }, hair: { sway: -0.5 } }],
  ['专注', 'focused', { face: { lid: 0.32, brow: -0.35, look: [0.5, 0.3], mouth: 'pout' }, head: { nod: 0.2 } }],
  ['不好意思', 'oops', { face: { eyes: 'squeeze', mouth: 'wavy', sweat: 1, blush: 0.5 }, head: { tilt: 0.1 } }],
  ['欢呼', 'yes!', { face: { eyes: 'happy', mouth: 'open', blush: 0.7, brow: 0.3 }, hair: { sway: 0.4 } }],
  ['睡着', 'asleep', { face: { eyes: 'closed', mouth: 'o', mouthK: 0.25, drool: 0.7, blush: 0.25 }, hair: { mess: 0.9 }, head: { tilt: 0.22, nod: 0.3, turn: -0.15 } }],
];

export function drawSheet(ctx, D, t = 0) {
  setBoil(t);
  ctx.save();
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SHEET_W, SHEET_H);
  // faint paper margin line like the reference sheet
  ctx.strokeStyle = 'rgba(200,120,90,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(44, SHEET_H); ctx.stroke();

  // ---------------- title
  text(ctx, D.title, 90, 92, { size: 70, font: ZH_FONT, align: 'left', still: true });
  text(ctx, `(${D.en})`, 96, 160, { size: 38, align: 'left', color: '#6d645a', still: true });
  D.blurb.forEach((s, i) => text(ctx, s, 96, 222 + i * 40, { size: 28, font: ZH_FONT, align: 'left', still: true, color: '#3d3630' }));
  // palette
  const sw = [['卫衣', D.hoodie], ['头发', D.hair], ['皮肤', D.skin], ['裤子', D.pants], [D.hat ? '帽子' : '帽绳', D.hat ? D.beanie : D.strings]];
  sw.forEach(([n, col], i) => {
    const x = 1520 + i * 150, y = 70;
    rect(ctx, x, y, 96, 70, { r: 12, fill: col, lw: 3, seed: 900 + i });
    text(ctx, n, x + 48, y + 100, { size: 26, font: ZH_FONT, still: true });
  });
  text(ctx, '一整块柔软的形体', 1880, 250, { size: 36, font: ZH_FONT, rot: -0.06, still: true, color: '#3d3630' });
  text(ctx, '→ 用轮廓整体变形来动', 1900, 298, { size: 32, font: ZH_FONT, rot: -0.06, still: true, color: '#3d3630' });
  brush(ctx, [[1700, 330], [1900, 322], [2110, 300]], { lw: 3, seed: 5 });

  // ---------------- row 1: front / back / side
  // FRONT bust at the desk (seen from the monitor)
  ctx.save();
  ctx.beginPath(); ctx.roundRect(90, 350, 600, 640, 30); ctx.clip();
  ctx.fillStyle = '#efe6d4'; ctx.fillRect(90, 350, 600, 640);
  ctx.translate(390, 1110); ctx.scale(7.6, 7.6);
  drawFront(ctx, { face: { lid: 0.1, mouth: 'smile', look: [0, 0.2] }, breath: 0.3 }, D, { desk: frontDesk(D) });
  ctx.restore();
  label(ctx, '正面半身', 'Front · at the desk', 390, 1025);

  // BACK, seated, chair in front of him
  ctx.save();
  ctx.translate(1010, 765); ctx.scale(5.0, 5.0);
  drawBack(ctx, {}, D);
  chairBack(ctx);
  ctx.restore();
  label(ctx, '背影坐姿', 'Back · seated', 1010, 1025);

  // SIDE with chair, desk, keyboard, monitor
  ctx.save();
  ctx.translate(1560, 765); ctx.scale(5.0, 5.0);
  chairSide(ctx);
  deskSide(ctx);
  drawSide(ctx, { face: { lid: 0.15, mouth: 'line' } }, D);
  ctx.restore();
  label(ctx, '侧面坐姿', 'Side · typing', 1760, 1025);
  text(ctx, '座面 47cm · 桌面 74cm', 2190, 640, { size: 24, font: ZH_FONT, still: true, color: '#6d645a' });
  text(ctx, '手落在键盘上', 2190, 676, { size: 24, font: ZH_FONT, still: true, color: '#6d645a' });

  // ---------------- row 2: hands
  text(ctx, '手部', 96, 1112, { size: 34, font: ZH_FONT, align: 'left', still: true });
  text(ctx, 'Hands', 170, 1116, { size: 26, align: 'left', color: '#6d645a', still: true });
  const hands = [
    ['打字', { view: 'side', curl: 0.85 }, 0],
    ['放松', { view: 'back', curl: 0.2, spread: 0.3, thumb: 0.4 }, 0.25],
    ['抓头发', { view: 'back', curl: 0.7, spread: 0.5, thumb: 0.5 }, -1.2],
    ['欢呼', { view: 'palm', curl: 0.02, spread: 0.9, thumb: 0.9 }, -1.45],
  ];
  hands.forEach(([n, hp, a], i) => {
    const x = 170 + i * 162, y = 1235;
    ctx.save(); ctx.translate(x, y); ctx.scale(9.5, 9.5);
    const fig = new Fig(ctx, { lw: 3.2, seed: 40 + i });
    fig.add('cuff', chainPts([[-6, -3.1], [0.6, -3.0], [0.9, 3.0], [-6, 3.1]], a, -4.5), { fill: D.hoodie, z: 1, edge: true });
    drawHand(fig, chain(rot(a), tr(-4.2, 0)), D, hp, 0, 'h');
    fig.draw();
    ctx.restore();
    text(ctx, n, x + 5, 1400, { size: 26, font: ZH_FONT, still: true });
  });

  // ---------------- row 2: expressions
  text(ctx, '表情', 790, 1112, { size: 34, font: ZH_FONT, align: 'left', still: true });
  text(ctx, 'Expressions', 864, 1116, { size: 26, align: 'left', color: '#6d645a', still: true });
  EXPR.forEach(([zh, en, P], i) => {
    const x = 880 + i * 190, y = 1250;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x - 88, y - 105, 176, 205, 26); ctx.clip();
    ctx.fillStyle = '#efe6d4'; ctx.fillRect(x - 88, y - 105, 176, 205);
    ctx.translate(x, y + 360); ctx.scale(5.6, 5.6);
    drawFront(ctx, { ...P, armL: { hand: [-11, 10] }, armR: { hand: [11, 10] } }, D);
    ctx.restore();
    text(ctx, zh, x, y + 132, { size: 28, font: ZH_FONT, still: true });
    text(ctx, en, x, y + 166, { size: 22, still: true, color: '#6d645a' });
  });

  // ---------------- row 3: notes + scale with the little friend
  text(ctx, '为什么好动画：', 96, 1500, { size: 32, font: ZH_FONT, align: 'left', still: true });
  D.notes.forEach((s, i) => text(ctx, '· ' + s, 110, 1552 + i * 42, { size: 27, font: ZH_FONT, align: 'left', still: true, color: '#3d3630' }));
  // the little friend standing on the back of his hand (true scale: ~4.5 cm)
  ctx.save();
  ctx.translate(1640, 1630); ctx.scale(16, 16);
  const fig = new Fig(ctx, { lw: 3.4, seed: 77 });
  fig.add('cuff', [[-16, -4], [-7.6, -3.7], [-7.3, 3.7], [-16, 4]], { fill: D.hoodie, z: 1, edge: true });
  drawHand(fig, chain(tr(-8, 0), sc(1, 1)), D, { view: 'back', curl: 0.12, spread: 0.25, thumb: 0.3 }, 0, 'h');
  fig.draw();
  drawCube(ctx, cube({ x: -3.2, y: -3.3, size: 4.6, eyes: 'happy', blush: 0.6, armR: { a: 1.1 }, armL: { a: 0.3 } }));
  ctx.restore();
  text(ctx, '小方块 ≈ 4.5cm：', 2000, 1540, { size: 28, font: ZH_FONT, align: 'left', still: true });
  text(ctx, '和他的手一样大', 2000, 1582, { size: 28, font: ZH_FONT, align: 'left', still: true });
  text(ctx, '(同一套线条)', 2000, 1624, { size: 26, font: ZH_FONT, align: 'left', still: true, color: '#6d645a' });
  ctx.restore();
}

function chainPts(pts, a, dx) {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [x + dx, y]).map(([x, y]) => [x * c - y * s, x * s + y * c]);
}
