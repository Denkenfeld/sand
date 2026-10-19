/* ===========================================================
   dt-shell.js  –  Router + gemeinsamer Ton für index.html
   Ablauf: start → map → film → game → map …
   Jeder Bildschirm ist eine eigene HTML-Datei in einem iFrame. Die Shell
   selbst wird nie neu geladen – darum läuft der AudioContext durchgehend.
   Cache: alle Bildschirme werden mit ?v=<DT_VER> geladen (Version steht in index.html) – so holt der Browser nach
   einem Update garantiert die neuen Dateien (sonst zeigt er alte Level-/Konfig-Dateien: "Level 4 folgt bald").
   =========================================================== */
(function(){
'use strict';
var CFG=window.DT_CONFIG,$=function(id){return document.getElementById(id)};
var DT=window.DT={cfg:CFG,ctx:null,frame:null,name:null,params:null};
try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
function ensure(){
  if(DT.ctx)return DT.ctx;
  var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  try{DT.ctx=new C({latencyHint:'interactive'})}catch(e){DT.ctx=new C()}
  return DT.ctx;
}
DT.unlock=function(){
  var c=ensure();if(!c)return;
  if(c.state!=='running'){try{var p=c.resume();if(p&&p.catch)p.catch(function(){})}catch(e){}}
  if(!DT._tick){DT._tick=1;try{var s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0)}catch(e){}}
};
var pages=new WeakMap();
DT.pageCtx=function(win){
  var r=pages.get(win);if(r)return r.proxy;
  var c=ensure();if(!c)throw new Error('WebAudio nicht verfügbar');
  var g=c.createGain();g.connect(c.destination);
  var proxy=new Proxy(c,{
    get:function(t,p){
      if(p==='destination')return g;
      if(p==='close')return function(){return Promise.resolve()};
      if(p==='suspend')return function(){try{g.gain.cancelScheduledValues(0);g.gain.setTargetAtTime(0,t.currentTime,.03)}catch(e){}return Promise.resolve()};
      if(p==='resume')return function(){try{g.gain.cancelScheduledValues(0);g.gain.setTargetAtTime(1,t.currentTime,.03)}catch(e){}return t.resume()};
      var v=t[p];return typeof v==='function'?v.bind(t):v;
    },
    set:function(t,p,v){t[p]=v;return true}
  });
  pages.set(win,{proxy:proxy,g:g});return proxy;
};
DT.release=function(win,ms){
  var r=pages.get(win);if(!r)return;pages.delete(win);ms=ms||400;
  try{r.g.gain.cancelScheduledValues(0);r.g.gain.setTargetAtTime(0,DT.ctx.currentTime,ms/3000)}catch(e){}
  setTimeout(function(){try{r.g.disconnect()}catch(e){}},ms+250);
};
['pointerdown','touchend','click','keydown'].forEach(function(t){window.addEventListener(t,DT.unlock,{capture:true,passive:true})});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&DT.ctx&&DT.ctx.state!=='running'){try{DT.ctx.resume().catch(function(){})}catch(e){}}});
var stage=$('stage'),veil=$('veil'),msg=$('msg'),vt=0;
function veilOn(on){clearTimeout(vt);if(on)vt=setTimeout(function(){veil.className='on'},350);else veil.className=''}
DT.toast=function(t){msg.textContent=t;msg.className='on';clearTimeout(DT.toast.h);DT.toast.h=setTimeout(function(){msg.className=''},2600)};
function levelOf(n){return (CFG.levels||[])[n-1]||null}
function urlFor(name,p){
  p=p||{};
  if(name==='start'||name==='map')return CFG.screens[name];
  if(name==='open')return 'open/index.html';
  if(name==='film'){var L=levelOf(p.n);return L&&L.film?L.film+'?level='+p.n:null}
  if(name==='game')return CFG.screens.game+'?level='+(p.n||1);
  return null;
}
function ver(u){return u+(u.indexOf('?')<0?'?':'&')+'v='+(window.DT_VER||Date.now())}
var token=0;
DT.go=function(name,p){
  p=p||{};
  if(name==='film'||name==='game'){
    var L=levelOf(p.n);
    if(!L||!L.ready||!L.level){DT.toast('Level '+p.n+' folgt bald …');return false}
    if(name==='film'&&!L.film)return DT.go('game',p);
  }
  var url=urlFor(name,p);if(!url){DT.toast('Bildschirm nicht gefunden');return false}
  var my=++token;veilOn(true);
  Array.prototype.slice.call(stage.children).forEach(function(c){if(c!==DT.frame&&!c.classList.contains('out'))c.remove()});
  var f=document.createElement('iframe');
  f.className='view back';f.setAttribute('allow','autoplay; fullscreen');f.setAttribute('title',name);
  var shown=false;
  function show(){if(shown||my!==token)return;shown=true;swap(f,name,p)}
  f.addEventListener('load',function(){setTimeout(show,60)});
  setTimeout(show,9000);
  f.src=ver(url);stage.appendChild(f);return true;
};
function swap(f,name,p){
  var old=DT.frame;DT.frame=f;DT.name=name;DT.params=p;
  try{history.replaceState(null,'','#'+name+(p&&p.n?'/'+p.n:''))}catch(e){}
  requestAnimationFrame(function(){
    f.classList.remove('back');veilOn(false);
    if(old){
      DT.release(old.contentWindow,450);
      old.classList.add('back','out');
      setTimeout(function(){try{old.src='about:blank'}catch(e){}old.remove()},650);
    }
  });
}
window.addEventListener('message',function(e){
  var d=e.data;if(!d||typeof d!=='object')return;
  if(d.type==='film-done')DT.go('game',{n:d.film||(DT.params&&DT.params.n)||1});
  else if(d.type==='dt-go')DT.go(d.screen,d.params);
});
var h=(location.hash||'').replace('#','').split('/'),first=h[0]||'start',n=parseInt(h[1],10)||1;
if(!/^(start|map|film|game|open)$/.test(first))first='start';
if(first==='film'||first==='game'){if(!DT.go(first,{n:n}))DT.go('map')}else DT.go(first);
})();
