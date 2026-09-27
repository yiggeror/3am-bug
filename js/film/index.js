// The film: every shot of 《凌晨三点的 Bug》, in order. renderFrame(ctx, t) draws any moment of it.
import { makeFilm } from '../film.js';
import { TITLES, CREDIT_SHOTS } from './titles.js';
import { S1 } from './s1.js';
import { S2 } from './s2.js';
import { S3 } from './s3.js';
import { S4 } from './s4.js';
import { S5 } from './s5.js';
import { S6 } from './s6.js';

const shots = [...TITLES, ...S1, ...S2, ...S3, ...S4, ...S5, ...S6, ...CREDIT_SHOTS];
// sanity: shots must tile the timeline without gaps or overlaps
for (let i = 1; i < shots.length; i++) {
  if (Math.abs(shots[i].t0 - shots[i - 1].t1) > 1e-6) console.warn(`timeline gap/overlap between ${shots[i - 1].name} (${shots[i - 1].t1}) and ${shots[i].name} (${shots[i].t0})`);
}
export const { SHOTS, DURATION, renderFrame, shotAt } = makeFilm(shots);
