/* ===== Armado de comandos para Amadeus y Sabre =====
   Amadeus: NM / SR DOCS / SR FOID / SRCTCE / SRCTCM (asociación /Pn, sólo si hay más de un pasajero)
   Sabre:   -APELLIDO/NOMBRE / 3DOCS / 3FOID / 3CTCE / 3CTCM (asociación -n.1)               */
var CMD = (function () {
  var MES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function f(d) { return d ? (d.d < 10 ? '0' : '') + d.d + MES[d.m - 1] + String(d.y).slice(-2) : ''; }
  function mail(e) { return String(e || '').trim().toUpperCase().replace(/@/g, '//').replace(/_/g, '..').replace(/-/g, './'); }
  function tel(t) { return String(t || '').replace(/\D/g, ''); }
  function edad(nac, ref) {
    if (!nac) return null;
    var a = ref.getFullYear() - nac.y;
    if (ref.getMonth() + 1 < nac.m || (ref.getMonth() + 1 === nac.m && ref.getDate() < nac.d)) a--;
    return a;
  }
  function tipoPax(p, ref) {
    if (p.tipoManual) return p.tipoManual;
    var e = edad(p.nac, ref);
    if (e === null) return 'ADT';
    return e < 2 ? 'INF' : (e < 12 ? 'CHD' : 'ADT');
  }
  function titulo(p, tipo, tituloF) {
    if (p.tituloManual) return p.tituloManual;
    if (tipo === 'INF') return '';
    if (p.sexo === 'M') return tipo === 'CHD' ? 'MSTR' : 'MR';
    if (p.sexo === 'F') return tipo === 'CHD' ? 'MISS' : (tituloF || 'MRS');
    return '';
  }
  function cmp(a, b) {
    var x = a.apellidos || '', y = b.apellidos || '';
    if (x !== y) return x < y ? -1 : 1;
    x = a.nombres || ''; y = b.nombres || '';
    return x < y ? -1 : x > y ? 1 : 0;
  }
  function pais2(a3) { return a3 && typeof PAISES !== 'undefined' && PAISES[a3] ? PAISES[a3][0] : ''; }

  // Ordena, numera y asocia infantes a adultos
  function preparar(lista, o) {
    var ref = o.fechaViaje || new Date();
    var ps = lista.map(function (p) { var t = tipoPax(p, ref); return { p: p, tipo: t, edad: edad(p.nac, ref), tit: titulo(p, t, o.tituloF) }; });
    var con = ps.filter(function (x) { return x.tipo !== 'INF'; }), inf = ps.filter(function (x) { return x.tipo === 'INF'; });
    // Amadeus muestra los nombres por orden alfabético de apellido; se cargan en ese mismo orden
    con.sort(function (a, b) { return cmp(a.p, b.p); });
    con.forEach(function (x, i) { x.n = x.p.numManual ? +x.p.numManual : i + 1; });
    var adultos = con.filter(function (x) { return x.tipo === 'ADT'; }), avisos = [];
    inf.forEach(function (x) {
      var a = x.p.infanteDe ? adultos.filter(function (y) { return y.p.id === x.p.infanteDe; })[0] : null;
      if (!a) a = adultos.filter(function (y) { return !y.inf && y.p.apellidos && x.p.apellidos && (' ' + x.p.apellidos + ' ').indexOf(' ' + y.p.apellidos.split(' ')[0] + ' ') >= 0; })[0];
      if (!a) a = adultos.filter(function (y) { return !y.inf; })[0];
      if (a && !a.inf) { a.inf = x; x.adulto = a; x.n = a.n; }
      else avisos.push('El infante ' + (x.p.apellidos || '') + ' ' + (x.p.nombres || '') + ' no tiene un adulto libre con quien viajar');
    });
    return { con: con, inf: inf, todos: con.concat(inf), avisos: avisos, multi: con.length > 1 || inf.length > 0 };
  }

  function docData(p) {
    var usarCI = p.docUsar === 'NI' || (!p.ppNum && p.ciNum);
    return usarCI
      ? { foid: 'NI', docs: 'I', num: p.ciNum, em: p.ciEmisor || p.nacionalidad || 'URY', venc: p.ciVenc }
      : { foid: 'PP', docs: 'P', num: p.ppNum, em: p.ppEmisor || p.nacionalidad || '', venc: p.ppVenc };
  }
  function falta(x, campos) { var f2 = []; campos.forEach(function (c) { if (!c[1]) f2.push(c[0]); }); return f2.length ? f2.join(', ') : ''; }

  function generar(lista, o) {
    o = o || {};
    var P = preparar(lista, o), S = o.gds === 'S', out = { nombres: [], docs: [], foid: [], ctc: [], extra: [] };
    function L(sec, t, x, nota) { out[sec].push({ t: t, id: x && x.p.id, nota: nota || '' }); }
    function F(sec, x, que) { out[sec].push({ t: null, id: x && x.p.id, falta: que }); }
    function asoc(n) { return S ? '-' + n + '.1' : (P.multi ? '/P' + n : ''); }
    var ap = function (x) { return x.p.apellidos || ''; }, no = function (x) { return x.p.nombres || ''; };

    // ---- nombres ----
    P.con.forEach(function (x) {
      var fl = falta(x, [['apellido', ap(x)], ['nombre', no(x)]]);
      if (fl) { F('nombres', x, fl); return; }
      var tit = x.tit ? ' ' + x.tit : '';
      if (S) {
        L('nombres', '-' + ap(x) + '/' + no(x) + tit, x);
      } else {
        var extra = '';
        if (x.tipo === 'CHD' && x.p.nac) extra = ' (CHD/' + f(x.p.nac) + ')';
        if (x.inf) {
          var i = x.inf, sa = ap(i) === ap(x) ? '' : ap(i);
          extra = i.p.nac ? ' (INF' + sa + '/' + no(i) + '/' + f(i.p.nac) + ')' : '';
          if (!i.p.nac) F('nombres', i, 'fecha de nacimiento del infante');
        }
        L('nombres', 'NM1' + ap(x) + '/' + no(x) + tit + extra, x);
      }
    });
    if (S) P.inf.forEach(function (x) { if (x.adulto) L('nombres', '-I/' + ap(x) + '/' + no(x), x, 'Infante con ' + no(x.adulto).split(' ')[0]); });

    // ---- DOCS ----
    P.todos.forEach(function (x) {
      if (x.tipo === 'INF' && !x.adulto) return;
      var p = x.p, g = p.sexo === 'M' || p.sexo === 'F' ? p.sexo + (x.tipo === 'INF' ? 'I' : '') : (p.sexo === 'X' ? 'X' : '');
      var d = docData(p), comp = !!o.docsCompleto;
      var need = [['fecha de nacimiento', p.nac], ['sexo', g], ['apellido', ap(x)], ['nombre', no(x)]];
      if (comp) need = need.concat([['número de documento', d.num], ['país emisor', d.em], ['nacionalidad', p.nacionalidad || d.em]]);
      var fl = falta(x, need);
      if (fl) { F('docs', x, fl); return; }
      var nm = no(x).split(' '), first = nm[0], mid = nm.slice(1).join(' ');
      if (S) {
        var nmS = ap(x) + '/' + first + (mid ? '/' + mid : '');
        if (comp) L('docs', '3DOCS/' + d.docs + '/' + d.em + '/' + d.num + '/' + (p.nacionalidad || d.em) + '/' + f(p.nac) + '/' + g + '/' + f(d.venc) + '/' + nmS + asoc(x.n), x);
        else L('docs', '3DOCS/DB/' + f(p.nac) + '/' + g + '/' + nmS + asoc(x.n), x);
        if (x.tipo === 'CHD') L('docs', '3CHLD/' + f(p.nac) + asoc(x.n), x, 'Niño');
        if (x.tipo === 'INF') L('docs', '3INFT/' + ap(x) + '/' + no(x) + '/' + f(p.nac) + asoc(x.n), x, 'Infante');
      } else {
        if (comp) L('docs', 'SR DOCS HK1-' + d.docs + '-' + d.em + '-' + d.num + '-' + (p.nacionalidad || d.em) + '-' + f(p.nac) + '-' + g + '-' + f(d.venc) + '-' + ap(x) + '-' + no(x) + asoc(x.n), x);
        else L('docs', 'SR DOCS HK1-----' + f(p.nac) + '-' + g + '--' + ap(x) + '-' + no(x) + asoc(x.n), x);
      }
    });

    // ---- FOID ----
    P.con.forEach(function (x) {
      var d = docData(x.p), em2 = pais2(d.em);
      var fl = falta(x, [['número de documento', d.num], ['país del documento', em2]]);
      if (fl) { F('foid', x, fl); return; }
      L('foid', (S ? '3FOID/' : 'SR FOID-') + d.foid + em2 + d.num + asoc(x.n), x);
    });

    // ---- contactos ----
    var conCtc = P.con.filter(function (x) { return x.p.email || x.p.tel; });
    var todos = o.contactoTodos && conCtc.length === 1 && P.con.length > 1;
    P.con.forEach(function (x) {
      var src = todos ? conCtc[0] : x;
      if (todos && S === false && x !== conCtc[0]) return; // en Amadeus sin asociación vale para todos
      if (!src.p.email && !src.p.tel) return;
      var a = todos && !S ? '' : asoc(x.n);
      if (src.p.email) L('ctc', (S ? '3CTCE/' : 'SRCTCE-') + mail(src.p.email) + a, x, todos && !S ? 'Para todos los pasajeros' : '');
      if (src.p.tel) L('ctc', (S ? '3CTCM/' : 'SRCTCM-') + tel(src.p.tel) + a, x, todos && !S ? 'Para todos los pasajeros' : '');
    });
    if (!conCtc.length && P.con.length) out.ctc.push({ t: null, falta: 'mail y celular del pasajero (contacto obligatorio)' });

    return { secciones: out, orden: P.todos, avisos: P.avisos };
  }

  return { generar: generar, fecha: f, mail: mail, tipoPax: tipoPax, edad: edad, preparar: preparar };
})();
if (typeof module !== 'undefined') module.exports = CMD;
