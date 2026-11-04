/* Convierte las páginas de un PDF (pdf.js) en líneas de texto, respetando columnas con espacios. */
function pdfLines(pdf) {
  var pages = [];
  for (var i = 1; i <= pdf.numPages; i++) pages.push(i);
  return pages.reduce(function (pr, n) {
    return pr.then(function (acc) {
      return pdf.getPage(n).then(function (pg) {
        return pg.getTextContent().then(function (tc) {
          var items = tc.items.filter(function (t) { return t.str && t.str.trim(); }).map(function (t) {
            return { s: t.str, x: t.transform[4], y: t.transform[5], w: t.width, h: Math.abs(t.transform[3]) || 8 };
          });
          items.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
          var rows = [];
          items.forEach(function (it) {
            var r = rows.find(function (r) { return Math.abs(r.y - it.y) < Math.max(2, it.h * 0.35); });
            if (!r) { r = { y: it.y, it: [] }; rows.push(r); }
            r.it.push(it);
          });
          rows.sort(function (a, b) { return b.y - a.y; });
          rows.forEach(function (r) {
            r.it.sort(function (a, b) { return a.x - b.x; });
            var line = '', end = null, cw = 5;
            r.it.forEach(function (it) {
              if (end !== null) {
                var gap = it.x - end;
                line += gap > cw * 2.2 ? '    ' : (gap > cw * 0.25 ? ' ' : '');
              }
              line += it.s; end = it.x + it.w; cw = it.s.length ? Math.max(3, it.w / it.s.length) : cw;
            });
            acc.push(line.replace(/\s+$/, ''));
          });
          acc.push('<<PAGE>>');
          return acc;
        });
      });
    });
  }, Promise.resolve([]));
}
if (typeof module !== 'undefined') module.exports = pdfLines;
