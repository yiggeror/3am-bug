// Export everything the sound needs from the animation itself → production/build/cues.json
//   node production/tools/export_cues.mjs
// Story beats, the shot list (so ambience follows the picture), every keystroke (close-ups and body
// shots, computed from the same functions that move his fingers), the code world's choreography cues.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const J = (p) => import(path.join(root, 'js', p));

const { T } = await J('film/times.js');
const { TYPE, PIN_TYPE, MSG, screenLight } = await J('film/code.js');
const { SHOTS, DURATION } = await J('film/index.js');
const { strokes } = await J('film/perfkit.js');
const { CW_CUES, CUBE_PATH, BUG_PATH, cubePos } = await J('film/cw.js');
const { GATES, BLOCKS } = await J('film/cwfx.js');
const { EV1 } = await J('film/s1.js');
const { EV_F } = await J('film/s3.js');
const { EV_PIN } = await J('film/s4.js');
const { EV } = await J('film/s5.js');
const { LEAP_END } = await J('film/screen_content.js');

// ------------------------------------------------------------------ shots → what kind of space we are in
const kindOf = (n) => (n.startsWith('cw') ? 'cw' : n.startsWith('keys') ? 'keys' : /^(scr|worry|garbage|resolve|pov)/.test(n) ? 'screen' : n === 'title' || n === 'credits' ? 'card' : 'room');
const shots = SHOTS.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1, kind: kindOf(s.name) }));

// ------------------------------------------------------------------ keystrokes
const keys = [];
const keyKind = (ch) => (ch === '\n' ? 'enter' : ch === ' ' ? 'space' : ch === '\b' ? 'bs' : 'key');
for (const ev of [EV1, EV_F, EV_PIN, EV]) for (const [t, ch] of ev) keys.push({ t, kind: keyKind(ch), ch, src: 'close' });
// chords (ctrl + key): the modifier goes down first
for (const [t, k] of [[20.35, 'z'], [20.62, 'z'], [T.search + 0.45, 'f'], [TYPE.undo, 'z'], [TYPE.undo + 0.55, 'z'], [T.pin + 0.04, 'f']]) {
  keys.push({ t: t - 0.02, kind: 'mod', ch: 'ctrl', src: 'close' });
  keys.push({ t: t + 0.05, kind: 'key', ch: k, src: 'close' });
}
keys.push({ t: 14.4, kind: 'mod', ch: 'ctrl', src: 'body' }, { t: 14.45, kind: 'key', ch: 's', src: 'body' });
keys.push({ t: 16.0, kind: 'enter', ch: '\n', src: 'body' });            // npm test ⏎ (over the shoulder)
keys.push({ t: 116.85, kind: 'enter', ch: '\n', src: 'body' });          // console.log ⏎
keys.push({ t: 131.6, kind: 'bs', ch: '\b', src: 'close', hold: TYPE.bsEnd - 131.6 });
// body-view typing: the same pulse functions that drive the arms (rising edges of the key presses)
const wins = [
  // [seed, t0, t1, cps, gain]
  [5, 6.6, 9.2, 7, 1], [6, 6.6, 9.2, 7, 1], [5, 12.6, 15.1, 6, 1], [6, 12.6, 15.1, 6, 1],
  [9, 13.4, 14.15, 7, 1], [10, 13.4, 14.15, 7, 1], [9, 15.0, 15.7, 10, 1], [10, 15.0, 15.7, 10, 1],
  [40, 26.2, 26.5, 5, 0.8], [42, 26.2, 26.5, 5, 0.8],
  [30, 43.4, 45.0, 3, 0.6, 33.6], [32, 43.4, 45.0, 3, 0.6, 33.6],   // (evaluated in the shot's local time)
  [60, 113.6, 114.3, 8, 1], [62, 113.6, 114.3, 8, 1],
  [71, 114.3, 116.8, 9, 1], [72, 114.3, 116.8, 9, 1],
  [80, 128.0, 130.1, 12, 0.35], [82, 128.0, 130.1, 12, 0.35],     // finger drumming
  [131, 217.4, 218, 6, 1], [132, 217.4, 218, 6, 1],
];
const strokeHits = [];
for (const [seed, a, b, cps, gain, off = 0] of wins) {
  let prev = 0;
  for (let t = a; t <= b; t += 1 / 1000) {
    const v = strokes(t - off, seed, a - off, b - off, cps);
    if (v > 0.8 && prev < 0.3) strokeHits.push({ t: +t.toFixed(3), gain, seed });
    prev = v;
  }
}
strokeHits.sort((x, y) => x.t - y.t);

// ------------------------------------------------------------------ code world
const cubeRuns = CUBE_PATH.filter((s) => s.type === 'run').map((s) => ({ t0: s.t0, t1: s.t1, dist: Math.abs(s.p1[0] - s.p0[0]) }));
const bugRuns = BUG_PATH.filter((s) => s.type === 'run').map((s) => ({ t0: s.t0, t1: s.t1, dist: Math.abs(s.p1[0] - s.p0[0]) }));
// the little friend's footfalls while running (its walk phase crosses whole steps)
const cubeSteps = [];
for (const r of cubeRuns) {
  let prev = 0;
  for (let t = r.t0; t < r.t1; t += 1 / 200) { const p = cubePos(t); const ph = Math.floor((p.dist || 0) / (112 * 0.34) * 2); if (ph !== prev) cubeSteps.push(+t.toFixed(3)); prev = ph; }
}

// the screen's glitch flicker (magenta surges in the room light) → digital tears in the sound
const glitches = [];
for (let f = Math.round(81.5 * 12); f < 88 * 12; f++) {
  const t = f / 12, [r, g] = screenLight(t), k = (r - 190) / 50;
  if (k > 0.25) glitches.push({ t: +t.toFixed(3), k: +Math.min(1, k).toFixed(2) });
}

const out = {
  T, DURATION, TYPE, PIN_TYPE, LEAP_END, MSG, glitches,
  shots, keys: keys.sort((a, b) => a.t - b.t), strokes: strokeHits,
  cw: CW_CUES.sort((a, b) => a.t - b.t), cubeRuns, bugRuns, cubeSteps,
  gates: GATES.map((g) => g.t), blocks: BLOCKS.map((b) => ({ t: b.t, txt: b.txt, hitsCube: !!b.hitsCube })),
};
fs.mkdirSync(path.join(root, 'production/build'), { recursive: true });
fs.writeFileSync(path.join(root, 'production/build/cues.json'), JSON.stringify(out, null, 1));
console.log(`cues: ${shots.length} shots, ${out.keys.length} keys, ${strokeHits.length} body strokes, ${out.cw.length} cw cues, ${cubeSteps.length} cube steps`);
