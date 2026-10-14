(()=>{
'use strict';
const toMap=()=>{if(window.DTX)DTX.go('map');else location.href='../index.html#map'};
const W=7,$=id=>document.getElementById(id),cv=$('c');let x=cv.getContext('2d');
if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(a,b,w,h,r){r=Math.min(typeof r==='number'?r:(r&&r[0])||0,w/2,h/2);this.moveTo(a+r,b);this.arcTo(a+w,b,a+w,b+h,r);this.arcTo(a+w,b+h,a,b+h,r);this.arcTo(a,b+h,a,b,r);this.arcTo(a,b,a+w,b,r);this.closePath()};
const rnd=Math.random,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,K=(c,r)=>r*8+c,TAU=Math.PI*2;
const H=(a,b,i)=>{const v=Math.sin(a*127.1+b*311.7+i*74.7)*43758.5453;return v-Math.floor(v)};
const DV=[[1,0],[0,1],[-1,0],[0,-1]];            // Ost, Nord, West, Süd (y nach oben)
const RG=d=>[d[1],-d[0]];                          // rechte Hand relativ zur Fahrtrichtung
const pick=a=>a[Math.floor(rnd()*a.length)];
/* ---------- Speicher ---------- */
let SV={best:0,mv:.7,sv:.9,mus:1,hi:1,df:1,cl:0,rt:{}};
try{Object.assign(SV,JSON.parse(localStorage.getItem('dt3')||'{}'))}catch(e){}
const persist=()=>{try{localStorage.setItem('dt3',JSON.stringify(SV))}catch(e){}};
/* ---------- Daten ---------- */
const LV=window.DTLV||[];
const B={
 hub:{n:'Quartier',hp:260,p:4,w:0,s:'Zentrale. Fällt sie, ist alles verloren.'},
 cv:{n:'Fließband',c:3,hp:35,bt:.8,p:0,w:0,s:'Beidseitig: ✦ hinaus, Nachschub hinein. Verbraucht nichts.'},
 raf:{n:'Raffinerie',c:30,hp:120,bt:5,p:-2,w:-1,u:'sam',cap:2,s:'Sammler holen ✦ von Adern im Umkreis.'},
 kas:{n:'Kaserne',c:40,hp:130,bt:6,p:-1,w:-1,u:'war',cap:4,s:'Bildet Krieger aus.'},
 tur:{n:'Geschützturm',c:45,hp:110,bt:6,p:-2,w:-1,a:-2,s:'Schießt auf Feinde. Verbraucht Munition aus dem Netz.'},
 fab:{n:'Fabrik',c:60,hp:150,bt:8,p:-2,w:-1,a:4,u:'cra',cap:2,s:'Baut Crawler und produziert Munition fürs Netz.'},
 ene:{n:'Energiefeld',c:25,hp:80,bt:4,p:6,w:-1,s:'Erzeugt Strom fürs ganze Netz (Ausbau +50 %).'},
 wel:{n:'Taufänger',c:35,hp:90,bt:5,p:-1,w:4,s:'Liefert Wasser fürs ganze Netz und ist Trinkstelle für Arbeiter (Ausbau: mehr).'},
 fak:{n:'Fackelturm',c:28,hp:80,bt:4,p:-2,w:0,s:'Erhellt bei Nacht die Gebäude ringsum (Radius ähnlich der Raffinerie). Verbraucht 2 Strom. Ausbau: mehr Licht.'}};
/* ---------- Ressourcen: Strom ⚡ und Wasser 💧 als Plus/Minus-Werte ---------- */
const resP=b=>b.k=='ene'?B.ene.p*(1+.5*(b.lv||0)):B[b.k].p||0,resW=b=>b.k=='wel'?B.wel.w+2*(b.lv||0):B[b.k].w||0;
const resA=b=>B[b.k].a||0;
const rfmt=n=>n>0?'+'+n:n<0?'−'+(-n):'0',resTxt=k=>[B[k].p?'⚡ '+rfmt(B[k].p):'',B[k].w?'💧 '+rfmt(B[k].w):'',B[k].a?'Munition '+rfmt(B[k].a):''].filter(Boolean).join(' · ');
const BL={hub:'Quartier',cv:'Fließband',raf:'Raffinerie',kas:'Kaserne',tur:'Geschützturm',fab:'Fabrik',ene:'Energiefeld',wel:'Taufänger',fak:'Fackelturm'};
const UN={sam:{n:'Sammler',c:20,t:6,d:'holt ✦ von Adern'},war:{n:'Krieger',c:12,t:5,d:'⚔ schlägt Plünderer'},cra:{n:'Crawler',c:35,t:9,d:'⚔ knackt Panzer'}};
const WK={c:18,t:6,max:6};
Object.assign(B,{bore:{n:'Sandbohrer',c:65,hp:130,bt:7,p:0,w:-3,s:'Nur auf freigelegtem Treibsand. 3 Wasser, 1 Sand je 8 Sekunden. Sand zum Schmelzofen.'},smelt:{n:'Schmelzofen',c:85,hp:145,bt:8,p:-3,w:0,s:'Verbraucht 3 Strom und 1 gelieferten Sand pro Kristall. 7 Sekunden Schmelzzeit.'},crdep:{n:'Kristalldepot',c:40,hp:105,bt:5,p:0,w:0,s:'Lagert Energiekristalle und schickt sie zum Quartier. Dort 20 Geld je Kristall.'}});
Object.assign(BL,{bore:'Sandbohrer',smelt:'Schmelzofen',crdep:'Kristalldepot'});
const FS={war:{h:45,d:9,c:.7,r:.6,s:1.4},cra:{h:120,d:22,c:1.1,r:1.6,s:1},tur:{h:100,d:10,c:.6,r:3.2,s:0},hub:{h:200,d:5,c:1,r:2.2,s:0},sam:{h:40,d:0,c:1,r:0,s:.9},pl:{h:35,d:7,c:.8,r:.6,s:1.3},pz:{h:150,d:18,c:1.2,r:1.5,s:.8},br:{h:520,d:32,c:1.5,r:1.3,s:.55},wrm:{h:210,d:17,c:1.3,r:2,s:0}};
/* ---------- Schwierigkeit: 0 leicht · 1 mittel · 2 schwer (= Grundwerte) ---------- */
Object.assign(FS,{drn:{h:78,d:10,c:1.7,r:2.8,s:1.25},ali:{h:36,d:6,c:1.6,r:1.9,s:1.45}});
const FS0=JSON.parse(JSON.stringify(FS));
const DFN=['Leicht','Mittel','Schwer'],DFI=['🟢','🟡','🔴'],DFD=['Mega leicht: wenige und schwache Feinde, kaum Würmer, kürzere Level, viel Startgeld.','Etwas leichter als Schwer: weniger Feinde und Würmer, kürzere Level, mehr Startgeld.','Volle Herausforderung: viele Feinde, Raids und Würmer erwarten Dich in der Wüste.'];
const DFS=[
 {sp0:1.9,r0:2.2,rg:1.9,rm:1.9,rc:.4,ne:.2,ts:.35,gb:.35,ps:1.35,prk:.5,th:.35,wd:.35,dig:1.5,bld:1.4,eh:.55,ed:.6,es:.8,wf:.5,boss:0,raid:0,dh:-3,dr:-1,pt:1.8,hub:1.6,uh:1.3,hzd:.4,hzr:.8,wk:3},
 {sp0:1.35,r0:1.5,rg:1.4,rm:1.4,rc:.7,ne:.65,ts:.7,gb:.7,ps:1.15,prk:.75,th:.7,wd:.7,dig:1.2,bld:1.15,eh:.8,ed:.85,es:.92,wf:.75,boss:1,raid:.7,dh:-1,dr:0,pt:1.3,hub:1.25,uh:1.12,hzd:.75,hzr:1.15,wk:2},
 {sp0:1,r0:1,rg:1,rm:1,rc:1,ne:1,ts:1,gb:1,ps:1,prk:1,th:1,wd:1,dig:1,bld:1,eh:1,ed:1,es:1,wf:1,boss:1,raid:1,dh:0,dr:0,pt:1,hub:1,uh:1,hzd:1,hzr:1.5,wk:2}];
let DFc=DFS[1];
const scaleW=(ws,d)=>ws.map(w=>w.map(([k,n])=>[k,k=='br'?(d.boss?1:0):Math.max(k=='pl'?2:1,Math.round(n*d.wf))]).filter(([k,n])=>n>0)).filter(w=>w.length);
function lvFor(i,df){const b=LV[i],d=DFS[df==null?(SV.df==null?1:SV.df):df],L={...b};L.p={...b.p};
 L.p.sp=(b.p.sp||0)*d.ps;L.p.rk=(b.p.rk||0)*d.prk;for(const k of['ne','ts','gb'])if(b.p[k])L.p[k]=b.p[k]*d[k];
 L.sp0=Math.round(b.sp0*d.sp0)+40+(d.wk>2?18:0);L.r0=Math.round(b.r0*d.r0);L.rg=Math.round(b.rg*d.rg);L.rm=Math.round(b.rm*d.rm);L.rc=Math.max(1,Math.round(b.rc*d.rc));
 L.th=b.th*d.th;L.h=b.fixedHeight?b.h:Math.max(4,b.h+d.dh);L.rn=Math.max(2,b.rn+d.dr);L.wv=scaleW(b.wv,d);
 L.rd=b.rd&&d.raid?{h:Math.min(b.rd.h,L.h-1),w:scaleW(b.rd.w,{...d,wf:d.wf*(d.raid)}),d:0}:null;L.df=df==null?(SV.df==null?1:SV.df):df;return L}
function applyDF(){DFc=DFS[SV.df==null?1:SV.df];for(const k of['pl','pz','br','drn','ali']){const o=FS0[k];FS[k].h=Math.round(o.h*DFc.eh);FS[k].d=+(o.d*DFc.ed).toFixed(2);FS[k].s=+(o.s*DFc.es).toFixed(3)}
 for(const k of['war','cra','tur'])FS[k].h=Math.round(FS0[k].h*DFc.uh)}
const KIT={ // Waffen-Stile: ernst oder lustig
 war:[{id:'blade',tool:'sword',at:'slash',w:3},{id:'spear',tool:'spear',at:'thrust',w:2},{id:'mallet',tool:'mallet',at:'smash',fun:1,w:2,txt:'BONK!',sn:'bonk'},{id:'pan',tool:'pan',at:'smash',fun:1,w:2,txt:'KLONG!',sn:'klong'}],
 pl:[{id:'club',tool:'club',at:'smash',w:3,txt:'ZACK!'},{id:'dagger',tool:'dagger',at:'thrust',w:2},{id:'wrench',tool:'bigwrench',at:'smash',fun:1,w:2,txt:'BONK!',sn:'bonk'},{id:'chicken',tool:'chicken',at:'smash',fun:1,w:2,txt:'QUIEK!',sn:'squeak'}]};
const kitOf=k=>{const a=KIT[k];if(!a)return null;let t=0;for(const o of a)t+=o.w;let r=rnd()*t;for(const o of a){if((r-=o.w)<0)return o}return a[0]};
const SAY={w:{pet:['Wer ist ein feiner Wurm?','Kraul kraul…','Braver Wurm!','Na du Dicker!'],feed:['Hier, Gewürz!','Lecker, was?','Mampf schön!']},f:{atk:['Attacke!','Los!','Halt!','Für das Quartier!'],die:['Mein Hut!','Uff…','Aua!']},e:{atk:['Hehe!','Beute!','Mein Sand!','Hui!'],die:['Mama!','Wuaah!','Aua!'],worm:['Der hat mich gefressen!','Iiih, Schleim!','Mama!!','Nicht beißen!','Pfui, Wurmspucke!']}};
const MU={war:{pl:1.4,pz:.6,br:.6},cra:{pl:.8,pz:1.6,br:1.3},pz:{war:1.5,cra:.9},br:{war:1.5}},NM={pl:'Plünderer',pz:'Panzer',br:'Brecher'};
const UT={hub:'Arbeiter graben 30 % schneller',raf:'+1 Sammler · Reichweite +1,5 · mehr Fracht',ene:'+50 % Strom',cv:'',kas:'+1 Platz · Truppen +30 %',fab:'+1 Platz · Fahrzeuge +30 %',tur:'Schaden +40 %',wel:'+2 Wasser · größerer Tank',fak:'Licht-Radius +0,8 Felder'};
const DT={0:4.2,1:5.8,2:10.5,3:4.2,4:5,6:4.2,7:4.2},DV_=[1,.62,1.75];
const PAL=[['#f6cf8a','#d58f55','#8a4f26','#6a3a1e','#a2663a'],['#f2b274','#c9703c','#7a3a22','#5a2a1c','#8e4e30'],['#e8a8b0','#a65a7a','#5e2a50','#40203e','#7a4468'],['#cdbcf0','#7a6aa8','#3e3070','#2a2250','#5a5090']];
const WCOL=[['#7fb0d0','#33566e'],['#9cc878','#42602e'],['#e0a868','#7a5028'],['#d888a0','#6e3448'],['#78c8c0','#2a625c'],['#d8cc70','#665e2c']];
/* ---------- Zustand ---------- */
let DPR=1,VW=360,VH=640,T=50,BY=0,CW=360,OX=0,GW=360,RW=0,SIDE=false;
let L=LV[0],li=0,G=[],bl={},wk=[],un=[],en=[],pk=[],pa=[],fx=[],Q=[],ln=[];
let sp=0,tp=1,hh=1,off=0,camS=null,mode=0,phase='menu',pt=0,bt=null,sel=null,shk=0,wm=null,ds=0,tm=0,gt=0,paused=true,cmb=1,lastSp=-99,sw=40,wn=0,beltMode=false,flash=0,ndie=0,hudPos=[34,28],thirsty=0,over=null;
let RV=[],FXS=[],TW=[],sayT=-9;let sheetH=0,DOCKH=0,build_=null,armed=null;let NET=new Set(),PEND=new Set(),PAR={},SUP=4,DEM=0,PR=1,BO=0,numTip=0,RES={sP:4,sW:0,sA:0,dP:0,dW:0,dA:0,uP:0,uW:0,uA:0};
const bAt=(c,r)=>bl[K(c,r)];
const mkB=(k,c,r,bp)=>({k,c,r,hp:B[k].hp,mx:B[k].hp,lv:0,bp,bw:0,q:[],up:null,am:0,pend:0,stock:0,sc:0,tank:k=='wel'?2:0,tw:0,off:0,bo:++BO,cd:0,ph:rnd()*9,ot:0});
/* ---------- Gelände ---------- */
function gen(r){while(G.length<=r){const rr=G.length,row=[],p=L.p;for(let c=0;c<W;c++){let t=0,q=rnd(),a=0;const z=k=>q<(a+=p[k]||0);
 if(rr>2&&z('ne'))t=3;else if(rr>2&&z('ts'))t=6;else if(rr>1&&z('rk'))t=2;else if(rr>1&&z('sp'))t=1;else if(rr>1&&z('rl'))t=4;
 const v=rnd();row.push({t,c,r:rr,s:rr<2?2:0,p:0,f:0,q:0,w:0,v:v<.22?1:v<.4?2:0,st:0,cr:0,ck:''})}
 let hz=row.filter(o=>o.t==3||o.t==6||o.t==7);while(hz.length>3){hz.pop().t=0}G.push(row)}}
function n8(c,r,f){for(let a=-1;a<2;a++)for(let b=-1;b<2;b++){if(!a&&!b)continue;const t=G[r+b]&&G[r+b][c+a];if(t)f(t)}}
const nb=(c,r)=>{let n=0;n8(c,r,t=>{if(t.t==3)n++});return n};
const reachOf=lv=>3.5+1.5*(lv||0);
function veinsNear(cx,cy,R){let a=0,w=0,u=0;for(let r=Math.max(0,Math.floor(cy-R));r<=Math.min(G.length-1,Math.ceil(cy+R));r++)for(const t of G[r]){if(t.t!=1||Math.hypot(t.c+.5-cx,t.r+.5-cy)>R)continue;if(t.s==2){if(t.st>0)a++;else w++}else u++}return{a,w,u}}
const rev=(c,r)=>n8(c,r,t=>{if(t.s==0)t.s=1});
function syn(b){let n=0;for(const[a,d]of DV){const o=bl[K(b.c+a,b.r+d)];if(o&&o.bp>=1&&o.k!=b.k&&o.k!='cv'&&b.k!='cv')n++}return 1+.25*n}
const isLive=b=>NET.has(K(b.c,b.r)),isOn=b=>NET.has(K(b.c,b.r))&&!b.off;
const tw=(c,r)=>G[r]&&G[r][c];
/* ---------- Effekte ---------- */
function ft(a,b,t,c,big){fx.push({x:a,y:b,t,c:c||'#fff',l:big?1.9:1.4,m:big?1.9:1.4,big})}
function burst(a,b,n,c,sc){for(let i=0;i<n;i++)pa.push({x:a+(rnd()-.5)*.5,y:b,vx:(rnd()-.5)*2.4*(sc||1),vy:rnd()*2.5*(sc||1),l:.9,m:.9,c,s:.03+rnd()*.05})}
function dust(a,b,n){for(let i=0;i<n;i++)pa.push({x:a+(rnd()-.5)*.6,y:b+rnd()*.2,vx:(rnd()-.5)*.8,vy:.3+rnd()*.7,l:.8+rnd()*.5,m:1.2,c:'rgba(236,196,140,.5)',s:.06+rnd()*.07,soft:1,g:-.5})}
function spark(a,b,n){for(let i=0;i<n;i++)pa.push({x:a,y:b,vx:(rnd()-.5)*3.2,vy:.6+rnd()*2,l:.35+rnd()*.25,m:.5,c:rnd()<.5?'#fff0b0':'#ffb347',s:.025,g:3.5})}
function gain(a,b,n,tx){sp+=n;ft(a,b+.3,'+'+n+' ✦','#ffb347');if(tx)ft(a,b+.9,tx,'#fff27a');
 const X=a*T,Y=BY-(b-(camS||0))*T;for(let i=0;i<Math.min(9,2+n/4);i++){const m=.7+rnd()*.4;pa.push({fl:1,sx:X+(rnd()-.5)*20,sy:Y+(rnd()-.5)*20,l:m,m})}}
function toast(t,ok){const e=$('toast');e.firstChild.textContent=t;e.className='on'+(ok?' ok':'');clearTimeout(toast.h);toast.h=setTimeout(()=>e.className='',2200)}
/* ---------- Netz ---------- */
function calcNet(){
 NET=new Set();PEND=new Set();PAR={};const h=bl[3];if(!h)return;NET.add(3);const q=[3];
 while(q.length){const k=q.shift(),c=k&7,r=k>>3;for(const[dx,dy]of DV){const n=K(c+dx,r+dy),b=bl[n];if(b&&b.bp>=1&&!NET.has(n)&&c+dx>=0&&c+dx<W){NET.add(n);PAR[n]=k;q.push(n)}}}
 const q2=[...NET],seen=new Set(NET);
 while(q2.length){const k=q2.shift(),c=k&7,r=k>>3;for(const[dx,dy]of DV){const n=K(c+dx,r+dy),b=bl[n];if(b&&b.bp<1&&b.k=='cv'&&!seen.has(n)&&c+dx>=0&&c+dx<W){seen.add(n);PEND.add(n);q2.push(n)}}}
 resCalc()}
/* Strom ⚡, Wasser 💧 und Munition: Erzeuger (+) und Verbraucher (−) im Netz. Reicht ein Vorrat nicht, gehen die ZULETZT gebauten Verbraucher aus – alle anderen laufen mit 100 %. */
const RK=[['P',resP],['W',resW],['A',resA]];
const SHT=3.6,lacks=(b,k)=>!!(b.wo&&b.lk&&b.lk.includes(k));let RDT=0;
/* Engpass: Das zuletzt gebaute Verbraucher-Gebäude (b.wo) läuft noch SHT Sekunden weiter (b.sh 0→1, Balken am Symbol schrumpft), dann geht es aus (b.off) und wird dunkel. Kommt rechtzeitig Nachschub, füllt sich der Balken wieder. */
function resCalc(){
 const live=[];for(const k of NET){const b=bl[k];if(b&&b.bp>=1)live.push(b)}
 for(const k in bl)bl[k].wo=0;
 const prod=b=>RK.some(r=>r[1](b)>0),neg=b=>RK.some(r=>r[1](b)<0);
 const cons=live.filter(b=>b.k!='hub'&&neg(b)).sort((a,b)=>(prod(a)-prod(b))||(b.bo||0)-(a.bo||0));
 const S={P:0,W:0,A:0},D={P:0,W:0,A:0},tot=()=>{for(const r of RK)S[r[0]]=D[r[0]]=0;for(const b of live){if(b.wo)continue;for(const[k,f]of RK){const v=f(b);if(v>0)S[k]+=v;else D[k]-=v}}};
 for(let g=0;g<60;g++){tot();const lack=RK.filter(r=>D[r[0]]>S[r[0]]).map(r=>r[0]);if(!lack.length)break;
  const v=cons.find(b=>!b.wo&&RK.some(([k,f])=>lack.includes(k)&&f(b)<0));if(!v)break;v.wo=RK.find(([k,f])=>lack.includes(k)&&f(v)<0)[0]}
 const WD={P:0,W:0,A:0};for(const b of live)for(const[k,f]of RK){const v=f(b);if(v<0)WD[k]-=v}
 RES={sP:S.P,sW:S.W,sA:S.A,dP:WD.P,dW:WD.W,dA:WD.A,uP:D.P,uW:D.W,uA:D.A};SUP=S.P;DEM=WD.P;
 /* Zusätzlich fehlende Dinge: würde das Gebäude nach Behebung des ersten Mangels noch etwas anderes vermissen? */
 const FR={P:S.P-D.P,W:S.W-D.W,A:S.A-D.A};
 for(const b of live)if(b.wo){let m=b.wo;for(const[k,f]of RK){const v=f(b);if(v<0&&k!=b.wo&&-v>FR[k])m+=k}b.lk=m}
 for(const k in bl){const b=bl[k];
  if(b.wo){if(!b.eng){b.eng=1;b.est=gt;if(!(b.sh>0))b.sh=0;if(phase!='menu')engEvent(b)}if(RDT>0)b.sh=Math.min(1,(b.sh||0)+RDT/SHT)}
  else{b.eng=0;if(b.sh>0&&RDT>0)b.sh=Math.max(0,b.sh-RDT*1.6);if(!(b.sh>0)){b.sh=0;b.lk=''}}
  b.off=b.wo&&b.sh>=1?b.wo:0}
 for(const b of live){if(b.off&&!b.wasOff&&phase!='menu')resEvent(b);b.wasOff=b.off}
 for(const k in bl)if(!bl[k].off)bl[k].wasOff=0}
const adj=(c,r,pending)=>DV.some(([a,d])=>{const k=K(c+a,r+d);return c+a>=0&&c+a<W&&(NET.has(k)||(pending&&PEND.has(k)))});
const wormOn=(c,r)=>TW.some(w=>(w.c==c&&w.r==r)||(Math.floor(w.x)==c&&Math.floor(w.y)==r))||!!(wm&&Math.floor(wm.x)==c&&Math.floor(wm.y)==r);
function canPlace(c,r,k){const t=tw(c,r);return !!t&&t.s==2&&(k=='bore'?!!t.qs:!t.qs)&&!wormOn(c,r)&&!bl[K(c,r)]&&adj(c,r,k=='cv')}
function pathTo(b){const out=[];let k=K(b.c,b.r);while(k!=null&&NET.has(k)){out.push(k);if(k==3)break;k=PAR[k]}return out}
function ship(b,kind,amt,cb){if(!isLive(b))return null;const p=pathTo(b);if(p.length<2)return null;if(kind!='sp')p.reverse();const q={pth:p,p:.5,kind,amt,cb,b};pk.push(q);return q}
/* ================= AUDIO ================= */
const AU=(()=>{
 let ac=null,master,sfxBus,musBus,rev,revS,echo,noiseB,pinkB,musSrc=null,musGain=null,genNodes=[],genTimer=0,source='none',lastT={};
 const SFXK=.36; // Effekte-Grundpegel (Regler = Anteil davon)
 const D=[146.83,155.56,185,196,220,233.08,261.63,293.66,311.13,369.99,392,440,466.16,523.25,587.33,622.25,740,783.99,880]; // D-Phrygian-dominant-Töne
 const PENT=[293.66,369.99,440,523.25,587.33,740,880];
 function IR(sec,dec){const n=ac.sampleRate*sec|0,b=ac.createBuffer(2,n,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<n;i++){const e=Math.pow(1-i/n,dec);lp+=((Math.random()*2-1)-lp)*(.25+.5*(1-i/n));d[i]=lp*e}}return b}
 function init(){
  if(ac)return true;const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
  try{ac=new C()}catch(e){return false}
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3.5;comp.attack.value=.004;comp.release.value=.2;
  master=ac.createGain();master.gain.value=.9;comp.connect(master);master.connect(ac.destination);
  sfxBus=ac.createGain();sfxBus.gain.value=SV.sv*SFXK;sfxBus.connect(comp);
  musBus=ac.createGain();musBus.gain.value=SV.mus?SV.mv:0;musBus.connect(comp);
  rev=ac.createConvolver();rev.buffer=IR(2.4,2.6);const rg=ac.createGain();rg.gain.value=.55;rev.connect(rg);rg.connect(comp);
  revS=ac.createConvolver();revS.buffer=IR(3.2,2.4);const rgS=ac.createGain();rgS.gain.value=.5;revS.connect(rgS);rgS.connect(sfxBus);
  echo=ac.createDelay(1.5);echo.delayTime.value=.42;const fb=ac.createGain();fb.gain.value=.38;const ef=ac.createBiquadFilter();ef.type='lowpass';ef.frequency.value=1800;echo.connect(ef);ef.connect(fb);fb.connect(echo);ef.connect(musBus);ef.connect(rev);
  const n=ac.sampleRate*2;noiseB=ac.createBuffer(1,n,ac.sampleRate);pinkB=ac.createBuffer(1,n,ac.sampleRate);
  const a=noiseB.getChannelData(0),p=pinkB.getChannelData(0);let b0=0,b1=0,b2=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;a[i]=w;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;p[i]=(b0+b1+b2+w*.1848)*.2}
  return true}
 const ok=()=>ac&&ac.state!='closed';
 function resume(){if(ac&&ac.state=='suspended')ac.resume()}
 /* Stimme: o.w Wellenform · o.n Rauschen(1 weiß, 2 rosa) · f→f2 Tonhöhe · ft/ff/ff2/q Filter · a Anstieg · d Dauer · v Pegel · r Hall · fm/fi FM · pan · t Verzögerung */
 function V(o){
  if(!ok()||SV.sv<=0)return;const t=ac.currentTime+(o.t||0),d=o.d||.2;let src,node;
  if(o.n){src=ac.createBufferSource();src.buffer=o.n==2?pinkB:noiseB;src.loop=true;src.playbackRate.value=o.pr||1}
  else{src=ac.createOscillator();src.type=o.w||'sine';src.frequency.setValueAtTime(o.f,t);if(o.f2)src.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+(o.fd||d));if(o.det)src.detune.value=o.det}
  node=src;
  if(o.ft){const f=ac.createBiquadFilter();f.type=o.ft;f.frequency.setValueAtTime(o.ff||1000,t);if(o.ff2)f.frequency.exponentialRampToValueAtTime(Math.max(20,o.ff2),t+d);f.Q.value=o.q||.8;node.connect(f);node=f}
  const g=ac.createGain(),a=o.a||.004,v=o.v||.25;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);if(o.hold)g.gain.setValueAtTime(v,t+o.hold);g.gain.exponentialRampToValueAtTime(.0001,t+d);node.connect(g);node=g;
  if(o.fm&&!o.n){const m=ac.createOscillator(),mg=ac.createGain();m.frequency.value=o.f*o.fm;mg.gain.setValueAtTime(o.f*(o.fi||1),t);mg.gain.exponentialRampToValueAtTime(1,t+d*.8);m.connect(mg);mg.connect(src.frequency);m.start(t);m.stop(t+d+.1)}
  if(o.lfo&&!o.n){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=o.lfo;lg.gain.value=o.f*(o.ld||.01);l.connect(lg);lg.connect(src.frequency);l.start(t);l.stop(t+d+.1)}
  if(o.pan&&ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=clamp(o.pan,-.9,.9);node.connect(p);node=p}
  node.connect(sfxBus);if(o.r){const s=ac.createGain();s.gain.value=o.r;node.connect(s);s.connect(revS)}
  if(o.n)src.start(t,Math.random()*1.5);else src.start(t);src.stop(t+d+.15)}
  const lim=(k,ms)=>{const n=performance.now();if(lastT[k]&&n-lastT[k]<ms)return false;lastT[k]=n;return true};
 const pn=a=>a==null?0:clamp((a/W-.5)*1.4,-.8,.8),vr=()=>1+(Math.random()-.5)*.08;
 function bell(f,v,d,pan,r){V({f,v:v*.9,d:d||1.2,a:.003,r:r??.5,pan});V({f:f*2.005,v:v*.3,d:(d||1.2)*.55,a:.002,r:r??.5,pan});V({f:f*2.76,fm:1.41,fi:2,v:v*.22,d:(d||1.2)*.4,a:.001,r:.4,pan});V({n:1,ft:'highpass',ff:6000,d:.03,v:v*.18,a:.001,pan})}
 function boom(v,pan,sz){sz=sz||1;V({n:1,ft:'lowpass',ff:2600,ff2:90,d:1.1*sz,v:.5*v,a:.003,r:.7,pan});V({f:85,f2:22,d:1.1*sz,v:.7*v,a:.002,pan,r:.3});V({n:2,ft:'bandpass',ff:500,ff2:120,q:.7,d:1.2*sz,v:.28*v,a:.02,r:.6,pan});for(let i=0;i<4;i++)V({n:1,ft:'highpass',ff:3200,d:.04,v:.1*v,t:.06+i*.07+Math.random()*.04,r:.3,pan})}
 /* epische Bausteine: Pauke, Blechbläser, Tiefton */
 function timp(f,v,t,pan){t=t||0;V({f:f*1.6,f2:f,d:.45,v:v,a:.002,t,r:.5,pan});V({f:f,f2:f*.72,d:1.5,v:v*1.1,a:.004,t,r:.65,pan});V({n:1,ft:'lowpass',ff:1100,ff2:200,d:.1,v:v*.5,a:.001,t,pan})}
 function brass(f,d,v,t,pan){t=t||0;for(const c of[-9,0,9])V({w:'sawtooth',f,det:c,d,v:v/3,a:Math.min(.25,d*.25),hold:d*.55,ft:'lowpass',ff:f*2,ff2:f*7,q:1.2,t,r:.55,pan})}
 function sub_(v,d,t,pan,f0){V({f:f0||70,f2:(f0||70)*.38,d:d||.7,v:v,a:.003,t:t||0,pan,r:.2})}
 const S={
  tap(){V({f:560,f2:330,d:.07,v:.1,a:.002});V({n:1,ft:'bandpass',ff:2600,q:2,d:.03,v:.05})},
  open(){V({f:300,f2:420,d:.09,v:.08,w:'triangle',ft:'lowpass',ff:1200});V({n:2,ft:'bandpass',ff:1400,q:1,d:.12,v:.05,a:.03})},
  err(){V({w:'triangle',f:150,f2:108,d:.2,v:.22,ft:'lowpass',ff:520});V({w:'triangle',f:132,f2:88,d:.22,v:.2,ft:'lowpass',ff:480,t:.1})},
  dig(a,p){if(!lim('dig',150))return;const k=vr(),h=p&&p.hard;
   V({n:2,ft:'bandpass',ff:(h?1400:900)*k,ff2:260,q:1.1,d:h?.2:.28,v:h?.34:.3,a:.006,pan:pn(a)});V({f:(h?150:105)*k,f2:48,d:.16,v:.26,a:.002,pan:pn(a)});
   V({n:1,ft:'highpass',ff:h?3600:2600,d:.05,v:h?.14:.07,t:.045,pan:pn(a)});if(h)V({f:1600*k,fm:2.76,fi:1.4,d:.09,v:.06,t:.03,r:.25,pan:pn(a)})},
  dug(a){V({n:1,ft:'lowpass',ff:520,ff2:110,d:.4,v:.34,a:.004,pan:pn(a),r:.25});V({f:74,f2:38,d:.44,v:.34,a:.003,pan:pn(a)});V({n:2,ft:'highpass',ff:3400,ff2:1400,d:.55,v:.05,a:.1,t:.05,pan:pn(a)})},
  spice(a,p){const n=Math.min(5,(p&&p.n)||1),f=PENT[Math.min(PENT.length-1,n-1+(Math.random()<.3?1:0))];bell(f,.2+n*.015,1.3,pn(a));if(n>1)bell(f*1.5,.1,1.1,pn(a));V({n:2,ft:'highpass',ff:5000,d:.5,v:.035,a:.15,r:.3,t:.05});if(n>=4)V({f:73.4,f2:55,d:.6,v:.25,a:.01})},
  ting(a){if(!lim('ting',70))return;bell(587.33*(Math.random()<.5?1:1.5),.1,.55,pn(a),.35)},
  tick(a){if(!lim('tk',60))return;V({f:1900*vr(),d:.03,v:.035,a:.001,pan:pn(a)})},
  buildStart(a){V({w:'sawtooth',f:90,f2:260,d:.55,v:.1,ft:'lowpass',ff:500,ff2:2000,q:3,pan:pn(a)});V({n:2,ft:'bandpass',ff:700,ff2:2200,q:2,d:.5,v:.1,a:.08,pan:pn(a)});V({f:430,fm:3.1,fi:4,d:.16,v:.14,t:.12,r:.3,pan:pn(a)});V({f:300,fm:3.1,fi:4,d:.16,v:.12,t:.3,r:.3,pan:pn(a)})},
  hammer(a){if(!lim('ham',210))return;const k=vr();V({f:330*k,f2:210,fm:2.9,fi:3,d:.13,v:.18,a:.001,r:.22,pan:pn(a)});V({n:1,ft:'bandpass',ff:3300,q:1.6,d:.035,v:.1,a:.001,pan:pn(a)});V({f:95,f2:60,d:.08,v:.14,a:.001,pan:pn(a)})},
  weld(a){if(!lim('weld',380))return;V({n:1,ft:'highpass',ff:4200,d:.22,v:.07,a:.01,pan:pn(a)});V({w:'sawtooth',f:1500*vr(),f2:900,d:.12,v:.025,ft:'bandpass',ff:2000,q:4,pan:pn(a)})},
  buildDone(a){V({w:'sawtooth',f:73.4,d:1.05,v:.14,a:.05,ft:'lowpass',ff:360,ff2:1500,q:2,r:.4,pan:pn(a)});V({w:'sawtooth',f:110.1,d:1.05,v:.1,a:.06,det:7,ft:'lowpass',ff:360,ff2:1700,q:2,r:.4,pan:pn(a)});V({f:55,f2:38,d:.9,v:.36,a:.01,pan:pn(a)});V({n:2,ft:'bandpass',ff:300,ff2:3200,q:1.2,d:.65,v:.1,a:.1,r:.3,pan:pn(a)});bell(587.33,.13,1.3,pn(a));setTimeout(()=>bell(739.99,.1,1.2,pn(a)),130);setTimeout(()=>bell(880,.08,1.4,pn(a)),260)},
  upStart(a){V({f:260,f2:900,d:.5,v:.1,lfo:14,ld:.015,ft:'lowpass',ff:2500,pan:pn(a),r:.3});V({n:2,ft:'highpass',ff:1500,ff2:5000,d:.5,v:.05,a:.2})},
  upDone(a){[440,523.25,587.33,698.46,880].forEach((f,i)=>V({f,fm:2,fi:2.2,d:.45,v:.13,t:i*.075,a:.002,r:.45,pan:pn(a)}));V({w:'sawtooth',f:146.8,d:.8,v:.08,a:.05,ft:'lowpass',ff:500,ff2:1600,t:.1,r:.4})},
  train(a){V({n:1,ft:'highpass',ff:4200,ff2:1400,d:.3,v:.09,a:.01,pan:pn(a)});V({f:165,f2:88,d:.12,v:.22,t:.12,pan:pn(a)});V({f:880,f2:1180,d:.06,v:.04,t:.2,w:'triangle',r:.3})},
  unit(a){V({f:94,f2:62,d:.1,v:.24,pan:pn(a)});bell(392,.13,.7,pn(a),.4);setTimeout(()=>bell(587.33,.12,.8,pn(a),.4),95)},
  hire(a){V({f:110,f2:70,d:.12,v:.22,pan:pn(a)});bell(440,.11,.7,pn(a),.4);setTimeout(()=>bell(659.25,.1,.8,pn(a),.4),90);setTimeout(()=>bell(880,.09,.9,pn(a),.4),180)},
  shot(a){if(!lim('shot',90))return;V({f:1500*vr(),f2:170,d:.17,v:.13,a:.001,pan:pn(a),r:.3});V({n:1,ft:'bandpass',ff:4200,q:1.2,d:.06,v:.09,a:.001,pan:pn(a)});V({f:96,f2:48,d:.12,v:.15,a:.001,pan:pn(a)})},
  rifle(a){if(!lim('rif',70))return;V({n:1,ft:'bandpass',ff:2400*vr(),q:1.4,d:.07,v:.08,a:.001,pan:pn(a),r:.2});V({f:210,f2:90,d:.07,v:.09,a:.001,pan:pn(a)})},
 slash(a){if(!lim('slash',90))return;const k=vr();V({n:2,ft:'bandpass',ff:700*k,ff2:3600,q:1.1,d:.2,v:.12,a:.02,pan:pn(a),r:.25});V({f:2100*k,fm:2.76,fi:1.5,d:.35,v:.05,t:.12,r:.5,pan:pn(a)});V({n:1,ft:'highpass',ff:5200,d:.04,v:.1,t:.11,a:.001,pan:pn(a)});V({f:130,f2:70,d:.12,v:.15,t:.11,a:.001,pan:pn(a)})},
  bonk(a){if(!lim('bonk',110))return;V({f:420,f2:150,d:.18,v:.2,w:'triangle',a:.001,pan:pn(a),r:.2});V({f:190,f2:110,d:.07,v:.16,a:.001,pan:pn(a)});V({f:1500,f2:2400,d:.09,v:.04,t:.05,w:'sine',pan:pn(a)})},
  klong(a){if(!lim('klong',130))return;V({f:520,fm:1.41,fi:3,d:.9,v:.16,a:.001,r:.4,pan:pn(a)});V({f:1230,fm:2.76,fi:2,d:.4,v:.07,a:.001,r:.4,pan:pn(a)});V({n:1,ft:'bandpass',ff:3000,q:2,d:.03,v:.08,a:.001,pan:pn(a)})},
  squeak(a){if(!lim('squeak',200))return;for(let i=0;i<2;i++)V({f:900+i*140,f2:1900+i*200,d:.13,v:.09,w:'triangle',lfo:34,ld:.03,t:i*.15,r:.2,pan:pn(a)});V({f:1500,f2:880,d:.12,v:.05,w:'triangle',t:.3,pan:pn(a)})},
  cannon(a){if(!lim('can',120))return;sub_(.5,.6,0,pn(a),90);V({n:1,ft:'lowpass',ff:3200,ff2:200,d:.45,v:.3,a:.002,r:.5,pan:pn(a)});V({f:2200,f2:300,d:.3,v:.06,t:.02,w:'triangle',pan:pn(a)});V({n:2,ft:'bandpass',ff:500,ff2:150,q:.8,d:.9,v:.14,a:.03,r:.6,pan:pn(a)})},
  rocket(a){if(!lim('rkt',120))return;V({n:1,ft:'highpass',ff:900,ff2:5000,d:.55,v:.1,a:.12,r:.3,pan:pn(a)});V({n:2,ft:'bandpass',ff:420,ff2:1400,q:.8,d:.6,v:.16,a:.08,pan:pn(a)});sub_(.28,.4,.02,pn(a),120)},
  stomp(a){if(!lim('stp',200))return;sub_(.7,.9,0,pn(a),62);V({n:2,ft:'lowpass',ff:500,ff2:90,d:.8,v:.3,a:.004,r:.5,pan:pn(a)});for(let i=0;i<5;i++)V({f:900+Math.random()*900,fm:2.1,fi:1.5,d:.08,v:.05,t:.08+i*.06,r:.3,pan:pn(a)})},
  burst(a){if(!lim('brs',60))return;for(let i=0;i<3;i++){const t=i*.055;V({f:1700*vr(),f2:260,d:.09,v:.1,a:.001,t,pan:pn(a),r:.25});V({n:1,ft:'bandpass',ff:4300,q:1.3,d:.04,v:.07,a:.001,t,pan:pn(a)})}V({f:100,f2:55,d:.12,v:.13,a:.001,pan:pn(a)})},
  pulse(a){if(!lim('pls',140))return;V({f:260,f2:50,d:.5,v:.2,w:'triangle',r:.5,pan:pn(a)});V({f:1300,f2:300,d:.3,v:.05,lfo:30,ld:.04,r:.5,pan:pn(a)});sub_(.3,.5,0,pn(a),80)},
  die(a){if(!lim('die',100))return;V({f:1100,f2:240,d:.45,v:.1,w:'triangle',lfo:9,ld:.03,r:.3,pan:pn(a)});V({n:1,ft:'lowpass',ff:900,ff2:200,d:.12,v:.1,t:.35,pan:pn(a)});V({f:130,f2:60,d:.1,v:.12,t:.38,pan:pn(a)})},
  wreck(a){boom(.8,pn(a),.9);V({n:1,ft:'bandpass',ff:2400,q:1,d:.4,v:.1,t:.1,r:.4,pan:pn(a)});sub_(.45,.8,0,pn(a),70)},
  hit(a){if(!lim('hit',60))return;V({n:1,ft:'lowpass',ff:1100,ff2:300,d:.1,v:.12,a:.001,pan:pn(a)});V({f:150*vr(),f2:70,d:.09,v:.14,a:.001,pan:pn(a)})},
  boom(a,p){boom(.8,pn(a),(p&&p.sz)||1)},
  worm(a){sub_(.5,1.8,0,pn(a),48);V({w:'sawtooth',f:41,f2:28,d:2,v:.4,ft:'lowpass',ff:150,q:2,lfo:7,ld:.04,pan:pn(a)});V({n:2,ft:'bandpass',ff:260,ff2:70,q:.8,d:1.8,v:.4,a:.1,r:.5});V({f:130,f2:55,fm:.5,fi:3,d:1,v:.22,t:.15,r:.4});boom(.7,pn(a),1.4)},
  gas(a){V({n:1,ft:'lowpass',ff:900,ff2:160,d:.55,v:.28,a:.005,r:.3,pan:pn(a)});for(let i=0;i<4;i++)V({f:200+i*70,f2:520+i*90,d:.12,v:.07,t:i*.07,w:'triangle',r:.3,pan:pn(a)});V({f:70,f2:34,d:.5,v:.3})},
  charge(){V({f:90,f2:1700,d:.42,v:.14,w:'sawtooth',lfo:22,ld:.02,ft:'lowpass',ff:3200,r:.4});V({f:180,f2:1500,d:.42,v:.16,lfo:22,ld:.02,ft:'lowpass',ff:3000,r:.3});V({n:2,ft:'highpass',ff:900,ff2:7000,d:.42,v:.09,a:.3})},
  strike(a){boom(1.1,pn(a),1.3);V({f:48,f2:20,d:1.6,v:.5,a:.004,r:.4});V({f:2400,f2:200,d:.3,v:.2,a:.001,r:.4,pan:pn(a)});V({n:1,ft:'highpass',ff:5000,d:.12,v:.2,a:.001,pan:pn(a)})},
  horn(){timp(73.4,.45,0);brass(73.4,1.4,.22,.02);brass(146.8,1.3,.12,.05);timp(73.4,.4,.55);brass(110,1.1,.2,.6);brass(220,1.0,.1,.62);timp(55,.5,1.1);brass(146.8,1.6,.24,1.1);brass(293.7,1.5,.12,1.12);V({n:2,ft:'bandpass',ff:300,ff2:1200,q:.6,d:1.8,v:.07,a:.5,t:1.1,r:.6})},
  brown(a){if(!lim('brn',600))return;V({f:560,f2:170,d:.75,v:.07,w:'triangle',lfo:16,ld:.3,r:.3,pan:pn(a)});V({f:280,f2:90,d:.7,v:.05,w:'sine',t:.05,r:.3,pan:pn(a)})},
  alarm(){for(let i=0;i<3;i++){V({w:'sawtooth',f:233,d:.2,v:.12,ft:'lowpass',ff:700,q:3,t:i*.25,a:.01,r:.25});V({w:'sawtooth',f:174,d:.2,v:.1,ft:'lowpass',ff:700,q:3,t:i*.25,a:.01,r:.25})}},
  drink(a){for(let i=0;i<3;i++)V({f:280+i*60,f2:640+i*80,d:.11,v:.1,t:i*.2,w:'sine',r:.2,pan:pn(a)});V({n:2,ft:'bandpass',ff:1300,q:1.5,d:.5,v:.03,a:.1,pan:pn(a)})},
  rumble(a){if(!lim('rumble',250))return;sub_(.22,.8,0,pn(a),52);V({w:'sawtooth',f:62,f2:44,d:.7,v:.1,ft:'lowpass',ff:200,ff2:110,q:1.5,lfo:13,ld:.06,pan:pn(a)});V({n:2,ft:'lowpass',ff:420,ff2:140,d:.7,v:.09,a:.08,r:.35,pan:pn(a)})},
  sandup(a){if(!lim('sandup',90))return;V({n:1,ft:'lowpass',ff:500,ff2:2600,d:.35,v:.22,a:.01,r:.3,pan:pn(a)});V({f:96,f2:38,d:.28,v:.3,a:.002,pan:pn(a)});V({n:2,ft:'bandpass',ff:900,q:.9,d:.25,v:.1,t:.05,pan:pn(a)})},
  chomp(a){if(!lim('chomp',200))return;V({n:1,ft:'bandpass',ff:2100,q:3.5,d:.045,v:.26,a:.001,pan:pn(a)});V({f:230,f2:70,d:.16,v:.3,w:'square',ft:'lowpass',ff:900,a:.001,pan:pn(a),r:.2});timp(78,.3,.01,pn(a));V({n:1,ft:'bandpass',ff:1700,q:3,d:.04,v:.15,t:.13,a:.001,pan:pn(a)});V({f:170,f2:80,d:.12,v:.16,w:'square',ft:'lowpass',ff:700,t:.13,pan:pn(a)})},
  burp(a){if(!lim('burp',200))return;V({w:'sawtooth',f:140,f2:78,d:.55,v:.22,ft:'lowpass',ff:520,ff2:170,q:2,lfo:27,ld:.2,a:.02,pan:pn(a),r:.25});V({n:2,ft:'bandpass',ff:300,q:1,d:.45,v:.08,a:.03,pan:pn(a)});V({f:380,f2:900,d:.22,v:.1,w:'sine',t:.5,lfo:9,ld:.06,pan:pn(a)})},
  purr(a){if(!lim('purr',900))return;V({w:'sawtooth',f:58,f2:50,d:1.05,v:.09,ft:'lowpass',ff:240,q:1.4,lfo:23,ld:.45,a:.12,pan:pn(a),r:.2});V({n:2,ft:'bandpass',ff:180,q:1,d:.9,v:.04,a:.15,pan:pn(a)})},
  nom(a){if(!lim('nom',160))return;V({n:1,ft:'bandpass',ff:1500,q:3,d:.04,v:.1,a:.001,pan:pn(a)});V({f:210,f2:110,d:.1,v:.12,w:'square',ft:'lowpass',ff:700,a:.001,pan:pn(a)});V({f:190,f2:100,d:.09,v:.09,w:'square',ft:'lowpass',ff:650,t:.11,a:.001,pan:pn(a)});V({f:520,f2:760,d:.14,v:.04,w:'sine',t:.2,pan:pn(a)})},
  boing(a){if(!lim('boing',120))return;V({f:260,f2:760,d:.3,v:.13,w:'sine',lfo:14,ld:.04,pan:pn(a)});V({f:520,f2:1500,d:.22,v:.05,w:'triangle',t:.04,pan:pn(a)})},
  /* Auswertung */
  star(a,p){const i=(p|0),oct=i>=7?2:1,sc=[523.25,587.33,659.25,783.99,880,1046.5,1174.7],f=sc[i%7]*(i>=7?2:1)*(oct>1?1:1);V({f,fm:2,fi:1.8,d:.5,v:.15,a:.002,r:.5,pan:pn(a)});V({f:f*2,v:.05,d:.3,a:.002,r:.4,pan:pn(a)});V({n:1,ft:'highpass',ff:7000,d:.025,v:.07,a:.001})},
  tally(a,p){V({f:900+(p||0)*40,f2:1100+(p||0)*40,d:.04,v:.05,w:'triangle',a:.001})},
  medal(a,p){const m=p|0,base=[392,523.25,659.25][m]||440;timp(73.4,.35+m*.1,0);bell(base,.2,2.2,0,.6);bell(base*1.5,.14,1.9,0,.6);bell(base*2,.1,1.7,0,.6);
   [0,1,2].slice(0,m+1).forEach(i=>setTimeout(()=>bell(base*[2,2.5,3][i]*1.0,.09,1.2,0,.5),90+i*90));V({n:1,ft:'highpass',ff:6000,d:.5,v:.06,a:.01,t:.05,r:.6});if(m>=1)brass(base/2,1.4,.12,.02);if(m>=2){brass(base,1.8,.13,.05);brass(base*1.25,1.8,.1,.07);brass(base*1.5,1.8,.1,.09)}},
  whoosh(a){V({n:2,ft:'bandpass',ff:500,ff2:3200,q:1.1,d:.28,v:.09,a:.06,pan:pn(a)});V({n:1,ft:'highpass',ff:3800,d:.12,v:.03,t:.12,a:.02})},
  card(a){V({n:2,ft:'bandpass',ff:400,ff2:2400,q:1,d:.22,v:.08,a:.05});V({f:660,f2:880,d:.12,v:.06,w:'triangle',t:.16,a:.002,r:.3});V({f:1320,d:.3,v:.05,t:.18,a:.002,r:.5})},
  roar(a){if(!lim('roar',700))return;sub_(.3,.9,0,pn(a),58);V({w:'sawtooth',f:95,f2:52,d:.8,v:.12,ft:'lowpass',ff:420,ff2:120,q:2,lfo:11,ld:.05,r:.4,pan:pn(a)});V({n:2,ft:'bandpass',ff:420,ff2:120,q:.9,d:.7,v:.11,a:.08,r:.5,pan:pn(a)})},
  whistle(a){V({f:1650,f2:2350,d:.28,v:.07,w:'sine',lfo:26,ld:.03,r:.5,pan:pn(a)});V({f:2350,f2:1900,d:.25,v:.06,w:'sine',t:.3,lfo:26,ld:.03,r:.5,pan:pn(a)})},
  flag(a){V({f:230,f2:120,d:.1,v:.2,a:.002,pan:pn(a)});V({n:1,ft:'bandpass',ff:1500,q:1,d:.05,v:.1,pan:pn(a)});V({n:2,ft:'bandpass',ff:900,q:.6,d:.25,v:.05,a:.08,t:.05,pan:pn(a)})},
  defuse(a){for(let i=0;i<3;i++)V({f:1250,d:.025,v:.07,t:i*.09,a:.001,pan:pn(a)});bell(880,.14,.9,pn(a));bell(1174.7,.09,1,pn(a))},
  lost(a){V({n:1,ft:'bandpass',ff:2200,q:2,d:.25,v:.1,pan:pn(a)});V({f:600,f2:190,d:.3,v:.1,w:'triangle',pan:pn(a)})},
  clink(a){V({f:1500*vr(),fm:2.76,fi:2,d:.14,v:.1,r:.3,pan:pn(a)});V({n:1,ft:'highpass',ff:6000,d:.03,v:.06})},
  scan(a){V({f:900,f2:1500,d:.18,v:.04,w:'triangle',r:.5,pan:pn(a)})},
  crack(a){V({n:1,ft:'highpass',ff:2000,d:.08,v:.14,pan:pn(a)});V({f:130,f2:70,d:.12,v:.2,pan:pn(a)})},
  win(){timp(73.4,.5,0);[[293.66,0],[369.99,.02],[440,.04],[587.33,.06]].forEach(([f,t])=>brass(f/2,2.4,.17,t));brass(293.66,2.2,.1,.15);timp(98,.4,.45);timp(73.4,.45,.9);[0,.14,.28,.42,.58,.74].forEach((t,i)=>setTimeout(()=>bell([587.33,739.99,880,1174.7,1480,1760][i],.11,1.9,0,.65),t*1000+300));brass(440,2.6,.14,.9);brass(554.4,2.6,.1,.9);brass(659.25,2.6,.1,.92);sub_(.4,1.4,0,0,55)},
  lose(){V({w:'sawtooth',f:110,f2:48,d:2.8,v:.14,a:.08,ft:'lowpass',ff:520,ff2:90,r:.6});V({w:'sawtooth',f:130.8,f2:55,d:2.8,v:.09,a:.08,ft:'lowpass',ff:520,ff2:90,r:.6,det:6});timp(55,.55,0);timp(49,.5,.6);sub_(.5,2,.1,0,45);bell(146.8,.14,3.2,0,.8);setTimeout(()=>bell(138.6,.12,3.2,0,.8),700);V({n:2,ft:'bandpass',ff:260,ff2:90,q:.7,d:2.4,v:.1,a:.4,r:.7})}
 };
 function snd(n,a,p){if(!ac||SV.sv<=0||paused&&n!='tap'&&n!='open'&&n!='err')return;try{S[n]&&S[n](a,p)}catch(e){}}
 /* ---------- Musik ---------- */
 const idb=(m,fn)=>new Promise((res,rej)=>{try{const r=indexedDB.open('dt3',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>{const tx=r.result.transaction('f',m),q=fn(tx.objectStore('f'));tx.oncomplete=()=>res(q&&q.result);tx.onerror=()=>rej(tx.error)};r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
 const dec=ab=>new Promise((res,rej)=>{const p=ac.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)});
 function stopMusic(){const t=ac.currentTime;if(musGain){try{musGain.gain.cancelScheduledValues(t);musGain.gain.setValueAtTime(musGain.gain.value,t);musGain.gain.linearRampToValueAtTime(0,t+.8)}catch(e){}}const s=musSrc,gn=genNodes;musSrc=null;genNodes=[];clearInterval(genTimer);setTimeout(()=>{try{s&&s.stop()}catch(e){}gn.forEach(n=>{try{n.stop&&n.stop()}catch(e){}})},900)}
 function playBuf(buf){stopMusic();const g=ac.createGain();g.gain.setValueAtTime(0,ac.currentTime);g.gain.linearRampToValueAtTime(1,ac.currentTime+2);g.connect(musBus);const s=ac.createBufferSource();s.buffer=buf;s.loop=true;s.connect(g);s.start();musSrc=s;musGain=g;source='file'}
 function note(f,t,v,d){const o=ac.createOscillator(),m=ac.createOscillator(),mg=ac.createGain(),g=ac.createGain();o.frequency.value=f;m.frequency.value=f*2;mg.gain.setValueAtTime(f*1.1,t);mg.gain.exponentialRampToValueAtTime(1,t+d*.6);m.connect(mg);mg.connect(o.frequency);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(echo);g.connect(musGain);o.start(t);m.start(t);o.stop(t+d+.1);m.stop(t+d+.1)}
 function playGen(){stopMusic();const t0=ac.currentTime,g=ac.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(1,t0+4);g.connect(musBus);musGain=g;source='gen';
  const nodes=[],osc=(w,f,v,lp,lfoF)=>{const o=ac.createOscillator(),fl=ac.createBiquadFilter(),vg=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();o.type=w;o.frequency.value=f;fl.type='lowpass';fl.frequency.value=lp;fl.Q.value=2;vg.gain.value=v;l.frequency.value=lfoF;lg.gain.value=lp*.5;l.connect(lg);lg.connect(fl.frequency);o.connect(fl);fl.connect(vg);vg.connect(g);vg.connect(rev);o.start();l.start();nodes.push(o,l)};
  osc('sawtooth',73.42,.05,330,.05);osc('sawtooth',73.9,.04,300,.07);osc('sawtooth',110.2,.025,420,.04);osc('triangle',146.83,.04,500,.03);osc('triangle',220.5,.018,700,.06);
  const w=ac.createBufferSource();w.buffer=pinkB;w.loop=true;const wf=ac.createBiquadFilter(),wg=ac.createGain(),wl=ac.createOscillator(),wlg=ac.createGain(),wl2=ac.createOscillator(),wlg2=ac.createGain();wf.type='bandpass';wf.frequency.value=520;wf.Q.value=.8;wg.gain.value=.016;wl.frequency.value=.09;wlg.gain.value=300;wl2.frequency.value=.13;wlg2.gain.value=.011;wl.connect(wlg);wlg.connect(wf.frequency);wl2.connect(wlg2);wlg2.connect(wg.gain);w.connect(wf);wf.connect(wg);wg.connect(g);w.start();wl.start();wl2.start();nodes.push(w,wl,wl2);
  genNodes=nodes;let step=0;
  const sched=()=>{if(!ok())return;const t=ac.currentTime+.05;
   if(step%4==0){const o=ac.createOscillator(),og=ac.createGain();o.frequency.setValueAtTime(92,t);o.frequency.exponentialRampToValueAtTime(42,t+.35);og.gain.setValueAtTime(.0001,t);og.gain.linearRampToValueAtTime(.32,t+.008);og.gain.exponentialRampToValueAtTime(.0001,t+.5);o.connect(og);og.connect(g);og.connect(rev);o.start(t);o.stop(t+.6)}
   if(step%8==5||step%16==14){const o=ac.createOscillator(),og=ac.createGain();o.frequency.setValueAtTime(130,t+.1);o.frequency.exponentialRampToValueAtTime(60,t+.4);og.gain.setValueAtTime(.0001,t+.1);og.gain.linearRampToValueAtTime(.16,t+.11);og.gain.exponentialRampToValueAtTime(.0001,t+.45);o.connect(og);og.connect(g);o.start(t+.1);o.stop(t+.6)}
   if(Math.random()<.55){const sc=[D[7],D[9],D[10],D[11],D[13],D[14],D[16],D[10],D[8]],f=sc[Math.floor(Math.random()*sc.length)];note(f,t+Math.random()*.2,.06+Math.random()*.03,1.6)}
   step++};
  sched();genTimer=setInterval(sched,1200)}
 
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
 async function loadMusic(){
  if(!init())return;
  if(window.DT_MOOD==='night'){if(source!=='night'){loadMusic.done=1;playNight()}return}
   if(source!='none'&&loadMusic.done)return;loadMusic.done=1;
  try{const ab=await idb('readonly',s=>s.get('music'));if(ab&&ab.byteLength){const b=await dec(ab.slice(0));playBuf(b);return}}catch(e){}
  try{const r=await fetch('sand.mp3');if(r.ok){const ab=await r.arrayBuffer();const b=await dec(ab);playBuf(b);return}}catch(e){}
  playGen()}
 async function setFile(file){if(!init())return false;try{const ab=await file.arrayBuffer();const b=await dec(ab.slice(0));playBuf(b);try{await idb('readwrite',s=>s.put(ab,'music'))}catch(e){}return true}catch(e){return false}}
 async function clearFile(){try{await idb('readwrite',s=>s.delete('music'))}catch(e){}loadMusic.done=0;source='none';loadMusic()}
 function setVol(){if(!ac)return;const t=ac.currentTime;musBus.gain.setTargetAtTime(SV.mus?SV.mv:0,t,.1);sfxBus.gain.setTargetAtTime(SV.sv*SFXK,t,.05)}
 function hide(h){if(!ac)return;if(h)ac.suspend();else ac.resume()}
 return{init,resume,snd,loadMusic,mood:setMood,setFile,clearFile,setVol,hide,get source(){return source},get on(){return !!ac}}
})();
const snd=AU.snd;
/* ================= GRAFIK ================= */
/* Layout: Hochformat = Menü unten · Querformat = Seitenleiste rechts, Spielfeld mittig und begrenzt */
function rs(){DPR=Math.min(devicePixelRatio||1,SV.hi?3:2);const IW=innerWidth,IH=innerHeight;VH=IH;CW=IW;
 SIDE=IW>IH*1.15&&IW>=560;RW=SIDE?Math.round(clamp(IW*.3,250,330)):0;VW=IW-RW;
 document.body.classList.toggle('side',SIDE);document.documentElement.style.setProperty('--rw',RW+'px');
 cv.width=Math.round(CW*DPR);cv.height=Math.round(VH*DPR);
 T=Math.min(VW/W,SIDE?(VH-92)/4.2:1e9,118);GW=T*W;OX=Math.max(0,(VW-GW)/2);document.documentElement.style.setProperty('--gw',Math.round(GW)+'px');
 {const dk=document.getElementById('dock');if(dk&&dk.style.display=='block'){dk.style.minHeight='';const h=dk.offsetHeight;DOCKH=SIDE?0:h;document.documentElement.style.setProperty('--dh',(SIDE?0:h)+'px')}}
 BY=VH-6-DOCKH;for(const r of G)for(const t of r){t.ck='';t.cvs=null};icoCache={}}
const rr=(a,b,w,h,r)=>{x.beginPath();x.roundRect(a,b,w,h,r)};
const SX=wx=>wx*T,SY=wy=>BY-(wy-camS)*T;
const SP=(c,r,tx,ty)=>[c*T+tx*T,BY-(r-camS)*T-ty*T];
const NC=['','#5ec8ff','#7dff8a','#ff7a6a','#c58cff','#ffd24a','#4af','#fff','#fff'];
const ER=['#ffb347','#ffe2a0'];
const HC=['','#ffe28a','#ffb347','#ff8a5a','#ff6a8a','#ff5adf','#d27aff','#fff','#fff'];
/* ---------- Gelände (zwischengespeichert) ---------- */
function tileKey(t){let k=t.s+'|'+(Math.floor(t.r/5)%4)+'|'+t.v+'|'+t.t;if(t.s==1)k+='|'+(L.p.ne&&SV.cl?nb(t.c,t.r):0)+'|'+(t.f?1:0)+'|'+(SV.cl?1:0);else if(t.s==2)k+='|'+t.cr+'|'+Math.ceil(t.st/10)+'|'+(t.qs?1:0);return k}
function tileSpr(t){const k=tileKey(t);if(t.ck===k&&t.cvs)return t.cvs;const c=t.cvs||document.createElement('canvas'),w=Math.ceil(T*DPR);c.width=w;c.height=w;const sx=x;x=c.getContext('2d');x.setTransform(DPR,0,0,DPR,0,0);tileStatic(t,0,0);x=sx;t.cvs=c;t.ck=k;return c}
function tileDyn(t,px,py){const u=t.s==1,hd=u?T*.15:0;if(t.qs&&t.s==2)qsDyn(t,px,py);
 if(u&&!t.q&&!t.f){x.strokeStyle=`rgba(255,235,170,${.16+.12*Math.sin(tm*2.5+t.c+t.r)})`;x.lineWidth=1.6;rr(px+2,py+2,T-4,T-4-hd,T*.1);x.stroke()}
 if((u||t.s==2)&&(t.t==1&&(u||t.st>0)||t.t==4)){const k=Math.floor(tm*1.7+H(t.c,t.r,1)*5);if(k%2==0||t.t==4){const cx=px+T*(.2+.6*H(t.c,t.r,k%5)),cy=py+T*(.2+.5*H(t.c,t.r,k%5+7)),s=T*.06*(.5+Math.abs(Math.sin(tm*3+k)));x.fillStyle=t.t==4?'#dff':'#fff4c8';x.fillRect(cx-s,cy-.5,s*2,1);x.fillRect(cx-.5,cy-s,1,s*2)}}
 if(t.s==2&&t.t==1&&t.st<=0&&t.rg>0){const p=1-t.rg/(t.rgm||20),cx=px+T/2,cy=py+T*.52;x.strokeStyle=`rgba(255,170,70,${.28+.18*Math.sin(tm*3+t.c)})`;x.lineWidth=2;x.lineCap='round';x.beginPath();x.arc(cx,cy,T*.17,-Math.PI/2,-Math.PI/2+TAU*Math.max(.04,p));x.stroke();x.lineCap='butt';x.fillStyle='rgba(255,170,70,.22)';x.beginPath();x.arc(cx,cy,2.2,0,TAU);x.fill()}
 if(t.q){x.strokeStyle='#ffd27a';x.lineWidth=2.4;x.setLineDash([6,5]);x.lineDashOffset=-tm*20;rr(px+2,py+2,T-4,T-4-hd,T*.1);x.stroke();x.setLineDash([]);
  if(t.p>0){x.fillStyle='#000a';rr(px+T*.12,py+T*.8-hd,T*.76,7,3.5);x.fill();x.fillStyle=t.t==1?'#ffb347':'#e8c898';rr(px+T*.12,py+T*.8-hd,T*.76*t.p,7,3.5);x.fill()}
  else if(!t.w){x.font=`${T*.28}px system-ui`;x.textAlign='left';x.textBaseline='alphabetic';x.fillStyle='#ffd27a';x.fillText('⛏',px+5,py+T*.3)}}
 if(t.s==2&&L.p.ne&&!SV.cl&&!hzSmall(t)){const n=nb(t.c,t.r);if(n)hazFace(px+T/2,py+T*.5,T,n,t.c*1.7+t.r*2.3)}
 if(t.f&&!(t.p>.08&&t.w>0))drawFlag(px+T*.34,py+T*.9-hd,T,tm+t.c*.7)}
/* ---------- Gefahren-Zahl: Zahl + halbtransparentes, lauerndes Wurm-Gesicht ---------- */
function hazFace(cx,cy,s,n,ph){
 const R=s*.35,lk=Math.sin(tm*1.35+ph),look=Math.sign(lk)*Math.pow(Math.abs(lk),.3),bob=Math.sin(tm*2+ph*1.7)*s*.012,br=1+Math.sin(tm*2.7+ph)*.03,col=HC[Math.min(n,8)];
 x.save();x.translate(cx,cy+bob);x.scale(br,br);
 // Schatten-Fleck unter dem Gesicht (Kontrast auf Sand)
 let g=x.createRadialGradient(0,0,R*.2,0,0,R*1.25);g.addColorStop(0,'rgba(24,6,12,.5)');g.addColorStop(1,'rgba(24,6,12,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,R*1.25,0,TAU);x.fill();
 x.globalAlpha=.44;
 // Kopf
 g=x.createRadialGradient(-R*.3,-R*.35,R*.1,0,0,R*1.1);g.addColorStop(0,'#e8a47c');g.addColorStop(1,'#7a2a30');x.fillStyle=g;x.beginPath();x.ellipse(0,R*.04,R,R*.9,0,0,TAU);x.fill();x.strokeStyle='rgba(255,226,180,.85)';x.lineWidth=1.3;x.stroke();
 // Schlund mit Zahnring
 x.fillStyle='rgba(20,4,10,.78)';x.beginPath();x.ellipse(0,R*.22,R*.62,R*.5,0,0,TAU);x.fill();
 x.fillStyle='#f5ead2';for(let i=0;i<12;i++){const a=i/12*TAU+tm*.15;x.beginPath();x.moveTo(Math.cos(a-.17)*R*.62,R*.22+Math.sin(a-.17)*R*.5);x.lineTo(Math.cos(a)*R*.33,R*.22+Math.sin(a)*R*.27);x.lineTo(Math.cos(a+.17)*R*.62,R*.22+Math.sin(a+.17)*R*.5);x.fill()}
 // Stirn-Zacken
 x.fillStyle='rgba(245,234,210,.9)';for(let i=-1;i<=1;i++){x.beginPath();x.moveTo(i*R*.3-R*.09,-R*.62);x.lineTo(i*R*.3,-R*(1.02-Math.abs(i)*.1));x.lineTo(i*R*.3+R*.09,-R*.62);x.fill()}
 // Augen: Pupillen wandern links/rechts
 for(const i of[-1,1]){const ex=i*R*.46,ey=-R*.3;x.globalAlpha=.78;x.fillStyle='#fff3dc';x.beginPath();x.ellipse(ex,ey,R*.21,R*.19,0,0,TAU);x.fill();x.strokeStyle='rgba(30,6,10,.8)';x.lineWidth=1;x.stroke();
  x.fillStyle='#d8201c';x.beginPath();x.arc(ex+look*R*.1,ey+R*.01,R*.1,0,TAU);x.fill();x.fillStyle='#1a0408';x.beginPath();x.arc(ex+look*R*.12,ey+R*.01,R*.05,0,TAU);x.fill()}
 x.restore();
 // Zahl obenauf
 x.save();x.font=`900 ${s*.44}px ui-rounded,system-ui`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=s*.09;x.strokeStyle='rgba(36,8,14,.88)';const ty=cy+s*.1+bob;x.strokeText(n,cx,ty);x.fillStyle=col;x.fillText(n,cx,ty);x.restore()}
/* Felder, auf denen schon etwas steht oder war (Gebäude, Krater, gezähmter Wurm, Ausbruch): Zahl klein oben rechts statt groß in der Mitte */
const hzSmall=t=>!!(bl[K(t.c,t.r)]||t.cr||TW.some(w=>w.c==t.c&&w.r==t.r)||(wm&&Math.floor(wm.x)==t.c&&Math.floor(wm.y)==t.r));
function hazBadge(t,n){const px=(t.c+1)*T-T*.2,py=BY-(t.r+1-camS)*T+T*.2,r=T*.15,col=HC[Math.min(n,8)];
 x.save();x.globalAlpha=.94;x.fillStyle='rgba(34,8,16,.86)';x.beginPath();x.arc(px,py,r,0,TAU);x.fill();x.lineWidth=1.5;x.strokeStyle=col;x.stroke();
 x.font=`900 ${r*1.3}px ui-rounded,system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=col;x.fillText(n,px,py+r*.06);x.restore()}
/* ---------- Fließbänder & Anschlüsse ---------- */
const LAT=.145;
function laneP(din,dout,t,lat){
 if(din[0]==dout[0]&&din[1]==dout[1]){const g=RG(din);return[.5+din[0]*(t-.5)+g[0]*lat,.5+din[1]*(t-.5)+g[1]*lat]}
 const s=din[0]*dout[1]-din[1]*dout[0],Kx=.5-din[0]*.5+dout[0]*.5,Ky=.5-din[1]*.5+dout[1]*.5,R=.5+(s>0?lat:-lat),a=s*(Math.PI/2)*t,u0x=-dout[0],u0y=-dout[1],cs=Math.cos(a),sn=Math.sin(a);
 return[Kx+(u0x*cs-u0y*sn)*R,Ky+(u0x*sn+u0y*cs)*R]}
function armsOf(b){const a=[];for(let i=0;i<4;i++){const nc=b.c+DV[i][0],o=bl[K(nc,b.r+DV[i][1])];if(o&&o.bp>=1&&nc>=0&&nc<W)a.push(i)}return a}
function parDir(b){const p=PAR[K(b.c,b.r)];if(p==null)return -1;for(let i=0;i<4;i++)if(K(b.c+DV[i][0],b.r+DV[i][1])==p)return i;return -1}
function polyStroke(c,r,polys,w,col,ox,oy){x.beginPath();for(const p of polys)p.forEach((q,i)=>{const s=SP(c,r,q[0]+(ox||0),q[1]+(oy||0));i?x.lineTo(s[0],s[1]):x.moveTo(s[0],s[1])});x.lineWidth=w*T;x.strokeStyle=col;x.stroke()}
function centerPolys(arms){
 if(arms.length==2){const a=arms[0],b=arms[1];if(b-a==2)return[[[.5+DV[a][0]*.5,.5+DV[a][1]*.5],[.5+DV[b][0]*.5,.5+DV[b][1]*.5]]];
  const din=[-DV[a][0],-DV[a][1]],dout=DV[b],p=[];for(let i=0;i<=12;i++)p.push(laneP(din,dout,i/12,0));return[p]}
 return arms.map(a=>[[.5,.5],[.5+DV[a][0]*.5,.5+DV[a][1]*.5]])}
function lanesOf(arms,par){const out=[],hub=arms.length!=2;
 if(!hub){let a=arms[0],b=arms[1],from=a,to=b;if(par==a){from=b;to=a}else if(par==b){from=a;to=b}
  const dF=DV[from],dT=DV[to],ni=d=>[-d[0],-d[1]],N=b-a==2?1:12,mk=(din,dout)=>{const p=[];for(let i=0;i<=N;i++)p.push(laneP(din,dout,i/N,LAT));return p};
  out.push({k:'sp',p:mk(ni(dF),dT)},{k:'am',p:mk(ni(dT),dF)});return out}
 for(const a of arms){const d=DV[a],g=RG(d),o=par==a,p0=.17,p1=.5;
  const out_=[.5+d[0]*p0+g[0]*LAT,.5+d[1]*p0+g[1]*LAT],out1=[.5+d[0]*p1+g[0]*LAT,.5+d[1]*p1+g[1]*LAT],in0=[.5+d[0]*p0-g[0]*LAT,.5+d[1]*p0-g[1]*LAT],in1=[.5+d[0]*p1-g[0]*LAT,.5+d[1]*p1-g[1]*LAT];
  // nach außen fahren: rechte Hand = +g ; nach innen: rechte Hand = -g
  out.push({k:o?'sp':'am',p:[out_,out1]},{k:o?'am':'sp',p:[in1,in0]})}
 return out}
function chevrons(c,r,p,col,ph){let Lt=0;const cum=[0];for(let i=1;i<p.length;i++){Lt+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);cum.push(Lt)}if(Lt<.1)return;
 const sp=.27,s=.05;x.strokeStyle=col;x.lineWidth=Math.max(1.3,T*.03);x.lineCap='round';x.lineJoin='round';x.beginPath();
 for(let d=((ph%sp)+sp)%sp;d<Lt;d+=sp){if(d<.05||d>Lt-.05)continue;let i=1;while(i<cum.length-1&&cum[i]<d)i++;const f=(d-cum[i-1])/(cum[i]-cum[i-1]||1),a=p[i-1],b=p[i],px=a[0]+(b[0]-a[0])*f,py=a[1]+(b[1]-a[1])*f,l=Math.hypot(b[0]-a[0],b[1]-a[1])||1,ux=(b[0]-a[0])/l,uy=(b[1]-a[1])/l,nx=-uy,ny=ux;
  const A=SP(c,r,px-ux*s+nx*s*.9,py-uy*s+ny*s*.9),Bp=SP(c,r,px+ux*s*.5,py+uy*s*.5),C=SP(c,r,px-ux*s-nx*s*.9,py-uy*s-ny*s*.9);x.moveTo(A[0],A[1]);x.lineTo(Bp[0],Bp[1]);x.lineTo(C[0],C[1])}
 x.stroke()}
function beltSite(b){const c=b.c,r=b.r,arms=[];for(let i=0;i<4;i++){const nc=c+DV[i][0],o=bl[K(nc,r+DV[i][1])];if(o&&nc>=0&&nc<W)arms.push(i)}const polys=arms.length==0?[[[.5,.5],[.5,.5]]]:arms.length==2?centerPolys(arms):arms.map(a=>[[.5,.5],[.5+DV[a][0]*.5,.5+DV[a][1]*.5]]);
 x.lineCap='butt';x.lineJoin='round';polyStroke(c,r,polys,.74,'rgba(70,150,210,.28)');polyStroke(c,r,polys,.5,'rgba(120,210,255,.2)');
 x.setLineDash([5,5]);x.lineDashOffset=-tm*14;polyStroke(c,r,polys,.74,'rgba(150,225,255,.8)');x.setLineDash([]);
 const s=SP(c,r,.1+.8*((tm*1.6)%1),.5);x.fillStyle='rgba(200,240,255,.9)';x.fillRect(s[0]-1,s[1]-T*.3,2,T*.6);
 const p=SP(c,r,.15,.12);x.fillStyle='#0008';rr(p[0],p[1]-3,T*.7,5,2.5);x.fill();x.fillStyle='#72dcff';rr(p[0],p[1]-3,T*.7*b.bp,5,2.5);x.fill()}
/* ---------- Transportpakete ---------- */
function pktPos(q){const n=q.pth.length,i=Math.min(n-1,Math.floor(q.p)),t=Math.min(1,q.p-i),k=q.pth[i],c=k&7,r=k>>3;let din,dout;
 if(i>0){const pk_=q.pth[i-1];din=[c-(pk_&7),r-(pk_>>3)]}if(i<n-1){const nk=q.pth[i+1];dout=[(nk&7)-c,(nk>>3)-r]}din=din||dout;dout=dout||din;if(!din)return null;
 const l=laneP(din,dout,t,LAT),s=SP(c,r,l[0],l[1]);return s}
/* ---------- Gebäude ---------- */
function stripes(px,py,w,h,a,b){x.save();x.beginPath();x.rect(px-w/2,py-h,w,h);x.clip();const s=h*1.4;for(let i=-2;i<w/s+3;i++){x.fillStyle=i%2?a:b;x.beginPath();x.moveTo(px-w/2+i*s,py);x.lineTo(px-w/2+i*s+s,py);x.lineTo(px-w/2+i*s+s+h,py-h);x.lineTo(px-w/2+i*s+h,py-h);x.fill()}x.restore()}
function glow(px,py,r,col,a){const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2)}

/* ================= GFX v4 · heißer Wüstenplanet: leuchtende Farben, warmes Licht, Treibsand-Trichter ================= */
const MB=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hexc=h=>{h=h.replace('#','');if(h.length==3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255]};
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const rgbs=(c,a)=>a==null?`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`:`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const LG=(x0,y0,x1,y1,st)=>{const g=x.createLinearGradient(x0,y0,x1,y1);for(const s of st)g.addColorStop(s[0],s[1]);return g};
const RD=(x0,y0,r0,x1,y1,r1,st)=>{const g=x.createRadialGradient(x0,y0,r0,x1,y1,r1);for(const s of st)g.addColorStop(s[0],s[1]);return g};
const ell=(cx,cy,rx,ry,rot)=>{x.beginPath();x.ellipse(cx,cy,Math.max(.01,rx),Math.max(.01,ry),rot||0,0,TAU)};
const SHD='rgba(120,44,12,';
PAL.length=0;PAL.push(
 ['#f8c884','#e79a54','#a86036','#7a4a2c','#a8683a'],
 ['#f6b270','#e08240','#9c4e28','#744024','#a05c30'],
 ['#ee9a72','#cc6844','#86382f','#6a3430','#984a3e'],
 ['#d8a4b0','#a8708a','#62405e','#4a3454','#7a5878']);
function faceted(cx,cy,pts,dark,light,ol){const n=pts.length;
 for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],ma=Math.atan2((a[1]+b[1])/2-cy,(a[0]+b[0])/2-cx),l=.5+.5*Math.cos(ma+2.356);
  x.fillStyle=rgbs(mixc(dark,light,l));x.beginPath();x.moveTo(cx-1,cy-2);x.lineTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.closePath();x.fill()}
 x.strokeStyle=ol||'rgba(40,12,0,.35)';x.lineWidth=1;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.stroke()}
function stone(cx,cy,r,R,base){base=base||[132,92,66];const n=8,pts=[];for(let i=0;i<n;i++){const a=i/n*TAU+R()*.3,k=.65+R()*.5;pts.push([cx+Math.cos(a)*r*k,cy+Math.sin(a)*r*k*.86])}
 x.fillStyle=SHD+'.28)';ell(cx+r*.35,cy+r*.45,r*.95,r*.55);x.fill();
 faceted(cx,cy,pts,mixc(base,[40,10,0],.5),mixc(base,[255,225,180],.38));x.fillStyle='rgba(255,238,200,.3)';ell(cx-r*.3,cy-r*.3,r*.22,r*.11,-.6);x.fill()}
function crystal(cx,cy,s,R,dark,light,glw){
 if(glw){x.globalCompositeOperation='lighter';const g=RD(cx,cy,0,cx,cy,s*3,[[0,glw],[1,'rgba(0,0,0,0)']]);x.fillStyle=g;x.fillRect(cx-s*3,cy-s*3,s*6,s*6);x.globalCompositeOperation='source-over'}
 x.fillStyle=SHD+'.3)';ell(cx+s*.4,cy+s*.8,s*.9,s*.35);x.fill();
 const pts=[[cx,cy-s*1.3],[cx+s*.62,cy-s*.35],[cx+s*.5,cy+s*.7],[cx,cy+s*.95],[cx-s*.52,cy+s*.65],[cx-s*.62,cy-s*.3]];
 faceted(cx,cy-s*.1,pts,dark,light);x.fillStyle='rgba(255,255,255,.75)';x.beginPath();x.moveTo(cx-s*.05,cy-s*1.1);x.lineTo(cx+s*.2,cy-s*.4);x.lineTo(cx-s*.28,cy-s*.35);x.closePath();x.fill()}
function bolt(cx,cy,r){x.fillStyle='#17110e';x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill();x.fillStyle='#b8aa9a';x.beginPath();x.arc(cx-r*.2,cy-r*.2,r*.55,0,TAU);x.fill()}
function rivRow(x0,y0,x1,y1,n,r){for(let i=0;i<n;i++){const t=(i+.5)/n;bolt(x0+(x1-x0)*t,y0+(y1-y0)*t,r)}}

/* ---------- Treibsand: dezenter Sandtrichter ---------- */
function qsStatic(px,py,P,R){const cx=px+T/2,cy=py+T*.5;
 x.save();rr(px+1,py+1,T-2,T-2,T*.1);x.clip();
 x.fillStyle=LG(px,py,px+T,py+T,[[0,rgbs(mixc(hexc(P[0]),hexc(P[3]),.4))],[1,rgbs(mixc(hexc(P[1]),hexc(P[4]),.35))]]);x.fillRect(px,py,T,T);
 x.fillStyle=RD(cx,cy,T*.02,cx,cy,T*.5,[[0,'rgba(80,30,8,.5)'],[.35,'rgba(120,52,16,.26)'],[.8,'rgba(160,80,30,.09)'],[1,'rgba(160,80,30,0)']]);x.fillRect(px,py,T,T);
 for(let i=0;i<5;i++){const rd=T*(.09+i*.075);x.lineWidth=Math.max(1,T*.014);
  x.strokeStyle='rgba(255,240,196,'+(.34-i*.04)+')';x.beginPath();x.arc(cx,cy,rd,Math.PI*.75,Math.PI*1.75);x.stroke();
  x.strokeStyle='rgba(90,36,10,'+(.3-i*.04)+')';x.beginPath();x.arc(cx,cy,rd,-Math.PI*.25,Math.PI*.75);x.stroke()}
 for(let i=0;i<16;i++){const a0=i/16*TAU+R()*.3;x.strokeStyle=i%2?'rgba(255,236,190,.2)':'rgba(100,44,14,.2)';x.lineWidth=1;x.beginPath();for(let k=0;k<=6;k++){const f=k/6,a=a0+f*1.1,rd=T*(.46-.38*f),X=cx+Math.cos(a)*rd,Y=cy+Math.sin(a)*rd;k?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()}
 x.fillStyle=RD(cx,cy,0,cx,cy,T*.09,[[0,'rgba(30,10,2,.8)'],[1,'rgba(30,10,2,0)']]);x.fillRect(cx-T*.1,cy-T*.1,T*.2,T*.2);
 x.restore();x.strokeStyle='rgba(60,22,6,.28)';x.lineWidth=1.2;rr(px+1.5,py+1.5,T-3,T-3,T*.1);x.stroke()}
function qsDyn(t,px,py){const cx=px+T/2,cy=py+T*.5,seed=t.c*3.7+t.r*1.9;
 for(let i=0;i<9;i++){const f=((tm*.16+i/9+H(t.c,t.r,i)*.2)%1),rd=T*(.44-.4*f),a=seed+i*2.4+f*1.6,X=cx+Math.cos(a)*rd,Y=cy+Math.sin(a)*rd,al=Math.sin(f*Math.PI)*.55;
  x.fillStyle=(i%2?'rgba(255,238,196,':'rgba(120,56,20,')+al+')';x.beginPath();x.arc(X,Y,Math.max(.7,T*.012),0,TAU);x.fill()}
 x.save();x.globalCompositeOperation='lighter';x.fillStyle=RD(cx,cy,0,cx,cy,T*.3,[[0,'rgba(255,200,120,'+(.05+.03*Math.sin(tm*1.4+seed))+')'],[1,'rgba(255,200,120,0)']]);x.fillRect(px,py,T,T);x.restore()}

/* ---------- Gelände ---------- */
function tileStatic(t,px,py){const c=t.c,r=t.r,P=PAL[Math.floor(r/5)%4],R=MB(c*977+r*131+t.s*7+(t.v||0)*13+(t.t||0)*5);let g;
 if(t.s==0){x.fillStyle=LG(0,py,0,py+T,[[0,'#4a2c2a'],[1,'#2a1a22']]);rr(px+1,py+1,T-2,T-2,T*.08);x.fill();
  x.save();rr(px+1,py+1,T-2,T-2,T*.08);x.clip();
  for(let i=0;i<5;i++)stone(px+T*(.15+.7*R()),py+T*(.2+.65*R()),T*(.09+.1*R()),R,[104,70,66]);
  x.fillStyle='rgba(255,160,100,.09)';for(let i=0;i<8;i++){x.fillRect(px+T*R(),py+T*R(),1.4,1.4)}x.restore();return}
 const u=t.s==1,hd=u?T*.15:0;
 if(u){
  x.fillStyle=LG(0,py+T-hd-2,0,py+T,[[0,P[2]],[1,rgbs(mixc(hexc(P[2]),[60,16,4],.4))]]);rr(px+1,py+hd,T-2,T-hd-1,T*.1);x.fill();
  x.save();x.beginPath();x.rect(px,py+T-hd-1,T,hd+1);x.clip();
  for(let i=0;i<3;i++){const yy=py+T-hd+hd*(.2+i*.28);x.strokeStyle='rgba(70,24,6,.3)';x.lineWidth=1;x.beginPath();x.moveTo(px+2,yy);x.quadraticCurveTo(px+T*.5,yy+(R()-.5)*3,px+T-2,yy);x.stroke();x.strokeStyle='rgba(255,210,150,.2)';x.beginPath();x.moveTo(px+2,yy+1.2);x.quadraticCurveTo(px+T*.5,yy+1.2+(R()-.5)*3,px+T-2,yy+1.2);x.stroke()}
  for(let i=0;i<9;i++){x.fillStyle=R()<.5?'rgba(80,28,8,.4)':'rgba(255,215,160,.3)';x.fillRect(px+3+R()*(T-6),py+T-hd+R()*hd,1.4,1.2)}x.restore();
  x.save();rr(px+1,py+1,T-2,T-2-hd,T*.1);x.clip();
  x.fillStyle=LG(px,py,px+T,py+T-hd,[[0,P[0]],[1,P[1]]]);x.fillRect(px,py,T,T);
  x.fillStyle=RD(px+T*.28,py+T*.22,T*.02,px+T*.28,py+T*.22,T*.8,[[0,'rgba(255,244,205,.46)'],[1,'rgba(255,244,205,0)']]);x.fillRect(px,py,T,T);
  x.fillStyle=RD(px+T*.9,py+T*.9,T*.05,px+T*.9,py+T*.9,T*.7,[[0,'rgba(150,50,14,.24)'],[1,'rgba(150,50,14,0)']]);x.fillRect(px,py,T,T);
  const nr=t.v==2?3:6;for(let i=0;i<nr;i++){const yy=py+T*(.1+i*(.8/nr)+R()*.04),a=(R()-.5)*T*.16;
   x.strokeStyle='rgba(160,72,24,.26)';x.lineWidth=1.5;x.beginPath();x.moveTo(px+T*.04,yy);x.bezierCurveTo(px+T*.3,yy+a,px+T*.65,yy-a,px+T*.96,yy+a*.4);x.stroke();
   x.strokeStyle='rgba(255,240,196,.5)';x.lineWidth=1;x.beginPath();x.moveTo(px+T*.04,yy-1.6);x.bezierCurveTo(px+T*.3,yy+a-1.6,px+T*.65,yy-a-1.6,px+T*.96,yy+a*.4-1.6);x.stroke()}
  for(let i=0;i<Math.round(T*.9);i++){x.fillStyle=R()<.5?'rgba(140,60,18,.3)':'rgba(255,244,210,.5)';const s_=.6+R()*.9;x.fillRect(px+R()*T,py+R()*T,s_,s_)}
  if(t.v==1){x.fillStyle='rgba(255,244,205,.36)';ell(px+T*.45,py+T*.3,T*.38,T*.2,-.15);x.fill();x.strokeStyle='rgba(255,252,230,.6)';x.lineWidth=1.2;for(let i=0;i<4;i++){x.beginPath();x.arc(px+T*.5,py+T*(.95-i*.012),T*(.3+i*.1),Math.PI*1.2,Math.PI*1.8);x.stroke()}}
  if(t.v==2){x.fillStyle='rgba(120,46,14,.24)';x.fillRect(px,py,T,T);const cr=(x0,y0,n)=>{let ax=x0,ay=y0;for(let k=0;k<n;k++){const bx=ax+(R()-.35)*T*.22,by=ay+R()*T*.2;x.strokeStyle='rgba(80,28,8,.7)';x.lineWidth=1.7;x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.strokeStyle='rgba(255,226,170,.4)';x.lineWidth=1;x.beginPath();x.moveTo(ax+1.5,ay+1);x.lineTo(bx+1.5,by+1);x.stroke();if(R()<.4)cr(bx,by,2);ax=bx;ay=by}};cr(px+T*(.15+R()*.2),py+T*.08,4);cr(px+T*(.6+R()*.25),py+T*.3,3)}
  x.restore();
  x.strokeStyle='rgba(255,248,224,.62)';x.lineWidth=1.2;x.beginPath();x.moveTo(px+T*.12,py+1.5);x.lineTo(px+T*.88,py+1.5);x.stroke();
  if(t.t==4){const cx=px+T/2,cy=py+T*.42;g=RD(cx,cy,0,cx,cy,T*.46,[[0,'rgba(90,255,230,.55)'],[1,'rgba(90,255,230,0)']]);x.fillStyle=g;x.fillRect(px,py,T,T);
   for(let i=0;i<3;i++)crystal(cx+(i-1)*T*.17,cy+(i==1?-.05:.05)*T,T*(i==1?.13:.09),R,[22,120,130],[200,255,250],null)}
  if(t.t==1)for(let i=0;i<4;i++){const cx=px+T*(.2+.6*H(c,r,i+9)),cy=py+T*(.17+.5*H(c,r,i+3)),s=T*(.06+.05*H(c,r,i+1));crystal(cx,cy,s,R,[170,64,8],[255,206,92],'rgba(255,150,40,.55)')}
  if(t.t==2){stone(px+T*.34,py+T*.44,T*.2,R,[140,110,112]);stone(px+T*.68,py+T*.52,T*.15,R,[124,98,104])}
 }else{
  x.save();rr(px+1,py+1,T-2,T-2,T*.1);x.clip();
  x.fillStyle=LG(0,py,0,py+T,[[0,P[3]],[1,P[4]]]);x.fillRect(px,py,T,T);
  x.fillStyle=LG(0,py,0,py+T*.4,[[0,'rgba(60,16,4,.46)'],[1,'rgba(60,16,4,0)']]);x.fillRect(px,py,T,T*.4);
  x.fillStyle=LG(px,0,px+T*.22,0,[[0,'rgba(60,16,4,.28)'],[1,'rgba(60,16,4,0)']]);x.fillRect(px,py,T*.22,T);
  x.fillStyle=RD(px+T*.6,py+T*.85,T*.05,px+T*.6,py+T*.85,T*.6,[[0,'rgba(255,190,110,.2)'],[1,'rgba(255,190,110,0)']]);x.fillRect(px,py,T,T);
  for(let i=0;i<Math.round(T*.6);i++){x.fillStyle=R()<.5?'rgba(60,18,4,.3)':'rgba(255,214,160,.3)';const s_=.6+R()*1.1;x.fillRect(px+R()*T,py+R()*T,s_,s_)}
  for(let i=0;i<3;i++)stone(px+T*(.15+.7*R()),py+T*(.3+.55*R()),T*(.03+.03*R()),R,[128,90,66]);
  x.strokeStyle='rgba(255,210,150,.16)';x.lineWidth=1.2;for(let i=0;i<3;i++){const yy=py+T*(.3+.2*i);x.beginPath();x.moveTo(px+T*.12,yy);x.quadraticCurveTo(px+T*.5,yy+(H(c,r,i)*2-1)*T*.1,px+T*.88,yy);x.stroke()}
  x.restore();x.strokeStyle='rgba(255,220,160,.24)';x.lineWidth=1;rr(px+1.5,py+1.5,T-3,T-3,T*.1);x.stroke()}
 if(!u&&t.qs)qsStatic(px,py,P,R);
 if(!u&&t.cr&&!t.qs){const cx=px+T/2,cy=py+T*.55;g=RD(cx,cy,0,cx,cy,T*.34,t.cr==3?[[0,'rgba(230,190,120,.5)'],[.7,'rgba(200,150,80,.3)'],[1,'rgba(200,150,80,0)']]:[[0,t.cr==2?'rgba(30,12,4,.65)':'rgba(50,14,2,.7)'],[.6,t.cr==2?'rgba(50,24,8,.35)':'rgba(80,24,4,.35)'],[1,'rgba(0,0,0,0)']]);x.fillStyle=g;ell(cx,cy,T*.34,T*.28);x.fill();
  if(t.cr==3){x.strokeStyle='rgba(255,240,195,.5)';x.lineWidth=1.2;ell(cx,cy,T*.2,T*.16);x.stroke()}else{x.strokeStyle='rgba(255,130,50,.26)';x.lineWidth=1;ell(cx,cy,T*.2,T*.16);x.stroke()}}
 if(!u&&t.t==1&&t.st>0){const a=Math.min(1,t.st/40);for(let i=0;i<2+Math.ceil(a*4);i++){crystal(px+T*(.2+.6*H(c,r,i)),py+T*(.3+.45*H(c,r,i+4)),T*(.035+.03*a),R,[170,64,8],[255,206,92],'rgba(255,150,40,'+(.34*a)+')')}
  g=RD(px+T/2,py+T/2,0,px+T/2,py+T/2,T*.5,[[0,`rgba(255,150,50,${.2*a})`],[1,'rgba(255,150,50,0)']]);x.fillStyle=g;x.fillRect(px,py,T,T)}
 if(u&&L.p.ne&&SV.cl&&!t.f){const n=nb(c,r);if(n){x.font=`800 ${T*.42}px ui-rounded,system-ui`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=4;x.strokeStyle='rgba(60,18,6,.8)';x.lineJoin='round';x.strokeText(n,px+T/2,py+T*.45);x.fillStyle=NC[n];x.fillText(n,px+T/2,py+T*.45)}}}

/* ---------- Fließbänder ---------- */
function conduit(b,bld){
 const c=b.c,r=b.r,key=K(c,r),live=NET.has(key),arms=armsOf(b),par=parDir(b),px=c*T,py=BY-(r+1-camS)*T;
 const ph=live?tm*.7*PR:0,hub=bld||arms.length!=2,polys=arms.length?centerPolys(arms):[];NT.belt(b,c,r,px,py,live);
 x.lineCap='butt';x.lineJoin='round';
 if(!bld){
  if(polys.length){polyStroke(c,r,polys,.82,SHD+'.26)',.04,-.05);polyStroke(c,r,polys,.8,SHD+'.2)',.025,-.035);polyStroke(c,r,polys,.77,'#1c1614');polyStroke(c,r,polys,.73,'#c4b8a8',-.012,.014);polyStroke(c,r,polys,.73,'#6a625a');polyStroke(c,r,polys,.62,'#38332f');polyStroke(c,r,polys,.6,'#24201e')}
  const lanes=arms.length?lanesOf(arms,par):[];
  for(const l of lanes)polyStroke(c,r,[l.p],.16,'#120e0c');
  for(const l of lanes){polyStroke(c,r,[l.p],.125,l.k=='sp'?'#3a2c1e':'#1c2a34');x.setLineDash([T*.025,T*.065]);x.lineDashOffset=live?-tm*T*.45*PR:0;polyStroke(c,r,[l.p],.115,'rgba(0,0,0,.4)');x.setLineDash([])}
  if(polys.length){polyStroke(c,r,polys,.034,'#100c0a');
   x.setLineDash([.07*T,.16*T]);x.lineDashOffset=live?tm*T*.5*PR:0;polyStroke(c,r,polys,.02,live?(RES.dP>RES.sP||RES.dW>RES.sW?'#ffd36a':'#6fe4ff'):'#8a3a3a');x.setLineDash([])}
  for(const l of lanes)chevrons(c,r,l.p,live?(l.k=='sp'?'rgba(255,184,86,.9)':'rgba(130,226,255,.85)'):'#7a5050',live?ph:0);
  for(const a of arms){const d=DV[a],g=RG(d),e=[.5+d[0]*.46,.5+d[1]*.46],q1=SP(c,r,e[0]+g[0]*.37,e[1]+g[1]*.37),q2=SP(c,r,e[0]-g[0]*.37,e[1]-g[1]*.37);x.strokeStyle='#2e2622';x.lineWidth=T*.075;x.beginPath();x.moveTo(q1[0],q1[1]);x.lineTo(q2[0],q2[1]);x.stroke();x.strokeStyle='rgba(230,214,194,.75)';x.lineWidth=T*.035;x.stroke()}
  if(!hub&&polys.length){const straight=arms[1]-arms[0]==2;
   if(straight){const g=RG(DV[arms[0]]);for(let i=0;i<3;i++){const t=.2+i*.3,q=[.5+DV[arms[0]][0]*(.5-t),.5+DV[arms[0]][1]*(.5-t)];for(const sd of[-1,1]){const s=SP(c,r,q[0]+g[0]*.325*sd,q[1]+g[1]*.325*sd);bolt(s[0],s[1],Math.max(1,T*.02))}}}
   const q=straight?(DV[arms[0]][0]!=0?[.5,.5+.31]:[.5-.31,.5]):null;if(q){const s=SP(c,r,q[0],q[1]);x.fillStyle='#100c0a';x.beginPath();x.arc(s[0],s[1],T*.04,0,TAU);x.fill();x.fillStyle=live?'#5dff9a':(Math.sin(tm*8)>0?'#ff5a4a':'#4a1a1a');x.beginPath();x.arc(s[0],s[1],T*.028,0,TAU);x.fill();if(live)glow(s[0],s[1],T*.1,'rgba(93,255,154,A)',.4)}}
 }
 if(bld){const pw=T*.84,ph_=T*.52,qx=px+T*.5,qy=py+T*.7;
  for(const l of arms.map(a=>[[.5,.5],[.5+DV[a][0]*.5,.5+DV[a][1]*.5]]))polyStroke(c,r,[l],.46,'#1c1614'),polyStroke(c,r,[l],.4,'#6a625a');
  for(const a of arms){const d=DV[a],g=RG(d),q1=SP(c,r,.5+d[0]*.46+g[0]*.17,.5+d[1]*.46+g[1]*.17),q2=SP(c,r,.5+d[0]*.46-g[0]*.17,.5+d[1]*.46-g[1]*.17);x.strokeStyle=live?'rgba(114,220,255,.9)':'rgba(255,100,90,.8)';x.lineWidth=T*.03;x.beginPath();x.moveTo(q1[0],q1[1]);x.lineTo(q2[0],q2[1]);x.stroke()}
  rr(qx-pw/2+T*.04,qy-ph_/2+T*.07,pw,ph_,T*.08);x.fillStyle=SHD+'.3)';x.fill();
  rr(qx-pw/2,qy-ph_/2,pw,ph_,T*.08);x.fillStyle=LG(qx-pw/2,qy-ph_/2,qx+pw/2,qy+ph_/2,[[0,'#a89c8e'],[1,'#4a423c']]);x.fill();x.strokeStyle='#14100e';x.lineWidth=1.5;x.stroke();
  x.strokeStyle='rgba(255,246,226,.35)';x.lineWidth=1;x.beginPath();x.moveTo(qx-pw/2+T*.08,qy-ph_/2+1.5);x.lineTo(qx+pw/2-T*.08,qy-ph_/2+1.5);x.stroke();
  x.strokeStyle='rgba(0,0,0,.3)';for(let i=1;i<6;i++){x.beginPath();x.moveTo(qx-pw/2+pw*i/6,qy-ph_/2+3);x.lineTo(qx-pw/2+pw*i/6,qy+ph_/2-3);x.stroke()}
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b2])=>bolt(qx+a*(pw/2-T*.07),qy+b2*(ph_/2-T*.07),Math.max(1,T*.022)));
  x.strokeStyle=live?'rgba(114,220,255,.45)':'rgba(255,90,80,.5)';x.lineWidth=1.2;rr(qx-pw/2+T*.05,qy-ph_/2+T*.05,pw-T*.1,ph_-T*.1,T*.06);x.stroke()}
 else if(hub){const cx=px+T/2,cy=py+T/2,R_=T*.3;
  x.fillStyle=SHD+'.3)';x.beginPath();x.arc(cx+T*.03,cy+T*.04,R_*1.05,0,TAU);x.fill();x.fillStyle='#14100e';x.beginPath();x.arc(cx,cy,R_*1.07,0,TAU);x.fill();
  x.fillStyle=RD(cx-R_*.35,cy-R_*.35,R_*.1,cx,cy,R_,[[0,'#e8dccb'],[.55,'#8c8174'],[1,'#3a322c']]);x.beginPath();x.arc(cx,cy,R_*.97,0,TAU);x.fill();
  for(let i=0;i<8;i++){const a=i/8*TAU;bolt(cx+Math.cos(a)*R_*.84,cy+Math.sin(a)*R_*.84,Math.max(1,T*.02))}
  x.fillStyle='#1a1614';x.beginPath();x.arc(cx,cy,R_*.62,0,TAU);x.fill();
  x.strokeStyle=live?'rgba(255,200,100,.95)':'#6a4a46';x.lineWidth=Math.max(1.2,T*.026);x.lineCap='round';for(let i=0;i<4;i++){const a=tm*(live?.8*PR:0)+i*Math.PI/2;x.beginPath();x.arc(cx,cy,R_*.78,a,a+.7);x.stroke()}
  const gg=RD(cx,cy,0,cx,cy,R_*.55,[[0,live?'rgba(160,240,255,.95)':'rgba(255,90,80,.8)'],[1,'rgba(0,0,0,0)']]);x.fillStyle=gg;x.beginPath();x.arc(cx,cy,R_*.55,0,TAU);x.fill();x.fillStyle=live?'#d8faff':'#ffb4a8';x.beginPath();x.arc(cx,cy,R_*.14,0,TAU);x.fill()}
 if(!live&&!bld){x.fillStyle=`rgba(255,60,50,${.1+.07*Math.sin(tm*6)})`;x.fillRect(px,py,T,T)}}

/* ---------- Transportgüter ---------- */
function pktArt(k,px,py,z){
 x.fillStyle=SHD+'.34)';ell(px+z*.02,py+z*.045,z*.085,z*.03);x.fill();
 if(k=='am'){x.fillStyle='rgba(110,215,255,.24)';x.beginPath();x.arc(px,py,z*.15,0,TAU);x.fill();x.fillStyle=LG(px-z*.05,0,px+z*.05,0,[[0,'#7fb0c4'],[.4,'#f0fdff'],[1,'#3f7a92']]);rr(px-z*.05,py-z*.09,z*.1,z*.18,z*.04);x.fill();x.strokeStyle='#18323f';x.lineWidth=1;x.stroke();x.fillStyle='#2e8fbf';x.fillRect(px-z*.05,py+z*.01,z*.1,z*.045)}
 else if(k=='sup'){x.fillStyle=LG(0,py-z*.1,0,py+z*.03,[[0,'#e0b070'],[1,'#a67440']]);rr(px-z*.08,py-z*.1,z*.16,z*.13,z*.015);x.fill();x.strokeStyle='#4a3014';x.lineWidth=1;x.stroke();x.fillStyle='#4a3014';x.fillRect(px-z*.012,py-z*.1,z*.024,z*.13);x.fillStyle='rgba(255,244,214,.45)';x.fillRect(px-z*.07,py-z*.09,z*.14,z*.02);x.fillStyle='#e8c050';x.fillRect(px-z*.075,py-z*.02,z*.15,z*.018)}
 else if(k=='wat'||k=='wt'){x.fillStyle=LG(px-z*.06,0,px+z*.06,0,[[0,'#2c70a8'],[.4,'#86ccf6'],[1,'#1d4e7a']]);rr(px-z*.06,py-z*.11,z*.12,z*.15,z*.03);x.fill();x.strokeStyle='#0f2c44';x.lineWidth=1;x.stroke();x.fillStyle='rgba(10,30,50,.5)';x.fillRect(px-z*.06,py-z*.07,z*.12,z*.016);x.fillRect(px-z*.06,py-z*.02,z*.12,z*.016);if(k=='wt')glow(px,py-z*.04,z*.2,'rgba(120,210,255,A)',.4)}
 else if(k=='pwr'){glow(px,py-z*.04,z*.2,'rgba(255,220,80,A)',.55);x.fillStyle=LG(0,py-z*.09,0,py+z*.01,[[0,'#fff08a'],[1,'#d8a020']]);rr(px-z*.07,py-z*.09,z*.14,z*.1,z*.025);x.fill();x.strokeStyle='#5a3e00';x.lineWidth=1;x.stroke();x.fillStyle='#2a1e00';x.fillRect(px-z*.015,py-z*.12,z*.03,z*.03);x.beginPath();x.moveTo(px+z*.01,py-z*.08);x.lineTo(px-z*.03,py-z*.04);x.lineTo(px,py-z*.04);x.lineTo(px-z*.01,py);x.lineTo(px+z*.04,py-z*.05);x.lineTo(px+z*.01,py-z*.05);x.fill()}
 else if(k=='scrap'){const pts=[[px-z*.08,py],[px-z*.05,py-z*.09],[px+z*.03,py-z*.11],[px+z*.09,py-z*.03],[px+z*.06,py+z*.02]];faceted(px,py-z*.04,pts,[80,70,72],[226,220,226])}
 else if(k=='ret'){x.fillStyle=LG(0,py-z*.1,0,py,[[0,'#a88468'],[1,'#5e4634']]);x.beginPath();x.moveTo(px-z*.08,py);x.quadraticCurveTo(px-z*.1,py-z*.1,px,py-z*.1);x.quadraticCurveTo(px+z*.1,py-z*.09,px+z*.08,py);x.closePath();x.fill();x.strokeStyle='#2a1c14';x.lineWidth=1;x.stroke();x.fillStyle='#ff9a2e';x.fillRect(px-z*.02,py-z*.07,z*.03,z*.03);x.fillStyle='rgba(255,255,255,.3)';x.fillRect(px-z*.05,py-z*.08,z*.05,z*.015)}
 else{const od=k=='od';glow(px,py-z*.02,z*.22,od?'rgba(255,244,196,A)':'rgba(255,176,56,A)',.65);
  const pts=[[px,py-z*.12],[px+z*.075,py-z*.03],[px+z*.06,py+z*.05],[px-z*.02,py+z*.07],[px-z*.08,py]];
  faceted(px,py-z*.02,pts,od?[190,150,70]:[170,64,8],od?[255,252,224]:[255,204,92]);x.fillStyle='rgba(255,252,226,.9)';x.beginPath();x.arc(px-z*.025,py-z*.06,z*.014,0,TAU);x.fill()}}
function drawPkt(q){const s=pktPos(q);if(!s)return;if(q.kind=='sand'||q.kind=='crystals'||q.kind=='ecsale'){x.fillStyle='rgba(10,15,22,.4)';ell(s[0]+2,s[1]+3,T*.07,T*.03);x.fill();if(q.kind=='sand'){x.fillStyle='#cdb382';rr(s[0]-T*.08,s[1]-T*.065,T*.16,T*.12,T*.025);x.fill();x.strokeStyle='#604829';x.lineWidth=1;x.stroke();for(let j=0;j<5;j++){x.fillStyle=j%2?'#ebd09e':'#927344';x.fillRect(s[0]+(j%3-1)*T*.04,s[1]+(j%2-1)*T*.025,1.5,1.5)}}else crystal(s[0],s[1],T*.075,()=>.5,[25,94,144],[170,255,255],'rgba(80,220,255,.35)');NT.pkt(q,s);return}pktArt(q.kind,s[0],s[1],T*1.2);NT.pkt(q,s)}

/* ---------- Licht & Material ---------- */
function shdw(px,py,s,w){w=w||.44;for(let i=0;i<3;i++){x.fillStyle=SHD+'.15)';ell(px+s*(.15+i*.01),py+s*.015,s*(w+i*.03),s*(.12+i*.015));x.fill()}}
function prism(px,py,w,h,f,sd,tp_,dx,dy){const s=T;dx=(dx??.1)*s;dy=(dy??.08)*s;
 x.fillStyle=LG(0,py-h,0,py,[[0,f[0]],[1,f[1]]]);x.fillRect(px-w/2,py-h,w,h);
 const n=Math.max(2,Math.round(w/(s*.17)));x.lineWidth=1;for(let i=1;i<n;i++){const xx=px-w/2+w*i/n;x.strokeStyle='rgba(40,12,0,.24)';x.beginPath();x.moveTo(xx,py-h);x.lineTo(xx,py);x.stroke();x.strokeStyle='rgba(255,246,226,.16)';x.beginPath();x.moveTo(xx+1,py-h);x.lineTo(xx+1,py);x.stroke()}
 x.fillStyle=LG(0,py-h*.4,0,py,[[0,'rgba(120,50,14,0)'],[1,'rgba(120,50,14,.26)']]);x.fillRect(px-w/2,py-h*.4,w,h*.4);
 if(h>s*.1){rivRow(px-w/2+4,py-h+3,px+w/2-4,py-h+3,Math.max(2,Math.round(w/(s*.1))),Math.max(.8,s*.012))}
 x.fillStyle=sd;x.beginPath();x.moveTo(px+w/2,py-h);x.lineTo(px+w/2+dx,py-h-dy);x.lineTo(px+w/2+dx,py-dy);x.lineTo(px+w/2,py);x.fill();
 x.fillStyle='rgba(60,16,0,.16)';x.beginPath();x.moveTo(px+w/2,py-h);x.lineTo(px+w/2+dx,py-h-dy);x.lineTo(px+w/2+dx,py-dy);x.lineTo(px+w/2,py);x.fill();
 x.fillStyle=tp_;x.beginPath();x.moveTo(px-w/2,py-h);x.lineTo(px-w/2+dx,py-h-dy);x.lineTo(px+w/2+dx,py-h-dy);x.lineTo(px+w/2,py-h);x.fill();
 x.strokeStyle='rgba(255,250,232,.4)';x.lineWidth=1;x.beginPath();x.moveTo(px-w/2,py-h+.5);x.lineTo(px+w/2,py-h+.5);x.stroke();
 x.strokeStyle='rgba(40,14,4,.5)';x.lineWidth=1;x.strokeRect(px-w/2+.5,py-h+.5,w-1,h-1)}
function cyl(cx,yt,yb,rw,cols,cap){const ry=rw*.34,g=LG(cx-rw,0,cx+rw,0,[[0,cols[0]],[.3,cols[1]],[.62,cols[2]],[1,cols[3]]]);
 x.fillStyle=g;ell(cx,yb,rw,ry);x.fill();x.fillRect(cx-rw,yt,rw*2,yb-yt);
 x.fillStyle=cap||RD(cx-rw*.3,yt-ry*.2,rw*.05,cx,yt,rw,[[0,'#fffaf0'],[1,'#a89c8e']]);ell(cx,yt,rw,ry);x.fill();x.strokeStyle='rgba(40,20,10,.55)';x.lineWidth=1;x.stroke()}
function ring(cx,y,rw,col){const ry=rw*.34;x.strokeStyle=col||'rgba(50,30,20,.55)';x.lineWidth=Math.max(1,rw*.1);x.beginPath();x.ellipse(cx,y,rw,ry,0,0,Math.PI);x.stroke()}
const STEEL=['#9a928a','#ece6da','#b4aca0','#5e564e'];
function hzS(px,py,w,h){stripes(px,py,w,h,'#f0b020','#1a1412')}
function tube2(x0,y0,x1,y1,wd){x.lineCap='round';x.strokeStyle='#14100e';x.lineWidth=wd+2;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();x.strokeStyle='#8a8076';x.lineWidth=wd;x.stroke();x.strokeStyle='rgba(255,250,236,.45)';x.lineWidth=wd*.3;x.beginPath();x.moveTo(x0,y0-wd*.2);x.lineTo(x1,y1-wd*.2);x.stroke();x.lineCap='butt'}

/* ---------- Gebäude ---------- */
const SPR={};
Object.assign(SPR,{
 hub(px,py,s,b){shdw(px,py,s,.5);prism(px,py,s*.84,s*.2,['#b4aca2','#6e665e'],'#4c4640','#d2cac0');stripes(px,py,s*.84,s*.05,'#f0b020','#1a1412');
  const cy=py-s*.2,Rw=s*.33,Rh=s*.43;
  x.fillStyle=SHD+'.22)';ell(px+s*.04,cy,Rw,Rh*.2);x.fill();
  x.fillStyle=RD(px-Rw*.45,cy-Rh*.85,s*.03,px,cy-Rh*.3,Rh*1.35,[[0,'#fff6e8'],[.4,'#b4a898'],[1,'#4a4038']]);x.beginPath();x.ellipse(px,cy,Rw,Rh,0,Math.PI,0);x.closePath();x.fill();
  x.strokeStyle='rgba(50,30,18,.55)';x.lineWidth=1.2;for(let i=-2;i<=2;i++){if(!i)continue;x.beginPath();x.ellipse(px,cy,Math.abs(Rw*(i/2.4)),Rh,0,Math.PI,0);x.stroke()}x.beginPath();x.moveTo(px-Rw,cy);x.lineTo(px+Rw,cy);x.stroke();
  x.strokeStyle='rgba(255,255,240,.5)';x.lineWidth=1;x.beginPath();x.ellipse(px-1,cy-1,Rw*.96,Rh*.97,0,Math.PI*1.1,Math.PI*1.5);x.stroke();
  for(let i=0;i<5;i++)bolt(px+(i-2)*Rw*.38,cy-Rh*.06-Math.abs(i-2)*s*.012,Math.max(.9,s*.012));
  const gl=.65+.35*Math.sin(tm*3);x.fillStyle='#0a1520';rr(px-s*.21,cy-s*.2,s*.42,s*.09,s*.03);x.fill();x.fillStyle=LG(px-s*.2,0,px+s*.2,0,[[0,`rgba(60,170,230,${gl})`],[.5,`rgba(160,244,255,${gl})`],[1,`rgba(60,170,230,${gl})`]]);rr(px-s*.2,cy-s*.19,s*.4,s*.065,s*.025);x.fill();glow(px,cy-s*.15,s*.4,'rgba(114,220,255,A)',.24*gl);
  x.fillStyle='#14100e';rr(px-s*.08,py-s*.2,s*.16,s*.2,3);x.fill();x.strokeStyle='rgba(114,220,255,.85)';x.lineWidth=1.3;x.stroke();x.fillStyle='rgba(114,220,255,.3)';x.fillRect(px-s*.065,py-s*.02,s*.13,s*.02);
  x.strokeStyle='#d6cdbf';x.lineWidth=2;x.beginPath();x.moveTo(px+s*.15,cy-s*.4);x.lineTo(px+s*.15,cy-s*.72);x.stroke();x.fillStyle='#efe6d8';ell(px+s*.15,cy-s*.58,s*.1,s*.035,-.5);x.fill();x.strokeStyle='#6a5e52';x.lineWidth=1;x.stroke();
  const bl_=Math.sin(tm*4)>0;x.fillStyle=bl_?'#ff4a3a':'#5a1a14';x.beginPath();x.arc(px+s*.15,cy-s*.74,3,0,TAU);x.fill();if(bl_)glow(px+s*.15,cy-s*.74,s*.15,'rgba(255,80,60,A)',.6)},
 raf(px,py,s,b){shdw(px,py,s,.48);prism(px,py,s*.84,s*.13,['#8a8078','#4c443e'],'#34302c','#aca298');hzS(px,py,s*.84,s*.035);
  const lv=b?clamp(b.stock/40,0,1):.4;
  tube2(px-s*.2,py-s*.4,px+s*.2,py-s*.4,s*.05);
  for(const i of[-1,1]){const tx=px+i*s*.21;cyl(tx,py-s*.56,py-s*.1,s*.15,STEEL);ring(tx,py-s*.2,s*.15);ring(tx,py-s*.46,s*.15);
   x.fillStyle='#0c0806';rr(tx-s*.055,py-s*.5,s*.11,s*.33,s*.03);x.fill();const hh=s*.31*Math.max(.12,lv);x.fillStyle=LG(0,py-s*.19-hh,0,py-s*.19,[[0,'rgba(255,214,100,.98)'],[1,'rgba(255,120,24,.98)']]);x.fillRect(tx-s*.045,py-s*.19-hh,s*.09,hh);x.fillStyle='rgba(255,255,255,.28)';x.fillRect(tx-s*.04,py-s*.5,s*.018,s*.31);glow(tx,py-s*.3,s*.24,'rgba(255,160,50,A)',.3*(.7+.3*Math.sin(tm*3+i)));
   for(let k=0;k<6;k++){const a=k/6*TAU;bolt(tx+Math.cos(a)*s*.115,py-s*.56+Math.sin(a)*s*.04,Math.max(.8,s*.01))}}
  cyl(px,py-s*.7,py-s*.4,s*.045,['#3a322c','#7a7066','#524a42','#1e1a16'],'#2a2420');x.fillStyle='#f4ecde';x.fillRect(px-s*.058,py-s*.72,s*.116,s*.028);
  const ff=Math.sin(tm*5);x.fillStyle=`rgba(255,150,50,${.6+.2*ff})`;x.beginPath();x.moveTo(px-s*.04,py-s*.72);x.quadraticCurveTo(px-s*.05,py-s*.84-ff*2,px,py-s*.95-ff*3);x.quadraticCurveTo(px+s*.05,py-s*.84,px+s*.04,py-s*.72);x.fill();x.fillStyle='rgba(255,240,180,.9)';x.beginPath();x.moveTo(px-s*.02,py-s*.72);x.quadraticCurveTo(px,py-s*.8,px,py-s*.86-ff*2);x.quadraticCurveTo(px+s*.02,py-s*.78,px+s*.02,py-s*.72);x.fill();glow(px,py-s*.82,s*.34,'rgba(255,150,50,A)',.34)},
 kas(px,py,s,b){shdw(px,py,s,.48);prism(px,py,s*.8,s*.4,['#d8a878','#946a46'],'#664a2e','#f0cca0');
  x.fillStyle='rgba(90,50,20,.14)';for(let i=0;i<4;i++)x.fillRect(px-s*.4,py-s*.08-i*s*.09,s*.8,1.2);
  stripes(px,py,s*.8,s*.04,'#f0b020','#1a1410');
  x.fillStyle=LG(0,py-s*.66,0,py-s*.4,[[0,'#d8744a'],[1,'#8a3a28']]);x.beginPath();x.moveTo(px-s*.44,py-s*.4);x.lineTo(px-s*.25,py-s*.64);x.lineTo(px+s*.25,py-s*.64);x.lineTo(px+s*.44,py-s*.4);x.closePath();x.fill();
  x.fillStyle='#e8885a';x.beginPath();x.moveTo(px+s*.44,py-s*.4);x.lineTo(px+s*.25,py-s*.64);x.lineTo(px+s*.35,py-s*.72);x.lineTo(px+s*.54,py-s*.48);x.closePath();x.fill();x.fillStyle='rgba(60,10,0,.2)';x.fill();
  x.lineWidth=1;for(let i=0;i<9;i++){const t=i/8;x.strokeStyle='rgba(60,14,6,.45)';x.beginPath();x.moveTo(px-s*.44+t*s*.88,py-s*.4);x.lineTo(px-s*.25+t*s*.5,py-s*.64);x.stroke();x.strokeStyle='rgba(255,226,196,.22)';x.beginPath();x.moveTo(px-s*.44+t*s*.88+1,py-s*.4);x.lineTo(px-s*.25+t*s*.5+1,py-s*.64);x.stroke()}
  x.strokeStyle='rgba(255,236,210,.6)';x.lineWidth=1.2;x.beginPath();x.moveTo(px-s*.25,py-s*.64);x.lineTo(px+s*.25,py-s*.64);x.stroke();
  const act=b&&b.q&&b.q[0]&&b.q[0].arr;x.fillStyle='#120a08';rr(px-s*.12,py-s*.27,s*.24,s*.27,3);x.fill();x.strokeStyle='#5a4230';x.lineWidth=2;x.stroke();
  if(act){x.fillStyle=`rgba(255,196,96,${.55+.3*Math.sin(tm*9)})`;rr(px-s*.095,py-s*.25,s*.19,s*.23,2);x.fill();glow(px,py-s*.12,s*.32,'rgba(255,176,76,A)',.34)}else{x.fillStyle='rgba(114,220,255,.4)';x.fillRect(px-s*.09,py-s*.05,s*.18,s*.02)}
  for(const i of[-1,1]){const wx=px+i*s*.27;x.fillStyle='#10161c';x.fillRect(wx-s*.05,py-s*.31,s*.1,s*.1);x.fillStyle='rgba(255,210,130,.75)';x.fillRect(wx-s*.045,py-s*.3,s*.09,s*.03);x.strokeStyle='#3a2e24';x.lineWidth=1;x.strokeRect(wx-s*.05,py-s*.31,s*.1,s*.1)}
  x.strokeStyle='#5a4636';x.lineWidth=2;x.beginPath();x.moveTo(px+s*.3,py-s*.66);x.lineTo(px+s*.3,py-s*.97);x.stroke();x.fillStyle='#d8362a';x.beginPath();x.moveTo(px+s*.3,py-s*.97);x.quadraticCurveTo(px+s*.42,py-s*.97+Math.sin(tm*4)*3,px+s*.52,py-s*.9+Math.sin(tm*4+1)*2);x.lineTo(px+s*.3,py-s*.8);x.fill();x.fillStyle='rgba(255,255,255,.2)';x.fillRect(px+s*.31,py-s*.95,s*.1,2)},
 tur(px,py,s,b){shdw(px,py,s,.42);
  x.fillStyle=LG(0,py-s*.26,0,py,[[0,'#9a9086'],[1,'#554c46']]);x.beginPath();x.moveTo(px-s*.36,py);x.lineTo(px-s*.21,py-s*.26);x.lineTo(px+s*.21,py-s*.26);x.lineTo(px+s*.36,py);x.closePath();x.fill();x.strokeStyle='rgba(30,16,8,.55)';x.lineWidth=1;x.stroke();
  x.fillStyle='rgba(60,20,0,.22)';x.beginPath();x.moveTo(px+s*.21,py-s*.26);x.lineTo(px+s*.36,py);x.lineTo(px+s*.2,py);x.closePath();x.fill();
  x.fillStyle='#c4baae';x.beginPath();x.moveTo(px-s*.21,py-s*.26);x.lineTo(px+s*.21,py-s*.26);x.lineTo(px+s*.11,py-s*.34);x.lineTo(px-s*.11,py-s*.34);x.closePath();x.fill();
  stripes(px,py,s*.7,s*.04,'#f0b020','#1a1412');rivRow(px-s*.15,py-s*.3,px+s*.15,py-s*.3,4,Math.max(.8,s*.012));
  cyl(px,py-s*.5,py-s*.32,s*.11,STEEL);
  const live=b?isOn(b):true,ang=b&&b.aim!=null?b.aim:Math.sin(tm*.8+(b?b.ph:0))*.8,cy=py-s*.56;x.save();x.translate(px,cy);
  x.fillStyle=LG(0,-s*.12,0,s*.12,[[0,'#f0eadc'],[1,'#a49a8c']]);rr(-s*.17,-s*.12,s*.34,s*.24,s*.07);x.fill();x.strokeStyle='#32281e';x.lineWidth=1;x.stroke();bolt(-s*.11,-s*.06,Math.max(.8,s*.012));bolt(s*.11,-s*.06,Math.max(.8,s*.012));
  x.rotate(ang);const rc=b&&b.rc?b.rc:0;x.fillStyle=LG(0,-s*.05,0,s*.05,[[0,'#8a8076'],[.4,'#3e3832'],[1,'#1c1814']]);x.fillRect(s*.06-rc,-s*.045,s*.4,s*.09);x.fillStyle=LG(0,-s*.06,0,s*.06,[[0,'#a49a8e'],[1,'#3a342e']]);x.fillRect(s*.3-rc,-s*.06,s*.1,s*.12);x.fillStyle=live?'#72dcff':'#5a5048';x.beginPath();x.arc(s*.43-rc,0,s*.03,0,TAU);x.fill();if(live){x.fillStyle='rgba(114,220,255,.45)';x.beginPath();x.arc(s*.43-rc,0,s*.06,0,TAU);x.fill()}x.restore();
  x.strokeStyle=`rgba(114,220,255,${live?.45+.3*Math.sin(tm*3):.12})`;x.lineWidth=1.5;ell(px,py-s*.3,s*.27,s*.075);x.stroke();if(live)glow(px,cy,s*.3,'rgba(114,220,255,A)',.12)},
 fab(px,py,s,b){shdw(px,py,s,.5);prism(px,py,s*.88,s*.36,['#b0a89e','#66605a'],'#443e38','#cec6bc');
  for(let i=0;i<3;i++){const ox=px-s*.44+i*s*.293;x.fillStyle=LG(ox,py-s*.56,ox+s*.27,py-s*.36,[[0,'#f2ece0'],[1,'#a49c90']]);x.beginPath();x.moveTo(ox,py-s*.36);x.lineTo(ox,py-s*.56);x.lineTo(ox+s*.27,py-s*.36);x.closePath();x.fill();x.fillStyle='#7e766c';x.beginPath();x.moveTo(ox,py-s*.56);x.lineTo(ox+s*.27,py-s*.36);x.lineTo(ox+s*.27,py-s*.4);x.lineTo(ox+s*.03,py-s*.56);x.closePath();x.fill();x.strokeStyle='rgba(40,20,10,.5)';x.lineWidth=1;x.stroke();x.fillStyle='rgba(130,210,250,.6)';x.fillRect(ox+s*.015,py-s*.5,s*.03,s*.1)}
  hzS(px,py,s*.88,s*.06);const act=b&&b.q&&b.q[0]&&b.q[0].arr;x.fillStyle='#100c0a';rr(px-s*.17,py-s*.27,s*.34,s*.21,3);x.fill();x.strokeStyle='#4a4038';x.lineWidth=1.5;x.stroke();x.fillStyle=act?`rgba(255,184,84,${.55+.4*Math.sin(tm*12)})`:'rgba(114,220,255,.34)';x.fillRect(px-s*.15,py-s*.25,s*.3,s*.05);if(act)glow(px,py-s*.15,s*.38,'rgba(255,176,76,A)',.34);
  cyl(px+s*.31,py-s*.84,py-s*.34,s*.065,['#322c28','#7a7066','#4e463e','#1c1814'],'#241f1b');x.fillStyle='#f0b020';x.fillRect(px+s*.245,py-s*.7,s*.13,s*.03);
  for(let i=0;i<3;i++){const t_=((tm*.8+i*.33)%1);x.fillStyle=`rgba(150,130,118,${.45*(1-t_)})`;x.beginPath();x.arc(px+s*.31+t_*s*.14,py-s*.86-t_*s*.34,s*.045+t_*s*.06,0,TAU);x.fill()}
  x.strokeStyle='#e8a830';x.lineWidth=3;x.lineJoin='round';x.beginPath();const a=act?Math.sin(tm*5)*.08:0;x.moveTo(px-s*.34,py-s*.36);x.lineTo(px-s*.34,py-s*.66-a*s);x.lineTo(px-s*.07,py-s*.66-a*s);x.lineTo(px-s*.07,py-s*.54);x.stroke();x.strokeStyle='rgba(255,240,180,.6)';x.lineWidth=1;x.stroke();
  x.fillStyle='#e8a830';x.beginPath();x.arc(px-s*.07,py-s*.52,s*.03,0,TAU);x.fill();
  const gx=px+s*.05,gy=py-s*.62;x.save();x.translate(gx,gy);x.rotate(tm*(act?2:.5));x.fillStyle='#c8921f';for(let i=0;i<8;i++){x.rotate(Math.PI/4);x.fillRect(-s*.013,-s*.08,s*.026,s*.032)}x.beginPath();x.arc(0,0,s*.058,0,TAU);x.fill();x.fillStyle='#f8cc58';x.beginPath();x.arc(-1,-1,s*.04,0,TAU);x.fill();x.fillStyle='#2a1e08';x.beginPath();x.arc(0,0,s*.02,0,TAU);x.fill();x.restore()},
 ene(px,py,s,b){shdw(px,py,s,.46);prism(px,py,s*.7,s*.07,['#8a8078','#4c443e'],'#322c28','#aca298',.06,.04);
  cyl(px,py-s*.42,py-s*.07,s*.045,STEEL);
  for(const i of[-1,1]){x.save();x.translate(px+i*s*.21,py-s*.35);x.rotate(i*.22);
   x.fillStyle=SHD+'.28)';x.fillRect(-s*.18,-s*.12,s*.4,s*.3);
   x.fillStyle=LG(-s*.2,-s*.15,s*.2,s*.15,[[0,'#3a86d0'],[.5,'#2258a8'],[1,'#143272']]);x.fillRect(-s*.19,-s*.15,s*.38,s*.3);
   x.strokeStyle='rgba(190,224,255,.5)';x.lineWidth=1;x.beginPath();for(let k=1;k<5;k++){x.moveTo(-s*.19+k*s*.076,-s*.15);x.lineTo(-s*.19+k*s*.076,s*.15)}for(let k=1;k<3;k++){x.moveTo(-s*.19,-s*.15+k*s*.1);x.lineTo(s*.19,-s*.15+k*s*.1)}x.stroke();
   x.fillStyle=LG(-s*.19,-s*.15,s*.1,s*.1,[[0,'rgba(255,240,200,.6)'],[1,'rgba(255,240,200,0)']]);x.fillRect(-s*.19,-s*.15,s*.38,s*.3);
   x.strokeStyle='#d4cabc';x.lineWidth=1.6;x.strokeRect(-s*.19,-s*.15,s*.38,s*.3);x.restore()}
  const p=.5+.5*Math.sin(tm*3);x.fillStyle='#5a5048';ell(px,py-s*.45,s*.06,s*.025);x.fill();x.fillStyle=`rgba(180,246,255,${.7+.3*p})`;x.beginPath();x.arc(px,py-s*.58,s*.06,0,TAU);x.fill();glow(px,py-s*.58,s*.36,'rgba(114,220,255,A)',.45*p+.12);
  x.strokeStyle='#d0c6b8';x.lineWidth=2;x.beginPath();x.moveTo(px,py-s*.44);x.lineTo(px,py-s*.54);x.stroke();
  if(Math.sin(tm*7+(b?b.ph:0))>.55){x.strokeStyle='rgba(220,254,255,.9)';x.lineWidth=1.4;x.beginPath();x.moveTo(px,py-s*.58);let qx=px,qy=py-s*.58;for(let i=0;i<4;i++){qx+=(Math.random()-.4)*s*.12;qy+=s*.05;x.lineTo(qx,qy)}x.stroke()}},
 wel(px,py,s,b){shdw(px,py,s,.42);const tk=b?b.tank:2,fill=clamp(tk/4,0,1);prism(px,py,s*.52,s*.22,['#8a96a4','#4a5664'],'#303a48','#b0bccb',.08,.06);
  x.fillStyle='#0a121a';rr(px-s*.18,py-s*.19,s*.36,s*.14,3);x.fill();const hh=s*.12*Math.max(.1,fill);x.fillStyle=LG(0,py-s*.05-hh,0,py-s*.05,[[0,'#98e0ff'],[1,'#2a82c8']]);x.fillRect(px-s*.165,py-s*.05-hh,s*.33,hh);x.fillStyle='rgba(255,255,255,.3)';x.fillRect(px-s*.16,py-s*.18,s*.02,s*.12);
  const g=LG(px-s*.15,0,px+s*.15,0,[[0,'#9a9ea8'],[.4,'#fff6ea'],[1,'#6e6a72']]);x.fillStyle=g;x.beginPath();x.moveTo(px-s*.15,py-s*.22);x.lineTo(px-s*.07,py-s*.88);x.lineTo(px+s*.07,py-s*.88);x.lineTo(px+s*.15,py-s*.22);x.closePath();x.fill();x.strokeStyle='rgba(50,40,40,.5)';x.lineWidth=1;x.stroke();
  for(let i=0;i<5;i++){const y=py-s*(.3+i*.11),w_=s*(.115-i*.012);x.fillStyle='rgba(60,50,60,.45)';x.fillRect(px-w_,y,w_*2,s*.03);x.fillStyle='rgba(255,255,255,.28)';x.fillRect(px-w_,y-1,w_*2,1)}
  x.fillStyle='#f4faff';x.beginPath();x.moveTo(px-s*.07,py-s*.88);x.lineTo(px+s*.07,py-s*.88);x.lineTo(px,py-s*.97);x.closePath();x.fill();x.strokeStyle='rgba(50,40,40,.5)';x.stroke();
  x.fillStyle='rgba(140,226,255,.98)';for(let i=0;i<3;i++){const t_=((tm*.5+i*.33+(b?b.ph:0))%1);ell(px+(i-1)*s*.07,py-s*.82+t_*s*.55,s*.012,s*.022);x.fill()}
  for(const i of[-1,1]){x.strokeStyle='#5a5048';x.lineWidth=3;x.beginPath();x.moveTo(px+i*s*.14,py-s*.3);x.lineTo(px+i*s*.34,py-s*.2);x.stroke();x.strokeStyle='#cfc4b6';x.lineWidth=1.2;x.stroke();x.fillStyle=LG(px+i*s*.3-s*.1,0,px+i*s*.3+s*.1,0,[[0,'#ece4d6'],[1,'#7a6e66']]);x.beginPath();x.moveTo(px+i*s*.34-s*.08,py-s*.2);x.lineTo(px+i*s*.34+s*.08,py-s*.2);x.lineTo(px+i*s*.34,py-s*.12);x.closePath();x.fill()}}
});
function bFX(b,px,py,s){
 const k=b.k,act=(b.q&&b.q[0]&&b.q[0].arr)||k=='raf'||k=='ene'||k=='hub';
 if(act){const col=k=='ene'||k=='hub'?'rgba(150,230,255,A)':'rgba(255,170,70,A)';x.save();x.globalCompositeOperation='lighter';
  const a=(.1+.04*Math.sin(tm*2.6+b.c*1.7+b.r))*(k=='raf'?1.4:1);x.fillStyle=RD(px,py-s*.02,s*.05,px,py-s*.02,s*.85,[[0,col.replace('A',a)],[1,col.replace('A',0)]]);x.save();x.translate(px,py);x.scale(1,.38);x.translate(-px,-py);x.fillRect(px-s,py-s,s*2,s*2);x.restore();x.restore()}
 const ph=Math.sin(tm*.9+b.c*2.3+b.r*1.9);if(ph>.9){const a=(ph-.9)*10,gx=px-s*.2+s*.05*Math.sin(b.c),gy=py-s*(.62+.12*((b.r*7+b.c*3)%3)/2),L_=s*.11*a;
  x.save();x.globalCompositeOperation='lighter';x.globalAlpha=.85;x.strokeStyle='rgba(255,244,210,.9)';x.lineWidth=1.3;x.beginPath();x.moveTo(gx-L_,gy);x.lineTo(gx+L_,gy);x.moveTo(gx,gy-L_);x.lineTo(gx,gy+L_);x.stroke();glow(gx,gy,s*.08*a,'rgba(255,240,200,A)',.8);x.restore()}}

/* ---------- Sandwurm ---------- */
function worm(px,py,s,o){o=o||{};const h=clamp(o.h==null?1:o.h,0,1);if(h<.02)return;const mood=o.mood||'rage',op=o.open==null?.6:o.open,look=o.look||0,N=16,t=tm;
 const cr=Math.min(1,h*2);
 x.fillStyle=RD(px,py+s*.02,s*.05,px,py+s*.02,s*.7,[[0,'rgba(60,20,4,.6)'],[.6,'rgba(110,44,12,.3)'],[1,'rgba(110,44,12,0)']]);ell(px,py+s*.02,s*.7*cr,s*.24*cr);x.fill();
 x.fillStyle='rgba(255,236,190,.34)';ell(px-s*.05,py-s*.03,s*.62*cr,s*.2*cr);x.fill();
 const pts=[];for(let i=0;i<=N;i++){const f=i/N;pts.push([px+Math.sin(t*2.2+f*3.4)*s*.09*(mood=='rage'?1.7:.7)*f+look*s*.22*f*f,py-h*s*1.65*f])}
 for(let i=0;i<N;i++){const f=i/N,q=pts[i],rad=s*(.38-.12*f),rx=rad,ry=rad*.8,tone=1-f*.12;
  x.fillStyle=RD(q[0]-rx*.4,q[1]-ry*.45,rad*.08,q[0],q[1],rad*1.15,[[0,rgbs([240*tone,196*tone,142*tone])],[.5,rgbs([178*tone,122*tone,80*tone])],[1,rgbs([84*tone,46*tone,30*tone])]]);ell(q[0],q[1],rx,ry);x.fill();
  x.strokeStyle='rgba(50,18,8,.65)';x.lineWidth=1.3;x.stroke();
  x.strokeStyle='rgba(255,240,206,.4)';x.lineWidth=Math.max(1,s*.022);x.beginPath();x.ellipse(q[0],q[1]+ry*.1,rx*.9,ry*.78,0,.25,Math.PI-.25);x.stroke();
  x.fillStyle='rgba(70,26,10,.32)';for(let k=-2;k<=2;k++){x.beginPath();x.arc(q[0]+k*rx*.34,q[1]+ry*.35,Math.max(.8,s*.012),0,TAU);x.fill()}
  if(i%2==0&&i>1){const sp_=[[q[0]+rx*.8,q[1]-ry*.2],[q[0]+rx*1.2,q[1]-ry*.72],[q[0]+rx*.6,q[1]-ry*.62]];faceted(q[0]+rx*.8,q[1]-ry*.5,sp_,[150,118,86],[255,246,220])}
  x.fillStyle='rgba(246,206,150,.6)';ell(q[0],q[1]+ry*.92,rx*.95,ry*.22);x.fill()}
 const hd=pts[N],nk=pts[N-2];if(o.tame){x.strokeStyle='#2fe0c0';x.lineWidth=s*.07;ell(nk[0],nk[1],s*.27,s*.1);x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(nk[0]+s*.27,nk[1],s*.04,0,TAU);x.fill();glow(nk[0]+s*.27,nk[1],s*.2,'rgba(60,240,200,A)',.6)}
 const hx=hd[0],hy=hd[1]-s*.06,R=s*.35;
 x.fillStyle=SHD+'.32)';ell(hx+s*.04,hy+s*.05,R*1.08,R*.98);x.fill();
 x.fillStyle=RD(hx-R*.35,hy-R*.4,R*.1,hx,hy,R*1.15,[[0,'#e8be92'],[.55,'#a06c44'],[1,'#4a2616']]);ell(hx,hy,R,R*.92);x.fill();x.strokeStyle='#2a1208';x.lineWidth=1.6;x.stroke();
 x.fillStyle='rgba(60,24,10,.5)';for(let i=0;i<6;i++){const a=i/6*TAU+.3;x.beginPath();x.arc(hx+Math.cos(a)*R*.92,hy+Math.sin(a)*R*.85,Math.max(1,s*.014),0,TAU);x.fill()}
 const oo=.5+.5*op,ir=R*.78*oo;
 x.fillStyle=RD(hx,hy,ir*.1,hx,hy,ir,[[0,'#0e0204'],[.7,'#4a1214'],[1,'#8e302a']]);ell(hx,hy,ir,ir*.92);x.fill();
 const tg=RD(hx,hy,0,hx,hy,ir,[[0,`rgba(255,${mood=='rage'?150:200},60,${.5+.35*Math.sin(t*5)})`],[.6,'rgba(255,80,30,.18)'],[1,'rgba(0,0,0,0)']]);x.fillStyle=tg;ell(hx,hy,ir,ir*.92);x.fill();
 x.fillStyle='#f7edd2';x.strokeStyle='rgba(70,40,24,.6)';x.lineWidth=.8;
 for(const [n,r1,r0] of [[18,.96,.62],[13,.74,.42],[8,.5,.2]]){for(let i=0;i<n;i++){const a=i/n*TAU+(n==13?.2:0)+Math.sin(t*(mood=='rage'?9:1.5)+i)*.02;
   const ro=R*r1*(.5+.5*oo)*.92,ri=R*r0*(.5+.5*oo)*.92;x.beginPath();x.moveTo(hx+Math.cos(a-.12)*ro,hy+Math.sin(a-.12)*ro*.92);x.lineTo(hx+Math.cos(a)*ri,hy+Math.sin(a)*ri*.92);x.lineTo(hx+Math.cos(a+.12)*ro,hy+Math.sin(a+.12)*ro*.92);x.closePath();x.fill();x.stroke()}}
 x.fillStyle=LG(0,hy-R*1.4,0,hy-R*.2,[[0,'#7a5640'],[1,'#3a2418']]);x.beginPath();x.moveTo(hx-R*.95,hy-R*.2);x.quadraticCurveTo(hx,hy-R*1.45,hx+R*.95,hy-R*.2);x.quadraticCurveTo(hx,hy-R*.8,hx-R*.95,hy-R*.2);x.fill();x.strokeStyle='#180a06';x.lineWidth=1.2;x.stroke();
 for(let i=-2;i<=2;i++){const bx=hx+i*R*.3,by=hy-R*(1.05-Math.abs(i)*.12),tp=hy-R*(1.35-Math.abs(i)*.17);faceted(bx,(by+tp)/2,[[bx-R*.07,by],[bx,tp],[bx+R*.07,by]],[170,150,120],[255,246,224])}
 for(const i of[-1,1]){const ex=hx+i*R*.5,ey=hy-R*.72;NT.eye(ex,ey,R,mood);
  if(mood=='bow'){x.strokeStyle='#180a06';x.lineWidth=2;x.beginPath();x.arc(ex,ey,R*.1,.2,Math.PI-.2);x.stroke()}
  else if(mood=='calm'){x.fillStyle='#fff';x.beginPath();x.arc(ex,ey,R*.12,0,TAU);x.fill();x.fillStyle='#180a06';x.beginPath();x.arc(ex+look*R*.06,ey+R*.01,R*.065,0,TAU);x.fill();x.fillStyle='rgba(255,255,255,.85)';x.beginPath();x.arc(ex+look*R*.06-R*.02,ey-R*.02,R*.02,0,TAU);x.fill()}
  else{x.fillStyle='#ff3a2a';x.beginPath();x.moveTo(ex-i*R*.14,ey-R*.08);x.lineTo(ex+i*R*.1,ey+R*.02);x.lineTo(ex-i*R*.04,ey+R*.1);x.fill();glow(ex,ey,R*.4,'rgba(255,60,40,A)',.6)}}
 if(o.tame){const bx=hx+R*1.05,by=hy-R*.2;x.strokeStyle='#2a1a22';x.lineWidth=1.5;x.beginPath();x.moveTo(bx,by+R*.5);x.lineTo(bx,by-R*.4);x.stroke();x.fillStyle='#2fe0c0';x.beginPath();x.moveTo(bx,by-R*.4);x.lineTo(bx+R*.45+Math.sin(t*5)*R*.06,by-R*.28);x.lineTo(bx,by-R*.12);x.fill()}
 if(mood=='rage'&&h<1){for(let i=0;i<8;i++){const u=(t*1.6+i/8)%1;x.fillStyle=`rgba(244,206,150,${.6*(1-u)})`;x.beginPath();x.arc(px+(i%2?1:-1)*s*(.3+u*.45),py-u*s*.55,s*(.06+u*.09),0,TAU);x.fill()}}}

/* ---------- Kampf-Hintergrund ---------- */
let BBG=null,BBk='';
function battleBG(){if(NT.dark()>.3)return NT.battleSky();const k=CW+'x'+VH+'x'+DPR;
 if(BBk!==k){BBk=k;const c=document.createElement('canvas');c.width=Math.ceil(CW*DPR);c.height=Math.ceil(VH*DPR);const sx=x;x=c.getContext('2d');x.scale(DPR,DPR);const R=MB(99),hz=VH*.22;
  x.fillStyle=LG(0,0,0,hz+10,[[0,'#4a2a5e'],[.45,'#d8604a'],[1,'#ffb86a']]);x.fillRect(0,0,CW,hz+10);
  x.fillStyle=RD(CW*.72,hz,0,CW*.72,hz,CW*.7,[[0,'rgba(255,246,196,.95)'],[.18,'rgba(255,214,130,.55)'],[.5,'rgba(255,160,80,.2)'],[1,'rgba(255,140,60,0)']]);x.fillRect(0,0,CW,hz+10);
  x.fillStyle='#fff6d0';x.beginPath();x.arc(CW*.72,hz-VH*.02,Math.max(10,CW*.045),0,TAU);x.fill();
  x.fillStyle=LG(0,hz,0,VH,[[0,'#f6c07a'],[.45,'#e08c48'],[1,'#a85a2c']]);x.fillRect(0,hz,CW,VH-hz);
  for(let i=0;i<5;i++){const y0=hz+VH*(.04+i*.15),amp=VH*(.02+i*.006);x.fillStyle=`rgba(${150-i*10},${54-i*6},18,${.15+i*.02})`;x.beginPath();x.moveTo(0,y0);for(let k=0;k<=12;k++)x.lineTo(CW*k/12,y0+Math.sin(k*1.1+i*2.3)*amp);x.lineTo(CW,VH);x.lineTo(0,VH);x.closePath();x.fill();
   x.strokeStyle=`rgba(255,244,210,${.5-i*.06})`;x.lineWidth=1.8;x.beginPath();for(let k=0;k<=12;k++){const yy=y0+Math.sin(k*1.1+i*2.3)*amp;k?x.lineTo(CW*k/12,yy):x.moveTo(0,yy)}x.stroke()}
  for(let i=0;i<46;i++){const y=hz+R()*(VH-hz),x0=R()*CW,l=30+R()*90;x.strokeStyle=R()<.5?'rgba(150,64,22,.2)':'rgba(255,244,210,.3)';x.lineWidth=1.2;x.beginPath();x.moveTo(x0,y);x.quadraticCurveTo(x0+l*.5,y+(R()-.5)*6,x0+l,y);x.stroke()}
  for(let i=0;i<900;i++){x.fillStyle=R()<.5?'rgba(140,60,20,.3)':'rgba(255,244,210,.4)';x.fillRect(R()*CW,hz+R()*(VH-hz),1.2,1.2)}
  for(let i=0;i<18;i++)stone(R()*CW,hz+VH*.05+R()*(VH-hz)*.9,3+R()*8,R,[150,104,76]);
  x.fillStyle=LG(0,hz-6,0,hz+VH*.06,[[0,'rgba(255,224,170,0)'],[.5,'rgba(255,224,170,.5)'],[1,'rgba(255,224,170,0)']]);x.fillRect(0,hz-6,CW,VH*.07);
  x=sx;BBG=c}
 x.drawImage(BBG,-20,-20,CW+40,VH+40)}

/* ---------- Dezente Lichteffekte ---------- */
function lightFX(f0,GW_){
 x.save();x.beginPath();x.rect(f0,0,GW_,VH);x.clip();
 x.globalCompositeOperation='soft-light';x.fillStyle='rgba(255,168,84,.22)';x.fillRect(f0,0,GW_,VH);
 x.globalCompositeOperation='lighter';
 x.fillStyle=RD(f0+GW_*.12,-VH*.05,VH*.02,f0+GW_*.12,-VH*.05,VH*.95,[[0,'rgba(255,214,140,.2)'],[.4,'rgba(255,170,90,.07)'],[1,'rgba(255,150,70,0)']]);x.fillRect(f0,0,GW_,VH);
 for(let i=0;i<3;i++){const cx=f0+GW_*(.2+.3*i)+Math.sin(tm*.12+i*2.1)*GW_*.08,w=GW_*(.12+.04*i),a=.035+.015*Math.sin(tm*.3+i);
  const g=x.createLinearGradient(cx-w,0,cx+w,0);g.addColorStop(0,'rgba(255,220,160,0)');g.addColorStop(.5,`rgba(255,226,170,${a})`);g.addColorStop(1,'rgba(255,220,160,0)');x.fillStyle=g;
  x.beginPath();x.moveTo(cx-w,0);x.lineTo(cx+w,0);x.lineTo(cx+w+VH*.5,VH);x.lineTo(cx-w+VH*.5,VH);x.closePath();x.fill()}
 {const ph=(tm/11)%1,cx=f0+(ph*1.6-.3)*GW_;const g=x.createLinearGradient(cx-GW_*.1,0,cx+GW_*.1,0);g.addColorStop(0,'rgba(255,240,200,0)');g.addColorStop(.5,'rgba(255,240,200,.07)');g.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=g;x.beginPath();x.moveTo(cx-GW_*.1,0);x.lineTo(cx+GW_*.1,0);x.lineTo(cx+GW_*.1-VH*.35,VH);x.lineTo(cx-GW_*.1-VH*.35,VH);x.closePath();x.fill()}
 for(let i=0;i<30;i++){const sd=H(i,3,7),sd2=H(i,9,2),sp_=6+sd*14,xx=f0+((sd2*GW_+tm*sp_*.6+Math.sin(tm*.4+i)*12)%GW_+GW_)%GW_,yy=(((sd*1.7)%1)*VH-tm*sp_*.5%VH+VH)%VH,tw=.5+.5*Math.sin(tm*(1.2+sd*2)+i*3.1),r_=.7+sd2*1.5;
  x.fillStyle=`rgba(255,240,200,${.16+.5*tw*tw})`;x.beginPath();x.arc(xx,yy,r_,0,TAU);x.fill();if(tw>.92&&r_>1.6){x.strokeStyle='rgba(255,246,214,.5)';x.lineWidth=1;x.beginPath();x.moveTo(xx-4,yy);x.lineTo(xx+4,yy);x.moveTo(xx,yy-4);x.lineTo(xx,yy+4);x.stroke()}}
 x.restore();x.globalCompositeOperation='source-over'}

function drawBuilding(b){const px=(b.c+.5)*T,py=BY-(b.r-camS)*T-T*.1,s=T,sp_=SPR[b.k];if(!sp_)return;NT.build(b,px,py,s);
 const done=b.bp>=1;
 if(!done){const p=b.bp;x.save();x.beginPath();x.rect(px-s,py-s*1.2*p+s*.02,s*2,s*1.3);x.clip();x.globalAlpha=.92;sp_(px,py,s,b);x.restore();
  x.save();x.beginPath();x.rect(px-s*.6,py-s*1.15,s*1.2,s*1.2);x.clip();x.strokeStyle='rgba(120,220,255,.55)';x.lineWidth=1;for(let i=-3;i<4;i++){x.beginPath();x.moveTo(px+i*s*.2,py);x.lineTo(px+i*s*.2+s*.3,py-s*1.15);x.stroke()}for(let i=1;i<5;i++){x.beginPath();x.moveTo(px-s*.5,py-i*s*.25);x.lineTo(px+s*.55,py-i*s*.25);x.stroke()}x.restore();
  x.strokeStyle='rgba(120,220,255,.9)';x.lineWidth=2;x.beginPath();x.moveTo(px-s*.5,py-s*1.2*p);x.lineTo(px+s*.5,py-s*1.2*p);x.stroke();glow(px,py-s*1.2*p,s*.5,'rgba(120,220,255,A)',.25);
  x.strokeStyle='rgba(255,210,120,.9)';x.lineWidth=2;for(const sx_ of[-1,1]){x.beginPath();x.moveTo(px+sx_*s*.42,py);x.lineTo(px+sx_*s*.42,py-s*1.2*p-s*.1);x.stroke()}return}
 {const dm=dimOf(b);if(dm>.02)dimSpr(sp_,px,py,s,b,dm);else sp_(px,py,s,b);bFX(b,px,py,s)}
 if(b.flash>0){x.fillStyle=`rgba(255,255,255,${b.flash*.7})`;x.globalCompositeOperation='lighter';sp_(px,py,s,b);x.globalCompositeOperation='source-over'}
 if(b.up){const p=b.up.p,cx=px,cy=py-s*.45,R=s*.5;x.strokeStyle='rgba(255,230,140,.35)';x.lineWidth=5;x.beginPath();x.arc(cx,cy,R,0,TAU);x.stroke();x.strokeStyle='#ffe28a';x.lineWidth=5;x.lineCap='round';x.beginPath();x.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+TAU*p);x.stroke();
  x.save();x.translate(cx,cy);x.rotate(tm*2);x.fillStyle='rgba(255,226,138,.8)';for(let i=0;i<8;i++){x.rotate(Math.PI/4);x.fillRect(-1.5,-R-8,3,6)}x.restore();glow(cx,cy,s*.6,'rgba(255,226,138,A)',.12+.08*Math.sin(tm*6))}}
/* ---------- Bedarfs-Symbole über Gebäuden ---------- */
function needIcon(k,cx,cy,r,al){x.save();x.translate(cx,cy);x.globalAlpha=al;
 x.fillStyle='rgba(44,10,22,.92)';x.beginPath();x.arc(0,0,r,0,TAU);x.fill();x.lineWidth=2.2;x.strokeStyle=Math.sin(tm*6)>0?'#ff6a5a':'#ffb0a0';x.stroke();
 x.lineJoin='round';x.lineCap='round';
 if(k=='bolt'){x.fillStyle='#ffd84a';x.strokeStyle='#8a5a00';x.lineWidth=1.2;x.beginPath();x.moveTo(r*.18,-r*.72);x.lineTo(-r*.44,r*.1);x.lineTo(-r*.04,r*.1);x.lineTo(-r*.2,r*.74);x.lineTo(r*.46,-r*.18);x.lineTo(r*.06,-r*.18);x.closePath();x.fill();x.stroke()}
 else if(k=='link'){x.strokeStyle='#ffa090';x.lineWidth=r*.22;x.beginPath();x.roundRect(-r*.82,-r*.3,r*.66,r*.6,r*.3);x.stroke();x.beginPath();x.roundRect(r*.16,-r*.3,r*.66,r*.6,r*.3);x.stroke();x.strokeStyle='#ffe07a';x.lineWidth=r*.12;for(const sg of[-1,1]){x.beginPath();x.moveTo(-r*.02,sg*r*.2);x.lineTo(r*.06,sg*r*.52);x.stroke()}}
 else if(k=='ammo'){for(let i=-1;i<=1;i++){const bx=i*r*.46;x.fillStyle='#cfc59a';x.fillRect(bx-r*.15,-r*.1,r*.3,r*.62);x.fillStyle='#8fe0ff';x.beginPath();x.moveTo(bx-r*.15,-r*.1);x.quadraticCurveTo(bx,-r*.82,bx+r*.15,-r*.1);x.fill()}x.strokeStyle='#ff5a4a';x.lineWidth=r*.2;x.beginPath();x.moveTo(-r*.7,r*.6);x.lineTo(r*.7,-r*.62);x.stroke()}
 else if(k=='vein'){x.fillStyle='#ff9a2e';x.beginPath();x.moveTo(0,-r*.62);x.lineTo(r*.42,-r*.05);x.lineTo(0,r*.6);x.lineTo(-r*.42,-r*.05);x.closePath();x.fill();x.fillStyle='#ffe0a0';x.beginPath();x.moveTo(0,-r*.62);x.lineTo(r*.14,-r*.1);x.lineTo(-r*.22,-r*.1);x.closePath();x.fill();x.strokeStyle='#ff5a4a';x.lineWidth=r*.2;x.beginPath();x.moveTo(-r*.7,r*.6);x.lineTo(r*.7,-r*.62);x.stroke()}
 else if(k=='water'){x.fillStyle='#5ab8ff';x.beginPath();x.moveTo(0,-r*.7);x.quadraticCurveTo(r*.55,-r*.05,0,r*.55);x.quadraticCurveTo(-r*.55,-r*.05,0,-r*.7);x.fill();x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.ellipse(-r*.14,-r*.05,r*.07,r*.16,.4,0,TAU);x.fill();x.strokeStyle='#ff5a4a';x.lineWidth=r*.2;x.beginPath();x.moveTo(-r*.7,r*.6);x.lineTo(r*.7,-r*.62);x.stroke()}
 x.restore()}
/* ---------- Engpass: kleine Versorgungs-Symbole oben links + abgedunkeltes Gebäude ---------- */
const SUPK={W:'water',P:'bolt',A:'ammo'},SUPC={W:'#5ab8ff',P:'#ffd84a',A:'#ffa23a'};
function glyph(k,r,dim){x.save();x.globalAlpha*=dim?.62:1;x.lineJoin='round';x.lineCap='round';
 if(k=='bolt'){x.fillStyle='#ffd84a';x.strokeStyle='#8a5a00';x.lineWidth=1;x.beginPath();x.moveTo(r*.18,-r*.72);x.lineTo(-r*.44,r*.1);x.lineTo(-r*.04,r*.1);x.lineTo(-r*.2,r*.74);x.lineTo(r*.46,-r*.18);x.lineTo(r*.06,-r*.18);x.closePath();x.fill();x.stroke()}
 else if(k=='water'){x.fillStyle='#5ab8ff';x.beginPath();x.moveTo(0,-r*.7);x.quadraticCurveTo(r*.55,-r*.05,0,r*.55);x.quadraticCurveTo(-r*.55,-r*.05,0,-r*.7);x.fill();x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.ellipse(-r*.14,-r*.05,r*.07,r*.16,.4,0,TAU);x.fill()}
 else{for(let i=-1;i<=1;i++){const bx=i*r*.46;x.fillStyle='#cfc59a';x.fillRect(bx-r*.15,-r*.1,r*.3,r*.62);x.fillStyle='#ffa23a';x.beginPath();x.moveTo(bx-r*.15,-r*.1);x.quadraticCurveTo(bx,-r*.82,bx+r*.15,-r*.1);x.fill()}}
 x.restore()}
function supplyBadges(b,px,py,s){const lk=b.lk||'';if(!lk||!(b.wo||b.sh>0))return;
 const ord=['W','P','A'].filter(c=>lk.includes(c)),r=s*.15,sh=clamp(b.sh||0,0,1),off=!!b.off,age=b.wo?gt-(b.est||0):9,
  al=b.wo?clamp(age*5,0,1):clamp(sh*2.2,0,1),pop=1+.35*Math.max(0,1-age*3.5),pu=.5+.5*Math.sin(tm*(off?4:7+7*sh));
 if(al<=.01)return;
 ord.forEach((c,i)=>{let cx=px-s*.34+i*r*(ord.length>2?2.1:2.35);cx=clamp(cx,r+3,GW-r-3);const cy=py-s*.86+Math.sin(tm*3.2+i*1.7+b.c)*s*.025,col=SUPC[c];
  x.save();x.globalAlpha=al;x.translate(cx,cy);x.scale(pop,pop);
  if(!off){x.globalAlpha=al*(.18+.22*pu);x.strokeStyle=col;x.lineWidth=3;x.beginPath();x.arc(0,0,r+2.5+pu*2.5,0,TAU);x.stroke();x.globalAlpha=al}
  else{x.globalAlpha=al*(.3+.25*pu);x.strokeStyle='#ff5a4a';x.lineWidth=3;x.beginPath();x.arc(0,0,r+3+pu*2,0,TAU);x.stroke();x.globalAlpha=al}
  x.fillStyle='rgba(30,8,18,.93)';x.beginPath();x.arc(0,0,r,0,TAU);x.fill();
  glyph(SUPK[c],r*.95,off);
  if(!off){const rem=1-sh;x.lineWidth=Math.max(2.2,r*.2);x.lineCap='round';x.strokeStyle='rgba(255,255,255,.16)';x.beginPath();x.arc(0,0,r-.5,0,TAU);x.stroke();
   if(rem>.005){x.strokeStyle=col;x.shadowColor=col;x.shadowBlur=rem<.3?6:3;x.beginPath();x.arc(0,0,r-.5,-Math.PI/2,-Math.PI/2+TAU*rem);x.stroke()}}
  else{x.lineWidth=Math.max(2,r*.2);x.strokeStyle=pu>.5?'#ff6a5a':'#ff9a8a';x.beginPath();x.arc(0,0,r-.5,0,TAU);x.stroke();x.lineWidth=r*.2;x.strokeStyle='#ff5a4a';x.beginPath();x.moveTo(-r*.68,r*.62);x.lineTo(r*.68,-r*.64);x.stroke()}
  x.restore()})}
const dimOf=b=>{if(!b.sh&&!b.off)return 0;if(b.off)return 1;const sh=clamp(b.sh,0,1),fl=sh>.45&&b.wo?.14*Math.max(0,Math.sin(tm*(15+12*sh))):0;return clamp(sh-fl,0,1)};
let DMC=null;
function dimSpr(sp_,px,py,s,b,d){const w=Math.ceil(s*2*DPR);if(!DMC)DMC=document.createElement('canvas');if(DMC.width!=w){DMC.width=w;DMC.height=w}
 const o=DMC.getContext('2d'),sx=x,ax=s,ay=s*1.5;o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,w,w);o.setTransform(DPR,0,0,DPR,0,0);
 x=o;try{sp_(ax,ay,s,b)}finally{x=sx}
 o.globalCompositeOperation='source-atop';o.fillStyle='rgba(10,6,30,'+(.64*d).toFixed(3)+')';o.fillRect(0,0,w/DPR,w/DPR);o.globalCompositeOperation='source-over';
 x.drawImage(DMC,0,0,w,w,px-ax,py-ay,w/DPR,w/DPR)}
function needBubbles(b,px,py,s){const nd=needsOf(b).filter(n=>n.k!='bolt'&&n.k!='water'&&n.k!='ammo');if(!nd.length)return;const r=s*.17,up_=b.wo&&b.lk&&b.lk.length>=3?s*.36:0;
 nd.forEach((n,i)=>{let cx=px+s*.34-i*r*2.35;cx=clamp(cx,r+4,GW-r-4);const cy=py-s*.86-up_+Math.sin(tm*3.2+i*1.7+b.c)*s*.03;
  x.save();x.globalAlpha=.35+.25*Math.sin(tm*6);x.strokeStyle='#ff5a4a';x.lineWidth=3;x.beginPath();x.arc(cx,cy,r+3+Math.sin(tm*6)*2,0,TAU);x.stroke();x.restore();needIcon(n.k,cx,cy,r,1)})}
function drawBuildingOv(b){const px=(b.c+.5)*T,py=BY-(b.r-camS)*T-T*.1,s=T,done=b.bp>=1,live=isLive(b);
 x.textAlign='center';x.textBaseline='alphabetic';x.lineJoin='round';
 if(b.k=='hub'&&b.proc>0){const pr=b.proc;glow(px,py-s*.42,s*.62,'rgba(255,200,90,A)',pr*.45);x.strokeStyle=`rgba(255,226,150,${pr})`;x.lineWidth=3;x.beginPath();x.arc(px,py-s*.42,s*(.5-pr*.2),0,TAU);x.stroke()}

 if(!done){const p=b.bp,by=py-s*1.28;x.fillStyle='#000b';rr(px-s*.4,by,s*.8,9,4.5);x.fill();x.fillStyle='#72dcff';rr(px-s*.4,by,s*.8*p,9,4.5);x.fill();x.font=`800 ${s*.2}px ui-rounded,system-ui`;x.lineWidth=3;x.strokeStyle='#0a0612';const t_=(b.bw<1&&b.k!='cv')?'wartet auf Arbeiter':'BAU '+Math.round(p*100)+'%';x.strokeText(t_,px,by-4);x.fillStyle=b.bw<1&&b.k!='cv'?'#ffd27a':'#fff';x.fillText(t_,px,by-4);return}
 if(b.q&&b.q.length){const it=b.q[0],p=it.arr?it.p:0,bx=px-s*.4,by=py-s*1.1;x.fillStyle='#000b';rr(bx,by,s*.8,10,5);x.fill();x.fillStyle=it.arr?'#7dff8a':'#8a8a9a';rr(bx,by,s*.8*Math.max(.04,p),10,5);x.fill();x.font=`800 ${s*.19}px ui-rounded,system-ui`;x.lineWidth=3;x.strokeStyle='#0a0612';const t_=(it.k=='wk'?'Arbeiter':UN[it.k].n)+(b.q.length>1?' +'+(b.q.length-1):'')+(it.arr?'':' · Lieferung…');x.strokeText(t_,px,by-4);x.fillStyle='#fff';x.fillText(t_,px,by-4)}
 if(b.up){x.font=`800 ${s*.19}px ui-rounded,system-ui`;x.lineWidth=3;x.strokeStyle='#0a0612';x.strokeText('Entwicklung '+Math.round(b.up.p*100)+'%',px,py-s*1.12);x.fillStyle='#ffe28a';x.fillText('Entwicklung '+Math.round(b.up.p*100)+'%',px,py-s*1.12)}
 if(b.lv){for(let i=0;i<b.lv;i++){x.fillStyle='#ffd24a';x.beginPath();const sx_=px-s*.34+i*s*.13,sy_=py-s*.02;for(let k=0;k<5;k++){const a=-Math.PI/2+k*TAU/5,a2=a+Math.PI/5;x.lineTo(sx_+Math.cos(a)*s*.06,sy_+Math.sin(a)*s*.06);x.lineTo(sx_+Math.cos(a2)*s*.028,sy_+Math.sin(a2)*s*.028)}x.fill()}}
 if(b.hp<b.mx){x.fillStyle='#000a';x.fillRect(px-s*.3,py+3,s*.6,5);x.fillStyle=b.hp/b.mx>.4?'#7dff8a':'#ff5a4a';x.fillRect(px-s*.3,py+3,s*.6*b.hp/b.mx,5)}
 supplyBadges(b,px,py,s);
 needBubbles(b,px,py,s)}
/* ---------- Figuren ---------- */
const _eo=v=>1-(1-v)*(1-v),_ei=v=>v*v;
function atkSw(ap){if(ap==null)return 0;if(ap<.35)return -_eo(ap/.35);if(ap<.5)return -1+2*_ei((ap-.35)/.15);return 1-_eo((ap-.5)/.5)}
const apOf=o=>{if(o.as==null)return null;const a=(gt-o.as)/(o.ad||.5);return a>=0&&a<=1?a:null};
function hpBar(px,py,w,r,foe){r=clamp(r,0,1);const h=Math.max(4,T*.075);
 x.fillStyle='rgba(10,4,14,.85)';rr(px-w/2-1.5,py-1.5,w+3,h+3,(h+3)/2);x.fill();
 const c=foe?['#ff9a7a','#c4261c']:r>.6?['#a8ffa4','#2fb85a']:r>.3?['#ffe28a','#d89a1c']:['#ff9a8a','#d8261c'];
 if(r>.001){const g=x.createLinearGradient(0,py,0,py+h);g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);x.fillStyle=g;rr(px-w/2,py,Math.max(h,w*r),h,h/2);x.fill();x.fillStyle='rgba(255,255,255,.4)';x.fillRect(px-w/2+h*.5,py+1,Math.max(0,w*r-h),1)}}
function hfl(o,fn){fn();const k=o.hf!=null?1-(gt-o.hf)/.15:0;if(k>0){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=k*.55;fn();x.restore()}}
function toolDraw(kind,act,s,bob,mv,sw){
 sw=sw||0;const sn=Math.sin(act),sh_=[s*.04,-s*.5-bob];let hx=s*.2,hy=-s*.36-bob,ang=1.6,L=s*.5;
 if(kind=='shovel'){ang=2.2+sn*.5;L=s*.6;hx=s*.2;hy=-s*.4-bob}
 else if(kind=='pick'){ang=.9+Math.max(0,sn)*1.5;L=s*.55;hx=s*.16;hy=-s*.6-bob}
 else if(kind=='hammer'){ang=.5+Math.max(0,sn)*1.6;L=s*.42;hx=s*.16;hy=-s*.56-bob}
 else if(kind=='wrench'){ang=1.5+sn*.5;L=s*.34;hx=s*.22;hy=-s*.42-bob}
 else if(kind=='vac'){ang=2.1+sn*.06;L=s*.42;hx=s*.2;hy=-s*.42-bob}
 else if(kind=='cup'){ang=.8+Math.max(0,sn)*.4;L=s*.15;hx=s*.2;hy=-s*.58-bob}
 else if(kind=='scan'){ang=1.3;L=s*.2;hx=s*.2;hy=-s*.5-bob}
 else if(kind=='rifle'){ang=1.55+sn*.03;L=s*.5;hx=s*.2;hy=-s*.42-bob}
 else if(kind=='blade'){ang=.7+Math.max(0,sn)*1.4;L=s*.42;hx=s*.2;hy=-s*.5-bob}
 else if(kind=='rest'){ang=2.8;L=s*.2;hx=s*.1;hy=-s*.3-bob}
 else if(kind=='treat'){ang=.25;L=s*.2;hx=s*.24;hy=-s*.74-bob+Math.sin(act*1.1)*s*.05}
 else if(kind=='pet'){hx=s*.36+Math.sin(act)*s*.08;hy=-s*.7-bob+Math.abs(Math.sin(act))*s*.05}
 const MS={sword:[.5,.9,-.6,2.5],mallet:[.5,.8,-.55,2.3],pan:[.42,.9,-.5,2.4],club:[.5,.8,-.6,2.4],bigwrench:[.46,.8,-.5,2.3],chicken:[.4,.9,-.4,2.4]};
 if(MS[kind]){const m=MS[kind];L=s*m[0];hx=s*.2;hy=-s*.5-bob;ang=sw<0?m[1]+(m[2]-m[1])*-sw:sw>0?m[1]+(m[3]-m[1])*sw:m[1]+Math.sin(act)*.08}
 else if(kind=='spear'||kind=='dagger'){L=s*(kind=='spear'?.62:.3);ang=1.5+(sw?0:Math.sin(act)*.05);hx=s*.2+(sw<0?sw*s*.1:sw*s*.34);hy=-s*.46-bob}
 x.strokeStyle='rgba(30,16,28,.9)';x.lineWidth=s*.1;x.lineCap='round';x.beginPath();x.moveTo(sh_[0],sh_[1]);x.lineTo(hx,hy);x.stroke();x.strokeStyle=x.__suit||'#6aa0c8';x.lineWidth=s*.07;x.beginPath();x.moveTo(sh_[0],sh_[1]);x.lineTo(hx,hy);x.stroke();
 x.fillStyle='#e8c8a0';x.beginPath();x.arc(hx,hy,s*.045,0,TAU);x.fill();
 if(kind=='rest'||kind=='pet')return;x.save();x.translate(hx,hy);x.rotate(ang);
 const shaft=(w,col,a,b)=>{x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.moveTo(0,a);x.lineTo(0,b);x.stroke()};
 if(kind=='shovel'){shaft(s*.05,'#8a5a30',s*.1,-L);x.fillStyle='#c5cdda';x.beginPath();x.moveTo(-s*.045,-L);x.lineTo(s*.045,-L);x.lineTo(s*.1,-L-s*.17);x.quadraticCurveTo(0,-L-s*.23,-s*.1,-L-s*.17);x.fill();x.strokeStyle='#4a5260';x.lineWidth=1;x.stroke()}
 else if(kind=='pick'){shaft(s*.05,'#8a5a30',s*.12,-L);x.strokeStyle='#cdd5e2';x.lineWidth=s*.07;x.beginPath();x.moveTo(-s*.15,-L+s*.04);x.quadraticCurveTo(0,-L-s*.07,s*.15,-L+s*.04);x.stroke();x.strokeStyle='#4a5260';x.lineWidth=1;x.stroke()}
 else if(kind=='hammer'){shaft(s*.05,'#8a5a30',s*.1,-L);x.fillStyle='#8a94a6';rr(-s*.1,-L-s*.07,s*.2,s*.14,2);x.fill();x.fillStyle='#ff9a3a';x.fillRect(s*.06,-L-s*.07,s*.04,s*.14)}
 else if(kind=='wrench'){shaft(s*.05,'#aeb8c8',s*.05,-L);x.strokeStyle='#aeb8c8';x.lineWidth=s*.06;x.beginPath();x.arc(0,-L-s*.05,s*.06,Math.PI*.8,Math.PI*2.2);x.stroke()}
 else if(kind=='vac'){x.fillStyle='#4a5468';rr(-s*.06,-L,s*.12,L+s*.08,s*.04);x.fill();x.fillStyle='#ffb347';x.beginPath();x.moveTo(-s*.08,-L);x.lineTo(s*.08,-L);x.lineTo(s*.04,-L-s*.1);x.lineTo(-s*.04,-L-s*.1);x.fill();glow(0,-L-s*.1,s*.2,'rgba(255,170,60,A)',.5+.3*sn)}
 else if(kind=='cup'){x.fillStyle='#c5cdda';x.beginPath();x.moveTo(-s*.06,-s*.02);x.lineTo(s*.06,-s*.02);x.lineTo(s*.045,-s*.14);x.lineTo(-s*.045,-s*.14);x.fill();x.fillStyle='#5ab8ff';x.fillRect(-s*.045,-s*.1,s*.09,s*.03)}
 else if(kind=='scan'){x.fillStyle='#3a4256';rr(-s*.06,-s*.2,s*.12,s*.22,s*.02);x.fill();x.fillStyle='#72dcff';x.fillRect(-s*.04,-s*.18,s*.08,s*.1);const p=(tm*1.4)%1;x.strokeStyle=`rgba(114,220,255,${1-p})`;x.lineWidth=1.4;x.beginPath();x.arc(0,-s*.25,s*.1+p*s*.25,-Math.PI*.9,-Math.PI*.1);x.stroke()}
 else if(kind=='rifle'){shaft(s*.06,'#2a303c',s*.14,-L);x.fillStyle='#5a6478';x.fillRect(-s*.04,-s*.12,s*.08,s*.18);x.fillStyle='#72dcff';x.fillRect(-s*.02,-L,s*.04,s*.04)}
 else if(kind=='blade'){shaft(s*.04,'#3a2a2a',s*.08,-s*.06);x.strokeStyle='#d8dfe8';x.lineWidth=s*.05;x.beginPath();x.moveTo(0,-s*.06);x.quadraticCurveTo(s*.1,-L*.6,0,-L-s*.1);x.stroke();x.strokeStyle='#ff6a5a';x.lineWidth=1;x.stroke()}
 else if(kind=='treat'){x.fillStyle='#ffa22e';x.beginPath();x.moveTo(0,-s*.14);x.lineTo(s*.06,-s*.05);x.lineTo(0,s*.03);x.lineTo(-s*.06,-s*.05);x.fill();x.fillStyle='#fff2c0';x.beginPath();x.moveTo(0,-s*.14);x.lineTo(s*.02,-s*.07);x.lineTo(-s*.03,-s*.07);x.fill();glow(0,-s*.06,s*.24,'rgba(255,170,60,A)',.6+.3*Math.sin(tm*8))}
 else if(kind=='sword'){shaft(s*.045,'#4a3326',s*.1,-s*.06);x.strokeStyle='#e8b84a';x.lineWidth=s*.04;x.beginPath();x.moveTo(-s*.09,-s*.08);x.lineTo(s*.09,-s*.08);x.stroke();
  x.fillStyle='#eef6ff';x.beginPath();x.moveTo(-s*.04,-s*.1);x.lineTo(-s*.035,-L);x.lineTo(0,-L-s*.1);x.lineTo(s*.035,-L);x.lineTo(s*.04,-s*.1);x.fill();x.strokeStyle='#59b8f0';x.lineWidth=1;x.stroke();
  if(Math.abs(sw)>.3)glow(0,-L*.6,s*.35,'rgba(140,220,255,A)',.35*Math.abs(sw))}
 else if(kind=='spear'){shaft(s*.04,'#8a5a30',s*.3,-L);x.fillStyle='#e6edf6';x.beginPath();x.moveTo(-s*.055,-L);x.lineTo(0,-L-s*.2);x.lineTo(s*.055,-L);x.quadraticCurveTo(0,-L+s*.05,-s*.055,-L);x.fill();x.strokeStyle='#4a5260';x.lineWidth=1;x.stroke();x.fillStyle='#d8362a';x.fillRect(-s*.03,-L+s*.02,s*.06,s*.05)}
 else if(kind=='dagger'){shaft(s*.045,'#4a3326',s*.08,-s*.05);x.fillStyle='#d8dfe8';x.beginPath();x.moveTo(-s*.035,-s*.06);x.lineTo(0,-L-s*.06);x.lineTo(s*.035,-s*.06);x.fill();x.strokeStyle='#4a5260';x.lineWidth=1;x.stroke()}
 else if(kind=='mallet'){shaft(s*.05,'#8a5a30',s*.1,-L);x.fillStyle='#e8a02a';rr(-s*.14,-L-s*.1,s*.28,s*.2,s*.04);x.fill();x.strokeStyle='#3a2410';x.lineWidth=1.2;x.stroke();x.fillStyle='#c9402a';x.fillRect(-s*.14,-L-s*.1,s*.05,s*.2);x.fillRect(s*.09,-L-s*.1,s*.05,s*.2);x.fillStyle='rgba(255,255,255,.35)';x.fillRect(-s*.08,-L-s*.08,s*.16,s*.03)}
 else if(kind=='pan'){shaft(s*.05,'#5a3a22',s*.1,-L*.7);x.fillStyle='#2a2f3a';x.beginPath();x.arc(0,-L*.7-s*.12,s*.14,0,TAU);x.fill();x.strokeStyle='#a8b2c6';x.lineWidth=s*.025;x.stroke();x.fillStyle='rgba(255,255,255,.22)';x.beginPath();x.arc(-s*.04,-L*.7-s*.16,s*.05,0,TAU);x.fill()}
 else if(kind=='club'){x.fillStyle='#8a5a30';x.beginPath();x.moveTo(-s*.03,s*.08);x.lineTo(s*.03,s*.08);x.lineTo(s*.09,-L);x.quadraticCurveTo(0,-L-s*.12,-s*.09,-L);x.closePath();x.fill();x.strokeStyle='#2a1810';x.lineWidth=1.2;x.stroke();x.fillStyle='#b8c0cc';x.fillRect(-s*.03,-L+s*.04,s*.025,s*.025);x.fillRect(s*.04,-L+s*.1,s*.025,s*.025);x.fillRect(0,-L-s*.02,s*.025,s*.025)}
 else if(kind=='bigwrench'){shaft(s*.07,'#d8362a',s*.1,-L);x.strokeStyle='#e8453a';x.lineWidth=s*.09;x.beginPath();x.arc(0,-L-s*.07,s*.1,Math.PI*.72,Math.PI*2.28);x.stroke();x.strokeStyle='#2a0a08';x.lineWidth=1;x.stroke();x.fillStyle='rgba(255,255,255,.3)';x.fillRect(-s*.02,-L,s*.02,L*.8)}
 else if(kind=='chicken'){x.strokeStyle='#e8903a';x.lineWidth=s*.035;x.beginPath();x.moveTo(-s*.025,0);x.lineTo(-s*.025,-L*.5);x.moveTo(s*.025,0);x.lineTo(s*.025,-L*.5);x.stroke();
  x.save();x.translate(0,-L*.8);if(sw>.7)x.scale(1.25,.78);x.fillStyle='#fff6d0';x.beginPath();x.ellipse(0,0,s*.11,s*.14,0,0,TAU);x.fill();x.strokeStyle='#3a2a20';x.lineWidth=1;x.stroke();
  x.beginPath();x.arc(0,-s*.17,s*.06,0,TAU);x.fillStyle='#fff6d0';x.fill();x.stroke();x.fillStyle='#e8352a';x.beginPath();x.arc(-s*.01,-s*.235,s*.025,0,TAU);x.arc(s*.025,-s*.23,s*.02,0,TAU);x.fill();x.fillStyle='#ff9a2a';x.beginPath();x.moveTo(s*.05,-s*.18);x.lineTo(s*.11,-s*.16);x.lineTo(s*.05,-s*.14);x.fill();x.fillStyle='#111';x.beginPath();x.arc(s*.025,-s*.185,s*.012,0,TAU);x.fill();x.fillStyle='#f0e0a0';x.beginPath();x.ellipse(-s*.05,0,s*.05,s*.08,.3,0,TAU);x.fill();x.restore()}
 x.restore()}
function figure(px,py,s,o){const f=o.face||1,mv=o.mv?1:0,ph=o.ph||0,su=o.suit||WCOL[0],sw=o.ap!=null?atkSw(o.ap):0;
 x.save();x.translate(px,py);if(o.a!=null)x.globalAlpha=o.a;
 if(!o.ns){x.fillStyle='rgba(15,5,20,.38)';x.beginPath();x.ellipse(s*.06,s*.015,s*(.3-.05*mv*Math.abs(Math.sin(ph))),s*.085,0,0,TAU);x.fill()}
 if(o.rot)x.rotate(o.rot);if(o.lying){x.rotate(-1.5*f);x.translate(0,-s*.08)}x.scale(f,1);x.__suit=su[0];
 if(sw){x.translate(sw>0?sw*s*.17:sw*s*.05,0);x.rotate(sw*.09)}else if(mv)x.rotate(.09);
 const sn=Math.sin(ph),cs=Math.cos(ph),bob=mv?Math.abs(sn)*s*.075:Math.sin(tm*2+px)*s*.007;
 const fA=[-s*.05+sn*s*.2*mv,-s*.02-(mv?Math.max(0,cs)*s*.09:0)],fB=[s*.05-sn*s*.2*mv,-s*.02-(mv?Math.max(0,-cs)*s*.09:0)];
 const arm=(a,col)=>{const hx_=s*.04+a*s*.17,hy_=-s*.33-bob-(mv?Math.max(0,a)*s*.07:0);x.lineCap='round';x.strokeStyle='rgba(30,16,28,.9)';x.lineWidth=s*.1;x.beginPath();x.moveTo(s*.04,-s*.5-bob);x.lineTo(hx_,hy_);x.stroke();x.strokeStyle=col;x.lineWidth=s*.07;x.beginPath();x.moveTo(s*.04,-s*.5-bob);x.lineTo(hx_,hy_);x.stroke();x.fillStyle='#e8c8a0';x.beginPath();x.arc(hx_,hy_,s*.045,0,TAU);x.fill()};
 x.lineCap='round';x.lineJoin='round';x.strokeStyle='#2a2330';x.lineWidth=s*.11;x.beginPath();
 x.moveTo(-s*.05,-s*.24-bob);x.quadraticCurveTo((-s*.05+fA[0])/2+s*.05*mv,-s*.13-bob*.5,fA[0],fA[1]);x.moveTo(s*.05,-s*.24-bob);x.quadraticCurveTo((s*.05+fB[0])/2+s*.05*mv,-s*.13-bob*.5,fB[0],fB[1]);x.stroke();
 x.strokeStyle='#120c16';x.lineWidth=s*.12;x.beginPath();x.moveTo(fA[0]-s*.03,fA[1]+s*.005);x.lineTo(fA[0]+s*.05,fA[1]+s*.005);x.moveTo(fB[0]-s*.03,fB[1]+s*.005);x.lineTo(fB[0]+s*.05,fB[1]+s*.005);x.stroke();
 if(!o.tool)arm(-sn*mv,su[1]);
 x.fillStyle='#34564f';rr(-s*.2,-s*.58-bob,s*.12,s*.28,s*.04);x.fill();x.strokeStyle='#1a2c28';x.lineWidth=1;x.stroke();
 const g=x.createLinearGradient(-s*.15,0,s*.15,0);g.addColorStop(0,su[0]);g.addColorStop(1,su[1]);x.fillStyle=g;rr(-s*.15,-s*.62-bob,s*.3,s*.42,s*.1);x.fill();x.strokeStyle='rgba(22,10,22,.8)';x.lineWidth=Math.max(1,s*.035);x.stroke();
 x.fillStyle='rgba(255,255,255,.18)';rr(-s*.11,-s*.58-bob,s*.07,s*.28,s*.03);x.fill();x.fillStyle='#1a1420';x.fillRect(-s*.15,-s*.36-bob,s*.3,s*.045);x.fillStyle=o.acc||'#ffb347';x.fillRect(-s*.03,-s*.365-bob,s*.07,s*.055);
 x.strokeStyle='#4a8a82';x.lineWidth=s*.02;x.beginPath();x.moveTo(-s*.14,-s*.56-bob);x.quadraticCurveTo(-s*.02,-s*.7,s*.08,-s*.66-bob);x.stroke();
 const hy=-s*.75-bob;x.fillStyle=su[0];x.beginPath();x.arc(s*.01,hy,s*.17,0,TAU);x.fill();x.strokeStyle='rgba(22,10,22,.8)';x.lineWidth=Math.max(1,s*.035);x.stroke();x.fillStyle=su[1];x.beginPath();x.arc(s*.0,hy,s*.17,Math.PI*.9,Math.PI*1.95);x.fill();
 x.fillStyle='#0d1420';rr(s*.02,hy-s*.055,s*.16,s*.1,s*.04);x.fill();x.fillStyle=o.vis||'#72dcff';x.fillRect(s*.05,hy-s*.03,s*.11,s*.03);
 if(o.tool)toolDraw(o.tool,o.act||0,s,bob,mv,sw);else arm(sn*mv,su[0]);
 x.restore()}
/* ---------- Fahrzeuge ---------- */
function wheel(cx,cy,r,a){x.fillStyle='#2e3440';x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill();x.strokeStyle='#59627a';x.lineWidth=1;x.stroke();x.save();x.translate(cx,cy);x.rotate(a);x.strokeStyle='#8a94aa';x.lineWidth=Math.max(1,r*.28);x.beginPath();x.moveTo(-r*.7,0);x.lineTo(r*.7,0);x.moveTo(0,-r*.7);x.lineTo(0,r*.7);x.stroke();x.restore();x.fillStyle='#b4bccb';x.beginPath();x.arc(cx,cy,r*.25,0,TAU);x.fill()}
function trk(px,py,s,tr,o){const w=s*.98,h=s*.27,y0=py-h;tr=tr||0;
 x.fillStyle=o.dead?'#141418':'#12161c';rr(px-w/2,y0,w,h,h*.48);x.fill();
 x.save();rr(px-w/2+h*.25,y0,w-h*.5,h,h*.4);x.clip();const lk=s*.11,off=(tr*T)%lk;x.fillStyle=o.dead?'#2a2a30':'#3a4252';
 for(let i=-1;i<w/lk+1;i++){const lx=px-w/2+i*lk+off;x.fillRect(lx,y0+h*.05,lk*.56,h*.16);x.fillRect(lx,y0+h*.79,lk*.56,h*.16)}x.restore();
 const n=4,rad=h*.27,y1=y0+h*.5;for(let i=0;i<n;i++)wheel(px-w/2+h*.56+i*(w-h*1.12)/(n-1),y1,rad,tr*T/rad);
 x.strokeStyle='#59627a';x.lineWidth=1;rr(px-w/2+.5,y0+.5,w-1,h-1,h*.48);x.stroke();
 if(o.spk){x.fillStyle=o.dead?'#3a2a2e':'#8a2030';for(let i=0;i<7;i++){const lx=px-w/2+h*.4+i*(w-h*.8)/6;x.beginPath();x.moveTo(lx-s*.03,y0+1);x.lineTo(lx,y0-s*.06);x.lineTo(lx+s*.03,y0+1);x.fill()}}}
function smoke(px,py,s,mv,col,n){for(let i=0;i<n;i++){const t_=((tm*(mv?1.5:.7)+i/n)%1);x.fillStyle=col.replace('A',(.4*(1-t_)).toFixed(3));x.beginPath();x.arc(px-t_*s*.5,py-t_*s*.55,s*(.04+t_*.09),0,TAU);x.fill()}}
function dustTrail(px,py,s,mv){if(!mv)return;for(let i=0;i<3;i++){const t_=((tm*1.8+i/3)%1);x.fillStyle=`rgba(230,196,150,${(.3*(1-t_)).toFixed(3)})`;x.beginPath();x.arc(px-s*.55-t_*s*.5,py-s*.03-t_*s*.18,s*(.05+t_*.1),0,TAU);x.fill()}}
function metal(y0,y1,a,b,c){const g=x.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(.5,b);g.addColorStop(1,c);return g}
function vCra(px,py,s,o){const mv=o.mv,bo=mv?Math.sin((o.tr||0)*T*.35)*s*.012:0,rc=o.rc||0,P=o.dead?['#3a383e','#17161a']:['#e6a954','#7a4a1c'];
 trk(px,py,s,o.tr,o);if(!o.dead)dustTrail(px,py,s,mv);
 const hb=py-s*.22+bo,ht=py-s*.5+bo;let g=x.createLinearGradient(0,ht,0,hb);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);x.fillStyle=g;
 x.beginPath();x.moveTo(px-s*.47,hb);x.lineTo(px-s*.46,hb-s*.18);x.lineTo(px-s*.32,ht);x.lineTo(px+s*.26,ht);x.lineTo(px+s*.5,hb-s*.1);x.lineTo(px+s*.47,hb);x.closePath();x.fill();x.strokeStyle='rgba(20,8,16,.75)';x.lineWidth=1.2;x.stroke();
 x.fillStyle='rgba(255,255,255,.22)';x.beginPath();x.moveTo(px-s*.3,ht+s*.015);x.lineTo(px+s*.24,ht+s*.015);x.lineTo(px+s*.3,ht+s*.07);x.lineTo(px-s*.34,ht+s*.07);x.fill();
 x.strokeStyle='rgba(30,12,10,.45)';x.lineWidth=1;x.beginPath();x.moveTo(px-s*.1,ht);x.lineTo(px-s*.1,hb);x.moveTo(px+s*.22,ht+s*.02);x.lineTo(px+s*.24,hb);x.stroke();
 x.fillStyle=o.dead?'#222':'#4a3220';rr(px-s*.42,hb-s*.1,s*.8,s*.08,s*.02);x.fill();x.fillStyle=o.dead?'#555':'#d8dfe8';for(let i=0;i<6;i++){x.beginPath();x.arc(px-s*.36+i*s*.14,hb-s*.06,s*.012,0,TAU);x.fill()}
 x.save();x.beginPath();x.rect(px-s*.46,hb-s*.24,s*.1,s*.2);x.clip();for(let i=0;i<4;i++){x.fillStyle=i%2?'#1a1420':(o.dead?'#555':'#ffb347');x.beginPath();x.moveTo(px-s*.5+i*s*.07,hb);x.lineTo(px-s*.43+i*s*.07,hb);x.lineTo(px-s*.36+i*s*.07,hb-s*.24);x.lineTo(px-s*.43+i*s*.07,hb-s*.24);x.fill()}x.restore();
 x.fillStyle=o.dead?'#444':'#72dcff';x.beginPath();x.moveTo(px+s*.1,hb-s*.2);x.lineTo(px+s*.16,hb-s*.13);x.lineTo(px+s*.1,hb-s*.06);x.lineTo(px+s*.04,hb-s*.13);x.fill();
 if(!o.dead){x.fillStyle='#fff3c0';x.beginPath();x.arc(px+s*.47,hb-s*.07,s*.035,0,TAU);x.fill();glow(px+s*.5,hb-s*.07,s*.3,'rgba(255,240,180,A)',.35)}
 const tx=px-s*.05-rc*s*.1,ty=ht+s*.02,bl=s*.52-rc*s*.16;
 x.fillStyle='#262c38';x.beginPath();x.ellipse(tx,ty,s*.22,s*.05,0,0,TAU);x.fill();
 x.fillStyle=metal(ty-s*.13,ty-s*.065,'#8a94a8','#6a7488','#262c38');x.fillRect(tx+s*.1,ty-s*.13,bl,s*.065);x.fillStyle='#1a1e28';x.fillRect(tx+s*.1+bl-s*.07,ty-s*.15,s*.09,s*.1);x.fillStyle='#05080c';x.fillRect(tx+s*.1+bl+s*.015,ty-s*.125,s*.02,s*.05);
 g=x.createRadialGradient(tx-s*.06,ty-s*.16,s*.02,tx,ty-s*.08,s*.26);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);x.fillStyle=g;x.beginPath();x.ellipse(tx,ty,s*.2,s*.2,0,Math.PI,0);x.fill();x.strokeStyle='rgba(20,8,16,.75)';x.lineWidth=1.2;x.stroke();
 x.fillStyle='#0a1420';rr(tx+s*.04,ty-s*.14,s*.13,s*.07,s*.02);x.fill();x.fillStyle=o.dead?'#223':'#72dcff';x.fillRect(tx+s*.06,ty-s*.12,s*.09,s*.025);
 x.fillStyle='#4a3a28';x.beginPath();x.ellipse(tx-s*.08,ty-s*.19,s*.06,s*.02,0,0,TAU);x.fill();
 const an=o.dead?0:Math.sin(tm*2.3+px*.02)*s*.04;x.strokeStyle='#cdd5e2';x.lineWidth=1.2;x.beginPath();x.moveTo(px-s*.34,ht+s*.03);x.quadraticCurveTo(px-s*.34+an*.5,ht-s*.2,px-s*.34+an,ht-s*.38);x.stroke();x.fillStyle=Math.sin(tm*5)>0&&!o.dead?'#ff5a4a':'#5a1a14';x.beginPath();x.arc(px-s*.34+an,ht-s*.38,s*.025,0,TAU);x.fill();
 if(!o.dead)smoke(px-s*.48,hb-s*.2,s,mv,'rgba(150,146,150,A)',3);
 if(rc>.2)glow(tx+s*.1+bl+s*.05,ty-s*.1,s*.3,'rgba(255,170,70,A)',rc*.8)}
function vSam(px,py,s,o){const mv=o.mv,d=o.dead,P=d?['#3a383e','#17161a']:['#f4c43c','#9a6a10'],bo=mv?Math.sin((o.tr||0)*T*.35)*s*.012:0,ak=o.ak||0;
 trk(px,py,s,o.tr,o);if(!d)dustTrail(px,py,s,mv);
 const hb=py-s*.22+bo,ht=py-s*.52+bo;
 x.fillStyle=metal(ht-s*.04,hb,'#e6edf6','#8a94a8','#4a5264');rr(px-s*.47,ht-s*.04,s*.46,s*.33,s*.14);x.fill();x.strokeStyle='rgba(20,10,20,.7)';x.lineWidth=1.2;x.stroke();
 const fl=clamp(o.fill||0,0,1);x.fillStyle='#0c1218';rr(px-s*.4,ht+s*.04,s*.32,s*.17,s*.05);x.fill();x.save();rr(px-s*.4,ht+s*.04,s*.32,s*.17,s*.05);x.clip();x.fillStyle=d?'#443':'#ff9a2e';x.fillRect(px-s*.4,ht+s*.21-s*.17*Math.max(.12,fl),s*.32,s*.17);if(!d)glow(px-s*.24,ht+s*.15,s*.25,'rgba(255,170,60,A)',.35);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(px-s*.38,ht+s*.05,s*.28,s*.025);x.restore();
 x.strokeStyle='rgba(30,36,50,.7)';x.lineWidth=1.2;x.beginPath();x.moveTo(px-s*.3,ht-s*.03);x.lineTo(px-s*.3,ht+s*.28);x.moveTo(px-s*.1,ht-s*.02);x.lineTo(px-s*.1,ht+s*.28);x.stroke();
 x.save();x.translate(px-s*.24,ht-s*.05);x.fillStyle='#3a4254';x.beginPath();x.ellipse(0,0,s*.15,s*.045,0,0,TAU);x.fill();x.strokeStyle='#cdd5e2';x.lineWidth=1.4;const ra=d?0:(ak>.5||mv)?tm*9:tm*1.2;for(let i=0;i<3;i++){const a=ra+i*2.09;x.beginPath();x.moveTo(0,0);x.lineTo(Math.cos(a)*s*.14,Math.sin(a)*s*.038);x.stroke()}x.restore();
 let g=x.createLinearGradient(0,ht-s*.02,0,hb);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);x.fillStyle=g;rr(px+s*.02,ht-s*.02,s*.4,s*.3,s*.07);x.fill();x.strokeStyle='rgba(20,10,20,.75)';x.stroke();
 x.fillStyle='#0d1824';x.beginPath();x.moveTo(px+s*.1,ht+s*.02);x.lineTo(px+s*.37,ht+s*.02);x.lineTo(px+s*.41,ht+s*.12);x.lineTo(px+s*.08,ht+s*.12);x.fill();x.fillStyle='rgba(160,230,255,.45)';x.beginPath();x.moveTo(px+s*.13,ht+s*.03);x.lineTo(px+s*.2,ht+s*.03);x.lineTo(px+s*.16,ht+s*.11);x.lineTo(px+s*.11,ht+s*.11);x.fill();
 x.save();x.beginPath();x.rect(px+s*.02,hb-s*.1,s*.4,s*.08);x.clip();for(let i=0;i<7;i++){x.fillStyle=i%2?'#1a1420':(d?'#555':'#ffb347');x.beginPath();x.moveTo(px+s*.0+i*s*.07,hb);x.lineTo(px+s*.07+i*s*.07,hb);x.lineTo(px+s*.12+i*s*.07,hb-s*.1);x.lineTo(px+s*.05+i*s*.07,hb-s*.1);x.fill()}x.restore();
 if(!d){const bk=Math.sin(tm*8)>0;x.fillStyle=bk?'#ffa030':'#5a3410';x.beginPath();x.arc(px+s*.22,ht-s*.05,s*.035,0,TAU);x.fill();if(bk)glow(px+s*.22,ht-s*.05,s*.28,'rgba(255,170,50,A)',.6)}
 // Saugarm
 const P0=[px+s*.4,hb-s*.12],T1=[px+s*.66,py-s*.05],T0=[px+s*.54,py-s*.42],tp=[T0[0]+(T1[0]-T0[0])*ak,T0[1]+(T1[1]-T0[1])*ak],el=[(P0[0]+tp[0])/2+s*.02,(P0[1]+tp[1])/2-s*.1];
 x.lineCap='round';x.lineJoin='round';x.strokeStyle='#14181f';x.lineWidth=s*.085;x.beginPath();x.moveTo(P0[0],P0[1]);x.lineTo(el[0],el[1]);x.lineTo(tp[0],tp[1]);x.stroke();x.strokeStyle=d?'#555':'#aab4c6';x.lineWidth=s*.055;x.beginPath();x.moveTo(P0[0],P0[1]);x.lineTo(el[0],el[1]);x.lineTo(tp[0],tp[1]);x.stroke();
 x.fillStyle='#e8453a';x.beginPath();x.arc(el[0],el[1],s*.04,0,TAU);x.fill();x.fillStyle=d?'#444':'#ff8a2a';x.beginPath();x.moveTo(tp[0]-s*.06,tp[1]-s*.02);x.lineTo(tp[0]+s*.06,tp[1]-s*.02);x.lineTo(tp[0]+s*.11,tp[1]+s*.09);x.lineTo(tp[0]-s*.11,tp[1]+s*.09);x.closePath();x.fill();x.strokeStyle='#3a1a08';x.lineWidth=1;x.stroke();
 if(!d&&ak>.4){glow(tp[0],tp[1]+s*.1,s*.3,'rgba(255,170,60,A)',.6*ak);for(let i=0;i<6;i++){const t_=((tm*2.4+i/6)%1);x.fillStyle=`rgba(255,190,80,${1-t_})`;x.beginPath();x.arc(tp[0]+(i%3-1)*s*.05*(1-t_),tp[1]+s*.12-t_*s*.16,s*.02,0,TAU);x.fill()}}
 x.strokeStyle='#232833';x.lineWidth=s*.04;x.beginPath();x.moveTo(tp[0]-s*.04,tp[1]-s*.02);x.quadraticCurveTo(px+s*.3,ht-s*.22,px-s*.05,ht-s*.02);x.stroke();
 if(!d)smoke(px-s*.48,hb-s*.15,s,mv,'rgba(160,150,140,A)',2)}
function vPz(px,py,s,o){const mv=o.mv,rc=o.rc||0,d=o.dead,P=d?['#3a383e','#17161a']:['#c04a2a','#3e140a'],bo=mv?Math.sin((o.tr||0)*T*.35)*s*.012:0;
 trk(px,py,s,o.tr,{...o,spk:1});if(!d)dustTrail(px,py,s,mv);
 const hb=py-s*.22+bo,ht=py-s*.46+bo;let g=x.createLinearGradient(0,ht,0,hb);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);x.fillStyle=g;
 x.beginPath();x.moveTo(px-s*.48,hb);x.lineTo(px-s*.44,hb-s*.17);x.lineTo(px-s*.2,ht);x.lineTo(px+s*.18,ht-s*.02);x.lineTo(px+s*.5,hb-s*.14);x.lineTo(px+s*.56,hb);x.closePath();x.fill();x.strokeStyle='rgba(10,2,6,.85)';x.lineWidth=1.3;x.stroke();
 x.fillStyle='rgba(12,4,8,.72)';x.beginPath();x.moveTo(px-s*.48,hb);x.lineTo(px+s*.56,hb);x.lineTo(px+s*.52,hb-s*.07);x.lineTo(px-s*.45,hb-s*.07);x.fill();
 x.strokeStyle=d?'#444':'#ff6a7a';x.lineWidth=1.5;x.beginPath();x.moveTo(px-s*.36,hb-s*.12);x.lineTo(px-s*.12,ht+s*.04);x.moveTo(px-s*.24,hb-s*.1);x.lineTo(px-s*.02,ht+s*.03);x.stroke();
 x.fillStyle=d?'#333':'#2a1018';for(let i=1;i<=3;i++){const t_=.18+i*.2,bx_=px+s*.18+(s*.5-s*.18)*t_,by_=ht-s*.02+(hb-s*.14-ht+s*.02)*t_;x.beginPath();x.moveTo(bx_-s*.04,by_-s*.01);x.lineTo(bx_-s*.01,by_-s*.12);x.lineTo(bx_+s*.04,by_+s*.0);x.closePath();x.fill();x.strokeStyle='#8a94a8';x.lineWidth=1;x.stroke()}
 const pu=d?0:.6+.4*Math.sin(tm*4);x.fillStyle='#0a0408';rr(px+s*.06,ht+s*.06,s*.3,s*.07,s*.02);x.fill();x.fillStyle=`rgba(255,70,50,${pu})`;x.fillRect(px+s*.09,ht+s*.085,s*.24,s*.028);if(!d)glow(px+s*.21,ht+s*.1,s*.3,'rgba(255,70,50,A)',.35*pu);
 x.fillStyle=d?'#666':'#f0e6d6';x.beginPath();x.arc(px-s*.16,hb-s*.15,s*.05,0,TAU);x.fill();x.fillRect(px-s*.2,hb-s*.12,s*.08,s*.04);x.fillStyle='#1a0810';x.beginPath();x.arc(px-s*.18,hb-s*.16,s*.014,0,TAU);x.arc(px-s*.14,hb-s*.16,s*.014,0,TAU);x.fill();
 x.save();x.translate(px-s*.34-rc*s*.1,ht-s*.02);x.rotate(-.32);x.fillStyle='#1e2230';rr(-s*.02,-s*.15,s*.4,s*.15,s*.03);x.fill();x.strokeStyle='#8a94a8';x.lineWidth=1;x.stroke();
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){x.fillStyle='#07090e';x.beginPath();x.arc(s*.07+i*s*.1,-s*.1+j*s*.06,s*.026,0,TAU);x.fill();x.fillStyle=d?'#555':'#ff5a4a';x.beginPath();x.arc(s*.07+i*s*.1,-s*.1+j*s*.06,s*.014,0,TAU);x.fill()}x.restore();
 x.fillStyle='#14161c';x.fillRect(px-s*.47,ht-s*.12,s*.05,s*.17);x.fillRect(px-s*.39,ht-s*.1,s*.05,s*.15);
 if(!d){smoke(px-s*.45,ht-s*.12,s,mv,'rgba(60,54,58,A)',3);smoke(px-s*.37,ht-s*.1,s*.9,mv,'rgba(70,62,66,A)',2)}
 const an=d?0:Math.sin(tm*3+px*.03)*s*.05;x.strokeStyle='#2a2a30';x.lineWidth=1.3;x.beginPath();x.moveTo(px+s*.1,ht-s*.01);x.lineTo(px+s*.1+an*.3,ht-s*.3);x.stroke();x.fillStyle=d?'#444':'#d81e3a';x.beginPath();x.moveTo(px+s*.1+an*.3,ht-s*.3);x.quadraticCurveTo(px+s*.2+an,ht-s*.33,px+s*.28+an*1.4,ht-s*.26);x.lineTo(px+s*.1+an*.3,ht-s*.2);x.fill();
 if(rc>.2)glow(px-s*.1,ht-s*.2,s*.4,'rgba(255,150,80,A)',rc*.7)}
function vBr(px,py,s,o){const d=o.dead,air=o.air||0,st=Math.sin((o.tr||0)*T*.5),lA=air?.2:Math.max(0,st)*.15,lB=air?.2:Math.max(0,-st)*.15,bob=o.mv&&!air?Math.abs(st)*s*.03:Math.sin(tm*1.5)*s*.01,P=d?['#3a383e','#17161a']:['#a8402a','#2a0e08'];
 for(const [i,l] of [[-1,lA],[1,lB]]){const hx_=px+i*s*.22,hy_=py-s*.62-bob,fx=px+i*s*.27,fy=py-l*s;
  x.fillStyle=metal(hy_,fy,'#7a8498','#4a5264','#262c38');x.beginPath();x.moveTo(hx_-s*.13,hy_);x.lineTo(hx_+s*.13,hy_);x.lineTo(fx+s*.15,fy-s*.1);x.lineTo(fx-s*.15,fy-s*.1);x.closePath();x.fill();x.strokeStyle='rgba(10,4,12,.8)';x.lineWidth=1.3;x.stroke();
  x.strokeStyle='#cdd5e2';x.lineWidth=s*.025;x.beginPath();x.moveTo(hx_+i*s*.1,hy_+s*.05);x.lineTo(fx+i*s*.1,fy-s*.14);x.stroke();
  x.fillStyle='#3a4254';x.beginPath();x.arc((hx_+fx)/2,(hy_+fy)/2-s*.04,s*.075,0,TAU);x.fill();x.strokeStyle='#8a94a8';x.stroke();
  x.fillStyle='#1a1e28';rr(fx-s*.19,fy-s*.1,s*.38,s*.1,s*.03);x.fill();x.save();rr(fx-s*.19,fy-s*.1,s*.38,s*.1,s*.03);x.clip();for(let k=0;k<5;k++){x.fillStyle=k%2?'#1a1420':(d?'#555':'#ffb347');x.beginPath();x.moveTo(fx-s*.22+k*s*.1,fy);x.lineTo(fx-s*.14+k*s*.1,fy);x.lineTo(fx-s*.06+k*s*.1,fy-s*.1);x.lineTo(fx-s*.14+k*s*.1,fy-s*.1);x.fill()}x.restore()}
 const by=py-s*1.14-bob;let g=x.createLinearGradient(0,by,0,by+s*.6);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);x.fillStyle=g;rr(px-s*.5,by,s,s*.6,s*.15);x.fill();x.strokeStyle='rgba(10,2,8,.85)';x.lineWidth=1.6;x.stroke();
 x.fillStyle='rgba(255,255,255,.16)';rr(px-s*.44,by+s*.03,s*.88,s*.07,s*.03);x.fill();
 for(const i of[-1,1]){for(let k=0;k<3;k++){x.fillStyle=d?'#444':'#2a2230';x.beginPath();x.moveTo(px+i*s*(.38+k*.07)-s*.04,by+k*s*.01);x.lineTo(px+i*s*(.38+k*.07)+i*s*.01,by-s*.13+k*s*.02);x.lineTo(px+i*s*(.38+k*.07)+s*.04,by+k*s*.01);x.closePath();x.fill();x.strokeStyle='#8a94a8';x.lineWidth=1;x.stroke()}}
 const pu=d?0:.65+.35*Math.sin(tm*5);x.fillStyle='#0a0408';rr(px-s*.24,by+s*.2,s*.48,s*.26,s*.05);x.fill();const gg=x.createLinearGradient(0,by+s*.2,0,by+s*.46);gg.addColorStop(0,`rgba(255,200,90,${pu})`);gg.addColorStop(1,`rgba(255,70,30,${pu})`);x.fillStyle=gg;for(let k=0;k<5;k++)x.fillRect(px-s*.22+k*s*.095,by+s*.22,s*.06,s*.22);if(!d)glow(px,by+s*.33,s*.55,'rgba(255,110,40,A)',.35*pu);
 x.save();rr(px-s*.5,by+s*.5,s,s*.08,s*.02);x.clip();for(let k=0;k<12;k++){x.fillStyle=k%2?'#1a1420':(d?'#555':'#ffb347');x.beginPath();x.moveTo(px-s*.56+k*s*.1,by+s*.58);x.lineTo(px-s*.46+k*s*.1,by+s*.58);x.lineTo(px-s*.4+k*s*.1,by+s*.5);x.lineTo(px-s*.5+k*s*.1,by+s*.5);x.fill()}x.restore();
 for(const i of[-1,1]){const sw_=o.mv&&!air?Math.sin((o.tr||0)*T*.5+(i>0?0:Math.PI))*s*.06:0,ax=px+i*s*.55,ay=by+s*.2,fx=px+i*s*.62,fy=by+s*.62+sw_;x.strokeStyle='#14181f';x.lineWidth=s*.12;x.lineCap='round';x.beginPath();x.moveTo(ax,ay);x.lineTo(fx,fy);x.stroke();x.strokeStyle='#8a94a8';x.lineWidth=s*.075;x.beginPath();x.moveTo(ax,ay);x.lineTo(fx,fy);x.stroke();
  x.fillStyle=metal(fy-s*.1,fy+s*.1,'#aab4c6','#5a6478','#262c38');x.beginPath();x.arc(fx,fy+s*.03,s*.11,0,TAU);x.fill();x.strokeStyle='#0a0408';x.lineWidth=1.2;x.stroke();x.fillStyle=d?'#444':'#d8dfe8';for(let k=0;k<4;k++){const a=k*Math.PI/2+.7;x.beginPath();x.moveTo(fx+Math.cos(a)*s*.1,fy+s*.03+Math.sin(a)*s*.1);x.lineTo(fx+Math.cos(a)*s*.18,fy+s*.03+Math.sin(a)*s*.18);x.lineTo(fx+Math.cos(a+.4)*s*.1,fy+s*.03+Math.sin(a+.4)*s*.1);x.fill()}}
 const hy=by-s*.02;g=x.createRadialGradient(px-s*.08,hy-s*.12,s*.02,px,hy,s*.3);g.addColorStop(0,P[0]);g.addColorStop(1,P[1]);x.fillStyle=g;x.beginPath();x.ellipse(px,hy,s*.28,s*.24,0,Math.PI,0);x.fill();x.strokeStyle='rgba(10,2,8,.85)';x.lineWidth=1.5;x.stroke();
 x.fillStyle='#e8e0d0';for(const i of[-1,1]){x.beginPath();x.moveTo(px+i*s*.22,hy-s*.1);x.quadraticCurveTo(px+i*s*.4,hy-s*.12,px+i*s*.36,hy-s*.38);x.quadraticCurveTo(px+i*s*.3,hy-s*.2,px+i*s*.16,hy-s*.16);x.fill();x.strokeStyle='#3a2a1a';x.lineWidth=1;x.stroke()}
 x.fillStyle='#0a0408';rr(px-s*.2,hy-s*.12,s*.4,s*.08,s*.03);x.fill();x.fillStyle=d?'#333':`rgba(255,60,40,${.6+.4*Math.sin(tm*6)})`;x.fillRect(px-s*.17,hy-s*.1,s*.34,s*.035);if(!d)glow(px,hy-s*.08,s*.4,'rgba(255,60,40,A)',.4);
 if(!d)for(const i of[-1,1]){x.fillStyle='#14161c';x.fillRect(px+i*s*.34-s*.04,by-s*.2,s*.08,s*.22);smoke(px+i*s*.34,by-s*.2,s*1.2,1,'rgba(50,44,50,A)',3)}}
function vehicle(k,px,py,s,o){o=o||{};const f=o.f||1;x.save();if(f<0){x.translate(px*2,0);x.scale(-1,1)}
 x.fillStyle='rgba(15,5,20,.42)';x.beginPath();x.ellipse(px+s*.08,py+s*.02,s*(k=='br'?.62:.52),s*.12,0,0,TAU);x.fill();
 ({cra:vCra,sam:vSam,pz:vPz,br:vBr}[k]||vCra)(px,py,s,o);x.restore()}
/* ---------- Sandwurm ---------- */
function wormH(px,py,s,t){const h=Math.sin(Math.min(1,t/.5)*Math.PI*.5)*(t>1?Math.max(0,1-(t-1)/.6):1);worm(px,py,s,{h,mood:'rage',open:.5+.5*Math.sin(t*10)})}
/* ---------- Wurm-Flagge ---------- */
function drawFlag(bx,by,s,ph){
 x.fillStyle='#3a2a3a';x.beginPath();x.ellipse(bx,by,s*.17,s*.06,0,0,TAU);x.fill();x.fillStyle='#6a5870';x.beginPath();x.ellipse(bx-s*.05,by-s*.02,s*.07,s*.04,0,0,TAU);x.fill();x.beginPath();x.ellipse(bx+s*.07,by-s*.01,s*.05,s*.03,0,0,TAU);x.fill();
 const top=by-s*.82;x.lineCap='round';x.strokeStyle='#2a1a22';x.lineWidth=s*.055;x.beginPath();x.moveTo(bx,by);x.lineTo(bx,top);x.stroke();x.strokeStyle='#9a7a58';x.lineWidth=s*.03;x.beginPath();x.moveTo(bx-s*.006,by);x.lineTo(bx-s*.006,top);x.stroke();
 x.fillStyle='#f5ead2';x.beginPath();x.moveTo(bx-s*.035,top);x.lineTo(bx,top-s*.11);x.lineTo(bx+s*.035,top);x.closePath();x.fill();x.strokeStyle='#3a2a1a';x.lineWidth=1;x.stroke();
 const xs=bx+s*.02,W_=s*.52,H_=s*.42,y0=top+s*.05,fl=i=>Math.sin(ph*5+i*1.3)*s*.032*(i/4+.2);
 const gr=x.createLinearGradient(xs,y0,xs+W_,y0+H_);gr.addColorStop(0,'#8a30b0');gr.addColorStop(1,'#2a1040');x.fillStyle=gr;x.beginPath();x.moveTo(xs,y0);for(let i=1;i<=4;i++)x.lineTo(xs+W_*i/4,y0+fl(i));x.lineTo(xs+W_*.78,y0+H_*.5+fl(5));x.lineTo(xs+W_,y0+H_+fl(6));for(let i=3;i>=0;i--)x.lineTo(xs+W_*i/4,y0+H_+fl(i));x.closePath();x.fill();x.strokeStyle='#f0c050';x.lineWidth=Math.max(1.2,s*.025);x.lineJoin='round';x.stroke();
 const ex=xs+W_*.4,ey=y0+H_*.52+fl(2)*.7,r_=H_*.34;x.fillStyle='#14061c';x.beginPath();x.arc(ex,ey,r_,0,TAU);x.fill();x.strokeStyle='#f0c050';x.lineWidth=Math.max(1,s*.02);x.stroke();
 x.fillStyle='#f5ead2';for(let i=0;i<10;i++){const a=i/10*TAU+ph*.4;x.beginPath();x.moveTo(ex+Math.cos(a-.2)*r_*.96,ey+Math.sin(a-.2)*r_*.96);x.lineTo(ex+Math.cos(a)*r_*.4,ey+Math.sin(a)*r_*.4);x.lineTo(ex+Math.cos(a+.2)*r_*.96,ey+Math.sin(a+.2)*r_*.96);x.fill()}
 const gg=x.createRadialGradient(ex,ey,0,ex,ey,r_*.4);gg.addColorStop(0,'rgba(255,170,60,.95)');gg.addColorStop(1,'rgba(255,60,30,0)');x.fillStyle=gg;x.beginPath();x.arc(ex,ey,r_*.4,0,TAU);x.fill();
 x.fillStyle='#ffd24a';x.beginPath();x.moveTo(xs+W_*.76,y0+H_*.22);x.lineTo(xs+W_*.9,y0+H_*.3);x.lineTo(xs+W_*.76,y0+H_*.38);x.fill()}
function drop(px,py,s,sev){const p=.5+.5*Math.sin(tm*(sev>1?9:5));x.save();x.translate(px,py);x.scale(1+.08*p,1+.08*p);x.fillStyle=sev>1?'#ff6a5a':'#5ab8ff';x.beginPath();x.moveTo(0,-s*.2);x.quadraticCurveTo(s*.16,-s*.02,0,s*.07);x.quadraticCurveTo(-s*.16,-s*.02,0,-s*.2);x.fill();x.strokeStyle='rgba(10,10,30,.8)';x.lineWidth=1.5;x.stroke();x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.ellipse(-s*.04,-s*.03,s*.025,s*.045,.4,0,TAU);x.fill();x.restore()}
function heart(px,py,r,col){x.fillStyle=col;x.beginPath();x.moveTo(px,py+r*.9);x.bezierCurveTo(px-r*1.6,py-r*.2,px-r*.7,py-r*1.3,px,py-r*.5);x.bezierCurveTo(px+r*.7,py-r*1.3,px+r*1.6,py-r*.2,px,py+r*.9);x.fill()}
function drawWorker(w){const j=w.j,o=j&&j.type=='dig'?j.obj:null,tame=!!(o&&o.f&&o.t==3&&!w.mv&&o.p>.1&&(j.slot||0)==0);
 let kx=(w.kb||0)*T,hop=0;if(tame&&o.p<.42){kx+=Math.sin(tm*5)*T*.12;hop=Math.abs(Math.sin(tm*5))*T*.09}else if(tame)hop=Math.abs(Math.sin(tm*3))*T*.025;
 const px=w.x*T+kx,py=SY(w.y)-hop,s=T*.62,hurt_=w.hp<w.mx-.01;NT.worker(w,px,py);
 hfl(w,()=>figure(px,py,s,{suit:w.col,face:w.face,ph:w.ph,mv:w.mv,tool:w.sl?null:w.tool,act:w.act,lying:w.sl,acc:w.col[0]}));
 if(w.sl){x.font=`800 ${T*.22}px ui-rounded,system-ui`;x.textAlign='left';x.fillStyle='#e8f0ff';const z=Math.floor(tm*1.3)%3+1;x.fillText('z'.repeat(z),px+T*.12,py-T*.42-z*2)}
 if(hurt_)hpBar(px,py-s*1.06,T*.4,w.hp/w.mx,false);
 if(w.th>=60)drop(px,py-s*1.15-(hurt_?T*.1:0),T,w.th>=85?2:1);
 if(w.flee){x.font=`900 ${T*.3}px ui-rounded`;x.textAlign='center';x.fillStyle='#ff6a5a';x.fillText('!',px,py-s*1.1-(hurt_?T*.1:0))}}
function drawUnit(u){const px=u.x*T+(u.kb||0)*T,py=SY(u.y)-(u.hz||0)*T;NT.unit(u,px,py);
 hfl(u,()=>{if(u.k=='sam')vehicle('sam',px,py,T*.5,{tr:u.tr,mv:u.mv,ak:u.ak,fill:Math.min(1,(u.ld||0)/14)});
  else if(u.k=='cra')vehicle('cra',px,py,T*.52,{tr:u.tr,mv:u.mv,rc:u.rc,f:u.face});
  else figure(px,py,T*.55,{suit:['#c9a060','#6a4a24'],face:u.face,ph:u.ph,mv:u.mv,tool:(u.kit||KIT.war[0]).tool,act:u.act,ap:apOf(u),vis:'#ffd27a',acc:'#72dcff'})});
 if(u.hp<u.mx-.01)hpBar(px,py-T*(u.k=='war'?.74:.66),T*.42,u.hp/u.mx,false)}
function drawEnemy(e){if(e.hide)return;if(e.k=='drn'||e.k=='ali'){const px=e.x*T+(e.kb||0)*T,py=SY(e.y);hfl(e,()=>{if(e.k=='drn')drawDrone(px,py-T*.8,T*.65,e);else drawAlien(px,py,T*.62,e)});if(e.hp<e.mx)hpBar(px,py-T*1.2,T*.55,e.hp/e.mx,true);return}const px=e.x*T+(e.kb||0)*T,py=SY(e.y)-(e.hz||0)*T;NT.enemy(e,px,py);
 hfl(e,()=>{if(e.k=='pz')vehicle('pz',px,py,T*.62,{tr:e.tr,mv:e.mv,rc:e.rc,f:e.face});else figure(px,py,T*.55,{suit:['#b8402c','#4a160e'],face:e.face||-1,ph:e.ph,mv:e.mv,tool:(e.kit||KIT.pl[0]).tool,act:e.act,ap:apOf(e),vis:'#ff7a5a',acc:'#ff7a5a'})});
 if(e.hp<e.mx-.01)hpBar(px,py-T*(e.k=='pz'?.8:.76),T*.44,e.hp/e.mx,true);
 if(gt-(e.wk||-9)<.3){x.save();x.translate(px,py-T*(e.k=='pz'?.95:.92));x.strokeStyle='#c58cff';x.lineWidth=2;x.beginPath();for(let i=0;i<24;i++){const a=i*.45+tm*6,r_=T*.012*i;x.lineTo(Math.cos(a)*r_,Math.sin(a)*r_*.8)}x.stroke();x.restore()}}
/* ---------- Gezähmter Wurm & Dressur ---------- */
function mound(px,py,s){x.save();x.fillStyle='rgba(60,24,12,.35)';x.beginPath();x.ellipse(px,py+s*.05,s*.36,s*.12,0,0,TAU);x.fill();
 const g=x.createRadialGradient(px-s*.08,py-s*.08,s*.02,px,py,s*.34);g.addColorStop(0,'#e8c08a');g.addColorStop(1,'#a8683a');x.fillStyle=g;x.beginPath();x.ellipse(px,py-s*.03,s*.3+Math.sin(tm*20)*s*.012,s*.13,0,0,TAU);x.fill();
 x.strokeStyle='rgba(60,24,12,.5)';x.lineWidth=1.3;for(let i=-1;i<=1;i++){x.beginPath();x.moveTo(px+i*s*.18-s*.06,py-s*.08);x.lineTo(px+i*s*.18+s*.04,py+s*.02);x.stroke()}x.restore()}
const wRage=w=>w.st=='bite'||w.st=='rise'||w.st=='burp';
function drawTW(w){const px=SX(w.x),py=SY(w.y-.2);if(w.h==null)w.h=.72;
 if(w.h<.04){if(w.st=='run'||w.st=='back')mound(px,py+T*.16,T*.78);return}
 worm(px,py,T*.78,{h:w.h,mood:wRage(w)?'rage':(w.st=='idle'&&w.pp&&gt-w.pp.t<.3&&w.pp.mood)||'calm',open:w.op==null?.25:w.op,look:w.look||0,tame:1})}
function drawTame(t){const p=t.p,cx=SX(t.c+.5),cy=SY(t.r+.32);
 if(p<.1){const j=Math.sin(tm*40)*T*.015;x.strokeStyle='rgba(40,14,6,.6)';x.lineWidth=2;for(let i=0;i<5;i++){const a=i*1.26+.3;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*T*.34+j,cy+Math.sin(a)*T*.12);x.stroke()}
  for(let i=0;i<5;i++){const u=(tm*1.8+i/5)%1;x.fillStyle=`rgba(236,196,140,${.55*(1-u)})`;x.beginPath();x.arc(cx+(i-2)*T*.1,cy-u*T*.4,T*(.05+u*.06),0,TAU);x.fill()}return}
 let h,mood,op,look;
 if(p<.42){h=Math.min(1,(p-.1)/.06);mood='rage';op=.55+.45*Math.sin(tm*11);look=Math.sin(tm*4.7)*.8}
 else if(p<.78){h=Math.min(1,.98-(p-.42)*.4);mood='calm';op=.35;look=Math.sin(tm*2.2)*.9}
 else{h=.66;mood='bow';op=.08;look=0}
 worm(cx,cy,T*.8,{h,mood,open:op,look,tame:p>.78});
 if(p>=.42){const hy=cy-h*T*1.4;for(let i=0;i<3;i++){const u=(tm*.8+i/3)%1;heart(cx+(i-1)*T*.18+Math.sin(tm*3+i)*T*.04,hy-u*T*.5,T*.045,`rgba(255,110,150,${1-u})`)}}
 if(p<.42&&Math.sin(tm*9)>.2){x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=1.5;const hx=cx+(Math.sin(tm*4.7)*.8)*T*.17,hy=cy-h*T*1.6;for(let i=0;i<3;i++){const a=-.5+i*.5-1.2;x.beginPath();x.moveTo(hx+Math.cos(a)*T*.1,hy+Math.sin(a)*T*.1);x.lineTo(hx+Math.cos(a)*T*.2,hy+Math.sin(a)*T*.2);x.stroke()}}}
/* ---------- Schlachtfeld ---------- */
function drawBattle(){const b=bt,X=v=>v*T,Y=v=>VH*.9-v*VH*.0625;
 battleBG();
 x.translate(OX,0);
 drawFX(0);
 b.f.map(q=>[q.y,()=>{if(q.hide)return;const px=X(q.x)+(q.kb||0)*T,py=Y(q.y)-(q.hz||0)*T,s=T*.55,k=q.k,fc=q.face||(q.s?-1:1);
  hfl(q,()=>{if(k=='tur'||k=='hub'){SPR[k](px,py+T*.1,T,null)}
   else if(k=='drn')drawDrone(px,py-T*.8,T*.65,q);
   else if(k=='ali')drawAlien(px,py,T*.62,q);
   else if(k=='cra')vehicle('cra',px,py,s*1.05,{tr:q.tr,mv:q.mv,rc:q.rc,f:fc});
   else if(k=='pz')vehicle('pz',px,py,s*1.15,{tr:q.tr,mv:q.mv,rc:q.rc,f:fc});
   else if(k=='br')vehicle('br',px,py,s*2,{tr:q.tr,mv:q.mv,air:(q.hz||0)>.02});
   else if(k=='wrm'){if(q.h==null)q.h=.72;if(q.h<.04){if(q.st=='run'||q.st=='back')mound(px,py,T*.62)}else worm(px,py,T*.62,{h:q.h,mood:wRage(q)?'rage':'calm',open:q.op==null?.25:q.op,look:q.look||Math.sin(tm+q.x)*.6,tame:1})}
   else figure(px,py,s,{suit:q.s?['#b8402c','#4a160e']:['#c9a060','#6a4a24'],face:fc,ph:q.ph||0,mv:q.mv,tool:q.kit?q.kit.tool:(q.s?'club':'sword'),act:tm*9+q.x,ap:apOf(q),vis:q.s?'#ff7a5a':'#ffd27a'})});
  const w=T*({br:1.3,tur:.7,hub:.9,wrm:.8}[k]||.55),hh=T*({br:1.3,tur:.95,hub:1,cra:.6,pz:.6,wrm:1.2}[k]||.8);
  if(q.hp<q.mx-.01&&!q.ug)hpBar(px,py-hh,w,q.hp/q.mx,!!q.s)}]).sort((a,c)=>c[0]-a[0]).forEach(i=>i[1]());
 drawFX(1);
 NT.battle(b,X,Y);
 for(const p of b.p){x.globalAlpha=Math.max(0,p.l/p.m);x.fillStyle=p.c;x.beginPath();x.arc(X(p.x),Y(p.y),Math.max(1.5,p.s*T),0,TAU);x.fill()}x.globalAlpha=1;
 x.font='800 15px ui-rounded,system-ui';x.textAlign='center';x.textBaseline='alphabetic';x.lineWidth=4;x.lineJoin='round';for(const d of b.dn){x.globalAlpha=Math.min(1,d.l);x.strokeStyle='#1a0808';x.strokeText(d.t,X(d.x),Y(d.y));x.fillStyle=d.c;x.fillText(d.t,X(d.x),Y(d.y))}x.globalAlpha=1;
 x.fillStyle='#fff';x.font='700 14px ui-rounded,system-ui';x.fillText('Welle '+Math.min(b.wi,b.ws.length)+'/'+b.ws.length+' · Feinde '+b.f.filter(q=>q.s).length+' · Truppen '+b.f.filter(q=>!q.s&&q.k!='hub'&&q.k!='tur').length,VW/2,VH*.15);
 const ok=sp>=20&&b.cd<=0&&!b.ov;x.fillStyle=ok?'#d9772a':'#3a1b2a';rr(GW*.1,VH*.93,GW*.8,VH*.05,14);x.fill();x.fillStyle='rgba(0,0,0,.5)';rr(GW*.1,VH*.93,GW*.8*Math.max(0,b.cd)/4,VH*.05,14);x.fill();x.fillStyle='#fff';x.textBaseline='middle';x.fillText('⚡ Tippe aufs Feld: Orbitalschlag ✦20',VW/2,VH*.955)}
/* ---------- Kampf-Effekte zeichnen ---------- */
const FP=(wx,wy,z)=>bt?[wx*T,VH*.9-wy*VH*.0625-z*T]:[wx*T,BY-(wy-camS)*T-z*T];
const GL=new Set(['wreck','ring','ret']);
function starPath(r,n,k,rot){x.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,r_=i%2?r*k:r;x.lineTo(Math.cos(a)*r_,Math.sin(a)*r_)}x.closePath()}
function drawFX(layer){if(!FXS.length)return;x.save();x.lineCap='round';x.lineJoin='round';
 for(const f of FXS){if(f.t<0||f.t>=f.l)continue;if((GL.has(f.ty)?0:1)!=layer)continue;
  const p=Math.min(1,f.t/f.l),q_=FP(f.x,f.y,f.z||0),px=q_[0],py=q_[1],fade=Math.min(1,(f.l-f.t)*4);
  if(px<-90||px>GW+90||py<-90||py>VH+90)continue;
  switch(f.ty){
  case 'slash':{x.save();x.translate(px,py);x.scale(f.dir,1);const R=T*(.4+.14*p),sw=Math.min(1,p*2.4),s0=-2.35,e=s0+3.1*sw;
    for(let j=0;j<3;j++){const a0=s0+j*.5*sw;x.strokeStyle=`rgba(${f.c},${(1-p)*(j==2?1:.55)})`;x.lineWidth=T*(.035+.035*j)*(1-p*.5);x.beginPath();x.arc(0,0,R*(1-j*.04),a0,Math.max(a0,e));x.stroke()}x.restore();break}
  case 'thrust':{x.save();x.translate(px,py);x.scale(f.dir,1);const len=T*f.len*Math.min(1,p*3.5),w=T*.05*(1-p);x.fillStyle=`rgba(${f.c},${1-p})`;x.beginPath();x.moveTo(-T*.05,0);x.lineTo(len*.55,-w*1.4);x.lineTo(len,0);x.lineTo(len*.55,w*1.4);x.closePath();x.fill();x.restore();glow(px+f.dir*len,py,T*.2,'rgba(255,255,255,A)',(1-p)*.7);break}
  case 'ring':{x.strokeStyle=`rgba(${f.c||'255,236,200'},${(1-p)*.8})`;x.lineWidth=1+3*(1-p);x.beginPath();x.ellipse(px,py,T*f.r*(.15+.85*p),T*f.r*.4*(.15+.85*p),0,0,TAU);x.stroke();break}
  case 'proj':{const a=projAt(f,f.t/f.l),h=FP(a[0],a[1],a[2]),pk_=f.pk;
   if(pk_=='tracer'){const b0=projAt(f,f.t/f.l-.35),t0=FP(b0[0],b0[1],b0[2]);x.strokeStyle='rgba(120,220,255,.35)';x.lineWidth=5;x.beginPath();x.moveTo(t0[0],t0[1]);x.lineTo(h[0],h[1]);x.stroke();x.strokeStyle='#e8fbff';x.lineWidth=2;x.beginPath();x.moveTo(t0[0],t0[1]);x.lineTo(h[0],h[1]);x.stroke()}
   else if(pk_=='shell'){const gp=FP(a[0],a[1],0);x.fillStyle='rgba(15,5,20,.3)';x.beginPath();x.ellipse(gp[0],gp[1],T*.05,T*.02,0,0,TAU);x.fill();glow(h[0],h[1],T*.15,'rgba(255,170,60,A)',.6);x.fillStyle='#2a2630';x.beginPath();x.arc(h[0],h[1],T*.05,0,TAU);x.fill();x.strokeStyle='#ffb347';x.lineWidth=1.2;x.stroke()}
   else if(pk_=='rocket'){const b1=projAt(f,f.t/f.l+.03),t1=FP(b1[0],b1[1],b1[2]),ang=Math.atan2(t1[1]-h[1],t1[0]-h[0]);x.save();x.translate(h[0],h[1]);x.rotate(ang);const fl_=T*(.07+.04*Math.sin(f.t*90));x.fillStyle='rgba(255,170,60,.9)';x.beginPath();x.moveTo(-T*.05,-T*.015);x.lineTo(-T*.05-fl_,0);x.lineTo(-T*.05,T*.015);x.fill();glow(-T*.06,0,T*.14,'rgba(255,140,40,A)',.7);x.fillStyle='#e8e8f0';rr(-T*.06,-T*.017,T*.11,T*.034,T*.01);x.fill();x.fillStyle='#e8352a';x.beginPath();x.moveTo(T*.05,-T*.017);x.lineTo(T*.085,0);x.lineTo(T*.05,T*.017);x.fill();x.restore()}
   else{glow(h[0],h[1],T*.24,'rgba(120,225,255,A)',.9);x.fillStyle='#e8fbff';x.beginPath();x.arc(h[0],h[1],T*.05,0,TAU);x.fill();x.strokeStyle='rgba(140,230,255,.7)';x.lineWidth=1.5;x.beginPath();x.arc(h[0],h[1],T*(.08+.03*Math.sin(f.t*40)),0,TAU);x.stroke()}break}
  case 'boom':{const r_=T*f.r*(.45+.9*p),al=1-p*p,g=x.createRadialGradient(px,py,0,px,py,r_);
    if(f.cy){g.addColorStop(0,`rgba(235,252,255,${al})`);g.addColorStop(.4,`rgba(100,210,255,${al*.8})`);g.addColorStop(1,'rgba(40,120,255,0)')}else{g.addColorStop(0,`rgba(255,246,200,${al})`);g.addColorStop(.35,`rgba(255,170,60,${al*.85})`);g.addColorStop(.7,`rgba(200,60,20,${al*.5})`);g.addColorStop(1,'rgba(80,20,10,0)')}
    x.fillStyle=g;x.beginPath();x.arc(px,py,r_,0,TAU);x.fill();break}
  case 'puff':glow(px,py,T*f.sz*(1+p*1.8),f.c,.55*(1-p));break;
  case 'star':{const pop=p<.2?p/.2*1.3:1.3-.3*Math.min(1,(p-.2)/.2),al=Math.min(1,(1-p)*4);x.save();x.translate(px,py-p*T*.1);x.rotate(Math.sin(f.t*20)*.08);x.globalAlpha=al;const R=T*(f.txt?.26:.18)*pop;
    starPath(R,9,.58,0);x.fillStyle=f.fun?'#ffe24a':'#ffb347';x.fill();x.lineWidth=2.5;x.strokeStyle='#8a2a14';x.stroke();starPath(R*.7,9,.58,.2);x.fillStyle='rgba(255,255,255,.55)';x.fill();
    if(f.txt){x.font=`900 ${Math.max(9,Math.round(T*.2*pop))}px ui-rounded,system-ui`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=3.5;x.strokeStyle='#5a1408';x.strokeText(f.txt,0,0);x.fillStyle='#fff';x.fillText(f.txt,0,0)}x.restore();break}
  case 'dz':{for(let i=0;i<3;i++){const a=f.t*9+i*2.09;x.save();x.translate(px+Math.cos(a)*T*.17,py+Math.sin(a)*T*.05);x.globalAlpha=fade;starPath(T*.05,5,.45,a);x.fillStyle='#ffe24a';x.fill();x.lineWidth=1;x.strokeStyle='#8a5a14';x.stroke();x.restore()}break}
  case 'say':{x.save();x.font=`800 ${Math.max(11,Math.round(T*.19))}px ui-rounded,system-ui`;const tw=x.measureText(f.txt).width,bw=tw+12,bh=Math.max(18,T*.3),bx=Math.max(4,Math.min(GW-bw-4,px-bw/2)),by=py-p*T*.12-bh;x.globalAlpha=Math.min(1,fade*1.4);
    x.fillStyle='#fff';x.strokeStyle='#241430';x.lineWidth=2;rr(bx,by,bw,bh,bh*.45);x.fill();x.stroke();x.beginPath();x.moveTo(px-4,by+bh-1);x.lineTo(px,by+bh+6);x.lineTo(px+4,by+bh-1);x.fill();x.fillStyle='#241430';x.textAlign='center';x.textBaseline='middle';x.fillText(f.txt,bx+bw/2,by+bh/2+.5);x.restore();break}
  case 'spark':x.globalAlpha=1-p;x.fillStyle=f.c;x.fillRect(px-1.2,py-1.2,2.6,2.6);x.globalAlpha=1;break;
  case 'bit':{x.save();x.translate(px,py);x.rotate(f.rot||0);x.globalAlpha=Math.min(1,fade*1.2);const z=T*(f.sz||.04);x.fillStyle=f.c;
    if(f.sh=='dome'){x.beginPath();x.arc(0,0,z,Math.PI,0);x.fill()}else if(f.sh=='feather'){x.beginPath();x.ellipse(0,0,z*1.6,z*.6,0,0,TAU);x.fill()}else if(f.sh=='hex'){x.beginPath();for(let i=0;i<6;i++)x.lineTo(Math.cos(i*1.047)*z,Math.sin(i*1.047)*z);x.fill()}else x.fillRect(-z,-z*.6,z*2,z*1.2);x.restore();break}
  case 'flash':{glow(px,py,T*f.r*(1.3-p*.5),`rgba(${f.c},A)`,1-p);x.strokeStyle=`rgba(255,255,255,${1-p})`;x.lineWidth=1.5;for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;x.beginPath();x.moveTo(px+Math.cos(a)*T*f.r*.3,py+Math.sin(a)*T*f.r*.3);x.lineTo(px+Math.cos(a)*T*f.r*1.1,py+Math.sin(a)*T*f.r*1.1);x.stroke()}break}
  case 'corpse':{const g0=FP(f.x,f.y,0);x.fillStyle='rgba(15,5,20,.35)';x.beginPath();x.ellipse(g0[0]+T*.03,g0[1],T*.3*(1-p*.3),T*.08,0,0,TAU);x.fill();x.save();x.globalAlpha=p>.75?(1-p)*4:1;figure(px,py,T*(f.s||.55),{suit:f.suit,face:f.face,mv:false,rot:clamp(f.rot||0,-1.57,1.57),ns:1});x.restore();break}
  case 'wreck':{const al=Math.min(1,(f.l-f.t)*1.4),sz=T*({cra:.52,sam:.5,pz:.62,br:1.1}[f.k]||.5);x.save();x.globalAlpha=al;vehicle(f.k,px,py,sz,{dead:1,f:f.face});
    if(f.t<f.l-.8){for(let i=0;i<3;i++){const fh=T*(.13+.08*Math.sin(f.t*17+i*2))*f.s,fx_=px+(i-1)*sz*.3;x.fillStyle='rgba(255,170,60,.85)';x.beginPath();x.moveTo(fx_-sz*.07,py-sz*.4);x.lineTo(fx_,py-sz*.4-fh);x.lineTo(fx_+sz*.07,py-sz*.4);x.fill()}glow(px,py-sz*.4,sz*.7,'rgba(255,130,40,A)',.45+.2*Math.sin(f.t*14))}x.restore();break}
  case 'ret':{const rad=T*f.r*(1-.45*p);x.strokeStyle=`rgba(255,106,90,${.5+.5*p})`;x.lineWidth=2;x.beginPath();x.ellipse(px,py,rad,rad*.45,0,0,TAU);x.stroke();x.beginPath();x.ellipse(px,py,rad*.55,rad*.25,0,0,TAU);x.stroke();x.beginPath();x.moveTo(px-rad*1.2,py);x.lineTo(px+rad*1.2,py);x.moveTo(px,py-rad*.55);x.lineTo(px,py+rad*.55);x.stroke();break}
  case 'beam':{const w=T*.5*(1-p)+4,g=x.createLinearGradient(0,0,0,py);g.addColorStop(0,'rgba(190,232,255,0)');g.addColorStop(1,`rgba(235,250,255,${1-p*.6})`);x.fillStyle=g;x.fillRect(px-w/2,0,w,py);x.fillStyle=`rgba(255,255,255,${1-p})`;x.fillRect(px-w*.2,0,w*.4,py);break}
  case 'coin':{x.save();x.translate(px,py);x.globalAlpha=Math.min(1,fade*1.2);x.rotate(Math.sin(f.t*14)*.4);const z=T*.06;glow(0,0,z*3,'rgba(255,170,50,A)',.5);x.fillStyle='#ffa22e';x.beginPath();x.moveTo(0,-z*1.3);x.lineTo(z,0);x.lineTo(0,z*1.1);x.lineTo(-z,0);x.fill();x.fillStyle='#fff2c0';x.beginPath();x.moveTo(0,-z*1.3);x.lineTo(z*.3,-z*.1);x.lineTo(-z*.5,-z*.1);x.fill();x.restore();break}
  case 'heart':heart(px,py,T*.05,`rgba(255,110,150,${fade})`);break}}
 x.restore()}

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

/* ---------- Atmosphäre: dezente Vignette + aufsteigende Nebelschwaden an den Rändern ---------- */
let VIGc=null,VIGk='',FOGc=null,WSP=null;
function mkAtmos(){
 FOGc=[];for(let k=0;k<5;k++){const c=document.createElement('canvas');c.width=256;c.height=192;const g=c.getContext('2d');
  for(let i=0;i<10;i++){const bx=40+Math.random()*176,by=34+Math.random()*124,r=26+Math.random()*58,gr=g.createRadialGradient(bx,by,0,bx,by,r);gr.addColorStop(0,'rgba(255,224,170,.5)');gr.addColorStop(.5,'rgba(255,190,120,.2)');gr.addColorStop(1,'rgba(255,180,110,0)');g.fillStyle=gr;g.fillRect(0,0,256,192)}
  FOGc.push(c)}
 WSP=[];for(let i=0;i<14;i++){const w=130+Math.random()*130;WSP.push({k:i%5,s:i%2?1:-1,y0:Math.random(),v:9+Math.random()*17,w,h:w*.75,a:.14+Math.random()*.1,ph:Math.random()*6.3,f:.12+Math.random()*.22,ix:.35+Math.random()*.3})}}
function mkVig(){const w=Math.max(8,Math.round(GW/3)),h=Math.max(8,Math.round(VH/3)),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 g.save();g.translate(w/2,h/2);g.scale(1,h/w);const R=w*.74,gr=g.createRadialGradient(0,0,R*.5,0,0,R);gr.addColorStop(0,'rgba(74,22,40,0)');gr.addColorStop(.55,'rgba(74,22,40,.06)');gr.addColorStop(1,'rgba(74,22,40,.38)');g.fillStyle=gr;g.fillRect(-w,-w,w*2,w*2);g.restore();
 const t=g.createLinearGradient(0,0,0,h*.16);t.addColorStop(0,'rgba(74,22,40,.3)');t.addColorStop(1,'rgba(74,22,40,0)');g.fillStyle=t;g.fillRect(0,0,w,h*.16);
 VIGc=c;VIGk=GW+'x'+VH}
function atmos(){
 if(!FOGc)mkAtmos();if(VIGk!==GW+'x'+VH)mkVig();
 x.setTransform(DPR,0,0,DPR,0,0);x.globalAlpha=1;x.lineCap='butt';
 const f0=OX,f1=OX+GW;
 if(OX>1){x.fillStyle='rgba(60,18,30,.5)';x.fillRect(0,0,f0,VH);x.fillRect(f1,0,CW-f1,VH)}
 if(!NT.night())lightFX(f0,GW);x.drawImage(VIGc,f0,0,GW,VH);
 x.save();x.beginPath();x.rect(0,0,CW,VH);x.clip();
 for(const w of WSP){const span=VH+w.h;let y=(w.y0*span-tm*w.v)%span;if(y<0)y+=span;y-=w.h;const fade=Math.sin(Math.PI*(y+w.h)/span),sway=Math.sin(tm*w.f+w.ph);
  x.globalAlpha=w.a*(.7+.3*Math.sin(tm*w.f*1.7+w.ph*2))*fade*NT.fogK();
  const cx=w.s<0?f0-w.w*(.5-w.ix*.3)+sway*w.w*.1:f1+w.w*(.5-w.ix*.3)+sway*w.w*-.1;
  x.save();x.translate(cx,y+w.h/2);x.scale(w.s<0?1:-1,1);x.drawImage(FOGc[w.k],-w.w/2,-w.h/2,w.w,w.h);x.restore()}
 x.restore();x.globalAlpha=1}
/* ---------- Hauptzeichnung ---------- */
function camTarget(){return Math.max(-.45,tp+1.1-(BY-VH*(SIDE?.3:.42))/T)}
function draw(){x.setTransform(DPR,0,0,DPR,0,0);x.globalAlpha=1;x.lineCap='butt';x.lineJoin='miter';NT.frame();
 const sx=shk*(rnd()-.5)*10,sy=shk*(rnd()-.5)*10;x.translate(sx,sy);
 if(bt){drawBattle();atmos();L6.drawLaser();return}
 let g=x.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#3a2150');g.addColorStop(.5,'#d0583a');g.addColorStop(1,'#ffb066');x.fillStyle=g;x.fillRect(-20,-20,CW+40,VH+40);x.translate(OX,0);
 const tc=camTarget();let cam=clamp(tc+off,-.45,tc+2.5);if(sel&&sheetH>0){const hi=sel.r-(BY-(VH-sheetH-6))/T-.1,lo=sel.r+1.55-(BY-92)/T;cam=Math.max(-9,Math.min(cam,hi));if(lo<=hi)cam=Math.max(cam,lo)}if(camS==null)camS=cam;camS+=(cam-camS)*.14;
 const tmT=[],need=Math.ceil(camS+VH/T)+2;if(G.length<=need)gen(need);const r0=Math.max(0,Math.floor(camS-.2)),r1=Math.min(G.length-1,Math.ceil(camS+VH/T)+1);
 for(let r=r0;r<=r1;r++)for(let c=0;c<W;c++){const t=G[r][c],px=c*T,py=BY-(r+1-camS)*T;x.drawImage(tileSpr(t),px,py,T,T);tileDyn(t,px,py);NT.tile(t,px,py);if(t.f&&t.t==3&&t.w>0&&t.p>.02)tmT.push(t)}
 const act=phase=='play'||phase=='prep'||phase=='rw';
 if(act){x.setLineDash([4,4]);x.strokeStyle=`rgba(120,255,160,${.28+.18*Math.sin(tm*3)})`;x.lineWidth=1.8;for(let r=r0;r<=r1;r++)for(let c=0;c<W;c++){const t=G[r][c];if(t.s==2&&!t.qs&&!bl[K(c,r)]&&adj(c,r,true)){NT.lit(c*T+T/2,BY-(r+.5-camS)*T,T*.62,.5);rr(c*T+6,BY-(r+1-camS)*T+6,T-12,T-12,8);x.stroke()}}x.setLineDash([])}
 for(let r=r0;r<=r1;r++)for(let c=0;c<W;c++){const b=bl[K(c,r)];if(!b)continue;if(b.k=='cv'){if(b.bp>=1)conduit(b,false);else beltSite(b)}else if(b.bp>=1)conduit(b,true)}
 if(sel&&(sheetH>0||build_)&&act){const sb=bl[K(sel.c,sel.r)],isRaf=sb?(sb.k=='raf'&&sb.bp>=1):(L.u.includes('raf')&&tw(sel.c,sel.r)&&tw(sel.c,sel.r).s==2);
  if(isRaf){const R=reachOf(sb?sb.lv:0),cx=SX(sel.c+.5),cy=SY(sel.r+.5);
   const gg=x.createRadialGradient(cx,cy,R*T*.2,cx,cy,R*T);gg.addColorStop(0,'rgba(255,190,90,.02)');gg.addColorStop(1,'rgba(255,190,90,.16)');x.fillStyle=gg;x.beginPath();x.arc(cx,cy,R*T,0,TAU);x.fill();
   x.setLineDash([9,7]);x.lineDashOffset=-tm*14;x.strokeStyle='rgba(255,205,120,.85)';x.lineWidth=2.2;x.beginPath();x.arc(cx,cy,R*T,0,TAU);x.stroke();x.setLineDash([]);
   for(let r=Math.max(r0,Math.floor(sel.r+.5-R));r<=Math.min(r1,Math.ceil(sel.r+.5+R));r++)for(const t of G[r]){if(t.t!=1||Math.hypot(t.c+.5-(sel.c+.5),t.r+.5-(sel.r+.5))>R)continue;const vx=SX(t.c+.5),vy=SY(t.r+.5),dug=t.s==2;
    x.lineWidth=dug?2.6:1.6;x.strokeStyle=dug?(t.st>0?`rgba(255,226,140,${.75+.25*Math.sin(tm*5)})`:'rgba(255,170,70,.45)'):'rgba(255,226,140,.35)';x.beginPath();x.arc(vx,vy,T*(dug?.36:.3),0,TAU);x.stroke()}}}
 for(const w of TW){const x0=(w.c-1)*T,y0=SY(w.r+2);x.setLineDash([6,7]);x.lineDashOffset=-tm*10;x.strokeStyle=`rgba(190,120,255,${.28+.12*Math.sin(tm*2+w.ph)})`;x.lineWidth=2;rr(x0+3,y0+3,3*T-6,3*T-6,T*.2);x.stroke();x.setLineDash([]);x.fillStyle=`rgba(150,80,220,${w.st=='idle'?.05:.1})`;x.fill()}
 {const sb=sel&&bl[K(sel.c,sel.r)];if(sb&&sb.bp>=1&&act){const ln_=(a,c2)=>{x.setLineDash([4,6]);x.lineDashOffset=-tm*14;x.strokeStyle='rgba(120,205,255,.85)';x.lineWidth=2.2;x.beginPath();x.moveTo(SX(a.c+.5),SY(a.r+.45));x.lineTo(SX(c2.c+.5),SY(c2.r+.45));x.stroke();x.setLineDash([]);x.fillStyle='rgba(120,205,255,.9)';x.beginPath();x.arc(SX(c2.c+.5),SY(c2.r+.45),4,0,TAU);x.fill()};
  }}
 if(sel){x.strokeStyle='#fff';x.lineWidth=2.5;rr(sel.c*T+2,BY-(sel.r+1-camS)*T+2,T-4,T-4,T*.12);x.stroke()}
 if(tutW()){const hb=hubB(),p=.5+.5*Math.sin(tm*5);x.strokeStyle=`rgba(255,179,71,${.45+.5*p})`;x.lineWidth=3+p*2;rr(hb.c*T-1-p*2,BY-(hb.r+1-camS)*T-1-p*2,T+2+p*4,T+2+p*4,T*.16);x.stroke()}
 const it=[];for(const k in bl){const b=bl[k];if(b.k!='cv'&&b.r>=r0-1&&b.r<=r1)it.push([b.r+.3,()=>drawBuilding(b)])}
 for(const u of un)it.push([u.y-.01,()=>drawUnit(u)]);for(const e of en)it.push([e.y,()=>drawEnemy(e)]);for(const w of wk)it.push([w.y-.02+(w.pz||0),()=>drawWorker(w)]);
 for(const w of TW)it.push([w.y,()=>drawTW(w)]);for(const t of tmT)it.push([t.r+.5,()=>drawTame(t)]);
 if(wm)it.push([wm.y,()=>wormH(SX(wm.x),SY(wm.y-.3),T,wm.t)]);
 drawFX(0);it.sort((a,b)=>b[0]-a[0]).forEach(i=>i[1]());
 for(const q of pk)drawPkt(q);
 NT.apply();
 for(const k in bl){const b=bl[k];if(b.k!='cv'&&b.r>=r0-1&&b.r<=r1)drawBuildingOv(b)}
 if(L.p.ne&&!SV.cl)for(let r=Math.max(0,r0-1);r<=Math.min(G.length-1,r1);r++)for(const t of G[r])if(t.s==2&&hzSmall(t)){const n=nb(t.c,t.r);if(n)hazBadge(t,n)}
 drawFX(1);
 for(const p of pa){if(p.fl){const u=1-p.l/p.m;x.globalAlpha=1;x.fillStyle='#ffc45a';x.beginPath();x.arc(p.sx+(hudPos[0]-p.sx)*u*u,p.sy+(hudPos[1]-p.sy)*u*u,3.5,0,TAU);x.fill();continue}
  const px=SX(p.x),py=SY(p.y);x.globalAlpha=Math.max(0,p.l/p.m)*(p.soft?.6:1);x.fillStyle=p.c;x.beginPath();x.arc(px,py,Math.max(1.5,p.s*T)*(p.soft?1+(1-p.l/p.m)*1.5:1),0,TAU);x.fill()}x.globalAlpha=1;
 x.strokeStyle='rgba(255,225,180,.13)';x.lineWidth=1;for(let i=0;i<12;i++){const a=((tm*60+i*97)%(GW+80))-40,b2=(i*131)%VH+Math.sin(tm+i)*6;x.beginPath();x.moveTo(a,b2);x.lineTo(a+22,b2+3);x.stroke()}
 x.textAlign='center';x.textBaseline='alphabetic';x.lineJoin='round';for(const f of fx){const k=f.l/f.m;x.globalAlpha=Math.min(1,f.l*1.6);x.font=`800 ${f.big?19:14}px ui-rounded,system-ui`;x.lineWidth=4;x.strokeStyle='#1a0808';x.strokeText(f.t,SX(f.x),SY(f.y));x.fillStyle=f.c;x.fillText(f.t,SX(f.x),SY(f.y))}x.globalAlpha=1;
 if(phase=='prep'||phase=='rw'){x.globalAlpha=.8;for(let i=0;i<6;i++)figure(GW*(.12+i*.15),VH*.22+(1-pt/25)*VH*.05,T*.7,{suit:['#b8402c','#4a160e'],face:1,ph:tm*11+i*2,mv:true,tool:KIT.pl[i%4].tool,act:tm*5+i,ap:(v=>v<1?v:null)((tm*.7+i*.27)%2.2),vis:'#ff7a5a'});x.globalAlpha=1}
 if(flash>0){x.fillStyle=`rgba(255,240,200,${flash*.5})`;x.fillRect(-OX-20,-20,CW+40,VH+40)}
 atmos();L6.drawLaser()}
/* ---------- Icons fürs Menü ---------- */
let icoCache={};
function icon(k,size){size=size||56;const key=k+size;if(icoCache[key])return icoCache[key];const c=document.createElement('canvas');c.width=c.height=size*2;const sx=x,sT=T,sTm=tm,sB=BY,sc=camS,sD=DPR;x=c.getContext('2d');x.scale(2,2);T=size*.94;tm=1.7;DPR=1;
 const g=x.createRadialGradient(size/2,size*.8,2,size/2,size*.8,size*.55);g.addColorStop(0,'rgba(255,200,120,.28)');g.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=g;x.fillRect(0,0,size,size);
 try{if(SPR[k])SPR[k](size/2,size*.86,T,null);else if(k=='war')figure(size/2,size*.88,size*.8,{suit:['#c9a060','#6a4a24'],tool:'sword',vis:'#ffd27a'});else if(k=='sam')vehicle('sam',size/2,size*.86,size*.8,{});else if(k=='cra')vehicle('cra',size/2,size*.86,size*.8,{});else if(k=='flag')drawFlag(size*.42,size*.95,size*1.05,1);else if(k=='wk')figure(size/2,size*.88,size*.8,{suit:WCOL[0],tool:'shovel'});
  else if(k=='cv'){const s2=size;x.fillStyle='#10141a';x.fillRect(0,s2*.3,s2,s2*.4);x.fillStyle='#38424f';x.fillRect(0,s2*.33,s2,s2*.34);x.fillStyle='#242b36';x.fillRect(0,s2*.36,s2,s2*.28);x.fillStyle='#0c1016';x.fillRect(0,s2*.38,s2,s2*.09);x.fillRect(0,s2*.53,s2,s2*.09);x.strokeStyle='#ffb347';x.lineWidth=2;x.beginPath();for(let i=0;i<3;i++){x.moveTo(s2*(.15+i*.28),s2*.4);x.lineTo(s2*(.2+i*.28),s2*.425);x.lineTo(s2*(.15+i*.28),s2*.45)}x.stroke();x.strokeStyle='#6fd8ff';x.beginPath();for(let i=0;i<3;i++){x.moveTo(s2*(.25+i*.28),s2*.55);x.lineTo(s2*(.2+i*.28),s2*.575);x.lineTo(s2*(.25+i*.28),s2*.6)}x.stroke();x.fillStyle='#6fe4ff';x.fillRect(0,s2*.495,s2,s2*.012)}}catch(e){}
 x=sx;T=sT;tm=sTm;BY=sB;camS=sc;DPR=sD;return icoCache[key]=c.toDataURL()}
/* ================= SPIELLOGIK ================= */
const RT=k=>FS[k].h*FS[k].d/FS[k].c/50;
function power(){let p=RT('hub');for(const k in bl){const b=bl[k];if(b.k=='tur'&&b.bp>=1)p+=RT('tur')*syn(b)**2*(isOn(b)?1:.3)}un.forEach(u=>{if(u.k!='sam')p+=RT(u.k)*syn(u.b)**2});return p}
function erate(ws){let e=0;ws.flat().forEach(([k,n])=>e+=n*RT(k));return e}
const hubB=()=>bl[3];
const tutW=()=>{const h=bl[3];return !!h&&h.bp>=1&&!wk.length&&!h.q.some(q=>q.k=='wk')&&phase=='play'};
function mkWorker(px,py,id){return{x:px,y:py,id,col:WCOL[id%6],spd:.88+rnd()*.28,th:rnd()*14,j:null,tool:null,ph:rnd()*9,act:rnd()*9,face:rnd()<.5?1:-1,mv:false,sl:false,hp:25,mx:25,idle:{k:null,t:0,tg:null},dk:null,dkT:0,flee:0,slot:0}}
function start(i){
 li=i;numTip=0;applyDF();L=lvFor(i);if(i===5)L.u=L.u.filter(k=>k!=='crdep');L.E=Math.round(erate(L.wv));NT.setup();
 G=[];bl={};wk=[];un=[];Q=[];pa=[];fx=[];en=[];pk=[];ln=[];sp=L.sp0;tp=1;hh=1;off=0;mode=0;phase='play';sel=null;ds=0;wm=null;bt=null;cmb=1;lastSp=-99;sw=L.r0;wn=0;gt=0;beltMode=false;flash=0;thirsty=0;over=null;deadN=0;lowP=0;camS=null;
 LT=[];RV=[];FXS=[];TW=[];amb=0;hqAcc=0;bver++;gen(8);for(let c=0;c<W;c++)for(let r=0;r<2;r++)rev(c,r);bl[3]=mkB('hub',3,0,1);bl[3].hp=bl[3].mx=Math.round(B.hub.hp*DFc.hub);
 /* Lernstart: noch keine Arbeiter – das markierte Quartier zeigt, wie man sie holt */
 L6.reset();L6.readySand();NT.pre();calcNet();UI.reset();UI.openInfo(bl[3])}
/* ---------- Aufträge ---------- */
function countAssign(){for(const row of G)for(const t of row)t.w=0;for(const k in bl)bl[k].bw=0;for(const b of Object.values(bl))b.rw=0;
 for(const w of wk)if(w.j){const o=w.j.obj;if(w.j.type=='dig')o.w++;else if(w.j.type=='build')o.bw++;else o.rw++}}
function unassign(w){w.j=null}
const slotXY=(w,j)=>{const s=j.slot||0;if(j.type!='dig'&&j.obj.k=='bore')return[j.obj.c+.5,j.obj.r-.3];if(j.type=='dig')return[j.obj.c+[.27,.73,.5][s%3],j.obj.r+[.3,.3,.14][s%3]];return[j.obj.c+[.2,.8,.5][s%3],j.obj.r+[.02,.02,-.04][s%3]]};
function findJob(w){
 let best=null,bd=99;
 for(const b of Object.values(bl))if(b.bp<1&&b.k!='cv'&&b.bw<2){const d=Math.hypot(b.c+.5-w.x,b.r-w.y);if(d<bd){bd=d;best={type:'build',obj:b}}}
 if(best){best.slot=best.obj.bw;return best}
 for(const t of Q)if(t.w<3){const d=Math.hypot(t.c+.5-w.x,t.r+.5-w.y);if(d<bd){bd=d;best={type:'dig',obj:t}}}
 if(best){best.slot=best.obj.w;return best}
 for(const b of Object.values(bl))if(b.bp>=1&&b.hp<b.mx*.85&&b.rw<1){const d=Math.hypot(b.c+.5-w.x,b.r-w.y);if(d<bd){bd=d;best={type:'rep',obj:b}}}
 if(best)best.slot=0;return best}
function walk(w,tx,ty,spd,dt){const fd=Math.hypot(tx-w.x,ty-w.y);if(fd<.05){w.mv=false;return true}const q=wayTo(w,tx,ty,dt),dx=q[0]-w.x,dy=q[1]-w.y,d=Math.hypot(dx,dy)||1e-6,v=Math.min(d,spd*w.spd*(w.sf||1)*dt,fd);w.x+=dx/d*v;w.y+=dy/d*v;w.mv=true;w.ph+=v*8.5;stp(w,v);if(Math.abs(dx)>.015)w.face=dx>0?1:-1;return false}
function spot(){for(let n=0;n<30;n++){const r=Math.floor(rnd()*Math.min(tp+1,G.length)),c=Math.floor(rnd()*W),t=G[r][c];if(t.s==2&&!bl[K(c,r)]&&!bl[K(c,r-1)]){return[c+.2+rnd()*.6,r+.1+rnd()*.5]}}return[3.5+(rnd()-.5)*3,1.0]}
function wellFor(w){let best=null,bd=99;for(const b of Object.values(bl))if(b.k=='wel'&&b.bp>=1&&b.tank>=1&&b.tw<1&&!b.off){const d=Math.hypot(b.c+.5-w.x,b.r-w.y);if(d<bd){bd=d;best=b}}return best}
function hitW(w){const j=w.j;if(!j)return;
 if(j.type=='dig'){const t=j.obj,hard=t.v==2||t.t==2;dust(t.c+.5,t.r+.45,hard?2:3);if(hard)spark(t.c+.5,t.r+.4,2);snd('dig',t.c+.5,{hard})}
 else if(j.type=='build'){const b=j.obj,i=Math.floor(w.act/TAU);if(i%3==2){w.tool='wrench';spark(b.c+.5,b.r+.5,6);snd('weld',b.c+.5)}else{w.tool='hammer';spark(b.c+.5,b.r+.4,3);snd('hammer',b.c+.5)}}
 else{const b=j.obj;spark(b.c+.5,b.r+.4,3);snd('weld',b.c+.5)}}
function updW(w,dt){
 w.th+=dt*L.th;w.sf=w.th>=85?.55:w.th>=60?.72:1;if(w.hp<w.mx)w.hp=Math.min(w.mx,w.hp+.6*dt);
 if(w.th>=100){ft(w.x,w.y+.6,'verdurstet ☠','#9cf');burst(w.x,w.y+.3,10,'#e8d8a0');w.dead=1;snd('lost',w.x);return}
 if(w.th>=60&&!thirsty){thirsty=1;if(!Object.values(bl).some(b=>b.k=='wel'&&b.bp>=1)){toast('💧 Deine Arbeiter bekommen Durst – baue einen Taufänger!');snd('alarm')}}
 w.sl=false;w.tool=null;w.pz=0;
 // Flucht
 if(w.flee>0){w.flee-=dt;w.j=null;w.dk=null;walk(w,3.5,.35,2.6,dt);return}
 for(const e of en)if(Math.hypot(e.x-w.x,e.y-w.y)<1.7){w.flee=1.6;w.j=null;w.dk=null;return}
 // Trinken
 if(!w.dk&&w.th>=55&&(w.dkc=(w.dkc||0)-dt)<=0){w.dkc=3;const wl=wellFor(w);if(wl){w.dk=wl;wl.tw=1;w.dkT=0;w.j=null}}
 if(w.dk){const b=w.dk;if(!bl[K(b.c,b.r)]||(b.tank<1||b.off)&&w.dkT<=0){w.dk=null;b.tw=0;return}
  const tx=b.c+.5+(w.id%2?.22:-.22),ty=b.r+.02;if(walk(w,tx,ty,1.8,dt)){w.face=1;w.tool='cup';w.act+=dt*3;w.dkT+=dt;if(w.dkT>1.9){b.tank=Math.max(0,b.tank-1);b.tw=0;w.th=0;w.dk=null;w.dkT=0;snd('drink',w.x);ft(w.x,w.y+.7,'erfrischt','#9cf')}}return}
 // Aufträge
 if(w.j){const o=w.j.obj;if(w.j.type=='dig'&&(o.s!=1||!o.q)||w.j.type=='build'&&(!bl[K(o.c,o.r)]||o.bp>=1)||w.j.type=='rep'&&(!bl[K(o.c,o.r)]||o.hp>=o.mx))w.j=null}
 const pri=w.j?w.j.type:null;const cand=(pri!='build')?findJob(w):null;if(cand&&cand.type=='build'&&pri!='build'){w.j=cand}else if(!w.j)w.j=cand;if(w.j&&w.j!==w.cnt){w.cnt=w.j;const o=w.j.obj;if(w.j.type=='dig')o.w++;else if(w.j.type=='build')o.bw++;else o.rw++}
 if(w.j){const j=w.j,o=j.obj,[tx,ty]=slotXY(w,j);if(!walk(w,tx,ty,2.3,dt)){w.tool=j.type=='dig'?(o.f&&o.t==3&&o.p>.42?'treat':o.t==1?'vac':(o.t==2||o.v==2)?'pick':'shovel'):j.type=='build'?'hammer':'wrench';return}
  w.face=(o.c+.5>w.x)?1:-1;w.tool=j.type=='dig'?(o.f&&o.t==3&&o.p>.42?'treat':o.t==1?'vac':(o.t==2||o.v==2)?'pick':'shovel'):j.type=='build'?(Math.floor(w.act/TAU)%3==2?'wrench':'hammer'):'wrench';
  const ph0=Math.floor(w.act/TAU);w.act+=dt*(j.type=='dig'&&o.t==1?5:8.5)*w.sf;if(Math.floor(w.act/TAU)>ph0)hitW(w);
  if(j.type=='dig'){o.p+=dt*w.sf/(DT[o.t]*DV_[o.v||0]*(1+.05*Math.max(0,o.r-2))*(o.f&&o.t==3?1.9:1))*(1+.3*(hubB()&&hubB().lv||0))*DFc.dig;if(o.f&&o.t==3)tameStage(o);if(o.p>=1)done(o)}
  else if(j.type=='build'){o.bp=Math.min(1,o.bp+dt*w.sf*DFc.bld/B[o.k].bt);if(o.bp>=1)finishBuild(o)}
  else{o.hp=Math.min(o.mx,o.hp+11*dt*w.sf)}
  return}
 idleW(w,dt)}
function idleW(w,dt){const I=w.idle;I.t-=dt;
 if(I.t<=0||!I.tg){const r=rnd(),bs=Object.values(bl).filter(b=>b.bp>=1&&b.k!='cv'),pw=TW.filter(q=>q.st=='idle'&&!q.po&&gt>(q.pcd||0));
  if(pw.length&&gt>(w.pcd||0)&&rnd()<.34){const q=pick(pw),sd=w.x<q.hx?1:-1;I.k='pet';I.tw=q;q.po=w;I.ph=0;I.pt=0;I.sd=sd;I.hc=0;I.ch=0;I.pr=0;I.hp=0;I.fd=0;I.tg=[q.hx-sd*.34,q.hy-.26];I.t=40;I.hold=0}else{
  I.k=r<.42?'wander':r<.6?'sleep':r<.8?'scan':bs.length?'tinker':'wander';I.t=5+rnd()*8;I.hold=0;
  if(I.k=='tinker'){const b=pick(bs);I.tg=[b.c+.2+rnd()*.6,b.r+.02]}else if(I.k=='sleep'){const b=bs.length&&rnd()<.6?pick(bs):null;I.tg=b?[b.c+.9+rnd()*.15,b.r+.15]:spot();if(I.tg[0]>6.9)I.tg[0]=6.7;if(bl[K(Math.floor(I.tg[0]),Math.floor(I.tg[1]))]||G[Math.floor(I.tg[1])]&&G[Math.floor(I.tg[1])][Math.floor(I.tg[0])].s!=2)I.tg=spot()}else I.tg=spot()}}
 const arrived=walk(w,I.tg[0],I.tg[1],I.k=='wander'?1.0:1.35,dt);
 if(!arrived)return;
 if(I.k=='wander'){I.hold+=dt;if(I.hold>1+rnd()*1.5){I.tg=spot();I.hold=0}}
 else if(I.k=='sleep'){w.sl=true;w.tool=null}
 else if(I.k=='scan'){w.tool='scan';w.act+=dt*2;if(Math.sin(tm*1.4)>.99)snd('scan',w.x)}
 else if(I.k=='tinker'){w.tool='wrench';const ph0=Math.floor(w.act/TAU);w.act+=dt*6;if(Math.floor(w.act/TAU)>ph0&&rnd()<.5)snd('clink',w.x)}
 else if(I.k=='pet')petW(w,dt,I)}
/* Streicheln & Füttern: rein kosmetisch – Arbeiter ohne Auftrag kraulen einen dressierten Wurm */
function petW(w,dt,I){const q=I.tw;
 if(!q||!TW.includes(q)||q.st!='idle'||q.po!==w){if(q&&q.po===w){q.po=null;q.pp=null}I.t=0;I.tg=null;I.k=null;return}
 w.face=I.sd;w.pz=-.3;I.pt+=dt;const t=I.pt,hz=(zz)=>fxAdd({ty:'heart',x:q.x+(rnd()-.5)*.5,y:q.y-.1,z:zz+rnd()*.3,vx:(rnd()-.5)*.3,vz:.5+rnd()*.4,l:1+rnd()*.5});
 let h=.72,op=.25,mood='calm';const look=-I.sd;
 if(I.ph==0){h=.72-.2*Math.min(1,t/.5)+.03*Math.sin(t*14);op=.4;if(t>.8){I.ph=1;I.pt=0;say(w,'w','pet')}}
 else if(I.ph==1){w.tool='pet';w.act+=dt*5.5;h=.4+.03*Math.sin(t*5.5);op=.08;mood='bow';
  if(!I.pr&&t>.35){I.pr=1;snd('purr',w.x)}I.hc-=dt;if(I.hc<=0){I.hc=.5;hz(.5)}
  if(t>3.2){I.ph=2;I.pt=0;I.pr=0;say(w,'w','feed')}}
 else if(I.ph==2){
  if(t<1.4){w.tool='treat';w.act+=dt*4;h=.52+.05*Math.sin(t*7);op=.55+.4*Math.max(0,Math.sin(t*5));if(Math.sin(t*6)>.97)fxAdd({ty:'star',x:q.x,y:q.y,z:.9,l:.4,txt:'♪',fun:1})}
  else{if(I.ch<3&&t>1.4+I.ch*.28){I.ch++;snd('nom',q.x);if(I.ch==1){fxAdd({ty:'star',x:q.x,y:q.y,z:1.05,l:.7,txt:pick(['MAMPF!','NOM!','LECKER!']),fun:1});fxBits(q.x-I.sd*.15,q.y,.5,5,'#ffb347','rect',.025)}}
   h=.6+.06*Math.sin(t*22);op=.12+.2*Math.abs(Math.sin(t*14));mood='bow'}
  if(t>2.5){I.ph=3;I.pt=0}}
 else{mood='bow';h=.72+Math.abs(Math.sin(t*9))*.14*Math.max(0,1-t/1.2);op=.3;if(!I.hp){I.hp=1;snd('boing',q.x);for(let i=0;i<5;i++)hz(.5+i*.08)}
  if(t>1.2){q.po=null;q.pp=null;q.pcd=gt+16;w.pcd=gt+22+rnd()*18;I.t=0;I.tg=null;I.k=null;I.ph=0;return}}
 q.pp={t:gt,h,op,look,mood}}
function sepW(){const wkg=w=>!w.mv&&w.j;for(let i=0;i<wk.length;i++)for(let j=i+1;j<wk.length;j++){const a=wk[i],b=wk[j];if(wkg(a)&&wkg(b))continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.3){const push=(.3-d)*.5,ux=d>.001?dx/d:1,uy=d>.001?dy/d:0;if(!wkg(a)){a.x-=ux*push;a.y-=uy*push}if(!wkg(b)){b.x+=ux*push;b.y+=uy*push}}}}
/* ---------- Bedarf: was fehlt einem Gebäude? ---------- */
function needsOf(b){const o=[];if(b.bp<1||b.k=='hub'||b.k=='cv')return o;
 if(!isLive(b)){o.push({k:'link',t:'Nicht angeschlossen: verbinde das Gebäude per Fließband mit dem Quartier.'});return o}
 if(b.wo){const pre=b.off?'Aus: ':'Engpass – gleich aus: ',lk=b.lk||b.wo;
  if(lk.includes('W'))o.push({k:'water',t:pre+'zu wenig Wasser ('+RES.dW+' gebraucht, '+RES.sW+' geliefert). Dieses Gebäude wurde zuletzt gebaut. Baue einen Taufänger (💧 +4).'});
  if(lk.includes('P'))o.push({k:'bolt',t:pre+'zu wenig Strom ('+RES.dP+' gebraucht, '+RES.sP+' erzeugt). Dieses Gebäude wurde zuletzt gebaut.'+(L.u.includes('ene')?' Baue ein Energiefeld (⚡ +6) oder reiße etwas ab.':' Reiße ein anderes Gebäude ab, um Strom zu sparen.')});
  if(lk.includes('A'))o.push({k:'ammo',t:pre+'zu wenig Munition ('+RES.dA+' gebraucht, '+RES.sA+' geliefert). Baue eine Fabrik (Munition +4).'})}
 if(b.k=='smelt'&&!b.batch&&!(b.sand>0))o.push({k:'vein',t:'Kein Sand: verbinde einen Sandbohrer auf Treibsand mit diesem Schmelzofen.'});
 if(b.k=='crdep'&&!(b.crystals>0))o.push({k:'vein',t:'Wartet auf Energiekristalle vom verbundenen Schmelzofen.'});
 if(b.k=='raf'&&un.some(u=>u.b===b)){const v=veinsNear(b.c+.5,b.r+.5,reachOf(b.lv));if(v.a+v.w==0)o.push({k:'vein',t:v.u?'Die Adern in Reichweite sind noch ungegraben.':'Keine Adern in Reichweite: baue weiter oben eine neue Raffinerie.'})}
 return o}
/* Engpass beginnt: kurze Vorwarnung, das Gebäude läuft noch ein paar Sekunden */
function engEvent(b){const m=b.wo=='P'?'⚡':b.wo=='W'?'💧':'▮';ft(b.c+.5,b.r+1.15,m+' Engpass','#ffb347');snd('brown',b.c+.5)}
/* Gebäude fällt wegen Strom-/Wassermangel aus: Warnung */
function resEvent(b){const m=b.off=='P'?['⚡','Strom','Baue ein Energiefeld.']:b.off=='W'?['💧','Wasser','Baue einen Taufänger.']:['▮','Munition','Baue eine Fabrik (Munition +4).'];ft(b.c+.5,b.r+1.15,m[0]+' aus – '+m[1]+' fehlt','#ff6a5a');
 toast(m[0]+' Zu wenig '+m[1]+': '+BL[b.k]+' ist aus. '+m[2]);snd('alarm')}
const unsupplied=()=>Object.values(bl).filter(b=>b.bp>=1&&b.k!='hub'&&b.k!='cv'&&!isLive(b));
/* ---------- Adern: erschöpfen & nachwachsen (Menge halbiert sich jedes Mal) ---------- */
function exhaust(t){t.st=0;t.gen=(t.gen||0)+1;t.cap=Math.max(4,Math.round((t.cap||40)/2));t.rgm=t.rg=16+Math.min(14,t.gen*4);RV.push(t);ft(t.c+.5,t.r+.6,'Ader erschöpft','#c9a')}
function regrow(dt){if(!RV.length)return;for(const t of RV){t.rg-=dt;if(t.rg<=0){t.rg=0;t.st=t.cap;burst(t.c+.5,t.r+.4,6,'#ffb347');dust(t.c+.5,t.r+.4,2)}}RV=RV.filter(t=>t.rg>0)}
/* ---------- Graben ---------- */
function done(t){t.s=2;t.q=0;const i=Q.indexOf(t);if(i>=0)Q.splice(i,1);const dg=wk.filter(w=>w.j&&w.j.obj===t);wk.forEach(w=>{if(w.j&&w.j.obj===t)w.j=null});t.w=0;t.p=0;ds++;
 if(t.r>tp){tp=t.r;off=0;gen(tp+5)}rev(t.c,t.r);const a=t.c+.5,b=t.r+.5;burst(a,b,16,'#e8b878');dust(a,b,6);snd('dug',a);
 if(t.t==1){cmb=gt-lastSp<9?Math.min(5,cmb+1):1;lastSp=gt;gain(a,b,10*cmb,cmb>1?'COMBO ×'+cmb+'!':'');snd('spice',a,{n:cmb});t.st=40;t.cap=40;t.gen=0;t.rg=0}
 if(t.t==2){gain(a,b,3,'');snd('clink',a)}
 if(t.t==3){if(t.f)tameW(t);else{wormAt(t);t.cr=1}t.t=0}
 if(t.t==4){gain(a,b,45,'RELIKT!');snd('spice',a,{n:5});t.t=0}
 if(t.t==6){t.f=0;t.qs=1;t.cr=3;t.t=0;bver++}
 if(t.t==7){if(t.f){gain(a,b,25,'Gas geerntet');snd('spice',a,{n:3})}else gas(t);t.cr=2;t.t=0}
 t.f=0;
 if(L.p.ne&&!SV.cl&&!numTip&&nb(t.c,t.r)>0){numTip=1;toast('🐛 Zahl mit Wurm-Gesicht: So viele Würmer lauern in den 8 Nachbarfeldern. Vermutest du ein Nest? Wurmflagge ⚑ antippen, dann das Feld.',1)}
 checkH()}
function calcH(){let h=1;for(let r=2;r<G.length;r++){let n=0;for(const t of G[r])if(t.s==2)n++;if(n>=L.rn)h=r;else break}return h}
function rowN(r){let n=0;if(G[r])for(const t of G[r])if(t.s==2)n++;return n}
function checkH(){hh=calcH();if(hh>=L.h&&phase=='play'){phase='prep';pt=Math.round(25*DFc.pt);snd('horn');UI.banner()}else if(L.rd&&!L.rd.d&&hh>=L.rd.h&&phase=='play'){L.rd.d=1;phase='rw';pt=Math.round(15*DFc.pt);snd('horn');UI.banner()}}
function wormAt(t){wm={x:t.c+.5,y:t.r+.5,t:0};shk=1;ft(t.c+.5,t.r+1.3,'SANDWURM!','#ff5a4a',1);snd('worm',t.c+.5);
 for(const k in bl){const b=bl[k];if(Math.hypot(b.c-t.c,b.r-t.r)<1.6){const dm=Math.round(90*DFc.hzd);b.hp-=dm;ft(b.c+.5,b.r+.9,'-'+dm+' HP','#ff5a4a');if(b.hp<=0)kill(b)}}
 wk.forEach(w=>{if(Math.hypot(w.x-wm.x,w.y-wm.y)<DFc.hzr){w.dead=1;ft(w.x,w.y+.5,'☠ Arbeiter','#fff');burst(w.x,w.y,10,'#e8d8a0')}})}
function gas(t){const a=t.c+.5,b=t.r+.5;shk=.8;burst(a,b,30,'#c9e86a');ft(a,b+1,'GASBLASE!','#c9e86a',1);snd('gas',a);for(const k in bl){const o=bl[k];if(Math.hypot(o.c-t.c,o.r-t.r)<1.6){const dm=Math.round(55*DFc.hzd);o.hp-=dm;ft(o.c+.5,o.r+.9,'-'+dm+' HP','#ff5a4a');if(o.hp<=0)kill(o)}}
 un.forEach(u=>{if(Math.hypot(u.x-a,u.y-b)<1.6)u.hp-=55*DFc.hzd});en.forEach(e=>{if(Math.hypot(e.x-a,e.y-b)<1.6)e.hp-=70});wk.forEach(w=>{if(Math.hypot(w.x-a,w.y-b)<1.4){w.hp-=18*DFc.hzd;if(w.hp<=0){w.dead=1;ft(w.x,w.y+.5,'☠ Arbeiter','#fff')}}})}
function defuse(t){const a=t.c+.5,b=t.r+.5;if(sp<15){ft(a,b,'Zu wenig ✦','#ff6a5a');snd('err');return}sp-=15;t.f=0;
 if(t.t==3){const rw={3:35,6:12,7:25}[t.t],nm={3:'Wurmzahn!',6:'Salz geborgen',7:'Gas geerntet'}[t.t];t.cr=t.t==3?1:t.t==7?2:3;t.t=0;t.s=2;rev(t.c,t.r);burst(a,b,24,'#7dff8a');ft(a,b+.6,'ENTSCHÄRFT','#7dff8a');gain(a,b,rw,nm);snd('defuse',a);if(t.r>tp){tp=t.r;gen(tp+5)}checkH()}
 else{ft(a,b,'Kein Nest! −15 ✦','#ff6a5a');snd('err')}}
function kill(b){const k=K(b.c,b.r);if(!bl[k])return;delete bl[k];bver++;un=un.filter(u=>u.b!==b);wk.forEach(w=>{if(w.j&&w.j.obj===b)w.j=null;if(w.dk===b)w.dk=null});
 burst(b.c+.5,b.r+.5,b.k=='cv'?10:30,'#ff8a4a');spark(b.c+.5,b.r+.5,10);dust(b.c+.5,b.r+.4,5);snd(b.k=='cv'?'crack':'boom',b.c+.5,{sz:b.k=='cv'?.5:.8});if(b.k!='cv')ft(b.c+.5,b.r+1.1,BL[b.k]+' zerstört','#ff8a6a');
 const t=tw(b.c,b.r);if(t&&b.k!='cv'&&b.k!='hub')t.cr=1;if(b.k=='hub')end(0);if(sel&&sel.c==b.c&&sel.r==b.r){sel=null;UI.sheet('')}}
function finishBuild(b){b.bp=1;b.bo=++BO;b.flash=1;burst(b.c+.5,b.r+.4,16,'#8fe0ff');dust(b.c+.5,b.r+.3,6);if(b.k!='cv'){snd('buildDone',b.c+.5);ft(b.c+.5,b.r+1.15,BL[b.k]+' fertig','#9ff')}else snd('tick',b.c+.5)}
/* ---------- Bauen · Ausbilden ---------- */
function build(k,c,r){const d=B[k];if(!canPlace(c,r,k)){const t_=tw(c,r);toast(k=='bore'&&t_&&!t_.qs?'Sandbohrer nur auf freigelegtem Treibsand':t_&&t_.qs?'Auf Treibsand darf nur der Sandbohrer stehen':wormOn(c,r)?'Hier lebt ein Wurm – darauf kann man nicht bauen':'Nicht mit dem Quartier verbunden');snd('err');return false}if(sp<d.c){ft(c+.5,r+.5,'Zu wenig ✦','#ff6a5a');snd('err');return false}
 sp-=d.c;bl[K(c,r)]=mkB(k,c,r,0);bver++;ft(c+.5,r+.8,'−'+d.c+' ✦','#ffb347');burst(c+.5,r+.3,8,'#8fe0ff');if(k!='cv')snd('buildStart',c+.5);else snd('tick',c+.5);calcNet();return true}
function orderUnit(b){const d=B[b.k],U=UN[d.u];if(!isLive(b)){ft(b.c+.5,b.r+1,'⚠ Nicht versorgt','#ff6a5a');snd('err');return}if(b.off){ft(b.c+.5,b.r+1,b.off=='P'?'⚡ aus':b.off=='W'?'💧 aus':'▮ aus','#ff6a5a');toast(b.off=='P'?'⚡ Dieses Gebäude ist aus – es fehlt Strom.':b.off=='W'?'💧 Dieses Gebäude ist aus – es fehlt Wasser.':'▮ Dieses Gebäude ist aus – es fehlt Munition.');snd('err');return}
 const have=un.filter(u=>u.b===b).length+b.q.length;if(have>=d.cap+b.lv){ft(b.c+.5,b.r+1,'Voll','#ff6a5a');snd('err');return}
 const cost=Math.ceil(U.c/syn(b));if(sp<cost){ft(b.c+.5,b.r+1,'Zu wenig ✦','#ff6a5a');snd('err');return}
 sp-=cost;const it={k:d.u,p:0,t:U.t*(b.k=='raf'?1:1),arr:false,cost};b.q.push(it);const q=ship(b,'od',cost,it);if(!q){sp+=cost;b.q.pop();snd('err');return}ft(3.5,.95,'−'+cost+' ✦ → '+BL[b.k],'#ffb347');snd('tap')}
function hire(){const h=hubB();if(wk.length+h.q.length>=WK.max){ft(3.5,1,'Maximum erreicht','#ff6a5a');snd('err');return}if(sp<WK.c){ft(3.5,1,'Zu wenig ✦','#ff6a5a');snd('err');return}sp-=WK.c;h.q.push({k:'wk',p:0,t:WK.t,arr:true,cost:WK.c});snd('train',3.5)}
function upgradeCost(b){return Math.ceil((B[b.k].c||60)*1.4*(b.lv+1))}
function upgrade(b){if(b.lv>=2||b.up||b.k=='cv')return;const c=upgradeCost(b);if(!isLive(b)||b.off){snd('err');return}if(sp<c){ft(b.c+.5,b.r+1,'Zu wenig ✦','#ff6a5a');snd('err');return}sp-=c;b.up={p:0,t:6+b.lv*4};snd('upStart',b.c+.5);ft(b.c+.5,b.r+1.1,'Entwicklung …','#ffe28a');toast('⬆ '+BL[b.k]+' wird ausgebaut: '+UT[b.k],1)}
function demolish(b){if(b.k=='hub')return;const back=Math.floor((B[b.k].c||0)*.5);sp+=back;ft(b.c+.5,b.r+.9,'+'+back+' ✦ Rückbau','#ffb347');const k=K(b.c,b.r);delete bl[k];bver++;un=un.filter(u=>u.b!==b);wk.forEach(w=>{if(w.j&&w.j.obj===b)w.j=null;if(w.dk===b)w.dk=null});burst(b.c+.5,b.r+.4,12,'#e8b878');dust(b.c+.5,b.r+.3,6);snd('crack',b.c+.5);sel=null;UI.sheet('')}
const hm=u=>{const b=u.b,i=u.i||0;return[b.c+.15+.3*(i%3),b.r+.1+.13*Math.floor(i/3)]};
function ridx(){const cn={};un.forEach(u=>{const k=K(u.b.c,u.b.r);u.i=cn[k]||0;cn[k]=u.i+1})}
function nu(b,k){const m=syn(b)*(1+.3*b.lv),u={b,k,i:un.filter(q=>q.b===b).length,dm:m,hp:FS[k].h*m,cd:0,st:0,ld:0,ph:rnd()*9,act:0,face:1,tr:0};u.mx=u.hp;if(k=='war')u.kit=kitOf('war');const h=hm(u);u.x=h[0];u.y=h[1];return u}
/* ---------- Kampf-Effekte: Angriffe, Treffer, Tode ---------- */
let amb=0,hqAcc=0,hqT=0,lastTing=-9,wcT=0,awT=0,lastDrink=-9;
function fxAdd(o){if(FXS.length>260)FXS.shift();o.t=-(o.dl||0);o.l=o.l||.4;o.z=o.z||0;if(o.ty=='spark'&&o.g==null)o.g=6;FXS.push(o);return o}
function fxSpark(a,b,z,n,c){for(let i=0;i<n;i++)fxAdd({ty:'spark',x:a,y:b,z,vx:(rnd()-.5)*3,vy:(rnd()-.5)*1.2,vz:.8+rnd()*2.2,l:.26+rnd()*.26,c:c||(rnd()<.5?'#fff0b0':'#ffb347')})}
function fxPuff(a,b,z,n,c,sz){for(let i=0;i<n;i++)fxAdd({ty:'puff',x:a+(rnd()-.5)*.2,y:b,z,vx:(rnd()-.5)*.7,vy:(rnd()-.5)*.2,vz:.3+rnd()*.7,l:.55+rnd()*.5,sz:(sz||.1)*(.7+rnd()*.6),c:c||'rgba(214,204,194,A)'})}
function fxBits(a,b,z,n,c,sh,sz){for(let i=0;i<n;i++)fxAdd({ty:'bit',x:a,y:b,z,vx:(rnd()-.5)*2.6,vy:(rnd()-.5)*.8,vz:1.2+rnd()*2,g:9,bn:1,rot:rnd()*6,rv:(rnd()-.5)*18,l:.9+rnd()*.5,c,sh,sz:sz||.04})}
const projAt=(f,p)=>{p=Math.max(0,Math.min(1,p));return[f.x1+(f.x2-f.x1)*p,f.y1+(f.y2-f.y1)*p,f.z1+(f.z2-f.z1)*p+(f.arc||0)*4*p*(1-p)]};
const projPos=f=>projAt(f,f.t/f.l);
const pxo=o=>o.x!=null?o.x:o.c+.5,pyo=o=>o.y!=null?o.y:o.r+.4;
function say(o,sd,ct){if(gt-sayT<1.3||o.x==null)return;sayT=gt;fxAdd({ty:'say',x:o.x,y:o.y,z:.95,l:1.3,txt:pick(SAY[sd][ct])})}
/* Schaden mit Verzögerung: Treffer-Blitz, Rückstoß, Zahl, Tod von Arbeitern */
function hurt(o,m,fromX,col,show){if(!o||o.hp<=0)return;o.hp-=m;const ox=pxo(o),oy=pyo(o);
 if(o.x!=null){o.hf=gt;if(fromX!=null)o.kb=clamp((o.kb||0)+Math.sign(ox-fromX)*.12,-.22,.22)}else o.flash=Math.max(o.flash||0,.3);
 const sh=show==null?m:show;if(sh>=4){const t_='−'+Math.round(sh);if(bt)bt.dn.push({x:ox,y:oy+.9,t:t_,c:col||'#fff3a0',l:.8});else ft(ox,oy+(o.x!=null?.6:.5),t_,col||'#fff3a0')}
 if(o.col&&o.hp<=0&&!o.dead){o.dead=1;deathFX(o,false,1)}}
function atk(a,t,m){if(a.k=='drn'||a.k=='ali'){L6.laser(a,t,m);return}
 const k=a.k,foe=k=='pl'||k=='pz'||k=='br',col=foe?'#ff8a7a':'#fff3a0',ax=a.x,ay=a.y,tx=pxo(t),ty=pyo(t),dir=tx>=ax?1:-1,D=Math.hypot(tx-ax,ty-ay);
 if(rnd()<.16)say(a,foe?'e':'f','atk');
 if(k=='cra'){a.as=gt;a.ad=.35;a.rc=1;const mx=ax+dir*.26,mz=.3,fl=clamp(D*.2,.16,.5);snd('cannon',ax);
  fxAdd({ty:'flash',x:mx,y:ay,z:mz,l:.11,r:.34,c:'255,214,130'});fxPuff(mx,ay,mz,4,'rgba(200,190,180,A)',.07);
  fxAdd({ty:'proj',pk:'shell',x1:mx,y1:ay,z1:mz,x2:tx,y2:ty,z2:.3,arc:.45,l:fl});
  later(fl,()=>{fxAdd({ty:'boom',x:tx,y:ty,z:.25,r:.55,l:.45});fxSpark(tx,ty,.3,7);fxPuff(tx,ty,.3,3,'rgba(70,60,60,A)',.1);snd('boom',tx,{sz:.4});hurt(t,m,ax,col)})}
 else if(k=='pz'){a.as=gt;a.ad=.4;a.rc=.8;snd('rocket',ax);const mx=ax+dir*.3;
  for(let i=0;i<2;i++){const dl=i*.15,fl=clamp(D*.22,.2,.5),yy=ay+(i?.05:-.05);
   fxAdd({ty:'flash',x:mx,y:yy,z:.38,dl,l:.1,r:.3,c:'255,170,90'});
   fxAdd({ty:'proj',pk:'rocket',dl,x1:mx,y1:yy,z1:.38,x2:tx+(i?.1:-.1),y2:ty,z2:.3,arc:.35+i*.12,l:fl});
   later(dl+fl,()=>{fxAdd({ty:'boom',x:tx,y:ty,z:.25,r:.45,l:.4});fxSpark(tx,ty,.3,5);snd('boom',tx,{sz:.3});hurt(t,m/2,ax,col,i?m:0)})}}
 else if(k=='br'){a.as=gt;a.ad=.7;a.hz=0;a.hv=3.3;
  later(.5,()=>{fxAdd({ty:'ring',x:a.x,y:a.y,r:1.9,l:.6,c:'255,200,150'});fxAdd({ty:'ring',x:a.x,y:a.y,r:1.2,l:.45,dl:.06,c:'255,236,200'});fxPuff(a.x,a.y,.1,9,'rgba(190,150,110,A)',.16);fxBits(a.x,a.y,.1,6,'#b88a60','rect',.05);shk=Math.max(shk,.5);snd('stomp',a.x);hurt(t,m,a.x,col)})}
 else if(k=='tur'){const mx=ax+dir*.32,mz=bt?.5:.6;snd('burst',ax);
  for(let i=0;i<3;i++){const dl=i*.07,fl=.1+D*.015;fxAdd({ty:'flash',x:mx,y:ay,z:mz,dl,l:.07,r:.22,c:'170,235,255'});
   fxAdd({ty:'proj',pk:'tracer',dl,x1:mx,y1:ay,z1:mz,x2:tx+(rnd()-.5)*.2,y2:ty,z2:.35,l:fl});
   fxAdd({ty:'bit',x:ax,y:ay,z:mz,dl,vx:-dir*(.6+rnd()),vy:0,vz:1.4+rnd(),g:9,bn:1,rot:0,rv:14,l:.8,c:'#e8c060',sh:'rect',sz:.022});
   later(dl+fl,()=>{fxSpark(tx,ty,.35,2,'#aef');hurt(t,m/3,ax,col,i==2?m:0)})}}
 else if(k=='hub'){snd('pulse',ax);fxAdd({ty:'ring',x:ax,y:ay,r:1.4,l:.5,c:'140,230,255'});
  fxAdd({ty:'proj',pk:'pulse',x1:ax,y1:ay,z1:.8,x2:tx,y2:ty,z2:.3,l:.26});
  later(.26,()=>{fxAdd({ty:'boom',x:tx,y:ty,z:.25,r:.4,l:.38,cy:1});fxSpark(tx,ty,.3,6,'#aef');hurt(t,m,ax,col)})}
 else if(k=='wrm'){a.as=gt;a.ad=.5;snd('roar',ax);later(.25,()=>{const hx=pxo(t),hy=pyo(t);fxAdd({ty:'star',x:hx,y:hy,z:.6,l:.55,txt:pick(['MAMPF!','SCHNAPP!','NOM!']),fun:1});fxPuff(hx,hy,.3,4,'rgba(200,170,120,A)',.09);fxBits(hx,hy,.5,4,'#c9a67a','rect',.04);snd('hit',hx);hurt(t,m,a.x,col)})}
 else{const kt=a.kit||(foe?KIT.pl[0]:KIT.war[0]);a.as=gt;a.ad=.5;a.at=kt.at;
  if(kt.at!='smash')snd('slash',ax);
  later(.26,()=>{const hx=pxo(t),hy=pyo(t),d2=hx>=a.x?1:-1;
   if(kt.at=='slash'){fxAdd({ty:'slash',x:hx-d2*.05,y:hy,z:.45,dir:d2,l:.24,c:foe?'255,150,130':'190,235,255'});fxSpark(hx,hy,.45,5)}
   else if(kt.at=='thrust'){fxAdd({ty:'thrust',x:a.x+d2*.1,y:a.y,z:.4,dir:d2,len:Math.max(.5,Math.abs(hx-a.x)+.25),l:.17,c:foe?'255,170,150':'210,240,255'});fxSpark(hx,hy,.4,4)}
   else{fxAdd({ty:'star',x:hx,y:hy,z:.6,l:.6,txt:kt.txt,fun:kt.fun});fxAdd({ty:'ring',x:hx,y:hy,r:.5,l:.3,c:'255,236,180'});
    if(kt.id=='mallet'||kt.id=='pan')fxAdd({ty:'dz',x:hx,y:hy,z:.85,l:1});
    if(kt.id=='chicken')fxBits(hx,hy,.5,7,'#fff4c8','feather',.035);
    if(kt.id=='wrench')fxBits(hx,hy,.5,5,'#aeb8c8','hex',.03)}
   snd(kt.sn||'hit',hx);hurt(t,m,a.x,col)})}}
function deathFX(o,foe,isW){const k=o.k,ox=o.x,oy=o.y;if(k=='drn'||k=='ali'){fxAdd({ty:'boom',x:ox,y:oy,z:k=='drn'?.8:.3,r:.55,l:.45,cy:1});fxSpark(ox,oy,.6,9,'#a4ffd9');fxPuff(ox,oy,.3,4,'rgba(62,94,103,A)',.12);snd('boom',ox,{sz:.4});return}
 if(k=='cra'||k=='pz'||k=='br'||k=='sam'||k=='tur'||k=='hub'||k=='wrm'){const big=k=='br'||k=='hub',wreck=k!='tur'&&k!='hub'&&k!='wrm';snd(big?'wreck':'boom',ox,{sz:big?1:.55});
  fxAdd({ty:'boom',x:ox,y:oy,z:.25,r:big?1.3:.65,l:big?.75:.5});fxSpark(ox,oy,.3,big?18:9);fxPuff(ox,oy,.3,big?10:5,'rgba(58,52,54,A)',big?.2:.12);
  fxBits(ox,oy,.3,big?7:4,foe?'#7a2030':'#8a6a3a','rect',.05);
  if(wreck)fxAdd({ty:'wreck',x:ox,y:oy,k,face:o.face||1,l:big?4.5:3,s:big?1.3:1});
  if(big){shk=Math.max(shk,.8);fxAdd({ty:'ring',x:ox,y:oy,r:2.2,l:.7,c:'255,170,100'})}}
 else{const su=isW?o.col:foe?['#b8402c','#4a160e']:['#c9a060','#6a4a24'],d=o.kb?Math.sign(o.kb):(rnd()<.5?1:-1);snd('die',ox);
  fxAdd({ty:'corpse',x:ox,y:oy,vx:d*(.9+rnd()*.8),vz:2.4+rnd(),g:9,bn:1,rot:0,rv:d*(6+rnd()*5),l:1.15,suit:su,face:o.face||1,s:isW?.62:.55});
  fxBits(ox,oy,.7,1,su[0],'dome',.09);fxAdd({ty:'star',x:ox,y:oy,z:.6,l:.55,txt:pick(['PUFF!','WUSCH!','AUA!','BOING!','PLOPP!']),fun:1});
  if(rnd()<.5)say(o,foe?'e':'f','die')}}
function fxUpd(dt){
 if(FXS.length){const n=FXS.length;for(let i=0;i<n;i++){const f=FXS[i];if(!f)continue;f.t+=dt;if(f.t<0)continue;
  if(f.vx!=null){f.x+=f.vx*dt;f.y+=(f.vy||0)*dt;f.z+=(f.vz||0)*dt;if(f.g)f.vz-=f.g*dt;if(f.bn&&f.z<0){f.z=0;f.vz*=-.32;f.vx*=.55;if(Math.abs(f.vz)<.5)f.vz=0}}
  if(f.rv)f.rot=(f.rot||0)+f.rv*dt;
  if(f.ty=='proj'&&(f.pk=='rocket'||f.pk=='shell')){f.em=(f.em||0)-dt;if(f.em<=0){f.em=f.pk=='rocket'?.035:.05;const p=projPos(f);fxAdd({ty:'puff',x:p[0],y:p[1],z:p[2],vx:0,vy:0,vz:.2,l:.4,sz:f.pk=='rocket'?.05:.035,c:'rgba(236,230,220,A)'})}}
  if(f.ty=='wreck'){f.em=(f.em||0)-dt;if(f.em<=0&&f.t<f.l-1){f.em=.2;fxPuff(f.x,f.y,.3,1,'rgba(55,52,56,A)',.11)}}}
  FXS=FXS.filter(f=>f.t<f.l)}
 const dec=Math.max(0,1-dt*9),arr=[un,en,wk];if(bt)arr.push(bt.f);
 for(const a of arr)for(const o of a){if(o.kb){o.kb*=dec;if(Math.abs(o.kb)<.004)o.kb=0}if(o.rc>0)o.rc=Math.max(0,o.rc-dt*5);if(o.hv){o.hz=(o.hz||0)+o.hv*dt;o.hv-=14*dt;if(o.hz<=0){o.hz=0;o.hv=0}}}}
/* Ankunft im Quartier: ✦ werden zu Geld verarbeitet */
function payIn(n){const h=hubB();sp+=n;if(!hqAcc)hqT=.7;hqAcc+=n;if(h)h.proc=1;
 fxAdd({ty:'coin',x:3.5+(rnd()-.5)*.3,y:.45,z:.8,vx:(rnd()-.5)*1,vz:1.7+rnd(),g:7.5,l:.75});
 pa.push({fl:1,sx:3.5*T+(rnd()-.5)*16,sy:BY-(.7-(camS||0))*T,l:.8,m:.8});
 if(gt-lastTing>.2){lastTing=gt;snd('ting',3.5)}}
/* Ladungsverkehr: Nachschub, Wasser, Energiezellen, Schrott */
const CAR={raf:['ret','sup'],kas:['sup','scrap'],fab:['sup','scrap'],tur:['sup'],ene:['sup'],wel:['sup']};
/* Erzeuger → Verbraucher: Wasser (Taufänger), Munition (Fabrik), Energie (Energiefeld/Quartier) laufen über die Bänder */
const RF=[['wat',resW],['am',resA],['pwr',resP]];
function flow(){const[kd,f]=pick(RF),pr=[],cs=[];
 for(const k of NET){const b=bl[k];if(!b||b.bp<1||b.k=='cv'||!isOn(b))continue;const v=f(b);if(v>0&&(b.k!='hub'||kd=='pwr'))pr.push(b);else if(v<0)cs.push(b)}
 if(!pr.length||!cs.length)return false;const a=pick(pr),c=pick(cs),p=pathBetween(a,c);if(!p||p.length<2)return false;
 if(pk.some(q=>q.b===c&&q.kind==kd&&q.cos&&q.p<1.6))return false;
 pk.push({pth:p,p:.5,kind:kd,amt:0,b:c,cos:1});return true}
function traffic(){if(pk.length>150)return;let cos=0;for(const q of pk)if(q.cos)cos++;if(cos>=64)return;if(rnd()<.6&&flow())return;
 const bs=[];for(const k in bl){const b=bl[k];if(b.bp>=1&&b.k!='hub'&&b.k!='cv'&&isOn(b)){bs.push(b);if(b.q.length||b.up||b.k=='raf'&&b.stock>0||0)bs.push(b,b)}}
 if(!bs.length)return;const b=pick(bs),kd=pick(CAR[b.k]||['sup']),inb=kd=='sup';
 if(pk.some(q=>q.b===b&&q.cos&&q.p<1.4&&(q.kind=='sup')==inb))return;
 const p=pathTo(b);if(p.length<2)return;if(inb)p.reverse();pk.push({pth:p,p:.5,kind:kd,amt:0,b,cos:1})}

/* ---------- Wegfindung: Figuren laufen um Gebäude herum (Fließbänder sind begehbar) ---------- */
let bver=0;const OFF=[[0,0],[.26,0],[-.26,0],[0,.26],[0,-.26]];
const blk=(c,r)=>{if(c<0||c>=W)return true;const b=bl[K(c,r)];if(b&&b.k!='cv')return true;const t=G[r]&&G[r][c];return !!(t&&t.qs)};
function lineClear(x0,y0,x1,y1){const c0=Math.floor(x0),r0=Math.floor(y0),c1=Math.floor(x1),r1=Math.floor(y1),n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/.15));
 for(let i=0;i<=n;i++){const t=i/n,px=x0+(x1-x0)*t,py=y0+(y1-y0)*t;for(const o of OFF){const c=Math.floor(px+o[0]),r=Math.floor(py+o[1]);if(c==c0&&r==r0||c==c1&&r==r1)continue;if(blk(c,r))return false}}return true}
function navPath(x0,y0,tx,ty){const sc=Math.floor(x0),sr=Math.floor(y0),gc=Math.floor(tx),gr=Math.floor(ty);if(sc==gc&&sr==gr)return[];if(lineClear(x0,y0,tx,ty))return[];
 const r0=Math.max(0,Math.min(sr,gr)-4),r1=Math.max(sr,gr)+5,H=r1-r0+1,N=H*W;if(sr<0||gr<0)return[];
 const ix=(c,r)=>(r-r0)*W+c,D=new Float32Array(N).fill(1e9),Pv=new Int16Array(N).fill(-1),dn=new Uint8Array(N);
 const fr=(c,r)=>c>=0&&c<W&&r>=r0&&r<=r1&&(!blk(c,r)||c==sc&&r==sr||c==gc&&r==gr);
 D[ix(sc,sr)]=0;const S0=ix(sc,sr),G0=ix(gc,gr);
 for(let it=0;it<N;it++){let u=-1,bd=1e9;for(let i=0;i<N;i++)if(!dn[i]&&D[i]<bd){bd=D[i];u=i}if(u<0||u==G0)break;dn[u]=1;const c=u%W,r=r0+((u/W)|0);
  for(let dc=-1;dc<=1;dc++)for(let dr=-1;dr<=1;dr++){if(!dc&&!dr)continue;const nc=c+dc,nr=r+dr;if(!fr(nc,nr))continue;if(dc&&dr&&(blk(c+dc,r)||blk(c,r+dr)||c+dc<0||c+dc>=W))continue;const v=ix(nc,nr),nd=D[u]+(dc&&dr?1.42:1);if(nd<D[v]){D[v]=nd;Pv[v]=u}}}
 if(Pv[G0]<0)return null;const out=[];let u=Pv[G0];while(u>=0&&u!=S0){out.push([u%W+.5,r0+((u/W)|0)+.5]);u=Pv[u]}out.reverse();
 const res=[];let pos=[x0,y0],i=0;while(i<out.length){let j=i;for(let k=out.length-1;k>i;k--)if(lineClear(pos[0],pos[1],out[k][0],out[k][1])){j=k;break}res.push(out[j]);pos=out[j];i=j+1}return res}
function wayTo(o,tx,ty,dt){const tk=Math.floor(tx)*64+Math.floor(ty);
 if(o.nk!==tk||o.nv!==bver||(o.nt-=dt)<=0||!o.np){o.nk=tk;o.nv=bver;o.nt=.7;o.np=navPath(o.x,o.y,tx,ty)||[]}
 const p=o.np;while(p.length&&Math.hypot(p[0][0]-o.x,p[0][1]-o.y)<.12)p.shift();return p.length?p[0]:[tx,ty]}
function stp(o,v){o.sd=(o.sd||0)+v;if(o.sd>.9){o.sd=0;fxPuff(o.x,o.y,.02,1,'rgba(226,196,150,A)',.05)}}
function pathBetween(a,b){const A=pathTo(a),B=pathTo(b);if(!A.length||!B.length)return null;const sB=new Set(B);let i=0;while(i<A.length&&!sB.has(A[i]))i++;if(i>=A.length)return null;const j=B.indexOf(A[i]);return A.slice(0,i+1).concat(B.slice(0,j).reverse())}
function shipX(a,b,kind,amt,cb){if(!isLive(a)||!isLive(b))return null;const p=pathBetween(a,b);if(!p||p.length<2)return null;const q={pth:p,p:.5,kind,amt,cb,b};pk.push(q);return q}
/* ---------- Sandwurm zähmen ---------- */
function tameStage(o){const p=o.p;
 if(p>.1&&!o.s1){o.s1=1;shk=Math.max(shk,.4);snd('worm',o.c+.5);dust(o.c+.5,o.r+.5,8);ft(o.c+.5,o.r+1.3,'WURM!','#ff8a6a',1)}
 if(p>.42&&!o.s2){o.s2=1;snd('whistle',o.c+.5);ft(o.c+.5,o.r+1.3,'Dressur …','#ffe28a',1)}
 if(p>.78&&!o.s3){o.s3=1;snd('upDone',o.c+.5);ft(o.c+.5,o.r+1.3,'Sitz! Platz!','#9ff',1)}}
function tameW(t){const a=t.c+.5,b=t.r+.5;TW.push({x:a,y:b+.1,c:t.c,r:t.r,ph:rnd()*9,t0:gt,st:'idle',t:0,cd:1.2,h:.72,op:.25,hx:a,hy:b+.1,tg:null,look:0});t.cr=1;t.s1=t.s2=t.s3=0;
 gain(a,b,15,'GEZÄHMT!');toast('🐛 Wurm gezähmt! Er schnappt sich Feinde auf Nachbarfeldern und schwächt sie.',1);snd('win',a);shk=Math.max(shk,.3);
 for(let i=0;i<7;i++)fxAdd({ty:'heart',x:a+(rnd()-.5)*.7,y:b,z:.6+rnd()*.5,vx:(rnd()-.5)*.3,vz:.5+rnd()*.4,l:1.2+rnd()*.5,dl:i*.08})}
/* gezähmter Wurm: lauert · taucht ab · Hügel unter dem Sand · bricht aus · schnappt zu · rülpst · geht heim */
const WSAY=['Der hat mich gefressen!','Iiih, Schleim!','Mama!!','Nicht beißen!','Pfui, Wurmspucke!'];
function wormTrail(w,dt,sec){w.tr=(w.tr||0)-dt;if(w.tr<=0){w.tr=sec||.07;fxPuff(w.x,w.y-.05,.02,2,'rgba(214,176,124,A)',.07);if(rnd()<.5)fxBits(w.x,w.y,.04,1,'#c9a67a','rect',.03)}}
function wormTick(w,dt,E){if(w.hx==null){w.hx=w.x;w.hy=w.y;w.st='idle';w.t=0;w.h=.72;w.op=.25;w.cd=.6}w.cd-=dt;
 if(w.st=='idle'){const pp=w.pp&&gt-w.pp.t<.3?w.pp:null;
  if(pp){w.h+=(pp.h-w.h)*Math.min(1,dt*10);w.op=pp.op;w.look=pp.look}else{w.h+=(.72-w.h)*Math.min(1,dt*6);w.op=.25;w.look=Math.sin(tm*.8+(w.ph||0))*.9}
  if(w.cd<=0){const e=E.find(w);if(e){w.tg=e;e.bit=1;w.st='dive';w.t=0;w.look=Math.sign(E.px(e)-w.x)||1;snd('worm',w.x);fxAdd({ty:'star',x:w.x,y:w.y,z:1.1,l:.5,txt:'!',fun:1})}}return}
 w.t+=dt;const e=w.tg,ok=E.alive(e);
 if(w.st=='dive'){w.h=Math.max(0,.72*(1-w.t/.3));w.op=.6;if(!w.d1){w.d1=1;fxPuff(w.x,w.y,.1,6,'rgba(214,176,124,A)',.1);fxBits(w.x,w.y,.1,6,'#c9a67a','rect',.04)}
  if(w.t>=.3){w.st='run';w.t=0;w.h=0;w.d1=0;snd('rumble',w.x)}}
 else if(w.st=='run'){w.h=0;if(!ok){w.st='back';w.t=0;if(e)e.bit=0;return}
  const tx=E.px(e),ty=E.py(e),dx=tx-w.x,dy=ty-w.y,d=Math.hypot(dx,dy);wormTrail(w,dt);
  if(d<.2||w.t>2){w.x=tx;w.y=ty;w.st='rise';w.t=0;w.d1=0}else{const st=Math.min(d,E.spd*dt);w.x+=dx/d*st;w.y+=dy/d*st;w.look=Math.sign(dx)||w.look}}
 else if(w.st=='rise'){if(!w.d1){w.d1=1;snd('sandup',w.x);fxPuff(w.x,w.y,.1,9,'rgba(214,176,124,A)',.13);fxBits(w.x,w.y,.1,10,'#c9a67a','rect',.045);fxAdd({ty:'ring',x:w.x,y:w.y,r:.9,l:.4,c:'230,200,150'});shk=Math.max(shk,.25);if(ok){e.hv=4.6;e.hz=.02;e.stun=2.2;E.say(e)}}
  w.h=Math.min(1,w.t/.26);w.op=.3+.7*Math.min(1,w.t/.3);if(w.t>=.3){w.st='bite';w.t=0;w.d1=0}}
 else if(w.st=='bite'){w.h=1;w.op=Math.max(0,1-w.t/.22);
  if(w.t>=.22&&!w.d1){w.d1=1;snd('chomp',w.x);shk=Math.max(shk,.3);fxAdd({ty:'star',x:w.x,y:w.y,z:1.45,l:.7,txt:pick(['NOM!','SCHNAPP!','MAMPF!']),fun:1});fxBits(w.x,w.y,.8,6,'#ffe6b0','rect',.03);if(ok){E.bite(w,e)}}
  if(w.t>=.8){w.st='burp';w.t=0;w.d1=0}}
 else if(w.st=='burp'){w.h=1;w.op=.3+.2*Math.sin(w.t*18);
  if(!w.d1){w.d1=1;snd('burp',w.x);fxAdd({ty:'star',x:w.x,y:w.y,z:1.5,l:.8,txt:'*RÜLPS*',fun:1});fxPuff(w.x,w.y,1.1,5,'rgba(176,214,110,A)',.1);if(ok)E.spit(w,e)}
  if(w.t>=.55){w.st='sink';w.t=0;w.d1=0}}
 else if(w.st=='sink'){w.h=Math.max(0,1-w.t/.3);w.op=.1;if(w.t>=.3){w.st='back';w.t=0;w.h=0;snd('rumble',w.x)}}
 else if(w.st=='back'){w.h=0;const dx=w.hx-w.x,dy=w.hy-w.y,d=Math.hypot(dx,dy);wormTrail(w,dt);
  if(d<.15||w.t>3){w.x=w.hx;w.y=w.hy;w.st='up';w.t=0;w.d1=0}else{const st=Math.min(d,E.spd*.9*dt);w.x+=dx/d*st;w.y+=dy/d*st;w.look=Math.sign(dx)||w.look}}
 else if(w.st=='up'){if(!w.d1){w.d1=1;fxPuff(w.x,w.y,.1,5,'rgba(214,176,124,A)',.09);snd('sandup',w.x)}
  w.h=Math.min(.72,.72*w.t/.4);w.op=.25;if(w.t>=.15&&w.d1==1){w.d1=2;for(let i=0;i<4;i++)fxAdd({ty:'heart',x:w.x+(rnd()-.5)*.6,y:w.y,z:.9+rnd()*.3,vx:(rnd()-.5)*.3,vz:.5+rnd()*.4,l:1+rnd()*.4,dl:i*.07})}
  if(w.t>=.4){w.st='idle';w.cd=2.4;w.tg=null}}}
const WENV_F={spd:6.5,
 find(w){let best=null,bd=9;for(const e of en){if(e.hp<=0||e.bit||e.k=='drn'||e.k=='ali')continue;if(Math.abs(Math.floor(e.x)-w.c)<=1&&Math.abs(Math.floor(e.y)-w.r)<=1){const d=Math.hypot(e.x-w.x,e.y-w.y);if(d<bd){bd=d;best=e}}}return best},
 alive:e=>!!e&&e.hp>0&&en.includes(e),px:e=>e.x,py:e=>e.y,say(e){say(e,'e','worm')},
 bite(w,e){const m=WBITE(e);hurt(e,m,w.x,'#d9a8ff',m);e.weak=12;e.hide=e.k=='br'?0:1;e.wk=gt},
 spit(w,e){e.hide=0;e.bit=0;e.wk=gt;e.stun=e.k=='br'?.8:1.1;if(e.k!='br'){e.hv=6;e.hz=.02;const a=Math.atan2(e.y-w.hy,e.x-w.hx)+(rnd()-.5)*1.2;e.fl={vx:Math.cos(a)*2.4,vy:Math.sin(a)*2.4,t:.45}}fxPuff(e.x,e.y,.3,4,'rgba(176,214,110,A)',.08)}};
const WBITE=e=>Math.round(Math.min(90,Math.max(16,e.mx*.4)));
const WENV_B={spd:6,
 find(w){let best=null,bd=1.7;for(const o of bt.f){if(!o.s||o.hp<=0||o.bit||o.k=='drn'||o.k=='ali')continue;const d=Math.hypot(o.x-w.x,o.y-w.y);if(d<bd){bd=d;best=o}}return best},
 alive:e=>!!e&&e.hp>0&&!!bt&&bt.f.includes(e),px:e=>e.x,py:e=>e.y,say(e){},
 bite(w,e){const m=WBITE(e);hurt(e,m,w.x,'#d9a8ff',m);e.weak=12;e.hide=e.k=='br'?0:1;e.wk=gt},
 spit(w,e){e.hide=0;e.bit=0;e.wk=gt;e.stun=e.k=='br'?.8:1.1;if(e.k!='br'){e.hv=6;e.hz=.02;const a=Math.atan2(e.y-w.hy,e.x-w.hx)+(rnd()-.5)*1.2;e.fl={vx:Math.cos(a)*2.4,vy:Math.sin(a)*1.4,t:.45}}fxPuff(e.x,e.y,.3,4,'rgba(176,214,110,A)',.08)}};
function updTW(dt){for(const w of TW){const o=w.po;if(o&&(o.dead||o.idle.k!='pet'||o.idle.tw!==w||o.j||o.dk||o.flee>0)){w.po=null;w.pp=null}wormTick(w,dt,WENV_F)}}
/* ---------- Gebäude, Netz, Versorgung ---------- */
function updB(dt){L6.production(dt);
 amb-=dt;if(amb<=0){amb=.4;traffic();traffic();}
 if(hqAcc>0){hqT-=dt;if(hqT<=0){ft(3.5,.95,'+'+hqAcc+' ✦','#ffb347');hqAcc=0}}
 for(const k in bl){const b=bl[k];if(b.flash>0)b.flash=Math.max(0,b.flash-dt*2);if(b.proc>0)b.proc=Math.max(0,b.proc-dt*2.4);if(b.rc>0)b.rc=Math.max(0,b.rc-dt*3);
  if(b.bp<1){if(b.k=='cv'){b.bp=Math.min(1,b.bp+dt*DFc.bld/B.cv.bt);if(b.bp>=1)finishBuild(b)}continue}
  const live=NET.has(+k),on=live&&!b.off;
  if(b.up&&on){b.up.p+=dt/b.up.t*PR;if(b.up.p>=1){b.lv++;b.up=null;b.hp=b.mx=Math.round(b.mx*1.2);b.flash=1;snd('upDone',b.c+.5);burst(b.c+.5,b.r+.5,20,'#ffe28a');ft(b.c+.5,b.r+1.2,BL[b.k]+' Stufe '+(b.lv+1),'#ffe28a');if(b.k=='ene')calcNet()}}
  if(b.q.length&&on){const it=b.q[0];if(it.arr){it.p+=dt/it.t*PR*(1+.12*b.lv);if(!b.tsn||gt-b.tsn>1.2){b.tsn=gt;if(b.k!='hub')snd('weld',b.c+.5)}
    if(it.p>=1){b.q.shift();if(it.k=='wk'){const w=mkWorker(b.c+.5,b.r+.1,wk.length+rnd()*20|0);wk.push(w);ft(b.c+.5,b.r+1.1,'+1 Arbeiter','#9ff');snd('hire',b.c+.5)}else{un.push(nu(b,it.k));ridx();ft(b.c+.5,b.r+1.1,'+'+UN[it.k].n,'#9f9');snd('unit',b.c+.5)}burst(b.c+.5,b.r+.3,10,'#ffd27a');b.flash=.6}}}
  if(b.k=='raf'&&on&&b.stock>0){b.sc-=dt;if(b.sc<=0){const a=Math.min(b.stock,8);const q=ship(b,'sp',a);if(q){b.stock-=a;b.sc=.5/PR}else b.sc=.5}}
  if(b.k=='wel'&&!b.off){const rate=1/(8/(1+.6*b.lv));b.tank=Math.min(4+b.lv*2,b.tank+rate*dt)}
  }
 // Pakete
 pk=pk.filter(q=>{q.p+=1.05*PR*dt;const n=q.pth.length;
  for(let i=Math.max(0,Math.floor(q.p-.5));i<Math.min(n,Math.floor(q.p+1.5));i++){const bb=bl[q.pth[i]];if(!bb||bb.bp<1||!NET.has(q.pth[i])){if(q.cos)return false;ft((q.pth[Math.min(n-1,Math.floor(q.p))]&7)+.5,(q.pth[Math.min(n-1,Math.floor(q.p))]>>3)+.6,q.kind=='sp'?'✦ verloren':q.kind=='am'?'Munition verloren':'Lieferung verloren','#ff6a5a');snd('lost',(q.pth[0]&7)+.5);if(q.kind=='od'&&q.cb){const bb2=q.b;if(bb2){const ix=bb2.q.indexOf(q.cb);if(ix>=0){bb2.q.splice(ix,1);sp+=q.amt;}}}return false}}
  if(q.p>=n-.5){if(q.cos)return false;const e=bl[q.pth[n-1]];
   if(L6.delivery(q,e)){}else if(q.kind=='sp'){payIn(q.amt)}else if(q.kind=='od'){if(q.cb)q.cb.arr=true;snd('tick',(q.pth[n-1]&7)+.5)}return false}return true})}
/* ---------- Einheiten ---------- */
const near=(x0,y0,r)=>{let t=null,dd=r;for(const e of en){const d=Math.hypot(e.x-x0,e.y-y0);if(d<dd){dd=d;t=e}}return t};
function mvU(u,tx,ty,s,dt){const fd=Math.hypot(tx-u.x,ty-u.y);if(fd<.05){u.mv=false;return true}const q=wayTo(u,tx,ty,dt),dx=q[0]-u.x,dy=q[1]-u.y,d=Math.hypot(dx,dy)||1e-6,v=Math.min(d,s*dt,fd);u.x+=dx/d*v;u.y+=dy/d*v;u.mv=true;u.ph+=v*8.5;u.tr+=v;stp(u,v);if(Math.abs(dx)>.01)u.face=dx>0?1:-1;return false}
function updUnits(dt){
 for(const u of un){const S=FS[u.k],b=u.b,h=hm(u);u.cd-=dt;
  if(u.k=='sam'){const live=isLive(b),sy=syn(b),v=1.2*sy;u.ak=(u.ak||0)+((u.st==2?1:0)-(u.ak||0))*Math.min(1,dt*5);
   if(u.st==0){u.mv=false;if(!isOn(b)||b.stock>=40)continue;let t=null,dd=99;const R=reachOf(b.lv),rc=b.c+.5,rr_=b.r+.5;for(let r=Math.max(0,Math.floor(rr_-R));r<=Math.min(G.length-1,Math.ceil(rr_+R));r++)for(const c of G[r])if(c.s==2&&c.t==1&&c.st>0&&!bl[K(c.c,c.r)]&&!c.sm&&Math.hypot(c.c+.5-rc,c.r+.5-rr_)<=R){const d=Math.hypot(c.c+.5-h[0],c.r+.5-h[1]);if(d<dd){dd=d;t=c}}if(t){u.tg=t;t.sm=u;u.st=1}}
   else if(u.st==1){const t=u.tg;if(t.st<=0||bl[K(t.c,t.r)]){t.sm=null;u.st=0}else if(mvU(u,t.c+.5,t.r+.35,v,dt)){u.st=2;u.ti=1.5;snd('weld',u.x)}}
   else if(u.st==2){u.ti-=dt;if(Math.random()<dt*10)burst(u.x+.3,u.y+.15,1,'#ffb347');if(u.ti<=0){const t=u.tg,q=Math.min(t.st,Math.round(12*(1+.4*b.lv)*sy));t.st-=q;u.ld=q;t.sm=null;if(t.st<=0)exhaust(t);u.st=3}}
   else if(mvU(u,h[0],h[1],v,dt)){if(live||true){b.stock+=u.ld;ft(b.c+.5,b.r+.9,'+'+u.ld,'#ffd27a');snd('tick',b.c+.5);u.ld=0;u.st=0}}
   continue}
  const e=u.k=='war'?en.filter(e=>e.k!='drn'&&e.k!='ali').reduce((a,e)=>!a||Math.hypot(e.x-u.x,e.y-u.y)<Math.hypot(a.x-u.x,a.y-u.y)?e:a,null):near(u.x,u.y,99);
  if(e){const dd=Math.hypot(e.x-u.x,e.y-u.y);u.face=e.x>=u.x?1:-1;if(dd>S.r){mvU(u,e.x,e.y,S.s*1.3,dt)}else{u.mv=false;u.act+=dt*8;if(u.cd<=0){u.cd=S.c;const m=S.d*u.dm*((MU[u.k]||{})[e.k]||1);atk(u,e,m)}}}
  else{if(mvU(u,h[0],h[1],S.s,dt)){u.hp=Math.min(u.mx,u.hp+3*dt);if(u.k=='war'){u.pt=(u.pt==null?2+rnd()*5:u.pt)-dt;if(u.pt<=0){u.pt=5+rnd()*8;u.as=gt;u.ad=.55;u.face=rnd()<.5?1:-1}}}}}
 un=un.filter(u=>{if(u.hp>0)return true;deathFX(u,false);ft(u.x,u.y+.5,'☠ '+UN[u.k].n,'#fff');if(u.tg)u.tg.sm=null;return false});ridx()}
function mkE(k){return{k,x:.6+rnd()*5.8,y:tp+2.4,hp:FS[k].h,mx:FS[k].h,cd:0,ph:rnd()*9,act:rnd()*9,tr:0,face:-1,kit:kitOf(k)}}
function updEn(dt){updTW(dt);
 if(phase=='play'){sw-=dt;if(sw<=0){wn++;sw=Math.max(L.rm,L.rg-wn*1.6);const n=Math.min(L.rc,1+Math.floor(wn/(L.p.ne?2:3)));for(let i=0;i<n;i++)en.push(mkE(L.p.ne&&wn>=2&&rnd()<.3?'pz':'pl'));ft(3.5,tp+1.2,'⚠ Plünderer von oben!','#ff8a6a',1);sayT=-9;say(en[en.length-1],'e','atk');toast('⚠ Plünderer greifen an!');snd('horn')}}
 const C=[];for(const k in bl){const b=bl[k];C.push({x:b.c+.5,y:b.r+.4,o:b,b:1})}un.forEach(u=>C.push({x:u.x,y:u.y,o:u}));wk.forEach(w=>C.push({x:w.x,y:w.y,o:w}));
 for(const e of en){const S=FS[e.k];e.cd-=dt;e.act+=dt*8;let slow=1,wkd=1;if(e.weak>0){e.weak-=dt;slow=.5;wkd=.65;e.wk=gt}if(e.fl){e.x+=e.fl.vx*dt;e.y+=e.fl.vy*dt;e.fl.t-=dt;if(e.fl.t<=0)e.fl=null}if(e.stun>0){e.stun-=dt;e.mv=false;continue}let tg=null,dd=99;for(const c of C){if(c.o.hp<=0)continue;const d=Math.hypot(c.x-e.x,c.y-e.y);if(d<dd){dd=d;tg=c}}if(!tg)continue;e.face=tg.x>=e.x?1:-1;
  if(dd>S.r+(tg.b?.45:0)){{const st=S.s*dt*.8*slow,q=(e.k=='drn'||e.k=='ali')?[tg.x,tg.y]:wayTo(e,tg.x,tg.y,dt),ex=q[0]-e.x,ey=q[1]-e.y,ed=Math.hypot(ex,ey)||1e-6;e.x+=ex/ed*st;e.y+=ey/ed*st;e.ph+=st*8.5;e.tr+=st;stp(e,st);e.mv=true}}
  else{e.mv=false;if(e.cd<=0){e.cd=S.c;const m=S.d*wkd*((MU[e.k]||{})[tg.o.k]||1);atk(e,tg.o,m)}}}
 for(const k in bl){const b=bl[k];if(b.bp<1)continue;b.cd=(b.cd||0)-dt;if(b.k=='tur'||b.k=='hub'){const S=FS[b.k],e=near(b.c+.5,b.r+.5,S.r);
   if(e){b.aim=Math.atan2(-(SY(e.y)-SY(b.r+.6)),SX(e.x)-SX(b.c+.5));if(b.cd<=0&&(b.k=='hub'||isOn(b))){b.cd=S.c/(b.k=='tur'?Math.max(.25,PR):1);const m=S.d*(b.k=='tur'?syn(b)*(1+.4*b.lv):1);b.rc=s_(.06);atk({k:b.k,x:b.c+.5,y:b.r+.1},e,m)}}}}
 for(const k in bl)if(bl[k].hp<=0)kill(bl[k]);
 en=en.filter(e=>{if(e.hp>0)return true;deathFX(e,true);gain(e.x,e.y,5,'');return false});ln.forEach(l=>l.l-=dt);ln=ln.filter(l=>l.l>0)}
const s_=v=>v*T;
/* ---------- Schlacht ---------- */
function fight(){if(phase!='prep'&&phase!='rw')return;startB(phase=='rw'?L.rd.w:L.wv,phase=='rw')}
const mkF=(s,k,px,py,hp,dm,o)=>Object.assign({s,k,x:px,y:py,hp,mx:hp,dm,cd:rnd()*.5},o);
function startB(ws,mid){L6.battleStart();phase='battle';en=[];ln=[];pk=[];FXS=[];sel=null;beltMode=false;UI.sheet('');UI.banner(0);const f=[];
 un.filter(u=>u.k!='sam').forEach(u=>{const m=syn(u.b)*(1+.3*u.b.lv);f.push(mkF(0,u.k,.8+rnd()*5.4,1.3+rnd()*1.4,FS[u.k].h*m,m,{u,kit:u.kit}))});
 let n=0;for(const k in bl){const b=bl[k];if(b.k=='tur'&&b.bp>=1){const m=syn(b)*(1+.4*b.lv)*(isOn(b)?1:.2);f.push(mkF(0,'tur',.9+(n++*1.9)%5.4,.7,FS.tur.h,m,{bd:b}))}}
 TW.forEach((w,i)=>f.push(mkF(0,'wrm',1+(i*2.3)%5.2,1.5+(i%2)*.8,FS.wrm.h,1,{tw:w,face:1})));f.push(mkF(0,'hub',3.5,.5,bl[3].hp,1));bt={f,ws,wi:0,wt:0,t:0,cd:0,mid,p:[],pr:[],dn:[],rg:[],ov:0};snd('horn')}
function strike(px,py){const b=bt;if(!b||b.cd>0||b.ov)return;if(sp<20){b.dn.push({x:px/T,y:2,t:'Zu wenig ✦',c:'#ff6a5a',l:1});snd('err');return}
 sp-=20;b.cd=4;const wx=px/T,wy=(VH*.9-py)/(VH*.0625);shk=Math.max(shk,.3);snd('charge');fxAdd({ty:'ret',x:wx,y:wy,l:.4,r:1.5});
 later(.38,()=>{if(!bt)return;shk=Math.max(shk,.9);snd('strike',wx);fxAdd({ty:'beam',x:wx,y:wy,l:.34});fxAdd({ty:'boom',x:wx,y:wy,z:.3,r:1.7,l:.7});fxAdd({ty:'ring',x:wx,y:wy,r:2.4,l:.6,c:'190,232,255'});fxAdd({ty:'ring',x:wx,y:wy,r:1.5,l:.45,dl:.08,c:'255,255,255'});fxSpark(wx,wy,.3,16,'#d8f2ff');fxPuff(wx,wy,.2,8,'rgba(200,190,180,A)',.18);
  b.f.forEach(q=>{if(q.s&&Math.hypot(q.x-wx,q.y-wy)<1.5)hurt(q,90,wx,'#bfe8ff')})})}
function ub(dt){const b=bt;b.t+=dt;b.cd-=dt;b.wt-=dt;
 if(b.wi<b.ws.length&&(b.wt<=0||!b.f.some(q=>q.s))){b.ws[b.wi].forEach(([k,n])=>{for(let i=0;i<n;i++)b.f.push(mkF(1,k,.7+rnd()*5.6,11+rnd()*1.5+i*.12,FS[k].h,1,{kit:kitOf(k),face:-1}))});b.wi++;b.wt=10;b.dn.push({x:3.5,y:9,t:'Welle '+b.wi+'!',c:'#ff9a8a',l:1.6});snd('horn')}
 for(const q of b.f){const S=FS[q.k];
  if(q.k=='wrm'&&!q.s){if(q.hp>0){wormTick(q,dt,WENV_B);q.ug=q.h<.3&&q.st!='idle'&&q.st!='up'&&q.st!='dive'}continue}
  q.cd-=dt;if(q.fl){q.x+=q.fl.vx*dt;q.y+=q.fl.vy*dt;q.fl.t-=dt;if(q.fl.t<=0)q.fl=null}if(q.stun>0){q.stun-=dt;q.mv=false;continue}if(q.weak>0)q.weak-=dt;
  let tg=null,dd=99;for(const o of b.f)if(o.s!=q.s&&o.hp>0&&!o.ug&&L6.spawnTarget(q,o)){const d=Math.hypot(o.x-q.x,o.y-q.y);if(d<dd){dd=d;tg=o}}
  if(!tg||q.hp<=0)continue;q.face=tg.x>=q.x?1:-1;
  if(dd>S.r){q.mv=false;if(S.s&&(q.s||dd<4.5)){const sv_=S.s*(q.weak>0?.5:1);q.x+=(tg.x-q.x)/dd*sv_*dt;q.y+=(tg.y-q.y)/dd*sv_*dt;q.mv=true;q.ph=(q.ph||0)+sv_*dt*8.5;q.tr=(q.tr||0)+sv_*dt;stp(q,sv_*dt)}}
  else{q.mv=false;if(q.cd<=0){q.cd=S.c;const m=((MU[q.k]||{})[tg.k]||1)*q.dm*S.d*(q.weak>0?.65:1);atk(q,tg,m)}}}
 for(const q of b.f)if(q.hp<=0){q.dd=1;q.hide=0;deathFX(q,!!q.s);if(q.s){sp+=4;b.dn.push({x:q.x,y:q.y+1,t:'+4 ✦',c:'#ffb347',l:1})}}
 b.f=b.f.filter(q=>!q.dd);b.p.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=4*dt;p.l-=dt});b.p=b.p.filter(p=>p.l>0);
 for(const a of[b.pr,b.rg,b.dn])a.forEach(p=>{p.l-=dt;if(p.t)p.y+=.8*dt});b.pr=b.pr.filter(p=>p.l>0);b.rg=b.rg.filter(p=>p.l>0);b.dn=b.dn.filter(p=>p.l>0);
 if(!b.ov){if(!b.f.some(q=>q.k=='hub')){b.ov=1;end(0)}else if(b.wi>=b.ws.length&&!b.f.some(q=>q.s)){b.ov=1;later(.9,bend)}}}
function bend(){FXS=[];const b=bt,al=new Set(b.f.map(q=>q.u||q.bd));un=un.filter(u=>u.k=='sam'||al.has(u));ridx();un.forEach(u=>{const h=hm(u);u.x=h[0];u.y=h[1];u.hp=u.mx;u.st=0;u.ld=0});
 for(const k in bl){const o=bl[k];if(o.k=='tur'&&!al.has(o)){delete bl[k];bver++}else{o.hp=o.mx;o.pend=0}}
 if(b.mid){phase='play';bt=null;sp+=40;ft(3.5,1.8,'Raid abgewehrt! +40 ✦','#7dff8a',1);toast('Raid abgewehrt! +40 ✦',1);snd('win')}else end(1)}
/* ---------- Bewertung: 0–10 Sterne je Kategorie · Medaillen ab 1 / 11 / 21 Sternen (kumulativ) ---------- */
/* Zielwerte für 10 Sterne je Level und Schwierigkeit [leicht, mittel, schwer]: [Lagerpunkte, ✦ übrig, Einheiten] */
const RTG=[[[11,450,20],[12,900,22],[12,1000,22]],[[20,260,21],[20,250,19],[22,250,20]]];
let RATE=null;
const medalsOf=t=>t>=21?3:t>=11?2:t>=1?1:0;
function rateNow(){let camp=0,n=0,up=0;
 for(const b of Object.values(bl)){if(b.bp<1)continue;if(b.k=='cv'){camp+=.12;continue}camp+=1+(b.lv||0)*.8;if(b.k!='hub')n++;up+=b.lv||0}
 const raw=[+camp.toFixed(1),Math.max(0,Math.floor(sp)),wk.length+un.length+TW.length],tg=(RTG[li]||RTG[RTG.length-1])[L.df==null?1:L.df];
 const s=raw.map((v,i)=>Math.max(0,Math.min(10,Math.round(10*v/tg[i])))),tot=s[0]+s[1]+s[2],key=li+'_'+L.df;
 SV.rt=SV.rt||{};const prev=SV.rt[key],pm=prev?medalsOf(prev.t):0;
 const R={raw,s,tot,n,up,m:medalsOf(tot),pm,prev:prev?prev.t:null,rec:!prev||tot>prev.t};
 if(R.rec){SV.rt[key]={t:tot,s}}persist();return R}
function end(w){if(phase=='end')return;phase='end';if(w){RATE=rateNow();if(li+1>SV.best)SV.best=li+1;persist();try{DTX.complete(li+1)}catch(_){}}snd(w?'win':'lose');later(w?.9:.6,()=>UI.end(w))}
/* ---------- Haupt-Update ---------- */
let deadN=0,LT=[],em=0,lowP=0;
const later=(sec,fn)=>LT.push({t:sec,fn});
function up(dt){gt+=dt;L6.tick(dt);if(LT.length){for(const o of LT)o.t-=dt;const rd=LT.filter(o=>o.t<=0);LT=LT.filter(o=>o.t>0);rd.forEach(o=>o.fn())}RDT=dt;calcNet();RDT=0;if(shk>0)shk=Math.max(0,shk-dt*2.5);if(flash>0)flash=Math.max(0,flash-dt*2);
 if(phase=='play'||phase=='prep'||phase=='rw'){
  countAssign();for(const w of wk)updW(w,dt);wk=wk.filter(w=>{if(!w.dead)return true;ndie++;return false});sepW();
  {const h=hubB();if(h&&h.bp>=1&&!wk.length&&!h.q.some(q=>q.k=='wk')&&sp<WK.c){em+=dt;if(em>20){em=0;h.q.push({k:'wk',p:0,t:WK.t,arr:true,cost:0});toast('Notfall: Das HQ ruft einen Arbeiter zurück',1)}}else em=0}
  updB(dt);updUnits(dt);updEn(dt);regrow(dt);
  if(phase=='prep'||phase=='rw'){pt-=dt;if(pt<=0)fight()}
  calcNet();let d=0;for(const k in bl){const b=bl[k];if(b.bp>=1&&!NET.has(+k))d++}if(d>deadN){toast('⚠ Verbindung getrennt! Gebäude ohne Versorgung');snd('alarm')}deadN=d;
}
 if(phase=='battle')ub(dt);
 fxUpd(dt);
 if(wm){wm.t+=dt;if(wm.t>1.6)wm=null}
 pa=pa.filter(p=>(p.l-=dt)>0);pa.forEach(p=>{if(p.fl)return;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=(p.g??3)*dt});fx=fx.filter(f=>(f.l-=dt)>0);fx.forEach(f=>f.y+=.7*dt)}
/* ================= OBERFLÄCHE ================= */
const SVG={
 sp:'<svg class="i" viewBox="0 0 24 24"><path d="M12 2.5l6 8L12 21.5 6 10.5z" fill="#ffb347" stroke="#7a3a10" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 2.5l6 8H6z" fill="#ffe6a8"/></svg>',
 bolt:'<svg class="i" viewBox="0 0 24 24"><path d="M13.5 2L5 13.5h5.8L9.8 22 19 9.8h-5.8z" fill="#7fe3ff" stroke="#1d5a78" stroke-width="1.2" stroke-linejoin="round"/></svg>',
 wk:'<svg class="i" viewBox="0 0 24 24"><path d="M4.5 15.5a7.5 7.5 0 0115 0v1.5h-15z" fill="#8ec86a" stroke="#2a4a1c" stroke-width="1.2"/><rect x="3" y="16" width="18" height="3.2" rx="1.6" fill="#3e6a2c"/><rect x="9" y="10.5" width="8" height="3" rx="1.5" fill="#0d1420"/><rect x="10.5" y="11.3" width="5" height="1.1" fill="#72dcff"/></svg>',
 atk:'<svg class="i" viewBox="0 0 24 24"><path d="M5 19L17 7M7 5l12 12" stroke="#ffd9a0" stroke-width="2.4" stroke-linecap="round"/><path d="M17 3l4 4-2 2-4-4zM7 3L3 7l2 2 4-4z" fill="#ffb347"/></svg>',
 drop:'<svg class="i" viewBox="0 0 24 24"><path d="M12 2.5C8 9 5.5 12 5.5 15.5a6.5 6.5 0 0013 0C18.5 12 16 9 12 2.5z" fill="#5ab8ff" stroke="#1a3a78" stroke-width="1.2"/><ellipse cx="9.5" cy="14" rx="1.3" ry="2.4" fill="#fff" opacity=".6"/></svg>',
 am:'<svg class="i" viewBox="0 0 24 24"><rect x="8.5" y="11" width="7" height="10" rx="1.4" fill="#d9b25a" stroke="#6a4a1a" stroke-width="1.1"/><path d="M8.5 11c0-4 1.5-6.200 3.500-7.500 2 1.300 3.500 3.500 3.500 7.500z" fill="#e8e0d0" stroke="#6a4a1a" stroke-width="1.1"/></svg>',
 menu:'<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="#ffe9c9" stroke-width="2.4" stroke-linecap="round"/></svg>'};
const UI=(()=>{
 const S=$('S'),M=$('M'),HUD=$('hud'),R1=$('r1');let sig='',selB=null,menuFrom='main',dsig='';const DK=$('dock');
 R1.innerHTML=`<div class="p" id="p_sp">${SVG.sp}<b>0</b></div><div class="p" id="p_wk">${SVG.wk}<b>0</b></div><div class="p" id="p_pw">${SVG.bolt}<b>0</b></div><div class="p" id="p_wt">${SVG.drop}<b>0</b></div><div class="p" id="p_am" style="display:none">${SVG.am}<b>0</b></div><div class="p" id="p_at">${SVG.atk}<b>0</b></div><div class="p bad" id="p_th" style="display:none">${SVG.drop}<b>0</b></div><button class="p" id="menub">${SVG.menu}</button>`;
 const el=id=>$(id).querySelector('b');
 function reset(){buildDock();sheet('');M.className='';$('bn').className='';HUD.style.display='block';$('hint').style.display='block';$('tools').style.display='flex';$('tmode').style.display=L.p.ne?'block':'none';setMode();sig=''}
 function setMode(){const m=$('tmode');m.innerHTML='<img src="'+icon('flag',44)+'" width=34 height=34 alt="Wurmflagge">';m.classList.toggle('on',!!mode);m.title='Wurmflagge setzen'}
 function sheet(h){S.innerHTML=h;S.className=h?'on':'';DK.classList.toggle('cov',!!h);if(!h){selB=null;build_=null}}
 function banner(v){const b=$('bn');if(v===0){b.className='';return}b.className='on'}
 /* ---------- HUD ---------- */
 let hl=0;
 function hud(){
  sheetH=SIDE?0:S.className=='on'?S.offsetHeight:0;dockUpd();el('p_sp').textContent=Math.floor(sp)+(gt-lastSp<9&&cmb>1?' ×'+cmb:'');const pr=$('p_sp').getBoundingClientRect();hudPos=[pr.left+20-OX,pr.top+pr.height/2];
  el('p_wk').textContent=wk.length+'/'+WK.max;
  {const un_=unsupplied().length;el('p_pw').textContent=RES.dP+'/'+RES.sP;$('p_pw').className='p'+(RES.dP>RES.sP||un_?' alert':'');el('p_wt').textContent=RES.dW+'/'+RES.sW;$('p_wt').className='p'+(RES.dW>RES.sW||un_?' alert':'');const ua=L.u.includes('tur')||L.u.includes('fab');$('p_am').style.display=ua?'flex':'none';if(ua){el('p_am').textContent=RES.dA+'/'+RES.sA;$('p_am').className='p'+(RES.dA>RES.sA?' alert':'')}}
  const P=power(),at=$('p_at');el('p_at').textContent=P.toFixed(0)+'/'+L.E;at.className='p'+(P>=L.E?' good':'');
  {const nt=wk.filter(w=>w.th>=60).length;$('p_th').style.display=nt?'flex':'none';el('p_th').textContent=nt}
  $('barf').style.width=Math.min(100,(hh+Math.min(1,rowN(hh+1)/L.rn)*.99)/L.h*100)+'%';$('bart').textContent='Höhe '+hh+' / '+L.h+'  ·  nächste Reihe '+Math.min(L.rn,rowN(hh+1))+'/'+L.rn;
  if(phase=='prep'||phase=='rw'){const ws=phase=='rw'?L.rd.w:L.wv;$('bnt').textContent=(phase=='rw'?'RAID':'KARAWANE')+' in '+Math.ceil(pt)+' s · '+ws.flat().map(([k,n])=>n+'× '+NM[k]).join(', ');$('bn').className='on'}
  $('hint').textContent=phase=='battle'||phase=='end'||paused?'':hintText();
  $('tools').style.display=phase=='battle'||phase=='end'?'none':'flex';
  if(selB){const b=selB;if(!bl[K(b.c,b.r)]||bl[K(b.c,b.r)]!==b){sheet('');sel=null}else{const s2=sigOf(b);if(s2!==sig)openInfo(b,true);else pgUpd(b)}}}
 function hintText(){
  const has=k=>Object.values(bl).some(b=>b.k==k&&b.bp>=1);
  if(tutW())return S.className=='on'?'👆 Tippe unten auf „Arbeiter“: Dein Quartier holt dir den ersten Arbeiter.':'👆 Tippe das Quartier, dann „Arbeiter“ – ohne Arbeiter wird nichts gegraben.';
  if(mode)return '⚑ Wurmflagge aktiv: tippe jetzt ein ungegrabenes Feld, unter dem du einen Wurm vermutest.';
  if(Object.values(bl).some(b=>b.bp>=1&&!isLive(b)))return '⚠ Gebäude getrennt! Verbinde sie per Fließband mit dem Quartier.';
  if(en.length)return '⚠ Plünderer greifen an! Truppen & Türme verteidigen. Schütze deine Bänder!';
  if(phase=='prep'||phase=='rw')return 'Rüste jetzt auf – du kannst weiter bauen und ausbilden.';
  if(!ds)return 'Tippe ein leuchtendes Feld: deine Arbeiter graben es ab.';
  if(wk.some(w=>w.th>=60)&&!has('wel'))return '💧 Deine Arbeiter haben Durst – baue einen Taufänger neben dein Netz!';
  {const rf=Object.values(bl).find(b=>b.k=='raf'&&b.bp>=1&&unitsOf(b)>0&&(v=>v.a+v.w==0)(veinsNear(b.c+.5,b.r+.5,reachOf(b.lv))));if(rf){const v=veinsNear(rf.c+.5,rf.r+.5,reachOf(rf.lv));return v.u?'Die Raffinerie hat keine Adern mehr – grabe die ✦-Felder in ihrer Reichweite frei.':'Keine Adern mehr in Reichweite! Baue Bänder nach oben und eine neue Raffinerie bei frischen Adern (Ausbau vergrößert den Radius).'}}
  if(!has('raf')&&sp>=30)return 'Tippe ein grün umrandetes Feld neben dem Quartier → Raffinerie bauen.';
  if(has('raf')&&!un.some(u=>u.k=='sam')&&sp>=20)return 'Tippe die Raffinerie → Sammler ausbilden: er holt ✦ von Adern und liefert per Band.';
  if(Object.values(bl).some(b=>b.off=='W'))return '💧 Zu wenig Wasser – baue einen Taufänger neben dein Netz!';
  if(Object.values(bl).some(b=>b.off=='P'))return '⚡ Zu wenig Strom – baue ein Energiefeld neben dein Netz!';
  if(!has('kas')&&sp>=40)return 'Baue eine Kaserne und bilde Krieger aus ⚔';
  if(L.p.ne&&hh<4)return 'Zahlen = Würmer in den 8 Nachbarfeldern. Vermutest du ein Wurmnest? Tippe die Wurmflagge ⚑ und dann das Feld: Ein Arbeiter zähmt den Wurm.';
  return 'Reihe '+(hh+1)+': gib mindestens '+L.rn+' Felder frei. Ziel: Höhe '+L.h+'. Spice schnell hintereinander = Combo.'}
 /* ---------- Sheets ---------- */
 const chip=(t,c)=>`<span class="${c||''}">${t}</span>`;
 const unitsOf=b=>un.filter(u=>u.b===b).length;
 function sigOf(b){const vs=b.k=='raf'&&b.bp>=1?(v=>v.a+'/'+v.w+'/'+v.u)(veinsNear(b.c+.5,b.r+.5,reachOf(b.lv))):'';return[L6.feedback(b),vs,needsOf(b).map(n=>n.k).join(''),b.k,b.lv,Math.floor(b.hp/b.mx*10),isLive(b)?1:0,b.q.length,b.up?1+Math.floor(b.up.p*10):0,Math.floor(b.am||0),Math.floor(b.tank||0),(b.off||0)+(b.wo||'')+(b.lk||''),RES.sP,RES.sW,RES.sA,RES.dP,RES.dW,RES.dA,Math.floor((b.stock||0)/5),unitsOf(b),sp>=40?1:0,sp>=18?1:0,sp>=upgradeCost(b)?1:0,sp>=WK.c?1:0,wk.length,b.bp>=1?1:0].join()}
 /* ---------- Bauleiste (immer sichtbar, 4 Spalten) ---------- */
 function setDock(h){DOCKH=SIDE?0:h;BY=VH-6-DOCKH;document.documentElement.style.setProperty('--dh',(SIDE?0:h)+'px')}
 const RI={P:SVG.bolt,W:SVG.drop,A:SVG.am};
 const rbadge=k=>{const d=B[k],a=[['P',d.p],['W',d.w],['A',d.a]].filter(r=>r[1]).sort((p,q)=>(q[1]>0)-(p[1]>0));return a.length?`<span class="tl rs">${a.map(([c,v])=>`<em class="${v>0?'pos':''}">${RI[c]}${rfmt(v)}</em>`).join('')}</span>`:''};
 function buildDock(){let h='<div id="dinfo"></div><div class="dg">';
  for(const k of L.u){const d=B[k];h+=`<button class="db" data-k="${k}"><img src="${icon(k,34)}" alt=""><i class="pgd" style="left:100%"></i><b>${d.n}</b><span class="chip">${SVG.sp}${d.c}</span>${rbadge(k)}<span class="qn"></span></button>`}
  DK.innerHTML=h+'</div>';DK.style.display='block';DK.className='';dsig='';armed=null;build_=null;setDock(DK.offsetHeight)}
 function dockUpd(){const off=phase=='battle'||phase=='end';DK.classList.toggle('off',off);if(off)return;
  DK.querySelectorAll('.db').forEach(b=>{const k=b.dataset.k,pend=Object.values(bl).filter(o=>o.k==k&&o.bp<1),pg=pend.length?Math.max(...pend.map(o=>o.bp)):-1,pd=b.querySelector('.pgd'),qn=b.querySelector('.qn');
   if(pd){const v=pg<0?100:Math.round(Math.max(.03,pg)*100);if(pd.dataset.v!=v){pd.dataset.v=v;pd.style.left=v+'%'}pd.style.opacity=pg<0?0:1}
   if(qn){const t=pend.length?'+'+pend.length:'';if(qn.textContent!==t)qn.textContent=t}b.classList.toggle('prog',pg>=0)});
  const sg=L.u.map(k=>sp>=B[k].c?1:0).join('')+'|'+(armed||'')+'|'+(build_?build_.c+','+build_.r+(sp>>5):'');if(sg===dsig)return;dsig=sg;
  DK.querySelectorAll('.db').forEach(b=>{const k=b.dataset.k,ok=sp>=B[k].c&&(!build_||canPlace(build_.c,build_.r,k));b.classList.toggle('no',!ok);b.classList.toggle('arm',armed==k)});
  let t='Tippe ein grün umrandetes Feld und dann ein Gebäude – oder erst ein Gebäude, dann das Feld.';
  if(armed){const d=B[armed];t='<b>'+d.n+'</b> – '+d.s+' → jetzt ein grünes Feld antippen.'}
  else if(build_){const{c,r}=build_;t='Feld gewählt – wähle ein Gebäude (graue gehen hier noch nicht).';if(L.u.includes('raf')&&canPlace(c,r,'raf')){const v=veinsNear(c+.5,r+.5,reachOf(0));t='Feld gewählt. Raffinerie hier: Reichweite '+reachOf(0).toFixed(1).replace('.',',')+' Felder · '+(v.a+v.w)+' Adern'+(v.u?' (+'+v.u+' ungegraben)':'')}}
  $('dinfo').innerHTML=t}
 DK.addEventListener('click',e=>{const b=e.target.closest('.db');if(!b||phase=='battle'||phase=='end')return;const k=b.dataset.k,d=B[k];
  tapFb(b);
  if(build_){const{c,r}=build_;if(build(k,c,r)){build_=null;sel=null;armed=null;sheet('')}dsig='';return}
  snd('tap');armed=armed==k?null:k;dsig='';if(armed)toast('Tippe jetzt ein grün umrandetes Feld für: '+d.n,1)});
 function pick(c,r){if(armed){if(build(armed,c,r)){armed=null;build_=null;sel=null;sheet('')}dsig='';return}
  sheet('');build_={c,r};sel={c,r};snd('open');dsig=''}
 function disarm(){armed=null;dsig=''}
/* ---------- Gebäude-Menü (genauso hoch wie die Bauleiste) ---------- */
 const IFLM='<svg viewBox="0 0 24 24" width="27" height="27"><path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z" fill="#ffb347" stroke="#8a3a1a" stroke-width="1.1"/><rect x="9" y="17" width="6" height="4" rx="1" fill="#6a4a30"/></svg>';
 const IUP='<svg viewBox="0 0 24 24" width="27" height="27"><path d="M12 3 4 12h5v8h6v-8h5z" fill="#ffd28a" stroke="#8a3a1a" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  IBIN='<svg viewBox="0 0 24 24" width="27" height="27"><path d="M5 7h14l-1.2 13H6.2zM9 4h6l1 2H8z" fill="#ff9a8a" stroke="#6a1a20" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 10v7M14 10v7" stroke="#6a1a20" stroke-width="1.4" stroke-linecap="round"/></svg>',
  IAMM='<svg viewBox="0 0 24 24" width="27" height="27"><rect x="8" y="10" width="8" height="11" rx="1.5" fill="#d9b25a" stroke="#6a4a1a" stroke-width="1.2"/><path d="M8 10c0-4 2-6 4-7 2 1 4 3 4 7z" fill="#e8e0d0" stroke="#6a4a1a" stroke-width="1.2"/></svg>',
  IDRP='<svg viewBox="0 0 24 24" width="27" height="27"><path d="M12 3C9 8 6 11 6 15a6 6 0 0012 0c0-4-3-7-6-12z" fill="#6ac8ff" stroke="#1a4a7a" stroke-width="1.2"/></svg>';
 const qpg=(b,k)=>{const it=b.q.filter(i=>i.k==k);return it.length?{k:'q'+k,p:it[0].arr?it[0].p:0,n:it.length}:null};
 const tapFb=el=>{if(!el)return;el.classList.remove('tap');void el.offsetWidth;el.classList.add('tap');setTimeout(()=>el.classList.remove('tap'),260)};
 function pgUpd(b){if(!b)return;S.querySelectorAll('.pgd[data-pg]').forEach(e=>{const k=e.dataset.pg;let p=0;if(k=='up')p=b.up?b.up.p:1;else{const it=b.q.filter(i=>i.k==k.slice(1))[0];p=it?(it.arr?it.p:0):1}const v=Math.round(Math.max(.03,p)*100);if(e.dataset.v!=v){e.dataset.v=v;e.style.left=v+'%'}})}
 const upInfo=b=>{const d=B[b.k],lv=b.up||b.lv<2?b.lv+1:b.lv,n={...b,lv};return b.k=='raf'?'◎ '+reachOf(lv).toFixed(1).replace('.',','):b.k=='kas'||b.k=='fab'?'Platz '+(d.cap+lv):b.k=='tur'?'×'+(1+.4*lv).toFixed(1):b.k=='ene'?'⚡ +'+resP(n):b.k=='wel'?'💧 +'+resW(n):b.k=='fak'?'◎ '+torchR(lv).toFixed(1).replace('.',','):['bore','smelt','crdep'].includes(b.k)?'Tempo +'+(15*lv)+' % · Lager '+(4+2*lv):'Stufe '+(lv+1)};
 function openInfo(b,keep){build_=null;armed=null;dsig='';selB=b;sel={c:b.c,r:b.r};const d=B[b.k],live=isLive(b),done=b.bp>=1,lv=b.lv,s=syn(b),nd=done?needsOf(b):[],need=k=>nd.find(n=>n.k==k);
  const chipN=(t,c,n)=>`<span class="${c||''}"${n?` data-n="${n.t.replace(/"/g,'&quot;')}"`:''}>${t}</span>`,hc=b.hp/b.mx>.6?"#5ed67e":b.hp/b.mx>.3?"#f0b030":"#e8503c";
  let h=`<div class="sh2"><img src="${icon(b.k,40)}" alt=""><div class="sm"><h3>${BL[b.k]}${lv?' · Stufe '+(lv+1):''}</h3><div class="hb"><i style="width:${100*b.hp/b.mx}%;background:${hc}"></i></div></div><button class="cl" data-a="close">✕</button></div><div class="kv1">`;
  if(!done)h+=chipN('🔨 Im Bau '+Math.round(b.bp*100)+' %')+(b.bw<1&&b.k!='cv'?chipN('wartet auf Arbeiter','bad'):'');
  else{h+=b.k=='hub'?chipN('● Zentrale','good'):(live?(b.wo?'':chipN('● Verbunden','good')):chipN('⚠ Getrennt','bad',need('link')));
   {const pv=resP(b),wv=resW(b);if(pv)h+=chipN(SVG.bolt+' '+rfmt(pv),pv>0?'good':lacks(b,'P')?'bad':'',need('bolt'));if(wv)h+=chipN(SVG.drop+' '+rfmt(wv),wv>0?'good':lacks(b,'W')?'bad':'',need('water'));
    const av=resA(b);if(av)h+=chipN(SVG.am+' '+rfmt(av),av>0?'good':lacks(b,'A')?'bad':'',need('ammo'));
    if(b.wo){const wn=need(b.wo=='P'?'bolt':b.wo=='W'?'water':'ammo');h+=chipN(b.off?'⏻ Offline':'⚠ Engpass','bad',wn)}}}
  h+='</div>';
  const img=k=>`<img src="${icon(k,34)}" width="27" height="27" alt="">`,
   pgh=pg=>pg?`<i class="pgd" data-pg="${pg.k}" style="left:${Math.round(Math.max(.03,pg.p)*100)}%"></i>${pg.n?`<span class="qn">+${pg.n}</span>`:''}`:'',
   cell=(cls,a,ico,name,sub,tr,pg)=>`<button class="db ${cls||''}${pg?' prog':''}" data-a="${a}">${pgh(pg)}${tr?`<span class="tr">${tr}</span>`:''}${ico}<b>${name}</b><span class="chip">${sub}</span></button>`,
   dcell=(ico,name,sub,tr,bad,pg)=>`<div class="db fin${bad?' bad':''}${pg?' prog':''}">${pgh(pg)}${tr?`<span class="tr">${tr}</span>`:''}${ico}<b>${name}</b><span class="chip">${sub}</span></div>`;
  let c1='',c2='',c4='';
  if(done&&b.k!='cv'){if(b.up)c1=dcell(IUP,'Entwicklung',Math.round(b.up.p*100)+' %',upInfo(b),false,{k:'up',p:b.up.p,n:0});
   else if(lv<2){const uc=upgradeCost(b);c1=cell(sp<uc?'no':'','upg',IUP,'Ausbau',SVG.sp+uc,upInfo(b))}else c1=dcell(IUP,'Ausbau','Max.',upInfo(b))}
  if(done&&b.k=='hub'){const full=wk.length+b.q.length>=WK.max;c2=cell((sp<WK.c||full?'no':'')+(tutW()?' blink':''),'hire',img('wk'),'Arbeiter',SVG.sp+WK.c,wk.length+'/'+WK.max,qpg(b,'wk'))}
  else if(done&&d.u){const U=UN[d.u],cap=d.cap+lv,have=unitsOf(b)+b.q.length,cost=Math.ceil(U.c/s);c2=cell(have>=cap||sp<cost?'no':'','train',img(d.u),U.n,SVG.sp+cost,have+'/'+cap,qpg(b,d.u))}
  else if(done&&b.k=='tur')c2=dcell(IAMM,'Munition',lacks(b,'A')?'fehlt':'versorgt','',lacks(b,'A'));
  else if(done&&['bore','smelt','crdep'].includes(b.k))c2=dcell(img(b.k),'Produktion',L6.feedback(b),'',!!b.off);
  else if(done&&b.k=='fak')c2=dcell(IFLM,'Licht','◎ '+torchR(lv).toFixed(1).replace('.',','),'',!!b.off);
  else if(done&&b.k=='wel')c2=dcell(IDRP,'Trinkstelle','Tank '+Math.floor(b.tank||0)+'/'+(4+2*lv),'',!!b.off);
  if(b.k!='hub')c4=cell('dng','demo',IBIN,done?'Abreißen':'Abbrechen',done?'+'+Math.floor((d.c||0)*.5)+' ✦':'&nbsp;');
  h+=`<div class="agrid">${c1||'<i></i>'}${c2||'<i></i>'}<i></i>${c4||'<i></i>'}</div>`;
  sheet(h);selB=b;sel={c:b.c,r:b.r};sig=sigOf(b)}
 S.addEventListener('click',e=>{const nn=e.target.closest('[data-n]');if(nn){snd('tap');toast(nn.dataset.n);return}const t=e.target.closest('[data-a]');if(!t)return;const a=t.dataset.a;
  if(a=='close'){snd('tap');sheet('');sel=null;build_=null;return}
  const b=selB;if(!b)return;
  if(a=='hire')hire();else if(a=='train')orderUnit(b);else if(a=='upg')upgrade(b);else if(a=='demo'){demolish(b);return}
  openInfo(b,true);tapFb(S.querySelector('[data-a="'+a+'"]'))});
 /* ---------- Menüs ---------- */
 const btn=(a,t,c,d)=>`<button class="${c||''}" data-a="${a}" ${d||''}>${t}</button>`;
 let curP=null;
 const dfBar=()=>`<div class="seg" id="dfs">${DFN.map((n,i)=>`<button data-a="df" data-i="${i}" class="${SV.df==i?'on':''}">${DFI[i]} ${n}</button>`).join('')}</div><small class="hint2" id="dfd">${DFD[SV.df]}</small>`;
 let endTok=0,endSkip=null;
 /* Menü-Atmosphäre: Sonnenglut, Nebelschwaden, treibende Dünen, aufsteigende Glutfunken */
 const MFR='<div class="mfx fr"><i class="mist m4"></i><i class="mist m5"></i></div>';
 const MFX=(()=>{const dune=(y,seg)=>`M0 ${y} ${seg+seg} V200 H0Z`,
  d1=dune(120,'q70 -38 200 -8 t200 8 q110 -26 200 -6 t200 6 '),d2=dune(150,'q120 -44 200 -10 t200 10 q60 -22 200 -4 t200 4 ');
  let em='';for(let i=0;i<18;i++){const l=Math.round(Math.random()*100),d=(8+Math.random()*9).toFixed(1),dl=(-Math.random()*14).toFixed(1),dx=Math.round((Math.random()-.5)*70),s=(2+Math.random()*2.6).toFixed(1);em+=`<s style="left:${l}%;--d:${d}s;--dl:${dl}s;--dx:${dx}px;--s:${s}px"></s>`}
  return `<div class="mfx" aria-hidden="true"><i class="sun"></i><i class="mist m1"></i><i class="mist m2"></i><i class="mist m3"></i>
   <svg class="dn d1" viewBox="0 0 1600 200" preserveAspectRatio="none"><defs><linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3044"/><stop offset="1" stop-color="#2a1230"/></linearGradient><linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c1a38"/><stop offset="1" stop-color="#12071a"/></linearGradient></defs><path d="${d1}" fill="url(#dg1)"/></svg>
   <svg class="dn d2" viewBox="0 0 1600 200" preserveAspectRatio="none"><path d="${d2}" fill="url(#dg2)"/></svg>
   <div class="emb">${em}</div></div>`})();
 let lastPk='';
 function panel(h,cls){endTok++;endSkip=null;const pk=h.slice(0,48),still=M.className=='on'&&lastPk===pk;lastPk=pk;M.innerHTML=MFX+'<div class="pn'+(cls?' '+cls:'')+(still?' still':'')+'">'+h+'</div>'+MFR;M.className='on';paused=true;sheet('');M.scrollTop=0}
 function hide(){M.className='';lastPk='';paused=false;if(tutW())toast('👆 Tippe unten auf „Arbeiter“ – dein Quartier holt den ersten Arbeiter.',1)}
 const nextLv=()=>Math.min(SV.best,LV.length-1),prog=()=>gt>3&&phase!='end'&&phase!=null;
 const medalsOf_=i=>{const r=SV.rt&&SV.rt[i+'_'+SV.df];return r?medalsOf(r.t):0};
 const mbHTML=i=>{const m=medalsOf_(i);return `<span class="mbs" title="Medaillen (${DFN[SV.df]})">${['bz','sv','gd'].map((c,k)=>`<i class="mb ${k<m?c:'no'}">${k<m?'★':''}</i>`).join('')}</span>`};
 function help(){panel(`<h2>So funktioniert’s</h2><p style="text-align:left"><b>⛏ Graben:</b> Tippe leuchtende Felder – Arbeiter graben sie ab. Ziehe zum Scrollen.<br><br><b>🔗 Netz:</b> Bauen darfst du nur neben dem Quartier. Figuren laufen um Gebäude herum, nur Fließbänder sind begehbar – plane deine Anordnung. Gebäude nebeneinander sind verbunden, Lücken schließen Fließbänder – pro Antippen baust du genau ein Element. Ohne Verbindung steht alles still.<br><br><b>✦ Spice:</b> Sammler holen ✦ von Adern, es fährt über die Bänder ins Quartier. Erst bei Ankunft gibt es Geld. Jede Raffinerie erreicht nur Adern in ihrem Umkreis (Kreis beim Antippen sichtbar, Ausbau vergrößert ihn). Leere Adern wachsen nach, aber jedes Mal mit halber Menge – baue Bänder nach oben und neue Raffinerien bei frischen Adern.<br><br><b>⚡💧 Strom & Wasser:</b> Wie ein Konto mit Plus und Minus. Quartier ⚡ +4 · Energiefeld ⚡ +6 · Taufänger 💧 +4. Raffinerie, Kaserne, Turm und Fabrik verbrauchen ⚡ und 💧 (steht an jedem Baubutton), Fließbänder nichts. Oben siehst du stets Verbrauch/Vorrat. Reicht ein Vorrat nicht, warnt ein kleines Symbol oben links am zuletzt gebauten Gebäude: Der Ring leert sich, nach ein paar Sekunden geht es aus und wird dunkel (Symbol durchgestrichen). Kommt rechtzeitig Nachschub, füllt sich der Ring wieder. Wer versorgt wird, läuft mit 100 %. Zerstörte Bänder trennen deine Basis (Kette = getrennt).<br><br><b>▮ Munition:</b> Die dritte Ressource: Eine Fabrik liefert Munition +4, jeder Geschützturm verbraucht −2. Fehlt Munition, schweigt der zuletzt gebaute Turm (Patronen-Symbol).<br><br><b>🏜 Durst:</b> Arbeiter werden durstig und trinken am Taufänger. Durstige Arbeiter laufen und bauen langsamer.<br><br><b>🐛 Würmer zähmen:</b> Tippe die Wurmflagge ⚑ (unten rechts), dann den Fels, unter dem du ein Nest vermutest. Ein Arbeiter geht hin und dressiert den Wurm. Danach lauert er: Kommt ein Feind auf ein Nachbarfeld, gräbt er sich hin, beißt zu und schwächt ihn. Für das nächste Nest tippst du die Flagge erneut.<br><br><b>⚔ Ziel:</b> Erreiche die Zielhöhe, bevor dich Plünderer überrennen – dann folgt die große Schlacht.</p><div class="col">${btn('pause','Zurück')}</div>`)}
 function settings(){const src=AU.source;panel(`<h2>Einstellungen</h2>
  <div class="set"><label>Musik</label><input type="range" id="smv" min="0" max="100" value="${Math.round(SV.mv*100)}"><button class="tg ${SV.mus?'on':''}" data-a="tmus" aria-label="Musik an/aus"></button></div>
  <div class="set"><label>Effekte</label><input type="range" id="ssv" min="0" max="100" value="${Math.round(SV.sv*100)}"></div>
  <div class="set"><label>Hohe Auflösung</label><span style="flex:1"></span><button class="tg ${SV.hi?'on':''}" data-a="thi" aria-label="Auflösung"></button></div>
  <div class="set"><label style="width:auto;flex:1">Klassik Wurmzahlen darstellen</label><button class="tg ${SV.cl?'on':''}" data-a="tcl" aria-label="Klassik Wurmzahlen darstellen"></button></div>
  <small class="hint2">${SV.cl?'An: Zahlen stehen schon auf den leuchtenden, noch ungegrabenen Feldern (wie früher).':'Aus: Zahlen erscheinen erst, wenn ein Feld gegraben ist – mit einem lauernden Wurm-Gesicht.'}</small>
  <small class="hint2">Musikquelle: ${src=='file'?'deine Datei (sand.mp3)':src=='gen'?'Wüsten-Ambient (erzeugt)':'wird beim Start geladen'}</small>
  <div class="col">${btn('mfile','♪ Musik-Datei wählen (sand.mp3)')}${src=='file'?btn('mclr','Standardmusik'):''}${btn('reset','Fortschritt zurücksetzen','dng')}${btn('pause','Zurück','pri')}</div>`);
  const mv=$('smv'),sv=$('ssv');mv.oninput=()=>{SV.mv=mv.value/100;AU.setVol();persist()};sv.oninput=()=>{SV.sv=sv.value/100;AU.setVol();persist()};sv.onchange=()=>snd('ting',3.5)}
 function pause(){menuFrom='pause';curP=pause;panel(`<h2>Pause</h2><small class="hint2">Schwierigkeit: ${DFI[L.df]} ${DFN[L.df]} – gilt ab Neustart des Levels</small>${dfBar()}<div class="col">${btn('resume',`▶ Weiterspielen<small style="display:block;font-size:11.5px;font-weight:500;opacity:.8;letter-spacing:.02em;margin-top:2px">Level ${li+1} · ${L.n} · ${DFI[L.df]} ${DFN[L.df]}</small>`,'pri')}${btn('restart','↺ Level neu starten')}${btn('settings','Einstellungen')}${btn('help','So funktioniert’s')}${btn('map','Zur Karte')}</div>`)}
 const UNL={bore:{m:'Fördert kontinuierlich Sand auf Treibsand.',n:'Wasser −3'},smelt:{m:'Verarbeitet 1 gelieferten Sand zu 1 Energiekristall.',n:'Strom −3'},crdep:{m:'Kristalle zum Quartier: 20 Geld pro Ankunft.',n:'Bänder erforderlich'},cv:{m:'Verbindet Gebäude und transportiert ✦ und Nachschub.',n:'nichts – Bänder verbrauchen keinen Strom'},
  raf:{m:'Schickt Sammler zu Adern im Umkreis – ihre ✦ bringen Geld.',n:resTxt('raf')},
  kas:{m:'Bildet Krieger aus, die Plünderer abwehren.',n:resTxt('kas')+' · ✦ je Krieger'},
  wel:{m:'Wasserquelle fürs Netz und Trinkstelle für Arbeiter.',n:resTxt('wel')},
   fak:{m:'Erhellt bei Nacht die Gebäude ringsum – das Licht flackert und läuft am Rand sanft aus. Ausbau vergrößert den Radius.',n:resTxt('fak')},
  tur:{m:'Schießt auf Plünderer, Panzer und Brecher in Reichweite – dein Schutz im Kampf.',n:resTxt('tur')},
  ene:{m:'Liefert Strom für dein ganzes Netz – ohne genug Strom geraten die zuletzt gebauten Gebäude in einen Engpass und gehen aus.',n:resTxt('ene')},
  fab:{m:'Baut Crawler: robuste Fahrzeuge, die Panzer knacken – und liefert Munition für Geschütztürme.',n:resTxt('fab')+' · ✦ je Crawler'}};
 const sparkle=el=>{for(let i=0;i<9;i++){const e=document.createElement('span');e.className='spk';e.textContent=['✨','✦','★'][i%3];const a=i/9*6.28,r=34+Math.random()*26;e.style.cssText=`left:calc(50% - 7px);top:22px;--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px`;el.appendChild(e);setTimeout(()=>e.remove(),950)}};
 function endWin(){const R=RATE||rateNow(),last=li+1>=LV.length,unl=last?[]:LV[li+1].u.filter(k=>!LV[li].u.includes(k));
  const rows=[['🏕','Lagergröße','Gebäude · Ausbau · Bänder'],['✦','Geld','übrig'],['👥','Einheiten','Arbeiter · Truppen · Würmer']],
   fv=[v=>v+' Gebäude',v=>v+' ✦',v=>v+' Einheiten'],shown=[R.n,R.raw[1],R.raw[2]],
   medN=['Bronze','Silber','Gold'],medC=['bz','sv','gd'],medR=['ab 1 ★','ab 11 ★','ab 21 ★'];
  panel(`<h2>Sieg!</h2><p class="sm1">Level ${li+1} geschafft · ${DFI[L.df]} ${DFN[L.df]}</p><div class="skh" id="skh">tippen zum Überspringen</div>
  ${rows.map((r,i)=>`<div class="rr" id="rr${i}"><div class="rl">${r[0]} ${r[1]} <small>${r[2]}</small></div><div class="rv" id="rv${i}">${fv[i](0)}</div><div class="sts">${'<i>★</i>'.repeat(10)}</div></div>`).join('')}
  <div class="rtot" id="rtot">Gesamt <b id="rtn">0</b> / 30 ★</div><div class="rrec" id="rrec">&nbsp;</div>
  <div class="meds">${[0,1,2].map(m=>`<div class="md ${medC[m]} ${m<R.m?'got':'no'}" id="md${m}"><div class="dsk">${m<R.m?'★':'?'}</div>${m>=R.pm&&m<R.m?'<span class="nw">NEU</span>':''}<small>${m<R.m?medN[m]:medR[m]}</small></div>`).join('')}</div>
  ${unl.length?`<div class="uh" id="uh">Neu freigeschaltet</div><div class="ucs">${unl.map((k,i)=>`<div class="uc" id="uc${i}"><span class="nw">NEU</span><img src="${icon(k,56)}" alt=""><div><b>${BL[k]}</b><div class="mk">${UNL[k]?UNL[k].m:B[k].s}</div><div class="und">Braucht: ${UNL[k]?UNL[k].n:'Anschluss ans Netz'}</div></div></div>`).join('')}</div>`:''}
  <div class="col fin" id="rfin">${btn('map','Weiter ▸ zur Karte','pri')}${btn('go','↺ Nochmal für mehr Sterne','','data-i="'+li+'"')}</div>`,'rp');
  const tok=endTok,$q=i=>M.querySelector('#'+i),steps=[],S_=(d,fn)=>steps.push([d,fn]),sfx=(f,n,a,p)=>{if(!f)snd(n,a,p)},sc=el=>{try{el.scrollIntoView({behavior:'smooth',block:'nearest'})}catch(e){}};
  S_(450,f=>{});
  for(let i=0;i<3;i++){const row=$q('rr'+i),val=$q('rv'+i),st=[...row.querySelectorAll('.sts i')],n=R.s[i];
   S_(i?260:120,f=>{row.classList.add('on');sfx(f,'whoosh');sc(row)});
   for(let j=0;j<n;j++)S_(78,f=>{st[j].classList.add('on');val.textContent=fv[i](Math.round(shown[i]*(j+1)/n));sfx(f,'star',0,j)});
   S_(n?60:140,f=>{val.textContent=fv[i](shown[i]);if(!n)sfx(f,'tap')})}
  const tot=$q('rtot'),tn=$q('rtn');
  S_(380,f=>{tot.classList.add('on');sfx(f,'whoosh');sc(tot)});
  for(let k=1;k<=R.tot;k++)S_(R.tot>16?36:48,f=>{tn.textContent=k;tot.classList.remove('pop');void tot.offsetWidth;tot.classList.add('pop');sfx(f,'tally',0,k%14)});
  S_(220,f=>{const e=$q('rrec');e.textContent=R.prev==null?'Erste Wertung für dieses Level!':R.rec?'Neuer Rekord! (bisher '+R.prev+' ★)':'Dein Rekord: '+R.prev+' ★';if(R.rec&&R.prev!=null)e.style.color='#9cffb0';else e.style.color='#ffe28a';e.classList.add('on')});
  for(let m=0;m<3;m++)S_(m?460:420,f=>{const el=$q('md'+m);el.classList.add('on');if(m<R.m){sfx(f,'medal',0,m);if(!f)sparkle(el)}else sfx(f,'tap');sc(el)});
  if(unl.length){S_(650,f=>{$q('uh').classList.add('on');sfx(f,'whoosh');sc($q('uh'))});unl.forEach((k,i)=>S_(i?560:300,f=>{const c=$q('uc'+i);c.classList.add('on');sfx(f,'card');sc(c)}))}
  S_(520,f=>{$q('rfin').classList.add('on');const h=$q('skh');if(h)h.style.display='none';sc($q('rfin'))});
  let k=0,timer=0;const run=()=>{if(tok!==endTok)return;if(k>=steps.length){endSkip=null;return}const[d,fn]=steps[k++];timer=setTimeout(()=>{if(tok!==endTok)return;fn(false);run()},d)};
  endSkip=()=>{if(tok!==endTok)return;clearTimeout(timer);while(k<steps.length)steps[k++][1](true);endSkip=null;snd('tap')};
  run()}
 function endP(w){if(w){endWin();return}panel(`<h2>Besiegt</h2><p>${bt?'Deine Basis fiel.':'Das Quartier wurde verschlungen.'}<br><small>Tipp: Krieger schlagen Plünderer, Crawler knacken Panzer. Verbund, Ausbau und Orbitalschläge entscheiden Kämpfe.</small></p><div class="col">${btn('go','Nochmal versuchen','pri','data-i="'+li+'"')}${btn('map','Zur Karte')}</div>`)}
 M.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t){if(endSkip)endSkip();return}const a=t.dataset.a,i=+t.dataset.i;AU.init();AU.resume();
  if(a=='go'||a=='play'){snd('open');AU.loadMusic();if(a=='go'){start(i);hide()}else if(prog())hide();else{start(nextLv());hide()}return}
  snd('tap');
  if(a=='df'){SV.df=i;persist();if(curP)curP();return}
  if(a=='lock')toast('Schließe das vorherige Level ab');else if(a=='levels'||a=='main'||a=='map')toMap();else if(a=='help')help();else if(a=='settings')settings();else if(a=='pause')pause();
  else if(a=='resume')hide();else if(a=='restart'){start(li);hide()}
  else if(a=='tmus'){SV.mus=SV.mus?0:1;persist();AU.setVol();settings()}else if(a=='thi'){SV.hi=SV.hi?0:1;persist();rs();settings()}else if(a=='tcl'){SV.cl=SV.cl?0:1;persist();settings()}
  else if(a=='mfile')$('mf').click();else if(a=='mclr'){AU.clearFile().then(()=>settings())}
  else if(a=='reset'){if(t.dataset.c){SV.best=0;SV.rt={};persist();toast('Fortschritt gelöscht',1);try{DTX.resetAll()}catch(_){}settings()}else{t.dataset.c=1;t.textContent='Wirklich löschen? Nochmal tippen'}}});
 $('mf').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;AU.init();AU.resume();const ok=await AU.setFile(f);toast(ok?'Musik geladen ♪':'Datei konnte nicht gelesen werden',ok);e.target.value='';if(M.className=='on')settings()});
 $('menub').onclick=()=>{snd('open');pause()};
 const resClick=k=>{if(paused||phase=='battle')return;snd('tap');const R={P:['Strom','⚡',RES.sP,RES.dP,'ein Energiefeld (⚡ +6)'],W:['Wasser','💧',RES.sW,RES.dW,'einen Taufänger (💧 +4)'],A:['Munition','▮',RES.sA,RES.dA,'eine Fabrik (Munition +4)']}[k],[nm,ic,sup,dem,fix]=R,un_=unsupplied();
  let b=un_[0]||Object.values(bl).find(o=>(o.off||o.wo)==k);
  if(!un_.length&&dem<=sup){toast(ic+' '+nm+' ok: '+dem+' von '+sup+' verbraucht'+(sup>dem?' – '+(sup-dem)+' frei.':'.'),1);return}
  toast(un_.length?'⚠ '+un_.length+' Gebäude nicht angeschlossen – per Fließband mit dem Quartier verbinden.':ic+' Zu wenig '+nm+': '+dem+' gebraucht, '+sup+' vorhanden. Die zuletzt gebauten Gebäude geraten in den Engpass und gehen aus – baue '+fix+'.');
  if(b){const tc=camTarget();off=b.r-(BY-VH*.4)/T-tc;openInfo(b)}};
 $('p_pw').onclick=()=>resClick('P');$('p_wt').onclick=()=>resClick('W');$('p_am').onclick=()=>resClick('A');
 $('bnb').onclick=()=>{snd('tap');fight()};
 $('tmode').onclick=()=>{mode^=1;setMode();snd(mode?'flag':'tap');if(mode)toast('⚑ Wurmflagge aktiv: tippe ein ungegrabenes Feld, unter dem du einen Wurm vermutest.',1)};
 return{reset,banner,sheet,hud,end:endP,pause,pick,disarm,openInfo,setMode,get selB(){return selB}}
})();
/* ---------- Eingabe ---------- */
let dn=null;
function tap(px,py){
 if(phase=='battle'){strike(px,py);return}if(phase=='end'||phase=='menu')return;
 const c=Math.floor(px/T),r=Math.floor(camS+(BY-py)/T),t=tw(c,r);if(!t)return;
 const b=bAt(c,r);
 if(mode&&(b||t.s!=1)){toast('⚑ Tippe ein ungegrabenes Feld, unter dem du einen Wurm vermutest.');snd('err');return}
 if(b){snd('open');UI.openInfo(b);return}
 if(t.s==2){if(t.qs&&!L.u.includes('bore')){toast('Treibsand – hier kann man nicht bauen',0);ft(c+.5,r+.5,'Treibsand','#f0c878');snd('err');UI.sheet('');sel=null;UI.disarm();return}if(wormOn(c,r)){toast('Hier lebt ein Wurm – darauf kann man nicht bauen',0);ft(c+.5,r+.5,'Wurm','#ff9a8a');snd('err');UI.sheet('');sel=null;UI.disarm();return}if(!adj(c,r,true)){toast('Nicht mit dem Quartier verbunden – Bänder dorthin legen');ft(c+.5,r+.5,'Nicht verbunden','#ff9a8a');snd('err');UI.sheet('');sel=null;return}UI.pick(c,r);return}
 UI.sheet('');sel=null;UI.disarm();
 if(t.s==1){if(mode){t.f=!t.f;if(t.f){if(!t.q){t.q=1;Q.push(t)}}else if(t.q){t.q=0;t.p=Math.max(0,t.p);const i=Q.indexOf(t);if(i>=0)Q.splice(i,1)}snd('flag',c+.5);mode=0;UI.setMode();toast(t.f?'⚑ Wurmflagge gesetzt – ein Arbeiter geht hin und zähmt den Wurm.':'⚑ Flagge entfernt.',1)}else if(t.q){t.q=0;t.p=Math.max(0,t.p);Q.splice(Q.indexOf(t),1);snd('tap')}else{t.q=1;Q.push(t);snd('tap')}}
 else{ft(c+.5,r+.5,'Unerforscht','#c9a8d8');snd('tap')}}
function tileAt(px,py){const c=Math.floor(px/T),r=Math.floor(camS+(BY-py)/T);return[c,r]}
cv.addEventListener('pointerdown',e=>{AU.init();AU.resume();dn={x:e.clientX,y:e.clientY,o:off,m:0,};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!dn)return;const d=e.clientY-dn.y;
 if(Math.abs(d)>8)dn.m=1;if(dn.m&&phase!='battle')off=dn.o+d/T});
cv.addEventListener('pointerup',e=>{if(dn&&!dn.m)tap(e.clientX-OX,e.clientY);dn=null});
cv.addEventListener('pointercancel',()=>{dn=null});
addEventListener('resize',()=>{rs();setTimeout(rs,250)});addEventListener('orientationchange',()=>{setTimeout(rs,120);setTimeout(rs,500)});try{document.fonts&&document.fonts.ready.then(()=>rs());addEventListener('load',()=>rs());if(window.visualViewport)visualViewport.addEventListener('resize',()=>rs())}catch(_){}
document.addEventListener('visibilitychange',()=>{AU.hide(document.hidden);if(document.hidden&&M.className!='on'&&phase!='menu'&&phase!='end')UI.pause()});
/* ---------- Hauptschleife ---------- */
let lt=0,hudT=0;
function loop(t){requestAnimationFrame(loop);const dt=Math.min(.05,(t-lt)/1e3||0);lt=t;tm+=dt;if(!paused)up(dt);draw();hudT-=dt;if(hudT<=0){hudT=.12;UI.hud()}}

/* ===== LEVEL 6: actual production logistics, aliens, airborne laser drones ===== */
Object.assign(UT,{bore:'Tempo +15 % · größerer Sandspeicher',smelt:'Tempo +15 % · größeres Kristalllager',crdep:'Schnellerer Versand · größeres Lager'});
Object.assign(NM,{drn:'Laserdrohne',ali:'Nachtalien'});
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
    if(b.crystals>0&&send(b,active(bl[3])?bl[3]:null,'ecsale'))b.crystals--;
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
 function night(dt){
 if(!L.aliens||phase!=='play')return;
 const dark=NT.dark()>.65;
 if(dark&&!wasNight){nightDue=3;toast('☾ Ein geflügelter Alienschwarm nähert sich!');snd('pulse',3.5)}
 wasNight=dark;if(!dark)return;nightDue-=dt;
 if(nightDue<=0){
  nightDue=55+rnd()*20;
  const existing=en.filter(e=>e.hp>0&&(e.k==='ali'||e.k==='drn')).length;
  const count=Math.min(3,6-existing);if(count<=0)return;
  const side=rnd()<.5?.55:6.45,yy=Math.max(2,tp+1);
  for(let i=0;i<count;i++){const a=mkE('ali');a.x=clamp(side+(i-1)*.24,.2,6.8);a.y=yy+(i%2)*.25;a.ph+=i*2.4;en.push(a)}
  if(tp>=9&&existing+count<6&&rnd()<.35)en.push(mkE('drn'));
  ft(side,yy+1,'ALIENSCHWARM','#9bffe4');snd('horn',side);
 }
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
 function spawnTarget(a,t){return (t.k!=='drn'&&t.k!=='ali')||(a.k!=='war'&&a.k!=='wrm')}
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
function drawAlien(px,py,s,o){
 const phase=o.ph||0,bob=Math.sin(tm*4+phase)*s*.06,beat=Math.sin(tm*23+phase*2),f=o.face||-1;
 x.save();x.translate(px,py);x.fillStyle='rgba(5,15,24,.32)';ell(0,s*.02,s*.18,s*.047);x.fill();
 x.translate(0,-s*.62+bob);x.scale(f,1);
 for(const sg of[-1,1])for(let j=0;j<2;j++){
  x.save();x.rotate(sg*(.12+beat*.48+(j?-.32:.22)));const rx=s*(j?.25:.34),ry=s*(.058+.06*(1-Math.abs(beat)));
  x.fillStyle=LG(-rx,0,rx,0,[[0,'rgba(117,247,227,.03)'],[.55,'rgba(158,255,249,.48)'],[1,'rgba(233,255,253,.64)']]);
  ell(-rx*.45,sg*s*.07,rx,ry,sg*.3);x.fill();x.strokeStyle='rgba(100,236,207,.65)';x.lineWidth=Math.max(.65,s*.009);x.stroke();
  for(let k=0;k<3;k++){x.strokeStyle='rgba(205,255,244,.34)';x.lineWidth=.7;x.beginPath();x.moveTo(0,0);x.lineTo(-rx*(.5+k*.22),sg*(s*.07+ry*(k-1)*.5));x.stroke()}x.restore();
 }
 x.fillStyle=LG(-s*.09,0,s*.15,0,[[0,'#0c2931'],[.5,'#458c87'],[1,'#101f34']]);
 ell(0,0,s*.135,s*.08);x.fill();x.strokeStyle='#7dd4b4';x.lineWidth=s*.012;x.stroke();
 x.fillStyle='#113638';ell(-s*.15,0,s*.12,s*.047,-beat*.09);x.fill();
 for(let k=0;k<3;k++){x.strokeStyle='rgba(97,255,216,.7)';x.lineWidth=s*.012;x.beginPath();x.moveTo(-s*(.14+k*.036),-s*.03);x.lineTo(-s*(.14+k*.036),s*.03);x.stroke()}
 x.fillStyle='#baffdf';ell(s*.085,0,s*.055,s*.033);x.fill();glow(s*.09,0,s*.2,'rgba(80,255,190,A)',.55);
 x.strokeStyle='#97f5c4';x.lineWidth=s*.011;
 for(const sg of[-1,1]){x.beginPath();x.moveTo(s*.06,sg*s*.04);x.quadraticCurveTo(s*.16,sg*s*.12,s*.23,sg*s*.08);x.stroke();
  x.fillStyle='#d1ffcc';ell(s*.23,sg*s*.08,s*.012,s*.012);x.fill()}
 x.restore();NT.lit(px,py-s*.4,s*.75,.5);
}

const M=$('M');
rs();start(Math.min(window.DT_START||0,LV.length-1));paused=false;
try{AU.init();AU.resume();AU.loadMusic()}catch(_){}
if(tutW())toast('👆 Tippe unten auf „Arbeiter“ – dein Quartier holt den ersten Arbeiter.',1);
requestAnimationFrame(loop);
if(location.hash=='#debug')window.__g={ev:s=>eval(s),step(sec,dt){dt=dt||.05;for(let i=0;i<sec/dt;i++){tm+=dt;up(dt)}},draw,tapC(c,r){tap((c+.5)*T,BY-(r+.5-camS)*T)},tileXY:(c,r)=>[(c+.5)*T+OX,BY-(r+.5-camS)*T]};
})();
