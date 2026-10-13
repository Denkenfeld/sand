/* ===========================================================
   dt-core.js  –  Hilfsobjekt DTX für jeden Bildschirm
   (Navigation, Fortschritt, Ton-Vorgabe, Hinweise). Funktioniert in der Shell und –
   mit Weiterleitung auf index.html – auch wenn eine Seite einzeln geöffnet wird.
   =========================================================== */
(function(){
  var W=window,S=null;
  try{if(W.parent!==W&&W.parent.DT)S=W.parent.DT}catch(e){}
  var CFG=(S&&S.cfg)||W.DT_CONFIG||{levels:[],keys:{},screens:{}};
  var KP=(CFG.keys&&CFG.keys.progress)||'dtL3',KW=(CFG.keys&&CFG.keys.wu)||'dtWu3',KS=(CFG.keys&&CFG.keys.sound)||'dtSnd';
  function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  var DTX={
    inShell:!!S, cfg:CFG,
    param:function(k){return new URLSearchParams(location.search).get(k)},
    progress:function(){return Math.max(1,Math.min(11,+get(KP)||1))},      /* freigeschaltetes Level, 11 = alles */
    has:function(n){var L=(CFG.levels||[])[n-1];return !!(L&&L.level)},
    complete:function(n){var nx=Math.min(11,Math.max(DTX.progress(),n+1));set(KP,nx);return nx},
    resetAll:function(){set(KP,1);set(KW,0)},
    /* Ton-Vorgabe: AN, außer der Spieler hat ihn selbst ausgeschaltet */
    soundWanted:function(){return get(KS)!=='0'},
    setSound:function(on){set(KS,on?'1':'0')},
    go:function(screen,p){
      if(S)return S.go(screen,p);
      location.href=new URL('../index.html',location.href).href+'#'+screen+(p&&p.n?'/'+p.n:'');
    },
    toast:function(t){
      if(S&&S.toast)return S.toast(t);
      var d=document.createElement('div');d.textContent=t;
      d.style.cssText='position:fixed;left:50%;top:18%;transform:translateX(-50%);background:#000c;color:#ffe9c9;padding:10px 18px;border-radius:20px;z-index:99;font:600 15px system-ui';
      document.body.appendChild(d);setTimeout(function(){d.remove()},2400);
    }
  };
  W.DTX=DTX;
})();
