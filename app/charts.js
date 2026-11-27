/* Hearth Ledger — charts.
   Small hand-rolled SVG charts: a donut for spending by category and
   bar charts for income-vs-spending trends. No libraries, no network. */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function polar(cx, cy, r, angleDeg) {
    var a = (angleDeg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  /* Donut chart: slices = [{label, value, color}]. Returns an SVG element. */
  function donut(slices, size, thickness) {
    var total = slices.reduce(function (s, x) { return s + x.value; }, 0);
    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-label': 'Spending by category chart' });
    var cx = size / 2, cy = size / 2, r = size / 2 - thickness / 2;
    if (total <= 0) {
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: '#e3e0d8', 'stroke-width': thickness }));
      return svg;
    }
    var angle = 0;
    slices.forEach(function (s) {
      if (s.value <= 0) return;
      var frac = s.value / total;
      var start = polar(cx, cy, r, angle);
      var end = polar(cx, cy, r, angle + frac * 360);
      var large = frac > 0.5 ? 1 : 0;
      var path = svgEl('path', {
        d: 'M ' + start[0].toFixed(2) + ' ' + start[1].toFixed(2) +
           ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + end[0].toFixed(2) + ' ' + end[1].toFixed(2),
        fill: 'none', stroke: s.color, 'stroke-width': thickness, 'stroke-linecap': 'butt'
      });
      path.appendChild(document.createElementNS(NS, 'title'));
      path.firstChild.textContent = s.label + ': ' + s.value.toFixed(2);
      svg.appendChild(path);
      angle += frac * 360;
    });
    var hole = svgEl('circle', { cx: cx, cy: cy, r: r - thickness / 2, fill: 'none' });
    svg.appendChild(hole);
    return svg;
  }

  /* Grouped vertical bars: series = [{label, income, spent}].
     Returns an SVG element sized to the given width/height. */
  function trendBars(series, width, height) {
    var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, width: '100%', height: height, role: 'img', 'aria-label': 'Monthly income and spending chart' });
    var padL = 52, padB = 28, padT = 12, padR = 8;
    var max = 0;
    series.forEach(function (s) { max = Math.max(max, s.income, s.spent); });
    max = Math.ceil(max / 1000) * 1000 || 1000;
    var plotW = width - padL - padR, plotH = height - padT - padB;
    var y = function (v) { return padT + plotH - (v / max) * plotH; };

    // gridlines + y labels
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var gy = padT + plotH * (1 - f);
      svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: width - padR, y2: gy, stroke: '#e7e3da', 'stroke-width': 1 }));
      var t = svgEl('text', { x: padL - 8, y: gy + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#8a8378' });
      t.textContent = '$' + Math.round(max * f / 100) / 10 + 'k';
      svg.appendChild(t);
    });

    var groupW = plotW / series.length;
    var barW = Math.min(26, (groupW - 18) / 2);
    series.forEach(function (s, i) {
      var gx = padL + i * groupW + groupW / 2;
      var b1 = svgEl('rect', { x: gx - barW - 2, y: y(s.income), width: barW, height: Math.max(1, padT + plotH - y(s.income)), rx: 3, fill: '#2f6f5e' });
      var b2 = svgEl('rect', { x: gx + 2, y: y(s.spent), width: barW, height: Math.max(1, padT + plotH - y(s.spent)), rx: 3, fill: '#c26a3d' });
      b1.appendChild(document.createElementNS(NS, 'title')).textContent = s.label + ' income $' + s.income.toFixed(0);
      b2.appendChild(document.createElementNS(NS, 'title')).textContent = s.label + ' spending $' + s.spent.toFixed(0);
      svg.appendChild(b1);
      svg.appendChild(b2);
      var lbl = svgEl('text', { x: gx, y: height - 8, 'text-anchor': 'middle', 'font-size': 12, fill: '#5c564c' });
      lbl.textContent = s.label;
      svg.appendChild(lbl);
    });
    return svg;
  }

  /* Horizontal progress bar used for budgets and goals.
     Returns an HTML string (a div bar), not SVG. */
  function progressBar(pct, color, label) {
    var p = Math.max(0, Math.min(100, pct));
    var over = pct > 100;
    return '<div class="bar" role="img" aria-label="' + (label || '') + '">' +
      '<div class="bar-fill' + (over ? ' over' : '') + '" style="width:' + p + '%;background:' + color + '"></div>' +
      '</div>';
  }

  window.HearthCharts = { donut: donut, trendBars: trendBars, progressBar: progressBar };
})();
