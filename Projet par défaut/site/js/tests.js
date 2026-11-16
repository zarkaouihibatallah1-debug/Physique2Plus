/**
 * Vérifications automatiques.
 * Les 13 tests du cahier de calcul + les 5 contrôles demandés par l'énoncé.
 * Chaque test renvoie un verdict, la valeur attendue et la valeur constatée.
 */
const TESTS = (function () {
  function near(a, b, tol) {
    return isFinite(a) && isFinite(b) && Math.abs(a - b) <= tol;
  }
  function relNear(a, b, tol) {
    return isFinite(a) && isFinite(b) && Math.abs(a - b) <= Math.abs(b) * tol;
  }

  function f(x, d) {
    return Format.texFixed(x, d === undefined ? 3 : d);
  }
  function fe(x, d) {
    return Format.texAuto(x, d === undefined ? 3 : d);
  }

  /** Matériau fictif à deux axes identiques (pour les tests 6 et 13). */
  function sameAxesMaterial() {
    return {
      id: 'T',
      label: 'Matériau fictif',
      short: 'axes identiques',
      rangeNm: [400, 800],
      color: '#666666',
      dashed: false,
      desc: 'Matériau de test : les deux axes ont exactement les mêmes propriétés.',
      np: function () { return 1.5; },
      nb: function () { return 1.5; },
      kp: function () { return 1e-2; },
      kb: function () { return 1e-2; },
      texNp: '1{,}50',
      texNb: '1{,}50',
      texKp: '1{,}00\\times10^{-2}',
      texKb: '1{,}00\\times10^{-2}',
    };
  }

  /** Jeu de paramètres de référence : matériau A, 550 nm, 30 µm, exact. */
  function refParams(extra) {
    return Object.assign(
      {
        mat: 'A',
        nuTHz: nmToTHz(550),
        eUm: 30,
        alphaDeg: 45,
        mode: 'exact',
        ERtarget: 30,
      },
      extra || {}
    );
  }

  const list = [
    {
      id: 1,
      title: 'Référence du cours',
      need:
        '\\text{Matériau A, }550\\,\\mathrm{nm},\\ 30\\,\\mathrm{\\mu m},\\ \\text{mode exact.}',
      expected:
        'T_p = 0{,}819 \\ ;\\ T_b = 3{,}2\\times10^{-5} \\ ;\\ \\mathrm{ER} = 44{,}1\\,\\mathrm{dB} \\ ;\\ \\Delta = 1{,}74\\,\\mathrm{rad}',
      run: function () {
        const r = runAll(refParams());
        const pass =
          near(r.Tp, 0.8193, 5e-4) &&
          relNear(r.Tb, 3.199e-5, 0.02) &&
          near(r.ER, 44.08, 0.15) &&
          near(r.Delta, 1.739, 0.02);
        return {
          pass: pass,
          got:
            'T_p = ' + f(r.Tp, 4) +
            ' \\ ;\\ T_b = ' + fe(r.Tb, 3) +
            ' \\ ;\\ \\mathrm{ER} = ' + f(r.ER, 2) +
            '\\,\\mathrm{dB} \\ ;\\ \\Delta = ' + f(r.Delta, 3) +
            '\\,\\mathrm{rad}',
        };
      },
    },
    {
      id: 2,
      title: 'Puissances entre 0 et 100 %',
      need: '0 \\le T_j \\le 1 sur un grand balayage (matériaux, longueurs d’onde, épaisseurs, modèles).',
      expected: '0 \\le T_j \\le 1',
      run: function () {
        let cases = 0;
        let bad = [];
        const eList = [0.1, 0.5, 1, 3, 10, 30, 100, 300];
        MATERIAL_ORDER.forEach(function (id) {
          const m = materialById(id);
          for (let k = 0; k <= 10; k++) {
            const nm = m.rangeNm[0] + ((m.rangeNm[1] - m.rangeNm[0]) * k) / 10;
            ['direct', 'exact', 'incoh'].forEach(function (mode) {
              eList.forEach(function (eUm) {
                const r = runAll({ mat: id, nuTHz: nmToTHz(nm), eUm: eUm, mode: mode });
                cases += 2;
                [r.Tp, r.Tb].forEach(function (T) {
                  if (!(T >= -1e-12 && T <= 1 + 1e-12)) bad.push([id, nm, eUm, mode, T]);
                });
                if (!(r.Talpha >= -1e-12 && r.Talpha <= 1 + 1e-12)) {
                  bad.push([id, nm, eUm, mode, r.Talpha]);
                }
              });
            });
          }
        });
        return {
          pass: bad.length === 0,
          got:
            Format.int(cases) + '\\ \\text{cas, }' + bad.length + '\\ \\text{violation}',
          note: bad.length
            ? 'Premier cas fautif : matériau ' + bad[0][0] + ', $' + Format.texFixed(bad[0][1], 0) +
              '\\,\\mathrm{nm}$, $' + Format.texFixed(bad[0][2], 1) +
              '\\,\\mathrm{\\mu m}$, mode ' + bad[0][3] + '.'
            : 'Aucune transmission négative ni supérieure à $1$.',
        };
      },
    },
    {
      id: 3,
      title: 'Bilan de puissance en mode exact',
      need: 'A_j = 1 - T_j - R_j \\ge 0',
      expected: 'A_j \\ge 0',
      run: function () {
        let cases = 0;
        let minA = Infinity;
        let bad = 0;
        const eList = [0.1, 1, 3, 10, 30, 100, 300];
        MATERIAL_ORDER.forEach(function (id) {
          const m = materialById(id);
          for (let k = 0; k <= 6; k++) {
            const nm = m.rangeNm[0] + ((m.rangeNm[1] - m.rangeNm[0]) * k) / 6;
            eList.forEach(function (eUm) {
              const r = runAll({ mat: id, nuTHz: nmToTHz(nm), eUm: eUm, mode: 'exact' });
              cases++;
              [r.Ap, r.Ab].forEach(function (A) {
                minA = Math.min(minA, A);
                if (A < -1e-9) bad++;
              });
            });
          }
        });
        return {
          pass: bad === 0,
          got:
            '\\min A_j = ' + fe(minA, 3) + '\\quad (' +
            Format.int(cases) + '\\ \\text{cas})',
          note: bad ? bad + ' bilan(s) négatif(s).' : 'Bilan vérifié sur tous les cas.',
        };
      },
    },
    {
      id: 4,
      title: 'Angle nul : champ aligné sur l’axe passant',
      need: 'T(0^{\\circ}) = T_p \\ ;\\ E_b^{out} = 0',
      expected: 'T(0^{\\circ}) = T_p \\ ;\\ E_b^{out} = 0',
      run: function () {
        const r = runAll(refParams({ alphaDeg: 0 }));
        const pass = near(r.Talpha, r.Tp, 1e-12) && Math.abs(r.EbOut) < 1e-12;
        return {
          pass: pass,
          got:
            'T(0^{\\circ}) = ' + f(r.Talpha, 4) +
            '\\ ;\\ E_b^{out} = ' + fe(r.EbOut, 2),
        };
      },
    },
    {
      id: 5,
      title: 'Angle droit : champ aligné sur l’axe bloquant',
      need: 'T(90^{\\circ}) = T_b \\ ;\\ E_p^{out} = 0',
      expected: 'T(90^{\\circ}) = T_b \\ ;\\ E_p^{out} = 0',
      run: function () {
        const r = runAll(refParams({ alphaDeg: 90 }));
        const pass = near(r.Talpha, r.Tb, 1e-18) && Math.abs(r.EpOut) < 1e-12;
        return {
          pass: pass,
          got:
            'T(90^{\\circ}) = ' + fe(r.Talpha, 3) +
            '\\ ;\\ E_p^{out} = ' + fe(r.EpOut, 2),
        };
      },
    },
    {
      id: 6,
      title: 'Deux axes identiques : aucune sélection',
      need: '\\mathrm{ER} = 0\\,\\mathrm{dB} \\ ;\\ \\Delta = 0\\,\\mathrm{rad} \\ ;\\ \\alpha\' = \\alpha',
      expected: '\\mathrm{ER} = 0\\,\\mathrm{dB} \\ ;\\ \\Delta = 0 \\ ;\\ \\alpha\' = 45^{\\circ}',
      run: function () {
        const r = runAll(refParams({ matObj: sameAxesMaterial() }));
        const pass =
          Math.abs(r.ER) < 1e-9 &&
          Math.abs(r.Delta) < 1e-9 &&
          Math.abs(r.alphaOut - (45 * Math.PI) / 180) < 1e-9;
        return {
          pass: pass,
          got:
            '\\mathrm{ER} = ' + f(r.ER, 2) + '\\,\\mathrm{dB} \\ ;\\ \\Delta = ' +
            f(r.Delta, 2) + '\\,\\mathrm{rad} \\ ;\\ \\alpha\' = ' +
            Format.texDeg(r.alphaOut, 2),
        };
      },
    },
    {
      id: 7,
      title: 'Aucune donnée hors domaine de validité',
      need:
        '\\lambda_0 \\text{ à } 1\\,\\mathrm{nm} \\text{ au-delà des bornes} \\Rightarrow \\text{erreur explicite, pour les 4 matériaux.}',
      expected: '\\text{erreur de plage}',
      run: function () {
        const fails = [];
        MATERIAL_ORDER.forEach(function (id) {
          const m = materialById(id);
          [m.rangeNm[0] - 1, m.rangeNm[1] + 1].forEach(function (nm) {
            let caught = null;
            try {
              runAll({ mat: id, nuTHz: nmToTHz(nm), eUm: 30, mode: 'exact' });
            } catch (err) {
              caught = err;
            }
            if (!caught || caught.code !== 'OUT_OF_RANGE') fails.push(id + '@' + nm);
          });
          // la borne elle-même doit rester autorisée
          [m.rangeNm[0], m.rangeNm[1]].forEach(function (nm) {
            try {
              runAll({ mat: id, nuTHz: nmToTHz(nm), eUm: 30, mode: 'exact' });
            } catch (err) {
              fails.push('borne ' + id + '@' + nm);
            }
          });
        });
        return {
          pass: fails.length === 0,
          got:
            fails.length === 0
              ? '4\\ \\text{matériaux : } 8\\ \\text{refus, } 8\\ \\text{bornes acceptées}'
              : '\\text{échec : }' + Format.esc(fails.join(', ')),
          note:
            'Les bornes exactes restent autorisées ; un nanomètre au-delà est refusé avec un message explicite.',
        };
      },
    },
    {
      id: 8,
      title: 'Limite de Treussart (ñ = 1)',
      need: '\\tilde n = 1 \\Rightarrow \\tau = e^{i\\varphi} \\ ;\\ T = 1',
      expected: '|\\tau| = 1 \\ ;\\ T = 1',
      run: function () {
        const N = { re: 1, im: 0 };
        const fr = fresnel(N);
        const ph = phase(N, 30e-6, 550e-9, 0);
        const tr = transmission(fr, ph, 'exact');
        const pass = Math.abs(tr.T - 1) < 1e-12 && Math.abs(Cx.abs(tr.tau) - 1) < 1e-12;
        return {
          pass: pass,
          got:
            '|\\tau| = ' + f(Cx.abs(tr.tau), 6) + '\\ ;\\ T = ' + f(tr.T, 6),
        };
      },
    },
    {
      id: 9,
      title: 'Moyenne de la formule exacte = formule incohérente',
      need: '\\langle T^{\\mathrm{exact}} \\rangle_{\\varphi\'} = T^{\\mathrm{inc}}',
      expected: 'T^{\\mathrm{inc}} = 0{,}86175 \\ \\text{(forme fermée)}',
      run: function () {
        const N = { re: 1.5, im: 0.02 };
        const lam = 550e-9;
        const e = 30e-6;
        const gamma = (4 * Math.PI * N.im) / lam;
        const fr = fresnel(N);
        const ph = phase(N, e, lam, gamma);
        const inc = transmission(fr, ph, 'incoh').T;
        let sum = 0;
        const n = 4000;
        for (let k = 0; k < n; k++) {
          const phiPrime = (2 * Math.PI * k) / n;
          const phi = { re: phiPrime, im: ph.phi.im };
          sum += transmission(fr, { phi: phi, att: ph.att }, 'exact').T;
        }
        const mean = sum / n;
        const pass = Math.abs(mean - inc) < 2e-3;
        return {
          pass: pass,
          got:
            '\\langle T\\rangle = ' + f(mean, 5) + '\\ ;\\ T^{\\mathrm{inc}} = ' + f(inc, 5),
        };
      },
    },
    {
      id: 10,
      title: 'Loi de Malus généralisée',
      need: 'T(\\alpha) = T_p\\cos^2\\alpha + T_b\\sin^2\\alpha',
      expected:
        '0{,}819 \\ ;\\ 0{,}615 \\ ;\\ 0{,}410 \\ ;\\ 0{,}205 \\ ;\\ 0{,}025 \\ ;\\ 3{,}2\\times10^{-5}',
      run: function () {
        const alphas = [0, 30, 45, 60, 80, 90];
        const expect = [0.819, 0.615, 0.41, 0.205, 0.025, 3.2e-5];
        const got = alphas.map(function (a) {
          return runAll(refParams({ alphaDeg: a })).Talpha;
        });
        const pass = got.every(function (v, i) {
          return i === 5 ? relNear(v, expect[i], 0.05) : near(v, expect[i], 1.5e-3);
        });
        return {
          pass: pass,
          got: got
            .map(function (v) {
              return fe(v, 3);
            })
            .join('\\ ;\\ '),
          note: 'Valeurs pour $\\alpha = 0$, $30$, $45$, $60$, $80$ et $90^{\\circ}$.',
        };
      },
    },
    {
      id: 11,
      title: 'Polarisation de sortie à 45 degrés',
      need: '\\chi = 0{,}35^{\\circ} \\ ;\\ \\alpha\' = 0{,}36^{\\circ}',
      expected: '\\chi = 0{,}353^{\\circ} \\ ;\\ \\alpha\' = 0{,}358^{\\circ}',
      run: function () {
        const r = runAll(refParams({ alphaDeg: 45 }));
        const chiDeg = (r.chi * 180) / Math.PI;
        const aDeg = (r.alphaOut * 180) / Math.PI;
        const pass = near(chiDeg, 0.353, 0.03) && near(aDeg, 0.358, 0.03);
        return {
          pass: pass,
          got:
            '\\chi = ' + f(chiDeg, 3) + '^{\\circ} \\ ;\\ \\alpha\' = ' + f(aDeg, 3) + '^{\\circ}',
        };
      },
    },
    {
      id: 12,
      title: 'Couche très fine',
      need: 'e \\to 0 \\Rightarrow T \\to 1 \\ ;\\ \\mathrm{ER} \\to 0',
      expected: 'T \\approx 1 \\ ;\\ \\mathrm{ER} \\approx 0',
      run: function () {
        const r = runAll(refParams({ eUm: 0.001 }));
        const pass = r.Tp > 0.999 && Math.abs(r.ER) < 0.2;
        return {
          pass: pass,
          got:
            'T_p = ' + f(r.Tp, 4) + '\\ ;\\ \\mathrm{ER} = ' + f(r.ER, 3) + '\\,\\mathrm{dB}',
        };
      },
    },
    {
      id: 13,
      title: 'D = 1 : pas de division par zéro',
      need: '\\text{message « aucun polariseur », pas de valeur non finie}',
      expected: '\\text{« aucun polariseur »}',
      run: function () {
        const r = runAll(refParams({ matObj: sameAxesMaterial() }));
        const finite =
          isFinite(r.ER) && isFinite(r.DOP) && isFinite(r.IL) && isFinite(r.q);
        const flagged = r.warnings.some(function (w) {
          return /aucun polariseur/i.test(w.text);
        });
        const pass = finite && flagged && r.canPolarize === false && !isFinite(r.eStar);
        return {
          pass: pass,
          got:
            '\\mathrm{ER} = ' + f(r.ER, 2) + '\\,\\mathrm{dB} \\ ;\\ D = ' + f(r.D, 1) +
            '\\ ;\\ e^{*} = \\infty',
          note: pass ? 'Message affiché, aucune valeur non finie.' : 'Protection incomplète.',
        };
      },
    },
  ];

  /** Les 5 contrôles explicitement demandés par l'énoncé. */
  const ENONCE = [
    {
      label: 'Les transmissions en puissance sont comprises entre 0 et 100 %.',
      tests: [2],
    },
    {
      label: 'À angle nul, le champ incident est aligné sur l’axe passant.',
      tests: [4],
    },
    {
      label: 'À angle droit, il est aligné sur l’axe bloquant.',
      tests: [5],
    },
    {
      label: 'Si les deux axes ont les mêmes propriétés, le matériau ne sélectionne aucune polarisation.',
      tests: [6, 13],
    },
    {
      label: 'Aucune donnée n’est utilisée en dehors de son domaine de validité.',
      tests: [7],
    },
  ];

  function runAllTests() {
    return list.map(function (t) {
      let out;
      try {
        out = t.run();
      } catch (err) {
        out = {
          pass: false,
          got: '\\text{erreur : }' + Format.esc(err && err.message ? err.message : String(err)),
        };
      }
      return {
        id: t.id,
        title: t.title,
        need: t.need,
        expected: t.expected,
        pass: !!out.pass,
        got: out.got,
        note: out.note || '',
      };
    });
  }

  return {
    list: list,
    enonce: ENONCE,
    run: runAllTests,
  };
})();
