/* ---------- Szene ---------- */
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(64,1,.1,4000);
const sky=new T.Mesh(new T.SphereGeometry(1,32,16),skyMat);sky.scale.setScalar(2500);sky.renderOrder=-1;sky.frustumCulled=false;scene.add(sky);
const hemi=new T.HemisphereLight(0xbfd0ff,0x7a4a30,.9),dirL=new T.DirectionalLight(0xffe6c8,1.4);scene.add(hemi,dirL,dirL.target);Gfx.init({renderer,scene,camera});
function build(){const g=new T.SphereGeometry(1,480,240),P=g.attributes.position,n=P.count,aC=new Float32Array(n),keys=[],d=new V3();
for(let i=0;i<n;i++){d.fromBufferAttribute(P,i);keys.push(Math.round(d.x*3e3)+','+Math.round(d.y*3e3)+','+Math.round(d.z*3e3));const h=H(d);aC[i]=lc;P.setXYZ(i,d.x*h,d.y*h,d.z*h)}
g.setAttribute('aC',new T.BufferAttribute(aC,1));g.computeVertexNormals();
const N=g.attributes.normal,mp=new Map();
for(let i=0;i<n;i++){let a=mp.get(keys[i]);if(!a)mp.set(keys[i],a=[0,0,0]);a[0]+=N.getX(i);a[1]+=N.getY(i);a[2]+=N.getZ(i)}
for(let i=0;i<n;i++){const a=mp.get(keys[i]),l=Math.hypot(a[0],a[1],a[2])||1;N.setXYZ(i,a[0]/l,a[1]/l,a[2]/l)}
const m=new T.Mesh(g,planetMat);m.frustumCulled=false;scene.add(m)}
/* ---------- Fahrzeug ---------- */
const car=new T.Group();scene.add(car);
const M=(c,o={})=>new T.MeshStandardMaterial({color:c,roughness:.45,metalness:.5,...o});
const orange=M(0xa83a12),dark=M(0x1d1d22,{roughness:.7,metalness:.6}),glow=(c)=>new T.MeshBasicMaterial({color:c});
const add=(geo,mat,x,y,z,rx=0,ry=0,rz=0,p=car)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);p.add(m);return m};
const WR=.55,S0=1.1,LP=[[-1.15,0,-1.35],[1.15,0,-1.35],[-1.15,0,1.25],[1.15,0,1.25]].map(a=>new V3(...a)),wh=[];
const gfxCar=Gfx.makeCar(car,{S0,WR});
const shTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(0,0,0,.8)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();
const shadow=new T.Mesh(new T.PlaneGeometry(4.2,5.6),new T.MeshBasicMaterial({map:shTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));scene.add(shadow);
/* ---------- Staub ---------- */
const NP=260,pp=new Float32Array(NP*3),pa=new Float32Array(NP),ps=new Float32Array(NP),pl=new Float32Array(NP),pv=Array.from({length:NP},()=>new V3());let pi=0;
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pp,3));pg.setAttribute('aA',new T.BufferAttribute(pa,1));pg.setAttribute('aS',new T.BufferAttribute(ps,1));
const dustMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uSz:{value:600},uCol:{value:new T.Color(.6,.4,.25)}},
vertexShader:`attribute float aA,aS;varying float vA;uniform float uSz;void main(){vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aS*uSz/-mv.z;gl_Position=projectionMatrix*mv;}`,
fragmentShader:`varying float vA;uniform vec3 uCol;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(uCol,(1.-smoothstep(.05,.5,d))*vA*.4);`+END+`}`});
const dust=new T.Points(pg,dustMat);dust.frustumCulled=false;scene.add(dust);
