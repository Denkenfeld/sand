
/* ===== LEVEL 8: independent outpost networks, vulnerable cargo convoys, escorts and three mission goals ===== */
const Outpost=(()=>{
 const CAP=240;let roots={},stats={},fleet=[],serial=0,delivered=0,built=false,escortWaiting=false,won=false;
 const alive=b=>b&&bl[K(b.c,b.r)]===b&&b.hp>0&&b.bp>=1;
 function init(){roots={};stats={};fleet=[];serial=0;delivered=0;built=false;escortWaiting=false;won=false;
  if(!L.outposts){ui();return}gen(23);
  for(const r of[8,9])for(let c=0;c<W;c++){const t=G[r][c];t.t=0;t.qs=0;t.q=0;t.cr=0;t.p=0;t.s=2;t.gap=c!==1&&c!==5;t.bridge=!t.gap;t.ck='';}
  for(const [c,r]of[[1,11],[5,12]]){const t=G[r][c];t.t=1;t.s=0;t.qs=0;t.cr=0;t.v=0;t.ck=''}
  for(const c of[1,5])rev(c,9);ui();
 }
 function network(){
  const whole=bl;const union=new Set(),pend=new Set(),parents={},mapped={},groups=[];
  const centers=Object.values(whole).filter(b=>b.bp>=1&&b.hp>0&&(b.k==='hub'||b.k==='outpost')).sort((a,b)=>(a.k==='hub'?-1:0)-(b.k==='hub'?-1:0));
  for(const root of centers){const key=K(root.c,root.r);if(union.has(key))continue;const queue=[key],keys=[];union.add(key);mapped[key]=key;
   while(queue.length){const k=queue.shift();keys.push(k);const c=k&7,r=k>>3;for(const[dx,dy]of DV){const nc=c+dx,nr=r+dy,n=K(nc,nr),b=whole[n];if(nc<0||nc>=W||!b||b.hp<=0||b.bp<1||union.has(n))continue;union.add(n);mapped[n]=key;parents[n]=k;queue.push(n)}}groups.push({root:key,keys})}
  const qs=[...union],seen=new Set(union);while(qs.length){const k=qs.shift(),c=k&7,r=k>>3;for(const[dx,dy]of DV){const nc=c+dx,n=K(nc,r+dy),b=whole[n];if(nc<0||nc>=W||!b||b.bp>=1||b.k!=='cv'||seen.has(n))continue;seen.add(n);pend.add(n);qs.push(n)}}
  const isolated=Object.keys(whole).map(Number).filter(k=>!union.has(k));if(isolated.length)groups.push({root:null,keys:isolated});
  const sums={sP:0,sW:0,sA:0,dP:0,dW:0,dA:0,uP:0,uW:0,uA:0};stats={};
  try{for(const g of groups){const sub={};for(const k of g.keys)sub[k]=whole[k];bl=sub;NET=g.root==null?new Set():new Set(g.keys);resCalc();if(g.root!=null){stats[g.root]={...RES};for(const k in sums)sums[k]+=RES[k]||0}}}
  finally{bl=whole;NET=union;PEND=pend;PAR=parents;roots=mapped;RES=sums;SUP=RES.sP;DEM=RES.dP}
 }
 function central(b){if(!b)return null;return L.outposts?bl[roots[K(b.c,b.r)]]||null:bl[3]||null}
 function inbound(root){return pk.reduce((s,q)=>{if(q.cos)return s;const last=q.pth[q.pth.length-1];if(last!==K(root.c,root.r))return s;return s+(q.kind==='sp'?q.amt:q.kind==='ecsale'?q.amt*20:0)},0)}
 function destination(b){const root=central(b);if(!alive(root)||root.off)return null;if(root.k==='outpost'&&(root.cargo||0)+inbound(root)>CAP-20)return null;return root}
 function canShip(b,kind,amt){if(!L.outposts||kind!=='sp')return true;const r=central(b);return !r||r.k==='hub'||(r.cargo||0)+inbound(r)+amt<=CAP}
 function delivery(q,e){if(!L.outposts||!e||e.k!=='outpost'||(q.kind!=='sp'&&q.kind!=='ecsale'))return false;
  e.cargo=(e.cargo||0)+(q.kind==='ecsale'?q.amt*20:q.amt);e.flash=.3;return true}
 function door(b){const opts=[[b.c+.5,b.r+1.18],[b.c+.5,b.r-.32],[b.c-.32,b.r+.5],[b.c+1.18,b.r+.5]].filter(p=>p[0]>.3&&p[0]<6.7&&p[1]>.1&&!blk(Math.floor(p[0]),Math.floor(p[1])));return opts[0]||null}
 function autoEscort(c){for(const u of un)if(u.k==='war'||u.k==='cra'){u.attackOrder=null;u.escortId=c.id;u.cityPathKey=null}escortWaiting=false}
 function ui(){let b=$('tescort');if(!b){b=document.createElement('button');b.id='tescort';b.type='button';b.title='Kampfeinheiten als Konvoi-Eskorte';b.setAttribute('aria-label','Konvoi-Eskorte');b.innerHTML='<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 8h16v13H4zm16 5h5l4 5v3h-9z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="24" r="3" fill="currentColor"/><circle cx="25" cy="24" r="3" fill="currentColor"/><path d="m5 4 4-2 4 2v4l-4 3-4-3z" fill="#8bffe0"/></svg>';$('tools').insertBefore(b,$('tmode'));b.onclick=()=>{if(!L.outposts||phase!=='play'||paused)return;City.cancel();mode=0;UI.setMode();const troops=un.filter(u=>u.k==='war'||u.k==='cra');if(!troops.length){toast('Bilde zuerst Krieger oder Crawler für eine Eskorte aus.');return}
    if(troops.some(u=>u.escortId)||escortWaiting){escortWaiting=false;for(const u of troops){u.escortId=null;u.attackOrder={x:u.x,y:u.y,wait:0,returning:true}}toast('Eskorte beendet – Truppen kehren zurück.',1)}
    else if(fleet.length){autoEscort(fleet[0]);toast('Kampfeinheiten eskortieren den Konvoi. Sammler bleiben bei ihrer Arbeit.',1)}else{escortWaiting=true;toast('Eskorte vorgemerkt: Kampfeinheiten begleiten den nächsten Konvoi.',1)}refreshButton()}}
  b.style.display=L.outposts?'flex':'none';b.style.color='#a4f3dd';refreshButton();
 }
 function refreshButton(){const b=$('tescort');if(b){const on=escortWaiting||un.some(u=>u.escortId);b.classList.toggle('on',on);b.style.boxShadow=on?'0 0 12px rgba(126,245,205,.45)':'';b.style.borderColor=on?'#9ceacb':''}}
 function tick(dt){if(!L.outposts||phase!=='play')return;
  const centers=Object.values(bl).filter(b=>alive(b)&&b.k==='outpost'&&b.r>=10);built=centers.length>0;
  const homeStations=Object.values(bl).filter(b=>alive(b)&&b.k==='cargo'&&isOn(b)&&central(b)===bl[3]);
  for(const src of Object.values(bl)){if(!alive(src)||src.k!=='cargo'||!isOn(src))continue;const r=central(src);if(!r||r.k!=='outpost')continue;
   src.dispatchCd=Math.max(0,(src.dispatchCd||0)-dt);
   if(src.dispatchCd>0||(r.cargo||0)<20||fleet.length>=3||!homeStations.length)continue;
   const a=door(src);if(!a)continue;let dst=null,path=null,bp=null;
   for(const b of homeStations){const goal=door(b),p=goal&&navPath(a[0],a[1],goal[0],goal[1]);if(p!==null&&p!==false&&goal){dst=b;path=p;bp=goal;break}}
   if(!dst){src.dispatchCd=2;continue}const value=Math.min(40,r.cargo);r.cargo-=value;src.dispatchCd=18;
   const c={id:++serial,k:'cargoTruck',x:a[0],y:a[1],hp:Math.round(135*DFc.uh),mx:Math.round(135*DFc.uh),value,src,dst,goal:bp,mv:false,ph:rnd()*9,tr:0,face:-1,lv:src.lv||0,cd:0};fleet.push(c);if(escortWaiting)autoEscort(c);toast('Frachtkonvoi gestartet: '+value+' Geldwert. Eskorte schützt die Lieferung.',1);snd('unit',src.c+.5);
  }
  for(const c of fleet){if(c.hp<=0){c.dead=true;fxAdd({ty:'boom',x:c.x,y:c.y,z:.2,r:.6,l:.6});fxPuff(c.x,c.y,.25,5,'rgba(78,64,62,A)',.13);ft(c.x,c.y+.7,'Konvoi verloren: '+c.value,'#ff9380');snd('boom',c.x);continue}
   if(!alive(c.dst)||!isOn(c.dst)){const d=homeStations[0];if(!d){c.mv=false;continue}c.dst=d;c.goal=door(d);c.cityPathKey=null}if(!c.goal)continue;
   if(City.walk(c,c.goal[0],c.goal[1],.82*(1+.1*c.lv),dt)){payIn(c.value);delivered++;c.dead=true;ft(c.x,c.y+.7,'Lieferung gesichert! +'+c.value,'#9bffe3',true);toast('Konvoi angekommen: '+c.value+' Geld gutgeschrieben.',1);snd('win',c.x)}
  }
  fleet=fleet.filter(c=>!c.dead);refreshButton();check();
 }
 function control(u,dt){if(!L.outposts||!u.escortId||u.k==='sam')return false;
  const c=fleet.find(c=>c.id===u.escortId);if(!c){u.escortId=null;u.attackOrder={x:u.x,y:u.y,wait:0,returning:true};return City.control(u,dt)}
  const threats=en.filter(e=>e.hp>0&&!e.hide&&L6.spawnTarget(u,e)&&Math.hypot(e.x-c.x,e.y-c.y)<4);
  threats.sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y));
  if(threats.length){City.engage(u,threats[0],dt);return true}
  const tx=clamp(c.x+((u.i||0)%2?.48:-.48),.35,6.65),ty=Math.max(.15,c.y-.38);
  if(Math.hypot(u.x-c.x,u.y-c.y)>1.05)City.walk(u,blk(Math.floor(tx),Math.floor(ty))?c.x:tx,blk(Math.floor(tx),Math.floor(ty))?c.y:ty,FS[u.k].s*1.3,dt);else u.mv=false;return true;
 }
 function check(){if(!L.outposts||won||phase!=='play')return;if(built&&delivered>0&&City.seen&&City.remaining()===0){won=true;toast('Außenposten gesichert, Lieferung angekommen, Stellung zerstört – SIEG!',1);end(1)}}
 function short(k){return L.outposts&&Object.values(bl).some(b=>b.bp>=1&&((b.lk||'').includes(k)||b.off===k||b.wo===k))}
 function info(b){if(!L.outposts)return '';const c=central(b),r=c&&stats[K(c.c,c.r)];
  if(b.k==='outpost')return 'Fracht '+Math.floor(b.cargo||0)+'/'+CAP+' · ⚡ '+resP(b)+' · 💧 '+resW(b);
  if(b.k==='cargo')return (c&&c.k==='hub'?'Empfang an der Basis':'Versand am Außenposten')+' · '+fleet.length+' Konvois';
  return r?(c.k==='hub'?'Basis':'Außenposten')+' ⚡ '+r.dP+'/'+r.sP+' · 💧 '+r.dW+'/'+r.sW:'';
 }
 function hud(){ui();if(!L.outposts)return;const flags=[built,delivered>0,City.seen&&City.remaining()===0];$('barf').style.width=flags.filter(Boolean).length/3*100+'%';$('bart').textContent=(flags[0]?'✓':'○')+' Außenposten · '+(flags[1]?'✓':'○')+' Lieferung · '+(flags[2]?'✓':'○')+' Stellung';
  if(!built&&!City.armed)$('hint').textContent='Überquere den Schlund: Boden freigraben, Außenposten in Reihen 10–13 bauen.';
  else if(delivered===0&&!City.armed)$('hint').textContent='Frachtstation an beiden Standorten: lokale Rohstoffe ernten, Konvoi schützen.';
 }
 function inspect(c,r){if(!L.outposts)return false;const t=tw(c,r);if(t&&(t.gap||t.bridge)){toast(t.gap?'Tiefer Schlund – hier ist Bauen und Graben unmöglich.':'Schmale Passage: begehbar, aber nicht bebaubar. Konvois und Truppen können passieren.');return true}return false}
 function drawTerrain(){if(!L.outposts)return;
  for(const r of[8,9])for(let c=0;c<W;c++){const px=c*T,py=SY(r+1),t=G[r][c];if(t.gap){x.fillStyle=LG(px,py,px+T,py+T,[[0,'#131422'],[.5,'#070a17'],[1,'#20162c']]);x.fillRect(px,py,T,T);x.strokeStyle='rgba(140,104,158,.3)';x.lineWidth=2;for(let i=0;i<4;i++){const xx=px+T*(.12+i*.22);x.beginPath();x.moveTo(xx,py);x.lineTo(xx+(H(c,r,i)-.5)*T*.12,py+T);x.stroke()}if(r===8){x.strokeStyle='#6d554f';x.lineWidth=3;x.beginPath();x.moveTo(px,py+T*.07);x.lineTo(px+T,py+T*.07);x.stroke()}}
   else{x.fillStyle='#a08b68';x.fillRect(px+T*.18,py,T*.64,T);for(let i=0;i<6;i++){x.fillStyle=i%2?'#544a49':'#d2bc8d';x.fillRect(px+T*.2,py+i*T/6,T*.6,T*.045)}x.strokeStyle='#302b34';x.lineWidth=3;x.beginPath();x.moveTo(px+T*.16,py);x.lineTo(px+T*.16,py+T);x.moveTo(px+T*.84,py);x.lineTo(px+T*.84,py+T);x.stroke();if(NT.night())NT.lit(px+T*.5,py+T*.5,T*.72,.4)}}
 }
 function drawConvoy(c){const px=SX(c.x),py=SY(c.y);vehicle('sam',px,py,T*.65,{f:c.face,tr:c.tr,mv:c.mv,fill:.95});
  x.fillStyle='#455567';rr(px-T*.14,py-T*.35,T*.25,T*.12,T*.02);x.fill();stripes(px-T*.01,py-T*.24,T*.25,T*.025,'#b4dece','#253d43');
  if(NT.night()){NT.lit(px,py-T*.2,T*.8,.75);glow(px+c.face*T*.25,py-T*.18,T*.4,'rgba(255,244,204,A)',.7)}if(c.hp<c.mx)hpBar(px,py-T*.9,T*.7,c.hp/c.mx,false);
 }
 return{init,network,central,destination,canShip,delivery,tick,control,hud,ui,info,short,inspect,drawTerrain,drawConvoy,check,get convoys(){return fleet},get state(){return{roots,stats,fleet,delivered,built,won,escortWaiting}}};
})();
Object.assign(UT,{outpost:'Strom +2 · Wasser +1',cargo:'Konvoi-Tempo +10 %'});
SPR.outpost=function(px,py,s,b){l6base(px,py,s,.84);prism(px,py-s*.14,s*.7,s*.36,['#a7a58e','#565b58'],'#313a3d','#ded4ad',.08,.06);
 x.fillStyle=LG(0,py-s*.85,0,py-s*.48,[[0,'#d8c8a1'],[1,'#887d70']]);x.beginPath();x.moveTo(px-s*.41,py-s*.49);x.lineTo(px-s*.26,py-s*.77);x.lineTo(px+s*.25,py-s*.77);x.lineTo(px+s*.4,py-s*.49);x.closePath();x.fill();
 x.strokeStyle='#6b5f59';x.lineWidth=1.3;for(let i=0;i<7;i++){x.beginPath();x.moveTo(px-s*.36+i*s*.12,py-s*.49);x.lineTo(px-s*.23+i*s*.077,py-s*.75);x.stroke()}
 x.fillStyle='#163044';rr(px-s*.12,py-s*.4,s*.24,s*.23,s*.025);x.fill();x.fillStyle='#8bffe0';x.fillRect(px-s*.1,py-s*.36,s*.2,s*.037);glow(px,py-s*.31,s*.32,'rgba(100,255,218,A)',.28);
 x.strokeStyle='#a4b5ba';x.lineWidth=2;x.beginPath();x.moveTo(px+s*.27,py-s*.65);x.lineTo(px+s*.27,py-s*1.05);x.stroke();x.save();x.translate(px+s*.27,py-s*.89);x.rotate(Math.sin(tm*.5)*.5);x.fillStyle='#d5dcd3';ell(0,0,s*.11,s*.035,-.4);x.fill();x.restore();
 x.fillStyle='#e5b64d';ell(px+s*.27,py-s*1.07,s*.027,s*.027);x.fill();NT.lit(px,py-s*.4,s*1.7,.85);
};
SPR.cargo=function(px,py,s,b){l6base(px,py,s,.9);prism(px+s*.09,py-s*.13,s*.62,s*.4,['#869cac','#405866'],'#273a4b','#bed2db',.06,.05);
 x.fillStyle='#11283b';rr(px-s*.19,py-s*.44,s*.42,s*.29,s*.025);x.fill();x.strokeStyle='#758b9b';x.lineWidth=2;x.stroke();
 for(let i=0;i<5;i++){x.fillStyle=i%2?'#22455b':'#1a374b';x.fillRect(px-s*.18,py-s*.42+i*s*.05,s*.4,s*.035)}
 x.strokeStyle='#d7aa43';x.lineWidth=s*.045;x.beginPath();x.moveTo(px-s*.33,py-s*.17);x.lineTo(px-s*.33,py-s*.84);x.lineTo(px+s*.3,py-s*.84);x.lineTo(px+s*.3,py-s*.7);x.stroke();
 x.strokeStyle='#292f3a';x.lineWidth=1.4;x.beginPath();x.moveTo(px,py-s*.83);x.lineTo(px,py-s*.62);x.stroke();x.fillStyle='#e3b654';ell(px,py-s*.61,s*.035,s*.035);x.fill();stripes(px,py-s*.07,s*.42,s*.045,'#d3b454','#25313f');
 x.fillStyle='#98eadb';ell(px+s*.27,py-s*.38,s*.023,s*.023);x.fill();glow(px+s*.27,py-s*.38,s*.2,'rgba(100,245,216,A)',.32);NT.lit(px,py-s*.35,s, .65);
};
