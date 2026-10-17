'use strict';
/* film3d.js – gemeinsame Bibliothek der 3D-Zwischensequenzen (three.js) */
const T=THREE,$=id=>document.getElementById(id);
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),mx=(a,b,u)=>a+(b-a)*u,lin=(a,b,x)=>cl((x-a)/(b-a));
const sm=(a,b,x)=>{x=lin(a,b,x);return x*x*(3-2*x)};
let BEATS=[4.4,11.4,18.4,25.4];
const V3=(x,y,z)=>new T.Vector3(x,y,z);
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
let _s=11;const rnd=()=>(_s=(_s*16807)%2147483647)/2147483647;
const Y=new T.Vector3(0,1,0);
function cat(K,t){const n=K.length;let i=0;while(i<n-2&&K[i+1][0]<=t)i++;const k1=K[i],k2=K[i+1],k0=K[Math.max(0,i-1)],k3=K[Math.min(n-1,i+2)],u=cl((t-k1[0])/(k2[0]-k1[0])),u2=u*u,u3=u2*u;
 return k1.slice(1).map((_,j)=>{const p0=k0[j+1],p1=k1[j+1],p2=k2[j+1],p3=k3[j+1];return .5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u2+(-p0+3*p1-3*p2+p3)*u3)})}
const beatAge=t=>{let a=99;for(const b of BEATS)if(t>=b)a=t-b;return a};

/* ---------- Renderer ---------- */
const cv=$('c'),rd=new T.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
rd.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth>900?1.5:1.35));rd.setClearColor(0x000000);
const cam=new T.PerspectiveCamera(40,1,.05,2500);let asp=1,baseFov=40;
function fv(b){baseFov=b;const k=Math.pow(Math.max(1,1.6/asp),.55);cam.fov=2*Math.atan(Math.tan(b*Math.PI/360)*k)*180/Math.PI;cam.updateProjectionMatrix()}
function rs(){const w=innerWidth,h=innerHeight;rd.setSize(w,h,false);asp=w/h;cam.aspect=asp;fv(baseFov)}addEventListener('resize',rs);rs();

/* ---------- Texturen / Partikel ---------- */
function ctex(draw,n=64,rep){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new T.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep)}return t}
const TD=ctex((g,n)=>{const r=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,n,n)});
const TB=ctex((g,n)=>{g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(n/2,n/2,n/2-2,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=3;g.stroke()},64);   // Bokeh
const TG=ctex((g,n)=>{g.fillStyle='#fff';g.fillRect(0,0,n,n);for(let i=0;i<900;i++){const v=140+rnd()*115|0;g.fillStyle=`rgba(${v},${v*.92|0},${v*.8|0},.55)`;g.fillRect(rnd()*n,rnd()*n,1+rnd()*1.6,1+rnd()*1.6)}},128,22);
function pts(n,o={}){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(n*3),3));
 const p=new T.Points(g,new T.PointsMaterial({size:o.size||1,map:o.map||TD,vertexColors:true,transparent:true,depthWrite:false,blending:o.add===false?T.NormalBlending:T.AdditiveBlending,sizeAttenuation:o.att!==false,fog:false,opacity:o.op==null?1:o.op}));p.frustumCulled=false;return p}
const setP=(p,i,x,y,z,r,g,b)=>{const a=p.geometry.attributes;a.position.setXYZ(i,x,y,z);a.color.setXYZ(i,r,g,b)};
const updP=p=>{p.geometry.attributes.position.needsUpdate=true;p.geometry.attributes.color.needsUpdate=true};
const mk=(geo,col,o)=>new T.Mesh(geo,new T.MeshLambertMaterial(Object.assign({color:col},o||{})));
const bas=(geo,col,op,add)=>new T.Mesh(geo,new T.MeshBasicMaterial({color:col,transparent:op!=null,opacity:op==null?1:op,blending:add?T.AdditiveBlending:T.NormalBlending,depthWrite:!add&&op==null,side:2,fog:false}));

const NZG=`float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}`;
function makePlanet(){const P=new T.Scene();
const R=Array.from({length:10},(_,i)=>.13+.026*i),C=[new T.Vector3().setFromSphericalCoords(1,Math.PI/2-.4,-.4)];
function at(d,a,r){const e=new T.Vector3().crossVectors(Y,d).normalize(),n=new T.Vector3().crossVectors(d,e);e.multiplyScalar(Math.cos(a)).addScaledVector(n,Math.sin(a));return d.clone().multiplyScalar(Math.cos(r)).addScaledVector(e,Math.sin(r)).normalize()}
for(let i=1,b=-1.45;i<10;i++,b+=.3)C.push(at(C[i-1],b,.66*(R[i-1]+R[i])));
const cen=C.reduce((a,c)=>a.add(c),new T.Vector3()).normalize(),sunP=new T.Vector3(.9,.5,.3).add(C[0]).normalize();
const NZ=`float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}`;
const VS='varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const U={uSun:{value:sunP},uC:{value:C.map(c=>c.clone())},uR:{value:R.map(()=>0)},uS:{value:R.map(()=>0)},uT:{value:0}};
const pm=(f,o={})=>new T.ShaderMaterial(Object.assign({uniforms:U,vertexShader:VS,fragmentShader:'precision highp float;uniform vec3 uSun,uC[10];uniform float uR[10],uS[10],uT;varying vec3 vP;'+NZ+f},o));
const bgP=new T.Mesh(new T.SphereGeometry(90,24,16),pm(`void main(){vec3 d=normalize(vP);float a=fbm(d*2.2),b=fbm(d*4.+5.);gl_FragColor=vec4(vec3(.04,.015,.07)+vec3(.35,.06,.18)*smoothstep(.45,.85,a)*.6+vec3(.05,.2,.3)*smoothstep(.5,.9,b)*.5,1.);}`,{side:T.BackSide,depthWrite:false}));bgP.renderOrder=-2;P.add(bgP);
{const p=[],c=[];for(let i=0;i<1800;i++){const v=new T.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize().multiplyScalar(70);p.push(v.x,v.y,v.z);const k=.5+rnd()*.5,w=rnd();c.push(k,k*(.8+w*.2),k*(1-w*.3))}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));P.add(new T.Points(g,new T.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true})))}
P.add(new T.Mesh(new T.SphereGeometry(1,128,96),pm(`
float ht(vec3 p){float b=fbm(p*4.);return b+.1*sin(dot(p,vec3(.8,.3,.5))*90.+b*10.)*smoothstep(.3,.6,b);}
void main(){vec3 n=normalize(vP),V=normalize(cameraPosition-vP);float h=ht(n),e=.004;
vec3 g=vec3(ht(n+vec3(e,0,0))-h,ht(n+vec3(0,e,0))-h,ht(n+vec3(0,0,e))-h)/e;vec3 Nn=normalize(n-(g-dot(g,n)*n)*.04);
float dif=dot(Nn,uSun),dn=dot(n,uSun);
vec3 col=mix(vec3(.55,.22,.12),vec3(.95,.62,.3),smoothstep(.3,.8,h));
col=mix(col,vec3(.17,.08,.1),smoothstep(.6,.75,fbm(n*8.+3.))*.85);
col=mix(col,vec3(.96,.84,.66),smoothstep(.72,.82,vn(n*3.+9.))*.6);
vec3 q=n*10.,ci=floor(q),cc=ci+.3+.4*vec3(h31(ci),h31(ci+3.),h31(ci+7.));float cd=length(q-cc),has=step(.6,h31(ci+11.));
col*=1.-has*smoothstep(.27,.15,cd)*.4;col+=has*smoothstep(.05,0.,abs(cd-.3))*.1*vec3(1.,.7,.5);
float lit=smoothstep(-.08,.3,dn);
vec3 c=col*(.1+1.15*max(dif,0.))*lit+col*vec3(.05,.06,.14)*(1.-lit);
c+=vec3(1.,.35,.1)*exp(-pow(dn/.16,2.))*.12;
c+=pow(1.-max(dot(n,V),0.),3.)*mix(vec3(.15,.1,.4),vec3(1.,.5,.2),smoothstep(-.2,.5,dn))*.7;
float w=(fbm(n*7.)-.5)*.09,pl=.6+.4*sin(uT*3.),hs=.8+.2*sin(n.y*420.-uT*1.5);vec3 tc=vec3(0),ec=vec3(0);
for(int i=0;i<10;i++){float r=uR[i];if(r>.002){float d=acos(clamp(dot(n,uC[i]),-1.,1.))+w,a=smoothstep(r,r-.012,d),ed=exp(-pow((d-r)/.006,2.));
if(uS[i]>1.5){tc+=vec3(.1,.65,1.)*a;ec+=vec3(.3,.85,1.)*ed*1.3;}else if(uS[i]>.5){tc+=vec3(1.,.2,.1)*a*(.5+.6*pl);ec+=vec3(1.,.4,.15)*ed*pl*1.8;}else{tc+=vec3(.3,.25,.5)*a*.7;ec+=vec3(.6,.5,.9)*ed*.4;}}}
c+=tc*.2*hs+tc*.2*(1.-lit)+ec;
gl_FragColor=vec4(pow(c/(1.+c*.12),vec3(.95)),1.);}`)));
P.add(new T.Mesh(new T.SphereGeometry(1.012,64,48),pm(`void main(){vec3 n=normalize(vP);float a=smoothstep(.52,.75,fbm(n*2.5+vec3(uT*.012,0.,uT*.008)+fbm(n*4.)*.6))*.5,l=smoothstep(-.1,.4,dot(n,uSun));gl_FragColor=vec4(vec3(1.,.72,.45)*(.1+l),a*(.3+.7*l));}`,{transparent:true,depthWrite:false})));
P.add(new T.Mesh(new T.SphereGeometry(1.14,64,48),pm(`void main(){vec3 n=normalize(vP),V=normalize(cameraPosition-vP);float i=pow(clamp(-dot(n,V)*2.2,0.,1.),2.2),s=dot(n,uSun);
vec3 c=mix(vec3(.3,.2,.7),vec3(1.,.5,.2),smoothstep(-.3,.5,s))+vec3(0.,.5,.6)*exp(-pow(s/.2,2.))*.6;gl_FragColor=vec4(c*i*(.15+.85*smoothstep(-.6,.2,s)),1.);}`,{side:T.BackSide,transparent:true,blending:T.AdditiveBlending,depthWrite:false})));
const dlP=new T.DirectionalLight(0xffe0c0,1.4);dlP.position.copy(sunP).multiplyScalar(10);P.add(dlP,new T.AmbientLight(0x221133,.8));
const moons=[[.09,3.4,.4,0x9a8f88],[.05,5,1.7,0x6d7a88]].map(([s,r,a,c])=>{const m=new T.Mesh(new T.SphereGeometry(s,24,16),new T.MeshLambertMaterial({color:c}));m.userData={r,a};P.add(m);return m});
const beamP=new T.Mesh(new T.CylinderGeometry(.004,.012,.2,8,1,true).translate(0,.1,0),new T.MeshBasicMaterial({color:0x72dcff,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,side:2}));
beamP.position.copy(C[0]);beamP.quaternion.setFromUnitVectors(Y,C[0]);P.add(beamP);
const beamP2=beamP.clone();beamP2.material=beamP.material.clone();beamP2.scale.set(2.4,5,2.4);beamP2.material.opacity=.18;P.add(beamP2);

return{P,U,R,C,cen,sunP,moons,beamP,beamP2,bgP}}
let AC,MB,RV,NB,FB,OUT,on=false,EV=[],ei=0;
const mf=m=>440*Math.pow(2,(m-69)/12);
function aInit(){AC=(window.DUE&&DUE.sharedAC&&DUE.sharedAC())||new(window.AudioContext||window.webkitAudioContext)();
 const cp=AC.createDynamicsCompressor();cp.threshold.value=-16;cp.ratio.value=4;cp.connect(AC.destination);MB=AC.createGain();MB.gain.value=0;MB.connect(cp);
 const rv=AC.createConvolver(),L=AC.sampleRate*2.8|0,ib=AC.createBuffer(2,L,AC.sampleRate);for(let c=0;c<2;c++){const d=ib.getChannelData(c);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.6)}
 rv.buffer=ib;const wt=AC.createGain();wt.gain.value=.5;rv.connect(wt);wt.connect(cp);RV=rv;
 NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
function Vo(T0,f,o={}){const{w='sine',v=.1,a=.01,h=0,r=.5,f2=null,fd=.1,lp=0,vb=0}=o;const g=AC.createGain(),os=AC.createOscillator();os.type=w;os.frequency.setValueAtTime(f,T0);if(f2)os.frequency.exponentialRampToValueAtTime(f2,T0+fd);
 if(vb){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=5;lg.gain.value=f*vb/100;l.connect(lg);lg.connect(os.frequency);l.start(T0);l.stop(T0+a+h+r+.1)}
 g.gain.setValueAtTime(0,T0);g.gain.linearRampToValueAtTime(v,T0+a);g.gain.setValueAtTime(v,T0+a+h);g.gain.exponentialRampToValueAtTime(.0001,T0+a+h+r);
 let n=os;if(lp){const b=AC.createBiquadFilter();b.type='lowpass';b.frequency.value=lp;os.connect(b);n=b}n.connect(g);g.connect(OUT);os.start(T0);os.stop(T0+a+h+r+.05)}
function Nz(T0,dur,v,o={}){const{type='bandpass',f0=1000,f1=null,q=1,a=.01,r=.3}=o;const s=AC.createBufferSource();s.buffer=NB;s.loop=true;const b=AC.createBiquadFilter();b.type=type;b.frequency.setValueAtTime(f0,T0);if(f1)b.frequency.exponentialRampToValueAtTime(f1,T0+dur);b.Q.value=q;
 const g=AC.createGain();g.gain.setValueAtTime(0,T0);g.gain.linearRampToValueAtTime(v,T0+a);g.gain.setValueAtTime(v,T0+Math.max(a,dur-r));g.gain.linearRampToValueAtTime(0,T0+dur);s.connect(b);b.connect(g);g.connect(OUT);s.start(T0);s.stop(T0+dur+.05)}
const thump=(T0,v,f=55)=>{Vo(T0,f*2.4,{v,a:.002,r:.3,f2:f,fd:.12});Vo(T0+.02,f,{v:v*.9,r:.7});Nz(T0,.16,v*.25,{type:'lowpass',f0:320,q:.7})};
const choir=(T0,notes,dur,v)=>notes.forEach((n,i)=>[0,.004,-.004].forEach(dt=>Vo(T0,mf(n)*(1+dt),{w:'sawtooth',v:v/notes.length/3,a:dur*.42,h:dur*.25,r:dur*.5+.6,lp:1100+i*80,vb:.4})));
const bell=(T0,f,v)=>{Vo(T0,f,{v,a:.003,r:2.8});Vo(T0,f*2.76,{v:v*.3,r:1.6})};
const pluck=(T0,f,v)=>Vo(T0,f,{w:'triangle',v,a:.003,r:.55,lp:3200});
const brass=(T0,f,dur,v)=>{Vo(T0,f,{w:'sawtooth',v,a:.3,h:dur,r:.7,lp:1000});Vo(T0,f*2,{w:'sawtooth',v:v*.4,a:.35,h:dur,r:.7,lp:1400})};
const whoosh=(T0,dur,v,up)=>Nz(T0,dur,v,{f0:up?260:4200,f1:up?5200:260,q:.9,a:dur*.5,r:dur*.4});
const boom=(T0,v)=>{Vo(T0,75,{v,a:.003,r:1.7,f2:30,fd:.5});Nz(T0,1.5,v*.45,{type:'lowpass',f0:520,f1:60})};

const bmat=(c,o)=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:T.AdditiveBlending,depthWrite:false,side:2,fog:false});
/* ---------- Himmel (Verlaufsfarben als Uniforms) ---------- */
function makeSky(c){const u={uSun:{value:new T.Vector3(-.8,.1,-.5).normalize()},zen:{value:new T.Color(c.zen)},mid:{value:new T.Color(c.mid)},hor:{value:new T.Color(c.hor)},uStar:{value:c.stars==null?1:c.stars},uSunK:{value:c.sunK==null?1:c.sunK},uFlash:{value:0}};
 const m=new T.Mesh(new T.SphereGeometry(1200,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:u,vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`precision highp float;uniform vec3 uSun,zen,mid,hor;uniform float uStar,uSunK,uFlash;varying vec3 vP;float hh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 void main(){vec3 d=normalize(vP);float y=d.y,h=clamp(y,0.,1.);vec3 c=mix(hor,mid,smoothstep(0.,.22,h));c=mix(c,zen,smoothstep(.12,.8,h));
 float s=dot(d,uSun);c+=(vec3(1.,.55,.3)*pow(max(s,0.),5.)*.55+vec3(1.,.78,.5)*pow(max(s,0.),60.)*.9+vec3(1.,.93,.75)*smoothstep(.9965,.9985,s)*2.4)*uSunK;
 c+=vec3(step(.992,hh(floor(d*260.)))*smoothstep(.08,.5,y)*uStar*1.2);c=mix(c,hor*.55,smoothstep(0.,-.12,y));c+=vec3(.7,.75,1.)*uFlash*(.3+.7*h);gl_FragColor=vec4(c,1.);}`}));return{mesh:m,u}}
/* ---------- Gelände ---------- */
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf),h=(a,b)=>hash(a*57.3+b*131.7);return mx(mx(h(xi,zi),h(xi+1,zi),u),mx(h(xi,zi+1),h(xi+1,zi+1),u),v)}
const fb=(x,z)=>vnoise(x,z)*.55+vnoise(x*2.1,z*2.1)*.28+vnoise(x*4.3,z*4.3)*.12;
function makeTerrain(o){const gh=o.h,N=o.n||260,S=o.size||1000,g=new T.PlaneGeometry(S,S,N,N);g.rotateX(-Math.PI/2);const p=g.attributes.position,col=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=gh(x,z);p.setY(i,h);const c=o.col(x,z,h);col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2]}
 g.setAttribute('color',new T.BufferAttribute(col,3));g.computeVertexNormals();return{geo:g,gh}}
/* ---------- Turm, Menschen ---------- */
function makeTower(){const TW=new T.Group(),add=(m,y)=>{m.position.y=y;TW.add(m);return m};add(mk(new T.CylinderGeometry(5.4,6.8,4,24),0x6c4a3c),2);add(mk(new T.CylinderGeometry(2.1,3.5,22,20),0x92705a),15);
 for(const y of[8,13,18,23])add(mk(new T.CylinderGeometry(3.3-(y-4)*.06,3.45-(y-4)*.06,.5,20),0x3a2a30),y);
 add(mk(new T.CylinderGeometry(4.3,3.1,1.3,20),0x4a3238),27.4);add(bas(new T.CylinderGeometry(1.7,1.7,2.8,14),0xffcf80),29.4);add(mk(new T.ConeGeometry(2.5,2.8,14),0x2e1e28),32.2);add(mk(new T.CylinderGeometry(.07,.07,6,6),0x333),36);
 const wm=new T.MeshBasicMaterial({color:0xffc070,fog:false});for(let i=0;i<5;i++){const y=7+i*3.7,r=3.5-(y-4)*.0591,w=new T.Mesh(new T.BoxGeometry(.5,1.1,.2),wm);w.position.set(i%2?.6:-.6,y,r+.05);TW.add(w)}
 const gl=new T.Sprite(new T.SpriteMaterial({map:TD,color:0xffc070,blending:T.AdditiveBlending,depthWrite:false,fog:false}));gl.scale.set(22,22,1);gl.position.y=29.4;TW.add(gl);TW.userData.glow=gl;
 const sw=new T.Mesh(new T.ConeGeometry(7,90,28,1,true).translate(0,-45,0).rotateZ(-Math.PI/2),new T.MeshBasicMaterial({color:0x72dcff,transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,side:2,fog:false}));sw.position.y=29.4;TW.add(sw);TW.userData.sweep=sw;return TW}
function person(col,sc,red){const g=new T.Group(),b=mk(new T.CylinderGeometry(.3,.4,1.5,8),col,red?{emissive:0x3a0810}:{});b.position.y=.85;const h=mk(new T.SphereGeometry(.3,10,8),red?0x2a1418:0xe8c9a0);h.position.y=1.85;
 const pk=new T.Mesh(new T.BoxGeometry(.5,.7,.3),new T.MeshBasicMaterial({color:red?0xff4a3a:0x72dcff,fog:false}));pk.position.set(0,1.05,-.35);g.add(b,h,pk);g.scale.setScalar(sc);return g}
const TNET=ctex((g,n)=>{g.strokeStyle='rgba(200,244,255,.95)';g.lineWidth=2;for(let i=0;i<=8;i++){g.beginPath();g.moveTo(i*n/8,0);g.lineTo(i*n/8,n);g.stroke();g.beginPath();g.moveTo(0,i*n/8);g.lineTo(n,i*n/8);g.stroke()}},128);

/* ---------- Querschnitt in Spielgrafik ---------- */
function makeTiles(o={}){const G=new T.Scene();G.background=new T.Color(0x120716);const tex=f=>ctex(f,128);
 const tDark=tex((g,n)=>{g.fillStyle='#2a1535';g.fillRect(0,0,n,n);g.strokeStyle='#3d2250';g.lineWidth=4;g.strokeRect(2,2,n-4,n-4);for(let i=0;i<30;i++){g.fillStyle='rgba(90,50,120,.22)';g.fillRect(rnd()*n,rnd()*n,3,3)}});
 const tSand=tex(o.sandTex||((g,n)=>{g.fillStyle='#d2a36b';g.fillRect(0,0,n,n);g.fillStyle='#e0b985';g.fillRect(6,6,n-12,18);g.strokeStyle='#a9753f';g.lineWidth=3;for(let k=0;k<3;k++){g.beginPath();let x=rnd()*n,y=rnd()*n;g.moveTo(x,y);for(let j=0;j<4;j++){x+=(rnd()-.5)*50;y+=(rnd()-.3)*40;g.lineTo(x,y)}g.stroke()}g.strokeStyle='#b98550';g.lineWidth=4;g.strokeRect(2,2,n-4,n-4)}));
 const tBrown=tex((g,n)=>{g.fillStyle='#955d34';g.fillRect(0,0,n,n);g.fillStyle='#7e4b29';for(const y of[.2,.5,.78])g.fillRect(0,n*y,n,8);g.fillStyle='#a86e42';for(const y of[.34,.64])g.fillRect(0,n*y,n,5);g.strokeStyle='#6a3e22';g.lineWidth=4;g.strokeRect(2,2,n-4,n-4)});
 const boxG=new T.BoxGeometry(.97,.97,.7),COLS=Array.from({length:23},(_,i)=>i-11);
 const mkI=(tx,list,fn)=>{const im=new T.InstancedMesh(boxG,new T.MeshLambertMaterial({map:tx}),list.length),m=new T.Matrix4(),c=new T.Color();list.forEach(([x,y],i)=>{m.setPosition(x,y,0);im.setMatrixAt(i,m);const f=fn(x,y);c.setRGB(f,f,f);im.setColorAt(i,c)});G.add(im);return im};
 const lsD=[],lsS=[],lsB=[];for(const x of COLS){for(let y=1;y<=16;y++)lsD.push([x,y]);lsS.push([x,0]);for(let y=-9;y<=-1;y++)lsB.push([x,y])}
 mkI(tDark,lsD,(x,y)=>(.55+.45*(1-sm(1,13,y)))*(.9+.2*hash(x*7+y*3)));const imS=mkI(tSand,lsS,(x,y)=>.92+.16*hash(x*5));mkI(tBrown,lsB,(x,y)=>(1-sm(-1,-9,y)*.8)*(.93+.14*hash(x*3+y*9)));
 G.add(new T.AmbientLight(0xa078b4,.6));const dl=new T.DirectionalLight(0xffd0a0,.55);dl.position.set(-4,8,12);G.add(dl);const qL=new T.PointLight(0xffb060,.9,7);qL.position.set(0,-1.6,2);G.add(qL);
 const rocks=[-3,3,-6].map(x=>{const r=mk(new T.DodecahedronGeometry(.3,0),0x7d7487);r.position.set(x+.1,.1,.45);r.scale.set(1.2,.8,1);G.add(r);return r});
 const crys=(o.crystals||[-1,1,2,-4]).map((x,i)=>{const m=new T.Mesh(new T.OctahedronGeometry(.2,0).scale(.8,1.3,.8),new T.MeshBasicMaterial({color:o.crystalCol||0xffd24a}));m.position.set(x,.08,.45);m.userData.x=x;G.add(m);
  const sp=new T.Sprite(new T.SpriteMaterial({map:TD,color:o.crystalCol||0xffc040,blending:T.AdditiveBlending,depthWrite:false}));sp.position.copy(m.position);G.add(sp);m.userData.s=sp;return m});
 const QG=new T.Group();QG.position.set(0,-1.97,.5);G.add(QG);
 {const d=mk(new T.SphereGeometry(.42,24,12,0,6.283,0,1.5708),0x3c5165,{emissive:0x142230});d.position.y=.1;QG.add(d);const bs=mk(new T.BoxGeometry(.95,.22,.5),0x2a3846);bs.position.y=-.2;QG.add(bs);const st=mk(new T.BoxGeometry(.96,.07,.52),0xe8b830,{emissive:0x5a4408});st.position.y=-.31;QG.add(st);
  const an=mk(new T.CylinderGeometry(.015,.015,.4,5),0x888);an.position.y=.58;QG.add(an);const bc=bas(new T.SphereGeometry(.04,8,6),0xff4a3a);bc.position.y=.78;QG.add(bc);QG.userData.bc=bc;const w=bas(new T.BoxGeometry(.22,.12,.02),0x72dcff);w.position.set(0,.12,.42);QG.add(w)}
 for(const x of[-1,1]){const l=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.8,.8,.1)),new T.LineDashedMaterial({color:0xffb347,dashSize:.1,gapSize:.07}));l.computeLineDistances();l.position.set(x,-1.97,.45);G.add(l)}
 const dig=pts(40,{size:.12});G.add(dig);const hole=lsS.findIndex(a=>a[0]==-1);
 return{G,imS,hole,crys,QG,qL,dig,
  cam(t,t0,t1){const a2=innerWidth/innerHeight,cy=a2>1?1.1:3.1,fy=24,tn=Math.tan(fy*Math.PI/360),Dd=Math.max(7.8/2/(tn*a2),(a2>1?4.6:6)/tn),u=sm(t0,t1,t);
   cam.position.set(mx(7,0,u),mx(-1,cy,u),mx(9,Dd,u));cam.lookAt(0,mx(.3,cy,u),0);cam.fov=mx(56,fy,u);cam.updateProjectionMatrix();baseFov=cam.fov},
  update(t,tDig){const dg=sm(tDig,tDig+.6,t),m4=new T.Matrix4(),sc=Math.max(.001,1-dg);m4.makeScale(sc,sc,sc).setPosition(-1,0,0);imS.setMatrixAt(hole,m4);imS.instanceMatrix.needsUpdate=true;
   crys.forEach((c,i)=>{const dg2=c.userData.x==-1;let vis=1,x=c.userData.x,y=.08,z=.45;if(dg2){const a=lin(tDig,tDig+1.3,t);x=mx(-1,-.2,a*a);y=mx(.08,5.5,a);z=mx(.45,1.4,a);vis=1-sm(tDig+1,tDig+1.4,t)}c.position.set(x,y,z);c.scale.setScalar(vis);c.rotation.y=t*2+i;c.userData.s.position.copy(c.position);c.userData.s.scale.setScalar((.7+.4*Math.sin(t*5+i))*vis)});
   for(let i=0;i<40;i++){const a=hash(i)*6.28,tt=t-tDig-.05,k=tt>0&&tt<1?1-tt:0;setP(dig,i,-1+Math.cos(a)*tt*1.2,.2+hash(i+3)*tt*2-3*tt*tt,.5+Math.sin(a)*tt*.5,.9*k,.7*k,.4*k)}updP(dig);
   QG.userData.bc.visible=Math.sin(t*4)>-.3;const bp=beatAge(t);qL.intensity=.9+(bp<1?1.5*Math.exp(-bp*5):0)}}}

/* ---------- Ablauf (gemeinsam für alle Filme) ---------- */
const FILM={boot(cfg){
 BEATS=cfg.BEATS||BEATS;const CARD=cfg.CARD||28.8;
 const tri=(c,w,p,t)=>p*Math.max(0,1-Math.abs(t-c)/w),dec=(t0,d,p,t)=>t<t0?0:p*Math.max(0,1-(t-t0)/d);FILM.tri=tri;FILM.dec=dec;
 const dk=$('dk'),hk=$('hk'),cp=$('cap'),fl=$('fl'),wd=$('wd'),hud=$('hud');let ci=-1,wi=-1;
 function overlay(t){const h=sm(cfg.hook[0],cfg.hook[1],t)*(1-sm(cfg.hook[2],cfg.hook[3],t));hk.style.opacity=h;hk.style.transform=`scale(${1+.04*(1-h)+.02*(t-1)})`;
  dk.style.opacity=t<cfg.dk[0]?1:cfg.dk[2]*(1-sm(cfg.dk[0],cfg.dk[1],t));
  const f=cfg.flash(t,tri,dec).concat([['255,230,190',dec(BEATS[0],.5,.2,t)+dec(BEATS[1],.5,.25,t)+dec(BEATS[2],.5,.3,t)+dec(BEATS[3],.5,.22,t)]]).sort((a,b)=>b[1]-a[1])[0];fl.style.background=`rgb(${f[0]})`;fl.style.opacity=Math.min(1,f[1]);
  const i=cfg.CAP.findIndex(q=>t>=q[0]&&t<q[1]);if(i>=0&&i!=ci){ci=i;cp.firstChild.textContent=cfg.CAP[i][2];cp.firstChild.style.color=cfg.CAP[i][4]||'#72dcff';cp.lastChild.textContent=cfg.CAP[i][3]}cp.className=i>=0?'on':'';if(i<0)ci=-1;
  $('tb').className=t>cfg.title[0]&&t<cfg.title[1]?'on':'';
  let w=-1;for(let k=0;k<cfg.WORDS.length;k++)if(t>=cfg.WORDS[k][0])w=k;if(w!=wi){wi=w;if(w>=0){wd.textContent=cfg.WORDS[w][1];wd.classList.remove('pop');void wd.offsetWidth;wd.classList.add('pop')}}wd.style.opacity=w>=0&&t<CARD-.2?1:0;
  hud.className=t>cfg.hud[0]&&t<CARD+2?'on':'';cfg.hud[1](t);$('mi').className=t>=CARD?'on':''}
 function draw(t){const sc=cfg.draw(t);const ba=beatAge(t);if(ba<.7){const a=(1-ba/.7)*(cfg.shake?cfg.shake(t):.5);cam.position.x+=(hash(t*37)-.5)*a;cam.position.y+=(hash(t*41)-.5)*a}rd.render(sc,cam);overlay(t)}
 let t=+new URLSearchParams(location.search).get('t')||0,last=0,want=0,frozen=false;const sd=$('sd');
 try{const v=localStorage.getItem('dtS');want=v==null?1:+v}catch(e){want=1}
 const n=cfg.n;function done(){const nx=new URLSearchParams(location.search).get('next');if(parent!==window)parent.postMessage({type:'film-done',film:n},'*');if(nx)location.href=nx;else if(parent===window)location.href=DUE.gameUrl(n)}
 const fade=()=>{const f=$('fd');f.style.animation='none';f.offsetWidth;f.style.animation='fd 1s ease-out both'};
 function seek(x){t=x;fade();if(EV.length){ei=EV.findIndex(e=>e[0]>=t);if(ei<0)ei=EV.length}}
 $('sk').onclick=()=>seek(CARD+.2);$('rp').onclick=()=>seek(0);$('ok').onclick=done;
 const mute=()=>{try{if(AC&&AC===DUE.sharedAC())MB.disconnect()}catch(e){}};addEventListener('pagehide',mute);
 $('bk').onclick=()=>{if(parent!==window){mute();parent.postMessage({type:'film-back',film:n},'*')}else location.href=DUE.MAP};
 sd.onclick=()=>{on=!on;sd.classList.toggle('on',on);try{localStorage.setItem('dtS',on?1:0)}catch(e){}
  if(on){try{navigator.audioSession.type='playback'}catch(e){}if(!AC)aInit();AC.resume();MB.gain.setTargetAtTime(.85,AC.currentTime,.05);FB=AC.createGain();FB.connect(MB);FB.connect(RV);EV=cfg.audio(thump,choir,bell,pluck,brass,whoosh,boom).sort((a,b)=>a[0]-b[0]);ei=EV.findIndex(e=>e[0]>=t);if(ei<0)ei=EV.length}else if(AC)MB.gain.setTargetAtTime(0,AC.currentTime,.05)};
 addEventListener('pointerdown',e=>{if(want&&!on&&!e.target.closest('#sd'))sd.click();want=0});
 ['pointerdown','keydown','touchend'].forEach(v=>addEventListener(v,()=>{if(AC&&on&&AC.state!='running')AC.resume()},{passive:true}));
 function frame(now){const dt=Math.min(.05,(now-last)/1e3||.016);last=now;if(!frozen)t+=dt;draw(t);
  if(AC&&on&&FB&&AC.state!='running'){ei=EV.findIndex(e=>e[0]>=t);if(ei<0)ei=EV.length}else if(AC&&on&&FB)try{const nn=AC.currentTime;while(ei<EV.length&&EV[ei][0]<t+1.2){const[te,fn]=EV[ei++];OUT=FB;fn(nn+Math.max(0,te-t))}}catch(e){console.error('Ton-Fehler',e)}
  requestAnimationFrame(frame)}
 window.__film={set:x=>{t=x;frozen=true;draw(t)},buildAudio:()=>cfg.audio(thump,choir,bell,pluck,brass,whoosh,boom)};
 if(want){try{sd.click()}catch(e){}}requestAnimationFrame(frame)}};

/* ---------- Fremder ---------- */
function makeAlien(sc){sc=sc||1;const g=new T.Group(),m=new T.MeshLambertMaterial({color:0x1c2230,emissive:0x070b14}),glow=new T.MeshBasicMaterial({color:0x72dcff,fog:false});
 const to=new T.Mesh(new T.CylinderGeometry(.2,.3,1.7,8),m);to.position.y=2.25;const hd=new T.Mesh(new T.SphereGeometry(.34,14,12),m);hd.scale.set(.8,1.55,.9);hd.position.y=3.55;
 const e1=new T.Mesh(new T.SphereGeometry(.07,6,6),glow),e2=e1.clone();e1.position.set(-.12,3.6,.27);e2.position.set(.12,3.6,.27);const st=new T.Mesh(new T.BoxGeometry(.035,1.5,.03),glow);st.position.set(0,2.25,.3);
 const leg=x=>{const l=new T.Mesh(new T.CylinderGeometry(.09,.12,2.2,6),m);l.position.set(x,1.1,0);return l};
 const armL=new T.Group(),armR=new T.Group();for(const[a,s]of[[armL,-1],[armR,1]]){const c=new T.Mesh(new T.CylinderGeometry(.06,.08,2.2,6),m);c.position.y=-1.1;a.add(c);a.position.set(s*.38,3.0,0)}
 const head=new T.Group();head.add(hd,e1,e2);g.add(to,head,st,leg(-.16),leg(.16),armL,armR);g.scale.setScalar(sc);g.userData={eyes:[e1,e2],armL,armR,st,head,glow};return g}
