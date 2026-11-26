# Actualiza ticket-vintage.html con los fuentes de esta carpeta sin rearmar todo (build_tv.py necesita archivos que no
# están en el repositorio): reemplaza el CSS y la parte final del código (pass-img.js + pass.js + vintage.js).
# Uso (desde la carpeta del repositorio): python3 ticket-vintage-src/patch_tv.py
import os, re
D = os.path.dirname(os.path.abspath(__file__))
H = os.path.join(D, '..', 'ticket-vintage.html')
html = open(H, encoding='utf-8').read()
rd = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
# CSS
a = html.index('<style>') + 7; b = html.index('</style>', a)
html = html[:a] + rd('vintage.css') + html[b:]
# código: desde el boarding pass (si ya estaba) o desde vintage.js hasta el cierre del script
MARKS = ['/* Ticket Vintage — imágenes turquesa del boarding pass', '/* Ticket Vintage HV — prototipo']
a = min(i for i in (html.find(m) for m in MARKS) if i >= 0)
b = html.index('</script>', a)
old = html[a:b]
logo = re.search(r"var LOGO_HV = '([^']*)'", old).group(1)
js = rd('pass-img.js') + rd('pass.js') + rd('vintage.js').replace('__LOGOHV__', logo)
assert '</script' not in js.lower()
html = html[:a] + js + html[b:]
open(H, 'w', encoding='utf-8').write(html)
print('ticket-vintage.html', len(html))
