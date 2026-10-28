Radar.bind({pos,car,R});
/* ---------- Mission: Basis, Leuchtstäbe, Karte ---------- */
const SHR=9.6,bu=BD.clone(),ship=new T.Group();ship.position.copy(BPOS).addScaledVector(bu,-.1);ship.quaternion.setFromUnitVectors(new V3(0,1,0),bu);scene.add(ship);
const kojote=Gfx.makeShip(ship,shTex);
const bcn=add(new T.SphereGeometry(.4,10,8),glow(0xff5030),0,7.6,0,0,0,0,ship);
const beam=(c,h,r,op,p)=>add(new T.CylinderGeometry(r,r,h,10,1,true),new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),0,h/2,0,0,0,0,p);
const bb=beam(0xffb060,80,.6,.12,ship);
add(new T.RingGeometry(10.6,12,72),new T.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),0,.6,0,-Math.PI/2,0,0,ship);
const SCOL=[0x40ff90,0xff40c8,0x40d0ff,0xffe040],u1=new V3().crossVectors(bu,new V3(0,0,1)).normalize(),u2=new V3().crossVectors(bu,u1),sticks=[];
[[.5,150],[2,210],[3.6,175],[5.1,250]].forEach(([ang,ds],k)=>{const a=ds/R,t=u1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(u2,Math.sin(ang)),dir=bu.clone().multiplyScalar(Math.cos(a)).addScaledVector(t,Math.sin(a)).normalize(),h=H(dir),g=new T.Group();
g.position.copy(dir).multiplyScalar(h-.3);g.quaternion.setFromUnitVectors(new V3(0,1,0),dir);scene.add(g);
add(new T.CylinderGeometry(.14,.14,3.4,8),glow(SCOL[k]),0,1.7,0,0,0,.22,g);const bm=beam(SCOL[k],38,.45,.22,g);
sticks.push({g,dir,bm,c:dir.clone().multiplyScalar(h+1.4),col:SCOL[k],got:false,t:0})});
function chime(fs,v){if(!AC||mute)return;fs.forEach((f,i)=>{const t=AC.currentTime+i*.09,o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+1);o.connect(g);g.connect(A.m);g.connect(A.mb);o.start(t);o.stop(t+1.1)})}
const mc=$('mc'),mx=mc.getContext('2d'),mt=$('mt'),mg=$('msg'),MR=300;mc.width=mc.height=216;
let got=0,won=false,msgT=0,tMis=0,lastTxt='';
function msg(t){mg.textContent=t;mg.classList.add('on');clearTimeout(msgT);msgT=setTimeout(()=>mg.classList.remove('on'),4000)}
function mark(dir,up,f2,rt){const th=Math.acos(cl(up.dot(dir),-1,1)),v=dir.clone().addScaledVector(up,-up.dot(dir)),l=v.length()||1;return{d:th*R,x:v.dot(rt)/l,y:v.dot(f2)/l}}
function game(dt,up,f2){tMis+=dt;if(!exploded&&!L11){const nr=pos.distanceTo(BPOS)<16&&vel.length()<1.5;chT=nr?chT+dt:0;chb.style.display=chb2.style.display=chT>3?'block':'none'}const rt=new V3().crossVectors(f2,up);
if(!won){for(const s of sticks)if(!s.got&&pos.distanceToSquared(s.c)<16){s.got=true;s.t=tt;got++;const f=[392,440,494,587][got-1];chime([f,f*1.5,f*2],.14);
if(got===4){msg('Alle Leuchtstäbe! Zurück zur Basis');setTimeout(()=>chime([523,659,784,1047],.15),450)}}
if(got===4&&pos.distanceTo(BPOS)<14){won=true;explode()}}
sticks.forEach((s,i)=>{if(!s.got)s.bm.material.opacity=.2+.08*Math.sin(tt*3+i);else{const k=(tt-s.t)/.5;if(k<1){s.g.scale.setScalar(1+k*1.2);s.bm.material.opacity=.25*(1-k)}else s.g.visible=false}});
bcn.visible=Math.sin(tt*4)>0;bb.material.opacity=got===4&&!won?.18+.14*Math.sin(tt*5):.1;
const db=Math.acos(cl(up.dot(BD),-1,1))*R,tx=won?'Zum Krater · '+Math.round(Math.acos(cl(up.dot(CD),-1,1))*R)+' m':got<4?'Leuchtstäbe '+got+'/4':'Zurück zur Basis · '+Math.round(db)+' m';if(tx!==lastTxt){mt.textContent=tx;lastTxt=tx}
mx.clearRect(0,0,216,216);mx.save();mx.beginPath();mx.arc(108,108,104,0,6.3);mx.clip();
mx.fillStyle='rgba(22,10,6,.6)';mx.fillRect(0,0,216,216);mx.strokeStyle='rgba(255,217,160,.2)';mx.lineWidth=1.5;
[35,70,100].forEach(r=>{mx.beginPath();mx.arc(108,108,r,0,6.3);mx.stroke()});mx.beginPath();mx.moveTo(108,8);mx.lineTo(108,208);mx.moveTo(8,108);mx.lineTo(208,108);mx.stroke();
const pt=(m,r)=>{const k=Math.min(m.d/MR,1)*r;return[108+m.x*k,108-m.y*k]};
if(!exploded){const m=mark(BD,up,f2,rt),[x,y]=pt(m,92),pu=got===4&&!won?1+.3*Math.sin(tt*6):1;mx.save();mx.translate(x,y);mx.scale(pu,pu);mx.fillStyle=m.d>MR?'rgba(255,240,220,.7)':'#fff4e0';mx.shadowColor='#ffa040';mx.shadowBlur=12;mx.fillRect(-7,-7,14,14);mx.restore()}
if(exploded){const m=mark(CD,up,f2,rt),[x,y]=pt(m,92);mx.strokeStyle=mx.fillStyle='#40d0ff';mx.shadowColor='#40d0ff';mx.shadowBlur=12;mx.lineWidth=3;mx.globalAlpha=.6+.4*Math.sin(tt*5);mx.beginPath();mx.arc(x,y,m.d>MR?6:10,0,6.3);mx.stroke();mx.beginPath();mx.arc(x,y,3,0,6.3);mx.fill();mx.globalAlpha=1}
sticks.forEach(s=>{if(s.got)return;const m=mark(s.dir,up,f2,rt),[x,y]=pt(m,92);mx.fillStyle='#'+s.col.toString(16).padStart(6,'0');mx.shadowColor=mx.fillStyle;mx.shadowBlur=12;mx.beginPath();mx.arc(x,y,m.d>MR?5:8,0,6.3);mx.fill()});
mx.shadowBlur=0;mx.restore();mx.strokeStyle='rgba(255,217,160,.7)';mx.lineWidth=3;mx.beginPath();mx.arc(108,108,104,0,6.3);mx.stroke();
mx.fillStyle='#ffd9a0';mx.beginPath();mx.moveTo(108,96);mx.lineTo(116,116);mx.lineTo(108,111);mx.lineTo(100,116);mx.closePath();mx.fill()}
/* ---------- Finale: Explosion, Krater, Funk, Level 11 ---------- */
function mkfx(n,fire){const P=new Float32Array(n*3),A2=new Float32Array(n),S=new Float32Array(n),S0=new Float32Array(n),L=new Float32Array(n),M2=new Float32Array(n),Vv=Array.from({length:n},()=>new V3()),g=new T.BufferGeometry();
g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('aA',new T.BufferAttribute(A2,1));g.setAttribute('aS',new T.BufferAttribute(S,1));
const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:fire?T.AdditiveBlending:T.NormalBlending,uniforms:{uSz:dustMat.uniforms.uSz},vertexShader:dustMat.vertexShader,
fragmentShader:'varying float vA;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));'+(fire?'gl_FragColor=vec4(mix(vec3(.9,.1,.02),vec3(1.,.8,.35),vA*vA)*1.4,a*vA*.7);':'gl_FragColor=vec4(vec3(.03+.09*vA),a*vA*.6);')+END+'}'});
const pts=new T.Points(g,m);pts.frustumCulled=false;scene.add(pts);let i=0;
return{e(p,v,life,sz){P[i*3]=p.x;P[i*3+1]=p.y;P[i*3+2]=p.z;Vv[i].copy(v);L[i]=M2[i]=life;S0[i]=sz;i=(i+1)%n},
u(dt,drag,buoy,grow,uv){uv=uv||bu;for(let k=0;k<n;k++){if(L[k]>0){L[k]-=dt;const v=Vv[k];P[k*3]+=v.x*dt;P[k*3+1]+=v.y*dt;P[k*3+2]+=v.z*dt;v.multiplyScalar(1-dt*drag).addScaledVector(uv,buoy*dt);const a=Math.max(0,L[k]/M2[k]);A2[k]=a;S[k]=S0[k]*(1+(1-a)*grow)}else A2[k]=0}
g.attributes.position.needsUpdate=g.attributes.aA.needsUpdate=g.attributes.aS.needsUpdate=true}}}
const fire=mkfx(320,true),smk=mkfx(260,false),rr=()=>Math.random()-.5,rv=s=>new V3(rr(),rr(),rr()).multiplyScalar(s),ep=()=>BPOS.clone().addScaledVector(bu,2+Math.random()*7).add(rv(3));
const rg=new T.Group();rg.position.copy(BPOS).addScaledVector(bu,.3);rg.quaternion.copy(ship.quaternion);scene.add(rg);
const ring=add(new T.RingGeometry(.9,1,48),new T.MeshBasicMaterial({color:0xffc070,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),0,0,0,-Math.PI/2,0,0,rg);
const scorch=add(new T.CircleGeometry(9,24),new T.MeshBasicMaterial({color:0,transparent:true,opacity:0,depthWrite:false}),0,0,0,-Math.PI/2,0,0,rg);
const deb=Array.from({length:14},()=>{const m=new T.Mesh(new T.BoxGeometry(.5+Math.random()*1.2,.3+Math.random(),.4+Math.random()*.8),dark);m.visible=false;scene.add(m);return{m,v:new V3(),w:rv(8),s:0}});
const cg=new T.Group();cg.quaternion.setFromUnitVectors(new V3(0,1,0),CD);cg.position.copy(CD).multiplyScalar(H(CD)+.3);cg.visible=false;scene.add(cg);
beam(0x40d0ff,70,.7,.2,cg);const cring=add(new T.RingGeometry(11.2,13.2,48),new T.MeshBasicMaterial({color:0x40d0ff,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),0,0,0,-Math.PI/2,0,0,cg);
let FRZ=false,SUNK=1,exploded=false,t0=0,p2=0,shake=0,nw=0,nc=0,nextC=0,L11=false,rq=[],rb=0,rI=0;
const flh=$('fl'),nbt=$('nb'),rad=$('rad'),rtx=$('rt');
function nz(buf,type,f,f2,du,v){if(!AC||mute)return;const t=AC.currentTime,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=buf;s.loop=true;fl.type=type;fl.frequency.setValueAtTime(f,t);fl.frequency.exponentialRampToValueAtTime(f2,t+du);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+Math.min(.05,du/4));g.gain.exponentialRampToValueAtTime(.001,t+du);s.connect(fl);fl.connect(g);g.connect(A.m);s.start(t);s.stop(t+du+.1)}
function screech(){if(!AC||mute)return;const t=AC.currentTime,o=AC.createOscillator(),l=AC.createOscillator(),lg=AC.createGain(),f=AC.createBiquadFilter(),g=AC.createGain();o.type='sawtooth';o.frequency.setValueAtTime(1900,t);o.frequency.exponentialRampToValueAtTime(700,t+1.1);l.frequency.value=38;lg.gain.value=220;l.connect(lg);lg.connect(o.frequency);f.type='bandpass';f.frequency.value=1500;f.Q.value=1.5;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+.08);g.gain.exponentialRampToValueAtTime(.001,t+1.2);o.connect(f);f.connect(g);g.connect(A.m);g.connect(A.mb);o.start(t);l.start(t);o.stop(t+1.3);l.stop(t+1.3)}
const boom=()=>{nz(A.nb,'lowpass',900,60,3.4,1);tone(95,24,1.6,.6);nz(A.wn,'lowpass',3000,200,1.1,.45)},rumble=()=>{nz(A.nb,'lowpass',160,60,4,1.2);tone(48,30,3.5,.35)},drums=()=>[0,400,800,1050].forEach(d=>setTimeout(()=>tone(130,55,.2,.3),d));
function radio(w,t){rq.push([w,t]);if(!rb)rnext()}
function rnext(){const m=rq.shift();clearInterval(rI);if(!m){rb=0;rad.classList.remove('on');return}rb=1;rad.classList.add('on');$('rw').textContent='● Funk · '+m[0];rtx.textContent='';
nz(A.wn,'bandpass',2200,1800,.3,.12);tone(1200,1200,.07,.06);
if(!mute&&VOICE&&window.speechSynthesis)try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(m[1]);u.lang='de-DE';u.rate=1.05;u.pitch=.65;speechSynthesis.speak(u)}catch(e){}
let i=0;rI=setInterval(()=>{rtx.textContent=m[1].slice(0,++i);if(i>=m[1].length){clearInterval(rI);setTimeout(()=>{nz(A.wn,'bandpass',2000,1500,.2,.1);rnext()},2600)}},45)}
function explode(){exploded=true;t0=p2=tt;nextC=tt+60;Gfx.shipBoom();cg.visible=true;msg('Das Schiff explodiert!');
for(let i=0;i<260;i++)fire.e(ep(),rv(40).addScaledVector(bu,8+Math.random()*14),.7+Math.random()*1.4,6+Math.random()*10);
for(let i=0;i<200;i++)smk.e(ep(),rv(14).addScaledVector(bu,4+Math.random()*8),3+Math.random()*4,10+Math.random()*10);
deb.forEach(d=>{d.m.position.copy(ep());d.v.copy(rv(26)).addScaledVector(bu,12+Math.random()*12);d.m.visible=false;d.s=1});
const r0=pos.clone().sub(BPOS);r0.addScaledVector(bu,-r0.dot(bu));vel.addScaledVector(r0.normalize(),14).addScaledVector(bu,8);boom()}
function startL11(){if(L11)return;L11=true;nbt.style.display='none';
Zones.enter('level11').then(()=>{$('m').style.display='none';rad.classList.remove('on')}).catch(e=>{L11=false;msg(String(e.message||e))})}
nbt.addEventListener('click',startL11);
const mkctx=()=>({T,scene,camera,renderer,car,pos,vel,H,R,base:CD,say:radio,msg,chime,tone,dust:emit,sfx:{rumble,screech,boom,drums},fire,smk,mkfx,nz,A,planet:planetMat,sun,crater:cg,freeze:v=>FRZ=v,sunk:v=>SUNK=v,zones:Zones,radar:Radar,save:Save});
Zones.setContext(mkctx);
let chT=0;const chb=$('ch'),chb2=$('ch2');
function cheat(to){if(L11)return;exploded=true;t0=-999;Gfx.shipHide();sticks.forEach(s=>s.g.visible=false);cg.visible=false;chb.style.display=chb2.style.display='none';
const d=CD.clone(),t1=new V3().crossVectors(d,new V3(0,0,1)).normalize(),t2=new V3().crossVectors(d,t1),pd=d.clone().addScaledVector(t2,-26/R).normalize();
pos.copy(pd).multiplyScalar(H(pd)+1.2);vel.set(0,0,0);om.set(0,0,0);
const fw=t2.clone().addScaledVector(pd,-t2.dot(pd)).normalize();q.setFromRotationMatrix(new T.Matrix4().makeBasis(new V3().crossVectors(fw,pd),pd,fw.clone().negate()));
camPos.copy(pos).addScaledVector(pd,5);cUp.copy(pd);cF.copy(fw);
if(to==='l11'){startL11();return}
L11=true;const dome=new T.Mesh(new T.SphereGeometry(6,24,12,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0x88c8ff,transparent:true,opacity:.85,roughness:.1,metalness:.3,emissive:0x2a80c0}));
dome.position.copy(d).multiplyScalar(H(d));dome.quaternion.setFromUnitVectors(new V3(0,1,0),d);scene.add(dome);
Zones.enter('basis',{dome}).catch(e=>{L11=false;msg(String(e.message||e))})}
chb.addEventListener('click',()=>cheat('rts'));chb2.addEventListener('click',()=>cheat('l11'));
const ev=[{t:3,f:()=>radio('BODENSTATION','Schiff verloren! Es gibt keinen Rückweg mehr. Fahrt zum Krater, er ist auf eurer Karte markiert. Dort errichtet ihr eine Notbasis.')},
{t:22,f:()=>{rumble();radio('BODENSTATION','Seismische Aktivität unter euch! Sandwürmer! Fahrt nicht gleichmäßig, sie spüren jeden Rhythmus!')}},
{t:44,f:()=>{drums();radio('SPÄHER','Wilde Bewohner auf den Kämmen. Trommeln und Fackeln. Haltet Abstand zu den Felsen!')}}];
const CH2=[['Signal wird schwächer … hört ihr uns? Energie nur noch bei vierzig Prozent.',0],['Sandsturm am Horizont. Gleich ist die Sicht null!',0],['Etwas bewegt sich unter dem Sand, direkt hinter euch!',rumble],['Schatten über euch! Aliens! Weiterfahren, nicht anhalten!',screech],['Die Trommeln werden lauter. Sie beobachten euch.',drums]];
function finale(dt,up){if(!exploded)return;const e=tt-t0,bur=Math.max(0,1-e/50);
flh.style.opacity=Math.max(0,1-e*2.2)*.85;shake=Math.exp(-e*1.6)*cl(1-camera.position.distanceTo(BPOS)/220,0,1);
planetMat.uniforms.uEx.value.copy(BPOS).addScaledVector(bu,6);planetMat.uniforms.uExI.value=14*Math.exp(-e*1.2)+bur*2.2*(.8+.2*Math.sin(tt*20));
ring.scale.setScalar(1+e*36);ring.material.opacity=.9*Math.max(0,1-e/1.7);scorch.material.opacity=Math.min(.6,e*.5);cring.material.opacity=.45+.2*Math.sin(tt*4);
if(bur>0){for(let i=0;i<4;i++)if(Math.random()<bur)fire.e(BPOS.clone().addScaledVector(bu,.5+Math.random()*3).add(rv(4)),rv(2).addScaledVector(bu,4+Math.random()*5),.6+Math.random()*.9,3+Math.random()*5);
if(Math.random()<.4+.5*bur)smk.e(BPOS.clone().addScaledVector(bu,2+Math.random()*3).add(rv(4)),rv(3).addScaledVector(bu,5+Math.random()*5),4+Math.random()*4,8+Math.random()*8)}
deb.forEach(d=>{if(!d.m.visible||d.s)return;const p=d.m.position;d.v.addScaledVector(p.clone().normalize(),-15*dt);p.addScaledVector(d.v,dt);d.m.rotation.x+=d.w.x*dt;d.m.rotation.y+=d.w.y*dt;const l=p.length(),g=H(p.clone().divideScalar(l))+.3;if(l<g){p.multiplyScalar(g/l);d.s=1}else{if(Math.random()<.5)smk.e(p,new V3(),1.8,3);if(Math.random()<.5)fire.e(p,new V3(),.5,2.5)}});
fire.u(dt,1.2,10,.7);smk.u(dt,.5,2.5,1.8);
if(L11)return;const dc=Math.acos(cl(up.dot(CD),-1,1))*R,x=tt-p2;nbt.style.display=dc<14?'block':'none';
ev.forEach(o=>{if(!o.d&&x>o.t){o.d=1;o.f()}});
if(!nw&&dayG<.35&&x>10){nw=1;screech();radio('SPÄHER','Warnung! Fliegende Aliens bei Nacht! Große Schwärme im Westen. Rechnet mit Angriffen aus der Luft!')}
if(!nc&&dc<120){nc=1;radio('BODENSTATION','Krater in Sicht! Noch ein Stück. Fahrt in die markierte Zone und errichtet die Basis, schnell!')}
if(tt>nextC&&x>60){nextC=tt+26+Math.random()*24;const c=CH2[Math.random()*CH2.length|0];if(c[1])c[1]();radio('FUNK',c[0])}}

/* ---------- Spielstand fortsetzen ---------- */
{const co=$('co');if(co){if(Save.zone('basis')){co.style.display='block';co.addEventListener('click',()=>{co.style.display='none';cheat('rts')})}}}
