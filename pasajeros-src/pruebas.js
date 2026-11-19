// Pruebas rápidas de lectura y comandos:  node pasajeros-src/pruebas.js
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
console.log(fallas ? '\n' + fallas + ' pruebas fallaron' : '\nTodo bien');
process.exit(fallas ? 1 : 0);
