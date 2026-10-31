/* Ticket Vintage HV — prototipo (página independiente). Usa app.js, ticket.js y los logos, sin modificarlos. */
(function () {
  'use strict';
  var U = HV.util, PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var LOGO_HV = '__LOGOHV__', LOGO_G = (typeof PIMG !== 'undefined' && PIMG['pass-logo.png']) || LOGO_HV;
  function brand(cls) { return '<div class="brand ' + (cls || '') + '"><img src="' + LOGO_G + '" alt="Hiperviajes"><div class="slogan">EL MEJOR PRECIO PARA VIAJAR</div></div>'; }
  var CABINS = ['Economy', 'Premium Economy', 'Business', 'Primera'];
  var CAB_ES = { 'Economy': 'Económica', 'Premium Economy': 'Premium Economy', 'Business': 'Business', 'Primera': 'Primera' };
  var MESC = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  var st = { r: null, file: '', sel: {}, mode: 'joint', dest: '', photos: [], err: '' };
  if (typeof APX !== 'undefined') { Object.keys(HV.AP).forEach(function (c) { HV.AP[c].cur = true; }); Object.keys(APX).forEach(function (tz) { APX[tz].split(';').forEach(function (e) { var p = e.split('|'); if (!HV.AP[p[0]]) HV.AP[p[0]] = { c: p[1], n: p[2] || '', tz: tz }; }); }); }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loadScript(src) { return new Promise(function (ok, ko) { if (document.querySelector('script[src="' + src + '"]')) return ok(); var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.className = 'toast on'; clearTimeout(t._h); t._h = setTimeout(function () { t.className = 'toast'; }, 3200); }
  function utc(dIso, t, code) { var a = HV.AP[code]; if (!a || !dIso || !t) return null; var p = dIso.split('-').map(Number), h = t.split(':').map(Number); return Math.round(HV.toUTC({ y: p[0], m: p[1], d: p[2] }, { h: h[0], mi: h[1] }, { tz: a.tz }) / 60000); }
  function city(code) { return (HV.AP[code] && U.apCity(code)) || code || ''; }
  function fdate(dIso) { if (!dIso) return ''; var p = dIso.split('-'); return p[2] + ' ' + MESC[+p[1] - 1] + ' ' + p[0]; }
  function fdur(m) { if (m == null) return ''; var h = Math.floor(m / 60), mi = m % 60; return h + ' h' + (mi ? ' ' + mi + ' min' : ''); }
  function first(n) { return String(n || '').split(' ')[0]; }
  function listY(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }

  /* ---------- lectura del PDF ---------- */
  function getPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return loadScript(PDFJS + 'pdf.min.js').then(function () {
      var lib = window.pdfjsLib;
      return fetch(PDFJS + 'pdf.worker.min.js').then(function (r) { return r.text(); }).then(function (code) {
        lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        return lib;
      }, function () { lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; return lib; });
    });
  }
  function readPdf(file) {
    return getPdfjs().then(function (lib) {
      return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: new Uint8Array(buf) }).promise; });
    }).then(function (pdf) {
      return pdfLines(pdf).then(function (lines) {
        var pages = [], chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) (function (n) {
          chain = chain.then(function () { return pdf.getPage(n).then(function (pg) { return pg.getTextContent(); }).then(function (tc) { pages.push(tc.items.filter(function (t) { return t.str && t.str.trim(); }).map(function (t) { return { s: t.str.trim(), x: t.transform[4], y: t.transform[5] }; })); }); });
        })(i);
        return chain.then(function () { return { lines: lines, pages: pages }; });
      });
    });
  }
  function onFiles(files) {
    var f = files && files[0]; if (!f) return;
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { showErr('El archivo no es un PDF.'); return; }
    st.file = f.name; $('drop').classList.add('busy'); $('dropTxt').textContent = 'Leyendo ' + f.name + '…';
    readPdf(f).then(function (inp) {
      if (!inp.lines.filter(function (l) { return l.trim() && l !== '<<PAGE>>' && l !== '.'; }).length) throw new Error('scan');
      var r = TV.parseTicket(inp);
      if (!r.format) throw new Error('formato');
      if (!r.segs.length) throw new Error('vuelos');
      prepare(r); renderAll();
    }).catch(function (e) {
      var m = e.message === 'scan' ? 'El PDF no tiene texto seleccionable (parece una imagen escaneada). Por ahora no se puede leer.'
        : e.message === 'formato' ? 'No se reconoció el documento. Se leen boletos o itinerarios de Amadeus (CheckMyTrip), Sabre, GWC y SPRK.'
        : e.message === 'vuelos' ? 'Se reconoció el documento pero no se encontraron vuelos.'
        : 'No se pudo leer el PDF (' + e.message + ').';
      showErr(m);
    }).then(function () { $('drop').classList.remove('busy'); $('dropTxt').textContent = 'Arrastrá el PDF del boleto acá o tocá para elegirlo'; });
  }
  function showErr(m) { st.err = m; $('err').textContent = m; $('err').hidden = !m; }

  /* ---------- preparación ---------- */
  function prepare(r) {
    showErr('');
    st.r = r; st.sel = {}; st.photos = [];
    r.pax.forEach(function (p) { st.sel[p.name] = true; p.edit = p.display; p.tk = p.tickets.join(', '); });
    r.segs.forEach(function (s) { if (s.cabin == null) s.cabin = ''; });
    st.dest = guessDest(r);
    st.mode = r.pax.length > 1 ? 'joint' : 'joint';
  }
  function journeys(segs) {
    var J = [], cur = null;
    segs.forEach(function (s, i) {
      var pv = segs[i - 1], gap = null;
      if (pv) { var a = utc(pv.arrDate, pv.arrTime, pv.to.code), d = utc(s.depDate, s.depTime, s.from.code); if (a != null && d != null) gap = d - a; }
      var newJ = !pv || gap == null || gap >= 24 * 60 || city(pv.to.code) !== city(s.from.code);
      if (newJ) { cur = { segs: [], lays: [] }; J.push(cur); } else cur.lays.push({ min: gap, at: city(s.from.code), change: pv.to.code !== s.from.code });
      cur.segs.push(s);
    });
    var c0 = J.length && city(J[0].segs[0].from.code), cl = J.length && city(J[J.length - 1].segs.slice(-1)[0].to.code);
    J.forEach(function (j, i) { j.label = J.length === 1 ? 'IDA' : (i === 0 ? 'IDA' : (i === J.length - 1 && c0 === cl ? 'VUELTA' : 'TRAMO ' + (i + 1))); j.from = j.segs[0].from.code; j.to = j.segs[j.segs.length - 1].to.code; });
    return J;
  }
  function guessDest(r) {
    var J = journeys(r.segs); if (!J.length) return '';
    var c0 = city(J[0].from), last = city(J[J.length - 1].to);
    return (c0 === last ? city(J[0].to) : last).toUpperCase();
  }
  function missing() {
    var r = st.r, m = [];
    if (!r) return m;
    var P = r.pax.filter(function (p) { return st.sel[p.name]; });
    if (!P.length) m.push('Elegí al menos un pasajero.');
    P.forEach(function (p) { if (!p.edit.trim()) m.push('Falta el nombre de un pasajero.'); if (!p.tk.trim()) m.push('Falta el número de boleto de ' + (p.edit || p.display) + '.'); });
    if (!r.gdsLoc) m.push('Falta el código de reserva.');
    r.segs.forEach(function (s) {
      var tag = (s.al || '?') + ' ' + (s.fn || '?');
      if (!s.al || !s.fn) m.push('Vuelo ' + tag + ': falta aerolínea o número.');
      if (!HV.AP[s.from.code]) m.push('Vuelo ' + tag + ': aeropuerto de salida desconocido.');
      if (!HV.AP[s.to.code]) m.push('Vuelo ' + tag + ': aeropuerto de llegada desconocido.');
      if (!s.depDate || !s.depTime || !s.arrDate || !s.arrTime) m.push('Vuelo ' + tag + ': faltan fecha u hora.');
      else { var d = utc(s.arrDate, s.arrTime, s.to.code) - utc(s.depDate, s.depTime, s.from.code); if (!(d > 0)) m.push('Vuelo ' + tag + ': la llegada es anterior a la salida.'); }
      if (!s.cabin) m.push('Vuelo ' + tag + ': falta la cabina.');
    });
    if (!st.dest.trim()) m.push('Falta el destino.');
    return m;
  }
  function segDur(s) { var a = utc(s.depDate, s.depTime, s.from.code), b = utc(s.arrDate, s.arrTime, s.to.code); return a != null && b != null ? b - a : s.durMin; }
  function keyOf(obj, name) { return Object.keys(obj || {}).filter(function (n) { return TV.samePax(n, name); })[0]; }
  function showSeats(p) { return st.r.segs.every(function (s) { return keyOf(s.seats, p.name); }); }
  function showBags(p) { return st.r.segs.every(function (s) { var k = keyOf(s.bags, p.name); return k && (s.bags[k].pcs != null || s.bags[k].kg != null); }); }
  function bagTxt(b) { if (!b) return ''; if (b.pcs === 0) return 'Sin equipaje|despachado'; var t = b.pcs != null ? b.pcs + (b.pcs === 1 ? ' pieza' : ' piezas') : ''; if (b.kg) t += (t ? ' de ' : '') + b.kg + ' kg'; return t + '|en bodega'; }

  /* ---------- diseño ---------- */
  function wideLogo(code, h) {
    var W = typeof WIDE_LOGOS !== 'undefined' ? WIDE_LOGOS : {}, P = typeof PIMG !== 'undefined' ? PIMG : {};
    if (W[code] && P[W[code][0]]) return '<img class="al-w" src="' + P[W[code][0]] + '" style="height:' + h + 'px" alt="">';
    var sq = typeof LOGOS !== 'undefined' && LOGOS[code];
    var a = U.alInfo(code);
    return (sq ? '<img class="al-s" src="' + sq + '" alt="">' : '') + '<span class="al-n">' + esc(a.name) + '</span>';
  }
  function stamp(dest) {
    var txt = esc(dest || 'DESTINO');
    return '<svg class="stamp" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="ct" d="M100,100 m-70,0 a70,70 0 1,1 140,0"/><path id="cb" d="M100,100 m-80,0 a80,80 0 0,0 160,0"/></defs>' +
      '<g fill="none" stroke="#5E7FB5" stroke-width="2.2" opacity=".85"><circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="58" stroke-dasharray="3 4"/></g>' +
      '<text font-family="Oswald,Arial" font-size="19" letter-spacing="6" fill="#5E7FB5"><textPath href="#ct" startOffset="50%" text-anchor="middle">DESTINO</textPath></text>' +
      '<text font-family="Oswald,Arial" font-size="' + (txt.length > 14 ? 15 : 18) + '" letter-spacing="2.5" fill="#5E7FB5"><textPath href="#cb" startOffset="50%" text-anchor="middle">' + txt + '</textPath></text>' +
      '<g transform="translate(100 100) rotate(-35) scale(2.2) translate(-12 -12)"><path fill="#5E7FB5" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></g>' +
      '<g stroke="#5E7FB5" stroke-width="2" fill="none" opacity=".6"><path d="M-60 70 q15 -8 30 0 t30 0 t30 0"/><path d="M-60 85 q15 -8 30 0 t30 0 t30 0"/><path d="M-60 100 q15 -8 30 0 t30 0 t30 0"/></g></svg>';
  }
  var PLANE = '<svg viewBox="0 0 24 24" class="pl"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)"/></svg>';
  function docHTML(P) {
    var r = st.r, J = journeys(r.segs), many = P.length > 1;
    var tickets = P.map(function (p) { return { n: p.edit, t: p.tk }; });
    var seatOk = P.every(showSeats), bagOk = P.every(showBags);
    var locAl = r.airlineLocs.filter(function (a) { return a.loc && a.loc !== r.gdsLoc; });
    var h = '<div class="tv-doc">';
    // encabezado
    h += '<div class="card head"><div class="h-top"><div class="h-logo">' + brand() + '</div>' +
      '<div class="h-cell"><div class="lab">' + (many ? 'PASAJEROS' : (/a$/i.test(first(P[0].edit)) ? 'PASAJERA' : 'PASAJERO')) + '</div><div class="big pax">' + P.map(function (p) { return esc(p.edit.toUpperCase()); }).join('<br>') + '</div></div>' +
      '<div class="h-cell"><div class="lab">DESTINO ' + PLANE + '</div><div class="big dest">' + esc(st.dest) + '</div></div></div>' +
      '<div class="h-bot"><div class="h-cell"><div class="lab">CÓDIGO DE RESERVA</div><div class="mid">' + esc(r.gdsLoc) + '</div>' + (locAl.length ? '<div class="sm">' + locAl.map(function (a) { return esc((a.al || a.name) + ' ' + a.loc); }).join(' · ') + '</div>' : '') + '</div>' +
      '<div class="h-cell"><div class="lab">' + (tickets.length > 1 || /,/.test(tickets[0].t) ? 'Nº DE BILLETES' : 'Nº DE BILLETE') + '</div>' + tickets.map(function (t) { return '<div class="mid tk">' + esc(t.t) + (many ? ' <span class="sm">' + esc(first(t.n)) + '</span>' : '') + '</div>'; }).join('') + '</div></div>' +
      stamp(st.dest) + '</div>';
    // tramos
    var ph = st.photos.filter(Boolean), perJ = ph.length >= 2 && J.length === 2;
    h += '<div class="trips' + (ph.length && !perJ ? ' with-photo' : '') + '"><div class="trip-col">';
    J.forEach(function (j, ji) {
      var d0 = j.segs[0].depDate.split('-');
      h += '<div class="card trip' + (perJ ? ' has-ph' : '') + '"><div class="stub"><div class="stub-in">' + PLANE + '<div class="stub-l' + (j.label.length > 6 ? ' sm-l' : '') + '">' + esc(j.label) + '</div><div class="stub-d">' + d0[2] + ' ' + MESC[+d0[1] - 1] + '<br>' + d0[0] + '</div></div></div><div class="segs">';
      j.segs.forEach(function (s, si) {
        if (si) { var L = j.lays[si - 1]; h += '<div class="lay">Conexión en ' + esc(L.at) + ' · ' + fdur(L.min) + (L.change ? ' · cambio de aeropuerto' : '') + '</div>'; }
        var seats = seatOk ? P.map(function (p) { return (many ? '<span class="sn">' + esc(first(p.edit)) + '</span> ' : '') + esc(s.seats[keyOf(s.seats, p.name)]); }).join('<br>') : '';
        var bag = bagOk ? bagTxt(s.bags[keyOf(s.bags, P[0].name)]).split('|') : null;
        var sameBag = bagOk && P.every(function (p) { var a = s.bags[keyOf(s.bags, p.name)], b = s.bags[keyOf(s.bags, P[0].name)]; return a.pcs === b.pcs && a.kg === b.kg; });
        h += '<div class="seg"><div class="seg-top"><div class="al">' + wideLogo(s.al, 30) + '</div><div class="fn">' + esc(s.al + ' ' + s.fn) + (s.opBy && !new RegExp(s.opBy.split(' ')[0], 'i').test(U.alInfo(s.al).name) ? '<div class="op">Operado por ' + esc(s.opBy) + '</div>' : '') + '</div>' +
          '<div class="info"><div class="lab2">CABINA</div><div class="v">' + esc(CAB_ES[s.cabin] || s.cabin) + '</div></div>' +
          (bagOk ? '<div class="info"><div class="lab2">EQUIPAJE</div><div class="v">' + (sameBag ? esc(bag[0]) + '<div class="v2">' + esc(bag[1]) + '</div>' : P.map(function (p) { return esc(first(p.edit)) + ': ' + esc(bagTxt(s.bags[keyOf(s.bags, p.name)]).split('|')[0]); }).join('<br>')) + '</div></div>' : '') +
          (seatOk ? '<div class="info"><div class="lab2">' + (many ? 'ASIENTOS' : 'ASIENTO') + '</div><div class="v">' + seats + '</div></div>' : '') + '</div>' +
          '<div class="seg-route"><div class="pt"><div class="code">' + esc(s.from.code) + '</div><div class="cty">' + esc(city(s.from.code).toUpperCase()) + '</div><div class="dt">' + fdate(s.depDate) + '</div><div class="tm">' + esc(s.depTime) + '</div></div>' +
          '<div class="mid-pl"><span class="dots"></span>' + PLANE + '<span class="dots"></span></div>' +
          '<div class="pt"><div class="code">' + esc(s.to.code) + '</div><div class="cty">' + esc(city(s.to.code).toUpperCase()) + '</div><div class="dt">' + fdate(s.arrDate) + '</div><div class="tm">' + esc(s.arrTime) + '</div></div>' +
          '<div class="dur"><svg viewBox="0 0 24 24" class="clk"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/></svg><div class="lab2">DURACIÓN</div><div class="v">' + fdur(segDur(s)) + '</div></div></div></div>';
      });
      h += '</div>' + (perJ ? '<div class="ph" style="background-image:url(' + ph[ji] + ')"></div>' : '') + '</div>';
    });
    h += '</div>' + (ph.length && !perJ ? '<div class="ph-col" style="background-image:url(' + ph[0] + ')"></div>' : '') + '</div>';
    // pie
    var names = P.map(function (p) { return first(p.edit); });
    h += '<div class="card foot"><div class="f-pl">' + PLANE + '</div><div class="f-msg">¡Muy buen viaje, ' + esc(listY(names)) + '!</div><div class="f-txt">' + (many ? 'Recuerden que cuentan' : 'Recordá que contás') + ' con nuestro respaldo antes, durante y después del viaje.</div><div class="f-logo">' + brand('sm') + '</div></div>';
    h += '<div class="note">Horarios locales de cada ciudad.</div></div>';
    return h;
  }
  function docs() {
    var P = st.r.pax.filter(function (p) { return st.sel[p.name]; });
    return st.mode === 'indiv' ? P.map(function (p) { return [p]; }) : [P];
  }

  /* ---------- revisión ---------- */
  function reviewHTML() {
    var r = st.r, h = '';
    h += '<div class="rv-sec"><div class="rv-h">Documento leído</div><div class="rv-meta">' + esc(st.file) + ' · formato <b>' + esc(r.format) + '</b></div></div>';
    h += '<div class="rv-sec"><div class="rv-h">Reserva</div><label>Código de reserva<input data-f="gds" value="' + esc(r.gdsLoc || '') + '"></label>' +
      (r.airlineLocs.length ? '<div class="rv-meta">Localizador de aerolínea: ' + r.airlineLocs.map(function (a) { return esc((a.al || a.name) + ' ' + a.loc); }).join(' · ') + '</div>' : '') +
      '<label>Destino (sello y encabezado)<input data-f="dest" value="' + esc(st.dest) + '"></label></div>';
    h += '<div class="rv-sec"><div class="rv-h">Pasajeros</div>';
    r.pax.forEach(function (p, i) {
      h += '<div class="rv-pax"><label class="chk"><input type="checkbox" data-sel="' + i + '"' + (st.sel[p.name] ? ' checked' : '') + '> Incluir</label><label>Nombre<input data-pn="' + i + '" value="' + esc(p.edit) + '"></label><label>Boleto(s)<input data-pt="' + i + '" value="' + esc(p.tk) + '"' + (p.tk ? '' : ' class="miss" placeholder="No figura en el PDF"') + '></label>' +
        '<div class="rv-meta">Asiento: ' + (showSeats(p) ? 'se muestra' : 'no se muestra (no está en todos los tramos)') + ' · Equipaje: ' + (showBags(p) ? 'se muestra' : 'no se muestra (no figura claro en todos los tramos)') + '</div></div>';
    });
    if (r.pax.length > 1) h += '<div class="seg-ctl" role="group"><button type="button" data-mode="joint"' + (st.mode === 'joint' ? ' aria-pressed="true"' : '') + '>Un documento conjunto</button><button type="button" data-mode="indiv"' + (st.mode === 'indiv' ? ' aria-pressed="true"' : '') + '>Uno por pasajero</button></div>';
    h += '</div><div class="rv-sec"><div class="rv-h">Vuelos</div>';
    r.segs.forEach(function (s, i) {
      var ap = function (o, k) { var ok = HV.AP[o.code]; return '<label class="w3">' + (k === 'from' ? 'Desde' : 'Hasta') + '<input data-s="' + i + '" data-k="' + k + '" value="' + esc(o.code || '') + '" maxlength="3"' + (ok ? '' : ' class="miss"') + '></label>'; };
      h += '<div class="rv-seg"><div class="rv-seg-h">' + esc((s.al || '?') + ' ' + (s.fn || '')) + ' <span>' + esc(city(s.from.code)) + ' → ' + esc(city(s.to.code)) + '</span>' + ((s.from.conf === 'media' || s.to.conf === 'media') ? ' <em>revisá el aeropuerto</em>' : '') + '</div>' +
        '<div class="rv-row"><label class="w3">Aerolínea<input data-s="' + i + '" data-k="al" value="' + esc(s.al || '') + '" maxlength="2"></label><label class="w4">Vuelo<input data-s="' + i + '" data-k="fn" value="' + esc(s.fn || '') + '"></label>' + ap(s.from, 'from') + ap(s.to, 'to') +
        '<label class="w6">Cabina<select data-s="' + i + '" data-k="cabin"' + (s.cabin ? '' : ' class="miss"') + '><option value="">— Completar —</option>' + CABINS.map(function (c) { return '<option value="' + c + '"' + (s.cabin === c ? ' selected' : '') + '>' + CAB_ES[c] + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="rv-row"><label class="w5">Sale<input type="date" data-s="' + i + '" data-k="depDate" value="' + esc(s.depDate || '') + '"></label><label class="w3">Hora<input type="time" data-s="' + i + '" data-k="depTime" value="' + esc(s.depTime || '') + '"></label></div><div class="rv-row"><label class="w5">Llega<input type="date" data-s="' + i + '" data-k="arrDate" value="' + esc(s.arrDate || '') + '"></label><label class="w3">Hora<input type="time" data-s="' + i + '" data-k="arrTime" value="' + esc(s.arrTime || '') + '"></label></div>' +
        (s.fareBrand && !s.cabin ? '<div class="rv-meta">El documento solo indica la tarifa "' + esc(s.fareBrand) + '": elegí la cabina.</div>' : '') + '</div>';
    });
    h += '</div><div class="rv-sec"><div class="rv-h">Foto del destino <span class="opt">opcional</span></div><div class="rv-meta">Una foto se muestra al costado de todos los vuelos; dos fotos (ida y vuelta) van una por tramo.</div>' +
      '<label class="file">Elegir foto(s)<input type="file" id="ph" accept="image/*" multiple></label>' + (st.photos.length ? ' <button type="button" class="lnk" id="phClr">Quitar fotos</button>' : '') + '</div>';
    return h;
  }
  function renderAll() {
    $('start').hidden = !!st.r; $('work').hidden = !st.r;
    if (!st.r) return;
    $('review').innerHTML = reviewHTML();
    renderPreview();
  }
  function renderPreview() {
    var m = missing();
    $('issues').innerHTML = m.length ? '<b>Para generar el documento falta completar:</b><ul>' + m.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
    $('issues').hidden = !m.length;
    ['dlpng', 'dlpdf'].forEach(function (id) { $(id).disabled = !!m.length; });
    var D = docs();
    $('preview').innerHTML = D.length ? D.map(function (P, i) { return '<div class="pv-wrap"><div class="pv" data-i="' + i + '">' + docHTML(P) + '</div></div>'; }).join('') : '';
    fitPreview();
  }
  function fitPreview() {
    [].forEach.call(document.querySelectorAll('.pv-wrap'), function (w) {
      var d = w.querySelector('.tv-doc'); if (!d) return;
      var sc = Math.min(1, (w.clientWidth - 2) / 1100); d.style.transform = 'scale(' + sc + ')'; w.style.height = Math.ceil(d.offsetHeight * sc) + 'px';
    });
  }
  function bind() {
    var rv = $('review');
    rv.addEventListener('input', function (e) {
      var t = e.target, r = st.r, i;
      if (t.dataset.f === 'gds') r.gdsLoc = t.value.trim().toUpperCase();
      else if (t.dataset.f === 'dest') st.dest = t.value.toUpperCase();
      else if (t.dataset.pn != null) r.pax[+t.dataset.pn].edit = t.value;
      else if (t.dataset.pt != null) r.pax[+t.dataset.pt].tk = t.value;
      else if (t.dataset.s != null) {
        var s = r.segs[+t.dataset.s], k = t.dataset.k, v = t.value;
        if (k === 'from' || k === 'to') { s[k].code = v.trim().toUpperCase(); s[k].conf = HV.AP[s[k].code] ? 'manual' : 'nula'; }
        else if (k === 'al') s.al = v.trim().toUpperCase(); else s[k] = v;
      } else return;
      clearTimeout(bind._t); bind._t = setTimeout(renderPreview, 250);
    });
    rv.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.sel != null) { st.sel[st.r.pax[+t.dataset.sel].name] = t.checked; renderPreview(); }
      if (t.dataset.k === 'cabin' || t.dataset.s != null) { renderAll(); }
      if (t.id === 'ph') {
        var fs = [].slice.call(t.files || [], 0, 2);
        Promise.all(fs.map(function (f) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(f); }); })).then(function (a) { st.photos = a; renderAll(); });
      }
    });
    rv.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode) { st.mode = b.dataset.mode; renderAll(); }
      if (b.id === 'phClr') { st.photos = []; renderAll(); }
    });
    var dp = $('drop'), fi = $('file');
    dp.addEventListener('click', function () { fi.click(); });
    dp.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
    fi.addEventListener('change', function () { onFiles(fi.files); fi.value = ''; });
    ['dragover', 'dragenter'].forEach(function (ev) { dp.addEventListener(ev, function (e) { e.preventDefault(); dp.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dp.addEventListener(ev, function (e) { e.preventDefault(); dp.classList.remove('over'); }); });
    dp.addEventListener('drop', function (e) { onFiles(e.dataTransfer.files); });
    $('again').onclick = function () { st.r = null; renderAll(); };
    $('dlpng').onclick = function () { exportDocs('png', this); };
    $('dlpdf').onclick = function () { exportDocs('pdf', this); };
    window.addEventListener('resize', fitPreview);
  }

  /* ---------- exportación ---------- */
  function capture(i) {
    return loadScript(H2C).then(function () { return document.fonts ? document.fonts.ready : null; }).then(function () {
      var host = $('cap'); host.innerHTML = docHTML(docs()[i]);
      var el = host.querySelector('.tv-doc');
      inlineSvgs(el);
      var imgs = el.querySelectorAll('img');
      return Promise.all([].map.call(imgs, function (im) { return im.complete ? 0 : new Promise(function (r) { im.onload = im.onerror = r; }); })).then(function () {
        return window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 1300 });
      }).then(function (cv) { host.innerHTML = ''; return cv; });
    });
  }
  /* html2canvas no dibuja bien SVG con estilos de CSS ni texto curvo: se convierten a imágenes con los estilos escritos */
  function inlineSvgs(root) {
    [].forEach.call(root.querySelectorAll('svg'), function (sv) {
      var r = sv.getBoundingClientRect(); if (!r.width) return;
      var cl = sv.cloneNode(true), src = [sv].concat([].slice.call(sv.querySelectorAll('*'))), dst = [cl].concat([].slice.call(cl.querySelectorAll('*')));
      src.forEach(function (n, i) {
        var cs = getComputedStyle(n), d = dst[i];
        ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'letter-spacing'].forEach(function (p) { var v = cs.getPropertyValue(p); if (v && !(p === 'font-family' && n.tagName !== 'text')) d.setAttribute(p, v); });
      });
      var tr = getComputedStyle(sv).transform;
      cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', r.width); cl.setAttribute('height', r.height); cl.removeAttribute('class'); cl.removeAttribute('style');
      var im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl));
      im.className = sv.getAttribute('class') || ''; im.style.cssText = 'width:' + (sv.getAttribute('class') === 'stamp' ? 190 : r.width) + 'px;height:' + (sv.getAttribute('class') === 'stamp' ? 190 : r.height) + 'px;fill:none;stroke:none';
      sv.parentNode.replaceChild(im, sv);
    });
  }
  function fname(i, ext) {
    var D = docs(), P = D[i], who = st.mode === 'indiv' ? P[0].edit : (P.length > 1 ? P.length + ' pasajeros' : P[0].edit);
    return ('Boleto Hiperviajes - ' + st.dest + ' - ' + who).replace(/[\\\/:*?"<>|]/g, '') + '.' + ext;
  }
  function save(blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
  }
  function exportDocs(kind, btn) {
    if (missing().length) return;
    var lab = btn.textContent; btn.disabled = true; btn.textContent = 'Generando…';
    var n = docs().length, chain = Promise.resolve(), pdf = null;
    var done = function (ok) { btn.disabled = false; btn.textContent = lab; if (ok) toast(kind === 'pdf' ? 'PDF listo.' : (n > 1 ? n + ' imágenes listas.' : 'Imagen lista.')); };
    (kind === 'pdf' ? loadScript(JSPDF) : Promise.resolve()).then(function () {
      for (var i = 0; i < n; i++) (function (i) {
        chain = chain.then(function () { return capture(i); }).then(function (cv) {
          if (kind === 'png') return new Promise(function (ok) { cv.toBlob(function (b) { save(b, fname(i, 'png')); setTimeout(ok, 400); }, 'image/png'); });
          var w = cv.width / 2, h = cv.height / 2, J = window.jspdf.jsPDF;
          if (!pdf) pdf = new J({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
          else pdf.addPage([w, h], w > h ? 'landscape' : 'portrait');
          pdf.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h);
        });
      })(i);
      return chain.then(function () { if (pdf) { var all = st.r.pax.filter(function (p) { return st.sel[p.name]; }); save(pdf.output('blob'), ('Boleto Hiperviajes - ' + st.dest + ' - ' + (all.length > 1 ? all.length + ' pasajeros' : all[0].edit)).replace(/[\\\/:*?"<>|]/g, '') + '.pdf'); } });
    }).then(function () { done(true); }, function (e) { done(false); toast('No se pudo generar: ' + e.message); });
  }

  function view() {
    document.getElementById('root').innerHTML =
      '<header class="top"><div class="top-in"><img src="' + LOGO_G + '" alt="Hiperviajes" class="top-logo"><div><h1>Ticket Vintage</h1><p>Convertí el PDF del boleto en un itinerario para el pasajero.</p></div><span class="proto">Prototipo</span></div></header>' +
      '<main class="wrap"><section id="start"><div id="drop" class="drop" tabindex="0" role="button" aria-label="Elegir PDF del boleto"><svg viewBox="0 0 24 24" class="up"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/></svg><div id="dropTxt">Arrastrá el PDF del boleto acá o tocá para elegirlo</div><div class="drop-sub">Amadeus (CheckMyTrip), Sabre, GWC o SPRK. El archivo se lee en tu navegador: no se sube a ningún lado.</div></div><input type="file" id="file" accept="application/pdf,.pdf" hidden><div id="err" class="err" hidden></div></section>' +
      '<section id="work" hidden><div class="work"><aside class="panel"><div class="panel-h"><h2>Revisá los datos</h2><button type="button" class="lnk" id="again">Cargar otro PDF</button></div><div id="review"></div></aside>' +
      '<div class="stage"><div class="bar"><div id="issues" class="issues" hidden></div><div class="btns"><button type="button" class="btn pri" id="dlpng">Descargar imagen</button><button type="button" class="btn" id="dlpdf">Descargar PDF</button></div></div><div id="preview"></div></div></div></section></main>' +
      '<div id="cap" class="cap" aria-hidden="true"></div><div id="toast" class="toast" role="status"></div>';
    bind(); renderAll();
  }
  view();
  window.__TVST = st;
})();
