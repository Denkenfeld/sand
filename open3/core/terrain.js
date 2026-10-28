const T=THREE,V3=T.Vector3,Q=T.Quaternion,R=420,$=i=>document.getElementById(i);
const cl=(x,a,b)=>Math.min(b,Math.max(a,x)),sm=(a,b,x)=>{x=cl((x-a)/(b-a),0,1);return x*x*(3-2*x)},Lp=(a,b,t)=>a+(b-a)*t;
/* ---------- Terrain: Rauschen + asymmetrische Dünenkämme ---------- */
const hs=(x,y,z)=>{const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)};
function vn(x,y,z){const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);let u=x-i,v=y-j,w=z-k;u*=u*(3-2*u);v*=v*(3-2*v);w*=w*(3-2*w);
const a=(p,q,r)=>hs(i+p,j+q,k+r);
return Lp(Lp(Lp(a(0,0,0),a(1,0,0),u),Lp(a(0,1,0),a(1,1,0),u),v),Lp(Lp(a(0,0,1),a(1,0,1),u),Lp(a(0,1,1),a(1,1,1),u),v),w)}
const fb=(x,y,z,o)=>{let s=0,a=.5,t=0;for(let i=0;i<o;i++){s+=a*vn(x,y,z);t+=a;x*=2.03;y*=2.03;z*=2.03;a*=.5}return s/t};
let lc=0;
let BD=null,BH=0,BPOS=null,CD=null,CH=0;
function H(d){let h=H0(d);if(!BD||!CD)return h;const a=Math.acos(Math.min(1,d.dot(BD)))*R;h=Lp(h,BH,1-sm(22,55,a));const c=Math.acos(Math.min(1,d.dot(CD)))*R;if(c<150){h=Lp(h,CH,1-sm(90,150,c))-7*(1-sm(62,100,c))+3*Math.exp(-Math.pow((c-108)/6,2));lc=Lp(lc,.95,1-sm(50,108,c))}return h}
function H0(d){const x=d.x,y=d.y,z=d.z,m=fb(x*2+5,y*2,z*2,3);lc=m;
const w=(x*.62+y*.18+z*.76)*14+fb(x*5,y*5+9,z*5,3)*2.6,f=w-Math.floor(w),p=f<.6?f/.6:(1-f)/.4,pr=p*p*(3-2*p);
return R+(m-.5)*26+(pr-.5)*4.2*(.35+m*.9)+fb(x*30,y*30,z*30,2)*.5}
function TN(up){const t1=new V3(0,1,0).cross(up);if(t1.lengthSq()<.01)t1.set(1,0,0).cross(up);t1.normalize();const t2=up.clone().cross(t1),e=1.5/R;
const P=(a,s)=>{const d=up.clone().addScaledVector(a,s*e).normalize();return d.multiplyScalar(H(d))};
return P(t1,1).sub(P(t1,-1)).cross(P(t2,1).sub(P(t2,-1))).normalize()}
