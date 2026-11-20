/* ===== Lectura de datos de pasajeros en texto libre =====
   Acepta mails, WhatsApp, fichas con etiquetas ("Nombre:", "Pasaporte:"…), planillas copiadas de Excel
   y líneas MRZ pegadas. Devuelve pasajeros con avisos de lo que conviene revisar. */
var TEXTO = (function () {
  var MRZr = typeof MRZ !== 'undefined' ? MRZ : (typeof require !== 'undefined' ? require('./mrz.js') : null);
  var TT = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u', 'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u', 'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o', 'ü': 'u', 'ã': 'a', 'õ': 'o', 'ñ': 'n', 'ç': 'c', 'å': 'a', 'ø': 'o', 'ý': 'y', 'ÿ': 'y', 'ß': 's' };
  var NP = {}, GENT = [];
  (typeof NOMBRES_PILA !== 'undefined' ? NOMBRES_PILA : []).forEach(function (n) { if (n) NP[n] = 1; });
  var G0 = typeof GENTILICIOS !== 'undefined' ? GENTILICIOS : {};
  Object.keys(G0).forEach(function (k) {
    var t = sinTildes(G0[k]).toUpperCase();
    ['ESTADOS UNIDOS', 'REINO UNIDO', 'COSTA RICA', 'PAISES BAJOS', 'NUEVA ZELANDA'].forEach(function (frase) {
      if (t.indexOf(frase) >= 0) { GENT.push([frase, k]); t = t.replace(frase, ' '); }
    });
    t.split(/\s+/).forEach(function (w) { if (w) GENT.push([w.replace(/\.$/, ''), k]); });
  });
  GENT.sort(function (a, b) { return b[0].length - a[0].length; });

  function sinTildes(s) {
    return String(s || '').replace(/[áéíóúàèìòùâêîôûäëïöüãõñçåøýÿßÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÕÑÇÅØÝ]/g, function (c) {
      var l = c.toLowerCase(), r = TT[l] || l; return c === l ? r : r.toUpperCase();
    });
  }
  function N(s) { return sinTildes(s).toUpperCase(); }
  // Nombre apto para GDS: sin tildes, guiones → espacio, sin apóstrofos ni signos
  function limpiaNombre(s) {
    return N(s).replace(/['’`´]/g, '').replace(/[-‐–_.]/g, ' ').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // ---------- fechas ----------
  var MES = { ENE: 1, ENERO: 1, JAN: 1, JANUARY: 1, JANEIRO: 1, FEB: 2, FEBRERO: 2, FEBRUARY: 2, FEV: 2, FEVEREIRO: 2, MAR: 3, MARZO: 3, MARCH: 3, MARCO: 3, ABR: 4, ABRIL: 4, APR: 4, APRIL: 4, MAY: 5, MAYO: 5, MAI: 5, MAIO: 5, JUN: 6, JUNIO: 6, JUNE: 6, JUNHO: 6, JUL: 7, JULIO: 7, JULY: 7, JULHO: 7, AGO: 8, AGOSTO: 8, AUG: 8, AUGUST: 8, SEP: 9, SEPT: 9, SET: 9, SEPTIEMBRE: 9, SETIEMBRE: 9, SEPTEMBER: 9, SETEMBRO: 9, OCT: 10, OCTUBRE: 10, OCTOBER: 10, OUT: 10, OUTUBRO: 10, NOV: 11, NOVIEMBRE: 11, NOVEMBER: 11, NOVEMBRO: 11, DIC: 12, DICIEMBRE: 12, DEC: 12, DECEMBER: 12, DEZ: 12, DEZEMBRO: 12 };
  var HOY = new Date();
  function valida(y, m, d) { var t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; }
  function anio(yy, tipo, m, d) {
    if (yy >= 100) return yy;
    if (tipo === 'venc') return 2000 + yy;
    var y = 2000 + yy;
    if (new Date(y, m - 1, d) > HOY) y -= 100;
    return y;
  }
  var RE_F1 = /(^|[^\d])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})(?!\d)/g;
  var RE_F2 = /(^|[^\d])(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?!\d)/g;
  var RE_F3 = /(^|[^\dA-Z])(\d{1,2})\s*(?:DE\s+)?([A-Z]{3,10})\.?(?:\s*\/\s*[A-Z]{3,10}\.?)?\s*(?:DE\s+|DEL\s+)?(\d{4}|\d{2})(?!\d)/g;
  // Devuelve [{y,m,d,i,l,yy2}] sobre texto normalizado (mayúsculas sin tildes)
  function fechas(T, tipo) {
    var out = [], m;
    RE_F1.lastIndex = 0;
    while ((m = RE_F1.exec(T))) {
      var d = +m[2], mo = +m[3], yr = +m[4], swap = false;
      if (mo > 12 && d <= 12) { var t = d; d = mo; mo = t; swap = true; }
      var y = anio(yr, tipo, mo, d);
      if (mo >= 1 && mo <= 12 && valida(y, mo, d)) out.push({ y: y, m: mo, d: d, i: m.index + m[1].length, l: m[0].length - m[1].length, corto: m[4].length === 2, invertida: swap });
    }
    RE_F2.lastIndex = 0;
    while ((m = RE_F2.exec(T))) {
      var y2 = +m[2], m2 = +m[3], d2 = +m[4];
      if (valida(y2, m2, d2)) out.push({ y: y2, m: m2, d: d2, i: m.index + m[1].length, l: m[0].length - m[1].length });
    }
    RE_F3.lastIndex = 0;
    while ((m = RE_F3.exec(T))) {
      var mes = MES[m[3]];
      if (!mes) continue;
      var d3 = +m[2], y3 = anio(+m[4], tipo, mes, d3);
      if (valida(y3, mes, d3)) out.push({ y: y3, m: mes, d: d3, i: m.index + m[1].length, l: m[0].length - m[1].length, corto: m[4].length === 2 });
    }
    out.sort(function (a, b) { return a.i - b.i; });
    return out.filter(function (f, k) { return !k || f.i >= out[k - 1].i + out[k - 1].l; });
  }
  function fechaTipo(f, tipo) { // recalcula el siglo de un año de 2 cifras según el tipo de fecha
    if (!f || !f.corto) return f;
    var yy = f.y % 100; return { y: anio(yy, tipo, f.m, f.d), m: f.m, d: f.d };
  }

  // ---------- teléfonos, mails, documentos ----------
  function telefono(raw, pais) {
    pais = pais || '598';
    var s = String(raw || '').trim(), plus = /^\+/.test(s), d = s.replace(/\D/g, ''), av = '';
    if (/^00/.test(d)) { d = d.slice(2); plus = true; }
    if (!d) return null;
    if (plus) return { num: d, aviso: '' };
    if (pais === '598') {
      if (/^598\d{8}$/.test(d)) return { num: d, aviso: '' };
      if (/^09\d{7}$/.test(d)) return { num: '598' + d.slice(1), aviso: '' };
      if (/^9\d{7}$/.test(d)) return { num: '598' + d, aviso: '' };
      if (/^[24]\d{7}$/.test(d)) return { num: '598' + d, aviso: 'Parece un teléfono fijo; el CTCM es para celular' };
    }
    if (d.length >= 11) return { num: d, aviso: 'Verificá el código de país del teléfono' };
    return { num: pais + d.replace(/^0/, ''), aviso: 'Verificá el teléfono: se agregó el código ' + pais };
  }
  var RE_MAIL = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi;
  var RE_TEL = /(?:\+|00)?\d[\d\s().\-]{6,}\d/g;
  var RE_CI = /(^|[^\d.])(\d{1}\.?\d{3}\.?\d{3}\s?[-‐–]\s?\d|\d\.\d{3}\.\d{3}\d)(?![\d])/g;
  function ciValida(num) {
    var d = String(num).replace(/\D/g, '');
    if (d.length < 7 || d.length > 8) return false;
    var base = d.slice(0, -1), dv = +d.slice(-1);
    while (base.length < 7) base = '0' + base;
    var w = '2987634', t = 0;
    for (var i = 0; i < 7; i++) t += (+base[i]) * (+w[i]);
    return (10 - t % 10) % 10 === dv;
  }
  function pais(texto) {
    var T = ' ' + N(texto).replace(/[^A-Z ]/g, ' ') + ' ';
    for (var i = 0; i < GENT.length; i++) if (T.indexOf(' ' + GENT[i][0] + ' ') >= 0) return GENT[i][1];
    var m = T.match(/ ([A-Z]{3}) /);
    if (m && typeof PAISES !== 'undefined' && PAISES[m[1]]) return m[1];
    return '';
  }

  // ---------- etiquetas ----------
  var ETQ = [
    ['completoAN', /\b(?:APELLIDOS?\s*(?:Y|,|\/)\s*NOMBRES?|SURNAME\s*(?:AND|,|\/)\s*(?:GIVEN\s*)?NAMES?)\b/],
    ['completo', /\b(?:NOMBRES?\s*(?:Y|,)\s*APELLIDOS?|NOMBRE\s+COMPLETO|NOME\s+COMPLETO|FULL\s+NAME|PASAJER[OA]|PAX|TITULAR|PASSENGER(?:\s+NAME)?)\b/],
    ['apellidos', /\b(?:PRIMER\s+APELLIDO|SEGUNDO\s+APELLIDO|APELLIDOS?|SURNAMES?|LAST\s*NAME|FAMILY\s+NAME|APELIDOS?|SOBRENOMES?)\b(?:\s*\/\s*(?:SURNAMES?|APELLIDOS?|LAST\s*NAME))?/],
    ['nombres', /\b(?:PRIMER\s+NOMBRE|SEGUNDO\s+NOMBRE|NOMBRES?|GIVEN\s+NAMES?|FIRST\s*NAMES?|NOMES?|PRENOMS?)\b(?:\s*\/\s*(?:GIVEN\s+NAMES?|NAMES?|NOMBRES?|FIRST\s*NAME))?/],
    ['nac', /\b(?:FECHA\s+DE\s+NACIMIENTO|FECHA\s+(?:DE\s+)?NAC(?:IMIENTO)?\.?|NAC\.|F(?:EC)?\.?\s*(?:DE\s+)?NAC(?:IMIENTO)?\.?|NACIMIENTO|NACID[OA](?:\s+EL)?|DATE\s+OF\s+BIRTH|BIRTH\s*DATE|BIRTHDATE|D\.?O\.?B\.?|DATA\s+DE\s+NASCIMENTO|NASCIMENTO|F\.\s*N\.)(?=[^A-Z]|$)(?:\s*\/\s*DATE\s+OF\s+BIRTH)?/],
    ['venc', /\b(?:FECHA\s+DE\s+(?:VENCIMIENTO|EXPIRACION|CADUCIDAD)|VENCIMIENTO|VENCE|VTO\.?|VALIDO\s+HASTA|VALIDEZ|DATE\s+OF\s+EXPIRY|EXPIRY(?:\s+DATE)?|EXPIRATION(?:\s+DATE)?|EXPIRA|VALIDADE|DATA\s+DE\s+VALIDADE)(?=[^A-Z]|$)(?:\s*\/\s*DATE\s+OF\s+EXPIRY)?/],
    ['emi', /\b(?:FECHA\s+DE\s+(?:EMISION|EXPEDICION)|EMISION|EXPEDICION|EXPEDIDO|DATE\s+OF\s+ISSUE|ISSUE\s+DATE|DATA\s+DE\s+EMISSAO|EMITIDO)(?=[^A-Z]|$)(?:\s*\/\s*DATE\s+OF\s+ISSUE)?/],
    ['pp', /\b(?:N(?:RO|UMERO|º|°|O)?\.?\s*(?:DE\s+)?PASAPORTE|PASAPORTE(?:\s*N(?:RO|UMERO|º|°|O)?\.?)?|PASSPORT(?:\s*(?:NO|NUMBER|NBR|N[º°]))?\.?|PASSAPORTE|PASAP\.?|PSPT|PPT|PP(?=\s*[:#]?\s*[A-Z]{0,3}\d))(?=[^A-Z]|$)/],
    ['ci', /\b(?:C[EÉ]DULA(?:\s+DE\s+IDENTIDAD)?|C\.\s?I\.?|CI|DOCUMENTO(?:\s+DE\s+IDENTIDAD)?|DOC\.?|DNI|D\.N\.I\.?|RG|IDENTIDAD|ID\s*CARD|RUT)(?=[^A-Z]|$)(?:\s*N(?:RO|UMERO|º|°)?\.?)?/],
    ['nacion', /\b(?:NACIONALIDAD|NATIONALITY|NACIONALIDADE|CIUDADANIA|CITIZENSHIP)\b(?:\s*\/\s*NATIONALITY)?/],
    ['sexo', /\b(?:SEXO|SEX|GENERO|GENDER)\b(?:\s*\/\s*SEX)?/],
    ['mail', /\b(?:E-?MAIL|MAIL|CORREO(?:\s+ELECTRONICO)?)\b/],
    ['tel', /\b(?:CELULAR|CEL|MOVIL|MOBILE|TEL(?:EFONO|EFONE|F)?|PHONE|WHATSAPP|WSP|WPP|WA|CONTACTO)\b\.?/]
  ];
  var STOP = { HOLA: 1, BUENAS: 1, BUENOS: 1, BUEN: 1, DIA: 1, DIAS: 1, TARDES: 1, NOCHES: 1, DATOS: 1, DATO: 1, SALUDOS: 1, GRACIAS: 1, SR: 1, SRA: 1, SRTA: 1, MR: 1, MRS: 1, MS: 1, MISS: 1, MSTR: 1, ADULTO: 1, MENOR: 1, NINO: 1, NINA: 1, INFANTE: 1, BEBE: 1, VIAJA: 1, VIAJAN: 1, VUELO: 1, VUELOS: 1, RESERVA: 1, PASAJEROS: 1, ADJUNTO: 1, ENVIO: 1, ABRAZO: 1, ATTE: 1, ATENTAMENTE: 1, CORDIALES: 1, URUGUAY: 1, ARGENTINA: 1, MONTEVIDEO: 1, ESPOSA: 1, ESPOSO: 1, HIJO: 1, HIJA: 1, HIJOS: 1, MAMA: 1, PAPA: 1, Y: 1, E: 1, CON: 1, PARA: 1, POR: 1, EL: 1, LA: 1, LOS: 1, LAS: 1, DE: 1, DEL: 1, MI: 1, SU: 1, TE: 1, LE: 1, PASO: 1, SON: 1, ES: 1 };
  var PART = { DE: 1, DEL: 1, LA: 1, LAS: 1, LOS: 1, DA: 1, DAS: 1, DO: 1, DOS: 1, DI: 1, VAN: 1, VON: 1, DER: 1, DEN: 1, MC: 1, MAC: 1, SAN: 1, SANTA: 1 };

  // Separa "nombres apellidos" escritos de corrido. orden: 'NA' (nombre primero) o 'AN' (apellido primero)
  function separar(texto, orden) {
    var orig = String(texto).trim().split(/\s+/).filter(Boolean);
    var w = orig.map(function (x) { return limpiaNombre(x); }).filter(Boolean);
    if (!w.length) return null;
    // APELLIDO/NOMBRE (formato GDS) o "Apellido, Nombre"
    var sl = String(texto).match(/^\s*([^\/,]+)[\/,]\s*([^\/,]+?)\s*(?:\b(?:MRS|MR|MS|MISS|MSTR)\b\.?)?\s*$/i);
    if (sl) return { apellidos: limpiaNombre(sl[1]), nombres: limpiaNombre(sl[2].replace(/\b(MRS|MR|MS|MISS|MSTR)\b\.?/i, '')), dudoso: false };
    if (w.length === 1) return { apellidos: w[0], nombres: '', dudoso: true };
    // mayúsculas sostenidas entre palabras en minúscula: las MAYÚSCULAS son los apellidos (estilo "Gonzalo NOCELLA")
    var caps = orig.map(function (x) { return x.length > 1 && x === x.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(x); });
    var nCaps = caps.filter(Boolean).length;
    if (nCaps && nCaps < orig.length && w.length === orig.length) {
      var a = [], n = [];
      orig.forEach(function (x, k) { (caps[k] ? a : n).push(w[k]); });
      return { apellidos: a.join(' '), nombres: n.join(' '), dudoso: false };
    }
    // unidades: las partículas (de, del, da, van…) van con la palabra siguiente
    var u = [];
    for (var k = 0; k < w.length; k++) {
      if (PART[w[k]] && k < w.length - 1) { var j = k, g = []; while (j < w.length - 1 && PART[w[j]]) g.push(w[j++]); g.push(w[j]); u.push({ t: g.join(' '), cab: w[j] }); k = j; }
      else u.push({ t: w[k], cab: w[k] });
    }
    if (u.length === 1) return { apellidos: u[0].t, nombres: '', dudoso: true };
    var esN = u.map(function (x) { return !!NP[x.cab]; });
    var g2;
    if (orden === 'AN') {
      g2 = 0; for (var r = u.length - 1; r > 0 && esN[r]; r--) g2++;
      if (!g2) g2 = u.length >= 4 ? 2 : 1;
      return { apellidos: u.slice(0, u.length - g2).map(t).join(' '), nombres: u.slice(u.length - g2).map(t).join(' '), dudoso: !esN[u.length - 1] || u.length > 2 };
    }
    g2 = 0; while (g2 < u.length - 1 && esN[g2]) g2++;
    if (u.length === 2) g2 = 1;
    else if (u.length === 3) g2 = esN[1] ? 2 : 1;
    else if (!g2 || (g2 === 1 && u.length === 4)) g2 = 2;
    if (g2 > u.length - 1) g2 = u.length - 1;
    var dud = u.length > 2 || !esN[0];
    return { apellidos: u.slice(g2).map(t).join(' '), nombres: u.slice(0, g2).map(t).join(' '), dudoso: dud };
    function t(x) { return x.t; }
  }

  // ---------- un bloque = un pasajero ----------
  function bloque(txt, pais0) {
    var T = N(txt), usado = new Uint8Array(T.length), p = { avisos: [] }, hits = [];
    ETQ.forEach(function (e) {
      var re = new RegExp(e[1].source, 'g'), m;
      while ((m = re.exec(T))) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        if (hits.some(function (h) { return m.index < h.f && m.index + m[0].length > h.i; })) continue;
        hits.push({ t: e[0], i: m.index, f: m.index + m[0].length });
      }
    });
    hits.sort(function (a, b) { return a.i - b.i; });
    function marcar(i, f) { for (var k = i; k < f; k++) usado[k] = 1; }
    hits.forEach(function (h, k) {
      var fin = k + 1 < hits.length ? hits[k + 1].i : T.length;
      var nl = T.indexOf('\n', h.f); if (nl >= 0 && nl < fin) {
        // valor en la misma línea; si está vacía, se toma la línea siguiente
        if (!T.slice(h.f, nl).replace(/[\s:=\-–.#°º]/g, '')) { var nl2 = T.indexOf('\n', nl + 1); fin = Math.min(fin, nl2 < 0 ? T.length : nl2); }
        else fin = nl;
      }
      var vi = h.f; while (vi < fin && /[\s:=\-–.#°º]/.test(T[vi])) vi++;
      h.vi = vi; h.vf = fin; h.v = txt.slice(vi, fin).trim(); h.V = T.slice(vi, fin).trim();
      marcar(h.i, h.f);
    });
    var orden = 'NA';
    hits.forEach(function (h) {
      var V = h.V, v = h.v;
      if (!V) return;
      if (h.t === 'apellidos') { p.apellidos = ((p.apellidos ? p.apellidos + ' ' : '') + limpiaNombre(v.split(/\s{2,}|\t|[|;]/)[0])).trim(); marcar(h.vi, h.vf); }
      else if (h.t === 'nombres') { p.nombres = ((p.nombres ? p.nombres + ' ' : '') + limpiaNombre(v.split(/\s{2,}|\t|[|;]/)[0])).trim(); marcar(h.vi, h.vf); }
      else if (h.t === 'completo' || h.t === 'completoAN') {
        var val = v.split(/\s{2,}|\t|[|;]| - /)[0].replace(/\b(?:sr|sra|srta|mr|mrs|ms)\b\.?/ig, '').replace(/^\s*\d+\s*/, '');
        var m = val.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñÇçÃãÕõÂâÊêÔô'’\-\/, ]+/);
        if (m && m[0].trim().split(/\s+/).length >= 1) { p.completo = m[0].trim(); orden = h.t === 'completoAN' ? 'AN' : 'NA'; marcar(h.vi, h.vi + val.length); }
      }
      else if (h.t === 'nac' || h.t === 'venc' || h.t === 'emi') {
        var fs = fechas(V, h.t === 'nac' ? 'nac' : 'venc');
        if (fs.length) { if (h.t === 'nac') p.nacimiento = fs[0]; else if (h.t === 'venc') p.vencimiento = fs[0]; marcar(h.vi, h.vi + fs[0].i + fs[0].l); if (fs[0].invertida) p.avisos.push('Fecha con mes y día invertidos: verificala'); }
      }
      else if (h.t === 'pp') {
        var mm = V.match(/(?:^|[^A-Z0-9])([A-Z]{1,3}[\s\-]?\d{5,10}|\d{6,10}[A-Z]?|[A-Z0-9]*\d[A-Z0-9]*)(?![A-Z0-9])/);
        if (mm) { var num = mm[1].replace(/[\s\-]/g, ''); if (num.length >= 5 && num.length <= 12) { p.pasaporte = num; var pz0 = pais(V.slice(0, V.indexOf(mm[1]))); if (pz0) p.ppPais = pz0; marcar(h.vi, h.vi + V.indexOf(mm[1]) + mm[1].length); } }
      }
      else if (h.t === 'ci') {
        var mc = V.match(/\d[\d.\s]{4,12}\s*[-‐–]?\s*\d|[A-Z]{0,2}\d{5,10}/);
        if (mc) { p.ci = mc[0].replace(/[^A-Z0-9]/g, ''); marcar(h.vi, h.vi + V.indexOf(mc[0]) + mc[0].length); }
      }
      else if (h.t === 'nacion') { var pa = pais(V.split(/\s{2,}|\t|[|;,]/)[0]); if (pa) { p.nacionalidad = pa; marcar(h.vi, h.vf); } }
      else if (h.t === 'sexo') {
        var sx = V.match(/^\s*(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|VARON|M|F|H|X)\b/);
        if (sx) { var c = sx[1][0]; p.sexo = c === 'F' || sx[1] === 'MUJER' ? 'F' : (c === 'M' || c === 'H' || c === 'V' ? 'M' : 'X'); marcar(h.vi, h.vi + sx[0].length); }
      }
      else if (h.t === 'mail') { var me = v.match(RE_MAIL); if (me) { p.email = me[0]; marcar(h.vi, h.vi + v.indexOf(me[0]) + me[0].length); } }
      else if (h.t === 'tel') { var mt = v.match(/(?:\+|00)?\d[\d\s().\-]{6,}\d/); if (mt) { p.telRaw = mt[0]; marcar(h.vi, h.vi + v.indexOf(mt[0]) + mt[0].length); } }
    });
    // ---- datos sin etiqueta ----
    if (!p.sexo) {
      var ms = /(?:^|[^A-Z])(MASCULINO|FEMENINO|VARON|MUJER|HOMBRE|MALE|FEMALE|SRTA|SRA|SR|MRS|MR|MISS|MSTR|MS)(?=[^A-Z]|$)/.exec(T);
      if (ms) p.sexo = /^(FEMENINO|MUJER|FEMALE|SRTA|SRA|MRS|MISS|MS)$/.test(ms[1]) ? 'F' : 'M';
    }
    function libre(re, fn) {
      re.lastIndex = 0; var m;
      while ((m = re.exec(txt))) {
        var i = m.index, f = i + m[0].length, ok = true;
        for (var k = i; k < f; k++) if (usado[k]) { ok = false; break; }
        if (ok && fn(m, i, f) !== false) marcar(i, f);
      }
    }
    libre(new RegExp(RE_MAIL.source, 'gi'), function (m) { if (p.email) return false; p.email = m[0]; });
    libre(new RegExp(RE_CI.source, 'g'), function (m, i, f) {
      var raw = m[2]; if (!ciValida(raw)) return false;
      if (!p.ci) p.ci = raw.replace(/\D/g, '');
      for (var k = i; k < f; k++) usado[k] = 1; return false;
    });
    // fechas sueltas: pasada → nacimiento, futura → vencimiento
    var fl = fechas(T, 'nac');
    fl.forEach(function (f) {
      for (var k = f.i; k < f.i + f.l; k++) if (usado[k]) return;
      var dt = new Date(f.y, f.m - 1, f.d);
      if (dt < HOY && !p.nacimiento) { p.nacimiento = f; p.fechaSuelta = 1; }
      else if (dt < HOY && p.fechaSuelta) p.fechaSuelta = 2;
      else if (dt >= HOY || (f.corto && !p.vencimiento && p.nacimiento)) { if (!p.vencimiento) p.vencimiento = fechaTipo(f, 'venc'); }
      else return;
      marcar(f.i, f.i + f.l);
    });
    libre(/(?:^|[^A-Z0-9])([A-Z]{1,3}\d{6,9})(?![A-Z0-9])/g, function (m, i, f) {
      if (p.pasaporte) return false;
      p.pasaporte = m[1]; p.ppSuelto = 1;
      for (var k = i; k < f; k++) usado[k] = 1; return false;
    });
    libre(new RegExp(RE_TEL.source, 'g'), function (m) {
      if (p.telRaw) return false;
      var d = m[0].replace(/\D/g, '');
      if (d.length < 8 || d.length > 15) return false;
      if (/^\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}$/.test(m[0].trim())) return false;
      p.telRaw = m[0];
    });
    if (!p.apellidos && !p.nombres && !p.completo) {
      var mg = /(?:^|[^A-Z])([A-Z][A-Z ]{1,40})\/([A-Z][A-Z ]{1,40}?)(?:\s+(MRS|MR|MS|MISS|MSTR))?(?=[^A-Z]|$)/.exec(T);
      if (mg && !/\d/.test(mg[0])) { var ok2 = true; for (var q = mg.index; q < mg.index + mg[0].length; q++) if (usado[q]) ok2 = false; if (ok2) { p.apellidos = limpiaNombre(mg[1]); p.nombres = limpiaNombre(mg[2]); marcar(mg.index, mg.index + mg[0].length); } }
    }
    // nombre sin etiqueta: primera secuencia de 2+ palabras con mayúscula inicial que no sean palabras comunes
    if (!p.apellidos && !p.nombres && !p.completo) {
      var libreTxt = '';
      for (var k = 0; k < txt.length; k++) libreTxt += usado[k] ? '|' : txt[k];
      var lineas = libreTxt.split(/\n|[,;|•·]| - | – /);
      for (var li = 0; li < lineas.length && !p.completo; li++) {
        var ws = lineas[li].replace(/^\s*\d+\s*[).\-–]?\s*/, '').split(/\s+/).filter(Boolean), run = [];
        for (var wi = 0; wi <= ws.length; wi++) {
          var x = ws[wi] ? ws[wi].replace(/[.,:;!?)]+$/, '').replace(/^[(¿¡"']+/, '') : '', X = x ? limpiaNombre(x) : '';
          var corta = ws[wi] && /[.,:;!?]$/.test(ws[wi]);
          var esPal = x && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñÇçÃãÕõÂâÊêÔôß'’\-]+$/.test(x);
          var mayus = x && (/^[A-ZÁÉÍÓÚÜÑÇÃÕÂÊÔ]/.test(x) || (PART[X] && run.length));
          if (esPal && mayus && X && (!STOP[X] || (PART[X] && run.length)) && !MES[X]) { run.push(x); if (!corta) continue; }
          while (run.length && PART[limpiaNombre(run[run.length - 1])]) run.pop();
          if (run.length >= 2) { p.completo = run.join(' '); break; }
          run = [];
        }
      }
    }
    if (!p.nacionalidad && p.ppPais) p.nacionalidad = p.ppPais;
    delete p.ppPais;
    if (!p.nacionalidad) {
      var resto = ''; for (var z = 0; z < T.length; z++) resto += usado[z] ? ' ' : T[z];
      var pz = pais(resto.replace(/\b(?:[A-Z]{3})\b/g, ' '));
      if (pz) p.nacionalidad = pz;
    }
    // "Nombre: Juan Pérez García" sin etiqueta de apellido → es el nombre completo
    if (p.nombres && !p.apellidos && !p.completo && p.nombres.split(' ').length >= 2) { p.completo = p.nombres; p.nombres = ''; }
    // ---- armado ----
    if (p.completo && !(p.apellidos && p.nombres)) {
      var s = separar(p.completo, orden);
      if (s) {
        if (!p.apellidos) p.apellidos = s.apellidos;
        if (!p.nombres) p.nombres = s.nombres;
        if (s.dudoso) p.dudoso = true;
      }
    }
    if (p.telRaw) { var tl = telefono(p.telRaw, pais0); if (tl) { p.telefono = tl.num; if (tl.aviso) p.avisos.push(tl.aviso); } }
    if (p.ci && !ciValida(p.ci) && /^\d{7,8}$/.test(p.ci) && (!p.nacionalidad || p.nacionalidad === 'URY')) p.avisos.push('El dígito verificador de la cédula no coincide: revisá el número');
    if (p.fechaSuelta === 2) p.avisos.push('Había varias fechas sin etiqueta: se tomó la primera como nacimiento, verificala');
    if (p.ppSuelto) p.avisos.push('El número de pasaporte se tomó sin etiqueta: verificalo');
    if (p.dudoso) p.avisos.push('Revisá qué palabras son nombres y cuáles apellidos');
    delete p.telRaw; delete p.completo; delete p.fechaSuelta; delete p.ppSuelto;
    return p;
  }
  function tieneDatos(p) { return !!(p.apellidos || p.nombres || p.pasaporte || p.ci || p.nacimiento); }

  // ---------- planillas (Excel / CSV) ----------
  function tabla(lineas, sep, pais0) {
    var cab = lineas[0].split(sep).map(function (c) { return N(c).trim(); });
    var tipos = cab.map(function (c) {
      for (var i = 0; i < ETQ.length; i++) { var m = c.match(ETQ[i][1]); if (m && m[0].length >= Math.min(c.length, 3) * 0.6) return ETQ[i][0]; }
      return '';
    });
    if (tipos.filter(Boolean).length < 2) return null;
    var out = [];
    lineas.slice(1).forEach(function (l) {
      if (!l.trim()) return;
      var cs = l.split(sep), txt = [];
      cs.forEach(function (c, k) {
        if (!tipos[k] || !c.trim()) return;
        var lab = { apellidos: 'Apellidos', nombres: 'Nombres', completo: 'Pasajero', completoAN: 'Apellidos y nombres', nac: 'Fecha de nacimiento', venc: 'Vencimiento', emi: 'Emisión', pp: 'Pasaporte', ci: 'Cédula', nacion: 'Nacionalidad', sexo: 'Sexo', mail: 'Mail', tel: 'Celular' }[tipos[k]];
        txt.push(lab + ': ' + c.trim());
      });
      var p = bloque(txt.join('\n'), pais0);
      if (tieneDatos(p)) out.push(p);
    });
    return out;
  }

  // ---------- separar el texto en pasajeros ----------
  function bloques(texto) {
    var ls = texto.replace(/\r/g, '').split('\n'), bs = [], cur = [];
    function cerrar() { if (cur.join('').trim()) bs.push(cur.join('\n')); cur = []; }
    var vistos = {};
    ls.forEach(function (l) {
      var L = N(l);
      if (!l.trim()) { cerrar(); vistos = {}; return; }
      var nuevo = /^\s*(?:\d{1,2}\s*[).\-–]|(?:PAX|PASAJER[OA])\s*\d+|[-•*]\s)/.test(L);
      // una etiqueta de nombre que se repite indica otro pasajero
      var etq = /^\s*(APELLIDOS?|NOMBRES?\s+Y\s+APELLIDOS?|NOMBRE\s+COMPLETO|PASAJER[OA]|NOMBRES?)\b/.exec(L);
      if (etq) { var k = etq[1].replace(/S$/, ''); if (vistos[k]) nuevo = true; }
      if (nuevo) { cerrar(); vistos = {}; }
      if (etq) vistos[etq[1].replace(/S$/, '')] = 1;
      cur.push(l);
    });
    cerrar();
    // bloques sin etiquetas con varias líneas, cada una con un dato propio → un pasajero por línea
    var out = [];
    bs.forEach(function (b) {
      var lns = b.split('\n').filter(function (l) { return l.trim(); });
      var hayEtq = ETQ.slice(0, 4).some(function (e) { return e[1].test(N(b)); });
      var reCi = new RegExp(RE_CI.source);
      var conDato = lns.filter(function (l) { return fechas(N(l), 'nac').length || /[A-Z]{1,3}\d{6,9}/.test(N(l)) || reCi.test(l); });
      var soloNombres = lns.length >= 2 && lns.every(function (l) { return /^\s*(?:\d{1,2}\s*[).\-–]\s*)?[A-Za-zÁÉÍÓÚÜÑáéíóúüñÇçÃãÕõÂâÊêÔô'’\-\/]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñÇçÃãÕõÂâÊêÔô'’\-\/]+){1,6}\s*$/.test(l) && !/^\s*(HOLA|BUEN|SALUDOS|GRACIAS)/i.test(sinTildes(l)); });
      if (!hayEtq && ((lns.length >= 2 && conDato.length >= 2 && conDato.length >= lns.length - 1) || soloNombres)) lns.forEach(function (l) { out.push(l); });
      else out.push(b);
    });
    return out;
  }

  function parse(texto, opc) {
    opc = opc || {};
    var pais0 = opc.codPais || '598';
    texto = String(texto || '');
    var res = [], avisos = [];
    // 1) MRZ pegadas
    var mrz = MRZr ? MRZr.buscar(texto) : [];
    mrz.forEach(function (r) { res.push({ mrz: r, avisos: [] }); });
    if (mrz.length) {
      var quitar = {};
      mrz.forEach(function (r) { r.lineas.forEach(function (l) { quitar[l.replace(/<+$/, '')] = 1; }); });
      texto = texto.split('\n').filter(function (l) {
        var c = MRZr.clean(l); if (c.length < 20) return true;
        return !Object.keys(quitar).some(function (q) { return c.replace(/<+$/, '').indexOf(q.slice(0, 20)) >= 0 || q.indexOf(c.replace(/<+$/, '').slice(0, 20)) >= 0; });
      }).join('\n');
    }
    // 2) planilla
    var ls = texto.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
    var tab = null;
    if (ls.length >= 2) {
      if (ls[0].split('\t').length >= 3 && ls[1].split('\t').length >= 3) tab = tabla(ls, '\t', pais0);
      else if (ls[0].split(';').length >= 3 && ls[1].split(';').length >= 3) tab = tabla(ls, ';', pais0);
    }
    if (tab) return { pasajeros: res.concat(tab), avisos: avisos };
    // 3) texto libre
    var sueltos = [];
    var DESP = /^\s*(SALUDOS|SLDS|SDS|GRACIAS|ATTE|ATENTAMENTE|CORDIALES|CORDIALMENTE|ABRAZO|ABRAZOS|BESOS|SALU2|QUEDO|QUEDAMOS)\b/;
    bloques(texto).forEach(function (b) {
      var p = bloque(b, pais0);
      if (DESP.test(N(b)) && !p.pasaporte && !p.ci && !p.nacimiento) return;
      if (tieneDatos(p)) res.push(p);
      else if (p.email || p.telefono) sueltos.push(p);
    });
    // contactos sin nombre: al pasajero anterior que no tenga, o al único pasajero.
    // Si el texto no trae pasajeros, se devuelven solos para sumarlos a los que ya están cargados.
    if (!res.length) return { pasajeros: sueltos, avisos: avisos };
    sueltos.forEach(function (s) {
      var dest = res.filter(function (p) { return !p.email && !p.telefono; });
      var d = res.length === 1 ? res[0] : dest[0];
      if (!d) return;
      if (s.email && !d.email) d.email = s.email;
      if (s.telefono && !d.telefono) d.telefono = s.telefono;
      (s.avisos || []).forEach(function (a) { d.avisos.push(a); });
    });
    return { pasajeros: res, avisos: avisos };
  }

  return { parse: parse, separar: separar, telefono: telefono, ciValida: ciValida, limpiaNombre: limpiaNombre, fechas: fechas, pais: pais, N: N };
})();
if (typeof module !== 'undefined') module.exports = TEXTO;
