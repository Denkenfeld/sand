/* Dedicated Level-3 mission presentation. Reuses the existing paused modal and close handler.
   Does NOT modify engine.js or the Level-1/2 help. */
(function(){
'use strict';
let scheduled=0;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function update(){
 const overlay=document.getElementById('mission-overlay');if(!overlay||overlay.hidden)return;
 const card=overlay.querySelector('.mission-card');if(!card||card.querySelector('[data-mission-level3]'))return;
 const eyebrow=card.querySelector('.mission-eyebrow');if(!eyebrow||!/^Level\s+3\b/i.test(eyebrow.textContent.trim()))return;
 const info=window.DTLV&&window.DTLV[2]&&window.DTLV[2].missionInfo;if(!info)return;
 const close=card.querySelector('[data-mission-close]');if(!close)return;
 const top=eyebrow.outerHTML;
 const text=id=>{const el=document.getElementById(id);return el?el.textContent.trim():''};
 const supplies=[['Strom',text('p_pw')],['Wasser',text('p_wt')],['Munition',text('p_am')]].filter(p=>p[1]);
 const banner=document.getElementById('bn');const preparing=banner&&banner.classList.contains('on')?text('bnt'):'';
 const progress=text('bart');
 const html=top+'<h2 id="mission-heading" data-mission-level3>'+esc(info.title)+'</h2>'+
  '<div class="mission-goal">'+esc(info.goal)+'</div><h3>So sicherst du die Glasdünen</h3><ol>'+
  info.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
  '<h3>Dein Stand beim Öffnen</h3><ul class="mission-progress">'+
  (progress?'<li>'+esc(progress)+'</li>':'')+supplies.map(p=>'<li>'+esc(p[0])+': '+esc(p[1])+' (Verbrauch / Vorrat)</li>').join('')+
  (preparing?'<li>'+esc(preparing)+'</li>':'')+'</ul>'+
  '<p class="mission-note">Die Zielhöhe ist auf allen Schwierigkeitsstufen 15. Die Zahl nötiger freier Felder pro Reihe und der Zwischenüberfall richten sich weiterhin nach der Schwierigkeit. Die aktuellen Werte stehen oben im Spiel. Diese Anleitung fügt keine zusätzlichen Siegbedingungen hinzu.</p>';
 card.innerHTML=html;card.appendChild(close);
 const note=document.createElement('p');note.className='mission-note';note.textContent='Das Spiel bleibt pausiert, bis du dieses Fenster schließt. Produktion, Gegner, Durst und Vorbereitungszeit stehen still.';card.appendChild(note);
}
function schedule(){if(scheduled)return;scheduled=requestAnimationFrame(function(){scheduled=0;update()})}
function init(){const ob=new MutationObserver(schedule);ob.observe(document.body,{childList:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
