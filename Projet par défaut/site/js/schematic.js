/**
 * Schémas interactifs du dispositif.
 * - device()       : vue de côté (rayons, couche, axes) + deux vignettes de section droite
 * - polarization() : section droite agrandie, ellipse de sortie
 * - wave()         : animation du champ E(t)
 * Les angles se règlent à la souris (ou au clavier) sur les vignettes.
 */
const Schematic = (function () {
  const INK = '#33322c';
  const GREEN = '#1f4d3a';
  const AMBER = '#b8822a';
  const BLUE = '#2b5f8a';
  const MUTED = '#8a887c';
  const PAPER = '#faf7ef';
  let counter = 0;

  function esc(s) {
    return Format.esc(s);
  }

  function fo(x, y, tex, opts) {
    const o = opts || {};
    const w = o.w || 360;
    const h = o.h || 24;
    const justify = o.anchor === 'start' ? 'flex-start' : o.anchor === 'end' ? 'flex-end' : 'center';
    const style =
      'position:absolute;left:0;top:0;width:' + w + 'px;height:' + h + 'px;display:flex;align-items:center;' +
      'justify-content:' + justify + ';font-size:' + (o.size || 12.5) + 'px;color:' + (o.color || INK) +
      ';line-height:1.15;white-space:nowrap;pointer-events:none;';
    return (
      '<foreignObject x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h +
      '" overflow="visible"><div xmlns="http://www.w3.org/1999/xhtml" style="' + style + '">' +
      Format.html(tex) + '</div></foreignObject>'
    );
  }

  function text(x, y, str, opts) {
    const o = opts || {};
    return (
      '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || 'middle') +
      '" font-family="\'Segoe UI\', system-ui, sans-serif" font-size="' + (o.size || 11.5) +
      '" fill="' + (o.color || MUTED) + '"' + (o.weight ? ' font-weight="' + o.weight + '"' : '') + '>' +
      esc(str) + '</text>'
    );
  }

  function defs(uid) {
    return (
      '<defs>' +
      '<marker id="' + uid + '-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' + INK + '"/></marker>' +
      '<marker id="' + uid + '-arrow-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' + GREEN + '"/></marker>' +
      '<marker id="' + uid + '-arrow-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' + AMBER + '"/></marker>' +
      '<marker id="' + uid + '-arrow-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' + BLUE + '"/></marker>' +
      '<linearGradient id="' + uid + '-layer" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#2e6b52" stop-opacity="0.85"/>' +
      '<stop offset="1" stop-color="#1f4d3a" stop-opacity="0.95"/>' +
      '</linearGradient>' +
      '</defs>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* Géométrie commune des vignettes de section droite                  */
  /* ------------------------------------------------------------------ */

  function ellipsePath(cx, cy, R, u, w, delta) {
    const m = Math.max(Math.abs(u), Math.abs(w), 1e-12);
    const s = (0.86 * R) / m;
    let d = '';
    for (let k = 0; k <= 180; k++) {
      const th = (2 * Math.PI * k) / 180;
      const ep = u * Math.cos(th);
      const eb = w * Math.cos(th - delta);
      const x = cx + s * eb;
      const y = cy - s * ep;
      d += (k === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return { d: d + 'Z', scale: s };
  }

  function dialBase(uid, cx, cy, R, opts) {
    const o = opts || {};
    let s = '';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#fffdf7" stroke="rgba(51,50,44,0.22)"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 7) + '" fill="none" stroke="rgba(51,50,44,0.07)"/>';
    // axes p (vertical) et b (horizontal)
    s += '<line x1="' + cx + '" y1="' + (cy - R - 12) + '" x2="' + cx + '" y2="' + (cy + R + 12) +
      '" stroke="rgba(51,50,44,0.18)"/>';
    s += '<line x1="' + (cx - R - 12) + '" y1="' + cy + '" x2="' + (cx + R + 12) + '" y2="' + cy +
      '" stroke="rgba(51,50,44,0.18)"/>';
    s += fo(cx, cy - R - 24, 'p', { w: 60, size: 12, color: GREEN });
    s += text(cx, cy - R - 11, 'passante', { size: 8.5 });
    s += fo(cx + R + 26, cy, 'b', { w: 60, size: 12, color: BLUE });
    s += text(cx + R + 26, cy + 13, 'bloquante', { size: 8.5 });
    if (o.angleArc) {
      // arc de l'angle alpha depuis p vers le vecteur
      const a = o.angle;
      const r = R * 0.42;
      const x2 = cx + r * Math.sin(a);
      const y2 = cy - r * Math.cos(a);
      s += '<path d="M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x2.toFixed(2) + ' ' +
        y2.toFixed(2) + '" fill="none" stroke="' + AMBER + '" stroke-width="1.4"/>';
      s += fo(cx + (r + 16) * Math.sin(a / 2), cy - (r + 16) * Math.cos(a / 2), '\\alpha', {
        w: 60,
        size: 12,
        color: AMBER,
      });
    }
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Poignée d'angle partagée par tous les schémas                      */
  /* ------------------------------------------------------------------ */

  function bindAlpha(el, g, cx, cy, deg, onAlpha) {
    if (!g || !onAlpha) return;
    let dragging = false;
    let lastDeg = deg;

    function angleFrom(evt) {
      const svg = el.querySelector('svg');
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      let a = (Math.atan2(p.x - cx, cy - p.y) * 180) / Math.PI;
      a = ((a % 180) + 180) % 180;
      if (a > 90) a = 180 - a;
      return Math.max(0, Math.min(90, a));
    }

    function apply(evt, phase) {
      const a = angleFrom(evt);
      if (Math.abs(a - lastDeg) < 0.15) return;
      lastDeg = a;
      onAlpha(a, phase);
    }

    function onMove(evt) {
      if (dragging) apply(evt, 'move');
    }
    function stop(evt) {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      onAlpha(lastDeg, 'end');
      if (evt) evt.preventDefault();
    }

    g.addEventListener('pointerdown', function (evt) {
      dragging = true;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      apply(evt, 'move');
      evt.preventDefault();
    });
    g.addEventListener('keydown', function (evt) {
      const step = evt.shiftKey ? 5 : 1;
      let a = lastDeg;
      if (evt.key === 'ArrowRight' || evt.key === 'ArrowUp') a += step;
      else if (evt.key === 'ArrowLeft' || evt.key === 'ArrowDown') a -= step;
      else return;
      evt.preventDefault();
      lastDeg = Math.max(0, Math.min(90, a));
      onAlpha(lastDeg, 'move');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Vue de côté                                                        */
  /* ------------------------------------------------------------------ */

  function device(el, r, opts) {
    if (!el) return;
    const o = opts || {};
    const uid = 'dev' + ++counter;
    const W = 880;
    const H = 430;

    // largeur de la couche : log de 0,1 à 300 µm -> 26 à 96 px
    const t = Math.log(Math.max(r.params.eUm, 0.1) / 0.1) / Math.log(3000);
    const layerW = 26 + 70 * Math.max(0, Math.min(1, t));
    const x0 = 392;
    const x1 = x0 + layerW;
    const yRay = 128;

    let s = '<svg class="schematic-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="xMidYMid meet">';
    s += defs(uid);

    // zones
    s += '<rect x="0" y="0" width="' + W + '" height="250" fill="#fffdf7"/>';
    s += '<rect x="0" y="250" width="' + W + '" height="180" fill="#f6f2e6"/>';

    // couche
    s += '<rect x="' + x0 + '" y="58" width="' + layerW + '" height="140" fill="url(#' + uid + '-layer)" rx="2"/>';
    s += fo(x0 + layerW / 2, 40, 'e = ' + Format.texFixed(r.params.eUm, 1) + '\\,\\mathrm{\\mu m}', {
      w: 220,
      size: 12.5,
      color: GREEN,
    });
    s += text(x0 + layerW / 2, 214, 'couche anisotrope', { size: 11 });

    // axe b : perpendiculaire au plan de la figure, donc dessiné en ⊙
    const bx = x0 + layerW / 2;
    s += '<line x1="' + (bx + 8) + '" y1="168" x2="' + (x1 + 14) + '" y2="168" stroke="' + BLUE +
      '" stroke-width="1.2" opacity="0.75"/>';
    s += '<circle cx="' + bx + '" cy="168" r="8" fill="#fffdf7" stroke="' + BLUE + '" stroke-width="1.5"/>';
    s += '<circle cx="' + bx + '" cy="168" r="2.4" fill="' + BLUE + '"/>';
    s += fo(x1 + 50, 168, 'b', { w: 60, size: 12.5, color: BLUE });

    // rayon incident
    s += '<line x1="60" y1="' + yRay + '" x2="' + (x0 - 6) + '" y2="' + yRay + '" stroke="' + INK +
      '" stroke-width="2" marker-end="url(#' + uid + '-arrow)"/>';
    s += fo(150, yRay - 26, '\\text{onde incidente}', { w: 200, size: 12 });

    // réflexion
    s += '<line x1="' + (x0 - 4) + '" y1="' + (yRay - 6) + '" x2="248" y2="46" stroke="' + MUTED +
      '" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#' + uid + '-arrow)"/>';
    s += fo(214, 30, '\\text{réflexion}', { w: 160, size: 11, color: MUTED });

    // rayon transmis
    s += '<line x1="' + (x1 + 4) + '" y1="' + yRay + '" x2="836" y2="' + yRay + '" stroke="' + GREEN +
      '" stroke-width="2.2" marker-end="url(#' + uid + '-arrow-g)"/>';
    s += fo(748, yRay - 26, '\\text{onde transmise}', { w: 200, size: 12, color: GREEN });

    // axe z
    s += '<line x1="70" y1="232" x2="828" y2="232" stroke="rgba(51,50,44,0.45)" stroke-width="1.2" marker-end="url(#' + uid + '-arrow)"/>';
    s += fo(846, 232, 'z', { w: 40, size: 12.5 });
    s += text(80, 224, 'propagation', { anchor: 'start', size: 10.5 });

    // axe p visible de côté
    s += '<line x1="' + (x0 - 20) + '" y1="' + (yRay + 66) + '" x2="' + (x0 - 20) + '" y2="' + (yRay - 74) +
      '" stroke="' + GREEN + '" stroke-width="1.4" marker-end="url(#' + uid + '-arrow-g)" opacity="0.8"/>';
    s += fo(x0 - 20, yRay - 88, 'p', { w: 40, size: 12.5, color: GREEN });

    /* ------------------------ vignettes de section ------------------------ */
    const cy = 330;
    const R = 62;

    // entrée
    s += '<g data-dial="in" tabindex="0" role="slider" aria-label="Angle de polarisation incidente" ' +
      'aria-valuemin="0" aria-valuemax="90" aria-valuenow="' + Format.num(r.params.alphaDeg, 0) +
      '" style="cursor:grab;touch-action:none;outline:none">';
    s += dialBase(uid, 250, cy, R, { angleArc: true, angle: (r.params.alphaDeg * Math.PI) / 180 });
    const aIn = (r.params.alphaDeg * Math.PI) / 180;
    const eIn = ellipsePath(250, cy, R, Math.cos(aIn), Math.sin(aIn), 0);
    s += '<path d="' + eIn.d + '" fill="none" stroke="' + AMBER + '" stroke-width="2.6"/>';
    s += '<line x1="250" y1="' + cy + '" x2="' + (250 + eIn.scale * Math.sin(aIn)).toFixed(2) + '" y2="' +
      (cy - eIn.scale * Math.cos(aIn)).toFixed(2) + '" stroke="' + AMBER + '" stroke-width="2.4"/>';
    s += '<circle cx="' + (250 + eIn.scale * Math.sin(aIn)).toFixed(2) + '" cy="' +
      (cy - eIn.scale * Math.cos(aIn)).toFixed(2) + '" r="13" fill="transparent"/>';
    s += '<circle cx="' + (250 + eIn.scale * Math.sin(aIn)).toFixed(2) + '" cy="' +
      (cy - eIn.scale * Math.cos(aIn)).toFixed(2) + '" r="5.5" fill="' + AMBER + '" stroke="#fffdf7" stroke-width="2"/>';
    s += '</g>';
    s += fo(250, 402, '\\alpha = ' + Format.texFixed(r.params.alphaDeg, 0) + '^{\\circ}', {
      w: 160,
      size: 12,
      color: AMBER,
    });
    s += text(250, 268, 'avant la couche', { size: 11, weight: '600' });

    // sortie
    s += '<g data-dial="out">';
    s += dialBase(uid, 630, cy, R, {});
    if (r.polDefined) {
      const eOut = ellipsePath(630, cy, R, r.u, r.w, r.Delta);
      s += '<path d="' + eOut.d + '" fill="none" stroke="' + GREEN + '" stroke-width="2.6"/>';
      const th = 0;
      const xTip = 630 + eOut.scale * r.w * Math.cos(th - r.Delta);
      const yTip = cy - eOut.scale * r.u * Math.cos(th);
      s += '<line x1="630" y1="' + cy + '" x2="' + xTip.toFixed(2) + '" y2="' + yTip.toFixed(2) +
        '" stroke="' + GREEN + '" stroke-width="1.2" opacity="0.55"/>';
      s += '<circle cx="' + xTip.toFixed(2) + '" cy="' + yTip.toFixed(2) + '" r="4" fill="' + GREEN + '"/>';
    } else {
      s += fo(630, cy, '\\text{phase non définie}', { w: 240, size: 11, color: MUTED });
    }
    s += '</g>';
    s += fo(
      630,
      402,
      '\\alpha\' = ' + Format.texDeg(r.alphaOut, 2) + '\\ ;\\ \\chi = ' + Format.texDeg(r.chi, 2),
      { w: 260, size: 12, color: GREEN }
    );
    s += text(630, 268, 'après la couche', { size: 11, weight: '600' });

    // lien entre les deux vignettes
    s += '<line x1="' + (250 + R + 34) + '" y1="' + cy + '" x2="' + (630 - R - 34) + '" y2="' + cy +
      '" stroke="rgba(51,50,44,0.3)" stroke-width="1.2" stroke-dasharray="4 5" marker-end="url(#' + uid + '-arrow)"/>';
    s += text((250 + 630) / 2, cy - 10, 'traversée', { size: 10.5 });
    s += fo(
      (250 + 630) / 2,
      cy + 18,
      'T = ' + Format.texPct(r.Talpha, r.Talpha < 1e-4 ? 4 : 1),
      { w: 160, size: 12.5, color: GREEN }
    );

    s += '</svg>';
    el.innerHTML = s;

    /* ------------------------------ interaction --------------------------- */
    bindAlpha(el, el.querySelector('[data-dial="in"]'), 250, cy, r.params.alphaDeg, o.onAlpha);
  }

  /* ------------------------------------------------------------------ */
  /* Champs incident, réfléchi, transmis                                */
  /* ------------------------------------------------------------------ */

  function fields(el, r, opts) {
    if (!el) return;
    const o = opts || {};
    const uid = 'fld' + ++counter;
    const W = 880;
    const H = 430;
    const yRay = 150;
    const yAxis = 252;
    const t = Math.log(Math.max(r.params.eUm, 0.1) / 0.1) / Math.log(3000);
    const layerW = 26 + 70 * Math.max(0, Math.min(1, t));
    const x0 = 420;
    const x1 = x0 + layerW;
    const Lmax = 280;
    const Er = Math.sqrt(Math.max(0, Math.min(1, r.Ralpha)));
    const Et = Math.sqrt(Math.max(0, Math.min(1, r.Talpha)));
    const Lr = Math.max(1.5, Lmax * Er);
    const Lt = Math.max(1.5, Lmax * Et);

    let s = '<svg class="schematic-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="xMidYMid meet">';
    s += defs(uid);

    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fffdf7"/>';

    // axe z
    s += '<line x1="60" y1="' + yAxis + '" x2="844" y2="' + yAxis + '" stroke="rgba(51,50,44,0.45)" stroke-width="1.2" marker-end="url(#' + uid + '-arrow)"/>';
    s += fo(858, yAxis, 'z', { w: 40, size: 12.5 });
    s += text(66, yAxis - 8, 'propagation', { anchor: 'start', size: 10 });

    // couche
    s += '<rect x="' + x0 + '" y="70" width="' + layerW + '" height="160" fill="url(#' + uid + '-layer)" rx="2"/>';
    s += fo(x0 + layerW / 2, 44, 'e = ' + Format.texFixed(r.params.eUm, 1) + '\\,\\mathrm{\\mu m}', {
      w: 220,
      size: 12,
      color: GREEN,
    });
    s += text(x0 + layerW / 2, 246, 'couche', { size: 10 });

    // champ incident
    s += '<line x1="70" y1="' + yRay + '" x2="' + (x0 - 10) + '" y2="' + yRay + '" stroke="' + INK +
      '" stroke-width="2.2" marker-end="url(#' + uid + '-arrow)"/>';
    s += fo((70 + x0 - 10) / 2, 112, 'E_i', { w: 90, size: 13 });
    s += fo((70 + x0 - 10) / 2, 190, '|E_i| = 1', { w: 160, size: 11.5, color: MUTED });

    // champ réfléchi
    s += '<line x1="' + (x0 - 10) + '" y1="' + yRay + '" x2="' + (x0 - 10 - Lr) + '" y2="' + yRay +
      '" stroke="' + AMBER + '" stroke-width="2.2" stroke-dasharray="6 4" marker-end="url(#' + uid + '-arrow-a)"/>';
    s += fo(x0 - 10 - Lr / 2, 112, 'E_r', { w: 90, size: 13, color: AMBER });
    s += fo(x0 - 10 - Lr / 2, 190, '\\sqrt{R(\\alpha)} = ' + Format.texFixed(Er, 3), {
      w: 220,
      size: 11.5,
      color: AMBER,
    });

    // champ transmis
    s += '<line x1="' + (x1 + 10) + '" y1="' + yRay + '" x2="' + (x1 + 10 + Lt) + '" y2="' + yRay +
      '" stroke="' + GREEN + '" stroke-width="2.2" marker-end="url(#' + uid + '-arrow-g)"/>';
    s += fo(x1 + 10 + Lt / 2, 112, 'E_t', { w: 90, size: 13, color: GREEN });
    s += fo(x1 + 10 + Lt / 2, 190, '\\sqrt{T(\\alpha)} = ' + Format.texFixed(Et, 3), {
      w: 220,
      size: 11.5,
      color: GREEN,
    });

    // puissances
    s += fo(250, 300, 'R(\\alpha) = ' + Format.texPct(r.Ralpha, 1), { w: 200, size: 12, color: AMBER });
    s += fo(250, 324, 'T(\\alpha) = ' + Format.texPct(r.Talpha, r.Talpha < 1e-4 ? 4 : 1), {
      w: 200,
      size: 12,
      color: GREEN,
    });

    // poignée alpha
    const a = (r.params.alphaDeg * Math.PI) / 180;
    s += '<g data-dial="fld" tabindex="0" role="slider" aria-label="Angle de polarisation incidente" ' +
      'aria-valuemin="0" aria-valuemax="90" aria-valuenow="' + Format.num(r.params.alphaDeg, 0) +
      '" style="cursor:grab;touch-action:none;outline:none">';
    s += dialBase(uid, 770, 330, 44, {});
    s += '<line x1="770" y1="330" x2="' + (770 + 36 * Math.sin(a)).toFixed(2) + '" y2="' +
      (330 - 36 * Math.cos(a)).toFixed(2) + '" stroke="' + AMBER + '" stroke-width="2.4"/>';
    s += '<circle cx="' + (770 + 36 * Math.sin(a)).toFixed(2) + '" cy="' +
      (330 - 36 * Math.cos(a)).toFixed(2) + '" r="4.5" fill="' + AMBER + '" stroke="#fffdf7" stroke-width="2"/>';
    s += '</g>';
    s += fo(770, 396, '\\alpha = ' + Format.texFixed(r.params.alphaDeg, 0) + '^{\\circ}', {
      w: 140,
      size: 12,
      color: AMBER,
    });

    s += text(70, 36, 'amplitudes relatives du champ', { anchor: 'start', size: 11 });

    s += '</svg>';
    el.innerHTML = s;

    bindAlpha(el, el.querySelector('[data-dial="fld"]'), 770, 330, r.params.alphaDeg, o.onAlpha);
  }

  /* ------------------------------------------------------------------ */
  /* Section droite agrandie                                            */
  /* ------------------------------------------------------------------ */

  function polarization(el, r, opts) {
    if (!el) return;
    const o = opts || {};
    const uid = 'pol' + ++counter;
    const W = 520;
    const H = 470;
    const cx = 250;
    const cy = 232;
    const R = 150;

    let s = '<svg class="schematic-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="xMidYMid meet">';
    s += defs(uid);

    s += dialBase(uid, cx, cy, R, {
      angleArc: true,
      angle: (r.params.alphaDeg * Math.PI) / 180,
    });

    // cercle unité
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(51,50,44,0.2)"/>';

    // champ incident (gris) et composantes
    const a = (r.params.alphaDeg * Math.PI) / 180;
    const ix = cx + R * Math.sin(a);
    const iy = cy - R * Math.cos(a);
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + ix.toFixed(2) + '" y2="' + iy.toFixed(2) +
      '" stroke="' + AMBER + '" stroke-width="2.2" stroke-dasharray="6 4" marker-end="url(#' + uid + '-arrow-a)"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - R * Math.cos(a)).toFixed(2) +
      '" stroke="' + GREEN + '" stroke-width="2.2" opacity="0.85"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.sin(a)).toFixed(2) + '" y2="' + cy +
      '" stroke="' + BLUE + '" stroke-width="2.2" opacity="0.85"/>';

    s += fo(cx - 34, cy - R * Math.cos(a) / 2, 'E_p^{in}', { w: 80, size: 12, color: GREEN });
    s += fo(cx + R * Math.sin(a) / 2, cy + 22, 'E_b^{in}', { w: 80, size: 12, color: BLUE });
    s += fo(ix + (ix > cx ? 30 : -30), iy - 18, 'E_0', { w: 60, size: 12, color: AMBER });

    // polarisation de sortie
    if (r.polDefined) {
      const e = ellipsePath(cx, cy, R, r.u, r.w, r.Delta);
      s += '<path d="' + e.d + '" fill="rgba(31,77,58,0.07)" stroke="' + GREEN + '" stroke-width="2.6"/>';
      const xTip = cx + e.scale * r.w;
      const yTip = cy - e.scale * r.u * Math.cos(-r.Delta);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + xTip.toFixed(2) + '" y2="' + yTip.toFixed(2) +
        '" stroke="' + GREEN + '" stroke-width="1.6"/>';
      s += '<circle cx="' + xTip.toFixed(2) + '" cy="' + yTip.toFixed(2) + '" r="4.5" fill="' + GREEN + '"/>';
      // angle psi de l'ellipse
      const psi = r.psi;
      const rp = R * 0.78;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + rp * Math.sin(psi)).toFixed(2) + '" y2="' +
        (cy - rp * Math.cos(psi)).toFixed(2) + '" stroke="' + GREEN + '" stroke-width="1" stroke-dasharray="3 4" opacity="0.7"/>';
      s += fo(cx + (rp + 22) * Math.sin(psi), cy - (rp + 22) * Math.cos(psi), '\\psi', {
        w: 60,
        size: 12,
        color: GREEN,
      });
    } else {
      s += fo(cx, H - 58, '\\text{polarisation de sortie non définie}', {
        w: 420,
        size: 12,
        color: MUTED,
      });
    }

    // poignée
    s += '<circle cx="' + ix.toFixed(2) + '" cy="' + iy.toFixed(2) + '" r="7" fill="' + AMBER +
      '" stroke="#fffdf7" stroke-width="2.5"/>';
    s += '<g data-dial="pol" tabindex="0" role="slider" aria-label="Angle de polarisation incidente" ' +
      'aria-valuemin="0" aria-valuemax="90" aria-valuenow="' + Format.num(r.params.alphaDeg, 0) +
      '" style="cursor:grab;touch-action:none;outline:none">';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 10) + '" fill="transparent"/>';
    s += '</g>';

    s += fo(cx, H - 30, '\\alpha = ' + Format.texFixed(r.params.alphaDeg, 0) +
      '^{\\circ}\\quad \\psi = ' + Format.texDeg(r.psi, 2) +
      '\\quad \\chi = ' + Format.texDeg(r.chi, 2), { w: 420, size: 13 });
    s += text(cx, 46, 'section droite, vue face à l’onde incidente', { size: 11 });
    s += fo(W - 20, 46, '\\text{sortie}', { w: 90, size: 11, color: GREEN });

    s += '</svg>';
    el.innerHTML = s;

    bindAlpha(el, el.querySelector('[data-dial="pol"]'), cx, cy, r.params.alphaDeg, o.onAlpha);
  }

  /* ------------------------------------------------------------------ */
  /* Animation E(t)                                                     */
  /* ------------------------------------------------------------------ */

  function wave(el, r, opts) {
    if (!el) return;
    if (el._raf) {
      cancelAnimationFrame(el._raf);
      el._raf = null;
    }
    const o = opts || {};
    const uid = 'wav' + ++counter;
    const W = 520;
    const H = 430;
    const cx = 250;
    const cy = 210;
    const R = 145;
    const boost = o.boost === undefined ? 1 : o.boost;
    const playing = o.playing !== false;

    let s = '<svg class="schematic-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="xMidYMid meet">';
    s += defs(uid);
    s += dialBase(uid, cx, cy, R, {});
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(51,50,44,0.2)"/>';

    if (r.polDefined) {
      const e = ellipsePath(cx, cy, R, r.u, r.w * boost, r.Delta);
      s += '<path d="' + e.d + '" fill="rgba(31,77,58,0.06)" stroke="' + GREEN +
        '" stroke-width="1.6" stroke-dasharray="5 4" opacity="0.9"/>';
      s += '<g data-vec><line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - R) +
        '" stroke="' + AMBER + '" stroke-width="2.6" marker-end="url(#' + uid + '-arrow-a)"/>' +
        '<circle cx="' + cx + '" cy="' + (cy - R) + '" r="5" fill="' + AMBER + '"/></g>';
      s += fo(cx, H - 34, '\\text{ellipse de sortie : } \\chi = ' + Format.texDeg(r.chi, 2), {
        w: 380,
        size: 12.5,
      });
    } else {
      s += fo(cx, cy, '\\text{phase non définie}', { w: 300, size: 12, color: MUTED });
    }
    s += text(cx, 42, boost === 1 ? 'champ E(t), échelle réelle' : 'champ E(t), composante b agrandie', {
      size: 11,
    });
    s += '</svg>';
    el.innerHTML = s;

    if (!r.polDefined || !playing) return;
    const vec = el.querySelector('[data-vec]');
    if (!vec) return;

    const line = vec.querySelector('line');
    const dot = vec.querySelector('circle');
    const scale = (0.86 * R) / Math.max(Math.abs(r.u), Math.abs(r.w * boost), 1e-12);
    const t0 = performance.now();
    const period = 3400;

    function frame(now) {
      const th = (2 * Math.PI * ((now - t0) % period)) / period;
      const ep = r.u * Math.cos(th);
      const eb = r.w * boost * Math.cos(th - r.Delta);
      const x = cx + scale * eb;
      const y = cy - scale * ep;
      line.setAttribute('x2', x.toFixed(2));
      line.setAttribute('y2', y.toFixed(2));
      dot.setAttribute('cx', x.toFixed(2));
      dot.setAttribute('cy', y.toFixed(2));
      el._raf = requestAnimationFrame(frame);
    }
    el._raf = requestAnimationFrame(frame);
  }

  function stopAll() {
    document.querySelectorAll('[data-schematic]').forEach(function (host) {
      if (host._raf) {
        cancelAnimationFrame(host._raf);
        host._raf = null;
      }
    });
  }

  return { device: device, fields: fields, polarization: polarization, wave: wave, stopAll: stopAll };
})();
