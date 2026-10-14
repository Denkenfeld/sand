/* Scroll cue for the building list.
   Gentle pulse before first scrolling; always-visible custom scrollbar until the bottom is reached.
   Once completed, native scrollbar behavior returns. Only stored for this tab/session. */
(function(){
'use strict';
const KEY='dt-buildings-scrollhint-v1';let done=false,started=false;
try{const state=sessionStorage.getItem(KEY);done=state==='done';started=state==='started'}catch(e){}
let dock=null,grid=null,box=null,thumb=null,frame=0,observer=null,ro=null;
const css=document.createElement('style');css.textContent=`
#dock .dg.dt-scrollhint-active{scrollbar-width:none}
#dock .dg.dt-scrollhint-active::-webkit-scrollbar{width:0}
.dt-scrollhint-box{position:absolute;right:2px;width:9px;pointer-events:none;z-index:2;opacity:.85}
.dt-scrollhint-track{position:absolute;inset:0 2px;background:rgba(255,179,71,.13);border-radius:6px;box-shadow:inset 0 0 0 1px rgba(255,179,71,.13)}
.dt-scrollhint-thumb{position:absolute;left:2px;width:5px;min-height:18px;background:rgba(255,198,116,.9);border-radius:5px;box-shadow:0 0 5px rgba(255,179,71,.25)}
.dt-scrollhint-cue{position:absolute;right:-2px;bottom:2px;width:13px;height:13px;color:#ffd193;opacity:0}
.dt-scrollhint-box.dt-scrollhint-pulse .dt-scrollhint-track{animation:dt-scrollhint-track 2.1s ease-in-out infinite}
.dt-scrollhint-box.dt-scrollhint-pulse .dt-scrollhint-thumb{animation:dt-scrollhint-glow 2.1s ease-in-out infinite}
.dt-scrollhint-box.dt-scrollhint-pulse .dt-scrollhint-cue{animation:dt-scrollhint-down 2.1s ease-in-out infinite}
@keyframes dt-scrollhint-glow{0%,100%{box-shadow:0 0 3px rgba(255,179,71,.25)}50%{box-shadow:0 0 9px rgba(255,198,116,.65)}}
@keyframes dt-scrollhint-track{0%,100%{background:rgba(255,179,71,.12)}50%{background:rgba(255,198,116,.25)}}
@keyframes dt-scrollhint-down{0%,100%{opacity:.2;transform:translateY(-3px)}55%{opacity:.8;transform:translateY(2px)}}
@media(prefers-reduced-motion:reduce){.dt-scrollhint-box *{animation:none!important}.dt-scrollhint-box.dt-scrollhint-pulse .dt-scrollhint-cue{opacity:.65}}
`;document.head.appendChild(css);
function save(value){try{sessionStorage.setItem(KEY,value)}catch(e){}}
function detach(){if(grid){grid.removeEventListener('scroll',onScroll);grid.classList.remove('dt-scrollhint-active')}if(ro){ro.disconnect();ro=null}if(box){box.remove();box=null;thumb=null}grid=null}
function finish(){done=true;save('done');detach();if(observer)observer.disconnect();window.removeEventListener('resize',schedule)}
function schedule(){if(done||frame)return;frame=requestAnimationFrame(function(){frame=0;measure()})}
function measure(){
 if(done)return;const d=document.getElementById('dock');if(!d)return;
 const g=d.querySelector('.dg');if(!g){detach();return}
 if(g!==grid){detach();dock=d;grid=g;grid.addEventListener('scroll',onScroll,{passive:true});if(window.ResizeObserver){ro=new ResizeObserver(schedule);ro.observe(grid)}}
 const overflow=grid.scrollHeight-grid.clientHeight;
 if(overflow<3||grid.clientHeight===0){if(box)box.style.display='none';grid.classList.remove('dt-scrollhint-active');return}
 if(!box){box=document.createElement('div');box.className='dt-scrollhint-box';box.setAttribute('aria-hidden','true');
  box.innerHTML='<div class="dt-scrollhint-track"></div><div class="dt-scrollhint-thumb"></div><svg class="dt-scrollhint-cue" viewBox="0 0 16 16"><path d="m4 5 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  thumb=box.querySelector('.dt-scrollhint-thumb');dock.appendChild(box)}
 grid.classList.add('dt-scrollhint-active');box.style.display='block';box.classList.toggle('dt-scrollhint-pulse',!started);
 const dr=dock.getBoundingClientRect(),gr=grid.getBoundingClientRect();
 box.style.top=(gr.top-dr.top+dock.scrollTop)+'px';box.style.height=grid.clientHeight+'px';
 const h=Math.min(grid.clientHeight,Math.max(22,grid.clientHeight*grid.clientHeight/grid.scrollHeight));
 const p=Math.max(0,Math.min(1,grid.scrollTop/overflow));
 thumb.style.height=h+'px';thumb.style.top=((grid.clientHeight-h)*p)+'px';
}
function onScroll(){if(done||!grid)return;
 const max=grid.scrollHeight-grid.clientHeight;if(max<3)return;
 if(!started&&grid.scrollTop>2){started=true;save('started');if(box)box.classList.remove('dt-scrollhint-pulse')}
 if(started&&grid.scrollTop>=max-2){finish();return}schedule();
}
function init(){if(done)return;dock=document.getElementById('dock');if(!dock)return;
 observer=new MutationObserver(function(records){if(records.some(r=>r.target===dock||grid&&grid.contains(r.target)))schedule()});
 observer.observe(dock,{childList:true,subtree:true});window.addEventListener('resize',schedule,{passive:true});schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
