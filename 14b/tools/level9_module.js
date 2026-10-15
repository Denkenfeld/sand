
/* ===== LEVEL 9: exploration, radar, research and selectable side quests ===== */
const N9=(()=>{
 let poi=[],wagon=null,scanT=0,victory=false,journalOpen=false,dirty=false,tradeT=0;
 const count=()=>poi.filter(p=>p.done).length;
 const powered=k=>Object.values(bl).filter(b=>b.k===k&&b.bp>=1&&isOn(b)&&!b.up);
 const tech=()=>{try{return JSON.parse(localStorage.getItem('dtCampaignTech')||'{}')}catch(e){return{}}};
 function unlock(k){const t=tech();t[k]=true;try{localStorage.setItem('dtCampaignTech',JSON.stringify(t))}catch(e){}}
 function button(){let b=$('tquests');if(!b){b=document.createElement('button');b.id='tquests';b.type='button';b.setAttribute('aria-label','Questjournal');b.title='Questjournal';b.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect x="7" y="5" width="18" height="23" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11h9m-9 6h9m-9 6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
   $('tools').insertBefore(b,$('tmode'));b.onclick=()=>open();const s=document.createElement('style');s.textContent='#tquests{color:#a6eaff}#tquests.on{border-color:#93e9ff;box-shadow:0 0 10px #55bddd55}.q9{margin:8px 0;padding:10px;border:1px solid #82ceeb44;border-radius:12px;background:#10182ddd}.q9 h4{margin:0 0 5px;color:#ffe4a9}.q9 p{margin:4px 0;font-size:12px;line-height:1.4}.q9 small{font-size:11px;color:#a6eaff}.q9 button{width:100%;margin-top:6px;padding:8px;min-height:34px}.q9.done{border-color:#8cffb766}.q9.done h4{color:#a3ffc0}#S.q9-journal{height:min(68vh,580px);max-height:calc(100dvh - 100px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}body.side #S.q9-journal{height:auto;max-height:none}';document.head.appendChild(s)}
  b.style.display=L.explore?'flex':'none';b.classList.toggle('on',journalOpen)
 }
 function init(){poi=[];wagon=null;scanT=0;victory=false;journalOpen=false;dirty=false;tradeT=0;button();if(!L.explore)return;
  gen(19);
  poi=[{id:'rescue',name:'Gestrandeter Konvoi',c:1,r:6,known:false,done:false,progress:0,reward:'100 Geld + Rettungsnetz für spätere Gebiete'},
       {id:'relic',name:'Flüsterndes Relikt',c:5,r:10,known:false,done:false,progress:0,working:false,reward:'80 Geld + Schildtheorie für spätere Forschung'},
       {id:'village',name:'Siedlung am Salzpfad',c:2,r:14,known:false,done:false,progress:0,reward:'140 Geld + Handelskontakt für spätere Gebiete'}];
  for(const p of poi){p.x=p.c+.5;p.y=p.r+.4;const t=tw(p.c,p.r);t.t=0;t.v=1;t.qs=0;t.cr=0;t.ck=''}
 }
 function occupied(c,r){return L.explore&&poi.some(p=>p.c===c&&p.r===r)}
 function discover(p){if(p.known)return;p.known=true;dirty=true;toast('Radar: '+p.name+' entdeckt! Öffne das Questjournal.',1);ft(p.x,p.y+.8,'SIGNAL ENTDECKT','#9cecff');snd('pulse',p.x);
  if(p.id!=='relic')for(let i=0;i<(p.id==='village'?3:2);i++){const e=mkE(i===2?'pz':'pl');e.x=clamp(p.x+(i-1)*.7,.3,6.7);e.y=p.y+1.5+i*.22;e.questGuard=p.id;en.push(e)}
 }
 function scan(){for(const b of powered('radar')){const R=4.5+1.2*b.lv;
   for(const p of poi)if(Math.hypot(p.x-(b.c+.5),p.y-(b.r+.5))<=R)discover(p);
   for(let r=Math.max(0,Math.floor(b.r-R));r<=Math.min(G.length-1,Math.ceil(b.r+R));r++)for(const t of G[r])if(t.s===0&&Math.hypot(t.c+.5-(b.c+.5),t.r+.5-(b.r+.5))<=R){t.s=1;t.ck=''}
  }}
 function complete(p){if(p.done)return;p.done=true;p.progress=1;dirty=true;const value=p.id==='rescue'?100:p.id==='relic'?80:140;payIn(value);
  unlock(p.id==='rescue'?'rescueNetwork':p.id==='relic'?'shieldTheory':'saltTrade');toast('✓ '+p.name+' abgeschlossen! '+value+' Geld',1);snd('win',p.x);burst(p.x,p.y,18,'#9cffe2');
  if(count()>=2&&!victory){victory=true;journalOpen=false;UI.sheet('');sel=null;end(1)}
 }
 function guards(p){return en.some(e=>e.hp>0&&e.questGuard===p.id&&Math.hypot(e.x-p.x,e.y-p.y)<4)}
 function action(id){const p=poi.find(q=>q.id===id);if(!p||!p.known||p.done)return;
  if(id==='rescue'){toast('Schicke Krieger oder Crawler per Angriffsknopf zum Konvoi. Sichere die Umgebung.',1);return}
  if(id==='relic'){
   if(p.working)return;if(!powered('lab').length){toast('Baue und versorge eine Forschungsstation (2 Strom, 1 Wasser).');return}
   if(sp<100){toast('Forschung benötigt 100 Geld.');return}sp-=100;p.working=true;dirty=true;toast('Reliktforschung gestartet – Versorgung aufrechterhalten.',1);
  }else{
   if(wagon){toast('Eine Versorgungslieferung ist bereits unterwegs.');return}
   if(!bl[3]||bl[3].hp<=0)return;if(sp<60){toast('Die Lieferung kostet 60 Geld.');return}
   sp-=60;wagon={k:'cargo',x:3.5,y:1.2,hp:90,mx:90,ph:0,tr:0,mv:false,target:p,wait:0};dirty=true;toast('Versorgungskonvoi unterwegs! Schicke eine Eskorte mit dem Angriffsknopf.',1);
  }
  if(journalOpen)open()
 }
 function move(w,dt){const p=w.target;if(Math.hypot(w.x-p.x,w.y-p.y)<.7){complete(p);wagon=null;return}
  w.pathT=(w.pathT||0)-dt;if(w.pathT<=0||w.pathVersion!==bver){w.path=navPath(w.x,w.y,p.x,p.y);w.pathT=.7;w.pathVersion=bver}const path=w.path;if(path)while(path.length&&Math.hypot(path[0][0]-w.x,path[0][1]-w.y)<.12)path.shift();if(path===null){w.mv=false;w.wait+=dt;if(w.wait>10){toast('Konvoi wartet: Route durch das Gelände freigraben.');w.wait=0}return}
  const q=path.length?path[0]:[p.x,p.y],dx=q[0]-w.x,dy=q[1]-w.y,d=Math.hypot(dx,dy)||1e-6,v=Math.min(d,.8*dt);
  const nx=w.x+dx/d*v,ny=w.y+dy/d*v;if(blk(Math.floor(nx),Math.floor(ny))){w.mv=false;return}w.x=nx;w.y=ny;w.face=dx>=0?1:-1;w.mv=true;w.tr+=v;w.ph+=v*8;
 }
 function tick(dt){if(!L.explore||phase!=='play')return;scanT-=dt;if(scanT<=0){scanT=2;scan()}
  for(const p of poi){if(!p.known||p.done)continue;
   if(p.id==='rescue'){const friendly=un.some(u=>u.hp>0&&u.k!=='sam'&&Math.hypot(u.x-p.x,u.y-p.y)<2);if(friendly&&!guards(p)){p.progress=Math.min(1,p.progress+dt/3);if(p.progress>=1)complete(p)}}
   if(p.id==='relic'&&p.working&&powered('lab').length){const best=Math.max(...powered('lab').map(b=>1+.2*b.lv));p.progress=Math.min(1,p.progress+dt*best/18);if(p.progress>=1)complete(p)}
  }
  if(wagon){if(wagon.hp<=0){fxAdd({ty:'wreck',x:wagon.x,y:wagon.y,k:'sam',face:1,l:3,s:.6});fxAdd({ty:'boom',x:wagon.x,y:wagon.y,z:.25,l:.45,r:.5});toast('Versorgungskonvoi zerstört. Im Journal kannst du eine neue Lieferung senden.');wagon=null;dirty=true}else move(wagon,dt)}
  if(journalOpen&&dirty&&!victory){dirty=false;open()}else if(journalOpen){for(const p of poi){const el=$('S').querySelector('[data-q9-status="'+p.id+'"]');if(el)el.textContent=label(p)}}
 }
 function label(p){if(!p.known)return 'Unbekanntes Signal · Radar erforderlich';if(p.done)return 'Abgeschlossen';
  if(p.id==='rescue')return guards(p)?'Plünderer sichern die Umgebung':'Kampfeinheit zum Konvoi schicken';
  if(p.id==='relic')return p.working?'Forschung '+Math.round(p.progress*100)+' %'+(powered('lab').length?'':' · Versorgung fehlt'):'Forschungsstation bauen, dann untersuchen';
  return wagon?'Konvoi unterwegs · '+Math.ceil(wagon.hp)+' HP':'Versorgungslieferung senden'}
 function open(){if(!L.explore)return;City.cancel();mode=0;UI.setMode();journalOpen=true;UI.sheet('');sel=null;let h='<div style="display:flex;align-items:center;justify-content:space-between"><h3>Das Flüstern · Aufträge '+count()+'/2</h3><button data-q9="close" style="padding:4px 10px;min-height:30px">×</button></div><p style="font-size:12px">Zwei von drei Aufträgen reichen zum Sieg. Verbundene Radarstationen finden Signale im Umkreis.</p>';
  for(const p of poi){h+='<section class="q9'+(p.done?' done':'')+'"><h4>'+ (p.known?p.name:'Unbekanntes Signal')+'</h4><p data-q9-status="'+p.id+'">'+label(p)+'</p><small>Richtung Reihe '+p.r+' · '+(p.known?p.reward:'Erkunde dieses Gebiet mit Radar.')+'</small>';
   if(p.known&&!p.done)h+='<button data-q9="'+p.id+'">'+(p.id==='rescue'?'Rettung erklären':p.id==='relic'?(p.working?'Forschung läuft …':'Relikt untersuchen · 100 Geld'):'Lieferung senden · 60 Geld')+'</button>';
   h+='</section>'}UI.sheet(h);$('S').classList.add('q9-journal');button()
 }
 function inspect(c,r){if(!L.explore)return false;const p=poi.find(p=>p.c===c&&p.r===r&&p.known);if(!p)return false;open();return true}
 function hud(){button();if(!L.explore)return;if(journalOpen&&!$('S').classList.contains('q9-journal'))journalOpen=false;
  $('barf').style.width=(count()/2*100)+'%';$('bart').textContent='Das Flüstern · '+count()+'/2 Aufträge · '+poi.filter(p=>p.known).length+'/3 Signale gefunden';
 }
 function draw(){if(!L.explore)return;for(const p of poi){if(!p.known)continue;const px=SX(p.x),py=SY(p.y),s=T;
   x.save();x.strokeStyle=p.done?'#9bffc5':'rgba(110,225,255,.8)';x.lineWidth=1.5;x.setLineDash([4,5]);x.lineDashOffset=-tm*9;ell(px,py,s*.45,s*.16);x.stroke();x.setLineDash([]);
   if(p.id==='rescue'){vehicle('sam',px-s*.1,py,s*.55,{mv:false,f:1,fill:.5});x.fillStyle='#73533a';rr(px+s*.1,py-s*.18,s*.25,s*.18,s*.02);x.fill()}
   else if(p.id==='relic'){x.fillStyle='#282b40';ell(px,py-s*.17,s*.26,s*.18);x.fill();crystal(px,py-s*.3,s*.13,()=>.5,[44,80,129],[171,252,255],'rgba(100,220,255,.5)');x.strokeStyle='#b6edff';x.lineWidth=1.5;ell(px,py-s*.3,s*.2,s*.07);x.stroke()}
   else{prism(px-s*.15,py,s*.43,s*.27,['#c59873','#775a49'],'#4b3843','#dbb48a',.04,.03);prism(px+s*.2,py-s*.05,s*.3,s*.38,['#9a8da1','#554c67'],'#332f43','#c3b3cc',.04,.03);x.fillStyle='#082238';x.fillRect(px-s*.25,py-s*.2,s*.1,s*.06);x.strokeStyle='#97dbff';x.lineWidth=1.5;x.beginPath();x.moveTo(px+s*.22,py-s*.44);x.lineTo(px+s*.2,py-s*.7);x.stroke()}
   glow(px,py-s*.3,s*.4,'rgba(100,210,255,A)',p.done?.13:.28);NT.lit(px,py-s*.3,s*1.2,.8);x.restore();
  }
  if(wagon){const px=SX(wagon.x),py=SY(wagon.y);vehicle('sam',px,py,T*.55,{tr:wagon.tr,mv:wagon.mv,fill:1,f:wagon.face||1});NT.lit(px,py-T*.2,T,.8);if(wagon.hp<wagon.mx)hpBar(px,py-T*.65,T*.6,wagon.hp/wagon.mx,false)}
 }
 function listeners(){const s=$('S');s.addEventListener('click',e=>{const b=e.target.closest('[data-q9]');if(!b)return;e.stopPropagation();const id=b.dataset.q9;if(id==='close'){journalOpen=false;UI.sheet('');button()}else action(id)})}
 listeners();
 return{init,tick,draw,inspect,hud,occupied,powered,scan,action,open,complete,count,get wagon(){return wagon},get points(){return poi}};
})();
SPR.radar=function(px,py,s,b){const on=!b||isOn(b);l6base(px,py,s,.75);cyl(px,py-s*.57,py-s*.14,s*.055,STEEL);x.save();x.translate(px,py-s*.67);x.rotate((on?tm*.6:0)+(b?b.ph:0));
 x.fillStyle=LG(-s*.27,0,s*.27,0,[[0,'#afb9c9'],[.5,'#edf5ff'],[1,'#5c728b']]);ell(0,0,s*.28,s*.1,-.4);x.fill();x.strokeStyle='#314459';x.lineWidth=1.4;x.stroke();x.strokeStyle='#e8b047';x.lineWidth=2;x.beginPath();x.moveTo(-s*.2,0);x.lineTo(s*.28,-s*.07);x.stroke();x.restore();
 glow(px,py-s*.5,s*.4,'rgba(100,220,255,A)',on?.25:.08);for(let i=0;i<3;i++){x.fillStyle=on?'#91f1ff':'#38556b';x.fillRect(px-s*.24+i*s*.12,py-s*.15,s*.04,s*.035)}
 NT.lit(px,py-s*.4,s,.6)};
SPR.lab=function(px,py,s,b){const on=!b||isOn(b);l6base(px,py,s,.88);prism(px,py-s*.14,s*.75,s*.34,['#78879c','#364963'],'#25324a','#bfcee3',.07,.055);
 x.fillStyle=LG(0,py-s*.67,0,py-s*.4,[[0,'rgba(151,230,255,.75)'],[1,'rgba(22,70,115,.8)']]);x.beginPath();x.ellipse(px,py-s*.47,s*.28,s*.23,0,Math.PI,0);x.fill();x.strokeStyle='#c9e3ff';x.lineWidth=1.2;x.stroke();
 crystal(px,py-s*.42,s*.07,()=>.5,[35,95,160],[200,250,255],on?'rgba(120,220,255,.4)':null);
 for(let i=0;i<3;i++){x.fillStyle='#152638';rr(px-s*.25+i*s*.19,py-s*.26,s*.12,s*.07,s*.01);x.fill();x.fillStyle=on?'#7cddff':'#32536c';x.fillRect(px-s*.24+i*s*.19,py-s*.25,s*.1,s*.025)}
 x.save();x.translate(px+s*.28,py-s*.49);x.rotate(on?tm*2:0);x.strokeStyle='#e2bd58';x.lineWidth=1.7;x.beginPath();x.moveTo(-s*.06,0);x.lineTo(s*.06,0);x.moveTo(0,-s*.06);x.lineTo(0,s*.06);x.stroke();x.restore();glow(px,py-s*.43,s*.45,'rgba(100,200,255,A)',on?.25:.06);NT.lit(px,py-s*.4,s,.65)};
