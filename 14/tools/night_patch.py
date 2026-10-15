"""
night_patch.py  –  baut Nachtlevel, Fackelturm und Tageszeiten-Grundlage in game/engine.js ein.
Wird von split_game.py automatisch aufgerufen.

Level-Schlüssel (in game/levels/levelNN.js):
    tod:'night'                      reines Nachtlevel      (dark: Dunkelheit 0..1, Standard .94)
    tod:'day' oder fehlt             Tag (wie bisher)
    tod:{cycle:240,start:0,dark:.94} Tageszeiten ab Level 5: cycle = Sekunden pro Tag, start = Startphase 0..1
                                     (0 = Mittag, .5 = Mitternacht). Licht, Musik und Scheinwerfer folgen der Dunkelheit.
    pre:[{k:'fak',c:2,r:0,lv:0}]     Gebäude, die beim Start schon fertig stehen (k = Gebäudetyp, c = Spalte 0–6, r = Reihe 0–1)
"""
import re

NIGHT_JS = r"""
/* ===================== NACHT & TAGESZEITEN ===================== */
const torchR=lv=>3.4+.8*(lv||0);                       /* Fackelturm: Lichtradius in Feldern (Raffinerie: 3,5 + 1,5 je Stufe) */
const NT=(()=>{
 const DCOL='4,7,22';
 let act=false,dk=0,mood='',LS=[],GLW=[],cvs=null,cg=null,iris=null,cone=null,bsk=null,bskK='';
 const fl=ph=>{let f=1+.045*Math.sin(tm*13+ph)+.03*Math.sin(tm*23.7+ph*2.1)+.02*Math.sin(tm*5.3+ph*.7);if(Math.sin(tm*1.9+ph*3)>.985)f*=.86;return f};
 function dark(){const t=L&&L.tod;if(!t||t==='day')return 0;const mx=L.dark==null?.94:L.dark;if(t==='night')return mx;
  if(typeof t==='object'){const m2=t.dark==null?mx:t.dark,p=(((gt/(t.cycle||240)+(t.start||0))%1)+1)%1,k=.5-.5*Math.cos(p*TAU);return m2*clamp((k-.2)/.6,0,1)}return 0}
 function sprites(){
  if(!iris){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createRadialGradient(128,128,0,128,128,128);
   [[0,1],[.2,.97],[.4,.82],[.58,.55],[.75,.27],[.9,.08],[1,0]].forEach(s=>gr.addColorStop(s[0],'rgba(255,255,255,'+s[1]+')'));g.fillStyle=gr;g.fillRect(0,0,256,256);iris=c}
  if(!cone){const w=128,h=96,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),im=g.createImageData(w,h),d=im.data;
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){const dx=i,dy=j-h/2,r=Math.hypot(dx,dy)/w;let a=0;if(dx>0&&r<1){const th=Math.abs(Math.atan2(dy,dx)),u=clamp(1-th/.52,0,1);a=Math.pow(1-r,1.35)*u*u*(3-2*u)}
    const o=(j*w+i)*4;d[o]=d[o+1]=d[o+2]=255;d[o+3]=a*255}
   g.putImageData(im,0,0);cone=c}}
 const lit=(px,py,r,a)=>{if(act)LS.push({t:0,x:px,y:py,r,a})};
 const cn=(px,py,dir,len,a)=>{if(act)LS.push({t:1,x:px,y:py,d:dir<0?-1:1,len,a})};
 const glw=(px,py,r,col,a)=>{if(act)GLW.push([px,py,r,col,a])};
 function head(px,py,dir,sc){sc=sc||1;cn(px+dir*T*.2,py,dir,T*2.5*sc,.96);lit(px,py,T*.58*sc,.6);glw(px+dir*T*.3*sc,py,T*.2*sc,'255,244,200',.9)}
 function lantern(px,py,col,sc){sc=sc||1;lit(px,py-T*.3,T*.66*sc,.55);glw(px,py-T*.42,T*.2*sc,col||'255,214,140',.55)}
 const setup=()=>{dk=dark();mood=dk>.5?'night':'';window.DT_MOOD=mood};
 /* Gebäude, die beim Levelstart schon fertig stehen (Level-Schlüssel pre) */
 function pre(){if(!L||!L.pre)return;for(const p of L.pre){const t=G[p.r]&&G[p.r][p.c];if(!t||t.s!=2||bl[K(p.c,p.r)]||!B[p.k])continue;const b=mkB(p.k,p.c,p.r,1);if(p.lv)b.lv=p.lv;bl[K(p.c,p.r)]=b}bver++}
 function frame(){dk=dark();act=dk>.02;LS.length=0;GLW.length=0;if(!act)return;sprites();
  if(typeof L.tod==='object'){const m=dk>.55?'night':(dk<.35?'':mood);if(m!==mood){mood=m;try{AU.mood(m)}catch(e){}}}
  if(!bt&&sel){const cx=(sel.c+.5)*T,cy=SY(sel.r+.5);lit(cx,cy,T*1.15,.8)}}
 function build(b,px,py,s){
  if(!act||b.bp<1)return;const on=isOn(b),k=on?1:.28,f=fl(b.ph||0),k2=b.k;
  const cx=px,cy=py-s*.38;
  if(k2=='fak'){const R=torchR(b.lv)*T*1.12,fx=px,fy=py-s*.82;
   if(on){lit(fx,fy,R*(.965+.035*f),Math.min(1,.97*(.92+.08*f)));glw(fx,fy-s*.05,s*.62*f,'255,168,64',.72);glw(fx,fy-s*.1,s*.24,'255,236,170',.85)}
   else{lit(fx,fy,s*.7,.35);glw(fx,fy,s*.2,'255,120,40',.45)}
   for(let i=0;i<b.lv;i++){const sx=px+(i?1:-1)*s*.21;if(on){lit(sx,py-s*.5,s*.55,.5);glw(sx,py-s*.54,s*.2*f,'255,170,70',.6)}}return}
  if(k2=='hub'){lit(cx,cy,s*2.7,1);glw(cx,py-s*.55,s*.55,'255,205,120',.45*k);glw(cx,py-s*.42,s*.34,'120,220,255',.6*k);return}
  if(k2=='raf'){lit(cx,cy,s*1.15,.78*k);for(const i of[-1,1])glw(px+i*s*.21,py-s*.3,s*.26*(.85+.15*f),'255,140,40',.5*k);glw(px,py-s*.84,s*.36*f,'255,150,50',.6*k);return}
  if(k2=='ene'){lit(cx,cy,s*1.05,.7*k);glw(px,py-s*.58,s*.4*(.8+.2*Math.sin(tm*3+(b.ph||0))),'120,225,255',.7*k);return}
  if(k2=='kas'){const act2=b.q&&b.q[0]&&b.q[0].arr;lit(cx,cy,s*(act2?1:.82),.6*k);for(const i of[-1,1])glw(px+i*s*.27,py-s*.26,s*.12,'255,200,120',.55*k);if(act2)glw(px,py-s*.14,s*.34,'255,176,76',.65*k);return}
  if(k2=='fab'){const act2=b.q&&b.q[0]&&b.q[0].arr;lit(cx,cy,s*1.05,.62*k);glw(px,py-s*.15,s*.34,act2?'255,176,76':'120,220,255',(act2?.65:.4)*k);glw(px+s*.31,py-s*.86,s*.14,'255,120,40',.45*k*f);return}
  if(k2=='tur'){lit(cx,cy,s*.85,.55*k);glw(px,py-s*.56,s*.2,'114,220,255',.6*k);return}
  if(k2=='wel'){lit(cx,cy,s*.8,.55*k);glw(px,py-s*.5,s*.3,'120,200,255',.45*k);return}
  lit(cx,cy,s*.8,.4*k)}
 function unit(u,px,py){if(!act)return;if(u.k=='sam'||u.k=='cra')head(px,py-T*.14,u.face||1,1);else lantern(px,py,'255,214,140')}
 function enemy(e,px,py){if(!act)return;if(e.k=='pz')head(px,py-T*.16,e.face||-1,1.1);else if(e.k=='br'){lit(px,py-T*.5,T*1.3,.6);glw(px,py-T*.62,T*.5,'255,80,40',.5)}else lantern(px,py,'255,150,70')}
 function worker(w,px,py){if(!act)return;lantern(px,py,'255,236,190',1)}
 function belt(b,c,r,px,py,live){if(!act)return;lit(px+T/2,py+T/2,T*.52,live?.32:.12);if(live)glw(px+T/2,py+T*.5,T*.17,'110,255,170',.35)}
 function pkt(q,s){if(!act)return;const k=q.kind;lit(s[0],s[1],T*.4,.42);const col=k=='am'||k=='wat'||k=='wt'?'120,210,255':k=='pwr'?'255,224,90':'255,170,56';glw(s[0],s[1]-T*.03,T*.2,col,.75)}
 function eye(ex,ey,R,md){if(!act)return;lit(ex,ey,R*2.4,.5);glw(ex,ey,R*.6,md=='rage'?'255,60,40':'120,255,210',.95)}
 function tile(t,px,py){if(!act)return;const cx=px+T/2,cy=py+T/2;
  if(t.s==2&&!bl[K(t.c,t.r)])lit(cx,cy,T*.72,.24);                  /* freigelegtes Gelände schimmert schwach im Mondlicht */
  if(t.t==1&&(t.s==1||t.st>0)){lit(cx,cy,T*.5,.38);glw(cx,cy-T*.08,T*.4,'255,150,40',.3+.1*Math.sin(tm*2.4+t.c*1.7+t.r))}
  else if(t.t==4&&t.s==1){lit(cx,cy,T*.5,.38);glw(cx,cy-T*.08,T*.4,'90,255,230',.32)}
  if(t.f||t.q)lit(cx,cy,T*.72,.7);
  if(t.qs)lit(cx,cy,T*.55,.32);
  if(L.p.ne&&t.s==2&&!SV.cl&&!hzSmall(t)&&nb(t.c,t.r)>0)lit(cx,cy,T*.82,.92);
  else if(L.p.ne&&SV.cl&&t.s==1&&!t.f&&nb(t.c,t.r)>0)lit(cx,cy,T*.7,.8)}
 function apply(){
  if(!act)return;sprites();
  const Q=.5,w_=Math.ceil(CW*DPR*Q),h_=Math.ceil(VH*DPR*Q);
  if(!cvs){cvs=document.createElement('canvas');cg=cvs.getContext('2d')}
  if(cvs.width!==w_||cvs.height!==h_){cvs.width=w_;cvs.height=h_}
  const g=cg;g.setTransform(DPR*Q,0,0,DPR*Q,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,CW,VH);
  g.fillStyle='rgba('+DCOL+','+(dk*(bt?.84:1)).toFixed(3)+')';g.fillRect(0,0,CW,VH);
  g.globalCompositeOperation='destination-out';
  for(const l of LS){g.globalAlpha=Math.min(1,l.a);const X=l.x+OX;
   if(l.t==0)g.drawImage(iris,X-l.r,l.y-l.r,l.r*2,l.r*2);
   else{g.save();g.translate(X,l.y);g.scale(l.d,1);g.drawImage(cone,0,-l.len*.375,l.len,l.len*.75);g.restore()}}
  g.globalAlpha=1;g.globalCompositeOperation='source-over';
  x.save();x.imageSmoothingEnabled=true;x.drawImage(cvs,-OX,0,CW,VH);x.restore();
  x.save();x.globalCompositeOperation='lighter';
  for(const q of GLW){const gr=x.createRadialGradient(q[0],q[1],0,q[0],q[1],q[2]);gr.addColorStop(0,'rgba('+q[3]+','+Math.min(1,q[4]*Math.min(1,dk*1.2)).toFixed(3)+')');gr.addColorStop(1,'rgba('+q[3]+',0)');x.fillStyle=gr;x.fillRect(q[0]-q[2],q[1]-q[2],q[2]*2,q[2]*2)}
  x.restore();
  const sb=!bt&&sel&&bl[K(sel.c,sel.r)];
  if(sb&&sb.k=='fak'&&sb.bp>=1){const R=torchR(sb.lv),cx=SX(sel.c+.5),cy=SY(sel.r+.5);x.setLineDash([9,7]);x.lineDashOffset=-tm*14;x.strokeStyle='rgba(255,205,120,.85)';x.lineWidth=2.2;x.beginPath();x.arc(cx,cy,R*T,0,TAU);x.stroke();x.setLineDash([])}
  LS.length=0;GLW.length=0}
 function battle(b,X,Y){
  if(!act)return;
  for(const q of b.f){if(q.hide)continue;const px=X(q.x)+(q.kb||0)*T,py=Y(q.y)-(q.hz||0)*T,k=q.k,fc=q.face||(q.s?-1:1);
   if(k=='tur'){lit(px,py-T*.3,T*1.5,.9);glw(px,py-T*.35,T*.5,'114,220,255',.55)}
   else if(k=='hub'){lit(px,py-T*.4,T*2,.95);glw(px,py-T*.5,T*.8,'255,200,100',.5)}
   else if(k=='cra'||k=='pz'||k=='br'||k=='sam')head(px,py-T*.12,fc,k=='br'?1.7:1);
   else if(k=='wrm')lit(px,py-T*.5,T*.9,.55);
   else lantern(px,py,q.s?'255,150,70':'255,214,140')}
  glw(CW*.72-OX,VH*.19,T*1.3,'190,210,255',.5);glw(CW*.72-OX,VH*.19,T*.3,'240,244,255',1);
  for(let i=0;i<46;i++){const sx=H(i,1,2)*CW-OX,sy=H(i,5,3)*VH*.2,tw=.5+.5*Math.sin(tm*(1+H(i,2,9)*2)+i*3.1);glw(sx,sy,2.6,'230,235,255',.25+.55*tw)}
  apply()}
 function battleSky(){
  const k=CW+'x'+VH+'x'+DPR;
  if(bskK!==k){bskK=k;const c=document.createElement('canvas');c.width=Math.ceil(CW*DPR);c.height=Math.ceil(VH*DPR);const g=c.getContext('2d');g.scale(DPR,DPR);const hz=VH*.22;
   let gr=g.createLinearGradient(0,0,0,hz+10);gr.addColorStop(0,'#05061a');gr.addColorStop(.6,'#141636');gr.addColorStop(1,'#2e2850');g.fillStyle=gr;g.fillRect(0,0,CW,hz+10);
   gr=g.createLinearGradient(0,hz,0,VH);gr.addColorStop(0,'#33283f');gr.addColorStop(.5,'#241c30');gr.addColorStop(1,'#16111f');g.fillStyle=gr;g.fillRect(0,hz,CW,VH-hz);
   for(let i=0;i<5;i++){const y0=hz+VH*(.04+i*.15),am=VH*(.02+i*.006);g.fillStyle='rgba(6,4,16,'+(.18+i*.03)+')';g.beginPath();g.moveTo(0,y0);for(let j=0;j<=12;j++)g.lineTo(CW*j/12,y0+Math.sin(j*1.1+i*2.3)*am);g.lineTo(CW,VH);g.lineTo(0,VH);g.closePath();g.fill();
    g.strokeStyle='rgba(130,140,210,'+(.16-i*.02)+')';g.lineWidth=1.5;g.beginPath();for(let j=0;j<=12;j++){const yy=y0+Math.sin(j*1.1+i*2.3)*am;j?g.lineTo(CW*j/12,yy):g.moveTo(0,yy)}g.stroke()}
   bsk=c}
  x.drawImage(bsk,-20,-20,CW+40,VH+40)}
 return{setup,pre,frame,apply,battle,battleSky,build,unit,enemy,worker,belt,pkt,eye,tile,lit,dark:()=>dk,night:()=>act,fogK:()=>act?1-dk*.9:1}
})();
"""

SPRITE_JS = r"""
/* Fackelturm: schlanker Pfosten mit Feuerschale, Flamme flackert; Ausbau = Seitenfackeln */
SPR.fak=function(px,py,s,b){shdw(px,py,s,.4);
 prism(px,py,s*.46,s*.16,['#8a8078','#4c443e'],'#34302c','#aca298',.07,.05);
 x.fillStyle=LG(px-s*.045,0,px+s*.045,0,[[0,'#9a928a'],[.5,'#ece6da'],[1,'#5e564e']]);x.fillRect(px-s*.04,py-s*.74,s*.08,s*.6);
 for(let i=0;i<4;i++){x.fillStyle='rgba(40,28,18,.55)';x.fillRect(px-s*.046,py-s*.24-i*s*.12,s*.092,s*.018)}
 const on=!b||isOn(b),k=on?1:.22,ph=b?b.ph:0,lv=b?b.lv:0,fx=Math.sin(tm*13+ph)*.04,fy=Math.sin(tm*9.3+ph*1.7)*.03;
 const bowl=(bx,by,sc,kk)=>{
  x.fillStyle=LG(bx-s*.18*sc,0,bx+s*.18*sc,0,[[0,'#6a5a4a'],[.5,'#b8a58a'],[1,'#4a3a2c']]);x.beginPath();x.moveTo(bx-s*.17*sc,by-s*.02*sc);x.lineTo(bx+s*.17*sc,by-s*.02*sc);x.lineTo(bx+s*.09*sc,by+s*.09*sc);x.lineTo(bx-s*.09*sc,by+s*.09*sc);x.closePath();x.fill();
  x.fillStyle='#1c1410';ell(bx,by-s*.02*sc,s*.17*sc,s*.05*sc);x.fill();x.fillStyle='rgba(255,120,30,'+(.55*kk+.1)+')';ell(bx,by-s*.02*sc,s*.13*sc,s*.03*sc);x.fill();
  glow(bx,by-s*.14*sc,s*.5*sc*kk+s*.1*sc,'rgba(255,150,40,A)',.5*kk+.08);
  const fa=s*sc;
  x.fillStyle='rgba(255,104,18,.95)';x.beginPath();x.moveTo(bx-.13*fa*kk-.03*fa,by-.02*fa);x.quadraticCurveTo(bx-.1*fa*kk+fx*fa,by-.28*fa*kk-fy*fa,bx+fx*fa*2,by-.5*fa*kk-.04*fa-fy*fa*2);x.quadraticCurveTo(bx+.1*fa*kk+fx*fa,by-.26*fa*kk,bx+.13*fa*kk+.03*fa,by-.02*fa);x.closePath();x.fill();
  x.fillStyle='rgba(255,196,60,.95)';x.beginPath();x.moveTo(bx-.07*fa*kk-.02*fa,by-.02*fa);x.quadraticCurveTo(bx-.05*fa*kk+fx*fa,by-.2*fa*kk,bx+fx*fa*1.4,by-.34*fa*kk-.03*fa-fy*fa);x.quadraticCurveTo(bx+.05*fa*kk,by-.18*fa*kk,bx+.07*fa*kk+.02*fa,by-.02*fa);x.closePath();x.fill();
  x.fillStyle='rgba(255,246,210,.95)';x.beginPath();x.ellipse(bx+fx*fa*.5,by-.1*fa*kk-.01*fa,.03*fa*kk+.01*fa,.07*fa*kk+.01*fa,0,0,TAU);x.fill()};
 bowl(px,py-s*.76,1,k);
 if(lv>=1){x.strokeStyle='#5a4a3a';x.lineWidth=2;x.beginPath();x.moveTo(px,py-s*.46);x.lineTo(px-s*.21,py-s*.46);x.lineTo(px-s*.21,py-s*.5);x.stroke();bowl(px-s*.21,py-s*.5,.5,k)}
 if(lv>=2){x.strokeStyle='#5a4a3a';x.lineWidth=2;x.beginPath();x.moveTo(px,py-s*.46);x.lineTo(px+s*.21,py-s*.46);x.lineTo(px+s*.21,py-s*.5);x.stroke();bowl(px+s*.21,py-s*.5,.5,k)}
 x.fillStyle='#17110e';bolt(px-s*.17,py-s*.16,Math.max(.8,s*.012));bolt(px+s*.17,py-s*.16,Math.max(.8,s*.012))};
"""

MUSIC_JS = r"""
 /* Nachtmusik: minimalistische Wüste bei Nacht – tiefer Bordun, Wind, sehr seltene Töne, Grillen, ferner Puls */
 function playNight(){stopMusic();const t0=ac.currentTime,g=ac.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(1,t0+6);g.connect(musBus);musGain=g;source='night';
  const nodes=[],drone=(w,f,v,lp,lf,depth)=>{const o=ac.createOscillator(),fl=ac.createBiquadFilter(),vg=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();o.type=w;o.frequency.value=f;fl.type='lowpass';fl.frequency.value=lp;fl.Q.value=1.2;vg.gain.value=v;l.frequency.value=lf;lg.gain.value=v*depth;l.connect(lg);lg.connect(vg.gain);o.connect(fl);fl.connect(vg);vg.connect(g);vg.connect(rev);o.start();l.start();nodes.push(o,l)};
  drone('sine',73.42,.07,220,.031,.35);drone('triangle',73.9,.026,170,.043,.6);drone('sine',110.2,.016,260,.037,.7);drone('sine',36.71,.05,90,.02,.3);
  const w=ac.createBufferSource();w.buffer=pinkB;w.loop=true;const wf=ac.createBiquadFilter(),wg=ac.createGain(),wl=ac.createOscillator(),wlg=ac.createGain(),wl2=ac.createOscillator(),wlg2=ac.createGain();
  wf.type='bandpass';wf.frequency.value=250;wf.Q.value=.9;wg.gain.value=.02;wl.frequency.value=.055;wlg.gain.value=130;wl2.frequency.value=.07;wlg2.gain.value=.012;wl.connect(wlg);wlg.connect(wf.frequency);wl2.connect(wlg2);wlg2.connect(wg.gain);w.connect(wf);wf.connect(wg);wg.connect(g);w.start();wl.start();wl2.start();nodes.push(w,wl,wl2);
  const h=ac.createBufferSource();h.buffer=noiseB;h.loop=true;const hf=ac.createBiquadFilter(),hg=ac.createGain(),hl=ac.createOscillator(),hlg=ac.createGain();hf.type='bandpass';hf.frequency.value=1900;hf.Q.value=1.4;hg.gain.value=.003;hl.frequency.value=.11;hlg.gain.value=.003;hl.connect(hlg);hlg.connect(hg.gain);h.connect(hf);hf.connect(hg);hg.connect(g);h.start();hl.start();nodes.push(h,hl);
  genNodes=nodes;let step=0;
  const sched=()=>{if(!ok())return;const t=ac.currentTime+.05;
   if(step%8==3){const o=ac.createOscillator(),og=ac.createGain();o.type='sine';o.frequency.setValueAtTime(58,t);o.frequency.exponentialRampToValueAtTime(34,t+.9);og.gain.setValueAtTime(.0001,t);og.gain.linearRampToValueAtTime(.16,t+.05);og.gain.exponentialRampToValueAtTime(.0001,t+1.3);o.connect(og);og.connect(g);og.connect(rev);o.start(t);o.stop(t+1.5)}
   if(Math.random()<.4){const sc=[D[0],D[1],D[3],D[4],D[7]],f=sc[Math.floor(Math.random()*sc.length)]/(Math.random()<.55?2:1);note(f,t+Math.random()*.6,.05+Math.random()*.02,3.6);
    if(Math.random()<.35)note(f*(Math.random()<.5?1.0595:1.4983),t+1.1+Math.random()*.5,.03,3)}
   if(Math.random()<.22){for(let i=0;i<5;i++){const s=ac.createBufferSource();s.buffer=noiseB;const bp=ac.createBiquadFilter(),cg_=ac.createGain(),tt=t+.2+i*.075;bp.type='bandpass';bp.frequency.value=4300;bp.Q.value=9;cg_.gain.setValueAtTime(.0001,tt);cg_.gain.linearRampToValueAtTime(.009,tt+.01);cg_.gain.exponentialRampToValueAtTime(.0001,tt+.035);s.connect(bp);bp.connect(cg_);cg_.connect(g);s.start(tt,Math.random());s.stop(tt+.05)}}
   if(Math.random()<.06){const o=ac.createOscillator(),lp=ac.createBiquadFilter(),og=ac.createGain();o.type='triangle';o.frequency.setValueAtTime(310,t);o.frequency.exponentialRampToValueAtTime(175,t+2.6);lp.type='lowpass';lp.frequency.value=620;og.gain.setValueAtTime(.0001,t);og.gain.linearRampToValueAtTime(.022,t+.8);og.gain.exponentialRampToValueAtTime(.0001,t+2.8);o.connect(lp);lp.connect(og);og.connect(g);og.connect(rev);o.start(t);o.stop(t+3)}
   step++};
  sched();genTimer=setInterval(sched,1700)}
 function setMood(m){window.DT_MOOD=m;if(!ac)return;if(m==='night'){if(source!=='night')playNight()}else{loadMusic.done=0;source='none';loadMusic()}}
"""

def _p(js, a, b, name, warn, count=1, regex=False, required=True):
    if regex:
        n = len(re.findall(a, js, flags=re.S))
        if n: js = re.sub(a, lambda m: b, js, count=count, flags=re.S)
    else:
        n = js.count(a)
        if n: js = js.replace(a, b, count)
    if not n and required: warn.append('  ! Nacht-Patch nicht angewendet: ' + name)
    return js

def night_features(js, warn):
    js = _p(js, "wel:{n:'Taufänger',c:35,hp:90,bt:5,p:-1,w:4,s:'Liefert Wasser fürs ganze Netz und ist Trinkstelle für Arbeiter (Ausbau: mehr).'}};",
      "wel:{n:'Taufänger',c:35,hp:90,bt:5,p:-1,w:4,s:'Liefert Wasser fürs ganze Netz und ist Trinkstelle für Arbeiter (Ausbau: mehr).'},\n"
      " fak:{n:'Fackelturm',c:28,hp:80,bt:4,p:-2,w:0,s:'Erhellt bei Nacht die Gebäude ringsum (Radius ähnlich der Raffinerie). Verbraucht 2 Strom. Ausbau: mehr Licht.'}};", 'B.fak', warn)
    js = _p(js, "wel:'Taufänger'};", "wel:'Taufänger',fak:'Fackelturm'};", 'BL.fak', warn)
    js = _p(js, "wel:'+2 Wasser · größerer Tank'};", "wel:'+2 Wasser · größerer Tank',fak:'Licht-Radius +0,8 Felder'};", 'UT.fak', warn)
    js = _p(js, "wel:{m:'Wasserquelle fürs Netz und Trinkstelle für Arbeiter.',n:resTxt('wel')},",
      "wel:{m:'Wasserquelle fürs Netz und Trinkstelle für Arbeiter.',n:resTxt('wel')},\n   fak:{m:'Erhellt bei Nacht die Gebäude ringsum – das Licht flackert und läuft am Rand sanft aus. Ausbau vergrößert den Radius.',n:resTxt('fak')},", 'UNL.fak', warn, required=False)
    js = _p(js, "b.k=='wel'?'💧 +'+resW(n):'Stufe '+(lv+1)}", "b.k=='wel'?'💧 +'+resW(n):b.k=='fak'?'◎ '+torchR(lv).toFixed(1).replace('.',','):'Stufe '+(lv+1)}", 'upInfo', warn)
    js = _p(js, "else if(done&&b.k=='wel')c2=dcell(IDRP,", "else if(done&&b.k=='fak')c2=dcell(IFLM,'Licht','◎ '+torchR(lv).toFixed(1).replace('.',','),'',!!b.off);\n  else if(done&&b.k=='wel')c2=dcell(IDRP,", 'Info-Zelle', warn)
    js = _p(js, "const IUP=", "const IFLM='<svg viewBox=\"0 0 24 24\" width=\"27\" height=\"27\"><path d=\"M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z\" fill=\"#ffb347\" stroke=\"#8a3a1a\" stroke-width=\"1.1\"/><rect x=\"9\" y=\"17\" width=\"6\" height=\"4\" rx=\"1\" fill=\"#6a4a30\"/></svg>';\n const IUP=", 'IFLM', warn)
    marker = "/* ---------- Atmosphäre: dezente Vignette"
    js = _p(js, marker, NIGHT_JS + SPRITE_JS + "\n" + marker, 'Nacht-Modul', warn)
    js = _p(js, "L=lvFor(i);L.E=Math.round(erate(L.wv));", "L=lvFor(i);L.E=Math.round(erate(L.wv));NT.setup();", 'start() setup', warn)
    js = _p(js, "calcNet();UI.reset();UI.openInfo(bl[3])}", "NT.pre();calcNet();UI.reset();UI.openInfo(bl[3])}", 'Start-Gebäude (pre)', warn)
    js = _p(js, "function draw(){x.setTransform(DPR,0,0,DPR,0,0);x.globalAlpha=1;x.lineCap='butt';x.lineJoin='miter';", "function draw(){x.setTransform(DPR,0,0,DPR,0,0);x.globalAlpha=1;x.lineCap='butt';x.lineJoin='miter';NT.frame();", 'draw() frame', warn)
    js = _p(js, "tileDyn(t,px,py);if(t.f&&t.t==3&&t.w>0&&t.p>.02)tmT.push(t)}", "tileDyn(t,px,py);NT.tile(t,px,py);if(t.f&&t.t==3&&t.w>0&&t.p>.02)tmT.push(t)}", 'Kachel-Licht', warn)
    js = _p(js, "if(t.s==2&&!t.qs&&!bl[K(c,r)]&&adj(c,r,true)){rr(c*T+6,", "if(t.s==2&&!t.qs&&!bl[K(c,r)]&&adj(c,r,true)){NT.lit(c*T+T/2,BY-(r+.5-camS)*T,T*.62,.5);rr(c*T+6,", 'Bau-Raster-Licht', warn)
    js = _p(js, "for(const q of pk)drawPkt(q);", "for(const q of pk)drawPkt(q);\n NT.apply();", 'Dunkelheit anwenden', warn)
    js = _p(js, "function drawBuilding(b){const px=(b.c+.5)*T,py=BY-(b.r-camS)*T-T*.1,s=T,sp_=SPR[b.k];if(!sp_)return;", "function drawBuilding(b){const px=(b.c+.5)*T,py=BY-(b.r-camS)*T-T*.1,s=T,sp_=SPR[b.k];if(!sp_)return;NT.build(b,px,py,s);", 'Gebäude-Licht', warn)
    js = _p(js, "function drawUnit(u){const px=u.x*T+(u.kb||0)*T,py=SY(u.y)-(u.hz||0)*T;", "function drawUnit(u){const px=u.x*T+(u.kb||0)*T,py=SY(u.y)-(u.hz||0)*T;NT.unit(u,px,py);", 'Einheiten-Licht', warn)
    js = _p(js, "function drawEnemy(e){if(e.hide)return;const px=e.x*T+(e.kb||0)*T,py=SY(e.y)-(e.hz||0)*T;", "function drawEnemy(e){if(e.hide)return;const px=e.x*T+(e.kb||0)*T,py=SY(e.y)-(e.hz||0)*T;NT.enemy(e,px,py);", 'Feind-Licht', warn)
    js = _p(js, "const px=w.x*T+kx,py=SY(w.y)-hop,s=T*.62,hurt_=w.hp<w.mx-.01;", "const px=w.x*T+kx,py=SY(w.y)-hop,s=T*.62,hurt_=w.hp<w.mx-.01;NT.worker(w,px,py);", 'Arbeiter-Licht', warn)
    js = _p(js, "const ph=live?tm*.7*PR:0,hub=bld||arms.length!=2,polys=arms.length?centerPolys(arms):[];", "const ph=live?tm*.7*PR:0,hub=bld||arms.length!=2,polys=arms.length?centerPolys(arms):[];NT.belt(b,c,r,px,py,live);", 'Band-Licht', warn)
    js = _p(js, "function drawPkt(q){const s=pktPos(q);if(!s)return;pktArt(q.kind,s[0],s[1],T*1.2)}", "function drawPkt(q){const s=pktPos(q);if(!s)return;pktArt(q.kind,s[0],s[1],T*1.2);NT.pkt(q,s)}", 'Paket-Licht', warn)
    js = _p(js, "for(const i of[-1,1]){const ex=hx+i*R*.5,ey=hy-R*.72;", "for(const i of[-1,1]){const ex=hx+i*R*.5,ey=hy-R*.72;NT.eye(ex,ey,R,mood);", 'Wurm-Augen', warn)
    js = _p(js, "function battleBG(){const k=CW+'x'+VH+'x'+DPR;", "function battleBG(){if(NT.dark()>.3)return NT.battleSky();const k=CW+'x'+VH+'x'+DPR;", 'Kampf-Nachthimmel', warn)
    js = _p(js, r"drawFX\(1\);\n for\(const p of b\.p\)", "drawFX(1);\n NT.battle(b,X,Y);\n for(const p of b.p)", 'Kampf-Licht', warn, regex=True)
    js = _p(js, "lightFX(f0,GW);x.drawImage(VIGc,f0,0,GW,VH);", "if(!NT.night())lightFX(f0,GW);x.drawImage(VIGc,f0,0,GW,VH);", 'Sonnenlicht aus', warn)
    js = _p(js, "x.globalAlpha=w.a*(.7+.3*Math.sin(tm*w.f*1.7+w.ph*2))*fade;", "x.globalAlpha=w.a*(.7+.3*Math.sin(tm*w.f*1.7+w.ph*2))*fade*NT.fogK();", 'Nebel dämpfen', warn)
    js = _p(js, "async function loadMusic(){", MUSIC_JS + " async function loadMusic(){", 'playNight', warn)
    js = _p(js, "if(source!='none'&&loadMusic.done)return;loadMusic.done=1;", "if(window.DT_MOOD==='night'){if(source!=='night'){loadMusic.done=1;playNight()}return}\n   if(source!='none'&&loadMusic.done)return;loadMusic.done=1;", 'loadMusic night', warn)
    js = _p(js, "return{init,resume,snd,loadMusic,", "return{init,resume,snd,loadMusic,mood:setMood,", 'AU.mood', warn)
    return js
