/* ===== DataPax · interfaz ===== */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // Reservas: cada una con su código, fechas de ida y vuelta, y si ya tiene los nombres cargados (estado 'existe')
  var ST = { pax: [], gds: 'A', docsComp: false, titF: 'MRS', codpais: '598', hechos: {}, cargados: {}, grupos: [{ id: 1, loc: '', ida: '', vuelta: '', estado: 'nueva', pnr: false }] };
  var uid = 1, gid = 2, LIENZOS = {}, ultimo = null;
  var CONF = ['gds', 'docsComp', 'titF', 'codpais'];
  try { var g = JSON.parse(localStorage.getItem('hv-pax-conf') || '{}'); CONF.forEach(function (k) { if (g[k] !== undefined) ST[k] = g[k]; }); } catch (e) { }
  function guardarConf() { try { var o = {}; CONF.forEach(function (k) { o[k] = ST[k]; }); localStorage.setItem('hv-pax-conf', JSON.stringify(o)); } catch (e) { } }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iso(d) { return d ? d.y + '-' + (d.m < 10 ? '0' : '') + d.m + '-' + (d.d < 10 ? '0' : '') + d.d : ''; }
  function deDmy(s) {
    s = String(s || '').trim(); if (!s) return null;
    var m = /^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4}|\d{2})$/.exec(s), f = null;
    if (m) f = { d: +m[1], m: +m[2], y: +m[3] };
    else { var r = TEXTO.fechas(TEXTO.N(s), 'nac'); if (r.length && r[0].i === 0 && r[0].l >= s.replace(/\s+$/, '').length - 1) f = { d: r[0].d, m: r[0].m, y: r[0].y }; }
    if (!f) return null;
    if (f.y < 100) f.y += 2000;
    var t = new Date(f.y, f.m - 1, f.d);
    return t.getFullYear() === f.y && t.getMonth() === f.m - 1 && t.getDate() === f.d ? f : null;
  }
  // Máscara de fecha: pone las barras solas mientras se escribe (05101962 → 05/10/1962).
  // Acepta separadores escritos a mano (5/10/62, 5-10-1962) y no actúa con texto (05NOV86) ni al borrar.
  function mascaraFecha(el, ev) {
    var v = el.value, alFinal = el.selectionStart === v.length;
    if (!alFinal) return;
    if (/[^\d\/\-. ]/.test(v)) {   // con letras (05NOV86) no se enmascara; se saca la barra que se puso sola
      var sl = v.replace(/^(\d{1,2})\/(?=[A-Za-z])/, '$1');
      if (sl !== v) { el.value = sl; try { el.setSelectionRange(sl.length, sl.length); } catch (e) { } }
      return;
    }
    var borrando = ev && /^delete/.test(ev.inputType || '');
    var segs = v.replace(/[\-. ]/g, '/').split('/'), dig = '';
    segs.forEach(function (sg, k) { if (k < segs.length - 1 && k < 2 && sg.length === 1) sg = '0' + sg; dig += sg; });
    dig = dig.replace(/\D/g, '').slice(0, 8);
    var out = dig.slice(0, 2);
    if (dig.length > 2) out += '/' + dig.slice(2, 4);
    if (dig.length > 4) out += '/' + dig.slice(4, 8);
    if (!borrando && (dig.length === 2 || dig.length === 4)) out += '/';
    if (out !== v) { el.value = out; try { el.setSelectionRange(out.length, out.length); } catch (e) { } }
  }
  function cifras(v) { return String(v || '').replace(/\D/g, '').length; }
  function deIso(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function dmy(d) { return d ? (d.d < 10 ? '0' : '') + d.d + '/' + (d.m < 10 ? '0' : '') + d.m + '/' + d.y : ''; }
  function fecha(d) { return d ? new Date(d.y, d.m - 1, d.d) : null; }
  function grupo(id) { return ST.grupos.filter(function (g) { return g.id === +id; })[0] || ST.grupos[0]; }
  function grupoDe(p) { return grupo(p && p.grupo); }
  function nuevoGrupo(o) { var g = { id: gid++, loc: '', ida: '', vuelta: '', estado: 'nueva', pnr: false }; for (var k in o) g[k] = o[k]; ST.grupos.push(g); return g; }
  // Reserva para pasajeros nuevos que no vienen de un PNR: la primera que no salió de un PNR (o una nueva)
  function grupoPorDefecto() { return ST.grupos.filter(function (g) { return !g.pnr; })[0] || nuevoGrupo(); }
  function etiquetaG(g) { var k = ST.grupos.indexOf(g) + 1; return 'Reserva ' + (g.loc || k); }
  function refGrupo(g) { var f = deDmy(g && g.ida); return f ? fecha(f) : new Date(); }
  function refViaje(p) { return refGrupo(grupoDe(p)); }
  function conFecha(p) { return !!deDmy(grupoDe(p).ida); }
  // Saca reservas vacías (salvo que quede una sola) y ubica a los pasajeros sin reserva válida
  function ordenarGrupos() {
    ST.pax.forEach(function (p) { if (!ST.grupos.some(function (g) { return g.id === p.grupo; })) p.grupo = grupoPorDefecto().id; });
    var con = ST.grupos.filter(function (g) { return ST.pax.some(function (p) { return p.grupo === g.id; }); });
    ST.grupos = con.length ? con : [ST.grupos[0]];
  }
  function L(s) { return TEXTO.limpiaNombre(s || ''); }
  function paisNom(a3) { return a3 && PAISES[a3] ? PAISES[a3][1] : ''; }
  function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('on'); }, 1800); }
  function copiar(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(function () { return viejo(t); });
    return Promise.resolve(viejo(t));
    function viejo(x) { var a = document.createElement('textarea'); a.value = x; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) { } a.remove(); }
  }

  // ---------- pasajeros desde cada fuente ----------
  function nuevo(o) {
    var p = { id: uid++, grupo: 0, apellidos: '', nombres: '', sexo: '', sexoNombre: '', sexoDuda: '', nac: null, nacionalidad: '', ppNum: '', ppEmisor: '', ppVenc: null, ciNum: '', ciEmisor: '', ciVenc: null, docUsar: '', email: '', tel: '', tituloManual: '', tipoManual: '', numManual: '', infanteDe: 0, fuentes: [], avisosF: [], ocultos: {}, verificado: null, fotos: [] };
    for (var k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') p[k] = o[k];
    if (!p.grupo) p.grupo = grupoPorDefecto().id;
    return p;
  }
  function desdeMRZ(r, fuente) {
    var av = [];
    var mal = []; if (!r.checks.numero) mal.push('número'); if (!r.checks.nacimiento) mal.push('fecha de nacimiento'); if (!r.checks.vencimiento) mal.push('vencimiento');
    if (r.checks.general === false && !mal.length) mal.push('control general');
    if (mal.length) av.push({ t: 'No cerró el dígito verificador de: ' + mal.join(', ') + '. Compará con el documento.', k: 'err' });
    if (r.truncado) av.push({ t: 'El nombre está cortado en la MRZ: completalo como figura arriba en el documento.', k: 'warn' });
    if (r.sexo === 'X' || !r.sexo) av.push({ t: 'El documento no indica sexo M/F: elegilo a mano.', k: 'warn' });
    var o = { apellidos: L(r.apellidos), nombres: L(r.nombres), sexo: r.sexo === 'M' || r.sexo === 'F' ? r.sexo : '', nac: r.nacimiento, nacionalidad: r.nacionalidad, verificado: r.verificado, fuentes: [fuente], avisosF: av };
    if (r.esPasaporte) {
      o.ppNum = r.numero; o.ppEmisor = r.emisor; o.ppVenc = r.vencimiento; o.docUsar = 'PP';
      if (r.emisor === 'URY') { var ci = ciEn(r.opcional); if (ci) { o.ciNum = ci; o.ciEmisor = 'URY'; } }
    } else {
      o.ciEmisor = r.emisor; o.ciVenc = r.vencimiento; o.docUsar = 'NI';
      var c = r.emisor === 'URY' ? ciEn(r.numero + ' ' + r.opcional) : '';
      o.ciNum = c || r.numero;
      if (r.emisor === 'URY' && !c) av.push({ t: 'Verificá que el número sea el de la cédula (sin puntos ni guión).', k: 'warn' });
    }
    return nuevo(o);
  }
  function ciEn(t) {
    var ds = String(t || '').match(/\d{7,8}/g) || [];
    for (var i = 0; i < ds.length; i++) if (TEXTO.ciValida(ds[i])) return ds[i];
    return '';
  }
  function desdeTexto(t, fuente) {
    var av = (t.avisos || []).map(function (a) { return { t: a, k: 'warn' }; });
    var o = { apellidos: t.apellidos || '', nombres: t.nombres || '', sexo: t.sexo === 'M' || t.sexo === 'F' ? t.sexo : '', nac: t.nacimiento ? { y: t.nacimiento.y, m: t.nacimiento.m, d: t.nacimiento.d } : null, nacionalidad: t.nacionalidad || '', email: t.email || '', tel: t.telefono || '', fuentes: [fuente], avisosF: av };
    if (!t.sexo && o.nombres) deducirSexo(o);
    var venc = t.vencimiento ? { y: t.vencimiento.y, m: t.vencimiento.m, d: t.vencimiento.d } : null;
    if (t.pasaporte) {
      o.ppNum = t.pasaporte; o.ppVenc = venc; o.docUsar = 'PP';
      o.ppEmisor = t.nacionalidad || (ST.codpais === '598' ? 'URY' : '');
      if (!t.nacionalidad && o.ppEmisor) av.push({ t: 'Se tomó el pasaporte como uruguayo (no se indicó el país): verificalo.', k: 'warn' });
    }
    if (t.ci) { o.ciNum = t.ci; o.ciEmisor = t.nacionalidad || 'URY'; if (!t.pasaporte) { o.docUsar = 'NI'; o.ciVenc = venc; } }
    return nuevo(o);
  }
  // Sexo según el nombre de pila (los nombres de ambos sexos quedan sin asignar)
  function deducirSexo(p) {
    var r = TEXTO.sexoPorNombre(p.nombres);
    p.sexo = r.sexo; p.sexoNombre = r.sexo ? r.nombre : ''; p.sexoDuda = r.unisex ? r.nombre : '';
  }
  function mismaPersona(a, b) {
    if (a.ppNum && b.ppNum) return a.ppNum === b.ppNum;
    if (a.ciNum && b.ciNum && a.ciNum === b.ciNum) return true;
    var A1 = L(a.apellidos), B1 = L(b.apellidos);
    if (!A1 || !B1) return false;
    var na = L(a.nombres).split(' ')[0], nb = L(b.nombres).split(' ')[0];
    var apOk = A1 === B1 || A1.indexOf(B1 + ' ') === 0 || B1.indexOf(A1 + ' ') === 0;
    var nOk = na && nb && (na === nb || na.indexOf(nb) === 0 || nb.indexOf(na) === 0);
    var fOk = !a.nac || !b.nac || iso(a.nac) === iso(b.nac);
    return apOk && nOk && fOk;
  }
  function fusionar(n) {
    var tieneId = n.apellidos || n.nombres || n.ppNum || n.ciNum;
    if (!tieneId && (n.email || n.tel)) {
      var sin = ST.pax.filter(function (p) { return !p.email && !p.tel; });
      var d = ST.pax.length === 1 ? ST.pax[0] : (sin.length === 1 ? sin[0] : null);
      if (d) { if (!d.email) d.email = n.email; if (!d.tel) d.tel = n.tel; d.fuentes = d.fuentes.concat(n.fuentes); ultimo = d.id; return d; }
      return null;
    }
    var e = ST.pax.filter(function (p) { return mismaPersona(p, n); })[0];
    if (!e) { ST.pax.push(n); ultimo = n.id; return n; }
    var mrz = n.verificado !== null && n.verificado !== undefined;
    if (n.sexo && !n.sexoNombre && e.sexoNombre) { e.sexo = ''; e.sexoNombre = ''; }
    if (!e.sexo && n.sexo) { e.sexoNombre = n.sexoNombre; e.sexoDuda = ''; }
    else if (!e.sexo && !n.sexo && n.sexoDuda) e.sexoDuda = n.sexoDuda;
    ['sexo', 'nac', 'nacionalidad', 'ppNum', 'ppEmisor', 'ppVenc', 'ciNum', 'ciEmisor', 'ciVenc', 'docUsar', 'email', 'tel'].forEach(function (k) {
      if (n[k] && (!e[k] || (mrz && /^(sexo|nac|ppNum|ppEmisor|ppVenc|ciVenc)$/.test(k)))) e[k] = n[k];
    });
    // nombres: el más completo (la MRZ puede venir cortada)
    if (L(n.apellidos).length > L(e.apellidos).length) e.apellidos = n.apellidos;
    if (L(n.nombres).length > L(e.nombres).length) e.nombres = n.nombres;
    if (mrz) e.verificado = n.verificado;
    e.fuentes = e.fuentes.concat(n.fuentes);
    e.avisosF = e.avisosF.concat(n.avisosF.filter(function (a) { return !/nombres y cuáles apellidos/.test(a.t) || !mrz; }));
    if (mrz) e.avisosF = e.avisosF.filter(function (a) { return !/nombres y cuáles apellidos|como uruguayo/.test(a.t); });
    e.fotos = e.fotos.concat(n.fotos);
    ultimo = e.id; return e;
  }

  // ---------- avisos dinámicos ----------
  // ---------- validez del documento ----------
  function hoy0() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function sumarMeses(d, n) { // suma meses sin desbordar (31/08 + 6 meses = 28/02 o 29/02)
    var r = new Date(d.getFullYear(), d.getMonth() + n, 1), ult = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(d.getDate(), ult)); return r;
  }
  function mesesEntre(a, b) { var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) m--; return m; }
  function plazo(a, b) {
    var m = mesesEntre(a, b);
    if (m < 1) { var d = Math.round((b - a) / 864e5); return d === 1 ? '1 día' : d + ' días'; }
    if (m < 12) return m === 1 ? '1 mes' : m + ' meses';
    var y = Math.floor(m / 12), r = m % 12;
    return (y === 1 ? '1 año' : y + ' años') + (r ? ' y ' + (r === 1 ? '1 mes' : r + ' meses') : '');
  }
  // nivel: vencido · antesViaje · menos6 (alerta fuerte) · menos18 (aviso tenue) · ok · sin (no hay fecha)
  function validez(p) {
    var uso = p.docUsar === 'NI' || (!p.ppNum && p.ciNum) ? 'NI' : 'PP';
    var v = uso === 'NI' ? p.ciVenc : p.ppVenc, doc = uso === 'NI' ? 'la cédula' : 'el pasaporte';
    var hayDoc = uso === 'NI' ? !!p.ciNum : !!p.ppNum;
    if (!v) return { nivel: hayDoc ? 'sin' : '', doc: doc };
    var g = grupoDe(p), viaje = deDmy(g.ida), vu = deDmy(g.vuelta), h = hoy0(), ref = viaje ? fecha(viaje) : h, fv = fecha(v);
    if (ref < h) ref = h;
    var vuelta = vu ? fecha(vu) : null; if (vuelta && vuelta < ref) vuelta = null;
    var r = { v: v, fv: fv, ref: ref, viaje: !!viaje, vuelta: vuelta, doc: doc };
    if (fv < h) r.nivel = 'vencido';
    else if (fv < ref) r.nivel = 'antesViaje';
    else if (vuelta && fv < vuelta) r.nivel = 'durante';
    else if (fv < sumarMeses(ref, 6)) r.nivel = 'menos6';
    else if (vuelta && fv < sumarMeses(vuelta, 6)) r.nivel = 'menos6Vuelta';
    else if (!vuelta && fv < sumarMeses(ref, 18)) r.nivel = 'menos18';
    else r.nivel = 'ok';
    r.plazo = fv >= ref ? plazo(ref, fv) : '';
    if (vuelta && fv >= vuelta) r.plazoV = plazo(vuelta, fv);
    return r;
  }
  function avisoValidez(p) {
    var r = validez(p), d = r.v ? dmy(r.v) : '', Doc = r.doc.charAt(0).toUpperCase() + r.doc.slice(1);
    switch (r.nivel) {
      case 'vencido': return { t: '⚠ DOCUMENTO VENCIDO: ' + r.doc + ' venció el ' + d + '. No sirve para viajar.', k: 'fuerte' };
      case 'antesViaje': return { t: '⚠ VENCE ANTES DEL VIAJE: ' + r.doc + ' vence el ' + d + '.', k: 'fuerte' };
      case 'durante': return { t: '⚠ VENCE DURANTE EL VIAJE: ' + r.doc + ' vence el ' + d + ', antes de la vuelta (' + dmy({ y: r.vuelta.getFullYear(), m: r.vuelta.getMonth() + 1, d: r.vuelta.getDate() }) + ').', k: 'fuerte' };
      case 'menos6Vuelta': return { t: Doc + ' vence el ' + d + ': a la vuelta le quedan ' + r.plazoV + '. Algunos países piden 6 meses de validez también a la salida: verificá los requisitos del destino.', k: 'warn' };
      case 'menos6': return { t: '⚠ VENCE EN MENOS DE 6 MESES: ' + r.doc + ' vence el ' + d + ' (' + (r.viaje ? 'a ' + r.plazo + ' de la fecha del viaje' : 'en ' + r.plazo) + '). Muchos destinos y aerolíneas exigen 6 meses de validez al ingresar.', k: 'fuerte' };
      case 'menos18': return { t: Doc + ' vence el ' + d + ' (' + (r.viaje ? 'le quedan ' + r.plazo + ' al viajar' : 'en ' + r.plazo) + '). ' + (r.viaje ? 'Verificá que a la fecha de regreso le sigan quedando 6 meses.' : 'Si el viaje es dentro de varios meses, verificá que a esa fecha le sigan quedando 6 meses de validez.'), k: 'tenue' };
      case 'sin': return { t: 'Sin fecha de vencimiento del documento: no se puede controlar la validez.', k: 'tenue' };
    }
    return null;
  }
  function etiquetaValidez(p) {
    var r = validez(p);
    if (r.nivel === 'vencido') return '<span class="tag venc">⚠ Documento vencido</span>';
    if (r.nivel === 'antesViaje') return '<span class="tag venc">⚠ Vence antes del viaje</span>';
    if (r.nivel === 'durante') return '<span class="tag venc">⚠ Vence durante el viaje</span>';
    if (r.nivel === 'menos6Vuelta') return '<span class="tag tenue">A la vuelta le quedan ' + r.plazoV + '</span>';
    if (r.nivel === 'menos6') return '<span class="tag venc">⚠ ' + (r.viaje ? 'Al viajar le quedan ' + r.plazo : 'Vence en ' + r.plazo) + '</span>';
    if (r.nivel === 'menos18') return '<span class="tag tenue">' + (r.viaje ? 'Al viajar le quedan ' + r.plazo : 'Vence en ' + r.plazo) + '</span>';
    return '';
  }

  function avisos(p, info) {
    var a = p.avisosF.filter(function (x, i) { return !p.ocultos[i]; }).map(function (x) { return { t: x.t, k: x.k, i: p.avisosF.indexOf(x) }; });
    var tipo = info ? info.tipo : 'ADT';
    var av = avisoValidez(p); if (av) a.unshift(av);
    if (!L(p.apellidos)) a.push({ t: 'Falta el apellido.', k: 'err' });
    if (!L(p.nombres)) a.push({ t: 'Falta el nombre.', k: 'err' });
    if (!p.sexo) a.push({ t: p.sexoDuda ? 'Falta el sexo: ' + p.sexoDuda + ' es nombre de varón y de mujer, elegí M o F.' : 'Falta el sexo (M/F) para el DOCS.', k: 'err' });
    if (!p.nac) a.push({ t: 'Falta la fecha de nacimiento para el DOCS.', k: 'err' });
    if (p.ciNum && (p.ciEmisor || 'URY') === 'URY' && /^\d{7,8}$/.test(p.ciNum) && !TEXTO.ciValida(p.ciNum)) a.push({ t: 'El dígito verificador de la cédula no coincide: revisá el número.', k: 'err' });
    if (!p.ppNum && !p.ciNum) a.push({ t: 'Sin documento: no se arma el FOID.', k: 'warn' });
    if (tipo === 'INF' && info && !info.adulto) a.push({ t: 'El infante necesita un adulto con quien viajar: cargá al adulto y elegilo en «Adulto al que está asociado en la reserva».', k: 'err' });
    if (tipo === 'INF' && info && info.adulto && !p.infanteDe) a.push(grupoDe(p).estado === 'existe'
      ? { t: 'Elegí a qué adulto está asociado el infante en la reserva: hasta entonces no se arma su DOCS.', k: 'err' }
      : { t: 'Se asoció a ' + nombreDe(info.adulto).trim() + '. Si en la reserva va con otro adulto, cambialo en «Adulto al que está asociado en la reserva».', k: 'warn' });
    // cumple 2 años cerca del viaje: deja de ser infante
    if (p.nac && !p.tipoManual && tipo === 'INF') {
      var dos = new Date(p.nac.y + 2, p.nac.m - 1, p.nac.d), ref = refViaje(p), dias = Math.round((dos - ref) / 864e5), vu = deDmy(grupoDe(p).vuelta);
      if (tipo === 'INF' && !conFecha(p)) a.push({ t: 'Es infante calculando con la fecha de hoy: cumple 2 años el ' + dmy({ y: dos.getFullYear(), m: dos.getMonth() + 1, d: dos.getDate() }) + '. Si viaja desde ese día, va como niño con asiento.', k: 'warn', fv: 1 });
      else if (tipo === 'INF' && vu) { if (dos <= fecha(vu)) a.push({ t: 'Cumple 2 años el ' + dmy({ y: dos.getFullYear(), m: dos.getMonth() + 1, d: dos.getDate() }) + ', durante el viaje: en la vuelta (' + dmy(vu) + ') ya no viaja como infante.', k: 'warn' }); }
      else if (tipo === 'INF' && dias <= 90) a.push({ t: 'Cumple 2 años el ' + dmy({ y: dos.getFullYear(), m: dos.getMonth() + 1, d: dos.getDate() }) + ', ' + dias + (dias === 1 ? ' día' : ' días') + ' después de la ida: si la vuelta es desde esa fecha, en el regreso ya no viaja como infante.', k: 'warn' });
    }
    if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email.trim())) a.push({ t: 'El mail no parece válido.', k: 'warn' });
    return a;
  }

  // ---------- comandos ----------
  function limpios() {
    return ST.pax.map(function (p) {
      var c = {}; for (var k in p) c[k] = p[k];
      c.apellidos = L(p.apellidos); c.nombres = L(p.nombres);
      c.ppNum = String(p.ppNum || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      c.ciNum = String(p.ciNum || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      c.tel = String(p.tel || '').replace(/\D/g, '');
      c.email = String(p.email || '').trim();
      return c;
    });
  }
  var ULT = null, GR = {};
  function calcular() {
    ordenarGrupos();
    var info = {}, todos = limpios(), orden = [], avs = []; GR = {};
    ST.grupos.forEach(function (g) {
      var ps = todos.filter(function (p) { return p.grupo === g.id; }); if (!ps.length) return;
      var u = CMD.generar(ps, { gds: ST.gds, docsCompleto: ST.docsComp, tituloF: ST.titF, fechaViaje: refGrupo(g), contactoTodos: true, infanteConfirmar: g.estado === 'existe' });
      GR[g.id] = u; orden = orden.concat(u.orden); avs = avs.concat(u.avisos);
      u.orden.forEach(function (x) { info[x.p.id] = { n: x.n, nS: x.nS, tipo: x.tipo, edad: x.edad, tit: x.tit, adulto: x.adulto ? x.adulto.p.id : 0, grupo: g.id }; });
    });
    ULT = { orden: orden, avisos: avs };
    return info;
  }
  function numTxt(i) { return ST.gds === 'S' ? (i.nS || i.n + '.1') : 'P' + i.n; }
  // Límites por entrada de cada GDS (ajustables acá). Amadeus: una línea por comando.
  // Sabre: los comandos van en una sola entrada, encadenados con § (el separador cuenta como caracter).
  var LIMITE = {
    A: { gds: 'Amadeus', lineas: 24, chars: 260, sep: '\n' },
    S: { gds: 'Sabre', lineas: 0, chars: 250, sep: '§' }
  };
  var SECS2 = [['docs', 'DOCS'], ['foid', 'FOID'], ['ctc', 'Contactos (CTCE · CTCM)']];
  function nombreDe(id) { var p = ST.pax.filter(function (x) { return x.id === id; })[0]; return p ? (L(p.nombres).split(' ')[0] || '') + ' ' + (L(p.apellidos).split(' ')[0] || '') : ''; }
  // Arma tandas que entran en una sola entrada del GDS (los separadores también cuentan)
  function tandas(ls) {
    var lim = LIMITE[ST.gds];
    if (!lim) return ls.length ? [ls] : [];
    var out = [], cur = [], n = 0, sl = lim.sep.length;
    ls.forEach(function (l) {
      var add = l.t.length + (cur.length ? sl : 0);
      if (cur.length && ((lim.lineas && cur.length + 1 > lim.lineas) || n + add > lim.chars)) { out.push(cur); cur = []; n = 0; add = l.t.length; }
      cur.push(l); n += add;
    });
    if (cur.length) out.push(cur);
    return out;
  }
  function chars(ls) { var lim = LIMITE[ST.gds] || { sep: '\n' }; return ls.map(function (l) { return l.t; }).join(lim.sep).length; }
  function hecho(g, t) { return !!ST.hechos[g + '|' + t]; }
  function lineaHtml(l, g) {
    var hh = hecho(g, l.t);
    return '<button type="button" class="ln' + (hh ? ' hecho' : '') + '" data-g="' + g + '" data-t="' + esc(l.t) + '"><span>' + esc(l.t) + '</span>' + (l.nota ? '<span class="nota">' + esc(l.nota) + '</span>' : '') + '<span class="cp">' + (hh ? '✓ copiado' : 'copiar') + '</span></button>';
  }
  function faltaHtml(l) { return '<div class="ln falta">Falta ' + esc(l.falta) + (l.id ? ' · ' + esc(nombreDe(l.id)) : '') + '</div>'; }
  var TANDAS = {};
  function bloqueTandas(clave, ls, etiqueta, g) {
    var ts = tandas(ls), h = '', lim = LIMITE[ST.gds], S = ST.gds === 'S';
    var unidad = S ? ['comando', 'comandos'] : ['línea', 'líneas'];
    if (ts.length > 1) h += '<div class="aviso-tanda">Son ' + ls.length + ' ' + unidad[1] + ' y ' + chars(ls) + ' caracteres. ' + lim.gds + ' admite hasta '
      + (lim.lineas ? lim.lineas + ' líneas y ' : '') + lim.chars + ' caracteres por entrada: pegá <b>' + ts.length + ' tandas</b> por separado, en orden.</div>';
    ts.forEach(function (t, k) {
      var id = clave + k; TANDAS[id] = { g: g, ls: t.map(function (l) { return l.t; }) };
      var hecha = t.every(function (l) { return hecho(g, l.t); }), c = chars(t);
      h += '<div class="tanda' + (hecha ? ' hecha' : '') + '"><div class="tandah"><span>' + (ts.length > 1 ? '<b>Tanda ' + (k + 1) + ' de ' + ts.length + '</b> · ' : '')
        + t.length + ' ' + unidad[t.length === 1 ? 0 : 1] + ' · ' + c + ' caracteres' + (S && t.length > 1 ? ' · encadenados con §' : '')
        + (c > lim.chars ? ' · <b class="exc">supera el límite de ' + lim.chars + '</b>' : '') + '</span>'
        + '<button type="button" class="' + (hecha ? 's' : 'p') + ' sm" data-tanda="' + id + '">' + (hecha ? '✓ Copiada' : (ts.length > 1 ? 'Copiar tanda ' + (k + 1) : 'Copiar ' + etiqueta)) + '</button></div>';
      var sec = '';
      t.forEach(function (l) { if (l.sec && l.sec !== sec) { sec = l.sec; h += '<div class="seclbl">' + esc(sec) + '</div>'; } h += lineaHtml(l, g); });
      if (S && t.length > 1) h += '<div class="entrada" title="Así se copia: una sola entrada">' + esc(t.map(function (l) { return l.t; }).join('§')) + '</div>';
      h += '</div>';
    });
    return h;
  }
  function renderOut() {
    $('outT').textContent = 'Comandos para ' + (ST.gds === 'S' ? 'Sabre' : 'Amadeus');
    var o = $('out');
    if (!ST.pax.length) { o.innerHTML = '<p class="hint">Los comandos aparecen acá a medida que cargás pasajeros.</p>'; return; }
    TANDAS = {};
    var gs = ST.grupos.filter(function (g) { return GR[g.id]; }), multi = gs.length > 1;
    o.innerHTML = gs.map(function (g) { return bloqueGrupo(g, GR[g.id], multi); }).join('');
  }
  // Comandos de una reserva: vencimientos, paso 1 (nombres, si la reserva es nueva) y paso 2 (DOCS, FOID y contactos)
  function bloqueGrupo(g, U, multi) {
    var A = ST.gds !== 'S', ps = ST.pax.filter(function (p) { return p.grupo === g.id; }), fuertes = [], tenues = [], h = '';
    ps.forEach(function (p) {
      var r = validez(p), nom = (L(p.apellidos) || '—') + ' / ' + (L(p.nombres).split(' ')[0] || '');
      if (/vencido|antesViaje|durante|menos6$/.test(r.nivel)) fuertes.push(esc(nom) + ' — ' + (r.nivel === 'vencido' ? 'VENCIDO desde el ' + dmy(r.v) : r.nivel === 'antesViaje' ? 'vence antes del viaje (' + dmy(r.v) + ')' : r.nivel === 'durante' ? 'vence durante el viaje (' + dmy(r.v) + ')' : 'vence el ' + dmy(r.v) + ', ' + (r.viaje ? 'a ' + r.plazo + ' del viaje' : 'en ' + r.plazo)));
      else if (r.nivel === 'menos18' || r.nivel === 'menos6Vuelta') tenues.push(r.nivel);
    });
    h += '<section class="gout" data-g="' + g.id + '">';
    if (multi) h += '<div class="gouth"><b>' + esc(etiquetaG(g)) + '</b><span>' + ps.length + (ps.length === 1 ? ' pasajero' : ' pasajeros') + (g.ida ? ' · ida ' + g.ida.slice(0, 5) : '') + (g.vuelta ? ' · vuelta ' + g.vuelta.slice(0, 5) : '') + '</span></div>';
    if (fuertes.length) h += '<div class="alerta-venc"><b>⚠ ' + (fuertes.length === 1 ? 'Documento vencido o con menos de 6 meses de validez' : fuertes.length + ' documentos vencidos o con menos de 6 meses de validez') + '</b><ul>' + fuertes.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    if (tenues.length) h += '<p class="aviso-tenue">' + (tenues.indexOf('menos6Vuelta') >= 0 ? (tenues.length === 1 ? '1 documento queda' : tenues.length + ' documentos quedan') + ' con menos de 6 meses de validez a la vuelta: verificá los requisitos del destino.' : (tenues.length === 1 ? '1 documento vence' : tenues.length + ' documentos vencen') + (g.ida ? ' dentro de los 18 meses posteriores al viaje: cargá la vuelta para saber si a esa fecha le quedan 6 meses.' : ' dentro de los próximos 18 meses: cargá la fecha del viaje para saber si alcanza.')) + '</p>';
    if (g.pnr) h += '<p class="nota-gds">Reserva leída del PNR' + (g.loc ? ' <b>' + esc(g.loc) + '</b>' : '') + ': los nombres ya están cargados y los ' + (A ? '<b>/P</b>' : 'números <b>-1.1, -2.1…</b>') + ' son los de la reserva.</p>';
    else h += '<div class="preg"><span>¿' + (multi ? 'Esta reserva' : 'La reserva') + ' ya tiene los nombres cargados?</span><div class="seg seg-sm"><button type="button" data-r="nueva" data-g="' + g.id + '" class="' + (g.estado === 'nueva' ? 'on' : '') + '">No, es nueva</button><button type="button" data-r="existe" data-g="' + g.id + '" class="' + (g.estado === 'existe' ? 'on' : '') + '">Sí, ya están</button></div></div>';
    // ---- paso 1: nombres ----
    var nom = U.secciones.nombres;
    var pend = g.estado === 'existe' ? [] : nom.filter(function (l) { return !l.id || !ST.cargados[l.id]; });
    var pendOk = pend.filter(function (l) { return l.t; }), pendFalta = pend.filter(function (l) { return !l.t; });
    var nCarg = ps.filter(function (p) { return ST.cargados[p.id]; }).length;
    if (g.estado === 'nueva') {
      h += '<div class="paso' + (pend.length ? '' : ' listo') + '"><div class="pasoh"><span class="pn">1</span><b>Cargar los nombres</b>';
      if (!pend.length) h += '<span class="ok">✓ ' + nCarg + (nCarg === 1 ? ' nombre cargado' : ' nombres cargados') + '</span><button type="button" class="lnk" data-nomvolver="' + g.id + '">volver a mostrarlos</button></div></div>';
      else {
        h += '</div><p class="hint" style="margin:0 0 8px">' + (A ? 'Primero se crean los pasajeros: sin los nombres en la reserva, Amadeus no acepta los DOCS asociados a cada /P. Los nombres nunca se mezclan con otros comandos.' : 'Primero se crean los pasajeros: sin los nombres en la reserva, Sabre no acepta los datos asociados a cada pasajero (-1.1, -2.1…). Los nombres nunca se encadenan con otros comandos.') + '</p>';
        h += bloqueTandas('n' + g.id + '_', pendOk.map(function (l) { return { t: l.t, nota: l.nota, id: l.id }; }), 'los nombres', g.id);
        h += pendFalta.map(faltaHtml).join('');
        if (pendOk.length) h += '<button type="button" class="p listo-btn" data-nomlistos="' + g.id + '">Listo, los nombres ya están en la reserva →</button>';
        h += '</div>';
      }
    } else if (!g.pnr) {
      h += '<p class="nota-gds">' + (A ? 'Los <b>/P1, /P2…</b> siguen el orden alfabético por apellido que usa Amadeus. Verificá con RT que coincidan y, si no, corregí el N.º en la tarjeta del pasajero (o pegá el PNR).' : 'Los números <b>-1.1, -2.1…</b> tienen que coincidir con los de la reserva: verificalos y, si no, corregí el N.º en la tarjeta del pasajero (o pegá el PNR).') + '</p>';
    }
    // ---- paso 2: DOCS, FOID y contactos ----
    var bloqueado = g.estado === 'nueva' && pend.length > 0;
    h += '<div class="paso' + (bloqueado ? ' bloq' : '') + '"><div class="pasoh"><span class="pn">' + (g.estado === 'nueva' ? '2' : '1') + '</span><b>DOCS, FOID y contactos</b></div>';
    if (bloqueado) h += '<p class="hint" style="margin:0">Se habilita cuando confirmes que los nombres ya están en la reserva.</p>';
    else {
      var ls = [], faltan = [];
      SECS2.forEach(function (sx) { U.secciones[sx[0]].forEach(function (l) { if (l.t) ls.push({ t: l.t, nota: l.nota, id: l.id, sec: sx[1] }); else faltan.push(l); }); });
      if (ls.length) h += bloqueTandas('d' + g.id + '_', ls, 'todo', g.id);
      h += faltan.map(faltaHtml).join('');
    }
    h += '</div>';
    if (U.avisos.length) h += U.avisos.map(function (a) { return '<div class="ln falta">' + esc(a) + '</div>'; }).join('');
    return h + '</section>';
  }

  // ---------- tarjetas ----------
  var DOCS_OPC = '<datalist id="paises">' + Object.keys(PAISES).filter(function (k) { return k.length === 3 && !/^GB[DNOPS]$/.test(k); }).map(function (k) { return '<option value="' + k + '">' + esc(PAISES[k][1]) + '</option>'; }).join('') + '</datalist>';
  // Encabezado de cada reserva: código, ida y vuelta (con ellas se calculan edades y validez de los documentos)
  function cabGrupo(g, n, multi) {
    var h = '<div class="grupoh"><div class="gt"><b>' + esc(multi || g.loc ? etiquetaG(g) : 'Reserva') + '</b><span class="cnt">' + n + (n === 1 ? ' pasajero' : ' pasajeros') + '</span>' + (g.pnr ? '<span class="tag ok">PNR leído</span>' : '') + '</div>';
    h += '<div class="gf"><label>Código<input data-gf="loc" value="' + esc(g.loc) + '" placeholder="opcional" maxlength="6" autocomplete="off" spellcheck="false"></label>';
    h += '<label>Ida<input data-gf="ida" value="' + esc(g.ida) + '" placeholder="dd/mm/aaaa" inputmode="numeric" maxlength="11" autocomplete="off"></label>';
    h += '<label>Vuelta<input data-gf="vuelta" value="' + esc(g.vuelta) + '" placeholder="dd/mm/aaaa" inputmode="numeric" maxlength="11" autocomplete="off"></label></div>';
    if (!g.ida) h += '<div class="small">Sin fecha de ida, las edades y la validez de los documentos se calculan con la fecha de hoy.</div>';
    return h + '</div>';
  }
  function tarjeta(p, info) {
    var i = info[p.id] || { tipo: 'ADT', n: '' }, S = ST.gds === 'S';
    var uso = p.docUsar === 'NI' || (!p.ppNum && p.ciNum) ? 'NI' : 'PP';
    var adultos = ST.pax.filter(function (q) { return q.id !== p.id && q.grupo === p.grupo && info[q.id] && info[q.id].tipo === 'ADT'; });
    var h = '<article class="pax" data-id="' + p.id + '">';
    h += '<div class="ph" data-meta></div><ul class="avisos arriba" data-venc></ul>';
    h += '<div class="pgrid">';
    h += '<div class="nomrow"><div><label>Apellidos</label><input class="nm" data-f="apellidos" value="' + esc(p.apellidos) + '" autocomplete="off" spellcheck="false"></div>';
    h += '<div class="mover"><button type="button" data-mv="an" tabindex="-1" title="Pasar el primer apellido a nombres">◀</button><button type="button" data-mv="na" tabindex="-1" title="Pasar el último nombre a apellidos">▶</button></div>';
    h += '<div><label>Nombres</label><input class="nm" data-f="nombres" value="' + esc(p.nombres) + '" autocomplete="off" spellcheck="false"></div></div>';
    h += '<div class="c3"><label>Sexo</label><div class="sx' + (p.sexo ? '' : ' falta') + '"><button type="button" data-sx="M" title="Masculino (tecla M)" tabindex="' + (p.sexo === 'F' ? -1 : 0) + '" class="' + (p.sexo === 'M' ? 'on' : '') + '">M</button><button type="button" data-sx="F" title="Femenino (tecla F)" tabindex="' + (p.sexo === 'F' ? 0 : -1) + '" class="' + (p.sexo === 'F' ? 'on' : '') + '">F</button></div><div class="small" data-sxn></div></div>';
    h += '<div class="c4"><label>Nacimiento</label><input data-f="nac" data-fecha="nac" value="' + dmy(p.nac) + '" placeholder="dd/mm/aaaa" inputmode="numeric" autocomplete="off" maxlength="11"><div class="small" data-edad></div></div>';
    h += '<div class="c5"><label>Nacionalidad</label><input data-f="nacionalidad" list="paises" value="' + esc(p.nacionalidad) + '" maxlength="3" autocomplete="off"><div class="small">' + esc(paisNom(p.nacionalidad)) + '</div></div>';
    if (i.tipo === 'INF') {
      var nAd = function (q) { return info[q.id] && info[q.id].n ? numTxt(info[q.id]) + ' · ' : ''; };
      var auto = !p.infanteDe && i.adulto ? porId(i.adulto) : null, falta = !p.infanteDe && (grupoDe(p).estado === 'existe' || !auto);
      h += '<div class="c12 infbox' + (falta ? ' falta' : '') + '"><div class="ih"><b>Infante</b><span>menos de 2 años al viajar · va en brazos de un adulto · no lleva FOID · DOCS con ' + (p.sexo === 'F' ? 'FI' : p.sexo === 'M' ? 'MI' : 'MI / FI') + ' y la ' + (S ? 'asociación' : '/P') + ' del adulto</span></div>';
      h += '<label for="inf' + p.id + '">Adulto al que está asociado en la reserva</label><select id="inf' + p.id + '" data-f="infanteDe"><option value="">' + (auto ? 'Automático: ' + esc(nAd(auto) + L(auto.nombres).split(' ')[0] + ' ' + L(auto.apellidos)) : 'Elegí el adulto…') + '</option>' + adultos.map(function (q) { return '<option value="' + q.id + '"' + (+p.infanteDe === q.id ? ' selected' : '') + '>' + esc(nAd(q) + L(q.nombres).split(' ')[0] + ' ' + L(q.apellidos)) + '</option>'; }).join('') + '</select>';
      h += '<div class="small">Si los nombres ya están en la reserva, elegí el mismo adulto que tiene al infante en el ' + (S ? 'PNR' : 'PNR (RT)') + '. Sin adulto asociado, Amadeus y Sabre no aceptan el DOCS del infante.</div></div>';
    }
    h += '<div class="c3"><label>Documento</label><select data-f="docUsar"><option value="PP"' + (uso === 'PP' ? ' selected' : '') + '>Pasaporte</option><option value="NI"' + (uso === 'NI' ? ' selected' : '') + '>Cédula / DNI</option></select></div>';
    var num = uso === 'NI' ? p.ciNum : p.ppNum, em = uso === 'NI' ? p.ciEmisor : p.ppEmisor, ve = uso === 'NI' ? p.ciVenc : p.ppVenc;
    h += '<div class="c3"><label>Número</label><input data-f="' + (uso === 'NI' ? 'ciNum' : 'ppNum') + '" value="' + esc(num) + '" autocomplete="off" spellcheck="false" style="text-transform:uppercase"></div>';
    h += '<div class="c2"><label title="País que emitió el documento">Emisor</label><input data-f="' + (uso === 'NI' ? 'ciEmisor' : 'ppEmisor') + '" list="paises" value="' + esc(em) + '" maxlength="3" autocomplete="off"></div>';
    h += '<div class="c4"><label>Vencimiento</label><input data-f="' + (uso === 'NI' ? 'ciVenc' : 'ppVenc') + '" data-fecha="venc" value="' + dmy(ve) + '" placeholder="dd/mm/aaaa" inputmode="numeric" autocomplete="off" maxlength="11"></div>';
    h += '<div class="c6"><label>Mail</label><input type="email" data-f="email" value="' + esc(p.email) + '" autocomplete="off" spellcheck="false"></div>';
    h += '<div class="c6"><label>Celular</label><input type="tel" data-f="tel" value="' + esc(p.tel) + '" autocomplete="off" placeholder="598…"></div>';
    h += '<div class="c3"><label>Reserva</label><select data-f="grupo">' + ST.grupos.map(function (g) { return '<option value="' + g.id + '"' + (g.id === p.grupo ? ' selected' : '') + '>' + esc(etiquetaG(g)) + '</option>'; }).join('') + '<option value="nueva">+ Nueva reserva</option></select></div>';
    h += '<div class="c3"><label>Tipo</label><select data-f="tipoManual"><option value="">Automático</option><option value="ADT"' + (p.tipoManual === 'ADT' ? ' selected' : '') + '>Adulto</option><option value="CHD"' + (p.tipoManual === 'CHD' ? ' selected' : '') + '>Niño (2 a 11)</option><option value="INF"' + (p.tipoManual === 'INF' ? ' selected' : '') + '>Infante (menos de 2)</option></select></div>';
    h += '<div class="c3"><label>Título</label><select data-f="tituloManual"><option value="">Automático</option>' + ['MR', 'MRS', 'MS', 'MSTR', 'MISS'].map(function (t) { return '<option' + (p.tituloManual === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>';
    if (i.tipo !== 'INF') h += '<div class="c3"><label>N.º en la reserva</label><input data-f="numManual" value="' + esc(p.numManual) + '" inputmode="decimal" maxlength="4" placeholder="auto"' + (p.numPNR ? ' title="Tomado del PNR ' + esc(p.numPNR) + '"' : '') + '></div>';
    h += '</div><ul class="avisos" data-av></ul>';
    if (p.fotos.length) {
      h += '<div class="thumbs">';
      p.fotos.forEach(function (f, k) {
        if (f.mrz) h += '<img class="mz" src="' + f.mrz + '" alt="Zona leída" data-ver="' + k + '" title="Lo que se leyó (ampliar)">';
        else if (f.foto) h += '<img src="' + f.foto + '" alt="Documento" data-ver="' + k + '" title="Ver el documento">';
        if (f.lienzo) h += '<button type="button" class="s" tabindex="-1" data-rel="' + f.lienzo + '">Marcar la zona a mano</button>';
      });
      h += '</div>';
    }
    return h + '</article>';
  }
  function meta(p, info) {
    var art = document.querySelector('.pax[data-id="' + p.id + '"]'); if (!art) return;
    var i = info[p.id] || { tipo: 'ADT' }, S = ST.gds === 'S';
    var num = i.tipo === 'INF' ? (i.adulto ? 'INF · con ' + numTxt(i) : 'INF') : numTxt(i);
    var tipoTxt = { ADT: 'Adulto', CHD: 'Niño', INF: 'Infante' }[i.tipo];
    var src = p.fuentes.filter(function (f, k, a) { return a.indexOf(f) === k; }).join(' · ');
    var ver = p.verificado === true ? '<span class="tag ok">✓ Documento leído y verificado</span>' : (p.verificado === false ? '<span class="tag warn">Leído con dudas</span>' : '');
    art.querySelector('[data-meta]').innerHTML = '<span class="num">' + num + '</span><span class="who">' + esc((L(p.apellidos) || '—') + ' / ' + (L(p.nombres) || '—')) + '</span><span class="tag">' + tipoTxt + (i.tit ? ' · ' + i.tit : '') + '</span>' + etiquetaValidez(p) + ver + (src ? '<span class="tag" title="Origen de los datos">' + esc(src) + '</span>' : '') + '<button type="button" class="s del" tabindex="-1" data-del="' + p.id + '" title="Quitar pasajero">Quitar</button>';
    var e = art.querySelector('[data-edad]'); if (e) e.textContent = i.edad !== null && i.edad !== undefined ? i.edad + (i.edad === 1 ? ' año' : ' años') + (conFecha(p) ? ' al viajar' : ' hoy') : '';
    var sx = art.querySelector('.sx'); if (sx) sx.classList.toggle('falta', !p.sexo);
    var sxn = art.querySelector('[data-sxn]'); if (sxn) { sxn.textContent = p.sexo && p.sexoNombre ? 'Según el nombre' : (!p.sexo && p.sexoDuda ? 'Nombre de ambos sexos' : ''); sxn.title = p.sexoNombre ? 'Deducido de ' + p.sexoNombre + ': si no corresponde, tocá la otra letra' : ''; }
    var todos = avisos(p, i), arriba = todos.filter(function (a) { return a.k === 'fuerte'; });
    var cv = art.querySelector('[data-venc]'); if (cv) cv.innerHTML = arriba.map(function (a) { return '<li class="fuerte">' + esc(a.t) + '</li>'; }).join('');
    art.querySelector('[data-av]').innerHTML = todos.filter(function (a) { return a.k !== 'fuerte'; }).map(function (a) { return '<li class="' + ({ err: 'err', ok: 'ok', fuerte: 'fuerte', tenue: 'tenue' }[a.k] || '') + '">' + esc(a.t) + (a.fv ? ' <button type="button" class="lnk" tabindex="-1" data-irfv>Cargar la fecha del viaje</button>' : '') + (a.i !== undefined ? ' <button type="button" class="lnk" tabindex="-1" data-oc="' + a.i + '" title="Ocultar este aviso">ocultar</button>' : '') + '</li>'; }).join('');
  }
  function render(todo) {
    var info = calcular();
    if (todo) {
      var c = $('paxs');
      if (!ST.pax.length) c.innerHTML = '<div class="vacio"><b>Todavía no hay pasajeros.</b><br>Cargá la foto o el PDF del pasaporte, o pegá los datos en texto.<br><button type="button" class="s agregar" data-add tabindex="-1">+ Cargar un pasajero a mano</button></div>';
      else {
        var orden = ULT.orden.map(function (x) { return x.p.id; }), multi = ST.grupos.length > 1;
        c.innerHTML = ST.grupos.map(function (g) {
          var ps = ST.pax.filter(function (p) { return p.grupo === g.id; }).sort(function (a, b) { return orden.indexOf(a.id) - orden.indexOf(b.id); });
          return '<section class="grupo" data-g="' + g.id + '">' + cabGrupo(g, ps.length, multi) + ps.map(function (p) { return tarjeta(p, info); }).join('')
            + '<button type="button" class="s agregar" data-add="' + g.id + '" tabindex="-1">+ Agregar ' + (multi ? 'pasajero a ' + esc(etiquetaG(g)) : 'otro pasajero') + '</button></section>';
        }).join('') + '<button type="button" class="s agregar nuevag" data-nuevag tabindex="-1">+ Nueva reserva (otro grupo de pasajeros)</button>' + DOCS_OPC;
      }
      firmaCartas = firma();
      $('npax').textContent = ST.pax.length ? '(' + ST.pax.length + ')' : '';
    }
    ST.pax.forEach(function (p) { meta(p, info); });
    renderOut();
    if (todo && ultimo) { var a = document.querySelector('.pax[data-id="' + ultimo + '"]'); if (a) { a.classList.add('marca'); setTimeout(function () { a.classList.remove('marca'); }, 1300); } ultimo = null; }
  }
  var tRender = null;
  function firma() { return JSON.stringify(ULT ? ULT.orden.map(function (x) { return [x.p.id, x.p.grupo, x.tipo, x.n, x.adulto ? 1 : 0]; }) : []) + ST.grupos.length; }
  var firmaCartas = '';
  // Mientras se escribe sólo se actualizan encabezados, avisos y comandos (sin reconstruir las tarjetas)
  function cambio() {
    clearTimeout(tRender);
    tRender = setTimeout(function () { render(false); }, 90);
  }
  // Reconstruye las tarjetas (orden, tipo) conservando el campo donde estaba el cursor
  function rehacer() {
    var a = document.activeElement, art = a && a.closest && a.closest('.pax'), f = a && a.getAttribute && a.getAttribute('data-f');
    var sxf = a && a.getAttribute && a.getAttribute('data-sx'), gf = a && a.getAttribute && a.getAttribute('data-gf'), gsec = a && a.closest && a.closest('.grupo'), gidF = gsec && gsec.getAttribute('data-g');
    var id = art && art.getAttribute('data-id'), sel = a && typeof a.selectionStart === 'number' ? a.selectionStart : null;
    render(true);
    if (id && f) { var n = document.querySelector('.pax[data-id="' + id + '"] [data-f="' + f + '"]'); if (n) { n.focus(); try { if (sel !== null) n.setSelectionRange(sel, sel); } catch (e) { } } }
    else if (id && sxf) { var x = document.querySelector('.pax[data-id="' + id + '"] [data-sx="' + sxf + '"]'); if (x) x.focus(); }
    else if (gf && gidF) { var y = document.querySelector('.grupo[data-g="' + gidF + '"] [data-gf="' + gf + '"]'); if (y) { y.focus(); try { if (sel !== null) y.setSelectionRange(sel, sel); } catch (e) { } } }
  }
  $('paxs').addEventListener('focusout', function () {
    setTimeout(function () { calcular(); if (firma() !== firmaCartas) rehacer(); }, 0);
  });
  $('paxs').addEventListener('input', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-gf'); if (!f) return;
    if (f === 'loc') { var c = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); if (c !== e.target.value) e.target.value = c; }
    else { mascaraFecha(e.target, e); e.target.classList.remove('mal'); }
  });
  $('paxs').addEventListener('change', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-gf'); if (!f) return;
    var g = grupo(e.target.closest('.grupo').getAttribute('data-g')), v = e.target.value.trim();
    if (f === 'loc') { g.loc = v.toUpperCase(); rehacer(); return; }
    var d = deDmy(v); if (v && !d) { e.target.classList.add('mal'); return; }
    g[f] = d ? dmy(d) : ''; e.target.value = g[f];
    rehacer();
  });
  function porId(id) { return ST.pax.filter(function (p) { return p.id === +id; })[0]; }

  // eventos de las tarjetas
  $('paxs').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f'), art = e.target.closest('.pax'); if (!f || !art || f === 'grupo') return;
    var p = porId(art.getAttribute('data-id')), v = e.target.value;
    if (/^(nac|ppVenc|ciVenc)$/.test(f)) {
      mascaraFecha(e.target, e); v = e.target.value;
      var fd = deDmy(v);
      // año de 2 cifras en nacimiento: siglo pasado si quedaría en el futuro
      if (fd && f === 'nac' && /\d{2}$/.test(v.trim()) && !/\d{4}$/.test(v.trim()) && new Date(fd.y, fd.m - 1, fd.d) > new Date()) fd.y -= 100;
      p[f] = fd; e.target.classList.toggle('mal', !fd && (cifras(v) >= 8 || /[A-Za-z]{3}\d{2,4}$/.test(v)));
    }
    else if (/^(nacionalidad|ppEmisor|ciEmisor)$/.test(f)) p[f] = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    else if (f === 'infanteDe') p[f] = +v || 0;
    else p[f] = v;
    cambio();
  });
  $('paxs').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f'), art = e.target.closest('.pax'); if (!f || !art) return;
    var p = porId(art.getAttribute('data-id'));
    if (f === 'apellidos' || f === 'nombres') { p[f] = L(e.target.value); e.target.value = p[f]; }
    if (f === 'nombres' && (!p.sexo || p.sexoNombre)) { deducirSexo(p); pintarSexo(art, p); }
    if (/^(nac|ppVenc|ciVenc)$/.test(f)) {
      if (p[f]) { e.target.value = dmy(p[f]); e.target.classList.remove('mal'); }
      else e.target.classList.toggle('mal', !!e.target.value.trim());
    }
    if (f === 'tel' && p.tel) { var t = TEXTO.telefono(p.tel, ST.codpais); if (t) { p.tel = t.num; e.target.value = t.num; if (t.aviso) toast(t.aviso); } }
    if (/^(nacionalidad|ppEmisor|ciEmisor)$/.test(f)) { e.target.value = p[f]; if (p[f] && !PAISES[p[f]]) toast('Código de país desconocido: usá el de 3 letras (URY, ARG, BRA…)'); }
    if (f === 'grupo') {
      var gN = e.target.value === 'nueva' ? nuevoGrupo() : grupo(e.target.value);
      p.grupo = gN.id; if (p.infanteDe && porId(p.infanteDe) && porId(p.infanteDe).grupo !== gN.id) p.infanteDe = 0;
      ST.pax.forEach(function (q) { if (q.infanteDe === p.id && q.grupo !== gN.id) q.infanteDe = 0; });
      ultimo = p.id; render(true); toast('Pasó a ' + etiquetaG(gN)); return;
    }
    if (f === 'docUsar' || f === 'tipoManual' || f === 'infanteDe') { p[f] = f === 'infanteDe' ? (+e.target.value || 0) : e.target.value; rehacer(); return; }
    cambio();
  });
  $('paxs').addEventListener('click', function (e) {
    var b = e.target.closest('button,img'); if (!b) return;
    if (b.hasAttribute('data-add')) { agregarAMano(+b.getAttribute('data-add') || 0); return; }
    if (b.hasAttribute('data-nuevag')) { agregarAMano(nuevoGrupo().id); return; }
    var art = b.closest('.pax'), p = art && porId(art.getAttribute('data-id'));
    if (b.hasAttribute('data-del')) { ST.pax = ST.pax.filter(function (q) { return q !== p; }); render(true); toast('Pasajero quitado'); return; }
    if (b.hasAttribute('data-sx')) { elegirSexo(art, p, b.getAttribute('data-sx')); return; }
    if (b.hasAttribute('data-mv')) {
      var A = L(p.apellidos).split(' ').filter(Boolean), N = L(p.nombres).split(' ').filter(Boolean);
      if (b.getAttribute('data-mv') === 'an' && A.length > 1) N.push(A.shift());
      else if (b.getAttribute('data-mv') === 'na' && N.length > 1) A.unshift(N.pop());
      p.apellidos = A.join(' '); p.nombres = N.join(' ');
      art.querySelector('[data-f=apellidos]').value = p.apellidos; art.querySelector('[data-f=nombres]').value = p.nombres;
      p.avisosF.forEach(function (a, k) { if (/nombres y cuáles apellidos/.test(a.t)) p.ocultos[k] = 1; });
      cambio(); return;
    }
    if (b.hasAttribute('data-irfv')) { var fv = document.querySelector('.grupo[data-g="' + p.grupo + '"] [data-gf="ida"]'); if (fv) { fv.scrollIntoView({ block: 'center', behavior: 'smooth' }); fv.focus({ preventScroll: true }); } return; }
    if (b.hasAttribute('data-oc')) { p.ocultos[+b.getAttribute('data-oc')] = 1; render(false); return; }
    if (b.hasAttribute('data-ver')) { var f = p.fotos[+b.getAttribute('data-ver')]; verImagen(f.lienzo && LIENZOS[f.lienzo] ? LIENZOS[f.lienzo] : null, f.mrz || f.foto); return; }
    if (b.hasAttribute('data-rel')) { zonaManual(b.getAttribute('data-rel'), p.id); return; }
  });

  // comandos: copiar, tandas y pasos
  $('out').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-t')) { var t = b.getAttribute('data-t'), g0 = b.getAttribute('data-g'); copiar(t).then(function () { ST.hechos[g0 + '|' + t] = 1; b.classList.add('hecho'); b.querySelector('.cp').textContent = '✓ copiado'; toast('Copiado: ' + t.slice(0, 40)); }); return; }
    if (b.hasAttribute('data-tanda')) {
      var td = TANDAS[b.getAttribute('data-tanda')] || { ls: [] }, ls = td.ls, lim = LIMITE[ST.gds] || { sep: '\n' }, S = ST.gds === 'S';
      copiar(ls.join(lim.sep)).then(function () { ls.forEach(function (x) { ST.hechos[td.g + '|' + x] = 1; }); renderOut(); toast(S ? (ls.length === 1 ? '1 comando copiado' : ls.length + ' comandos copiados en una entrada (con §)') : (ls.length === 1 ? '1 línea copiada' : ls.length + ' líneas copiadas')); });
      return;
    }
    if (b.hasAttribute('data-r')) { grupo(b.getAttribute('data-g')).estado = b.getAttribute('data-r'); rehacer(); return; }
    if (b.hasAttribute('data-nomlistos')) {
      var U = GR[+b.getAttribute('data-nomlistos')];
      if (U) U.orden.forEach(function (x) { if (x.tipo !== 'INF' || x.adulto) { if (L(x.p.apellidos) && L(x.p.nombres)) ST.cargados[x.p.id] = 1; } });
      renderOut(); toast('Paso 2 habilitado'); return;
    }
    if (b.hasAttribute('data-nomvolver')) { var gv = +b.getAttribute('data-nomvolver'); ST.pax.forEach(function (p) { if (p.grupo === gv) delete ST.cargados[p.id]; }); renderOut(); return; }
  });

  // ---------- texto ----------
  // ---------- reservas (PNR) ----------
  var TIT_SEXO = { MR: 'M', MSTR: 'M', MSTER: 'M', SR: 'M', MRS: 'F', MS: 'F', MISS: 'F', SRA: 'F', SRTA: 'F' };
  function coincide(p, ape, nom) {
    var A = L(p.apellidos).replace(/ /g, ''), B = L(ape).replace(/ /g, '');
    var n1 = L(p.nombres).split(' ')[0], n2 = L(nom).split(' ')[0];
    var apOk = A && B && (A === B || A.indexOf(B) === 0 || B.indexOf(A) === 0);
    var nOk = n1 && n2 && (n1 === n2 || (n1.length >= 3 && n2.length >= 3 && (n1.indexOf(n2) === 0 || n2.indexOf(n1) === 0)));
    return apOk && nOk;
  }
  function leerPNR(texto) {
    var rs = PNR.parse(texto);
    if (!rs.length) { toast('No encontré pasajeros en el PNR'); return false; }
    var gdsP = rs[0].gds, cambioGds = false;
    if (rs.every(function (r) { return r.gds === gdsP; }) && gdsP !== ST.gds) { ST.gds = gdsP; guardarConf(); sincOpc(); cambioGds = true; }
    var usados = {}, resumen = [];
    rs.forEach(function (r) {
      var g = (r.loc && ST.grupos.filter(function (x) { return x.loc === r.loc; })[0]) || nuevoGrupo();
      g.loc = r.loc; g.pnr = true; g.estado = 'existe';
      if (r.ida) g.ida = dmy(r.ida); if (r.vuelta) g.vuelta = dmy(r.vuelta);
      var porNum = {}, nuevos = 0, ya = 0;
      function tomar(x, tipo) {
        // pasajero ya cargado con ese nombre (sin repetir uno ya asignado a esta lectura) o uno nuevo con los datos del PNR
        var p = ST.pax.filter(function (q) { return !usados[q.id] && coincide(q, x.apellidos, x.nombres); })
          .sort(function (a, b) { return (grupo(a.grupo).pnr ? 1 : 0) - (grupo(b.grupo).pnr ? 1 : 0); })[0];
        if (p) ya++;
        else { p = nuevo({ apellidos: L(x.apellidos), nombres: L(x.nombres), fuentes: ['PNR' + (r.loc ? ' ' + r.loc : '')], grupo: g.id }); ST.pax.push(p); nuevos++; }
        usados[p.id] = 1; p.grupo = g.id;
        var sx = TIT_SEXO[x.titulo];
        if (sx && (!p.sexo || p.sexoNombre)) { p.sexo = sx; p.sexoNombre = ''; p.sexoDuda = ''; }
        if (!p.sexo && !p.sexoDuda) deducirSexo(p);
        if (x.nac && !p.nac) p.nac = x.nac;
        if (tipo && !p.nac) p.tipoManual = tipo;   // sin fecha de nacimiento, el tipo es el del PNR
        return p;
      }
      r.pax.filter(function (x) { return x.tipo !== 'INF'; }).forEach(function (x) {
        var p = tomar(x, x.tipo === 'CHD' ? 'CHD' : '');
        p.numManual = r.gds === 'S' ? x.num + '.' + x.sub : String(x.num); p.numPNR = r.loc || 'PNR';
        porNum[x.num + '.' + x.sub] = p;
        if (x.inf) { var q = tomar(x.inf, 'INF'); q.infanteDe = p.id; q.numManual = ''; }
      });
      r.pax.filter(function (x) { return x.tipo === 'INF'; }).forEach(function (x) {   // Sabre: infantes en su propio renglón
        var q = tomar(x, 'INF'); q.numManual = '';
        if (x.adulto && porNum[x.adulto]) q.infanteDe = porNum[x.adulto].id;
      });
      resumen.push((r.loc || 'Reserva') + ': ' + (ya + nuevos) + (ya + nuevos === 1 ? ' pasajero' : ' pasajeros') + (r.ida ? ', ida ' + dmy(r.ida).slice(0, 5) : '') + (r.vuelta ? ', vuelta ' + dmy(r.vuelta).slice(0, 5) : ''));
    });
    render(true);
    toast((rs.length === 1 ? resumen[0] : rs.length + ' reservas leídas') + (cambioGds ? ' · se cambió a ' + (ST.gds === 'S' ? 'Sabre' : 'Amadeus') : ''));
    return true;
  }
  $('leerPnr').addEventListener('click', function () {
    var t = $('pnrTxt').value; if (!t.trim()) { toast('Pegá primero el PNR en el recuadro'); return; }
    leerPNR(t);
  });

  function leerTexto() {
    var t = $('txt').value; if (!t.trim()) { toast('Pegá primero los datos en el recuadro'); return; }
    if (PNR.detectar(t)) { $('pnrTxt').value = ($('pnrTxt').value.trim() ? $('pnrTxt').value.replace(/\s+$/, '') + '\n' : '') + t.trim(); leerPNR(t); return; }
    var r = TEXTO.parse(t, { codPais: ST.codpais }), n = 0, antes = ST.pax.length;
    var tocados = {};
    r.pasajeros.forEach(function (x) { var q = x.mrz ? desdeMRZ(x.mrz, 'MRZ pegada') : desdeTexto(x, 'texto'), e = fusionar(q); if (e) { n++; tocados[e.grupo] = 1; } });
    if (!Object.keys(tocados).length) ST.grupos.forEach(function (g) { tocados[g.id] = 1; });
    // un solo mail o celular en el texto: vale para todos los pasajeros (también los cargados antes)
    var c = r.comun || {}, conMail = 0, conTel = 0;
    if (ST.pax.length > 1) ST.pax.forEach(function (p) {
      if (!tocados[p.grupo] || CMD.tipoPax(p, refViaje(p)) === 'INF') return;   // los infantes no llevan contactos; sólo en las reservas del texto
      if (c.email && !p.email) { p.email = c.email; conMail++; }
      if (c.telefono && !p.tel) { var tt = TEXTO.telefono(c.telefono, ST.codpais); p.tel = tt ? tt.num : c.telefono; conTel++; }
    });
    if (!n && !conMail && !conTel) { toast('No encontré datos de pasajeros en el texto'); return; }
    var nuevos = ST.pax.length - antes;
    render(true);
    var msj = nuevos ? (nuevos === 1 ? 'Se agregó 1 pasajero' : 'Se agregaron ' + nuevos + ' pasajeros') : (n > 1 ? 'Datos sumados a ' + n + ' pasajeros ya cargados' : 'Datos sumados al pasajero ya cargado');
    var dig = function (v) { return String(v || '').replace(/\D/g, ''); };
    var nM = c.email ? ST.pax.filter(function (p) { return (p.email || '').toLowerCase() === c.email.toLowerCase(); }).length : 0;
    var nT = c.telefono ? ST.pax.filter(function (p) { return p.tel && (dig(p.tel) === dig(c.telefono) || dig(p.tel).slice(-8) === dig(c.telefono).slice(-8)); }).length : 0;
    if (nM > 1 || nT > 1) msj += ' · ' + (nM > 1 && nT > 1 ? 'mismo mail y celular' : nM > 1 ? 'mismo mail' : 'mismo celular') + ' para ' + Math.max(nM, nT) + ' pasajeros';
    toast(msj);
  }
  $('leer').addEventListener('click', leerTexto);
  $('txt').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); leerTexto(); } });
  function agregarAMano(g) {
    var p = nuevo({ fuentes: ['a mano'], grupo: g || (ST.grupos[ST.grupos.length - 1] || {}).id }); ST.pax.push(p); ultimo = p.id; render(true);
    var i = document.querySelector('.pax[data-id="' + p.id + '"] [data-f=apellidos]'); if (i) { i.focus(); i.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  $('manual').addEventListener('click', function () { agregarAMano(); });
  function pintarSexo(art, p, foco) {
    var hay = art.querySelector('[data-sx="' + (p.sexo || 'M') + '"]');
    art.querySelectorAll('[data-sx]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-sx') === p.sexo); x.tabIndex = x === hay ? 0 : -1; });
    if (foco && hay) hay.focus();
  }
  function elegirSexo(art, p, sx, foco) {
    p.sexo = sx; p.sexoNombre = ''; p.sexoDuda = '';
    pintarSexo(art, p, foco);
    cambio();
  }
  // Sexo con el teclado: M o H = masculino, F = femenino, flechas para alternar (Tab sigue al próximo campo)
  $('paxs').addEventListener('keydown', function (e) {
    var b = e.target.closest && e.target.closest('[data-sx]'); if (!b || e.ctrlKey || e.metaKey || e.altKey) return;
    var art = b.closest('.pax'), p = porId(art.getAttribute('data-id')), k = e.key.toUpperCase(), sx = null;
    if (k === 'M' || k === 'H') sx = 'M'; else if (k === 'F') sx = 'F';
    else if (/^ARROW(LEFT|RIGHT|UP|DOWN)$/.test(k)) sx = b.getAttribute('data-sx') === 'M' ? 'F' : 'M';
    if (sx) { e.preventDefault(); elegirSexo(art, p, sx, true); }
  });
  // Confirmación en la misma página (los cuadros confirm() no funcionan en todos los navegadores embebidos)
  $('limpiar').addEventListener('click', function () {
    var b = this;
    if ((ST.pax.length || $('txt').value) && !b.dataset.ok) {
      b.dataset.ok = '1'; b.textContent = '¿Borrar todo? Tocá de nuevo';
      clearTimeout(b._t); b._t = setTimeout(function () { delete b.dataset.ok; b.textContent = 'Limpiar todo'; }, 3500);
      return;
    }
    clearTimeout(b._t); delete b.dataset.ok; b.textContent = 'Limpiar todo';
    ST.pax = []; ST.hechos = {}; ST.cargados = {}; ST.grupos = [{ id: gid++, loc: '', ida: '', vuelta: '', estado: 'nueva', pnr: false }]; $('txt').value = ''; $('cola').innerHTML = ''; LIENZOS = {}; render(true); toast('Se borraron los pasajeros');
  });

  // ---------- archivos ----------
  function miniatura(canvas, ancho, tipo) {
    var s = Math.min(1, ancho / canvas.width), c = document.createElement('canvas');
    c.width = Math.round(canvas.width * s); c.height = Math.round(canvas.height * s);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL(tipo || 'image/jpeg', 0.82);
  }
  var nLienzo = 0;
  function itemCola(nombre) {
    var li = document.createElement('li');
    li.innerHTML = '<span class="spin"></span><span class="nom">' + esc(nombre) + '</span><span class="est">En espera…</span>';
    $('cola').appendChild(li);
    return {
      li: li, estado: function (t) { li.querySelector('.est').textContent = t; },
      fin: function (cls, t, extra) { li.className = cls; var sp = li.querySelector('.spin'); if (sp) sp.remove(); li.querySelectorAll('button').forEach(function (b) { b.remove(); }); li.querySelector('.est').textContent = t; if (extra) li.appendChild(extra); }
    };
  }
  function agregarLectura(res, canvas, nombre, it) {
    var key = 'L' + (++nLienzo); LIENZOS[key] = canvas;
    if (!res.mrz) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 's'; b.textContent = 'Marcar a mano';
      b.onclick = function () { zonaManual(key, 0, it); };
      it.fin('warn', 'No encontré la zona de lectura', b);
      return;
    }
    var p = desdeMRZ(res.mrz, nombre);
    p.fotos = [{ foto: miniatura(canvas, 420), mrz: res.recorte ? miniatura(res.recorte, 640, 'image/png') : '', lienzo: key }];
    fusionar(p);
    it.fin(res.mrz.verificado ? 'ok' : 'warn', (res.mrz.verificado ? '✓ ' : 'Con dudas: ') + L(res.mrz.apellidos).split(' ')[0]);
    render(true);
  }
  var colaTrabajo = Promise.resolve();
  function procesar(files) {
    files = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || /pdf$/i.test(f.type) || /\.(pdf|jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name); });
    if (!files.length) { toast('Elegí imágenes (JPG, PNG) o PDF'); return; }
    files.forEach(function (f) {
      var nombre = f.name && !/^image\.(png|jpe?g)$/i.test(f.name) ? f.name : 'captura';
      var it = itemCola(nombre);
      colaTrabajo = colaTrabajo.then(async function () {
        try {
          if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
            var pags = await OCR.paginasPDF(f, it.estado), algo = false;
            for (var k = 0; k < pags.length; k++) {
              var pg = pags[k], etq = nombre + (pags.length > 1 ? ' (pág. ' + pg.pagina + ')' : '');
              var tx = pg.texto.trim().length > 40 ? TEXTO.parse(pg.texto, { codPais: ST.codpais }).pasajeros : [];
              var conMrz = tx.filter(function (x) { return x.mrz; });
              if (conMrz.length) { conMrz.forEach(function (x) { var q = desdeMRZ(x.mrz, etq); q.fotos = [{ foto: miniatura(pg.canvas, 420), lienzo: (LIENZOS['L' + (++nLienzo)] = pg.canvas, 'L' + nLienzo) }]; fusionar(q); }); algo = true; continue; }
              it.estado('Leyendo página ' + pg.pagina + '…');
              var r = await OCR.leerCanvas(pg.canvas, it.estado);
              if (r.mrz) { agregarLectura(r, pg.canvas, etq, it); algo = true; }
              else if (tx.length) { tx.forEach(function (x) { fusionar(desdeTexto(x, etq)); }); algo = true; }
            }
            if (algo) { it.fin('ok', '✓ Leído'); render(true); }
            else agregarLectura({ mrz: null }, pags[0].canvas, nombre, it);
          } else {
            it.estado('Abriendo…');
            var cv = await OCR.cargarImagen(f);
            var res = await OCR.leerCanvas(cv, it.estado);
            agregarLectura(res, cv, nombre, it);
          }
        } catch (err) {
          console.error(err);
          it.fin('err', err && err.message ? err.message : 'No se pudo leer el archivo');
        }
      });
    });
  }
  // ---------- campo de texto: también capturas, fotos o PDF con los datos escritos ----------
  function pareceMRZ(t) { return /<{4,}/.test(t) || /^[A-Z0-9<]{28,}$/m.test(t.replace(/ /g, '')); }
  function sumarAlCampo(t) {
    var a = $('txt'); t = t.replace(/\n{3,}/g, '\n\n').trim(); if (!t) return;
    a.value = a.value.trim() ? a.value.replace(/\s+$/, '') + '\n\n' + t : t;
  }
  function procesarDatos(files) {
    files = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || /pdf$/i.test(f.type) || /\.(pdf|jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name); });
    if (!files.length) { toast('Elegí una imagen (JPG, PNG) o un PDF'); return; }
    files.forEach(function (f) {
      var nombre = f.name && !/^image\.(png|jpe?g)$/i.test(f.name) ? f.name : 'captura';
      var it = itemCola(nombre);
      colaTrabajo = colaTrabajo.then(async function () {
        try {
          var textos = [], lienzos = [];
          if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
            var pags = await OCR.paginasPDF(f, it.estado);
            for (var k = 0; k < pags.length; k++) {
              lienzos.push(pags[k].canvas);
              if (pags[k].texto.replace(/\s/g, '').length > 20) textos.push(pags[k].texto);   // PDF con texto: se usa tal cual
              else { it.estado('Leyendo página ' + pags[k].pagina + '…'); textos.push(TEXTO.arreglarOCR(await OCR.leerTextoImagen(pags[k].canvas, it.estado))); }
            }
          } else {
            it.estado('Abriendo…');
            var cv = await OCR.cargarImagen(f); lienzos.push(cv);
            textos.push(TEXTO.arreglarOCR(await OCR.leerTextoImagen(cv, it.estado)));
          }
          var todo = textos.join('\n\n');
          // ¿Es la foto de un pasaporte o cédula? Entonces se lee la zona MRZ con el lector específico
          if (pareceMRZ(todo)) {
            var hubo = false;
            for (var j = 0; j < lienzos.length; j++) {
              it.estado('Parece un documento: leyendo la zona MRZ…');
              var r = await OCR.leerCanvas(lienzos[j], it.estado);
              if (r.mrz) { agregarLectura(r, lienzos[j], nombre, it); hubo = true; }
            }
            if (hubo) return;
          }
          if (!todo.replace(/\s/g, '')) { it.fin('warn', 'No encontré texto en el archivo'); return; }
          var cuantos = TEXTO.parse(todo, { codPais: ST.codpais }).pasajeros.length;
          sumarAlCampo(todo);
          if (!cuantos) { it.fin('warn', 'Texto pasado al recuadro: revisalo'); toast('Pasé el texto al recuadro, pero no encontré datos de pasajeros'); return; }
          it.fin('ok', '✓ Texto leído');
          leerTexto();
        } catch (err) {
          console.error(err);
          it.fin('err', err && err.message ? err.message : 'No se pudo leer el archivo');
        }
      });
    });
  }
  $('txtArch').addEventListener('click', function () { $('fileTxt').click(); });
  $('fileTxt').addEventListener('change', function () { procesarDatos(this.files); this.value = ''; });
  $('txt').addEventListener('paste', function (e) {
    var cd = e.clipboardData; if (!cd) return;
    if ((cd.getData('text/plain') || '').trim()) return;   // si hay texto (por ej. celdas de Excel), se pega el texto
    var fs = [];
    for (var i = 0; cd.items && i < cd.items.length; i++) if (cd.items[i].kind === 'file') { var f = cd.items[i].getAsFile(); if (f) fs.push(f); }
    if (fs.length) { e.preventDefault(); e.stopPropagation(); procesarDatos(fs); }
  });
  ['dragenter', 'dragover'].forEach(function (t) { $('txt').addEventListener(t, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); e.stopPropagation(); $('txt').classList.add('sobre'); } }); });
  ['dragleave', 'drop'].forEach(function (t) { $('txt').addEventListener(t, function () { $('txt').classList.remove('sobre'); }); });
  $('txt').addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); procesarDatos(e.dataTransfer.files); }
  });
  $('elegir').addEventListener('click', function (e) { e.stopPropagation(); $('file').click(); });
  $('drop').addEventListener('click', function () { $('file').click(); });
  $('drop').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
  $('file').addEventListener('change', function () { procesar(this.files); this.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { $('drop').addEventListener(t, function (e) { e.preventDefault(); $('drop').classList.add('sobre'); }); });
  ['dragleave', 'drop'].forEach(function (t) { $('drop').addEventListener(t, function () { $('drop').classList.remove('sobre'); }); });
  $('drop').addEventListener('drop', function (e) { e.preventDefault(); procesar(e.dataTransfer.files); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) procesar(e.dataTransfer.files); });
  document.addEventListener('paste', function (e) {
    // pegando en un campo con texto en el portapapeles (por ej. celdas de Excel, que traen además una imagen): se pega el texto
    var ed = e.target && e.target.closest && e.target.closest('input,textarea,[contenteditable]');
    if (ed && e.clipboardData && (e.clipboardData.getData('text/plain') || '').trim()) return;
    var it = e.clipboardData && e.clipboardData.items, fs = [];
    for (var i = 0; it && i < it.length; i++) if (it[i].kind === 'file') { var f = it[i].getAsFile(); if (f) fs.push(f); }
    if (fs.length) { e.preventDefault(); procesar(fs); }
  });

  // ---------- modal: ver imagen / marcar zona ----------
  var MZ = { canvas: null, key: '', paxId: 0, it: null, sel: null, modo: '' };
  function abrirModal(src, modo) {
    MZ.canvas = src; MZ.modo = modo;
    var mc = $('mCanvas'), maxW = Math.min(window.innerWidth * 0.9, 1060), maxH = window.innerHeight * 0.72;
    var s = Math.min(maxW / src.width, maxH / src.height, 1);
    mc.width = Math.round(src.width * s); mc.height = Math.round(src.height * s);
    mc.getContext('2d').drawImage(src, 0, 0, mc.width, mc.height);
    MZ.esc = s; $('mSel').hidden = true; $('mEstado').textContent = '';
    $('mT').textContent = modo === 'ver' ? 'Documento' : 'Marcá la zona de lectura';
    $('mHint').hidden = modo === 'ver'; $('mGirar').hidden = modo === 'ver';
    mc.style.cursor = modo === 'ver' ? 'default' : 'crosshair';
    $('modal').hidden = false;
  }
  function cerrarModal() { $('modal').hidden = true; MZ.canvas = null; }
  function verImagen(canvas, dataUrl) {
    if (canvas) { abrirModal(canvas, 'ver'); return; }
    var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); abrirModal(c, 'ver'); }; im.src = dataUrl;
  }
  function zonaManual(key, paxId, it) { var c = LIENZOS[key]; if (!c) { toast('La imagen ya no está disponible: cargala de nuevo'); return; } MZ.key = key; MZ.paxId = paxId; MZ.it = it || null; abrirModal(c, 'zona'); }
  $('mCerrar').addEventListener('click', cerrarModal);
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) cerrarModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal').hidden) cerrarModal(); });
  $('mGirar').addEventListener('click', function () {
    var s = MZ.canvas, c = document.createElement('canvas'); c.width = s.height; c.height = s.width;
    var g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(Math.PI / 2); g.drawImage(s, -s.width / 2, -s.height / 2);
    LIENZOS[MZ.key] = c; abrirModal(c, 'zona');
  });
  (function () {
    var mc = $('mCanvas'), sel = $('mSel'), ini = null;
    function pos(e) { var r = mc.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return { x: Math.max(0, Math.min(r.width, t.clientX - r.left)), y: Math.max(0, Math.min(r.height, t.clientY - r.top)), r: r }; }
    function down(e) { if (MZ.modo !== 'zona') return; e.preventDefault(); ini = pos(e); sel.hidden = false; mover(e); }
    function mover(e) {
      if (!ini) return; e.preventDefault(); var p = pos(e), k = mc.width / p.r.width;
      var x = Math.min(ini.x, p.x), y = Math.min(ini.y, p.y), w = Math.abs(p.x - ini.x), h = Math.abs(p.y - ini.y);
      sel.style.left = (x + mc.offsetLeft) + 'px'; sel.style.top = (y + mc.offsetTop) + 'px'; sel.style.width = w + 'px'; sel.style.height = h + 'px';
      MZ.sel = { x: x * k / MZ.esc, y: y * k / MZ.esc, w: w * k / MZ.esc, h: h * k / MZ.esc };
    }
    async function up() {
      if (!ini) return; ini = null;
      var s = MZ.sel; if (!s || s.w < 30 || s.h < 10) { sel.hidden = true; return; }
      $('mEstado').innerHTML = '<span class="spin" style="display:inline-block;vertical-align:middle"></span> Leyendo…';
      try {
        var r = await OCR.leerZona(MZ.canvas, s.x, s.y, s.w, s.h);
        if (!r.mrz) { $('mEstado').textContent = 'No se pudo leer: probá marcando sólo las líneas con <<<, un poco más amplio.'; return; }
        var p = desdeMRZ(r.mrz, 'zona marcada');
        p.fotos = [{ foto: miniatura(MZ.canvas, 420), mrz: r.recorte ? miniatura(r.recorte, 640, 'image/png') : '', lienzo: MZ.key }];
        if (MZ.paxId) { var vie = porId(MZ.paxId); if (vie) ST.pax = ST.pax.filter(function (q) { return q !== vie; }); if (vie) { ['email', 'tel', 'tituloManual', 'tipoManual', 'numManual', 'infanteDe'].forEach(function (k) { if (vie[k]) p[k] = vie[k]; }); } }
        fusionar(p);
        if (MZ.it) MZ.it.fin(r.mrz.verificado ? 'ok' : 'warn', (r.mrz.verificado ? '✓ ' : 'Con dudas: ') + L(r.mrz.apellidos).split(' ')[0]);
        cerrarModal(); render(true); toast(r.mrz.verificado ? 'Leído y verificado' : 'Leído con dudas: revisá los datos');
      } catch (err) { $('mEstado').textContent = err.message || 'Error al leer'; }
    }
    mc.addEventListener('mousedown', down); window.addEventListener('mousemove', mover); window.addEventListener('mouseup', up);
    mc.addEventListener('touchstart', down, { passive: false }); mc.addEventListener('touchmove', mover, { passive: false }); mc.addEventListener('touchend', up);
  })();

  // ---------- opciones ----------
  function sincOpc() {
    document.querySelectorAll('#gds button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-g') === ST.gds); });
    $('docsComp').checked = !!ST.docsComp; $('titF').value = ST.titF; $('codpais').value = ST.codpais;
  }
  $('gds').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; ST.gds = b.getAttribute('data-g'); guardarConf(); sincOpc(); render(true); });
  $('docsComp').addEventListener('change', function () { ST.docsComp = this.checked; guardarConf(); render(false); });
  $('titF').addEventListener('change', function () { ST.titF = this.value; guardarConf(); render(false); });
  $('codpais').addEventListener('change', function () { ST.codpais = this.value.replace(/\D/g, '') || '598'; this.value = ST.codpais; guardarConf(); });
  sincOpc(); render(true);
  // precarga del lector en segundo plano cuando la página queda quieta
  if ('requestIdleCallback' in window) requestIdleCallback(function () { OCR.motor().catch(function () { }); }, { timeout: 6000 });
})();
