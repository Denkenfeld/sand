
/* ===== MISSION INFO: a persistent info button below the worm flag; opening freezes gameplay ===== */
const Mission=(()=>{
 let overlay=null,dialog=null,returnFocus=null,wasPaused=false,isOpen=false,styleAdded=false;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function ensure(){
  if(!styleAdded){const css=document.createElement('style');css.textContent=`
#tmission{color:#c7efff}
#tmission:focus-visible{outline:2px solid #90e9ff;outline-offset:3px}
#mission-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px calc(env(safe-area-inset-bottom,0px) + 14px);background:rgba(6,9,19,.83);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);touch-action:pan-y}
#mission-overlay[hidden]{display:none!important}
#mission-overlay .mission-card{position:relative;width:min(100%,470px);max-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 28px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:20px 18px;border-radius:18px;border:1px solid rgba(255,193,105,.7);background:linear-gradient(150deg,#273347,#151728 70%);color:#f6e9d5;box-shadow:0 18px 65px #0009;text-align:left;font:500 14px/1.5 system-ui,-apple-system,sans-serif;user-select:text;-webkit-user-select:text}
#mission-overlay h2{font-size:23px;line-height:1.2;color:#ffd696;margin:4px 0 12px}
#mission-overlay h3{font-size:14px;margin:16px 0 5px;color:#a5e7ff}
#mission-overlay p{margin:6px 0}
#mission-overlay ol{padding-left:21px;margin:7px 0}
#mission-overlay li{margin-bottom:6px}
#mission-overlay .mission-eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#acbdcf}
#mission-overlay .mission-goal{padding:10px 12px;background:#ffffff08;border:1px solid #ffffff16;border-radius:10px}
#mission-overlay .mission-progress{list-style:none;padding:0;margin:5px 0}
#mission-overlay .mission-progress li{padding:5px 0;border-bottom:1px solid #ffffff12;font-size:13px}
#mission-overlay .mission-close{width:100%;min-height:44px;margin-top:15px;padding:10px 12px;border-radius:10px;border:1px solid #ffc875;background:linear-gradient(#bc7b32,#78421f);color:#fff2d9;font:700 15px/1.25 system-ui;cursor:pointer;touch-action:manipulation}
#mission-overlay .mission-note{font-size:11px;color:#b7c5d7}
`;document.head.appendChild(css);styleAdded=true}
  let b=$('tmission');if(!b){b=document.createElement('button');b.id='tmission';b.type='button';b.title='Missionsziel und Spielhilfe';b.setAttribute('aria-label','Missionsziel und Spielhilfe öffnen');
   b.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="10" r="1.4" fill="currentColor"/><path d="M14.5 15h2v8m-3 0h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
   b.onclick=e=>{e.preventDefault();e.stopPropagation();open()};$('tools').appendChild(b)}
  if(!overlay){overlay=document.createElement('div');overlay.id='mission-overlay';overlay.hidden=true;
   dialog=document.createElement('section');dialog.className='mission-card';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','mission-heading');dialog.tabIndex=-1;overlay.appendChild(dialog);document.body.appendChild(overlay);
   overlay.addEventListener('click',e=>{const closeBtn=e.target.closest('[data-mission-close]');if(closeBtn||e.target===overlay){e.preventDefault();close()}});
   overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(e.key==='Tab'){e.preventDefault();const b=dialog.querySelector('[data-mission-close]');if(b)b.focus()}})
  }
 }
 function goal(){
  if(li===0)return 'Baue ein versorgtes Lager auf, grabe dich bis Reihe '+L.h+' vor und wehre die Karawane ab. Dein Quartier muss überleben.';
  if(L.launchMission)return 'Bereite die Planetenerkundung vor: Raumflughafen, Speicherenergie, Schildschutz und drei Steuerpunkte sichern, die Festung zerstören und die Rakete starten. Erst nach dem Abflug ist das Level geschafft.';
  if(L.explore)return 'Entdecke die Signale mit Radar und schließe zwei der drei Aufträge im Questjournal ab. Es gibt keine separate Endschlacht.';
  if(L.siege)return 'Finde die Gegnerstadt in den Reihen 10–15 und zerstöre ihre neun Hauptgebäude. Förderbänder lassen sich zur Unterbrechung der Versorgung angreifen. Eine zusätzliche Endschlacht gibt es nicht.';
  return 'Erreiche Zielhöhe '+L.h+' und gewinne anschließend die Verteidigungsschlacht. Schütze das Quartier und halte dein Versorgungsnetz verbunden.';
 }
 function water(){const wells=Object.values(bl).filter(b=>b.k==='wel'&&b.bp>=1);if(!wells.length)return 'Noch kein fertiger Taufänger – baue einen und verbinde ihn mit dem Quartier.';
  const enough=RES.sW>=RES.dW&&wells.some(b=>isOn(b));return (enough?'Ausreichend':'Mangel oder Verbindung prüfen')+' · Verbrauch '+RES.dW+' / Vorrat '+RES.sW;
 }
 function content(){const list=items=>'<ol>'+items.map(s=>'<li>'+s+'</li>').join('')+'</ol>';
  let h='<div class="mission-eyebrow">Level '+(li+1)+' · '+esc(DFN[L.df==null?SV.df:L.df])+' · Spiel pausiert</div><h2 id="mission-heading">'+esc(li===0?'Sichere die Landestelle':L.n)+'</h2><div class="mission-goal">'+esc(goal())+'</div>';
  if(li===0){
   h+='<h3>So beginnst du</h3>'+list([
    'Tippe das Quartier an und hole einen Arbeiter. Ohne Arbeiter wird nichts gegraben.',
    'Tippe leuchtende Felder an: Arbeiter graben sie frei. Ziehe über das Spielfeld, um die Karte zu verschieben.',
    'Baue eine Raffinerie nahe einer Gewürzader und bilde dort einen Sammler aus. Er holt Spice; erst bei Ankunft im Quartier wird daraus Geld.',
    'Verbinde Gebäude mit dem Quartier – direkt nebeneinander oder über Fließbänder. Ohne Verbindung funktioniert die Versorgung nicht.',
    'Baue Taufänger für Wasser und Energiefelder für Strom. Oben stehen Verbrauch / Vorrat. Reicht der Vorrat nicht, warnen die betroffenen Gebäude und können ausfallen.',
    'Baue eine Kaserne und bilde Krieger aus. Bereite die Verteidigung vor, bevor du die Zielhöhe erreichst.'
   ]);
   const kar=phase==='battle'?'Die Schlacht läuft – schütze dein Quartier.':phase==='prep'?'Vorbereitung: noch '+Math.max(0,Math.ceil(pt))+' Sekunden bis zur Schlacht.':phase==='end'?'Level beendet.':'Die Zielhöhe ist noch nicht erreicht.';
   h+='<h3>Dein Fortschritt</h3><ul class="mission-progress"><li>Zielhöhe: '+hh+' / '+L.h+'</li><li>Nächste Reihe: '+Math.min(L.rn,rowN(hh+1))+' / '+L.rn+' Felder frei</li><li>Wasser: '+esc(water())+'</li><li>Karawane: '+esc(kar)+'</li></ul>';
   h+='<p class="mission-note">Eine Reihe zählt zur Höhe, sobald '+L.rn+' Felder darin freigegraben sind. Wasser ist ein wichtiger Lernschritt, aber keine zusätzliche Siegbedingung. Es gibt kein „Bis zur Dämmerung“-Zeitlimit.</p>';
  }else{
   h+='<h3>Auftrag und Hinweise</h3><p>'+esc(L.t||'Erweitere dein Lager und halte dein Quartier am Leben.')+'</p>';
   const tips=['Gebäude müssen mit dem Quartier verbunden sein. Behalte Wasser, Strom und gegebenenfalls Munition im Blick.','Arbeiter graben, bauen und reparieren. Sammler fördern Spice; Krieger und Crawler kämpfen.'];
   if(L.p.ne)tips.push('Die Wurmflagge markiert ein vermutetes Nest zum Zähmen. Beachte die Gefahrenzahlen.');
   if(L.u.includes('fak'))tips.push('Bei Nacht sorgen Fackeltürme für Sicht. Jeder Turm braucht 2 Strom.');
   if(L.siege||L.explore)tips.push('Angriffsknopf wählen, dann Zielgebiet anklicken: Krieger und Crawler rücken aus; Sammler bleiben bei ihrer Arbeit.');
   if(L.explore||L.launchMission)tips.push('Im Questjournal findest du Aufgaben, Fortschritt und die zugehörigen Aktionen.');
   h+=list(tips);
  }
  h+='<button class="mission-close" data-mission-close type="button">'+(wasPaused?'Schließen':'Zurück ins Spiel')+'</button><p class="mission-note">Solange dieses Fenster offen ist, stehen Spielzeit, Gegner, Produktion und Durst still.</p>';return h;
 }
 function open(){if(isOpen||phase==='end'||phase==='menu'||phase==='launch')return;ensure();returnFocus=document.activeElement;wasPaused=paused;paused=true;isOpen=true;dialog.innerHTML=content();overlay.hidden=false;dialog.focus()}
 function close(){if(!isOpen)return;overlay.hidden=true;isOpen=false;paused=wasPaused||document.hidden||$('M').className==='on';if(returnFocus&&returnFocus.focus)returnFocus.focus();returnFocus=null}
 function reset(){if(isOpen){overlay.hidden=true;isOpen=false;returnFocus=null}ensure();ui()}
 function ui(){ensure();const available=phase!=='end'&&phase!=='menu'&&phase!=='launch';$('tmission').style.display=available?'flex':'none';
  if(available){$('tools').style.display='flex';$('tmode').style.display=L.p.ne&&phase!=='battle'?'block':'none'}
  if(phase==='battle'){for(const id of['tattack','tquests']){const b=$(id);if(b)b.style.display='none'}}
 }
 return{open,close,reset,ui,get shown(){return isOpen}};
})();
