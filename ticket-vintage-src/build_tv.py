# Arma ticket-vintage.html (página independiente). No modifica index.html ni los archivos de la herramienta actual.
import re, base64, os
H='/home/claude/hv/'
ui=open(H+'ui2.js',encoding='utf-8').read()
wide=re.search(r"var WIDE_LOGOS = \{.*?\};",ui).group(0)
logo='data:image/png;base64,'+base64.b64encode(open(H+'logo.png','rb').read()).decode()
js=(open(H+'logos.js').read()+open(H+'pimg.js').read()+open(H+'apx.js',encoding='utf-8').read()
    +open(H+'app.js',encoding='utf-8').read().replace('__LOGO__',open(H+'logo.b64').read().strip().split(',')[-1])
    +'\n'+wide+'\n'+open('sellos.js',encoding='utf-8').read()+open('pdflines.js').read()+open('ticket.js',encoding='utf-8').read()
    +open('vintage.js',encoding='utf-8').read().replace('__LOGOHV__',logo))
assert '</script' not in js.lower()
css=open('vintage.css',encoding='utf-8').read()
html=('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
 '<title>Ticket Vintage · Hiperviajes</title><link rel="icon" href="favicon.ico" sizes="any">'
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap">'
 '<style>'+css+'</style></head><body><div id="root"></div><script>'+js+'</script></body></html>\n')
open('ticket-vintage.html','w',encoding='utf-8').write(html); print(len(html))
