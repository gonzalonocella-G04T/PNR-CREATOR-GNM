var REMOTE='https://raw.githubusercontent.com/gonzalonocella-G04T/PNR-CREATOR-GNM/voucher-servicios/';
var HV_LOGO='img/hiperviajes-slogan.png',state={ver:'foto',v:null,opLogo:null,hvLogo:null};
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
var ICMAP=[[/glaciar|moreno|hielo|iceberg|ushuaia.*(canal|beagle)/i,'hielo'],[/catarata|iguaz|iguacu|garganta del diablo|salto|cascada/i,'cataratas'],
[/catamar|barco|navega|crucero|lancha|velero|canal|laguna|isla|snorkel.*bote/i,'barco'],[/snorkel|buceo|bucear|arrecife|tortuga|delf|piscinas? naturales?/i,'buceo'],
[/vino|bodega|vi[nñ]edo|cata\b|degustaci/i,'vino'],[/helic|sobrevuelo|avioneta/i,'avion'],[/trekking|caminata|senderis|mirador|cerro|monta[nñ]a|volc[aá]n|cordillera|andes|torres|fitz|chalt[eé]n|machu|osorno/i,'montana'],
[/city tour|ciudad|centro hist|recorrida|panor[aá]mic|visita de la/i,'ciudad'],[/ruinas|templo|iglesia|museo|cultural|hist[oó]ric|inca|moai|maya|tulum|chich[eé]n/i,'historia'],
[/4x4|buggy|jeep|dunas|quebrada|safari|cuatriciclo|desierto|salinas/i,'jeep'],[/show|tango|cena|noche|folklor|espect/i,'show'],[/parque|reserva|zool|naturaleza|selva|bosque|jard/i,'naturaleza'],[/playa|beach|day pass|isla|cayo|sol/i,'playa']];
function iconKey(it){
  if(it.tipo!=='exc')return 'traslado';
  var t=it.titulo||'';for(var i=0;i<ICMAP.length;i++)if(ICMAP[i][0].test(t))return ICMAP[i][1];return 'brujula';
}
function iconSvg(it){return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+IC[iconKey(it)]+'</svg>';}
function fotoDe(){var d=state.v&&state.v.dest;return d?(d.p||(d.f?'tv-fotos/'+d.f:'')):'';}
function $(id){return document.getElementById(id);}
function fechaHtml(f){
  if(!f)return '<div class="dt"><b>--</b><i>---</i><u>&nbsp;</u></div>';
  return '<div class="dt"><b>'+String(f.d).padStart(2,'0')+'</b><i>'+MESES[f.m-1]+'</i><u>'+f.y+'</u></div>';
}
function itemHtml(it){
  var fo=(it.tipo==='exc'&&state.ver==='foto')?fotoDe():'';
  var h='<div class="sv'+(it.tipo==='exc'?' exc':'')+'">'+(fo?'<div class="strip" style="background-image:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.55) 38%,rgba(255,255,255,0) 75%),url(\''+fo+'\')"></div>':'')+fechaHtml(it.f)+'<div class="tx"><div class="ti"><span class="icw">'+iconSvg(it)+'</span><span contenteditable>'+esc(it.titulo)+'</span></div>';
  if(it.from)h+='<div class="rt"><span contenteditable>'+esc(it.from)+'</span><em>→</em><span contenteditable>'+esc(it.to)+'</span></div>';
  if(it.vuelo){var v=it.vuelo;h+='<div class="fl"><span contenteditable>'+esc(v.n)+'</span><i>|</i><span contenteditable>'+v.from+' → '+v.to+'</span><i>|</i><span contenteditable>'+v.dep+' – '+v.arr+(v.sig?' (+1)':'')+'</span></div>';}
  return h+'</div></div>';
}
function render(){
  var v=state.v,st=$('stage');
  if(!v){st.innerHTML='<p class="hint" style="text-align:center;margin-top:60px">Pegá la solicitud y las líneas de vuelo, y tocá “Generar voucher”.</p>';return;}
  var dest=v.dest,foto=dest?(dest.p||(dest.f?'tv-fotos/'+dest.f:'')):'',sel=dest?selloDe(dest):null;
  var hv=state.hvLogo||HV_LOGO,op=state.opLogo;
  var cls={foto:'v-foto',ink:'v-ink',dig:'v-dig'}[state.ver];
  var titulo=(v.destNombre||'Destino')+(v.pais?'':'' );
  var lug='<span contenteditable>'+esc((v.destNombre||'').toUpperCase())+'</span>'+(v.pais?' – <span contenteditable>'+esc(v.pais.toUpperCase())+'</span>':'');
  var head=state.ver==='foto'?'':'<div class="hd">'+im(hv,'lg','Hiperviajes')+(op?im(op,'lg','Operador'):'<span></span>')+'</div>';
  var stamp=sel?im('sellos/'+sel.f,'st',''):'';
  var hero,intro;
  if(state.ver==='foto'){
    hero='<div class="hero">'+(foto?im(foto,'ph',''):'')+'<div class="veil"></div><div class="logos">'+im(hv,'lg','Hiperviajes')+(op?'<i></i>'+opImg(op,'lg2'):'')+'</div><div class="tt"><small>VOUCHER DE SERVICIOS</small><b>'+esc((v.destNombre||'').toUpperCase())+'</b><span>'+esc(v.pais)+'</span></div>'+stamp+'</div>';
    intro='';
  }else{
    hero='';
    intro='<div class="band"><div class="tt"><small>VOUCHER DE SERVICIOS</small><b>'+esc((v.destNombre||'').toUpperCase())+'</b><span>'+esc(v.pais)+'</span></div>'+(sel?im('sellos/'+sel.f,'st',''):'')+'</div>';
  }
  if(state.ver==='dig'){
    var ito=v.items.map(function(it){
      var f=it.f?'<b>'+String(it.f.d).padStart(2,'0')+' '+MESES[it.f.m-1]+'</b><i>'+it.f.y+'</i>':'<b>--</b>';
      var ic=it.tipo==='exc'?'⛰':'🚐';
      var fo=(it.tipo==='exc')?fotoDe():'';
      var r='<div class="r'+(it.tipo==='exc'?' exc':'')+'">'+(fo?'<div class="strip" style="background-image:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.5) 40%,rgba(255,255,255,0) 80%),url(\''+fo+'\')"></div>':'')+'<div class="d">'+f+'</div><div class="x"><div class="t"><span class="icw">'+iconSvg(it)+'</span><span contenteditable>'+esc(it.titulo)+'</span></div>';
      if(it.from)r+='<div class="o"><span contenteditable>'+esc(it.from)+'</span> <em>→</em> <span contenteditable>'+esc(it.to)+'</span></div>';
      if(it.vuelo){var q=it.vuelo;r+='<div class="fl">✈ <span contenteditable>'+esc(q.n)+'</span> | <span contenteditable>'+q.from+' → '+q.to+'</span> | <b contenteditable>'+q.dep+' – '+q.arr+(q.sig?' (+1)':'')+'</b></div>';}
      return r+'</div></div>';
    }).join('');
    var ob=$('obs').value.trim();
    st.innerHTML='<div class="sheet v-dig" id="sheet"><div class="hero">'+(foto?im(foto,'ph',''):'')+'<div class="veil"></div><div class="logos">'+im(hv,'lg','Hiperviajes')+(op?'<i></i>'+opImg(op,'lg2'):'')+'</div>'+
      '<svg class="wave" viewBox="0 0 540 70" preserveAspectRatio="none"><path d="M0 40C90 10 170 5 270 28S450 62 540 20V70H0Z" fill="#fff"/><path d="M0 52C100 28 200 24 300 42S460 66 540 36V70H0Z" fill="#EAF7F4" opacity=".9"/></svg></div>'+
      '<div class="tit"><small>VOUCHER DE SERVICIOS</small><b contenteditable style="font-size:'+((v.destNombre||'').length>16?40:(v.destNombre||'').length>11?48:58)+'px">'+esc((v.destNombre||'').toUpperCase())+'</b><span contenteditable>'+esc(v.pais.toUpperCase())+'</span></div>'+
      '<div class="card">'+ito+'</div>'+
      '<div class="px"><span>PASAJEROS</span><div contenteditable>'+esc(v.pax.join('   |   '))+'</div></div>'+
      (ob?'<div class="ob" contenteditable>'+esc(ob)+'</div>':'')+
      '<div class="fo"><span>VOUCHER DE SERVICIO</span>'+(dest&&dest.cr?'<small>Foto: '+esc(dest.cr)+'</small>':'')+'</div></div>';
    document.querySelectorAll('.seg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===state.ver);});
    return;
  }
  var pax='<div class="pax"><span class="k">Pasajeros</span><span class="v" contenteditable>'+esc(v.pax.join('  |  '))+'</span><span class="n">'+v.npax+' pax</span></div>';
  var obs=$('obs').value.trim();
  var html='<div class="sheet '+cls+'" id="sheet">'+head+hero+intro+'<div class="body">'+pax+v.items.map(itemHtml).join('')+
    '<div class="obs" contenteditable>'+esc(obs)+'</div></div><div class="ft"><span>Hiperviajes</span><span>Voucher de servicios</span></div></div>';
  st.innerHTML=html;
  document.querySelectorAll('.seg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===state.ver);});
}
function mostrarWarns(){
  var w=state.v?state.v.warns:[],ul=$('warns');
  ul.innerHTML=!state.v?'':(w.length?w.map(function(x){return '<li>⚠ '+esc(x)+'</li>';}).join(''):'<li class="ok">Todo coincide: fechas, vuelos y pasajeros.</li>');
}
function generar(){
  var v=armarVoucher($('serv').value,$('vue').value);
  var forced=$('dest').value;
  if(forced){var f=FOTOS.filter(function(x){return x.n===forced;})[0];v.dest=f;v.destNombre=nombreDestino(f);v.pais=paisDe(f);v.warns=v.warns.filter(function(w){return w.indexOf('destino')<0;});}
  state.v=v;
  var op=OPERADORES.filter(function(o){return o.id===$('op').value;})[0];
  if(op&&!state.opUpload)state.opLogo=op.logo;
  mostrarWarns();render();
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
  $('op').onchange=function(){state.opUpload=false;var o=OPERADORES.filter(function(x){return x.id===$('op').value;})[0];state.opLogo=o?o.logo:null;if(state.v)render();};
  $('opf').onchange=function(){cargarLogo(this,'opLogo','opUpload');};
  $('hvf').onchange=function(){cargarLogo(this,'hvLogo','hvUpload');};
  $('obs').oninput=function(){if(state.v)render();};
  document.querySelectorAll('.seg button').forEach(function(b){b.onclick=function(){state.ver=b.dataset.v;if(state.v)render();else document.querySelectorAll('.seg button').forEach(function(x){x.classList.toggle('on',x.dataset.v===state.ver);});};});
  $('prn').onclick=function(){window.print();};
  $('png').onclick=exportarPNG;
  if(OPERADORES[0])state.opLogo=OPERADORES[0].logo;
  render();
}
document.addEventListener('DOMContentLoaded',init);
