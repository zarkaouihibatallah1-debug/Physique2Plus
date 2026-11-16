/**
 * Nombres complexes minimalistes.
 * Convention de phase du cours : e^{i(kz - wt)}, donc ñ = n + i·κ avec κ ≥ 0.
 */
const Cx = {
  c(re, im) {
    return { re: re, im: im === undefined ? 0 : im };
  },
  fromRe(x) {
    return { re: x, im: 0 };
  },
  add(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
  },
  sub(a, b) {
    return { re: a.re - b.re, im: a.im - b.im };
  },
  mul(a, b) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
  },
  div(a, b) {
    const d = b.re * b.re + b.im * b.im;
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  },
  scale(a, k) {
    return { re: a.re * k, im: a.im * k };
  },
  neg(a) {
    return { re: -a.re, im: -a.im };
  },
  conj(a) {
    return { re: a.re, im: -a.im };
  },
  sq(a) {
    return Cx.mul(a, a);
  },
  abs(a) {
    return Math.hypot(a.re, a.im);
  },
  abs2(a) {
    return a.re * a.re + a.im * a.im;
  },
  arg(a) {
    return Math.atan2(a.im, a.re);
  },
  expi(phi) {
    return { re: Math.cos(phi), im: Math.sin(phi) };
  },
  isFinite(a) {
    return Number.isFinite(a.re) && Number.isFinite(a.im);
  },
};

/** Ramène un angle dans ]-π, π]. */
function wrapPi(x) {
  let a = Math.atan2(Math.sin(x), Math.cos(x));
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Écart angulaire minimal entre deux angles (rad). */
function angDiff(a, b) {
  return wrapPi(a - b);
}
