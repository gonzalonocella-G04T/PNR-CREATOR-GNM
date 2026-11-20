// Pruebas rápidas de lectura y comandos:  node datapax-src/pruebas.js
var vm = require('vm'), fs = require('fs'), path = require('path'), D = __dirname;
global.PAISES = JSON.parse(fs.readFileSync(path.join(D, 'paises.json'), 'utf8'));
['datos.js', 'mrz.js', 'texto.js', 'cmd.js'].forEach(function (f) { vm.runInThisContext(fs.readFileSync(path.join(D, f), 'utf8'), { filename: f }); });
var fallas = 0;
function eq(nombre, a, b) { var ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) fallas++; console.log((ok ? 'ok   ' : 'FALLA') + ' ' + nombre + (ok ? '' : '\n      obtenido: ' + JSON.stringify(a) + '\n      esperado: ' + JSON.stringify(b))); }

// Ejemplos de Gonzalo (Amadeus)
var gon = { id: 1, apellidos: 'NOCELLA MASSAFERRO', nombres: 'GONZALO ANDRES', sexo: 'M', nac: { y: 1986, m: 11, d: 5 }, ppNum: 'D345678', ppEmisor: 'URY', nacionalidad: 'URY', email: 'gnocella@hiperviajes.com.uy', tel: '59898584260' };
var r = CMD.generar([gon], { gds: 'A' }).secciones;
eq('Amadeus DOCS/FOID/CTC', [r.docs[0].t, r.foid[0].t, r.ctc[0].t, r.ctc[1].t], ['SR DOCS HK1-----05NOV86-M--NOCELLA MASSAFERRO-GONZALO ANDRES', 'SR FOID-PPUYD345678', 'SRCTCE-GNOCELLA//HIPERVIAJES.COM.UY', 'SRCTCM-59898584260']);
var s = CMD.generar([gon], { gds: 'S' }).secciones;
eq('Sabre', [s.nombres[0].t, s.docs[0].t, s.foid[0].t, s.ctc[0].t], ['-NOCELLA MASSAFERRO/GONZALO ANDRES MR', '3DOCS/DB/05NOV86/M/NOCELLA MASSAFERRO/GONZALO/ANDRES-1.1', '3FOID/PPUYD345678-1.1', '3CTCE/GNOCELLA//HIPERVIAJES.COM.UY-1.1']);
eq('mail con _ y -', CMD.mail('ana_n-x@gmail.com'), 'ANA..N./X//GMAIL.COM');

// MRZ (ejemplo oficial ICAO) y errores típicos del OCR
var m = MRZ.buscar('P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO74O8122F12041S9ZE184226B<<<<<<10')[0];
eq('MRZ con O/0, S/5 y un caracter de más', [m.numero, m.verificado, m.apellidos, m.nombres], ['L898902C3', true, 'ERIKSSON', 'ANNA MARIA']);
eq('nombre que empieza con C', MRZ.td3('P<ESPGARCIA<LOPEZ<<CARMEN<<<<<<<<<<<<<<<<<<<<', 'PAB1234561ESP7001017F2906302<<<<<<<<<<<<<<04').nombres, 'CARMEN');

// Texto libre
var t = TEXTO.parse('Nombre: Gonzalo Andrés Nocella Massaferro\nFecha de nacimiento: 05/11/1986\nPasaporte: D345678\nMail: gnocella@hiperviajes.com.uy\nCel: 098 584 260').pasajeros[0];
eq('texto con etiquetas', [t.apellidos, t.nombres, t.pasaporte, t.telefono], ['NOCELLA MASSAFERRO', 'GONZALO ANDRES', 'D345678', '59898584260']);
eq('cédula uruguaya válida', [TEXTO.ciValida('1.234.567-2'), TEXTO.ciValida('1.234.567-8')], [true, false]);
eq('celular uruguayo', TEXTO.telefono('098 584 260').num, '59898584260');
var soloCtc = TEXTO.parse('Mail: gnocella@hiperviajes.com.uy\nCel: 098 584 260').pasajeros;
eq('sólo contactos', [soloCtc.length, soloCtc[0] && soloCtc[0].email, soloCtc[0] && soloCtc[0].telefono], [1, 'gnocella@hiperviajes.com.uy', '59898584260']);
var grupo = 'Apellido\tNombre\tFecha nac.\tPasaporte\nCABRERA\tNICOLAS\t13/02/1980\tC1234570\nPEREIRA\tVALENTINA\t12/01/1979\tC1234569\nSILVA\tANA\t01/01/1990\tC1234500';
eq('planilla sin falsas MRZ', TEXTO.parse(grupo).pasajeros.map(function (p) { return p.apellidos; }), ['CABRERA', 'PEREIRA', 'SILVA']);
// Validez del documento: suma de meses y plazos (funciones de app.js)
var appSrc = fs.readFileSync(path.join(D, 'app.js'), 'utf8');
function fn(n) { var i = appSrc.indexOf('function ' + n + '('), d = 0, j = appSrc.indexOf('{', i); for (var k = j; k < appSrc.length; k++) { if (appSrc[k] === '{') d++; if (appSrc[k] === '}') { d--; if (!d) return appSrc.slice(i, k + 1); } } }
vm.runInThisContext(fn('sumarMeses') + ';' + fn('mesesEntre') + ';' + fn('plazo'));
function F(y, m, d) { return new Date(y, m - 1, d); }
eq('31/08 + 6 meses = 28/02', sumarMeses(F(2026, 8, 31), 6).getTime(), F(2027, 2, 28).getTime());
eq('plazos', [plazo(F(2026, 11, 20), F(2027, 5, 19)), plazo(F(2026, 11, 20), F(2027, 5, 20)), plazo(F(2026, 11, 20), F(2026, 12, 5)), plazo(F(2026, 11, 20), F(2028, 1, 15))], ['5 meses', '6 meses', '15 días', '1 año y 1 mes']);
eq('umbral 6 meses', [F(2027, 5, 19) < sumarMeses(F(2026, 11, 20), 6), F(2027, 5, 20) < sumarMeses(F(2026, 11, 20), 6)], [true, false]);
// Nombres para GDS: Ñ → N, Ç → C, sin tildes, apóstrofos ni signos
eq('limpieza de nombres', ['Muñoz Ñandú', 'Gonçalves Conceição', "D'Alessandro", 'O’Brien', 'Pérez-Gómez', 'Müller', 'Straße', 'Łukasz', 'Dvořák', 'Ærø', 'St. John'].map(TEXTO.limpiaNombre),
  ['MUNOZ NANDU', 'GONCALVES CONCEICAO', 'DALESSANDRO', 'OBRIEN', 'PEREZ GOMEZ', 'MULLER', 'STRASSE', 'LUKASZ', 'DVORAK', 'AERO', 'ST JOHN']);
var tn = TEXTO.parse('Nombre: Iñaki Peña Gonçalves\nFecha de nacimiento: 01/02/1990').pasajeros[0];
eq('nombre con Ñ y Ç desde texto', [tn.apellidos, tn.nombres], ['PENA GONCALVES', 'INAKI']);
// Texto en minúscula, una cosa por línea (ejemplo de Gonzalo)
var pe = TEXTO.parse('pedro porro lopez\n05-10-1962\npasaporte uruguayo d345678\n pplopez@gmail.com\n 59898653333').pasajeros;
eq('una cosa por línea, en minúscula', pe.length === 1 && [pe[0].apellidos, pe[0].nombres, pe[0].nacimiento.d + '/' + pe[0].nacimiento.m + '/' + pe[0].nacimiento.y, pe[0].pasaporte, pe[0].nacionalidad, pe[0].email, pe[0].telefono], ['PORRO LOPEZ', 'PEDRO', '5/10/1962', 'D345678', 'URY', 'pplopez@gmail.com', '59898653333']);
eq('celular con 598 y una cifra de menos', TEXTO.telefono('5989865333').num, '5989865333');
eq('saludo no es nombre', TEXTO.parse('hola te paso los datos\njuan perez\n12/04/1978').pasajeros.map(function (p) { return p.apellidos + '/' + p.nombres; }), ['PEREZ/JUAN']);
// Máscara de fechas: las barras se ponen solas al tipear
vm.runInThisContext(fn('mascaraFecha'));
function tipea(txt) { var el = { value: '', selectionStart: 0, setSelectionRange: function (a) { this.selectionStart = a; } };
  txt.split('').forEach(function (c) { if (c === '<') { el.value = el.value.slice(0, -1); el.selectionStart = el.value.length; mascaraFecha(el, { inputType: 'deleteContentBackward' }); }
    else { el.value += c; el.selectionStart = el.value.length; mascaraFecha(el, { inputType: 'insertText' }); } });
  return el.value; }
eq('máscara de fechas', ['05101962', '051062', '5/10/1962', '5-10-62', '05/10/1962', '05<', '0510<', '0510<<', '05101962<<<<', '051019621', '05NOV86', '5.3.1990'].map(tipea),
  ['05/10/1962', '05/10/62', '05/10/1962', '05/10/62', '05/10/1962', '05', '05/10', '05/1', '05/10', '05/10/1962', '05NOV86', '05/03/1990']);
eq('pasajero sin apellido va al final', CMD.preparar([{ id: 1, apellidos: '', nombres: '' }, { id: 2, apellidos: 'PEREZ', nombres: 'JUAN' }, { id: 3, apellidos: 'ALVAREZ', nombres: 'ANA' }], {}).todos.map(function (x) { return x.p.id + ':' + x.n; }), ['3:1', '2:2', '1:3']);
// Sexo según el nombre
eq('sexo por nombre', ['Juan Pedro', 'María José', 'José María', 'Andrea', 'Andrea Sofía', 'Alex Juan', 'María del Carmen', 'Iñaki', 'Conceição', 'Rosario', 'Consuelo', 'Luca', 'Bautista', 'Taiel', 'Xiomara', 'Ariel', 'Noa', 'Kim', 'Simone', 'Trinidad'].map(function (n) { var r = TEXTO.sexoPorNombre(n); return r.sexo || (r.unisex ? 'U' : '-'); }),
  ['M', 'F', 'M', 'U', 'F', 'M', 'F', 'M', 'F', 'F', 'F', 'M', 'M', '-', 'F', 'M', 'U', 'U', 'U', 'U']);
// Un solo mail / celular en el texto vale para todos
var cc = TEXTO.parse('Juan Perez 05/10/1962 pasaporte C123456\nAna Perez 03/04/1965 pasaporte C654321\nLucas Perez 01/02/2001 pasaporte C111222\n\nmail: familia.perez@gmail.com\ncel: 098 584 260');
eq('un mail y un celular para todos', cc.pasajeros.map(function (p) { return (p.email || '-') + ' ' + (p.telefono || '-'); }), ['familia.perez@gmail.com 59898584260', 'familia.perez@gmail.com 59898584260', 'familia.perez@gmail.com 59898584260']);
var c2 = TEXTO.parse('Nombre: Juan Perez\nMail: juan@x.com\n\nNombre: Ana Perez\nMail: ana@x.com\n\nNombre: Lucas Perez');
eq('dos mails distintos: no se reparte', [c2.comun.email, c2.pasajeros[2].email || ''], ['', '']);
var c3 = TEXTO.parse('mail: grupo@x.com · cel 099123456');
eq('sólo contacto (para pasajeros ya cargados)', [c3.comun.email, c3.comun.telefono], ['grupo@x.com', '59899123456']);
// Texto con renglones en blanco en medio (WhatsApp, texto leído de una captura)
var wa = TEXTO.parse(TEXTO.arreglarOCR('Hola! Te paso los datos para la reserva:\n\nJuan Pablo Rodríguez Silva\n05/03/1980\n\nPasaporte uruguayo C1234567\nvence 12/08/2029\n\nMaría Laura Gómez Pérez\n22/11/1983\n\nPasaporte uruguayo D7654321\nvence 03/02/2027\n\nmail: juanrodriguezegmail.com\ncel: 099 123 456')).pasajeros;
eq('bloques sin nombre se unen al pasajero anterior', wa.map(function (p) { return [p.apellidos, p.nombres, p.pasaporte, p.vencimiento && p.vencimiento.y, p.email, p.telefono].join('|'); }),
  ['RODRIGUEZ SILVA|JUAN PABLO|C1234567|2029|juanrodriguez@gmail.com|59899123456', 'GOMEZ PEREZ|MARIA LAURA|D7654321|2027|juanrodriguez@gmail.com|59899123456']);
eq('@ mal leída en una imagen', ['juanrodriguezegmail.com', 'andrea.nunezGhotmail.com', 'andrea.nunezOhotmail.com', 'gnocellaGhiperviajes.com.uy', 'pp@live.com', 'www.awesome.com', 'olive.com'].map(TEXTO.arreglarOCR),
  ['juanrodriguez@gmail.com', 'andrea.nunez@hotmail.com', 'andrea.nunez@hotmail.com', 'gnocella@hiperviajes.com.uy', 'pp@live.com', 'www.awesome.com', 'olive.com']);
var apil = TEXTO.parse('Juan Perez\n05/03/1980\nAna Gomez\n06/04/1985').pasajeros;
eq('nombre/fecha/nombre/fecha sin renglón en blanco', apil.map(function (p) { return p.nombres + ' ' + p.apellidos + ' ' + p.nacimiento.y; }), ['JUAN PEREZ 1980', 'ANA GOMEZ 1985']);
var vto = TEXTO.parse('Juan Perez\nPasaporte C1234567\nvence 12/08/2029').pasajeros;
eq('vencimiento en su propio renglón', [vto.length, vto[0].pasaporte, vto[0].vencimiento && vto[0].vencimiento.y], [1, 'C1234567', 2029]);
// Infantes: menos de 2 años a la fecha del viaje, sin FOID, DOCS con MI/FI y la /P del adulto
var fam = [{ id: 1, apellidos: 'PEREZ', nombres: 'JUAN', sexo: 'M', nac: { y: 1980, m: 3, d: 5 }, ppNum: 'C1234567', ppEmisor: 'URY', email: 'fam@x.com' },
  { id: 2, apellidos: 'GOMEZ', nombres: 'ANA', sexo: 'F', nac: { y: 1985, m: 4, d: 6 }, ppNum: 'C7654321', ppEmisor: 'URY', email: 'fam@x.com' },
  { id: 3, apellidos: 'PEREZ', nombres: 'LUCIA', sexo: 'F', nac: { y: 2025, m: 6, d: 10 }, ppNum: 'C5555555', ppEmisor: 'URY' },
  { id: 4, apellidos: 'PEREZ', nombres: 'TOMAS', sexo: 'M', nac: { y: 2024, m: 12, d: 1 }, ppNum: 'C6666666', ppEmisor: 'URY' }];
var gA = CMD.generar(fam, { gds: 'A', fechaViaje: new Date(2026, 11, 1), contactoTodos: true }), sec = gA.secciones;
var tx = function (k) { return sec[k].map(function (l) { return l.t || ('FALTA ' + l.falta); }); };
eq('infante: tipos (cumple 2 el día del viaje = niño)', gA.orden.map(function (x) { return x.p.nombres + ':' + x.tipo; }).sort(), ['ANA:ADT', 'JUAN:ADT', 'LUCIA:INF', 'TOMAS:CHD']);
eq('infante: nombre con el adulto', tx('nombres').filter(function (l) { return /INF/.test(l); }), ['NM1PEREZ/JUAN MR(INF/LUCIA/10JUN25)']);
eq('infante: DOCS con FI y /P del adulto', tx('docs').filter(function (l) { return /LUCIA/.test(l); }), ['SR DOCS HK1-----10JUN25-FI--PEREZ-LUCIA/P2']);
eq('infante: sin FOID', tx('foid').filter(function (l) { return /5555555/.test(l); }), []);
eq('mismo mail para todos: una línea sin /P', tx('ctc'), ['SRCTCE-FAM//X.COM']);
var gS = CMD.generar(fam, { gds: 'S', fechaViaje: new Date(2026, 11, 1), contactoTodos: true });
eq('Sabre: infante y contactos', gS.secciones.docs.map(function (l) { return l.t; }).filter(function (l) { return /LUCIA/.test(l); }).concat(gS.secciones.ctc.map(function (l) { return l.t; })),
  ['3DOCS/DB/10JUN25/FI/PEREZ/LUCIA-2.1', '3INFT/PEREZ/LUCIA/10JUN25-2.1', '3CTCE/FAM//X.COM-1.1', '3CTCE/FAM//X.COM-2.1', '3CTCE/FAM//X.COM-3.1']);
var gC = CMD.generar(fam, { gds: 'A', fechaViaje: new Date(2026, 11, 1), infanteConfirmar: true });
eq('reserva ya cargada: el DOCS del infante espera el adulto elegido', gC.secciones.docs.filter(function (l) { return !l.t; }).map(function (l) { return l.falta; }), ['a qué adulto está asociado el infante en la reserva (elegilo en su tarjeta)']);
fam[2].infanteDe = 2;
var gD = CMD.generar(fam, { gds: 'A', fechaViaje: new Date(2026, 11, 1), infanteConfirmar: true });
eq('infante asociado a mano a otro adulto', gD.secciones.docs.map(function (l) { return l.t; }).filter(function (l) { return /LUCIA/.test(l); }), ['SR DOCS HK1-----10JUN25-FI--PEREZ-LUCIA/P1']);
console.log(fallas ? '\n' + fallas + ' pruebas fallaron' : '\nTodo bien');
process.exit(fallas ? 1 : 0);
