/* Gemeinsame Film-Engine für alle Dünenturm-Filme (Voxel-Wüste, Objekte, Würmer, Synth-Audio) */
const SUN={e:.1,a:1},STAR={b:0};let TINT='';
const $=i=>document.getElementById(i),c=$('c'),g=c.getContext('2d'),tc=document.createElement('canvas'),tg=tc.getContext('2d'),bc=document.createElement('canvas'),bg=bc.getContext('2d');
const M=512,PI=Math.PI,TAU=PI*2,HM=new Float32Array(M*M),SH=new Float32Array(M*M),CX=256,CZ=256,PL=14;
const cl=(v,a=0,b=1)=>v<a?a:v>b?b:v,mx=(a,b,t)=>a+(b-a)*t,S=(a,b,t)=>{t=cl((t-a)/(b-a));return t*t*(3-2*t)};
const hash=n=>{n=Math.sin(n*127.1)*43758.5453;return n-Math.floor(n)},rg=a=>`rgb(${a.join()})`,lc=(a,b,t)=>a.map((v,i)=>(v+(b[i]-v)*t)|0);
/* ---------- Wüste: Dünen-Höhenkarte (periodisch) ---------- */
for(let z=0;z<M;z++)for(let x=0;x<M;x++){
 const w=x+16*Math.sin(TAU*3*z/M),v=z+12*Math.sin(TAU*2*x/M),R=(a,b,p)=>1-Math.abs(Math.sin(TAU*(a*w+b*v)/M+p));
 let h=34*R(2,1,0)+14*R(5,3,1.3)+6*R(11,7,2.1)+4*Math.sin(TAU*(x*2+z)/M);
 HM[z*M+x]=mx(PL,h,S(55,110,Math.hypot(x-CX,z-CZ)))}
for(let z=0;z<M;z++)for(let x=0;x<M;x++){
 const i=z*M+x,dx=HM[z*M+((x+1)&511)]-HM[z*M+((x-1)&511)],dz=HM[((z+1)&511)*M+x]-HM[((z-1)&511)*M+x],n=Math.hypot(dx/2,1,dz/2);
 SH[i]=cl(((-dx/2*.62+.5-dz/2*.6)/n-.1)*1.7+(hash(x*3.1+z*57.7)-.5)*.05)}
const ST=[[0,[42,18,68]],[.33,[120,48,80]],[.6,[208,106,53]],[.85,[255,168,92]],[1,[255,226,170]]],LR=new Uint8Array(256),LG=new Uint8Array(256),LB=new Uint8Array(256);
for(let i=0;i<256;i++){const f=i/255;let j=1;while(j<4&&ST[j][0]<f)j++;const a=ST[j-1],b=ST[j],t=(f-a[0])/(b[0]-a[0]);LR[i]=mx(a[1][0],b[1][0],t);LG[i]=mx(a[1][1],b[1][1],t);LB[i]=mx(a[1][2],b[1][2],t)}
const smp=(A,x,z)=>{const X=Math.floor(x),Z=Math.floor(z),u=x-X,v=z-Z,x0=X&511,x1=(X+1)&511,z0=(Z&511)*M,z1=((Z+1)&511)*M;return mx(mx(A[z0+x0],A[z0+x1],u),mx(A[z1+x0],A[z1+x1],u),v)},gh=(x,z)=>smp(HM,x,z);
let IM,B32,YB,iw=0;
function terr(W,Hh,hor,fx,far,fc){
 if(iw!=W){IM=tg.createImageData(W,Hh);B32=new Uint32Array(IM.data.buffer);YB=new Int32Array(W);iw=W}
 B32.fill(0);YB.fill(Hh);const sn=Math.sin(cam.yaw),cs=Math.cos(cam.yaw),k=W/(2*fx);
 for(let z=1,dz=.5;z<far;z+=dz,dz+=.012){
  const lx=cam.x+z*(sn-cs*k),lz=cam.z+z*(cs+sn*k),dx=(z*2*cs*k)/W,dzz=(-z*2*sn*k)/W,sc=fx/z,f=Math.pow(z/far,1.4),ff=1-f;
  for(let i=0;i<W;i++){const px=lx+i*dx,pz=lz+i*dzz,y=((cam.y-smp(HM,px,pz))*sc+hor)|0;
   if(y<YB[i]){const q=(smp(SH,px,pz)*255)|0,col=0xff000000|(((LB[q]*ff+fc[2]*f)|0)<<16)|(((LG[q]*ff+fc[1]*f)|0)<<8)|((LR[q]*ff+fc[0]*f)|0);
    for(let yy=y<0?0:y;yy<YB[i];yy++)B32[yy*W+i]=col;YB[i]=y}}}
 tg.putImageData(IM,0,0);if(TINT){tg.globalCompositeOperation='source-atop';tg.fillStyle=TINT;tg.fillRect(0,0,W,Hh);tg.globalCompositeOperation='source-over'}g.drawImage(tc,0,0)}
/* ---------- Himmel ---------- */
const SKY=[[26,10,48],[106,42,90],[255,154,90]],STM=[[42,10,20],[122,40,40],[220,92,50]];
function sky(W,Hh,hor,fx,t,sto,sp,fc){
 let gr;
 if(sp){gr=g.createLinearGradient(0,0,0,Hh);gr.addColorStop(0,'#02010a');gr.addColorStop(1,'#1a0826')}
 else{gr=g.createLinearGradient(0,hor-fx*1.1,0,hor);gr.addColorStop(0,rg(lc(SKY[0],STM[0],sto)));gr.addColorStop(.55,rg(lc(SKY[1],STM[1],sto)));gr.addColorStop(1,rg(fc))}
 g.fillStyle=gr;g.fillRect(0,0,W,Hh);const pz=Math.max(1,W/420);
 for(let i=0;i<130;i++){const da=((hash(i)*TAU-cam.yaw+PI)%TAU+TAU)%TAU-PI,el=sp?hash(i+9)*1.8-.7:.3+hash(i+9);if(Math.abs(da)>1.2)continue;
  g.fillStyle=`rgba(255,240,220,${(sp?1:cl((el-.3)*2+STAR.b)*(1-sto))*(.55+.45*Math.sin(t*3+i))})`;g.fillRect(W/2+Math.tan(da)*fx,hor-Math.tan(el)*fx/Math.cos(da),pz*(hash(i+3)<.1?2:1),pz)}
 if(sp){const px=W*.62+Math.sin(t*.1)*W*.02,py=Hh*1.33-t*Hh*.012,R=Hh;
  gr=g.createRadialGradient(px,py,R*.95,px,py,R*1.14);gr.addColorStop(0,'rgba(255,170,90,.9)');gr.addColorStop(.35,'rgba(255,110,60,.3)');gr.addColorStop(1,'rgba(255,90,40,0)');g.fillStyle=gr;g.beginPath();g.arc(px,py,R*1.14,0,TAU);g.fill();
  gr=g.createRadialGradient(px-R*.35,py-R*.45,R*.1,px,py,R);gr.addColorStop(0,'#ffd9a0');gr.addColorStop(.45,'#d0702f');gr.addColorStop(.8,'#5a2048');gr.addColorStop(1,'#140620');g.fillStyle=gr;g.beginPath();g.arc(px,py,R,0,TAU);g.fill();
  g.save();g.clip();g.strokeStyle='rgba(60,20,40,.22)';g.lineWidth=R*.03;for(let j=0;j<5;j++){g.beginPath();g.ellipse(px-R*.1,py-R*(.2+j*.12),R*(.9-j*.05),R*.1,-.4,0,TAU);g.stroke()}g.restore();return}
 const mn=(az,el,r,a,b)=>{const da=((az-cam.yaw+PI)%TAU+TAU)%TAU-PI;if(Math.abs(da)>.9)return;const x=W/2+Math.tan(da)*fx,y=hor-Math.tan(el)*fx/Math.cos(da),q=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);q.addColorStop(0,a);q.addColorStop(1,b);g.fillStyle=q;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle='rgba(60,30,80,.25)';g.beginPath();g.arc(x+r*.25,y+r*.1,r*.22,0,TAU);g.arc(x-r*.35,y+r*.35,r*.14,0,TAU);g.fill()};
 mn(.45,.32,fx*.1,'#efe4ff','#6a5898');mn(1.15,.24,fx*.04,'#ffc890','#8a4a38');
 const da=.8-cam.yaw;if(Math.cos(da)>.1&&SUN.a>0){const x=W/2+Math.tan(da)*fx,y=hor-fx*SUN.e,k=1-sto*.6;
  g.globalCompositeOperation='lighter';gr=g.createRadialGradient(x,y,0,x,y,fx*1.1);gr.addColorStop(0,`rgba(255,200,130,${.6*k})`);gr.addColorStop(.25,`rgba(255,110,60,${.25*k})`);gr.addColorStop(1,'rgba(255,60,30,0)');g.fillStyle=gr;g.fillRect(0,0,W,Hh);g.globalCompositeOperation='source-over';
  gr=g.createRadialGradient(x,y,0,x,y,fx*.07);gr.addColorStop(0,'#fff');gr.addColorStop(.8,'#ffe0a8');gr.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,fx*.07,0,TAU);g.fill()}}
/* ---------- 3D-Objekte ---------- */
let P,cam={},Q=[],WD=640;
const setP=(W,Hh,hor,fx)=>{const sn=Math.sin(cam.yaw),cs=Math.cos(cam.yaw);WD=W;P=(x,y,z)=>{const dx=x-cam.x,dz=z-cam.z,zz=dx*sn+dz*cs;if(zz<2)return null;const s=fx/zz;return[W/2+(dx*cs-dz*sn)*s,hor+(cam.y-y)*s,s,zz]}};
function ball(x,y,z,r,a,b,d,cy){const p=P(x,y,z);if(!p)return;Q.push([p[3],()=>{const R=r*p[2];if(cy!=null){g.save();g.beginPath();g.rect(0,0,WD,cy);g.clip()}
 const q=g.createRadialGradient(p[0]-R*.35,p[1]-R*.4,R*.1,p[0],p[1],R*1.05);q.addColorStop(0,a);q.addColorStop(.6,b);q.addColorStop(1,d);g.fillStyle=q;g.beginPath();g.arc(p[0],p[1],R,0,TAU);g.fill();if(cy!=null)g.restore()}])}
function glow(x,y,z,r,col,a,add){const p=P(x,y,z);if(!p)return;Q.push([p[3]-.5,()=>{const R=r*p[2],q=g.createRadialGradient(p[0],p[1],0,p[0],p[1],R);q.addColorStop(0,`rgba(${col},${a})`);q.addColorStop(1,`rgba(${col},0)`);if(add)g.globalCompositeOperation='lighter';g.fillStyle=q;g.fillRect(p[0]-R,p[1]-R,R*2,R*2);g.globalCompositeOperation='source-over'}])}
function shad(x,z,r){const p=P(x,gh(x,z),z);if(!p)return;Q.push([p[3]+3,()=>{g.fillStyle='rgba(20,6,24,.38)';g.beginPath();g.ellipse(p[0],p[1],r*p[2],r*p[2]*.3,0,0,TAU);g.fill()}])}
function dust(x,z,t0,n,rad,life,ht,sz,t){const y0=gh(x,z);for(let i=0;i<n;i++){const u=(t-t0-hash(i)*.5)/life;if(u<0||u>1)continue;const a=hash(i+7)*TAU,r=u*rad*(.4+hash(i+3));glow(x+Math.cos(a)*r,y0+2+u*ht*hash(i+5),z+Math.sin(a)*r,(4+u*14)*sz,'226,176,120',.55*(1-u))}}
function box(x,z,w,d,h,col,y0){if(h<.05)return;const V=[];for(let i=0;i<8;i++){const p=P(x+(i&1?w:-w)/2,y0+(i&2?h:0),z+(i&4?d:-d)/2);if(!p)return;V.push(p)}
 const F=[[[0,1,3,2],0,0,-1],[[4,5,7,6],0,0,1],[[0,4,6,2],-1,0,0],[[1,5,7,3],1,0,0],[[2,3,7,6],0,1,0]],mid=P(x,y0+h/2,z);if(!mid)return;
 Q.push([mid[3],()=>{for(const[ix,nx,ny,nz]of F){if(nx*(cam.x-x-nx*w/2)+ny*(cam.y-y0-h*(ny?1:.5))+nz*(cam.z-z-nz*d/2)<=0)continue;const f=.3+.7*cl(nx*.62+ny*.5+nz*.6+.25);
  g.fillStyle=`rgb(${col[0]*f|0},${col[1]*f|0},${col[2]*f|0})`;g.strokeStyle='rgba(20,8,24,.55)';g.lineWidth=1;g.beginPath();ix.forEach((k,j)=>j?g.lineTo(V[k][0],V[k][1]):g.moveTo(V[k][0],V[k][1]));g.closePath();g.fill();g.stroke()}}])}
function fig(x,y,z,h,suit,vis,ph){const a=P(x,y+Math.abs(Math.sin(ph))*h*.07,z),b=P(x,y+h*.78,z);if(!a||!b)return;Q.push([a[3],()=>{g.lineCap='round';g.strokeStyle=suit;g.lineWidth=Math.max(1,h*a[2]*.42);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();const R=Math.max(1,h*a[2]*.2);g.fillStyle=suit;g.beginPath();g.arc(b[0],b[1]-R*.2,R,0,TAU);g.fill();g.fillStyle=vis;g.fillRect(b[0]-R*.55,b[1]-R*.5,R*1.1,R*.55)}])}
function ship(t,s,eng,fire){const[x,z,y,tl]=s,L=46,ax=Math.sin(tl),ay=Math.cos(tl),pt=(u,sd,zz)=>[x+ax*u+Math.cos(tl)*sd,y+ay*u-Math.sin(tl)*sd,z+zz];
 if(y<PL+1)shad(x,z,9);
 for(let i=0;i<=12;i++){const u=i/12,r=5.4*(u<.62?1:Math.sqrt(Math.max(.02,1-((u-.62)/.38)**2))),o=i==4||i==8;ball(x+ax*u*L,y+ay*u*L,z,r,o?'#ffb347':'#fff4dc',o?'#c4501f':'#b9a090',o?'#4a1a10':'#3a2a44')}
 for(const[sd,zz]of[[1,0],[-1,0],[0,1],[0,-1]]){const A=P(...pt(2,sd*5.4,zz*5.4)),B=P(...pt(-3,sd*13,zz*13)),C=P(...pt(20,sd*5.4,zz*5.4));if(A&&B&&C)Q.push([A[3],()=>{g.fillStyle='#d0603a';g.strokeStyle='#4a1a10';g.lineWidth=1;g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.lineTo(C[0],C[1]);g.closePath();g.fill();g.stroke()}])}
 if(eng){for(let k=0;k<fire;k++){const u=-k*3.1-2,r=(5.4*(1-k/fire)+1)*(.85+.3*hash(t*30+k));glow(x+ax*u,y+ay*u,z,r*1.5,k<fire*.35?'255,245,210':'255,150,50',.8*(1-k/fire)+.1,1)}
  glow(x,y,z,fire>12?34:20,'255,130,50',.45,1)}
 else{glow(...pt(L+2,0,0),4,'114,220,255',.5+.5*Math.sin(t*4),1);for(const u of[.2,.32,.44])glow(...pt(u*L,0,0),1.4,'255,200,110',.9,1)}}
function worm(w,t){const k=w.h;if(k<.02)return;const gy=gh(w.x,w.z),dx=cam.x-w.x,dz=cam.z-w.z,dl=Math.hypot(dx,dz)||1,N=16,A=[],pb=P(w.x,gy,w.z);
 for(let i=0;i<=N;i++){const f=i/N,sw=Math.sin(t*.9+f*2.6+w.x)*f*w.R*.8,bd=f*f*w.R*3.4;A.push(w.sp?w.sp(f):[w.x+sw+dx/dl*bd,gy-2+(w.H*k+2)*f,w.z+dz/dl*bd])}
 shad(w.x,w.z,w.R*1.6*Math.min(1,k*2));
 for(let i=0;i<=N;i++){const q=A[i],f=i/N;ball(q[0],q[1],q[2],w.R*(1-.25*f)*(i==N?1.05:1),`hsl(${30+i*1.6},55%,${62-i}%)`,`hsl(${22+i*1.6},52%,${38-i*.6}%)`,'hsl(14,50%,13%)',w.sp?gy2(q):i<6&&pb?pb[1]+2:null)}
 const a=P(...A[N]),b=P(...A[N-1]),n=P(...A[N-3]);if(!a||!b)return;const Rr=w.R*a[2],th=Math.atan2(a[1]-b[1],a[0]-b[0]);
 if(w.tame&&n)Q.push([n[3]-.2,()=>{g.strokeStyle='#2fe0c0';g.lineWidth=Math.max(1,w.R*n[2]*.2);g.beginPath();g.ellipse(n[0],n[1],w.R*n[2]*1.1,w.R*n[2]*.38,0,0,TAU);g.stroke()}]),glow(A[N-3][0],A[N-3][1],A[N-3][2],w.R*.9,'60,240,200',.7,1);
 Q.push([a[3]-1,()=>{g.save();g.translate(a[0],a[1]);g.rotate(th-PI/2);g.scale(1,.72);let q=g.createRadialGradient(-Rr*.3,-Rr*.3,Rr*.1,0,0,Rr*1.1);q.addColorStop(0,'#d99a78');q.addColorStop(1,'#7a2a22');g.fillStyle=q;g.beginPath();g.arc(0,0,Rr,0,TAU);g.fill();
  g.fillStyle='#14040a';g.beginPath();g.arc(0,0,Rr*.78,0,TAU);g.fill();q=g.createRadialGradient(0,0,0,0,0,Rr*.78);q.addColorStop(0,`rgba(255,${w.tame?200:130},60,${.55+.35*Math.sin(t*5)})`);q.addColorStop(1,'rgba(255,80,30,0)');g.fillStyle=q;g.fill();g.fillStyle='#f5ead2';
  for(const[n,ro,ri]of[[18,.76,.46],[12,.56,.26],[7,.34,.08]])for(let i=0;i<n;i++){const an=i/n*TAU+(ro==.56?.2:0)+Math.sin(t*3+i)*.03,c0=Math.cos(an),s0=Math.sin(an);g.beginPath();g.moveTo(c0*Rr*ro-s0*Rr*.07,s0*Rr*ro+c0*Rr*.07);g.lineTo(c0*Rr*ri,s0*Rr*ri);g.lineTo(c0*Rr*ro+s0*Rr*.07,s0*Rr*ro-c0*Rr*.07);g.fill()}
  g.restore();g.fillStyle=w.tame?'#fff':'#ff3a2a';for(const sd of[-1,1]){g.beginPath();g.arc(a[0]+sd*Rr*.5,a[1]-Rr*.85,Math.max(1,Rr*.1),0,TAU);g.fill()}}])}
/* ---------- Titelbild: Staubwirbel + Sandschwimmer ---------- */
function gy2(q){const p=P(q[0],gh(q[0],q[2]),q[2]);return p?p[1]+2:null}
function titleFx(t){const sn=Math.sin(cam.yaw),cs=Math.cos(cam.yaw);
 for(let d=0;d<3;d++){const D=[80,125,170][d],u=(t*.03*(1+d*.3)+d*.37)%1,off=(u*2-1)*.95*D,al=Math.sin(u*PI),bx=cam.x+sn*D+cs*off,bz=cam.z+cs*D-sn*off,by=gh(bx,bz);
  for(let k=0;k<16;k++){const a=k*.7+t*(3+d)+d*2,r=(1.2+k*.5)*(1+d*.15);glow(bx+Math.cos(a)*r+Math.sin(k*.35+t*.8)*k*.5,by+k*2.6,bz+Math.sin(a)*r,3+k*.55,'226,170,110',.38*al*(1-k/20))}}
 const ph=((t+23)%26)/10;if(ph>=1)return;
 const sh=-140+280*ph,Lw=104,Dd=115,pos=s=>[cam.x+sn*Dd+cs*s,cam.z+cs*Dd-sn*s],h0=pos(sh);
 for(const e of[-120,-40,40,120]){const dd=sh-e;if(dd>-10&&dd<Lw){const[x,z]=pos(e),b=dd<20;glow(x,gh(x,z)+4,z,b?22:12,'230,180,125',b?.55:.3)}}
 worm({x:h0[0],z:h0[1],R:7.5,H:0,tame:0,h:1,sp:f=>{const s=sh-(1-f)*Lw,[x,z]=pos(s);return[x,gh(x,z)+36*Math.pow(Math.max(0,Math.sin(PI*(s+40)/80)),.8)-7,z]}},t)}
/* ---------- Ton: komplett synthetisch (WebAudio) ---------- */
let AC,MB,FB,TB,NB,O,on=0,EV=[],ei=0,tn=0,ai=0;
const mt=m=>440*2**((m-69)/12);
function aInit(){AC=new(window.AudioContext||window.webkitAudioContext)();
 const cp=AC.createDynamicsCompressor(),rv=AC.createConvolver(),wt=AC.createGain(),L=AC.sampleRate*3.8|0,ib=AC.createBuffer(2,L,AC.sampleRate);
 for(let h=0;h<2;h++){const d=ib.getChannelData(h);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.4)}
 rv.buffer=ib;wt.gain.value=.5;cp.threshold.value=-16;cp.ratio.value=4;MB=AC.createGain();MB.gain.value=.85;MB.connect(cp);MB.connect(rv);rv.connect(wt);wt.connect(cp);cp.connect(AC.destination);
 NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const nd=NB.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 TB=AC.createGain();TB.gain.value=0;TB.connect(MB);
 for(const[f,dt]of[[73.4,-7],[73.4,7],[36.7,0]]){const o=AC.createOscillator(),F=AC.createBiquadFilter(),G=AC.createGain();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;F.frequency.value=260;G.gain.value=.05;o.connect(F);F.connect(G);G.connect(TB);o.start()}
 const w=AC.createBufferSource(),wf=AC.createBiquadFilter(),wl=AC.createOscillator(),wg=AC.createGain(),wo=AC.createGain();w.buffer=NB;w.loop=true;wf.type='bandpass';wf.frequency.value=500;wf.Q.value=1.2;wl.frequency.value=.13;wg.gain.value=300;wl.connect(wg);wg.connect(wf.frequency);wo.gain.value=.22;w.connect(wf);wf.connect(wo);wo.connect(TB);w.start();wl.start()}
const E=(o,t,v,a,h,r)=>{const g=AC.createGain(),p=g.gain;p.setValueAtTime(.0001,t);p.exponentialRampToValueAtTime(v,t+a);p.setValueAtTime(v,t+a+h);p.exponentialRampToValueAtTime(.0001,t+a+h+r);g.connect(o);return g};
function V(o,t,f,{w='sawtooth',v=.2,a=.01,h=0,r=.3,f2,lp,l2,det=0,vb=0}={}){const e=t+a+h+r+.05,g=E(o,t,v,a,h,r);let d=g;if(lp){const F=AC.createBiquadFilter();F.frequency.setValueAtTime(lp,t);F.frequency.exponentialRampToValueAtTime(l2||lp,e);F.connect(g);d=F}
 const x=AC.createOscillator();x.type=w;x.frequency.setValueAtTime(f,t);if(f2)x.frequency.exponentialRampToValueAtTime(f2,e);x.detune.value=det;if(vb){const L=AC.createOscillator(),G=AC.createGain();L.frequency.value=5.5;G.gain.value=vb;L.connect(G);G.connect(x.detune);L.start(t);L.stop(e)}x.connect(d);x.start(t);x.stop(e)}
function N(o,t,d,v,ty,f1,f2,q=1,a=.02,r){r=r||d*.4;const s=AC.createBufferSource(),F=AC.createBiquadFilter();s.buffer=NB;s.loop=true;F.type=ty;F.Q.value=q;F.frequency.setValueAtTime(f1,t);F.frequency.exponentialRampToValueAtTime(f2,t+d+a+r);s.connect(F);F.connect(E(o,t,v,a,d,r));s.start(t,Math.random());s.stop(t+d+a+r+.05)}
const thump=(T,v=.9,f=80)=>{V(O,T,f,{w:'sine',v,a:.002,r:.8,f2:30});N(O,T,.05,v*.5,'bandpass',1200,200,1,.001,.1)},
 boom=(T,v=1)=>{V(O,T,72,{w:'sine',v,a:.004,r:3.8,f2:22});N(O,T,1.8,v*.8,'lowpass',3000,50,.7,.005,1.2)},
 brass=(T,f,d,v)=>{for(const x of[-9,0,9])V(O,T,f,{v:v/3,a:d*.28,h:d*.35,r:d*.4,lp:f*1.3,l2:f*5,det:x})},
 choir=(T,ns,d,v)=>{for(const m of ns)for(const x of[-10,10])V(O,T,mt(m),{v:v/ns.length/2,a:1.1,h:d-1,r:1.6,lp:1100,l2:1500,det:x,vb:14})},
 pluck=(T,m,v)=>V(O,T,mt(m),{v,a:.004,r:.3,lp:3200,l2:400}),
 whoosh=(T,d,v,u)=>N(O,T,d,v,'bandpass',u?200:5000,u?6000:200,1.5,d*.5,.1),
 zap=(T,f,v)=>V(O,T,f,{w:'square',v,a:.001,r:.16,f2:f/7,lp:6000,l2:600}),
 clank=(T,f)=>{V(O,T,f,{w:'triangle',v:.12,a:.001,r:.6});V(O,T,f*1.51,{w:'triangle',v:.07,a:.001,r:.4});N(O,T,.04,.15,'bandpass',4000,2000,2,.001,.08)},
 roar=(T,v=.7)=>{V(O,T,74,{v,a:.15,h:1.2,r:1.8,f2:36,lp:520,l2:140,vb:70});V(O,T,148,{w:'sine',v:v*.7,a:.1,h:1,r:1.6,f2:50});N(O,T,1.4,v*.5,'lowpass',1600,120,1,.1,1.2);V(O,T+.15,420,{v:v*.12,a:.1,h:.4,r:1.6,f2:95,lp:2200,l2:300,vb:80})},
 braam=(T,v=.9)=>{for(const[m,x]of[[26,0],[38,6],[38,-6],[45,0],[50,9]])V(O,T,mt(m),{v:v/5,a:.08,h:2,r:2.8,lp:200,l2:2800,det:x})},
 crunch=T=>{N(O,T,.25,.5,'lowpass',1400,90,1,.002,.2);thump(T,.6,60)};
