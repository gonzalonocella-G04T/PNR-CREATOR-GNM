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
    if 'y' in l: e['y']=l['y']
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
idx=rd(os.path.join(root,'index.html'))
_m=_re.search(r"var RAW = '([^']*)';\n  RAW.split\(';'\)",idx)
air={}
for e in _m.group(1).split(';'):
    p=e.split('|')
    if len(p)>1: air[p[0]]=p[1]
apt={}
_a=_re.search(r"var APX=(\{.*?\});",idx)
if _a:
    for tz,v in json.loads(_a.group(1)).items():
        for e in v.split(';'):
            p=e.split('|')
            if len(p)>1 and tz.startswith('America/'): apt[p[0]]=p[1]
_b=_re.search(r"var RAW = \{(.*?)\n  \};",idx,_re.S)
for code,city in _re.findall(r"\b([A-Z]{3}) ([^,/']+)(?:/[^,']*)?",_b.group(1)): apt[code]=city.strip()
data='var AIRN='+json.dumps(air,ensure_ascii=False,separators=(',',':'))+';\nvar APTC='+json.dumps(apt,ensure_ascii=False,separators=(',',':'))+';\n'
data+='var EXC_FOTOS='+json.dumps(exc,ensure_ascii=False)+';\n'+fotos+'\nvar SELLOS='+json.dumps(sellos,ensure_ascii=False,separators=(',',':'))+';\nvar OPERADORES='+json.dumps(ops,ensure_ascii=False)+';\nvar PAISES='+json.dumps(pmap,ensure_ascii=False)+';\n'
# ---- versión celeste Hiperviajes: mismo voucher con los verdes cambiados por tonos celestes ----
CEL=json.load(open(os.path.join(here,'celeste.json'),encoding='utf-8'))
_PROPS=_re.compile(r'^(--.*|color|background.*|border.*|outline.*|box-shadow|text-shadow|fill|stroke|accent-color|caret-color|text-decoration.*)$')
def _pinta(t):
    t=_re.sub(r'#[0-9a-fA-F]{6}\b',lambda m:CEL['hex'].get(m.group(0).upper(),m.group(0)),t)
    return _re.sub(r'rgba\((\d+,\d+,\d+),',lambda m:'rgba('+CEL['rgb'].get(m.group(1),m.group(1))+',',t)
def css_celeste(css):
    # Cada regla del voucher se repite bajo .c-hv con un nivel más de especificidad y solo con sus
    # propiedades de color: así el celeste gana siempre y el orden entre reglas queda igual que en el verde.
    css=_re.sub(r'/\*.*?\*/','',css,flags=_re.S); out=[]; i=0
    while i<len(css):
        j=css.find('{',i)
        if j<0: break
        sel=css[i:j].strip()
        if sel.startswith('@'):  # bloques @media: no tienen colores del voucher
            d=1; k=j+1
            while d: d+=(css[k]=='{')-(css[k]=='}'); k+=1
            i=k; continue
        k=css.find('}',j); body=css[j+1:k]; i=k+1
        if 'c-hv' in sel: continue
        decl=[x for x in body.split(';') if ':' in x and _PROPS.match(x.split(':',1)[0].strip())]
        if not decl: continue
        sels=[]
        for q in sel.split(','):
            q=q.strip()
            if q==':root': sels.append('.c-hv')
            elif q.startswith(('.sheet','.v-')): sels.append('.c-hv'+q)
            else: sels.append('.c-hv '+q)
        out.append(','.join(sels)+'{'+';'.join(_pinta(x.strip()) for x in decl)+'}')
    return '\n'.join(out)
VCSS=rd(os.path.join(here,'voucher.css'))
VCSS=VCSS+'\n/* ---------- versión celeste Hiperviajes (generado por build_voucher.py desde celeste.json) ---------- */\n'+css_celeste(VCSS)+'\n'
data+='var HVC='+json.dumps(CEL,ensure_ascii=False,separators=(',',':'))+';\n'
_verdes=sorted(set(h.upper() for h in _re.findall(r'#[0-9a-fA-F]{6}\b',rd(os.path.join(here,'voucher.css'))+rd(os.path.join(here,'app.js'))))-set(CEL['hex'])-{'#6B4E00','#8FD0E6','#B3261E','#BFE3EF','#F0C9C5','#F0D79A','#FDF1F0','#FFF6E0'})
if _verdes: print('Aviso: colores sin tono celeste en celeste.json:',', '.join(_verdes))
js=data+rd(os.path.join(here,'parse.js'))+rd(os.path.join(here,'app.js'))
assert '</script' not in js.lower()
import datetime
VERSION_TXT=(datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)-datetime.timedelta(hours=3)).strftime('%d/%m %H:%M')
html=('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
 '<title>Voucher de servicios · Hiperviajes</title><link rel="icon" href="vch-fav/favicon.ico?v=1" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="vch-fav/favicon-32.png?v=1"><link rel="icon" type="image/png" sizes="192x192" href="vch-fav/icon-192.png?v=1"><link rel="apple-touch-icon" href="vch-fav/apple-touch-icon.png?v=1"><meta name="theme-color" content="#19C0AA">'
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kaushan+Script&family=Montserrat:ital,wght@0,500;0,600;0,700;0,800;1,500&family=Playfair+Display:ital,wght@1,700;1,800;1,900&family=Oswald:wght@500;600;700&display=swap">'
 '<style>'+VCSS+'</style></head><body>'+rd(os.path.join(here,'body.html')).replace('__VERSION__',VERSION_TXT)+'<script>'+js+'</script></body></html>\n')
open(os.path.join(root,'voucher.html'),'w',encoding='utf-8').write(html); print('voucher.html',len(html))
