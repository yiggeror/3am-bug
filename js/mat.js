// Tiny 2D affine helpers. A matrix is [a, b, c, d, e, f] as in canvas: x' = a x + c y + e, y' = b x + d y + f.
export const I = [1, 0, 0, 1, 0, 0];
export function mul(A, B) {
  return [
    A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
  ];
}
export const tr = (x, y) => [1, 0, 0, 1, x, y];
export const rot = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
export const sc = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
export const shearX = (k) => [1, 0, k, 1, 0, 0];
export function chain(...ms) { return ms.reduce((A, B) => mul(A, B), I); }
export function ap(M, p) { return [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]]; }
export function apAll(M, pts) { return pts.map((p) => ap(M, p)); }
export function scaleOf(M) { return Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])); }
export function inv(M) {
  const det = M[0] * M[3] - M[1] * M[2];
  const a = M[3] / det, b = -M[1] / det, c = -M[2] / det, d = M[0] / det;
  return [a, b, c, d, -(a * M[4] + c * M[5]), -(b * M[4] + d * M[5])];
}
