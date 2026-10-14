/* ===========================================================
   dt-audio.js  –  gemeinsamer Ton für alle Bildschirme
   Als ERSTES Skript in jedem Bildschirm (iFrame) laden.
   Die Shell (index.html) besitzt EINEN AudioContext. Jede Seite bekommt
   statt eines eigenen Kontexts einen Stellvertreter mit eigenem Lautstärke-
   Knoten. iOS schaltet den Ton so nur EINMAL frei (beim ersten Tippen auf
   dem Startbildschirm) und er läuft durchgehend über Start → Karte → Film → Spiel.
   Standard: Ton AN. Nur wenn der Spieler ihn selbst abschaltet (localStorage dtSnd=0), bleibt er aus.
   =========================================================== */
(function(){
  var W=window,S=null;
  try{if(W.parent!==W&&W.parent.DT&&W.parent.DT.pageCtx)S=W.parent.DT}catch(e){}
  if(!S)return;                                   /* Seite läuft allein → normales Verhalten */
  function Ctx(){return S.pageCtx(W)}
  try{
    Object.defineProperty(W,'AudioContext',{value:Ctx,configurable:true,writable:true});
    Object.defineProperty(W,'webkitAudioContext',{value:Ctx,configurable:true,writable:true});
  }catch(e){W.AudioContext=W.webkitAudioContext=Ctx}
  ['pointerdown','touchstart','touchend','mousedown','click','keydown'].forEach(function(t){
    W.addEventListener(t,function(){try{S.unlock()}catch(e){}},{capture:true,passive:true});
  });
  W.addEventListener('load',function(){setTimeout(function(){
    try{if(S.ctx&&S.ctx.state==='running'&&document.body)document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch'}))}catch(e){}
  },120)});
})();
