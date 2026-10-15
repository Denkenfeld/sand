
/* ===== LEVEL 6: actual production logistics, aliens, airborne laser drones ===== */
const L6=(()=>{
 const CYCLE=8,CAP=4,VALUE=20,PACKCAP=140;
 let nightDue=65,wasNight=false,lasers=[];
 const alive=b=>b&&bl[K(b.c,b.r)]===b&&b.hp>0;
 const amount=(b,k)=>b[k]||0;
 const active=b=>alive(b)&&b.bp>=1&&isOn(b)&&!b.up;
 const speed=b=>1+.15*(b.lv||0);
 const incoming=(b,kind)=>pk.reduce((a,q)=>a+(q.b===b&&q.kind===kind&&!q.cos?q.amt:0),0);
 function route(a,k,kind){let best=null,dist=Infinity;
  for(const b of Object.values(bl)){if(b.k!==k||!active(b))continue;const field=kind==='sand'?'sand':'crystals';if(amount(b,field)+incoming(b,kind)>=CAP+2*(b.lv||0))continue;
   const p=pathBetween(a,b);if(p&&p.length>1&&p.length<dist){best=b;dist=p.length}}
  return best}
 function send(a,b,kind){if(!b||pk.length>=PACKCAP)return false;return !!shipX(a,b,kind,1,null)}
 function production(dt){
  for(const b of Object.values(bl)){if(!active(b))continue;
   if(b.k==='bore'){
    if(!(tw(b.c,b.r)||{}).qs)continue;
    const out=amount(b,'sand');b.prod=amount(b,'prod');
    if(out<CAP+2*b.lv){b.prod+=dt*speed(b);if(b.prod>=CYCLE){b.prod-=CYCLE;b.sand=out+1;b.flash=.25}}
    if(amount(b,'sand')>0&&send(b,route(b,'smelt','sand'),'sand'))b.sand--;
   }else if(b.k==='smelt'){
    b.crystals=amount(b,'crystals');b.sand=amount(b,'sand');
    if(!b.batch&&b.sand>0&&b.crystals<CAP+2*b.lv){b.sand--;b.batch=true;b.prod=0}
    if(b.batch){b.prod+=dt*speed(b);if(b.prod>=7&&b.crystals<CAP+2*b.lv){b.batch=false;b.prod=0;b.crystals++;b.flash=.4}}
    if(b.crystals>0&&send(b,route(b,'crdep','crystals'),'crystals'))b.crystals--;
   }else if(b.k==='crdep'){
    b.crystals=amount(b,'crystals');b.exportCd=Math.max(0,amount(b,'exportCd')-dt);
    if(b.crystals>0&&b.exportCd<=0&&pk.length<PACKCAP&&active(bl[3])&&send(b,bl[3],'ecsale')){b.crystals--;b.exportCd=2/speed(b)}
   }
  }
 }
 function delivery(q,e){if(q.kind!=='sand'&&q.kind!=='crystals'&&q.kind!=='ecsale')return false;
  if(e!==q.b||!alive(e)||e.bp<1)return true;
  if(q.kind==='sand'&&e.k==='smelt')e.sand=amount(e,'sand')+q.amt;
  else if(q.kind==='crystals'&&e.k==='crdep')e.crystals=amount(e,'crystals')+q.amt;
  else if(q.kind==='ecsale'&&e.k==='hub'){payIn(VALUE*q.amt);fxSpark(e.c+.5,e.r+.5,.4,4,'#a4faff')}
  return true}
 function readySand(){if(!L.industry)return;const r=3,c=2,t=tw(c,r);if(t){t.s=1;t.t=6;t.v=0;t.ck='';t.cr=0;t.qs=0}}
 function reset(){nightDue=65;wasNight=false;lasers=[]}
 function night(dt){if(!L.aliens||phase!=='play')return;const n=NT.dark()>.65;
  if(n&&!wasNight){nightDue=8;toast('☾ Bewegung im Dunkeln – Aliens nähern sich!');snd('pulse',3.5)}wasNight=n;
  if(!n)return;nightDue-=dt;
  if(nightDue<=0){nightDue=55+rnd()*20;const count=en.filter(e=>e.k==='ali'||e.k==='drn').length;
   if(count<4){const a=mkE('ali');a.x=rnd()<.5?.4:6.6;a.y=Math.max(2,tp+.8);en.push(a);
    if(tp>=9&&count<3&&rnd()<.35)en.push(mkE('drn'));ft(a.x,a.y+1,'ALIEN','#9bffe4');snd('horn',a.x)}}
 }
 function tick(dt){lasers=lasers.filter(l=>{l.life-=dt;return l.life>0});night(dt)}
 function battleStart(){for(const b of Object.values(bl)){if(b.batch){b.batch=false;b.sand=amount(b,'sand')+1;b.prod=0}}lasers=[]}
 function laser(a,t,m){const ax=a.x,ay=a.y,tx=pxo(t),ty=pyo(t),col=a.k==='drn'?'255,74,170':'90,255,200';
  lasers.push({ax,ay,tx,ty,az:a.k==='drn'?.8:.55,life:.2,max:.2,col,battle:!!bt});a.as=gt;a.ad=.25;
  fxSpark(tx,ty,.35,5,a.k==='drn'?'#ff74bc':'#8fffdc');hurt(t,m,ax,a.k==='drn'?'#ff74bc':'#8fffdc');snd('pulse',ax)}
 function drawLaser(){x.save();x.setTransform(DPR,0,0,DPR,OX*DPR,0);x.globalCompositeOperation='lighter';
  for(const l of lasers){if(l.battle!==!!bt)continue;const a=FP(l.ax,l.ay,l.az),b=FP(l.tx,l.ty,.35),al=l.life/l.max;
   x.lineCap='round';x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.lineWidth=7;x.strokeStyle='rgba('+l.col+','+(.28*al)+')';x.stroke();x.lineWidth=2;x.strokeStyle='rgba('+l.col+','+al+')';x.stroke();x.lineWidth=1;x.strokeStyle='rgba(255,255,255,'+al+')';x.stroke()}
  x.restore()}
 function feedback(b){const kind=b.k;if(!['bore','smelt','crdep'].includes(kind))return '';const n=speed(b);
  if(kind==='bore')return 'Sand '+amount(b,'sand')+'/'+(CAP+2*b.lv)+' · 1 je '+(CYCLE/n).toFixed(1)+' s';
  if(kind==='smelt')return 'Sand '+amount(b,'sand')+' · Kristalle '+amount(b,'crystals')+' · '+(b.batch?'Schmelzen '+Math.min(100,Math.floor(amount(b,'prod')/7*100))+' %':'wartet auf Sand');
  return 'Kristalle '+amount(b,'crystals')+' · 20 ✦ bei Ankunft im Quartier'}
 function spawnTarget(a,t){return t.k!=='drn'||(a.k!=='war'&&a.k!=='wrm')}
 return{production,delivery,reset,readySand,tick,battleStart,laser,drawLaser,feedback,spawnTarget,speed};
})();
/* Unified machinery: warm steel, rivets, corrugation, hazard bands and animated mechanisms */
function l6base(px,py,s,w){shdw(px,py,s,w/2);prism(px,py,s*w,s*.16,['#85828a','#3c3f48'],'#262b35','#acabb4',.08,.055);stripes(px,py,s*w,s*.035,'#e8b031','#18191f');
 for(let i=0;i<5;i++){bolt(px-s*w*.42+i*s*w*.21,py-s*.145,s*.014)}}
function l6pipe(ax,ay,bx,by,s,col){x.lineCap='round';x.strokeStyle='#11151c';x.lineWidth=s*.07;x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.strokeStyle=col||'#8b95a5';x.lineWidth=s*.045;x.stroke();x.strokeStyle='rgba(235,244,255,.4)';x.lineWidth=s*.012;x.stroke();x.lineCap='butt'}
SPR.bore=function(px,py,s,b){const work=b&&b.bp>=1&&isOn(b)&&!b.up;const ph=work?tm*3:0;
 l6base(px,py,s,.82);x.fillStyle='#101219';ell(px,py-s*.2,s*.21,s*.085);x.fill();
 for(const i of[-1,1]){x.strokeStyle='#171b22';x.lineWidth=s*.075;x.beginPath();x.moveTo(px+i*s*.32,py-s*.16);x.lineTo(px+i*s*.25,py-s*.76);x.lineTo(px,py-s*.92);x.stroke();x.strokeStyle='#d9a628';x.lineWidth=s*.038;x.stroke();
  for(let j=0;j<4;j++){bolt(px+i*s*(.3-j*.013),py-s*(.23+j*.12),s*.018)}}
 x.fillStyle=LG(px-s*.08,0,px+s*.08,0,[[0,'#525b68'],[.4,'#d0d6df'],[1,'#323b4a']]);x.fillRect(px-s*.065,py-s*.84,s*.13,s*.62);
 x.save();x.beginPath();x.rect(px-s*.075,py-s*.82,s*.15,s*.6);x.clip();for(let j=-2;j<8;j++){const yy=py-s*.8+((j*.12+(ph*.04)% .12))*s;x.strokeStyle='#222a36';x.lineWidth=s*.032;x.beginPath();x.moveTo(px-s*.07,yy);x.lineTo(px+s*.07,yy+s*.07);x.stroke()}x.restore();
 prism(px,py-s*.75,s*.25,s*.12,['#d4a331','#72571b'],'#493712','#f0c45e',.03,.02);
 l6pipe(px-s*.3,py-s*.23,px-s*.19,py-s*.56,s,'#429bc3');glow(px-s*.24,py-s*.46,s*.13,'rgba(80,220,255,A)',work?.4:.1);
 x.fillStyle='#81684b';rr(px+s*.16,py-s*.37,s*.23,s*.17,s*.025);x.fill();x.fillStyle='#b8a074';ell(px+s*.27,py-s*.36,s*.12,s*.038);x.fill();
 if(work){for(let i=0;i<5;i++){const f=(tm*.7+i/5)%1;x.fillStyle='rgba(229,191,130,'+(.35*(1-f))+')';ell(px+(i-2)*s*.09,py-s*.24-f*s*.12,s*(.02+.035*f),s*(.01+.02*f));x.fill()}}
 NT.lit(px,py-s*.4,s*.8,.6);};
SPR.smelt=function(px,py,s,b){const work=b&&b.batch&&isOn(b),a=work?.7+.15*Math.sin(tm*8):.18;
 l6base(px,py,s,.88);prism(px,py-s*.16,s*.68,s*.34,['#737683','#343a47'],'#242a35','#979cad',.08,.07);
 cyl(px-s*.1,py-s*.71,py-s*.25,s*.21,['#444b57','#afb3bb','#68717d','#242b37'],'#767d8c');
 ring(px-s*.1,py-s*.35,s*.21);ring(px-s*.1,py-s*.59,s*.21);
 x.fillStyle='#100d12';rr(px-s*.27,py-s*.55,s*.34,s*.25,s*.035);x.fill();x.strokeStyle='#cf9331';x.lineWidth=s*.02;x.stroke();
 x.fillStyle=LG(0,py-s*.54,0,py-s*.31,[[0,'rgba(255,216,115,'+a+')'],[1,'rgba(255,91,17,'+a+')']]);x.fillRect(px-s*.255,py-s*.535,s*.31,s*.22);
 for(let i=0;i<4;i++){x.fillStyle='#36323c';x.fillRect(px-s*.25+i*s*.084,py-s*.54,s*.025,s*.23)}
 glow(px-s*.1,py-s*.42,s*.5,'rgba(255,140,35,A)',a*.48);
 cyl(px+s*.24,py-s*.94,py-s*.47,s*.055,['#303743','#8e98a5','#4d5969','#1b212c'],'#111822');
 if(work){for(let i=0;i<3;i++){let f=(tm*.55+i/3)%1;x.fillStyle='rgba(114,105,112,'+(.35*(1-f))+')';ell(px+s*.24+f*s*.08,py-s*.96-f*s*.3,s*(.035+.05*f),s*(.03+.04*f));x.fill()}}
 l6pipe(px+s*.28,py-s*.36,px+s*.38,py-s*.17,s,'#68b6d6');
 crystal(px+s*.21,py-s*.14,s*.06,()=>.5,[35,91,135],[130,245,255],'rgba(90,220,255,.3)');
 NT.lit(px,py-s*.4,s*1.2,work?.8:.45);};
SPR.crdep=function(px,py,s,b){const stock=b?b.crystals||0:3;
 l6base(px,py,s,.86);prism(px,py-s*.17,s*.7,s*.39,['#687382','#2d3a49'],'#1c2834','#a1acba',.07,.055);
 x.fillStyle=LG(0,py-s*.62,0,py-s*.2,[[0,'rgba(40,153,195,.42)'],[1,'rgba(5,38,66,.7)']]);rr(px-s*.31,py-s*.6,s*.6,s*.35,s*.03);x.fill();x.strokeStyle='#88cfe6';x.lineWidth=s*.016;x.stroke();
 for(let i=0;i<Math.min(5,stock);i++)crystal(px-s*.22+i*s*.1,py-s*.29-s*.015*(i%2),s*.07,()=>.5,[36,106,145],[190,255,255],'rgba(80,220,255,.3)');
 for(const sg of[-1,1]){x.fillStyle='#c0c8d3';x.fillRect(px+sg*s*.3-s*.014,py-s*.63,s*.028,s*.43);bolt(px+sg*s*.3,py-s*.6,s*.018)}
 x.fillStyle='rgba(220,248,255,.24)';x.beginPath();x.moveTo(px-s*.26,py-s*.59);x.lineTo(px-s*.18,py-s*.59);x.lineTo(px+.03*s,py-s*.24);x.lineTo(px-s*.05,py-s*.24);x.fill();
 stripes(px,py-s*.07,s*.38,s*.06,'#c6a441','#17232e');
 glow(px,py-s*.38,s*.4,'rgba(90,230,255,A)',stock?.4:.1);NT.lit(px,py-s*.4,s,stock?.7:.45);};
function drawDrone(px,py,s,o){const f=o.face||-1,bo=Math.sin(tm*3+(o.ph||0))*s*.025;
 x.save();x.translate(px,py+bo);x.scale(f,1);
 x.fillStyle='rgba(8,10,20,.4)';ell(0,s*.7,s*.35,s*.095);x.fill();
 for(const sg of[-1,1]){x.strokeStyle='#677387';x.lineWidth=s*.055;x.beginPath();x.moveTo(-s*.08,0);x.lineTo(-s*.25,sg*s*.18);x.stroke();
  x.fillStyle='#1a2330';ell(-s*.25,sg*s*.2,s*.17,s*.08);x.fill();x.strokeStyle='#879fb4';x.lineWidth=s*.022;x.stroke();
  x.save();x.translate(-s*.25,sg*s*.2);x.rotate(tm*17);x.strokeStyle='rgba(145,242,255,.65)';x.lineWidth=s*.035;x.beginPath();x.moveTo(-s*.12,0);x.lineTo(s*.12,0);x.stroke();x.restore();}
 x.fillStyle=LG(0,-s*.2,0,s*.17,[[0,'#9faabd'],[.5,'#445569'],[1,'#1a2637']]);x.beginPath();x.moveTo(-s*.26,-s*.14);x.lineTo(s*.2,-s*.11);x.lineTo(s*.4,0);x.lineTo(s*.2,s*.13);x.lineTo(-s*.26,s*.17);x.closePath();x.fill();x.strokeStyle='#121c29';x.lineWidth=s*.015;x.stroke();
 bolt(-s*.12,-s*.075,s*.022);bolt(-s*.12,s*.075,s*.022);
 x.fillStyle='#111a26';ell(s*.24,0,s*.075,s*.07);x.fill();x.fillStyle='#ff75c4';ell(s*.27,0,s*.04,s*.04);x.fill();glow(s*.28,0,s*.26,'rgba(255,65,175,A)',.6);
 x.restore();NT.lit(px,py,s*.65,.55)}
function drawAlien(px,py,s,o){const f=o.face||-1,sw=Math.sin((o.ph||tm)*2)*s*.07;
 x.save();x.translate(px,py);x.scale(f,1);shdw(0,0,s,.3);
 x.strokeStyle='#273e48';x.lineWidth=s*.065;x.lineCap='round';x.beginPath();x.moveTo(-s*.09,-s*.38);x.lineTo(-s*.14+sw,0);x.moveTo(s*.09,-s*.38);x.lineTo(s*.17-sw,0);x.stroke();
 x.fillStyle=LG(-s*.17,0,s*.16,0,[[0,'#244b54'],[.4,'#84b1b0'],[1,'#203b4b']]);x.beginPath();x.moveTo(-s*.12,-s*.6);x.lineTo(s*.13,-s*.6);x.lineTo(s*.16,-s*.35);x.lineTo(-s*.14,-s*.35);x.fill();
 x.fillStyle=LG(-s*.17,0,s*.2,0,[[0,'#385763'],[.45,'#a0c7c0'],[1,'#284a50']]);ell(s*.01,-s*.76,s*.17,s*.22,.1);x.fill();
 for(let i=0;i<3;i++){x.strokeStyle='rgba(9,38,42,.3)';x.lineWidth=s*.012;ell(s*.01,-s*.76,s*(.14-i*.015),s*(.18-i*.02));x.stroke()}
 x.fillStyle='#08191b';ell(s*.05,-s*.8,s*.08,s*.075,-.4);x.fill();x.fillStyle='#90ffe0';ell(s*.075,-s*.8,s*.045,s*.034,-.4);x.fill();
 x.strokeStyle='#76aca8';x.lineWidth=s*.045;x.beginPath();x.moveTo(s*.09,-s*.54);x.lineTo(s*.28,-s*.45);x.stroke();x.fillStyle='#1b343f';rr(s*.19,-s*.49,s*.27,s*.075,s*.02);x.fill();
 glow(s*.09,-s*.8,s*.25,'rgba(80,255,195,A)',.6);x.restore();NT.lit(px,py-s*.6,s*.9,.65)}
