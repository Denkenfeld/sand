/* Level-7 siege help only; existing pause, modal and close action remain untouched. */
(function(){
'use strict';let scheduled=0;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function update(){
 const overlay=document.getElementById('mission-overlay');if(!overlay||overlay.hidden)return;
 const card=overlay.querySelector('.mission-card');if(!card||card.querySelector('[data-mission-level7]'))return;
 const eyebrow=card.querySelector('.mission-eyebrow');if(!eyebrow||!/^Level\s+7\b/i.test(eyebrow.textContent.trim()))return;
 const level=window.DTLV&&window.DTLV[6],info=level&&level.missionInfo;if(!info)return;
 const close=card.querySelector('[data-mission-close]');if(!close)return;
 const top=eyebrow.outerHTML,text=id=>{const e=document.getElementById(id);return e?e.textContent.trim():''};
 const supplies=[['Geld / Spice',text('p_sp')],['Strom',text('p_pw')],['Wasser',text('p_wt')],['Munition',text('p_am')]].filter(p=>p[1]);
 const progress=text('bart');
 card.innerHTML=top+'<h2 id="mission-heading" data-mission-level7>'+esc(info.title)+'</h2><div class="mission-goal">'+esc(info.goal)+'</div>'+
 '<h3>So führst du die Belagerung</h3><ol>'+info.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
 '<h3>Dein Stand beim Öffnen</h3><ul class="mission-progress">'+
 (progress?'<li>'+esc(progress)+'</li>':'')+supplies.map(p=>'<li>'+esc(p[0])+': '+esc(p[1])+(p[0]==='Geld / Spice'?'':' (Verbrauch / Vorrat)')+'</li>').join('')+'</ul>'+
 '<p class="mission-note">Dieses Level wird durch die Stadtzerstörung gewonnen, nicht durch eine bestimmte Ausgrabungshöhe. Die Reihen 10–15 geben das Stadtgebiet an. Die Hinweise ergänzen keine versteckten Siegbedingungen.</p>';
 card.appendChild(close);const note=document.createElement('p');note.className='mission-note';note.textContent='Das Spiel bleibt pausiert, bis du dieses Fenster schließt. Truppen, gegnerische Stadtproduktion, Gegner, Versorgung und Tageszeiten stehen still.';card.appendChild(note);
}
function schedule(){if(scheduled)return;scheduled=requestAnimationFrame(function(){scheduled=0;update()})}
function init(){const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
