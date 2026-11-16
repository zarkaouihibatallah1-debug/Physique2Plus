/**
 * Graphiques SVG légers (aucune dépendance).
 * Titres, axes et légendes passent par KaTeX : aucun symbole en texte brut.
 */
const Chart = (function () {
  const W = 880;
  const H = 420;
  const FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";
  const INK = '#33322c';
  const GRID = 'rgba(51,50,44,0.12)';

  function esc(s) {
    return Format.esc(s);
  }

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /* ------------------------------- échelles ------------------------------ */

  function scale(spec, range) {
    const d = spec.domain;
    const type = spec.type || 'lin';
    const lo = Math.log10(Math.max(d[0], 1e-300));
    const hi = Math.log10(Math.max(d[1], 1e-300));
    return {
      type: type,
      domain: d,
      range: range,
      fwd: function (v) {
        if (type === 'log') {
          if (!(v > 0)) return NaN;
          return (Math.log10(v) - lo) / (hi - lo);
        }
        return (v - d[0]) / (d[1] - d[0]);
      },
    };
  }

  function px(s, v) {
    const t = s.fwd(v);
    return s.range[0] + (s.range[1] - s.range[0]) * t;
  }

  function niceStep(span, target) {
    const raw = span / Math.max(1, target);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    let step;
    if (m <= 1) step = 1;
    else if (m <= 2) step = 2;
    else if (m <= 2.5) step = 2.5;
    else if (m <= 5) step = 5;
    else step = 10;
    return step * p;
  }

  function linTicks(d, target) {
    const step = niceStep(d[1] - d[0], target || 6);
    const start = Math.ceil(d[0] / step - 1e-9) * step;
    const out = [];
    for (let v = start; v <= d[1] + step * 1e-6; v += step) {
      out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(10)));
    }
    return out;
  }

  function logTicks(d) {
    const out = [];
    const lo = Math.floor(Math.log10(d[0]));
    const hi = Math.ceil(Math.log10(d[1]));
    const decades = hi - lo;
    for (let e = lo; e <= hi; e++) {
      [1, 2, 5].forEach(function (m) {
        const v = m * Math.pow(10, e);
        if (v < d[0] * 0.999 || v > d[1] * 1.001) return;
        if (decades > 3 && m !== 1) return;
        out.push(v);
      });
    }
    if (!out.length) out.push(d[0], d[1]);
    return out;
  }

  function ticks(s, target) {
    return s.type === 'log' ? logTicks(s.domain) : linTicks(s.domain, target);
  }

  function tickLabel(v) {
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1000) return Format.int(v);
    if (a >= 1) return Format.num(v, a % 1 === 0 ? 0 : 1);
    if (a >= 0.01) return Format.num(v, 2).replace(/0$/, '');
    return Format.num(v, 3);
  }

  /* ------------------------------ éléments ------------------------------- */

  function fo(x, y, tex, opts) {
    const o = opts || {};
    const w = o.w || 420;
    const h = o.h || 26;
    const justify = o.anchor === 'start' ? 'flex-start' : o.anchor === 'end' ? 'flex-end' : 'center';
    const style =
      'position:absolute;left:0;top:0;width:' + w + 'px;height:' + h + 'px;display:flex;' +
      'align-items:center;justify-content:' + justify + ';font-size:' + (o.size || 13) +
      'px;color:' + (o.color || INK) + ';line-height:1.1;white-space:nowrap;';
    const rot = o.rotate ? ' transform="rotate(' + o.rotate + ' ' + x + ' ' + y + ')"' : '';
    return (
      '<foreignObject x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w +
      '" height="' + h + '"' + rot + ' overflow="visible"><div xmlns="http://www.w3.org/1999/xhtml" style="' +
      style + '">' + Format.html(tex) + '</div></foreignObject>'
    );
  }

  function pathFrom(points, xS, yS) {
    let d = '';
    let pen = false;
    points.forEach(function (p) {
      const x = px(xS, p[0]);
      const y = px(yS, p[1]);
      if (!isNum(x) || !isNum(y)) {
        pen = false;
        return;
      }
      d += (pen ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      pen = true;
    });
    return d.trim();
  }

  function legendHtml(items) {
    return items
      .map(function (it) {
        const sw =
          '<span class="lg-swatch" style="background:' + it.color + ';' +
          (it.dash ? 'height:0;border-top:2px dashed ' + it.color + ';background:none;' : '') +
          '"></span>';
        return '<span class="lg-item">' + sw + '<span data-tex="' + esc(it.tex) + '"></span></span>';
      })
      .join('');
  }

  function shell(el, opts, body, legend) {
    const title = opts.title
      ? '<div class="chart-title" data-tex="' + esc(opts.title) + '"></div>'
      : '';
    el.innerHTML =
      '<div class="chart-card">' +
      (title || legend ? '<div class="chart-head">' + title + '<div class="chart-legend">' + (legend || '') + '</div></div>' : '') +
      '<div class="chart-body">' + body + '</div>' +
      (opts.note ? '<p class="chart-note">' + esc(opts.note) + '</p>' : '') +
      '</div>';
    el.querySelectorAll('[data-tex]').forEach(function (n) {
      Format.render(n, n.getAttribute('data-tex'));
    });
  }

  /* -------------------------------- courbes ------------------------------ */

  function line(el, opts) {
    if (!el) return;
    const hasY2 = !!(opts.y2 && opts.y2.domain);
    const m = { l: 66, r: hasY2 ? 74 : 26, t: 16, b: 54 };
    const plot = { x0: m.l, x1: W - m.r, y0: m.t, y1: H - m.b };
    const xS = scale(opts.x, [plot.x0, plot.x1]);
    const yS = scale(opts.y, [plot.y1, plot.y0]);
    const y2S = hasY2 ? scale(opts.y2, [plot.y1, plot.y0]) : null;

    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="xMidYMid meet">';
    svg += '<defs><clipPath id="clip-plot"><rect x="' + plot.x0 + '" y="' + plot.y0 +
      '" width="' + (plot.x1 - plot.x0) + '" height="' + (plot.y1 - plot.y0) + '"/></clipPath></defs>';

    // bandes verticales
    (opts.bands || []).forEach(function (b) {
      const xa = px(xS, b.x0);
      const xb = px(xS, b.x1);
      svg += '<rect x="' + Math.min(xa, xb) + '" y="' + plot.y0 + '" width="' + Math.abs(xb - xa) +
        '" height="' + (plot.y1 - plot.y0) + '" fill="' + (b.color || 'rgba(184,130,42,0.08)') + '"/>';
    });

    // grille + graduations
    ticks(yS).forEach(function (v) {
      const y = px(yS, v);
      if (y < plot.y0 - 0.5 || y > plot.y1 + 0.5) return;
      svg += '<line x1="' + plot.x0 + '" y1="' + y.toFixed(1) + '" x2="' + plot.x1 + '" y2="' + y.toFixed(1) +
        '" stroke="' + GRID + '"/>';
      svg += '<text x="' + (plot.x0 - 8) + '" y="' + (y + 4).toFixed(1) +
        '" text-anchor="end" font-family="' + FONT + '" font-size="11" fill="#6d6b60">' + tickLabel(v) + '</text>';
    });
    ticks(xS).forEach(function (v) {
      const x = px(xS, v);
      if (x < plot.x0 - 0.5 || x > plot.x1 + 0.5) return;
      svg += '<line x1="' + x.toFixed(1) + '" y1="' + plot.y0 + '" x2="' + x.toFixed(1) + '" y2="' + plot.y1 +
        '" stroke="' + GRID + '"/>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + (plot.y1 + 18) +
        '" text-anchor="middle" font-family="' + FONT + '" font-size="11" fill="#6d6b60">' + tickLabel(v) + '</text>';
    });
    if (y2S) {
      ticks(y2S).forEach(function (v) {
        const y = px(y2S, v);
        if (y < plot.y0 - 0.5 || y > plot.y1 + 0.5) return;
        svg += '<text x="' + (plot.x1 + 8) + '" y="' + (y + 4).toFixed(1) +
          '" text-anchor="start" font-family="' + FONT + '" font-size="11" fill="#8a6a2f">' + tickLabel(v) + '</text>';
      });
    }

    // cadre
    svg += '<rect x="' + plot.x0 + '" y="' + plot.y0 + '" width="' + (plot.x1 - plot.x0) + '" height="' +
      (plot.y1 - plot.y0) + '" fill="none" stroke="rgba(51,50,44,0.35)"/>';

    // lignes horizontales de repère
    (opts.hlines || []).forEach(function (h) {
      const s = h.axis === 'y2' && y2S ? y2S : yS;
      const y = px(s, h.y);
      if (!isNum(y)) return;
      svg += '<line x1="' + plot.x0 + '" y1="' + y.toFixed(1) + '" x2="' + plot.x1 + '" y2="' + y.toFixed(1) +
        '" stroke="' + (h.color || '#b8822a') + '" stroke-width="1.2" stroke-dasharray="' + (h.dash || '5 4') + '"/>';
      if (h.tex) svg += fo(plot.x1 - 90, y - 13, h.tex, { anchor: 'end', w: 240, size: 12, color: h.color || '#8a6a2f' });
    });

    // séries
    svg += '<g clip-path="url(#clip-plot)">';
    (opts.series || []).forEach(function (s) {
      const ys = s.axis === 'y2' && y2S ? y2S : yS;
      const d = pathFrom(s.points || [], xS, ys);
      if (s.fill && d) {
        const first = s.points[0];
        const last = s.points[s.points.length - 1];
        const yBase = px(ys, s.fillBase === undefined ? ys.domain[0] : s.fillBase);
        const closed = d + ' L' + px(xS, last[0]).toFixed(2) + ' ' + yBase.toFixed(2) +
          ' L' + px(xS, first[0]).toFixed(2) + ' ' + yBase.toFixed(2) + ' Z';
        svg += '<path d="' + closed + '" fill="' + s.fill + '" stroke="none"/>';
      }
      if (d) {
        svg += '<path d="' + d + '" fill="none" stroke="' + (s.color || '#1f4d3a') +
          '" stroke-width="' + (s.width || 2.2) + '" stroke-linejoin="round" stroke-linecap="round"' +
          (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/>';
      }
    });
    svg += '</g>';

    // marqueurs
    (opts.markers || []).forEach(function (mk) {
      const s = mk.axis === 'y2' && y2S ? y2S : yS;
      const x = px(xS, mk.x);
      const y = px(s, mk.y);
      if (!isNum(x) || !isNum(y)) return;
      if (mk.vline) {
        svg += '<line x1="' + x.toFixed(1) + '" y1="' + plot.y0 + '" x2="' + x.toFixed(1) + '" y2="' + plot.y1 +
          '" stroke="' + (mk.color || '#b8822a') + '" stroke-width="1" stroke-dasharray="2 4" opacity="0.7"/>';
      }
      svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" fill="#fffdf7" stroke="' +
        (mk.color || '#b8822a') + '" stroke-width="2.2"/>';
      if (mk.tex) {
        const left = x > plot.x1 - 160;
        svg += fo(left ? x - 12 : x + 12, y - 18, mk.tex, {
          anchor: left ? 'end' : 'start',
          w: 300,
          size: 12,
          color: mk.color || '#8a6a2f',
        });
      }
    });

    // titres d'axes
    svg += fo((plot.x0 + plot.x1) / 2, H - 16, opts.x.label || '', { size: 13.5, w: 520 });
    svg += fo(24, (plot.y0 + plot.y1) / 2, opts.y.label || '', {
      size: 13.5,
      w: 340,
      rotate: -90,
    });
    if (y2S && opts.y2.label) {
      svg += fo(W - 20, (plot.y0 + plot.y1) / 2, opts.y2.label, {
        size: 13.5,
        w: 340,
        rotate: 90,
        color: '#8a6a2f',
      });
    }
    svg += '</svg>';

    const legendItems = (opts.series || [])
      .filter(function (s) {
        return s.tex;
      })
      .map(function (s) {
        return { tex: s.tex, color: s.color, dash: s.dash };
      });
    (opts.hlines || []).forEach(function (h) {
      if (h.tex) legendItems.push({ tex: h.tex, color: h.color || '#b8822a', dash: 'yes' });
    });
    shell(el, opts, svg, legendHtml(legendItems));
  }

  /* -------------------------------- carte -------------------------------- */

  function lerpColor(a, b, t) {
    return (
      'rgb(' +
      Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t) + ')'
    );
  }

  const SCALE = [
    [0.0, [250, 246, 235]],
    [0.25, [214, 224, 200]],
    [0.5, [148, 186, 150]],
    [0.75, [58, 118, 88]],
    [1.0, [22, 62, 46]],
  ];

  function colorFor(t) {
    const u = Math.max(0, Math.min(1, t));
    for (let i = 1; i < SCALE.length; i++) {
      if (u <= SCALE[i][0]) {
        const a = SCALE[i - 1];
        const b = SCALE[i];
        return lerpColor(a[1], b[1], (u - a[0]) / (b[0] - a[0]));
      }
    }
    return 'rgb(22,62,46)';
  }

  /** Lignes de niveau par « marching squares ». */
  function contours(values, xPix, yPix, level) {
    const segs = [];
    const nx = xPix.length;
    const ny = yPix.length;
    function v(i, j) {
      return values[j][i];
    }
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = v(i, j);
        const b = v(i + 1, j);
        const c = v(i + 1, j + 1);
        const d = v(i, j + 1);
        if (![a, b, c, d].every(isNum)) continue;
        const pts = [];
        if ((a - level) * (b - level) < 0) {
          const t = (level - a) / (b - a);
          pts.push([xPix[i] + t * (xPix[i + 1] - xPix[i]), yPix[j]]);
        }
        if ((b - level) * (c - level) < 0) {
          const t = (level - b) / (c - b);
          pts.push([xPix[i + 1], yPix[j] + t * (yPix[j + 1] - yPix[j])]);
        }
        if ((d - level) * (c - level) < 0) {
          const t = (level - d) / (c - d);
          pts.push([xPix[i] + t * (xPix[i + 1] - xPix[i]), yPix[j + 1]]);
        }
        if ((a - level) * (d - level) < 0) {
          const t = (level - a) / (d - a);
          pts.push([xPix[i], yPix[j] + t * (yPix[j + 1] - yPix[j])]);
        }
        if (pts.length === 2) segs.push(pts);
        else if (pts.length === 4) {
          segs.push([pts[0], pts[1]]);
          segs.push([pts[2], pts[3]]);
        }
      }
    }
    return segs;
  }

  function heatmap(el, opts) {
    if (!el) return;
    const m = { l: 70, r: 96, t: 16, b: 54 };
    const plot = { x0: m.l, x1: W - m.r, y0: m.t, y1: H - m.b };
    const xS = scale(opts.x, [plot.x0, plot.x1]);
    const yS = scale(opts.y, [plot.y1, plot.y0]);
    const values = opts.values || [];
    const nx = opts.xs.length;
    const ny = opts.ys.length;

    const xPix = opts.xs.map(function (v) { return px(xS, v); });
    const yPix = opts.ys.map(function (v) { return px(yS, v); });

    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="xMidYMid meet">';
    svg += '<rect x="' + plot.x0 + '" y="' + plot.y0 + '" width="' + (plot.x1 - plot.x0) + '" height="' +
      (plot.y1 - plot.y0) + '" fill="#faf7ef"/>';

    const lo = opts.min;
    const hi = opts.max;
    for (let j = 0; j < ny; j++) {
      const ya = j === 0 ? yPix[0] : (yPix[j - 1] + yPix[j]) / 2;
      const yb = j === ny - 1 ? yPix[ny - 1] : (yPix[j] + yPix[j + 1]) / 2;
      for (let i = 0; i < nx; i++) {
        const v = values[j] ? values[j][i] : NaN;
        if (!isNum(v)) continue;
        const xa = i === 0 ? xPix[0] : (xPix[i - 1] + xPix[i]) / 2;
        const xb = i === nx - 1 ? xPix[nx - 1] : (xPix[i] + xPix[i + 1]) / 2;
        svg += '<rect x="' + xa.toFixed(1) + '" y="' + Math.min(ya, yb).toFixed(1) + '" width="' +
          Math.max(0.6, xb - xa).toFixed(1) + '" height="' + Math.max(0.6, Math.abs(yb - ya)).toFixed(1) +
          '" fill="' + colorFor((v - lo) / (hi - lo)) + '"/>';
      }
    }

    // contours
    (opts.contours || []).forEach(function (c) {
      const segs = contours(values, xPix, yPix, c.level);
      let d = '';
      segs.forEach(function (s) {
        d += 'M' + s[0][0].toFixed(1) + ' ' + s[0][1].toFixed(1) + 'L' + s[1][0].toFixed(1) + ' ' + s[1][1].toFixed(1);
      });
      if (d) {
        svg += '<path d="' + d + '" fill="none" stroke="' + (c.color || '#fffdf7') + '" stroke-width="' +
          (c.width || 2) + '" stroke-dasharray="' + (c.dash || '6 4') + '" stroke-linecap="round"/>';
      }
    });

    // cadre + graduations
    ticks(xS).forEach(function (v) {
      const x = px(xS, v);
      if (x < plot.x0 - 0.5 || x > plot.x1 + 0.5) return;
      svg += '<text x="' + x.toFixed(1) + '" y="' + (plot.y1 + 18) +
        '" text-anchor="middle" font-family="' + FONT + '" font-size="11" fill="#6d6b60">' + tickLabel(v) + '</text>';
    });
    ticks(yS).forEach(function (v) {
      const y = px(yS, v);
      if (y < plot.y0 - 0.5 || y > plot.y1 + 0.5) return;
      svg += '<text x="' + (plot.x0 - 8) + '" y="' + (y + 4).toFixed(1) +
        '" text-anchor="end" font-family="' + FONT + '" font-size="11" fill="#6d6b60">' + tickLabel(v) + '</text>';
    });
    svg += '<rect x="' + plot.x0 + '" y="' + plot.y0 + '" width="' + (plot.x1 - plot.x0) + '" height="' +
      (plot.y1 - plot.y0) + '" fill="none" stroke="rgba(51,50,44,0.4)"/>';

    // repère du réglage courant
    if (opts.marker) {
      const x = px(xS, opts.marker.x);
      const y = px(yS, opts.marker.y);
      if (isNum(x) && isNum(y)) {
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
          '" r="6" fill="none" stroke="#fffdf7" stroke-width="2.5"/>' +
          '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
          '" r="6" fill="none" stroke="#b8822a" stroke-width="1.6"/>';
      }
    }

    // échelle de couleurs
    const gx = W - 54;
    const gy0 = plot.y0 + 10;
    const gy1 = plot.y1 - 10;
    let grad = '';
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const y = gy1 - t * (gy1 - gy0);
      grad += '<rect x="' + gx + '" y="' + (y - 2).toFixed(1) + '" width="16" height="' +
        ((gy1 - gy0) / 40 + 0.8).toFixed(1) + '" fill="' + colorFor(t) + '"/>';
    }
    svg += grad;
    svg += '<rect x="' + gx + '" y="' + gy0 + '" width="16" height="' + (gy1 - gy0) +
      '" fill="none" stroke="rgba(51,50,44,0.35)"/>';
    svg += '<text x="' + (gx + 8) + '" y="' + (gy0 - 8) + '" text-anchor="middle" font-family="' + FONT +
      '" font-size="10" fill="#6d6b60">' + tickLabel(hi) + '</text>';
    svg += '<text x="' + (gx + 8) + '" y="' + (gy1 + 18) + '" text-anchor="middle" font-family="' + FONT +
      '" font-size="10" fill="#6d6b60">' + tickLabel(lo) + '</text>';

    svg += fo((plot.x0 + plot.x1) / 2, H - 16, opts.x.label || '', { size: 13.5, w: 520 });
    svg += fo(24, (plot.y0 + plot.y1) / 2, opts.y.label || '', { size: 13.5, w: 340, rotate: -90 });
    svg += '</svg>';

    const legendItems = (opts.contours || []).map(function (c) {
      return { tex: c.tex, color: c.color || '#fffdf7', dash: 'yes' };
    });
    shell(el, opts, svg, legendHtml(legendItems));
  }

  function empty(el, message) {
    if (!el) return;
    el.innerHTML = '<div class="chart-empty">' + esc(message) + '</div>';
  }

  return { line: line, heatmap: heatmap, empty: empty, colorFor: colorFor };
})();
