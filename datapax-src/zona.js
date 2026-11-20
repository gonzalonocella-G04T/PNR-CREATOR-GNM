/* ===== Ubicación de la zona MRZ en una foto o escaneo =====
   Trabaja sobre píxeles (ImageData o {data,width,height} RGBA). Busca bloques de texto oscuro,
   largos y densos (las 2 o 3 líneas de la MRZ), calcula su inclinación y devuelve recortes enderezados. */
var ZONA = (function () {
  function gris(img, maxLado) {
    var W = img.width, H = img.height, s = Math.min(1, maxLado / Math.max(W, H));
    var w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
    var g = new Uint8Array(w * h), d = img.data;
    for (var y = 0; y < h; y++) {
      var y0 = Math.floor(y / s), y1 = Math.min(H, Math.floor((y + 1) / s)); if (y1 <= y0) y1 = y0 + 1;
      for (var x = 0; x < w; x++) {
        var x0 = Math.floor(x / s), x1 = Math.min(W, Math.floor((x + 1) / s)); if (x1 <= x0) x1 = x0 + 1;
        var t = 0, n = 0;
        for (var yy = y0; yy < y1; yy += 1 + ((y1 - y0) >> 2)) for (var xx = x0; xx < x1; xx += 1 + ((x1 - x0) >> 2)) {
          var i = (yy * W + xx) * 4; t += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; n++;
        }
        g[y * w + x] = t / n;
      }
    }
    return { g: g, w: w, h: h, s: s };
  }
  // Píxeles más oscuros que su entorno (umbral local con imagen integral)
  function mascara(G, rad, C) {
    var g = G.g, w = G.w, h = G.h, I = new Float64Array((w + 1) * (h + 1));
    for (var y = 0; y < h; y++) { var f = 0; for (var x = 0; x < w; x++) { f += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + f; } }
    var m = new Uint8Array(w * h);
    for (y = 0; y < h; y++) {
      var a = Math.max(0, y - rad), b = Math.min(h, y + rad + 1);
      for (x = 0; x < w; x++) {
        var c = Math.max(0, x - rad), e = Math.min(w, x + rad + 1);
        var sum = I[b * (w + 1) + e] - I[a * (w + 1) + e] - I[b * (w + 1) + c] + I[a * (w + 1) + c];
        var mean = sum / ((b - a) * (e - c));
        m[y * w + x] = g[y * w + x] < mean - C ? 1 : 0;
      }
    }
    return m;
  }
  // Dilatación / erosión binaria con cuadrado (separable)
  function morf(m, w, h, r, dil) {
    var t = new Uint8Array(w * h), o = new Uint8Array(w * h), x, y, k, v;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      v = dil ? 0 : 1;
      for (k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { if (dil) { if (m[y * w + k]) { v = 1; break; } } else if (!m[y * w + k]) { v = 0; break; } }
      t[y * w + x] = v;
    }
    for (x = 0; x < w; x++) for (y = 0; y < h; y++) {
      v = dil ? 0 : 1;
      for (k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { if (dil) { if (t[k * w + x]) { v = 1; break; } } else if (!t[k * w + x]) { v = 0; break; } }
      o[y * w + x] = v;
    }
    return o;
  }
  // Componentes conexas con momentos (orientación y largo de cada bloque)
  function bloques(m, raw, w, h) {
    var lab = new Int32Array(w * h), out = [], st = new Int32Array(w * h), id = 0;
    for (var p = 0; p < w * h; p++) {
      if (!m[p] || lab[p]) continue;
      id++; var sp = 0; st[sp++] = p; lab[p] = id;
      var n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, tinta = 0;
      while (sp) {
        var q = st[--sp], qx = q % w, qy = (q - qx) / w;
        n++; sx += qx; sy += qy; sxx += qx * qx; syy += qy * qy; sxy += qx * qy; tinta += raw[q];
        if (qx > 0 && m[q - 1] && !lab[q - 1]) { lab[q - 1] = id; st[sp++] = q - 1; }
        if (qx < w - 1 && m[q + 1] && !lab[q + 1]) { lab[q + 1] = id; st[sp++] = q + 1; }
        if (qy > 0 && m[q - w] && !lab[q - w]) { lab[q - w] = id; st[sp++] = q - w; }
        if (qy < h - 1 && m[q + w] && !lab[q + w]) { lab[q + w] = id; st[sp++] = q + w; }
      }
      if (n < 80) continue;
      var cx = sx / n, cy = sy / n, vxx = sxx / n - cx * cx, vyy = syy / n - cy * cy, vxy = sxy / n - cx * cy;
      var tr = vxx + vyy, det = vxx * vyy - vxy * vxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
      var ang = 0.5 * Math.atan2(2 * vxy, vxx - vyy);
      var L = Math.sqrt(12 * l1), A = Math.sqrt(12 * l2);
      out.push({ cx: cx, cy: cy, ang: ang, largo: L, ancho: A, area: n, relleno: n / (L * A), tinta: tinta / n });
    }
    return out;
  }
  // Junta líneas paralelas, de largo parecido y vecinas (las 2 o 3 líneas de una MRZ) en un bloque
  function agrupar(ls) {
    var usados = {}, grupos = [];
    for (var i = 0; i < ls.length; i++) {
      if (usados[i]) continue;
      var a = ls[i], g = [a], ix = [i];
      var nx = -Math.sin(a.ang), ny = Math.cos(a.ang), tx = Math.cos(a.ang), ty = Math.sin(a.ang);
      for (var j = 0; j < ls.length; j++) {
        if (j === i || usados[j]) continue;
        var b = ls[j], da = Math.abs(Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang)));
        da = Math.min(da, Math.PI - da);
        var r = b.largo / a.largo, dx = b.cx - a.cx, dy = b.cy - a.cy;
        var perp = Math.abs(dx * nx + dy * ny), along = Math.abs(dx * tx + dy * ty);
        if (da < 0.06 && r > 0.7 && r < 1.4 && perp < 3.2 * (g.length) * Math.max(a.ancho, b.ancho) && along < 0.15 * a.largo) { g.push(b); ix.push(j); }
      }
      if (g.length > 1) {
        ix.forEach(function (k) { usados[k] = 1; });
        var cx = 0, cy = 0, L = 0, An = 0;
        g.forEach(function (b) { cx += b.cx / g.length; cy += b.cy / g.length; L = Math.max(L, b.largo); An = Math.max(An, b.ancho); });
        var lo = 1e9, hi = -1e9;
        g.forEach(function (b) { var p = (b.cx - cx) * nx + (b.cy - cy) * ny; lo = Math.min(lo, p); hi = Math.max(hi, p); });
        grupos.push({ cx: cx + nx * (lo + hi) / 2, cy: cy + ny * (lo + hi) / 2, ang: a.ang, largo: L, ancho: (hi - lo) + An, lineas: g.length });
      }
    }
    return grupos;
  }
  // Extiende una línea a lo largo de su eje mientras haya tinta (incluye los rellenos '<' sueltos)
  function extender(b, raw, w, h, lado) {
    var tx = Math.cos(b.ang), ty = Math.sin(b.ang), nx = -ty, ny = tx, half = Math.max(2, b.ancho * 0.6);
    var gapMax = lado * 0.05, paso = 1;
    function hay(t) {
      for (var v = -half; v <= half; v += 1) {
        var x = Math.round(b.cx + t * tx + v * nx), y = Math.round(b.cy + t * ty + v * ny);
        if (x < 0 || y < 0 || x >= w || y >= h) return -1;
        if (raw[y * w + x]) return 1;
      }
      return 0;
    }
    function lado_(sg) {
      var t = 0, ult = 0, gap = 0;
      while (gap < gapMax) { t += paso * sg; var k = hay(t); if (k < 0) break; if (k) { ult = t; gap = 0; } else gap += paso; }
      return ult;
    }
    var a = lado_(-1), z = lado_(1);
    var mid = (a + z) / 2;
    return { cx: b.cx + mid * tx, cy: b.cy + mid * ty, ang: b.ang, largo: Math.max(b.largo, z - a), ancho: b.ancho, area: b.area, relleno: b.relleno, tinta: b.tinta };
  }
  // Devuelve candidatos ordenados (en coordenadas de la imagen original)
  function candidatos(img) {
    var G = gris(img, 1000), w = G.w, h = G.h, lado = Math.max(w, h), res = [];
    [50, 30].forEach(function (C) {
      var raw = mascara(G, Math.round(lado * 0.03), C);
      var r = Math.max(2, Math.round(lado * 0.006));
      var m = morf(morf(raw, w, h, r, true), w, h, r, false);
      var ls = bloques(m, raw, w, h).filter(function (b) {
        return b.largo > lado * 0.07 && b.largo / b.ancho > 3.5 && b.ancho > lado * 0.006 && b.relleno > 0.5 && b.tinta > 0.12 && b.tinta < 0.65;
      }).map(function (b) { return extender(b, raw, w, h, lado); }).filter(function (b) {
        return b.largo > lado * 0.12 && b.largo / b.ancho > 6;
      });
      ls.sort(function (a, b) { return b.largo - a.largo; });
      var gs = agrupar(ls);
      gs.sort(function (a, b) { return b.largo - a.largo; });
      gs.forEach(function (g) { res.push(g); });
      ls.slice(0, 3).forEach(function (b) { res.push({ cx: b.cx, cy: b.cy, ang: b.ang, largo: b.largo, ancho: b.ancho * 4, lineas: 1 }); });
    });
    // sin repetidos (mismo centro aproximado)
    var out = [];
    res.forEach(function (c) {
      if (out.some(function (o) { return Math.hypot(o.cx - c.cx, o.cy - c.cy) < lado * 0.02 && Math.abs(o.largo - c.largo) < lado * 0.05; })) return;
      out.push(c);
    });
    return out.slice(0, 5).map(function (b) {
      return { cx: b.cx / G.s, cy: b.cy / G.s, ang: b.ang, largo: b.largo / G.s, ancho: b.ancho / G.s, lineas: b.lineas };
    });
  }
  // Recorte enderezado (muestreo bilineal) → {data,width,height} RGBA en gris
  function recorte(img, c, extra, anchoSalida, vuelta) {
    var L = c.largo * (1 + (extra || 0.08)), A = c.ancho * 1.35 + c.largo * 0.03;
    var esc = anchoSalida / L, ow = Math.round(L * esc), oh = Math.max(20, Math.round(A * esc));
    var W = img.width, H = img.height, d = img.data, o = new Uint8ClampedArray(ow * oh * 4);
    var ang = c.ang + (vuelta ? Math.PI : 0), co = Math.cos(ang), si = Math.sin(ang);
    function L_(k) { return d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114; }
    for (var y = 0; y < oh; y++) for (var x = 0; x < ow; x++) {
      var u = (x - ow / 2) / esc, v = (y - oh / 2) / esc;
      var X = c.cx + u * co - v * si, Y = c.cy + u * si + v * co;
      var x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0, val = 255;
      if (x0 >= 0 && y0 >= 0 && x0 < W - 1 && y0 < H - 1) {
        var i = (y0 * W + x0) * 4;
        val = L_(i) * (1 - fx) * (1 - fy) + L_(i + 4) * fx * (1 - fy) + L_(i + W * 4) * (1 - fx) * fy + L_(i + W * 4 + 4) * fx * fy;
      }
      var j = (y * ow + x) * 4; o[j] = o[j + 1] = o[j + 2] = val; o[j + 3] = 255;
    }
    return { data: o, width: ow, height: oh };
  }
  // Recorte rectangular libre (selección manual del usuario), en gris y ampliado
  function rect(img, x, y, w, h, anchoSalida) {
    return recorte(img, { cx: x + w / 2, cy: y + h / 2, ang: 0, largo: w, ancho: Math.max(1, (h - w * 0.03) / 1.35) }, 0.001, anchoSalida || 1500, false);
  }
  return { candidatos: candidatos, recorte: recorte, rect: rect };
})();
if (typeof module !== 'undefined') module.exports = ZONA;
