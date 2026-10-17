/* Presentation-only: keep the existing mission button/click/pause logic, move it below the HUD. */
(function(){
'use strict';
let holder=null,hud=null,scheduled=0,watcher=null,ro=null;
const style=document.createElement('style');style.textContent=`
#mission-info-anchor{position:fixed;top:calc(env(safe-area-inset-top,0px) + 88px);right:12px;z-index:7;pointer-events:none}
#mission-info-anchor #tmission{display:flex;align-items:center;justify-content:center;width:48px;height:48px;min-width:48px;min-height:48px;padding:0;border-radius:14px;border:1px solid rgba(255,179,71,.5);background:linear-gradient(rgba(36,24,44,.94),rgba(18,12,26,.96));color:var(--tx,#ffe9c9);-webkit-text-fill-color:var(--tx,#ffe9c9);font:600 18px/1 system-ui;box-shadow:0 4px 15px rgba(0,0,0,.3);cursor:pointer;touch-action:manipulation;pointer-events:auto}
#mission-info-anchor #tmission svg{color:inherit;flex:none}
#mission-info-anchor #tmission:hover{border-color:#ffd093}
#mission-info-anchor #tmission:active{transform:translateY(1px)}
#mission-info-anchor #tmission:focus-visible{outline:2px solid #ffd093;outline-offset:3px}
`;document.head.appendChild(style);
function schedule(){if(scheduled)return;scheduled=requestAnimationFrame(function(){scheduled=0;place()})}
function place(){
 const button=document.getElementById('tmission');if(!button)return;
 if(!holder){holder=document.createElement('div');holder.id='mission-info-anchor';document.body.appendChild(holder)}
 if(button.parentElement!==holder)holder.appendChild(button);
 const h=document.getElementById('hud');
 if(h!==hud){hud=h;if(ro)ro.disconnect();if(hud&&window.ResizeObserver){ro=new ResizeObserver(schedule);ro.observe(hud)}}
 if(hud){const rect=hud.getBoundingClientRect();if(rect.height>0){holder.style.top=Math.max(12,Math.ceil(rect.bottom+8))+'px';holder.style.right=Math.max(12,Math.ceil(window.innerWidth-rect.right+10))+'px'}}
}
function init(){watcher=new MutationObserver(function(){schedule()});watcher.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});
 if(window.visualViewport)window.visualViewport.addEventListener('resize',schedule,{passive:true});schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
