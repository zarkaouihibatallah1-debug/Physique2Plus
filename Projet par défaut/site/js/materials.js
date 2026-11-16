/**
 * Bibliothèque de matériaux pédagogiques.
 * Toutes les lois sont écrites avec λ en µm (comme dans le complément au cours, §1).
 * Les valeurs sont ILLUSTRATIVES : aucune n'est mesurée.
 * G(λ) = exp(-((λ - λc)/w)²) est la bande gaussienne.
 */
const C_LIGHT = 299792458; // m/s

function gauss(lamUm, lamc, w) {
  const t = (lamUm - lamc) / w;
  return Math.exp(-t * t);
}

const MATERIALS = {
  A: {
    id: 'A',
    label: 'A — Exemple du cours',
    short: 'Exemple du cours',
    rangeNm: [400, 800],
    color: '#1f4d3a',
    dashed: false,
    desc:
      'Le jeu du §9 : pas de dispersion, contraste maximal entre les deux axes. ' +
      'Sert de référence numérique (T_p = 0,819 ; ER = 44,1 dB à 550 nm et 30 µm).',
    np: function () { return 1.5; },
    nb: function () { return 1.45; },
    kp: function () { return 1.0e-4; },
    kb: function () { return 1.5e-2; },
    texNp: '1{,}50',
    texNb: '1{,}45',
    texKp: '1{,}0\\times10^{-4}',
    texKb: '1{,}5\\times10^{-2}',
  },
  B: {
    id: 'B',
    label: 'B — Colorant (bande visible)',
    short: 'Colorant visible',
    rangeNm: [400, 800],
    color: '#b8822a',
    dashed: false,
    desc:
      'Bande d’absorption centrée à λ_c = 560 nm : le dichroïsme dépend fortement de la longueur d’onde. ' +
      'Lois de Cauchy pour les indices réels.',
    np: function (l) { return 1.52 + 0.004 / (l * l); },
    nb: function (l) { return 1.50 + 0.004 / (l * l); },
    kp: function (l) { return 2.0e-4 + 3.0e-4 * gauss(l, 0.56, 0.12); },
    kb: function (l) { return 5.0e-3 + 2.5e-2 * gauss(l, 0.56, 0.12); },
    texNp: '1{,}52 + \\dfrac{0{,}004}{\\lambda^2}',
    texNb: '1{,}50 + \\dfrac{0{,}004}{\\lambda^2}',
    texKp: '2\\times10^{-4} + 3\\times10^{-4}\\,G(\\lambda)',
    texKb: '5\\times10^{-3} + 2{,}5\\times10^{-2}\\,G(\\lambda)',
    texG: 'G(\\lambda)=\\exp\\!\\left[-\\left(\\dfrac{\\lambda-560\\,\\mathrm{nm}}{120\\,\\mathrm{nm}}\\right)^{2}\\right]',
  },
  C: {
    id: 'C',
    label: 'C — Dichroïsme modéré',
    short: 'Dichroïsme modéré',
    rangeNm: [400, 800],
    color: '#2b5f8a',
    dashed: true,
    desc:
      'Rapport dichroïque D = 10 seulement : le matériau absorbe, mais sélectionne peu. ' +
      'C’est le contre-exemple du cours (perte de plus de la moitié de la lumière à 30 dB).',
    np: function (l) { return 1.55 + 0.005 / (l * l); },
    nb: function (l) { return 1.50 + 0.005 / (l * l); },
    kp: function () { return 1.0e-3; },
    kb: function () { return 1.0e-2; },
    texNp: '1{,}55 + \\dfrac{0{,}005}{\\lambda^2}',
    texNb: '1{,}50 + \\dfrac{0{,}005}{\\lambda^2}',
    texKp: '1\\times10^{-3}',
    texKb: '1\\times10^{-2}',
  },
  D: {
    id: 'D',
    label: 'D — Bande infrarouge',
    short: 'Bande infrarouge',
    rangeNm: [600, 1200],
    color: '#8a3b5f',
    dashed: true,
    desc:
      'Bande à λ_c = 850 nm : matériau conçu pour l’infrarouge proche. ' +
      'D ≈ 340 à λ_c, mais un axe passant très peu absorbant impose une couche plus épaisse.',
    np: function (l) { return 1.50 + 0.004 / (l * l); },
    nb: function (l) { return 1.46 + 0.004 / (l * l); },
    kp: function (l) { return 5.0e-5 + 5.0e-5 * gauss(l, 0.85, 0.18); },
    kb: function (l) { return 4.0e-3 + 3.0e-2 * gauss(l, 0.85, 0.18); },
    texNp: '1{,}50 + \\dfrac{0{,}004}{\\lambda^2}',
    texNb: '1{,}46 + \\dfrac{0{,}004}{\\lambda^2}',
    texKp: '5\\times10^{-5} + 5\\times10^{-5}\\,G(\\lambda)',
    texKb: '4\\times10^{-3} + 3\\times10^{-2}\\,G(\\lambda)',
    texG: 'G(\\lambda)=\\exp\\!\\left[-\\left(\\dfrac{\\lambda-850\\,\\mathrm{nm}}{180\\,\\mathrm{nm}}\\right)^{2}\\right]',
  },
};

const MATERIAL_ORDER = ['A', 'B', 'C', 'D'];

function materialById(id) {
  return MATERIALS[id] || MATERIALS.A;
}

/** Plage de fréquence (THz) correspondant à la plage de validité (nm). */
function nuRangeTHz(mat) {
  const lo = (C_LIGHT / (mat.rangeNm[1] * 1e-9)) / 1e12; // plus basse fréquence = grande longueur d'onde
  const hi = (C_LIGHT / (mat.rangeNm[0] * 1e-9)) / 1e12;
  return [lo, hi];
}

function nmToTHz(nm) {
  return (C_LIGHT / (nm * 1e-9)) / 1e12;
}

function thzToNm(thz) {
  return (C_LIGHT / (thz * 1e12)) * 1e9;
}

/** Indice complexe des deux axes à une longueur d'onde (m). */
function indicesAt(mat, lam0m) {
  const lUm = lam0m * 1e6;
  return {
    np: mat.np(lUm),
    nb: mat.nb(lUm),
    kp: mat.kp(lUm),
    kb: mat.kb(lUm),
  };
}

/** Vérifie qu'une longueur d'onde (m) appartient au domaine de validité. */
function checkRange(mat, lam0m) {
  const nm = lam0m * 1e9;
  const lo = mat.rangeNm[0];
  const hi = mat.rangeNm[1];
  const eps = 1e-6;
  if (!(nm >= lo - eps && nm <= hi + eps)) {
    const err = new Error(
      'Longueur d’onde hors du domaine de validité du matériau ' + mat.id +
      ' (' + lo + '–' + hi + ' nm). Aucune extrapolation n’est faite.'
    );
    err.code = 'OUT_OF_RANGE';
    err.lamNm = nm;
    err.range = [lo, hi];
    throw err;
  }
  return true;
}
