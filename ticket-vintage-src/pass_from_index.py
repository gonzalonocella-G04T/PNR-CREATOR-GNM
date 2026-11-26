# Arma pass.js y pass-img.js (versión Boarding pass de Ticket Vintage) copiando del boarding pass de Tu Itinerario (index.html).
# Así el boarding pass del boleto luce igual al del creador de itinerario. Si se cambia el boarding pass en index.html,
# se vuelve a correr este archivo y después patch_tv.py.
# Uso (desde la carpeta del repositorio): python3 ticket-vintage-src/pass_from_index.py
import re, os, json
D = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(D, '..', 'index.html'), encoding='utf-8').read()
L = s.split('\n')
start = [i for i, l in enumerate(L) if 'Tu Itinerario by Hiperviajes · versión tabla única' in l][0]
ORDER = ['F', 'IMG_V', 'srcLogo', 'pimg', 'isWide', 'logoAt', 'apNick', 'PAX_ROWS', 'paxGrid', 'opName', 'csNote', 'jLabel', 'totLabel',
         'BFHEAD', 'BFC', 'PB_CITY', 'HVC', 'HVHEAD', 'pbHV', 'PB', 'pbLab', 'pbSep', 'pbImg', 'pbIcoRow', 'pbOff', 'pbLay', 'pbWho',
         'pbNote', 'pbTot', 'pbStubRoute', 'pbStubWrap', 'pbBigDate', 'passA', 'passB', 'passC', 'passHTML']
defs = {}
for i in range(start, len(L)):
    l = L[i]
    m = re.match(r'^(?:function ([A-Za-z0-9_]+)\(|var ([A-Za-z0-9_]+)\s*=)', l)
    if not m: continue
    n = m.group(1) or m.group(2)
    if n in ORDER and n not in defs:
        j = i + 1
        if l.startswith('function') and not l.rstrip().endswith('}'):
            while not L[j].startswith('}'): j += 1
            j += 1
        elif l.startswith('var'):
            # objetos de varias líneas: hasta que cierren las llaves
            while '\n'.join(L[i:j]).count('{') > '\n'.join(L[i:j]).count('}'): j += 1
        defs[n] = '\n'.join(L[i:j])
miss = [n for n in ORDER if n not in defs]
assert not miss, miss
code = '\n'.join(defs[n] for n in ORDER)

def rep(a, b, count=1):
    global code
    assert code.count(a) == count, (a, code.count(a))
    code = code.replace(a, b)

# 1) pasajeros, boletos y código de reserva en lugar de "Pasajero / Asesor"
rep('function pbWho(it) {', 'function pbWho(it) {\n  if (it.whoHTML) return it.whoHTML; /* Ticket Vintage */')
rep('  if (pax.length || it.advisor) {', '  if (pax.length || it.advisor || it.whoHTML) {')
# 2) franja con cabina, equipaje y asientos debajo de cada vuelo
rep("+ dur + '</td></tr></table>';", "+ dur + '</td></tr>' + pbExtra(s, o, 9) + '</table>';")
rep("HV.fmtDur(s.dur) + '</b>') + '</td></tr>';", "HV.fmtDur(s.dur) + '</b>') + '</td></tr>' + pbExtra(s, o, 9, k < j.segs.length - 1);")
rep("+ info + '</td></tr></table>' +", "+ info + '</td></tr>' + pbExtra(s, o, 11) + '</table>' +")
# 3) saludo y respaldo al pie del cuerpo
rep("  var nseg = J.reduce(", "  body += pbFoot(o);\n  var nseg = J.reduce(")
rep("  return pbStubWrap(body, J, o);", "  body += pbFoot(o);\n  return pbStubWrap(body, J, o);", 2)
# 4) en el talón, el saludo al pasajero en lugar de "¿Lo hacemos realidad?"
rep('pbImg(lo, o,', 'pbMsg(lo, o,', 2)

head = '''/* Ticket Vintage — versión Boarding pass.
   Copia del boarding pass turquesa de Tu Itinerario (index.html), generada por pass_from_index.py: no editar a mano.
   Agregados para el boleto: pasajeros con boletos y código de reserva (it.whoHTML), franja con cabina, equipaje y
   asientos debajo de cada vuelo (o.extra), saludo en el talón (o.msg) y al pie (o.foot). */
var TVPASS = (function () {
var U = HV.util, esc = HV.esc;
function pbExtra(s, o, n, mid) { var h = o.extra ? o.extra(s) : ''; return h ? '<tr><td colspan="' + n + '" bgcolor="#F6FDFC" style="background:#F6FDFC;border-top:1px solid #E3F4F2;' + (mid ? '' : 'border-radius:0 0 10px 10px;') + 'padding:7px 16px">' + h + '</td></tr>' : ''; }
function pbFoot(o) { return o.foot || ''; }
function pbMsg(n, o, w, h, extra) { return o.msg ? o.msg(w, extra) : pbImg(n, o, w, h, extra); }
'''
tail = '''
return { html: passHTML, PB: PB, F: F, pbLab: pbLab, pbSep: pbSep, paxGrid: paxGrid };
})();
'''
open(os.path.join(D, 'pass.js'), 'w', encoding='utf-8').write(head + code + tail)

# imágenes turquesa del boarding pass que Ticket Vintage todavía no tenía
m = re.search(r'PIMG\s*=\s*\{', s)
P = dict(re.findall(r'"([A-Za-z0-9_.\-]+)":\s*"(data:image/[a-z]+;base64,[A-Za-z0-9+/=]+)"', s[m.end() - 1:]))
want = sorted(k for k in P if k.endswith('-tq.png')) + ['dots-plane-white.png']
img = '/* Ticket Vintage — imágenes turquesa del boarding pass (copiadas de index.html por pass_from_index.py). */\n(function () { var A = ' + json.dumps({k: P[k] for k in want}) + '; for (var k in A) if (!PIMG[k]) PIMG[k] = A[k]; })();\n'
open(os.path.join(D, 'pass-img.js'), 'w', encoding='utf-8').write(img)
print('pass.js', len(head + code + tail), 'pass-img.js', len(img), want)
