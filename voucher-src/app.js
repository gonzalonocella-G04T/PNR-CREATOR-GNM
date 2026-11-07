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
function $(id){return document.getElementById(id);}
function fechaHtml(f){
  if(!f)return '<div class="dt"><b>--</b><i>---</i><u>&nbsp;</u></div>';
  return '<div class="dt"><b>'+String(f.d).padStart(2,'0')+'</b><i>'+MESES[f.m-1]+'</i><u>'+f.y+'</u></div>';
}
function itemHtml(it){
  var h='<div class="sv">'+fechaHtml(it.f)+'<div class="tx"><div class="ti" contenteditable>'+esc(it.titulo)+'</div>';
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
  var head='<div class="hd">'+im(hv,'lg','Hiperviajes')+(op?im(op,'lg','Operador'):'<span></span>')+'</div>';
  var stamp=sel?im('sellos/'+sel.f,'st',''):'';
  var hero,intro;
  if(state.ver==='foto'){
    hero='<div class="hero">'+(foto?im(foto,'ph',''):'')+'<div class="tt"><small>VOUCHER DE SERVICIOS</small><b>'+esc((v.destNombre||'').toUpperCase())+'</b><span>'+esc(v.pais)+'</span></div>'+stamp+'</div>';
    intro='';
  }else{
    hero='';
    intro='<div class="band"><div class="tt"><small>VOUCHER DE SERVICIOS</small><b>'+esc((v.destNombre||'').toUpperCase())+'</b><span>'+esc(v.pais)+'</span></div>'+(sel?im('sellos/'+sel.f,'st',''):'')+'</div>';
  }
  if(state.ver==='dig'){
    var ito=v.items.map(function(it){
      var f=it.f?'<b>'+String(it.f.d).padStart(2,'0')+' '+MESES[it.f.m-1]+'</b><i>'+it.f.y+'</i>':'<b>--</b>';
      var ic=it.tipo==='exc'?'⛰':'🚐';
      var r='<div class="r"><div class="d">'+f+'</div><div class="x"><div class="t" contenteditable>'+esc(it.titulo)+'</div>';
      if(it.from)r+='<div class="o"><span contenteditable>'+esc(it.from)+'</span> <em>→</em> <span contenteditable>'+esc(it.to)+'</span></div>';
      if(it.vuelo){var q=it.vuelo;r+='<div class="fl">✈ <span contenteditable>'+esc(q.n)+'</span> | <span contenteditable>'+q.from+' → '+q.to+'</span> | <b contenteditable>'+q.dep+' – '+q.arr+(q.sig?' (+1)':'')+'</b></div>';}
      return r+'</div></div>';
    }).join('');
    var ob=$('obs').value.trim();
    st.innerHTML='<div class="sheet v-dig" id="sheet"><div class="hero">'+(foto?im(foto,'ph',''):'')+'<div class="logos">'+im(hv,'lg','Hiperviajes')+(op?'<i></i>'+opImg(op,'lg2'):'')+'</div>'+
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
