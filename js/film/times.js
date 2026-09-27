// Story beats (seconds). Shared by every shot, the screen/code timelines and the sound mix.
export const T = {
  // 0 · title
  title: 0, titleEnd: 6.6,
  // 1 · 02:50 — red again and again
  wide1: 6.6, ots1: 13.4, save1: 14.4, run1: 16.0, fail1: 17.4, keys1: 19.6, run2: 23.0, fail2: 23.7,
  scr1: 23.2, face1: 26.2, cubeWorry: 33.0, face2: 37.2, side1: 45.0, headDown: 50.6, garbage: 53.0,
  // 2 · the little friend dives in
  resolve: 58.4, jump: 63.2, into: 64.6, cwReveal: 67.4, bugAppear: 73.4, chase0: 78.6,
  // 3 · working together
  glitch: 82.0, situp: 85.2, otsSee: 88.0, face3: 93.0, search: 98.0, searchHit: 103.0, lunge1: 107.2,
  log: 112.0, lantern: 117.0, maze: 122.0, oops: 128.0, collapse: 134.6, hit: 136.4, undo: 142.0, rewind: 144.2,
  near2: 152.0, quiet: 160.0, wave: 172.0,
  // 4 · closing in
  idea: 178.0, bp1: 182.0, bp2: 186.0, pin: 189.0, advance: 192.0, disguise: 200.0, pounce: 206.6, caught: 207.6, fixed: 214.0,
  // 5 · all green
  enter: 218.0, green: 221.0, cheer: 228.0, jar: 235.0,
  // 6 · dawn
  sunrise: 245.0, sleep: 251.0, goodnight: 262.0, final: 274.0, end: 281.0,
  // 7 · credits
  credits: 281.0, filmEnd: 296.0,
};
export const NIGHT = { tod0: 0.0 };
// time of day across the story (0 = 02:50 … 1 = sunrise)
export function todAt(t) {
  const k = [[0, 0.0], [60, 0.08], [160, 0.35], [178, 0.5], [218, 0.68], [245, 0.86], [262, 0.97], [296, 1.0]];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * u; }
  return 1;
}
// wall-clock minutes after midnight shown on the clocks (02:50 → 05:44)
export function clockAt(t) {
  const k = [[0, 170], [60, 176], [82, 190], [160, 250], [178, 262], [214, 292], [245, 318], [296, 344]];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * u; }
  return 344;
}
// the empty cups pile up; his hair gets messier
export const cupsAt = (t) => (t < 150 ? 4 : t < 240 ? 5 : 6);
export const messAt = (t) => Math.min(1, 0.35 + t / 330);
