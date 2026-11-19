/* ===== Datos del pasajero · interfaz ===== */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ST = { pax: [], gds: 'A', docsComp: false, titF: 'MRS', fviaje: '', codpais: '598', hechos: {} };
  var uid = 1, LIENZOS = {}, ultimo = null;
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
  function deIso(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function dmy(d) { return d ? (d.d < 10 ? '0' : '') + d.d + '/' + (d.m < 10 ? '0' : '') + d.m + '/' + d.y : ''; }
  function fecha(d) { return d ? new Date(d.y, d.m - 1, d.d) : null; }
  function refViaje() { var f = deDmy(ST.fviaje); return f ? fecha(f) : new Date(); }
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
    var p = { id: uid++, apellidos: '', nombres: '', sexo: '', nac: null, nacionalidad: '', ppNum: '', ppEmisor: '', ppVenc: null, ciNum: '', ciEmisor: '', ciVenc: null, docUsar: '', email: '', tel: '', tituloManual: '', tipoManual: '', numManual: '', infanteDe: 0, fuentes: [], avisosF: [], ocultos: {}, verificado: null, fotos: [] };
    for (var k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') p[k] = o[k];
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
    var venc = t.vencimiento ? { y: t.vencimiento.y, m: t.vencimiento.m, d: t.vencimiento.d } : null;
    if (t.pasaporte) {
      o.ppNum = t.pasaporte; o.ppVenc = venc; o.docUsar = 'PP';
      o.ppEmisor = t.nacionalidad || (ST.codpais === '598' ? 'URY' : '');
      if (!t.nacionalidad && o.ppEmisor) av.push({ t: 'Se tomó el pasaporte como uruguayo (no se indicó el país): verificalo.', k: 'warn' });
    }
    if (t.ci) { o.ciNum = t.ci; o.ciEmisor = t.nacionalidad || 'URY'; if (!t.pasaporte) { o.docUsar = 'NI'; o.ciVenc = venc; } }
    return nuevo(o);
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
  function avisos(p, info) {
    var a = p.avisosF.filter(function (x, i) { return !p.ocultos[i]; }).map(function (x) { return { t: x.t, k: x.k, i: p.avisosF.indexOf(x) }; });
    var ref = refViaje(), seis = new Date(ref); seis.setMonth(seis.getMonth() + 6);
    var tipo = info ? info.tipo : 'ADT';
    if (!L(p.apellidos)) a.push({ t: 'Falta el apellido.', k: 'err' });
    if (!L(p.nombres)) a.push({ t: 'Falta el nombre.', k: 'err' });
    if (!p.sexo) a.push({ t: 'Falta el sexo (M/F) para el DOCS.', k: 'err' });
    if (!p.nac) a.push({ t: 'Falta la fecha de nacimiento para el DOCS.', k: 'err' });
    var uso = p.docUsar === 'NI' || (!p.ppNum && p.ciNum) ? 'NI' : 'PP';
    var v = uso === 'NI' ? p.ciVenc : p.ppVenc;
    if (v) {
      var fv = fecha(v);
      if (fv < ref) a.push({ t: (uso === 'NI' ? 'La cédula' : 'El pasaporte') + ' está VENCIDO (' + dmy(v) + ')' + (ST.fviaje ? ' para la fecha del viaje' : '') + '.', k: 'err' });
      else if (fv < seis) a.push({ t: 'Vence el ' + dmy(v) + ': menos de 6 meses ' + (ST.fviaje ? 'después del viaje' : 'desde hoy') + '. Varios destinos lo exigen.', k: 'warn' });
    }
    if (p.ciNum && (p.ciEmisor || 'URY') === 'URY' && /^\d{7,8}$/.test(p.ciNum) && !TEXTO.ciValida(p.ciNum)) a.push({ t: 'El dígito verificador de la cédula no coincide: revisá el número.', k: 'err' });
    if (!p.ppNum && !p.ciNum) a.push({ t: 'Sin documento: no se arma el FOID.', k: 'warn' });
    if (tipo === 'INF' && info && !info.adulto) a.push({ t: 'El infante necesita un adulto con quien viajar.', k: 'err' });
    if (tipo === 'INF' && info && info.adulto && !p.infanteDe) a.push({ t: 'Se cargó en brazos de ' + nombreDe(info.adulto).trim() + '. Si viaja con otro adulto, elegilo en «Viaja en brazos de».', k: 'ok' });
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
  var ULT = null;
  function calcular() {
    ULT = CMD.generar(limpios(), { gds: ST.gds, docsCompleto: ST.docsComp, tituloF: ST.titF, fechaViaje: refViaje(), contactoTodos: true });
    var info = {};
    ULT.orden.forEach(function (x) { info[x.p.id] = { n: x.n, tipo: x.tipo, edad: x.edad, tit: x.tit, adulto: x.adulto ? x.adulto.p.id : 0 }; });
    return info;
  }
  var SECS = [['nombres', 'Nombres'], ['docs', 'DOCS'], ['foid', 'FOID'], ['ctc', 'Contactos (CTCE · CTCM)']];
  function nombreDe(id) { var p = ST.pax.filter(function (x) { return x.id === id; })[0]; return p ? (L(p.nombres).split(' ')[0] || '') + ' ' + (L(p.apellidos).split(' ')[0] || '') : ''; }
  function renderOut() {
    $('outT').textContent = 'Comandos para ' + (ST.gds === 'S' ? 'Sabre' : 'Amadeus');
    var o = $('out');
    if (!ST.pax.length) { o.innerHTML = '<p class="hint">Los comandos aparecen acá a medida que cargás pasajeros.</p>'; $('copTodo').disabled = true; return; }
    var h = '<p class="nota-gds">' + (ST.gds === 'S'
      ? 'Tocá cada línea para copiarla. La asociación <b>-1.1, -2.1…</b> sigue el orden en que se cargan los nombres de esta lista.'
      : 'Tocá cada línea para copiarla. Amadeus ordena los pasajeros por apellido: los <b>/P1, /P2…</b> siguen ese orden. Si los nombres ya estaban en la reserva, verificá con RT y corregí el N.º en la tarjeta.') + '</p>';
    var hay = false;
    SECS.forEach(function (s) {
      var ls = ULT.secciones[s[0]];
      if (!ls.length) return;
      var ok = ls.filter(function (l) { return l.t; });
      h += '<div class="sec"><div class="sech"><b>' + s[1] + '</b>' + (ok.length > 1 ? '<button type="button" class="s" data-sec="' + s[0] + '">Copiar sección</button>' : '') + '</div>';
      ls.forEach(function (l) {
        if (l.t) {
          hay = true;
          h += '<button type="button" class="ln' + (ST.hechos[l.t] ? ' hecho' : '') + '" data-t="' + esc(l.t) + '"><span>' + esc(l.t) + '</span>' + (l.nota ? '<span class="nota">' + esc(l.nota) + '</span>' : '') + '<span class="cp">' + (ST.hechos[l.t] ? '✓ copiado' : 'copiar') + '</span></button>';
        } else h += '<div class="ln falta">Falta ' + esc(l.falta) + (l.id ? ' · ' + esc(nombreDe(l.id)) : '') + '</div>';
      });
      h += '</div>';
    });
    if (ULT.avisos.length) h += ULT.avisos.map(function (a) { return '<div class="ln falta">' + esc(a) + '</div>'; }).join('');
    o.innerHTML = h;
    $('copTodo').disabled = !hay;
  }
  function textoSec(k) { return ULT.secciones[k].filter(function (l) { return l.t; }).map(function (l) { return l.t; }); }

  // ---------- tarjetas ----------
  var DOCS_OPC = '<datalist id="paises">' + Object.keys(PAISES).filter(function (k) { return k.length === 3 && !/^GB[DNOPS]$/.test(k); }).map(function (k) { return '<option value="' + k + '">' + esc(PAISES[k][1]) + '</option>'; }).join('') + '</datalist>';
  function tarjeta(p, info) {
    var i = info[p.id] || { tipo: 'ADT', n: '' }, S = ST.gds === 'S';
    var uso = p.docUsar === 'NI' || (!p.ppNum && p.ciNum) ? 'NI' : 'PP';
    var adultos = ST.pax.filter(function (q) { return q.id !== p.id && info[q.id] && info[q.id].tipo === 'ADT'; });
    var h = '<article class="pax" data-id="' + p.id + '">';
    h += '<div class="ph" data-meta></div>';
    h += '<div class="pgrid">';
    h += '<div class="nomrow"><div><label>Apellidos</label><input class="nm" data-f="apellidos" value="' + esc(p.apellidos) + '" autocomplete="off" spellcheck="false"></div>';
    h += '<div class="mover"><button type="button" data-mv="an" title="Pasar el primer apellido a nombres">◀</button><button type="button" data-mv="na" title="Pasar el último nombre a apellidos">▶</button></div>';
    h += '<div><label>Nombres</label><input class="nm" data-f="nombres" value="' + esc(p.nombres) + '" autocomplete="off" spellcheck="false"></div></div>';
    h += '<div class="c3"><label>Sexo</label><div class="sx' + (p.sexo ? '' : ' falta') + '"><button type="button" data-sx="M" class="' + (p.sexo === 'M' ? 'on' : '') + '">M</button><button type="button" data-sx="F" class="' + (p.sexo === 'F' ? 'on' : '') + '">F</button></div></div>';
    h += '<div class="c4"><label>Nacimiento</label><input data-f="nac" data-fecha="nac" value="' + dmy(p.nac) + '" placeholder="dd/mm/aaaa" inputmode="numeric" autocomplete="off" maxlength="11"><div class="small" data-edad></div></div>';
    h += '<div class="c5"><label>Nacionalidad</label><input data-f="nacionalidad" list="paises" value="' + esc(p.nacionalidad) + '" maxlength="3" autocomplete="off"><div class="small">' + esc(paisNom(p.nacionalidad)) + '</div></div>';
    h += '<div class="c3"><label>Documento</label><select data-f="docUsar"><option value="PP"' + (uso === 'PP' ? ' selected' : '') + '>Pasaporte</option><option value="NI"' + (uso === 'NI' ? ' selected' : '') + '>Cédula / DNI</option></select></div>';
    var num = uso === 'NI' ? p.ciNum : p.ppNum, em = uso === 'NI' ? p.ciEmisor : p.ppEmisor, ve = uso === 'NI' ? p.ciVenc : p.ppVenc;
    h += '<div class="c3"><label>Número</label><input data-f="' + (uso === 'NI' ? 'ciNum' : 'ppNum') + '" value="' + esc(num) + '" autocomplete="off" spellcheck="false" style="text-transform:uppercase"></div>';
    h += '<div class="c2"><label title="País que emitió el documento">Emisor</label><input data-f="' + (uso === 'NI' ? 'ciEmisor' : 'ppEmisor') + '" list="paises" value="' + esc(em) + '" maxlength="3" autocomplete="off"></div>';
    h += '<div class="c4"><label>Vencimiento</label><input data-f="' + (uso === 'NI' ? 'ciVenc' : 'ppVenc') + '" data-fecha="venc" value="' + dmy(ve) + '" placeholder="dd/mm/aaaa" inputmode="numeric" autocomplete="off" maxlength="11"></div>';
    h += '<div class="c6"><label>Mail</label><input type="email" data-f="email" value="' + esc(p.email) + '" autocomplete="off" spellcheck="false"></div>';
    h += '<div class="c6"><label>Celular</label><input type="tel" data-f="tel" value="' + esc(p.tel) + '" autocomplete="off" placeholder="598…"></div>';
    h += '<div class="c4"><label>Tipo</label><select data-f="tipoManual"><option value="">Automático</option><option value="ADT"' + (p.tipoManual === 'ADT' ? ' selected' : '') + '>Adulto</option><option value="CHD"' + (p.tipoManual === 'CHD' ? ' selected' : '') + '>Niño (2 a 11)</option><option value="INF"' + (p.tipoManual === 'INF' ? ' selected' : '') + '>Infante (menos de 2)</option></select></div>';
    h += '<div class="c4"><label>Título</label><select data-f="tituloManual"><option value="">Automático</option>' + ['MR', 'MRS', 'MS', 'MSTR', 'MISS'].map(function (t) { return '<option' + (p.tituloManual === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>';
    if (i.tipo === 'INF') h += '<div class="c4"><label>Viaja en brazos de</label><select data-f="infanteDe"><option value="">Automático</option>' + adultos.map(function (q) { return '<option value="' + q.id + '"' + (+p.infanteDe === q.id ? ' selected' : '') + '>' + esc(L(q.nombres).split(' ')[0] + ' ' + L(q.apellidos)) + '</option>'; }).join('') + '</select></div>';
    else h += '<div class="c4"><label>N.º en la reserva</label><input data-f="numManual" value="' + esc(p.numManual) + '" inputmode="numeric" maxlength="2" placeholder="auto"></div>';
    h += '</div><ul class="avisos" data-av></ul>';
    if (p.fotos.length) {
      h += '<div class="thumbs">';
      p.fotos.forEach(function (f, k) {
        if (f.mrz) h += '<img class="mz" src="' + f.mrz + '" alt="Zona leída" data-ver="' + k + '" title="Lo que se leyó (ampliar)">';
        else if (f.foto) h += '<img src="' + f.foto + '" alt="Documento" data-ver="' + k + '" title="Ver el documento">';
        if (f.lienzo) h += '<button type="button" class="s" data-rel="' + f.lienzo + '">Marcar la zona a mano</button>';
      });
      h += '</div>';
    }
    return h + '</article>';
  }
  function meta(p, info) {
    var art = document.querySelector('.pax[data-id="' + p.id + '"]'); if (!art) return;
    var i = info[p.id] || { tipo: 'ADT' }, S = ST.gds === 'S';
    var num = i.tipo === 'INF' ? (i.adulto ? 'INF · con ' + (S ? i.n + '.1' : 'P' + i.n) : 'INF') : (S ? i.n + '.1' : 'P' + i.n);
    var tipoTxt = { ADT: 'Adulto', CHD: 'Niño', INF: 'Infante' }[i.tipo];
    var src = p.fuentes.filter(function (f, k, a) { return a.indexOf(f) === k; }).join(' · ');
    var ver = p.verificado === true ? '<span class="tag ok">✓ Documento leído y verificado</span>' : (p.verificado === false ? '<span class="tag warn">Leído con dudas</span>' : '');
    art.querySelector('[data-meta]').innerHTML = '<span class="num">' + num + '</span><span class="who">' + esc((L(p.apellidos) || '—') + ' / ' + (L(p.nombres) || '—')) + '</span><span class="tag">' + tipoTxt + (i.tit ? ' · ' + i.tit : '') + '</span>' + ver + (src ? '<span class="tag" title="Origen de los datos">' + esc(src) + '</span>' : '') + '<button type="button" class="s del" data-del="' + p.id + '" title="Quitar pasajero">Quitar</button>';
    var e = art.querySelector('[data-edad]'); if (e) e.textContent = i.edad !== null && i.edad !== undefined ? i.edad + (i.edad === 1 ? ' año' : ' años') + (ST.fviaje ? ' al viajar' : '') : '';
    var sx = art.querySelector('.sx'); if (sx) sx.classList.toggle('falta', !p.sexo);
    art.querySelector('[data-av]').innerHTML = avisos(p, i).map(function (a) { return '<li class="' + (a.k === 'err' ? 'err' : (a.k === 'ok' ? 'ok' : '')) + '">' + esc(a.t) + (a.i !== undefined ? ' <button type="button" class="lnk" data-oc="' + a.i + '" title="Ocultar este aviso">ocultar</button>' : '') + '</li>'; }).join('');
  }
  function render(todo) {
    var info = calcular();
    if (todo) {
      var c = $('paxs');
      if (!ST.pax.length) c.innerHTML = '<div class="vacio"><b>Todavía no hay pasajeros.</b><br>Cargá la foto o el PDF del pasaporte, o pegá los datos en texto.</div>';
      else {
        var orden = ULT.orden.map(function (x) { return x.p.id; });
        var ps = ST.pax.slice().sort(function (a, b) { return orden.indexOf(a.id) - orden.indexOf(b.id); });
        c.innerHTML = ps.map(function (p) { return tarjeta(p, info); }).join('') + DOCS_OPC;
      }
      firmaCartas = firma();
      $('npax').textContent = ST.pax.length ? '(' + ST.pax.length + ')' : '';
    }
    ST.pax.forEach(function (p) { meta(p, info); });
    renderOut();
    if (todo && ultimo) { var a = document.querySelector('.pax[data-id="' + ultimo + '"]'); if (a) { a.classList.add('marca'); setTimeout(function () { a.classList.remove('marca'); }, 1300); } ultimo = null; }
  }
  var tRender = null;
  function firma() { return JSON.stringify(ULT ? ULT.orden.map(function (x) { return [x.p.id, x.tipo, x.n, x.adulto ? 1 : 0]; }) : []); }
  var firmaCartas = '';
  // Mientras se escribe sólo se actualizan encabezados, avisos y comandos (sin reconstruir las tarjetas)
  function cambio() {
    clearTimeout(tRender);
    tRender = setTimeout(function () { render(false); }, 90);
  }
  // Reconstruye las tarjetas (orden, tipo) conservando el campo donde estaba el cursor
  function rehacer() {
    var a = document.activeElement, art = a && a.closest && a.closest('.pax'), f = a && a.getAttribute && a.getAttribute('data-f');
    var id = art && art.getAttribute('data-id'), sel = a && typeof a.selectionStart === 'number' ? a.selectionStart : null;
    render(true);
    if (id && f) { var n = document.querySelector('.pax[data-id="' + id + '"] [data-f="' + f + '"]'); if (n) { n.focus(); try { if (sel !== null) n.setSelectionRange(sel, sel); } catch (e) { } } }
  }
  $('paxs').addEventListener('focusout', function () {
    setTimeout(function () { calcular(); if (firma() !== firmaCartas) rehacer(); }, 0);
  });
  function porId(id) { return ST.pax.filter(function (p) { return p.id === +id; })[0]; }

  // eventos de las tarjetas
  $('paxs').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f'), art = e.target.closest('.pax'); if (!f || !art) return;
    var p = porId(art.getAttribute('data-id')), v = e.target.value;
    if (/^(nac|ppVenc|ciVenc)$/.test(f)) {
      var fd = deDmy(v);
      // año de 2 cifras en nacimiento: siglo pasado si quedaría en el futuro
      if (fd && f === 'nac' && /\d{2}$/.test(v.trim()) && !/\d{4}$/.test(v.trim()) && new Date(fd.y, fd.m - 1, fd.d) > new Date()) fd.y -= 100;
      p[f] = fd; e.target.classList.toggle('mal', !!v.trim() && !fd);
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
    if (/^(nac|ppVenc|ciVenc)$/.test(f) && p[f]) { e.target.value = dmy(p[f]); e.target.classList.remove('mal'); }
    if (f === 'tel' && p.tel) { var t = TEXTO.telefono(p.tel, ST.codpais); if (t) { p.tel = t.num; e.target.value = t.num; if (t.aviso) toast(t.aviso); } }
    if (/^(nacionalidad|ppEmisor|ciEmisor)$/.test(f)) { e.target.value = p[f]; if (p[f] && !PAISES[p[f]]) toast('Código de país desconocido: usá el de 3 letras (URY, ARG, BRA…)'); }
    if (f === 'docUsar' || f === 'tipoManual' || f === 'infanteDe') { rehacer(); return; }
    cambio();
  });
  $('paxs').addEventListener('click', function (e) {
    var b = e.target.closest('button,img'); if (!b) return;
    var art = b.closest('.pax'), p = art && porId(art.getAttribute('data-id'));
    if (b.hasAttribute('data-del')) { ST.pax = ST.pax.filter(function (q) { return q !== p; }); render(true); toast('Pasajero quitado'); return; }
    if (b.hasAttribute('data-sx')) { p.sexo = b.getAttribute('data-sx'); art.querySelectorAll('[data-sx]').forEach(function (x) { x.classList.toggle('on', x === b); }); cambio(); return; }
    if (b.hasAttribute('data-mv')) {
      var A = L(p.apellidos).split(' ').filter(Boolean), N = L(p.nombres).split(' ').filter(Boolean);
      if (b.getAttribute('data-mv') === 'an' && A.length > 1) N.push(A.shift());
      else if (b.getAttribute('data-mv') === 'na' && N.length > 1) A.unshift(N.pop());
      p.apellidos = A.join(' '); p.nombres = N.join(' ');
      art.querySelector('[data-f=apellidos]').value = p.apellidos; art.querySelector('[data-f=nombres]').value = p.nombres;
      p.avisosF.forEach(function (a, k) { if (/nombres y cuáles apellidos/.test(a.t)) p.ocultos[k] = 1; });
      cambio(); return;
    }
    if (b.hasAttribute('data-oc')) { p.ocultos[+b.getAttribute('data-oc')] = 1; render(false); return; }
    if (b.hasAttribute('data-ver')) { var f = p.fotos[+b.getAttribute('data-ver')]; verImagen(f.lienzo && LIENZOS[f.lienzo] ? LIENZOS[f.lienzo] : null, f.mrz || f.foto); return; }
    if (b.hasAttribute('data-rel')) { zonaManual(b.getAttribute('data-rel'), p.id); return; }
  });

  // comandos: copiar
  $('out').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-t')) { var t = b.getAttribute('data-t'); copiar(t).then(function () { ST.hechos[t] = 1; b.classList.add('hecho'); b.querySelector('.cp').textContent = '✓ copiado'; toast('Copiado: ' + t.slice(0, 40)); }); }
    if (b.hasAttribute('data-sec')) { var ls = textoSec(b.getAttribute('data-sec')); copiar(ls.join('\n')).then(function () { ls.forEach(function (t) { ST.hechos[t] = 1; }); renderOut(); toast(ls.length + ' líneas copiadas'); }); }
  });
  $('copTodo').addEventListener('click', function () {
    var ls = []; SECS.forEach(function (s) { ls = ls.concat(textoSec(s[0])); });
    copiar(ls.join('\n')).then(function () { ls.forEach(function (t) { ST.hechos[t] = 1; }); renderOut(); toast(ls.length + ' líneas copiadas'); });
  });

  // ---------- texto ----------
  function leerTexto() {
    var t = $('txt').value; if (!t.trim()) { toast('Pegá primero los datos en el recuadro'); return; }
    var r = TEXTO.parse(t, { codPais: ST.codpais }), n = 0, antes = ST.pax.length;
    r.pasajeros.forEach(function (x) { var q = x.mrz ? desdeMRZ(x.mrz, 'MRZ pegada') : desdeTexto(x, 'texto'); if (fusionar(q)) n++; });
    if (!n) { toast('No encontré datos de pasajeros en el texto'); return; }
    var nuevos = ST.pax.length - antes;
    render(true);
    toast(nuevos ? (nuevos === 1 ? 'Se agregó 1 pasajero' : 'Se agregaron ' + nuevos + ' pasajeros') : 'Datos sumados al pasajero existente');
  }
  $('leer').addEventListener('click', leerTexto);
  $('txt').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); leerTexto(); } });
  $('manual').addEventListener('click', function () {
    var p = nuevo({ fuentes: ['a mano'] }); ST.pax.push(p); ultimo = p.id; render(true);
    var i = document.querySelector('.pax[data-id="' + p.id + '"] [data-f=apellidos]'); if (i) { i.focus(); i.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });
  $('limpiar').addEventListener('click', function () {
    if ((ST.pax.length || $('txt').value) && !confirm('¿Borrar todos los pasajeros cargados y el texto?')) return;
    ST.pax = []; ST.hechos = {}; $('txt').value = ''; $('cola').innerHTML = ''; LIENZOS = {}; render(true);
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
    $('docsComp').checked = !!ST.docsComp; $('titF').value = ST.titF; $('codpais').value = ST.codpais; $('fviaje').value = ST.fviaje;
  }
  $('gds').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; ST.gds = b.getAttribute('data-g'); guardarConf(); sincOpc(); render(true); });
  $('docsComp').addEventListener('change', function () { ST.docsComp = this.checked; guardarConf(); render(false); });
  $('titF').addEventListener('change', function () { ST.titF = this.value; guardarConf(); render(false); });
  $('codpais').addEventListener('change', function () { ST.codpais = this.value.replace(/\D/g, '') || '598'; this.value = ST.codpais; guardarConf(); });
  $('fviaje').addEventListener('change', function () {
    var f = deDmy(this.value); this.classList.toggle('mal', !!this.value.trim() && !f);
    if (f || !this.value.trim()) { ST.fviaje = f ? dmy(f) : ''; this.value = ST.fviaje; render(true); }
  });
  sincOpc(); render(true);
  // precarga del lector en segundo plano cuando la página queda quieta
  if ('requestIdleCallback' in window) requestIdleCallback(function () { OCR.motor().catch(function () { }); }, { timeout: 6000 });
})();
