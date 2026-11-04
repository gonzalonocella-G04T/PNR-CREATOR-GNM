/* Ticket Vintage HV — lector de boletos / itinerarios en PDF.
   Entrada: { lines: [texto por renglón, columnas separadas por 4+ espacios], pages: [[{s,x,y}]] }
   Salida: { format, gdsLoc, airlineLocs, issueDate, pax, segs, issues }
   Regla: nunca inventar. Lo que no figura queda en null y se agrega a issues. */
(function (root) {
  var HV = root.HV;
  var MES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  var MON3 = { ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12 };
  var DOWS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, DO: 0, LU: 1, MA: 2, MI: 3, JU: 4, VI: 5, SA: 6 };
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function cols(l) { return l.split(/\s{3,}/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + p2(m) + '-' + p2(d); }
  function hm(t) { var m = /(\d{1,2}):(\d{2})/.exec(t); return m ? p2(+m[1]) + ':' + m[2] : null; }
  function dow(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  function cleanName(s) { return String(s || '').replace(/\s*\((PFA|ADT|CHD|INF|CNN|MR|MRS|MS)\)\s*/gi, ' ').replace(/\s+/g, ' ').trim(); }
  function titleName(s) {
    s = cleanName(s);
    var m = /^([^\/,]+)[\/,]\s*(.+)$/.exec(s);           // APELLIDO/NOMBRE o APELLIDO, NOMBRE
    if (m) s = m[2] + ' ' + m[1];
    return s.toLowerCase().replace(/(^|[\s\-'])([a-záéíóúñü])/g, function (a, b, c) { return b + c.toUpperCase(); }).replace(/\s+(Mr|Mrs|Ms|Miss|Mstr)$/i, '');
  }
  function samePax(a, b) {
    var A = norm(cleanName(a)).split(/[\s\/,]+/).filter(Boolean), B = norm(cleanName(b)).split(/[\s\/,]+/).filter(Boolean);
    var hit = A.filter(function (t) { return B.indexOf(t) >= 0; }).length;
    return hit >= Math.min(2, Math.min(A.length, B.length));
  }
  /* ---- aeropuertos: texto libre -> IATA ---- */
  var ALIAS = { london: 'londres', 'panama city': 'ciudad de panama', 'sao paulo': 'sao paulo', geneva: 'ginebra', rome: 'roma', milan: 'milan', lisbon: 'lisboa', munich: 'munich', brussels: 'bruselas', copenhagen: 'copenhague', stockholm: 'estocolmo', athens: 'atenas', istanbul: 'estambul', moscow: 'moscu', cairo: 'el cairo', tokyo: 'tokio', beijing: 'pekin', 'new york': 'nueva york', 'mexico city': 'ciudad de mexico', florence: 'florencia', venice: 'venecia', naples: 'napoles', seville: 'sevilla', vienna: 'viena', prague: 'praga', warsaw: 'varsovia', 'the hague': 'la haya', amsterdam: 'amsterdam', dublin: 'dublin', zurich: 'zurich', 'rio de janeiro': 'rio de janeiro', 'santiago': 'santiago de chile', 'havana': 'la habana', 'cape town': 'ciudad del cabo', 'frankfurt': 'francfort', 'belem': 'belem', 'asuncion': 'asuncion', 'bogota': 'bogota' };
  var STOP = { international: 1, intl: 1, internacional: 1, airport: 1, aeropuerto: 1, apt: 1, terminal: 1, de: 1, del: 1, la: 1, el: 1, city: 1, the: 1, airfield: 1 };
  function toks(s) { return norm(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (t) { return t.length > 2 && !STOP[t]; }); }
  function resolveAirport(raw, code) {
    var AP = HV.AP;
    if (code && AP[code]) return { code: code, conf: 'alta' };
    if (code && /^[A-Z]{3}$/.test(code)) return { code: code, conf: 'media' };
    var txt = norm(raw).replace(/\(\+\)/g, ' ');
    Object.keys(ALIAS).forEach(function (k) { if (txt.indexOf(k) === 0) txt = ALIAS[k] + txt.slice(k.length); });
    var pm = /^([^,(]+),?\s*\((.+)\)/.exec(txt);           // "Ciudad, (Aeropuerto)"
    var T = toks(txt), TC = pm ? toks(pm[1]) : T, TA = pm ? toks(pm[2]) : T;
    if (!T.length) return { code: null, conf: 'nula' };
    var sc = {};
    Object.keys(AP).forEach(function (c) {
      var a = AP[c], cT = toks(a.c), nT = toks(a.n).filter(function (t) { return cT.indexOf(t) < 0; }), v = 0;
      if (!cT.length && !nT.length) return;
      if (cT.length && cT.every(function (t) { return TC.indexOf(t) >= 0; })) v += 2;
      nT.forEach(function (t) { if (TA.indexOf(t) >= 0 && (!pm || TC.indexOf(t) < 0)) v += 3; });
      if (/todos los aeropuertos/i.test(a.n)) v -= 1;
      if (v > 0) sc[c] = v;
    });
    function top(filter) { var bb = [], m = 0; Object.keys(sc).forEach(function (c) { if (!filter(c)) return; if (sc[c] > m) { m = sc[c]; bb = [c]; } else if (sc[c] === m) bb.push(c); }); return { b: bb, s: m }; }
    var tc = top(function (c) { return AP[c].cur; }), ta = top(function () { return true; });
    // Lista principal primero; un aeropuerto fuera de ella solo gana si su nombre coincide claramente mejor
    var pick = (tc.b.length && ta.s < tc.s + 3) ? tc : ta, best = pick.b, bs = pick.s;
    if (!best.length) return { code: null, conf: 'nula' };
    if (best.length === 1) return { code: best[0], conf: bs >= 3 ? 'alta' : 'media' };
    return { code: null, conf: 'ambigua', options: best.slice(0, 5) };
  }
  /* ---- cálculos de tiempo ---- */
  function utcMin(dateIso, time, code) {
    var a = HV.AP[code]; if (!a || !dateIso || !time) return null;
    var p = dateIso.split('-').map(Number), t = time.split(':').map(Number);
    return Math.round(HV.toUTC({ y: p[0], m: p[1], d: p[2] }, { h: t[0], mi: t[1] }, { tz: a.tz }) / 60000);
  }
  function durMin(s) { var m = /(\d{1,2}):(\d{2})/.exec(s); if (m) return +m[1] * 60 + +m[2]; m = /(\d+)\s*h\w*\s*(\d+)\s*m/i.exec(s); return m ? +m[1] * 60 + +m[2] : null; }
  function addDaysIso(dIso, n) { var p = dIso.split('-').map(Number); var t = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  function cabinFromWord(w) {
    var n = norm(w);
    if (/premium/.test(n)) return 'Premium Economy';
    if (/primera|first/.test(n)) return 'Primera';
    if (/business|ejecutiv|negocio/.test(n)) return 'Business';
    if (/econ|turista|coach/.test(n)) return 'Economy';
    return null;
  }
  var CABIN_CODE = { Y: 'Economy', M: 'Economy', W: 'Premium Economy', C: 'Business', J: 'Business', F: 'Primera', P: 'Primera' };
  function newSeg() {
    return { al: null, fn: null, opBy: null, depDate: null, depTime: null, arrDate: null, arrTime: null, from: { raw: '', code: null, conf: 'nula' }, to: { raw: '', code: null, conf: 'nula' }, depTerm: null, arrTerm: null, durText: null, cabin: null, rbd: null, fareBrand: null, status: null, equip: null, seats: {}, bags: {}, cabinBag: null, personalItem: null, src: {} };
  }

  /* ================= AMADEUS (CheckMyTrip / Su viaje) ================= */
  function parseAmadeus(L, out) {
    var j, m, issueY = null;
    for (j = 0; j < L.length; j++) {
      if ((m = /Localizador de\s+([A-Z0-9]{6})\b/.exec(L[j]))) out.gdsLoc = m[1];
      if ((m = /Fecha de emisi[oó]n:\s+(\d{1,2}) (\w+)/.exec(L[j]))) {
        var y = /^\s*(\d{4})\s*$/.exec(L[j + 1] || '') ? +L[j + 1].trim() : null;
        if (MES[norm(m[2])] && y) { out.issueDate = iso(y, MES[norm(m[2])], +m[1]); issueY = y; }
      }
    }
    // viajeros
    var LBL = /^(Agencia|Tel[eé]fono|Fax|Correo)/;
    for (j = 0; j < L.length; j++) {
      var c = cols(L[j]);
      if (c[0] === 'Viajero') {
        if (c[1] && !LBL.test(c[1])) out.pax.push({ name: c[1], tickets: [] });
        for (var k = j + 1; k < L.length && L[k].trim() !== '.'; k++) {
          var cc = cols(L[k]); if (cc[0] && !LBL.test(cc[0])) out.pax.push({ name: cc[0], tickets: [] });
        }
        break;
      }
    }
    // tramos
    var DAYH = /^(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo) (\d{1,2}) (\w+) (\d{4})$/i;
    var LABELS = ['Salida', 'Llegada', 'Duración', 'Duracion', 'Estatus de la reserva', 'Clase', 'Equipaje permitido', 'Asiento', 'Equipo', 'Flight meal', 'Número de viajero frecuente', 'Check-in', 'Comida'];
    var blocks = [];
    for (j = 0; j < L.length; j++) { if ((m = DAYH.exec(L[j].trim()))) blocks.push({ i: j, y: +m[4], mo: MES[norm(m[3])], d: +m[2] }); }
    blocks.forEach(function (b, bi) {
      var end = bi + 1 < blocks.length ? blocks[bi + 1].i : L.length, s = newSeg(), cur = null, k;
      for (k = b.i + 1; k < end; k++) {
        var line = L[k].trim();
        if (!line || line === '.' || line === '<<PAGE>>' || /^P[aá]gina \d+ de \d+$/.test(line)) { if (line === '.' && s.depTime) break; continue; }
        if (/^(Detalles de billete|Informaci[oó]n general|Travel emission|Localizador\(es\))/.test(line)) break;
        var c = cols(line), lab = LABELS.filter(function (x) { return c[0] === x; })[0];
        if (!lab && !s.al && (m = /^(.*?)\b([A-Z0-9]{2})\s?(\d{1,4})\b(.*)$/.exec(line))) {
          s.al = m[2]; s.fn = String(+m[3]); s.alName = m[1].trim();
          var op = /Operado por ([^,)]+)/i.exec(line); if (op) s.opBy = op[1].trim();
          continue;
        }
        if (!lab && (m = /^\(Operado por ([^,)]+)/i.exec(line))) { s.opBy = m[1].trim(); continue; }
        if (lab) { cur = lab; c = c.slice(1); }
        var v = c.join('    ');
        if (cur === 'Salida' || cur === 'Llegada') {
          var key = cur === 'Salida' ? 'dep' : 'arr', place = cur === 'Salida' ? s.from : s.to;
          if ((m = /^(\d{1,2}) (\w+) (\d{1,2}:\d{2})\s*(.*)$/.exec(v))) {
            var mo = MES[norm(m[2])], y2 = b.y;
            if (mo && mo < b.mo) y2 = b.y + 1;            // cruza de año
            s[key + 'Date'] = iso(y2, mo, +m[1]); s[key + 'Time'] = hm(m[3]);
            var rest = m[4], tm = /Terminal:\s*(.+)$/.exec(rest);
            if (tm) { s[key + 'Term'] = tm[1].trim(); rest = rest.slice(0, tm.index); }
            place.raw = rest.replace(/\(\+\)/g, '').replace(/\s+/g, ' ').trim();
          } else if (v && !/^\(\+\)$/.test(v)) {
            var tm2 = /Terminal:\s*(.+)$/.exec(v); if (tm2) s[key + 'Term'] = tm2[1].trim();
          }
        } else if (/^Duraci/.test(cur || '') && lab) { s.durText = v; }
        else if (cur === 'Estatus de la reserva' && lab) { s.status = v; }
        else if (cur === 'Clase' && lab) { if ((m = /^(.*?)\s*\(([A-Z])\)/.exec(v))) { s.cabin = cabinFromWord(m[1]); s.cabinRaw = m[1]; s.rbd = m[2]; } else s.cabinRaw = v; }
        else if (cur === 'Equipaje permitido') {
          if ((m = /(\d+)\s*(Piece\(s\)|Pieza|Pc|Kilo|Kg|K)\w*\s*(?:\(s\))?\s*para (.+)$/i.exec(v))) {
            var isKg = /^k/i.test(m[2]); s.bags[m[3].trim()] = { pcs: isKg ? null : +m[1], kg: isKg ? +m[1] : null, raw: v };
          }
        } else if (cur === 'Asiento') {
          if ((m = /^(\d{1,3}[A-Z])\s+\w+\s+para (.+)$/.exec(v))) s.seats[m[2].trim()] = m[1];
        } else if (cur === 'Equipo' && lab) { s.equip = v; }
      }
      if (s.al) out.segs.push(s);
    });
    // boletos
    L.forEach(function (l) {
      if ((m = /Billete electr[oó]nico\s+([A-Z0-9]{2})?\s*([0-9]{3}-?[0-9]{10}(?:-\d{2})?)\s+para (.+)$/.exec(l.trim()))) {
        var p = out.pax.filter(function (x) { return samePax(x.name, m[3]); })[0];
        if (p) p.tickets.push(m[2]); else out.issues.push('Boleto ' + m[2] + ' a nombre de ' + m[3] + ' no coincide con ningún viajero.');
      }
    });
    // localizadores de aerolínea
    var inLoc = false;
    L.forEach(function (l) {
      var t = l.trim();
      if (/^Localizador\(es\) de reserva de la aerol/.test(t)) { inLoc = true; return; }
      if (inLoc) { if ((m = /^([A-Z0-9]{2}) \((.+)\):\s*([A-Z0-9]{5,8})$/.exec(t))) out.airlineLocs.push({ al: m[1], name: m[2], loc: m[3] }); else if (t === '.' ) inLoc = false; }
    });
  }

  /* ================= SABRE (Reserva de viaje / Trip) ================= */
  function parseSabre(L, out) {
    var m, j, baseY = null;
    if ((m = /^(\d{2}) ([A-Z]{3}) (\d{4})/.exec(L[0] ? L[0].trim() : ''))) baseY = +m[3];
    for (j = 0; j < L.length; j++) {
      var t = L[j].trim();
      if ((m = /^C[OÓ]DIGO DE RESERVACI[OÓ]N\s+([A-Z0-9]{6})/.exec(t))) out.gdsLoc = m[1];
      if ((m = /^AIRLINE RESERVATION CODE\s+(.+)$/.exec(t))) m[1].split(',').forEach(function (x) { var q = /([A-Z0-9]{5,8})\s*\(([A-Z0-9]{2})\)/.exec(x); if (q) out.airlineLocs.push({ al: q[2], loc: q[1] }); });
      if (/^PREPARADO PARA/.test(t)) {
        for (var k = j + 1; k < L.length && !/^C[OÓ]DIGO/.test(L[k].trim()); k++) { var nm = cols(L[k])[0] || ''; if (/^[A-ZÑ' \-]+\/[A-ZÑ' \-]+$/.test(nm)) out.pax.push({ name: nm, tickets: [] }); }
      }
    }
    var starts = [];
    L.forEach(function (l, i) { if ((m = /PARTIDA:\s+([A-ZÁÉÍÓÚ]+)\s+(\d{2}) ([A-Z]{3})/.exec(l))) starts.push({ i: i, d: +m[2], mo: MON3[m[3]], dow: DOWS[norm(m[1])] }); });
    starts.forEach(function (st, si) {
      var end = si + 1 < starts.length ? starts[si + 1].i : L.length, s = newSeg(), k, blk = L.slice(st.i, end);
      var y = baseY;
      if (y && dow(y, st.mo, st.d) !== st.dow && dow(y + 1, st.mo, st.d) === st.dow) y = y + 1;
      if (y && dow(y, st.mo, st.d) !== st.dow) out.issues.push('El día de la semana de la partida ' + st.d + '/' + st.mo + ' no coincide con el año ' + y + '.');
      s.depDate = y ? iso(y, st.mo, st.d) : null;
      var times = [], codes = null;
      blk.forEach(function (l, bi) {
        var t = l.trim(), c = cols(l);
        if (!codes && c.length >= 3 && /^[A-Z]{3}$/.test(c[1]) && /^[A-Z]{3}$/.test(c[2])) { codes = [c[1], c[2]]; s.alName = c[0]; }
        if (!s.al && (m = /^([A-Z0-9]{2}) (\d{1,4})\b/.exec(t))) { s.al = m[1]; s.fn = String(+m[2]); var cc = cols(l); s.from.raw = cc[1] || ''; s.to.raw = cc[2] || ''; }
        if ((m = /(\d+)\s*horas?\s*(\d+)\s*minutos?/i.exec(t))) s.durText = m[1] + 'h ' + m[2] + 'm';
        var tt = t.match(/\b\d{2}:\d{2}\b/g); if (tt && !/emission/i.test(t)) tt.forEach(function (x) { if (times.length < 2) times.push(x); });
        if (/^Cabina:/.test(c[0] || '')) { for (var q = bi + 1; q < blk.length; q++) { var w = cols(blk[q])[0] || ''; if (w && !/:$|^Terminal|^No disponible|kg CO2|^Comidas/.test(w)) { s.cabinRaw = w; s.cabin = cabinFromWord(w); break; } } }
        if (/^Estado:/.test(c[0] || '')) { for (var q2 = bi + 1; q2 < blk.length; q2++) { var w2 = cols(blk[q2])[0]; if (w2) { s.status = w2; break; } } }
        if ((m = /^Equipaje facturado:\s*(.+)$/.exec(t))) { var g = /(\d+)x(\d+)\s*kg/i.exec(m[1]); s.bagAll = { pcs: g ? +g[1] : null, kg: g ? +g[2] : null, raw: m[1] }; }
        if ((m = /^Equipaje de cabina:\s*(.+)$/.exec(t))) { var g2 = /(\d+)x(\d+)\s*kg/i.exec(m[1]); s.cabinBag = { pcs: g2 ? +g2[1] : null, kg: g2 ? +g2[2] : null, raw: m[1] }; }
        if ((m = /^»\s*(.+)$/.exec(t))) {
          var pc = cols(m[1]), name = pc[0], seat = pc[1], tk = (pc[2] || '').replace(/\D/g, '');
          if (seat && !/sin asignar/i.test(seat)) s.seats[name] = seat;
          var p = out.pax.filter(function (x) { return samePax(x.name, name); })[0];
          if (!p) { p = { name: name, tickets: [] }; out.pax.push(p); }
          if (tk && p.tickets.indexOf(tk) < 0) p.tickets.push(tk);
          s.paxOn = (s.paxOn || []).concat(name);
        }
      });
      if (codes) { s.from.code = codes[0]; s.to.code = codes[1]; }
      if (times[0]) s.depTime = hm(times[0]); if (times[1]) s.arrTime = hm(times[1]);
      if (s.bagAll) (s.paxOn || out.pax.map(function (p) { return p.name; })).forEach(function (n) { s.bags[n] = s.bagAll; });
      s.arrDateNote = 'calculada';
      if (s.al) out.segs.push(s);
    });
  }

  /* ================= GWC / Netviax (confirmación de reserva) ================= */
  function parseGWC(L, out) {
    var m, j;
    L.forEach(function (l) {
      var t = l.trim();
      if ((m = /^C[oó]digo de reserva:\s*([A-Z0-9]{5,8})/.exec(t))) out.gdsLoc = m[1];
      if ((m = /^C[oó]digo de reserva de la aerol[ií]nea:\s*(.+)$/.exec(t))) m[1].split(',').forEach(function (x) { var q = /([A-Z0-9]{5,8})\s*\(([A-Z0-9]{2})\)/.exec(x); if (q) out.airlineLocs.push({ al: q[2], loc: q[1] }); });
    });
    for (j = 0; j < L.length; j++) {
      if (/^Nombre\s{3,}Doc\. de identidad/.test(L[j].trim())) {
        for (var k = j + 1; k < L.length; k++) {
          var c = cols(L[k]); if (!c.length || /^Tramo/.test(c[0])) break;
          var tk = c.filter(function (x) { return /^\d{3}-?\d{10}$/.test(x); })[0];
          out.pax.push({ name: c[0], tickets: tk ? [tk] : [] });
        }
      }
    }
    var pending = [], brand = null;
    for (j = 0; j < L.length; j++) {
      var t = L[j].trim(), c2 = cols(L[j]);
      if (/^[A-Z][A-Z ]+$/.test(t) && !/^[A-Z]{3} \d/.test(t) && t.split(' ').length >= 2 && t.length < 40) brand = t;
      if ((m = /^(\d{1,2}) de (\w+) de (\d{4})\s{3,}(\d{1,2}) de (\w+) de (\d{4})/.exec(t))) {
        var s = newSeg();
        s.depDate = iso(+m[3], MES[norm(m[2])], +m[1]); s.arrDate = iso(+m[6], MES[norm(m[5])], +m[4]); s.arrDateNote = 'documento';
        s.fareBrand = brand;
        for (var q = j + 1; q < Math.min(L.length, j + 6); q++) {
          var mm = /^([A-Z]{3}) (\d{1,2}:\d{2})\s{3,}([A-Z]{3}) (\d{1,2}:\d{2})\s{3,}([A-Z0-9]{2}) (\d{1,4})$/.exec(L[q].trim());
          if (mm) {
            s.from.code = mm[1]; s.depTime = hm(mm[2]); s.to.code = mm[3]; s.arrTime = hm(mm[4]); s.al = mm[5]; s.fn = String(+mm[6]);
            var nm = cols(L[q + 1] || ''); s.from.raw = nm[0] || ''; s.to.raw = nm[1] || '';
            for (var r = q + 2; r < Math.min(L.length, q + 5); r++) if (/^Asiento$/.test(L[r].trim())) { var sv = (L[r + 1] || '').trim(); if (sv && sv !== '-') out.pax.forEach(function (p) { s.seats[p.name] = sv; }); }
            break;
          }
        }
        if (s.al) { out.segs.push(s); pending.push(s); }
      }
      if (/^Equipaje en bodega/.test(t)) {
        var bl = (L[j + 1] || '') + ' ' + t, g = /(\d+)\s*pieza[s]?\s*(\d+)?\s*KG?/i.exec(bl), none = /NO INCLUIDO/i.test(bl);
        pending.forEach(function (s) { out.pax.forEach(function (p) { s.bags[p.name] = none ? { pcs: 0, kg: null, raw: 'No incluido' } : { pcs: g ? +g[1] : null, kg: g && g[2] ? +g[2] : null, raw: (g ? g[0] : bl).trim() }; }); });
      }
      if (/^Equipaje de mano/.test(t)) { var h = /(\d+)\s*pieza/i.exec((L[j + 1] || '') + ' ' + t); var ni = /NO INCLUIDO/i.test(t); pending.forEach(function (s) { s.cabinBag = ni ? { pcs: 0, raw: 'No incluido' } : { pcs: h ? +h[1] : null, raw: h ? h[0] : 'Incluido' }; }); }
      if (/^Art[ií]culo personal/.test(t)) { var ap = /(\d+)\s*pieza/i.exec((L[j + 1] || '') + ' ' + t); pending.forEach(function (s) { s.personalItem = { pcs: ap ? +ap[1] : null }; }); }
      if (/^Informaci[oó]n [uú]til/.test(t)) pending = [];
    }
  }

  /* ================= SPRK / Farelogix (tabla) ================= */
  function parseSPRK(L, out, pages) {
    var m;
    L.forEach(function (l) {
      var t = l.trim();
      if ((m = /localizador de reserva\s+([A-Z0-9]{6})/i.exec(t)) && /^Itinerario/.test(t)) out.gdsLoc = m[1];
      if ((m = /^(.*?)\s*Localizador de reserva\s+([A-Z0-9]{5,8})$/.exec(t)) && !/^Itinerario/.test(t)) out.airlineLocs.push({ al: null, name: m[1], loc: m[2] });
    });
    // boletos: bloque "Información de la factura": NOMBRE ... / Billete electrónico NNN FECHA
    var issueY = null;
    for (var j = 0; j < L.length; j++) {
      var c = cols(L[j]);
      if (/^Billete electr/.test(c[0] || '') && /^\d{13}$/.test(c[1] || '')) {
        var nameLine = null; for (var k = j - 1; k >= 0 && k > j - 4; k--) { var cc = cols(L[k]); if (/\(PFA|ADT|CHD|INF\)/.test(cc[0] || '') || (cc[1] === 'Número de documento')) { nameLine = cc[0]; break; } }
        var p = out.pax.filter(function (x) { return nameLine && samePax(x.name, nameLine); })[0];
        if (!p && nameLine) { p = { name: nameLine, tickets: [] }; out.pax.push(p); }
        if (p) p.tickets.push(c[1]);
        if ((m = /(\d{2})([A-Z]{3})\.?(\d{2})/.exec(c[2] || ''))) { issueY = 2000 + +m[3]; out.issueDate = iso(issueY, MON3[m[2]], +m[1]); }
      }
    }
    // tabla por posiciones
    (pages || []).forEach(function (items) {
      var hdr = {}, ys;
      items.forEach(function (it) {
        if (it.s === 'Aeropuerto') (hdr.ap = hdr.ap || []).push(it.x);
        if (it.s === 'Fecha y Hora') (hdr.fh = hdr.fh || []).push(it.x);
        if (it.s === 'Clase') hdr.cl = it.x; if (it.s === 'Cabina') hdr.cab = it.x; if (it.s === 'Comidas') hdr.com = it.x;
        if (it.s === 'vuelo' || it.s === 'N.º de') hdr.fl = it.x;
      });
      if (!hdr.ap || hdr.ap.length < 2 || !hdr.fh || hdr.fh.length < 2) return;
      hdr.ap.sort(function (a, b) { return a - b; }); hdr.fh.sort(function (a, b) { return a - b; });
      var B = [hdr.ap[0] - 30, hdr.fh[0] - 8, (hdr.fh[0] + hdr.ap[1]) / 2, hdr.fh[1] - 8, (hdr.cl || 999) - 10, (hdr.cab || 999) - 8, (hdr.com || 999) - 8, 9999];
      function col(x) { for (var i = 0; i < B.length - 1; i++) if (x >= B[i] && x < B[i + 1]) return i; return -1; }
      var anchors = items.filter(function (it) { return /^\d{1,4}$/.test(it.s) && Math.abs(it.x - (hdr.fl || 105)) < 25; }).sort(function (a, b) { return b.y - a.y; });
      anchors.forEach(function (a, ai) {
        var s = newSeg(); s.fn = String(+a.s);
        var top = a.y + 16, bot = a.y - 16;
        var nextY = ai + 1 < anchors.length ? anchors[ai + 1].y : -1e9;
        var cell = [[], [], [], [], [], [], []];
        items.forEach(function (it) { if (it.y <= top && it.y >= bot) { var ci = col(it.x); if (ci >= 0) cell[ci].push(it); } });
        cell.forEach(function (cl) { cl.sort(function (p, q) { return q.y - p.y || p.x - q.x; }); });
        var txt = function (i) { return cell[i].map(function (x) { return x.s; }).join(' ').replace(/\s+/g, ' ').trim(); };
        s.from.raw = txt(0).replace(/Terminal:\s*\S+/, '').trim(); s.to.raw = txt(2).replace(/Terminal:\s*\S+/, '').trim();
        var t1 = /Terminal:\s*(\S+)/.exec(txt(0)); if (t1) s.depTerm = t1[1];
        var t2 = /Terminal:\s*(\S+)/.exec(txt(2)); if (t2) s.arrTerm = t2[1];
        [[1, 'dep'], [3, 'arr']].forEach(function (pp) {
          var tx = txt(pp[0]), dm = /([A-Z]{2})\.\s*(\d{2})([A-Z]{3})\./.exec(tx), tm = /(\d{1,2}:\d{2})/.exec(tx);
          if (tm) s[pp[1] + 'Time'] = hm(tm[1]);
          if (dm) {
            var mo = MON3[dm[3]], d = +dm[2], wd = DOWS[dm[1]], base = issueY || new Date().getFullYear(), y = null;
            for (var yy = base; yy <= base + 1; yy++) if (dow(yy, mo, d) === wd) { y = yy; break; }
            if (y) s[pp[1] + 'Date'] = iso(y, mo, d); else out.issues.push('No se pudo determinar el año de ' + dm[0] + ' (vuelo ' + s.fn + ').');
          }
        });
        s.rbd = txt(4) || null; var cb = txt(5); s.cabinCode = cb || null; s.cabin = CABIN_CODE[cb] || null; if (cb && !s.cabin) s.cabinRaw = cb;
        s.arrDateNote = 'documento';
        // aerolínea y pasajeros (debajo del tramo, hasta el próximo)
        var below = items.filter(function (it) { return it.y < bot && it.y > nextY + 16; });
        var alTxt = items.filter(function (it) { return it.x < (hdr.fl || 100) - 20 && it.y <= top + 10 && it.y >= bot - 45 && it.y > nextY + 16 && !/^\d+$/.test(it.s); }).sort(function (p, q) { return q.y - p.y; }).map(function (x) { return x.s; }).join(' ');
        s.alName = alTxt.replace(/\s+/g, ' ').trim();
        var code = HV.AIR && Object.keys(HV.AIR).filter(function (k) { return norm(HV.AIR[k].name) === norm(s.alName); })[0];
        if (!code && HV.AIR) { var cands = Object.keys(HV.AIR).filter(function (k) { return norm(HV.AIR[k].name).indexOf(norm(s.alName)) === 0; }); if (cands.length === 1) code = cands[0]; }
        s.al = code || null; if (!code) s.alNameOnly = true;
        below.filter(function (it) { return /\((PFA|ADT|CHD|INF)\)/.test(it.s); }).forEach(function (pi) {
          var name = pi.s, row = below.filter(function (it) { return Math.abs(it.y - pi.y) < 3; });
          var seat = row.filter(function (it) { return /Seat|Asiento|^\d{1,2}[A-K]$/.test(it.s); })[0];
          if (!out.pax.filter(function (x) { return samePax(x.name, name); }).length) out.pax.push({ name: name, tickets: [] });
          if (seat && !/No Seat|Sin asiento/i.test(seat.s)) s.seats[name] = seat.s;
        });
        out.segs.push(s);
      });
    });
  }

  /* ================= detección y armado ================= */
  function detect(L) {
    var T = L.join('\n');
    if (/CheckMyTrip|Localizador de\s+[A-Z0-9]{6}/.test(T) && /Viajero/.test(T)) return 'Amadeus';
    if (/PREPARADO PARA|AIRLINE RESERVATION CODE/.test(T)) return 'Sabre';
    if (/Datos del pasajero/.test(T) && /N° de vuelo/.test(T)) return 'GWC';
    if (/farelogix|Itinerario para localizador de reserva/i.test(T)) return 'SPRK';
    return null;
  }
  function parseTicket(inp) {
    var L = inp.lines, out = { format: detect(L), gdsLoc: null, airlineLocs: [], issueDate: null, pax: [], segs: [], issues: [] };
    if (!out.format) { out.issues.push('No se reconoció el formato del documento. Por ahora se leen boletos/itinerarios de Amadeus (CheckMyTrip), Sabre, GWC y SPRK.'); return out; }
    ({ Amadeus: parseAmadeus, Sabre: parseSabre, GWC: parseGWC, SPRK: parseSPRK })[out.format](L, out, inp.pages);
    finish(out);
    return out;
  }
  function finish(out) {
    out.pax.forEach(function (p) { p.display = titleName(p.name); });
    out.segs.forEach(function (s, i) {
      var tag = (s.al || '?') + ' ' + (s.fn || '?');
      ['from', 'to'].forEach(function (k) {
        var r = resolveAirport(s[k].raw, s[k].code); s[k].code = r.code; s[k].conf = r.conf; if (r.options) s[k].options = r.options;
        if (!r.code) out.issues.push('Vuelo ' + tag + ': no se pudo identificar el aeropuerto de ' + (k === 'from' ? 'salida' : 'llegada') + ' "' + s[k].raw + '"' + (r.options ? ' (posibles: ' + r.options.join(', ') + ')' : '') + '.');
      });
      if (!s.al) out.issues.push('Vuelo ' + (s.fn || '?') + ': no se pudo identificar el código de la aerolínea ("' + (s.alName || '') + '").');
      // fecha de llegada: si no figura, se calcula con husos y duración; si no se puede, queda pendiente
      var dm = s.durText ? durMin(s.durText) : null;
      if (!s.arrDate && s.depDate && s.depTime && s.arrTime) {
        if (dm != null && s.from.code && s.to.code && HV.AP[s.from.code] && HV.AP[s.to.code]) {
          var u0 = utcMin(s.depDate, s.depTime, s.from.code);
          for (var dd = -1; dd <= 2; dd++) { var ad = addDaysIso(s.depDate, dd), u1 = utcMin(ad, s.arrTime, s.to.code); if (u1 - u0 === dm) { s.arrDate = ad; break; } }
        }
        if (!s.arrDate) out.issues.push('Vuelo ' + tag + ': no figura la fecha de llegada y no se pudo calcular con seguridad.');
      }
      // duración: del documento o calculada; se marca si no coinciden
      s.durMin = dm;
      if (s.depDate && s.arrDate && s.from.code && s.to.code && HV.AP[s.from.code] && HV.AP[s.to.code]) {
        var calc = utcMin(s.arrDate, s.arrTime, s.to.code) - utcMin(s.depDate, s.depTime, s.from.code);
        if (dm == null) { s.durMin = calc; s.durSrc = 'calculada'; }
        else { s.durSrc = 'documento'; if (Math.abs(calc - dm) > 1) out.issues.push('Vuelo ' + tag + ': la duración del documento (' + s.durText + ') no coincide con la calculada por horarios (' + Math.floor(calc / 60) + 'h ' + (calc % 60) + 'm).'); }
      }
      if (s.depDate && s.arrDate) s.dayDiff = Math.round((Date.parse(s.arrDate) - Date.parse(s.depDate)) / 864e5);
      if (!s.cabin) out.issues.push('Vuelo ' + tag + ': la cabina no figura en el documento' + (s.fareBrand ? ' (solo la tarifa "' + s.fareBrand + '")' : '') + '.');

      if (s.status && !/confirm/i.test(s.status)) out.issues.push('Vuelo ' + tag + ': estado "' + s.status + '".');
    });
    /* Reglas de presentación (pedidas por Gonzalo):
       - la clase de reserva no se muestra;
       - el asiento de un pasajero se muestra solo si lo tiene en todos los tramos;
       - el equipaje despachado se muestra solo si figura claramente en todos los tramos; si no, no se muestra (no se inventa). */
    out.show = { seats: {}, bags: {} };
    out.pax.forEach(function (p) {
      var key = function (obj) { return Object.keys(obj).filter(function (n) { return samePax(n, p.name); })[0]; };
      out.show.seats[p.name] = out.segs.length > 0 && out.segs.every(function (s) { return key(s.seats); });
      out.show.bags[p.name] = out.segs.length > 0 && out.segs.every(function (s) { var k = key(s.bags); return k && (s.bags[k].pcs != null || s.bags[k].kg != null); });
    });
    out.pax.forEach(function (p) { if (!p.tickets.length) out.issues.push('No figura número de boleto para ' + titleName(p.name) + ' (puede ser una reserva sin emitir).'); });
    if (!out.gdsLoc) out.issues.push('No figura el localizador de la reserva.');
    if (!out.segs.length) out.issues.push('No se encontraron vuelos en el documento.');
  }
  root.TV = { parseTicket: parseTicket, resolveAirport: resolveAirport, titleName: titleName, samePax: samePax, detect: detect };
})(typeof window !== 'undefined' ? window : global);
