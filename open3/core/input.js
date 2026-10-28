/* ---------- Eingabe ---------- */
const K={};let jp=null,J0=[0,0],jx=0,jy=0,boost=0,jumpReq=0;
addEventListener('keydown',e=>{K[e.code]=1;if(e.code=='Space')jumpReq=1});addEventListener('keyup',e=>K[e.code]=0);
const jb=$('jb'),jk=$('jk'),bo=$('bo'),ju=$('ju');
function mv(e){let dx=e.clientX-J0[0],dy=e.clientY-J0[1];const l=Math.hypot(dx,dy),m=55;if(l>m){dx*=m/l;dy*=m/l}jx=dx/m;jy=dy/m;jk.style.transform=`translate(${dx}px,${dy}px)`}
addEventListener('pointerdown',e=>{if(e.target.classList.contains('btn')||jp!==null)return;jp=e.pointerId;J0=[e.clientX,e.clientY];jb.style.display='block';jb.style.left=e.clientX+'px';jb.style.top=e.clientY+'px';mv(e)});
addEventListener('pointermove',e=>{if(e.pointerId===jp)mv(e)});
const pe=e=>{if(e.pointerId===jp){jp=null;jx=jy=0;jb.style.display='none'}};addEventListener('pointerup',pe);addEventListener('pointercancel',pe);
bo.addEventListener('pointerdown',()=>{boost=1;bo.classList.add('on')});
['pointerup','pointercancel','pointerleave'].forEach(t=>bo.addEventListener(t,()=>{boost=0;bo.classList.remove('on')}));
ju.addEventListener('pointerdown',()=>jumpReq=1);
