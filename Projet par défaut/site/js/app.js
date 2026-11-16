/**
 * Application : état partagé, routage par ancre, rail de réglages,
 * et contenu des neuf parties. Aucune formule ici : tout vient de physics.js.
 */
(function () {
  'use strict';

  const partEl = document.getElementById('part');
  const railEl = document.getElementById('rail');
  const navEl = document.getElementById('nav');

  const STORE_KEY = 'polariseur-dichroique-v1';
  const MODES = ['direct', 'exact', 'incoh'];
  const MODE_LABEL = {
    direct: 'Modèle direct',
    exact: 'Modèle exact',
    incoh: 'Modèle incohérent',
  };

  const S = {
    params: Object.assign({}, DEFAULT_PARAMS),
    error: null,
    focusDial: null,
    testResults: null,
  };

  /* ------------------------------------------------------------------ */
  /* Petits utilitaires d'écriture                                       */
  /* ------------------------------------------------------------------ */

  function M(tex, display) {
    return Format.html(tex, display);
  }

  function lv(key) {
    return '<span data-live="' + key + '"></span>';
  }

  function esc(s) {
    return Format.esc(s);
  }

  function card(title, sub, inner, cls) {
    return (
      '<section class="card ' + (cls || '') + '">' +
      (title ? '<h2>' + title + '</h2>' : '') +
      (sub ? '<p class="sub">' + sub + '</p>' : '') +
      inner +
      '</section>'
    );
  }

  function ind(labelTex, key, hint, tone) {
    return (
      '<div class="ind ' + (tone || '') + '">' +
      '<span class="lbl">' + M(labelTex) + '</span>' +
      '<span class="val">' + lv(key) + '</span>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') +
      '</div>'
    );
  }

  function note(tone, tag, inner) {
    return (
      '<div class="note ' + tone + '"><span class="tag">' + tag + '</span><div>' + inner + '</div></div>'
    );
  }

  function eqBlock(tex, noteText) {
    return (
      '<div class="eq">' + M(tex, true) +
      (noteText ? '<span class="eq-note">' + noteText + '</span>' : '') +
      '</div>'
    );
  }

  function table(head, rows, numFrom) {
    const nf = numFrom === undefined ? 1 : numFrom;
    return (
      '<div class="table-wrap"><table><thead><tr>' +
      head
        .map(function (h, i) {
          return '<th' + (i >= nf ? ' class="num"' : '') + '>' + h + '</th>';
        })
        .join('') +
      '</tr></thead><tbody>' +
      (Array.isArray(rows) ? rows.join('') : rows) +
      '</tbody></table></div>'
    );
  }

  function td(inner, num) {
    return '<td' + (num ? ' class="num"' : '') + '>' + inner + '</td>';
  }

  function figureCard(id, title, hint, foot) {
    return (
      '<section class="card figure">' +
      '<div class="figure-head"><h3>' + title + '</h3>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') +
      '</div>' +
      '<div class="figure-body" data-schematic id="' + id + '"></div>' +
      (foot ? '<div class="figure-foot">' + foot + '</div>' : '') +
      '</section>'
    );
  }

  function kvRow(labelTex, key) {
    return '<dt>' + M(labelTex) + '</dt><dd>' + lv(key) + '</dd>';
  }

  /* ------------------------------------------------------------------ */
  /* Valeurs affichées en direct                                        */
  /* ------------------------------------------------------------------ */

  const LIVE = {
    lamNmU: function (r) { return Format.texFixed(r.lamNm, 0) + '\\,\\mathrm{nm}'; },
    eUmU: function (r) { return Format.texFixed(r.params.eUm, 1) + '\\,\\mathrm{\\mu m}'; },
    alphaDegU: function (r) { return Format.texFixed(r.params.alphaDeg, 0) + '^{\\circ}'; },
    np: function (r) { return Format.texFixed(r.np, 3); },
    nb: function (r) { return Format.texFixed(r.nb, 3); },
    kp: function (r) { return Format.texSci(r.kappaP, 2); },
    kb: function (r) { return Format.texSci(r.kappaB, 2); },
    D: function (r) { return Format.texFixed(r.D, 2); },
    gammaPU: function (r) { return Format.texSci(r.gammaP, 3) + '\\,\\mathrm{m^{-1}}'; },
    gammaBU: function (r) { return Format.texSci(r.gammaB, 3) + '\\,\\mathrm{m^{-1}}'; },
    deltaPU: function (r) { return Format.texSci(r.deltaP * 1e6, 2) + '\\,\\mathrm{\\mu m}'; },
    deltaBU: function (r) { return Format.texSci(r.deltaB * 1e6, 2) + '\\,\\mathrm{\\mu m}'; },
    gammaPe: function (r) { return Format.texFixed(r.gammaPe, 3); },
    gammaBe: function (r) { return Format.texFixed(r.gammaBe, 2); },
    rhoP: function (r) { return Format.texFixed(Cx.abs(r.rhoP), 3); },
    rhoB: function (r) { return Format.texFixed(Cx.abs(r.rhoB), 3); },
    rhoParg: function (r) { return Format.texDeg(Cx.arg(r.rhoP), 1); },
    rhoBarg: function (r) { return Format.texDeg(Cx.arg(r.rhoB), 1); },
    Fp: function (r) { return Format.texFixed(r.Fp, 3); },
    Fb: function (r) { return Format.texFixed(r.Fb, 3); },
    phiP: function (r) { return Format.texFixed(r.phiP.re, 3); },
    phiB: function (r) { return Format.texFixed(r.phiB.re, 3); },
    phiPim: function (r) { return Format.texFixed(r.phiP.im, 3); },
    phiBim: function (r) { return Format.texFixed(r.phiB.im, 3); },
    attP: function (r) { return Format.texSci(r.attP, 3); },
    attB: function (r) { return Format.texSci(r.attB, 3); },
    absTauP: function (r) { return r.tauP ? Format.texSci(Cx.abs(r.tauP), 3) : '\\text{---}'; },
    absTauB: function (r) { return r.tauB ? Format.texSci(Cx.abs(r.tauB), 3) : '\\text{---}'; },
    Tp: function (r) { return Format.texFixed(r.Tp, 4); },
    Tb: function (r) { return Format.texSci(r.Tb, 3); },
    TpPct: function (r) { return Format.texPct(r.Tp, 2); },
    TbPct: function (r) { return Format.texPct(r.Tb, 4); },
    Rp: function (r) { return Format.texFixed(r.Rp, 4); },
    Rb: function (r) { return Format.texFixed(r.Rb, 4); },
    Ap: function (r) { return Format.texFixed(r.Ap, 4); },
    Ab: function (r) { return Format.texFixed(r.Ab, 4); },
    TalphaPct: function (r) { return Format.texPct(r.Talpha, r.Talpha < 1e-4 ? 4 : 2); },
    RalphaPct: function (r) { return Format.texPct(r.Ralpha, 2); },
    AalphaPct: function (r) { return Format.texPct(r.Aalpha, 2); },
    TnaturalPct: function (r) { return Format.texPct(r.Tnatural, 2); },
    ERdB: function (r) {
      return Format.texFixed(r.ER, 2) + '\\,\\mathrm{dB}' + (r.ERfloorReached ? '^{+}' : '');
    },
    DOP: function (r) { return Format.texFixed(r.DOP, 5); },
    ILdB: function (r) { return Format.texFixed(r.IL, 2) + '\\,\\mathrm{dB}'; },
    q: function (r) { return Format.texSci(r.q, 3); },
    eStarUm: function (r) {
      return (isFinite(r.eStar) ? Format.texFixed(r.eStar * 1e6, 1) : '\\infty') +
        '\\,\\mathrm{\\mu m}';
    },
    TpStar: function (r) { return Format.texFixed(r.TpStar, 3); },
    u: function (r) { return Format.texSci(r.u, 3); },
    w: function (r) { return Format.texSci(r.w, 3); },
    DeltaRad: function (r) { return Format.texFixed(r.Delta, 3); },
    DeltaDeg: function (r) { return Format.texDeg(r.Delta, 1); },
    psiDeg: function (r) { return Format.texDeg(r.psi, 2); },
    chiDeg: function (r) { return Format.texDeg(r.chi, 3); },
    alphaOutDeg: function (r) { return Format.texDeg(r.alphaOut, 2); },
    periodNm: function (r) { return r.periodNm ? Format.texFixed(r.periodNm, 1) : '\\text{---}'; },
  };

  /* ------------------------------------------------------------------ */
  /* Paramètres : chargement, sauvegarde, conversions                    */
  /* ------------------------------------------------------------------ */

  function clampLambda() {
    const m = materialById(S.params.mat);
    const nm = thzToNm(S.params.nuTHz);
    const lo = m.rangeNm[0];
    const hi = m.rangeNm[1];
    if (!(nm >= lo)) S.params.nuTHz = nmToTHz(lo);
    if (!(nm <= hi)) S.params.nuTHz = nmToTHz(hi);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && MATERIAL_ORDER.indexOf(p.mat) >= 0) S.params.mat = p.mat;
        if (p && isFinite(p.nuTHz) && p.nuTHz > 0) S.params.nuTHz = p.nuTHz;
        if (p && isFinite(p.eUm)) S.params.eUm = Math.max(0.1, Math.min(300, p.eUm));
        if (p && isFinite(p.alphaDeg)) S.params.alphaDeg = Math.max(0, Math.min(90, p.alphaDeg));
        if (p && MODES.indexOf(p.mode) >= 0) S.params.mode = p.mode;
        if (p && isFinite(p.ERtarget)) S.params.ERtarget = Math.max(10, Math.min(60, p.ERtarget));
      }
    } catch (err) {
      /* stockage indisponible : on garde les valeurs par défaut */
    }
    clampLambda();
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(S.params));
    } catch (err) {
      /* ignore */
    }
  }

  function eFromSlider(t) {
    return 0.1 * Math.pow(3000, t / 1000);
  }

  function sliderFromE(e) {
    return (1000 * Math.log(Math.max(e, 0.1) / 0.1)) / Math.log(3000);
  }

  function setMaterial(id) {
    if (MATERIAL_ORDER.indexOf(id) < 0) return;
    S.params.mat = id;
    clampLambda();
    save();
    render();
  }

  function compute() {
    try {
      S.error = null;
      return runAll(S.params);
    } catch (err) {
      S.error = err;
      return null;
    }
  }

  function baseParams() {
    return Object.assign({}, S.params);
  }

  /* ------------------------------------------------------------------ */
  /* Mise à jour en direct (glisser un curseur, tourner une poignée)     */
  /* ------------------------------------------------------------------ */

  function syncReadouts(r) {
    if (!r) return;
    const set = function (name, value) {
      const n = railEl.querySelector('[data-readout="' + name + '"]');
      if (n) n.textContent = value;
    };
    set('nm', Format.num(r.lamNm, 0));
    set('e', Format.num(r.params.eUm, r.params.eUm < 10 ? 2 : 1));
    set('alpha', Format.num(r.params.alphaDeg, 0));
    set('target', Format.num(r.params.ERtarget, 0));
  }

  function fillLive(r) {
    if (!r) return;
    const hosts = [partEl, railEl];
    hosts.forEach(function (host) {
      host.querySelectorAll('[data-live]').forEach(function (n) {
        const key = n.getAttribute('data-live');
        const fn = LIVE[key];
        if (fn) Format.render(n, fn(r));
      });
    });
    syncReadouts(r);
  }

  function refreshSchematics(r) {
    partEl.querySelectorAll('[data-schematic]').forEach(function (host) {
      if (host._draw) host._draw(r);
    });
    if (S.focusDial) {
      const g = partEl.querySelector('[data-dial="' + S.focusDial + '"]');
      if (g) g.focus();
    }
  }

  function liveUpdate() {
    const r = compute();
    if (!r) {
      render();
      return;
    }
    fillLive(r);
    refreshSchematics(r);
  }

  function onAlphaDrag(deg, phase) {
    S.params.alphaDeg = Math.max(0, Math.min(90, deg));
    if (phase === 'end') {
      save();
      render();
      return;
    }
    liveUpdate();
  }

  /* ------------------------------------------------------------------ */
  /* Rail                                                               */
  /* ------------------------------------------------------------------ */

  function paramsPanel(m, r) {
    const nm = r ? r.lamNm : thzToNm(S.params.nuTHz);
    const lo = m.rangeNm[0];
    const hi = m.rangeNm[1];
    return (
      '<details class="panel" open><summary>Paramètres</summary><div class="panel-body">' +
      '<div class="field">' +
      '<div class="field-head"><label for="ctl-nm">' + M('\\lambda_0') +
      ' <span class="hint" style="font-weight:400">(' + M('\\mathrm{nm}') + ')</span></label>' +
      '<span class="readout" data-readout="nm"></span></div>' +
      '<input type="range" id="ctl-nm" min="' + lo + '" max="' + hi + '" step="1" value="' +
      Math.round(nm) + '">' +
      '<p class="hint">Domaine du matériau ' + m.id + ' : ' + lo + ' à ' + hi + ' nm.</p>' +
      '</div>' +
      '<div class="field">' +
      '<div class="field-head"><label for="ctl-e">' + M('e') +
      ' <span class="hint" style="font-weight:400">(' + M('\\mathrm{\\mu m}') + ')</span></label>' +
      '<span class="readout" data-readout="e"></span></div>' +
      '<input type="range" id="ctl-e" min="0" max="1000" step="1" value="' +
      Math.round(sliderFromE(S.params.eUm)) + '">' +
      '<p class="hint">Échelle logarithmique, de 0,1 à 300 µm.</p>' +
      '</div>' +
      '<div class="field">' +
      '<div class="field-head"><label for="ctl-alpha">' + M('\\alpha') +
      ' <span class="hint" style="font-weight:400">(' + M('^{\\circ}') + ')</span></label>' +
      '<span class="readout" data-readout="alpha"></span></div>' +
      '<input type="range" id="ctl-alpha" min="0" max="90" step="1" value="' +
      Math.round(S.params.alphaDeg) + '">' +
      '<p class="hint">' + M('0^{\\circ}') + ' : champ sur l’axe passant ; ' + M('90^{\\circ}') +
      ' : sur l’axe bloquant.</p>' +
      '</div>' +
      '<div class="field">' +
      '<div class="field-head"><label>Modèle</label></div>' +
      '<div class="seg">' +
      MODES.map(function (mode) {
        return (
          '<button type="button" data-mode="' + mode + '" aria-pressed="' +
          (S.params.mode === mode) + '">' + mode + '</button>'
        );
      }).join('') +
      '</div>' +
      '<p class="hint">direct : sans réflexions multiples ; exact : interférences comprises ; incohérent : phases moyennées.</p>' +
      '</div>' +
      '<div class="field">' +
      '<div class="field-head"><label for="ctl-target">Objectif ' + M('\\mathrm{ER}') +
      ' <span class="hint" style="font-weight:400">(' + M('\\mathrm{dB}') + ')</span></label>' +
      '<span class="readout" data-readout="target"></span></div>' +
      '<input type="range" id="ctl-target" min="10" max="60" step="1" value="' +
      Math.round(S.params.ERtarget) + '">' +
      '</div>' +
      '<div class="btn-row">' +
      '<button type="button" class="btn small" data-reset>Réglages de départ</button>' +
      '</div>' +
      '</div></details>'
    );
  }

  function materialsPanel(m) {
    const buttons = MATERIAL_ORDER.map(function (id) {
      const mm = MATERIALS[id];
      return (
        '<button type="button" class="mat" data-mat="' + id + '" aria-pressed="' +
        (id === S.params.mat) + '">' +
        '<span class="mat-name"><span class="dot" style="background:' + mm.color + '"></span>' +
        esc(mm.label) + '</span>' +
        '<span class="mat-law">' + M('n_p = ' + mm.texNp) + '</span>' +
        '<span class="mat-law">' + M('n_b = ' + mm.texNb) + '</span>' +
        '<span class="mat-law">' + M('\\kappa_p = ' + mm.texKp) + '</span>' +
        '<span class="mat-law">' + M('\\kappa_b = ' + mm.texKb) + '</span>' +
        '<span class="mat-range">' + mm.rangeNm[0] + '–' + mm.rangeNm[1] +
        ' nm · valeurs illustratives</span>' +
        '</button>'
      );
    }).join('');
    return (
      '<details class="panel"><summary>Matériaux</summary><div class="panel-body">' +
      '<div class="mat-list">' + buttons + '</div>' +
      '</div></details>'
    );
  }

  function controlPanel(r) {
    if (!r) {
      return (
        '<details class="panel" open><summary>Contrôle</summary><div class="panel-body">' +
        '<p class="hint">Aucun calcul : la longueur d’onde est hors du domaine de validité.</p>' +
        '</div></details>'
      );
    }
    return (
      '<details class="panel" open><summary>Contrôle</summary><div class="panel-body">' +
      '<div class="note ' + r.verdict.tone + '" style="margin:0 0 10px">' +
      '<span class="tag">Verdict</span><div>' + esc(r.verdict.label) + '</div></div>' +
      '<dl class="kv">' +
      kvRow('T_p', 'TpPct') +
      kvRow('T_b', 'TbPct') +
      kvRow('T(\\alpha)', 'TalphaPct') +
      kvRow('\\mathrm{ER}', 'ERdB') +
      kvRow('\\mathrm{DOP}', 'DOP') +
      kvRow('\\mathrm{IL}', 'ILdB') +
      kvRow('e^{*}', 'eStarUm') +
      '</dl>' +
      '</div></details>'
    );
  }

  function equationsPanel(part) {
    if (!part.eq || !part.eq.length) return '';
    return (
      '<details class="panel"><summary>Équations</summary><div class="panel-body">' +
      '<div class="eq-list">' +
      part.eq.map(function (e) { return eqBlock(e.tex, e.note); }).join('') +
      '</div></div></details>'
    );
  }

  function buildRail(part, r) {
    const m = materialById(S.params.mat);
    const open = {};
    railEl.querySelectorAll('details.panel').forEach(function (d) {
      const s = d.querySelector('summary');
      if (s) open[s.textContent.trim()] = d.open;
    });
    railEl.innerHTML =
      '<div class="rail-head"><h2>Réglages</h2>' +
      '<button type="button" class="rail-close" data-rail-close aria-label="Fermer les réglages">×</button></div>' +
      paramsPanel(m, r) +
      materialsPanel(m) +
      controlPanel(r) +
      equationsPanel(part);
    railEl.querySelectorAll('details.panel').forEach(function (d) {
      const s = d.querySelector('summary');
      if (!s) return;
      const key = s.textContent.trim();
      if (key in open) d.open = open[key];
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */

  function buildNav() {
    navEl.innerHTML = PARTS.map(function (p) {
      return (
        '<a href="#/' + p.id + '" data-part="' + p.id + '">' +
        '<span class="n">' + (p.num || '·') + '</span><span>' + p.nav + '</span></a>'
      );
    }).join('');
  }

  function markNav(id) {
    navEl.querySelectorAll('a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-part') === id);
    });
  }

  function partById(id) {
    const found = PARTS.filter(function (p) { return p.id === id; })[0];
    return found || PARTS[0];
  }

  function currentId() {
    const h = location.hash.replace(/^#\/?/, '');
    const found = PARTS.filter(function (p) { return p.id === h; })[0];
    return found ? found.id : 'accueil';
  }

  function topbarHtml(r) {
    const m = materialById(S.params.mat);
    const chips = ['<span class="chip">Matériau <b>' + m.id + '</b></span>'];
    if (r) {
      chips.push('<span class="chip">' + M('\\lambda_0') + ' <b>' + lv('lamNmU') + '</b></span>');
      chips.push('<span class="chip">' + M('e') + ' <b>' + lv('eUmU') + '</b></span>');
      chips.push('<span class="chip">' + M('\\alpha') + ' <b>' + lv('alphaDegU') + '</b></span>');
    }
    chips.push('<span class="chip">' + MODE_LABEL[S.params.mode] + '</span>');
    return (
      '<div class="topbar"><span class="crumb">Simulateur</span>' +
      '<span class="spacer"></span>' + chips.join('') + '</div>'
    );
  }

  function headHtml(part) {
    return (
      '<div class="part-head">' +
      '<p class="kicker">' + part.kicker + '</p>' +
      '<h1>' + part.title + '</h1>' +
      (part.lede ? '<p class="lede">' + part.lede + '</p>' : '') +
      '</div>'
    );
  }

  function pagerHtml(part) {
    const i = PARTS.indexOf(part);
    const prev = PARTS[i - 1];
    const next = PARTS[i + 1];
    return (
      '<nav class="pager">' +
      (prev
        ? '<a href="#/' + prev.id + '"><span><span class="dir">← Précédent</span>' + prev.nav + '</span></a>'
        : '<span></span>') +
      (next
        ? '<a class="next" href="#/' + next.id + '"><span><span class="dir">Suivant →</span>' + next.nav + '</span></a>'
        : '<span></span>') +
      '</nav>'
    );
  }

  function errorCard() {
    const err = S.error;
    const nm = err && isFinite(err.lamNm) ? err.lamNm : thzToNm(S.params.nuTHz);
    const range = err && err.range ? err.range : materialById(S.params.mat).rangeNm;
    return card(
      'Hors domaine de validité',
      null,
      note(
        'bad',
        'Calcul arrêté',
        'La longueur d’onde ' + M('\\lambda_0 = ' + Format.texFixed(nm, 1) + '\\,\\mathrm{nm}') +
          ' sort du domaine du matériau ' + esc(S.params.mat) + ' (' +
          M(Format.texFixed(range[0], 0) + '\\,\\mathrm{nm} \\le \\lambda_0 \\le ' +
            Format.texFixed(range[1], 0) + '\\,\\mathrm{nm}') +
          '). Aucune valeur n’est extrapolée : choisissez une autre longueur d’onde ou un autre matériau.'
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* Graphiques                                                          */
  /* ------------------------------------------------------------------ */

  function logspace(a, b, n) {
    const out = [];
    const la = Math.log(a);
    const lb = Math.log(b);
    for (let i = 0; i <= n; i++) out.push(Math.exp(la + ((lb - la) * i) / n));
    return out;
  }

  function drawKappa(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    const m = r.mat;
    const lo = m.rangeNm[0];
    const hi = m.rangeNm[1];
    const xs = [];
    const kp = [];
    const kb = [];
    const n = 140;
    for (let i = 0; i <= n; i++) {
      const nm = lo + ((hi - lo) * i) / n;
      const idx = indicesAt(m, nm * 1e-9);
      xs.push(nm);
      kp.push(idx.kp);
      kb.push(idx.kb);
    }
    Chart.line(host, {
      title: 'Absorption des deux axes',
      x: { domain: [lo, hi], type: 'lin', label: '\\lambda_0\\ (\\mathrm{nm})' },
      y: { domain: [1e-5, 1e-1], type: 'log', label: '\\kappa_j' },
      series: [
        {
          points: xs.map(function (x, i) { return [x, kp[i]]; }),
          color: '#1f4d3a',
          tex: '\\kappa_p(\\lambda_0)',
        },
        {
          points: xs.map(function (x, i) { return [x, kb[i]]; }),
          color: '#b8822a',
          tex: '\\kappa_b(\\lambda_0)',
        },
      ],
      markers: [
        { x: r.lamNm, y: r.kappaP, tex: '\\kappa_p', color: '#1f4d3a', vline: true },
        { x: r.lamNm, y: r.kappaB, tex: '\\kappa_b', color: '#b8822a' },
      ],
      note: 'Échelle logarithmique verticale. Les lois sont analytiques : chaque point est calculé, sans interpolation.',
    });
  }

  function drawAtt(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    const eList = logspace(0.1, 300, 90);
    const data = sweepE(baseParams(), eList);
    Chart.line(host, {
      title: 'Atténuation dans la couche',
      x: { domain: [0.1, 300], type: 'log', label: 'e\\ (\\mathrm{\\mu m})' },
      y: { domain: [1e-12, 1], type: 'log', label: '\\mathrm{att}_j' },
      series: [
        {
          points: data.map(function (d) { return [d.x, Math.exp(-r.gammaP * d.x * 1e-6)]; }),
          color: '#1f4d3a',
          tex: '\\mathrm{att}_p',
        },
        {
          points: data.map(function (d) { return [d.x, Math.exp(-r.gammaB * d.x * 1e-6)]; }),
          color: '#b8822a',
          tex: '\\mathrm{att}_b',
        },
      ],
      markers: [{ x: r.params.eUm, y: r.attP, color: '#1f4d3a', vline: true }],
      note: 'L’axe bloquant s’éteint beaucoup plus vite : c’est le dichroïsme. Attention, att ne contient pas les réflexions de Fresnel.',
    });
  }

  function drawMalus(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    const degs = [];
    for (let a = 0; a <= 90; a += 1) degs.push(a);
    const data = sweepAlpha(baseParams(), degs);
    Chart.line(host, {
      title: 'Transmission en fonction de l’angle',
      x: { domain: [0, 90], type: 'lin', label: '\\alpha\\ (^{\\circ})' },
      y: { domain: [0, 1], type: 'lin', label: 'T(\\alpha)' },
      series: [
        {
          points: data.map(function (d) { return [d.x, d.Talpha]; }),
          color: '#1f4d3a',
          tex: 'T(\\alpha)',
          width: 2.6,
        },
      ],
      hlines: [
        { y: r.Tp, tex: 'T_p', color: '#2e6b52' },
        { y: r.Tb, tex: 'T_b', color: '#b8822a' },
      ],
      markers: [{ x: r.params.alphaDeg, y: r.Talpha, tex: 'T(\\alpha)', color: '#b8822a', vline: true }],
      note: 'Loi de Malus généralisée. Entre zéro et quatre-vingt-dix degrés, la transmission passe continûment de T_p à T_b.',
    });
  }

  function drawErE(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    const eList = logspace(0.1, 300, 100);
    const data = sweepE(baseParams(), eList).filter(function (d) { return isFinite(d.ER); });
    let maxER = 0;
    data.forEach(function (d) { maxER = Math.max(maxER, d.ER); });
    const ymax = Math.max(50, Math.min(140, Math.ceil(maxER / 10) * 10));
    Chart.line(host, {
      title: 'Extinction en fonction de l’épaisseur',
      x: { domain: [0.1, 300], type: 'log', label: 'e\\ (\\mathrm{\\mu m})' },
      y: { domain: [0, ymax], type: 'lin', label: '\\mathrm{ER}\\ (\\mathrm{dB})' },
      series: [
        {
          points: data.map(function (d) { return [d.x, d.ER]; }),
          color: '#1f4d3a',
          tex: '\\mathrm{ER}(e)',
          width: 2.6,
        },
      ],
      hlines: [
        {
          y: r.params.ERtarget,
          tex: '\\mathrm{ER}_{\\mathrm{cible}}',
          color: '#b8822a',
        },
      ],
      markers: [
        { x: r.params.eUm, y: r.ER, tex: '\\mathrm{ER}', color: '#2b5f8a', vline: true },
        isFinite(r.eStar)
          ? { x: Math.max(0.1, Math.min(300, r.eStar * 1e6)), y: r.params.ERtarget, color: '#b8822a' }
          : null,
      ].filter(Boolean),
      note: 'L’extinction croît avec l’épaisseur, mais la transmission de l’axe passant diminue : c’est le compromis de la partie suivante.',
    });
  }

  function drawErLam(id) {
    const host = document.getElementById(id);
    if (!host) return;
    const lo = 600;
    const hi = 800;
    const nmList = [];
    for (let i = 0; i <= 90; i++) nmList.push(lo + ((hi - lo) * i) / 90);
    const series = MATERIAL_ORDER.map(function (id) {
      const mat = MATERIALS[id];
      const pts = [];
      nmList.forEach(function (nm) {
        try {
          const rr = runAll({ mat: id, nuTHz: nmToTHz(nm), eUm: S.params.eUm, alphaDeg: S.params.alphaDeg, mode: S.params.mode, ERtarget: S.params.ERtarget });
          if (isFinite(rr.ER)) pts.push([nm, rr.ER]);
        } catch (err) {
          /* hors plage : le point n’existe pas */
        }
      });
      return { points: pts, color: mat.color, tex: '\\mathrm{ER}_' + id + '(\\lambda_0)', dash: mat.dashed ? '7 5' : '' };
    });
    Chart.line(host, {
      title: 'Extinction des quatre matériaux',
      x: { domain: [lo, hi], type: 'lin', label: '\\lambda_0\\ (\\mathrm{nm})' },
      y: { domain: [0, 80], type: 'lin', label: '\\mathrm{ER}\\ (\\mathrm{dB})' },
      series: series,
      bands: [{ x0: 600, x1: 800, color: 'rgba(31,77,58,0.04)' }],
      note: 'Domaine commun aux quatre matériaux : 600 à 800 nm. Aucune courbe n’est tracée hors de son domaine propre.',
    });
  }

  function drawMap(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    const m = r.mat;
    const lo = m.rangeNm[0];
    const hi = m.rangeNm[1];
    const nx = 44;
    const ny = 34;
    const xs = [];
    const ys = [];
    for (let i = 0; i < nx; i++) xs.push(lo + ((hi - lo) * i) / (nx - 1));
    for (let j = 0; j < ny; j++) ys.push(Math.exp(Math.log(0.1) + ((Math.log(300) - Math.log(0.1)) * j) / (ny - 1)));
    const rows = sweepMap(baseParams(), ys, xs);
    const values = rows.map(function (row) {
      return row.map(function (v) { return v.ER; });
    });
    Chart.heatmap(host, {
      title: 'Carte d’extinction',
      xs: xs,
      ys: ys,
      values: values,
      min: 0,
      max: 60,
      x: { domain: [lo, hi], type: 'lin', label: '\\lambda_0\\ (\\mathrm{nm})' },
      y: { domain: [0.1, 300], type: 'log', label: 'e\\ (\\mathrm{\\mu m})' },
      contours: [
        { level: 20, tex: '20\\,\\mathrm{dB}', color: 'rgba(255,253,247,0.9)', dash: '7 5' },
        { level: 30, tex: '30\\,\\mathrm{dB}', color: '#fffdf7', width: 2.4 },
        { level: 40, tex: '40\\,\\mathrm{dB}', color: 'rgba(255,253,247,0.9)', dash: '3 4' },
      ],
      marker: { x: r.lamNm, y: r.params.eUm },
      note: 'Chaque point est un calcul complet. Les lignes blanches relient les réglages qui donnent 20, 30 et 40 dB d’extinction.',
    });
  }

  /* ------------------------------------------------------------------ */
  /* Schémas                                                            */
  /* ------------------------------------------------------------------ */

  function drawDevice(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    host._draw = function (rr) {
      Schematic.device(host, rr, { onAlpha: onAlphaDrag });
    };
    host._draw(r);
  }

  function drawFields(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    host._draw = function (rr) {
      Schematic.fields(host, rr, { onAlpha: onAlphaDrag });
    };
    host._draw(r);
  }

  function drawPolarization(id, r) {
    const host = document.getElementById(id);
    if (!host) return;
    host._draw = function (rr) {
      Schematic.polarization(host, rr, { onAlpha: onAlphaDrag });
    };
    host._draw(r);
  }

  function drawWave(id, r, boost) {
    const host = document.getElementById(id);
    if (!host) return;
    host._draw = function (rr) {
      Schematic.wave(host, rr, { boost: boost || 1 });
    };
    host._draw(r);
  }

  /* ------------------------------------------------------------------ */
  /* Vérifications                                                       */
  /* ------------------------------------------------------------------ */

  function paintTests() {
    const checksHost = document.getElementById('checks');
    const testsHost = document.getElementById('tests');
    if (!checksHost || !testsHost) return;

    const res = S.testResults || [];
    const byId = {};
    res.forEach(function (t) { byId[t.id] = t; });

    checksHost.innerHTML = TESTS.enonce.map(function (c) {
      const ok = c.tests.every(function (id) { return byId[id] && byId[id].pass; });
      return (
        '<div class="ctrl ' + (ok ? '' : 'fail') + '">' +
        '<span class="mark">' + (ok ? '✓' : '✗') + '</span>' +
        '<div>' + esc(c.label) +
        '<span class="ref">Tests ' + c.tests.join(', ') + '</span></div></div>'
      );
    }).join('');

    testsHost.innerHTML = res.map(function (t) {
      return (
        '<article class="test ' + (t.pass ? 'pass' : 'fail') + '">' +
        '<div class="test-head">' +
        '<span class="badge">' + (t.pass ? 'réussi' : 'échec') + '</span>' +
        '<span class="id">Test ' + t.id + '</span>' +
        '<span class="t">' + esc(t.title) + '</span></div>' +
        '<div class="need"><span class="k">Attendu</span>' + M(t.expected) + '</div>' +
        '<div class="got"><span class="k">Constaté</span>' + M(t.got) + '</div>' +
        '<div class="exp"><span class="k">Critère</span>' + M(t.need) + '</div>' +
        (t.note ? '<p class="exp">' + t.note + '</p>' : '') +
        '</article>'
      );
    }).join('');

    math(checksHost);
    math(testsHost);
  }

  /* ------------------------------------------------------------------ */
  /* Rendu du contenu mathématique                                       */
  /* ------------------------------------------------------------------ */

  function math(el) {
    if (!el || typeof renderMathInElement !== 'function') return;
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      ignoredClasses: ['katex'],
    });
  }

  /* ------------------------------------------------------------------ */
  /* Les parties                                                         */
  /* ------------------------------------------------------------------ */

  const PARTS = [
    /* ------------------------------- accueil ------------------------------ */
    {
      id: 'accueil',
      nav: 'Accueil',
      num: '',
      kicker: 'Simulateur pédagogique',
      title: 'Comprendre un polariseur dichroïque, pas à pas',
      lede:
        'Une couche mince absorbe différemment deux directions perpendiculaires : c’est le principe du ' +
        'polariseur dichroïque. Ce site reprend le calcul du cours, étape par étape, et laisse manipuler ' +
        'chaque grandeur pour voir immédiatement son effet.',
      eq: [
        { tex: '\\tau_j = \\dfrac{(1-\\rho_j^2)\\,e^{i\\varphi_j}}{1-\\rho_j^2 e^{2i\\varphi_j}}', note: 'Transmission en champ, axe j.' },
        { tex: '\\mathrm{ER} = 10\\log_{10}\\dfrac{T_p}{T_b}', note: 'Extinction entre les deux axes.' },
      ],
      body: function (r) {
        return (
          figureCard(
            'fig-accueil',
            'Le dispositif, vu de côté',
            'poignée $\\alpha$ sur la vignette de gauche',
            '<span class="name">Section droite <span>— l’angle ' + M('\\alpha') +
              ' se règle à la souris ou au clavier (flèches).</span></span>' +
              '<span><i class="sw sw-p"></i>plaque ' + M('p') + ' (passante) ' +
              '<i class="sw sw-b"></i>plaque ' + M('b') + ' (bloquante) — ⊙ = axe ' + M('b') +
              ' perpendiculaire à la figure</span>'
          ) +
          figureCard(
            'fig-fields',
            'Le champ électrique : incident, réfléchi, transmis',
            'poignée $\\alpha$',
            '<span class="name">Longueurs proportionnelles à l’amplitude du champ ' +
              '<span>— le champ transmis vaut ' + M('\\sqrt{T(\\alpha)}') + ' et le champ réfléchi ' +
              M('\\sqrt{R(\\alpha)}') + ', pour un champ incident de référence ' + M('1') +
              ' ; le reste de la puissance est absorbé par la couche.</span></span>'
          ) +
          card(
            null,
            null,
            '<div class="indicators">' +
              ind('T_p', 'TpPct', 'axe passant') +
              ind('T_b', 'TbPct', 'axe bloquant') +
              ind('\\mathrm{ER}', 'ERdB', 'extinction') +
              ind('\\Delta', 'DeltaRad', 'déphasage (rad)') +
              '</div>' +
              '<p class="hint" style="margin-top:10px">Valeurs du réglage courant. Modifiez-les dans la colonne de droite : tout se recalcule.</p>'
          ) +
          card(
            'Les huit étapes',
            'Chaque partie reprend une étape du cahier de calcul, dans l’ordre du cours.',
            tocHtml()
          ) +
          card(
            'Comment s’en servir',
            null,
            '<ul style="margin:0;padding-left:20px">' +
              '<li>La <b>colonne de droite</b> contient les réglages : matériau, longueur d’onde ' + M('\\lambda_0') +
              ', épaisseur ' + M('e') + ', angle ' + M('\\alpha') + ' et modèle.</li>' +
              '<li>Les <b>schémas</b> sont interactifs : la poignée ambre règle ' + M('\\alpha') +
              ' ; les flèches du clavier l’ajustent au degré près.</li>' +
              '<li>Chaque page se termine par le lien vers la suivante ; la dernière rassemble les vérifications automatiques.</li>' +
              '</ul>'
          ) +
          note(
            'warn',
            'À savoir',
            'Les quatre matériaux sont des <b>matériaux pédagogiques</b> : leurs lois sont analytiques et leurs ' +
              'valeurs illustratives, non mesurées. Le matériau A reproduit l’exemple numérique du cours.'
          )
        );
      },
      after: function (r) {
        drawDevice('fig-accueil', r);
        drawFields('fig-fields', r);
      },
    },

    /* ------------------------------ dispositif ---------------------------- */
    {
      id: 'dispositif',
      nav: 'Le dispositif',
      num: '1',
      kicker: 'Partie 1 · géométrie',
      title: 'Une couche mince entre deux milieux',
      lede:
        'La lumière arrive sous incidence normale. Elle traverse une couche d’épaisseur ' + M('e') +
        ' dont les deux directions propres n’absorbent pas de la même façon. Tout le reste en découle.',
      eq: [
        { tex: '\\tilde n_j = n_j + i\\kappa_j', note: 'Indice complexe de l’axe $j$ ($\\kappa \\ge 0$).' },
        { tex: '\\varphi_j = \\dfrac{2\\pi\\tilde n_j e}{\\lambda_0}', note: 'Phase accumulée dans la couche.' },
        { tex: 'T(\\alpha) = T_p\\cos^2\\alpha + T_b\\sin^2\\alpha', note: 'Transmission pour un angle $\\alpha$.' },
      ],
      body: function (r) {
        return (
          figureCard(
            'fig-device',
            'Coupe du dispositif',
            'poignée $\\alpha$ à gauche',
            '<span class="name">' + M('z') + ' <span>— axe de propagation.</span></span>' +
              '<span><i class="sw sw-p"></i>plaque ' + M('p') + ' (passante) ' +
              '<i class="sw sw-b"></i>plaque ' + M('b') + ' (bloquante) — le symbole ⊙ marque l’axe ' +
              M('b') + ', perpendiculaire à la figure.</span>' +
              '<span>Épaisseur ' + M('e') + ' = ' + lv('eUmU') + ' ; angle ' + M('\\alpha') + ' = ' +
              lv('alphaDegU') + '.</span>'
          ) +
          card(
            'Trois directions à ne pas confondre',
            null,
            '<div class="two-col">' +
              '<div>' +
                '<p><b>' + M('z') + '</b> — la direction de propagation. L’onde va de la gauche vers la droite ; ' +
                'les deux autres axes sont dans le plan de la couche.</p>' +
                '<p><b>' + M('p') + '</b> — l’axe <i>passant</i> : il absorbe peu. C’est la polarisation que l’on veut garder.</p>' +
                '<p><b>' + M('b') + '</b> — l’axe <i>bloquant</i> : il absorbe beaucoup. C’est la polarisation que l’on veut éteindre.</p>' +
              '</div>' +
              '<div>' +
                eqBlock('\\tilde n_p = n_p + i\\kappa_p,\\qquad \\tilde n_b = n_b + i\\kappa_b', 'Deux indices complexes.') +
                eqBlock('D = \\dfrac{\\kappa_b}{\\kappa_p}', 'Rapport dichroïque : D = 1 signifie « aucun polariseur ».') +
              '</div>' +
            '</div>'
          ) +
          card(
            'Ce que la couche fait au champ',
            'Le champ est d’abord partiellement réfléchi à l’entrée, puis atténué et déphasé dans la couche, puis transmis.',
            '<div class="eq-list">' +
              eqBlock('\\tau_j^{\\mathrm{direct}} = (1-\\rho_j^2)\\,e^{i\\varphi_j}', 'Version simple : une seule traversée, réflexions multiples négligées.') +
              eqBlock('\\tau_j^{\\mathrm{exact}} = \\dfrac{(1-\\rho_j^2)\\,e^{i\\varphi_j}}{1-\\rho_j^2 e^{2i\\varphi_j}}', 'Version complète : somme de toutes les réflexions internes.') +
              eqBlock('T_j = |\\tau_j|^2,\\qquad R_j = |\\rho_j|^2,\\qquad A_j = 1 - T_j - R_j', 'Puissances normalisées par la puissance incidente.') +
            '</div>' +
            '<p style="margin-top:12px">Le coefficient ' + M('\\rho_j') +
              ' est le coefficient de Fresnel à l’interface air–couche. Comme ' + M('\\tilde n_j') +
              ' est complexe, la réflexion et l’absorption ne se séparent pas : c’est le calcul exact qui le montre.</p>'
          ) +
          note(
            'info',
            'Hypothèses',
            'Incidence normale, milieux extérieurs identiques (air, indice ' + M('1') +
              '), couche homogène et plane, éclairement cohérent en mode exact. Les réflexions aux deux faces sont incluses.'
          )
        );
      },
      after: function (r) {
        drawDevice('fig-device', r);
      },
    },

    /* ------------------------------- matériau ----------------------------- */
    {
      id: 'materiau',
      nav: 'Le matériau',
      num: '2',
      kicker: 'Partie 2 · indices',
      title: 'Deux axes, deux indices complexes',
      lede:
        'Un polariseur dichroïque n’est pas un filtre coloré : c’est un matériau dont l’absorption dépend de la ' +
        'direction du champ. On décrit chaque axe par un indice complexe, dont la partie imaginaire absorbe.',
      eq: [
        { tex: 'n_j(\\lambda) = A_j + \\dfrac{B_j}{\\lambda^2}', note: 'Loi de Cauchy, $\\lambda$ en $\\mathrm{\\mu m}$.' },
        { tex: '\\kappa_j(\\lambda) = \\kappa_{0j} + a_j\\,G(\\lambda)', note: 'Absorption : fond + bande gaussienne.' },
        { tex: 'G(\\lambda) = \\exp\\!\\left[-\\left(\\dfrac{\\lambda-\\lambda_c}{w}\\right)^{2}\\right]', note: 'Bande centrée sur $\\lambda_c$, largeur $w$.' },
        { tex: '\\gamma_j = \\dfrac{4\\pi\\kappa_j}{\\lambda_0},\\qquad \\delta_j = \\dfrac{1}{\\gamma_j}', note: 'Coefficient d’absorption et longueur caractéristique.' },
      ],
      body: function (r) {
        return (
          card(
            'Le modèle du matériau',
            'Les lois sont évaluées directement à la longueur d’onde choisie, sans interpolation.',
            '<div class="eq-list">' +
              eqBlock('\\tilde n_j(\\lambda_0) = n_j(\\lambda_0) + i\\kappa_j(\\lambda_0)') +
              eqBlock('n_j(\\lambda) = A_j + \\dfrac{B_j}{\\lambda^2}') +
              eqBlock('\\kappa_j(\\lambda) = \\kappa_{0j} + a_j\\,G(\\lambda),\\qquad G(\\lambda)=\\exp\\!\\left[-\\left(\\dfrac{\\lambda-\\lambda_c}{w}\\right)^{2}\\right]') +
            '</div>' +
            '<p style="margin-top:12px">La partie réelle ' + M('n_j') +
              ' gouverne la phase ; la partie imaginaire ' + M('\\kappa_j') +
              ' gouverne l’absorption. Un bon polariseur a ' + M('\\kappa_p \\ll \\kappa_b') + '.</p>'
          ) +
          card(
            'Valeurs au réglage courant',
            'Matériau ' + esc(S.params.mat) + ' — ' + M('\\lambda_0') + ' = ' + lv('lamNmU') + '.',
            table(
              [M('\\text{Grandeur}'), M('p'), M('b')],
              [
                '<tr>' + td(M('n_j')) + td(lv('np'), true) + td(lv('nb'), true) + '</tr>' +
                '<tr>' + td(M('\\kappa_j')) + td(lv('kp'), true) + td(lv('kb'), true) + '</tr>' +
                '<tr>' + td(M('\\gamma_j\\ (\\mathrm{m^{-1}})')) + td(lv('gammaPU'), true) + td(lv('gammaBU'), true) + '</tr>' +
                '<tr>' + td(M('\\delta_j\\ (\\mathrm{\\mu m})')) + td(lv('deltaPU'), true) + td(lv('deltaBU'), true) + '</tr>' +
                '<tr>' + td(M('\\gamma_j e')) + td(lv('gammaPe'), true) + td(lv('gammaBe'), true) + '</tr>'
              ],
              1
            ) +
            '<dl class="kv" style="margin-top:12px">' +
              kvRow('D = \\dfrac{\\kappa_b}{\\kappa_p}', 'D') +
            '</dl>'
          ) +
          card(
            'Absorption en fonction de la longueur d’onde',
            null,
            '<div id="chart-kappa" class="chart-grid"></div>' +
            note(
              'info',
              'Lecture',
              'La bande du matériau ' + esc(S.params.mat) + ' se voit directement : l’écart entre les deux courbes est le dichroïsme. ' +
                'Hors du domaine indiqué, le calcul refuse de s’exécuter plutôt que d’extrapoler.'
            )
          ) +
          note(
            'warn',
            'Valeurs illustratives',
            'Ces quatre matériaux sont construits pour le cours. Leurs paramètres ne sont pas mesurés et ne doivent pas ' +
              'être comparés à un polariseur réel.'
          )
        );
      },
      after: function (r) {
        drawKappa('chart-kappa', r);
      },
    },

    /* ------------------------------ traversée ----------------------------- */
    {
      id: 'traversee',
      nav: 'La traversée',
      num: '3',
      kicker: 'Partie 3 · Fresnel et absorption',
      title: 'Ce qui se passe dans la couche',
      lede:
        'À l’entrée, une partie du champ est réfléchie. Dans la couche, le champ est atténué et déphasé. ' +
        'À la sortie, il est transmis. Le coefficient complexe ' + M('\\tau_j') + ' résume ces trois effets.',
      eq: [
        { tex: '\\rho_j = \\dfrac{\\tilde n_j - 1}{\\tilde n_j + 1}', note: 'Réflexion de Fresnel (incidence normale).' },
        { tex: 'F_j = \\left|1-\\rho_j^2\\right|^2', note: 'Facteur de transmission des deux faces.' },
        { tex: '\\varphi_j = \\dfrac{2\\pi n_j e}{\\lambda_0} + i\\dfrac{\\gamma_j e}{2}', note: 'Phase complexe.' },
        { tex: '\\mathrm{att}_j = e^{-\\gamma_j e}', note: 'Atténuation d’intensité dans la couche.' },
      ],
      body: function (r) {
        return (
          card(
            'Trois étapes, un seul coefficient',
            null,
            '<div class="eq-list">' +
              eqBlock('\\rho_j = \\dfrac{\\tilde n_j-1}{\\tilde n_j+1},\\qquad t_{12} = \\dfrac{2}{1+\\tilde n_j},\\qquad t_{23} = \\dfrac{2\\tilde n_j}{1+\\tilde n_j}') +
              eqBlock('\\varphi_j = \\dfrac{2\\pi\\tilde n_j e}{\\lambda_0} = \\varphi_j^{\\prime} + i\\varphi_j^{\\prime\\prime},\\qquad \\varphi_j^{\\prime} = \\dfrac{2\\pi n_j e}{\\lambda_0},\\quad \\varphi_j^{\\prime\\prime} = \\dfrac{\\gamma_j e}{2}') +
              eqBlock('\\mathrm{att}_j = \\left|e^{i\\varphi_j}\\right|^2 = e^{-\\gamma_j e}') +
              eqBlock('\\tau_j = t_{12}\\,t_{23}\\,e^{i\\varphi_j}\\times\\left(1+\\rho_j^2e^{2i\\varphi_j}+\\rho_j^4e^{4i\\varphi_j}+\\cdots\\right)') +
            '</div>' +
            '<p style="margin-top:12px">La série entre parenthèses est la somme des réflexions multiples. En mode direct, on la remplace par ' +
              M('1') + ' ; en mode exact, on la somme : ' + M('\\tau_j = \\dfrac{(1-\\rho_j^2)e^{i\\varphi_j}}{1-\\rho_j^2e^{2i\\varphi_j}}') + '.</p>'
          ) +
          card(
            'Valeurs intermédiaires',
            'Toutes les grandeurs sont calculées à partir de ' + M('\\lambda_0') + ' et de ' + M('e') + '.',
            table(
              [M('\\text{Grandeur}'), M('p'), M('b')],
              [
                '<tr>' + td(M('|\\rho_j|')) + td(lv('rhoP'), true) + td(lv('rhoB'), true) + '</tr>' +
                '<tr>' + td(M('\\arg\\rho_j')) + td(lv('rhoParg'), true) + td(lv('rhoBarg'), true) + '</tr>' +
                '<tr>' + td(M('F_j')) + td(lv('Fp'), true) + td(lv('Fb'), true) + '</tr>' +
                '<tr>' + td(M('\\varphi_j^{\\prime}\\ (\\mathrm{rad})')) + td(lv('phiP'), true) + td(lv('phiB'), true) + '</tr>' +
                '<tr>' + td(M('\\varphi_j^{\\prime\\prime}')) + td(lv('phiPim'), true) + td(lv('phiBim'), true) + '</tr>' +
                '<tr>' + td(M('\\mathrm{att}_j')) + td(lv('attP'), true) + td(lv('attB'), true) + '</tr>' +
                '<tr>' + td(M('|\\tau_j|')) + td(lv('absTauP'), true) + td(lv('absTauB'), true) + '</tr>'
              ],
              1
            )
          ) +
          card(
            'Atténuation avec l’épaisseur',
            null,
            '<div id="chart-att" class="chart-grid"></div>'
          ) +
          note(
            'info',
            'Interférences',
            'En mode exact, l’axe passant oscille avec l’épaisseur (Fabry-Pérot) : la période vaut ' +
              M('\\Delta\\lambda \\approx ' + '\\,' ) + lv('periodNm') +
              ' ' + M('\\mathrm{nm}') + ' à la longueur d’onde courante. Les balayages doivent donc être fins.'
          )
        );
      },
      after: function (r) {
        drawAtt('chart-att', r);
      },
    },

    /* ------------------------------- puissances --------------------------- */
    {
      id: 'puissances',
      nav: 'Les puissances',
      num: '4',
      kicker: 'Partie 4 · bilan',
      title: 'Transmise, réfléchie, absorbée',
      lede:
        'Ce qui n’est pas transmis est soit réfléchi, soit absorbé. Le bilan ' + M('T+R+A=1') +
        ' est la première vérification de cohérence du modèle — et la première des cinq demandées.',
      eq: [
        { tex: 'T_j = |\\tau_j|^2', note: 'Transmission en puissance.' },
        { tex: 'R_j = |\\rho_j|^2', note: 'Réflexion (mode direct).' },
        { tex: 'A_j = 1 - T_j - R_j', note: 'Absorption, toujours positive.' },
        { tex: 'T(\\alpha) = T_p\\cos^2\\alpha + T_b\\sin^2\\alpha', note: 'Mélange des deux axes.' },
      ],
      body: function (r) {
        return (
          card(
            'Les trois parts du bilan',
            'Barres proportionnelles pour chaque axe, au réglage courant.',
            powerBars(r) +
            '<div class="legend-inline"><span><i style="background:#1f4d3a"></i>transmise ' + M('T_j') +
              '</span><span><i style="background:#b8822a"></i>réfléchie ' + M('R_j') +
              '</span><span><i style="background:rgba(51,50,44,0.35)"></i>absorbée ' + M('A_j') + '</span></div>'
          ) +
          card(
            'Puissances pour l’angle courant',
            null,
            '<div class="indicators">' +
              ind('T(\\alpha)', 'TalphaPct', 'transmise') +
              ind('R(\\alpha)', 'RalphaPct', 'réfléchie') +
              ind('A(\\alpha)', 'AalphaPct', 'absorbée') +
              ind('T_{\\mathrm{nat}}', 'TnaturalPct', 'lumière naturelle') +
              '</div>' +
            '<p class="hint" style="margin-top:10px">' + M('T_{\\mathrm{nat}} = \\tfrac12(T_p+T_b)') +
              ' est la transmission d’une lumière non polarisée, qui se partage également entre les deux axes.</p>'
          ) +
          card(
            'La loi de Malus généralisée',
            null,
            '<div class="eq-list">' +
              eqBlock('T(\\alpha) = T_p\\cos^2\\alpha + T_b\\sin^2\\alpha') +
              eqBlock('R(\\alpha) = R_p\\cos^2\\alpha + R_b\\sin^2\\alpha,\\qquad A(\\alpha) = A_p\\cos^2\\alpha + A_b\\sin^2\\alpha') +
            '</div>' +
            '<div id="chart-malus" class="chart-grid" style="margin-top:12px"></div>' +
            '<p style="margin-top:10px">À ' + M('\\alpha=0^{\\circ}') + ' on retrouve ' + M('T_p') +
              ' ; à ' + M('\\alpha=90^{\\circ}') + ' on retrouve ' + M('T_b') + '. La décroissance est lente près de zéro degré : ' +
              'un défaut de quelques degrés coûte peu de lumière, mais dégrade vite l’extinction.</p>'
          ) +
          note(
            'good',
            'Contrôle',
            'Les transmissions restent entre ' + M('0') + ' et ' + M('1') + ' sur tout le domaine balayé : ' +
              'c’est le premier des cinq contrôles, vérifié automatiquement en partie 8.'
          )
        );
      },
      after: function (r) {
        drawMalus('chart-malus', r);
      },
    },

    /* ------------------------------ performances -------------------------- */
    {
      id: 'performances',
      nav: 'Les performances',
      num: '5',
      kicker: 'Partie 5 · extinction et transmission',
      title: 'Le compromis à trouver',
      lede:
        'Une couche épaisse éteint bien l’axe bloquant, mais atténue aussi l’axe passant. Le bon réglage n’est ' +
        'donc pas le plus épais : c’est celui qui atteint l’extinction visée sans perdre trop de lumière.',
      eq: [
        { tex: '\\mathrm{ER} = 10\\log_{10}\\dfrac{T_p}{T_b}', note: 'Extinction, en décibels.' },
        { tex: '\\mathrm{DOP} = \\dfrac{T_p-T_b}{T_p+T_b}', note: 'Degré de polarisation.' },
        { tex: '\\mathrm{IL} = -10\\log_{10}T_p', note: 'Perte d’insertion.' },
        { tex: 'e^{*} = \\dfrac{\\mathrm{ER}}{\\dfrac{10}{\\ln 10}\\left(\\gamma_b-\\gamma_p\\right)}', note: 'Épaisseur visée.' },
        { tex: 'T_p^{*} = F_p\\,10^{-\\frac{\\mathrm{ER}}{10(D-1)}}', note: 'Transmission de l’axe passant à cette épaisseur.' },
      ],
      body: function (r) {
        return (
          card(
            'Les trois indicateurs',
            null,
            '<div class="indicators">' +
              ind('\\mathrm{ER}', 'ERdB', 'extinction') +
              ind('\\mathrm{DOP}', 'DOP', 'pureté de la sortie') +
              ind('\\mathrm{IL}', 'ILdB', 'perte d’insertion') +
              ind('q = \\sqrt{T_b/T_p}', 'q', 'amplitude relative') +
              '</div>' +
            '<div style="margin-top:12px">' +
              note(r.verdict.tone, 'Verdict', esc(r.verdict.label) + ' — objectif ' +
                M('\\mathrm{ER} \\ge ' + Format.texFixed(r.params.ERtarget, 0) + '\\,\\mathrm{dB}') +
                ' et ' + M('T_p \\ge 0{,}5') + '.') +
            '</div>'
          ) +
          card(
            'Extinction avec l’épaisseur',
            null,
            '<div id="chart-er" class="chart-grid"></div>' +
            '<p style="margin-top:10px">La ligne ambre est l’objectif d’extinction. Le point bleu est le réglage courant ; ' +
              'le second point marque l’épaisseur ' + M('e^{*}') + ' qui atteint tout juste l’objectif.</p>'
          ) +
          card(
            'Calculer l’épaisseur visée',
            'En négligeant les réflexions, l’extinction croît linéairement avec l’épaisseur.',
            '<div class="eq-list">' +
              eqBlock('\\mathrm{ER}(e) \\approx \\dfrac{10}{\\ln 10}\\left(\\gamma_b-\\gamma_p\\right)e') +
              eqBlock('e^{*} = \\dfrac{\\mathrm{ER}_{\\mathrm{cible}}}{\\dfrac{10}{\\ln 10}\\left(\\gamma_b-\\gamma_p\\right)}') +
            '</div>' +
            '<dl class="kv" style="margin-top:12px">' +
              kvRow('e^{*}', 'eStarUm') +
              kvRow('T_p^{*}', 'TpStar') +
              kvRow('D', 'D') +
            '</dl>' +
            '<p style="margin-top:10px">Avec le matériau ' + esc(S.params.mat) + ', atteindre ' +
              M(Format.texFixed(r.params.ERtarget, 0) + '\\,\\mathrm{dB}') + ' demande ' + lv('eStarUm') +
              ' et laisse passer ' + lv('TpStar') + ' de l’axe passant (estimation sans réflexions).</p>'
          ) +
          note(
            'warn',
            'Deux pièges',
            'Une extinction énorme avec une transmission quasi nulle n’est pas un bon polariseur : le verdict le signale. ' +
              'Et ' + M('\\mathrm{ER}') + ' ne dit rien à lui seul de la couleur perçue, car ' + M('T_p') +
              ' dépend de ' + M('\\lambda_0') + '.'
          )
        );
      },
      after: function (r) {
        drawErE('chart-er', r);
      },
    },

    /* ------------------------------ polarisation -------------------------- */
    {
      id: 'polarisation',
      nav: 'La polarisation',
      num: '6',
      kicker: 'Partie 6 · sortie',
      title: 'Ce que devient la polarisation',
      lede:
        'Les deux composantes ne sortent ni avec la même amplitude ni avec le même déphasage. Leur combinaison ' +
        'décrit une ellipse : la polarisation rectiligne d’entrée devient, en général, elliptique.',
      eq: [
        { tex: 'u = |\\tau_p|\\cos\\alpha,\\qquad w = |\\tau_b|\\sin\\alpha', note: 'Amplitudes des deux composantes.' },
        { tex: '\\Delta = \\arg\\tau_b - \\arg\\tau_p', note: 'Déphasage entre les axes.' },
        { tex: '\\psi = \\dfrac12\\arctan\\dfrac{2uw\\cos\\Delta}{u^2-w^2}', note: 'Orientation de l’ellipse.' },
        { tex: '\\sin 2\\chi = \\dfrac{2uw\\sin\\Delta}{u^2+w^2}', note: 'Ellipticité.' },
        { tex: '\\alpha^{\\prime} = \\arctan\\!\\left(q\\tan\\alpha\\right)', note: 'Direction apparente du champ.' },
      ],
      body: function (r) {
        return (
          '<div class="two-col">' +
            figureCard('fig-pol', 'Section droite', 'poignée $\\alpha$', null) +
            figureCard('fig-wave', 'Champ au cours du temps', 'animation', null) +
          '</div>' +
          card(
            'Les grandeurs de sortie',
            null,
            '<div class="indicators">' +
              ind('\\psi', 'psiDeg', 'orientation de l’ellipse') +
              ind('\\chi', 'chiDeg', 'ellipticité') +
              ind('\\alpha^{\\prime}', 'alphaOutDeg', 'direction du champ') +
              ind('\\Delta', 'DeltaRad', 'déphasage (rad)') +
              '</div>' +
            '<dl class="kv" style="margin-top:12px">' +
              kvRow('u = |\\tau_p|\\cos\\alpha', 'u') +
              kvRow('w = |\\tau_b|\\sin\\alpha', 'w') +
            '</dl>'
          ) +
          card(
            'Reconnaître les cas',
            null,
            '<div class="eq-list">' +
              eqBlock('\\Delta = 0 \\ \\text{ou} \\ \\pi \\ \\Rightarrow \\ \\text{polarisation rectiligne}', 'Ellipse aplatie : $\\chi = 0$.') +
              eqBlock('\\Delta = \\pm\\dfrac{\\pi}{2} \\ \\text{et} \\ u=w \\ \\Rightarrow \\ \\text{cercle}', 'Ellipse circulaire : $\\chi = \\pm 45^{\\circ}$.') +
              eqBlock('0 < |\\Delta| < \\pi \\ \\Rightarrow \\ \\text{ellipse}', 'Cas général, avec une orientation $\\psi$.') +
            '</div>' +
            '<p style="margin-top:12px">En mode incohérent, ' + M('\\Delta') +
              ' n’a pas de sens : le modèle ne superpose plus les phases, la polarisation de sortie n’est pas définie. ' +
              'Les valeurs affichées restent alors vides plutôt que fausses.</p>'
          ) +
          note(
            'info',
            'Lecture du schéma',
            'Le vecteur ambre est le champ incident ' + M('E_0') + ' ; les traits vert et bleu sont ses projections sur ' +
              M('p') + ' et ' + M('b') + '. L’ellipse verte est la trajectoire du champ de sortie.'
          )
        );
      },
      after: function (r) {
        drawPolarization('fig-pol', r);
        drawWave('fig-wave', r, 1);
      },
    },

    /* -------------------------------- explorer ---------------------------- */
    {
      id: 'explorer',
      nav: 'Explorer',
      num: '7',
      kicker: 'Partie 7 · comparaison',
      title: 'Explorer les réglages',
      lede:
        'Les courbes précédentes décrivaient un matériau à la fois. Ici on compare, on balaie et on repère ' +
        'les zones utiles : c’est le moment de chercher un réglage plutôt que de le subir.',
      eq: [
        { tex: '\\mathrm{ER}(e,\\lambda_0)', note: 'Deux paramètres, une carte.' },
        { tex: 'T_p(e)', note: 'Ce que l’on perd quand on gagne en extinction.' },
      ],
      body: function (r) {
        return (
          card(
            'Les quatre matériaux au même réglage',
            'Seuls les matériaux dont le domaine contient ' + M('\\lambda_0') + ' = ' + lv('lamNmU') + ' sont calculés.',
            compareTable(r)
          ) +
          card(
            'Extinction en fonction de la longueur d’onde',
            null,
            '<div id="chart-erlam" class="chart-grid"></div>'
          ) +
          card(
            'Carte d’extinction',
            'Extinction en fonction de l’épaisseur et de la longueur d’onde, pour le matériau ' + esc(S.params.mat) + '.',
            '<div id="chart-map" class="chart-grid"></div>'
          ) +
          note(
            'info',
            'Comment lire la carte',
            'Plus la teinte est sombre, plus l’extinction est forte. Les lignes blanches sont des isocontours : ' +
              'elles montrent combien d’épaisseur il faut ajouter quand on change de longueur d’onde. ' +
              'Un réglage robuste reste du bon côté d’un isocontour sur toute la bande utile.'
          )
        );
      },
      after: function (r) {
        drawErLam('chart-erlam');
        drawMap('chart-map', r);
      },
    },

    /* ------------------------------ vérifications ------------------------- */
    {
      id: 'verifications',
      nav: 'Vérifications',
      num: '8',
      kicker: 'Partie 8 · contrôles',
      title: 'Vérifier le modèle',
      eq: [
        { tex: '0 \\le T_j \\le 1', note: 'Contrôle 1.' },
        { tex: 'T(0^{\\circ}) = T_p,\\qquad T(90^{\\circ}) = T_b', note: 'Contrôles 2 et 3.' },
        { tex: '\\mathrm{ER}=0 \\ \\text{si} \\ \\tilde n_p = \\tilde n_b', note: 'Contrôle 4.' },
      ],
      body: function () {
        return (
          card(
            'Les cinq contrôles de l’énoncé',
            null,
            '<div class="test-summary" id="checks"></div>'
          ) +
          card(
            'Les treize tests numériques',
            'Chaque test affiche la valeur attendue, la valeur constatée et le critère appliqué.',
            '<div class="btn-row" style="margin-bottom:12px">' +
              '<button type="button" class="btn primary" data-rerun>Relancer les vérifications</button>' +
              '<span class="hint">Le calcul complet prend quelques instants.</span>' +
            '</div>' +
            '<div id="tests"></div>'
          ) +
          note(
            'warn',
            'Ce que ces tests ne prouvent pas',
            'Ils vérifient la cohérence interne et l’accord avec les valeurs du cours. Ils ne prouvent pas que les ' +
              'paramètres des matériaux ressemblent à de vrais matériaux : ceux-ci restent illustratifs. ' +
              'À mentionner dans le compte rendu.'
          )
        );
      },
      after: function () {
        if (!S.testResults) S.testResults = TESTS.run();
        paintTests();
      },
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Fragments de contenu dépendants de l'état                           */
  /* ------------------------------------------------------------------ */

  function tocHtml() {
    return (
      '<ul class="toc">' +
      PARTS.slice(1).map(function (p) {
        return (
          '<li><a href="#/' + p.id + '">' +
          '<span class="num">' + p.num + '</span>' +
          '<span><span class="t">' + p.nav + '</span>' +
          '<span class="d">' + p.kicker.replace(/^Partie \d+ · /, '') + '</span></span>' +
          '</a></li>'
        );
      }).join('') +
      '</ul>'
    );
  }

  function powerBars(r) {
    function row(nameTex, T, R, A, key) {
      const t = Math.max(0, Math.min(1, T)) * 100;
      const rr = Math.max(0, Math.min(1, R)) * 100;
      const a = Math.max(0, Math.min(1, A)) * 100;
      return (
        '<div class="bar-row">' +
        '<span>' + M(nameTex) + '</span>' +
        '<span class="bar">' +
        '<span class="seg-t" style="width:' + t.toFixed(2) + '%"></span>' +
        '<span class="seg-r" style="width:' + rr.toFixed(2) + '%"></span>' +
        '<span class="seg-a" style="width:' + a.toFixed(2) + '%"></span>' +
        '</span>' +
        '<span class="v">' + lv(key) + '</span>' +
        '</div>'
      );
    }
    return (
      '<div class="bars">' +
      row('T_p', r.Tp, r.Rp, r.Ap, 'TpPct') +
      row('T_b', r.Tb, r.Rb, r.Ab, 'TbPct') +
      '</div>'
    );
  }

  function compareTable(r) {
    const nm = r.lamNm;
    const rows = MATERIAL_ORDER.map(function (id) {
      const mat = MATERIALS[id];
      const inRange = nm >= mat.rangeNm[0] && nm <= mat.rangeNm[1];
      if (!inRange) {
        return (
          '<tr><td><span class="dot" style="background:' + mat.color +
          ';display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px"></span>' +
          esc(mat.short) + '</td>' +
          '<td colspan="4" style="color:#8a887c">hors domaine (' + mat.rangeNm[0] + '–' +
          mat.rangeNm[1] + ' nm) — aucun calcul</td></tr>'
        );
      }
      const rr = runAll(Object.assign({}, S.params, { mat: id }));
      return (
        '<tr' + (id === S.params.mat ? ' class="highlight"' : '') + '>' +
        '<td><span class="dot" style="background:' + mat.color +
        ';display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px"></span>' +
        esc(mat.short) + '</td>' +
        td(M(Format.texPct(rr.Tp, 2)), true) +
        td(M(Format.texPct(rr.Tb, 4)), true) +
        td(M(Format.texFixed(rr.ER, 1) + '\\,\\mathrm{dB}'), true) +
        td(M(Format.texFixed(rr.IL, 1) + '\\,\\mathrm{dB}'), true) +
        '</tr>'
      );
    }).join('');
    return table(
      ['Matériau', M('T_p'), M('T_b'), M('\\mathrm{ER}'), M('\\mathrm{IL}')],
      rows,
      1
    );
  }

  /* ------------------------------------------------------------------ */
  /* Rendu général                                                      */
  /* ------------------------------------------------------------------ */

  function render(scrollTop) {
    Schematic.stopAll();
    const part = partById(currentId());
    markNav(part.id);
    const r = compute();
    partEl.innerHTML =
      topbarHtml(r) +
      headHtml(part) +
      (r ? part.body(r) : errorCard()) +
      pagerHtml(part);
    math(partEl);
    buildRail(part, r);
    math(railEl);
    if (r && part.after) part.after(r);
    fillLive(r);
    document.title = part.nav + ' — Physique2plus';
    if (scrollTop) window.scrollTo(0, 0);
    S.focusDial = null;
  }

  /* ------------------------------------------------------------------ */
  /* Événements                                                          */
  /* ------------------------------------------------------------------ */

  railEl.addEventListener('input', function (ev) {
    const t = ev.target;
    if (t.id === 'ctl-nm') {
      const m = materialById(S.params.mat);
      const nm = Math.max(m.rangeNm[0], Math.min(m.rangeNm[1], parseFloat(t.value)));
      S.params.nuTHz = nmToTHz(nm);
    } else if (t.id === 'ctl-e') {
      S.params.eUm = eFromSlider(parseFloat(t.value));
    } else if (t.id === 'ctl-alpha') {
      S.params.alphaDeg = parseFloat(t.value);
    } else if (t.id === 'ctl-target') {
      S.params.ERtarget = parseFloat(t.value);
    } else {
      return;
    }
    liveUpdate();
  });

  railEl.addEventListener('change', function (ev) {
    if (ev.target && ev.target.type === 'range') {
      save();
      render();
    }
  });

  railEl.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-rail-close]')) {
      setRailOpen(false);
      return;
    }
    const matBtn = ev.target.closest('[data-mat]');
    if (matBtn) {
      setMaterial(matBtn.getAttribute('data-mat'));
      return;
    }
    const modeBtn = ev.target.closest('[data-mode]');
    if (modeBtn) {
      const mode = modeBtn.getAttribute('data-mode');
      if (MODES.indexOf(mode) >= 0) {
        S.params.mode = mode;
        save();
        render();
      }
      return;
    }
    if (ev.target.closest('[data-reset]')) {
      S.params = Object.assign({}, DEFAULT_PARAMS);
      clampLambda();
      save();
      render();
    }
  });

  partEl.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-rerun]')) {
      S.testResults = null;
      S.testResults = TESTS.run();
      paintTests();
    }
  });

  document.addEventListener('focusin', function (ev) {
    const g = ev.target.closest ? ev.target.closest('[data-dial]') : null;
    if (g) S.focusDial = g.getAttribute('data-dial');
  });

  /* ------------------------- tiroir des réglages ------------------------ */
  /* Sous 1220 px, le rail devient un panneau fixe : les réglages restent
     accessibles même quand la page est zoomée ou la fenêtre étroite.      */

  const railToggle = document.getElementById('rail-toggle');
  const railBackdrop = document.getElementById('rail-backdrop');

  function setRailOpen(open) {
    railEl.classList.toggle('open', open);
    document.body.classList.toggle('rail-open', open);
    if (railToggle) railToggle.setAttribute('aria-expanded', String(open));
    if (railBackdrop) railBackdrop.hidden = !open;
    if (open) {
      const first = railEl.querySelector('input, select, button:not([data-rail-close])');
      if (first) first.focus({ preventScroll: true });
    } else if (railToggle && document.activeElement && railEl.contains(document.activeElement)) {
      railToggle.focus({ preventScroll: true });
    }
  }

  if (railToggle) {
    railToggle.addEventListener('click', function () {
      setRailOpen(!railEl.classList.contains('open'));
    });
  }
  if (railBackdrop) {
    railBackdrop.addEventListener('click', function () {
      setRailOpen(false);
    });
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && railEl.classList.contains('open')) setRailOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1220 && railEl.classList.contains('open')) setRailOpen(false);
  });

  window.addEventListener('hashchange', function () {
    setRailOpen(false);
    render(true);
  });

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */

  load();
  buildNav();
  render();
})();
