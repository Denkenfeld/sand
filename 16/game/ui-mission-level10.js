/* Level 10 launch help. Existing launch journal, pause and close behavior remain untouched. */
(function(){
'use strict';let scheduled=0;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function update(){
 const overlay=document.getElementById('mission-overlay');if(!overlay||overlay.hidden)return;
 const card=overlay.querySelector('.mission-card');if(!card||card.querySelector('[data-mission-level10]'))return;
 const eyebrow=card.querySelector('.mission-eyebrow');if(!eyebrow||!/^Level\s+10\b/i.test(eyebrow.textContent.trim()))return;
 const level=window.DTLV&&window.DTLV[9],info=level&&level.missionInfo;if(!info)return;
 const close=card.querySelector('[data-mission-close]');if(!close)return;
 const top=eyebrow.outerHTML,text=id=>{const e=document.getElementById(id);return e?e.textContent.trim():''};
 const supplies=[['Geld / Spice',text('p_sp')],['Strom',text('p_pw')],['Wasser',text('p_wt')],['Munition',text('p_am')]].filter(p=>p[1]);
 const progress=text('bart');
 card.innerHTML=top+'<h2 id="mission-heading" data-mission-level10>'+esc(info.title)+'</h2><div class="mission-goal">'+esc(info.goal)+'</div>'+
 '<h3>So bereitest du den Start vor</h3><ol>'+info.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
 '<h3>Dein Stand beim Öffnen</h3><ul class="mission-progress">'+
 (progress?'<li>'+esc(progress)+'</li>':'')+supplies.map(p=>'<li>'+esc(p[0])+': '+esc(p[1])+(p[0]==='Geld / Spice'?'':' (Verbrauch / Vorrat)')+'</li>').join('')+'</ul>'+
 '<p class="mission-note">Der Start ist erst möglich, wenn Raumflughafen, 60 Speicherenergie, ein aktiver Schild, drei Steuerpunkte, die zerstörte Festung, die 25-sekündige Vorbereitung und die abgewehrte Schlusswelle fertig sind. Diese Hilfe ersetzt nicht das Startmission-Journal, sondern erklärt es.</p>';
 card.appendChild(close);const note=document.createElement('p');note.className='mission-note';note.textContent='Das Spiel bleibt pausiert, bis du dieses Fenster schließt. Vorbereitung, Gegner, Versorgung und Tageszeiten stehen still.';card.appendChild(note);
}
function schedule(){if(scheduled)return;scheduled=requestAnimationFrame(function(){scheduled=0;update()})}
function init(){const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
