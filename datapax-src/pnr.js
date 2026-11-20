/* ===== Lectura de reservas (PNR) pegadas: RT de Amadeus o *A de Sabre =====
   Toma de cada reserva: código, pasajeros con su número (y niños / infantes con su adulto)
   y los tramos aéreos con fecha (ida = primer tramo, vuelta = último). Acepta varias reservas juntas. */
var PNR = (function () {
  var MES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  var TIT = /\s+(MR|MRS|MS|MISS|MSTR|MSTER|DR|SR|SRA|SRTA|CHD|INF|ADT)\.?$/;
  // nombre de pasajero numerado: Amadeus "1.PEREZ/JUAN MR", Sabre "1.1PEREZ/JUAN MR" o "1.2PEREZ/JUAN MR/ANA MRS"
  var RE_NOM = /(?:^|[\s])(\d{1,2})\.(\d)?(I\/)?([A-Z][A-Z' \-]*\/[A-Z][^\n]*?)(?=\s{1,}\d{1,2}\.\d?(?:I\/)?[A-Z][A-Z' \-]*\/|\s*$)/gm;
  // tramo aéreo: "4  IB6012 Y 15MAR 1 MVDMAD HK3" (Amadeus) · " 1 IB6012Y 15MAR M MVDMAD HK3" (Sabre)
  var RE_SEG = /^\s*\d{1,2}\s+([A-Z0-9]{2})\s?(\d{1,4})\s?([A-Z])\s+(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+[A-Z1-7]\*?\s*([A-Z]{3})([A-Z]{3})\s*\*?\s*([A-Z]{2})(\d{1,3})/;
  var CAIDO = /^(UN|UC|NO|HX|XX|XK|XL|US|UU|NN)$/;

  function fechaDDMMMYY(s) {
    var m = /^(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})$/.exec(s || '');
    if (!m) return null;
    var y = 2000 + +m[3], hoy = new Date().getFullYear();
    if (y > hoy + 1) y -= 100;
    return { y: y, m: MES[m[2]], d: +m[1] };
  }
  function sinTitulo(s) { s = s.trim().replace(/\s+/g, ' '); var t = TIT.exec(s); return { n: t ? s.slice(0, t.index).trim() : s, t: t ? t[1] : '' }; }

  // ¿El texto parece una o más reservas?
  function detectar(t) {
    t = String(t || '').toUpperCase();
    var nombres = (t.match(/(?:^|\s)\d{1,2}\.\d?(?:I\/)?[A-Z][A-Z' \-]*\/[A-Z]/gm) || []).length;
    var tramos = t.split('\n').filter(function (l) { return RE_SEG.test(l); }).length;
    return nombres >= 1 && (tramos >= 1 || /(^|\n)\s*(?:-+\s*\w+\s*-+\s*)?RP\//.test(t));
  }

  // Corta el texto en reservas: un encabezado RP/ (Amadeus), un código solo en su línea (Sabre)
  // o una lista de pasajeros que vuelve a empezar en 1 después de haber visto tramos
  function trozos(t) {
    var ls = t.split('\n'), out = [], cur = [], vistoNom = false, vistoSeg = false;
    function cerrar() { if (cur.join('').trim()) out.push(cur.join('\n')); cur = []; vistoNom = vistoSeg = false; }
    ls.forEach(function (l) {
      var esRP = /^\s*(?:-+.*-+\s*)?RP\//.test(l);
      var esLoc = /^\s*[A-Z0-9]{6}\s*$/.test(l) && /[A-Z]/.test(l) && /\d/.test(l);
      var nom1 = /(?:^|\s)1\.\d?(?:I\/)?[A-Z][A-Z' \-]*\//.test(l);
      if ((esRP || esLoc) && (vistoNom || vistoSeg)) cerrar();
      else if (nom1 && vistoSeg) cerrar();
      cur.push(l);
      if (/(?:^|\s)\d{1,2}\.\d?(?:I\/)?[A-Z][A-Z' \-]*\//.test(l)) vistoNom = true;
      if (RE_SEG.test(l)) vistoSeg = true;
    });
    cerrar();
    return out;
  }

  function leerUna(t, hoy) {
    var r = { loc: '', gds: '', creada: null, pax: [], tramos: [], ida: null, vuelta: null, avisos: [] };
    var ls = t.split('\n');
    // código de reserva y fecha de creación
    ls.forEach(function (l) {
      var a = /^\s*(?:-+.*-+\s*)?RP\/\S+.*?\s(\d{2}[A-Z]{3}\d{2})\/\d{4}Z\s+([A-Z0-9]{6})\s*$/.exec(l);
      if (a) { r.gds = 'A'; r.loc = a[2]; r.creada = fechaDDMMMYY(a[1]); return; }
      var a2 = /^\s*(?:-+.*-+\s*)?RP\/\S+.*\s([A-Z0-9]{6})\s*$/.exec(l);
      if (a2 && !r.loc) { r.gds = 'A'; r.loc = a2[1]; }
      var s = /\s\d{4}\/(\d{2}[A-Z]{3}\d{2})\s+([A-Z]{6})\b/.exec(l);
      if (s && !r.loc) { r.gds = 'S'; r.loc = s[2]; r.creada = fechaDDMMMYY(s[1]); }
    });
    if (!r.loc) { var l0 = /^\s*([A-Z0-9]{6})\s*$/m.exec(t); if (l0 && /[A-Z]/.test(l0[1])) r.loc = l0[1]; }
    // pasajeros
    var m;
    RE_NOM.lastIndex = 0;
    while ((m = RE_NOM.exec(t))) {
      var num = +m[1], cnt = m[2] ? +m[2] : 1, esInf = !!m[3], cuerpo = m[4].trim();
      if (m[2] && !r.gds) r.gds = 'S';
      // datos entre paréntesis: (CHD/01DEC24) · (INF/LUCIA/10JUN25) · (INFJONES/LUCIA/10JUN25) · (INFLUCIA/10JUN25)
      var par = /\(([^)]*)\)\s*$/.exec(cuerpo), extra = par ? par[1] : '';
      if (par) cuerpo = cuerpo.slice(0, par.index).trim();
      var partes = cuerpo.split('/'), ape = partes[0].trim(), dados = partes.slice(1);
      if (!dados.length) continue;
      if (!m[2]) dados = [dados.join(' ')];          // Amadeus: un pasajero por número
      dados.slice(0, Math.max(cnt, 1)).forEach(function (dn, k) {
        var ast = /\*(\S+)\s*$/.exec(dn), marca = ast ? ast[1] : '';   // Sabre: "*CHD", "*C05", "*10JUN25"
        if (ast) dn = dn.slice(0, ast.index);
        var st = sinTitulo(dn), p = { num: num, sub: k + 1, apellidos: ape, nombres: st.n, titulo: st.t, tipo: esInf ? 'INF' : 'ADT', nac: null, inf: null };
        if (/^(CHD|C\d{1,2})$/.test(marca)) p.tipo = 'CHD';
        if (fechaDDMMMYY(marca)) p.nac = fechaDDMMMYY(marca);
        if (/^CHD/.test(extra)) { p.tipo = 'CHD'; p.nac = fechaDDMMMYY((extra.split('/')[1] || '').trim()); }
        if (st.t === 'CHD') p.tipo = 'CHD';
        if (/^INF/.test(extra) && k === 0) {
          var x = extra.replace(/^INF\/?/, '').split('/').map(function (s) { return s.trim(); }), fd = fechaDDMMMYY(x[x.length - 1]);
          if (fd) x.pop();
          p.inf = x.length >= 2 ? { apellidos: x[0], nombres: x[1], nac: fd } : { apellidos: ape, nombres: x[0] || '', nac: fd };
        }
        if (/^\d{2}[A-Z]{3}\d{2}$/.test(extra) && esInf) p.nac = fechaDDMMMYY(extra);
        r.pax.push(p);
      });
    }
    // Sabre: infante con su adulto en el SSR INFT ("… PEREZ/LUCIA/10JUN25 2.1 PEREZ/JUAN" o "-2.1")
    if (r.pax.some(function (p) { return p.tipo === 'INF'; })) {
      ls.forEach(function (l) {
        var s = /INFT\b.*?([A-Z][A-Z' \-]*)\/([A-Z][A-Z' \-]*?)\/?(\d{2}[A-Z]{3}\d{2})?\s*[-\s](\d{1,2})\.(\d)\b/.exec(l);
        if (!s) return;
        var inf = r.pax.filter(function (p) { return p.tipo === 'INF' && p.apellidos === s[1].trim() && p.nombres.split(' ')[0] === s[2].trim().split(' ')[0]; })[0];
        if (inf) { inf.adulto = s[4] + '.' + s[5]; if (s[3] && !inf.nac) inf.nac = fechaDDMMMYY(s[3]); }
      });
    }
    // tramos aéreos (se descartan los cancelados o rechazados)
    var ref = r.creada ? new Date(r.creada.y, r.creada.m - 1, r.creada.d) : (hoy || new Date()), prev = null;
    ls.forEach(function (l) {
      var s = RE_SEG.exec(l); if (!s || CAIDO.test(s[8])) return;
      var d = +s[4], mm = MES[s[5]], y = ref.getFullYear(), f = new Date(y, mm - 1, d);
      if (f < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 2)) f = new Date(++y, mm - 1, d);
      if (prev && f < prev) f = new Date(++y, mm - 1, d);
      prev = f;
      r.tramos.push({ cia: s[1], vuelo: s[2], fecha: { y: f.getFullYear(), m: f.getMonth() + 1, d: f.getDate() }, de: s[6], a: s[7], estado: s[8] });
    });
    if (r.tramos.length) { r.ida = r.tramos[0].fecha; if (r.tramos.length > 1) r.vuelta = r.tramos[r.tramos.length - 1].fecha; }
    if (!r.gds) r.gds = /\s\d{1,2}\s+[A-Z0-9]{2}\d{1,4}[A-Z]\s/.test(t) ? 'S' : 'A';
    return r;
  }

  function parse(t, hoy) {
    t = String(t || '').toUpperCase().replace(/\r/g, '').replace(/\t/g, ' ');
    return trozos(t).map(function (x) { return leerUna(x, hoy); }).filter(function (r) { return r.pax.length; });
  }
  return { parse: parse, detectar: detectar, fecha: fechaDDMMMYY };
})();
if (typeof module !== 'undefined') module.exports = PNR;
