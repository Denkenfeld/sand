
/* ===== LEVEL 7: siege city, independent supply graph and mobile attack orders ===== */
const City=(()=>{
 let nodes={},seen=false,armed=false,target=null,total=0,cleared=false,net=new Set(),packets=[],spawn=25,guardMoney=65,ammo=10,supply={p:0,w:0,a:0},refineryCd=0;
 const NAMES={hub:'Rostfestung',raf:'Rote Raffinerie',fab:'Scharlachwerkstatt',kas:'Alte Kaserne',wel:'Rost-Taufänger',ene:'Zerrissenes Energiefeld',tur:'Rost-Geschützturm',cv:'Rotes Förderband'};
 const alive=b=>b&&b.hp>0&&nodes[K(b.c,b.r)]===b;
 const at=(c,r)=>L.siege?nodes[K(c,r)]||null:null;
 const solid=(c,r)=>{const b=seen&&at(c,r);return !!(b&&b.k!=='cv'&&b.hp>0)};
 const occupied=(c,r)=>!!at(c,r);
 const units=()=>un.filter(u=>u.k==='war'||u.k==='cra');
 const remaining=()=>Object.values(nodes).filter(b=>b.k!=='cv'&&b.hp>0).length;
 function ui(){
  let b=$('tattack');if(!b){b=document.createElement('button');b.id='tattack';b.type='button';b.title='Angriffsziel auswählen';b.setAttribute('aria-label','Angriffsziel auswählen');
   b.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 3v8m0 10v8M3 16h8m10 0h8" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="2.3" fill="currentColor"/></svg>';
   $('tools').insertBefore(b,$('tmode'));b.onclick=()=>{if(!L.siege||phase!=='play'||paused)return;armed=!armed;mode=0;UI.setMode();UI.disarm();UI.sheet('');sel=null;updateButton();snd('tap');if(armed)toast('Angriff: Tippe ein Zielgebiet. Krieger und Crawler rücken aus.',1)};
   const st=document.createElement('style');st.textContent='#tattack{color:#ffd49e}#tattack.on{border-color:#ff9b70;box-shadow:0 0 12px #ff875c66;background:linear-gradient(#66342a,#301a26)}';document.head.appendChild(st)}
  b.style.display=L.siege?'flex':'none';updateButton();
 }
 function updateButton(){const b=$('tattack');if(b)b.classList.toggle('on',armed)}
 function init(){nodes={};seen=false;armed=false;target=null;cleared=false;packets=[];net=new Set();guardMoney=65;ammo=10;spawn=25;refineryCd=0;total=0;
  if(!L.siege){ui();return}
  gen(19);
  const add=(k,c,r)=>{const hp=Math.round((k==='hub'?290:k==='tur'?115:B[k].hp)*DFc.eh);nodes[K(c,r)]={k,c,r,x:c+.5,y:r+.4,hp,mx:hp,city:true,bp:1,lv:0,ph:rnd()*9,cd:rnd(),q:[],stock:20,tank:4,off:0,flash:0};};
  for(let r=10;r<=15;r++)add('cv',3,r);
  for(const r of[10,12,14])for(let c=1;c<=5;c++)add('cv',c,r);
  for(const [k,c,r]of[['hub',3,14],['raf',1,12],['fab',5,12],['kas',1,14],['wel',5,14],['ene',3,12],['tur',1,10],['tur',5,10],['tur',3,13]])add(k,c,r);
  total=remaining();
  for(let r=10;r<=15;r++)for(const t of G[r]){t.t=0;t.v=2;t.qs=0;t.cr=0;t.ck='';t.s=0}
  recalc();ui();
 }
 function recalc(){net=new Set();const root=Object.values(nodes).find(b=>b.k==='hub'&&b.hp>0);if(root){const queue=[root];net.add(K(root.c,root.r));while(queue.length){const a=queue.shift();for(const[dx,dy]of DV){const b=nodes[K(a.c+dx,a.r+dy)];if(b&&b.hp>0&&!net.has(K(b.c,b.r))){net.add(K(b.c,b.r));queue.push(b)}}}}
  supply={p:0,w:0,a:0};for(const k of net){const b=nodes[k];if(b.k==='hub')supply.p+=6;if(b.k==='ene')supply.p+=10;if(b.k==='wel')supply.w+=8;if(b.k==='fab')supply.a+=6}
  let p=supply.p,w=supply.w,a=supply.a;
  const order=Object.values(nodes).filter(b=>b.k!=='cv').sort((a,b)=>(a.k==='ene'||a.k==='wel'?-2:a.k==='fab'?-1:0)-(b.k==='ene'||b.k==='wel'?-2:b.k==='fab'?-1:0));
  for(const b of order){const dp=Math.max(0,-(B[b.k].p||0)),dw=Math.max(0,-(B[b.k].w||0)),da=Math.max(0,-(B[b.k].a||0));
   b.off=!net.has(K(b.c,b.r))||p<dp||w<dw||a<da;if(!b.off){p-=dp;w-=dw;a-=da}}
 }
 function reveal(){if(seen||!L.siege)return;seen=true;bver++;
  for(let r=10;r<=15;r++)for(const t of G[r]){t.s=2;t.q=0;t.p=0;t.w=0;t.t=0;t.ck='';}
  Q=Q.filter(t=>t.r<10||t.r>15);for(const w of wk)if(w.j&&w.j.type==='dig'&&w.j.obj.r>=10&&w.j.obj.r<=15)w.j=null;
  toast('⚔ Gegnerstadt entdeckt! Zerstöre ihre Gebäude. Angriffsknopf → Zielgebiet.',1);ft(3.5,10.8,'GEGNERSTADT','#ff9d87',1);snd('horn',3.5);
  for(let i=0;i<5;i++)makeGuard('pl',i%2?4.4:2.5,11+(i%3)*.5);
  makeGuard('pz',2.4,13.1);makeGuard('pz',4.4,13.3);
 }
 function discover(){if(L.siege&&!seen&&tp>=10)reveal()}
 function makeGuard(k,c,r){const e=mkE(k);e.x=c;e.y=r;e.guard=true;e.homeX=c;e.homeY=r;e.kit=k==='pl'?KIT.pl[0]:null;en.push(e)}
 function hold(e,tg,dt){if(!e.guard||!seen)return false;
  if(Math.hypot(tg.x-e.x,tg.y-e.y)<=5.5)return false;
  const d=Math.hypot(e.homeX-e.x,e.homeY-e.y);if(d>.18){const q=wayTo(e,e.homeX,e.homeY,dt),v=Math.min(d,FS[e.k].s*dt);const dd=Math.hypot(q[0]-e.x,q[1]-e.y)||1;e.x+=(q[0]-e.x)/dd*v;e.y+=(q[1]-e.y)/dd*v;e.mv=true;e.tr+=v}else e.mv=false;return true;
 }
 function destroy(b){if(!b||nodes[K(b.c,b.r)]!==b)return;delete nodes[K(b.c,b.r)];bver++;b.hp=0;
  packets=packets.filter(q=>q.to!==b&&q.from!==b);fxAdd({ty:'boom',x:b.x,y:b.y,z:.2,r:b.k==='hub'?1.1:.5,l:.55});fxSpark(b.x,b.y,.4,8,'#ffa891');dust(b.x,b.y,6);snd('boom',b.x,{sz:.6});
  if(b.k!=='cv'){const t=tw(b.c,b.r);if(t){t.cr=1;t.ck=''}ft(b.x,b.y+.8,NAMES[b.k]+' zerstört','#ffb691');sp+=b.k==='hub'?45:10}recalc();
 }
 function tick(dt){if(!L.siege||phase!=='play')return;discover();if(!seen)return;
  for(const b of Object.values(nodes))if(b.hp<=0)destroy(b);recalc();
  packets=packets.filter(q=>{q.p+=dt*.9;return q.p<q.path.length-.5&&alive(q.from)&&alive(q.to)&&q.path.every(k=>nodes[k])});
  const values=Object.values(nodes);const raf=values.find(b=>b.k==='raf'&&!b.off),fab=values.find(b=>b.k==='fab'&&!b.off),kas=values.find(b=>b.k==='kas'&&!b.off);
  if(raf){refineryCd+=dt;if(refineryCd>=7){refineryCd-=7;guardMoney=Math.min(200,guardMoney+12);shipVisual(raf,'sp')}}
  if(fab)ammo=Math.min(16,ammo+dt*2);
  spawn-=dt;if(spawn<=0){spawn=32/DFc.es;
   if(en.filter(e=>e.guard&&e.hp>0).length<11){const k=fab&&guardMoney>=35?'pz':kas&&guardMoney>=12?'pl':null;const producer=k==='pz'?fab:kas;
    if(k){guardMoney-=k==='pz'?35:12;makeGuard(k,producer.c+.45,producer.r-.3);shipVisual(producer,'sup')}}}
  const friendly=[];for(const b of Object.values(bl))friendly.push(b);for(const u of un)friendly.push(u);for(const w of wk)friendly.push(w);
  for(const b of values){if(!alive(b))continue;b.flash=Math.max(0,(b.flash||0)-dt*2);b.cd-=dt;
   if((b.k==='tur'||b.k==='hub')&&!b.off){let tg=null,best=b.k==='tur'?3.3:2.3;for(const o of friendly){if(o.hp<=0)continue;const d=Math.hypot(pxo(o)-b.x,pyo(o)-b.y);if(d<best){best=d;tg=o}}
    if(tg&&b.cd<=0&&(b.k==='hub'||ammo>=1)){b.aim=Math.atan2(-(SY(pyo(tg))-SY(b.y)),SX(pxo(tg))-SX(b.x));b.cd=b.k==='tur'?1.2:1.8;if(b.k==='tur')ammo--;atk({k:b.k,x:b.x,y:b.y,city:true},tg,(b.k==='tur'?11:5)*DFc.ed);b.flash=.2}}
  }
  if(!cleared&&remaining()===0){cleared=true;armed=false;updateButton();toast('⚑ Gegnerstadt zerstört – SIEG!',1);end(1)}
 }
 function path(a,b){if(!net.has(K(a.c,a.r))||!net.has(K(b.c,b.r)))return null;const start=K(a.c,a.r),goal=K(b.c,b.r),queue=[start],prev={[start]:null};while(queue.length){const k=queue.shift();if(k===goal){let out=[];let j=k;while(j!=null){out.push(j);j=prev[j]}return out.reverse()}const c=k&7,r=k>>3;for(const[dx,dy]of DV){const n=K(c+dx,r+dy);if(c+dx<0||c+dx>=W||!net.has(n)||n in prev)continue;prev[n]=k;queue.push(n)}}return null}
 function shipVisual(b,kind){const h=Object.values(nodes).find(b=>b.k==='hub'),p=h&&path(kind==='sp'?b:h,kind==='sp'?h:b);if(p&&p.length>1&&packets.length<24)packets.push({path:p,p:.5,kind,from:kind==='sp'?b:h,to:kind==='sp'?h:b})}
 function allTargets(){return seen?Object.values(nodes).filter(b=>b.hp>0):[]}
 function near(x0,y0,R){let a=null,d=R;for(const e of en.concat(allTargets())){if(e.hp<=0||e.hide)continue;const dd=Math.hypot(e.x-x0,e.y-y0);if(dd<d){d=dd;a=e}}return a}
 function candidates(u,cx,cy,R){let a=null,score=99;const S=FS[u.k];
  for(const e of en.concat(allTargets())){if(e.hp<=0||e.hide||!L6.spawnTarget(u,e))continue;const area=Math.hypot(e.x-cx,e.y-cy),local=Math.hypot(e.x-u.x,e.y-u.y);if(area>R&&local>S.r+1)continue;
   const d=local+(e.city?(e.k==='cv'?4:.3):0);if(d<score){score=d;a=e}}
  return a}
 function safeWalk(u,tx,ty,v,dt){const distance=Math.hypot(tx-u.x,ty-u.y);if(distance<.12){u.mv=false;return true}
  const key=tx.toFixed(1)+','+ty.toFixed(1)+','+bver;
  if(u.cityPathKey!==key||(u.cityPathT=(u.cityPathT||0)-dt)<=0){u.cityPathKey=key;u.cityPathT=.7;u.cityPath=navPath(u.x,u.y,tx,ty)}
  if(u.cityPath===null){u.mv=false;return false}const p=u.cityPath;while(p.length&&Math.hypot(p[0][0]-u.x,p[0][1]-u.y)<.12)p.shift();
  const q=p.length?p[0]:[tx,ty],dx=q[0]-u.x,dy=q[1]-u.y,d=Math.hypot(dx,dy)||1e-6,step=Math.min(d,distance,v*dt);
  const nx=u.x+dx/d*step,ny=u.y+dy/d*step;if(blk(Math.floor(nx),Math.floor(ny))&&!(Math.floor(u.x)===Math.floor(nx)&&Math.floor(u.y)===Math.floor(ny))){u.cityPathKey=null;u.mv=false;return false}
  u.x=nx;u.y=ny;u.mv=true;u.ph=(u.ph||0)+step*8.5;u.tr=(u.tr||0)+step;u.face=dx>=0?1:-1;stp(u,step);return false;
 }
 function approach(u,e,dt){const S=FS[u.k],r=Math.max(.55,S.r-.12),d=Math.hypot(e.x-u.x,e.y-u.y);
  if(d<=S.r+(e.city?.28:0)){u.mv=false;u.face=e.x>=u.x?1:-1;u.act=(u.act||0)+dt*8;if(u.cd<=0){u.cd=S.c;atk(u,e,S.d*(u.dm||1)*((MU[u.k]||{})[e.k]||1))}return}
  let best=null,dd=Infinity;for(let i=0;i<12;i++){const a=i/12*TAU,tx=clamp(e.x+Math.cos(a)*r,.35,6.65),ty=Math.max(.15,e.y+Math.sin(a)*r);
   if(blk(Math.floor(tx),Math.floor(ty)))continue;const score=Math.hypot(tx-u.x,ty-u.y);if(score<dd&&navPath(u.x,u.y,tx,ty)!==null){best=[tx,ty];dd=score}}
  if(best)safeWalk(u,best[0],best[1],S.s*1.3,dt);else u.mv=false;
 }
 function control(u,dt){if(!L.siege||u.k==='sam')return false;const o=u.attackOrder;
  if(!o){if(!seen)return false;const e=candidates(u,u.x,u.y,FS[u.k].r);if(e&&e.city){approach(u,e,dt);return true}return false}
  if(o.returning){const b=u.b&&bl[K(u.b.c,u.b.r)]===u.b?u.b:bl[3];let hx=3.5,hy=1.2;
   if(b){const opts=[[b.c+.5,b.r+1.18],[b.c+.5,b.r-.32],[b.c-.32,b.r+.5],[b.c+1.18,b.r+.5]].filter(p=>p[0]>.3&&p[0]<6.7&&p[1]>.1&&!blk(Math.floor(p[0]),Math.floor(p[1])));opts.sort((a,c)=>Math.hypot(a[0]-u.x,a[1]-u.y)-Math.hypot(c[0]-u.x,c[1]-u.y));if(opts.length){hx=opts[0][0];hy=opts[0][1]}}
   const nearEnemy=en.find(e=>e.hp>0&&!e.hide&&L6.spawnTarget(u,e)&&Math.hypot(e.x-u.x,e.y-u.y)<FS[u.k].r);if(nearEnemy){approach(u,nearEnemy,dt);return true}
   if(safeWalk(u,hx,hy,FS[u.k].s*1.3,dt)){u.attackOrder=null;u.cityPath=null}return true}
  const e=candidates(u,o.x,o.y,3.2);if(e){o.wait=0;approach(u,e,dt);return true}
  if(Math.hypot(u.x-o.x,u.y-o.y)>.7){let tx=o.x,ty=o.y;if(blk(Math.floor(tx),Math.floor(ty))){const choices=DV.map(([a,b])=>[tx+a*.8,ty+b*.8]).filter(p=>p[0]>.3&&p[0]<6.7&&!blk(Math.floor(p[0]),Math.floor(p[1])));if(choices.length){tx=choices[0][0];ty=choices[0][1]}}
   if(!safeWalk(u,tx,ty,FS[u.k].s*1.3,dt)){if(u.mv)o.wait=0;else o.wait+=dt;if(o.wait>8){o.returning=true;toast('Ziel nicht erreichbar – Truppen kehren zurück.')}return true}}
  u.mv=false;o.wait+=dt;if(o.wait>=3)o.returning=true;return true;
 }
 function order(c,r){if(!L.siege||!armed)return false;armed=false;updateButton();if(r>=10&&!seen){toast('Die Stadt ist noch nicht entdeckt. Grabe bis Reihe 10.');return true}
  const troops=units();if(!troops.length){toast('Keine mobilen Kampfeinheiten: bilde Krieger oder Crawler aus.');return true}
  target={x:clamp(c+.5,.4,6.6),y:Math.max(.25,r+.5)};for(const u of troops){u.attackOrder={...target,wait:0,returning:false};u.cityPathKey=null}
  toast('⚔ '+troops.length+' Kampfeinheiten rücken aus. Sammler bleiben bei ihrer Arbeit.',1);snd('horn',target.x);return true;
 }
 function inspect(c,r){const b=seen&&at(c,r);if(!b)return false;toast('Feind: '+NAMES[b.k]+' · '+Math.ceil(b.hp)+'/'+b.mx+' HP · '+(b.off?'Versorgung unterbrochen':'versorgt')+' – Angriffsknopf zum Angreifen.');return true}
 function hud(){ui();if(!L.siege)return;const n=remaining();$('barf').style.width=(seen?100*(total-n)/total:Math.min(30,hh/10*30))+'%';$('bart').textContent=seen?'Belagerung · '+n+' / '+total+' Stadtgebäude übrig':'Gegnerstadt suchen · Reihe 10–15';
  if(armed)$('hint').textContent='⚔ Tippe das Angriffsziel – Krieger und Crawler, keine Sammler.';
 }
 function drawRoads(){if(!L.siege||!seen)return;
  for(const b of Object.values(nodes)){if(b.k!=='cv'||b.hp<=0)continue;const px=(b.c+.5)*T,py=SY(b.r+.5);x.lineCap='butt';
   for(const[dx,dy]of DV)if(nodes[K(b.c+dx,b.r+dy)]){x.strokeStyle='rgba(20,8,12,.4)';x.lineWidth=T*.65;x.beginPath();x.moveTo(px+3,py+4);x.lineTo(px+dx*T*.5+3,py-dy*T*.5+4);x.stroke();x.strokeStyle='#873c35';x.lineWidth=T*.58;x.beginPath();x.moveTo(px,py);x.lineTo(px+dx*T*.5,py-dy*T*.5);x.stroke();x.strokeStyle='#29212a';x.lineWidth=T*.4;x.stroke();x.setLineDash([T*.04,T*.075]);x.lineDashOffset=-tm*T*.4;x.strokeStyle='#584046';x.lineWidth=T*.36;x.stroke();x.setLineDash([])}
   x.fillStyle=net.has(K(b.c,b.r))?'#ff9c67':'#602a35';ell(px,py,T*.035,T*.035);x.fill();if(NT.night())NT.lit(px,py,T*.5,.24);
  }

  const raf=Object.values(nodes).find(b=>b.k==='raf'&&!b.off),hq=Object.values(nodes).find(b=>b.k==='hub'&&!b.off),route=raf&&hq&&path(raf,hq);
  if(route&&route.length>1)for(let j=0;j<2;j++){const f=(tm*.3+j*(route.length-1)/2)%(2*(route.length-1)),back=f>route.length-1,p=back?2*(route.length-1)-f:f,i=Math.min(route.length-2,Math.floor(p)),t=p-i,a=route[i],b=route[i+1],px=SX((a&7)+.5+((b&7)-(a&7))*t),py=SY((a>>3)+.45+((b>>3)-(a>>3))*t),dir=(((b&7)-(a&7))*(back?-1:1))<0?-1:1;
   x.save();x.filter='hue-rotate(310deg) saturate(.7)';vehicle('sam',px,py,T*.4,{tr:tm,mv:true,fill:back?.2:.8,f:dir});x.restore();if(NT.night())NT.lit(px,py-T*.1,T*.65,.6)}
  for(const q of packets){const i=Math.min(q.path.length-2,Math.floor(q.p)),f=q.p-i,a=q.path[i],b=q.path[i+1],px=SX((a&7)+.5+((b&7)-(a&7))*f),py=SY((a>>3)+.5+((b>>3)-(a>>3))*f);pktArt(q.kind,px,py,T*.9)}
 }
 function structures(){return seen?Object.values(nodes).filter(b=>b.k!=='cv'&&b.hp>0):[]}
 function overlays(){if(!L.siege||!seen)return;for(const b of structures()){const px=SX(b.c+.5),py=SY(b.r+.6);if(b.hp<b.mx)hpBar(px,py-T*.62,T*.65,b.hp/b.mx,true)}
  if(target&&units().some(u=>u.attackOrder&&!u.attackOrder.returning)){const cx=SX(target.x),cy=SY(target.y);x.strokeStyle='rgba(255,128,95,.8)';x.lineWidth=2;x.setLineDash([6,5]);x.lineDashOffset=-tm*12;x.beginPath();x.ellipse(cx,cy,T*.6,T*.3,0,0,TAU);x.stroke();x.setLineDash([])}
 }
 return{init,ui,tick,discover,solid,occupied,at,near,control,order,inspect,hud,drawRoads,structures,overlays,hold,remaining,reveal,
  get seen(){return seen},get armed(){return armed},cancel(){armed=false;updateButton()},get state(){return{nodes,net,packets,guardMoney,ammo,supply,total,cleared}}};
})();
/* New enemy-building artwork: rusty red cladding, torn panels, broken vents and battle damage. */
function enemyBuilding(b){const px=SX(b.c+.5),py=SY(b.r)-T*.1,s=T,k=b.k;
 x.save();shdw(px,py,s,.5);prism(px,py,s*.85,s*.13,['#885048','#45272c'],'#291b25','#b07860');stripes(px,py,s*.84,s*.04,'#c38a42','#281b23');
 const red=['#8f4437','#cc7960','#934d45','#3c2330'];
 if(k==='hub'){prism(px,py-s*.12,s*.72,s*.47,['#a95543','#572d32'],'#352029','#c17c64');x.fillStyle='#2b1c28';rr(px-s*.14,py-s*.44,s*.28,s*.29,s*.025);x.fill();x.fillStyle='#df8b56';x.fillRect(px-s*.12,py-s*.42,s*.24,s*.035);
  x.fillStyle='#714036';x.beginPath();x.moveTo(px-s*.43,py-s*.59);x.lineTo(px-s*.19,py-s*.84);x.lineTo(px+s*.26,py-s*.79);x.lineTo(px+s*.42,py-s*.59);x.closePath();x.fill();x.strokeStyle='#bc7960';x.lineWidth=2;x.stroke();
  x.strokeStyle='#8c786c';x.lineWidth=2;x.beginPath();x.moveTo(px+s*.23,py-s*.7);x.lineTo(px+s*.2,py-s*1.05);x.lineTo(px+s*.33,py-s*1.13);x.stroke();
 }else if(k==='raf'){for(const i of[-1,1]){cyl(px+i*s*.2,py-s*.63,py-s*.13,s*.16,red,'#a76e55');ring(px+i*s*.2,py-s*.27,s*.16);ring(px+i*s*.2,py-s*.48,s*.16);x.fillStyle='#221322';x.fillRect(px+i*s*.2-s*.05,py-s*.51,s*.1,s*.28);x.fillStyle=b.off?'#59322c':'#eb9c4f';x.fillRect(px+i*s*.2-s*.04,py-s*.46,s*.08,s*.17)}l6pipe(px-s*.2,py-s*.33,px+s*.2,py-s*.33,s,'#967264');
 }else if(k==='fab'){prism(px,py-s*.13,s*.84,s*.42,['#925045','#512d34'],'#32212a','#b77561');for(let i=0;i<3;i++){const xx=px-s*.42+i*s*.28;x.fillStyle=i===1?'#573139':'#a66a55';x.beginPath();x.moveTo(xx,py-s*.55);x.lineTo(xx+s*.045,py-s*.79);x.lineTo(xx+s*.26,py-s*.55);x.fill()}
  x.fillStyle='#1d1721';x.fillRect(px-s*.17,py-s*.43,s*.34,s*.24);cyl(px+s*.3,py-s*.99,py-s*.48,s*.06,red,'#30202a');
 }else if(k==='kas'){prism(px,py-s*.13,s*.82,s*.36,['#b3694d','#683a36'],'#38242b','#b87d62');x.fillStyle='#8d4439';x.beginPath();x.moveTo(px-s*.44,py-s*.49);x.lineTo(px-s*.25,py-s*.77);x.lineTo(px+s*.27,py-s*.77);x.lineTo(px+s*.44,py-s*.49);x.fill();
  for(let i=0;i<6;i++){x.strokeStyle='#482631';x.lineWidth=1;x.beginPath();x.moveTo(px-s*.4+i*s*.16,py-s*.49);x.lineTo(px-s*.22+i*s*.085,py-s*.75);x.stroke()}x.fillStyle='#1f1723';x.fillRect(px-s*.11,py-s*.35,s*.22,s*.22);
 }else if(k==='wel'){cyl(px,py-s*.73,py-s*.2,s*.13,red,'#c89a7a');x.strokeStyle='#815f58';x.lineWidth=3;for(const i of[-1,1]){x.beginPath();x.moveTo(px,py-s*.65);x.lineTo(px+i*s*.33,py-s*.37);x.stroke();x.fillStyle='#9f6252';ell(px+i*s*.28,py-s*.37,s*.15,s*.045,-i*.3);x.fill()}glow(px,py-s*.28,s*.27,'rgba(135,188,211,A)',b.off?.1:.32);
 }else if(k==='ene'){for(const i of[-1,1]){x.save();x.translate(px+i*s*.2,py-s*.4);x.rotate(i*.17);x.fillStyle=LG(-s*.19,0,s*.19,0,[[0,'#4e3150'],[1,'#2a243e']]);x.fillRect(-s*.19,-s*.16,s*.38,s*.29);x.strokeStyle='#c48465';x.lineWidth=2;x.strokeRect(-s*.19,-s*.16,s*.38,s*.29);
   x.strokeStyle='#736082';x.lineWidth=1;for(let j=0;j<4;j++){x.beginPath();x.moveTo(-s*.16+j*s*.09,-s*.15);x.lineTo(-s*.16+j*s*.09,s*.12);x.stroke()}x.fillStyle='#141421';x.beginPath();x.moveTo(-s*.09,-s*.1);x.lineTo(s*.05,-s*.13);x.lineTo(s*.08,-s*.01);x.lineTo(-s*.02,s*.06);x.closePath();x.fill();x.restore()}
 }else if(k==='tur'){cyl(px,py-s*.48,py-s*.15,s*.13,red,'#c4866a');x.fillStyle=LG(0,py-s*.61,0,py-s*.36,[[0,'#c88c73'],[1,'#69383a']]);rr(px-s*.19,py-s*.62,s*.38,s*.25,s*.045);x.fill();x.save();x.translate(px,py-s*.5);x.rotate(b.aim||-.5);x.fillStyle='#402832';x.fillRect(s*.09,-s*.047,s*.44,s*.095);x.fillStyle='#be8d78';x.fillRect(s*.41,-s*.065,s*.06,s*.13);x.restore();}
 const rng=MB(b.c*991+b.r*17);x.save();x.beginPath();x.rect(px-s*.42,py-s*.71,s*.84,s*.56);x.clip();
 for(let i=0;i<18;i++){const xx=px+(rng()-.5)*s*.77,yy=py-s*(.16+rng()*.54);x.fillStyle=i%3?'rgba(33,15,24,.45)':'rgba(207,125,70,.4)';ell(xx,yy,s*(.006+rng()*.02),s*(.003+rng()*.016));x.fill()}
 x.strokeStyle='rgba(24,13,23,.65)';x.lineWidth=1.5;for(let i=0;i<3;i++){const xx=px+(rng()-.5)*s*.64,yy=py-s*(.25+rng()*.35);x.beginPath();x.moveTo(xx,yy);x.lineTo(xx+s*.06,yy+s*.05);x.lineTo(xx+s*.03,yy+s*.12);x.stroke()}
 x.restore();
 for(const i of[-1,1])bolt(px+i*s*.33,py-s*.17,s*.02);
 if(!b.off){glow(px,py-s*.3,s*.38,'rgba(255,112,60,A)',.25+.08*Math.sin(tm*3+b.ph));if(NT.night())NT.lit(px,py-s*.4,s, .65);x.fillStyle='#ff9171';ell(px-s*.29,py-s*.19,s*.024,s*.024);x.fill()}
 if(b.k==='raf'||b.k==='fab'){for(let i=0;i<3;i++){const f=(tm*.4+i/3)%1;x.fillStyle='rgba(70,55,65,'+(.25*(1-f))+')';ell(px+s*.25+f*s*.11,py-s*.85-f*s*.3,s*(.025+.05*f),s*(.03+.06*f));x.fill()}}
 if(b.flash>0){x.globalCompositeOperation='lighter';glow(px,py-s*.4,s*.6,'rgba(255,200,170,A)',b.flash*.6)}
 x.restore();
}
