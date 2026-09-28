// Title card and end credits.
import { T } from './times.js';
import { K, onTwos } from './perfkit.js';
import { shot } from './s1.js';
import { drawCube2 } from '../cube2.js';
import { drawBug } from '../bug.js';
import { drawJar } from './cwfx.js';
import { text, ZH_FONT, HAND_FONT, MONO_FONT, setEmoteInk } from '../draw.js';
import { ease, clamp, lerp, hash2 } from '../core.js';
import { blinksAt } from '../anim.js';

function backdrop(ctx, t) {
  ctx.fillStyle = '#0e0f15'; ctx.fillRect(0, 0, 1920, 1080);
  // faint code drifting in the dark
  ctx.save();
  ctx.font = `26px ${MONO_FONT}`; ctx.fillStyle = 'rgba(120,130,170,0.07)';
  const L = ['for (let i = 0; i <= items.length; i++) {', 'total += item.price * item.qty;', 'return formatPrice(total);', 'function applyCoupon(total, c) {', '// TODO: sleep', 'expect(totalPrice(cart)).toBe(42);'];
  for (let i = 0; i < 16; i++) ctx.fillText(L[i % L.length], ((i * 397) % 1500) - 120 + t * (6 + (i % 3) * 3), 60 + i * 64);
  ctx.restore();
  const v = ctx.createRadialGradient(960, 540, 300, 960, 540, 1100);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, 1920, 1080);
}

const TITLE = '凌晨三点的 Bug';
function title(t0, t1) {
  return shot(t0, t1, 'title', (ctx, t) => {
    backdrop(ctx, t);
    const n = Math.floor(clamp((t - 0.8) / 1.5) * TITLE.length + 0.001);
    const s = TITLE.slice(0, n);
    ctx.font = `128px ${ZH_FONT}`;
    const full = ctx.measureText(TITLE).width;
    const x0 = 960 - full / 2, y = 500;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f3ead8';
    ctx.fillText(s, x0, y);
    const w = ctx.measureText(s).width;
    // the terminal cursor
    const on = t < 0.8 || t > 2.3 ? Math.floor(t * 2.2) % 2 === 0 : true;
    if (on && t < 3.2) { ctx.fillStyle = '#f39a62'; ctx.fillRect(x0 + w + 8, y - 100, 14, 112); }
    const sub = clamp((t - 2.4) / 0.6);
    text(ctx, 'The 3 A.M. Bug', 960, 590, { size: 58, font: HAND_FONT, color: `rgba(184,174,156,${sub})`, still: true });
    // the little friend hops onto the "B" of Bug and says hello
    const tc = onTwos(t);
    if (tc > 3.0) {
      ctx.font = `128px ${ZH_FONT}`;
      const bx = x0 + ctx.measureText('凌晨三点的 B').width - 34, by = y - 92;
      const d = tc - 3.0;
      const k = clamp(d / 0.55);
      const S = { size: 92, flip: -1, ink: '#15110f', x: lerp(1960, bx, k), y: lerp(760, by, k) - 360 * 4 * k * (1 - k) };
      if (d < 0.55) { S.sq = -0.2; S.rot = 0.3; S.armL = { a: 1.4 }; S.armR = { a: 1.3 }; S.legSpread = 1; S.eyes = 'wide'; }
      else {
        const l = d - 0.55;
        S.sq = 0.42 * Math.exp(-l * 7) * Math.cos(l * 24);
        S.lookX = K(l, [[0.3, -0.6], [0.8, 0]]); S.lookY = K(l, [[0.3, 0], [0.8, 0.2]]);
        S.blink = blinksAt(tc, [4.7, 5.9]);
        S.eyes = l > 1.0 && l < 1.9 ? 'happy' : 'normal';
        const wv = K(l, [[1.0, 0], [1.25, 1, 'outBack'], [2.0, 1], [2.3, 0]]);
        S.armL = { a: wv * 1.9 + Math.sin(tc * 11) * 0.3 * wv };
      }
      setEmoteInk('#efe5d3');
      drawCube2(ctx, S);
      setEmoteInk(null);
    }
  }, { fadeIn: 0.6, fadeOut: 0.9, noPost: true });
}

// ------------------------------------------------------------------ credits
const CREDITS = [
  ['h', '凌晨三点的 Bug', 'The 3 A.M. Bug'],
  ['gap'],
  ['r', '一部完全由代码逐帧绘制的动画短片', 'A short film drawn frame by frame in code'],
  ['gap'],
  ['r', '人物、小方块、小虫子、房间与代码世界', 'Characters, sets & the code world — Canvas 2D, rendered in headless Chromium'],
  ['r', '音乐：原创配乐 · 房间里是木吉他和颤音琴，代码里是芯片音色', 'Original score: acoustic in the room, chiptune in the code (FluidSynth + synthesis)'],
  ['r', '音效：CC0 素材 + 程序合成', 'Sound effects: CC0 recordings + synthesis (see CREDITS.md)'],
  ['r', '字体：ZCOOL KuaiLe · Patrick Hand · JetBrains Mono（SIL OFL）', 'Fonts under the SIL Open Font License'],
  ['gap'],
  ['r', '献给每一个凌晨三点还在找 bug 的人', 'For everyone still hunting a bug at 3 a.m.'],
  ['gap'],
  ['s', '辛苦了，晚安 :)', ''],
];
function credits(t0, t1) {
  return shot(t0, t1, 'credits', (ctx, t) => {
    const lt = t - t0;
    ctx.fillStyle = '#0e0f15'; ctx.fillRect(0, 0, 1920, 1080);
    // the jar shelf at the bottom of the credits, with tonight's catch
    const tc = onTwos(t);
    ctx.save();
    ctx.translate(1500, 930);
    ctx.fillStyle = '#6b5440'; ctx.fillRect(-260, 0, 520, 14);
    const jars = [['off-by-one', '01:13'], ['undefined', '23:40'], ['FIXED ✓', '04:55']];
    jars.forEach(([lab, tm], i) => {
      const x = -170 + i * 170;
      if (i === 2) drawBug(ctx, { x, y: -12, size: 44, flip: -1, eyes: lt > 9 ? 'closed' : 'sly', mouth: lt > 9 ? 'o' : 'grin', mouthK: 0.4, ant: Math.sin(tc * 3) * 0.4, emote: lt > 9 ? { type: 'zzz', k: clamp((lt - 9) / 1) } : null });
      drawJar(ctx, x, 0, { label: lab, time: tm, lid: 1, s: 0.9, bug: i < 2 ? 'old' : null, big: i === 2, seed: i });
    });
    ctx.restore();
    // scrolling text: paced so the last line settles at the centre of the frame 2.5 s before the end
    const H = CREDITS.reduce((h, [k]) => h + (k === 'gap' ? 60 : k === 'h' ? 160 : k === 's' ? 90 : 110), 0);
    const speed = (1140 + H - 90 - 540) / (t1 - t0 - 2.5);
    let y = 1140 - Math.min(lt, t1 - t0 - 2.5) * speed;
    for (const [kind, zh, en] of CREDITS) {
      if (kind === 'gap') { y += 60; continue; }
      if (kind === 'h') { text(ctx, zh, 760, y, { size: 90, font: ZH_FONT, color: '#f3ead8', still: true }); text(ctx, en, 760, y + 76, { size: 44, font: HAND_FONT, color: '#b8ae9c', still: true }); y += 160; continue; }
      if (kind === 's') { text(ctx, zh, 760, y, { size: 56, font: ZH_FONT, color: '#f39a62', still: true }); y += 90; continue; }
      text(ctx, zh, 760, y, { size: 40, font: ZH_FONT, color: '#e8dfcf', still: true });
      if (en) text(ctx, en, 760, y + 44, { size: 28, font: HAND_FONT, color: '#9d9483', still: true });
      y += 110;
    }
    const f = clamp((t1 - t) / 1.5);
    if (f < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - f})`; ctx.fillRect(0, 0, 1920, 1080); }
  }, { dissolve: 1.2, noPost: true });
}

export const TITLES = [title(T.title, T.titleEnd)];
export const CREDIT_SHOTS = [credits(T.credits, T.filmEnd)];
