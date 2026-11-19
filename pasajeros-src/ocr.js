/* ===== Lectura de archivos (fotos, capturas, PDF) en el navegador =====
   Tesseract.js con un modelo entrenado para MRZ; todo local, sin enviar imágenes a ningún servidor. */
var OCR = (function () {
  function url(p) { return new URL(p, location.href).href; }
  var worker = null, cargando = null, psmActual = '';
  function script(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  function motor(aviso) {
    if (worker) return Promise.resolve(worker);
    if (!cargando) cargando = (async function () {
      aviso && aviso('Preparando el lector (sólo la primera vez)…');
      if (typeof Tesseract === 'undefined') await script(url('vendor/ocr/tesseract.min.js'));
      var w = await Tesseract.createWorker('mrz', 1, {
        workerPath: url('vendor/ocr/worker.min.js'),
        corePath: url('vendor/ocr').replace(/\/$/, ''),
        langPath: url('vendor/ocr/lang').replace(/\/$/, ''),
        gzip: true,
        workerBlobURL: false
      });
      await w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<' });
      worker = w; return w;
    })().catch(function (e) { cargando = null; throw e; });
    return cargando;
  }
  async function psm(w, m) { if (psmActual !== m) { await w.setParameters({ tessedit_pageseg_mode: m }); psmActual = m; } }
  function aCanvas(pix) {
    var c = document.createElement('canvas'); c.width = pix.width; c.height = pix.height;
    var id = new ImageData(pix.data instanceof Uint8ClampedArray ? pix.data : new Uint8ClampedArray(pix.data.buffer), pix.width, pix.height);
    c.getContext('2d').putImageData(id, 0, 0); return c;
  }
  async function texto(w, canvas, modo) { await psm(w, modo || '6'); var r = await w.recognize(canvas); return r.data.text || ''; }
  function mejor(a, b) { if (!a) return b; if (!b) return a; return (b.puntos / b.total > a.puntos / a.total || (b.puntos / b.total === a.puntos / a.total && b.puntos > a.puntos)) ? b : a; }

  // ---- imagen → píxeles ----
  async function cargarImagen(file, maxLado) {
    maxLado = maxLado || 2600;
    var bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      bmp = await new Promise(function (ok, mal) {
        var im = new Image(), u = URL.createObjectURL(file);
        im.onload = function () { ok(im); }; im.onerror = function () { mal(new Error('formato')); }; im.src = u;
      }).catch(function () { return null; });
    }
    if (!bmp) throw new Error(/heic|heif/i.test(file.type + file.name) ? 'Las fotos HEIC del iPhone no se pueden abrir acá: mandala como JPG o sacale una captura.' : 'No se pudo abrir la imagen.');
    var W = bmp.width, H = bmp.height, s = Math.min(1, maxLado / Math.max(W, H));
    var c = document.createElement('canvas'); c.width = Math.round(W * s); c.height = Math.round(H * s);
    var g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  }
  function pixeles(canvas) { return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height); }
  function rotar(canvas, grados) {
    var c = document.createElement('canvas'), r = grados % 180 !== 0;
    c.width = r ? canvas.height : canvas.width; c.height = r ? canvas.width : canvas.height;
    var g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(grados * Math.PI / 180); g.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return c;
  }

  // ---- PDF ----
  var pdfjs = null;
  async function paginasPDF(file, aviso) {
    if (!pdfjs) {
      aviso && aviso('Abriendo el PDF…');
      pdfjs = await import(url('vendor/pdfjs/pdf.min.mjs'));
      pdfjs.GlobalWorkerOptions.workerSrc = url('vendor/pdfjs/pdf.worker.min.mjs');
    }
    var doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, out = [];
    for (var i = 1; i <= Math.min(doc.numPages, 6); i++) {
      var pg = await doc.getPage(i);
      var tc = await pg.getTextContent(), txt = '';
      tc.items.forEach(function (it) { txt += it.str + (it.hasEOL ? '\n' : ' '); });
      var v0 = pg.getViewport({ scale: 1 }), sc = Math.min(4, 2200 / Math.max(v0.width, v0.height));
      var vp = pg.getViewport({ scale: sc }), c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      out.push({ canvas: c, texto: txt, pagina: i });
    }
    return out;
  }

  // ---- lectura de la MRZ en una imagen ----
  async function leerCanvas(canvas, aviso) {
    var w = await motor(aviso), img = pixeles(canvas), best = null, recorte = null;
    aviso && aviso('Buscando la zona de lectura…');
    var cs = ZONA.candidatos(img);
    for (var k = 0; k < cs.length; k++) {
      for (var v = 0; v < 2; v++) {
        var cr = ZONA.recorte(img, cs[k], 0.08, 1500, !!v), cv = aCanvas(cr);
        var r = MRZ.buscar(await texto(w, cv, '6'))[0];
        if (r && mejor(best, r) === r) { best = r; recorte = cv; }
        if (best && best.verificado) return { mrz: best, recorte: recorte };
      }
    }
    // Plan B: la imagen entera, en las 4 orientaciones
    var rots = [0, 180, 90, 270];
    for (var j = 0; j < rots.length; j++) {
      aviso && aviso('Probando otra orientación…');
      var cvr = rots[j] ? rotar(canvas, rots[j]) : canvas;
      if (Math.max(cvr.width, cvr.height) > 2000) { var s = 2000 / Math.max(cvr.width, cvr.height), t = document.createElement('canvas'); t.width = cvr.width * s; t.height = cvr.height * s; t.getContext('2d').drawImage(cvr, 0, 0, t.width, t.height); cvr = t; }
      var r2 = MRZ.buscar(await texto(w, cvr, '3'))[0];
      if (r2 && (!best || mejor(best, r2) === r2)) { best = r2; recorte = null; }
      if (best && best.verificado) break;
    }
    return { mrz: best, recorte: recorte };
  }
  // Recorte elegido a mano por el usuario (rectángulo en coordenadas del canvas):
  // se amplía la zona marcada, se buscan y enderezan las líneas dentro de ella y se lee
  async function leerZona(canvas, x, y, ancho, alto) {
    var w = await motor(), m = 0.04 * ancho;
    var x0 = Math.max(0, x - m), y0 = Math.max(0, y - m), x1 = Math.min(canvas.width, x + ancho + m), y1 = Math.min(canvas.height, y + alto + m);
    var esc = Math.min(4, 1800 / (x1 - x0)), sub = document.createElement('canvas');
    sub.width = Math.round((x1 - x0) * esc); sub.height = Math.round((y1 - y0) * esc);
    var g = sub.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, sub.width, sub.height);
    g.imageSmoothingQuality = 'high'; g.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, sub.width, sub.height);
    var img = pixeles(sub), best = null, recorte = null;
    var cs = ZONA.candidatos(img);
    for (var k = 0; k < cs.length && !(best && best.verificado); k++) {
      for (var v = 0; v < 2; v++) {
        var cv = aCanvas(ZONA.recorte(img, cs[k], 0.06, 1500, !!v));
        var r = MRZ.buscar(await texto(w, cv, '6'))[0];
        if (r && mejor(best, r) === r) { best = r; recorte = cv; }
        if (best && best.verificado) break;
      }
    }
    for (var u = 0; u < 2 && !(best && best.verificado); u++) {
      var cv2 = u ? rotar(sub, 180) : sub;
      var r2 = MRZ.buscar(await texto(w, cv2, '6'))[0];
      if (r2 && mejor(best, r2) === r2) { best = r2; recorte = cv2; }
    }
    return { mrz: best, recorte: recorte };
  }

  return { motor: motor, cargarImagen: cargarImagen, paginasPDF: paginasPDF, leerCanvas: leerCanvas, leerZona: leerZona };
})();
