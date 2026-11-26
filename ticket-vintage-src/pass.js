/* Ticket Vintage — versión Boarding pass.
   Copia del boarding pass turquesa de Tu Itinerario (index.html), generada por pass_from_index.py: no editar a mano.
   Agregados para el boleto: pasajeros con boletos y código de reserva (it.whoHTML), franja con cabina, equipaje y
   asientos debajo de cada vuelo (o.extra), saludo en el talón (o.msg) y al pie (o.foot). */
var TVPASS = (function () {
var U = HV.util, esc = HV.esc;
function pbExtra(s, o, n, mid) { var h = o.extra ? o.extra(s) : ''; return h ? '<tr><td colspan="' + n + '" bgcolor="#F6FDFC" style="background:#F6FDFC;border-top:1px solid #E3F4F2;' + (mid ? '' : 'border-radius:0 0 10px 10px;') + 'padding:7px 16px">' + h + '</td></tr>' : ''; }
function pbFoot(o) { return o.foot || ''; }
function pbMsg(n, o, w, h, extra) { return o.msg ? o.msg(w, extra) : pbImg(n, o, w, h, extra); }
var F = 'font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%;';
var IMG_V = '?v=hv1'; /* cambia al renovar imágenes alojadas, para que el correo no use la copia vieja */
function srcLogo(code, o) {
  var has = typeof LOGOS !== 'undefined' && LOGOS[code];
  if (!has) return '';
  return o.urls ? o.urls + 'al/' + code + '.png' : LOGOS[code];
}
function pimg(n, o) { if (o.bf && PIMG[n.replace('.png', '-bf.png')]) n = n.replace('.png', '-bf.png'); else if (o.hv && PIMG[n.replace('.png', '-tq.png')]) n = n.replace('.png', '-tq.png'); return o.urls ? o.urls + n + IMG_V : PIMG[n]; }
function isWide(code) { return !!WIDE_LOGOS[code]; }
function logoAt(code, o, sz) {
  var WIDE = WIDE_LOGOS; var _x = { H2: ['al-H2-wide.png', 1.5, 61 / 160], JA: ['al-JA-wide.png', 2.1, 47 / 200], WJ: ['al-JA-wide.png', 2.1, 47 / 200] };
  if (WIDE[code]) { var wd = WIDE[code], ww = Math.round(sz * wd[1]); return '<img src="' + pimg(wd[0], o) + '" alt="" width="' + ww + '" height="' + Math.round(ww * wd[2]) + '" style="display:block;width:' + ww + 'px;min-width:' + ww + 'px;max-width:none;height:auto;border:0">'; }
  var src = srcLogo(code, o), a = U.alInfo(code);
  if (src) return '<img src="' + src + '" alt="" width="' + sz + '" height="' + sz + '" style="display:block;width:' + sz + 'px;height:' + sz + 'px;border:0">';
  return '<span style="display:inline-block;width:' + sz + 'px;height:' + sz + 'px;line-height:' + sz + 'px;font-size:' + Math.round(sz * 0.42) + 'px;font-weight:bold;text-align:center;background:' + a.color + ';color:' + a.fg + '">' + esc(code) + '</span>';
}
function apNick(code) {
  var n = U.apName(code), city = U.apCity(code);
  if (n && city && n.toLowerCase().indexOf(city.toLowerCase() + ' ') === 0 && n.length > city.length + 3) n = n.slice(city.length + 1);
  return n && !/^Todos/.test(n) && n !== 'Internacional' && n.toLowerCase() !== city.toLowerCase() ? n : '';
}
var PAX_ROWS = { 1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3 };
function paxGrid(pax, st, align, one) {
  var n = pax.length, rows = one ? n : (PAX_ROWS[n] || 3), cols = Math.ceil(n / rows), h = '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse' + (align === 'right' ? ';margin-left:auto' : '') + '"><tr>';
  for (var c = 0; c < cols; c++) {
    h += '<td style="padding:0 0 0 ' + (c ? 18 : 0) + 'px;vertical-align:top;text-align:left">';
    for (var r = 0; r < rows; r++) { var x = pax[c * rows + r]; if (x) h += '<div style="' + st + ';white-space:nowrap;line-height:' + (one ? 1.35 : 1.4) + '">' + esc(x) + '</div>'; }
    h += '</td>';
  }
  return h + '</tr></table>';
}
function opName(s) { return s.cs ? (s.opCode && HV.AIR[s.opCode] ? HV.AIR[s.opCode].name : U.titleCase(s.opName)) : ''; }
function csNote(s, o, fs, pl) {
  var n = o && o.cs ? opName(s) : ''; if (!n) return '';
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:' + fs + 'px;line-height:1.25;color:#3C5654;font-weight:normal;white-space:normal;padding:2px 0 0 ' + (pl || 0) + 'px">Operado por ' + esc(n) + '</div>';
}
function jLabel(calc, ix) {
  var J = calc.journeys, n = J.length, c0 = U.apCity(J[0].from), cl = U.apCity(J[n - 1].to);
  if (n === 1) return c0 === cl ? 'Recorrido' : 'Ida';
  var round = c0 === cl;
  if (ix === 0) return 'Ida';
  if (ix === n - 1 && round) return 'Vuelta';
  return 'Tramo ' + (ix + 1);
}
function totLabel(lbl) { return lbl === 'Recorrido' ? 'del recorrido' : (lbl === 'Ida' || lbl === 'Vuelta' ? 'de la ' + lbl.toLowerCase() : 'del ' + lbl.toLowerCase()); }
var BFHEAD = '#0B0B0B', BFNEON = '#12CFD0';
var BFC = {'#1B6368': '#111111', '#1A474B': '#141414', '#465F5C': '#5C5C5C', '#345E59': '#4A4A4A', '#C9ECE8': '#E0E0E0', '#0C7A76': '#0B0B0B', '#0A6E6C': '#0B0B0B', '#17A28F': '#12CFD0', '#F4FEFD': '#F7F7F7', '#E4FCF9': '#EFEFEF', '#E3FCF9': '#F0F0F0', '#EEFDFB': '#F5F5F5', '#F6FDFC': '#F8F8F8', '#DCF3F1': '#E6E6E6', '#D6F3F0': '#E2E2E2', '#E3F4F2': '#ECECEC', '#148D7E': '#00838A', '#1AA18E': '#12CFD0', '#12D9BB': '#12CFD0', '#42A89C': '#12CFD0', '#29635E': '#333333', '#568F89': '#8A8A8A'};
var PB_CITY = 'font-size:19px;font-weight:bold;letter-spacing:0.2px';
var HVC = { '#1B6368': '#318A90', '#1A474B': '#1C3D3F', '#465F5C': '#495B5C', '#345E59': '#375658', '#C9ECE8': '#C2E5E7', '#0C7A76': '#308A90', '#0A6E6C': '#2C8187', '#17A28F': '#59B9BF',
  '#F4FEFD': '#F3FBFB', '#E4FCF9': '#C9EBED', '#E3FCF9': '#E0F3F4', '#EEFDFB': '#ECF7F8', '#F6FDFC': '#F4FBFB', '#DCF3F1': '#D1EBEC', '#D6F3F0': '#CAE7E8', '#E3F4F2': '#DFEFF0',
  '#148D7E': '#2D8A90', '#1AA18E': '#4AADB3', '#12D9BB': '#FFFFFF', '#42A89C': '#59B9BF', '#29635E': '#48979C', '#568F89': '#5E8789' };
var HVHEAD = '#59B9BF', HVBOX = 'background:#59B9BF;', HVTS = 'text-shadow:0 1px 2px rgba(8,44,46,0.45);'; /* encabezado y barras de tramo en turquesa; sombra suave para que el blanco se lea nítido */
function pbHV(h, bf) { if (bf) return h.split(';color:#FFFFFF;white-space:nowrap').join(';color:' + BFNEON + ';white-space:nowrap').split('bgcolor="#0C7A76" style="border-collapse:separate;background:#0C7A76;background-image:linear-gradient(90deg,#0A6E6C,#17A28F);').join('bgcolor="' + BFHEAD + '" style="border-collapse:separate;background:' + BFHEAD + ';').replace(/#[0-9A-Fa-f]{6}\b/g, function (c) { return BFC[c.toUpperCase()] || c; }); return h.split(';color:#FFFFFF;white-space:nowrap').join(';color:#FFFFFF;white-space:nowrap;' + HVTS).split('bgcolor="#0C7A76" style="border-collapse:separate;background:#0C7A76;background-image:linear-gradient(90deg,#0A6E6C,#17A28F);').join('bgcolor="#59B9BF" style="border-collapse:separate;' + HVBOX).replace(/#[0-9A-Fa-f]{6}\b/g, function (c) { return HVC[c.toUpperCase()] || c; }); }
var PB = { NAVY: '#1B6368', INK: '#1A474B', MUT: '#465F5C', LBL: '#345E59', LINE: '#C9ECE8', GRN: '#1F8A5B', ORG: '#D9650B' };
function pbLab(t, c) { return '<div style="' + F + 'font-size:9.5px;letter-spacing:1px;color:' + (c || PB.LBL) + ';text-transform:uppercase;line-height:1.3;white-space:nowrap">' + t + '</div>'; }
function pbSep() { return '<td width="1" bgcolor="' + PB.LINE + '" style="width:1px;background:' + PB.LINE + ';padding:0;font-size:1px;line-height:1px">&nbsp;</td>'; }
function pbImg(n, o, w, h, extra) { return '<img src="' + pimg(n, o) + '" alt="" width="' + w + '" height="' + h + '" style="display:block;width:' + w + 'px;min-width:' + w + 'px;max-width:none;height:auto;border:0;' + (extra || '') + '">'; }
function pbIcoRow(ico, o, inner) { return '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:0 8px 0 0;vertical-align:middle">' + pbImg(ico, o, 20, 20) + '</td><td style="' + F + 'padding:0;vertical-align:middle;white-space:nowrap">' + inner + '</td></tr></table>'; }
function pbOff(n) { return n ? '<sup style="font-size:11px;color:#E06A00;font-weight:bold;vertical-align:top;line-height:1">&nbsp;' + (n > 0 ? '+' : '−') + Math.abs(n) + '</sup>' : ''; }
function pbLay(lay, o, valSize) {
  var short = false, chg = lay.flags.indexOf('change') >= 0;
  var c = short ? PB.ORG : PB.GRN, t = short ? (lay.flags.indexOf('overlap') >= 0 ? 'Superpuesto' : 'Conexión corta') : 'Tránsito';
  return { ico: short ? 'ic-warn.png' : 'ic-sync.png', c: c, t: t, v: '<b style="font-size:' + valSize + 'px;color:' + c + '">' + HV.fmtDur(lay.min) + '</b>' + (chg ? '<div style="font-size:10px;color:' + PB.ORG + ';font-weight:bold">cambia aeropuerto</div>' : '') };
}
function pbWho(it) {
  if (it.whoHTML) return it.whoHTML; /* Ticket Vintage */
  var pax = (it.pax || []).filter(Boolean), lab = function (t) { return '<span style="font-size:9.5px;letter-spacing:1px;color:' + PB.LBL + '">' + t + '</span>'; };
  if (!pax.length && !it.advisor) return '';
  if (pax.length <= 1) {
    var w = [];
    if (pax.length) w.push(lab('PASAJERO') + '&nbsp; <b>' + esc(pax[0]) + '</b>');
    if (it.advisor) w.push(lab('ASESOR') + '&nbsp; <b>' + esc(it.advisor) + '</b>');
    return '<div style="' + F + 'font-size:12px;color:' + PB.INK + ';padding:0 2px 12px">' + w.join(' &nbsp;&nbsp;·&nbsp;&nbsp; ') + '</div>';
  }
  return '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:0 2px 12px"><tr><td style="' + F + 'padding:1px 10px 0 0;vertical-align:top">' + lab('PASAJEROS') + '</td><td style="padding:0;vertical-align:top">' + paxGrid(pax, F + 'font-size:12px;font-weight:bold;color:' + PB.INK) + '</td>' +
    (it.advisor ? '<td style="' + F + 'padding:1px 0 0 28px;vertical-align:top;font-size:12px;color:' + PB.INK + ';white-space:nowrap">' + lab('ASESOR') + '&nbsp; <b>' + esc(it.advisor) + '</b></td>' : '') + '</tr></table>';
}
function pbNote(calc, txt, o) {
  var anyDay = calc.segs.some(function (s) { return s.dayDiff; });
  return '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-top:2px"><tr><td style="padding:0 7px 0 2px;vertical-align:middle">' + pbImg('ic-plane-cyan.png', o, 16, 16) + '</td><td style="' + F + 'padding:0;vertical-align:middle;font-size:11px;color:' + PB.MUT + '">Horarios locales de cada ciudad.' + (txt || (anyDay ? ' +1: llega al día siguiente.' : '')) + '</td></tr></table>';
}
function pbTot(j, lbl, o) {
  return j.stops > 0 && o.tot ? '<div style="' + F + 'font-size:11.5px;color:#1F5E45;text-align:right;padding:6px 4px 0">Duración total ' + totLabel(lbl) + ': <b>' + HV.fmtDur(j.total) + '</b> <span style="color:#5E7A6E">(' + HV.fmtDur(j.flight) + ' de vuelo + ' + HV.fmtDur(j.lay) + ' de tránsito)</span></div>' : '';
}
function pbStubRoute(J) {
  var C = U.apCity, n = J.length;
  var round = n === 2 && C(J[0].from) === C(J[1].to) && C(J[0].to) === C(J[1].from);
  /* cadena de ciudades: avión entre tramos volados; puntos donde el PNR no incluye el traslado (open jaw) */
  var pts = [];
  J.forEach(function (j, i) {
    if (!i) pts.push({ c: C(j.from) });
    else if (C(j.from) !== pts[pts.length - 1].c) pts.push({ gap: true }, { c: C(j.from) });
    pts.push({ fly: true }, { c: C(j.to) });
  });
  var lbl = round ? 'IDA Y VUELTA' : (n === 1 ? (C(J[0].from) === C(J[0].to) ? '' : 'SOLO IDA') : 'MULTIDESTINO');
  if (round) pts = [{ c: C(J[0].from) }, { fly: true }, { c: C(J[0].to) }];
  return { pts: pts, label: lbl, gap: pts.some(function (p) { return p.gap; }) };
}
function pbStubWrap(body, J, o, compact) {
  var R = pbStubRoute(J), INK = PB.INK, dash = 'border-left:2px dashed #1AA18E;', W = 280, hv = !!o.hv, noHdr = o.hdr === false, noStub = o.stub === false; /* noStub: sin el talón derecho (código de barras y mensaje) */
  var ACC = '#148D7E', SBG = '#E4FCF9', SBD = '#D6F3F0', NAV = PB.NAVY, BBG = '#F4FEFD', sw = pimg('stub-swoosh.png', o), logo = 'pass-logo.png', lo = 'lo-hacemos.png', RULE = '#42A89C';
  if (hv) { body = pbHV(body, o.bf); INK = '#1C3D3F'; ACC = '#2D8A90'; SBG = '#E1F4F5'; SBD = '#C8E7E9'; NAV = HVHEAD; BBG = '#F3FBFB'; RULE = '#59B9BF'; dash = 'border-left:2px dashed #4AADB3;'; }
  if (o.bf) { INK = '#141414'; ACC = '#00838A'; SBG = '#F2F2F2'; SBD = '#E2E2E2'; NAV = BFNEON; BBG = '#F7F7F7'; RULE = BFNEON; dash = 'border-left:2px dashed ' + BFNEON + ';'; }
  var many = R.pts.length > 5, route = '';
  R.pts.forEach(function (p) {
    if (p.c) route += '<div style="' + F + 'font-size:' + (many ? 12 : 13) + 'px;font-weight:bold;letter-spacing:1px;color:' + INK + ';text-transform:uppercase;line-height:1.25">' + esc(p.c) + '</div>';
    else if (p.fly) route += pbImg('pass-plane-navy.png', o, many ? 15 : 20, many ? 15 : 20, 'margin:' + (many ? 3 : 7) + 'px auto');
    else route += '<div style="' + F + 'font-size:' + (many ? 16 : 18) + 'px;font-weight:bold;color:' + ACC + ';letter-spacing:1px;line-height:1;margin:' + (many ? 4 : 7) + 'px auto">//</div>';
  });
  if (R.label) route += '<div style="' + F + 'font-size:9.5px;letter-spacing:2px;color:' + (o.bf ? '#5C5C5C' : PB.MUT) + ';margin-top:8px;white-space:nowrap">' + R.label + '</div>';

  var mid = '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-top:' + (compact ? 12 : 22) + 'px"><tr>' +
    '<td width="34" style="width:34px;min-width:34px;padding:0;font-size:1px;line-height:1px">&nbsp;</td>' +
    '<td style="padding:0;text-align:center;vertical-align:middle">' + (compact && (R.pts.length > 3 || compact === 1) ? '' : pbImg('stub-trail.png', o, 118, 38, 'margin:0 auto')) +
    (compact && (R.pts.length > 3 || compact === 1) ? '' : '<table align="center" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:14px auto 16px"><tr><td width="140" height="1" bgcolor="' + RULE + '" style="width:140px;height:1px;background:' + RULE + ';font-size:1px;line-height:1px">&nbsp;</td></tr></table>') + route + '</td>' +
    '<td width="34" style="width:26px;min-width:26px;padding:0 0 0 8px;vertical-align:middle">' + (compact === 1 ? pbImg('barcode.png', o, 18, 108) : pbImg('barcode.png', o, 26, 156)) + '</td></tr></table>';
  var stub = (noHdr ? '' : pbImg(logo, o, 180, 50, 'margin:0 auto')) +
    '<div style="' + F + 'font-size:' + (compact ? 15 : 17) + 'px;letter-spacing:1px;color:' + INK + ';line-height:1.3;margin-top:' + (noHdr ? 0 : 14) + 'px;font-weight:bold;text-align:center;white-space:nowrap">Tu próximo destino<br><span style="color:' + ACC + '">empieza acá</span></div>' +
    mid + (compact ? pbMsg(lo, o, 210, 46, 'margin:' + (compact === 1 ? 10 : 16) + 'px auto 0') : (R.pts.length > 3 ? '' : pbImg('stub-map.png', o, 170, 74, 'margin:22px auto 0;opacity:0.75')) +
    pbMsg(lo, o, 240, 52, 'margin:' + (R.pts.length > 3 ? 22 : 14) + 'px auto 0'));
  var head = '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr>' +
    '<td style="padding:14px 22px;vertical-align:middle"><img src="' + pimg(o.bf ? 'bf-head-negro.png' : 'pass-head.png', o) + '" alt="Tu Itinerario by Hiperviajes" width="275" height="40" style="display:block;width:275px;min-width:275px;max-width:none;height:auto;border:0"></td>' +
    '<td align="right" style="padding:14px 22px;vertical-align:middle;text-align:right"><table align="right" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="' + F + 'padding:0 12px 0 0;vertical-align:middle;font-size:13px;letter-spacing:4px;color:' + (o.bf ? '#0B0B0B;line-height:1.4' : hv ? '#FFFFFF;' + HVTS : '#12D9BB') + ';white-space:nowrap;font-weight:bold">' + (o.bf ? 'BLACK FRIDAY<br><span style="font-size:10px;letter-spacing:3px;color:#0B0B0B">BOARDING PASS</span>' : 'BOARDING PASS') + '</td><td style="padding:0;vertical-align:middle">' + pbImg(o.bf ? 'bf-avion-negro.png' : 'pass-plane-white.png', o, 24, 24) + '</td></tr></table></td></tr></table>';
  return '<table class="tt" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;margin:0">' +
    (noHdr ? '' : '<tr><td bgcolor="' + NAV + '" style="background:' + NAV + ';border-radius:' + (noStub ? '16px 16px 0 0' : '16px 0 0 0') + ';padding:0">' + head + '</td>' + (noStub ? '' :
    '<td width="' + W + '" bgcolor="' + NAV + '" style="width:' + W + 'px;min-width:' + W + 'px;background:' + NAV + ';' + dash + 'border-radius:0 16px 0 0;padding:14px 26px;vertical-align:middle;text-align:center">' + pbImg(o.bf ? 'bf-avion-negro.png' : 'pass-plane-white.png', o, 28, 28, 'margin:0 auto') + '</td>') + '</tr>') +
    '<tr><td valign="middle" bgcolor="' + BBG + '" style="background:' + BBG + ';border:1px solid ' + (o.bf ? '#E2E2E2' : hv ? '#CAE7E8' : '#D6F3F0') + ';' + (noHdr ? '' : 'border-top:0;') + (noStub ? '' : 'border-right:0;') + 'border-radius:' + (noStub ? (noHdr ? '16px' : '0 0 16px 16px') : (noHdr ? '16px 0 0 16px' : '0 0 0 16px')) + ';padding:16px 18px 12px;vertical-align:middle">' + body + '</td>' + (noStub ? '' :
    '<td width="' + W + '" valign="top" bgcolor="' + SBG + '" style="width:' + W + 'px;min-width:' + W + 'px;background-color:' + SBG + ';background-image:url(\'' + sw + '\');background-repeat:no-repeat;background-position:right bottom;background-size:' + (compact ? '170px 79px' : '220px 102px') + ';border:1px solid ' + SBD + ';' + (noHdr ? '' : 'border-top:0;') + dash + 'border-radius:' + (noHdr ? '0 16px 16px 0' : '0 0 16px 0') + ';padding:' + (compact === 1 ? '16px 14px 30px' : compact ? '18px 14px 40px' : '20px 14px 84px') + ';text-align:center;vertical-align:middle">' + stub + '</td>') + '</tr></table>';
}
function pbBigDate(d, firstYear) {
  var dw = U.fmtDate(d).split(' ');
  return '<div style="font-size:11px;letter-spacing:0.6px;text-transform:uppercase">' + esc(dw[0].replace(',', '')) + '</div><div style="font-size:19px;font-weight:bold;line-height:1.15;white-space:nowrap;text-transform:uppercase">' + esc(dw[1] + ' ' + dw[2]) + '</div>' + (d.y !== firstYear ? '<div style="font-size:11px;color:' + PB.MUT + '">' + d.y + '</div>' : '');
}
function passA(it, calc, o) {
  var NAVY = '#1B6368', INK = '#1A474B', MUT = '#465F5C', LBL = '#345E59', LINE = '#C9ECE8';
  var pax = (it.pax || []).filter(Boolean), firstYear = calc.first.depD.y, J = calc.journeys;
  var anyDay = calc.segs.some(function (s) { return s.dayDiff; });
  function lab(t) { return '<div style="' + F + 'font-size:9.5px;letter-spacing:1px;color:' + LBL + ';text-transform:uppercase;line-height:1.3;white-space:nowrap">' + t + '</div>'; }
  var sep = '<td width="1" bgcolor="' + LINE + '" style="width:1px;background:' + LINE + ';padding:0;font-size:1px;line-height:1px">&nbsp;</td>';
  function pt(kind, time, code, extra) {
    var ap = apNick(code);
    return lab(kind) + '<div style="' + F + 'font-size:22px;font-weight:bold;color:' + INK + ';line-height:1.15;white-space:nowrap">' + time + '</div>' +
      '<div style="' + F + 'font-size:13px;font-weight:bold;color:' + INK + ';line-height:1.3">' + esc(U.apCity(code)) + '</div>' +
      (ap ? '<div style="' + F + 'font-size:11px;color:' + MUT + ';line-height:1.3">' + esc(ap) + '</div>' : '');
  }
  function card(s, lay) {
    var dw = U.fmtDate(s.depD).split(' '), a = U.alInfo(s.al);
    var dd = s.dayDiff ? '<sup style="font-size:11px;color:#B45309;font-weight:bold;vertical-align:top;line-height:1">&nbsp;' + (s.dayDiff > 0 ? '+' : '−') + Math.abs(s.dayDiff) + '</sup>' : '';
    var dur = lab('Duración') + '<div style="' + F + 'font-size:17px;font-weight:bold;color:' + INK + ';line-height:1.25;white-space:nowrap">' + HV.fmtDur(s.dur) + '</div>';
    /* sin tránsito en boarding pass */
    return '<table width="803" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="width:803px;table-layout:fixed;border-collapse:separate;background:#FFFFFF;border:1px solid #DCF3F1;border-radius:10px"><tr>' +
      '<td width="100" style="' + F + 'width:74px;padding:18px 10px 18px 16px;vertical-align:middle;color:' + INK + '"><div style="font-size:11px;letter-spacing:0.6px;text-transform:uppercase">' + esc(dw[0]) + '</div><div style="font-size:19px;font-weight:bold;line-height:1.15;white-space:nowrap;text-transform:uppercase">' + esc(dw[1] + ' ' + dw[2]) + '</div>' + (s.depD.y !== firstYear ? '<div style="font-size:11px;color:' + MUT + '">' + s.depD.y + '</div>' : '') + '</td>' + sep +
      '<td width="158" style="width:130px;padding:18px 14px;vertical-align:middle"><table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:0 7px 0 0;vertical-align:middle">' + logoAt(s.al, o, 30) + '</td><td style="' + F + 'padding:0;vertical-align:middle;font-size:11px;font-weight:bold;color:' + INK + ';text-transform:uppercase;letter-spacing:0.3px;line-height:1.2">' + (isWide(s.al) ? '' : esc(a.name)) + '</td></tr></table>' +
      '<div style="height:6px;font-size:1px;line-height:6px">&nbsp;</div>' + lab('Vuelo') + '<div style="' + F + 'font-size:20px;font-weight:bold;color:' + INK + ';line-height:1.15;white-space:nowrap">' + esc(s.al) + ' ' + esc(s.fn) + '</div>' + csNote(s, o, 12) + '</td>' + sep +
      '<td width="165" style="width:145px;padding:18px 4px 18px 16px;vertical-align:middle">' + pt('Salida', esc(s.dep), s.from) + '</td>' +
      '<td width="80" style="width:72px;padding:0 4px;vertical-align:middle;text-align:center"><img src="' + pimg('pass-arrow.png', o) + '" alt="" width="72" height="18" style="display:block;width:72px;min-width:72px;max-width:none;height:auto;border:0;margin:0 auto"></td>' +
      '<td width="165" style="width:147px;padding:18px 14px 18px 4px;vertical-align:middle">' + pt('Llegada', esc(s.arr) + dd, s.to) + '</td>' + sep +
      '<td width="132" style="width:104px;padding:18px 14px;vertical-align:middle">' + dur + '</td></tr>' + pbExtra(s, o, 9) + '</table>';
  }
  var body = '';
  if (pax.length || it.advisor || it.whoHTML) {
    var w = [];
    body += pbWho(it);
  }
  J.forEach(function (j, ix) {
    var lbl = jLabel(calc, ix);
    body += '<table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0C7A76" style="border-collapse:separate;background:#0C7A76;background-image:linear-gradient(90deg,#0A6E6C,#17A28F);border-radius:10px"><tr><td style="padding:7px 16px"><table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr>' +
      '<td style="padding:0 10px 0 0;vertical-align:middle"><img src="' + pimg('pass-plane-white.png', o) + '" alt="" width="20" height="20" style="display:block;width:20px;min-width:20px;max-width:none;height:auto;border:0"></td>' +
      '<td style="' + F + 'padding:0;vertical-align:middle;font-size:15px;color:#FFFFFF;white-space:nowrap"><b style="letter-spacing:0.6px">' + esc(lbl.toUpperCase()) + '</b>&nbsp; · &nbsp;' + '<span style="' + PB_CITY + '">' + esc(U.apCity(j.from)) + ' → ' + esc(U.apCity(j.to)) + '</span>' + '</td></tr></table></td></tr></table>';
    j.segs.forEach(function (s, k) {
      body += '<div style="height:10px;font-size:1px;line-height:10px">&nbsp;</div>' + card(s, k < j.layovers.length ? j.layovers[k] : null);
    });
    if (j.stops > 0 && o.tot) body += '<div style="' + F + 'font-size:11.5px;color:#1F5E45;text-align:right;padding:6px 4px 0">Duración total ' + totLabel(lbl) + ': <b>' + HV.fmtDur(j.total) + '</b> <span style="color:#5E7A6E">(' + HV.fmtDur(j.flight) + ' de vuelo + ' + HV.fmtDur(j.lay) + ' de tránsito)</span></div>';
    body += '<div style="height:' + (ix < J.length - 1 ? 16 : 10) + 'px;font-size:1px;line-height:10px">&nbsp;</div>';
  });
  body += '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="' + F + 'padding:0;font-size:11px;color:' + MUT + '">Horarios locales de cada ciudad.' + (anyDay ? ' +1: llega al día siguiente.' : '') + '</td></tr></table>';
  body += pbFoot(o);
  var nseg = J.reduce(function (n, j) { return n + j.segs.length; }, 0);
  return pbStubWrap(body, J, o, nseg === 1 ? 1 : nseg < 3);
}
function passB(it, calc, o) {
  var J = calc.journeys, firstYear = calc.first.depD.y, anyOff = false;
  function pt(kind, code, time, off, dlab) {
    return pbLab(kind + (dlab ? ' · <span style="color:#148D7E;font-weight:bold">' + dlab + '</span>' : '')) + '<div style="' + F + 'font-size:21px;font-weight:bold;color:' + PB.INK + ';line-height:1.1;letter-spacing:0.5px">' + esc(code) + '</div>' +
      '<div style="' + F + 'font-size:11.5px;color:' + PB.MUT + ';line-height:1.35">' + esc(U.apCity(code)) + '</div>' +
      '<div style="' + F + 'font-size:19px;font-weight:bold;color:' + PB.INK + ';line-height:1.2;white-space:nowrap">' + time + pbOff(off) + '</div>';
  }
  var body = pbWho(it);
  J.forEach(function (j, ix) {
    var lbl = jLabel(calc, ix), d0 = j.segs[0].depD, base = U.dayNum(d0);
    var dw = U.fmtDate(d0).split(' '), dlab = dw[0].charAt(0).toUpperCase() + dw[0].slice(1) + ', ' + dw[1] + ' ' + dw[2] + (d0.y !== firstYear ? ' ' + d0.y : '');
    body += '<table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0C7A76" style="border-collapse:separate;background:#0C7A76;background-image:linear-gradient(90deg,#0A6E6C,#17A28F);border-radius:22px"><tr>' +
      '<td style="padding:7px 18px"><table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:0 12px 0 0;vertical-align:middle">' + pbImg('pass-plane-white.png', o, 22, 22) + '</td>' +
      '<td style="' + F + 'padding:0;vertical-align:middle;font-size:15px;color:#FFFFFF;white-space:nowrap"><b style="letter-spacing:0.6px">' + esc(lbl.toUpperCase()) + '</b>&nbsp; · &nbsp;' + '<span style="' + PB_CITY + '">' + esc(U.apCity(j.from)) + ' → ' + esc(U.apCity(j.to)) + '</span>' + '</td></tr></table></td>' +
      '</tr></table>' +
      '<div style="height:8px;font-size:1px;line-height:8px">&nbsp;</div>';
    var rows = '';
    j.segs.forEach(function (s, k) {
      var a = U.alInfo(s.al), lay = k < j.layovers.length ? j.layovers[k] : null;
      var od = U.dayNum(s.depD) - base, oa = s.dayDiff || 0;
      if (oa) anyOff = true;
      var ddl = '';
      var conn = '<div style="' + F + 'font-size:14px;color:#568F89;text-align:center">–</div>';
      if (lay) { var L = pbLay(lay, o, 13); conn = pbLab(L.t, L.c) + '<div style="height:3px;font-size:1px;line-height:3px">&nbsp;</div>' + pbIcoRow(L.ico, o, L.v) + '<div style="' + F + 'font-size:11.5px;color:' + L.c + ';padding:2px 0 0 28px">en ' + esc(U.apCity(s.to)) + '</div>'; }
      if (k) rows += '<tr><td colspan="9" height="1" bgcolor="#E3F4F2" style="height:1px;background:#E3F4F2;padding:0;font-size:1px;line-height:1px">&nbsp;</td></tr>';
      rows += '<tr>' +
        '<td width="100" style="' + F + 'width:76px;padding:12px 10px 12px 14px;vertical-align:middle;color:' + PB.INK + '">' + pbBigDate(s.depD, firstYear) + '</td>' + pbSep() +
        '<td width="190" style="width:162px;padding:12px 14px;vertical-align:middle"><table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:0 8px 0 0;vertical-align:middle">' + logoAt(s.al, o, 34) + '</td><td style="' + F + 'padding:0;vertical-align:middle;font-size:11.5px;font-weight:bold;color:' + PB.INK + ';text-transform:uppercase;letter-spacing:0.3px;line-height:1.2">' + (isWide(s.al) ? '' : esc(a.name)) + '</td></tr></table>' +
        '<div style="' + F + 'font-size:15px;color:' + PB.MUT + ';padding:5px 0 0 34px;white-space:nowrap">' + esc(s.al) + ' ' + esc(s.fn) + '</div>' + csNote(s, o, 12, 34) + '</td>' + pbSep() +
        '<td width="135" style="width:115px;padding:10px 4px 10px 16px;vertical-align:middle">' + pt('Salida', s.from, esc(s.dep), 0, ddl) + '</td>' +
        '<td width="95" style="width:91px;padding:0 2px;vertical-align:middle">' + pbImg('pass-arrow.png', o, 66, 17, 'margin:0 auto') + '</td>' +
        '<td width="138" style="width:126px;padding:10px 8px 10px 4px;vertical-align:middle">' + pt('Llegada', s.to, esc(s.arr), oa, '') + '</td>' + pbSep() +
        '<td width="140" style="width:112px;padding:10px 14px;vertical-align:middle">' + pbLab('Duración') + '<div style="height:4px;font-size:1px;line-height:4px">&nbsp;</div>' + pbIcoRow('ic-clock.png', o, '<b style="font-size:13px;color:' + PB.INK + '">' + HV.fmtDur(s.dur) + '</b>') + '</td></tr>' + pbExtra(s, o, 9, k < j.segs.length - 1);
    });
    body += '<table width="800" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="width:800px;table-layout:fixed;border-collapse:separate;background:#FFFFFF;border:1px solid #DCF3F1;border-radius:10px">' + rows + '</table>';
    body += pbTot(j, lbl, o) + '<div style="height:' + (ix < J.length - 1 ? 14 : 10) + 'px;font-size:1px;line-height:10px">&nbsp;</div>';
  });
  body += pbNote(calc, anyOff ? ' +1: llega al día siguiente de su salida.' : ' ', o);
  body += pbFoot(o);
  return pbStubWrap(body, J, o);
}
function passC(it, calc, o) {
  var J = calc.journeys, firstYear = calc.first.depD.y;
  function pt(kind, time, code) {
    var ap = apNick(code);
    return pbLab(kind) + '<div style="' + F + 'font-size:20px;font-weight:bold;color:' + PB.INK + ';line-height:1.15;white-space:nowrap">' + time + '</div>' +
      '<div style="' + F + 'font-size:13px;color:' + PB.INK + ';line-height:1.3">' + esc(U.apCity(code)) + '</div>' +
      (ap ? '<div style="' + F + 'font-size:11px;color:' + PB.MUT + ';line-height:1.3">' + esc(ap) + '</div>' : '');
  }
  var body = pbWho(it), n = 0;
  J.forEach(function (j, ix) {
    var lbl = jLabel(calc, ix);
    var bBg = o.bf ? BFHEAD : o.hv ? '#59B9BF' : '#E3FCF9';
    body += '<table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="' + bBg + '" style="border-collapse:separate;background:' + bBg + ';' + 'border-radius:10px"><tr>' +
      '<td style="padding:8px 18px"><table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:0 14px 0 0;vertical-align:middle">' + pbImg(o.hv ? 'pass-plane-white.png' : 'ic-plane-cyan.png', o, 24, 24) + '</td>' +
      '<td style="' + F + 'padding:0;vertical-align:middle;font-size:16px;color:' + (o.bf ? BFNEON + ';' : o.hv ? '#FFFFFF;' + HVTS : PB.NAVY) + ';white-space:nowrap"><b style="letter-spacing:0.5px">' + esc(lbl.toUpperCase()) + '</b>&nbsp; · &nbsp;' + '<span style="' + PB_CITY + '">' + esc(U.apCity(j.from)) + ' → ' + esc(U.apCity(j.to)) + '</span>' + '</td></tr></table></td>' +
      '<td align="right" style="padding:8px 16px;text-align:right;vertical-align:middle">' + pbImg(o.hv ? 'dots-plane-white.png' : 'dots-plane.png', o, 150, 15, 'margin-left:auto') + '</td></tr></table>' +
      '<div style="height:8px;font-size:1px;line-height:8px">&nbsp;</div>';
    j.segs.forEach(function (s, k) {
      var a = U.alInfo(s.al), lay = k < j.layovers.length ? j.layovers[k] : null, bg = n++ % 2 ? '#FFFFFF' : '#EEFDFB';
      var info = pbIcoRow('ic-clock.png', o, pbLab('Duración', PB.NAVY) + '<b style="font-size:14px;color:' + PB.INK + '">' + HV.fmtDur(s.dur) + '</b>');
      /* sin tránsito en boarding pass */
      body += '<table width="801" cellspacing="0" cellpadding="0" border="0" bgcolor="' + bg + '" style="width:801px;table-layout:fixed;border-collapse:separate;background:' + bg + ';border:1px solid #DCF3F1;border-radius:10px"><tr>' +
        '<td width="112" style="' + F + 'width:92px;padding:10px 10px 10px 14px;vertical-align:middle;font-size:13.5px;line-height:1.3;color:' + PB.INK + '">' + pbBigDate(s.depD, firstYear) + '</td>' + pbSep() +
        '<td width="160" style="width:136px;padding:10px 12px;vertical-align:middle"><table align="center" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:0 auto"><tr><td style="padding:0 9px 0 0;vertical-align:middle">' + logoAt(s.al, o, 32) + '</td><td style="' + F + 'padding:0;vertical-align:middle;font-size:11px;font-weight:bold;color:' + PB.INK + ';text-transform:uppercase;letter-spacing:0.3px;line-height:1.2">' + (isWide(s.al) ? '' : esc(a.name)) + '</td></tr></table></td>' + pbSep() +
        '<td width="92" style="width:72px;padding:10px 10px;vertical-align:middle">' + pbLab('Vuelo') + '<div style="' + F + 'font-size:16px;font-weight:bold;color:' + PB.INK + ';white-space:nowrap">' + esc(s.al) + ' ' + esc(s.fn) + '</div>' + csNote(s, o, 11) + '</td>' + pbSep() +
        '<td width="148" style="width:124px;padding:8px 10px 8px 14px;vertical-align:middle">' + pt('Salida', esc(s.dep), s.from) + '</td>' + pbSep() +
        '<td width="148" style="width:124px;padding:8px 10px 8px 14px;vertical-align:middle">' + pt('Llegada', esc(s.arr) + pbOff(s.dayDiff), s.to) + '</td>' + pbSep() +
        '<td width="136" style="width:110px;padding:8px 12px;vertical-align:middle">' + info + '</td></tr>' + pbExtra(s, o, 11) + '</table>' +
        '<div style="height:7px;font-size:1px;line-height:7px">&nbsp;</div>';
    });
    body += pbTot(j, lbl, o) + '<div style="height:' + (ix < J.length - 1 ? 8 : 2) + 'px;font-size:1px;line-height:8px">&nbsp;</div>';
  });
  body += pbNote(calc, '', o);
  body += pbFoot(o);
  return pbStubWrap(body, J, o);
}
function passHTML(it, calc, o) {
  var n = calc.segs.length;
  return n <= 2 ? passA(it, calc, o) : (n <= 4 ? passB(it, calc, o) : passC(it, calc, o));
}
return { html: passHTML, PB: PB, F: F, pbLab: pbLab, pbSep: pbSep, paxGrid: paxGrid };
})();
