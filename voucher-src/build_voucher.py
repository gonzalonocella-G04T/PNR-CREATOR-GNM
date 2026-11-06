# Arma ../voucher.html (página independiente). Autocontenido: usa sólo archivos de este repo.
import json, os
here=os.path.dirname(os.path.abspath(__file__)); root=os.path.dirname(here)
def rd(p,enc='utf-8'): return open(p,encoding=enc).read()
fotos=rd(os.path.join(root,'ticket-vintage-src','fotos.js'))
sellos=json.load(open(os.path.join(root,'sellos','index.json'),encoding='utf-8'))
ops=json.load(open(os.path.join(root,'operadores','operadores.json'),encoding='utf-8'))
paises=json.load(open(os.path.join(here,'paises.json'),encoding='utf-8'))
pmap={c:p for p,cs in paises.items() for c in cs}
data=fotos+'\nvar SELLOS='+json.dumps(sellos,ensure_ascii=False,separators=(',',':'))+';\nvar OPERADORES='+json.dumps(ops,ensure_ascii=False)+';\nvar PAISES='+json.dumps(pmap,ensure_ascii=False)+';\n'
js=data+rd(os.path.join(here,'parse.js'))+rd(os.path.join(here,'app.js'))
assert '</script' not in js.lower()
html=('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
 '<title>Voucher de servicios · Hiperviajes</title><link rel="icon" href="tv-fav/favicon.ico?v=2" sizes="any">'
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap">'
 '<style>'+rd(os.path.join(here,'voucher.css'))+'</style></head><body>'+rd(os.path.join(here,'body.html'))+'<script>'+js+'</script></body></html>\n')
open(os.path.join(root,'voucher.html'),'w',encoding='utf-8').write(html); print('voucher.html',len(html))
