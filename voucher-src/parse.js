/* Parser de solicitud de servicios + líneas de vuelo Amadeus. Sin dependencias de DOM. */
var MESES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
var MESES_EN=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
var SMALL={de:1,del:1,la:1,las:1,los:1,el:1,al:1,y:1,en:1,a:1,e:1,con:1,por:1,para:1,'+':1};
function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,' ').trim();}
function titleCase(s){
  return String(s).toLowerCase().replace(/\s+/g,' ').trim().split(' ').map(function(w,i){
    if(i>0&&SMALL[w])return w;
    return w.replace(/(^|[-\/(])([a-záéíóúñü])/g,function(m,p,c){return p+c.toUpperCase();});
  }).join(' ');
}
/* Reglas para pasar la jerga del pedido a texto de voucher (se aplican sobre texto ya en Title Case). */
var GLOSARIO=[
  [/\bFull Day\b/gi,'Full Day'],[/\bHalf Day\b/gi,'Half Day'],
  [/\bExcursion\b/gi,'Excursión'],[/\bTraslado\b/gi,'Traslado'],
  [/(^|\s)(?:Glaciar )?Moreno\b/g,function(m,p,o,full){return /Perito\s*$/.test(full.slice(0,o+p.length))?m:p+'Glaciar Perito Moreno';}],
  [/\bEntrada (?!al\b|a\b)(?=Parque)/g,'Entrada al '],
  [/\bParque Nacional (los|las|el|la|del|de)\b/g,function(m,a){return 'Parque Nacional '+a.charAt(0).toUpperCase()+a.slice(1);}],
  [/\bAeropuerto\b/g,'Aeropuerto']
];
function aplicarGlosario(t){
  GLOSARIO.forEach(function(r){t=t.replace(r[0],r[1]);});
  return t.replace(/Perito Perito/g,'Perito').replace(/Glaciar Glaciar/g,'Glaciar');
}
function destinoPorTexto(txt){
  var T=' '+norm(txt)+' ',best=null,len=0;
  FOTOS.forEach(function(f){
    f.a.forEach(function(a){
      var A=' '+norm(a)+' ';
      if(T.indexOf(A)>=0&&a.length>len){best=f;len=a.length;}
    });
  });
  return best;
}
function nombreDestino(f){if(f.x)return f.n;var a=f.a.slice().sort(function(x,y){return y.length-x.length;})[0];return titleCase(a||f.n);}
function paisDe(f){return PAISES[f.n]||'';}
function selloDe(f){
  var s=null,key=f.s||f.n;
  if(f.x&&!f.s)return null; // lugar nuevo sin sello propio: no se usa el de otra ciudad que comparte aeropuerto
  SELLOS.forEach(function(x){if(!s&&norm(x.n)===norm(key))s=x;});
  if(!s&&!f.x)SELLOS.forEach(function(x){if(!s&&x.c&&f.c.some(function(c){return x.c.indexOf(c)>=0;}))s=x;});
  return s;
}
function fechaDe(txt,anioRef){
  var m=txt.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if(!m)return null;
  var y=m[3]?+m[3]:(anioRef||new Date().getFullYear());if(y<100)y+=2000;
  return {d:+m[1],m:+m[2],y:y,raw:m[0]};
}
function iso(f){return f.y*10000+f.m*100+f.d;}
function diaSemana(f){var d=new Date(Date.UTC(f.y,f.m-1,f.d));return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getUTCDay()];}

/* ---- Vuelos y pasajeros (Amadeus) ---- */
function parseVuelos(txt){
  var out=[],pax=[],warns=[];
  var re=/^\s*\d+\s+([A-Z0-9]{2})\s*(\d{1,4})\s+[A-Z]\s+(\d{2})([A-Z]{3})\s+\d?\*?\s*([A-Z]{3})([A-Z]{3})\s+[A-Z]{2}\d+\s+(\d{4})\s+(\d{4})(?:\s+(\d{2})([A-Z]{3}))?/;
  txt.split(/\r?\n/).forEach(function(l){
    var m=l.match(re);
    if(m){
      var mes=MESES_EN.indexOf(m[4])+1;
      if(mes<1){warns.push('Mes no reconocido en: '+l.trim());return;}
      out.push({aero:m[1],num:m[2],d:+m[3],m:mes,from:m[5],to:m[6],dep:m[7].slice(0,2)+':'+m[7].slice(2),arr:m[8].slice(0,2)+':'+m[8].slice(2),
        arrD:m[9]?+m[9]:null,arrM:m[10]?MESES_EN.indexOf(m[10])+1:null});
      return;
    }
    var pm,pr=/(\d+)\.\s*([A-ZÁÉÍÓÚÑ'\-]+)\/([A-ZÁÉÍÓÚÑ'\- ]+?)(?=\s{2,}|\s+\d+\.|$)/g;
    while((pm=pr.exec(l))){pax.push(titleCase(pm[3].replace(/\s+(MR|MRS|MS|MISS|MSTR|CHD|INF)\b/,''))+' '+titleCase(pm[2]));}
  });
  return {vuelos:out,pax:pax,warns:warns};
}

/* ---- Cotizaciones / confirmaciones de receptivos (formato libre) ---- */
var MES_TXT={ene:1,enero:1,jan:1,january:1,feb:2,febrero:2,february:2,mar:3,marzo:3,march:3,abr:4,abril:4,apr:4,april:4,may:5,mayo:5,jun:6,junio:6,june:6,jul:7,julio:7,july:7,ago:8,agosto:8,aug:8,august:8,sep:9,set:9,sept:9,septiembre:9,setiembre:9,september:9,oct:10,octubre:10,october:10,nov:11,noviembre:11,november:11,dic:12,diciembre:12,dec:12,december:12};
function kvCampos(lines){ // "Etiqueta:" en una línea y el valor en la siguiente, o "Etiqueta: valor"
  var kv={},i,l,m;
  for(i=0;i<lines.length;i++){
    l=lines[i];m=l.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñºª°\.\s]{3,30}):\s*(.*)$/);if(!m)continue;
    var k=norm(m[1]).replace(/[º°ª\.]/g,'').replace(/\s+/g,' ').trim(),v=m[2].trim();
    if(!v){var j=i+1;while(j<lines.length&&!lines[j].trim())j++;if(j<lines.length&&!/:\s*$/.test(lines[j])&&!/^[A-Za-zÁÉÍÓÚÑáéíóúñº°\.\s]{3,30}:/.test(lines[j]))v=lines[j].trim();}
    if(!(k in kv))kv[k]=v;
  }
  return kv;
}
function anioDeTexto(txt){var m=txt.match(/\b(\d{1,2})\s+(?:de\s+)?([A-Za-zé]+)\s+(?:de\s+)?(20\d\d)\b/);if(m&&MES_TXT[m[2].toLowerCase()])return {y:+m[3],m:MES_TXT[m[2].toLowerCase()],d:+m[1]};m=txt.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/);if(m)return {y:+m[3],m:+m[2],d:+m[1]};m=txt.match(/\b(20\d\d)\b/);return m?{y:+m[1],m:1}:null;}
function limpiarPrecio(t){return t.replace(/\s+(sgl|dbl|tpl|single|doble|triple|usd|us\$|u\$s|\$|precio|neto|tarifa|por\s+pax)\b.*$/i,'').replace(/\s+\b[A-Z]{3}\b\s*$/,'').trim();}
var RE_LINEA_FECHA=/^[\s\-–•*·]*(?:(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-zéá]*\.?,?\s+)?(\d{1,2})[\s\-\/]*(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:t(?:iembre)?)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|jan|apr|aug|dec)\.?\s*[\-–:]?\s*(.+)$/i;

/* ---- Itinerarios en tabla: "dd/mm/aa  descripción" con renglones de continuación ---- */
function ciudadPorCodigo(code){
  var C=norm(code),r=null;
  FOTOS.forEach(function(f){if(!r&&f.c.indexOf(C)>=0)r=f;});
  if(!r)FOTOS.forEach(function(f){if(!r&&f.a.some(function(a){return norm(a).indexOf(C)===0;}))r=f;});
  return r;
}
function sumarDias(f,n){var d=new Date(Date.UTC(f.y,f.m-1,f.d+n));return {d:d.getUTCDate(),m:d.getUTCMonth()+1,y:d.getUTCFullYear()};}
function esTabla(txt){return txt.split(/\r?\n/).filter(function(l){return /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\S/.test(l);}).length>=2;}
function parseTabla(txt,kindDef){
  var svs=[],noches={},ciudades=[],cur=null,city=null,last=null,warns=[];
  function key(f){return f.y*10000+f.m*100+f.d;}
  function linea(t,f){
    t=t.replace(/\s{2,}/g,' ').trim();if(!t||/^[-=_]{5,}$/.test(t)||/^fecha\s+descrip/i.test(t))return;
    var mh=t.match(/^(hotel|hostal|posada|pousada|lodge|resort|apart\s*hotel)\b\s*(.*)$/i);
    if(mh){noches[key(f)]={nombre:titleCase(t).replace(/\b(Nh|Hb|Ac|Ws|Gh|By)\b/g,function(x){return x==='By'?'by':x.toUpperCase();}),f:f,city:city};return;}
    var mi=t.match(/^incluye\s*:?\s*(.+)$/i);if(mi){if(last){last.det=(last.det?last.det+' · ':'')+'Incluye: '+mi[1].toLowerCase();}return;}
    if(/^(d[ií]a|ma[nñ]ana|tarde|noche)?\s*libre\b/i.test(t)||/^(ma[nñ]ana|tarde|d[ií]a) libre/i.test(t))return;
    var mc=t.match(/^([A-Z]{3})\s*:\s*/);if(mc){var cc=ciudadPorCodigo(mc[1]);if(cc){city=cc;if(ciudades.indexOf(cc)<0)ciudades.push(cc);}t=t.slice(mc[0].length);}
    var hora='',mt=t.match(/^(\d{1,2}[:.]\d{2})(?:\s*(?:a|-|–|hs\.?\s*a)\s*(\d{1,2}[:.]\d{2}))?\s*(hs\.?)?\s*/i);
    if(mt){hora=mt[2]?mt[1]+' a '+mt[2]+' hs':mt[1]+' hs';t=t.slice(mt[0].length);}
    var mtu=t.match(/^(am|pm|por la ma[nñ]ana|por la tarde|por la noche)\s*[:,-]?\s*/i);
    if(mtu){var tu=mtu[1].toLowerCase();hora=hora||({am:'Por la mañana',pm:'Por la tarde'}[tu]||tu.charAt(0).toUpperCase()+tu.slice(1));t=t.slice(mtu[0].length);}
    t=limpiarPrecio(t);if(t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,'').length<4)return;
    var kd=/privad/i.test(t)?'privado':(/regular|compartid|\bsib\b/i.test(t)?'regular':kindDef);
    t=t.replace(/\(\s*(privado|regular|compartido|sib)\s*\)/ig,'').trim();
    if(/^(traslado|transfer|trf)\b/i.test(t)){
      var rt=t.replace(/^(traslado|transfer|trf)\s*(privado|regular|compartido)?\s*(de\s+)?/i,'');
      var ps=rt.split(/\s*\/\s*|\s+[-–>→]+\s+/);
      if(ps.length>=2){
        var fr=ps[0].trim(),to=ps.slice(1).join(' - ').trim();
        var tp=/aeropuerto|airport/i.test(fr)?'in':(/aeropuerto|airport/i.test(to)?'out':'tr');
        last={tipo:tp,kind:kd,rawFrom:fr,rawTo:to,f:f,city:city,hora:hora,ready:true};svs.push(last);return;
      }
    }
    var dm=destinoPorTexto(t);if(dm&&ciudades.indexOf(dm)<0&&(!ciudades.length||paisDe(dm)===paisDe(ciudades[0])))ciudades.push(dm);
    var ti=aplicarGlosario(titleCase(t)).replace(/^Embarque en (Tren .+?) con Destino (?:al Pueblo de |a la Ciudad de |al |a )(.+)$/,'$1 a $2');
    last={tipo:'exc',titulo:ti,f:f,city:city,det:hora,raw:t};svs.push(last);
  }
  txt.split(/\r?\n/).forEach(function(l){
    var m=l.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(.*)$/);
    if(m){var y=+m[3];if(y<100)y+=2000;cur={d:+m[1],m:+m[2],y:y};linea(m[4],cur);return;}
    if(cur)linea(l,cur);
  });
  function hotelEn(f){var h=noches[key(f)];return h?h.nombre:'';}
  function lugarT(raw,s,esOrigen){
    var r=raw.trim(),c=s.city;
    if(/^hotel$/i.test(r)){var h=esOrigen?(hotelEn(sumarDias(s.f,-1))||hotelEn(s.f)):(hotelEn(s.f)||hotelEn(sumarDias(s.f,-1)));return h||'Hotel';}
    if(/^aeropuerto$/i.test(r))return 'Aeropuerto'+(c?' '+nombreDestino(c):'');
    return titleCase(r).replace(/^Estacion\b/,'Estación').replace(/\bEstacion\b/g,'Estación');
  }
  svs.forEach(function(s){if(s.ready){s.from=lugarT(s.rawFrom,s,true);s.to=lugarT(s.rawTo,s,false);if(s.hora)s.det=s.hora;}});
  // agrupar noches consecutivas en un mismo hotel
  var ks=Object.keys(noches).sort(),grupos=[];
  ks.forEach(function(k){var n=noches[k],g=grupos[grupos.length-1];
    if(g&&g.nombre===n.nombre&&key(sumarDias(g.ult,1))===+k){g.ult=n.f;g.n++;}else grupos.push({nombre:n.nombre,f:n.f,ult:n.f,n:1});});
  grupos.forEach(function(g){svs.push({tipo:'hotel',hotel:g.nombre,det:[],noches:g.n,f:g.f,co:sumarDias(g.ult,1),ready:true});});
  return {svs:svs,ciudades:ciudades,warns:warns};
}

/* ---- Solicitud de servicios ---- */
function parseServicios(txt){
  var warns=[],lines=txt.split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean);
  var dest=destinoPorTexto(txt),svs=[],paxTxt=null,paxN=null,kind='regular',hdrDest=null;
  var anio=null;(txt.match(/\d{1,2}\/\d{1,2}\/(\d{2,4})/)||[])[1]&&(anio=+RegExp.$1);if(anio&&anio<100)anio+=2000;
  var kv=kvCampos(txt.split(/\r?\n/)),ref=kv['FECHA VIAJE']?anioDeTexto(kv['FECHA VIAJE']):anioDeTexto(txt);
  if(!anio&&ref)anio=ref.y;
  var opTxt=kv['OPERADOR']||kv['RECEPTIVO']||kv['PROVEEDOR']||kv['CLIENTE']||'';
  var hoteles=[],rawL=txt.split(/\r?\n/).map(function(l){return l.trim();});
  rawL.forEach(function(l,i){if(/^\(\s*\d\s*\*?\s*\)$/.test(l)||/^\*{3,5}$/.test(l)){for(var j=i-1;j>=0;j--){if(rawL[j]){if(!/:/.test(rawL[j]))hoteles.push(rawL[j]);break;}}}});
  if(!hoteles.length)rawL.forEach(function(l){if(/^(hotel|hostal|posada|pousada|resort)\s+\S+/i.test(l)&&!/\d{1,2}\/\d/.test(l)&&l.length<70)hoteles.push(l);});
  var paxKv=kv['NOMBRE PAX']||kv['PASAJERO TITULAR']||kv['TITULAR']||kv['PASAJERO']||kv['PASAJEROS']||kv['NOMBRE']||'',nKv=parseInt(kv['N PAXS']||kv['N PAX']||kv['NO PAXS']||kv['CANTIDAD DE PAX']||kv['CANTIDAD']||kv['PAXS']||0,10)||0;
  if(!nKv){var mb=txt.match(/base\s+(\d+)\s*paxs?/i)||txt.match(/\b(\d+)\s*paxs?\b/i);if(mb)nKv=+mb[1];}
  var TB=null;
  if(esTabla(txt)){
    var kdef=/PRIVAD/.test(norm(kv['SERVICIOS EN']||''))?'privado':(/COMPART|REGULAR/.test(norm(kv['SERVICIOS EN']||''))?'regular':'');
    TB=parseTabla(txt,kdef);lines=[];hoteles=[];
  }

  lines.forEach(function(l){
    var low=norm(l);
    var mn=l.match(/^[\s\-–•*·]*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*[-–:]?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ*].+)$/);
    var md=l.match(RE_LINEA_FECHA);
    if(!md&&mn)md=[mn[0],mn[1],'#'+mn[2]+(mn[3]?'/'+mn[3]:''),mn[4]];
    if(md&&(md[2].charAt(0)==='#'||!/^\d{1,2}\/\d/.test(l))){
      var mes,y;
      if(md[2].charAt(0)==='#'){var pp2=md[2].slice(1).split('/');mes=+pp2[0];y=pp2[1]?(+pp2[1]<100?+pp2[1]+2000:+pp2[1]):null;}
      else mes=MES_TXT[md[2].toLowerCase().slice(0,3)]||MES_TXT[md[2].toLowerCase()];
      if(!y){y=anio||(ref&&ref.y)||new Date().getFullYear();if(ref&&mes<ref.m)y=ref.y+1;}
      var cu0=md[3].replace(/^\*+\s*/,''),my=cu0.match(/^(?:de\s+)?(20\d\d)\b\s*[-–:]?\s*/i);if(my){y=+my[1];cu0=cu0.slice(my[0].length);}
      var f={d:+md[1],m:mes,y:y},cuerpo=limpiarPrecio(cu0.replace(/^\*+\s*/,''));
      if(/^(de\s+)?\d{4}$/.test(cuerpo)||cuerpo.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,'').length<4)return;
      var kd=/privad/i.test(cuerpo)?'privado':(/regular|compartid|\bsib\b|shared/i.test(cuerpo)?'regular':kind);
      cuerpo=cuerpo.replace(/\(\s*(privado|regular|compartido|sib)\s*\)/ig,'').replace(/\s{2,}/g,' ').trim().replace(/\s+\b[A-Z]{3}\b\s*$/,'').trim();
      if(/^(traslado|transfer|trf|in\b|out\b)/i.test(cuerpo)){
        var rt=cuerpo.replace(/^(traslado|transfer|trf)\s*(privado|regular|compartido)?\s*(de\s+)?/i,'').replace(/^(in|out)\s*[:\-]?\s*/i,'');
        var ps=rt.split(/\s*\/\s*|\s+[-–>→]+\s+|\s+a\s+(?=hotel|aeropuerto)/i);
        if(ps.length>=2){
          var fr=ps[0],to=ps.slice(1).join(' - ');
          var tp=/aeropuerto|airport|terminal/i.test(fr)?'in':(/aeropuerto|airport|terminal/i.test(to)?'out':'tr');
          svs.push({tipo:tp,kind:kd,from:fr,to:to,f:f,raw:l});
        }else{svs.push({tipo:'exc',titulo:aplicarGlosario(titleCase(cuerpo)),f:f,raw:l});}
      }else{svs.push({tipo:'exc',titulo:aplicarGlosario(titleCase(cuerpo)),f:f,raw:l});}
      return;
    }
    var mp=l.match(/^(.+?)\s*[xX]\s*(\d+)\s*$/)||l.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ' ]{3,60}?)\s*\(\s*(\d+)\s*pax/i);
    if(mp&&/^(base|ciudad|precio|menor)/i.test(mp[1]))mp=null;
    if(mp&&!/\d\/\d/.test(l)){paxTxt=titleCase(mp[1]);paxN=+mp[2];return;}
    var ml=l.match(/^(llegada|salida|in|out|ida|regreso)\s*:\s*(.+)$/i);
    if(ml){
      var f=fechaDe(ml[2],anio),cuerpo=ml[2].replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/,'').trim();
      var partes=cuerpo.split(/\s+[-–>→]+\s+/);
      if(partes.length<2){warns.push('No pude separar origen y destino en: "'+l+'"');return;}
      var esIn=/^(llegada|in|ida)/i.test(ml[1]);
      svs.push({tipo:esIn?'in':'out',kind:kind,from:partes[0],to:partes.slice(1).join(' - '),f:f,raw:l});
      if(!f)warns.push('Servicio sin fecha: "'+l+'"');
      return;
    }
    if(/^traslado/i.test(low)){
      kind=/PRIVAD/.test(low)?'privado':(/REGULAR|COMPARTID/.test(low)?'regular':'');
      var d=destinoPorTexto(l);if(d)hdrDest=d;
      var f2=fechaDe(l,anio);
      if(f2){ // traslado suelto con fecha en la misma línea
        var cu=l.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/,'');
        var pp=cu.split(/\s+[-–>→]+\s+/);
        if(pp.length>=2){var esAero=/aeropuerto/i.test(pp[0].replace(/^traslado\s+\w*\s*/i,''));
          svs.push({tipo:esAero?'in':'out',kind:kind,from:pp[0].replace(/^traslado\s+(regular|privado)?\s*/i,''),to:pp.slice(1).join(' - '),f:f2,raw:l});}
      }
      return;
    }
    if(/^(excursi|tour|paseo|entrada|city tour|visita|full day|half day)/i.test(low)){
      var f3=fechaDe(l,anio),t=l.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/,'').trim();
      svs.push({tipo:'exc',titulo:aplicarGlosario(titleCase(t)),f:f3,raw:l});
      if(!f3)warns.push('Excursión sin fecha: "'+l+'"');
      return;
    }
  });
  if(hdrDest)dest=hdrDest;
  var hotelSvs=[];
  hoteles.forEach(function(h){
    var i0=rawL.indexOf(h),det=[],noches=null,j,l2;
    for(j=i0+1;j<rawL.length&&j<i0+25;j++){l2=rawL[j];if(!l2)continue;if(/^ciudad\s*:/i.test(l2)||RE_LINEA_FECHA.test(l2)||hoteles.indexOf(l2)>=0)break;
      var mN=l2.match(/(\d+)\s*noches?/i);if(mN&&!noches)noches=+mN[1];
      if(/desayuno|media pensi|pensi[oó]n completa|all inclusive|todo incluido|solo alojamiento|\bsuperior\b|standard|est[aá]ndar|deluxe|\bsuite\b|habitaci[oó]n (doble|triple|single|cu[aá]druple)/i.test(l2)&&!/usd|u\$s|precio|neto|\$/i.test(l2))det.push(l2.replace(/\s{2,}/g,' '));}
    var ci=(ref&&ref.d)?{d:ref.d,m:ref.m,y:ref.y}:null,co=null;
    if(ci&&noches){var dt=new Date(Date.UTC(ci.y,ci.m-1,ci.d+noches));co={d:dt.getUTCDate(),m:dt.getUTCMonth()+1,y:dt.getUTCFullYear()};}
    hotelSvs.push({tipo:'hotel',hotel:h,det:det,noches:noches,f:ci,co:co});
    if(!ci)warns.push('Hotel "'+h+'" sin fecha de entrada: completala en el voucher.');
  });
  if(!paxTxt&&paxKv){var pm2=paxKv.match(/^(.+?)\s*\(\s*(\d+)\s*pax/i)||paxKv.match(/^(.+?)\s*[xX]\s*(\d+)\s*$/);paxTxt=titleCase(pm2?pm2[1]:paxKv);if(pm2&&!nKv)nKv=+pm2[2];}if(!paxN&&nKv)paxN=nKv;
  var destTitulo='';
  if(TB){svs=TB.svs;warns=warns.concat(TB.warns);
    if(TB.ciudades.length){dest=TB.ciudades.filter(function(c){return c.p||c.f;})[0]||TB.ciudades[0];
      var nm=[];TB.ciudades.forEach(function(c){var n=nombreDestino(c);if(nm.indexOf(n)<0)nm.push(n);});
      if(nm.length>1)destTitulo=nm.length===2?nm.join(' y '):nm.slice(0,-1).join(', ')+' y '+nm[nm.length-1];}
  }
  return {dest:dest,destTitulo:destTitulo,svs:svs.concat(hotelSvs),paxTxt:paxTxt,paxN:paxN,warns:warns,anio:anio,opTxt:opTxt,hoteles:hoteles};
}

function lugar(t,dest,hoteles){
  var s=t.trim();
  if(hoteles&&hoteles.length===1&&/^hotel(\s+en\s+.+|\s*)$/i.test(s))return titleCase(hoteles[0]).replace(/\b(Nh|Hb|Ac|Ws|Gh)\b/g,function(x){return x.toUpperCase();});
  if(/^aeropuerto\b/i.test(s)){
    var resto=s.replace(/^aeropuerto\s*/i,'').replace(/^(de|del|internacional de)\s+/i,'');
    if(!resto&&dest)return 'Aeropuerto '+nombreDestino(dest);
    var d=destinoPorTexto(resto)||dest;
    if(d&&norm(resto)===norm(d.n)||(d&&d.a.some(function(a){return norm(a)===norm(resto);})))return 'Aeropuerto '+nombreDestino(d);
    return 'Aeropuerto '+titleCase(resto);
  }
  return titleCase(s);
}

/* ---- Armado del voucher ---- */
function armarVoucher(txtServ,txtVuelos){
  var S=parseServicios(txtServ),V=parseVuelos(txtVuelos||''),warns=S.warns.concat(V.warns),dest=S.dest;
  if(!dest)warns.push('No reconocí el destino: elegilo manualmente o revisá el texto.');
  var codes=dest?dest.c:[];
  var items=[];
  S.svs.forEach(function(s){
    var it={f:s.f,tipo:s.tipo};
    if(s.tipo==='exc'){it.titulo=s.titulo;if(s.det)it.det=s.det;items.push(it);return;}
    if(s.tipo==='hotel'){
      it.titulo=(s.ready?s.hotel:titleCase(s.hotel).replace(/\b(Nh|Hb|Ac|Ws|Gh)\b/g,function(x){return x.toUpperCase();})).replace(/^(Hotel|Hostal|Posada|Pousada|Lodge) (el|la|los|las|del|de)\b/,function(m,a,b){return a+' '+b.charAt(0).toUpperCase()+b.slice(1);});
      var d=s.det.map(function(x){return x.charAt(0).toUpperCase()+x.slice(1).toLowerCase();}).join(' · ');
      it.co=s.co;
      var rango=(s.f&&s.co)?'del '+s.f.d+' '+MESES[s.f.m-1]+' al '+s.co.d+' '+MESES[s.co.m-1]:(s.co?'salida '+s.co.d+' '+MESES[s.co.m-1]:'');
      it.det=['Alojamiento',s.noches?(s.noches+(s.noches===1?' noche':' noches')):'',rango,d].filter(Boolean).join(' · ');
      items.push(it);return;
    }
    var k=s.kind==='privado'?'Privado':(s.kind==='regular'?'Regular':'');
    it.titulo=('Traslado '+k).trim()+(s.tipo==='tr'?'':' – '+(s.tipo==='in'?'IN':'OUT'));
    if(s.ready){it.from=s.from;it.to=s.to;if(s.det)it.det=s.det;}else{it.from=lugar(s.from,dest,S.hoteles);it.to=lugar(s.to,dest,S.hoteles);}
    // vuelo asociado
    if(s.f&&V.vuelos.length&&s.tipo!=='tr'){
      var cand=V.vuelos.filter(function(v){
        if(s.tipo==='in'){var dd=v.arrD||v.d,mm=v.arrM||v.m;return dd===s.f.d&&mm===s.f.m&&codes.indexOf(v.to)>=0;}
        return v.d===s.f.d&&v.m===s.f.m&&codes.indexOf(v.from)>=0;
      });
      if(cand.length===1){var v=cand[0];it.vuelo={n:v.aero+v.num,from:v.from,to:v.to,dep:v.dep,arr:v.arr,sig:!!(v.arrD&&v.arrD!==v.d)};}
      else if(cand.length>1)warns.push('Más de un vuelo coincide con el '+s.f.d+'/'+s.f.m+' ('+s.tipo.toUpperCase()+'): revisá a mano.');
      else warns.push('No encontré vuelo para el traslado '+s.tipo.toUpperCase()+' del '+s.f.d+'/'+s.f.m+'.');
    }
    items.push(it);
  });
  items.forEach(function(x,i){x._i=i;});
  items.sort(function(a,b){return (a.f?iso(a.f):0)-(b.f?iso(b.f):0)||((a.tipo==='hotel')-(b.tipo==='hotel'))||(a._i-b._i);});
  // pasajeros
  var pax=V.pax.length?V.pax:(S.paxTxt?[S.paxTxt]:[]);
  if(S.paxN&&pax.length>1&&pax.length!==S.paxN)warns.push('La solicitud dice x'+S.paxN+' pero hay '+pax.length+' nombre(s) en el PNR/solicitud.');
  if(S.paxTxt&&V.pax.length&&!V.pax.some(function(p){return norm(p)===norm(S.paxTxt);}))warns.push('El pasajero de la solicitud ("'+S.paxTxt+'") no figura en el PNR.');
  var n=S.paxN||pax.length;
  if(!items.length)warns.push('No detecté ningún servicio.');
    // operador mencionado en el texto
  var opDet=null,T=norm(txtServ+'\n'+(txtVuelos||''));
  OPERADORES.forEach(function(o){if(opDet)return;(o.k||[]).forEach(function(k){if(!opDet&&(' '+T.replace(/[^A-Z0-9]+/g,' ')+' ').indexOf(' '+norm(k)+' ')>=0)opDet=o;});});
  var opTxt=opDet?'':(S.opTxt||'');
  if(!pax.length&&n)warns.push('La solicitud no trae nombres de pasajeros: completalos en el voucher ('+n+' pax).');
  if(opTxt)warns.push('Operador detectado: "'+opTxt+'". No tiene logo cargado; se muestra el nombre. Podés subir el logo.');
  return {dest:dest,destNombre:S.destTitulo||(dest?nombreDestino(dest):''),pais:dest?paisDe(dest):'',pax:pax,npax:n,items:items,warns:warns,op:opDet,opTxt:opTxt};
}
