/* ===== Lectura de la zona MRZ (ICAO 9303): pasaportes (TD3), cédulas (TD1) y TD2 =====
   Valida dígitos verificadores y corrige confusiones típicas del OCR (O/0, I/1, S/5…). */
var MRZ = (function () {
  var W = [7, 3, 1];
  function val(c) {
    if (c === '<') return 0;
    var k = c.charCodeAt(0);
    if (k >= 48 && k <= 57) return k - 48;
    if (k >= 65 && k <= 90) return k - 55;
    return -1;
  }
  function cd(s) {
    var t = 0;
    for (var i = 0; i < s.length; i++) { var v = val(s[i]); if (v < 0) return -1; t += v * W[i % 3]; }
    return t % 10;
  }
  // Dígito verificador: acepta '<' sólo si el campo está vacío (ICAO lo permite en campos opcionales)
  function ok(field, d) {
    if (d === '<') return /^<*$/.test(field);
    return /^[0-9]$/.test(d) && cd(field) === +d;
  }
  var TO_DIG = { O: '0', Q: '0', D: '0', U: '0', I: '1', L: '1', J: '1', Z: '2', S: '5', B: '8', G: '6', T: '7', A: '4' };
  var TO_ALF = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A', '7': 'T' };
  var ALT = { '0': 'OD', 'O': '0D', 'D': '0O', 'Q': '0O', '1': 'IL', 'I': '1L', 'L': '1I', '2': 'Z', 'Z': '2', '5': 'S', 'S': '5', '8': 'B', 'B': '8', '6': 'G', 'G': '6', '4': 'A', 'A': '4', '7': 'T', 'T': '7' };
  function dig(s) { return s.replace(/[^0-9<]/g, function (c) { return TO_DIG[c] || c; }); }
  function alf(s) { return s.replace(/[0-9]/g, function (c) { return TO_ALF[c] || c; }); }

  // Limpia una línea leída por OCR: mayúsculas, sin espacios, símbolos parecidos a '<' → '<'
  function clean(line) {
    var s = String(line || '').toUpperCase()
      .replace(/[«‹＜〈(\[{]/g, '<')
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9<]/g, '');
    return s;
  }
  // En zonas de relleno el OCR a veces lee K o C en lugar de '<': sólo se corrigen si están
  // entre rellenos (o al final de la línea), nunca al comienzo de un nombre (CARMEN, KARINA…)
  function fillers(s) {
    var a = s.split(''), cambio = true;
    while (cambio) {
      cambio = false;
      for (var i = 1; i < a.length; i++) {
        if ((a[i] === 'K' || a[i] === 'C') && a[i - 1] === '<' && (i === a.length - 1 || a[i + 1] === '<') && (i < 2 || a[i - 2] === '<')) { a[i] = '<'; cambio = true; }
      }
    }
    return a.join('');
  }

  // ---- fechas ----
  var hoy = new Date();
  function fecha(yymmdd, tipo) {
    if (!/^\d{6}$/.test(yymmdd)) return null;
    var yy = +yymmdd.slice(0, 2), mm = +yymmdd.slice(2, 4), dd = +yymmdd.slice(4, 6);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    var y;
    if (tipo === 'nac') { y = 2000 + yy; if (new Date(y, mm - 1, dd) > hoy) y -= 100; }
    else y = 2000 + yy;
    var d = new Date(y, mm - 1, dd);
    if (d.getMonth() !== mm - 1) return null;
    return { y: y, m: mm, d: dd };
  }

  // ---- nombres ----
  function nombre(campo) {
    var s = fillers(campo).replace(/<+$/, '');
    var full = !/<$/.test(campo); // campo completo sin relleno al final → posible truncamiento
    var i = s.indexOf('<<');
    var ap = i < 0 ? s : s.slice(0, i), no = i < 0 ? '' : s.slice(i + 2);
    function fix(t) { return t.replace(/</g, ' ').replace(/\s+/g, ' ').replace(/[0-9]/g, function (c) { return TO_ALF[c] || ''; }).trim(); }
    return { apellidos: fix(ap), nombres: fix(no), truncado: full && s.length >= campo.length - 1 };
  }

  // Corrige UNA confusión del OCR en un campo alfanumérico. Sólo se acepta si cierra el dígito del campo
  // y además el verificador general, y si hay una única variante posible (si no, queda sin verificar).
  function repara(field, d, general) {
    if (ok(field, d)) return field;
    var hits = [];
    for (var i = 0; i < field.length; i++) {
      var alts = ALT[field[i]];
      if (!alts) continue;
      for (var x = 0; x < alts.length; x++) {
        var f1 = field.slice(0, i) + alts[x] + field.slice(i + 1);
        if (ok(f1, d) && general(f1)) hits.push(f1);
      }
    }
    return hits.length === 1 ? hits[0] : null;
  }

  // Letras confundibles (B, O, I, S, Z, G…) entre dígitos: si el verificador sigue cerrando con el dígito, se usa el dígito
  var L2D = { B: '8', O: '0', D: '0', Q: '0', I: '1', L: '1', S: '5', Z: '2', G: '6' };
  function preferirDigitos(field, d, general) {
    var a = field.split(''), cambios = [];
    for (var i = 1; i < a.length; i++) {
      var sig = i + 1 < a.length ? a[i + 1] : '<';
      if (L2D[a[i]] && /[0-9]/.test(a[i - 1]) && (/[0-9<]/.test(sig) || L2D[sig])) cambios.push(i);
    }
    if (!cambios.length) return field;
    var b = a.slice(); cambios.forEach(function (i) { b[i] = L2D[a[i]]; });
    var f = b.join('');
    return ok(f, d) && general(f) ? f : field;
  }

  // Ajusta el largo de una línea probando quitar/agregar un caracter donde más checks cierren
  function largo(l, n, puntaje) {
    if (l.length === n) return l;
    var best = null, bs = -1, cands = [];
    if (l.length > n) {
      var t = l;
      while (t.length > n + 1 && /<$/.test(t)) t = t.slice(0, -1);
      if (t.length === n) cands.push(t);
      if (t.length === n + 1) for (var i = 0; i < t.length; i++) cands.push(t.slice(0, i) + t.slice(i + 1));
      if (!cands.length) cands.push(l.slice(0, n));
    } else {
      var u = l;
      if (u.length === n - 1) for (var j = 0; j <= u.length; j++) cands.push(u.slice(0, j) + '<' + u.slice(j));
      while (u.length < n) u += '<';
      cands.push(u);
    }
    for (var k = 0; k < cands.length; k++) { var s = puntaje(cands[k]); if (s > bs) { bs = s; best = cands[k]; } }
    return best;
  }

  function sexo(c) { c = c === 'H' ? 'M' : c; return c === 'M' || c === 'F' ? c : (c === '<' || c === 'X' ? 'X' : ''); }

  // ---------- TD3 (pasaporte: 2 líneas de 44) ----------
  function scoreTD3(l2) {
    var s = 0, x = dig;
    if (ok(l2.slice(0, 9), l2[9])) s++;
    if (ok(x(l2.slice(13, 19)), x(l2[19]))) s++;
    if (ok(x(l2.slice(21, 27)), x(l2[27]))) s++;
    if (ok(l2.slice(28, 42), l2[42])) s++;
    var comp = l2.slice(0, 10) + x(l2.slice(13, 20)) + x(l2.slice(21, 28)) + l2.slice(28, 43);
    if (ok(comp, x(l2[43]))) s += 2;
    return s;
  }
  function td3(l1, l2) {
    l1 = fillers(l1); l2 = fillers(l2);
    if (l1.length < 40 || l2.length < 40) return null;
    l1 = l1.length > 44 ? l1.slice(0, 44) : (l1 + '<<<<<<<<').slice(0, 44);
    l2 = largo(l2, 44, scoreTD3);
    var tipo = l1.slice(0, 2), emisor = alf(l1.slice(2, 5));
    if (tipo[0] !== 'P') return null;
    var doc = l2.slice(0, 9), dDoc = dig(l2[9]);
    var nac = alf(l2.slice(10, 13));
    var fn = dig(l2.slice(13, 19)), dFn = dig(l2[19]);
    var sx = l2[20];
    var fv = dig(l2.slice(21, 27)), dFv = dig(l2[27]);
    var pers = l2.slice(28, 42), dPers = l2[42] === '<' ? '<' : dig(l2[42]);
    var dComp = dig(l2[43]);
    function gen(dc, pe) { return ok(dc + dDoc + fn + dFn + fv + dFv + pe + dPers, dComp); }
    var docR = repara(doc, dDoc, function (f) { return gen(f, pers); });
    if (docR) docR = preferirDigitos(docR, dDoc, function (f) { return gen(f, pers); });
    var persR = repara(pers, dPers, function (f) { return gen(docR || doc, f); });
    var chk = {
      numero: !!docR, nacimiento: ok(fn, dFn), vencimiento: ok(fv, dFv), personal: !!persR
    };
    doc = docR || doc; pers = persR || pers;
    chk.general = gen(doc, pers);
    var nm = nombre(l1.slice(5));
    return armar('TD3', tipo, emisor, doc, nac, fn, sx, fv, pers, nm, chk, [l1, l2]);
  }

  // ---------- TD1 (cédulas tipo tarjeta: 3 líneas de 30) ----------
  function scoreTD1(l2) {
    var s = 0;
    if (ok(dig(l2.slice(0, 6)), dig(l2[6]))) s++;
    if (ok(dig(l2.slice(8, 14)), dig(l2[14]))) s++;
    return s;
  }
  function td1(l1, l2, l3) {
    l1 = fillers(l1); l2 = fillers(l2); l3 = fillers(l3 || '');
    if (l1.length < 26 || l2.length < 26) return null;
    l1 = l1.length > 30 ? l1.slice(0, 30) : (l1 + '<<<<<<').slice(0, 30);
    l2 = largo(l2, 30, scoreTD1);
    l3 = l3.length > 30 ? l3.slice(0, 30) : (l3 + '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0, 30);
    var tipo = l1.slice(0, 2);
    if (!/^[IAC]/.test(tipo)) return null;
    var emisor = alf(l1.slice(2, 5));
    var doc = l1.slice(5, 14), dDoc = l1[14], opt1 = l1.slice(15, 30);
    var numOK;
    if (dDoc === '<' && /[0-9]/.test(opt1)) { // número largo: sigue en el opcional hasta el primer '<'
      var m = opt1.match(/^([A-Z0-9]*)([0-9])</) || opt1.match(/^([A-Z0-9]*)([0-9])$/);
      if (m) { doc = doc + m[1]; dDoc = m[2]; }
    }
    var fn = dig(l2.slice(0, 6)), dFn = dig(l2[6]), sx = l2[7], fv = dig(l2.slice(8, 14)), dFv = dig(l2[14]);
    var nac = alf(l2.slice(15, 18)), opt2 = l2.slice(18, 29), dComp = dig(l2[29]);
    var docOrig = doc;
    function gen1(dc) { var l1b = l1.slice(0, 5) + l1.slice(5).replace(docOrig, dc); return ok(l1b.slice(5, 30) + fn + dFn + fv + dFv + opt2, dComp); }
    var docR = repara(doc, dig(dDoc), gen1);
    if (docR) docR = preferirDigitos(docR, dig(dDoc), gen1);
    numOK = !!docR; doc = docR || doc;
    var chk = { numero: numOK, nacimiento: ok(fn, dFn), vencimiento: ok(fv, dFv), general: gen1(doc) };
    var nm = nombre(l3);
    var r = armar('TD1', tipo, emisor, doc, nac, fn, sx, fv, (opt1 + '<' + opt2), nm, chk, [l1, l2, l3]);
    return r;
  }

  // ---------- TD2 (2 líneas de 36) ----------
  function scoreTD2(l2) {
    var s = 0;
    if (ok(l2.slice(0, 9), l2[9])) s++;
    if (ok(dig(l2.slice(13, 19)), dig(l2[19]))) s++;
    if (ok(dig(l2.slice(21, 27)), dig(l2[27]))) s++;
    if (ok(l2.slice(0, 10) + dig(l2.slice(13, 20)) + dig(l2.slice(21, 28)) + l2.slice(28, 35), dig(l2[35]))) s += 2;
    return s;
  }
  function td2(l1, l2) {
    l1 = fillers(l1); l2 = fillers(l2);
    if (l1.length < 32 || l2.length < 32) return null;
    l1 = l1.length > 36 ? l1.slice(0, 36) : (l1 + '<<<<<<').slice(0, 36);
    l2 = largo(l2, 36, scoreTD2);
    var tipo = l1.slice(0, 2);
    if (!/^[PIAC]/.test(tipo)) return null;
    var emisor = alf(l1.slice(2, 5));
    var doc = l2.slice(0, 9), dDoc = dig(l2[9]), nac = alf(l2.slice(10, 13));
    var fn = dig(l2.slice(13, 19)), dFn = dig(l2[19]), sx = l2[20], fv = dig(l2.slice(21, 27)), dFv = dig(l2[27]);
    var opt = l2.slice(28, 35), dComp = dig(l2[35]);
    function gen2(dc) { return ok(dc + dDoc + fn + dFn + fv + dFv + opt, dComp); }
    var docR = repara(doc, dDoc, gen2);
    if (docR) docR = preferirDigitos(docR, dDoc, gen2);
    var chk = { numero: !!docR, nacimiento: ok(fn, dFn), vencimiento: ok(fv, dFv) };
    doc = docR || doc;
    chk.general = gen2(doc);
    return armar('TD2', tipo, emisor, doc, nac, fn, sx, fv, opt, nombre(l1.slice(5)), chk, [l1, l2]);
  }

  function armar(fmt, tipo, emisor, doc, nac, fn, sx, fv, opcional, nm, chk, lineas) {
    var n = 0, t = 0;
    for (var k in chk) { t++; if (chk[k]) n++; }
    return {
      formato: fmt,
      tipoDoc: tipo.replace(/<$/, ''),
      esPasaporte: tipo[0] === 'P',
      emisor: emisor.replace(/<+$/, ''),
      numero: doc.replace(/</g, ''),
      nacionalidad: nac.replace(/<+$/, ''),
      nacimiento: fecha(fn, 'nac'),
      sexo: sexo(sx),
      vencimiento: fecha(fv, 'venc'),
      opcional: opcional.replace(/</g, ' ').replace(/\s+/g, ' ').trim(),
      apellidos: nm.apellidos,
      nombres: nm.nombres,
      truncado: nm.truncado,
      checks: chk,
      verificado: n === t,
      puntos: n,
      total: t,
      lineas: lineas
    };
  }

  // Busca MRZ dentro de un texto (pegado o devuelto por el OCR). Devuelve todas las encontradas, en orden.
  function mejor(cs) {
    cs = cs.filter(Boolean);
    cs.sort(function (x, y) { return (y.puntos / y.total) - (x.puntos / x.total) || y.puntos - x.puntos; });
    return cs[0] || null;
  }
  var ESPECIALES = { UTO: 1, D: 1, XXA: 1, XXB: 1, XXC: 1, XXX: 1, UNO: 1, UNA: 1, UNK: 1, EUE: 1, RKS: 1 };
  function emisorOk(e) {
    e = String(e || '').replace(/<+$/, '');
    if (typeof PAISES === 'undefined') return /^[A-Z]{1,3}$/.test(e);
    return !!(PAISES[e] || ESPECIALES[e]);
  }
  function buscar(texto) {
    var ls = String(texto || '').split(/\r?\n/).map(clean).filter(function (l) { return l.length >= 20; });
    var res = [];
    for (var i = 0; i < ls.length; i++) {
      var a = ls[i], b = ls[i + 1], c = ls[i + 2];
      if (!b) break;
      var cs = [];
      if (a.length >= 40 && b.length >= 40 && /^P/.test(a)) cs.push(td3(a, b));
      if (a.length >= 26 && a.length <= 34 && b.length >= 26 && b.length <= 34 && /^[IAC]/.test(a)) cs.push(td1(a, b, c));
      if (a.length >= 32 && a.length <= 39 && b.length >= 32 && b.length <= 39 && /^[PIAC]/.test(a)) cs.push(td2(a, b));
      var r = mejor(cs);
      // Una MRZ real siempre tiene rellenos '<' y un país emisor válido: así no se confunde con texto común
      if (r && r.puntos >= 2 && a.indexOf('<') >= 0 && (b.indexOf('<') >= 0 || r.puntos >= 4) && emisorOk(r.emisor)) { res.push(r); i += r.formato === 'TD1' ? 2 : 1; }
    }
    // MRZ pegada en una sola línea (88 caracteres de pasaporte o 90 de cédula seguidos)
    if (!res.length) {
      var todo = clean(String(texto || '').replace(/\r?\n/g, ''));
      var re = /P[A-Z<][A-Z<]{3}[A-Z]/g, m;
      while ((m = re.exec(todo))) {
        if (todo.length - m.index < 86) break;
        var t3 = td3(todo.slice(m.index, m.index + 44), todo.slice(m.index + 44, m.index + 88));
        if (t3 && t3.puntos >= 3 && t3.lineas[0].indexOf('<<') >= 0 && emisorOk(t3.emisor)) { res.push(t3); re.lastIndex = m.index + 88; }
      }
      if (!res.length) {
        var re1 = /[IAC][A-Z<][A-Z]{3}[A-Z0-9<]{25}/g;
        while ((m = re1.exec(todo))) {
          if (todo.length - m.index < 88) break;
          var t1 = td1(todo.slice(m.index, m.index + 30), todo.slice(m.index + 30, m.index + 60), todo.slice(m.index + 60, m.index + 90));
          if (t1 && t1.puntos >= 3 && t1.lineas[0].indexOf('<') >= 0 && emisorOk(t1.emisor)) { res.push(t1); re1.lastIndex = m.index + 90; }
        }
      }
    }
    return res;
  }

  return { buscar: buscar, td3: td3, td1: td1, td2: td2, cd: cd, clean: clean };
})();
if (typeof module !== 'undefined') module.exports = MRZ;
