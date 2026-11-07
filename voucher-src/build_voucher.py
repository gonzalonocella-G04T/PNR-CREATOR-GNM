# Arma ../voucher.html (página independiente). Autocontenido: usa sólo archivos de este repo.
import json, os
here=os.path.dirname(os.path.abspath(__file__)); root=os.path.dirname(here)
def rd(p,enc='utf-8'): return open(p,encoding=enc).read()
fotos=rd(os.path.join(root,'ticket-vintage-src','fotos.js'))
sellos=json.load(open(os.path.join(root,'sellos','index.json'),encoding='utf-8'))
ops=json.load(open(os.path.join(root,'operadores','operadores.json'),encoding='utf-8'))
paises=json.load(open(os.path.join(here,'paises.json'),encoding='utf-8'))
pmap={c:p for p,cs in paises.items() for c in cs}
lug=json.load(open(os.path.join(here,'lugares.json'),encoding='utf-8'))
cred=json.load(open(os.path.join(root,'destinos','creditos.json'),encoding='utf-8')) if os.path.exists(os.path.join(root,'destinos','creditos.json')) else {}
pmap.update({l['n']:l['p'] for l in lug})
nuevos=[]
import re as _re,unicodedata as _u
def _n(t): return _re.sub(r'\s+',' ',''.join(c for c in _u.normalize('NFD',t) if _u.category(c)!='Mn').upper()).strip()
try: _old=json.loads(fotos[fotos.index('['):fotos.rindex(']')+1])
except Exception: _old=[]
for l in lug:
    e={'n':l['n'],'c':l['c'],'a':l['a'],'s':l['s'],'x':1}
    if os.path.exists(os.path.join(root,'destinos',l['f'])):
        e['p']='destinos/'+l['f']; e['cr']=cred.get(l['f'],'')
    else:
        keys={_n(l['n'])}|{_n(a) for a in l['a']}
        o=next((x for x in _old if _n(x['n']) in keys or any(_n(a) in keys for a in x['a'])),None)
        if o: e['p']='tv-fotos/'+o['f']
    nuevos.append(e)
fotos=fotos.replace('var FOTOS=','var FOTOS_OLD=')+'\nvar FOTOS_NEW='+json.dumps(nuevos,ensure_ascii=False,separators=(',',':'))+';\nvar FOTOS=FOTOS_NEW.concat(FOTOS_OLD);\n'
paises.update({}) 
exc=json.load(open(os.path.join(root,'excursiones','excursiones.json'),encoding='utf-8')) if os.path.exists(os.path.join(root,'excursiones','excursiones.json')) else []
data='var EXC_FOTOS='+json.dumps(exc,ensure_ascii=False)+';\n'+fotos+'\nvar SELLOS='+json.dumps(sellos,ensure_ascii=False,separators=(',',':'))+';\nvar OPERADORES='+json.dumps(ops,ensure_ascii=False)+';\nvar PAISES='+json.dumps(pmap,ensure_ascii=False)+';\n'
js=data+rd(os.path.join(here,'parse.js'))+rd(os.path.join(here,'app.js'))
assert '</script' not in js.lower()
html=('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
 '<title>Voucher de servicios · Hiperviajes</title><link rel="icon" href="tv-fav/favicon.ico?v=2" sizes="any">'
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:ital,wght@0,500;0,600;0,700;0,800;1,500&family=Oswald:wght@500;600;700&display=swap">'
 '<style>'+rd(os.path.join(here,'voucher.css'))+'</style></head><body>'+rd(os.path.join(here,'body.html'))+'<script>'+js+'</script></body></html>\n')
open(os.path.join(root,'voucher.html'),'w',encoding='utf-8').write(html); print('voucher.html',len(html))
