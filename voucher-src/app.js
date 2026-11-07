var REMOTE='https://raw.githubusercontent.com/gonzalonocella-G04T/PNR-CREATOR-GNM/main/';
var HV_LOGO='img/hiperviajes-slogan-teal.png',state={logoPos:'auto',ver:'foto',v:null,opLogo:null,hvLogo:null};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function im(path,cls,alt){
  var rel=/^(data:|blob:|https?:)/.test(path);
  return '<img'+(cls?' class="'+cls+'"':'')+' crossorigin="anonymous" src="'+esc(path)+'" alt="'+esc(alt||'')+'"'+(rel?'':' onerror="if(!this.dataset.r){this.dataset.r=1;this.src=REMOTE+this.getAttribute(\'src\')}"')+'>';
}
function opImg(path,cls){
  var o=OPERADORES.filter(function(x){return x.logo===path;})[0];
  var h=im(path,cls,'Operador');
  return (o&&o.bg)?h.replace('<img','<img style="background:'+o.bg+';border-radius:1.4mm"'):h;
}
var IC={
 hielo:'<path d="M12 2v20M4 7l16 10M4 17L20 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
 cataratas:'<path d="M4 4h16M7 4v6M12 4v10M17 4v8"/><path d="M4 20c2-2 4-2 6 0s4 2 6 0 3-2 4-1"/>',
 barco:'<path d="M3 15h18l-3 5H6z"/><path d="M12 3v12M12 4l6 9h-6"/>',
 buceo:'<path d="M3 10c0-2 2-3 5-3h8c3 0 5 1 5 3v3c0 3-2 4-4 4-2 0-3-1-4-3h-2c-1 2-2 3-4 3-2 0-4-1-4-4z"/><path d="M19 7l2-4"/>',
 ciudad:'<path d="M4 21V9h6v12M10 21V4h10v17M3 21h18M13 8h2M13 12h2M13 16h2M6 12h2M6 16h2"/>',
 vino:'<path d="M8 3h8l-1 7a3 3 0 01-6 0z"/><path d="M12 13v7M8 21h8"/>',
 montana:'<path d="M2 20l7-12 4 7 3-4 6 9z"/>',
 playa:'<circle cx="12" cy="8" r="3.5"/><path d="M12 1.5v2M4.5 4.5l1.4 1.4M19.5 4.5l-1.4 1.4M2 8h2M20 8h2"/><path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
 jeep:'<path d="M3 15v-4l3-4h9l4 4v4z"/><circle cx="7" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>',
 historia:'<path d="M3 9l9-5 9 5zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18"/>',
 show:'<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z"/>',
 naturaleza:'<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>',
 avion:'<path d="M21 4L3 11l6 2 2 6 3-5z"/>',
 traslado:'<path d="M4 16v-4l2-5h12l2 5v4z"/><path d="M4 12h16"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/>',
 brujula:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'};
IC.nieve=IC.hielo;
IC.hotel='<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 00-3-3h-7v1"/><circle cx="7" cy="10" r="2"/><path d="M3 18h18"/>';
IC.hielo='<path d="M3 17l3-8 3 3 3-7 3 6 3-2 3 8z"/><path d="M2 20.5c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0"/>';
IC.piramide='<path d="M12 3L2 20h20z"/><path d="M12 3l3 17M7.5 11.5h9"/>';
IC.lago='<path d="M3 13l5-6 3 4 3-3 7 5"/><path d="M2 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M4 20.5c2-1.2 4-1.2 6 0s4 1.2 6 0"/>';
IC.delfin='<path d="M3 15c3-6 9-9 15-8l2-3 .5 4c1 1 1.5 2 1.5 3-3-1-5 0-7 2l1 3-3-2c-3 1-7 1-10 1z"/><path d="M2 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>';
IC.ruinas='<path d="M3 21h18M5 21V10M9 21V8M15 21V12M19 21V9M4 8h6M14 9.5l5-1.5"/>';
IC.animales='<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="6.5" r="1.8"/><circle cx="18.5" cy="10.5" r="1.8"/><path d="M8 17c0-3 2.5-5.5 5-5.5s5 2.5 5 5c0 2-1.6 3-3 2.5-1.2-.4-1.4-1-2-1s-.8.6-2 1C9.6 19.5 8 19 8 17z"/>';
IC.parque='<path d="M2 18c3 0 4-10 7-10s3 8 6 8 3-6 7-6"/><path d="M4 21v-5M9 21V10M15 21v-6M20 21V12M2 21h20"/>';
IC.rascacielos='<path d="M3 21h18M5 21V10h4v11M9 21V3h6v18M15 21V8h4v13M11 7h2M11 11h2M11 15h2"/>';
IC.monumento='<path d="M10 21l1-14 1-4 1 4 1 14z"/><path d="M6 21h12M8 18h8"/>';
var ICMAP=[
 [/parque tem[aá]tico|disney|universal studios|six flags|beto carrero|seaworld|monta[nñ]a rusa|xcaret|xplor|xel-?h[aá]|parque de diversiones/i,'parque'],
 [/delf[ií]n|ballena|nado con/i,'delfin'],
 [/pir[aá]mide|teotihuac|chich[eé]n|giza|cob[aá]\b/i,'piramide'],
 [/ruinas|maya|inca|tulum|machu|templo|arqueol|sacsayhuam|pisac|ollantay/i,'ruinas'],
 [/monumento|obelisco|estatua|cristo redentor|corcovado|torre eiffel|coliseo|arco de/i,'monumento'],
 [/rascacielos|empire state|top of the rock|one world|skyline|edificio|burj|observatorio/i,'rascacielos'],
 [/nieve|esqu[ií]|\bski\b|cerro catedral|chapelco|valle nevado|farellones|trineo/i,'nieve'],
 [/glaciar|moreno|hielo|iceberg/i,'hielo'],
 [/catarata|iguaz|iguacu|garganta del diablo|salto|cascada/i,'cataratas'],
 [/lago|laguna|cruce andino|cruce de lagos|nahuel huapi|todos los santos|titicaca/i,'lago'],
 [/catamar|barco|navega|crucero|lancha|velero|jangada|canal|isla/i,'barco'],
 [/snorkel|buceo|bucear|arrecife|piscinas? naturales?|cenote/i,'buceo'],
 [/vino|bodega|vi[nñ]edo|cata\b|degustaci/i,'vino'],
 [/helic|sobrevuelo|avioneta|globo/i,'avion'],
 [/animal|zool|safari|ping[uü]in|aves|avistaje|fauna|lobos? marinos?|tortuga|cocodril|caballo|cabalgata/i,'animales'],
 [/4x4|buggy|jeep|dunas|quebrada|cuatriciclo|desierto|salinas/i,'jeep'],
 [/trekking|caminata|senderis|mirador|cerro|monta[nñ]a|volc[aá]n|cordillera|andes|torres|fitz|chalt[eé]n|osorno/i,'montana'],
 [/city tour|ciudad|centro hist|recorrida|panor[aá]mic|visita de la|museo|iglesia|cultural|hist[oó]ric/i,'ciudad'],
 [/show|tango|cena|noche|folklor|espect/i,'show'],
 [/parque|reserva|selva|bosque|jard|naturaleza/i,'naturaleza'],
 [/playa|beach|day pass|cayo|sol\b/i,'playa']];
function iconKey(it){
  if(it.tipo==='hotel')return 'hotel';
  if(it.tipo!=='exc')return 'traslado';
  var t=it.titulo||'';for(var i=0;i<ICMAP.length;i++)if(ICMAP[i][0].test(t))return ICMAP[i][1];return 'brujula';
}
function iconSvg(it){return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+IC[iconKey(it)]+'</svg>';}
function excFoto(t){
  var T=norm(t),port=fotoDe();
  for(var k=0;k<EXC_FOTOS.length;k++){var ks=EXC_FOTOS[k].k.split('|');for(var m=0;m<ks.length;m++)if(T.indexOf(norm(ks[m]))>=0){var f=EXC_FOTOS[k].f;return f===port?'':f;}}
  return '';
}
function fotoDe(){var d=state.v&&state.v.dest;return d?(d.p||(d.f?'tv-fotos/'+d.f:'')):'';}
function $(id){return document.getElementById(id);}
function fechaHtml(f){
  if(!f)return '<div class="dt"><b>--</b><i>---</i><u>&nbsp;</u></div>';
  return '<div class="dt"><b>'+String(f.d).padStart(2,'0')+'</b><i>'+MESES[f.m-1]+'</i><u>'+f.y+'</u></div>';
}
function itemHtml(it){
  var fo=(it.tipo==='exc'&&state.ver==='foto')?excFoto(it.titulo||''):'';
  var h='<div class="sv'+(fo?' exc':'')+'">'+(fo?'<div class="strip">'+im(fo,'','')+'<div class="fade"></div></div>':'')+fechaHtml(it.f)+'<div class="tx"><div class="ti"><span class="icw">'+iconSvg(it)+'</span><span contenteditable>'+esc(it.titulo)+'</span></div>';
  if(it.det)h+='<div class="rt" contenteditable>'+esc(it.det)+'</div>';
  if(it.from)h+='<div class="rt"><span contenteditable>'+esc(it.from)+'</span><em>→</em><span contenteditable>'+esc(it.to)+'</span></div>';
  if(it.vuelo){var v=it.vuelo;h+='<div class="fl"><span contenteditable>'+esc(v.n)+'</span><i>|</i><span contenteditable>'+v.from+' → '+v.to+'</span><i>|</i><span contenteditable>'+v.dep+' – '+v.arr+(v.sig?' (+1)':'')+'</span></div>';}
  return h+'</div></div>';
}
function render(){
  var v0=state.v,st=$('stage'),v=v0?Object.assign({},v0,{items:v0.items.filter(function(x){return !x.off;})}):v0;
  if(!v){st.innerHTML='<p class="hint" style="text-align:center;margin-top:60px">Pegá la solicitud y las líneas de vuelo, y tocá “Generar voucher”.</p>';return;}
  var dest=v.dest,foto=dest?(dest.p||(dest.f?'tv-fotos/'+dest.f:'')):'',sel=dest?selloDe(dest):null;
  var hv=state.hvLogo||HV_LOGO,op=state.opLogo;
  var abajo=state.logoPos==='abajo'||state.autoAbajo;
  function opHtml(cls){if(op)return opImg(op,cls);if(state.opTxt)return '<span class="optxt '+cls+'" contenteditable>'+esc(state.opTxt)+'</span>';return '';}
  var hasOp=!!(op||state.opTxt);
  var LOGOS=im(hv,'lg hvlogo','Hiperviajes')+(hasOp?'<i></i>'+opHtml('lg2 oplogo'):'');
  var cls={foto:'v-foto',ink:'v-ink',dig:'v-dig2'}[state.ver];
  var titulo=(v.destNombre||'Destino')+(v.pais?'':'' );
  var lug='<span contenteditable>'+esc((v.destNombre||'').toUpperCase())+'</span>'+(v.pais?' – <span contenteditable>'+esc(v.pais.toUpperCase())+'</span>':'');
  var head=((state.ver==='foto'&&!abajo)||state.ver==='ink')?'':'<div class="hd">'+LOGOS+'</div>';
  var stamp='';
  var hero,intro;
  if(state.ver==='foto'){
    hero='<div class="hero">'+(foto?im(foto,'ph',''):'')+'<div class="veil"></div><div class="logos">'+im(hv,'lg','Hiperviajes')+(op?'<i></i>'+opImg(op,'lg2'):'')+'</div><div class="tt"><small>VOUCHER DE SERVICIOS</small><b>'+esc((v.destNombre||'').toUpperCase())+'</b><span>'+esc(v.pais)+'</span></div>'+stamp+'</div>';
    intro='';
  }else{
    hero='';
    intro='<div class="ihd"><div class="lgs">'+im(state.hvUpload?hv:'img/hiperviajes-slogan-dark.png','lg','Hiperviajes')+(hasOp?'<i></i>'+opHtml('lg2'):'')+'</div>'+
      '<div class="row"><div class="tt"><small><i></i>VOUCHER DE SERVICIOS<i></i></small><b contenteditable>'+esc(titleCase(v.destNombre||''))+'</b>'+
      '<svg class="sw" viewBox="0 0 300 16" preserveAspectRatio="none"><path d="M6 12C80 3 210 1 294 8" fill="none" stroke="url(#swg)" stroke-width="3.2" stroke-linecap="round"/><defs><linearGradient id="swg" x1="0" x2="1"><stop offset="0" stop-color="#0D6B5E"/><stop offset="1" stop-color="#3FA37C"/></linearGradient></defs></svg>'+
      (v.pais?'<span><svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" fill="currentColor"/><circle cx="12" cy="10" r="2.4" fill="#fff"/></svg><em contenteditable>'+esc(v.pais.toUpperCase())+'</em></span>':'')+'</div>'+
      (sel?im('sellos/'+sel.f,'st duo',''):'')+'</div>'+
      '<svg class="iw" viewBox="0 0 600 24" preserveAspectRatio="none"><path d="M0 14C100 2 200 2 300 12S500 24 600 8" fill="none" stroke="#0D6B5E" stroke-width="1.2" opacity=".55"/><path d="M0 19C110 9 210 9 310 17S500 26 600 14" fill="none" stroke="#0D6B5E" stroke-width=".8" opacity=".35"/></svg></div>';
  }
  if(state.ver==='dig'){
    var n=v.items.length;
    function mix(c1,c2,t){var a=parseInt(c1.slice(1),16),b=parseInt(c2.slice(1),16);function ch(s){return Math.round(((a>>s)&255)*(1-t)+((b>>s)&255)*t);}return 'rgb('+ch(16)+','+ch(8)+','+ch(0)+')';}
    var SV=function(d,c){return '<svg class="'+(c||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';};
    var CAL='<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14.5h.01M12 14.5h.01M16 14.5h.01" stroke-width="2.6"/>';
    var PLANE='<path d="M10.5 13.5L4 11l1.2-1.2 7.3.9 4.2-4.2c.8-.8 2.1-.8 2.6-.3.5.5.5 1.8-.3 2.6l-4.2 4.2.9 7.3L14.5 21l-2.5-6.5-3.2 3.2.3 2.3-1 1-1.4-3-3-1.4 1-1 2.3.3z" fill="currentColor" stroke="none"/>';
    var PEOPLE='<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 14.2c3 .1 5.5 2.2 5.5 5.8"/>';
    var PIN='<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="2.4" fill="#fff" stroke="none"/>';
    var TICKET='<g transform="rotate(-35 12 12)"><path d="M2.5 8h19v2.6a1.6 1.6 0 000 2.8V16h-19v-2.6a1.6 1.6 0 000-2.8z"/><path d="M15 8.5v7" stroke-dasharray="1.4 1.6"/></g>';
    var rows=v.items.map(function(it,idx){
      var t=n>1?idx/(n-1):1,bg='linear-gradient(135deg,'+mix('#B4E3DA','#2A9384',t)+','+mix('#93D3C7','#17786C',t)+')',fg=t<0.34?'#123f3c':'#fff';
      var fch=it.f?'<b>'+it.f.d+' '+MESES[it.f.m-1]+'</b><span>'+it.f.y+'</span>':'<b>—</b>';
      var chip='<div class="chip" style="background:'+bg+';color:'+fg+'">'+SV(CAL,'cal')+'<div>'+fch+'</div></div>';
      var tit=it.titulo||'',main=tit,sub='';
      if(it.tipo==='exc'){var ps=tit.split(/\s+\+\s+/);main=ps[0];sub=ps.length>1?'+ '+ps.slice(1).join(' + '):'';}
      var body='<div class="tp">'+SV(IC[iconKey(it)],'ico')+'<div class="x"><div class="t" contenteditable>'+esc(main)+'</div>'+
        (it.from?'<div class="o"><span contenteditable>'+esc(it.from)+'</span><em>→</em><span contenteditable>'+esc(it.to)+'</span></div>':'')+
        (it.det?'<div class="o" contenteditable>'+esc(it.det)+'</div>':'')+(sub?'<div class="sub" contenteditable>'+esc(sub)+'</div>':'')+'</div></div>';
      if(it.vuelo){var q=it.vuelo;body+='<div class="fl">'+SV(PLANE,'pl')+'<span contenteditable>'+esc(q.n)+'</span><i>|</i><span contenteditable>'+q.from+' → '+q.to+'</span><i>|</i><b contenteditable>'+q.dep+' – '+q.arr+(q.sig?' (+1)':'')+'</b></div>';}
      var fo=it.tipo==='exc'?excFoto(tit):'';
      return '<div class="r'+(fo?' exc':'')+'">'+(fo?'<div class="strip">'+im(fo,'','')+'<div class="fade"></div></div>':'')+chip+'<div class="vl"></div><div class="bd">'+body+'</div></div>';
    }).join('');
    var ob=$('obs').value.trim();
    st.innerHTML='<div class="sheet v-dig2" id="sheet">'+
      '<div class="hero">'+(foto?im(foto,'ph',''):'')+(abajo?'':'<div class="veil"></div><div class="logos">'+LOGOS+'</div>')+
      '<svg class="wave" viewBox="0 0 610 70" preserveAspectRatio="none"><path d="M0 18C120 52 230 62 340 44S520 4 610 22V70H0Z" fill="#cfeee7" opacity=".85"/><path d="M0 40C140 66 260 70 360 56S520 26 610 40V70H0Z" fill="#f4fbfa"/></svg></div>'+
      (abajo?'<div class="logos-below">'+LOGOS+'</div>':'')+'<div class="mid"><svg class="deco" viewBox="0 0 610 300" preserveAspectRatio="none"><path d="M0 40C60 70 90 140 40 200S0 280 0 300Z" fill="#d7efea" opacity=".7"/><path d="M610 20C540 60 520 120 570 170S610 250 610 300Z" fill="#d7efea" opacity=".7"/></svg>'+
      '<div class="tit"><div class="kick"><i></i><span>VOUCHER DE SERVICIOS</span><i></i></div><b contenteditable style="font-size:'+((v.destNombre||'').length>18?34:(v.destNombre||'').length>14?40:(v.destNombre||'').length>11?44:49)+'px">'+esc((v.destNombre||'').toUpperCase())+'</b>'+
      (v.pais?'<div class="ctry">'+SV(PIN,'pin')+'<span contenteditable>'+esc(v.pais.toUpperCase())+'</span></div>':'')+'</div>'+
      '<div class="card">'+rows+'</div>'+
      '<div class="px">'+SV(PEOPLE,'pp')+'<span class="k">PASAJEROS</span><i></i><div class="nm" contenteditable>'+(v.pax.length?v.pax.map(esc).join('<em>|</em>'):'<span class="ph">Nombre y apellido</span>')+'</div>'+(v.npax&&v.npax!==v.pax.length?'<span class="cnt">'+v.npax+' PAX</span>':'')+'</div>'+
      (ob?'<div class="ob" contenteditable>'+esc(ob)+'</div>':'')+'</div>'+
      '<div class="foot"><svg viewBox="0 0 610 90" preserveAspectRatio="none"><path d="M0 22C150 2 300 4 420 16S560 34 610 20V90H0Z" fill="#bfe6de"/><path d="M0 40C140 20 290 22 420 34S560 50 610 36V90H0Z" fill="url(#fg)"/><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2aa192"/><stop offset="1" stop-color="#14766b"/></linearGradient></defs></svg>'+
      '<div class="vft"><i></i>'+SV(TICKET,'tk')+'<span>VOUCHER DE SERVICIO</span><i></i></div></div>'+
      (dest&&dest.cr?'<div class="cr">Foto: '+esc(dest.cr)+'</div>':'')+'</div>';
    document.querySelectorAll('.seg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===state.ver);});
    ajustarLogos();
    return;
  }
  var pax='<div class="pax"><span class="k">Pasajeros</span><span class="v" contenteditable>'+(v.pax.length?esc(v.pax.join('  |  ')):'<span class="ph">Nombre y apellido</span>')+'</span><span class="n">'+v.npax+' pax</span></div>';
  var obs=$('obs').value.trim();
  var html='<div class="sheet '+cls+'" id="sheet">'+head+hero+intro+'<div class="body">'+pax+v.items.map(itemHtml).join('')+
    '<div class="obs" contenteditable>'+esc(obs)+'</div></div><div class="ft"><span>Hiperviajes</span><span>Voucher de servicios</span></div></div>';
  st.innerHTML=html;
  ajustarLogos();
  var du=st.querySelector('img.duo');if(du)duotono(du);
  document.querySelectorAll('.seg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===state.ver);});
}
/* ---- Integración automática de logos según la foto ---- */
function tintWhite(img,cb){
  try{var c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;var x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);cb(c.toDataURL('image/png'));}catch(e){cb(null);}
}
function medirArriba(ph,hero,posY){
  var W=hero.clientWidth,H=hero.clientHeight,w=ph.naturalWidth,h=ph.naturalHeight,k=Math.max(W/w,H/h),dw=w*k,dh=h*k,ox=(W-dw)/2,oy=(H-dh)*posY;
  var rx=W*.12,ry=0,rw=W*.76,rh=H*.45;
  var sx=(rx-ox)/k,sy=(ry-oy)/k,sw=rw/k,sh=rh/k;
  var c=document.createElement('canvas');c.width=96;c.height=36;var x=c.getContext('2d');x.drawImage(ph,sx,sy,sw,sh,0,0,96,36);
  var d=x.getImageData(0,0,96,36).data,n=0,sum=0,sq=0;
  for(var i=0;i<d.length;i+=4){var L=(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255;sum+=L;sq+=L*L;n++;}
  var m=sum/n;return {m:m,sd:Math.sqrt(Math.max(0,sq/n-m*m))};
}
function ajustarLogos(){
  var sh=$('sheet');if(!sh)return;var hero=sh.querySelector('.hero'),veil=sh.querySelector('.hero .veil'),hvI=sh.querySelector('.hvlogo'),opI=sh.querySelector('.oplogo');
  if(!hero||!veil)return;
  var mode=state.logoPos,ph=hero.querySelector('img.ph'),posY=state.ver==='dig'?.4:.5;
  function setHv(f){if(hvI&&!state.hvUpload)hvI.src=f;}
  if(mode==='oscuro'){
    veil.style.background='linear-gradient(180deg,rgba(6,35,33,.74) 0%,rgba(6,35,33,.5) 45%,rgba(6,35,33,0) 92%)';
    if(state.hvUpload&&hvI)tintWhite(hvI,function(u){if(u)hvI.src=u;});else setHv('img/hiperviajes-slogan-white.png');
    if(opI){var go=function(){tintWhite(opI,function(u){if(u){opI.src=u;opI.style.background='none';}});};if(opI.complete&&opI.naturalWidth)go();else opI.addEventListener('load',go,{once:true});}
    return;
  }
  function apply(s){
    var a0=.86+.13*s,a1=.5+.45*s,a2=.12+.38*s;
    veil.style.height=(60+16*s)+'%';
    veil.style.background='linear-gradient(180deg,rgba(255,255,255,'+a0+') 0%,rgba(255,255,255,'+a1+') 45%,rgba(255,255,255,'+a2+') 78%,rgba(255,255,255,0) 100%)';
    setHv(s>.3?'img/hiperviajes-slogan-dark.png':'img/hiperviajes-slogan-teal.png');
    if(mode==='auto'&&s>.92&&!state.autoAbajo){state.autoAbajo=true;render();}
  }
  if(mode==='claro'){apply(1);return;}
  if(!ph){apply(.2);return;}
  var run=function(){try{var r=medirArriba(ph,hero,posY);apply(Math.max(0,Math.min(1,(0.82-r.m)*1.4+r.sd*2.2)));}catch(e){apply(.7);}};
  if(ph.complete&&ph.naturalWidth)run();else{ph.addEventListener('load',run,{once:true});ph.addEventListener('error',function(){apply(.7);},{once:true});}
}
function duotono(img){
  function go(){try{var c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;var x=c.getContext('2d');x.drawImage(img,0,0);
    var d=x.getImageData(0,0,c.width,c.height),p=d.data,D=[10,79,70],L=[244,250,248];
    for(var i=0;i<p.length;i+=4){var l=(0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2])/255;l=Math.pow(l,1.15);p[i]=D[0]+(L[0]-D[0])*l;p[i+1]=D[1]+(L[1]-D[1])*l;p[i+2]=D[2]+(L[2]-D[2])*l;}
    x.putImageData(d,0,0);img.onload=null;img.src=c.toDataURL('image/png');img.classList.add('ok');}catch(e){img.classList.add('ok');}}
  if(img.complete&&img.naturalWidth)go();else img.addEventListener('load',go,{once:true});
}
function listaItems(){
  var box=$('items');if(!box)return;if(!state.v){box.innerHTML='';return;}
  box.innerHTML='<label>Servicios en el voucher</label>'+state.v.items.map(function(it,i){var f=it.f?(it.f.d+' '+MESES[it.f.m-1]):'s/f';return '<div class="itm"><input type="checkbox" id="it'+i+'" '+(it.off?'':'checked')+'><label for="it'+i+'">'+f+' · '+esc(it.titulo)+'</label></div>';}).join('');
  state.v.items.forEach(function(it,i){$('it'+i).onchange=function(){it.off=!this.checked;render();};});
}
function mostrarWarns(){
  var w=state.v?state.v.warns:[],ul=$('warns');
  ul.innerHTML=!state.v?'':(w.length?w.map(function(x){return '<li>⚠ '+esc(x)+'</li>';}).join(''):'<li class="ok">Todo coincide: fechas, vuelos y pasajeros.</li>');
}
function generar(){
  state.autoAbajo=false;
  var v=armarVoucher($('serv').value,$('vue').value);
  var forced=$('dest').value;
  if(forced){var f=FOTOS.filter(function(x){return x.n===forced;})[0];v.dest=f;v.destNombre=nombreDestino(f);v.pais=paisDe(f);v.warns=v.warns.filter(function(w){return w.indexOf('destino')<0;});}
  state.v=v;
  if(v.op&&!state.opUpload){$('op').value=v.op.id;state.opLogo=v.op.logo;state.opTxt='';}
  else if(v.opTxt&&!state.opUpload){$('op').value='';state.opLogo=null;state.opTxt=v.opTxt;}
  else{state.opTxt='';var op=OPERADORES.filter(function(o){return o.id===$('op').value;})[0];if(op&&!state.opUpload)state.opLogo=op.logo;}
  mostrarWarns();listaItems();render();
}
function cargarLogo(inp,key,upKey){
  var f=inp.files[0];if(!f)return;
  var r=new FileReader();r.onload=function(){state[key]=r.result;state[upKey]=true;render();};r.readAsDataURL(f);
}
function exportarPNG(){
  var s=$('sheet');if(!s)return;
  function go(){
    window.html2canvas(s,{scale:2,useCORS:true,backgroundColor:'#fff'}).then(function(c){
      var a=document.createElement('a');a.download='voucher-'+(state.v.destNombre||'servicios').replace(/\s+/g,'-').toLowerCase()+'-'+state.ver+'.png';a.href=c.toDataURL('image/png');a.click();
    }).catch(function(){alert('No se pudo exportar PNG (si abriste el archivo desde tu compu, probá desde la web publicada o usá Imprimir → Guardar como PDF).');});
  }
  if(window.html2canvas)return go();
  var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=go;sc.onerror=function(){alert('No pude cargar la librería de exportación.');};document.head.appendChild(sc);
}
function init(){
  $('op').innerHTML=OPERADORES.map(function(o){return '<option value="'+esc(o.id)+'">'+esc(o.nombre)+'</option>';}).join('')+'<option value="">(sin logo de operador)</option>';
  $('dest').innerHTML='<option value="">Detectar automáticamente</option>'+FOTOS.map(function(f){return '<option>'+esc(f.n)+'</option>';}).join('');
  $('go').onclick=generar;
  $('op').onchange=function(){state.opUpload=false;state.opTxt='';var o=OPERADORES.filter(function(x){return x.id===$('op').value;})[0];state.opLogo=o?o.logo:null;if(state.v)render();};
  $('opf').onchange=function(){cargarLogo(this,'opLogo','opUpload');};
  $('hvf').onchange=function(){cargarLogo(this,'hvLogo','hvUpload');};
  $('obs').oninput=function(){if(state.v)render();};
  document.querySelectorAll('.seg button').forEach(function(b){b.onclick=function(){state.ver=b.dataset.v;if(state.v)render();else document.querySelectorAll('.seg button').forEach(function(x){x.classList.toggle('on',x.dataset.v===state.ver);});};});
  $('lpos').onchange=function(){state.logoPos=this.value;state.autoAbajo=false;if(state.v)render();};
  $('prn').onclick=function(){window.print();};
  $('png').onclick=exportarPNG;
  if(OPERADORES[0])state.opLogo=OPERADORES[0].logo;
  render();
}
document.addEventListener('DOMContentLoaded',init);
