/* Film-Kern: Ablauf, Text, Schlagwörter, Figuren, Himmel – gemeinsam für alle Filme */
let CFG;
const lk=(K,t)=>{let i=0;while(i<K.length-2&&K[i+1][0]<=t)i++;const a=K[i],b=K[i+1],u=S(a[0],b[0],t);return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u)};
function fmt(s){let n=0;return s.split(/(\*\*.+?\*\*)/).map(p=>{const k=p.startsWith('**');return(k?p.slice(2,-2):p).split(' ').filter(Boolean).map(w=>`<i${k?' class="k"':''} style="--d:${(n++*.1).toFixed(2)}s">${w}</i>`).join(' ')}).join(' ')}
/* Mensch mit Rucksack, Armen, Becher, Umhang */
function human(x,y,z,h,suit,vis,ph,arm,cup,cape){const a=P(x,y,z),b=P(x,y+h*.8,z);if(!a||!b)return;Q.push([a[3],()=>{const s=a[2],w=Math.max(1.5,h*s*.34),H=h*s,sw=Math.sin(ph*2)*H*.14;g.lineCap='round';
 if(cape){g.fillStyle=cape;g.beginPath();g.moveTo(b[0]-w*.5,b[1]+H*.05);g.lineTo(b[0]+w*.5,b[1]+H*.05);g.lineTo(a[0]+w*1.6+Math.sin(ph*3)*w*.4,a[1]-H*.04);g.lineTo(a[0]-w*1.6+Math.sin(ph*3+1)*w*.4,a[1]-H*.04);g.closePath();g.fill()}
 g.strokeStyle='#1b0f22';g.lineWidth=w*.55;g.beginPath();g.moveTo(a[0]-w*.15,a[1]-H*.42);g.lineTo(a[0]-w*.25+sw,a[1]);g.moveTo(a[0]+w*.15,a[1]-H*.42);g.lineTo(a[0]+w*.25-sw,a[1]);g.stroke();
 g.strokeStyle=suit;g.lineWidth=w;g.beginPath();g.moveTo(a[0],a[1]-H*.38);g.lineTo(b[0],b[1]+H*.02);g.stroke();g.fillStyle='#2b2236';g.fillRect(b[0]+w*.35,b[1]+H*.05,w*.45,H*.3);
 const sx=b[0],sy=b[1]+H*.08;g.strokeStyle=suit;g.lineWidth=w*.4;g.beginPath();
 if(arm){g.moveTo(sx-w*.4,sy);g.lineTo(sx-w*.85,sy-H*.3);g.moveTo(sx+w*.4,sy);g.lineTo(sx+w*.85,sy-H*.3);g.stroke();if(cup){g.fillStyle='#ffe9b0';g.fillRect(sx-w*1.1,sy-H*.4,w*.5,H*.11);g.fillRect(sx+w*.6,sy-H*.4,w*.5,H*.11)}}
 else{g.moveTo(sx-w*.45,sy);g.lineTo(sx-w*.6,sy+H*.28);g.moveTo(sx+w*.45,sy);g.lineTo(sx+w*.6,sy+H*.28);g.stroke()}
 const R=H*.17;g.fillStyle=suit;g.beginPath();g.arc(b[0],b[1]-R*.3,R,0,TAU);g.fill();g.fillStyle=vis;g.fillRect(b[0]-R*.62,b[1]-R*.55,R*1.24,R*.6)}])}
/* Nachthimmel: Milchstraße, Polarlicht, Sternschnuppe */
function nightSky(W,Hh,hor,fx,t){g.save();g.globalCompositeOperation='lighter';g.translate(W*.5-cam.yaw*fx*.8,hor-fx*.62);g.rotate(-.45);
 let gr=g.createLinearGradient(0,-fx*.22,0,fx*.22);gr.addColorStop(0,'rgba(150,130,255,0)');gr.addColorStop(.5,'rgba(190,170,255,.2)');gr.addColorStop(1,'rgba(150,130,255,0)');g.fillStyle=gr;g.fillRect(-W*1.3,-fx*.22,W*2.6,fx*.44);
 for(let i=0;i<260;i++){g.fillStyle=`rgba(255,240,255,${.25+.6*hash(i+7)})`;g.fillRect((hash(i)*2-1)*W*1.2,(hash(i+400)+hash(i+800)-1)*fx*.2,1.7,1.7)}g.restore();
 g.globalCompositeOperation='lighter';for(let r=0;r<3;r++){const base=hor-fx*(.4+r*.12),col=['90,255,180','70,200,255','180,110,255'][r];gr=g.createLinearGradient(0,base-fx*.5,0,base+fx*.05);gr.addColorStop(0,`rgba(${col},0)`);gr.addColorStop(.8,`rgba(${col},.3)`);gr.addColorStop(1,`rgba(${col},0)`);g.fillStyle=gr;
  for(let x=0;x<W;x+=6){const u=x/W*7+t*.35+r*2+cam.yaw*4,y=base+Math.sin(u)*fx*.05+Math.sin(u*2.3+t)*fx*.02,h=fx*(.22+.18*Math.sin(u*.7+r)**2);g.globalAlpha=.5+.5*Math.sin(u*1.7+t*.8);g.fillRect(x,y-h,7,h+fx*.05)}}
 g.globalAlpha=1;if(t>3.2&&t<3.95){const u=(t-3.2)/.75,x=W*(.8-.4*u),y=hor-fx*(.85-.3*u);gr=g.createLinearGradient(x,y,x+W*.14,y-W*.04);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.strokeStyle=gr;g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+W*.14,y-W*.04);g.stroke()}g.globalCompositeOperation='source-over'}
/* Sonnenstrahlen + Linsenreflexe */
function rays(W,Hh,hor,fx,t,k){const da=.8-cam.yaw;if(k<.02||SUN.a<=0||Math.cos(da)<.2)return;const x=W/2+Math.tan(da)*fx,y=hor-fx*SUN.e;g.save();g.globalCompositeOperation='lighter';
 for(let i=0;i<16;i++){const L=fx*2,w=fx*(.04+.05*hash(i)),gr=g.createLinearGradient(x,y,x+L,y);gr.addColorStop(0,`rgba(255,205,140,${.2*k*(.5+.5*Math.sin(t*.8+i*2))})`);gr.addColorStop(1,'rgba(255,170,90,0)');g.save();g.translate(x,y);g.rotate(i/16*TAU+t*.02);g.translate(-x,-y);g.fillStyle=gr;g.beginPath();g.moveTo(x,y);g.lineTo(x+L,y-w);g.lineTo(x+L,y+w);g.fill();g.restore()}
 for(const j of[.5,1.1,1.7]){const px=x+(W/2-x)*j,py=y+(Hh/2-y)*j,r=fx*.05*(1+j),gr=g.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,`rgba(255,${200-j*40},120,${.22*k})`);gr.addColorStop(1,'rgba(255,150,80,0)');g.fillStyle=gr;g.fillRect(px-r,py-r,r*2,r*2)}g.restore()}
/* Ablauf */
let t=0,last=0,ci=-1,want=0;const cp=$('cap'),sd=$('sd');try{want=localStorage.getItem('dtSnd')!=='0'?1:0}catch(e){want=1}
const fade=()=>{const f=$('fd');f.style.animation='none';f.offsetWidth;f.style.animation='fd 1s ease-out both'};
function seek(x){t=x;fade();if(EV.length){ei=EV.findIndex(e=>e[0]>=t);if(ei<0)ei=EV.length}}
function done(){const n=new URLSearchParams(location.search).get('next');if(parent!==window)parent.postMessage({type:'film-done',film:CFG.n},'*');if(n)location.href=n;else if(parent===window)location.href='../index.html'}
$('sk').onclick=()=>seek(CFG.CARD+.2);$('rp').onclick=()=>seek(0);$('ok').onclick=done;
sd.onclick=()=>{on=!on;sd.classList.toggle('on',on);try{localStorage.setItem('dtSnd',on?'1':'0')}catch(e){}
 if(on){try{navigator.audioSession.type='playback'}catch(e){}if(!AC)aInit();AC.resume();TB.gain.value=.7;MB.gain.setTargetAtTime(.85,AC.currentTime,.05);FB=AC.createGain();FB.connect(MB);EV=CFG.build();ei=EV.findIndex(e=>e[0]>=t);if(ei<0)ei=EV.length}else if(AC)MB.gain.setTargetAtTime(0,AC.currentTime,.05)};
/* Ton-Vorgabe AN: startet sofort mit der Animation (in der Shell ist der Ton schon freigeschaltet).
   Sperrt der Browser ihn noch, läuft er ab dem ersten Tipp. */
(function(){const go=()=>{if(want&&!on)sd.click();want=0};
 setTimeout(go,150);
 addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('#sd')){want=0;return}if(typeof AC!=='undefined'&&AC){try{AC.resume()}catch(_){}}},true);
})();


let RW=896,ema=.016,si=-1;const sl=$('sl'),tb=$('tb');
function frame(now){const C=CFG,raw=(now-last)/1e3||.016,dt=Math.min(.05,raw);last=now;const pt=t;t+=dt;ema=ema*.94+raw*.06;for(const x of C.CUTS)if(pt<x&&t>=x)fade();
 if(t>2&&ema>.043&&RW>640){RW=RW>800?768:640;ema=.03}
 const W=RW,Hh=Math.round(W*.5625),fx=W/1.6;if(c.width!=W){c.width=W;c.height=Hh;tc.width=W;tc.height=Hh}
 const P0=C.PUL0,pk=t<P0?-9:P0+7*Math.floor((t-P0)/7),pu=t-pk;let sh=0;if(pk>=0&&pu<.55)sh=(1-pu/.55)*(C.strong&&C.strong(pk)?1.4:.5);for(const s of C.SL){const u=t-s[0];if(u>0&&u<.5)sh=Math.max(sh,(1-u/.5)*.8)}
 if(!(C.draw2d&&C.draw2d(t,W,Hh,pk,pu))){const k7=lk(C.K,t);if(C.fix)C.fix(k7,t);const ddx=k7[3]-k7[0],ddz=k7[4]-k7[1];
  cam.x=k7[0]+(hash(t*37)-.5)*sh*2;cam.z=k7[1]+(hash(t*41)-.5)*sh*2;cam.y=k7[2]+(hash(t*43)-.5)*sh*2;cam.yaw=Math.atan2(ddx,ddz);
  const hor=Hh/2-(k7[2]-k7[5])/Math.hypot(ddx,ddz)*fx;cam.y=Math.max(cam.y,gh(cam.x,cam.z)+4);const o=C.pal(t);TINT=o.tint||'';RIPA=C.ripv||0;
  const sto=o.sto||0,fc=lc(SKY[2],STM[2],sto);sky(W,Hh,hor,fx,t,sto,0,fc);terr(W,Hh,hor,fx,C.far||500,fc);
  Q.length=0;setP(W,Hh,hor,fx);C.world(t,pk,pu);Q.sort((a,b)=>b[0]-a[0]);for(const q of Q)if(!q[2])q[1]();
  if(o.nit){const gr=g.createLinearGradient(0,hor-fx*.5,0,hor);gr.addColorStop(0,'rgb(235,238,250)');gr.addColorStop(1,'rgb(92,106,168)');g.globalCompositeOperation='multiply';g.fillStyle=gr;g.fillRect(0,0,W,Hh);g.globalCompositeOperation='source-over';nightSky(W,Hh,hor,fx,t)}
  for(const q of Q)if(q[2])q[1]();if(o.rays)rays(W,Hh,hor,fx,t,o.rays)}
 bc.width=W>>3;bc.height=Hh>>3;bg.drawImage(c,0,0,bc.width,bc.height);g.globalCompositeOperation='lighter';g.globalAlpha=.5;g.drawImage(bc,0,0,W,Hh);g.globalAlpha=1;
 if(pu<.3&&pk>=0&&C.strong&&C.strong(pk)){g.fillStyle=`rgba(255,220,170,${.28*(1-pu/.3)})`;g.fillRect(0,0,W,Hh)}g.globalCompositeOperation='source-over';
 const i=C.CAP.findIndex(q=>t>=q[0]&&t<q[1]);if(i>=0&&i!=ci){ci=i;const q=C.CAP[i],col=q[4]||'#9cecff',b=cp.firstChild;b.textContent=q[3]||'IDA · BORD-KI';b.style.color=col;b.style.borderColor=col;cp.lastChild.innerHTML=fmt(q[2])}cp.className=i>=0?'on':'';$('cb').className=i>=0?'on':'';
 const j=C.SL.findIndex(s=>t>=s[0]&&t<s[0]+1.7);if(j!=si){si=j;if(j>=0){sl.textContent=C.SL[j][1];sl.style.fontSize='min('+Math.min(18,86/(C.SL[j][1].length*.5))+'vw,210px)';sl.className='';sl.offsetWidth;sl.className='on '+C.SL[j][2]}else sl.className=''}
 if(tb)tb.className=C.TB&&t>C.TB[0]&&t<C.TB[1]?'on':'';$('mi').className=t>=C.CARD?'on':'';
 if(AC&&on&&FB)try{const n=AC.currentTime;while(ei<EV.length&&EV[ei][0]<t+1.2){const[te,fn]=EV[ei++];O=FB;fn(n+Math.max(0,te-t))}}catch(e){console.error('Ton-Fehler',e)}
 requestAnimationFrame(frame)}
function runFilm(c){CFG=c;requestAnimationFrame(frame)}
