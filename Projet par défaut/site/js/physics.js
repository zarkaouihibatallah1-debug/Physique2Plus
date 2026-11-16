/**
 * Chaîne de calcul complète du polariseur dichroïque.
 * Une fonction par étape, mêmes noms que la nomenclature du cahier de calcul.
 * Aucune formule ne vit dans l'interface : tout passe par runAll().
 */
const DB_PER_NEPER = 10 / Math.LN10; // 4,342 944 819...
const T_FLOOR = 1e-12;               // plancher sur T_b (compl. §6)
const T_MIN_GOOD = 0.5;              // seuil du verdict (proposition)

/** e^{i z} pour z complexe. */
function czexp(z) {
  const damp = Math.exp(-z.im);
  return { re: damp * Math.cos(z.re), im: damp * Math.sin(z.re) };
}

const DEFAULT_PARAMS = {
  mat: 'A',
  nuTHz: 545.07,
  eUm: 30,
  alphaDeg: 45,
  mode: 'exact',
  ERtarget: 30,
};

/* ------------------------------------------------------------------ */
/* Étapes 1 à 3 : fréquence, indices, grandeurs dérivées              */
/* ------------------------------------------------------------------ */

function wavelength(nuTHz) {
  const lam0 = C_LIGHT / (nuTHz * 1e12);
  return { lam0: lam0, k0: (2 * Math.PI) / lam0, omega: 2 * Math.PI * nuTHz * 1e12 };
}

function complexIndices(mat, lam0) {
  const idx = indicesAt(mat, lam0);
  return {
    np: idx.np,
    nb: idx.nb,
    kp: idx.kp,
    kb: idx.kb,
    Np: { re: idx.np, im: idx.kp },
    Nb: { re: idx.nb, im: idx.kb },
  };
}

function derived(Np, Nb, lam0) {
  const gammaP = (4 * Math.PI * Np.im) / lam0;
  const gammaB = (4 * Math.PI * Nb.im) / lam0;
  return {
    epsP: Cx.sq(Np),
    epsB: Cx.sq(Nb),
    gammaP: gammaP,
    gammaB: gammaB,
    deltaP: 1 / gammaP,
    deltaB: 1 / gammaB,
    D: Nb.im / Np.im,
  };
}

/* ------------------------------------------------------------------ */
/* Étape 4 : coefficients de Fresnel                                  */
/* ------------------------------------------------------------------ */

function fresnel(N) {
  const one = { re: 1, im: 0 };
  const rho = Cx.div(Cx.sub(N, one), Cx.add(N, one));
  const t12 = Cx.div({ re: 2, im: 0 }, Cx.add(one, N));
  const t23 = Cx.div(Cx.scale(N, 2), Cx.add(one, N));
  const oneMinusRho2 = Cx.sub(one, Cx.sq(rho));
  return {
    rho: rho,
    rho2: Cx.sq(rho),
    t12: t12,
    t23: t23,
    oneMinusRho2: oneMinusRho2,
    F: Cx.abs2(oneMinusRho2),
  };
}

/* ------------------------------------------------------------------ */
/* Étape 5 : phase et atténuation dans la couche                       */
/* ------------------------------------------------------------------ */

function phase(N, e, lam0, gamma) {
  const phi = Cx.scale(N, (2 * Math.PI * e) / lam0);
  return { phi: phi, att: Math.exp(-gamma * e) };
}

/* ------------------------------------------------------------------ */
/* Étape 6 et 7 : transmission en champ puis puissances                */
/* ------------------------------------------------------------------ */

function transmission(fr, ph, mode) {
  const one = { re: 1, im: 0 };
  const expIPhi = czexp(ph.phi);
  const expI2Phi = czexp({ re: 2 * ph.phi.re, im: 2 * ph.phi.im });

  if (mode === 'incoh') {
    const att = Math.exp(-2 * Cx.abs(ph.phi.im) * 1); // e^{-γe} = |e^{iφ}|²
    // Forme fermée exacte (compl. §5), valable pour tout κ.
    const rho4 = Math.pow(Cx.abs2(fr.rho), 2);
    const T = (fr.F * Math.exp(-2 * ph.phi.im)) / (1 - rho4 * Math.exp(-4 * ph.phi.im));
    return { tau: null, T: T, R: Cx.abs2(fr.rho), A: 1 - T - Cx.abs2(fr.rho) };
  }

  let tau;
  if (mode === 'direct') {
    tau = Cx.mul(fr.oneMinusRho2, expIPhi);
  } else {
    const denom = Cx.sub(one, Cx.mul(fr.rho2, expI2Phi));
    tau = Cx.div(Cx.mul(fr.oneMinusRho2, expIPhi), denom);
  }

  let R;
  if (mode === 'direct') {
    R = Cx.abs2(fr.rho);
  } else {
    const denom = Cx.sub(one, Cx.mul(fr.rho2, expI2Phi));
    const r = Cx.div(Cx.mul(fr.rho, Cx.sub(expI2Phi, one)), denom);
    R = Cx.abs2(r);
  }
  const T = Cx.abs2(tau);
  return { tau: tau, T: T, R: R, A: 1 - T - R };
}

/* ------------------------------------------------------------------ */
/* Étape 8 : performances propres                                      */
/* ------------------------------------------------------------------ */

function indicators(Tp, Tb, tauP, tauB) {
  const tpSafe = Math.max(Tp, T_FLOOR);
  const tbSafe = Math.max(Tb, T_FLOOR);
  const ER = 10 * Math.log10(tpSafe / tbSafe);
  return {
    ER: ER,
    ERfloorReached: Tb < T_FLOOR,
    DOP: (Tp - Tb) / (Tp + Tb),
    IL: -10 * Math.log10(tpSafe),
    q: Math.sqrt(tbSafe / tpSafe),
    qField:
      tauP && tauB ? Cx.abs(tauB) / Cx.abs(tauP) : Math.sqrt(tbSafe / tpSafe),
  };
}

/** Verdict pédagogique : ne pas confondre extinction et transmission. */
function verdict(ER, Tp, ERtarget) {
  const enough = ER >= ERtarget;
  const bright = Tp >= T_MIN_GOOD;
  if (enough && bright) {
    return { code: 'good', label: 'Bon polariseur', tone: 'good' };
  }
  if (enough && !bright) {
    return {
      code: 'dim',
      label: 'Extinction suffisante, lumière trop atténuée',
      tone: 'warn',
    };
  }
  if (!enough && bright) {
    return {
      code: 'leaky',
      label: 'Transmission correcte, sélection insuffisante',
      tone: 'warn',
    };
  }
  return { code: 'none', label: 'Ni sélectif, ni transparent', tone: 'bad' };
}

/* ------------------------------------------------------------------ */
/* Étape 9 : effet de l'orientation                                    */
/* ------------------------------------------------------------------ */

function orientation(alpha, tauP, tauB, Tp, Tb, Rp, Rb) {
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  const ap = tauP ? Cx.abs(tauP) : Math.sqrt(Math.max(Tp, 0));
  const ab = tauB ? Cx.abs(tauB) : Math.sqrt(Math.max(Tb, 0));
  const T = Tp * ca * ca + Tb * sa * sa;
  return {
    EpIn: ca,
    EbIn: sa,
    EpOut: ap * ca,
    EbOut: ab * sa,
    Talpha: T,
    PtransPct: 100 * T,
    Ralpha: Rp * ca * ca + Rb * sa * sa,
    Aalpha: (1 - Tp - Rp) * ca * ca + (1 - Tb - Rb) * sa * sa,
    Tnatural: 0.5 * (Tp + Tb),
  };
}

/* ------------------------------------------------------------------ */
/* Étape 10 : polarisation de sortie                                   */
/* ------------------------------------------------------------------ */

function outputPolarization(alpha, tauP, tauB) {
  if (!tauP || !tauB) {
    return { defined: false, u: NaN, w: NaN, Delta: NaN, psi: NaN, chi: NaN };
  }
  const u = Cx.abs(tauP) * Math.cos(alpha);
  const w = Cx.abs(tauB) * Math.sin(alpha);
  const Delta = wrapPi(Cx.arg(tauB) - Cx.arg(tauP));
  const psi = 0.5 * Math.atan2(2 * u * w * Math.cos(Delta), u * u - w * w);
  const s = (2 * u * w * Math.sin(Delta)) / (u * u + w * w);
  const chi = 0.5 * Math.asin(Math.max(-1, Math.min(1, s)));
  return { defined: true, u: u, w: w, Delta: Delta, psi: psi, chi: chi };
}

/* ------------------------------------------------------------------ */
/* Étape 11 : compromis extinction / transmission                      */
/* ------------------------------------------------------------------ */

function compromise(gammaP, gammaB, Fp, ERtarget) {
  const D = gammaB / gammaP;
  const ILabs = DB_PER_NEPER * gammaP; // par unité de longueur
  const canPolarize = Math.abs(D - 1) > 1e-12;
  const TpAbs = canPolarize ? Math.pow(10, -ERtarget / (10 * (D - 1))) : NaN;
  const eStar = canPolarize ? ERtarget / (DB_PER_NEPER * (gammaB - gammaP)) : Infinity;
  return {
    D: D,
    ILabsPerM: ILabs,
    TpAbs: TpAbs,
    eStar: eStar,
    TpStar: Fp * TpAbs,
    canPolarize: canPolarize,
  };
}

/* ------------------------------------------------------------------ */
/* Point d'entrée unique                                              */
/* ------------------------------------------------------------------ */

function runAll(p) {
  const params = Object.assign({}, DEFAULT_PARAMS, p);
  const mat = params.matObj || materialById(params.mat);
  const wl = wavelength(params.nuTHz);
  const lam0 = wl.lam0;
  checkRange(mat, lam0);

  const e = params.eUm * 1e-6;
  const alpha = (params.alphaDeg * Math.PI) / 180;

  const ind = complexIndices(mat, lam0);
  const der = derived(ind.Np, ind.Nb, lam0);
  const frP = fresnel(ind.Np);
  const frB = fresnel(ind.Nb);
  const phP = phase(ind.Np, e, lam0, der.gammaP);
  const phB = phase(ind.Nb, e, lam0, der.gammaB);
  const trP = transmission(frP, phP, params.mode);
  const trB = transmission(frB, phB, params.mode);

  const perf = indicators(trP.T, trB.T, trP.tau, trB.tau);
  const ori = orientation(alpha, trP.tau, trB.tau, trP.T, trB.T, trP.R, trB.R);
  const pol = outputPolarization(alpha, trP.tau, trB.tau);
  const comp = compromise(der.gammaP, der.gammaB, frP.F, params.ERtarget);

  const alphaOut = Math.atan(perf.q * Math.tan(alpha));

  const result = {
    params: params,
    mat: mat,

    // Étape 1
    lam0: lam0,
    lamNm: lam0 * 1e9,
    k0: wl.k0,

    // Étape 2
    np: ind.np,
    nb: ind.nb,
    kappaP: ind.kp,
    kappaB: ind.kb,
    Np: ind.Np,
    Nb: ind.Nb,

    // Étape 3
    epsP: der.epsP,
    epsB: der.epsB,
    gammaP: der.gammaP,
    gammaB: der.gammaB,
    deltaP: der.deltaP,
    deltaB: der.deltaB,
    D: der.D,

    // Étape 4
    rhoP: frP.rho,
    rhoB: frB.rho,
    Fp: frP.F,
    Fb: frB.F,
    t12P: frP.t12,
    t12B: frB.t12,
    t23P: frP.t23,
    t23B: frB.t23,

    // Étape 5
    phiP: phP.phi,
    phiB: phB.phi,
    attP: phP.att,
    attB: phB.att,

    // Étape 6 et 7
    tauP: trP.tau,
    tauB: trB.tau,
    Tp: trP.T,
    Tb: trB.T,
    Rp: trP.R,
    Rb: trB.R,
    Ap: trP.A,
    Ab: trB.A,

    // Étape 8
    ER: perf.ER,
    ERfloorReached: perf.ERfloorReached,
    DOP: perf.DOP,
    IL: perf.IL,
    q: perf.q,
    qField: perf.qField,
    verdict: verdict(perf.ER, trP.T, params.ERtarget),

    // Étape 9
    EpIn: ori.EpIn,
    EbIn: ori.EbIn,
    EpOut: ori.EpOut,
    EbOut: ori.EbOut,
    Talpha: ori.Talpha,
    PtransPct: ori.PtransPct,
    Ralpha: ori.Ralpha,
    Aalpha: ori.Aalpha,
    Tnatural: ori.Tnatural,

    // Étape 10
    u: pol.u,
    w: pol.w,
    Delta: pol.Delta,
    psi: pol.psi,
    chi: pol.chi,
    polDefined: pol.defined,
    alphaOut: pol.defined ? alphaOut : NaN,

    // Étape 11
    ILabsPerM: comp.ILabsPerM,
    TpAbs: comp.TpAbs,
    eStar: comp.eStar,
    TpStar: comp.TpStar,
    canPolarize: comp.canPolarize,

    // Divers
    gammaPe: der.gammaP * e,
    gammaBe: der.gammaB * e,
    periodNm:
      params.mode === 'exact'
        ? Math.pow(lam0 * 1e9, 2) / (2 * ind.np * e * 1e9)
        : null,
  };

  result.warnings = buildWarnings(result);
  return result;
}

function buildWarnings(r) {
  const w = [];
  if (r.params.mode === 'direct') {
    w.push({
      tone: 'info',
      text:
        'Mode direct : les réflexions multiples sont négligées. Le bilan $T+R+A=1$ n’est qu’approché.',
    });
  }
  if (r.params.mode === 'incoh') {
    w.push({
      tone: 'info',
      text:
        'Mode incohérent : la phase $\\Delta$ n’est pas définie, la polarisation de sortie n’a pas de sens.',
    });
  }
  if (r.params.mode === 'exact' && r.periodNm) {
    w.push({
      tone: 'info',
      text:
        'Mode exact : l’axe passant oscille (Fabry-Pérot) avec une période $\\Delta\\lambda \\approx ' +
        Format.texFixed(r.periodNm, 1) + '\\,\\mathrm{nm}$. Les balayages doivent être fins.',
    });
  }
  if (r.ERfloorReached) {
    w.push({
      tone: 'warn',
      text:
        '$T_b$ est sous le plancher : $\\mathrm{ER}$ est affiché comme une borne inférieure.',
    });
  }
  if (!r.canPolarize) {
    w.push({
      tone: 'bad',
      text: '$D=1$ : les deux axes sont identiques, aucun polariseur.',
    });
  }
  if (r.Ab < -1e-9 || r.Ap < -1e-9) {
    w.push({
      tone: 'warn',
      text:
        'Bilan approché : $A$ devient légèrement négatif (modes direct ou incohérent).',
    });
  }
  return w;
}

/* ------------------------------------------------------------------ */
/* Étape 12 : balayages (vectorisation)                                */
/* ------------------------------------------------------------------ */

function sweepE(base, eList) {
  return eList.map(function (eUm) {
    const r = runAll(Object.assign({}, base, { eUm: eUm }));
    return { x: eUm, ER: r.ER, Tp: r.Tp, Tb: r.Tb, Talpha: r.Talpha };
  });
}

function sweepLam(base, nmList) {
  return nmList.map(function (nm) {
    const r = runAll(Object.assign({}, base, { nuTHz: nmToTHz(nm) }));
    return { x: nm, ER: r.ER, Tp: r.Tp, Tb: r.Tb };
  });
}

function sweepAlpha(base, degList) {
  return degList.map(function (a) {
    const r = runAll(Object.assign({}, base, { alphaDeg: a }));
    return { x: a, Talpha: r.Talpha, Tp: r.Tp, Tb: r.Tb };
  });
}

/** Grille (e, λ) pour la carte d'extinction. */
function sweepMap(base, eList, nmList) {
  const rows = [];
  for (let j = 0; j < eList.length; j++) {
    const row = [];
    for (let i = 0; i < nmList.length; i++) {
      try {
        const r = runAll(Object.assign({}, base, { eUm: eList[j], nuTHz: nmToTHz(nmList[i]) }));
        row.push({ ER: r.ER, Tp: r.Tp });
      } catch (err) {
        row.push({ ER: NaN, Tp: NaN });
      }
    }
    rows.push(row);
  }
  return rows;
}

/** Plage de longueurs d'onde commune à plusieurs matériaux. */
function commonRange(ids) {
  let lo = 0;
  let hi = Infinity;
  ids.forEach(function (id) {
    const m = materialById(id);
    lo = Math.max(lo, m.rangeNm[0]);
    hi = Math.min(hi, m.rangeNm[1]);
  });
  return lo < hi ? [lo, hi] : null;
}
