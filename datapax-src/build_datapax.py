# Arma ../datapax.html (DataPax) (página independiente). Usa sólo archivos de este repo.
# El lector de pasaportes (vendor/ocr y vendor/pdfjs) se carga recién cuando se sube un archivo.
import json, os, datetime
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
def rd(p): return open(os.path.join(here, p), encoding='utf-8').read()
paises = json.load(open(os.path.join(here, 'paises.json'), encoding='utf-8'))
js = ('var PAISES=' + json.dumps(paises, ensure_ascii=False, separators=(',', ':')) + ';\n'
      + rd('datos.js') + rd('mrz.js') + rd('zona.js') + rd('texto.js') + rd('cmd.js') + rd('pnr.js') + rd('ocr.js') + rd('app.js'))
assert '</script' not in js.lower()
VERSION_TXT = (datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(hours=3)).strftime('%d/%m %H:%M')
html = ('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>DataPax · Hiperviajes</title>'
        '<link rel="icon" href="datapax-fav/favicon.ico?v=1" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="datapax-fav/favicon-32.png?v=1">'
        '<link rel="icon" type="image/png" sizes="192x192" href="datapax-fav/icon-192.png?v=1"><link rel="apple-touch-icon" href="datapax-fav/apple-touch-icon.png?v=1">'
        '<meta name="theme-color" content="#0B6B45">'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600&display=swap">'
        '<style>' + rd('pax.css') + '</style></head><body>' + rd('body.html').replace('__VERSION__', VERSION_TXT)
        + '<script>' + js + '</script></body></html>\n')
open(os.path.join(root, 'datapax.html'), 'w', encoding='utf-8').write(html)
print('datapax.html', len(html))
