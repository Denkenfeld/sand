
/* ===== LEVEL 10: launch preparation, storage, shields, priority repair, in-world finale ===== */
const N10=(()=>{
 let relays=[],prepared=false,prep=0,defending=false,defT=0,waves=0,defDone=false,launchT=-1,portRef=null,particles=[],frameCam=0;
 let journal=false,lastCountdown=99,win=false;
 const enabled=()=>!!(L&&L.launchMission);
 const live=b=>b&&bl[K(b.c,b.r)]===b&&b.hp>0&&b.bp>=1;
 const connected=b=>live(b)&&isLive(b);
 const online=b=>connected(b)&&!b.off;
 const list=k=>Object.values(bl).filter(b=>b.k===k&&live(b));
 const cap=b=>120+60*(b.lv||0);
 const shieldCap=b=>70+35*(b.lv||0);
 const radius=b=>2.7+.6*(b.lv||0);
 function reserve(){return list('battery').filter(connected).reduce((a,b)=>a+(b.energy||0),0)}
 function port(){return list('spaceport').find(online)||null}
 function activeRelays(){return relays.filter(p=>{const b=bl[K(p.c,p.r)];return b&&b.k==='relay'&&online(b)&&(b.calib||0)>=10}).length}
 function init(){relays=[];prepared=false;prep=0;defending=false;defT=0;waves=0;defDone=false;launchT=-1;portRef=null;particles=[];journal=false;win=false;lastCountdown=99;
  if(!enabled()){const q=$('tquests');if(q&&L.explore)q.onclick=()=>N9.open();return}gen(19);
  relays=[{id:0,c:1,r:4},{id:1,c:5,r:7},{id:2,c:1,r:9}];for(const p of relays){const t=tw(p.c,p.r);t.t=0;t.qs=0;t.v=1;t.ck=''}
  const h=$('S');if(!h.dataset.launchBound){h.dataset.launchBound='1';h.addEventListener('click',e=>{const b=e.target.closest('[data-l10]');if(!b||!enabled())return;e.stopPropagation();action(b.dataset.l10)})}
  const st=document.createElement('style');st.textContent='#S.l10-journal{height:min(72vh,640px);max-height:calc(100dvh - 100px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}body.side #S.l10-journal{height:auto;max-height:none}.l10-row{padding:9px;margin:6px 0;border:1px solid #8ecfff44;border-radius:11px;background:#111b30cc;font-size:12px;line-height:1.4}.l10-row strong{color:#ffe1a2}.l10-row button{display:block;width:100%;margin-top:6px;min-height:34px;padding:7px}';document.head.appendChild(st);
 }
 function occupied(c,r){return enabled()&&relays.some(p=>p.c===c&&p.r===r)}
 function power(){if(!enabled())return;const all=Object.values(bl).filter(b=>live(b)&&NET.has(K(b.c,b.r))),bs=all.filter(b=>b.k==='battery');
  for(const b of bs)b.out=0;
  let raw=0;for(const b of all)if(b.k!=='battery'){const v=resP(b);if(v<=0||!b.off)raw+=v}
  let need=Math.max(0,-raw);for(const b of bs){if((b.energy||0)>.25&&need>0){b.out=Math.min(4,need,(b.energy||0)/.1);need-=b.out}}
 }
 function storage(dt){const bs=list('battery').filter(connected);let raw=0;for(const b of Object.values(bl))if(live(b)&&NET.has(K(b.c,b.r))&&b.k!=='battery'){const v=resP(b);if(v<=0||!b.off)raw+=v}
  let surplus=Math.max(0,raw);for(const b of bs){b.energy=Math.max(0,Math.min(cap(b),(b.energy||0)-(b.out||0)*dt));if(!b.out&&surplus>0){const n=Math.min(3,surplus,(cap(b)-b.energy)/dt);b.energy+=n*dt;surplus-=n}}
  for(const b of list('shield')){b.shieldEnergy=Math.max(0,Math.min(shieldCap(b),b.shieldEnergy||0));if(online(b))b.shieldEnergy=Math.min(shieldCap(b),b.shieldEnergy+dt*(4+2*b.lv))}
 }
 function absorb(o,m){if(!enabled()||m<=0||o.city)return m;
  const friendly=o.c!=null?bl[K(o.c,o.r)]===o:un.includes(o)||wk.includes(o)||o===N9.wagon;if(!friendly)return m;
  let best=null,dist=Infinity;for(const b of list('shield'))if(online(b)&&(b.shieldEnergy||0)>0){const d=Math.hypot(pxo(o)-(b.c+.5),pyo(o)-(b.r+.5));if(d<=radius(b)&&d<dist){best=b;dist=d}}
  if(!best)return m;const n=Math.min(m,best.shieldEnergy);best.shieldEnergy-=n;best.shieldFlash=.6;fxAdd({ty:'ring',x:pxo(o),y:pyo(o),r:.55,l:.35,c:'110,210,255'});return m-n;
 }
 function priority(b){if(!enabled()||!live(b))return;b.repairPriority=!b.repairPriority;
  if(b.repairPriority){for(const w of wk)if(w.j&&w.j.type!=='rep')w.j=null;toast('Reparatur priorisiert: '+BL[b.k],1)}else toast('Normale Reparaturpriorität');UI.openInfo(b,true)
 }
 function priorityJob(){if(!enabled())return null;const b=Object.values(bl).filter(b=>live(b)&&b.repairPriority&&b.hp<b.mx&&(b.rw||0)<1).sort((a,b)=>a.hp/a.mx-b.hp/b.mx)[0];return b?{type:'rep',obj:b,slot:0}:null}
 function ready(){return !!port()&&reserve()>=60&&list('shield').some(b=>online(b)&&(b.shieldEnergy||0)>=15)&&activeRelays()===3&&City.state.cleared}
 function canLaunch(){return ready()&&prepared&&prep>=25&&defDone&&portRef===port()}
 function cityComplete(){toast('Festung zerstört. Sichere jetzt den Raketenstart!',1)}
 function open(){if(!enabled()||launchT>=0)return;City.cancel();mode=0;UI.setMode();UI.sheet('');sel=null;journal=true;
  let h='<div style="display:flex;justify-content:space-between;align-items:center"><h3>Mission: Planetenerkundung</h3><button data-l10="close" style="min-height:30px;padding:4px 10px">×</button></div><p style="font-size:12px">Baue und versorge die Raketenbasis, aktiviere drei Steuerpunkte und sichere den Start.</p>';
  const row=(label,status,button)=>'<div class="l10-row"><strong>'+label+'</strong><div data-l10-status="'+status+'">'+statusText(status)+'</div>'+(button||'')+'</div>';
  h+=row('1 · Raumflughafen errichten','port');h+=row('2 · Energiespeicher laden','energy');h+=row('3 · Schildschutz aufbauen','shield');
  for(const p of relays)h+=row('4 · Steuerpunkt '+(p.id+1)+' / Reihe '+p.r,'relay'+p.id,'<button data-l10="relay'+p.id+'">Aktivieren · 40 Geld</button>');
  h+=row('5 · Gegnerfestung zerstören','city');
  h+=row('6 · Rakete betanken und kalibrieren','prep','<button data-l10="prepare">Vorbereitung starten · 100 Geld</button>');
  h+=row('7 · Letzten Angriff abwehren','defense');
  h+='<button class="pri" data-l10="launch" style="width:100%;padding:12px">RAKETENSTART FREIGEBEN</button><p style="font-size:11px">Start erst möglich, wenn alle Punkte erfüllt sind. Arbeiter können beschädigte Gebäude bevorzugt reparieren.</p>';
  UI.sheet(h);$('S').classList.add('l10-journal');ui()
 }
 function statusText(k){if(k==='port')return port()?'✓ Raumflughafen verbunden und versorgt':'Baue Raumflughafen: 140 Geld, 4 Strom, 2 Wasser';
  if(k==='energy')return Math.floor(reserve())+' / 60 Energie in verbundenen Speichern';
  if(k==='shield'){const b=list('shield').filter(online);return b.length?'✓ '+b.length+' Schildgenerator(en) aktiv':'Baue und versorge einen Schildgenerator (3 Strom, 1 Wasser)'}
  if(k==='city')return City.state.cleared?'✓ Festung zerstört':City.seen?City.remaining()+' Hauptgebäude übrig':'Festung in Reihen 10–15 finden';
  if(k==='prep')return !prepared?'Erst Infrastruktur und Aktivierung fertigstellen':Math.floor(Math.min(25,prep))+' / 25 Sekunden · '+(ready()?'versorgt':'pausiert – Voraussetzungen prüfen');
  if(k==='defense')return defDone?'✓ Letzter Angriff abgewehrt':defending?Math.floor(defT)+' / 45 Sekunden · Feinde '+en.filter(e=>e.hp>0).length:'Beginnt nach vollständiger Startvorbereitung';
  const p=relays[+k.replace('relay','')],b=p&&bl[K(p.c,p.r)];return b&&b.k==='relay'?((b.calib||0)>=10&&online(b)?'✓ Aktiv':Math.floor(b.calib||0)+' / 10 Sekunden · '+(online(b)?'Kalibrierung':'Strom oder Verbindung fehlt')):'Feld freigraben und per Band ans Quartier anschließen'}
 function action(k){if(k==='close'){journal=false;UI.sheet('');ui();return}
  if(k.startsWith('relay')){const p=relays[+k.slice(5)];if(!p)return;const t=tw(p.c,p.r),b=bl[K(p.c,p.r)];if(b){toast('Steuerpunkt steht schon. Er braucht 2 Strom und eine Verbindung.');return}
   if(!t||t.s!==2||!adj(p.c,p.r,false)){toast('Steuerfeld erst freigraben und mit dem Quartier verbinden.');return}if(sp<40){toast('40 Geld für den Steuerpunkt nötig.');return}
   sp-=40;bl[K(p.c,p.r)]=mkB('relay',p.c,p.r,1);bver++;calcNet();toast('Steuerpunkt '+(p.id+1)+' kalibriert. Stromversorgung halten.',1);
  }else if(k==='prepare'){if(prepared){toast('Vorbereitung läuft bereits.');return}if(!ready()){toast('Erst Raumflughafen, 60 Speicherenergie, Schild, drei Steuerpunkte und Festung abschließen.');return}if(sp<100){toast('100 Geld für die Startvorbereitung nötig.');return}
   sp-=100;prepared=true;portRef=port();prep=0;toast('Rakete wird betankt und kalibriert. Versorgung aufrechterhalten.',1);
  }else if(k==='launch'){if(!canLaunch()){toast('Start noch nicht freigegeben – prüfe das Journal.');return}beginLaunch()}
  if(journal&&launchT<0)open()
 }
 function ui(){if(!enabled())return;const b=$('tquests');if(b){b.style.display='flex';b.title='Startmission / Questjournal';b.onclick=()=>open();b.classList.toggle('on',journal)}
  if(journal&&!$('S').classList.contains('l10-journal'))journal=false;
 }
 function hud(){if(!enabled())return;ui();
  $('tools').style.display=launchT>=0||phase==='end'?'none':'flex';
  const score=(port()?1:0)+(reserve()>=60?1:0)+(list('shield').some(online)?1:0)+activeRelays()+(City.state.cleared?1:0)+(prep>=25?1:0)+(defDone?1:0);
  $('barf').style.width=(score/9*100)+'%';$('bart').textContent=launchT>=0?'RAKETENSTART · '+(launchT<3?'Countdown':launchT<6?'Zündung':'Abflug'):'Startmission · '+score+'/9 bereit · Journal öffnen';
  if(journal)for(const k of['port','energy','shield','relay0','relay1','relay2','city','prep','defense']){const d=$('S').querySelector('[data-l10-status="'+k+'"]');if(d)d.textContent=statusText(k)}
 }
 function defenceWave(wave){const spec=scaleW([wave],DFc)[0]||[];for(const[k,n]of spec)for(let i=0;i<n;i++){const e=mkE(k);e.x=.5+rnd()*6;e.y=Math.max(4,(portRef?portRef.r:0)+4)+rnd()*1.5;en.push(e)}toast('⚠ Angriff auf die Startbasis!',false);snd('horn')}
 function tick(dt){if(!enabled())return;
  if(launchT>=0){launchT+=dt;flightTick(dt);if(launchT>=14&&!win){win=true;saveArrival();end(1)}return}
  if(phase!=='play')return;storage(dt);
  for(const p of relays){const b=bl[K(p.c,p.r)];if(b&&b.k==='relay'&&online(b))b.calib=Math.min(10,(b.calib||0)+dt)}
  for(const b of list('shield'))b.shieldFlash=Math.max(0,(b.shieldFlash||0)-dt*2);
  if(prepared&&!live(portRef)){prepared=false;prep=0;defending=false;defDone=false;waves=0;defT=0;toast('Raumflughafen zerstört. Neu aufbauen und vorbereiten.');return}
  if(prepared&&prep<25&&ready())prep=Math.min(25,prep+dt);
  if(prep>=25&&!defending&&!defDone){defending=true;defT=0;waves=0;toast('Rakete bereit – halte den letzten Angriff auf!',1)}
  if(defending){defT+=dt;const times=[0,13,27],specs=[ [['pl',5],['drn',1]], [['pz',3],['ali',3]], [['pz',2],['drn',2],['br',1]] ];
   while(waves<3&&defT>=times[waves]){defenceWave(specs[waves]);waves++}
   if(defT>=45&&!en.some(e=>e.hp>0)){defending=false;defDone=true;toast('✓ Startgebiet gesichert. Raketenstart im Journal freigeben!',1);snd('win')}
  }
 }
 function beginLaunch(){let drain=40;for(const b of list('battery').filter(connected)){const n=Math.min(drain,b.energy||0);b.energy-=n;drain-=n;if(drain<=0)break}
  launchT=0;particles=[];journal=false;UI.sheet('');sel=null;mode=0;City.cancel();phase='launch';LT=[];en=[];off=0;
  frameCam=portRef.r+.3-(BY-VH*.76)/T;camS=frameCam;toast('STARTFREIGABE · 3',1);snd('charge',portRef.c+.5);hud()
 }
 function saveArrival(){const data={version:1,ready:true,fromLevel:10,planet:'Khaldun',region:'unknown-sector',spawn:'rocket-landing',departure:{c:portRef.c,r:portRef.r},at:Date.now()};try{localStorage.setItem('dtRocketArrival',JSON.stringify(data))}catch(e){}}
 function flightTick(dt){
  const c=3-Math.floor(launchT);if(c!==lastCountdown&&c>0){lastCountdown=c;toast('STARTFREIGABE · '+c,1);snd('tick',portRef.c+.5)}
  if(launchT>=3&&lastCountdown>0){lastCountdown=0;snd('strike',portRef.c+.5);toast('ZÜNDUNG',1)}
  if(launchT>3&&launchT<10){const per=Math.ceil(dt*70);for(let i=0;i<per;i++)particles.push({x:(rnd()-.5)*T*.7,y:(rnd()-.5)*T*.08,vx:(rnd()-.5)*T*(1+launchT*.1),vy:-T*(.15+rnd()*.4),age:0,life:2+rnd()*2,r:T*(.15+rnd()*.2)});if(particles.length>300)particles.splice(0,particles.length-300)}
  for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*T*.09}particles=particles.filter(p=>p.age<p.life);
 }
 function rocket(px,py,s,lift,fire){
  x.save();x.translate(px,py-lift);if(fire){x.globalCompositeOperation='lighter';const f=.9+.1*Math.sin(tm*37);glow(0,s*.1,s*1.6,'rgba(255,166,60,A)',.6);
   x.fillStyle='rgba(255,94,15,.8)';x.beginPath();x.moveTo(-s*.12,s*.03);x.lineTo(s*.15,s*.03);x.quadraticCurveTo(s*.21,s*.7,s*.02,s*(1.8*f));x.quadraticCurveTo(-s*.16,s*.65,-s*.12,s*.03);x.fill();x.fillStyle='#fff0b3';x.beginPath();x.moveTo(-s*.07,s*.01);x.lineTo(s*.07,s*.01);x.lineTo(0,s*1.05*f);x.fill();x.globalCompositeOperation='source-over'}
  x.fillStyle=LG(-s*.13,0,s*.13,0,[[0,'#818fa5'],[.38,'#f5f4e9'],[.7,'#cddce8'],[1,'#3b536e']]);rr(-s*.13,-s*.75,s*.26,s*.73,s*.06);x.fill();
  x.fillStyle=LG(-s*.13,0,s*.13,0,[[0,'#c88651'],[.5,'#f2d29c'],[1,'#785247']]);x.beginPath();x.moveTo(-s*.13,-s*.71);x.quadraticCurveTo(-s*.13,-s*.93,0,-s*1.12);x.quadraticCurveTo(s*.13,-s*.93,s*.13,-s*.71);x.closePath();x.fill();
  for(const sg of[-1,1]){x.fillStyle=sg<0?'#8fa7be':'#48617a';x.beginPath();x.moveTo(sg*s*.1,-s*.26);x.lineTo(sg*s*.29,s*.08);x.lineTo(sg*s*.12,s*.02);x.closePath();x.fill()}
  x.fillStyle='#174c74';ell(0,-s*.65,s*.065,s*.065);x.fill();x.strokeStyle='#e2f1ff';x.lineWidth=s*.012;x.stroke();x.fillStyle='#bf7b41';x.fillRect(-s*.13,-s*.43,s*.26,s*.05);x.fillStyle='#455369';x.fillRect(-s*.1,-s*.06,s*.2,s*.09);
  x.restore()
 }
 function shields(){if(!enabled())return;for(const b of list('shield').filter(online)){const cx=SX(b.c+.5),cy=SY(b.r+.5),R=radius(b)*T,a=(b.shieldEnergy||0)/shieldCap(b),flash=b.shieldFlash||0;if(a<=0)continue;
   x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,'rgba(70,150,255,'+(.035*a)+')');g.addColorStop(.85,'rgba(95,195,255,'+(.02*a)+')');g.addColorStop(1,'rgba(95,195,255,0)');x.fillStyle=g;x.fillRect(cx-R,cy-R,R*2,R*2);x.strokeStyle='rgba(130,216,255,'+(.1*a+flash*.6)+')';x.lineWidth=1.5;ell(cx,cy,R,R);x.stroke();x.restore()}}
 function points(){if(!enabled())return;for(const p of relays){if(tp<p.r-2)continue;const px=SX(p.c+.5),py=SY(p.r+.5);x.strokeStyle='rgba(140,220,255,.65)';x.lineWidth=1.5;x.setLineDash([4,5]);ell(px,py,T*.3,T*.16);x.stroke();x.setLineDash([]);NT.lit(px,py,T*.7,.55)}}
 function drawFlight(){if(launchT<0||!portRef)return;x.save();x.setTransform(DPR,0,0,DPR,OX*DPR,0);x.beginPath();x.rect(0,0,GW,VH);x.clip();
  const px=SX(portRef.c+.5),py=SY(portRef.r+.3),fire=launchT>3,t=Math.max(0,launchT-5),lift=t*t*T*.38;
  if(fire){x.save();x.globalCompositeOperation='lighter';glow(px,py,T*(2+Math.min(t,2)),'rgba(255,184,82,A)',Math.max(0,.65-t*.08));x.restore()}
  for(const p of particles){const a=Math.sin(Math.min(1,p.age/p.life)*Math.PI)*.55;x.fillStyle='rgba(211,201,184,'+a+')';ell(px+p.x,py+p.y,p.r,p.r*.7);x.fill()}
  rocket(px+(fire&&t<2?Math.sin(tm*46)*T*.015:0),py,T*1.3,lift,fire);
  if(fire&&t<5){x.fillStyle='rgba(255,216,143,'+(.05+.03*Math.sin(tm*19))+')';x.fillRect(0,0,GW,VH)}
  x.textAlign='center';x.textBaseline='middle';x.font='800 21px system-ui';x.fillStyle='#fff2cc';x.shadowColor='#050816';x.shadowBlur=8;x.fillText(launchT<3?'START IN '+Math.max(1,3-Math.floor(launchT)):launchT<6?'TRIEBWERKE AKTIV':launchT<11?'PLANETENERKUNDUNG GESTARTET':'EIN NEUER HORIZONT',GW/2,VH*.18);x.restore()
 }
 function inspect(c,r){if(!enabled()||launchT>=0)return false;if(relays.some(p=>p.c===c&&p.r===r)){open();return true}return false}
 return{init,power,tick,absorb,priority,priorityJob,hud,open,action,occupied,inspect,cityComplete,points,shields,drawFlight,rocket,reserve,ready,canLaunch,
  get launching(){return launchT>=0&&!win},get cam(){return frameCam},get state(){return{relays,prepared,prep,defending,defT,waves,defDone,launchT,win,portRef}}};
})();
SPR.battery=function(px,py,s,b){l6base(px,py,s,.83);for(let i=0;i<3;i++){const cx=px+(i-1)*s*.22;cyl(cx,py-s*.61,py-s*.17,s*.09,['#455978','#c0d8ec','#6b95ba','#273e58'],'#b6d9f1');x.fillStyle='#11243a';x.fillRect(cx-s*.035,py-s*.52,s*.07,s*.28);const f=b?Math.min(1,(b.energy||0)/(120+60*b.lv)):.6;x.fillStyle='#81e7ff';x.fillRect(cx-s*.025,py-s*.25-s*.25*f,s*.05,s*.25*f);glow(cx,py-s*.4,s*.14,'rgba(90,215,255,A)',f*.35)}NT.lit(px,py-s*.4,s,.65)};
SPR.shield=function(px,py,s,b){l6base(px,py,s,.83);cyl(px,py-s*.62,py-s*.16,s*.07,STEEL);for(let i=0;i<3;i++){x.strokeStyle='#a5d7ed';x.lineWidth=2;x.beginPath();x.ellipse(px,py-s*(.33+i*.12),s*(.2+i*.025),s*.07,0,0,TAU);x.stroke()}x.fillStyle='#cffaff';ell(px,py-s*.74,s*.09,s*.11);x.fill();glow(px,py-s*.7,s*.45,'rgba(100,205,255,A)',b&&!b.off?.45:.1);NT.lit(px,py-s*.5,s,.6)};
SPR.relay=function(px,py,s,b){l6base(px,py,s,.65);cyl(px,py-s*.56,py-s*.14,s*.08,STEEL);const f=b?(b.calib||0)/10:1;x.strokeStyle=f>=1?'#8effc8':'#ffcc83';x.lineWidth=2;x.beginPath();x.ellipse(px,py-s*.55,s*.2,s*.06,0,0,TAU);x.stroke();crystal(px,py-s*.66,s*.07,()=>.5,[35,90,140],[190,255,255],'rgba(120,220,255,.3)');NT.lit(px,py-s*.4,s,.6)};
SPR.spaceport=function(px,py,s,b){l6base(px,py,s,.94);prism(px,py-s*.13,s*.84,s*.18,['#8996a7','#3b4b60'],'#25354b','#cad7e6',.04,.03);x.strokeStyle='#b5a37a';x.lineWidth=s*.04;x.beginPath();x.moveTo(px-s*.34,py-s*.26);x.lineTo(px-s*.34,py-s*1.04);x.lineTo(px-s*.18,py-s*1.04);x.stroke();
 for(let i=0;i<5;i++){x.strokeStyle='#58677d';x.lineWidth=s*.02;x.beginPath();x.moveTo(px-s*.4,py-s*(.3+i*.13));x.lineTo(px-s*.28,py-s*(.43+i*.13));x.stroke()}
 if(!(L.launchMission&&N10.state.launchT>=0))N10.rocket(px,py-s*.23,s*.78,0,false);x.fillStyle='#94e8ff';x.fillRect(px+s*.2,py-s*.24,s*.08,s*.03);NT.lit(px,py-s*.4,s*1.2,.8)};
