// The film: every shot of 《凌晨三点的 Bug》, in order. renderFrame(ctx, t) draws any moment of it.
import { makeFilm } from '../film.js';
import { TITLES, CREDIT_SHOTS } from './titles.js';
import { S1 } from './s1.js';
import { S2 } from './s2.js';
import { S3 } from './s3.js';

const shots = [...TITLES, ...S1, ...S2, ...S3, ...CREDIT_SHOTS];
export const { SHOTS, DURATION, renderFrame, shotAt } = makeFilm(shots);
