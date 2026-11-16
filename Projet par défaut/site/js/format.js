/**
 * Formatage des nombres et rendu LaTeX.
 * Règle du projet : virgule décimale, jamais de nom interne à l'écran,
 * unités en \mathrm{}, exposants en \times10^{...}.
 */
const Format = (function () {
  const MINUS = '\u2212';

  function isNum(x) {
    return typeof x === 'number' && isFinite(x);
  }

  /** Nombre en écriture française simple : 0,819 ; −1,2 ; 1 234,5 */
  function num(x, digits) {
    if (!isNum(x)) return '\u2014';
    const d = digits === undefined ? 3 : digits;
    let s = x.toFixed(d);
    s = s.replace('.', ',');
    if (s.charAt(0) === '-') s = MINUS + s.slice(1);
    return s;
  }

  /** Entier avec espace fine insécable comme séparateur de milliers. */
  function int(x) {
    if (!isNum(x)) return '\u2014';
    return Math.round(x).toLocaleString('fr-FR');
  }

  /** Décompose un nombre en mantisse et exposant, arrondi à `sig` chiffres. */
  function roundSig(x, sig) {
    if (x === 0) return { m: 0, e: 0 };
    let e = Math.floor(Math.log10(Math.abs(x)));
    let m = x / Math.pow(10, e);
    m = Number(m.toPrecision(sig));
    if (Math.abs(m) >= 10) {
      m /= 10;
      e += 1;
    }
    return { m: m, e: e };
  }

  function stripZeros(s) {
    if (s.indexOf('.') < 0) return s;
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }

  /** Nombre LaTeX à décimales fixes : texFixed(0.8193, 3) -> "0{,}819" */
  function texFixed(x, digits) {
    if (!isNum(x)) return '\\text{\u2014}';
    const d = digits === undefined ? 3 : digits;
    let s = x.toFixed(d);
    if (Math.abs(x) < Math.pow(10, -d) / 2 && x !== 0) s = (0).toFixed(d);
    s = s.replace('.', '{,}');
    return s;
  }

  /** Nombre LaTeX automatique (fixe si lisible, scientifique sinon). */
  function texAuto(x, sig) {
    if (!isNum(x)) return '\\text{\u2014}';
    const s = sig === undefined ? 3 : sig;
    const a = Math.abs(x);
    if (x === 0) return '0';
    if (a >= 1e-3 && a < 1e5) {
      let t = stripZeros(x.toPrecision(s));
      if (t.indexOf('e') >= 0) t = x.toFixed(6);
      return t.replace('.', '{,}');
    }
    return texSci(x, s);
  }

  /** Notation scientifique LaTeX : texSci(3.199e-5, 3) -> "3{,}20\times10^{-5}" */
  function texSci(x, sig) {
    if (!isNum(x)) return '\\text{\u2014}';
    if (x === 0) return '0';
    const s = sig === undefined ? 3 : sig;
    const r = roundSig(x, s);
    const mant = stripZeros(r.m.toFixed(s - 1)).replace('.', '{,}');
    if (r.e === 0) return mant;
    return mant + '\\times10^{' + r.e + '}';
  }

  /** Choisit fixe ou scientifique selon l'ordre de grandeur. */
  function tex(x, digits) {
    const d = digits === undefined ? 3 : digits;
    if (!isNum(x)) return '\\text{\u2014}';
    if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3)) return texSci(x, d);
    return texFixed(x, d);
  }

  /** Valeur avec unité : "30{,}0\,\mathrm{\mu m}" */
  function texWithUnit(x, digits, unitTex) {
    return tex(x, digits) + (unitTex ? '\\,\\mathrm{' + unitTex + '}' : '');
  }

  /** Angle en degrés depuis des radians. */
  function texDeg(rad, digits) {
    if (!isNum(rad)) return '\\text{\u2014}';
    return texFixed((rad * 180) / Math.PI, digits === undefined ? 2 : digits) + '^{\\circ}';
  }

  /** Pourcentage depuis une fraction. */
  function texPct(x, digits) {
    if (!isNum(x)) return '\\text{\u2014}';
    return texFixed(100 * x, digits === undefined ? 1 : digits) + '\\,\\%';
  }

  /** Rendu KaTeX dans un élément. */
  function render(el, texString, display) {
    if (!el) return;
    if (typeof katex === 'undefined') {
      el.textContent = texString;
      return;
    }
    try {
      katex.render(texString, el, {
        displayMode: !!display,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch (err) {
      el.textContent = texString;
    }
  }

  /** Chaîne HTML KaTeX (pour construire un bloc). */
  function html(texString, display) {
    if (typeof katex === 'undefined') return texString;
    try {
      return katex.renderToString(texString, {
        displayMode: !!display,
        throwOnError: false,
        strict: false,
      });
    } catch (err) {
      return texString;
    }
  }

  /** Échappement HTML pour les textes libres. */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    num: num,
    int: int,
    tex: tex,
    texFixed: texFixed,
    texAuto: texAuto,
    texSci: texSci,
    texWithUnit: texWithUnit,
    texDeg: texDeg,
    texPct: texPct,
    render: render,
    html: html,
    esc: esc,
    MINUS: MINUS,
  };
})();
